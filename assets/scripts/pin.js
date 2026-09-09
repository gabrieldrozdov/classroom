// pins: post-it notes that float above every page, in the same family as the timers and randomizers. persisted via localStorage. window.createPin() spawns a new one. (`colors` is provided globally by brand.js, and the shared widget plumbing by widget.js)
// a pin holds two layers that stay locked together: a text box you can type into, and a pixel canvas sitting on top of it that you can scribble on. both live inside one scroller, so a note with more text than fits scrolls the writing and the drawing as a single sheet. the canvas always spans the full scrollable height rather than just the visible window, so a mark made at the bottom of a long note stays where it was put.

function initPins() {
	let container = window.widgetLayer();

	let pinList = [];

	function closeAllPins() {
		for (let p of pinList.slice()) {
			p.el.remove();
		}
		pinList = [];
		savePins();
	}

	let PINS_KEY = 'classroom-pins';
	let restoringPins = false;
	function savePins() {
		if (restoringPins) {
			return;
		}
		try {
			let data = pinList.map(p => ({
				text: p.fields.text.value,
				drawing: p.exportDrawing(),
				tool: p.el.dataset.tool,
				colorIndex: parseInt(p.el.dataset.colorIndex) || 0,
				minimized: p.el.dataset.minimized == '1',
				locked: p.el.dataset.locked == '1',
				z: parseInt(p.el.style.zIndex) || 0,
				left: p.el.style.left,
				top: p.el.style.top,
				placeholder: p.el.dataset.placeholder == '1',
				fontSize: p.el.dataset.fontSize,
				width: p.el.style.width,
				height: p.el.style.getPropertyValue('--pin-body')
			}));
			localStorage.setItem(PINS_KEY, JSON.stringify(data));
		} catch (err) {}
	}
	function loadPins() {
		try {
			let raw = localStorage.getItem(PINS_KEY);
			if (!raw) {
				return;
			}
			restoringPins = true;
			for (let d of JSON.parse(raw)) {
				createPin(d);
			}
			restoringPins = false;
			savePins();
		} catch (err) {
			restoringPins = false;
		}
	}

	function createPin(restore) {
		let el = document.createElement('div');
		el.className = 'pin';
		let colorIndex = restore ? (restore.colorIndex || 0) : Math.floor(Math.random() * colors.length);
		el.style.setProperty('--primary', `var(--${colors[colorIndex]})`);
		el.dataset.colorIndex = colorIndex;
		el.dataset.tool = restore && restore.tool ? restore.tool : 'text';
		el.dataset.fontSize = restore && restore.fontSize ? restore.fontSize : '20';
		el.style.width = restore && restore.width ? restore.width : '390px';
		// the stored height sizes the writing area rather than the note, so the toolbar can appear below it on hover and grow the note instead of covering what's written
		el.style.setProperty('--pin-body', restore && restore.height ? restore.height : '330px');
		el.innerHTML = `
			<div class="pin-scroll">
				<div class="pin-sheet">
					<textarea class="pin-text" placeholder="" aria-label="Note text" spellcheck="false"></textarea>
					<canvas class="pin-canvas"></canvas>
				</div>
			</div>
			<div class="pin-buttons">
				<div class="pin-group">
					<button class="pin-tool" data-tool="text" aria-label="Write">🔠</button>
					<button class="pin-smaller" aria-label="Smaller text">➖</button>
					<button class="pin-bigger" aria-label="Bigger text">➕</button>
				</div>
				<div class="pin-group">
					<button class="pin-tool" data-tool="draw" aria-label="Draw">✏️</button>
					<button class="pin-tool" data-tool="erase" aria-label="Erase">🧽</button>
					<button class="pin-undo" aria-label="Undo">👈</button>
					<button class="pin-redo" aria-label="Redo">👉</button>
					<button class="pin-clear" aria-label="Clear drawing">🗑️</button>
				</div>
				<div class="pin-group">
					<button class="pin-save" aria-label="Save as image">💾</button>
					<button class="pin-color" aria-label="Change color">🎨</button>
					<button class="pin-duplicate" aria-label="Duplicate pin">👯</button>
					<button class="pin-minimize" aria-label="Minimize">👁️</button>
					<button class="pin-lock" aria-label="Lock">🔒</button>
					<button class="pin-cancel" aria-label="Close pin">❌</button>
				</div>
			</div>
			<div class="pin-resize" aria-hidden="true"></div>
		`;
		if (restore && restore.minimized) {
			el.dataset.minimized = '1';
		}
		if (restore && restore.locked) {
			el.dataset.locked = '1';
		}
		container.appendChild(el);
		// a new widget opens on top; a restored one goes back to the depth it had. any press inside one raises it — on the capture phase so it still applies when the press lands on a button or a field rather than on the body of the widget.
		if (restore && restore.z) {
			window.widgetRestoreZ(el, restore.z);
		} else {
			window.widgetToFront(el);
		}
		el.addEventListener('pointerdown', () => window.widgetToFront(el), true);
		el.addEventListener('pointerdown', () => clearPlaceholder(), true);

		let scroll = el.querySelector('.pin-scroll');
		let sheet = el.querySelector('.pin-sheet');
		let textEl = el.querySelector('.pin-text');
		let canvas = el.querySelector('.pin-canvas');
		let ctx = canvas.getContext('2d');
		// a canvas element starts out 300x150 whether you want it to or not, and the sizing below only ever grows — so without this the drawing surface would never be narrower than 300px however small the note is, leaving a strip hanging off the right and everything centred on it sitting off to one side.
		canvas.width = 0;
		canvas.height = 0;
		let fields = { text: textEl };

		if (restore && restore.text) {
			textEl.value = restore.text;
		}

		if (restore && restore.left) {
			el.style.left = restore.left;
			el.style.top = restore.top;
		} else {
			let w = el.offsetWidth, h = el.offsetHeight, gap = 12;
			let left = (window.innerWidth - w) / 2 + (Math.random() - 0.5) * window.innerWidth * 0.18;
			let top = (window.innerHeight - h) / 2 + (Math.random() - 0.5) * window.innerHeight * 0.18;
			el.style.left = `${Math.round(Math.max(gap, Math.min(window.innerWidth - w - gap, left)))}px`;
			el.style.top = `${Math.round(Math.max(gap, Math.min(window.innerHeight - h - gap, top)))}px`;
		}

		// off-black, drawn as hard squares so it reads as pixels rather than ink
		let INK = getComputedStyle(document.documentElement).getPropertyValue('--off-black').trim() || '#1a1a1a';
		let BRUSH = 6;
		// the eraser is deliberately blunt — rubbing out is a coarser job than drawing, and a same-size eraser is fiddly to aim
		let ERASER = BRUSH * 3;

		// undo history for the drawing: a snapshot canvas per completed stroke (and per clear). snapshots rather than stroke replay, because the canvas can be resized between steps and pixels are the only thing that survives that unambiguously.
		let history = [];
		let historyAt = -1;
		function snapshot() {
			let copy = document.createElement('canvas');
			copy.width = Math.max(1, canvas.width);
			copy.height = Math.max(1, canvas.height);
			if (canvas.width && canvas.height) {
				copy.getContext('2d').drawImage(canvas, 0, 0);
			}
			return copy;
		}
		function pushHistory() {
			history = history.slice(0, historyAt + 1);
			history.push(snapshot());
			if (history.length > 30) {
				history.shift();
			}
			historyAt = history.length - 1;
			syncHistoryButtons();
		}
		function restoreHistory(step) {
			let copy = history[step];
			if (!copy) {
				return;
			}
			historyAt = step;
			fitCanvas(copy.width, copy.height);
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.imageSmoothingEnabled = false;
			ctx.drawImage(copy, 0, 0);
			syncHistoryButtons();
			savePins();
		}
		function syncHistoryButtons() {
			let undo = el.querySelector('.pin-undo');
			let redo = el.querySelector('.pin-redo');
			if (undo) {
				undo.dataset.disabled = historyAt > 0 ? '0' : '1';
			}
			if (redo) {
				redo.dataset.disabled = historyAt < history.length - 1 ? '0' : '1';
			}
		}

		// a new note opens with a scribbled face on it, the drawing equivalent of placeholder text: it shows what the canvas is for and goes as soon as the note is touched. every part is jittered so no two are alike and none of them look machine-drawn.
		function drawSmiley() {
			let w = canvas.width, h = canvas.height;
			if (w < 40 || h < 40) {
				return;
			}
			let size = Math.min(w, h) * (0.4 + Math.random() * 0.2);
			// centred on the note; only the drawing itself varies
			let cx = w / 2;
			let cy = h / 2;
			let wobble = () => (Math.random() - 0.5) * size * 0.07;
			let trace = (points) => {
				for (let i = 1; i < points.length; i++) {
					paint(points[i - 1], points[i]);
				}
			};
			// the face, drawn as a slightly lopsided ring that doesn't quite close
			let ring = [];
			let start = Math.random() * Math.PI * 2;
			let sweep = Math.PI * 2 * (0.93 + Math.random() * 0.1);
			let squash = 0.88 + Math.random() * 0.24;
			for (let i = 0; i <= 40; i++) {
				let a = start + sweep * (i / 40);
				ring.push({
					x: cx + Math.cos(a) * size / 2 + wobble(),
					y: cy + Math.sin(a) * (size / 2) * squash + wobble()
				});
			}
			trace(ring);
			// eyes, sometimes dots and sometimes little dashes
			let eyeX = size * (0.16 + Math.random() * 0.05);
			let eyeY = size * (0.1 + Math.random() * 0.06);
			let dashes = Math.random() < 0.5;
			for (let side of [-1, 1]) {
				let ex = cx + side * eyeX + wobble();
				let ey = cy - eyeY + wobble();
				if (dashes) {
					trace([{ x: ex, y: ey - size * 0.06 }, { x: ex + wobble(), y: ey + size * 0.06 }]);
				} else {
					paint({ x: ex, y: ey }, { x: ex + wobble() * 0.4, y: ey + wobble() * 0.4 });
				}
			}
			// the mouth, a curve whose depth varies from a smirk to a grin
			let grin = 0.45 + Math.random() * 0.95;
			let width = size * (0.42 + Math.random() * 0.18);
			let mouth = [];
			for (let i = 0; i <= 18; i++) {
				let t = i / 18;
				mouth.push({
					x: cx + (t - 0.5) * width + wobble(),
					y: cy + size * 0.12 + Math.sin(t * Math.PI) * size * 0.17 * grin + wobble()
				});
			}
			trace(mouth);
		}
		// wipe the placeholder the first time the note is used for anything
		function clearPlaceholder() {
			if (el.dataset.placeholder != '1') {
				return;
			}
			delete el.dataset.placeholder;
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			history = [];
			historyAt = -1;
			pushHistory();
		}

		function exportDrawing() {
			try {
				if (el.dataset.placeholder == '1') {
					return '';
				}
				// a blank canvas isn't worth storing
				return canvasHasInk() ? canvas.toDataURL() : '';
			} catch (err) {
				return '';
			}
		}
		function canvasHasInk() {
			if (!canvas.width || !canvas.height) {
				return false;
			}
			let d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
			for (let i = 3; i < d.length; i += 4) {
				if (d[i] !== 0) {
					return true;
				}
			}
			return false;
		}

		// the canvas is a plain pixel grid at 1:1 with the note, so a drawing is never stretched. it only ever grows: making the note smaller hides the outer part of a drawing behind the sheet's clip rather than cutting it off, so widening the note again brings it back.
		function fitCanvas(width, height) {
			let w = Math.max(canvas.width, Math.max(1, Math.ceil(width)));
			let h = Math.max(canvas.height, Math.max(1, Math.ceil(height)));
			if (w == canvas.width && h == canvas.height) {
				return;
			}
			let previous = document.createElement('canvas');
			previous.width = canvas.width || 1;
			previous.height = canvas.height || 1;
			if (canvas.width && canvas.height) {
				previous.getContext('2d').drawImage(canvas, 0, 0);
			}
			canvas.width = w;
			canvas.height = h;
			canvas.style.width = `${w}px`;
			canvas.style.height = `${h}px`;
			ctx.imageSmoothingEnabled = false;
			ctx.drawImage(previous, 0, 0);
		}

		// keep the sheet as tall as the text needs, and the canvas covering it
		function fitSheet() {
			textEl.style.fontSize = `${el.dataset.fontSize}px`;
			textEl.style.height = 'auto';
			let needed = Math.max(scroll.clientHeight, textEl.scrollHeight);
			textEl.style.height = `${needed}px`;
			sheet.style.height = `${needed}px`;
			fitCanvas(sheet.clientWidth, needed);
		}
		function stepFontSize(delta) {
			let size = Math.max(10, Math.min(60, (parseFloat(el.dataset.fontSize) || 20) + delta));
			if (size == parseFloat(el.dataset.fontSize)) {
				return;
			}
			el.dataset.fontSize = size;
			fitSheet();
		}
		// press and hold to keep going. the size is saved once the button is let go rather than on every step, since saving re-encodes the drawing.
		function holdToRepeat(button, action) {
			let delay = null, repeat = null;
			function stop() {
				if (delay || repeat) {
					clearTimeout(delay);
					clearInterval(repeat);
					delay = null;
					repeat = null;
					savePins();
				}
			}
			button.addEventListener('pointerdown', (e) => {
				e.preventDefault();
				action();
				delay = setTimeout(() => {
					repeat = setInterval(action, 90);
				}, 350);
			});
			for (let event of ['pointerup', 'pointerleave', 'pointercancel']) {
				button.addEventListener(event, stop);
			}
			window.addEventListener('blur', stop);
		}

		function syncTools() {
			for (let button of el.querySelectorAll('.pin-tool')) {
				button.dataset.active = button.dataset.tool == el.dataset.tool ? '1' : '0';
			}
		}

		// --- drawing ------------------------------------------------------- Canvas pixels line up 1:1 with CSS pixels inside the sheet, so a pointer position maps straight across
		function pointOn(e) {
			let box = canvas.getBoundingClientRect();
			return { x: e.clientX - box.left, y: e.clientY - box.top };
		}
		function paint(from, to) {
			ctx.imageSmoothingEnabled = false;
			ctx.globalCompositeOperation = el.dataset.tool == 'erase' ? 'destination-out' : 'source-over';
			ctx.fillStyle = INK;
			// square stamps along the segment keep the pixel look that a round-capped stroke would soften
			let size = el.dataset.tool == 'erase' ? ERASER : BRUSH;
			let steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / (size / 2)));
			for (let i = 0; i <= steps; i++) {
				let x = from.x + (to.x - from.x) * (i / steps);
				let y = from.y + (to.y - from.y) * (i / steps);
				ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
			}
			ctx.globalCompositeOperation = 'source-over';
		}
		// a note used to be draggable by its padding, which meant the grab area vanished when the padding was styled away. this reserves a border of its own instead, so the note stays movable whatever the padding is set to — the writing surface simply starts just inside.
		let DRAG_EDGE = 14;
		function nearEdge(e) {
			let box = el.getBoundingClientRect();
			return e.clientX - box.left <= DRAG_EDGE
				|| box.right - e.clientX <= DRAG_EDGE
				|| e.clientY - box.top <= DRAG_EDGE
				|| box.bottom - e.clientY <= DRAG_EDGE;
		}

		let last = null;
		canvas.addEventListener('pointerdown', (e) => {
			// locked is enforced in CSS too, but stated here as well so the rule doesn't rest on styling alone
			if (el.dataset.tool == 'text' || el.dataset.locked == '1') {
				return;
			}
			// let the drag handler below have presses along the border
			if (nearEdge(e)) {
				return;
			}
			e.stopPropagation();
			e.preventDefault();
			window.widgetToFront(el);
			last = pointOn(e);
			paint(last, last);
			try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
		});
		canvas.addEventListener('pointermove', (e) => {
			if (!last) {
				return;
			}
			let next = pointOn(e);
			paint(last, next);
			last = next;
		});
		function endStroke(e) {
			if (!last) {
				return;
			}
			last = null;
			try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
			pushHistory();
			savePins();
		}
		canvas.addEventListener('pointerup', endStroke);
		canvas.addEventListener('pointercancel', endStroke);

		// --- controls ------------------------------------------------------
		for (let button of el.querySelectorAll('.pin-tool')) {
			button.addEventListener('click', () => {
				el.dataset.tool = button.dataset.tool;
				syncTools();
				if (el.dataset.tool == 'text') {
					textEl.focus();
				} else {
					textEl.blur();
				}
				savePins();
			});
		}
		el.querySelector('.pin-clear').addEventListener('click', () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			pushHistory();
			savePins();
		});
		el.querySelector('.pin-undo').addEventListener('click', () => restoreHistory(historyAt - 1));
		el.querySelector('.pin-redo').addEventListener('click', () => restoreHistory(historyAt + 1));
		// undo/redo from the keyboard, aimed at whichever pin was last used. typing in the note is left to the browser's own text undo.
		el.undoDrawing = () => restoreHistory(historyAt - 1);
		el.redoDrawing = () => restoreHistory(historyAt + 1);
		holdToRepeat(el.querySelector('.pin-smaller'), () => stepFontSize(-10));
		holdToRepeat(el.querySelector('.pin-bigger'), () => stepFontSize(10));
		el.querySelector('.pin-color').addEventListener('click', () => {
			let index = parseInt(el.dataset.colorIndex);
			index++;
			if (index >= colors.length) {
				index = 0;
			}
			el.dataset.colorIndex = index;
			el.style.setProperty('--primary', `var(--${colors[index]})`);
			savePins();
		});
		el.querySelector('.pin-duplicate').addEventListener('click', () => {
			createPin({
				text: textEl.value,
				drawing: exportDrawing(),
				tool: el.dataset.tool,
				fontSize: el.dataset.fontSize,
				colorIndex: parseInt(el.dataset.colorIndex) || 0,
				width: el.style.width,
				height: el.style.getPropertyValue('--pin-body')
			});
			savePins();
		});
		el.querySelector('.pin-minimize').addEventListener('click', () => {
			el.dataset.minimized = '1';
			// shrinking to a small square can leave a widget that was hanging off an edge with nothing left on screen at all
			window.keepWidgetOnScreen(el);
			savePins();
		});
		el.querySelector('.pin-lock').addEventListener('click', () => {
			el.dataset.locked = '1';
			savePins();
		});
		window.widgetLock(el, savePins);
		window.widgetMinimize(el, '📌', () => { fitSheet(); savePins(); });
		el.querySelector('.pin-cancel').addEventListener('click', (e) => {
			if (e.altKey) {
				closeAllPins();
				return;
			}
			el.remove();
			pinList = pinList.filter(p => p.el != el);
			savePins();
		});

		// save the note as it looks: background, then the text, then the drawing over the top — the whole sheet, not just the visible part
		el.querySelector('.pin-save').addEventListener('click', () => {
			let scale = 2;
			let out = document.createElement('canvas');
			out.width = sheet.clientWidth * scale;
			out.height = sheet.clientHeight * scale;
			let octx = out.getContext('2d');
			octx.scale(scale, scale);
			octx.imageSmoothingEnabled = false;

			let style = getComputedStyle(textEl);
			octx.fillStyle = getComputedStyle(el).backgroundColor;
			octx.fillRect(0, 0, sheet.clientWidth, sheet.clientHeight);

			octx.fillStyle = style.color;
			octx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
			// baseline-positioned, matching how CSS lays the text out
			octx.textBaseline = 'alphabetic';
			let padLeft = parseFloat(style.paddingLeft) || 0;
			let padTop = parseFloat(style.paddingTop) || 0;
			let fontSize = parseFloat(style.fontSize);
			let lineHeight = parseFloat(style.lineHeight) || (fontSize * 1.3);
			let maxWidth = sheet.clientWidth - padLeft * 2;
			// the baseline, not the top of the text. CSS puts it at half the line's spare leading plus the font's ascent below the content top; drawing at padTop alone hangs the glyphs above the padding and clips them against the top edge.
			let ascent = octx.measureText('M').fontBoundingBoxAscent || fontSize * 0.8;
			let y = padTop + (lineHeight - fontSize) / 2 + ascent;
			for (let paragraph of textEl.value.split('\n')) {
				// wrap the same way the box does, so the image matches
				let line = '';
				for (let word of paragraph.split(' ')) {
					let candidate = line ? `${line} ${word}` : word;
					if (octx.measureText(candidate).width > maxWidth && line) {
						octx.fillText(line, padLeft, y);
						y += lineHeight;
						line = word;
					} else {
						line = candidate;
					}
				}
				octx.fillText(line, padLeft, y);
				y += lineHeight;
			}
			// only the part of the drawing the note actually shows
			octx.drawImage(canvas, 0, 0, sheet.clientWidth, sheet.clientHeight,
			                       0, 0, sheet.clientWidth, sheet.clientHeight);

			let link = document.createElement('a');
			link.download = 'pin.png';
			link.href = out.toDataURL('image/png');
			link.click();
		});

		textEl.addEventListener('input', () => {
			fitSheet();
			savePins();
		});
		textEl.addEventListener('focus', () => {
			if (el.dataset.tool != 'text') {
				el.dataset.tool = 'text';
				syncTools();
			}
		});

		// drag the note by its border, or by any part of it that isn't the writing surface or a control
		el.addEventListener('pointerdown', (e) => {
			if (el.dataset.locked == '1') {
				return;
			}
			if (e.target.closest('button, .pin-resize')) {
				return;
			}
			if (!nearEdge(e) && e.target.closest('textarea, canvas')) {
				return;
			}
			// stop the press from putting a caret in the text underneath
			e.preventDefault();
			window.widgetToFront(el);
			delete el.dataset.grab;
			let sx = e.clientX, sy = e.clientY;
			let ox = parseFloat(el.style.left) || 0;
			let oy = parseFloat(el.style.top) || 0;
			try { el.setPointerCapture(e.pointerId); } catch (err) {}
			function onMove(ev) {
				el.style.left = `${ox + ev.clientX - sx}px`;
				el.style.top = `${oy + ev.clientY - sy}px`;
			}
			function onUp(ev) {
				el.removeEventListener('pointermove', onMove);
				el.removeEventListener('pointerup', onUp);
				try { el.releasePointerCapture(ev.pointerId); } catch (err) {}
				window.keepWidgetOnScreen(el);
				savePins();
			}
			el.addEventListener('pointermove', onMove);
			el.addEventListener('pointerup', onUp);
		});

		// the grab border has nothing to show for itself, so the cursor is what tells you it's there
		el.addEventListener('pointermove', (e) => {
			if (el.dataset.locked == '1' || e.target.closest('button, .pin-resize')) {
				delete el.dataset.grab;
				return;
			}
			if (nearEdge(e)) {
				el.dataset.grab = '1';
			} else {
				delete el.dataset.grab;
			}
		});
		el.addEventListener('pointerleave', () => {
			delete el.dataset.grab;
		});

		// resize the note itself; the drawing stretches with it
		let handle = el.querySelector('.pin-resize');
		handle.addEventListener('pointerdown', (e) => {
			e.stopPropagation();
			let sx = e.clientX, sy = e.clientY;
			let startW = el.offsetWidth, startH = scroll.offsetHeight;
			try { handle.setPointerCapture(e.pointerId); } catch (err) {}
			function onMove(ev) {
				el.style.width = `${Math.max(160, startW + (ev.clientX - sx))}px`;
				el.style.setProperty('--pin-body', `${Math.max(140, startH + (ev.clientY - sy))}px`);
				fitSheet();
			}
			function onUp(ev) {
				handle.removeEventListener('pointermove', onMove);
				handle.removeEventListener('pointerup', onUp);
				try { handle.releasePointerCapture(ev.pointerId); } catch (err) {}
				savePins();
			}
			handle.addEventListener('pointermove', onMove);
			handle.addEventListener('pointerup', onUp);
		});

		let entry = { el: el, fields: fields, exportDrawing: exportDrawing };
		pinList.push(entry);

		syncTools();
		fitSheet();

		// put a restored drawing back once the canvas is at its final size
		if (restore && restore.drawing) {
			let img = new Image();
			img.onload = () => {
				ctx.imageSmoothingEnabled = false;
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
				pushHistory();
			};
			img.src = restore.drawing;
		} else if (restore && restore.placeholder) {
			// the placeholder was still showing when this note was put away
			el.dataset.placeholder = '1';
			drawSmiley();
			pushHistory();
		} else if (restore) {
			pushHistory();
		} else {
			// nothing saved and nothing restored: this is a brand new note
			el.dataset.placeholder = '1';
			drawSmiley();
			pushHistory();
		}
		if (!restore) {
			savePins();
		}
		return el;
	}
	window.createPin = createPin;

	// undo/redo for the drawing, aimed at whichever pin was last touched. typing in a note is left alone — the browser's own text undo handles that, and taking it over would be worse than not offering it.
	let lastUsedPin = null;
	document.addEventListener('pointerdown', (e) => {
		let pin = e.target.closest ? e.target.closest('.pin') : null;
		if (pin) {
			lastUsedPin = pin;
		}
	}, true);
	document.addEventListener('keydown', (e) => {
		if (e.key.toLowerCase() != 'z' || !(e.metaKey || e.ctrlKey)) {
			return;
		}
		if (!lastUsedPin || !lastUsedPin.isConnected || lastUsedPin.dataset.locked == '1') {
			return;
		}
		if (document.activeElement && document.activeElement.closest('.pin-text')) {
			return;
		}
		e.preventDefault();
		if (e.shiftKey) {
			lastUsedPin.redoDrawing();
		} else {
			lastUsedPin.undoDrawing();
		}
	});

	loadPins();
	window.addEventListener('beforeunload', savePins);
}
initPins();
