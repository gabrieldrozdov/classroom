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
			{ label: '{c: color}', before: '{c:primary ', placeholder: 'colored text', after: '}' },
			{ label: '{h: highlight}', before: '{h:primary ', placeholder: 'highlighted text', after: '}' },
			{ label: '\\ escape', before: '\\', placeholder: '*' }
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
			{ label: '↳ sub item', block: true, before: '\t- ', placeholder: 'Sub item' },
			{ label: '> quote', block: true, before: '> ', placeholder: 'Quoted text' },
			{ label: 'code block', block: true, before: '```\n', placeholder: 'code here', after: '\n```' },
			{ label: '--- divider', block: true, before: '---' },
			{ label: '--- colored', block: true, before: '--- ', placeholder: 'primary', after: ' solid' }
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
			{ label: '::: bg', block: true, before: '::: bg ', placeholder: 'primary', after: '\n\nContent inside the band.\n\n:::' },
			{ label: '::: calendar', block: true, before: '::: calendar\n\n[9/15/26]\n', placeholder: 'First day of class.', after: '\n\n[9/22/26 - 10/6/26 primary]\nProject one.\n\n:::' },
			{ label: '::: files', block: true, before: '::: files ', placeholder: 'my-site', after: '\n\nindex.html\nstyle.css\nimages\n\tlogo.svg\n\n:::' },
			{ label: '::: big', block: true, before: '::: big\n\n', placeholder: 'A big, centered line.', after: '\n\n:::' },
			{ label: '::: notes', block: true, before: '::: notes\n\n', placeholder: 'Speaker notes, never shown on the page.', after: '\n\n:::' }
		]
	},
	{
		label: 'tables',
		color: 'purple',
		items: [
			{ label: 'table', block: true, before: '| ', placeholder: 'Column', after: ' | Column |\n| --- | --- |\n| Cell | Cell |\n| Cell | Cell |' },
			{ label: 'table widths', block: true, before: '| ', placeholder: 'Wide', after: ' | Narrow | Narrow |\n| --- 2 | --- 1 | --- 1 |\n| Cell | Cell | Cell |' },
			{ label: 'table spans', block: true, before: '| ', placeholder: 'Column', after: ' | Column | Column |\n| --- | --- | --- |\n| {bg:primary} Across three columns | < | < |\n| {bg:primary} Down two rows | Cell | Cell |\n| ^ | Cell | Cell |' },
			{ label: '{bg: cell}', before: '{bg:primary} ' },
			{ label: '{center} cell', before: '{center} ' },
			{ label: '\\ cell line', before: ' \\ ' }
		]
	},
	{
		label: 'flow',
		color: 'red',
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

// a filter across every shortcode. nothing is hidden or disabled by it — whatever doesn't match only fades, so the toolbar keeps its shape and a near miss is still one click away.
// it's a bare input rather than anything wrapped, because the css colors the groups by counting spans and divs, and a wrapper would count as one.
let search = document.createElement('input');
search.type = 'search';
search.className = 'editor-search';
search.placeholder = 'search shortcodes';
search.spellcheck = false;
search.autocomplete = 'off';
search.setAttribute('aria-label', 'Search shortcodes');
toolbar.appendChild(search);

function filterShortcodes() {
	let term = search.value.trim().toLowerCase();
	for (let button of toolbar.querySelectorAll('.editor-button')) {
		// the group's name counts too, so "tables" lights up everything in the tables group
		let match = term == '' || button.dataset.search.includes(term);
		if (match) {
			delete button.dataset.faded;
		} else {
			button.dataset.faded = 1;
		}
	}
}
search.addEventListener('input', filterShortcodes);
search.addEventListener('keydown', (e) => {
	if (e.key == 'Escape' && search.value != '') {
		e.preventDefault();
		search.value = '';
		filterShortcodes();
	}
});

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
		button.dataset.search = `${group.label} ${item.label}`.toLowerCase();
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
	// an embed has no text of its own to count, and the text under the cover isn't what's on screen, so the bar says what is — or, with nothing on screen, nothing
	if (editorEl.dataset.cover) {
		delete statusLabel.dataset.note;
		statusLabel.replaceChildren();
		if (viewing) {
			let label = document.createElement('span');
			label.textContent = viewing['url'];
			statusLabel.appendChild(label);
		}
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

// every load of the preview goes into a new frame put in place of the old one, rather than into the same frame again. changing src or srcdoc on a frame that's already on the page is a navigation, and every navigation of a frame lands in the tab's history — so each rebuild and each embed opened was another step the back button had to take before it left the editor. a frame that loads as it's put on the page doesn't count as one.
function loadFrame(attribute, value) {
	let fresh = document.createElement('iframe');
	fresh.id = frame.id;
	fresh.className = frame.className;
	fresh.title = frame.title;
	fresh.setAttribute(attribute, value);
	frame.replaceWith(fresh);
	frame = fresh;
}

function render() {
	// an embed (or nothing) is in the preview, and the text's own preview comes back when the cover goes
	if (editorEl.dataset.cover) {
		return;
	}
	let source = text();
	// ids restart with each rebuild so they stay stable while typing, rather than climbing forever
	ClassroomMarkdown.resetCalendarIndex();
	ClassroomMarkdown.beginDocument(source);
	loadFrame('srcdoc', buildDocument(ClassroomMarkdown.markdownToHTML(source), previewScroll()));
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
// COVER
// ——————————————————————————————

// what goes over the writing side when there's nothing there to write: an embed opened from the sidebar, which has no markdown behind it, or the ✍️ tool pressed on a page that isn't one resource (the home page, a course page), asking for a pick. either way the text that was open stays underneath, untouched, and comes back when the cover goes.
let cover = document.getElementById('cover');
let sourceHeader = document.querySelector('.editor-source-header');

// the embed in the preview, if that's what's there
let viewing = null;

// the url of whatever is on screen, for the sidebar to mark and for ⚙️ and 🔗 to act on. while the pick prompt is up, nothing is.
function openUrl() {
	if (viewing) {
		return viewing['url'];
	}
	return editorEl.dataset.cover ? null : source;
}

function showCover(kind, options) {
	editorEl.dataset.cover = kind;
	cover.hidden = false;
	document.getElementById('cover-emoji').textContent = options.emoji || '';
	document.getElementById('cover-title').textContent = options.title || '';

	let lines = document.getElementById('cover-lines');
	lines.replaceChildren();
	for (let line of options.lines || []) {
		let p = document.createElement('p');
		p.className = 'editor-cover-line';
		p.textContent = line;
		lines.appendChild(p);
	}

	// out of reach while it's covered, keyboard included — except the sidebar, which is where the way out is, and what's open's own settings and address
	for (let node of sourceHeader.children) {
		node.inert = !['toggle-sidebar', 'settings', 'open'].includes(node.id);
	}
	view.contentDOM.blur();
	updateCounts();
	if (typeof markOpenInSidebar == 'function') {
		markOpenInSidebar(openUrl());
	}
}

// hands back whether anything was covered, since then the preview isn't the text's and has to be built again
function closeCover() {
	if (!editorEl.dataset.cover) {
		return false;
	}
	viewing = null;
	delete editorEl.dataset.cover;
	cover.hidden = true;
	for (let node of sourceHeader.children) {
		node.inert = false;
	}
	if (typeof markOpenInSidebar == 'function') {
		markOpenInSidebar(source);
	}
	updateCounts();
	return true;
}

// back to the text that was open before, which was never touched
function backToWriting() {
	if (closeCover()) {
		render();
	}
	view.focus();
}

// the preview with nothing in it, for while the pick prompt is up
function blankPreview() {
	clearTimeout(pending);
	if (presenting) {
		endPresentation();
	}
	loadFrame('srcdoc', '');
}

// an embed in the preview, as it'd be on its page: the url in a frame, or — for one that has to open in a new tab because the site it's on won't be framed — the same note the built page shows
function openEmbed(resource) {
	viewing = resource;
	clearTimeout(pending);
	// the presentation lives in the frame that's about to be replaced, so it's over either way
	if (presenting) {
		endPresentation();
	}
	if (resource['newtab']) {
		loadFrame('srcdoc', newtabDocument(resource));
	} else {
		loadFrame('src', resource['url']);
	}
	showCover('embed', {
		emoji: resource['emoji'] || '🔗',
		title: resource['name'] || 'untitled embed',
		lines: [
			`${resource['newtab'] ? 'opens in a new tab' : 'an embed'} ~ there’s no markdown behind it to write, so the preview shows what the page shows`
		]
	});
}

function escapeHTML(value) {
	return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// the built page's new-tab note in the preview's shell, with the same margins taken off as buildDocument takes off
function newtabDocument(resource) {
	let url = escapeHTML(resource['url']);
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="stylesheet" href="/style.css">
	<style>
		.resource-container {
			grid-template-columns: minmax(0, 1fr);
			padding: 0;
		}
		/* the built page keeps a 40px row at the top for the url bar, which isn't here, so the note gets the whole of it */
		.resource-main {
			margin: 0;
			height: 100dvh;
			grid-template-rows: minmax(0, 1fr);
		}
		.resource-preview {
			border-radius: 0;
		}
		.resource-preview-newtab-container {
			border-top: unset;
		}
	</style>
</head>
<body>
	<div class="resource-container" style="--primary: var(--pink);" data-menu="0">
		<main class="resource-main">
			<div class="resource-preview">
				<div class="resource-preview-newtab-container">
					<div class="resource-preview-newtab">
						<p>To view this resource, you’ll need to open it in a new tab.</p>
						<a href="${url}" target="_blank">Open in new tab&nbsp;&nbsp;↗</a>
					</div>
				</div>
			</div>
		</main>
	</div>
</body>
</html>`;
}

// ——————————————————————————————
// DIVIDER
// ——————————————————————————————

// the panes are stacked rather than side by side on a narrow screen, so the divider moves the other axis there
let divider = document.getElementById('divider');
let sourcePane = document.querySelector('.editor-source');
const stacked = () => window.matchMedia('(max-width: 900px)').matches;

// the split is kept as a share of what the two panes have between them, rather than as the width the css ends up with. the sidebar has a column of its own, so that width changes whenever the sidebar opens, closes, or the window is resized — and a share survives all three, where a saved percentage would drift a little further out of place each time.
let splits = { '--split': Number(recall('split')) || 0.5, '--split-v': Number(recall('split-v')) || 0.5 };

// how much of the editor's width the panes actually have: everything to the right of where the plaintext pane starts. stacked, the sidebar comes over the top instead of beside, so they have all of it.
function paneShare() {
	let rect = editorEl.getBoundingClientRect();
	if (stacked() || rect.width == 0) {
		return 1;
	}
	return (rect.width - (sourcePane.getBoundingClientRect().left - rect.left)) / rect.width;
}

// --split is written as a share of the whole editor, since that's what a grid column percentage resolves against
function applySplit() {
	editorEl.style.setProperty('--split', `${(splits['--split'] * paneShare() * 100).toFixed(2)}%`);
	editorEl.style.setProperty('--split-v', `${(splits['--split-v'] * 100).toFixed(2)}%`);
}

function setSplit(ratio) {
	let property = stacked() ? '--split-v' : '--split';
	splits[property] = Math.min(0.85, Math.max(0.15, ratio));
	remember(property == '--split-v' ? 'split-v' : 'split', splits[property]);
	applySplit();
}

// the sidebar's column is part of the sum, and so is the window
window.addEventListener('resize', applySplit);

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
	// measured from where the plaintext pane starts rather than from the edge of the editor, so the divider lands under the pointer whether or not the sidebar is open
	setSplit(stacked() ? (e.clientY - rect.top) / rect.height : (e.clientX - sourcePane.getBoundingClientRect().left) / (rect.width * paneShare()));
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
	let current = splits[stacked() ? '--split-v' : '--split'];
	if (e.key == 'ArrowLeft' || e.key == 'ArrowUp') {
		e.preventDefault();
		setSplit(current - 0.02);
	} else if (e.key == 'ArrowRight' || e.key == 'ArrowDown') {
		e.preventDefault();
		setSplit(current + 0.02);
	}
});

// ——————————————————————————————
// FILES
// ——————————————————————————————

// every file the editor works on is a real file in assets/markdown — a course page where the course keeps its pages, a draft in the drafts folder. nothing is kept in this browser, so what's on screen is what's on disk, and a page opened here is the same page the build reads.

// `baseline` is the last text that doesn't count as work — the starter document, or whatever was just opened or saved — so reading a page without touching it doesn't stop to ask about changes nobody made.
let baseline = '';
function markClean() {
	baseline = text();
	// "clean" is part of what a reload comes back to, so it's written down along with the text
	saveDraft();
}
function isDirty() {
	let value = text();
	return value.trim() != '' && value != baseline;
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

function downloadText(name, value) {
	downloadBlob(`${name}.md`, new Blob([value], { type: 'text/markdown' }));
}

// ——————————————————————————————
// CONNECTED TO THE SITE
// ——————————————————————————————

// running `node dev.js` puts a small server in front of the repo, and the editor becomes a way of working on the site itself: the sidebar lists what the site is made of, saving writes the file the page is built from, and media lands in a folder beside it. all of it is behind a check for that server, so classroom.gdwithgd.com/editor/ stays the scratchpad it always was — type, and download what you typed.
// `source` is the repo path of the file the open text came from. it's what makes saving a save rather than a guess, and what tells an uploaded image which folder it belongs in — so anything that replaces the text without coming from a file clears it.
let connected = false;
let source = null;

// pages nothing points at yet. they're ordinary files in the ordinary place, so a draft becomes a course page by being pointed at rather than by being moved.
const DRAFTS = '/assets/markdown/drafts';

// the first new-page-N the drafts folder doesn't already have
function newDraftName() {
	let taken = new Set((typeof drafts == 'object' && drafts ? drafts : []).map(draft => draft.name));
	let number = 1;
	while (taken.has(`new-page-${number}`)) {
		number++;
	}
	return `new-page-${number}`;
}

let sourceChip = document.getElementById('source');
let sourcePath = document.getElementById('source-path');
let saveButton = document.getElementById('save');
let mediaButton = document.getElementById('media');

function updateSiteButtons() {
	// with no server there's nowhere to write, so the buttons that write aren't there either
	saveButton.hidden = !connected;
	// media needs a page to sit beside, which an unsaved draft doesn't have yet
	mediaButton.hidden = !connected || !source;
}

function setConnected(on) {
	connected = on;
	if (!on) {
		setSource(null);
	}
	updateSiteButtons();
	if (typeof renderSidebar == 'function') {
		renderSidebar();
	}
}

function setSource(url) {
	source = url || null;
	if (source) {
		// the folder is what's worth showing — the name sits in the field beside it, and that field is what a save writes to
		sourcePath.textContent = source.replace(/^\/assets\/markdown\//, '').replace(/[^/]+$/, '');
		sourcePath.title = source;
	}
	sourceChip.hidden = !source;
	updateSiteButtons();
	if (typeof markOpenInSidebar == 'function') {
		markOpenInSidebar(openUrl());
	}
	// the text of a newly opened page is written down the moment it's set, which is before its name and path are — so without this, a reload straight after opening a page came back with that page's text under the previous file's name, or as untitled. it's written again here, now that all three agree.
	saveDraft();
}

// the folder part of a path, trailing slash included
function folderOf(url) {
	return url.replace(/[^/]+$/, '');
}

// a message that stays until something replaces it, for the stretch where a save or an upload is out at the server
function working(message) {
	clearTimeout(noteTimer);
	noteShowing = true;
	statusLabel.textContent = message;
	statusLabel.dataset.note = 'working';
}

function clearNote() {
	clearTimeout(noteTimer);
	noteShowing = false;
	delete statusLabel.dataset.note;
	updateCounts();
}

// the server going away mid-request is the one failure worth handling everywhere: the buttons come off rather than staying on to fail again
function lostServer() {
	setConnected(false);
	note('the local server stopped answering', 'paused');
}

async function post(endpoint, body) {
	let response = await fetch(endpoint, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	return await response.json();
}

// ——————————————————————————————

// write the open text to disk, then wait for the rebuild so the note can say the site is current rather than only that the file is.
// a page with nowhere to go yet becomes a draft, which is an ordinary file in the drafts folder rather than anything special.
async function save() {
	// with an embed on screen the text is covered over, and writing out something you can't see isn't a save anyone asked for
	if (!connected || viewing) {
		return;
	}
	// the name in the field is what gets written, so renaming it writes a new file in the same folder instead of quietly saving over the one that was opened
	let folder = source ? folderOf(source) : `${DRAFTS}/`;
	let target = `${folder}${filename()}.md`;
	if (source && target != source && !confirm(`Save this as “${filename()}.md”? That makes a new file in ${folder} ~ the page you opened stays as it was.`)) {
		return;
	}
	working(`saving ${filename()}.md…`);
	let result;
	try {
		result = await post('/_dev/save', { path: target, text: text() });
	} catch (error) {
		lostServer();
		return;
	}
	if (!result.ok) {
		note(result.message || 'couldn’t save', 'paused');
		return;
	}
	setSource(result.path);
	markClean();
	if (result.draft) {
		note(`saved to ${result.path}`);
	} else if (result.built) {
		note(`saved · site rebuilt in ${(result.ms / 1000).toFixed(1)}s`);
	} else {
		// the file is on disk either way, which is the part worth being clear about
		note(`saved, but the build failed ~ ${result.message}`, 'paused');
	}
	if (typeof refreshSidebar == 'function') {
		refreshSidebar();
	}
}

// open a page from the file it's built from, rather than from a copy of it
async function openPage(url) {
	let name = url.split('/').pop();
	if (isDirty() && !confirm(`Opening “${name}” will replace the unsaved changes in the editor. Continue?`)) {
		return false;
	}
	try {
		let response = await fetch(url, { cache: 'no-store' });
		if (!response.ok) {
			throw new Error();
		}
		setText(await response.text());
	} catch (error) {
		note(`couldn’t open ${url}`, 'paused');
		return false;
	}
	filenameField.value = name.replace(/\.md$/i, '');
	closeCover();
	setSource(url);
	markClean();
	clearTimeout(pending);
	render();
	note(`opened ${url}`);
	return true;
}

// media lands in a media folder beside the markdown, matching where type-and-code-v3 already keeps its images, and the shortcode for it lands at the cursor.
// files go up as base64 inside the json body — a form-data parser was more server than one upload button is worth.
async function uploadMedia(files) {
	if (!connected) {
		note('media uploads need the local server', 'paused');
		return;
	}
	if (viewing) {
		note('open a markdown page to put media on it', 'paused');
		return;
	}
	if (!source) {
		note('save the page first, so the media has a folder to go in', 'paused');
		return;
	}
	let added = [];
	for (let file of files) {
		working(`uploading ${file.name}…`);
		let data;
		try {
			data = await new Promise((resolve, reject) => {
				let reader = new FileReader();
				reader.onload = () => resolve(String(reader.result));
				reader.onerror = () => reject(reader.error);
				reader.readAsDataURL(file);
			});
		} catch (error) {
			note(`couldn’t read ${file.name}`, 'paused');
			continue;
		}
		let result;
		try {
			result = await post('/_dev/media', { path: source, name: file.name, data: data });
		} catch (error) {
			lostServer();
			return;
		}
		if (!result.ok) {
			note(result.message || `couldn’t upload ${file.name}`, 'paused');
			continue;
		}
		// the filename makes a serviceable first draft of the alt text, and it's selected on the way in so it can be typed over
		added.push({ url: result.url, alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() });
	}
	if (added.length == 0) {
		return;
	}
	if (added.length == 1) {
		insert({ block: true, before: '![', placeholder: added[0].alt, after: `](${added[0].url})` });
	} else {
		insert({ block: true, before: added.map(item => `![${item.alt}](${item.url})`).join('\n\n') });
	}
	note(`added ${added.length} file${added.length == 1 ? '' : 's'} to ${folderOf(source)}media/ ~ save to keep the page pointing at ${added.length == 1 ? 'it' : 'them'}`);
}

// ——————————————————————————————

saveButton.addEventListener('click', save);

document.getElementById('source-detach').addEventListener('click', () => {
	setSource(null);
	note('no longer saving to a file on disk');
});

let mediaInput = document.getElementById('media-file');
mediaButton.addEventListener('click', () => mediaInput.click());
mediaInput.addEventListener('change', () => {
	if (mediaInput.files.length > 0) {
		uploadMedia([...mediaInput.files]);
	}
	// cleared so the same file can be picked again after replacing it on disk
	mediaInput.value = '';
});

// the check only runs on a local address, so the published editor never asks for an endpoint that isn't there
(function () {
	if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
		return;
	}
	fetch('/_dev/status', { cache: 'no-store' })
		.then(response => response.ok ? response.json() : Promise.reject())
		.then((result) => {
			if (!result.ok) {
				return;
			}
			setConnected(true);
			if (typeof receiveStatus == 'function') {
				receiveStatus(result);
			}
			if (source && restoredClean && !openedFromLink && !isDirty()) {
				openPage(source);
			}
			// the ✍️ tool's page, which could only be matched to a resource once the collection was here
			if (requestedPage && typeof openFromSite == 'function') {
				openFromSite(requestedPage);
				requestedPage = null;
			}
			if (!result.writing) {
				note('connected, but this isn’t the computer running the server ~ nothing here can change files', 'paused');
			}
		})
		.catch(() => {
			// no server, which is the ordinary case: the editor stays the published one
		});
})();

// ——————————————————————————————
// FILES ON DISK
// ——————————————————————————————

// there's no upload button any more, but a markdown file dragged onto the window still opens — it's the one way in for something that isn't already in the site
function load(file) {
	let reader = new FileReader();
	reader.onload = () => {
		if (isDirty() && !confirm(`Opening “${file.name}” will replace the unsaved changes in the editor. Continue?`)) {
			return;
		}
		setText(reader.result);
		filenameField.value = file.name.replace(/\.(md|markdown|txt)$/i, '');
		closeCover();
		setSource(null);
		markClean();
		clearTimeout(pending);
		render();
	};
	reader.readAsText(file);
}

// cmd-S writes the file and rebuilds, which is the save you reach for while writing. with no server there's nothing to write to, so it downloads instead.
document.addEventListener('keydown', (e) => {
	if ((e.metaKey || e.ctrlKey) && e.key == 's') {
		e.preventDefault();
		if (connected) {
			save();
		} else {
			downloadText(filename(), text());
		}
	}
});

// dropping a markdown file anywhere on the page loads it, same as the upload button. anything else dropped is media for the page that's open, which only means something with a server to put it somewhere — so the outline only shows when there's a folder for it to land in.
document.addEventListener('dragover', (e) => {
	e.preventDefault();
	if (connected && source && [...(e.dataTransfer.types || [])].includes('Files')) {
		editorEl.dataset.dropping = 1;
	}
});
document.addEventListener('dragleave', (e) => {
	// only when the pointer has left the window, rather than every time it crosses something inside it
	if (e.relatedTarget == null) {
		delete editorEl.dataset.dropping;
	}
});
document.addEventListener('drop', (e) => {
	e.preventDefault();
	delete editorEl.dataset.dropping;
	let files = [...(e.dataTransfer.files || [])];
	if (files.length == 0) {
		return;
	}
	// a markdown file is a page to open, and opening two at once isn't a thing, so the first one wins
	let markdown = files.find(file => /\.(md|markdown|txt)$/i.test(file.name));
	if (markdown) {
		load(markdown);
		return;
	}
	uploadMedia(files);
});

// ——————————————————————————————
// DRAFT AND SETTINGS
// ——————————————————————————————

function saveDraft() {
	try {
		// the source goes with the draft so a reload comes back to the same file rather than quietly turning into a scratch page
		localStorage.setItem(STORAGE, JSON.stringify({ name: filenameField.value, text: text(), source: source, clean: text() == baseline }));
	} catch (error) {
		// as above
	}
}
// whether the page that came back from the last visit had no unsaved changes in it. if so, the copy on disk is the real one — it may have been edited in vs code since — and it's read again once the server answers.
let restoredClean = false;
// set when the page was opened by a ✍️ link, which decides what's open on its own
let openedFromLink = false;
// the address of the site page the ✍️ tool was pressed on, held until the server answers with the collection that says what it is
let requestedPage = null;

function restoreDraft() {
	try {
		let saved = JSON.parse(localStorage.getItem(STORAGE));
		if (saved && typeof saved.text == 'string') {
			setText(saved.text);
			if (saved.name) {
				filenameField.value = saved.name;
			}
			// a page that came back unchanged is still unchanged, so opening something else doesn't stop to ask about it. (the untouched starter counts too.) it's settled before the source, since setting the source writes the draft down again and should write this down with it.
			baseline = saved.clean ? saved.text : STARTER;
			restoredClean = !!saved.clean;
			// the buttons for it stay hidden until the check for the server comes back, so this is safe whether or not the server is up
			setSource(typeof saved.source == 'string' ? saved.source : null);
			return true;
		}
	} catch (error) {
		// nothing to come back to
	}
	return false;
}

applySplit();
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
- With the local server running, the sidebar lists everything the site is made of, and **💾 save** writes the file behind the page you're on.

---
`;
if (!restoreDraft()) {
	setText(STARTER);
	baseline = STARTER;
}
updateCounts();
render();

// ——————————————————————————————
// OPENING A PAGE FROM THE SITE
// ——————————————————————————————

// the ✍️ tool in the menu of every page links here with ?page= set to that page's address, and which resource it is gets worked out once the collection is in (see openFromSite in manager.js). ?src= pointing straight at a markdown file still opens it, the way the old button on markdown pages did.
(function () {
	let params = new URLSearchParams(location.search);
	let src = params.get('src');
	let page = params.get('page');
	if (!src && !page) {
		return;
	}
	// the query goes as soon as it's read, so a reload doesn't ask to replace the work all over again
	history.replaceState({}, '', location.pathname);

	if (page) {
		// only addresses on this site, the same as below
		if (page.startsWith('/') && !page.startsWith('//')) {
			openedFromLink = true;
			requestedPage = page;
		}
		return;
	}

	// only paths within the site: anything else would be someone else's page pulled into the editor
	if (!src.startsWith('/') || src.startsWith('//')) {
		note('couldn’t open that file', 'paused');
		return;
	}
	// the ✍️ link only appears with the server running, so this is the file itself and opening it is the same as opening it from the sidebar
	openedFromLink = true;
	openPage(decodeURIComponent(src));
})();
