// Set a URL to avoid page refresh
function setURL(course, resource) {
	const newURL = new URL(location);
	newURL.searchParams.set('course', course);
	if (resource != undefined) {
		newURL.searchParams.set('resource', resource);
	} else {
		newURL.searchParams.delete('resource');
	}
	history.pushState({}, '', newURL);
	readURL();
}
for (let courseLink of document.querySelectorAll('#courses .link')) {
	courseLink.addEventListener('click', (e) => {

		// Scroll resources section to top
		const resourcesLinks = resources.querySelector('#resources .links');
		resourcesLinks.scrollTop = 0;

		e.preventDefault();
		setURL(courseLink.dataset.course, undefined);
		scrollToSection('resources');
	})
}

// Read URL and populate page accordingly
function readURL() {
	const url = new URL(window.location.href);
	const params = new URLSearchParams(url.search);
	const course = params.get("course");
	const resource = params.get("resource");
	generateResources(course);
	highlightLinks(course, resource);
	unloadEmbed();
	reloadEmbed(resource);
	setNavPath(course, resource);
}
readURL();

// Set data path in nav
function setNavPath(course, resource) {
	let path = `
		<a href="https://gdwithgd.com" target="_blank">GD with GD</a>
		<div>&rarr;</div>
		<a href="/">Classroom</a>
	`;

	// Only include course and resource if defined
	if (course != undefined) {
		// this is really obtuse data storage but ah well
		const coursePath = document.querySelector(`#courses .link[data-course="${course}"]`).dataset.path;
		path += `
			<div>&rarr;</div>
			<a href="?course=${course}">${coursePath}</a>
		`;
		if (resource != undefined) {
			const resourcePath = document.querySelector(`#resources .link[data-resource="${resource}"]`).dataset.path;
			path += `
				<div>&rarr;</div>
				<a href="?course=${course}&resource=${resource}">${resourcePath}</a>
			`;
		}
	}

	// Add to DOM
	const navPath = document.querySelector(".nav-path");
	navPath.innerHTML = path;
}

// Generate resources section
function generateResources(course) {
	if (course == undefined) {
		const resources = document.querySelector('#resources');
		resources.dataset.active = 0;
		const resourcesLinks = resources.querySelector('.links');
		resourcesLinks.innerHTML = "";
		return
	}
	setTimeout(() => {
		scrollToSection('resources');
	}, 50)

	// Build links
	let courseLinks = courseData[course];
	let temp = "";
	for (let courseLink of courseLinks) {
		temp += "<div class='links-subsection'>";
		// Detect if links are a part of a group or not
		if (courseLink["contents"] != undefined) {
			temp += `<h3 class="links-subsection-heading">${courseLink['name']}</h3>`;
			for (let sublink of courseLink["contents"]) {
				// Generate tags if needed
				let tags = "";
				if (sublink["tags"] != undefined) {
					tags += `<div class="link-tags">`;
					for (let tag of sublink["tags"]) {
						tags += `<div class="link-tag">${tag}</div>`;
					}
					tags += `</div>`;
				}

				// Generate desc if needed
				let desc = "";
				if (sublink["desc"] != undefined) {
					desc = `<p class="link-desc">${sublink['desc']}</p>`;
				}
	
				// Put it all together
				temp += `
					<a href="?course=${course}&resource=${sublink['slug']}" class="link" data-resource="${sublink['slug']}" data-url="${sublink['url']}" data-path="${sublink['name']}" data-newtab="${sublink['newtab']}">
						<h4 class="link-title">${sublink['name']}</h4>
						${desc}
						${tags}
						<div class="link-newtab symbol" onclick="event.stopPropagation(); event.preventDefault(); openInNewTab('${sublink['url']}')">&#xe89e;</div>
					</a>
				`;
			}
		} else {
			// Generate tags if needed
			let tags = "";
			if (courseLink["tags"] != undefined) {
				tags += `<div class="link-tags">`;
				for (let tag of courseLink["tags"]) {
					tags += `<div class="link-tag">${tag}</div>`;
				}
				tags += `</div>`;
			}
	
			// Put it all together
			temp += `
				<a href="?course=${course}&resource=${courseLink['slug']}" class="link" data-resource="${courseLink['slug']}" data-url="${courseLink['url']}" data-path="${courseLink['name']}">
					<h3 class="link-title">${courseLink['name']}</h3>
					${tags}
					<div class="link-newtab symbol" onclick="event.stopPropagation(); event.preventDefault(); openInNewTab('${courseLink['url']}')">&#xe89e;</div>
				</a>
			`;
		}
		temp += "</div>";
	}

	// Add links to DOM
	const resources = document.querySelector('#resources');
	resources.dataset.active = 1;
	const resourcesLinks = resources.querySelector('.links');
	resourcesLinks.innerHTML = temp;

	// Add event listeners
	for (let resourceLink of resourcesLinks.querySelectorAll('.link')) {
		resourceLink.addEventListener('click', (e) => {
			e.preventDefault();
			setURL(course, resourceLink.dataset.resource);
			if (resourceLink.dataset.newtab == "true") {
				loadEmbedNewTab(resourceLink.dataset.url);
			} else {
				loadEmbed(resourceLink.dataset.url);
			}
			scrollToSection('preview');
		})
	}
}

// Load/unload resource embed
function loadEmbed(dataURL) {
	const preview = document.querySelector('#preview');
	preview.dataset.active = 1;

	// Load in embed via iframe
	const previewEmbed = preview.querySelector('.preview-embed');
	previewEmbed.innerHTML = `<iframe src="${dataURL}"></iframe>`;

	// Set display URL and link
	const previewURL = preview.querySelector('.preview-url');
	previewURL.href = dataURL;
	previewURL.innerHTML = `<span>${dataURL}</span><div class="symbol">&#xe89e;</div>`;
}
function loadEmbedNewTab(dataURL) {
	const preview = document.querySelector('#preview');
	preview.dataset.active = 1;

	// Indicate resource must be opened in new tab
	preview.dataset.newtab = 1;
	const previewEmbed = preview.querySelector('.preview-embed');
	previewEmbed.innerHTML = ``;

	// Set display URL and link
	const previewURL = preview.querySelector('.preview-url');
	previewURL.href = dataURL;
	previewURL.innerHTML = `<span>${dataURL}</span><div class="symbol">&#xe89e;</div>`;
}
function unloadEmbed() {
	const preview = document.querySelector('#preview');
	preview.dataset.active = 0;
	preview.dataset.newtab = 0;

	// Remove iframe src
	const previewEmbed = preview.querySelector('.preview-embed');
	previewEmbed.innerHTML = "";
}
function reloadEmbed(resource) {
	const activeResource = document.querySelector('#resources .link[data-active="1"]');
	if (resource != undefined) {
		setTimeout(() => {
			scrollToSection('preview');
		}, 100)

		// Handle if embed needs to be opened in new tab
		if (activeResource.dataset.newtab == "true") {
			loadEmbedNewTab(activeResource.dataset.url);
		} else {
			loadEmbed(activeResource.dataset.url);
		}
	}
}

// Highlight correct course and resource links
function highlightLinks(course, resource) {
	// Unhighlight everything
	document.querySelectorAll(`#courses .link`).forEach((link) => {link.dataset.active = 0});
	document.querySelectorAll(`#resources .link`).forEach((link) => {link.dataset.active = 0});

	// Target and highlight active links
	if (course != undefined) {
		const activeCourse = document.querySelector(`#courses .link[data-course="${course}"]`);
		activeCourse.dataset.active = 1;
		if (resource != undefined) {
			const activeResource = document.querySelector(`#resources .link[data-resource="${resource}"]`);
			activeResource.dataset.active = 1;
		}
	}
}

// Scroll to section for mobile device navigation
function scrollToSection(section) {
	const elmnt = document.querySelector(`#${section}`);
	elmnt.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
}

// Open in new tab
function openInNewTab(url) {
	window.open(url, '_blank').focus();
}

// Handle when user navigates back/forward URL change
window.addEventListener("popstate", (event) => {readURL();});

// Intro message
let colors = ['pink', 'green', 'blue', 'yellow', 'purple', 'red'];
function setIntroColor() {
	const intro = document.querySelector('.intro');
	const navIntro = document.querySelector('.nav-intro');
	const color = colors[Math.floor(Math.random()*colors.length)];
	intro.style.setProperty('--primary', `var(--${color})`);
	navIntro.style.setProperty('--primary', `var(--${color})`);
}
setIntroColor();

function hideIntro() {
	const intro = document.querySelector('.intro');
	intro.dataset.active = 0;
}
function toggleIntro() {
	const intro = document.querySelector('.intro');
	if (parseInt(intro.dataset.active) == 1) {
		intro.dataset.active = 0;
	} else {
		intro.dataset.active = 1;
	}
}