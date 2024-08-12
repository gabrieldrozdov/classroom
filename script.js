// Zoom controls
function setZoom(level) {
	document.body.style.zoom = level+"%";

	// Set appropriate zoom class to fix media queries
	const body = document.querySelector('body');
	if (level == 75) {
		body.classList.add('zoom-out');
		body.classList.remove('zoom-normal');
		body.classList.remove('zoom-in');
	} else if (level == 125) {
		body.classList.add('zoom-in');
		body.classList.remove('zoom-normal');
		body.classList.remove('zoom-out');
	} else {
		body.classList.remove('zoom-out');
		body.classList.add('zoom-normal');
		body.classList.remove('zoom-in');
	}

	// Display correct zoom toggle in header
	document.querySelectorAll(`.header-zoom button`).forEach((btn) => {btn.dataset.active = 0});
	const activeZoomToggle = document.querySelector(`.header-zoom button[data-zoom="${level}"]`);
	activeZoomToggle.dataset.active = 1;
} 

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
	setHeaderPath(course, resource);
}
readURL();

// Set data path in header
function setHeaderPath(course, resource) {
	let path = `
		<a href="https://gdwithgd.com" target="_blank">GD with GD</a>
		<div>&gt;</div>
		<a href="/">Classroom</a>
	`;

	// Only include course and resource if defined
	if (course != undefined) {
		// this is really obtuse data storage but ah well
		const coursePath = document.querySelector(`#courses .link[data-course="${course}"]`).dataset.path;
		path += `
			<div>&gt;</div>
			<a href="?course=${course}">${coursePath}</a>
		`;
		if (resource != undefined) {
			const resourcePath = document.querySelector(`#resources .link[data-resource="${resource}"]`).dataset.path;
			path += `
				<div>&gt;</div>
				<a href="?course=${course}&resource=${resource}">${resourcePath}</a>
			`;
		}
	}

	// Add to DOM
	const headerPath = document.querySelector(".header-path");
	headerPath.innerHTML = path;
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
		// Detect if links are a part of a group or not
		if (courseLink["contents"] != undefined) {
			temp += `<h3 class="link-category">${courseLink['name']}</h3>`;
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
					<a href="?course=${course}&resource=${sublink['slug']}" class="link" data-resource="${sublink['slug']}" data-url="${sublink['url']}" data-path="${sublink['name']}">
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
			loadEmbed(resourceLink.dataset.url);
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
function unloadEmbed() {
	const preview = document.querySelector('#preview');
	preview.dataset.active = 0;

	// Remove iframe src
	const previewEmbed = preview.querySelector('.preview-embed');
	previewEmbed.innerHTML = "";

	// Set to default URL
	const previewURL = preview.querySelector('.preview-url');
	previewURL.href = "https://classroom.gdwithgd.com";
	previewURL.innerHTML = `<span>https://classroom.gdwithgd.com</span>`;
}
function reloadEmbed(resource) {
	const activeResource = document.querySelector('#resources .link[data-active="1"');
	if (resource != undefined) {
		setTimeout(() => {
			scrollToSection('preview');
		}, 100)
		loadEmbed(activeResource.dataset.url);
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
	elmnt.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
}

function openInNewTab(url) {
	window.open(url, '_blank').focus();
}

// Handle when user navigates back/forward URL change
window.addEventListener("popstate", (event) => {readURL();});

// TODO
// opengraph image