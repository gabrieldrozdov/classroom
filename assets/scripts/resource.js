// show active resource in menu
function highlightActiveResource() {
	let activeResource = document.querySelector(`.resource-menu-link[href="${window.location.pathname}"]`);
	if (activeResource) {
		activeResource.dataset.active = 1;
	}
}
highlightActiveResource();

// keep the menu where it was when moving from one resource to the next. a long course list otherwise jumps back to the top on every click, and the link you were working down from is gone.
// it's written on the click rather than on leaving, so arriving from the course page or another course still starts at the top the way it always has. sessionStorage can be missing or throw (private windows, blocked storage), and the menu just starts at the top when it does.
const MENU_SCROLL_KEY = 'resource-menu-scroll';

function rememberMenuScroll() {
	let menu = document.querySelector('.resource-menu-content');
	if (!menu) {
		return;
	}
	try {
		sessionStorage.setItem(MENU_SCROLL_KEY, JSON.stringify({ course: courseSlug(), top: menu.scrollTop }));
	} catch (error) {
		// nothing to remember it in
	}
}

function restoreMenuScroll() {
	let menu = document.querySelector('.resource-menu-content');
	let saved = null;
	try {
		saved = JSON.parse(sessionStorage.getItem(MENU_SCROLL_KEY));
		// read once, so a later visit from somewhere else doesn't land on an old position
		sessionStorage.removeItem(MENU_SCROLL_KEY);
	} catch (error) {
		return;
	}
	if (!menu || !saved || saved.course != courseSlug()) {
		return;
	}
	menu.scrollTop = saved.top;
}

// the first part of the path is the course, which is all two pages need to share for the same menu to be on both
function courseSlug() {
	return window.location.pathname.split('/')[1] || '';
}

for (let link of document.querySelectorAll('.resource-menu-link')) {
	link.addEventListener('click', rememberMenuScroll);
}
restoreMenuScroll();

// toggle menu
function toggleMenu() {
	let container = document.querySelector('.resource-container');
	if (parseInt(container.dataset.menu) == 1) {
		container.dataset.menu = 0;
	} else {
		container.dataset.menu = 1;
	}
}