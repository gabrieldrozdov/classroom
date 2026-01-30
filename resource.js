// Show active resource in menu
function highlightActiveResource() {
	let activeResource = document.querySelector(`.resource-menu-link[href="${window.location.pathname}"]`);
	console.log(window.location.pathname);
	activeResource.dataset.active = 1;
}
highlightActiveResource();

// Toggle menu
function toggleMenu() {
	let container = document.querySelector('.resource-container');
	if (parseInt(container.dataset.menu) == 1) {
		container.dataset.menu = 0;
	} else {
		container.dataset.menu = 1;
	}
}