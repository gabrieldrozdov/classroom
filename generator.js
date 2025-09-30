const fs = require('fs');

// Get JSONs
const jsonCourses = require('./assets/data/courses.json');
const jsonGD = require('./assets/data/gdwithgd.json');

// Global elements
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

const colors = ["pink", "green", "blue", "yellow", "purple", "red"];
let colorIndex = 0;
function generatePages() {

	// Generate GD with GD menu
	let menuGD = '';
	for (let section of jsonGD) {
		let sectionLinks = '';

		// Build link
		for (let link of section['contents']) {

			if (link['active'] == false) {
				continue
			}

			sectionLinks += `
				<a href="${link['url']}" target="_blank" style="--primary: var(--${colors[colorIndex]});">
					<h3>${link['emoji']}&nbsp;&nbsp;${link['name']}</h3>
					<p>${link['desc']}</p>
				</a>
			`;

			colorIndex++;
			if (colorIndex >= colors.length) {
				colorIndex = 0;
			}
		}

		// Put it all together
		menuGD += `
			<section class="nav-menu-section">
				<h2 class="nav-menu-section-heading">${section['emoji']}&nbsp;&nbsp;${section['name']}</h2>
				<div class="nav-menu-links">
					${sectionLinks}
				</div>
			</section>
		`;
	}

	// Generate courses menu
	let menuCourses = '';
	let homeCourses = '';
	colorIndex = 0;
	for (let section of jsonCourses) {
		let sectionLinks = '';
		let homeSectionLinks = '';

		// Build link for each course
		for (let course of section['contents']) {

			// Build tags
			let tags = "";
			for (let tag of course['tags']) {
				tags += `<li>${tag}</li>`;
			}
			if (tags.length > 0) {
				tags = `<ul>${tags}</ul>`;
			}

			sectionLinks += `
				<a href="/${course['slug']}/" style="--primary: var(--${colors[colorIndex]});">
					<h3>${course['emoji']}&nbsp;&nbsp;${course['name']} <span>${course['version']}</span></h3>
					<p>${course['desc']}</p>
					${tags}
				</a>
			`;

			homeSectionLinks += `
				<a href="/${course['slug']}/" style="--primary: var(--${colors[colorIndex]});">
					<h3>${course['emoji']}&nbsp;&nbsp;${course['name']} <span>${course['version']}</span></h3>
					<p>${course['desc']}</p>
					${tags}
				</a>
			`;

			colorIndex++;
			if (colorIndex >= colors.length) {
				colorIndex = 0;
			}
		}

		// Put it all together
		menuCourses += `
			<section class="nav-menu-section">
				<h2 class="nav-menu-section-heading">${section['name']}</h2>
				<div class="nav-menu-links">
					${sectionLinks}
				</div>
			</section>
		`;

		// For homepage
		homeCourses += `
			<section class="overview-menu-section">
				<h2 class="overview-menu-section-heading">${section['name']}</h2>
				<div class="overview-menu-links">
					${homeSectionLinks}
				</div>
			</section>
		`;
	}
	menuCourses += `
		<a href="/" class="nav-menu-viewall"><span>🍎&nbsp;&nbsp;View all courses</span> <span>↗</span></a>
	`;

	// Generate pages for each resource
	for (let section of jsonCourses) {

		// Go through courses in section
		for (let course of section['contents']) {
	
			// Check if directory already exists
			// If not, create directory
			let dir = './' + course['slug'];
			if (!fs.existsSync(dir)){
				fs.mkdirSync(dir);
			}
		
			// Generate menu for course resources
			const jsonCourse = require(`./assets/data/${course['slug']}.json`);
			let menuResources = '';
			colorIndex = 0;
			let courseResources = ``;
			for (let subsection of jsonCourse) {
				let sectionLinks = '';
				let courseSectionLinks = '';
	
				// Build resource link
				for (let resource of subsection['contents']) {
			
					if (resource['active'] == false) {
						continue
					}

					let desc = '';
					if (resource['desc'] != "" && resource['desc'] != undefined) {
						desc = `<p>${resource['desc']}</p>`;
					}

					// Detect if resource has an emoji
					let resourceEmoji = '';
					if (resource['emoji'] != undefined) {
						resourceEmoji = resource['emoji'] + "&nbsp;&nbsp;";
					}

					sectionLinks += `
						<a href="/${course['slug']}/${resource['slug']}" style="--primary: var(--${colors[colorIndex]});">
							<h3>${resourceEmoji}${resource['name']}</h3>
							${desc}
							<button onclick="event.stopPropagation(); event.preventDefault(); openInNewTab('${resource['url']}')">↗</button>
						</a>
					`;

					courseSectionLinks += `
						<a href="/${course['slug']}/${resource['slug']}" style="--primary: var(--${colors[colorIndex]});">
							<h3>${resourceEmoji}${resource['name']}</h3>
							${desc}
							<button onclick="event.stopPropagation(); event.preventDefault(); openInNewTab('${resource['url']}')">↗</button>
						</a>
					`;

					colorIndex++;
					if (colorIndex >= colors.length) {
						colorIndex = 0;
					}
				}

				// Detect if subsection has an emoji
				let subsectionEmoji = '';
				if (subsection['emoji'] != undefined) {
					subsectionEmoji = resource['emoji'] + "&nbsp;&nbsp;";
				}
	
				// Put it all together
				menuResources += `
					<section class="nav-menu-section">
						<h2 class="nav-menu-section-heading">${subsectionEmoji}${subsection['name']}</h2>
						<div class="nav-menu-links">
							${sectionLinks}
						</div>
					</section>
				`;

				// For the course page
				courseResources += `
					<section class="overview-menu-section">
						<h2 class="overview-menu-section-heading">${subsectionEmoji}${subsection['name']}</h2>
						<div class="overview-menu-links">
							${courseSectionLinks}
						</div>
					</section>
				`;
			}
			menuResources += `
				<a href="/${course['slug']}/" class="nav-menu-viewall"><span>${course['emoji']}&nbsp;&nbsp;View all resources</span> <span>↗</span></a>
			`;
			
			// Build tags
			let tags = "";
			for (let tag of course['tags']) {
				tags += `<li>${tag}</li>`;
			}
			if (tags.length > 0) {
				tags = `<ul>${tags}</ul>`;
			}
	
			// Generate course page
			let courseContent = `
				<!DOCTYPE html>
				<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<title>${course['emoji']} ${course['name']}, ${course['version']}</title>
					${meta}
					<link rel="stylesheet" href="/style.css">
				</head>
				<body>
					<main class="overview-container">
						<header class="overview-header">
							<div class="overview-header-content">
								<h1 class="overview-header-title">
									<span class="overview-header-title-emoji"><span class="overview-header-title-emoji-main">${course['emoji']}</span></span>
									<span class="overview-header-title-big">${course['name']}</span>
									<span class="overview-header-version">${course['version']}</span>
								</h1>
							</div>
						</header>
		
						<div class="overview-nav-container">
							<div class="overview-desc">
								<p>
									${course['desc']}
								</p>
								${tags}
							</div>
							<nav class="overview-nav">
								${courseResources}
							</nav>
							<a href="/" class="overview-return">🍎&nbsp;&nbsp;View all courses</a>
						</div>
					</main>
					
					<script src="/overview.js"></script>					
					<script src="/script.js"></script>
				</body>
				</html>
			`;
			fs.writeFile(`./${course['slug']}/index.html`, courseContent, err => {
				if (err) {
					console.error(err);
				}
			});

			// Generate the individual resource pages
			for (let subsection of jsonCourse) {

				for (let resource of subsection['contents']) {
			
					if (resource['active'] == false) {
						continue
					}

					// Handle newtab required special case
					let preview = '';
					if (!resource['newtab']) {
						preview = `
							<div class="preview-iframe-container">
								<iframe src="${resource['url']}" class="preview-iframe"></iframe>
							</div>
						`;
					} else {
						preview = `
							<div class="preview-newtab-container">
								<div class="preview-newtab">
									<p>To view this resource, you’ll need to open it in a new tab.</p>
									<a href="${resource['url']}" target="_blank">Open in new tab&nbsp;&nbsp;↗</a>
								</div>
							</div>
						`;
					}

					// Detect if resource has an emoji
					let resourceEmoji = '';
					if (resource['emoji'] != undefined) {
						resourceEmoji = resource['emoji'] + "&nbsp;&nbsp;";
					}
	
					let resourceContent = `
						<!DOCTYPE html>
						<html lang="en">
						<head>
							<meta charset="UTF-8">
							<meta name="viewport" content="width=device-width, initial-scale=1.0">
							<title>${course['emoji']} ${course['name']}, ${course['version']} | ${resource['name']}</title>
							${meta}
							<link rel="stylesheet" href="/style.css">
						</head>
						<body>
			
							<div class="container" data-nav="1">
			
								<nav class="nav">
									<button class="nav-link" onclick="toggleMenu('gdwithgd');" style="--primary: var(--pink);" id="nav-gdwithgd">
										<div class="nav-link-category">GD with GD</div>
										<div class="nav-link-selection">
											<span>🍎&nbsp;&nbsp;Classroom</span>
											<svg viewBox="0 0 100 100"><polygon points="100 32.07 50 82.07 0 32.07 14.14 17.93 50 53.79 85.85 17.93 100 32.07"/></svg>
										</div>
									</button>
			
									<button class="nav-link" onclick="toggleMenu('course');" style="--primary: var(--green);" id="nav-course">
										<div class="nav-link-category">Course</div>
										<div class="nav-link-selection">
											<span>${course['emoji']}&nbsp;&nbsp;${course['name']} <span class="nav-link-selection-version">${course['version']}</span></span>
											<svg viewBox="0 0 100 100"><polygon points="100 32.07 50 82.07 0 32.07 14.14 17.93 50 53.79 85.85 17.93 100 32.07"/></svg>
										</div>
									</button>
			
									<button class="nav-link" onclick="toggleMenu('resource');" style="--primary: var(--blue);" id="nav-resource">
										<div class="nav-link-category">Resource</div>
										<div class="nav-link-selection">
											<span>${resourceEmoji}${resource['name']}</span>
											<svg viewBox="0 0 100 100"><polygon points="100 32.07 50 82.07 0 32.07 14.14 17.93 50 53.79 85.85 17.93 100 32.07"/></svg>
										</div>
									</button>
			
									<a class="nav-link nav-link-url" href="${resource['url']}" target="_blank">
										<div class="nav-link-category">Current URL</div>
										<div class="nav-link-selection">
											<span class="nav-link-url-text">${resource['url']}</span>
											<span class="nav-link-url-arrow">↗</span>
										</div>
									</a>
			
									<button class="nav-link nav-link-refresh" onclick="refreshPreview();" style="--primary: var(--yellow);" data-newtab="${resource['newtab']}">
										<svg viewBox="0 0 77.88 72.46"><path d="M37.94,72.46v-11.05l1.09.1c.06,0,.21,0,.23,0,14.26,0,25.86-11.6,25.86-25.86,0-5.84-1.95-11.42-5.53-15.97v10.6h-12V0h30.29v11.99h-10.44c5.58,6.64,8.63,14.96,8.63,23.66,0,20.3-16.51,36.81-36.81,36.81h-1.32ZM0,72.46v-11.99h10.44c-5.58-6.64-8.63-14.96-8.63-23.66C1.81,16.51,18.32,0,38.62,0h1.32v11.05l-1.09-.1c-.06,0-.11,0-.17,0h-.06c-14.26,0-25.86,11.6-25.86,25.86,0,5.84,1.95,11.42,5.53,15.97v-10.6h12v30.28H0Z"/></svg>
										<span class="nav-link-label">Refresh</span>
									</button>
			
									<div class="nav-link nav-link-zoom" style="--primary: var(--purple);" data-newtab="${resource['newtab']}">
										<input class="nav-link-zoom-range" type="range" min="0" max="100" value="100" oninput="setZoom(this.value)">
										<div class="nav-link-label">Zoom Level</div>
									</div>
			
									<button class="nav-toggle" onclick="toggleNav(); closeMenus();" data-newtab="${resource['newtab']}">
										<svg viewBox="0 0 24 24"><path d="M0,11.93l3.7,3.72,5.29-5.26v13.61h6v-13.61l5.32,5.3,3.7-3.72L11.98,0,0,11.93Z"/></svg>
										<span>Hide<br>Menu</span>
									</button>
								</nav>
			
								<button class="nav-show" onclick="toggleNav();" data-newtab="${resource['newtab']}">
									<svg viewBox="0 0 24 24"><path d="M24,12.07l-3.7-3.72-5.29,5.26V0h-6v13.61l-5.32-5.3-3.7,3.72,12.02,11.96,11.98-11.93Z"/></svg>
									<span>Show Menu</span>
									<svg viewBox="0 0 24 24"><path d="M24,12.07l-3.7-3.72-5.29,5.26V0h-6v13.61l-5.32-5.3-3.7,3.72,12.02,11.96,11.98-11.93Z"/></svg>
								</button>
			
								<main class="preview">
									${preview}
								</main>
			
								<!-- Nav menus -->
								<div class="nav-menu" id="menu-gdwithgd" data-active="0" style="--primary: var(--pink);">
									${menuGD}
								</div>
			
								<div class="nav-menu" id="menu-course" data-active="0" style="--primary: var(--green);">
									${menuCourses}
								</div>
			
								<div class="nav-menu" id="menu-resource" data-active="0" style="--primary: var(--blue);">
									${menuResources}
								</div>
			
								<div class="nav-overlay" data-active="0" onclick="closeMenus();"></div>
			
							</div>
							
							<script src="/script.js"></script>
						</body>
						</html>
					`;
	
					// Check if directory already exists
					// If not, create directory
					let dir = `./${course['slug']}/${resource['slug']}`;
					if (!fs.existsSync(dir)){
						fs.mkdirSync(dir);
					}
			
					fs.writeFile(`./${course['slug']}/${resource['slug']}/index.html`, resourceContent, err => {
						if (err) {
							console.error(err);
						}
					});
				}
			}
		}
	}
	
	// Generate all courses page
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

			<main class="overview-container">
				<header class="overview-header">
					<div class="overview-header-content">
						<h1 class="overview-header-title">
							<span class="overview-header-title-emoji"><span class="overview-header-title-emoji-main">🍎</span></span>
							<span class="overview-header-title-big">GD with GD Classroom!</span>
						</h1>
					</div>
				</header>

				<div class="overview-nav-container">
					<div class="overview-desc">
						<p>
							<strong>Welcome to class!</strong> I’m <a href="https://gdwithgd.com/" target="_blank">Gabriel</a>, and I teach design and code and everything in between. This site is a collection of everything I make for my courses.
						</p>
					</div>
					<nav class="overview-nav">
						${homeCourses}
					</nav>
				</div>
			</main>
			
			<script src="/overview.js"></script>
			<script src="/script.js"></script>
		</body>
		</html>
	`;
	fs.writeFile(`./index.html`, coursesContent, err => {
		if (err) {
			console.error(err);
		}
	});
}
generatePages();