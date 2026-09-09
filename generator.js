const fs = require('fs');

// get JSON
const jsonCollection = require('./collection.json');

// the markdown converter lives in its own file so the /editor/ page can run the identical code in the browser
const markdownGenerator = require('./assets/scripts/generate.js');
const markdownToHTML = markdownGenerator.markdownToHTML;
const colors = markdownGenerator.colors;

// annotate / whiteboard / timer buttons for landing-page menu headers
const menuHeaderTools = `
	<div class="menu-header-tools">
		<button class="resource-menu-control" onclick="if(window.enterDraw)window.enterDraw('annotate');" aria-label="Annotate">
			<svg class="resource-menu-control-text" viewBox="0 0 100 100"><defs><path id="menu-header-tool-annotate" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"></path></defs><text><textPath xlink:href="#menu-header-tool-annotate">annotate</textPath></text></svg>
			<div class="resource-menu-control-icon"><p>📝</p></div>
		</button>
		<button class="resource-menu-control" onclick="if(window.enterDraw)window.enterDraw('whiteboard');" aria-label="Whiteboard">
			<svg class="resource-menu-control-text" viewBox="0 0 100 100"><defs><path id="menu-header-tool-whiteboard" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"></path></defs><text><textPath xlink:href="#menu-header-tool-whiteboard">whiteboard</textPath></text></svg>
			<div class="resource-menu-control-icon"><p>✏️</p></div>
		</button>
		<button class="resource-menu-control" onclick="window.createPin();" aria-label="Pin">
			<svg class="resource-menu-control-text" viewBox="0 0 100 100"><defs><path id="menu-header-tool-pin" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"></path></defs><text><textPath xlink:href="#menu-header-tool-pin">pin</textPath></text></svg>
			<div class="resource-menu-control-icon"><p>📌</p></div>
		</button>
		<button class="resource-menu-control" onclick="window.createTimer();" aria-label="Timer">
			<svg class="resource-menu-control-text" viewBox="0 0 100 100"><defs><path id="menu-header-tool-timer" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"></path></defs><text><textPath xlink:href="#menu-header-tool-timer">timer</textPath></text></svg>
			<div class="resource-menu-control-icon"><p>⏰</p></div>
		</button>
		<button class="resource-menu-control" onclick="window.createRandomizer();" aria-label="Randomizer">
			<svg class="resource-menu-control-text" viewBox="0 0 100 100"><defs><path id="menu-header-tool-randomize" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"></path></defs><text><textPath xlink:href="#menu-header-tool-randomize">randomizer</textPath></text></svg>
			<div class="resource-menu-control-icon"><p>🎲</p></div>
		</button>
		<button class="resource-menu-control" onclick="if(window.toggleSoundboard)window.toggleSoundboard();" aria-label="Soundboard">
			<svg class="resource-menu-control-text" viewBox="0 0 100 100"><defs><path id="menu-header-tool-soundboard" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"></path></defs><text><textPath xlink:href="#menu-header-tool-soundboard">soundboard</textPath></text></svg>
			<div class="resource-menu-control-icon"><p>🔊</p></div>
		</button>
	</div>
`;

// global elements
const meta = `
	<meta name="author" content="Gabriel Drozdov / GD with GD">
	<meta name="keywords" content="Web Design, Web Development, Creative Coding, Design Education, Code Education, Storytelling, Pedagogy">
	<meta name="description" content="Open-source archive for all of Gabriel Drozdov’s courses and teaching materials!">
	<meta property="og:url" content="https://classroom.gdwithgd.com/">
	<meta name="og:title" property="og:title" content="Classroom, by GD with GD">
	<meta property="og:description" content="Open-source archive for all of Gabriel Drozdov’s courses and teaching materials!">
	<meta property="og:image" content="/assets/meta/opengraph.jpg">
	<link rel="icon" type="png" href="/assets/meta/favicon.png">
	<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍎</text></svg>">
`;
const menuDivider = `
	<div class="menu-divider">
		<div class="menu-divider-block">
			<svg viewBox="0 0 30 1000" preserveAspectRatio="none"><path d="M30,0v1000h-10c0-11.1-4.23-16.38-9.12-22.5-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5C5.78,71.13,0,63.9,0,50s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5h10Z"/></svg>
		</div>
		<div class="menu-divider-block">
			<svg viewBox="0 0 30 1000" preserveAspectRatio="none"><path d="M30,0v1000h-10c0-11.1-4.23-16.38-9.12-22.5-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5C5.78,71.13,0,63.9,0,50s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5h10Z"/></svg>
		</div>
	</div>
`;

let colorIndex = 0;

// a leading emoji on a section name is pulled into its own element so it can be styled apart from the title. matches the markdown heading rule, including multi-codepoint emoji (skin tones, ZWJ sequences).
function splitLeadingEmoji(name) {
	let match = (name || '').match(/^(\p{Extended_Pictographic}(?:\u200d\p{Extended_Pictographic}|[\ufe0f\u{1F3FB}-\u{1F3FF}])*)\s*(.*)$/u);
	if (!match) {
		return { emoji: '', text: name || '' };
	}
	return { emoji: match[1], text: match[2].trim() };
}

// record of the directories the last build produced, so a course or resource that has since been removed from collection.json can be cleared away.
// deliberately a manifest rather than "anything that looks generated": this folder also holds hand-made pages and static uploads sitting alongside the generated ones, and no reliable signature separates them — some old generated pages predate the current template, while some hand-made ones use it. only paths this script is on record as having created are ever removed.
const GENERATED_MANIFEST = './.generated.json';
function readManifest() {
	try {
		let saved = JSON.parse(fs.readFileSync(GENERATED_MANIFEST, 'utf8'));
		return Array.isArray(saved) ? saved : [];
	} catch (err) {
		return [];
	}
}
// every page above is written synchronously on purpose. they used to be queued with the async fs.writeFile while the loop around them tore directories down with the synchronous fs.rmSync -- so a write could still be in flight when its own directory was removed and remade. that surfaced as an ENOTEMPTY throw mid-build, which killed the process with the remaining pages unflushed and zero bytes long. a build script gains nothing from async writes anyway, and this way "finished" means the files are actually on disk.
function pruneRemoved(previous, current) {
	// deepest first, so a resource inside a dropped course doesn't trip over its parent having already gone
	let stale = previous
		.filter(dir => !current.has(dir))
		.sort((a, b) => b.split('/').length - a.split('/').length);
	for (let dir of stale) {
		if (fs.existsSync(dir)) {
			fs.rmSync(dir, { recursive: true, force: true });
			console.log(`removed ${dir}`);
		}
	}
	fs.writeFileSync(GENERATED_MANIFEST, JSON.stringify([...current].sort(), null, '\t'));
}

// the palette read straight out of the stylesheet, so calendar day numbers keep enough contrast even if the brand colors are changed later. handed to the converter, which has no filesystem of its own to read it from.
markdownGenerator.setPaletteValues((() => {
	let values = {};
	try {
		let root = fs.readFileSync('./style.css', 'utf8').match(/:root\s*\{([\s\S]*?)\}/);
		if (root) {
			for (let variable of root[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
				values[variable[1]] = variable[2];
			}
		}
	} catch (error) {
		// fall back to dark text everywhere if the stylesheet can't be read
	}
	return values;
})());


function generatePages() {
	let previousDirs = readManifest();
	let generatedDirs = new Set();

	// generate courses menu
	let homeCourses = '';
	colorIndex = 0;
	for (let section of jsonCollection) {
		let homeSectionLinks = '';

		// build link for each course
		for (let course of section['contents']) {

			// build tags
			let tags = "";
			for (let tag of course['tags']) {
				tags += `<li class="home-menu-link-content-tag">${tag}</li>`;
			}
			if (tags.length > 0) {
				tags = `<ul class="home-menu-link-content-tags">${tags}</ul>`;
			}

			homeSectionLinks += `
				<a href="/${course['slug']}/" style="--primary: var(--${colors[colorIndex]});" class="home-menu-link">
					<div class="home-menu-link-content">
						<h3 class="home-menu-link-content-title">${course['name']}${course['version'] ? ` <span class="home-menu-link-content-version">${course['version']}</span>` : ''}</h3>
						<p class="home-menu-link-content-desc">${course['desc']}</p>
						${tags}
						<div class="home-menu-link-content-emoji">${course['emoji']}</div>
					</div>
				</a>
			`;

			colorIndex++;
			if (colorIndex >= colors.length) {
				colorIndex = 0;
			}
		}

		// for homepage
		homeCourses += `
			<section class="home-menu-section">
				<div class="menu-section-header">
					${splitLeadingEmoji(section['name']).emoji ? `<span class="menu-section-emoji">${splitLeadingEmoji(section['name']).emoji}</span>` : ''}
					<h2 class="menu-section-heading">${splitLeadingEmoji(section['name']).text}</h2>
					<div class="menu-section-line">
						<svg viewBox="0 -10 1000 41"><path d="M1000,.5c-13.9,0-21.13,5.78-27.5,10.88-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12C21.13,6.28,13.9.5,0,.5"/></svg>
						<svg viewBox="0 -10 1000 41"><path d="M1000,.5c-13.9,0-21.13,5.78-27.5,10.88-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12C21.13,6.28,13.9.5,0,.5"/></svg>
						<svg viewBox="0 -10 1000 41"><path d="M1000,.5c-13.9,0-21.13,5.78-27.5,10.88-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12C21.13,6.28,13.9.5,0,.5"/></svg>
						<svg viewBox="0 -10 1000 41"><path d="M1000,.5c-13.9,0-21.13,5.78-27.5,10.88-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12C21.13,6.28,13.9.5,0,.5"/></svg>
						<svg viewBox="0 -10 1000 41"><path d="M1000,.5c-13.9,0-21.13,5.78-27.5,10.88-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12C21.13,6.28,13.9.5,0,.5"/></svg>
					</div>
				</div>
				<div class="home-menu-links">
					${homeSectionLinks}
				</div>
			</section>
		`;
	}

	// generate pages for each resource
	let courseColorIndex = 0;
	for (let section of jsonCollection) {

		// go through courses in section
		for (let course of section['contents']) {
	
			// create the directory if it isn't already there
			let dir = `./${course['slug']}`;
			generatedDirs.add(dir);
			if (!fs.existsSync(dir)){
				fs.mkdirSync(dir, { recursive: true });
			} else {
				fs.rmSync(dir, { recursive: true, force: true });
				fs.mkdirSync(dir, { recursive: true });
			}
		
			// generate menu for course resources
			const jsonCourse = course['contents'];
			let menuResources = '';
			colorIndex = 0;
			let courseResources = ``;
			for (let subsection of jsonCourse) {
				let resourceLinks = '';
				let courseSectionLinks = '';
	
				// build resource link
				for (let resource of subsection['contents']) {
			
					// skip if not active
					if (resource['active'] == false) {
						continue
					}

					// build tags
					let tags = "";
					if (resource['tags'] != undefined) {
						for (let tag of resource['tags']) {
							tags += `<li class="course-menu-link-content-tag">${tag}</li>`;
						}
						if (tags.length > 0) {
							tags = `<ul class="course-menu-link-content-tags">${tags}</ul>`;
						}
					}

					// generate description for resource
					let desc = '';
					if (resource['desc'] != "" && resource['desc'] != undefined) {
						desc = `<p class="course-menu-link-content-desc">${resource['desc']}</p>`;
					}

					// detect if resource has an emoji
					let resourceEmoji = '';
					let resourcePageEmoji = '';
					if (resource['emoji'] != undefined) {
						resourceEmoji = `<div class="course-menu-link-content-emoji">${resource['emoji']}</div>`;
						resourcePageEmoji = `<div class="resource-menu-link-emoji">${resource['emoji']}</div>`;
					}

					resourceLinks += `
						<a href="/${course['slug']}/${resource['slug']}/" style="--primary: var(--${colors[colorIndex]});" class="resource-menu-link">
							<h3 class="resource-menu-link-heading">${resource['name']}</h3>
							${resourcePageEmoji}
						</a>
					`;

					let resourceInfo = "";
					let courseInfo = false;
					if (desc != "" || tags != "") {
						resourceInfo = `
							<div>
								${desc}
								${tags}
							</div>
						`;
						courseInfo = true;
					}

					courseSectionLinks += `
						<a href="/${course['slug']}/${resource['slug']}" style="--primary: var(--${colors[colorIndex]});" class="course-menu-link" data-info="${courseInfo}">
							<div class="course-menu-link-content">
								<div>
									<h3 class="course-menu-link-content-title">${resource['name']}</h3>
								</div>
								${resourceInfo}
								${resourceEmoji}
							</div>
						</a>
					`;

					colorIndex++;
					if (colorIndex >= colors.length) {
						colorIndex = 0;
					}
				}

				// detect if subsection has an emoji
				let subsectionEmoji = '';
				if (subsection['emoji'] != undefined) {
					subsectionEmoji = `${resource['emoji']}&nbsp;&nbsp;`;
				}
	
				// put it all together
				menuResources += `
					<section class="resource-menu-section">
						<div class="resource-menu-section-header">
							${splitLeadingEmoji(subsection['name']).emoji ? `<span class="resource-menu-section-emoji">${splitLeadingEmoji(subsection['name']).emoji}</span>` : ''}
							<h2 class="resource-menu-section-heading">${splitLeadingEmoji(subsection['name']).text}</h2>
						</div>
						<div class="resource-menu-links">
							${resourceLinks}
						</div>
					</section>
				`;

				// for the course page
				courseResources += `
					<section class="course-menu-section">
						<div class="menu-section-header">
							${splitLeadingEmoji(subsection['name']).emoji ? `<span class="menu-section-emoji">${splitLeadingEmoji(subsection['name']).emoji}</span>` : ''}
							<h2 class="menu-section-heading">${splitLeadingEmoji(subsection['name']).text}</h2>
							<div class="menu-section-line">
								<svg viewBox="0 -10 1000 41"><path d="M1000,.5c-13.9,0-21.13,5.78-27.5,10.88-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12C21.13,6.28,13.9.5,0,.5"/></svg>
								<svg viewBox="0 -10 1000 41"><path d="M1000,.5c-13.9,0-21.13,5.78-27.5,10.88-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12C21.13,6.28,13.9.5,0,.5"/></svg>
								<svg viewBox="0 -10 1000 41"><path d="M1000,.5c-13.9,0-21.13,5.78-27.5,10.88-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12C21.13,6.28,13.9.5,0,.5"/></svg>
								<svg viewBox="0 -10 1000 41"><path d="M1000,.5c-13.9,0-21.13,5.78-27.5,10.88-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12C21.13,6.28,13.9.5,0,.5"/></svg>
								<svg viewBox="0 -10 1000 41"><path d="M1000,.5c-13.9,0-21.13,5.78-27.5,10.88-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12C21.13,6.28,13.9.5,0,.5"/></svg>
							</div>
						</div>
						<div class="course-menu-links">
							${courseSectionLinks}
						</div>
					</section>
				`;
			}
			courseResources += `
				<a href="/" class="course-menu-return">
					<svg class="course-menu-return-text" viewBox="0 0 100 100"><defs><path id="course-menu-return-text" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"></path></defs><text><textPath xlink:href="#course-menu-return-text">go back home</textPath></text></svg>
					<div class="course-menu-return-icon">
						<p>🍎</p>
					</div>
				</a>
			`;
			
			// build tags
			let tags = "";
			for (let tag of course['tags']) {
				tags += `<li class="menu-desc-tag">${tag}</li>`;
			}
			if (tags.length > 0) {
				tags = `<ul class="menu-desc-tags">${tags}</ul>`;
			}
	
			// generate course page
			let courseContent = `
				<!DOCTYPE html>
				<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<title>${course['emoji']} ${course['name']}${course['version'] ? `, ${course['version']}` : ''}</title>
					${meta}
					<link rel="stylesheet" href="/style.css">
				</head>
				<body>
					<main class="menu-container" style="--primary: var(--${colors[courseColorIndex]});">
						<header class="menu-header">
							<div class="menu-header-content">
								<h1 class="menu-header-title">
									<span class="menu-header-title-emoji"><span class="menu-header-title-emoji-main" onclick="emojiBurst();">${course['emoji']}</span><span class="menu-header-title-emoji-anim-wrapper"></span></span>
									<span class="menu-header-title-big menu-header-title-big-course">${course['name']}</span>
									${course['version'] ? `<span class="menu-header-version">${course['version']}</span>` : ''}
								</h1>
							</div>
							<a href="/" class="menu-header-return">
								<svg class="menu-header-return-text" viewBox="0 0 100 100"><defs><path id="menu-header-return-text" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"></path></defs><text><textPath xlink:href="#menu-header-return-text">GD with GD Classroom</textPath></text></svg>
								<div class="menu-header-return-icon">
									<p>🍎</p>
								</div>
							</a>
							${menuHeaderTools}

							${menuDivider}
						</header>
		
						<div class="menu-nav-container">
							<div class="menu-desc">
								<h2 class="menu-desc-heading">
									<span class="menu-desc-heading-name">${course['name']}</span>
									${course['version'] ? `<span class="menu-desc-heading-version">${course['version']}</span>` : ''}
								</h2>
								<div class="menu-desc-text">
									${course['long-desc']}
								</div>
								${tags}
							</div>
							<nav class="menu-nav">
								${courseResources}
							</nav>
						</div>
					</main>
					
					<script src="/assets/scripts/course.js"></script>
					<script src="/assets/scripts/emoji.js"></script>
					<script src="/assets/scripts/brand.js"></script>
					<script src="/assets/scripts/widget.js"></script>
					<script src="/assets/scripts/soundboard.js"></script>
					<script src="/assets/scripts/timer.js"></script>
					<script src="/assets/scripts/randomizer.js"></script>
					<script src="/assets/scripts/pin.js"></script>
					<script src="/assets/scripts/presentation.js"></script>
				</body>
				</html>
			`;
			fs.writeFileSync(`./${course['slug']}/index.html`, courseContent);

			// generate the individual resource pages
			let resourceColorIndex = 0;
			for (let subsection of jsonCourse) {
				for (let resource of subsection['contents']) {
			
					if (resource['active'] == false) {
						continue
					}

					// detect if resource is authored in markdown
					let markdown = false;
					if (resource['url'] != undefined && resource['url'].endsWith('.md')) {
						markdown = true;
					}

					// handle newtab required special case
					let preview = '';
					let printStyle = '';
					if (markdown) {
						// generate HTML from the markdown file and host it directly
						const markdownRaw = fs.readFileSync(`.${resource['url']}`, 'utf-8');

						// heading ids and the primary-color rotation both start fresh for each resource
						markdownGenerator.beginDocument(markdownRaw);

						// running print footer via @page margin boxes injected into the head: "emoji course, version | resource" on the left, "page x of y" on the right
						// lowercased whatever case the collection gives them, so the footer reads as a caption rather than as a second title
						let printFooter = `${course['emoji'] ? `${course['emoji']} ` : ''}${course['name']}${course['version'] ? `, ${course['version']}` : ''} | ${resource['name']}`.toLowerCase();
						printFooter = printFooter.replace(/"/g, '\\"');
						printStyle = `
							<style>
								@media print {
									/* no horizontal page margin so full-width sections can bleed to the page edges; text is inset via padding on the markdown container instead */
									@page {
										margin: 20mm 0;
										@bottom-left {
											content: "${printFooter}";
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
									/* page one runs to the paper edge so the rainbow strip above the title sits on it; every other page keeps a normal top margin, and this comes after the general @page rule on purpose because Chromium resolves the page context in document order, so declaring it first lets the 20mm below win and pushes the strip down the page */
									@page :first {
										margin-top: 0;
									}
								}
							</style>
						`;
						preview = `
							<div class="resource-preview-markdown-container">
								<article class="resource-preview-markdown">
									${markdownToHTML(markdownRaw)}
								</article>
							</div>
							<div class="resource-preview-markdown-tools">
								<button class="resource-menu-control resource-preview-markdown-tool" onclick="openPresentation();" aria-label="Present">
									<svg class="resource-menu-control-text" viewBox="0 0 100 100"><defs><path id="resource-preview-tool-present" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"></path></defs><text><textPath xlink:href="#resource-preview-tool-present">present</textPath></text></svg>
									<div class="resource-menu-control-icon"><p>📺</p></div>
								</button>
								<button class="resource-menu-control resource-preview-markdown-tool" onclick="window.print();" aria-label="Print">
									<svg class="resource-menu-control-text" viewBox="0 0 100 100"><defs><path id="resource-preview-tool-print" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"></path></defs><text><textPath xlink:href="#resource-preview-tool-print">print</textPath></text></svg>
									<div class="resource-menu-control-icon"><p>🖨️</p></div>
								</button>
								<a class="resource-menu-control resource-preview-markdown-tool" href="/editor/?src=${encodeURIComponent(resource['url'])}" aria-label="Edit this page">
									<svg class="resource-menu-control-text" viewBox="0 0 100 100"><defs><path id="resource-preview-tool-edit" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"></path></defs><text><textPath xlink:href="#resource-preview-tool-edit">edit</textPath></text></svg>
									<div class="resource-menu-control-icon"><p>✍️</p></div>
								</a>
							</div>
						`;
					} else if (!resource['newtab']) {
						preview = `
							<div class="resource-preview-iframe-container">
								<iframe src="${resource['url']}" class="resource-preview-iframe"></iframe>
							</div>
						`;
					} else {
						preview = `
							<div class="resource-preview-newtab-container">
								<div class="resource-preview-newtab">
									<p>To view this resource, you’ll need to open it in a new tab.</p>
									<a href="${resource['url']}" target="_blank">Open in new tab&nbsp;&nbsp;↗</a>
								</div>
							</div>
						`;
					}

					// skip the URL bar for markdown resources (hosted directly)
					let resourceURL = '';
					if (!markdown) {
						resourceURL = `
							<a class="resource-url" href="${resource['url']}" target="_blank">
								<div class="resource-url-label">Current URL</div>
								<div class="resource-url-content">
									<span class="resource-url-content-text">${resource['url']}</span>
									<span class="resource-url-content-arrow">↗</span>
								</div>
							</a>
						`;
					}
	
					let resourceContent = `
						<!DOCTYPE html>
						<html lang="en">
						<head>
							<meta charset="UTF-8">
							<meta name="viewport" content="width=device-width, initial-scale=1.0">
							<title>${course['emoji']} ${course['name']}${course['version'] ? `, ${course['version']}` : ''} | ${resource['name']}</title>
							${meta}
							<link rel="stylesheet" href="/style.css">
							${printStyle}
						</head>
						<body>
			
							<div class="resource-container" style="--primary: var(--${colors[resourceColorIndex]});" data-menu="0">
								<nav class="resource-menu">
									<div class="resource-menu-content">
										<a href="/" class="resource-menu-home"><span class="resource-menu-home-emoji">🍎</span><span class="resource-menu-home-text"><span style="color: var(--pink);">G</span><span style="color: var(--green);">D</span> <span style="color: var(--blue);">w</span><span style="color: var(--yellow);">i</span><span style="color: var(--purple);">t</span><span style="color: var(--red);">h</span> <span style="color: var(--pink);">G</span><span style="color: var(--green);">D</span> Classroom</span></a>
										<header class="resource-menu-header">
											<div class="resource-menu-header-label">
												${course['emoji'] ? `<span class="resource-menu-header-label-emoji">${course['emoji']}</span>` : ''}
												<span class="resource-menu-header-label-text">Current Course</span>
											</div>
											<p class="resource-menu-header-title">
												<a href="../">
													${course['name']}
													${course['version'] ? `<span class="resource-menu-header-version">${course['version']}</span>` : ''}
												</a>
											</p>
										</header>
										<div class="resource-menu-list">
											${menuResources}
										</div>
										<div class="resource-menu-controls">
											<button class="resource-menu-control" onclick="if(window.enterDraw)window.enterDraw('annotate');" aria-label="Annotate">
												<svg class="resource-menu-control-text" viewBox="0 0 100 100"><defs><path id="resource-menu-control-annotate" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"></path></defs><text><textPath xlink:href="#resource-menu-control-annotate">annotate</textPath></text></svg>
												<div class="resource-menu-control-icon">
													<p>📝</p>
												</div>
											</button>
											<button class="resource-menu-control" onclick="if(window.enterDraw)window.enterDraw('whiteboard');" aria-label="Whiteboard">
												<svg class="resource-menu-control-text" viewBox="0 0 100 100"><defs><path id="resource-menu-control-whiteboard" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"></path></defs><text><textPath xlink:href="#resource-menu-control-whiteboard">whiteboard</textPath></text></svg>
												<div class="resource-menu-control-icon">
													<p>✏️</p>
												</div>
											</button>
											<button class="resource-menu-control" onclick="window.createPin();" aria-label="Pin">
												<svg class="resource-menu-control-text" viewBox="0 0 100 100"><defs><path id="resource-menu-control-pin" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"></path></defs><text><textPath xlink:href="#resource-menu-control-pin">pin</textPath></text></svg>
												<div class="resource-menu-control-icon">
													<p>📌</p>
												</div>
											</button>
											<button class="resource-menu-control" onclick="window.createTimer();" aria-label="Timer">
												<svg class="resource-menu-control-text" viewBox="0 0 100 100"><defs><path id="resource-menu-control-timer" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"></path></defs><text><textPath xlink:href="#resource-menu-control-timer">timer</textPath></text></svg>
												<div class="resource-menu-control-icon">
													<p>⏰</p>
												</div>
											</button>
											<button class="resource-menu-control" onclick="window.createRandomizer();" aria-label="Randomizer">
												<svg class="resource-menu-control-text" viewBox="0 0 100 100"><defs><path id="resource-menu-control-randomize" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"></path></defs><text><textPath xlink:href="#resource-menu-control-randomize">randomizer</textPath></text></svg>
												<div class="resource-menu-control-icon">
													<p>🎲</p>
												</div>
											</button>
											<button class="resource-menu-control" onclick="if(window.toggleSoundboard)window.toggleSoundboard();" aria-label="Soundboard">
												<svg class="resource-menu-control-text" viewBox="0 0 100 100"><defs><path id="resource-menu-control-soundboard" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"></path></defs><text><textPath xlink:href="#resource-menu-control-soundboard">soundboard</textPath></text></svg>
												<div class="resource-menu-control-icon">
													<p>🔊</p>
												</div>
											</button>
										</div>
										<div class="resource-menu-divider">
											<div class="resource-menu-divider-block">
												<svg viewBox="0 0 30 1000" preserveAspectRatio="none"><path d="M30,0v1000h-10c0-11.1-4.23-16.38-9.12-22.5-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5C5.78,71.13,0,63.9,0,50s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5h10Z"/></svg>
											</div>
											<div class="resource-menu-divider-block">
												<svg viewBox="0 0 30 1000" preserveAspectRatio="none"><path d="M30,0v1000h-10c0-11.1-4.23-16.38-9.12-22.5-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5C5.78,71.13,0,63.9,0,50s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5h10Z"/></svg>
											</div>
										</div>
									</div>
								</nav>

								<main class="resource-main${markdown ? ' resource-main-markdown' : ''}">
									${resourceURL}

									<div class="resource-preview">
										${preview}
									</div>
								</main>

								<button class="resource-nav-toggle" onclick="toggleMenu();">
									<span class="resource-nav-toggle-open">🧭 <span>Menu</span></span>
									<span class="resource-nav-toggle-close">❌ <span>Close</span></span>
								</button>

								<div class="resource-mobile-divider">
									<div class="resource-mobile-divider-block">
										<svg viewBox="0 0 30 1000" preserveAspectRatio="none"><path d="M30,0v1000h-10c0-11.1-4.23-16.38-9.12-22.5-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5C5.78,71.13,0,63.9,0,50s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5h10Z"/></svg>
									</div>
									<div class="resource-mobile-divider-block">
										<svg viewBox="0 0 30 1000" preserveAspectRatio="none"><path d="M30,0v1000h-10c0-11.1-4.23-16.38-9.12-22.5-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5c-5.1-6.37-10.88-13.6-10.88-27.5s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5s-4.23-16.38-9.12-22.5C5.78,71.13,0,63.9,0,50s5.78-21.13,10.88-27.5c4.89-6.12,9.12-11.4,9.12-22.5h10Z"/></svg>
									</div>
								</div>
							</div>
							
							<script src="/assets/scripts/brand.js"></script>
							<script src="/assets/scripts/widget.js"></script>
							<script src="/assets/scripts/soundboard.js"></script>
							<script src="/assets/scripts/timer.js"></script>
							<script src="/assets/scripts/randomizer.js"></script>
							<script src="/assets/scripts/pin.js"></script>
							<script src="/assets/scripts/markdown.js"></script>
							<script src="/assets/scripts/presentation.js"></script>
							<script src="/assets/scripts/resource.js"></script>
						</body>
						</html>
					`;
	
					// create the directory if it isn't already there
					let dir = `./${course['slug']}/${resource['slug']}`;
					generatedDirs.add(dir);
					if (!fs.existsSync(dir)){
						fs.mkdirSync(dir, { recursive: true });
					} else {
						fs.rmSync(dir, { recursive: true, force: true });
						fs.mkdirSync(dir, { recursive: true });
					}
			
					fs.writeFileSync(`./${course['slug']}/${resource['slug']}/index.html`, resourceContent);

					resourceColorIndex++;
					if (resourceColorIndex >= colors.length) {
						resourceColorIndex = 0;
					}
				}
			}

			courseColorIndex++;
			if (courseColorIndex >= colors.length) {
				courseColorIndex = 0;
			}
		}
	}
	
	// generate all courses page
	let coursesContent = `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Classroom, by GD with GD</title>
			${meta}
			<link rel="stylesheet" href="/style.css">
		</head>
		<body>

			<main class="menu-container home">
				<header class="menu-header">
					<div class="menu-header-content">
						<h1 class="menu-header-title">
							<span class="menu-header-title-emoji"><span class="menu-header-title-emoji-main" onclick="emojiBurst();">🍎</span><span class="menu-header-title-emoji-anim-wrapper"></span></span>
							<span class="menu-header-title-big">GD with GD Classroom!</span>
						</h1>
					</div>
					${menuHeaderTools}
					${menuDivider}
				</header>

				<div class="menu-nav-container">
					<div class="menu-desc">
						<div class="menu-desc-text">
							<p>
								<strong>Welcome to class!</strong> I’m Gabriel, and I teach design and code and everything in between. This site is a collection of everything I make for my courses: syllabi, project descriptions, tutorials, and more!
							</p>
							<p>
								Whether you’re a student or a teacher, feel free to browse through these materials and take what you need. For more resources, check out <a href="https://gdwithgd.com/" target="_blank">GD&nbsp;with&nbsp;GD</a>!
							</p>
						</div>
					</div>
					<nav class="menu-nav">
						${homeCourses}
					</nav>
				</div>
			</main>
			
			<script src="/assets/scripts/home.js"></script>
			<script src="/assets/scripts/emoji.js"></script>
			<script src="/assets/scripts/brand.js"></script>
			<script src="/assets/scripts/widget.js"></script>
			<script src="/assets/scripts/soundboard.js"></script>
			<script src="/assets/scripts/timer.js"></script>
			<script src="/assets/scripts/randomizer.js"></script>
			<script src="/assets/scripts/pin.js"></script>
			<script src="/assets/scripts/presentation.js"></script>
		</body>
		</html>
	`;
	fs.writeFileSync(`./index.html`, coursesContent);

	// anything the last build made that this one didn't
	pruneRemoved(previousDirs, generatedDirs);
}
generatePages();