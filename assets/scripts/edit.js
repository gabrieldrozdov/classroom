// the ✍️ edit tool, in the tools menu of every page — but only when the page is being served by `node dev.js`.
// the editor can only open and save the site's files with that server behind it, so on the published site (and under any other local server) the button would be a link to something that can't do what it says. it's added here rather than built into the page so the published html never carries it at all.
// it sends the page's own address along, and the editor works out what that is: a resource opens to be edited, while the home page and a course page ask for a pick from the sidebar.

(function () {
	if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
		return;
	}
	// the landing pages keep their tools in the header, a resource page keeps them at the bottom of its menu
	let tools = document.querySelector('.resource-menu-controls, .menu-header-tools');
	if (!tools) {
		return;
	}
	fetch('/_dev/ping', { cache: 'no-store' })
		.then(response => response.ok ? response.json() : Promise.reject())
		.then((result) => {
			// live server answers a 404 page rather than this, so a parse that gets this far is the right server. a phone on the wifi (--lan) can look but not write, so it doesn't get the button either.
			if (!result.ok || !result.writing) {
				return;
			}
			let link = document.createElement('a');
			link.className = 'resource-menu-control';
			link.href = `/editor/?page=${encodeURIComponent(location.pathname)}`;
			link.setAttribute('aria-label', 'Edit');
			link.innerHTML = `
				<svg class="resource-menu-control-text" viewBox="0 0 100 100"><defs><path id="tool-edit" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"></path></defs><text><textPath xlink:href="#tool-edit">edit</textPath></text></svg>
				<div class="resource-menu-control-icon"><p>✍️</p></div>
			`;
			tools.appendChild(link);
		})
		.catch(() => {
			// no server, so no button — the ordinary case everywhere but this machine
		});
})();
