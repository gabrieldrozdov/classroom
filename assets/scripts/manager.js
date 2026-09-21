// the site manager: the sidebar on the /editor/ page, and everything behind it.
// collection.json is the shape of the whole site — which courses exist, which group they sit in, what sections they're divided into, and what each resource points at. editing it by hand means finding the right nesting level in 2,500 lines; this is the same file with the nesting drawn out, where a resource can be opened, renamed, reordered or thrown away where you can see it.
// it only exists with `node dev.js` running. editor.js does the check and hands the answer over here, so on the published site none of this draws anything.
// the tree held here is a working copy: every change edits it and then sends the whole thing back, which the server parses before writing. there's no merge to get wrong — the file on disk is whatever was last sent.

let collection = null;
let files = {};
let drafts = [];

// nothing is drawn until the first read comes back, so the sidebar doesn't flash an empty site on its way to the real one
let loaded = false;

// remembered between visits, though it only applies while there's a server to fill it
let sidebarOpen = recall('sidebar') != '0';

// which courses are drawn open. the site has sixteen courses and one is usually the one being worked on, so they start closed and stay however they're left.
let expanded = new Set();

let sidebar = document.getElementById('sidebar');
let sidebarList = document.getElementById('sidebar-list');
let sidebarToggle = document.getElementById('toggle-sidebar');

const DRAFTS_FOLDER = '/assets/markdown/drafts';

// a new page has to start as something, and a heading is the one line every page here has
const STARTER_PAGE = '# Heading\n\nParagraph.\n';

function el(tag, className, text) {
	let node = document.createElement(tag);
	if (className) {
		node.className = className;
	}
	if (text != undefined) {
		node.textContent = text;
	}
	return node;
}

// a slug ends up in a url and a folder name, so it's held to what both can carry
function slugify(value) {
	return (value || '')
		.toLowerCase()
		.replace(/['’]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function isPage(resource) {
	return typeof resource['url'] == 'string' && resource['url'].toLowerCase().endsWith('.md');
}

// ——————————————————————————————
// WHERE SOMETHING IS
// ——————————————————————————————

// an address is which group, which course inside it, which section inside that, which resource inside that — as far down as the thing being addressed goes. it travels through drag and drop as text, so it's kept to plain numbers.
function address(group, course, section, resource) {
	return { group: group, course: course, section: section, resource: resource };
}

function groupAt(at) {
	return collection[at.group];
}
function courseAt(at) {
	return groupAt(at)['contents'][at.course];
}
function sectionAt(at) {
	return courseAt(at)['contents'][at.section];
}
function resourceAt(at) {
	return sectionAt(at)['contents'][at.resource];
}

// what kind of thing an address points at, which is also what it's allowed to be dropped onto
function kindOf(at) {
	if (at.resource != null) {
		return 'resource';
	}
	if (at.section != null) {
		return 'section';
	}
	if (at.course != null) {
		return 'course';
	}
	return 'group';
}

function listFor(at) {
	if (at.resource != null) {
		return sectionAt(at)['contents'];
	}
	if (at.section != null) {
		return courseAt(at)['contents'];
	}
	return groupAt(at)['contents'];
}

function indexOf(at) {
	if (at.resource != null) {
		return at.resource;
	}
	if (at.section != null) {
		return at.section;
	}
	return at.course;
}

// ——————————————————————————————
// TALKING TO THE SERVER
// ——————————————————————————————

// the whole tree goes back at once and the site is rebuilt from it. everything that changes the site ends up here, so this is the one place that has to get the failure case right: the note says whether the file was written, and the sidebar is redrawn from what's on disk rather than from what we hoped we wrote.
async function saveCollection(message) {
	working(message || 'saving…');
	let result;
	try {
		result = await post('/_dev/collection', { collection: collection });
	} catch (error) {
		lostServer();
		return false;
	}
	if (!result.ok) {
		note(result.message || 'couldn’t save collection.json', 'paused');
		await refreshSidebar();
		return false;
	}
	if (result.built) {
		note(`${message || 'saved'} ~ site rebuilt in ${(result.ms / 1000).toFixed(1)}s`);
	} else {
		note(`saved, but the build failed ~ ${result.message}`, 'paused');
	}
	await refreshSidebar();
	return true;
}

async function fileAction(action, path, to) {
	let result;
	try {
		result = await post('/_dev/file', { action: action, path: path, to: to });
	} catch (error) {
		lostServer();
		return null;
	}
	if (!result.ok) {
		note(result.message || `couldn’t ${action} that file`, 'paused');
		return null;
	}
	return result;
}

// write a new markdown file and hand back the path it actually landed on, which may carry a number if the name was taken
async function createPage(path, text) {
	let result;
	try {
		result = await post('/_dev/save', { path: path, text: text || STARTER_PAGE });
	} catch (error) {
		lostServer();
		return null;
	}
	if (!result.ok) {
		note(result.message || 'couldn’t make that page', 'paused');
		return null;
	}
	return result.path;
}

// what the sidebar is drawn from. editor.js does the first one as part of its check for the server and passes it here, so the page doesn't ask twice on load.
function receiveStatus(result) {
	loaded = true;
	collection = result.collection;
	files = result.files || {};
	drafts = result.drafts || [];
	if (result.message) {
		note(result.message, 'paused');
	}
	renderSidebar();
}

async function refreshSidebar() {
	if (!connected) {
		return;
	}
	try {
		receiveStatus(await (await fetch('/_dev/status', { cache: 'no-store' })).json());
	} catch (error) {
		lostServer();
	}
}

// ——————————————————————————————
// DRAWING THE TREE
// ——————————————————————————————

// a row is the same shape everywhere: something to press that opens or expands it, then the buttons that act on it. they're built rather than written out because the tree is redrawn after every change.
function row(options) {
	let node = el('div', 'editor-row');
	node.dataset.kind = options.kind;
	if (options.at) {
		node.dataset.at = JSON.stringify(options.at);
		node.draggable = true;
	}
	if (options.url) {
		node.dataset.url = options.url;
	}
	if (options.dim) {
		node.dataset.dim = 1;
	}
	// a course says whether it's open through what's underneath it rather than through an arrow, but the state is on the row for styling
	if (options.expanded != undefined) {
		node.dataset.expanded = options.expanded ? 1 : 0;
	}

	let open = el('button', 'editor-row-open');
	open.type = 'button';
	open.title = options.title || options.name;
	if (options.emoji) {
		open.appendChild(el('span', 'editor-row-emoji', options.emoji));
	}
	let label = el('span', 'editor-row-label');
	let name = el('span', 'editor-row-name', options.name);
	// a course's version reads as a qualifier on the name rather than part of it
	if (options.version) {
		name.appendChild(document.createTextNode(' '));
		name.appendChild(el('span', 'editor-row-version', options.version));
	}
	label.appendChild(name);
	if (options.meta) {
		label.appendChild(el('span', 'editor-row-meta', options.meta));
	}
	open.appendChild(label);
	if (options.press) {
		open.addEventListener('click', options.press);
	}
	node.appendChild(open);

	let actions = el('div', 'editor-row-actions');
	for (let action of options.actions || []) {
		if (!action) {
			continue;
		}
		let button = el('button', 'editor-row-action', action.emoji || '');
		button.type = 'button';
		button.title = action.label;
		button.setAttribute('aria-label', action.label);
		if (action.danger) {
			button.dataset.danger = 1;
		}
		button.addEventListener('click', (e) => {
			e.stopPropagation();
			action.run();
		});
		actions.appendChild(button);
	}
	node.appendChild(actions);
	return node;
}

// arrows alongside dragging: dragging is quicker across a long list, and these are what you want when something needs to go exactly one place up
function moveActions(at) {
	let list = listFor(at);
	let index = indexOf(at);
	return [
		index > 0 ? { emoji: '👆', label: 'Move up', run: () => reorder(at, index - 1) } : null,
		index < list.length - 1 ? {  emoji: '👇', label: 'Move down', run: () => reorder(at, index + 1) } : null
	];
}

function renderSidebar() {
	sidebarToggle.hidden = !connected;
	applySidebar();
	if (!connected || !loaded) {
		return;
	}
	sidebarList.replaceChildren();

	renderRecent();

	// drafts next: they're the pages being written rather than the pages already published
	sidebarList.appendChild(groupHeading('📄', 'drafts', [{ emoji: '📄', label: 'New draft', run: newDraft }]));
	if (drafts.length == 0) {
		sidebarList.appendChild(el('p', 'editor-sidebar-empty', 'nothing in progress'));
	}
	for (let draft of drafts) {
		sidebarList.appendChild(row({
			kind: 'draft',
			url: draft.url,
			name: `${draft.name}.md`,
			meta: when(draft.modified),
			title: draft.url,
			press: () => openPage(draft.url),
			actions: [
				{ emoji: '✏️', label: `Rename ${draft.name}.md`, run: () => renameDraft(draft) },
				{ emoji: '👯', label: `Duplicate ${draft.name}.md`, run: () => duplicateDraft(draft) },
				{ emoji: '🗑️', label: `Delete ${draft.name}.md`, danger: true, run: () => deleteDraft(draft) }
			]
		}));
	}

	if (!Array.isArray(collection)) {
		sidebarList.appendChild(el('p', 'editor-sidebar-empty', 'collection.json couldn’t be read'));
		return;
	}

	for (let g = 0; g < collection.length; g++) {
		let group = collection[g];
		let split = splitEmoji(group['name']);
		sidebarList.appendChild(groupHeading(split.emoji, split.text, []));

		let courses = group['contents'] || [];
		if (courses.length == 0) {
			sidebarList.appendChild(el('p', 'editor-sidebar-empty', 'no courses here'));
		}
		for (let c = 0; c < courses.length; c++) {
			renderCourse(address(g, c));
		}
	}

	// every row was just rebuilt, so the one for the open file has to be found and marked again
	markOpenInSidebar(source);
}

function groupHeading(emoji, text, actions) {
	let node = el('div', 'editor-sidebar-group');
	let label = el('span', 'editor-sidebar-group-label');
	if (emoji) {
		label.appendChild(el('span', 'editor-sidebar-group-emoji', emoji));
	}
	label.appendChild(el('span', null, text));
	node.appendChild(label);
	let strip = el('div', 'editor-row-actions');
	for (let action of actions) {
		let button = el('button', 'editor-row-action', action.emoji);
		button.type = 'button';
		button.title = action.label;
		button.setAttribute('aria-label', action.label);
		button.addEventListener('click', action.run);
		strip.appendChild(button);
	}
	node.appendChild(strip);
	return node;
}

// the leading emoji is stored as part of the name here, the same way the build reads it off a section heading
function splitEmoji(name) {
	let match = (name || '').match(/^(\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*)\s*(.*)$/u);
	if (match) {
		return { emoji: match[1], text: match[3] };
	}
	return { emoji: '', text: name || '' };
}

function renderCourse(at) {
	let course = courseAt(at);
	let open = expanded.has(course['slug']);
	let sections = course['contents'] || [];
	let pages = sections.reduce((total, section) => total + (section['contents'] || []).length, 0);

	sidebarList.appendChild(row({
		kind: 'course',
		at: at,
		expanded: open,
		emoji: course['emoji'] || '🎓',
		name: course['name'],
		version: course['version'] || '',
		meta: `${sections.length} section${sections.length == 1 ? '' : 's'} ~ ${pages} resource${pages == 1 ? '' : 's'}`,
		title: `/${course['slug']}/`,
		press: () => {
			if (open) {
				expanded.delete(course['slug']);
			} else {
				expanded.add(course['slug']);
			}
			renderSidebar();
		},
		actions: [
			{ emoji: '⚙️', label: `Settings for ${course['name']}`, run: () => courseForm(at) },
			{ emoji: '🔗', label: `Open /${course['slug']}/`, run: () => visit(`/${course['slug']}/`) },
			{ emoji: '📄', label: 'New section', run: () => newSection(at) },
			...moveActions(at),
			{ emoji: '🗑️', label: `Remove ${course['name']}`, danger: true, run: () => removeCourse(at) }
		]
	}));

	if (!open) {
		return;
	}
	for (let s = 0; s < sections.length; s++) {
		renderSection(address(at.group, at.course, s));
	}
	if (sections.length == 0) {
		sidebarList.appendChild(el('p', 'editor-sidebar-empty', 'no sections yet'));
	}
}

function renderSection(at) {
	let section = sectionAt(at);
	let split = splitEmoji(section['name']);
	let resources = section['contents'] || [];

	sidebarList.appendChild(row({
		kind: 'section',
		at: at,
		emoji: split.emoji,
		name: split.text,
		press: () => sectionForm(at),
		actions: [
			{ emoji: '⚙️', label: `Rename ${split.text}`, run: () => sectionForm(at) },
			{ emoji: '📄', label: 'New resource', run: () => resourceForm(address(at.group, at.course, at.section, null)) },
			...moveActions(at),
			{ emoji: '🗑️', label: `Remove ${split.text}`, danger: true, run: () => removeSection(at) }
		]
	}));

	for (let r = 0; r < resources.length; r++) {
		renderResource(address(at.group, at.course, at.section, r));
	}
	if (resources.length == 0) {
		sidebarList.appendChild(el('p', 'editor-sidebar-empty', 'no resources yet'));
	}
}

function renderResource(at) {
	let resource = resourceAt(at);
	let page = isPage(resource);
	let missing = page && !files[resource['url']];

	// what a resource is worth saying in one line: an embed says so, a page says how long ago it was written, and a page collection.json points at with no file behind it says that instead of pretending
	let meta;
	if (!page) {
		meta = 'embed';
	} else if (missing) {
		meta = 'no file yet';
	} else {
		meta = when(files[resource['url']].modified);
	}
	if (resource['active'] == false) {
		meta = `hidden ~ ${meta}`;
	}

	sidebarList.appendChild(row({
		kind: 'resource',
		at: at,
		url: page ? resource['url'] : '',
		dim: resource['active'] == false,
		emoji: resource['emoji'] || '',
		name: resource['name'],
		meta: meta,
		title: resource['url'],
		press: () => {
			// an embed has nothing to edit here, so pressing it opens what it does have
			if (page) {
				openPage(resource['url']);
			} else {
				resourceForm(at);
			}
		},
		actions: [
			{ emoji: '⚙️', label: `Settings for ${resource['name']}`, run: () => resourceForm(at) },
			// a hidden resource isn't built at all, so there's no page to go to
			resource['active'] == false ? null : { emoji: '🔗', label: `Open /${courseAt(at)['slug']}/${resource['slug']}/`, run: () => visit(`/${courseAt(at)['slug']}/${resource['slug']}/`) },
			{ emoji: '👯', label: `Duplicate ${resource['name']}`, run: () => duplicateResource(at) },
			...moveActions(at),
			{ emoji: '🗑️', label: `Remove ${resource['name']}`, danger: true, run: () => removeResource(at) }
		]
	}));
}

// the last few files written, newest first — a shortcut to wherever they actually live, not a place of their own
const RECENT_COUNT = 10;

function renderRecent() {
	let recent = Object.keys(files).sort((a, b) => files[b].modified - files[a].modified).slice(0, RECENT_COUNT);
	if (recent.length == 0) {
		return;
	}
	sidebarList.appendChild(groupHeading('🕑', 'recently edited', []));
	for (let url of recent) {
		let found = findResource(url);
		let resource = found ? resourceAt(found) : null;
		let course = found ? courseAt(found) : null;
		// named the way the rest of the sidebar names it, with where it lives underneath: the course for a course page, the folder for anything else
		let where = course ? `${course['name']}${course['version'] ? ` ${course['version']}` : ''}` : url.replace(/^\/assets\/markdown\//, '').replace(/[^/]+$/, '').replace(/\/$/, '');
		sidebarList.appendChild(row({
			kind: 'recent',
			url: url,
			emoji: resource ? resource['emoji'] || '' : '',
			name: resource ? resource['name'] : url.split('/').pop(),
			meta: `${where} ~ ${when(files[url].modified)}`,
			title: url,
			// a shortcut is used from where it sits, so the sidebar stays put: the file is marked as open, but its course isn't drawn open and nothing scrolls
			press: async () => {
				let previous = scrolledTo;
				scrolledTo = url;
				// if the open is called off, the file wasn't opened, and opening it later from anywhere else should still find it
				if (!await openPage(url)) {
					scrolledTo = previous;
				}
			}
		}));
	}
}

// the resource in the collection that a file belongs to, if any
function findResource(url) {
	if (!Array.isArray(collection)) {
		return null;
	}
	for (let g = 0; g < collection.length; g++) {
		let courses = collection[g]['contents'] || [];
		for (let c = 0; c < courses.length; c++) {
			let sections = courses[c]['contents'] || [];
			for (let s = 0; s < sections.length; s++) {
				let resources = sections[s]['contents'] || [];
				for (let r = 0; r < resources.length; r++) {
					if (resources[r]['url'] == url) {
						return address(g, c, s, r);
					}
				}
			}
		}
	}
	return null;
}

// the real page, in a tab of its own so the editor stays where it was
function visit(path) {
	window.open(path, '_blank');
}

// the file last scrolled to, so the sidebar moves once when something is opened rather than every time it's redrawn
let scrolledTo = null;

// the row for the file that's open in the editor, so the sidebar says where you are
function markOpenInSidebar(url) {
	// the course a file belongs to opens itself, so the sidebar shows where in the site you are. drawing it open calls back in here, so this pass stops and lets that one finish the job.
	// only for a file that's just been opened: a course folded shut by hand, or by collapse all, stays shut on every redraw after that
	let found = url && loaded && url != scrolledTo ? findResource(url) : null;
	if (found && !expanded.has(courseAt(found)['slug'])) {
		expanded.add(courseAt(found)['slug']);
		renderSidebar();
		return;
	}
	for (let node of sidebarList.querySelectorAll('.editor-row[data-url]')) {
		if (url && node.dataset.url == url) {
			node.dataset.open = 1;
		} else {
			delete node.dataset.open;
		}
	}
	if (url && loaded && url != scrolledTo) {
		scrolledTo = url;
		centerRow(url);
	}
}

// scroll the sidebar so the open file sits about halfway down it. the row in the course tree is the one that says where the file lives, so it's preferred over the same file's shortcut under recently edited.
function centerRow(url) {
	let rows = [...sidebarList.querySelectorAll('.editor-row[data-url]')].filter(node => node.dataset.url == url);
	let target = rows.find(node => node.dataset.kind == 'resource') || rows.find(node => node.dataset.kind == 'draft') || rows[0];
	if (!target) {
		return;
	}
	let list = sidebarList.getBoundingClientRect();
	let box = target.getBoundingClientRect();
	sidebarList.scrollTo({ top: sidebarList.scrollTop + (box.top - list.top) - (list.height - box.height) / 2, behavior: 'smooth' });
}

// ——————————————————————————————
// DRAGGING
// ——————————————————————————————

// dragging moves something a long way in one go; the arrows on each row move it one place. a resource can cross into another section of the same course, and a course can cross into the other group — which is the other half of "now teaching" and "ancient history" being two lists rather than a setting.
// resources don't cross between courses, because that would mean moving files between course folders as well, and a duplicate-and-remove says what's happening more plainly than a drag does.
let dragging = null;

function canDrop(from, to) {
	if (!from || !to || kindOf(from) != kindOf(to)) {
		return false;
	}
	if (kindOf(from) == 'resource') {
		return from.group == to.group && from.course == to.course;
	}
	if (kindOf(from) == 'section') {
		return from.group == to.group && from.course == to.course;
	}
	return true;
}

function clearDropMarks() {
	for (let node of sidebarList.querySelectorAll('.editor-row[data-drop]')) {
		delete node.dataset.drop;
	}
}

sidebarList.addEventListener('dragstart', (e) => {
	let node = e.target.closest('.editor-row[data-at]');
	if (!node) {
		return;
	}
	dragging = JSON.parse(node.dataset.at);
	node.dataset.dragging = 1;
	e.dataTransfer.effectAllowed = 'move';
	// firefox won't start a drag without something on the transfer
	e.dataTransfer.setData('text/plain', node.dataset.at);
});

sidebarList.addEventListener('dragover', (e) => {
	let node = e.target.closest('.editor-row[data-at]');
	if (!node) {
		return;
	}
	let over = JSON.parse(node.dataset.at);
	if (!canDrop(dragging, over)) {
		return;
	}
	e.preventDefault();
	e.dataTransfer.dropEffect = 'move';
	clearDropMarks();
	// above or below, by which half of the row the pointer is in
	let box = node.getBoundingClientRect();
	node.dataset.drop = e.clientY < box.top + box.height / 2 ? 'before' : 'after';
});

sidebarList.addEventListener('dragleave', (e) => {
	let node = e.target.closest('.editor-row[data-drop]');
	if (node && !node.contains(e.relatedTarget)) {
		delete node.dataset.drop;
	}
});

sidebarList.addEventListener('drop', (e) => {
	let node = e.target.closest('.editor-row[data-at]');
	if (!node || !node.dataset.drop) {
		return;
	}
	e.preventDefault();
	let over = JSON.parse(node.dataset.at);
	let after = node.dataset.drop == 'after';
	clearDropMarks();
	if (canDrop(dragging, over)) {
		dropOnto(dragging, over, after);
	}
	dragging = null;
});

sidebarList.addEventListener('dragend', () => {
	clearDropMarks();
	for (let node of sidebarList.querySelectorAll('.editor-row[data-dragging]')) {
		delete node.dataset.dragging;
	}
	dragging = null;
});

// ——————————————————————————————
// MOVING THINGS
// ——————————————————————————————

function reorder(at, to) {
	let list = listFor(at);
	let [item] = list.splice(indexOf(at), 1);
	list.splice(to, 0, item);
	renderSidebar();
	saveCollection('moved');
}

function dropOnto(from, to, after) {
	let fromList = listFor(from);
	let toList = listFor(to);
	let index = indexOf(to) + (after ? 1 : 0);
	let [item] = fromList.splice(indexOf(from), 1);
	// taking it out of a list it shares with the target shifts everything after it up by one
	if (fromList == toList && indexOf(from) < index) {
		index--;
	}
	toList.splice(index, 0, item);
	renderSidebar();
	saveCollection('moved');
}

// ——————————————————————————————
// FORMS
// ——————————————————————————————

// one dialog, built from a list of fields. `when` decides whether a field is on screen at all, and it's checked again on every change, so picking "embed" swaps a page's fields for a url and a new-tab box without a second dialog.
let formDialog = document.getElementById('form');
let formInner = document.getElementById('form-inner');
let formTitle = document.getElementById('form-title');
let formFields = document.getElementById('form-fields');
let formNote = document.getElementById('form-note');
let formSubmit = null;

function showForm(title, fields, submit) {
	formTitle.textContent = title;
	formNote.textContent = '';
	formSubmit = submit;
	formFields.replaceChildren();

	let values = {};
	for (let field of fields) {
		values[field.key] = field.value;
	}

	let refresh = () => {
		for (let field of fields) {
			field.node.hidden = field.when ? !field.when(values) : false;
		}
	};

	for (let field of fields) {
		let wrap = el('label', 'editor-field');
		field.node = wrap;
		wrap.appendChild(el('span', 'editor-field-label', field.label));

		let input;
		if (field.type == 'textarea') {
			input = el('textarea', 'editor-field-input');
			input.rows = field.rows || 4;
			input.value = field.value || '';
		} else if (field.type == 'select') {
			input = el('select', 'editor-field-input');
			for (let option of field.options) {
				let node = el('option', null, option.label);
				node.value = option.value;
				input.appendChild(node);
			}
			input.value = field.value;
		} else if (field.type == 'checkbox') {
			input = el('input', 'editor-field-check');
			input.type = 'checkbox';
			input.checked = !!field.value;
			wrap.dataset.check = 1;
		} else {
			input = el('input', 'editor-field-input');
			input.type = 'text';
			input.value = field.value || '';
			input.spellcheck = field.spellcheck != false;
			input.autocomplete = 'off';
		}
		input.addEventListener('input', () => {
			values[field.key] = field.type == 'checkbox' ? input.checked : input.value;
			refresh();
		});
		input.addEventListener('change', () => {
			values[field.key] = field.type == 'checkbox' ? input.checked : input.value;
			refresh();
		});
		wrap.appendChild(input);
		if (field.hint) {
			wrap.appendChild(el('span', 'editor-field-hint', field.hint));
		}
		formFields.appendChild(wrap);
	}

	refresh();
	formDialog.showModal();
	// the first field is almost always the one being changed
	let first = formFields.querySelector('.editor-field:not([hidden]) .editor-field-input');
	if (first) {
		first.focus();
		if (first.select) {
			first.select();
		}
	}
	return values;
}

formInner.addEventListener('submit', async (e) => {
	e.preventDefault();
	if (!formSubmit) {
		return;
	}
	// a save is two round trips and a rebuild, so the button goes dead while it's out rather than letting a second press start it all again
	let submit = document.getElementById('form-save');
	submit.disabled = true;
	let problem;
	try {
		// a submit that hands back a string is a complaint about the values, and the dialog stays open holding them
		problem = await formSubmit();
	} finally {
		submit.disabled = false;
	}
	if (typeof problem == 'string') {
		formNote.textContent = problem;
		return;
	}
	formDialog.close();
});

document.getElementById('form-close').addEventListener('click', () => formDialog.close());
formDialog.addEventListener('click', (e) => {
	if (e.target == formDialog) {
		formDialog.close();
	}
});

// comma-separated in the form, a list in the file
function readTags(value) {
	return (value || '').split(',').map(tag => tag.trim()).filter(tag => tag != '');
}

// a key whose value is empty doesn't belong in the file at all — the build checks for undefined, and a trail of empty strings makes the json harder to read by hand
function set(object, key, value) {
	if (value == undefined || value === '' || (Array.isArray(value) && value.length == 0)) {
		delete object[key];
	} else {
		object[key] = value;
	}
}

// ——————————————————————————————
// COURSES
// ——————————————————————————————

function allCourseSlugs(except) {
	let slugs = new Set();
	for (let group of collection) {
		for (let course of group['contents'] || []) {
			if (course !== except) {
				slugs.add(course['slug']);
			}
		}
	}
	return slugs;
}

function courseForm(at) {
	let course = at ? courseAt(at) : { slug: '', emoji: '', name: '', version: '', desc: '', 'long-desc': '', tags: [], contents: [] };
	let values = showForm(at ? `⚙️ ${course['name']}` : '🎓 new course', [
		{ key: 'emoji', label: 'emoji', value: course['emoji'] || '', spellcheck: false },
		{ key: 'name', label: 'name', value: course['name'] || '' },
		{ key: 'version', label: 'version', value: course['version'] || '', hint: 'shown after the name, like f26 or v3' },
		{ key: 'slug', label: 'slug', value: course['slug'] || '', spellcheck: false, hint: 'the folder the course is built into ~ changing it moves the whole course to a new address' },
		{ key: 'group', label: 'group', type: 'select', value: String(at ? at.group : 0), options: collection.map((group, index) => ({ value: String(index), label: group['name'] })) },
		{ key: 'desc', label: 'short description', type: 'textarea', rows: 2, value: course['desc'] || '' },
		{ key: 'long-desc', label: 'long description', type: 'textarea', rows: 6, value: course['long-desc'] || '', hint: 'html, shown on the course page' },
		{ key: 'tags', label: 'tags', value: (course['tags'] || []).join(', '), hint: 'comma separated' }
	], async () => {
		let name = values['name'].trim();
		if (name == '') {
			return 'a course needs a name';
		}
		let slug = slugify(values['slug'] || name);
		if (slug == '') {
			return 'that slug doesn’t leave anything usable';
		}
		if (allCourseSlugs(at ? course : null).has(slug)) {
			return `there’s already a course at /${slug}/`;
		}

		set(course, 'slug', slug);
		set(course, 'emoji', values['emoji'].trim());
		set(course, 'name', name);
		set(course, 'version', values['version'].trim());
		set(course, 'desc', values['desc'].trim());
		set(course, 'long-desc', values['long-desc'].trim());
		set(course, 'tags', readTags(values['tags']));
		if (!Array.isArray(course['contents'])) {
			course['contents'] = [];
		}

		let group = Number(values['group']);
		if (!at) {
			collection[group]['contents'].unshift(course);
			expanded.add(slug);
		} else if (group != at.group) {
			// moving between "now teaching" and "ancient history" is the same move as dragging it there
			collection[at.group]['contents'].splice(at.course, 1);
			collection[group]['contents'].unshift(course);
		}
		renderSidebar();
		await saveCollection(at ? 'saved course' : 'added course');
	});
}

async function removeCourse(at) {
	let course = courseAt(at);
	let pages = (course['contents'] || []).reduce((total, section) => total + (section['contents'] || []).length, 0);
	if (!confirm(`Remove “${course['name']}” and its ${pages} resource${pages == 1 ? '' : 's'} from the site?\n\nThe markdown files stay in assets/markdown/${course['slug']}/ ~ only the course disappears from collection.json.`)) {
		return;
	}
	collection[at.group]['contents'].splice(at.course, 1);
	renderSidebar();
	await saveCollection('removed course');
}

// ——————————————————————————————
// SECTIONS
// ——————————————————————————————

function sectionForm(at) {
	let isNew = at.section == null;
	let section = isNew ? { name: '', contents: [] } : sectionAt(at);
	let split = splitEmoji(section['name']);
	let values = showForm(isNew ? '📄 new section' : `⚙️ ${split.text}`, [
		{ key: 'emoji', label: 'emoji', value: split.emoji, spellcheck: false },
		{ key: 'name', label: 'name', value: split.text }
	], async () => {
		let name = values['name'].trim();
		if (name == '') {
			return 'a section needs a name';
		}
		// the emoji lives at the front of the name, the way the build reads it back off
		section['name'] = `${values['emoji'].trim() ? `${values['emoji'].trim()} ` : ''}${name}`;
		if (isNew) {
			courseAt(at)['contents'].push(section);
		}
		renderSidebar();
		await saveCollection(isNew ? 'added section' : 'renamed section');
	});
}

function newSection(at) {
	expanded.add(courseAt(at)['slug']);
	sectionForm(address(at.group, at.course, null));
}

async function removeSection(at) {
	let section = sectionAt(at);
	let count = (section['contents'] || []).length;
	if (!confirm(`Remove “${splitEmoji(section['name']).text}”${count > 0 ? ` and the ${count} resource${count == 1 ? '' : 's'} in it` : ''}?\n\nAny markdown files stay where they are.`)) {
		return;
	}
	courseAt(at)['contents'].splice(at.section, 1);
	renderSidebar();
	await saveCollection('removed section');
}

// ——————————————————————————————
// MATERIALS
// ——————————————————————————————

function resourceForm(at) {
	let isNew = at.resource == null;
	let course = courseAt(at);
	let section = sectionAt(at);
	let resource = isNew ? { name: '', emoji: '', slug: '', url: '', newtab: false } : resourceAt(at);
	let page = isNew ? true : isPage(resource);

	let fields = [
		{ key: 'emoji', label: 'emoji', value: resource['emoji'] || '', spellcheck: false },
		{ key: 'name', label: 'name', value: resource['name'] || '' },
		{ key: 'slug', label: 'slug', value: resource['slug'] || '', spellcheck: false, hint: `the page’s address under /${course['slug']}/` },
		{
			key: 'kind', label: 'kind', type: 'select', value: page ? 'page' : 'embed',
			options: [{ value: 'page', label: 'markdown page' }, { value: 'embed', label: 'embed' }]
		},
		{
			key: 'start', label: 'page file', type: 'select', value: 'new',
			when: (v) => v['kind'] == 'page' && isNew,
			options: [{ value: 'new', label: 'make a new page' }].concat(drafts.map(draft => ({ value: draft.url, label: `move in the draft ${draft.name}.md` }))),
			hint: 'a draft picked here moves out of the drafts folder and into the course'
		},
		{
			key: 'url', label: 'file', value: resource['url'] || '', spellcheck: false,
			when: (v) => v['kind'] == 'page' && !isNew,
			hint: 'the markdown this page is built from'
		},
		{
			key: 'url', label: 'url', value: resource['url'] || '', spellcheck: false,
			when: (v) => v['kind'] == 'embed',
			hint: 'a google doc, a figma board, an are.na channel ~ whatever the page should show'
		},
		{ key: 'newtab', label: 'open in a new tab instead of embedding', type: 'checkbox', value: !!resource['newtab'], when: (v) => v['kind'] == 'embed' },
		{ key: 'desc', label: 'description', type: 'textarea', rows: 2, value: resource['desc'] || '' },
		{ key: 'tags', label: 'tags', value: (resource['tags'] || []).join(', '), hint: 'comma separated' },
		{ key: 'active', label: 'shown on the site', type: 'checkbox', value: resource['active'] != false }
	];

	// both url fields write the same key, so whichever one is on screen is the one being read
	let values = showForm(isNew ? '📄 new resource' : `⚙️ ${resource['name']}`, fields, async () => {
		let name = values['name'].trim();
		if (name == '') {
			return 'a resource needs a name';
		}
		let slug = slugify(values['slug'] || name);
		if (slug == '') {
			return 'that slug doesn’t leave anything usable';
		}
		let taken = (course['contents'] || []).some(other => (other['contents'] || []).some(entry => entry !== resource && entry['slug'] == slug));
		if (taken) {
			return `there’s already a resource at /${course['slug']}/${slug}/`;
		}

		let url = (values['url'] || '').trim();
		if (values['kind'] == 'page') {
			if (isNew) {
				if (values['start'] == 'new') {
					url = await createPage(`/assets/markdown/${course['slug']}/${slug}.md`);
				} else {
					// a draft becomes a course page by moving into the course's folder, so the drafts list stays what's actually unplaced
					let moved = await fileAction('rename', values['start'], `/assets/markdown/${course['slug']}/${slug}.md`);
					url = moved && moved.path;
				}
				if (!url) {
					return 'the page couldn’t be made';
				}
			} else if (!url.toLowerCase().endsWith('.md')) {
				return 'a markdown page needs a .md file';
			}
		} else if (url == '') {
			return 'an embed needs a url';
		}

		set(resource, 'name', name);
		set(resource, 'emoji', values['emoji'].trim());
		set(resource, 'slug', slug);
		set(resource, 'url', url);
		// newtab is written either way, since the build reads it on both and false is the ordinary case
		resource['newtab'] = values['kind'] == 'embed' ? !!values['newtab'] : false;
		set(resource, 'desc', values['desc'].trim());
		set(resource, 'tags', readTags(values['tags']));
		if (values['active']) {
			delete resource['active'];
		} else {
			resource['active'] = false;
		}

		if (isNew) {
			section['contents'].push(resource);
		}
		renderSidebar();
		await saveCollection(isNew ? 'added resource' : 'saved resource');
		if (isNew && isPage(resource)) {
			openPage(resource['url']);
		}
	});
}

async function duplicateResource(at) {
	let resource = resourceAt(at);
	let course = courseAt(at);
	let copy = JSON.parse(JSON.stringify(resource));

	// "slug-copy", then "slug-copy-2", until one is free across the whole course
	let taken = new Set();
	for (let section of course['contents'] || []) {
		for (let entry of section['contents'] || []) {
			taken.add(entry['slug']);
		}
	}
	let slug = `${resource['slug']}-copy`;
	let n = 2;
	while (taken.has(slug)) {
		slug = `${resource['slug']}-copy-${n}`;
		n++;
	}
	copy['slug'] = slug;
	copy['name'] = `${resource['name']} copy`;

	// a copy of a page is a copy of its file too, or both entries would write over each other
	if (isPage(resource)) {
		let made = await fileAction('duplicate', resource['url'], `${folderOf(resource['url'])}${slug}.md`);
		if (!made) {
			return;
		}
		copy['url'] = made.path;
	}

	sectionAt(at)['contents'].splice(at.resource + 1, 0, copy);
	renderSidebar();
	await saveCollection('duplicated');
}

async function removeResource(at) {
	let resource = resourceAt(at);
	let page = isPage(resource);
	if (!confirm(`Remove “${resource['name']}” from the site?`)) {
		return;
	}
	// the entry and the file are two separate things, so removing one doesn't decide the other
	let alsoFile = page && files[resource['url']] && confirm(`Delete ${resource['url']} as well?\n\nCancel keeps the file and it turns up as a page nothing points at.`);
	sectionAt(at)['contents'].splice(at.resource, 1);
	if (alsoFile) {
		await fileAction('delete', resource['url']);
		if (source == resource['url']) {
			setSource(null);
		}
	}
	renderSidebar();
	await saveCollection('removed resource');
}

// ——————————————————————————————
// DRAFTS
// ——————————————————————————————

async function newDraft() {
	if (isDirty() && !confirm('Starting a new draft will replace the unsaved changes in the editor. Continue?')) {
		return;
	}
	let path = await createPage(`${DRAFTS_FOLDER}/${newDraftName()}.md`);
	if (!path) {
		return;
	}
	await refreshSidebar();
	openPage(path);
}

async function renameDraft(draft) {
	let asked = prompt(`Rename “${draft.name}.md” to:`, draft.name);
	if (asked == null) {
		return;
	}
	let name = slugify(asked.replace(/\.md$/i, ''));
	if (name == '' || name == draft.name) {
		return;
	}
	let moved = await fileAction('rename', draft.url, `${DRAFTS_FOLDER}/${name}.md`);
	if (!moved) {
		return;
	}
	// the file being renamed might be the one open in the editor
	if (source == draft.url) {
		setSource(moved.path);
		filenameField.value = moved.path.split('/').pop().replace(/\.md$/i, '');
	}
	note(`renamed to ${moved.path.split('/').pop()}`);
	await refreshSidebar();
}

async function duplicateDraft(draft) {
	let made = await fileAction('duplicate', draft.url, `${DRAFTS_FOLDER}/${draft.name}-copy.md`);
	if (made) {
		note(`copied to ${made.path.split('/').pop()}`);
		await refreshSidebar();
	}
}

async function deleteDraft(draft) {
	if (!confirm(`Delete “${draft.name}.md”? This can’t be undone.`)) {
		return;
	}
	if (!await fileAction('delete', draft.url)) {
		return;
	}
	if (source == draft.url) {
		setSource(null);
	}
	note(`deleted ${draft.name}.md`);
	await refreshSidebar();
}

// ——————————————————————————————
// THE SIDEBAR ITSELF
// ——————————————————————————————

function applySidebar() {
	let open = connected && sidebarOpen;
	editorEl.dataset.sidebar = open ? 1 : 0;
	sidebarToggle.dataset.on = open ? 1 : 0;
	sidebarToggle.setAttribute('aria-pressed', open ? 'true' : 'false');
	// the sidebar takes a column out of the width the two panes share, so the divider has to be put back where its share says
	applySplit();
}

function setSidebar(open) {
	sidebarOpen = open;
	remember('sidebar', open ? '1' : '0');
	applySidebar();
}

sidebarToggle.addEventListener('click', () => setSidebar(!sidebarOpen));
document.getElementById('sidebar-close').addEventListener('click', () => setSidebar(false));
document.getElementById('new-draft').addEventListener('click', newDraft);
document.getElementById('new-course').addEventListener('click', () => courseForm(null));
document.getElementById('expand-all').addEventListener('click', () => {
	expanded = allCourseSlugs(null);
	renderSidebar();
});
document.getElementById('collapse-all').addEventListener('click', () => {
	expanded = new Set();
	renderSidebar();
});
document.getElementById('reload').addEventListener('click', async () => {
	working('reading collection.json…');
	await refreshSidebar();
	clearNote();
});
