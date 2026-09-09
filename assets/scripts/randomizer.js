// randomizers: draggable dice widgets that float above every page, in the same family as the timers. persisted via localStorage. window.createRandomizer() spawns a new one. (`colors` is provided globally by brand.js, and the shared widget plumbing by widget.js)
// one widget covers both jobs it needs to do in class, chosen by the two tabs at the top rather than by two separate tools
// 🔢 draw numbers — a range, how many to draw, decimals on or off, and whether the same number may come up twice
// 📝 shuffle a list — paste one item per line; rolling reorders the lines where they sit, so there's one panel rather than an input and an output
// in number mode the big display is itself the roll button, so the common case (roll again) is one click anywhere on the result

function initRandomizers() {
	let container = window.widgetLayer();

	let randomizerList = [];

	// remove every open randomizer at once (alt/option-click on ❌)
	function closeAllRandomizers() {
		for (let r of randomizerList.slice()) {
			r.el.remove();
		}
		randomizerList = [];
		saveRandomizers();
	}

	function clampNum(v, min, max, fallback) {
		v = parseFloat(v);
		if (isNaN(v)) {
			v = fallback;
		}
		return Math.max(min, Math.min(max, v));
	}

	// fisher-Yates, used for shuffling a list and for drawing numbers when repeats aren't allowed
	function shuffle(items) {
		let out = items.slice();
		for (let i = out.length - 1; i > 0; i--) {
			let j = Math.floor(Math.random() * (i + 1));
			let swap = out[i];
			out[i] = out[j];
			out[j] = swap;
		}
		return out;
	}

	// persist open randomizers across pages via localStorage
	let RANDOMIZERS_KEY = 'classroom-randomizers';
	let restoringRandomizers = false;
	function saveRandomizers() {
		if (restoringRandomizers) {
			return;
		}
		try {
			let data = randomizerList.map(r => ({
				mode: r.el.dataset.mode,
				min: r.fields.min.value,
				max: r.fields.max.value,
				count: r.fields.count.value,
				decimals: r.el.dataset.decimals == '1',
				repeats: r.el.dataset.repeats == '1',
				list: r.fields.list.value,
				result: r.state.result,
				colorIndex: parseInt(r.el.dataset.colorIndex) || 0,
				minimized: r.el.dataset.minimized == '1',
				locked: r.el.dataset.locked == '1',
				z: parseInt(r.el.style.zIndex) || 0,
				left: r.el.style.left,
				top: r.el.style.top,
				fontSize: r.el.style.fontSize
			}));
			localStorage.setItem(RANDOMIZERS_KEY, JSON.stringify(data));
		} catch (err) {}
	}
	function loadRandomizers() {
		try {
			let raw = localStorage.getItem(RANDOMIZERS_KEY);
			if (!raw) {
				return;
			}
			restoringRandomizers = true;
			for (let d of JSON.parse(raw)) {
				createRandomizer(d);
			}
			restoringRandomizers = false;
			saveRandomizers();
		} catch (err) {
			restoringRandomizers = false;
		}
	}

	function createRandomizer(restore) {
		let el = document.createElement('div');
		el.className = 'randomizer';
		let colorIndex = restore ? (restore.colorIndex || 0) : Math.floor(Math.random() * colors.length);
		el.style.setProperty('--primary', `var(--${colors[colorIndex]})`);
		el.dataset.colorIndex = colorIndex;
		el.dataset.mode = restore && restore.mode == 'list' ? 'list' : 'numbers';
		el.dataset.decimals = restore && restore.decimals ? '1' : '0';
		el.dataset.repeats = restore ? (restore.repeats ? '1' : '0') : '1';
		el.style.fontSize = restore && restore.fontSize ? restore.fontSize : '20px';
		el.innerHTML = `
			<div class="randomizer-tabs">
				<button class="randomizer-tab" data-tab="numbers" aria-label="Random numbers">🔢</button>
				<button class="randomizer-tab" data-tab="list" aria-label="Shuffle a list">📝</button>
			</div>
			<button class="randomizer-result" aria-label="Roll"></button>
			<div class="randomizer-fields" data-fields="numbers">
				<div class="randomizer-row">
					<label class="randomizer-field"><span>min</span><input class="randomizer-min" type="text" inputmode="decimal" value="1"></label>
					<label class="randomizer-field"><span>max</span><input class="randomizer-max" type="text" inputmode="decimal" value="10"></label>
					<label class="randomizer-field"><span>draw</span><input class="randomizer-count" type="text" inputmode="numeric" value="1"></label>
				</div>
				<div class="randomizer-row">
					<button class="randomizer-toggle" data-toggle="decimals">decimals</button>
					<button class="randomizer-toggle" data-toggle="repeats">repeats</button>
				</div>
			</div>
			<div class="randomizer-fields" data-fields="list">
				<div class="randomizer-lines">
					<div class="randomizer-linenumbers" aria-hidden="true"></div>
					<textarea class="randomizer-list" rows="4" placeholder="type stuff and press the dice button to shuffle line order" aria-label="List to shuffle" spellcheck="false"></textarea>
				</div>
			</div>
			<div class="randomizer-buttons">
				<button class="randomizer-roll" aria-label="Roll">🎲</button>
				<button class="randomizer-color" aria-label="Change color">🎨</button>
				<button class="randomizer-duplicate" aria-label="Duplicate randomizer">👯</button>
				<button class="randomizer-minimize" aria-label="Minimize">👁️</button>
				<button class="randomizer-lock" aria-label="Lock">🔒</button>
				<button class="randomizer-cancel" aria-label="Close randomizer">❌</button>
			</div>
			<div class="randomizer-resize" aria-hidden="true"></div>
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

		let fields = {
			min: el.querySelector('.randomizer-min'),
			max: el.querySelector('.randomizer-max'),
			count: el.querySelector('.randomizer-count'),
			list: el.querySelector('.randomizer-list')
		};
		let numbersEl = el.querySelector('.randomizer-linenumbers');
		// a gutter counting the lines in the box. kept in step with the text and scrolled with it, since a textarea can't carry markup of its own.
		function syncLineNumbers() {
			let count = Math.max(1, fields.list.value.split('\n').length);
			if (numbersEl.childElementCount != count) {
				let html = '';
				for (let n = 1; n <= count; n++) {
					html += `<span>${n}</span>`;
				}
				numbersEl.innerHTML = html;
			}
			numbersEl.scrollTop = fields.list.scrollTop;
		}
		fields.list.addEventListener('input', syncLineNumbers);
		fields.list.addEventListener('scroll', syncLineNumbers);

		let resultEl = el.querySelector('.randomizer-result');
		let state = { result: null };
		randomizerList.push({ el: el, fields: fields, state: state });

		if (restore) {
			if (restore.min != null) fields.min.value = restore.min;
			if (restore.max != null) fields.max.value = restore.max;
			if (restore.count != null) fields.count.value = restore.count;
			if (restore.list != null) fields.list.value = restore.list;
		}
		syncLineNumbers();

		if (restore && restore.left) {
			el.style.left = restore.left;
			el.style.top = restore.top;
		} else {
			// drop it near the middle with a small random offset, kept on screen
			let w = el.offsetWidth, h = el.offsetHeight, gap = 12;
			let left = (window.innerWidth - w) / 2 + (Math.random() - 0.5) * window.innerWidth * 0.18;
			let top = (window.innerHeight - h) / 2 + (Math.random() - 0.5) * window.innerHeight * 0.18;
			el.style.left = `${Math.round(Math.max(gap, Math.min(window.innerWidth - w - gap, left)))}px`;
			el.style.top = `${Math.round(Math.max(gap, Math.min(window.innerHeight - h - gap, top)))}px`;
		}

		// the list box grows with what's in it so more lines stay visible, down to a few lines and up to a point where it starts scrolling
		function autosizeList() {
			let box = fields.list;
			box.style.height = 'auto';
			let line = parseFloat(getComputedStyle(box).lineHeight) || 16;
			let chrome = box.offsetHeight - box.clientHeight;
			let min = line * 4 + chrome;
			let max = line * 14 + chrome;
			box.style.height = `${Math.max(min, Math.min(max, box.scrollHeight + chrome))}px`;
		}

		function syncTabs() {
			for (let tab of el.querySelectorAll('.randomizer-tab')) {
				tab.dataset.active = tab.dataset.tab == el.dataset.mode ? '1' : '0';
			}
			for (let toggle of el.querySelectorAll('.randomizer-toggle')) {
				toggle.dataset.active = el.dataset[toggle.dataset.toggle] == '1' ? '1' : '0';
			}
		}

		// show a result (or the prompt, before anything has been rolled)
		function render() {
			let result = state.result;
			if (!result || !result.values.length) {
				resultEl.dataset.empty = '1';
				resultEl.textContent = result && result.empty ? result.empty : 'roll';
				return;
			}
			delete resultEl.dataset.empty;
			resultEl.dataset.solo = result.values.length == 1 ? '1' : '0';
			// a shuffled list reads down the page; drawn numbers flow across
			resultEl.dataset.ordered = result.ordered ? '1' : '0';
			resultEl.innerHTML = '';
			for (let i = 0; i < result.values.length; i++) {
				let item = document.createElement('span');
				item.className = 'randomizer-value';
				if (result.ordered && result.values.length > 1) {
					let n = document.createElement('b');
					n.textContent = (i + 1);
					item.appendChild(n);
				}
				item.appendChild(document.createTextNode(result.values[i]));
				resultEl.appendChild(item);
			}
		}

		// draw numbers from the range
		function rollNumbers() {
			let decimals = el.dataset.decimals == '1';
			let repeats = el.dataset.repeats == '1';
			let min = clampNum(fields.min.value, -1e9, 1e9, 1);
			let max = clampNum(fields.max.value, -1e9, 1e9, 10);
			if (min > max) {
				let swap = min;
				min = max;
				max = swap;
			}
			let count = Math.round(clampNum(fields.count.value, 1, 500, 1));

			if (decimals) {
				let values = [];
				for (let i = 0; i < count; i++) {
					values.push((min + Math.random() * (max - min)).toFixed(2));
				}
				return { values: values, ordered: false };
			}

			// whole numbers: the range is a fixed pool, so drawing without repeats is a shuffle of that pool rather than repeated guessing
			let low = Math.ceil(min);
			let high = Math.floor(max);
			if (high < low) {
				return { values: [], empty: 'no whole numbers in that range' };
			}
			let size = high - low + 1;
			if (!repeats) {
				// can't draw more distinct numbers than the range holds
				let take = Math.min(count, size);
				let pool = [];
				for (let n = low; n <= high; n++) {
					pool.push(n);
				}
				return { values: shuffle(pool).slice(0, take).map(String), ordered: false };
			}
			let values = [];
			for (let i = 0; i < count; i++) {
				values.push(String(low + Math.floor(Math.random() * size)));
			}
			return { values: values, ordered: false };
		}

		// shuffle the lines of the list, writing them back where they were
		function rollList() {
			let items = fields.list.value.split('\n').map(line => line.trim()).filter(line => line != '');
			if (!items.length) {
				return;
			}
			fields.list.value = shuffle(items).join('\n');
			syncLineNumbers();
			autosizeList();
		}

		function roll() {
			if (el.dataset.mode == 'list') {
				rollList();
			} else {
				state.result = rollNumbers();
				render();
			}
			// a shake and a flash, so a re-roll landing on the same value still reads as having happened (matches the shake animation's length)
			el.dataset.rolled = '1';
			setTimeout(() => { delete el.dataset.rolled; }, 400);
			saveRandomizers();
		}

		for (let tab of el.querySelectorAll('.randomizer-tab')) {
			tab.addEventListener('click', () => {
				// each mode keeps its own settings and contents, so switching back and forth doesn't cost you what you had set up
				el.dataset.mode = tab.dataset.tab;
				syncTabs();
				if (el.dataset.mode == 'list') {
					autosizeList();
				}
				saveRandomizers();
			});
		}
		for (let toggle of el.querySelectorAll('.randomizer-toggle')) {
			toggle.addEventListener('click', () => {
				let key = toggle.dataset.toggle;
				el.dataset[key] = el.dataset[key] == '1' ? '0' : '1';
				syncTabs();
				saveRandomizers();
			});
		}
		for (let input of [fields.min, fields.max, fields.count]) {
			input.addEventListener('focus', () => input.select());
			input.addEventListener('input', saveRandomizers);
		}
		fields.list.addEventListener('input', () => {
			autosizeList();
			saveRandomizers();
		});

		resultEl.addEventListener('click', roll);
		el.querySelector('.randomizer-roll').addEventListener('click', roll);
		el.querySelector('.randomizer-color').addEventListener('click', () => {
			let colorIndex = parseInt(el.dataset.colorIndex);
			colorIndex++;
			if (colorIndex >= colors.length) {
				colorIndex = 0;
			}
			el.dataset.colorIndex = colorIndex;
			el.style.setProperty('--primary', `var(--${colors[colorIndex]})`);
			saveRandomizers();
		});
		el.querySelector('.randomizer-duplicate').addEventListener('click', () => {
			createRandomizer({
				mode: el.dataset.mode,
				min: fields.min.value,
				max: fields.max.value,
				count: fields.count.value,
				decimals: el.dataset.decimals == '1',
				repeats: el.dataset.repeats == '1',
				list: fields.list.value,
				result: state.result,
				colorIndex: parseInt(el.dataset.colorIndex) || 0,
				fontSize: el.style.fontSize
			});
			saveRandomizers();
		});
		el.querySelector('.randomizer-minimize').addEventListener('click', () => {
			el.dataset.minimized = '1';
			// shrinking to a small square can leave a widget that was hanging off an edge with nothing left on screen at all
			window.keepWidgetOnScreen(el);
			saveRandomizers();
		});
		el.querySelector('.randomizer-lock').addEventListener('click', () => {
			el.dataset.locked = '1';
			saveRandomizers();
		});
		window.widgetLock(el, saveRandomizers);
		window.widgetMinimize(el, '🎲', saveRandomizers);
		el.querySelector('.randomizer-cancel').addEventListener('click', (e) => {
			if (e.altKey) {
				// alt/Option-click closes every open randomizer
				closeAllRandomizers();
				return;
			}
			el.remove();
			randomizerList = randomizerList.filter(r => r.el != el);
			saveRandomizers();
		});

		// drag the whole widget (ignore the controls and the resize handle)
		el.addEventListener('pointerdown', (e) => {
			if (el.dataset.locked == '1') {
				return;
			}
			if (e.target.closest('input, textarea, button, .randomizer-resize')) {
				return;
			}
			window.widgetToFront(el);
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
				saveRandomizers();
			}
			el.addEventListener('pointermove', onMove);
			el.addEventListener('pointerup', onUp);
		});

		// resize by dragging the bottom-right corner (scales the whole widget)
		let handle = el.querySelector('.randomizer-resize');
		handle.addEventListener('pointerdown', (e) => {
			e.stopPropagation();
			let sx = e.clientX, sy = e.clientY;
			let startFs = parseFloat(el.style.fontSize) || 20;
			try { handle.setPointerCapture(e.pointerId); } catch (err) {}
			function onMove(ev) {
				let delta = ((ev.clientX - sx) + (ev.clientY - sy)) / 2;
				el.style.fontSize = `${Math.max(12, Math.min(48, startFs + delta * 0.12))}px`;
				autosizeList();
			}
			function onUp(ev) {
				handle.removeEventListener('pointermove', onMove);
				handle.removeEventListener('pointerup', onUp);
				try { handle.releasePointerCapture(ev.pointerId); } catch (err) {}
				saveRandomizers();
			}
			handle.addEventListener('pointermove', onMove);
			handle.addEventListener('pointerup', onUp);
		});

		if (restore && restore.result) {
			state.result = restore.result;
		}
		syncTabs();
		if (restore) {
			render();
		} else {
			// open with a number already drawn rather than an empty prompt
			roll();
		}
		autosizeList();
		return el;
	}
	window.createRandomizer = createRandomizer;
	loadRandomizers();
	window.addEventListener('beforeunload', saveRandomizers);
}
initRandomizers();
