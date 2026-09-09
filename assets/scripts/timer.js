// timers: draggable countdown / count-up widgets that float above every page. persisted via localStorage. window.createTimer() spawns a new one. (`colors` is provided globally by brand.js, and the shared widget plumbing by widget.js)

function initTimers() {
	let container = window.widgetLayer();

	// remove every open timer at once
	function closeAllTimers() {
		for (let t of timerList.slice()) {
			if (t.state.raf) {
				cancelAnimationFrame(t.state.raf);
			}
			stopAlarm(t);
			t.el.remove();
		}
		timerList = [];
		saveTimers();
	}

	// the alarm that sounds while a countdown sits at zero. it loops until the timer is acknowledged, so one going off in another tab or behind a window still gets noticed. each timer owns its element rather than sharing one, so two finishing together both keep sounding.
	const ALARM_SOUND = '/assets/sounds/timer.mp3';
	function startAlarm(timer) {
		if (!timer.alarm) {
			timer.alarm = new Audio(ALARM_SOUND);
			timer.alarm.loop = true;
			timer.alarm.preload = 'auto';
		}
		try {
			timer.alarm.currentTime = 0;
			let played = timer.alarm.play();
			// a restored timer starts its alarm before the page has been clicked, which autoplay blocks; the shake carries the alert until then
			if (played && played.catch) {
				played.catch(() => {});
			}
		} catch (err) {}
	}
	function stopAlarm(timer) {
		if (!timer.alarm) {
			return;
		}
		try {
			timer.alarm.pause();
			timer.alarm.currentTime = 0;
		} catch (err) {}
	}

	let pad = (n) => String(n).padStart(2, '0');
	function clampInt(v, min, max) {
		v = parseInt(v);
		if (isNaN(v)) {
			v = 0;
		}
		return Math.max(min, Math.min(max, v));
	}

	// persist active timers across pages via localStorage
	let TIMERS_KEY = 'classroom-timers';
	let timerList = [];
	let restoringTimers = false;
	function saveTimers() {
		if (restoringTimers) {
			return;
		}
		try {
			let data = timerList.map(t => ({
				countUp: t.state.countUp,
				paused: t.state.paused,
				value: t.state.value,
				initial: t.state.initial,
				done: t.el.dataset.done == '1',
				colorIndex: parseInt(t.el.dataset.colorIndex) || 0,
				minimized: t.el.dataset.minimized == '1',
				locked: t.el.dataset.locked == '1',
				z: parseInt(t.el.style.zIndex) || 0,
				left: t.el.style.left,
				top: t.el.style.top,
				fontSize: t.el.style.fontSize,
				savedAt: Date.now()
			}));
			localStorage.setItem(TIMERS_KEY, JSON.stringify(data));
		} catch (err) {}
	}
	function loadTimers() {
		try {
			let raw = localStorage.getItem(TIMERS_KEY);
			if (!raw) {
				return;
			}
			restoringTimers = true;
			for (let d of JSON.parse(raw)) {
				createTimer(d);
			}
			restoringTimers = false;
			saveTimers();
		} catch (err) {
			restoringTimers = false;
		}
	}

	function createTimer(restore) {
		let el = document.createElement('div');
		el.className = 'timer';
		let colorIndex = restore ? (restore.colorIndex || 0) : Math.floor(Math.random()*colors.length);
		el.style.setProperty("--primary", `var(--${colors[colorIndex]})`);
		el.dataset.colorIndex = colorIndex;
		el.dataset.paused = '1';
		el.dataset.running = '0';
		el.style.fontSize = restore && restore.fontSize ? restore.fontSize : '32px';
		el.innerHTML = `
			<div class="timer-display">
				<input class="timer-h" type="text" inputmode="numeric" maxlength="2" value="00" aria-label="Hours">
				<span class="timer-colon">:</span>
				<input class="timer-m" type="text" inputmode="numeric" maxlength="2" value="05" aria-label="Minutes">
				<span class="timer-colon">:</span>
				<input class="timer-s" type="text" inputmode="numeric" maxlength="2" value="00" aria-label="Seconds">
			</div>
			<div class="timer-buttons">
				<div class="timer-group">
					<button class="timer-up" aria-label="Count up">⏪</button>
					<button class="timer-toggle" aria-label="Play or pause">⏯️</button>
					<button class="timer-down" aria-label="Count down">⏩</button>
				</div>
				<div class="timer-group">
					<button class="timer-color" aria-label="Change color">🎨</button>
					<button class="timer-duplicate" aria-label="Duplicate timer">👯</button>
					<button class="timer-minimize" aria-label="Minimize">👁️</button>
					<button class="timer-lock" aria-label="Lock">🔒</button>
					<button class="timer-cancel" aria-label="Delete timer">❌</button>
				</div>
			</div>
			<div class="timer-resize" aria-hidden="true"></div>
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
		if (restore && restore.left) {
			// restore the saved position
			el.style.left = restore.left;
			el.style.top = restore.top;
		} else {
			// drop it near the middle, with a small random offset, kept fully on screen
			let w = el.offsetWidth, h = el.offsetHeight, gap = 12;
			let left = (window.innerWidth - w) / 2 + (Math.random() - 0.5) * window.innerWidth * 0.18;
			let top = (window.innerHeight - h) / 2 + (Math.random() - 0.5) * window.innerHeight * 0.18;
			el.style.left = `${Math.round(Math.max(gap, Math.min(window.innerWidth - w - gap, left)))}px`;
			el.style.top = `${Math.round(Math.max(gap, Math.min(window.innerHeight - h - gap, top)))}px`;
		}

		// hold the button row to the width the digits set, so a row that would otherwise be too wide wraps instead of stretching the whole timer
		let displayEl = el.querySelector('.timer-display');
		let buttonsEl = el.querySelector('.timer-buttons');
		function fitButtons() {
			// measured from the digits themselves, not from their box: the box stretches to whatever the timer ends up being, and the timer is sized by the row, so reading it back would just be circular
			let width = 0;
			for (let part of displayEl.children) {
				let cs = getComputedStyle(part);
				width += part.offsetWidth + (parseFloat(cs.marginLeft) || 0) + (parseFloat(cs.marginRight) || 0);
			}
			buttonsEl.style.maxWidth = `${Math.max(1, Math.round(width))}px`;
		}

		let hIn = el.querySelector('.timer-h');
		let mIn = el.querySelector('.timer-m');
		let sIn = el.querySelector('.timer-s');
		let inputs = [hIn, mIn, sIn];
		let state = { value: 300, initial: 300, countUp: false, paused: true, raf: null, lastTs: null };
		let timer = { el: el, state: state, alarm: null };
		timerList.push(timer);

		// the done state is both a look (the shake) and a sound (the looping alarm), so the two are always set and cleared together
		function setDone(on) {
			if (on) {
				el.dataset.done = '1';
				startAlarm(timer);
			} else {
				delete el.dataset.done;
				stopAlarm(timer);
			}
		}

		function editing() {
			return inputs.indexOf(document.activeElement) != -1;
		}
		function render() {
			if (editing()) {
				return; // don't overwrite what the user is typing
			}
			let v = state.countUp ? Math.floor(state.value) : Math.ceil(state.value - 1e-6);
			if (v < 0) {
				v = 0;
			}
			hIn.value = pad(Math.floor(v / 3600));
			mIn.value = pad(Math.floor((v % 3600) / 60));
			sIn.value = pad(v % 60);
		}
		function readFields() {
			return clampInt(hIn.value, 0, 99) * 3600 + clampInt(mIn.value, 0, 59) * 60 + clampInt(sIn.value, 0, 59);
		}
		function stopTicking() {
			if (state.raf) {
				cancelAnimationFrame(state.raf);
				state.raf = null;
			}
		}
		function tick(ts) {
			if (state.paused) {
				return;
			}
			if (state.lastTs == null) {
				state.lastTs = ts;
			}
			let dt = (ts - state.lastTs) / 1000;
			state.lastTs = ts;
			if (state.countUp) {
				state.value += dt;
			} else {
				state.value -= dt;
				if (state.value <= 0) {
					state.value = 0;
					pause();
					setDone(true);
					// a timer that has run out is the thing you need to see, so it comes forward over whatever was covering it
					window.widgetToFront(el);
					render();
					saveTimers();
					return;
				}
			}
			render();
			state.raf = requestAnimationFrame(tick);
		}
		function startTicking() {
			setDone(false);
			state.paused = false;
			state.lastTs = null;
			el.dataset.paused = '0';
			el.dataset.running = '1';
			stopTicking();
			state.raf = requestAnimationFrame(tick);
			saveTimers();
		}
		function pause() {
			state.paused = true;
			stopTicking();
			el.dataset.paused = '1';
			el.dataset.running = '0';
			saveTimers();
		}

		// typing a new time updates the target immediately (pausing so the digits stay put while editing)
		for (let input of inputs) {
			input.addEventListener('focus', () => {
				pause();
				input.select();
			});
			input.addEventListener('input', () => {
				input.value = input.value.replace(/[^0-9]/g, '').slice(0, 2);
				state.value = readFields();
				state.initial = state.value;
				setDone(false);
				saveTimers();
			});
			input.addEventListener('blur', render);
		}

		el.querySelector('.timer-up').addEventListener('click', () => {
			inputs.forEach(i => i.blur());
			state.countUp = true;
			startTicking();
		});
		el.querySelector('.timer-down').addEventListener('click', () => {
			inputs.forEach(i => i.blur());
			state.countUp = false;
			if (state.value <= 0) {
				return;
			}
			startTicking();
		});
		el.querySelector('.timer-toggle').addEventListener('click', () => {
			inputs.forEach(i => i.blur());
			if (state.paused) {
				if (state.countUp || state.value > 0) {
					startTicking();
				}
			} else {
				pause();
			}
		});
		el.querySelector('.timer-color').addEventListener('click', () => {
			inputs.forEach(i => i.blur());
			let colorIndex = parseInt(el.dataset.colorIndex);
			colorIndex++;
			if (colorIndex >= colors.length) {
				colorIndex = 0;
			}
			el.dataset.colorIndex = colorIndex;
			el.style.setProperty('--primary', `var(--${colors[colorIndex]})`);
			saveTimers();
		});
		el.querySelector('.timer-minimize').addEventListener('click', () => {
			el.dataset.minimized = '1';
			// shrinking to a small square can leave a widget that was hanging off an edge with nothing left on screen at all
			window.keepWidgetOnScreen(el);
			saveTimers();
		});
		el.querySelector('.timer-lock').addEventListener('click', () => {
			el.dataset.locked = '1';
			saveTimers();
		});
		window.widgetLock(el, saveTimers);
		window.widgetMinimize(el, '⏰', saveTimers);
		el.querySelector('.timer-cancel').addEventListener('click', (e) => {
			if (e.altKey) {
				// alt/Option-click closes every open timer
				closeAllTimers();
				return;
			}
			stopTicking();
			// removing the element doesn't silence its alarm, which is its own audio object
			stopAlarm(timer);
			el.remove();
			timerList = timerList.filter(t => t.el != el);
			saveTimers();
		});

		// a finished timer shakes and sounds until it's acknowledged; a click anywhere on it settles it back down
		el.addEventListener('pointerdown', () => {
			if (el.dataset.done == '1') {
				setDone(false);
				saveTimers();
			}
		});

		// duplicate: a second timer holding the same time and color
		el.querySelector('.timer-duplicate').addEventListener('click', () => {
			createTimer({
				countUp: state.countUp,
				paused: true,
				value: state.value,
				initial: state.initial,
				done: false,
				colorIndex: parseInt(el.dataset.colorIndex) || 0,
				fontSize: el.style.fontSize,
				savedAt: Date.now()
			});
			saveTimers();
		});

		// drag the whole timer (ignore clicks on inputs, buttons, resize handle)
		el.addEventListener('pointerdown', (e) => {
			if (el.dataset.locked == '1') {
				return;
			}
			if (e.target.closest('input, button, .timer-resize')) {
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
				saveTimers();
			}
			el.addEventListener('pointermove', onMove);
			el.addEventListener('pointerup', onUp);
		});

		// resize by dragging the bottom-right corner (scales the whole widget)
		let handle = el.querySelector('.timer-resize');
		handle.addEventListener('pointerdown', (e) => {
			e.stopPropagation();
			let sx = e.clientX, sy = e.clientY;
			let startFs = parseFloat(el.style.fontSize) || 16;
			try { handle.setPointerCapture(e.pointerId); } catch (err) {}
			function onMove(ev) {
				let delta = ((ev.clientX - sx) + (ev.clientY - sy)) / 2;
				el.style.fontSize = `${Math.max(10, Math.min(64, startFs + delta * 0.12))}px`;
				fitButtons();
			}
			function onUp(ev) {
				handle.removeEventListener('pointermove', onMove);
				handle.removeEventListener('pointerup', onUp);
				try { handle.releasePointerCapture(ev.pointerId); } catch (err) {}
				saveTimers();
			}
			handle.addEventListener('pointermove', onMove);
			handle.addEventListener('pointerup', onUp);
		});

		if (restore) {
			// reapply the saved run state, advancing a running timer by the time that has passed since it was saved
			state.countUp = !!restore.countUp;
			state.initial = restore.initial || 0;
			let v = restore.value || 0;
			if (!restore.paused && !restore.done) {
				let elapsed = (Date.now() - (restore.savedAt || Date.now())) / 1000;
				v = state.countUp ? v + elapsed : Math.max(0, v - elapsed);
			}
			state.value = v;
			if (restore.done || (!state.countUp && v <= 0)) {
				// a timer that ran out on the previous page is still waiting to be acknowledged, so it picks the alarm back up where it left off
				setDone(true);
				render();
			} else if (restore.paused) {
				render();
			} else {
				startTicking();
			}
		} else {
			saveTimers();
		}
		render();
		fitButtons();
		// the web font can land after this runs and change the digits' width
		window.addEventListener('load', fitButtons);
		if (document.fonts && document.fonts.ready) {
			document.fonts.ready.then(fitButtons);
		}
		return el;
	}
	window.createTimer = createTimer;
	loadTimers();
	window.addEventListener('beforeunload', saveTimers);
}
initTimers();
