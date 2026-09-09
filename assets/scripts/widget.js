// the shared plumbing behind every floating widget — timers, randomizers, and pins. window.createTimer, window.createRandomizer, and window.createPin build the widgets themselves; everything here is what they have in common.

// every floating widget (timers, randomizers, pins) lives in one layer and draws its z-index from one counter, so whichever was made or touched last sits on top no matter which kind it is. separate layers per type would each form their own stacking context, which is what pinned one type permanently above another.
let widgetZ = 1;
function widgetLayer() {
	let layer = document.querySelector('.widgets');
	if (!layer) {
		layer = document.createElement('div');
		layer.className = 'widgets';
		document.body.appendChild(layer);
	}
	return layer;
}
function widgetToFront(el) {
	el.style.zIndex = ++widgetZ;
}
// put a widget back at the depth it was saved at, and make sure anything opened afterwards still lands on top. without this the counter restarts at one on every page and the order collapses into script load order — every timer under every randomizer under every pin.
function widgetRestoreZ(el, z) {
	z = parseInt(z) || 0;
	if (!z) {
		widgetToFront(el);
		return;
	}
	el.style.zIndex = z;
	if (z > widgetZ) {
		widgetZ = z;
	}
}

// a widget that has ended up completely off screen — dragged past an edge, or left behind when the window got smaller — is brought back to the nearest edge. partly off screen is left alone; that's a reasonable place to park one.
function keepWidgetOnScreen(el) {
	let w = el.offsetWidth, h = el.offsetHeight;
	let left = parseFloat(el.style.left) || 0;
	let top = parseFloat(el.style.top) || 0;
	let vw = window.innerWidth, vh = window.innerHeight;
	if (left < vw && left + w > 0 && top < vh && top + h > 0) {
		return;
	}
	// leave a strip big enough to grab hold of
	let strip = Math.min(60, w);
	el.style.left = `${Math.round(Math.max(strip - w, Math.min(vw - strip, left)))}px`;
	el.style.top = `${Math.round(Math.max(0, Math.min(vh - Math.min(60, h), top)))}px`;
}
function keepAllWidgetsOnScreen() {
	let layer = document.querySelector('.widgets');
	if (!layer) {
		return;
	}
	for (let el of layer.children) {
		keepWidgetOnScreen(el);
	}
}
window.addEventListener('resize', keepAllWidgetsOnScreen);

// did the last press on this widget travel far enough to be a drag rather than a click? Measured as distance from where the press started, rather than by asking whether a button is held: that reports a drag even when the event doesn't carry its button state.
function trackWidgetPress(el) {
	if (el.widgetPressTracked) {
		return;
	}
	el.widgetPressTracked = true;
	el.widgetMoved = false;
	let startX = 0, startY = 0;
	el.addEventListener('pointerdown', (e) => {
		startX = e.clientX;
		startY = e.clientY;
		el.widgetMoved = false;
	}, true);
	el.addEventListener('pointermove', (e) => {
		if (Math.hypot(e.clientX - startX, e.clientY - startY) > 4) {
			el.widgetMoved = true;
		}
	}, true);
}

// collapse a widget to a small draggable square showing just its icon. the square is still the same element, so its position, colour and contents are all untouched — only what's shown changes. clicking it opens it back up, unless the click was the end of a drag.
function widgetMinimize(el, icon, onRestore) {
	let mini = document.createElement('div');
	mini.className = 'widget-mini';
	mini.textContent = icon;
	mini.setAttribute('aria-hidden', 'true');
	el.appendChild(mini);

	trackWidgetPress(el);
	el.addEventListener('click', (e) => {
		// the minimize button's own click bubbles up here, which would open the widget straight back up; and a locked widget doesn't respond at all
		if (e.target.closest('button') || el.dataset.locked == '1') {
			return;
		}
		if (el.dataset.minimized == '1' && !el.widgetMoved) {
			delete el.dataset.minimized;
			if (onRestore) {
				onRestore();
			}
		}
	});
}
window.widgetMinimize = widgetMinimize;

// lock a widget out of the way: it fades back and stops taking pointer events altogether, so the page underneath can still be clicked and scrolled right through it. that also means it can't hear its own unlock click, so command/control presses are picked up on the document and matched to a locked widget by position: dragging moves it, a press without a drag unlocks it.
function widgetLock(el, onChange) {
	el.widgetSave = onChange;
}
// the topmost widget under the point, locked or not. Command/control drag works on any widget, so a note whose text runs edge to edge, or a timer covered by its own controls, can still be picked up from anywhere on it.
function topmostWidgetAt(x, y) {
	let layer = document.querySelector('.widgets');
	if (!layer) {
		return null;
	}
	let found = null, foundZ = -Infinity;
	for (let el of layer.children) {
		let r = el.getBoundingClientRect();
		if (x < r.left || x > r.right || y < r.top || y > r.bottom) {
			continue;
		}
		let z = parseInt(el.style.zIndex) || 0;
		if (z >= foundZ) {
			found = el;
			foundZ = z;
		}
	}
	return found;
}
document.addEventListener('pointerdown', (e) => {
	if (!(e.metaKey || e.ctrlKey)) {
		return;
	}
	let el = topmostWidgetAt(e.clientX, e.clientY);
	if (!el) {
		return;
	}
	// the press is swallowed here rather than left to the widget: a locked one is transparent to the pointer so the press would land on the page underneath, and an unlocked one would start typing, drawing, or pressing a button. a sheet goes over the whole page for the duration too, so dragging across it can't select text, follow a link, or draw on a whiteboard on the way past.
	e.preventDefault();
	e.stopPropagation();
	e.stopImmediatePropagation();
	// a locked widget deliberately keeps its place in the stack; an unlocked one comes forward, the same as dragging it by its edge would
	if (el.dataset.locked != '1') {
		widgetToFront(el);
	}
	let shield = document.createElement('div');
	shield.className = 'widget-drag-shield';
	document.body.appendChild(shield);

	let sx = e.clientX, sy = e.clientY;
	let ox = parseFloat(el.style.left) || 0;
	let oy = parseFloat(el.style.top) || 0;
	let moved = false;
	function onMove(ev) {
		if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 4) {
			moved = true;
		}
		if (moved) {
			el.style.left = `${ox + ev.clientX - sx}px`;
			el.style.top = `${oy + ev.clientY - sy}px`;
		}
	}
	function onUp() {
		document.removeEventListener('pointermove', onMove);
		document.removeEventListener('pointerup', onUp);
		shield.remove();
		// the press will still produce a click; swallow that one too, so it doesn't land on whatever the drag finished over
		let swallow = (ce) => {
			ce.preventDefault();
			ce.stopPropagation();
			ce.stopImmediatePropagation();
		};
		document.addEventListener('click', swallow, true);
		setTimeout(() => document.removeEventListener('click', swallow, true), 0);
		if (moved) {
			keepWidgetOnScreen(el);
		} else if (el.dataset.locked == '1') {
			// a press with no drag is how a locked widget gets unlocked; on an unlocked one it should do nothing at all
			delete el.dataset.locked;
		}
		if (el.widgetSave) {
			el.widgetSave();
		}
	}
	document.addEventListener('pointermove', onMove);
	document.addEventListener('pointerup', onUp);
}, true);
window.widgetLock = widgetLock;

window.widgetLayer = widgetLayer;
window.widgetToFront = widgetToFront;
window.widgetRestoreZ = widgetRestoreZ;
window.keepWidgetOnScreen = keepWidgetOnScreen;
