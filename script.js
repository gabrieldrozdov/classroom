// Set zoom of preview iframe
function setZoom(level) {
	level = 150-level; // invert fraction
	let previewIframe = document.querySelector('.preview-iframe');
	let newSize = (level/100)*200;
	previewIframe.style.width = newSize + "%";
	previewIframe.style.height = newSize + "%";
	previewIframe.style.transform = `scale(${100 / newSize})`;
}

// Refresh iframe preview
function refreshPreview() {
	let iframeContainer = document.querySelector('.preview-iframe-container');
	let iframe = document.querySelector('.preview-iframe');
	let newIframe = iframe.cloneNode(true);
	iframe.remove();
	iframeContainer.appendChild(newIframe);
}

// Toggle nav to hide/show
function toggleNav() {
	let container = document.querySelector('.container');
	if (parseInt(container.dataset.nav) == 0) {
		container.dataset.nav = 1;
	} else {
		container.dataset.nav = 0;
	}
}

// Toggle menus
function toggleMenu(menuID) {
	// Close all other menus
	for (let navLink of document.querySelectorAll('.nav-link')) {
		if (navLink.id != `nav-${menuID}`) {
			navLink.dataset.active = 0;
		}
	}
	for (let menu of document.querySelectorAll('.nav-menu')) {
		if (menu.id != `menu-${menuID}`) {
			menu.dataset.active = 0;
		}
	}

	let toggle = document.querySelector(`#nav-${menuID}`);
	let menu = document.querySelector(`#menu-${menuID}`);
	let navOverlay = document.querySelector(`.nav-overlay`);
	if (parseInt(toggle.dataset.active) == 1) {
		toggle.dataset.active = 0;
		menu.dataset.active = 0;
		navOverlay.dataset.active = 0;
	} else {
		// Activate menu
		toggle.dataset.active = 1;
		menu.dataset.active = 1;
		navOverlay.dataset.active = 1;

		// Position menu
		let rect = toggle.getBoundingClientRect();
		menu.style.top = rect.top + 68 + "px";
		menu.style.left = rect.left + "px";
		menu.style.right = "";
		menu.style.width = "";

		// Fix positioning if needed
		let menuRect = menu.getBoundingClientRect();
		if (menuRect.right > window.innerWidth - 20) {
			menu.style.left = "";
			menu.style.right = "20px";
			menuRect = menu.getBoundingClientRect();
			if (menuRect.left < 20) {
				menu.style.left = "20px";
				menu.style.right = "20px";
				menu.style.width = "unset";
			}
		}
	}
}
function closeMenus() {
	for (let navLink of document.querySelectorAll('.nav-link')) {
		navLink.dataset.active = 0;
	}
	for (let menu of document.querySelectorAll('.nav-menu')) {
		menu.dataset.active = 0;
	}
	let navOverlay = document.querySelector(`.nav-overlay`);
	navOverlay.dataset.active = 0;
}

// Open in new tab
function openInNewTab(url) {
	window.open(url, '_blank').focus();
}