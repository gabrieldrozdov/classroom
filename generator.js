const fs = require('fs');

// Get JSONs
const jsonCourses = require('./assets/data/courses.json');

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

	// Generate courses menu
	let homeCourses = '';
	colorIndex = 0;
	for (let section of jsonCourses) {
		let homeSectionLinks = '';

		// Build link for each course
		for (let course of section['contents']) {

			// Build tags
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
						<h3 class="home-menu-link-content-title">${course['name']} <span class="home-menu-link-content-version">${course['version']}</span></h3>
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

		// For homepage
		homeCourses += `
			<section class="home-menu-section">
				<h2 class="home-menu-section-heading">${section['name']}</h2>
				<div class="home-menu-links">
					${homeSectionLinks}
				</div>
			</section>
		`;
	}

	// Generate pages for each resource
	let courseColorIndex = 0;
	for (let section of jsonCourses) {

		// Go through courses in section
		for (let course of section['contents']) {
	
			// Check if directory already exists
			// If not, create directory
			let dir = './' + course['slug'];
			if (!fs.existsSync(dir)){
				fs.mkdirSync(dir, { recursive: true });
			} else {
				fs.rmSync(dir, { recursive: true, force: true });
				fs.mkdirSync(dir, { recursive: true });
			}
		
			// Generate menu for course resources
			const jsonCourse = require(`./assets/data/${course['slug']}.json`);
			let menuResources = '';
			colorIndex = 0;
			let courseResources = ``;
			for (let subsection of jsonCourse) {
				let resourceLinks = '';
				let courseSectionLinks = '';
	
				// Build resource link
				for (let resource of subsection['contents']) {
			
					// Skip if not active
					if (resource['active'] == false) {
						continue
					}

					// Build tags
					let tags = "";
					if (resource['tags'] != undefined) {
						for (let tag of resource['tags']) {
							tags += `<li class="course-menu-link-content-tag">${tag}</li>`;
						}
						if (tags.length > 0) {
							tags = `<ul class="course-menu-link-content-tags">${tags}</ul>`;
						}
					}

					// Generate description for resource
					let desc = '';
					if (resource['desc'] != "" && resource['desc'] != undefined) {
						desc = `<p class="course-menu-link-content-desc">${resource['desc']}</p>`;
					}

					// Detect if resource has an emoji
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

				// Detect if subsection has an emoji
				let subsectionEmoji = '';
				if (subsection['emoji'] != undefined) {
					subsectionEmoji = resource['emoji'] + "&nbsp;&nbsp;";
				}
	
				// Put it all together
				menuResources += `
					<section class="resource-menu-section">
						<h2 class="resource-menu-section-heading">${subsection['name']}</h2>
						<div class="resource-menu-links">
							${resourceLinks}
						</div>
					</section>
				`;

				// For the course page
				courseResources += `
					<section class="course-menu-section">
						<h2 class="course-menu-section-heading">${subsection['name']}</h2>
						<div class="course-menu-links">
							${courseSectionLinks}
						</div>
					</section>
				`;
			}
			courseResources += `
				<a href="/" class="course-menu-return">
					<svg class="course-menu-return-text" viewBox="0 0 100 100"><defs><path id="course-menu-return-text" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"></path></defs><text><textPath xlink:href="#course-menu-return-text">Select Another Course</textPath></text></svg>
					<div class="course-menu-return-icon">
						<p>🎓</p>
					</div>
				</a>
			`;
			
			// Build tags
			let tags = "";
			for (let tag of course['tags']) {
				tags += `<li class="menu-desc-tag">${tag}</li>`;
			}
			if (tags.length > 0) {
				tags = `<ul class="menu-desc-tags">${tags}</ul>`;
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
					<main class="menu-container" style="--primary: var(--${colors[courseColorIndex]});">
						<header class="menu-header">
							<div class="menu-header-content">
								<h1 class="menu-header-title">
									<span class="menu-header-title-emoji"><span class="menu-header-title-emoji-main" onclick="emojiBurst();">${course['emoji']}</span><span class="menu-header-title-emoji-anim-wrapper"></span></span>
									<span class="menu-header-title-big menu-header-title-big-course">${course['name']}</span>
									<span class="menu-header-version">${course['version']}</span>
								</h1>
							</div>
							<a href="/" class="menu-header-return">
								<svg class="menu-header-return-text" viewBox="0 0 100 100"><defs><path id="menu-header-return-text" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"></path></defs><text><textPath xlink:href="#menu-header-return-text">GD with GD Classroom</textPath></text></svg>
								<div class="menu-header-return-icon">
									<p>🍎</p>
								</div>
							</a>
						</header>
		
						<div class="menu-nav-container">
							<div class="menu-desc">
								<h2 class="menu-desc-heading">
									<span class="menu-desc-heading-name">${course['name']}</span>
									<span class="menu-desc-heading-version">${course['version']}</span>
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
					
					<script src="/course.js"></script>		
					<script src="/emoji.js"></script>			
				</body>
				</html>
			`;
			fs.writeFile(`./${course['slug']}/index.html`, courseContent, err => {
				if (err) {
					console.error(err);
				}
			});

			// Generate the individual resource pages
			let resourceColorIndex = 0;
			for (let subsection of jsonCourse) {
				for (let resource of subsection['contents']) {
			
					if (resource['active'] == false) {
						continue
					}

					// Handle newtab required special case
					let preview = '';
					if (!resource['newtab']) {
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
			
							<div class="resource-container" style="--primary: var(--${colors[resourceColorIndex]});" data-menu="0">
								<nav class="resource-menu">
									<div class="resource-menu-content">
										<header class="resource-menu-header">
											<div class="resource-menu-header-label">
												Current Course
											</div>
											<h1 class="resource-menu-header-title">
												<a href="../">
													${course['name']}
													<span class="resource-menu-header-version">${course['version']}</span>
												</a>
											</h1>
										</header>
										${menuResources}
									</div>
									<div class="resource-menu-header-links">
										<a href="../" class="resource-menu-header-link">
											<svg class="resource-menu-header-link-text" viewBox="0 0 100 100"><defs><path id="resource-menu-header-link-text1" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"></path></defs><text><textPath xlink:href="#resource-menu-header-link-text1">${course['name']}</textPath></text></svg>
											<div class="resource-menu-header-link-icon">
												<p>${course['emoji']}</p>
											</div>
										</a>
										<a href="/" class="resource-menu-header-link">
											<svg class="resource-menu-header-link-text" viewBox="0 0 100 100"><defs><path id="resource-menu-header-link-text2" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"></path></defs><text><textPath xlink:href="#resource-menu-header-link-text2">Classroom Homepage</textPath></text></svg>
											<div class="resource-menu-header-link-icon">
												<p>🏠</p>
											</div>
										</a>
										<a href="https://gdwithgd.com" class="resource-menu-header-link" target="_blank">
											<svg class="resource-menu-header-link-text" viewBox="0 0 100 100"><defs><path id="resource-menu-header-link-text3" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"></path></defs><text><textPath xlink:href="#resource-menu-header-link-text3">GD with GD</textPath></text></svg>
											<div class="resource-menu-header-link-icon">
												<p>🍎</p>
											</div>
										</a>
									</div>
								</nav>

								<main class="resource-main">
									<a class="resource-url" href="${resource['url']}" target="_blank">
										<div class="resource-url-label">Current URL</div>
										<div class="resource-url-content">
											<span class="resource-url-content-text">${resource['url']}</span>
											<span class="resource-url-content-arrow">↗</span>
										</div>
									</a>

									<div class="resource-preview">
										${preview}
									</div>
								</main>

								<button class="resource-nav-toggle" onclick="toggleMenu();">
									<span class="resource-nav-toggle-open">Open Menu</span>
									<span class="resource-nav-toggle-close">Close Menu</span>
								</button>
							</div>
							
							<script src="/resource.js"></script>
						</body>
						</html>
					`;
	
					// Check if directory already exists
					// If not, create directory
					let dir = `./${course['slug']}/${resource['slug']}`;
					if (!fs.existsSync(dir)){
						fs.mkdirSync(dir, { recursive: true });
					} else {
						fs.rmSync(dir, { recursive: true, force: true });
						fs.mkdirSync(dir, { recursive: true });
					}
			
					fs.writeFile(`./${course['slug']}/${resource['slug']}/index.html`, resourceContent, err => {
						if (err) {
							console.error(err);
						}
					});

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

			<main class="menu-container">
				<header class="menu-header">
					<div class="menu-header-content">
						<h1 class="menu-header-title">
							<span class="menu-header-title-emoji"><span class="menu-header-title-emoji-main" onclick="emojiBurst();">🍎</span><span class="menu-header-title-emoji-anim-wrapper"></span></span>
							<span class="menu-header-title-big">GD with GD Classroom!</span>
						</h1>
					</div>
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
			
			<script src="/home.js"></script>
			<script src="/emoji.js"></script>
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