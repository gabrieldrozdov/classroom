// the /editor/ page: plaintext on the left, a live build of it on the right.
// the preview is a real page rather than a lookalike — the markdown is run through the same converter the build uses (generate.js) and dropped into a document that loads the same stylesheet and the same resource scripts. anything that works on a course page (calendars, file trees, heading nav, print strips, slides) therefore works here without being reimplemented.
// the plaintext side is CodeMirror 6, vendored in codemirror.js.

let frame = document.getElementById('frame');
let filenameField = document.getElementById('filename');
let statusLabel = document.getElementById('status');
let editorEl = document.getElementById('editor');

// ——————————————————————————————
// PALETTE
// ——————————————————————————————

// the converter needs hex values for the brand colors so calendar day numbers stay legible on whatever color their entry carries. the build reads them out of style.css; here they're already on the page, so they come off the live stylesheet instead.
function readPalette() {
	let names = ['pink', 'green', 'blue', 'yellow', 'purple', 'red', 'off-white', 'light-gray', 'gray', 'dark-gray', 'off-black'];
	let styles = getComputedStyle(document.documentElement);
	let values = {};
	for (let name of names) {
		let value = styles.getPropertyValue(`--${name}`).trim();
		if (value.startsWith('#')) {
			values[name] = value;
		}
	}
	return values;
}
let palette = readPalette();
ClassroomMarkdown.setPaletteValues(palette);

function color(name, fallback) {
	return palette[name] || fallback;
}

// ——————————————————————————————
// SETTINGS
// ——————————————————————————————

// the working draft and the layout are kept in the browser so a reload (or a closed tab) doesn't lose them. none of it leaves this machine; saving a file and downloading are what make anything lasting.
// these sit up here rather than with the draft below because the editor has to know one of its settings before it can be built.
const STORAGE = 'gdwithgd-editor-draft';
function remember(key, value) {
	try {
		localStorage.setItem(`${STORAGE}-${key}`, value);
	} catch (error) {
		// private windows and blocked site data are fine, the setting just doesn't survive a reload
	}
}
function recall(key) {
	try {
		return localStorage.getItem(`${STORAGE}-${key}`);
	} catch (error) {
		return null;
	}
}

// ——————————————————————————————
// SHORTCODES
// ——————————————————————————————

// every custom shortcode the converter understands, plus the plain markdown worth a button.
// `block` means the snippet has to own its line, so the inserter opens one for it. `placeholder` is what ends up selected afterwards, so the next thing typed replaces it — and if there's already a selection when the button is pressed, that selection is used instead.
const groups = [
	{
		label: 'text',
		color: 'pink',
		items: [
			{ label: 'bold', before: '**', placeholder: 'bold', after: '**' },
			{ label: 'italic', before: '*', placeholder: 'italic', after: '*' },
			{ label: 'code', before: '`', placeholder: 'code', after: '`' },
			{ label: 'link', before: '[', placeholder: 'label', after: '](https://)' },
			{ label: '{c: color}', before: '{c:pink ', placeholder: 'colored text', after: '}' },
			{ label: '{h: highlight}', before: '{h:yellow ', placeholder: 'highlighted text', after: '}' },
			{ label: '{bg: cell}', before: '{bg:pink} ' },
			{ label: '{center} cell', before: '{center} ' },
			{ label: '\\ cell line', before: ' \\ ' }
		]
	},
	{
		label: 'blocks',
		color: 'green',
		items: [
			{ label: '# h1', block: true, before: '# ', placeholder: 'Heading' },
			{ label: '## h2', block: true, before: '## ', placeholder: 'Heading' },
			{ label: '### h3', block: true, before: '### ', placeholder: 'Heading' },
			{ label: '- list', block: true, before: '- ', placeholder: 'First item', after: '\n- Second item' },
			{ label: '1. list', block: true, before: '1. ', placeholder: 'First item', after: '\n2. Second item' },
			{ label: '> quote', block: true, before: '> ', placeholder: 'Quoted text' },
			{ label: 'table', block: true, before: '| ', placeholder: 'Column', after: ' | Column |\n| --- | --- |\n| Cell | Cell |\n| Cell | Cell |' },
			{ label: 'table widths', block: true, before: '| ', placeholder: 'Wide', after: ' | Narrow | Narrow |\n| --- 2 | --- 1 | --- 1 |\n| Cell | Cell | Cell |' },
			{ label: 'table spans', block: true, before: '| ', placeholder: 'Column', after: ' | Column | Column |\n| --- | --- | --- |\n| {bg:pink} Across three columns | < | < |\n| {bg:blue} Down two rows | Cell | Cell |\n| ^ | Cell | Cell |' },
			{ label: 'code block', block: true, before: '```\n', placeholder: 'code here', after: '\n```' },
			{ label: '--- divider', block: true, before: '---' },
			{ label: '--- colored', block: true, before: '--- ', placeholder: 'pink', after: ' solid' }
		]
	},
	{
		label: 'media',
		color: 'blue',
		items: [
			{ label: '! media', block: true, before: '![', placeholder: 'alt text', after: '](/assets/media/file.jpg)' },
			{ label: '@ embed', block: true, before: '@[', placeholder: 'label', after: '](https://docs.google.com/…)' },
			{ label: '[[ button ]]', block: true, before: '[[', placeholder: 'label', after: '](https://)]' }
		]
	},
	{
		label: 'sections',
		color: 'yellow',
		items: [
			{ label: '::: faq', block: true, before: '::: faq ', placeholder: 'A question?', after: '\n\nThe answer.\n\n:::' },
			{ label: '::: columns', block: true, before: '::: columns\n\n', placeholder: 'Left column.', after: '\n\n+++\n\nRight column.\n\n:::' },
			{ label: '::: bg', block: true, before: '::: bg ', placeholder: 'pink', after: '\n\nContent inside the band.\n\n:::' },
			{ label: '::: calendar', block: true, before: '::: calendar\n\n[9/15/26]\n', placeholder: 'First day of class.', after: '\n\n[9/22/26 - 10/6/26 blue]\nProject one.\n\n:::' },
			{ label: '::: files', block: true, before: '::: files ', placeholder: 'my-site', after: '\n\nindex.html\nstyle.css\nimages\n\tlogo.svg\n\n:::' },
			{ label: '::: big', block: true, before: '::: big\n\n', placeholder: 'A big, centered line.', after: '\n\n:::' },
			{ label: '::: notes', block: true, before: '::: notes\n\n', placeholder: 'Speaker notes, never shown on the page.', after: '\n\n:::' }
		]
	},
	{
		label: 'flow',
		color: 'purple',
		items: [
			{ label: '[slide]', block: true, before: '[slide]' },
			{ label: '[page]', block: true, before: '[page]' },
			{ label: '[ignore]', block: true, before: '[ignore]' },
			{ label: '[primary]', block: true, before: '[primary ', placeholder: 'pink', after: ']' },
			{ label: '[primary rotate]', block: true, before: '[primary rotate]' },
			{ label: '[#anchor]', block: true, before: '[#', placeholder: 'name', after: ']' }
		]
	}
];

// ——————————————————————————————
// CODEMIRROR
// ——————————————————————————————

// markdown's own syntax, in the brand palette
const markdownHighlighting = CM.HighlightStyle.define([
	{ tag: CM.tags.heading1, color: color('pink'), fontVariationSettings: '"wght" 700', fontWeight: '700' },
	{ tag: [CM.tags.heading2, CM.tags.heading3], color: color('pink'), fontWeight: '700' },
	{ tag: [CM.tags.heading4, CM.tags.heading5, CM.tags.heading6], color: color('pink') },
	{ tag: CM.tags.strong, color: color('yellow'), fontWeight: '700' },
	{ tag: CM.tags.emphasis, color: color('blue'), fontStyle: 'italic' },
	{ tag: CM.tags.strikethrough, textDecoration: 'line-through' },
	{ tag: CM.tags.link, color: color('green') },
	{ tag: CM.tags.url, color: color('green'), textDecoration: 'underline' },
	{ tag: CM.tags.monospace, color: color('purple') },
	{ tag: CM.tags.quote, color: color('gray'), fontStyle: 'italic' },
	{ tag: CM.tags.list, color: color('off-white') },
	{ tag: CM.tags.contentSeparator, color: color('red') },
	// the punctuation that makes the markup — hashes, asterisks, backticks, brackets — reads as scaffolding rather than content
	{ tag: CM.tags.processingInstruction, color: color('gray'), opacity: '.6' },
	{ tag: CM.tags.labelName, color: color('green') },
	{ tag: CM.tags.meta, color: color('gray'), opacity: '.6' }
]);

// the site's own shortcodes aren't markdown, so nothing in the language highlights them. they're the whole reason this editor exists, so they get marked here: whole-line flow markers and container fences, and the inline spans — colors and highlights, the cell markers, embeds and buttons. a color can be a name or a hex code, so both spellings are matched.
const shortcodeLine = /^\s*(\[(slide|page|ignore)\]|\[primary(\s+[^\]]*)?\]|\[#[\w-]+\])\s*$/;
const shortcodeFence = /^\s*(:::|\+\+\+)/;
const shortcodeColor = /#[0-9a-fA-F]{3,8}|[\w-]+/.source;
const shortcodeInline = new RegExp(`\\{[ch]:(?:${shortcodeColor})\\s[^}]*\\}|\\{bg:\\s*(?:${shortcodeColor})\\s*\\}|\\{(?:left|center|right)\\}|@\\[[^\\]]*\\]\\([^)]+\\)|\\[\\[[^\\]]+\\]\\([^)]+\\)\\]`, 'g');

const markerDecoration = CM.Decoration.mark({ class: 'cm-gd-marker' });
const fenceDecoration = CM.Decoration.mark({ class: 'cm-gd-fence' });
const inlineDecoration = CM.Decoration.mark({ class: 'cm-gd-inline' });

function shortcodeDecorations(view) {
	let builder = new CM.RangeSetBuilder();
	for (let range of view.visibleRanges) {
		let pos = range.from;
		while (pos <= range.to) {
			let line = view.state.doc.lineAt(pos);
			if (line.length > 0) {
				if (shortcodeLine.test(line.text)) {
					builder.add(line.from, line.to, markerDecoration);
				} else if (shortcodeFence.test(line.text)) {
					builder.add(line.from, line.to, fenceDecoration);
				} else {
					// the builder wants its ranges in order and never overlapping, which is what the regex gives as long as each match starts after the last one ended
					let end = -1;
					for (let match of line.text.matchAll(shortcodeInline)) {
						if (match.index >= end) {
							builder.add(line.from + match.index, line.from + match.index + match[0].length, inlineDecoration);
							end = match.index + match[0].length;
						}
					}
				}
			}
			pos = line.to + 1;
		}
	}
	return builder.finish();
}

const shortcodeHighlighter = CM.ViewPlugin.fromClass(class {
	constructor(view) {
		this.decorations = shortcodeDecorations(view);
	}
	update(update) {
		if (update.docChanged || update.viewportChanged) {
			this.decorations = shortcodeDecorations(update.view);
		}
	}
}, {
	decorations: plugin => plugin.decorations
});

// chrome works out whether to spellcheck a contenteditable largely when it first meets the element, so the setting is read before the editor is built rather than applied to one already on screen. changing it afterwards goes through a compartment: the undo history lives in the editor state, and rebuilding the editor to force chrome's hand would throw that away.
let spellcheckCompartment = new CM.Compartment();
function spellcheckExtension(on) {
	return CM.EditorView.contentAttributes.of({
		spellcheck: on ? 'true' : 'false',
		autocorrect: 'off',
		autocapitalize: 'off'
	});
}

let spellcheckOn = recall('spellcheck') == '1';
let inputHost = document.getElementById('input');
let view;

function editorExtensions() {
	return [
		CM.history(),
		CM.drawSelection(),
		CM.dropCursor(),
		CM.highlightActiveLine(),
		CM.highlightSelectionMatches(),
		CM.bracketMatching(),
		CM.EditorView.lineWrapping,
		// file trees nest by indentation, so tab has to produce a real tab
		CM.indentUnit.of('\t'),
		CM.EditorState.allowMultipleSelections.of(true),
		// cmd-click (ctrl-click elsewhere) drops an extra cursor rather than moving the one you have
		CM.EditorView.clickAddsSelectionRange.of(event => event.metaKey || event.ctrlKey),
		CM.search({ top: true }),
		// searchKeymap is what carries cmd-f for find and replace and cmd-d for select-next-occurrence, so it goes ahead of the defaults
		CM.keymap.of([...CM.searchKeymap, ...CM.historyKeymap, CM.indentWithTab, ...CM.defaultKeymap]),
		CM.markdown({ base: CM.markdownLanguage }),
		CM.syntaxHighlighting(markdownHighlighting),
		shortcodeHighlighter,
		spellcheckCompartment.of(spellcheckExtension(spellcheckOn)),
		CM.EditorView.updateListener.of(update => {
			if (update.docChanged) {
				changed();
			}
			if (update.docChanged || update.selectionSet) {
				updateCounts();
			}
		})
	];
}

view = new CM.EditorView({
	parent: inputHost,
	doc: '',
	extensions: editorExtensions()
});

function text() {
	return view.state.doc.toString();
}

function setText(value) {
	view.dispatch({
		changes: { from: 0, to: view.state.doc.length, insert: value },
		selection: { anchor: 0 }
	});
}

// drop a snippet in at the cursor, wrapping the selection if there is one
function insert(item) {
	let before = item.before || '';
	let after = item.after || '';
	let range = view.state.selection.main;
	let middle = view.state.sliceDoc(range.from, range.to) || item.placeholder || '';

	// a block shortcode always starts its own line, with a blank line separating it from whatever is around it
	if (item.block) {
		let head = view.state.sliceDoc(0, range.from);
		let tail = view.state.sliceDoc(range.to);
		if (head != '') {
			before = `${head.endsWith('\n\n') ? '' : head.endsWith('\n') ? '\n' : '\n\n'}${before}`;
		}
		if (tail != '') {
			after = `${after}${tail.startsWith('\n\n') ? '' : tail.startsWith('\n') ? '\n' : '\n\n'}`;
		}
	}

	let from = range.from + before.length;
	view.dispatch({
		changes: { from: range.from, to: range.to, insert: before + middle + after },
		// leave the placeholder selected so it can be typed straight over
		selection: { anchor: from, head: from + middle.length },
		scrollIntoView: true
	});
	view.focus();
}

// ——————————————————————————————
// HEADER CONTROLS
// ——————————————————————————————

let toolbar = document.getElementById('toolbar');
for (let group of groups) {
	let label = document.createElement('span');
	label.className = 'editor-group-label';
	label.textContent = group.label;
	toolbar.appendChild(label);

	let el = document.createElement('div');
	el.className = 'editor-group';
	el.dataset.color = group.color;
	for (let item of group.items) {
		let button = document.createElement('button');
		button.className = 'editor-button';
		button.type = 'button';
		button.textContent = item.label;
		button.addEventListener('click', () => insert(item));
		el.appendChild(button);
	}
	toolbar.appendChild(el);
}

let toolbarToggle = document.getElementById('toggle-toolbar');
function setToolbar(open) {
	toolbar.hidden = !open;
	toolbarToggle.dataset.on = open ? 1 : 0;
	toolbarToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
	remember('toolbar', open ? '1' : '0');
}
toolbarToggle.addEventListener('click', () => setToolbar(toolbar.hidden));

let spellcheckToggle = document.getElementById('toggle-spellcheck');
// `refresh` is for the toggle rather than for start-up, where the editor was built with the setting already applied. it nudges chrome into looking again by handing focus back to the writing — the attribute itself is swapped in place, so undo and redo are untouched.
function setSpellcheck(on, refresh) {
	spellcheckOn = on;
	view.dispatch({ effects: spellcheckCompartment.reconfigure(spellcheckExtension(on)) });
	if (refresh) {
		view.contentDOM.blur();
		requestAnimationFrame(() => view.focus());
	}
	spellcheckToggle.dataset.on = on ? 1 : 0;
	spellcheckToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
	remember('spellcheck', on ? '1' : '0');
}
spellcheckToggle.addEventListener('click', () => setSpellcheck(spellcheckToggle.dataset.on != 1, true));

// holding the preview by hand, for when a rebuild every few keystrokes is more distraction than help
let pauseToggle = document.getElementById('toggle-pause');
let paused = false;
function setPause(on) {
	paused = on;
	pauseToggle.dataset.on = on ? 1 : 0;
	pauseToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
	remember('paused', on ? '1' : '0');
	if (on) {
		clearTimeout(pending);
	} else if (waiting && !presenting) {
		waiting = false;
		render();
	}
	updateCounts();
}
pauseToggle.addEventListener('click', () => setPause(pauseToggle.dataset.on != 1));

let fontsizeField = document.getElementById('fontsize');
function setFontSize(size) {
	document.documentElement.style.setProperty('--editor-font-size', `${size}px`);
	fontsizeField.value = size;
	remember('fontsize', String(size));
}
fontsizeField.addEventListener('input', () => setFontSize(fontsizeField.value));

// ——————————————————————————————
// STATUS
// ——————————————————————————————

let noteTimer;
let noteShowing = false;

function countWords(value) {
	return value.trim().split(/\s+/).filter(word => word != '').length;
}

// the whole document normally, or just what's selected while there's a selection — across every range, so a multi-cursor selection counts as one figure
function updateCounts() {
	if (noteShowing) {
		return;
	}
	// a presentation takes the status bar over entirely, since the counts are no help while it's running
	if (presenting) {
		showHoldStatus();
		return;
	}
	let selected = '';
	for (let range of view.state.selection.ranges) {
		if (!range.empty) {
			selected += `${selected == '' ? '' : ' '}${view.state.sliceDoc(range.from, range.to)}`;
		}
	}
	let counts;
	if (selected != '') {
		counts = `<span>${countWords(selected).toLocaleString()} words</span> <span>${selected.length.toLocaleString()} characters selected</span>`;
	} else {
		let value = text();
		counts = `<span>${countWords(value).toLocaleString()} words</span> <span>${value.length.toLocaleString()} characters</span> <span>${view.state.doc.lines.toLocaleString()} lines</span>`;
	}
	// a paused preview says so for as long as it's paused, so it never reads as a hang — the counts stay alongside
	if (paused) {
		statusLabel.dataset.note = 'paused';
		statusLabel.innerHTML = `<span>preview paused${waiting ? ', changes waiting' : ''}</span> ${counts}`;
	} else {
		delete statusLabel.dataset.note;
		statusLabel.innerHTML = counts;
	}
}

// a passing message in the status bar, which goes back to the counts on its own
function note(message, kind) {
	clearTimeout(noteTimer);
	noteShowing = true;
	statusLabel.textContent = message;
	statusLabel.dataset.note = kind || 'saved';
	noteTimer = setTimeout(() => {
		noteShowing = false;
		delete statusLabel.dataset.note;
		updateCounts();
	}, 2500);
}

// ——————————————————————————————
// PREVIEW
// ——————————————————————————————

// a name ends up as a .md file on disk and as a key in storage, so anything unsafe in a filename becomes an underscore. one character for one, which keeps the caret where it was while typing.
function sanitizeName(name) {
	return (name || '').replace(/[^A-Za-z0-9._-]/g, '_');
}

function filename() {
	return sanitizeName((filenameField.value.trim() || 'untitled').replace(/\.md$/i, '')) || 'untitled';
}

// the scripts a built resource page loads, less the floating widgets: pins, timers, randomizers and the soundboard are presenting tools that stay on the page once opened, which isn't wanted in a preview pane
const previewScripts = ['brand', 'markdown', 'presentation'];

// wrap the generated markup in the same shell a built resource page uses. the departures are all in the stylesheet below: there's no course nav out here and no mobile bar to leave room for, the document runs edge to edge rather than sitting inset with rounded corners, and the presentation's widget buttons are dropped along with their scripts. the scroll position is carried across rebuilds so typing doesn't throw the preview back to the top.
function buildDocument(body, scroll) {
	let footer = filename().replace(/["\\]/g, '\\$&');
	let scripts = previewScripts.map(name => `<script src="/assets/scripts/${name}.js"><\/script>`).join('\n\t');
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${footer}</title>
	<link rel="stylesheet" href="/style.css">
	<style>
		@media print {
			@page {
				margin: 20mm 0;
				@bottom-left {
					content: "${footer}";
					font-family: "Limkin", sans-serif;
					font-size: 9pt;
					color: #3a3a3a;
					padding-left: 16mm;
				}
				@bottom-right {
					content: "page " counter(page) " of " counter(pages);
					font-family: "Limkin", sans-serif;
					font-size: 9pt;
					color: #3a3a3a;
					padding-right: 16mm;
				}
			}
			@page :first {
				margin-top: 0;
			}
		}
		/* preview only. a built page reserves a column for the course nav and, on a narrow screen, a strip along the top for the mobile menu bar — neither of which is here, and this pane is often narrow enough to trigger the second. it also insets the document with rounded corners, which wastes a pane this size. these rules come after style.css and match its own specificity, so they win at every width.
		   it's all margin: nothing about how the markdown itself renders is changed here. */
		.resource-container {
			grid-template-columns: minmax(0, 1fr);
			padding: 0;
		}
		.resource-main {
			margin: 0;
		}
		.resource-preview,
		.resource-preview-markdown-container,
		.resource-preview-markdown-nav {
			border-radius: 0;
		}
	</style>
</head>
<body>
	<div class="resource-container" style="--primary: var(--pink);" data-menu="0">
		<main class="resource-main resource-main-markdown">
			<div class="resource-preview">
				<div class="resource-preview-markdown-container">
					<article class="resource-preview-markdown">${body}</article>
				</div>
			</div>
		</main>
	</div>
	<script>
		// presentation.js reaches for these on its keyboard shortcuts without checking, so they stand in for the widget scripts that aren't loaded
		window.createPin = window.createTimer = window.createRandomizer = function () {};
	<\/script>
	${scripts}
	<script>
		// the presentation offers a button and a keyboard hint for each floating widget, whose scripts aren't loaded here. they're taken out of the controls rather than hidden with a rule: each one sits in a wrapper alongside its key hint, and the stylesheet already styles them through a selector no plain class of ours would outrank.
		for (let button of document.querySelectorAll('.presentation-pin-btn, .presentation-timer-btn, .presentation-randomizer-btn, .presentation-soundboard-btn, .presentation-draw-pin, .presentation-draw-newtimer, .presentation-draw-randomizer, .presentation-draw-soundboard')) {
			(button.closest('.presentation-control-item') || button).remove();
		}
	<\/script>
	<script>
		// put the reader back where they were before this rebuild. one attempt isn't enough: it lands before the fonts, images and print strips have settled, and the document grows underneath it — so the position is reapplied as the page finishes coming together, and dropped the moment the reader scrolls for themselves.
		(function () {
			let container = document.querySelector('.resource-preview-markdown-container');
			if (!container || !${scroll}) {
				return;
			}
			let behavior = container.style.scrollBehavior;
			container.style.scrollBehavior = 'auto';
			let live = true;
			function apply() {
				if (live) {
					container.scrollTop = ${scroll};
				}
			}
			for (let event of ['wheel', 'touchstart', 'keydown', 'pointerdown']) {
				container.addEventListener(event, () => {
					live = false;
					container.style.scrollBehavior = behavior;
				}, { once: true, passive: true });
			}
			apply();
			requestAnimationFrame(apply);
			window.addEventListener('load', apply);
			setTimeout(apply, 250);
			setTimeout(() => {
				apply();
				live = false;
				container.style.scrollBehavior = behavior;
			}, 700);
		})();
	<\/script>
</body>
</html>`;
}

// where the preview is currently scrolled to, so a rebuild can pick up from there
function previewScroll() {
	try {
		let container = frame.contentDocument.querySelector('.resource-preview-markdown-container');
		return container ? Math.round(container.scrollTop) : 0;
	} catch (error) {
		return 0;
	}
}

function render() {
	let source = text();
	// ids restart with each rebuild so they stay stable while typing, rather than climbing forever
	ClassroomMarkdown.resetCalendarIndex();
	ClassroomMarkdown.beginDocument(source);
	frame.srcdoc = buildDocument(ClassroomMarkdown.markdownToHTML(source), previewScroll());
}

// rebuilding on every keystroke would reload the stylesheet and the resource scripts each time, so typing settles first
let pending;
function changed() {
	saveDraft();
	// rebuilding while a presentation is running tears the slides down and starts them over from the first one, taking any drawing on the current slide with them — and pausing is the same hold, asked for by hand. either way the edits are kept and applied the moment the hold lifts.
	if (presenting || paused) {
		waiting = true;
		showHoldStatus();
		return;
	}
	clearTimeout(pending);
	pending = setTimeout(render, 350);
}
filenameField.addEventListener('input', () => {
	let clean = sanitizeName(filenameField.value);
	if (clean != filenameField.value) {
		// the swap is length-preserving, so putting the caret back where it was is enough
		let at = filenameField.selectionStart;
		filenameField.value = clean;
		filenameField.setSelectionRange(at, at);
	}
	changed();
});

// ——————————————————————————————
// TOOLS
// ——————————————————————————————

let tools = document.querySelector('.editor-tools');
let presenting = false;
let waiting = false;

function showHoldStatus() {
	clearTimeout(noteTimer);
	noteShowing = false;
	if (presenting) {
		statusLabel.dataset.note = 'paused';
		statusLabel.textContent = waiting ? 'presenting ~ preview paused, changes waiting' : 'presenting ~ preview paused';
	} else {
		updateCounts();
	}
}

// printing the frame rather than this page, so what comes out is the document and not the editor around it
document.getElementById('print').addEventListener('click', () => {
	frame.contentWindow.focus();
	frame.contentWindow.print();
});

// presenting stays in the pane it's already in rather than taking the screen, so the markdown behind it is still there to work on
document.getElementById('present').addEventListener('click', () => {
	if (!frame.contentWindow.openPresentation) {
		return;
	}
	clearTimeout(pending);
	presenting = true;
	waiting = false;
	tools.dataset.presenting = 1;
	showHoldStatus();
	frame.contentWindow.focus();
	frame.contentWindow.openPresentation();
	watchPresentation();
});

// closing the presentation from inside the frame (escape, or the close button) hands the preview back
function watchPresentation() {
	let overlay = frame.contentDocument.querySelector('.presentation');
	if (!overlay) {
		endPresentation();
		return;
	}
	let observer = new MutationObserver(() => {
		if (overlay.dataset.active != 1) {
			observer.disconnect();
			endPresentation();
		}
	});
	observer.observe(overlay, { attributes: true, attributeFilter: ['data-active'] });
}

function endPresentation() {
	presenting = false;
	delete tools.dataset.presenting;
	delete statusLabel.dataset.note;
	if (waiting) {
		waiting = false;
		render();
	}
	updateCounts();
}

// ——————————————————————————————
// DIVIDER
// ——————————————————————————————

// the panes are stacked rather than side by side on a narrow screen, so the divider moves the other axis there
let divider = document.getElementById('divider');
const stacked = () => window.matchMedia('(max-width: 900px)').matches;

function setSplit(ratio) {
	let value = `${(Math.min(0.85, Math.max(0.15, ratio)) * 100).toFixed(2)}%`;
	let property = stacked() ? '--split-v' : '--split';
	editorEl.style.setProperty(property, value);
	remember(property, value);
}

divider.addEventListener('pointerdown', (e) => {
	e.preventDefault();
	divider.setPointerCapture(e.pointerId);
	editorEl.dataset.dragging = 1;
});
divider.addEventListener('pointermove', (e) => {
	if (editorEl.dataset.dragging != 1) {
		return;
	}
	let rect = editorEl.getBoundingClientRect();
	setSplit(stacked() ? (e.clientY - rect.top) / rect.height : (e.clientX - rect.left) / rect.width);
});
for (let event of ['pointerup', 'pointercancel']) {
	divider.addEventListener(event, (e) => {
		delete editorEl.dataset.dragging;
		if (divider.hasPointerCapture(e.pointerId)) {
			divider.releasePointerCapture(e.pointerId);
		}
	});
}
// back to even
divider.addEventListener('dblclick', () => setSplit(0.5));
// and nudgeable from the keyboard, since it's focusable
divider.addEventListener('keydown', (e) => {
	let current = parseFloat(getComputedStyle(editorEl).getPropertyValue(stacked() ? '--split-v' : '--split')) || 50;
	if (e.key == 'ArrowLeft' || e.key == 'ArrowUp') {
		e.preventDefault();
		setSplit((current - 2) / 100);
	} else if (e.key == 'ArrowRight' || e.key == 'ArrowDown') {
		e.preventDefault();
		setSplit((current + 2) / 100);
	}
});

// ——————————————————————————————
// SAVED FILES
// ——————————————————————————————

// saved files live in this browser under one key, filed by name. saving under a name that's already there replaces it, which is what makes the save button a save rather than a fresh copy every time.
const FILES = 'gdwithgd-editor-files';

function readFiles() {
	try {
		let saved = JSON.parse(localStorage.getItem(FILES));
		return saved && typeof saved == 'object' ? saved : {};
	} catch (error) {
		return {};
	}
}

function writeFiles(files) {
	try {
		localStorage.setItem(FILES, JSON.stringify(files));
		return true;
	} catch (error) {
		// out of room, or site data blocked. the caller says so rather than pretending it worked.
		return false;
	}
}

function saveFile() {
	let name = filename();
	let files = readFiles();
	files[name] = { text: text(), saved: Date.now() };
	if (!writeFiles(files)) {
		note('couldn’t save — this browser’s storage is full', 'paused');
		return false;
	}
	markClean();
	note(`saved “${name}”`);
	if (library.open) {
		renderLibrary();
	}
	return true;
}

// whether the working text differs from whatever is saved under its name, which is what makes replacing it worth asking about.
// `baseline` is the last text that doesn't count as work — the starter document, or whatever was just opened or saved — so opening a page straight from the site doesn't stop to ask about text the writer never touched.
let baseline = '';
function markClean() {
	baseline = text();
}
function isDirty() {
	let value = text();
	if (value.trim() == '' || value == baseline) {
		return false;
	}
	let saved = readFiles()[filename()];
	return !saved || saved.text != value;
}

function openFile(name, entry) {
	if (isDirty() && !confirm(`Opening “${name}” will replace the unsaved changes in the editor. Continue?`)) {
		return;
	}
	setText(entry.text);
	filenameField.value = name;
	markClean();
	clearTimeout(pending);
	render();
	library.close();
	note(`opened “${name}”`);
}

function downloadText(name, value) {
	downloadBlob(`${name}.md`, new Blob([value], { type: 'text/markdown' }));
}

// a zip is a run of file records followed by a directory of where each one started. writing it out by hand is a page of code, but it's a page that never goes stale — the alternative was carrying a compression library for a single button, or firing off one download per file and making the browser ask about it.
const crcTable = (() => {
	let table = new Uint32Array(256);
	for (let i = 0; i < 256; i++) {
		let c = i;
		for (let bit = 0; bit < 8; bit++) {
			c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
		}
		table[i] = c >>> 0;
	}
	return table;
})();

function crc32(bytes) {
	let c = 0xFFFFFFFF;
	for (let i = 0; i < bytes.length; i++) {
		c = crcTable[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
	}
	return (c ^ 0xFFFFFFFF) >>> 0;
}

// the browser's own deflate, where it has one. markdown packs down to about a third of its size; without it the entries simply go in whole, which is just as valid a zip.
async function deflate(bytes) {
	if (typeof CompressionStream != 'function') {
		return null;
	}
	try {
		let packed = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
		return new Uint8Array(await new Response(packed).arrayBuffer());
	} catch (error) {
		return null;
	}
}

async function zip(entries) {
	let encoder = new TextEncoder();
	let parts = [];
	let directory = [];
	let offset = 0;

	// zip keeps timestamps in the DOS format: seconds in two-second steps, and years counted from 1980
	let now = new Date();
	let time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
	let date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

	for (let entry of entries) {
		let name = encoder.encode(entry.name);
		let raw = encoder.encode(entry.text);
		let crc = crc32(raw);
		let packed = await deflate(raw);
		let deflated = packed != null && packed.length < raw.length;
		let data = deflated ? packed : raw;

		let header = new DataView(new ArrayBuffer(30));
		header.setUint32(0, 0x04034b50, true);
		header.setUint16(4, 20, true);
		// bit 11 says the name is UTF-8
		header.setUint16(6, 0x0800, true);
		header.setUint16(8, deflated ? 8 : 0, true);
		header.setUint16(10, time, true);
		header.setUint16(12, date, true);
		header.setUint32(14, crc, true);
		header.setUint32(18, data.length, true);
		header.setUint32(22, raw.length, true);
		header.setUint16(26, name.length, true);
		parts.push(new Uint8Array(header.buffer), name, data);

		let record = new DataView(new ArrayBuffer(46));
		record.setUint32(0, 0x02014b50, true);
		record.setUint16(4, 20, true);
		record.setUint16(6, 20, true);
		record.setUint16(8, 0x0800, true);
		record.setUint16(10, deflated ? 8 : 0, true);
		record.setUint16(12, time, true);
		record.setUint16(14, date, true);
		record.setUint32(16, crc, true);
		record.setUint32(20, data.length, true);
		record.setUint32(24, raw.length, true);
		record.setUint16(28, name.length, true);
		record.setUint32(42, offset, true);
		directory.push(new Uint8Array(record.buffer), name);

		offset += 30 + name.length + data.length;
	}

	let directorySize = directory.reduce((total, part) => total + part.length, 0);
	let end = new DataView(new ArrayBuffer(22));
	end.setUint32(0, 0x06054b50, true);
	end.setUint16(8, entries.length, true);
	end.setUint16(10, entries.length, true);
	end.setUint32(12, directorySize, true);
	end.setUint32(16, offset, true);

	return new Blob([...parts, ...directory, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

function downloadBlob(name, blob) {
	let url = URL.createObjectURL(blob);
	let link = document.createElement('a');
	link.href = url;
	link.download = name;
	document.body.appendChild(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// how long ago, in the roughest terms that are still useful; the exact time is on the tooltip
function when(stamp) {
	let ago = Date.now() - stamp;
	if (ago < 60000) {
		return 'just now';
	}
	if (ago < 3600000) {
		return `${Math.floor(ago / 60000)} min ago`;
	}
	if (ago < 86400000) {
		let hours = Math.floor(ago / 3600000);
		return `${hours} hour${hours == 1 ? '' : 's'} ago`;
	}
	if (ago < 604800000) {
		let days = Math.floor(ago / 86400000);
		return `${days} day${days == 1 ? '' : 's'} ago`;
	}
	return new Date(stamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

let library = document.getElementById('library');
let libraryList = document.getElementById('library-list');
let libraryFooter = document.getElementById('library-footer');

function renderLibrary() {
	let files = readFiles();
	// most recently saved first, since that's what you're most likely coming back for
	let names = Object.keys(files).sort((a, b) => files[b].saved - files[a].saved);
	libraryList.replaceChildren();
	libraryFooter.hidden = names.length == 0;

	if (names.length == 0) {
		let empty = document.createElement('p');
		empty.className = 'editor-dialog-empty';
		empty.innerHTML = 'nothing saved yet!<br><br>press the “💾 save” button to keep the file you’re working on.<br><br>warning: saved files are stored only locally in this browser on your computer, so if you clear cookies/cache you’ll lose this data!';
		libraryList.appendChild(empty);
		return;
	}

	for (let name of names) {
		let entry = files[name];
		let row = document.createElement('div');
		row.className = 'editor-file';

		let open = document.createElement('button');
		open.className = 'editor-file-open';
		open.type = 'button';
		open.title = `Open “${name}”`;
		let title = document.createElement('span');
		title.className = 'editor-file-name';
		title.textContent = `${name}.md`;
		let meta = document.createElement('span');
		meta.className = 'editor-file-meta';
		meta.textContent = `saved ${when(entry.saved)} · ${entry.text.length.toLocaleString()} characters`;
		meta.title = new Date(entry.saved).toLocaleString();
		open.append(title, meta);
		open.addEventListener('click', () => openFile(name, entry));
		row.appendChild(open);

		let actions = [
			{
				emoji: '✏️',
				label: `Rename “${name}”`,
				run: () => {
					let asked = prompt(`Rename “${name}.md” to:`, name);
					if (asked == null) {
						return;
					}
					let renamed = sanitizeName(asked.trim().replace(/\.md$/i, ''));
					if (renamed == '' || renamed == name) {
						return;
					}
					// a rename onto a name already in use would quietly swallow the file that's there
					if (files[renamed]) {
						alert(`There’s already a file called “${renamed}.md”.`);
						return;
					}
					files[renamed] = files[name];
					delete files[name];
					if (!writeFiles(files)) {
						note('couldn’t rename — this browser’s storage is full', 'paused');
						return;
					}
					// the file being renamed might be the one open in the editor
					if (filename() == name) {
						filenameField.value = renamed;
					}
					renderLibrary();
				}
			},
			{
				emoji: '👯',
				label: `Duplicate “${name}”`,
				run: () => {
					// "name-copy", then "name-copy-2", and so on until one is free
					let copy = `${name}-copy`;
					let n = 2;
					while (files[copy]) {
						copy = `${name}-copy-${n}`;
						n++;
					}
					files[copy] = { text: entry.text, saved: Date.now() };
					if (writeFiles(files)) {
						renderLibrary();
					} else {
						note('couldn’t duplicate — this browser’s storage is full', 'paused');
					}
				}
			},
			{
				emoji: '⬇️',
				label: `Download “${name}”`,
				run: () => downloadText(name, entry.text)
			},
			{
				emoji: '🗑️',
				danger: true,
				label: `Erase “${name}”`,
				run: () => {
					if (!confirm(`Erase “${name}.md”? This can’t be undone.`)) {
						return;
					}
					delete files[name];
					writeFiles(files);
					renderLibrary();
				}
			}
		];
		for (let action of actions) {
			let button = document.createElement('button');
			button.className = 'editor-file-action';
			button.type = 'button';
			button.textContent = action.emoji;
			button.title = action.label;
			button.setAttribute('aria-label', action.label);
			if (action.danger) {
				button.dataset.danger = 1;
			}
			button.addEventListener('click', action.run);
			row.appendChild(button);
		}

		libraryList.appendChild(row);
	}
}

document.getElementById('save').addEventListener('click', saveFile);

// a fresh page: a heading and a paragraph, under the first new-page-N name that isn't taken
document.getElementById('new').addEventListener('click', () => {
	if (isDirty() && !confirm('Starting a new page will replace the unsaved changes in the editor. Continue?')) {
		return;
	}
	let files = readFiles();
	let number = 1;
	while (files[`new-page-${number}`]) {
		number++;
	}
	let name = `new-page-${number}`;

	setText('# Heading\n\nParagraph.\n');
	filenameField.value = name;
	markClean();
	files[name] = { text: text(), saved: Date.now() };
	if (writeFiles(files)) {
		note(`created “${name}”`);
	} else {
		note('couldn’t save — this browser’s storage is full', 'paused');
	}
	clearTimeout(pending);
	render();
	if (library.open) {
		renderLibrary();
	}
});
document.getElementById('load').addEventListener('click', () => {
	renderLibrary();
	library.showModal();
});
document.getElementById('library-close').addEventListener('click', () => library.close());
// a click that lands on the dialog element itself came down on the backdrop around it, since the panel inside covers the dialog box entirely
library.addEventListener('click', (e) => {
	if (e.target == library) {
		library.close();
	}
});

document.getElementById('download-all').addEventListener('click', async () => {
	let files = readFiles();
	let names = Object.keys(files);
	if (names.length == 0) {
		return;
	}
	let stamp = new Date().toISOString().slice(0, 10);
	let archive = await zip(names.map(name => ({ name: `${name}.md`, text: files[name].text })));
	downloadBlob(`markdown-files-${stamp}.zip`, archive);
});

document.getElementById('erase-all').addEventListener('click', () => {
	let count = Object.keys(readFiles()).length;
	if (count == 0 || !confirm(`Erase all ${count} saved file${count == 1 ? '' : 's'}? This can’t be undone.`)) {
		return;
	}
	writeFiles({});
	renderLibrary();
});

// ——————————————————————————————
// FILES ON DISK
// ——————————————————————————————

let fileInput = document.getElementById('file');
document.getElementById('upload').addEventListener('click', () => fileInput.click());

function load(file) {
	let reader = new FileReader();
	reader.onload = () => {
		if (isDirty() && !confirm(`Opening “${file.name}” will replace the unsaved changes in the editor. Continue?`)) {
			return;
		}
		setText(reader.result);
		filenameField.value = file.name.replace(/\.(md|markdown|txt)$/i, '');
		markClean();
		clearTimeout(pending);
		render();
	};
	reader.readAsText(file);
}

fileInput.addEventListener('change', () => {
	if (fileInput.files[0]) {
		load(fileInput.files[0]);
	}
	// cleared so the same file can be picked again after editing it elsewhere
	fileInput.value = '';
});

document.getElementById('download').addEventListener('click', () => downloadText(filename(), text()));

// cmd-S saves into the browser rather than downloading, which is the one you reach for while writing
document.addEventListener('keydown', (e) => {
	if ((e.metaKey || e.ctrlKey) && e.key == 's') {
		e.preventDefault();
		saveFile();
	}
});

// dropping a markdown file anywhere on the page loads it, same as the upload button
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => {
	e.preventDefault();
	if (e.dataTransfer.files[0]) {
		load(e.dataTransfer.files[0]);
	}
});

// ——————————————————————————————
// DRAFT AND SETTINGS
// ——————————————————————————————

function saveDraft() {
	try {
		localStorage.setItem(STORAGE, JSON.stringify({ name: filenameField.value, text: text() }));
	} catch (error) {
		// as above
	}
}
function restoreDraft() {
	try {
		let saved = JSON.parse(localStorage.getItem(STORAGE));
		if (saved && typeof saved.text == 'string') {
			setText(saved.text);
			if (saved.name) {
				filenameField.value = saved.name;
			}
			return true;
		}
	} catch (error) {
		// nothing to come back to
	}
	return false;
}

for (let property of ['--split', '--split-v']) {
	let saved = recall(property);
	if (saved) {
		editorEl.style.setProperty(property, saved);
	}
}
setToolbar(recall('toolbar') != '0');
// the editor was already built with this, so the button is only being brought into line with it
setSpellcheck(spellcheckOn);
setPause(recall('paused') == '1');
setFontSize(parseInt(recall('fontsize')) || 14);

// the starter document never counts as work — not on a first visit, and not when a draft of it comes back untouched — so nothing stops to ask about replacing it
const STARTER = `# 📝 Untitled

Write markdown on the left and watch it build on the right. Every button above drops in one of the shortcodes the site understands.

[slide]

## ✅ Try it

- Press **present** to step through the slides.
- Press **print** to check the page breaks.
- Press **💾 save** to keep this in the browser, and **💿 load** to come back to it.

---
`;
if (!restoreDraft()) {
	setText(STARTER);
}
baseline = STARTER;
updateCounts();
render();

// ——————————————————————————————
// OPENING A PAGE FROM THE SITE
// ——————————————————————————————

// the ✍️ button on a built markdown page links here with ?src= pointing at the markdown it was made from, so a page can be opened straight from where it's published.
(function () {
	let src = new URLSearchParams(location.search).get('src');
	if (!src) {
		return;
	}
	// the query goes as soon as it's read, so a reload doesn't ask to replace the work all over again
	history.replaceState({}, '', location.pathname);

	// only paths within the site: anything else would be someone else's page pulled into the editor
	if (!src.startsWith('/') || src.startsWith('//')) {
		note('couldn’t open that file', 'paused');
		return;
	}
	let name = decodeURIComponent(src.split('/').pop() || '').replace(/\.(md|markdown|txt)$/i, '');
	if (isDirty() && !confirm(`Opening “${name}” will replace the unsaved changes in the editor. Continue?`)) {
		return;
	}
	fetch(src)
		.then(response => response.ok ? response.text() : Promise.reject(response.status))
		.then(markdown => {
			setText(markdown);
			filenameField.value = name;
			markClean();
			clearTimeout(pending);
			render();
			note(`opened “${name}”`);
		})
		.catch(() => note(`couldn’t open ${src}`, 'paused'));
})();
