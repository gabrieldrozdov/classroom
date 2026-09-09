// show active resource in menu
function highlightActiveResource() {
	let activeResource = document.querySelector(`.resource-menu-link[href="${window.location.pathname}"]`);
	if (activeResource) {
		activeResource.dataset.active = 1;
	}
}
highlightActiveResource();

// toggle menu
function toggleMenu() {
	let container = document.querySelector('.resource-container');
	if (parseInt(container.dataset.menu) == 1) {
		container.dataset.menu = 0;
	} else {
		container.dataset.menu = 1;
	}
}