// markdown resource client features: primary-color breaks, ignore regions, heading navigation + anchor copy, and the animated H1. (`colors` is provided globally by brand.js)

// primary color breaks: a [primary color] marker sets --primary on every following element until the next break (runs before the presentation clones the content so the slides inherit the colors too)
function initPrimaryBreaks() {
	let markdown = document.querySelector('.resource-preview-markdown');
	if (!markdown) {
		return;
	}
	for (let marker of markdown.querySelectorAll('.resource-preview-markdown-primary')) {
		let value = marker.dataset.primary;
		let el = marker.nextElementSibling;
		while (el && !el.classList.contains('resource-preview-markdown-primary')) {
			if (value) {
				el.style.setProperty('--primary', value);
			} else {
				el.style.removeProperty('--primary');
			}
			el = el.nextElementSibling;
		}
	}
}
initPrimaryBreaks();

// ignore regions: content after an [ignore] marker is hidden from slides and print (but shown in normal reading) until the next [slide] or [page]
function initIgnore() {
	let markdown = document.querySelector('.resource-preview-markdown');
	if (!markdown) {
		return;
	}
	for (let marker of markdown.querySelectorAll('.resource-preview-markdown-ignore-marker')) {
		let el = marker.nextElementSibling;
		while (
			el &&
			!el.classList.contains('resource-preview-markdown-slide-break') &&
			!el.classList.contains('resource-preview-markdown-pagebreak')
		) {
			el.classList.add('resource-preview-markdown-ignore');
			el = el.nextElementSibling;
		}
	}
}
initIgnore();

// heading navigation (desktop): a jump-to-heading menu in the top-left of the markdown area. the h1 is listed first without a number; h2 is numbered 1., h3 is 1.1, and so on, nested by indentation.
function initHeadingNav() {
	let markdown = document.querySelector('.resource-preview-markdown');
	if (!markdown) {
		return;
	}
	// only the top three levels are listed; h4 and below are treated as text within a section rather than as sections of their own
	let headings = markdown.querySelectorAll('h1, h2, h3');
	if (headings.length == 0) {
		return;
	}

	// build numbered, indented entries
	let counters = [0, 0, 0, 0, 0, 0, 0];
	let entries = '';
	for (let heading of headings) {
		let level = parseInt(heading.tagName.substring(1));

		// number h2 and deeper (1., 1.1, 1.1.1); leave the h1 unnumbered
		let number = '';
		if (level >= 2) {
			counters[level]++;
			for (let l = level + 1; l <= 6; l++) {
				counters[l] = 0;
			}
			let parts = [];
			for (let l = 2; l <= level; l++) {
				parts.push(counters[l]);
			}
			number = parts.join('.');
			if (level == 1) {
				number += '.';
			}
		}

		// pull out the heading's leading emoji (if any) so it can sit on the right, like the resource menu links
		let clone = heading.cloneNode(true);
		let emojiEl = clone.querySelector('.resource-preview-markdown-heading-emoji');
		let emoji = '';
		if (emojiEl) {
			emoji = emojiEl.textContent;
			emojiEl.remove();
		}
		let text = clone.textContent.trim();

		// match the entry to the primary color active at this heading (computed so it picks up primary set on an ancestor, e.g. a band)
		let depth = level == 1 ? 0 : level - 2;
		let linkStyle = `padding-left: ${10 + depth * 20}px;`;
		let headingPrimary = getComputedStyle(heading).getPropertyValue('--primary').trim();
		if (headingPrimary) {
			linkStyle += ` --primary: ${headingPrimary};`;
		}
		entries += `<a href="#${heading.id}" class="resource-preview-markdown-nav-link" style="${linkStyle}">${number ? `<span class="resource-preview-markdown-nav-number">${number}</span>` : ''}<span class="resource-preview-markdown-nav-text">${text}</span>${emoji ? `<span class="resource-preview-markdown-nav-emoji">${emoji}</span>` : ''}</a>`;
	}

	// build the nav (a toggle button and a collapsible list)
	let nav = document.createElement('nav');
	nav.className = 'resource-preview-markdown-nav';
	nav.dataset.open = 0;
	nav.innerHTML = `
		<button class="resource-preview-markdown-nav-toggle" aria-label="Table of contents">
			<span>🔗</span>
			<span>sections</span>
		</button>
		<div class="resource-preview-markdown-nav-list">${entries}</div>
	`;
	markdown.closest('.resource-preview').appendChild(nav);

	// toggle open/closed
	nav.querySelector('.resource-preview-markdown-nav-toggle').addEventListener('click', () => {
		nav.dataset.open = nav.dataset.open == 1 ? 0 : 1;
	});

	// close the nav when clicking anywhere outside it
	document.addEventListener('click', (e) => {
		if (nav.dataset.open == 1 && !nav.contains(e.target)) {
			nav.dataset.open = 0;
		}
	});

	// jump to a heading and close the nav
	let navLinks = nav.querySelectorAll('.resource-preview-markdown-nav-link');
	for (let link of navLinks) {
		link.addEventListener('click', (e) => {
			e.preventDefault();
			let target = markdown.querySelector(`#${CSS.escape(link.getAttribute('href').substring(1))}`);
			if (target) {
				target.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
			nav.dataset.open = 0;
		});
	}

	// highlight the section currently in view (scroll spy), and keep the active entry visible in the nav list
	let container = markdown.closest('.resource-preview-markdown-container');
	let navList = nav.querySelector('.resource-preview-markdown-nav-list');
	function updateActiveHeading() {
		let containerTop = container.getBoundingClientRect().top;
		let current = headings[0];
		for (let heading of headings) {
			if (heading.getBoundingClientRect().top - containerTop <= 120) {
				current = heading;
			} else {
				break;
			}
		}
		let activeLink = null;
		for (let link of navLinks) {
			let active = link.getAttribute('href') == `#${current.id}`;
			link.dataset.active = active ? 1 : 0;
			if (active) {
				activeLink = link;
			}
		}

		// scroll the nav so the active entry stays in view. find the nav's scroll container (the nav or the list) and only nudge it when the entry is actually out of view, to avoid fighting the reader.
		if (activeLink) {
			let scroller = navList.scrollHeight > navList.clientHeight ? navList : nav;
			if (scroller.scrollHeight > scroller.clientHeight) {
				let lr = activeLink.getBoundingClientRect();
				let sr = scroller.getBoundingClientRect();
				if (lr.top < sr.top) {
					scroller.scrollTop -= (sr.top - lr.top) + 12;
				} else if (lr.bottom > sr.bottom) {
					scroller.scrollTop += (lr.bottom - sr.bottom) + 12;
				}
			}
		}
	}
	container.addEventListener('scroll', updateActiveHeading);
	updateActiveHeading();
}
initHeadingNav();

// click a section heading to copy its anchor link to the clipboard
function initHeadingCopy() {
	let markdown = document.querySelector('.resource-preview-markdown');
	if (!markdown) {
		return;
	}
	// matches the nav: only h1–h3 are linkable sections
	let headings = markdown.querySelectorAll('h1, h2, h3');
	if (headings.length == 0) {
		return;
	}

	// a small confirmation toast shared by all headings
	let toast = document.createElement('div');
	toast.className = 'resource-preview-markdown-toast';
	toast.textContent = 'Link copied';
	markdown.closest('.resource-preview').appendChild(toast);
	let toastTimer;

	for (let heading of headings) {
		if (!heading.id) {
			continue;
		}
		heading.classList.add('resource-preview-markdown-heading-link');
		heading.addEventListener('click', () => {
			let url = `${window.location.origin}${window.location.pathname}#${heading.id}`;
			navigator.clipboard.writeText(url).then(() => {
				toast.dataset.show = 1;
				clearTimeout(toastTimer);
				toastTimer = setTimeout(() => { toast.dataset.show = 0; }, 1500);
			});
		});
	}
}
initHeadingCopy();

// make the h1 pretty (the reading-view h1 and any h1 cloned into slides)
function generateH1() {
	for (let h1 of document.querySelectorAll("h1 .resource-preview-markdown-heading-text")) {
		let colorIndex = 0;
		let words = h1.textContent.split(' ');
		let temp = "";
		for (let word of words) {
			let temptemp = '';
			for (let letter of word) {
				temptemp += `<span style="color: var(--${colors[colorIndex]}); animation-delay: ${-colorIndex/3}s">${letter}</span>`;
				colorIndex++;
				if (colorIndex >= colors.length) {
					colorIndex = 0;
				}
			}
			temp += `<span>${temptemp}</span> `;
		}
		h1.innerHTML = temp;
	}
}
generateH1();

// calendar annotations: each colored day points at the hidden annotations stored below the grid, which are copied into a tooltip on hover or focus. clicking pins the tooltip open so its links stay reachable (and so it works on touch, where there is no hover).
function initCalendarTooltips() {

	// the tooltip currently on screen, if any, and the pending hide
	let active = null;
	let hideTimer;

	// every calendar gets its own tooltip element, created on first use, so the tooltip is positioned against that calendar and inherits the markdown styling around it
	function tooltipFor(calendar) {
		let tooltip = calendar.querySelector(':scope > .resource-preview-markdown-calendar-tooltip');
		if (!tooltip) {
			tooltip = document.createElement('div');
			tooltip.className = 'resource-preview-markdown-calendar-tooltip';
			tooltip.setAttribute('role', 'tooltip');
			calendar.appendChild(tooltip);
		}
		return tooltip;
	}

	// place the tooltip above the trigger, flipping below when it would run off the top and nudging sideways to stay inside the calendar
	function position(tooltip, trigger, calendar) {
		let calendarBox = calendar.getBoundingClientRect();
		let triggerBox = trigger.getBoundingClientRect();
		let width = tooltip.offsetWidth;
		let height = tooltip.offsetHeight;
		let left = triggerBox.left - calendarBox.left + triggerBox.width / 2 - width / 2;
		left = Math.max(0, Math.min(left, Math.max(0, calendarBox.width - width)));
		let top = triggerBox.top - calendarBox.top - height - 8;
		if (triggerBox.top - height - 8 < 0) {
			top = triggerBox.bottom - calendarBox.top + 8;
		}
		tooltip.style.left = `${left}px`;
		tooltip.style.top = `${top}px`;
	}

	function hide() {
		if (!active) {
			return;
		}
		active.trigger.setAttribute('aria-expanded', 'false');
		active.tooltip.dataset.open = 0;
		active = null;
	}

	function show(trigger, pinned) {
		clearTimeout(hideTimer);
		let calendar = trigger.closest('.resource-preview-markdown-calendar');
		if (!calendar) {
			return;
		}

		// look the annotations up inside this calendar, so a calendar cloned into presentation mode uses its own copies. a day covered by more than one entry stacks all of them in the tooltip.
		let annotations = [];
		for (let id of (trigger.dataset.annotations || '').split(' ')) {
			let annotation = id ? calendar.querySelector(`[id="${id}"]`) : null;
			if (annotation) {
				annotations.push(annotation);
			}
		}
		if (annotations.length == 0) {
			return;
		}
		if (active && active.trigger == trigger) {
			active.pinned = active.pinned || pinned;
			return;
		}
		hide();

		// copy the annotations in, dropping their ids so the originals stay the only thing aria-describedby can point at
		let tooltip = tooltipFor(calendar);
		tooltip.innerHTML = '';
		for (let annotation of annotations) {
			let copy = annotation.cloneNode(true);
			copy.removeAttribute('id');
			tooltip.appendChild(copy);
		}
		// the tooltip takes its accent from the first entry stacked in it
		tooltip.style.setProperty('--entry-color', annotations[0].style.getPropertyValue('--entry-color'));
		tooltip.dataset.open = 1;
		trigger.setAttribute('aria-expanded', 'true');
		active = { trigger: trigger, tooltip: tooltip, calendar: calendar, pinned: pinned };
		position(tooltip, trigger, calendar);
	}

	// delegated so calendars cloned into slides work too
	function triggerFrom(event) {
		let target = event.target instanceof Element ? event.target : null;
		return target ? target.closest('[data-annotations]') : null;
	}

	// hiding is delayed a moment so the pointer can cross the gap between a dot and its tooltip without the tooltip vanishing on the way
	document.addEventListener('mouseover', (event) => {
		let trigger = triggerFrom(event);
		if (trigger) {
			clearTimeout(hideTimer);
			show(trigger, false);
		} else if (active && active.tooltip.contains(event.target)) {
			clearTimeout(hideTimer);
		}
	});
	document.addEventListener('mouseout', (event) => {
		if (!active || active.pinned) {
			return;
		}
		if (!active.trigger.contains(event.target) && !active.tooltip.contains(event.target)) {
			return;
		}
		let to = event.relatedTarget instanceof Element ? event.relatedTarget : null;
		if (to && (active.trigger.contains(to) || active.tooltip.contains(to))) {
			return;
		}
		clearTimeout(hideTimer);
		hideTimer = setTimeout(hide, 120);
	});
	document.addEventListener('focusin', (event) => {
		let trigger = triggerFrom(event);
		if (trigger) {
			show(trigger, true);
		} else if (active && active.pinned && !active.tooltip.contains(event.target)) {
			hide();
		}
	});
	// clicking a trigger toggles it. the state is read on mousedown because pressing a trigger focuses it first, which opens the tooltip — so by the time the click lands it would always look already-open
	let pressedOpen = false;
	document.addEventListener('mousedown', (event) => {
		let trigger = triggerFrom(event);
		pressedOpen = !!(trigger && active && active.trigger == trigger && active.pinned);
	});
	document.addEventListener('click', (event) => {
		let trigger = triggerFrom(event);
		if (trigger) {
			if (pressedOpen) {
				hide();
			} else {
				show(trigger, true);
			}
			return;
		}
		if (active && !active.tooltip.contains(event.target)) {
			hide();
		}
	});
	document.addEventListener('keydown', (event) => {
		if (event.key == 'Escape' && active) {
			let trigger = active.trigger;
			hide();
			trigger.blur();
		}
	});

	// keep the tooltip attached to its trigger while the page moves
	for (let event of ['scroll', 'resize']) {
		window.addEventListener(event, () => {
			if (active) {
				position(active.tooltip, active.trigger, active.calendar);
			}
		}, true);
	}
}
initCalendarTooltips();

// manual page breaks that would strand an empty page.
// a [page] marker forces a break, and so does a colour band (it starts its own page in print). when a marker is followed by a band, the page opened by the marker is left holding nothing but the invisible markers between them, and prints blank. the same happens with two [page] markers in a row.
// CSS can't see past those in-between markers — they're real siblings, so an adjacency selector never matches — so the check is done here, just before printing, by stepping over anything that draws nothing.
function initPrintBreaks() {
	let markdown = document.querySelector('.resource-preview-markdown');
	if (!markdown) {
		return;
	}
	// elements that occupy no space on paper
	let weightless = [
		'resource-preview-markdown-slide-break',
		'resource-preview-markdown-primary',
		'resource-preview-markdown-anchor',
		'resource-preview-markdown-ignore-marker'
	];
	function nextRealSibling(el) {
		let next = el.nextElementSibling;
		while (next && weightless.some(cls => next.classList.contains(cls))) {
			next = next.nextElementSibling;
		}
		return next;
	}
	function markRedundantBreaks() {
		for (let brk of markdown.querySelectorAll('.resource-preview-markdown-pagebreak')) {
			let next = nextRealSibling(brk);
			let opensItsOwnPage = !next
				|| next.classList.contains('resource-preview-markdown-band')
				|| next.classList.contains('resource-preview-markdown-pagebreak');
			if (opensItsOwnPage) {
				brk.dataset.redundant = '1';
			} else {
				delete brk.dataset.redundant;
			}
		}
	}
	window.addEventListener('beforeprint', markRedundantBreaks);
	// Chrome's headless PDF export doesn't fire beforeprint, and matchMedia catches the print dialog on browsers that don't either
	if (window.matchMedia) {
		let printing = window.matchMedia('print');
		if (printing.addEventListener) {
			printing.addEventListener('change', (e) => {
				if (e.matches) {
					markRedundantBreaks();
				}
			});
		}
	}
	markRedundantBreaks();
}
initPrintBreaks();

// vector checkerboards for print: Chromium rasterises every tiled background into a screen-resolution bitmap and scales it up for the printer, so the checkerboard strips come out soft-edged — true of CSS gradients and of SVG used as a background-image alike, with no CSS-side fix — but inline <svg> elements are emitted as real vector paths, so print swaps the pseudo-element strips for these
// the strips are built once on load and hidden on screen, rather than on beforeprint, so they don't depend on an event that headless PDF export never fires
function initPrintStrips() {
	let markdown = document.querySelector('.resource-preview-markdown');
	if (!markdown) {
		return;
	}

	// one user unit is 1/48in less a scale factor: the strips are .25in tall, which is 48 units, and generously wider than any paper we'd print on.
	let UNIT = 48;
	let WIDTH = UNIT * 50;

	function svg(cls, children) {
		let el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		el.setAttribute('class', `resource-preview-markdown-print-strip ${cls}`);
		el.setAttribute('viewBox', `0 0 ${WIDTH} ${UNIT}`);
		el.setAttribute('preserveAspectRatio', 'xMinYMin slice');
		el.setAttribute('aria-hidden', 'true');
		el.innerHTML = children;
		return el;
	}

	// the rainbow tile from colorgrid.svg, laid out as explicit rects. a <pattern> would be tidier but Chromium rasterises those too.
	let RAINBOW = ['#f3a8dd', '#98db6b', '#5adee8', '#fdc03a', '#a690fc', '#ff734d'];
	function rainbowStrip() {
		let tile = UNIT * 3;
		let sq = UNIT / 2;
		let out = '';
		for (let x = 0; x < WIDTH; x += tile) {
			RAINBOW.forEach((color, i) => {
				// colours alternate between the top and bottom row
				let cx = x + i * sq;
				let cy = i % 2 === 0 ? 0 : sq;
				out += `<rect x="${cx}" y="${cy}" width="${sq}" height="${sq}" fill="${color}"/>`;
			});
		}
		return svg('resource-preview-markdown-print-strip-rainbow', out);
	}

	// a two-tone checkerboard is two dashed strokes: one square on, one square off, with the lower row offset by a square. two path objects instead of a rect per square.
	function checkerStrip(cls) {
		let sq = UNIT / 2;
		let line = (y, offset) => `<line x1="0" y1="${y}" x2="${WIDTH}" y2="${y}" stroke-width="${sq}" stroke-dasharray="${sq} ${sq}" stroke-dashoffset="${offset}"/>`;
		return svg(`resource-preview-markdown-print-strip-checker ${cls}`,
			`<rect class="resource-preview-markdown-print-strip-bg" width="${WIDTH}" height="${UNIT}"/>${line(sq / 2, 0)}${line(sq * 1.5, sq)}`);
	}

	// the rainbow goes at the top of the container, ahead of the article, and prints as an ordinary block in the flow rather than positioned over it.
	// it was absolutely positioned at first, which meant its containing block was the container — and the container is the scroll box, whose height and overflow both change under @media print. Chromium would lay the strip out against the pre-print geometry and leave it there, so the first print put the strip in the wrong place and any change that forced a full recalc (saving the stylesheet) fixed it. sitting in the flow, it has nothing stale to be positioned against. the band strips below stay absolute — their containing block is an ordinary block that doesn't change between media.
	// being outside the article also keeps it clear of `.resource-preview-markdown > *:nth-child(1)`, which is what strips the h1's top margin, and keeps it from being cloned into slides.
	let container = markdown.closest('.resource-preview-markdown-container') || markdown.parentElement;
	if (container) {
		container.prepend(rainbowStrip());
	}
	for (let band of markdown.querySelectorAll('.resource-preview-markdown-band')) {
		band.append(checkerStrip('resource-preview-markdown-print-strip-top'));
		band.append(checkerStrip('resource-preview-markdown-print-strip-bottom'));
	}
}
initPrintStrips();

// file trees: an indented listing that can flip into a folder browser.
// the listing itself is plain markup from the generator, so it prints and reads fine with no JavaScript. the folder view is built here from the same data, carried on the block as JSON, and shows one folder at a time. the block's title doubles as the path you're standing in, with each segment clickable, and a back button appears beside it.
// presentation mode clones the markdown into slides, so none of this can live in per-element listeners: the clones would arrive inert. instead the clicks are delegated from the document and the only state — which folder you're in — is kept in a data attribute, so a cloned block carries its position with it and works the moment it appears.
function initFileTrees() {

	function treeOf(block) {
		try {
			return JSON.parse(block.dataset.tree || '[]');
		} catch (err) {
			return [];
		}
	}

	// the trail is a list of child indices, one per folder descended into
	function trailOf(block) {
		return (block.dataset.trail || '').split(',').filter(part => part !== '').map(Number);
	}
	function setTrail(block, trail) {
		block.dataset.trail = trail.join(',');
	}
	function nodesAt(block, depth) {
		let trail = trailOf(block);
		let nodes = treeOf(block);
		for (let step = 0; step < depth; step++) {
			nodes = (nodes[trail[step]] || {}).children || [];
		}
		return nodes;
	}

	function render(block) {
		let title = block.querySelector('.resource-preview-markdown-files-title');
		let back = block.querySelector('.resource-preview-markdown-files-back');
		let grid = block.querySelector('.resource-preview-markdown-files-grid');
		if (!title || !back) {
			return;
		}
		if (!grid) {
			grid = document.createElement('div');
			grid.className = 'resource-preview-markdown-files-grid';
			block.appendChild(grid);
		}
		let rootName = block.dataset.root || 'all files';
		let trail = trailOf(block);

		// in file view the title is just the title; in folder view it becomes the path, so the two never appear at once
		if (block.dataset.view != 'folder') {
			title.textContent = rootName;
		} else {
			title.innerHTML = '';
			let crumb = (label, depth) => {
				let el = document.createElement('button');
				el.type = 'button';
				el.className = 'resource-preview-markdown-files-crumb';
				el.dataset.depth = depth;
				el.textContent = label;
				el.disabled = depth == trail.length;
				title.appendChild(el);
			};
			crumb(rootName, 0);
			trail.forEach((index, depth) => {
				let node = nodesAt(block, depth)[index];
				let separator = document.createElement('span');
				separator.className = 'resource-preview-markdown-files-crumb-separator';
				separator.textContent = '/';
				title.appendChild(separator);
				crumb(node ? node.name : '?', depth + 1);
			});
		}
		back.disabled = trail.length == 0;

		grid.innerHTML = '';
		let nodes = nodesAt(block, trail.length);
		if (nodes.length == 0) {
			let empty = document.createElement('p');
			empty.className = 'resource-preview-markdown-files-empty';
			empty.textContent = 'empty folder';
			grid.appendChild(empty);
			return;
		}
		nodes.forEach((node, index) => {
			// a file with a link is a link; everything else is a button, so folders stay keyboard-reachable without pretending to navigate
			let tile = document.createElement(node.folder || !node.url ? 'button' : 'a');
			if (tile.tagName == 'BUTTON') {
				tile.type = 'button';
			} else {
				tile.href = node.url;
			}
			tile.className = 'resource-preview-markdown-files-tile';
			tile.dataset.folder = node.folder ? 1 : 0;
			tile.dataset.index = index;
			tile.innerHTML = `<span class="resource-preview-markdown-files-tile-emoji"></span><span class="resource-preview-markdown-files-tile-name"></span>`;
			tile.querySelector('.resource-preview-markdown-files-tile-emoji').textContent = node.emoji;
			tile.querySelector('.resource-preview-markdown-files-tile-name').textContent = node.name;
			grid.appendChild(tile);
		});
	}

	document.addEventListener('click', (e) => {
		let target = e.target instanceof Element ? e.target : null;
		let block = target ? target.closest('.resource-preview-markdown-files') : null;
		if (!block) {
			return;
		}

		let toggle = target.closest('.resource-preview-markdown-files-toggle');
		if (toggle) {
			let folderOpen = block.dataset.view == 'folder';
			block.dataset.view = folderOpen ? 'file' : 'folder';
			toggle.textContent = folderOpen ? 'folder view' : 'file view';
			if (!folderOpen) {
				// always reopen at the top rather than where it was left
				setTrail(block, []);
			}
			render(block);
			return;
		}

		if (target.closest('.resource-preview-markdown-files-back')) {
			let trail = trailOf(block);
			trail.pop();
			setTrail(block, trail);
			render(block);
			return;
		}

		let crumb = target.closest('.resource-preview-markdown-files-crumb');
		if (crumb) {
			setTrail(block, trailOf(block).slice(0, Number(crumb.dataset.depth)));
			render(block);
			return;
		}

		let tile = target.closest('.resource-preview-markdown-files-tile');
		if (tile && tile.dataset.folder == '1') {
			setTrail(block, trailOf(block).concat(Number(tile.dataset.index)));
			render(block);
		}
	});

	for (let block of document.querySelectorAll('.resource-preview-markdown-files')) {
		render(block);
	}
}
initFileTrees();
