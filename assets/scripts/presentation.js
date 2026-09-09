// presentation mode + the drawing/whiteboard overlay it hosts. uses window.createTimer (timer.js) and window.openSoundboard (soundboard.js); exposes window.openPresentation and window.enterDraw.

// presentation mode (markdown resources only): splits the document into slides at each [slide] marker, then shows them fullscreen one at a time with arrow keys, arrow buttons, and a close button. slide content is centered vertically and scrolls if tall.
function initPresentation() {
	// the overlay (and its drawing tools) is built for every resource page so drawing/annotating works anywhere; slides are only built when there's markdown content to present
	let markdown = document.querySelector('.resource-preview-markdown');

	// emoji that fly around a slide. one per palette color, so a slideful of them reads as the same rainbow as everything else on the site. declared up here because buildSlides runs long before the physics further down -- a const declared beside that code would still be in its dead zone.
	const DRIFT_COLORS = ['pink', 'green', 'blue', 'yellow', 'purple', 'red'];
	function addDrifters(slide, chars) {
		slide.classList.add('presentation-slide-drift');
		chars.forEach((char, i) => {
			let drifter = document.createElement('div');
			drifter.className = 'presentation-slide-drifter';
			drifter.style.setProperty('--primary', `var(--${DRIFT_COLORS[i % DRIFT_COLORS.length]})`);
			drifter.textContent = char;
			slide.appendChild(drifter);
		});
	}

	// a background band can hold its own [slide] markers. reading straight down the page it stays one continuous section (the markers are hidden), but for slides it's split into one band per segment, so every slide keeps the band's background instead of the break being ignored. returns null if this band has no breaks in it.
	function splitBand(band) {
		let inner = band.querySelector('.resource-preview-markdown-band-inner');
		if (!inner || !inner.querySelector('.resource-preview-markdown-slide-break')) {
			return null;
		}
		let pieces = [];
		function startPiece() {
			// clone the band and its inner wrapper without their contents, so each piece keeps the background color and layout
			let bandCopy = band.cloneNode(false);
			let innerCopy = inner.cloneNode(false);
			bandCopy.appendChild(innerCopy);
			pieces.push(bandCopy);
			return innerCopy;
		}
		let target = startPiece();
		for (let child of inner.children) {
			if (child.classList && child.classList.contains('resource-preview-markdown-slide-break')) {
				target = startPiece();
				continue;
			}
			target.appendChild(child.cloneNode(true));
		}
		return pieces;
	}

	// speaker notes, one entry per slide, filled in by buildSlides below and read by the presenter window
	let slideNotes = [];

	// group the markdown content into slides, starting a new slide at each [slide] marker
	function buildSlides() {
		let slides = [];
		let content = null;
		let currentSlide = null;
		// track the most recent primary color so each slide adopts the one active where it begins
		let currentPrimary = '';
		function newSlide() {
			let slide = document.createElement('div');
			slide.className = 'presentation-slide';
			content = document.createElement('div');
			content.className = 'resource-preview-markdown';
			slide.appendChild(content);
			currentSlide = slide;
			if (currentPrimary) {
				slide.style.setProperty('--primary', currentPrimary);
			}
			slides.push(slide);
		}
		newSlide();
		// the resource title always gets a slide to itself, whether or not the markdown puts a break after it: an opening slide that reads like the course intro page. the break is forced here rather than left to the author so every deck opens the same way.
		let titleSlide = null;
		for (let node of markdown.children) {
			if (node.classList && node.classList.contains('resource-preview-markdown-slide-break')) {
				newSlide();
				continue;
			}
			if (!titleSlide && node.tagName == 'H1' && content.children.length == 0) {
				let title = node.cloneNode(true);
				content.appendChild(title);
				titleSlide = currentSlide;
				currentSlide.classList.add('presentation-slide-title');
				// the emoji leaves the heading entirely and becomes a loose element on the slide, so it can be moved around freely without dragging the title's layout with it
				let emoji = title.querySelector('.resource-preview-markdown-heading-emoji');
				if (emoji) {
					emoji.remove();
					addDrifters(currentSlide, DRIFT_COLORS.map(() => emoji.textContent));
				}
				// beats any [primary] the markdown set before the heading, which would otherwise land as an inline style and win
				currentSlide.style.setProperty('--primary', 'var(--off-white)');
				newSlide();
				continue;
			}
			// update the running primary color (and the current slide's, if it hasn't received content yet)
			if (node.classList && node.classList.contains('resource-preview-markdown-primary')) {
				currentPrimary = node.dataset.primary;
				if (currentPrimary && content.children.length == 0 && currentSlide != titleSlide) {
					currentSlide.style.setProperty('--primary', currentPrimary);
				}
				continue;
			}
			// skip content marked to ignore (and the ignore markers themselves)
			if (node.classList && (node.classList.contains('resource-preview-markdown-ignore') || node.classList.contains('resource-preview-markdown-ignore-marker'))) {
				continue;
			}
			// a band containing [slide] markers becomes several bands, one per slide. an empty segment still breaks — that's a marker sitting at the very start or end of the band.
			if (node.classList && node.classList.contains('resource-preview-markdown-band')) {
				let pieces = splitBand(node);
				if (pieces) {
					for (let p = 0; p < pieces.length; p++) {
						if (p > 0) {
							newSlide();
						}
						if (pieces[p].firstChild.children.length > 0) {
							content.appendChild(pieces[p]);
						}
					}
					continue;
				}
			}
			content.appendChild(node.cloneNode(true));
		}

		// strip out everything that draws nothing on a slide: the markers the generator leaves behind, content held back from presenting, and the notes meant only for print. done here rather than by hiding them so they can't leave a gap, and so a slide holding nothing else counts as empty and gets dropped below.
		// the calendar's annotation list is deliberately not in here: it's invisible, but it's where the tooltips read their contents from.
		let invisible = [
			'.resource-preview-markdown-anchor',
			'.resource-preview-markdown-slide-break',
			'.resource-preview-markdown-primary',
			'.resource-preview-markdown-pagebreak',
			'.resource-preview-markdown-ignore',
			'.resource-preview-markdown-ignore-marker',
			'.resource-preview-markdown-embed-print'
		].join(',');
		for (let slide of slides) {
			for (let node of slide.querySelectorAll(invisible)) {
				node.remove();
			}
		}

		// speaker notes are pulled off each slide and set aside for the presenter window. taken before the empty-slide filter below and removed as we go, so a slide holding only notes still counts as empty, and the note travels with whichever slide comes next.
		let kept = [];
		let pending = '';
		for (let slide of slides) {
			let found = slide.querySelectorAll('.resource-preview-markdown-notes');
			let note = [...found].map(node => node.innerHTML).join('');
			for (let node of found) {
				node.remove();
			}
			if (slide.firstChild.children.length > 0) {
				kept.push(slide);
				slideNotes.push([pending, note].filter(Boolean).join(''));
				pending = '';
			} else if (note) {
				pending = note;
			}
		}
		return kept;
	}

	// pull the course name, version, and resource name from the page for the label in the top-left corner
	function buildLabel() {
		let titleEl = document.querySelector('.resource-menu-header-title');
		let course = titleEl ? titleEl.textContent.trim().replace(/\s+/g, ' ') : '';
		let versionEl = titleEl ? titleEl.querySelector('.resource-menu-header-version') : null;
		let version = versionEl ? versionEl.textContent.trim() : '';
		if (version) {
			course = `${course.slice(0, course.length - version.length).trim()} ${version}`;
		}
		let resourceEl = document.querySelector(`.resource-menu-link[href="${window.location.pathname}"] .resource-menu-link-heading`);
		let resource = resourceEl ? resourceEl.textContent.trim() : '';
		return `<span class="presentation-label-course">${course}</span><span class="presentation-label-resource">${resource}</span>`;
	}

	let slides = markdown ? buildSlides() : [];
	let index = 0;

	// always end on a "finished" slide with a close button
	let finalSlide = document.createElement('div');
	finalSlide.className = 'presentation-slide presentation-slide-final';
	finalSlide.style.setProperty('--primary', 'var(--off-white)');
	finalSlide.innerHTML = `
		<div class="resource-preview-markdown presentation-finished">
			<p class="presentation-finished-text">We’ve reached the end!</p>
			<button class="presentation-finished-close">Let’s get out of here</button>
		</div>
	`;
	addDrifters(finalSlide, ['🎬', '🎉', '🪩', '🐱', '💥', '🫪']);
	slides.push(finalSlide);

	// build the fullscreen overlay
	let overlay = document.createElement('div');
	overlay.className = 'presentation';
	overlay.dataset.active = 0;
	overlay.innerHTML = `
		<div class="presentation-stage"></div>
		<div class="presentation-label">${buildLabel()}</div>
		<div class="presentation-clock"><span class="presentation-clock-time"></span><span class="presentation-clock-meridiem"></span></div>
		<div class="presentation-controls">
			<div class="presentation-control-item"><button class="presentation-draw-tool" data-draw="annotate" aria-label="Annotate">📝</button><span class="presentation-control-key">a</span></div>
			<div class="presentation-control-item"><button class="presentation-draw-tool" data-draw="whiteboard" aria-label="Whiteboard">✏️</button><span class="presentation-control-key">w</span></div>
			<div class="presentation-control-item"><button class="presentation-pin-btn" aria-label="Pin">📌</button><span class="presentation-control-key">p</span></div>
			<div class="presentation-control-item"><button class="presentation-timer-btn" aria-label="Timer">⏰</button><span class="presentation-control-key">t</span></div>
			<div class="presentation-control-item"><button class="presentation-randomizer-btn" aria-label="Randomizer">🎲</button><span class="presentation-control-key">r</span></div>
			<div class="presentation-control-item"><button class="presentation-soundboard-btn" aria-label="Soundboard">🔊</button><span class="presentation-control-key">s</span></div>
			<div class="presentation-control-item"><button class="presentation-notes-open" aria-label="Presenter notes">🧑‍🏫</button><span class="presentation-control-key">n</span></div>
			<div class="presentation-control-item"><button class="presentation-bare" aria-label="Hide the trimmings">👁️</button><span class="presentation-control-key">i</span></div>
			<div class="presentation-control-item"><button class="presentation-arrow presentation-arrow-prev" aria-label="Previous slide">👈</button><span class="presentation-control-key">←</span></div>
			<div class="presentation-control-item"><button class="presentation-arrow presentation-arrow-next" aria-label="Next slide">👉</button><span class="presentation-control-key">→</span></div>
			<div class="presentation-control-item"><button class="presentation-close" aria-label="Close presentation">❌</button><span class="presentation-control-key">esc</span></div>
		</div>
		<div class="presentation-count"></div>
		<div class="presentation-count-menu"></div>
		<div class="presentation-draw" data-mode="">
			<canvas class="presentation-draw-canvas"></canvas>
			<div class="presentation-draw-textlayer"></div>
			<div class="presentation-draw-brush"></div>
			<div class="presentation-draw-toolbar">
				<div class="presentation-draw-group">
					<div class="presentation-draw-item"><button class="presentation-draw-color" data-color="pink" style="background-color: var(--pink);"></button><span class="presentation-draw-key">1</span></div>
					<div class="presentation-draw-item"><button class="presentation-draw-color" data-color="green" style="background-color: var(--green);"></button><span class="presentation-draw-key">2</span></div>
					<div class="presentation-draw-item"><button class="presentation-draw-color" data-color="blue" style="background-color: var(--blue);"></button><span class="presentation-draw-key">3</span></div>
					<div class="presentation-draw-item"><button class="presentation-draw-color" data-color="yellow" style="background-color: var(--yellow);"></button><span class="presentation-draw-key">4</span></div>
					<div class="presentation-draw-item"><button class="presentation-draw-color" data-color="purple" style="background-color: var(--purple);"></button><span class="presentation-draw-key">5</span></div>
					<div class="presentation-draw-item"><button class="presentation-draw-color" data-color="red" style="background-color: var(--red);"></button><span class="presentation-draw-key">6</span></div>
					<div class="presentation-draw-item"><button class="presentation-draw-color" data-color="off-white" style="background-color: var(--off-white);"></button><span class="presentation-draw-key">7</span></div>
					<div class="presentation-draw-item"><button class="presentation-draw-color" data-color="light-gray" style="background-color: var(--light-gray);"></button><span class="presentation-draw-key">8</span></div>
					<div class="presentation-draw-item"><button class="presentation-draw-color" data-color="dark-gray" style="background-color: var(--dark-gray);"></button><span class="presentation-draw-key">9</span></div>
					<div class="presentation-draw-item"><button class="presentation-draw-color" data-color="off-black" data-active="1" style="background-color: var(--off-black);"></button><span class="presentation-draw-key">0</span></div>
				</div>
				<div class="presentation-draw-group">
					<div class="presentation-draw-item"><button class="presentation-draw-size" data-size="4"><span></span></button><span class="presentation-draw-key">q</span></div>
					<div class="presentation-draw-item"><button class="presentation-draw-size" data-size="12" data-active="1"><span></span></button><span class="presentation-draw-key">w</span></div>
					<div class="presentation-draw-item"><button class="presentation-draw-size" data-size="24"><span></span></button><span class="presentation-draw-key">e</span></div>
				</div>
				<div class="presentation-draw-group">
					<div class="presentation-draw-item"><button class="presentation-draw-tool-btn" data-tool="pen" data-active="1" aria-label="Draw">✏️</button><span class="presentation-draw-key">a</span></div>
					<div class="presentation-draw-item"><button class="presentation-draw-tool-btn" data-tool="erase" aria-label="Erase">🧽</button><span class="presentation-draw-key">s</span></div>
					<div class="presentation-draw-item"><button class="presentation-draw-tool-btn" data-tool="bucket" aria-label="Fill">🪣</button><span class="presentation-draw-key">d</span></div>
					<div class="presentation-draw-item"><button class="presentation-draw-tool-btn" data-tool="square" aria-label="Rectangle">🔳</button><span class="presentation-draw-key">f</span></div>
					<div class="presentation-draw-item"><button class="presentation-draw-tool-btn" data-tool="ellipse" aria-label="Ellipse">⭕️</button><span class="presentation-draw-key">g</span></div>
					<div class="presentation-draw-item"><button class="presentation-draw-tool-btn" data-tool="line" aria-label="Line">📈</button><span class="presentation-draw-key">h</span></div>
					<div class="presentation-draw-item"><button class="presentation-draw-tool-btn" data-tool="arrow" aria-label="Arrow">🏹</button><span class="presentation-draw-key">j</span></div>
					<div class="presentation-draw-item"><button class="presentation-draw-tool-btn" data-tool="text" aria-label="Text">🔠</button><span class="presentation-draw-key">t</span></div>
				</div>
				<div class="presentation-draw-group">
					<div class="presentation-draw-item"><button class="presentation-draw-undo" aria-label="Undo">👈</button><span class="presentation-draw-key">z</span></div>
					<div class="presentation-draw-item"><button class="presentation-draw-redo" aria-label="Redo">👉</button><span class="presentation-draw-key">x</span></div>
				</div>
				<div class="presentation-draw-group">
					<div class="presentation-draw-item"><button class="presentation-draw-clear" aria-label="Clear drawing">🗑️</button><span class="presentation-draw-key">c</span></div>
					<div class="presentation-draw-item"><button class="presentation-draw-save" aria-label="Save drawing">💾</button><span class="presentation-draw-key">v</span></div>
				</div>
				<div class="presentation-draw-group">
					<div class="presentation-draw-item"><button class="presentation-draw-pin" aria-label="Pin">📌</button><span class="presentation-draw-key">u</span></div>
					<div class="presentation-draw-item"><button class="presentation-draw-newtimer" aria-label="New timer">⏰</button><span class="presentation-draw-key">i</span></div>
					<div class="presentation-draw-item"><button class="presentation-draw-randomizer" aria-label="Randomizer">🎲</button><span class="presentation-draw-key">o</span></div>
					<div class="presentation-draw-item"><button class="presentation-draw-soundboard" aria-label="Soundboard">🔊</button><span class="presentation-draw-key">p</span></div>
				</div>
				<div class="presentation-draw-group">
					<div class="presentation-draw-item"><button class="presentation-draw-close" aria-label="Close drawing">❌</button><span class="presentation-draw-key">esc</span></div>
				</div>
			</div>
		</div>
	`;
	let stage = overlay.querySelector('.presentation-stage');
	for (let slide of slides) {
		stage.appendChild(slide);
	}
	document.body.appendChild(overlay);

	let prevButton = overlay.querySelector('.presentation-arrow-prev');
	let nextButton = overlay.querySelector('.presentation-arrow-next');
	let countEl = overlay.querySelector('.presentation-count');

	// the drifting emoji, one flock per slide that has any. they bounce off the frame, off each other, and off the cursor. driven from a rAF loop rather than keyframes: the walls move when the window resizes, and none of the collisions are a path an animation could be written out in advance.
	const BOUNCE_SPEED = 0.45;      // fraction of the slide height, per second
	const BOUNCE_SPEED_MAX = 2.0;   // ceiling, in multiples of that base speed
	const BOUNCE_SPIN_MAX = 180;    // degrees per second
	const POINTER_RADIUS = 30;
	const POINTER_PUSH = 1.6;       // how much of the cursor's speed carries over
	let bounceFlocks = [];
	let bounceFlock = null;
	let bounceFrame = null;
	let bounceLast = null;
	let bouncePointer = { x: -99999, y: -99999, vx: 0, vy: 0, at: 0 };

	function clampSpin(v) {
		return Math.max(-BOUNCE_SPIN_MAX, Math.min(BOUNCE_SPIN_MAX, v));
	}
	function bounceLimits(flock) {
		return {
			x: Math.max(0, flock.slide.clientWidth - flock.els[0].offsetWidth),
			y: Math.max(0, flock.slide.clientHeight - flock.els[0].offsetHeight)
		};
	}
	function bounceBase(flock) {
		return Math.max(120, flock.slide.clientHeight * BOUNCE_SPEED);
	}

	function stopBounce() {
		if (bounceFrame) {
			cancelAnimationFrame(bounceFrame);
			bounceFrame = null;
		}
	}

	function initBounce(flock) {
		let lim = bounceLimits(flock);
		if (lim.x <= 0 || lim.y <= 0) {
			return false;
		}
		let speed = bounceBase(flock);
		// laid out on a grid to start, so none of them begin already overlapping
		let cols = Math.ceil(Math.sqrt(flock.els.length));
		let rows = Math.ceil(flock.els.length / cols);
		flock.bodies = flock.els.map((el, i) => {
			// a diagonal, but never so shallow that it crawls along one edge
			let angle = (25 + Math.random() * 40) * Math.PI / 180;
			return {
				el: el,
				x: lim.x * Math.min(1, Math.max(0, (i % cols + 0.5) / cols + (Math.random() - 0.5) * 0.12)),
				y: lim.y * Math.min(1, Math.max(0, (Math.floor(i / cols) + 0.5) / rows + (Math.random() - 0.5) * 0.12)),
				vx: Math.cos(angle) * speed * (Math.random() < 0.5 ? -1 : 1),
				vy: Math.sin(angle) * speed * (Math.random() < 0.5 ? -1 : 1),
				angle: Math.random() * 360,
				spin: (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 140)
			};
		});
		return true;
	}

	// two equal masses meeting head on: swap the velocity components along the line between them and leave the sideways ones alone.
	function bouncePair(a, b) {
		let dx = (b.x + b.hw) - (a.x + a.hw);
		let dy = (b.y + b.hh) - (a.y + a.hh);
		let dist = Math.sqrt(dx * dx + dy * dy);
		let min = a.radius + b.radius;
		if (dist >= min || dist == 0) {
			return;
		}
		let nx = dx / dist;
		let ny = dy / dist;
		// pushed apart first: overlapping bodies would otherwise re-collide every frame and buzz against each other instead of separating
		let overlap = (min - dist) / 2;
		a.x -= nx * overlap;
		a.y -= ny * overlap;
		b.x += nx * overlap;
		b.y += ny * overlap;
		let closing = (a.vx * nx + a.vy * ny) - (b.vx * nx + b.vy * ny);
		if (closing <= 0) {
			return;
		}
		a.vx -= closing * nx;
		a.vy -= closing * ny;
		b.vx += closing * nx;
		b.vy += closing * ny;
		// glancing blows spin them; dead-on ones barely do
		let tangent = (a.vx - b.vx) * -ny + (a.vy - b.vy) * nx;
		a.spin = clampSpin(a.spin - tangent * 0.6);
		b.spin = clampSpin(b.spin + tangent * 0.6);
	}

	// a still cursor is a wall. a cursor swung at one is a bat: the harder the swipe, the harder it goes away.
	function bouncePointerHit(body, base, maxSpeed) {
		let dx = (body.x + body.hw) - bouncePointer.x;
		let dy = (body.y + body.hh) - bouncePointer.y;
		let dist = Math.sqrt(dx * dx + dy * dy);
		let min = body.radius + POINTER_RADIUS;
		if (dist >= min) {
			return;
		}
		let nx = dist ? dx / dist : 0;
		let ny = dist ? dy / dist : -1;
		let impact = Math.sqrt(bouncePointer.vx * bouncePointer.vx + bouncePointer.vy * bouncePointer.vy);
		let speed = Math.min(maxSpeed, Math.max(base, impact * POINTER_PUSH));
		body.x = bouncePointer.x + nx * min - body.hw;
		body.y = bouncePointer.y + ny * min - body.hh;
		body.vx = nx * speed;
		body.vy = ny * speed;
		let tangent = bouncePointer.vx * -ny + bouncePointer.vy * nx;
		body.spin = clampSpin(tangent ? tangent * 1.2 : -body.spin);
	}

	function bounceStep(now) {
		let flock = bounceFlock;
		if (!flock || !flock.bodies.length || !flock.els[0].parentElement) {
			bounceFrame = null;
			return;
		}
		// capped, so returning to a backgrounded tab resumes the paths rather than teleporting everything across a skipped minute
		let dt = bounceLast === null ? 0 : Math.min(0.05, (now - bounceLast) / 1000);
		bounceLast = now;
		let base = bounceBase(flock);
		let maxSpeed = base * BOUNCE_SPEED_MAX;
		// the cursor only counts as a moving object while it's actually moving; without this it keeps whatever speed its last flick had forever
		if (now - bouncePointer.at > 120) {
			bouncePointer.vx = 0;
			bouncePointer.vy = 0;
		}

		let bodies = flock.bodies;
		// measured per body, not once for the flock: a slide can hold six different emoji, and a wide glyph sits in a wider box than a narrow one. sizing everything from the first one let the rest overhang.
		let frameW = flock.slide.clientWidth;
		let frameH = flock.slide.clientHeight;
		for (let body of bodies) {
			body.hw = body.el.offsetWidth / 2;
			body.hh = body.el.offsetHeight / 2;
			// collisions use the circle that fits inside the box, since that's about the shape of an emoji
			body.radius = Math.min(body.hw, body.hh);
			// spinning sweeps each one out to its own diagonal, so its walls sit a corner's worth in from the frame -- otherwise a tilted emoji clips through the edge instead of bouncing off it
			let diag = Math.sqrt(body.hw * body.hw + body.hh * body.hh);
			let spanX = Math.max(0, frameW - body.hw * 2);
			let spanY = Math.max(0, frameH - body.hh * 2);
			body.minX = Math.min(diag - body.hw, spanX / 2);
			body.maxX = Math.max(body.minX, spanX - body.minX);
			body.minY = Math.min(diag - body.hh, spanY / 2);
			body.maxY = Math.max(body.minY, spanY - body.minY);
		}
		for (let body of bodies) {
			body.x += body.vx * dt;
			body.y += body.vy * dt;
			if (body.x <= body.minX) {
				body.x = body.minX;
				body.vx = Math.abs(body.vx);
				body.spin = -body.spin;
			} else if (body.x >= body.maxX) {
				body.x = body.maxX;
				body.vx = -Math.abs(body.vx);
				body.spin = -body.spin;
			}
			if (body.y <= body.minY) {
				body.y = body.minY;
				body.vy = Math.abs(body.vy);
				body.spin = -body.spin;
			} else if (body.y >= body.maxY) {
				body.y = body.maxY;
				body.vy = -Math.abs(body.vy);
				body.spin = -body.spin;
			}
		}
		for (let i = 0; i < bodies.length; i++) {
			for (let j = i + 1; j < bodies.length; j++) {
				bouncePair(bodies[i], bodies[j]);
			}
			bouncePointerHit(bodies[i], base, maxSpeed);
		}
		for (let body of bodies) {
			// collisions can nudge a body past an edge after the wall check
			body.x = Math.min(Math.max(body.minX, body.x), body.maxX);
			body.y = Math.min(Math.max(body.minY, body.y), body.maxY);
			let speed = Math.sqrt(body.vx * body.vx + body.vy * body.vy);
			if (speed > maxSpeed) {
				body.vx = body.vx / speed * maxSpeed;
				body.vy = body.vy / speed * maxSpeed;
			}
			body.angle = (body.angle + body.spin * dt) % 360;
			body.el.style.transform = `translate(${body.x}px, ${body.y}px) rotate(${body.angle}deg)`;
		}
		bounceFrame = requestAnimationFrame(bounceStep);
	}

	// cursor position and speed, in the active slide's own coordinates. speed is measured between moves rather than read from the event, because what matters for the hit is how fast the cursor was travelling when it arrived, not where it landed.
	document.addEventListener('mousemove', e => {
		// only while a flock is actually flying: this fires on every mouse move on the page, and measuring the slide each time would mean a layout read per move for the rest of the session otherwise
		if (overlay.dataset.active != 1 || !bounceFrame || !bounceFlock) {
			return;
		}
		let rect = bounceFlock.slide.getBoundingClientRect();
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;
		let now = performance.now();
		let dt = (now - bouncePointer.at) / 1000;
		if (dt > 0 && dt < 0.2) {
			bouncePointer.vx = (x - bouncePointer.x) / dt;
			bouncePointer.vy = (y - bouncePointer.y) / dt;
		} else {
			// first move, or a long gap: no meaningful speed to read from it
			bouncePointer.vx = 0;
			bouncePointer.vy = 0;
		}
		bouncePointer.x = x;
		bouncePointer.y = y;
		bouncePointer.at = now;
	});

	function startBounce(flock) {
		// this flock is already flying, so leave it exactly where it is. arrowing left from the first slide re-shows that same slide, and the emoji shouldn't jump back to their starting grid every time.
		if (flock == bounceFlock && bounceFrame) {
			return;
		}
		stopBounce();
		if (!flock || !flock.els.length || !flock.els[0].parentElement) {
			return;
		}
		// bodies are kept per flock, so leaving a slide and coming back picks up where it left off rather than dealing a fresh hand
		if (!flock.bodies.length && !initBounce(flock)) {
			return;
		}
		bounceFlock = flock;
		bounceLast = null;
		bounceFrame = requestAnimationFrame(bounceStep);
	}

	// show a specific slide
	function showSlide(newIndex) {
		newIndex = Math.max(0, Math.min(slides.length - 1, newIndex));
		// direction drives the slide-in animation (rl forward, lr backward)
		overlay.dataset.direction = newIndex < index ? 'prev' : 'next';
		index = newIndex;
		for (let s = 0; s < slides.length; s++) {
			slides[s].dataset.active = (s == index) ? 1 : 0;
		}
		// adopt the current slide's primary color on the whole overlay
		let slidePrimary = slides[index].style.getPropertyValue('--primary');
		if (slidePrimary) {
			overlay.style.setProperty('--primary', slidePrimary);
		} else {
			overlay.style.removeProperty('--primary');
		}
		prevButton.disabled = (index == 0);
		nextButton.disabled = (index == slides.length - 1);
		countEl.textContent = `${index + 1} / ${slides.length}`;
		let flock = bounceFlocks.find(f => f.slide == slides[index]);
		if (flock) {
			startBounce(flock);
		} else {
			stopBounce();
		}
		updateNotes();
	}

	// speaker notes in a second window.
	// the window is opened blank and written into from here rather than being a page of its own, so it needs nothing from the server — which matters on a static host. because we opened it, it's same-origin and we can keep a handle on it and push straight into its DOM; no channel or polling. it borrows the site stylesheet so the notes keep their markdown styling.
	let notesWindow = null;
	let notesClock = null;
	// when this run of the presentation began, for the elapsed readout
	let startedAt = null;

	function twoDigits(n) {
		return String(n).padStart(2, '0');
	}
	function elapsedText() {
		if (!startedAt) {
			return '0:00:00';
		}
		let seconds = Math.floor((Date.now() - startedAt) / 1000);
		return `${Math.floor(seconds / 3600)}:${twoDigits(Math.floor(seconds / 60) % 60)}:${twoDigits(seconds % 60)}`;
	}
	function clockText() {
		let now = new Date();
		let hours = now.getHours() % 12 || 12;
		return `${hours}:${twoDigits(now.getMinutes())}:${twoDigits(now.getSeconds())} ${now.getHours() < 12 ? 'am' : 'pm'}`;
	}

	// the two readouts tick on their own; the note only changes with the slide
	function tickNotes() {
		if (!notesWindow || notesWindow.closed) {
			return;
		}
		let doc = notesWindow.document;
		let clock = doc.getElementById('notes-clock');
		let elapsed = doc.getElementById('notes-elapsed');
		if (clock) {
			clock.textContent = clockText();
		}
		if (elapsed) {
			elapsed.textContent = elapsedText();
		}
	}
	function updateNotes() {
		if (!notesWindow || notesWindow.closed) {
			return;
		}
		let doc = notesWindow.document;
		let body = doc.getElementById('notes-body');
		if (!body) {
			return;
		}
		let note = slideNotes[index] || '';
		body.innerHTML = note || '<p class="presentation-notes-empty">No notes for this slide.</p>';
		let count = doc.getElementById('notes-count');
		if (count) {
			count.textContent = `${index + 1} / ${slides.length}`;
		}
		let prev = doc.getElementById('notes-prev');
		let next = doc.getElementById('notes-next');
		if (prev) {
			prev.disabled = index == 0;
		}
		if (next) {
			next.disabled = index == slides.length - 1;
		}
		tickNotes();
	}
	function openNotes() {
		if (notesWindow && !notesWindow.closed) {
			notesWindow.focus();
			updateNotes();
			return;
		}
		notesWindow = window.open('', 'classroom-presenter-notes', 'width=520,height=680');
		if (!notesWindow) {
			// blocked by the browser; nothing useful to do but leave it alone
			return;
		}
		notesWindow.document.write(`<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="utf-8">
				<title>Presenter notes</title>
				<link rel="stylesheet" href="/style.css">
			</head>
			<body class="presentation-notes">
				<header class="presentation-notes-header">
					<span id="notes-clock" class="presentation-notes-clock"></span>
					<span id="notes-elapsed" class="presentation-notes-elapsed"></span>
				</header>
				<main id="notes-body" class="presentation-notes-body resource-preview-markdown"></main>
				<footer class="presentation-notes-footer">
					<button id="notes-prev" class="presentation-notes-btn" type="button">👈</button>
					<span id="notes-count" class="presentation-notes-count"></span>
					<button id="notes-next" class="presentation-notes-btn" type="button">👉</button>
				</footer>
			</body>
			</html>`);
		notesWindow.document.close();

		function wire() {
			let doc = notesWindow.document;
			// driving the slides from the notes window, so the laptop can lead
			let prev = doc.getElementById('notes-prev');
			let next = doc.getElementById('notes-next');
			if (prev) {
				prev.addEventListener('click', () => showSlide(index - 1));
			}
			if (next) {
				next.addEventListener('click', () => showSlide(index + 1));
			}
			// arrow keys in this window move the slides too
			doc.addEventListener('keydown', (e) => {
				if (e.key == 'ArrowRight' || e.key == 'ArrowDown') {
					showSlide(index + 1);
				} else if (e.key == 'ArrowLeft' || e.key == 'ArrowUp') {
					showSlide(index - 1);
				}
			});
			// tidy up if it's closed from its own title bar
			notesWindow.addEventListener('pagehide', () => {
				clearInterval(notesClock);
				notesClock = null;
			});
			clearInterval(notesClock);
			notesClock = setInterval(tickNotes, 1000);
			updateNotes();
		}
		// the page has to have parsed before there's a body to write into
		if (notesWindow.document.readyState == 'complete') {
			wire();
		} else {
			notesWindow.addEventListener('load', wire);
		}
	}
	function closeNotes() {
		clearInterval(notesClock);
		notesClock = null;
		if (notesWindow && !notesWindow.closed) {
			notesWindow.close();
		}
		notesWindow = null;
	}
	// don't leave the notes orphaned on the desktop when the tab goes away
	window.addEventListener('pagehide', closeNotes);

	// strip the presentation back to just the slide: no label, no shortcut bar, no clock, no slide count. a flag on the overlay does the hiding in CSS.
	function toggleBare() {
		if (overlay.dataset.bare == '1') {
			delete overlay.dataset.bare;
		} else {
			overlay.dataset.bare = '1';
		}
		restCursor();
	}

	// with the trimmings hidden the slide is the only thing on screen, so a cursor left sitting in the middle of it is just litter. it goes after three still seconds and comes straight back on any movement. only in bare mode — anywhere else the pointer is being used to press things.
	let cursorTimer = null;
	function restCursor() {
		clearTimeout(cursorTimer);
		delete document.body.dataset.idle;
		if (overlay.dataset.bare == '1' && overlay.dataset.active == 1) {
			// flagged on the body rather than the overlay: pins, timers and the soundboard toolbar all sit outside the presentation's subtree, and a cursor resting over one of those would otherwise stay visible
			cursorTimer = setTimeout(() => {
				document.body.dataset.idle = '1';
			}, 3000);
		}
	}
	// only actual pointer movement brings it back. arrow keys drive the slides, and having the cursor reappear in the middle of the screen every time one is pressed is the thing this was meant to stop.
	document.addEventListener('pointermove', restCursor, true);

	// the clock in the bottom-left corner, ticking only while the presentation is open.
	let clockTimeEl = overlay.querySelector('.presentation-clock-time');
	let clockMeridiemEl = overlay.querySelector('.presentation-clock-meridiem');
	let clockTimer = null;
	function renderClock() {
		let now = new Date();
		let hours = now.getHours();
		let meridiem = hours < 12 ? 'am' : 'pm';
		hours = hours % 12;
		if (hours == 0) {
			hours = 12;
		}
		clockTimeEl.textContent = `${String(hours).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
		clockMeridiemEl.textContent = meridiem;
	}
	function scheduleClock() {
		// land on the next whole second rather than drifting with setInterval
		let untilNextSecond = 1000 - (new Date()).getMilliseconds();
		clockTimer = setTimeout(() => {
			renderClock();
			scheduleClock();
		}, Math.max(50, untilNextSecond));
	}
	function startClock() {
		stopClock();
		renderClock();
		scheduleClock();
	}
	function stopClock() {
		if (clockTimer) {
			clearTimeout(clockTimer);
			clockTimer = null;
		}
	}

	// open and close
	function openPresentation() {
		overlay.dataset.active = 1;
		bounceFlocks = [...overlay.querySelectorAll('.presentation-slide-drift')].map(slide => ({
			slide: slide,
			els: [...slide.querySelectorAll('.presentation-slide-drifter')],
			bodies: []
		}));
		startClock();
		// elapsed time runs from here, so it measures this run of the presentation rather than how long the page has been open
		startedAt = Date.now();
		showSlide(0);
	}
	function closePresentation() {
		overlay.dataset.active = 0;
		stopClock();
		stopBounce();
		// the trimmings come back for next time
		delete overlay.dataset.bare;
		clearTimeout(cursorTimer);
		delete document.body.dataset.idle;
		// the notes window belongs to the presentation, so it goes with it
		closeNotes();
		startedAt = null;
	}
	window.openPresentation = openPresentation;
	// exposed so the sidebar can start drawing even outside the presentation
	window.enterDraw = (mode) => enterDraw(mode);

	// expand every FAQ dropdown while printing so answers are included, then restore each to its previous state afterward
	window.addEventListener('beforeprint', () => {
		document.querySelectorAll('.resource-preview-markdown-faq').forEach(faq => {
			faq.dataset.wasOpen = faq.open ? 1 : 0;
			faq.open = true;
		});
	});
	window.addEventListener('afterprint', () => {
		document.querySelectorAll('.resource-preview-markdown-faq').forEach(faq => {
			faq.open = faq.dataset.wasOpen == 1;
		});
	});

	// controls
	prevButton.addEventListener('click', () => showSlide(index - 1));
	nextButton.addEventListener('click', () => showSlide(index + 1));
	overlay.querySelector('.presentation-close').addEventListener('click', closePresentation);
	finalSlide.querySelector('.presentation-finished-close').addEventListener('click', closePresentation);

	// swipe / quick drag left-right to change slides (mouse + touch). a gesture that starts on the slide area and ends quickly, mostly horizontally, navigates: drag left → next, drag right → previous
	let swipeX = 0, swipeY = 0, swipeT = 0, swiping = false;
	stage.addEventListener('pointerdown', (e) => {
		swiping = true;
		swipeX = e.clientX;
		swipeY = e.clientY;
		swipeT = Date.now();
	});
	window.addEventListener('pointercancel', () => { swiping = false; });
	window.addEventListener('pointerup', (e) => {
		if (!swiping) {
			return;
		}
		swiping = false;
		let dx = e.clientX - swipeX;
		let dy = e.clientY - swipeY;
		if (Date.now() - swipeT < 600 && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
			showSlide(dx < 0 ? index + 1 : index - 1);
		}
	});

	// the timer button spawns a draggable countdown/stopwatch (body-level, so it stays visible even after leaving the presentation)
	overlay.querySelector('.presentation-timer-btn').addEventListener('click', () => window.createTimer());
	overlay.querySelector('.presentation-randomizer-btn').addEventListener('click', () => window.createRandomizer());
	overlay.querySelector('.presentation-pin-btn').addEventListener('click', () => window.createPin());
	overlay.querySelector('.presentation-soundboard-btn').addEventListener('click', () => window.toggleSoundboard && window.toggleSoundboard());
	overlay.querySelector('.presentation-notes-open').addEventListener('click', openNotes);
	overlay.querySelector('.presentation-bare').addEventListener('click', toggleBare);

	// drawing: annotate over the slides (📝) or a blank whiteboard (✏️)
	let drawLayer = overlay.querySelector('.presentation-draw');
	// the toolbar is lifted out to the body: the drawing layer has a z-index of its own, which makes a stacking context the toolbar could never escape — so it always sat under the floating widgets however high it was stacked. out here it clears them, while the canvas stays below where it belongs.
	let drawToolbar = drawLayer.querySelector('.presentation-draw-toolbar');
	document.body.appendChild(drawToolbar);
	let canvas = drawLayer.querySelector('.presentation-draw-canvas');
	let textLayer = drawLayer.querySelector('.presentation-draw-textlayer');
	let ctx = canvas.getContext('2d');
	// cache the canvas's on-screen offset so evX/evY don't force a layout read on every pointer event (it only changes on enter/resize).
	let canvasLeft = 0, canvasTop = 0;
	function updateCanvasOffset() {
		let rect = canvas.getBoundingClientRect();
		canvasLeft = rect.left;
		canvasTop = rect.top;
	}
	// pointer position in DRAW coordinates: world px on the whiteboard (mapped through the camera), or screen px in annotate mode.
	function evX(e) {
		let sx = e.clientX - canvasLeft;
		return drawLayer.dataset.mode == 'whiteboard' ? panX + sx / zoom : sx;
	}
	function evY(e) {
		let sy = e.clientY - canvasTop;
		return drawLayer.dataset.mode == 'whiteboard' ? panY + sy / zoom : sy;
	}
	// world px -> screen CSS px (for positioning the brush preview, etc.)
	function worldToScreenX(wx) { return (wx - panX) * zoom; }
	function worldToScreenY(wy) { return (wy - panY) * zoom; }
	// text tool: type boxes live as DOM overlays so they stay editable/movable. brush sizes are small (4/12/28); scale them up to a legible type size
	let texts = [];
	let activeText = null;
	let textSizeFactor = 3;
	let resolveColor = (name) => getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
	let offBlack = resolveColor('off-black');
	let drawColor = offBlack;
	let drawColorName = 'off-black';
	let drawSize = 12;
	let tool = 'pen';
	let whiteboardImage = null;   // dataURL of just the drawn area (cropped)
	let whiteboardCropX = 0, whiteboardCropY = 0;   // where that crop sits in the world
	let whiteboardPanX = 0, whiteboardPanY = 0;   // saved camera position
	let whiteboardZoom = 1;       // saved zoom level
	let whiteboardTexts = [];
	// persist the whiteboard across pages via localStorage
	let WB_KEY = 'classroom-whiteboard';
	function saveWhiteboard() {
		try {
			if (whiteboardImage) {
				localStorage.setItem(WB_KEY, JSON.stringify({
					image: whiteboardImage,
					cropX: whiteboardCropX, cropY: whiteboardCropY,
					panX: whiteboardPanX, panY: whiteboardPanY,
					zoom: whiteboardZoom,
					texts: whiteboardTexts
				}));
			} else {
				localStorage.removeItem(WB_KEY);
			}
		} catch (err) {}
	}
	function loadWhiteboard() {
		try {
			let raw = localStorage.getItem(WB_KEY);
			if (!raw) {
				return;
			}
			let data = JSON.parse(raw);
			whiteboardImage = data.image || null;
			whiteboardCropX = data.cropX || 0;
			whiteboardCropY = data.cropY || 0;
			whiteboardPanX = data.panX || 0;
			whiteboardPanY = data.panY || 0;
			whiteboardZoom = data.zoom || 1;
			whiteboardTexts = data.texts || [];
		} catch (err) {}
	}
	loadWhiteboard();
	// the drawn content's bounding box in world px (null if nothing drawn)
	function contentRect() {
		if (cX2 <= cX1 || cY2 <= cY1) {
			return null;
		}
		let x = Math.floor(cX1), y = Math.floor(cY1);
		let x2 = Math.ceil(cX2), y2 = Math.ceil(cY2);
		if (x2 <= x || y2 <= y) {
			return null;
		}
		return { x: x, y: y, w: x2 - x, h: y2 - y };
	}
	// capture the whiteboard for persistence: only the drawn area (cropped), plus camera + text.
	function captureWhiteboard() {
		let b = contentRect();
		if (b) {
			let c = document.createElement('canvas');
			c.width = b.w;
			c.height = b.h;
			let cc = c.getContext('2d');
			cc.imageSmoothingEnabled = false;
			compositeWorld(cc, b.x, b.y, b.w, b.h);
			whiteboardImage = c.toDataURL();
			whiteboardCropX = b.x;
			whiteboardCropY = b.y;
		} else {
			whiteboardImage = null;
			whiteboardCropX = 0;
			whiteboardCropY = 0;
		}
		whiteboardPanX = panX;
		whiteboardPanY = panY;
		whiteboardZoom = zoom;
		whiteboardTexts = serializeTexts();
	}
	// if the page unloads mid-draw on the whiteboard, capture it first
	window.addEventListener('beforeunload', () => {
		if (drawLayer.dataset.mode == 'whiteboard') {
			captureWhiteboard();
			saveWhiteboard();
		}
	});
	let drawing = false;
	let lastX = 0;
	let lastY = 0;
	let startX = 0;
	let startY = 0;
	let shapeBase = null;
	let shapeEndX = 0;
	let shapeEndY = 0;
	let lineStart = null;
	let lineBase = null;
	let linePressed = false;
	let lineMoved = false;
	let lineFresh = false;
	let linePressX = 0;
	let linePressY = 0;
	let bucketing = false;
	let lastBucketX = 0;
	let lastBucketY = 0;
	let ptrX = 0;
	let ptrY = 0;
	let saveCount = 0;
	let canvasW = window.innerWidth;
	let canvasH = window.innerHeight;
	let history = [];
	let historyIndex = -1;

	// whiteboard: strokes are drawn at world resolution (never resampled -> crisp at any zoom) onto an offscreen surface, and the on-screen canvas is a nearest-neighbour view of it (camera = panX, panY, zoom). annotate ignores all of this and draws straight onto the screen canvas.
	// committed ink lives in a sparse grid of fixed-size tiles, so empty space between two drawings costs nothing — the canvas is genuinely infinite and only inked tiles are allocated. (One buffer spanning the whole bounding box meant drawing 8000px from an earlier scribble allocated every empty pixel in between, hundreds of megabytes of nothing, which is what made drawing after a long pan crawl.)
	// tools still draw into a single "active" buffer covering the area being worked on, so nothing below this layer has to know about tiles. while that buffer is live the tiles beneath it are blanked, making tiles + active an exact composite; at the end of each operation it is committed back down.
	let TILE = 512;
	let tiles = new Map();
	function tileKey(tx, ty) { return `${tx},${ty}`; }
	function tileRange(x1, y1, x2, y2) {
		return {
			tx1: Math.floor(x1 / TILE), ty1: Math.floor(y1 / TILE),
			tx2: Math.floor((x2 - 1) / TILE), ty2: Math.floor((y2 - 1) / TILE)
		};
	}
	function getTile(tx, ty, create) {
		let key = tileKey(tx, ty);
		let tile = tiles.get(key);
		if (!tile && create) {
			tile = document.createElement('canvas');
			tile.width = TILE;
			tile.height = TILE;
			let tc = tile.getContext('2d');
			tc.imageSmoothingEnabled = false;
			tiles.set(key, tile);
		}
		return tile;
	}
	// draw any source image into the tile grid at world position (wx, wy)
	function stampIntoTiles(source, wx, wy, w, h) {
		let range = tileRange(wx, wy, wx + w, wy + h);
		let span = (range.tx2 - range.tx1 + 1) * (range.ty2 - range.ty1 + 1);

		// over a wide area, first work out at a coarse scale where the source actually has ink. restoring a saved board hands over one big crop spanning everything drawn, and without this every empty square in between would become an allocated tile.
		let cover = null;
		let COVER = 8;
		if (span > 4) {
			let cw = Math.max(1, Math.ceil(w / COVER)), ch = Math.max(1, Math.ceil(h / COVER));
			let cc = document.createElement('canvas');
			cc.width = cw;
			cc.height = ch;
			let cctx = cc.getContext('2d');
			cctx.imageSmoothingEnabled = true;
			cctx.drawImage(source, 0, 0, w, h, 0, 0, cw, ch);
			cover = { w: cw, h: ch, data: cctx.getImageData(0, 0, cw, ch).data };
		}
		// is there any ink in this source-local rectangle?
		function sourceHasInk(sx1, sy1, sx2, sy2) {
			if (!cover) {
				return true;
			}
			let cx1 = Math.max(0, Math.floor(sx1 / COVER)), cy1 = Math.max(0, Math.floor(sy1 / COVER));
			let cx2 = Math.min(cover.w - 1, Math.ceil(sx2 / COVER)), cy2 = Math.min(cover.h - 1, Math.ceil(sy2 / COVER));
			for (let y = cy1; y <= cy2; y++) {
				for (let x = cx1; x <= cx2; x++) {
					if (cover.data[(y * cover.w + x) * 4 + 3] !== 0) {
						return true;
					}
				}
			}
			return false;
		}

		for (let ty = range.ty1; ty <= range.ty2; ty++) {
			for (let tx = range.tx1; tx <= range.tx2; tx++) {
				let ox = tx * TILE, oy = ty * TILE;
				let sx1 = Math.max(wx, ox), sy1 = Math.max(wy, oy);
				let sx2 = Math.min(wx + w, ox + TILE), sy2 = Math.min(wy + h, oy + TILE);
				if (sx2 <= sx1 || sy2 <= sy1) {
					continue;
				}
				// nothing to write and nothing already there to overwrite
				if (!tiles.has(tileKey(tx, ty)) && !sourceHasInk(sx1 - wx, sy1 - wy, sx2 - wx, sy2 - wy)) {
					continue;
				}
				let tc = getTile(tx, ty, true).getContext('2d');
				tc.imageSmoothingEnabled = false;
				tc.clearRect(sx1 - ox, sy1 - oy, sx2 - sx1, sy2 - sy1);
				tc.drawImage(source,
					sx1 - wx, sy1 - wy, sx2 - sx1, sy2 - sy1,
					sx1 - ox, sy1 - oy, sx2 - sx1, sy2 - sy1);
			}
		}
	}
	// draw the world rectangle (x, y, w, h) into destCtx at its origin: the committed tiles, plus the active buffer if it currently owns part of it
	function compositeWorld(destCtx, x, y, w, h) {
		let range = tileRange(x, y, x + w, y + h);
		for (let ty = range.ty1; ty <= range.ty2; ty++) {
			for (let tx = range.tx1; tx <= range.tx2; tx++) {
				let tile = tiles.get(tileKey(tx, ty));
				if (tile) {
					destCtx.drawImage(tile, tx * TILE - x, ty * TILE - y);
				}
			}
		}
		// only the area the in-progress operation owns is newer than the tiles
		let owned = activeOwnedRect();
		if (owned) {
			destCtx.clearRect(owned.x - x, owned.y - y, owned.w, owned.h);
			destCtx.drawImage(world,
				owned.x - worldOX, owned.y - worldOY, owned.w, owned.h,
				owned.x - x, owned.y - y, owned.w, owned.h);
		}
	}
	// drop a tile that has been erased back to nothing, so rubbing work out gives the memory back instead of leaving a blank tile allocated
	function pruneTile(tx, ty) {
		let tile = tiles.get(tileKey(tx, ty));
		if (!tile) {
			return;
		}
		let d = tile.getContext('2d').getImageData(0, 0, TILE, TILE).data;
		for (let i = 3; i < d.length; i += 4) {
			if (d[i] !== 0) {
				return;
			}
		}
		tiles.delete(tileKey(tx, ty));
	}
	let world = document.createElement('canvas');
	let worldCtx = world.getContext('2d');
	let worldOX = 0, worldOY = 0;   // world px at buffer pixel (0,0)
	let panX = 0, panY = 0;         // world px shown at screen (0,0)
	let zoom = 1;                   // screen CSS px per world px (pinch-to-zoom, whiteboard only)
	let ZOOM_MIN = 0.2, ZOOM_MAX = 8;
	let PAN_LIMIT = 8000;           // how far (world px) the camera may roam from the origin
	let offWhiteCol = resolveColor('off-white');
	// world-px bounding box of all drawn content (for cropping on save/persist)
	let cX1 = Infinity, cY1 = Infinity, cX2 = -Infinity, cY2 = -Infinity;
	function markContent(x, y, w, h) {
		if (x < cX1) cX1 = x;
		if (y < cY1) cY1 = y;
		if (x + w > cX2) cX2 = x + w;
		if (y + h > cY2) cY2 = y + h;
	}
	function resetContentBounds() { cX1 = Infinity; cY1 = Infinity; cX2 = -Infinity; cY2 = -Infinity; }
	// world-px bounding box of the current drawing operation (for compact undo)
	let opX1 = Infinity, opY1 = Infinity, opX2 = -Infinity, opY2 = -Infinity;
	function resetOpDirty() {
		opX1 = Infinity; opY1 = Infinity; opX2 = -Infinity; opY2 = -Infinity;
	}
	function markOpDirty(x, y, w, h) {
		if (x < opX1) opX1 = x;
		if (y < opY1) opY1 = y;
		if (x + w > opX2) opX2 = x + w;
		if (y + h > opY2) opY2 = y + h;
		markContent(x, y, w, h);
	}
	function isWhiteboard() { return drawLayer.dataset.mode == 'whiteboard'; }
	function dctx() { return isWhiteboard() ? worldCtx : ctx; }
	// coalesce redraws onto one animation frame. drawing just paints onto the world buffer (cheap fillRects); the screen is re-blitted at most once per frame, no matter how fast pointer events arrive — this is the main thing that keeps drawing smooth.
	let renderScheduled = false;
	function scheduleRender() {
		if (renderScheduled) {
			return;
		}
		renderScheduled = true;
		requestAnimationFrame(() => {
			renderScheduled = false;
			if (isWhiteboard()) {
				renderView();
			}
		});
	}
	function flush() { if (isWhiteboard()) scheduleRender(); }

	function applyCanvasSize() {
		let dpr = window.devicePixelRatio || 1;
		canvas.width = canvasW * dpr;
		canvas.height = canvasH * dpr;
		canvas.style.width = `${canvasW}px`;
		canvas.style.height = `${canvasH}px`;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		// pixel-art look: no smoothing, hard square edges. resizing the canvas resets the context, so these are re-applied here on every size change
		ctx.imageSmoothingEnabled = false;
		ctx.lineCap = 'butt';
		ctx.lineJoin = 'miter';
	}

	// point the world context at world coordinates: drawing at world px lands at the right buffer pixel. getImageData/putImageData still use raw buffer px, so go through these helpers (which convert world -> buffer coordinates).
	function applyWorldTransform() {
		worldCtx.setTransform(1, 0, 0, 1, -worldOX, -worldOY);
		worldCtx.imageSmoothingEnabled = false;
	}
	function wbGetImage(wx, wy, w, h) {
		return worldCtx.getImageData(wx - worldOX, wy - worldOY, w, h);
	}
	function wbPutImage(img, wx, wy) {
		worldCtx.putImageData(img, wx - worldOX, wy - worldOY);
	}
	// start a fresh, empty board with the camera at the origin
	function resetWorld() {
		tiles.clear();
		activeLive = false;
		worldOX = 0;
		worldOY = 0;
		world = document.createElement('canvas');
		world.width = Math.max(1, Math.round(canvasW));
		world.height = Math.max(1, Math.round(canvasH));
		worldCtx = world.getContext('2d');
		applyWorldTransform();
		zoom = 1;
		panX = 0;
		panY = 0;
		resetContentBounds();
	}
	// the active buffer is only ever as big as the area being worked on, so it has a natural ceiling (one screen, or one screen divided by the minimum zoom) and never needs a size budget of its own.
	let activeLive = false;
	// the world rect the active buffer currently owns: the area the operation in progress has touched. everywhere else the tiles are still the truth, which is why only this rect is written back and repainted.
	function activeOwnedRect() {
		if (!activeLive || opX2 <= opX1 || opY2 <= opY1) {
			return null;
		}
		let x1 = Math.max(worldOX, Math.floor(opX1));
		let y1 = Math.max(worldOY, Math.floor(opY1));
		let x2 = Math.min(worldOX + world.width, Math.ceil(opX2));
		let y2 = Math.min(worldOY + world.height, Math.ceil(opY2));
		if (x2 <= x1 || y2 <= y1) {
			return null;
		}
		return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
	}
	// fold the touched part of the active buffer back into the tile grid. `rect` overrides the touched area (undo and redo write a known region).
	function commitActive(rect) {
		if (!activeLive) {
			return;
		}
		// read the owned area before standing the buffer down — it depends on the buffer still being live
		let owned = rect || activeOwnedRect();
		activeLive = false;
		if (!owned) {
			return;
		}
		let x1 = Math.max(worldOX, owned.x), y1 = Math.max(worldOY, owned.y);
		let x2 = Math.min(worldOX + world.width, owned.x + owned.w);
		let y2 = Math.min(worldOY + world.height, owned.y + owned.h);
		if (x2 <= x1 || y2 <= y1) {
			return;
		}

		let region = document.createElement('canvas');
		region.width = x2 - x1;
		region.height = y2 - y1;
		let rc = region.getContext('2d');
		rc.imageSmoothingEnabled = false;
		rc.drawImage(world, x1 - worldOX, y1 - worldOY, x2 - x1, y2 - y1, 0, 0, x2 - x1, y2 - y1);
		stampIntoTiles(region, x1, y1, x2 - x1, y2 - y1);

		// erasing can empty a tile out entirely; reclaim those, but only when few enough were touched that the check stays cheap
		let range = tileRange(x1, y1, x2, y2);
		let touched = (range.tx2 - range.tx1 + 1) * (range.ty2 - range.ty1 + 1);
		if (touched <= 8) {
			for (let ty = range.ty1; ty <= range.ty2; ty++) {
				for (let tx = range.tx1; tx <= range.tx2; tx++) {
					pruneTile(tx, ty);
				}
			}
		}
	}
	// make the active buffer cover the world rectangle [x1,x2]x[y1,y2], seeded from the tiles underneath. anything previously active is committed first.
	function ensureWorldCovers(x1, y1, x2, y2) {
		x1 = Math.floor(x1); y1 = Math.floor(y1); x2 = Math.ceil(x2); y2 = Math.ceil(y2);
		if (activeLive && x1 >= worldOX && y1 >= worldOY && x2 <= worldOX + world.width && y2 <= worldOY + world.height) {
			return;
		}
		commitActive();

		let pad = 200;
		let nx1 = x1 - pad, ny1 = y1 - pad, nx2 = x2 + pad, ny2 = y2 + pad;
		let needW = Math.max(1, nx2 - nx1), needH = Math.max(1, ny2 - ny1);

		// consecutive operations without a pan need the same size buffer, so reuse it rather than allocating one per stroke
		let nw, nc;
		if (world.width == needW && world.height == needH) {
			nw = world;
			nc = worldCtx;
			nc.setTransform(1, 0, 0, 1, 0, 0);
			nc.clearRect(0, 0, needW, needH);
		} else {
			nw = document.createElement('canvas');
			nw.width = needW;
			nw.height = needH;
			nc = nw.getContext('2d');
		}
		nc.imageSmoothingEnabled = false;

		// seed from the tiles this rectangle overlaps, so erasing and reading back see what is already on the board. the tiles are left as they are: only the area the operation actually touches is written back.
		let range = tileRange(nx1, ny1, nx1 + nw.width, ny1 + nw.height);
		for (let ty = range.ty1; ty <= range.ty2; ty++) {
			for (let tx = range.tx1; tx <= range.tx2; tx++) {
				let tile = tiles.get(tileKey(tx, ty));
				if (tile) {
					nc.drawImage(tile, tx * TILE - nx1, ty * TILE - ny1);
				}
			}
		}
		world = nw;
		worldCtx = nc;
		worldOX = nx1;
		worldOY = ny1;
		activeLive = true;
		applyWorldTransform();
	}
	// the visible world region (world px)
	function visibleWorldRect() {
		let x = Math.floor(panX);
		let y = Math.floor(panY);
		let x2 = Math.ceil(panX + canvasW / zoom);
		let y2 = Math.ceil(panY + canvasH / zoom);
		return { x: x, y: y, w: Math.max(1, x2 - x), h: Math.max(1, y2 - y) };
	}
	// the canvas is effectively infinite, but keep the camera within a large bounded box so you can't pan off into nowhere and get lost
	function clampPan() {
		panX = Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, panX));
		panY = Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, panY));
	}
	// render the camera view: off-white everywhere, with the world content blitted on top (nearest-neighbour, so crisp). no borders, no bounds — it's infinite.
	function renderView() {
		let dpr = window.devicePixelRatio || 1;
		let scale = zoom * dpr;
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.imageSmoothingEnabled = false;
		ctx.fillStyle = offWhiteCol;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// blit whichever surface holds each part of the view: the committed tiles, then the active buffer over the area it has taken ownership of.
		// both the source and destination rectangles are snapped to whole pixels. two tiles share an edge in world space, and rounding that edge the same way for each means one starts exactly where the other stops — otherwise they land on fractional device pixels and a hairline of the background shows between them, which is very visible once an area has been filled with a solid color.
		let vx1 = Math.floor(panX), vy1 = Math.floor(panY);
		let vx2 = Math.ceil(panX + canvasW / zoom), vy2 = Math.ceil(panY + canvasH / zoom);
		let deviceX = (wx) => Math.round((wx - panX) * scale);
		let deviceY = (wy) => Math.round((wy - panY) * scale);
		let blit = (source, ox, oy, sw, sh) => {
			let sx0 = Math.max(ox, vx1), sy0 = Math.max(oy, vy1);
			let sx1 = Math.min(ox + sw, vx2), sy1 = Math.min(oy + sh, vy2);
			if (sx1 <= sx0 || sy1 <= sy0) {
				return;
			}
			let dx0 = deviceX(sx0), dy0 = deviceY(sy0);
			let dx1 = deviceX(sx1), dy1 = deviceY(sy1);
			if (dx1 <= dx0 || dy1 <= dy0) {
				return;
			}
			ctx.drawImage(source,
				sx0 - ox, sy0 - oy, sx1 - sx0, sy1 - sy0,
				dx0, dy0, dx1 - dx0, dy1 - dy0);
		};
		let range = tileRange(vx1, vy1, vx2, vy2);
		for (let ty = range.ty1; ty <= range.ty2; ty++) {
			for (let tx = range.tx1; tx <= range.tx2; tx++) {
				let tile = tiles.get(tileKey(tx, ty));
				if (tile) {
					blit(tile, tx * TILE, ty * TILE, TILE, TILE);
				}
			}
		}
		// repaint the area the in-progress operation owns straight from the active buffer. it's cleared to the page color first so that erasing shows through instead of revealing the tile underneath.
		let owned = activeOwnedRect();
		if (owned) {
			let ox0 = Math.max(owned.x, vx1), oy0 = Math.max(owned.y, vy1);
			let ox1 = Math.min(owned.x + owned.w, vx2), oy1 = Math.min(owned.y + owned.h, vy2);
			if (ox1 > ox0 && oy1 > oy0) {
				let dx0 = deviceX(ox0), dy0 = deviceY(oy0);
				let dx1 = deviceX(ox1), dy1 = deviceY(oy1);
				if (dx1 > dx0 && dy1 > dy0) {
					ctx.fillRect(dx0, dy0, dx1 - dx0, dy1 - dy0);
					ctx.drawImage(world,
						ox0 - worldOX, oy0 - worldOY, ox1 - ox0, oy1 - oy0,
						dx0, dy0, dx1 - dx0, dy1 - dy0);
				}
			}
		}
		ctx.restore();
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.imageSmoothingEnabled = false;
	}
	// re-place (and re-scale) every text box for the current camera + zoom
	function repositionTexts() {
		for (let t of texts) {
			t.style.left = `${((parseFloat(t.dataset.wx) || 0) - panX) * zoom}px`;
			t.style.top = `${((parseFloat(t.dataset.wy) || 0) - panY) * zoom}px`;
			t.style.transformOrigin = '0 0';
			t.style.transform = zoom == 1 ? '' : `scale(${zoom})`;
		}
	}
	// record a text box's world position from its current on-screen position
	function syncTextWorld(el) {
		el.dataset.wx = panX + (parseFloat(el.style.left) || 0) / zoom;
		el.dataset.wy = panY + (parseFloat(el.style.top) || 0) / zoom;
	}
	// scale a single text box to the current zoom (its left/top are screen px)
	function applyTextZoom(el) {
		el.style.transformOrigin = '0 0';
		el.style.transform = zoom == 1 ? '' : `scale(${zoom})`;
	}

	// undo/redo history: each entry snapshots both the canvas and the text boxes, and `restoring` suppresses history writes while we rebuild that state
	// grey out undo/redo when there is nothing left to step to
	let restoring = false;
	function updateHistoryButtons() {
		let undoBtn = drawToolbar.querySelector('.presentation-draw-undo');
		let redoBtn = drawToolbar.querySelector('.presentation-draw-redo');
		undoBtn.dataset.disabled = historyIndex > 0 ? 0 : 1;
		redoBtn.dataset.disabled = historyIndex < history.length - 1 ? 0 : 1;
	}
	// at the start of a drawing op we copy the visible world into a scratch canvas (a fast GPU drawImage, NOT a getImageData readback), so undo can later pull just the changed sub-region out of it cheaply.
	let opBefore = null;
	let opScratch = document.createElement('canvas');
	let opScratchCtx = opScratch.getContext('2d');
	function beginOp() {
		resetOpDirty();
		opBefore = null;
		if (isWhiteboard()) {
			let r = visibleWorldRect();
			// make sure the whole visible region exists in the buffer before the stroke, so it never has to grow (and shift) mid-operation
			ensureWorldCovers(r.x, r.y, r.x + r.w, r.y + r.h);
			opScratch.width = r.w;
			opScratch.height = r.h;
			opScratchCtx.imageSmoothingEnabled = false;
			opScratchCtx.drawImage(world, r.x - worldOX, r.y - worldOY, r.w, r.h, 0, 0, r.w, r.h);
			opBefore = { x: r.x, y: r.y, w: r.w, h: r.h };
		}
	}
	// the world-px region touched by the current operation, clamped to the snapshot we captured at the start. null if nothing was drawn.
	function opDirtyRegion() {
		if (opX2 <= opX1 || opY2 <= opY1 || !opBefore) {
			return null;
		}
		let x = Math.max(Math.floor(opX1), opBefore.x);
		let y = Math.max(Math.floor(opY1), opBefore.y);
		let x2 = Math.min(Math.ceil(opX2), opBefore.x + opBefore.w);
		let y2 = Math.min(Math.ceil(opY2), opBefore.y + opBefore.h);
		if (x2 <= x || y2 <= y) {
			return null;
		}
		return { x: x, y: y, w: x2 - x, h: y2 - y };
	}
	// extract the region's "before" pixels out of the op-start scratch canvas
	function beforeSub(region) {
		return opScratchCtx.getImageData(region.x - opBefore.x, region.y - opBefore.y, region.w, region.h);
	}
	// capture a compact undo step for the whiteboard: before/after pixels of just the changed region (no full-world PNG encode), plus camera and text state.
	function captureDelta() {
		let region = opDirtyRegion();
		let before = null, after = null;
		if (region) {
			before = beforeSub(region);
			after = wbGetImage(region.x, region.y, region.w, region.h);
		}
		// fold what was drawn back down into the tiles before the op bounds are cleared — they tell the commit exactly which area to write
		commitActive();
		resetOpDirty();
		opBefore = null;
		return { region: region, before: before, after: after, panX: panX, panY: panY, zoom: zoom, texts: serializeTexts() };
	}
	function pushEntry(entry) {
		history = history.slice(0, historyIndex + 1);
		history.push(entry);
		if (history.length > 60) {
			history.shift();
		}
		historyIndex = history.length - 1;
		updateHistoryButtons();
	}
	function resetHistory() {
		resetOpDirty();
		if (drawLayer.dataset.mode == 'whiteboard') {
			// sentinel: initial state (world already loaded); no raster delta
			history = [{ region: null, before: null, after: null, panX: panX, panY: panY, zoom: zoom, texts: serializeTexts() }];
		} else {
			history = [{ screen: true, img: canvas.toDataURL(), texts: serializeTexts() }];
		}
		historyIndex = 0;
		updateHistoryButtons();
	}
	function pushHistory() {
		if (restoring) {
			return;
		}
		if (drawLayer.dataset.mode == 'whiteboard') {
			let entry = captureDelta();
			let prev = history[historyIndex];
			// nothing changed? (no raster region, same camera + text) — skip
			if (!entry.region && prev &&
				prev.panX === entry.panX && prev.panY === entry.panY && prev.zoom === entry.zoom &&
				JSON.stringify(prev.texts) === JSON.stringify(entry.texts)) {
				return;
			}
			pushEntry(entry);
		} else {
			let entry = { screen: true, img: canvas.toDataURL(), texts: serializeTexts() };
			let prev = history[historyIndex];
			if (prev && prev.img === entry.img && JSON.stringify(prev.texts) === JSON.stringify(entry.texts)) {
				return;
			}
			pushEntry(entry);
		}
	}
	// restore the camera + text state of a history entry (raster is applied separately via the region deltas)
	function applyEntryMeta(entry) {
		restoring = true;
		clearTexts();
		if (entry.screen) {
			restoreTexts(entry.texts);
			restoring = false;
			return;
		}
		panX = entry.panX;
		panY = entry.panY;
		zoom = entry.zoom || 1;
		restoreTexts(entry.texts);
		restoring = false;
	}
	function undo() {
		if (historyIndex <= 0) {
			return;
		}
		let entry = history[historyIndex];
		let dpr = window.devicePixelRatio || 1;
		if (entry.screen) {
			// annotate: redraw the previous screen image
			historyIndex--;
			let prev = history[historyIndex];
			applyEntryMeta(prev);
			let img = new Image();
			img.onload = () => {
				ctx.clearRect(0, 0, canvasW, canvasH);
				ctx.drawImage(img, 0, 0, img.width / dpr, img.height / dpr);
			};
			img.src = prev.img;
			updateHistoryButtons();
			return;
		}
		// whiteboard: revert this step's raster change, then re-render the view
		if (entry.region && entry.beforeCanvas) {
			// undoing a clear: stamp the snapshot straight back into the tiles (it can be far larger than one active buffer)
			let r = entry.region;
			commitActive();
			stampIntoTiles(entry.beforeCanvas, r.x, r.y, r.w, r.h);
			markContent(r.x, r.y, r.w, r.h);
		} else if (entry.region && entry.before) {
			ensureWorldCovers(entry.region.x, entry.region.y, entry.region.x + entry.region.w, entry.region.y + entry.region.h);
			wbPutImage(entry.before, entry.region.x, entry.region.y);
			markContent(entry.region.x, entry.region.y, entry.region.w, entry.region.h);
			commitActive(entry.region);
		}
		historyIndex--;
		applyEntryMeta(history[historyIndex]);
		renderView();
		updateHistoryButtons();
	}
	function redo() {
		if (historyIndex >= history.length - 1) {
			return;
		}
		historyIndex++;
		let entry = history[historyIndex];
		let dpr = window.devicePixelRatio || 1;
		if (entry.screen) {
			applyEntryMeta(entry);
			let img = new Image();
			img.onload = () => {
				ctx.clearRect(0, 0, canvasW, canvasH);
				ctx.drawImage(img, 0, 0, img.width / dpr, img.height / dpr);
			};
			img.src = entry.img;
			updateHistoryButtons();
			return;
		}
		if (entry.cleared) {
			// redoing a clear wipes the buffer again rather than stamping a blank image over it, so the memory goes back too
			clearTexts();
			resetWorld();
		} else if (entry.region && entry.after) {
			ensureWorldCovers(entry.region.x, entry.region.y, entry.region.x + entry.region.w, entry.region.y + entry.region.h);
			wbPutImage(entry.after, entry.region.x, entry.region.y);
			markContent(entry.region.x, entry.region.y, entry.region.w, entry.region.h);
			commitActive(entry.region);
		}
		applyEntryMeta(entry);
		renderView();
		updateHistoryButtons();
	}

	// --- text tool --------------------------------------------------------- Each text box is an editable DOM element layered over the canvas. it can be re-selected to edit, dragged to move, and is dropped when left empty.
	function currentTextSize() {
		return drawSize * textSizeFactor;
	}
	// mark one box as the selected/active one (drives the bounding box outline)
	function selectText(el) {
		for (let t of texts) {
			if (t != el) {
				delete t.dataset.selected;
			}
		}
		if (el) {
			el.dataset.selected = 1;
		}
		activeText = el;
	}
	// put the caret where the user clicked inside a text box
	function placeCaretAtPoint(el, x, y) {
		let range = null;
		if (document.caretRangeFromPoint) {
			range = document.caretRangeFromPoint(x, y);
		} else if (document.caretPositionFromPoint) {
			let pos = document.caretPositionFromPoint(x, y);
			if (pos) {
				range = document.createRange();
				range.setStart(pos.offsetNode, pos.offset);
			}
		}
		el.focus();
		if (range) {
			range.collapse(true);
			let sel = window.getSelection();
			sel.removeAllRanges();
			sel.addRange(range);
		}
	}
	function wireTextBox(el) {
		el.addEventListener('focus', () => { selectText(el); });
		// finishing an edit (blur) records the change on the undo stack
		el.addEventListener('blur', () => {
			if (restoring || !drawLayer.dataset.mode) {
				return;
			}
			pushHistory();
		});
		el.addEventListener('pointerdown', (e) => {
			if (tool != 'text') {
				return;
			}
			// clicking a box shouldn't also create a new one underneath it
			e.stopPropagation();
			// if this box is already being edited, let the browser handle the click natively so the caret lands where clicked and text can be selected within it
			if (document.activeElement == el) {
				return;
			}
			// selecting an existing box (by click or drag): move the selection box to it, blur any box being edited, and sync the toolbar
			if (document.activeElement &&
				document.activeElement != el &&
				document.activeElement.classList &&
				document.activeElement.classList.contains('presentation-draw-textbox')) {
				document.activeElement.blur();
			}
			// drop any other empty boxes left behind (keep the one being selected)
			removeEmptyTexts(el);
			selectText(el);
			syncToolbarToText(el);
			// otherwise this press either drags the box or focuses it. suppress the native focus so we can tell a click from a drag
			e.preventDefault();
			let startX = e.clientX;
			let startY = e.clientY;
			let origLeft = parseFloat(el.style.left) || 0;
			let origTop = parseFloat(el.style.top) || 0;
			let moved = false;
			el.setPointerCapture(e.pointerId);
			function onMove(ev) {
				let dx = ev.clientX - startX;
				let dy = ev.clientY - startY;
				if (!moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
					moved = true;
					el.dataset.dragging = 1;
					// alt/Option-drag leaves a duplicate behind at the start spot
					if (ev.altKey) {
						cloneTextBox(el, origLeft, origTop);
					}
				}
				if (moved) {
					el.style.left = `${origLeft + dx}px`;
					el.style.top = `${origTop + dy}px`;
				}
			}
			function onUp(ev) {
				el.removeEventListener('pointermove', onMove);
				el.removeEventListener('pointerup', onUp);
				try { el.releasePointerCapture(ev.pointerId); } catch (err) {}
				if (moved) {
					delete el.dataset.dragging;
					// record the box's new world position after the move
					syncTextWorld(el);
					// a drag only moves/duplicates: don't leave the box focused or selected, so keys afterward don't type into or restyle it
					el.blur();
					selectText(null);
					// moving a box is an undoable change
					pushHistory();
				} else {
					// a plain click: edit this box, caret at the click point
					placeCaretAtPoint(el, ev.clientX, ev.clientY);
					selectText(el);
				}
			}
			el.addEventListener('pointermove', onMove);
			el.addEventListener('pointerup', onUp);
		});
	}
	// editable, without browser spell check / auto-correct / auto-capitalize
	function applyTextBoxAttrs(el) {
		el.contentEditable = 'true';
		el.spellcheck = false;
		el.setAttribute('autocapitalize', 'off');
		el.setAttribute('autocorrect', 'off');
	}
	// the chosen color is the box's background; the text is the readable contrast — only the two dark backgrounds get light ink, everything else (primaries, off-white, light-gray) gets off-black ink
	function textInkFor(colorName) {
		if (colorName == 'off-black' || colorName == 'dark-gray') {
			return resolveColor('off-white');
		}
		return resolveColor('off-black');
	}
	function applyTextColors(el, colorName) {
		el.style.backgroundColor = resolveColor(colorName);
		el.style.color = textInkFor(colorName);
		el.dataset.color = colorName;
	}
	// x, y are DRAW coords (world px on the whiteboard). the box stores its world position (wx/wy) and is placed on screen via the camera, so it lands under the cursor and tracks panning/zooming.
	function makeTextBox(x, y) {
		let el = document.createElement('div');
		el.className = 'presentation-draw-textbox';
		applyTextBoxAttrs(el);
		let size = currentTextSize();
		let wxBox = x;
		// vertically center the first line on the click point (not top-aligned)
		let wyBox = y - size * 1.2 / 2;
		el.dataset.wx = wxBox;
		el.dataset.wy = wyBox;
		el.style.left = `${(wxBox - panX) * zoom}px`;
		el.style.top = `${(wyBox - panY) * zoom}px`;
		el.style.fontSize = `${size}px`;
		applyTextColors(el, drawColorName);
		el.dataset.size = drawSize;
		textLayer.appendChild(el);
		applyTextZoom(el);
		wireTextBox(el);
		texts.push(el);
		return el;
	}
	// duplicate an existing text box (same text, color, size) at a position
	function cloneTextBox(src, left, top) {
		let el = document.createElement('div');
		el.className = 'presentation-draw-textbox';
		applyTextBoxAttrs(el);
		el.style.left = `${left}px`;
		el.style.top = `${top}px`;
		el.style.fontSize = src.style.fontSize;
		applyTextColors(el, src.dataset.color || 'off-black');
		el.dataset.size = src.dataset.size;
		el.innerText = src.innerText;
		textLayer.appendChild(el);
		syncTextWorld(el);
		applyTextZoom(el);
		wireTextBox(el);
		texts.push(el);
		return el;
	}
	function removeEmptyTexts(keep) {
		texts = texts.filter(t => {
			if (t !== keep && t.textContent.trim() === '') {
				t.remove();
				return false;
			}
			return true;
		});
		if (activeText && !activeText.isConnected) {
			activeText = null;
		}
	}
	function clearTexts() {
		texts.forEach(t => t.remove());
		texts = [];
		activeText = null;
	}
	// serialize/restore the text boxes so whiteboard type stays editable after closing and reopening the drawing screen
	function serializeTexts() {
		// store world coordinates (wx/wy) so text stays put across pans/reloads
		return texts
			.filter(t => t.textContent.trim() !== '')
			.map(t => ({
				text: t.innerText,
				wx: parseFloat(t.dataset.wx) || 0,
				wy: parseFloat(t.dataset.wy) || 0,
				fontSize: t.style.fontSize,
				color: t.dataset.color,
				size: t.dataset.size
			}));
	}
	function restoreTexts(data) {
		for (let d of data) {
			let el = document.createElement('div');
			el.className = 'presentation-draw-textbox';
			applyTextBoxAttrs(el);
			// legacy entries stored screen left/top; treat those as world coords
			let wx = d.wx != null ? d.wx : (d.left || 0);
			let wy = d.wy != null ? d.wy : (d.top || 0);
			el.dataset.wx = wx;
			el.dataset.wy = wy;
			el.style.left = `${(wx - panX) * zoom}px`;
			el.style.top = `${(wy - panY) * zoom}px`;
			el.style.fontSize = d.fontSize;
			applyTextColors(el, d.color || 'off-black');
			if (d.size) {
				el.dataset.size = d.size;
			}
			el.innerText = d.text;
			textLayer.appendChild(el);
			applyTextZoom(el);
			wireTextBox(el);
			texts.push(el);
		}
	}
	// reflect a text box's color/size in the toolbar's active selections
	function syncToolbarToText(el) {
		let cname = el.dataset.color;
		if (cname) {
			drawColorName = cname;
			drawColor = resolveColor(cname);
			colorButtons.forEach(b => b.dataset.active = b.dataset.color == cname ? 1 : 0);
		}
		let sz = el.dataset.size;
		if (sz) {
			drawSize = parseInt(sz);
			sizeButtons.forEach(b => b.dataset.active = b.dataset.size == sz ? 1 : 0);
		}
	}
	// keep focus in the active text box when a click on the empty canvas would otherwise steal it, so a freshly made box is immediately typeable
	textLayer.addEventListener('mousedown', (e) => {
		if (tool == 'text' && e.target == textLayer) {
			e.preventDefault();
		}
	});
	// click on empty space (text tool active) to start a new text box
	textLayer.addEventListener('pointerdown', (e) => {
		if (tool != 'text' || e.target != textLayer) {
			return;
		}
		removeEmptyTexts();
		let el = makeTextBox(evX(e), evY(e));
		el.focus();
		selectText(el);
	});

	function enterDraw(mode) {
		drawLayer.dataset.mode = mode;
		// mirrored on the body because the toolbar lives there now (see below)
		document.body.dataset.draw = mode;
		overlay.dataset.drawing = 1;
		// always start a drawing session on the pencil
		setTool('pen');
		// the canvas is always exactly screen-sized. the whiteboard pans an infinite offscreen "world" beneath it; annotation is just the viewport.
		canvasW = window.innerWidth;
		canvasH = window.innerHeight;
		applyCanvasSize();
		updateCanvasOffset();
		if (mode == 'whiteboard') {
			resetWorld();
			// restore the persisted drawing (a crop) + camera, if any
			if (whiteboardImage) {
				panX = whiteboardPanX;
				panY = whiteboardPanY;
				zoom = whiteboardZoom || 1;
				let img = new Image();
				img.onload = () => {
					// straight into the tiles: a restored board can be far larger than a single active buffer
					stampIntoTiles(img, whiteboardCropX, whiteboardCropY, img.width, img.height);
					markContent(whiteboardCropX, whiteboardCropY, img.width, img.height);
					renderView();
					restoreTexts(whiteboardTexts);
					resetHistory();
				};
				img.src = whiteboardImage;
			} else {
				renderView();
				restoreTexts(whiteboardTexts);
				resetHistory();
			}
		} else {
			// annotate is a plain, unzoomable viewport
			zoom = 1;
			panX = 0;
			panY = 0;
			resetHistory();
		}
	}

	// render every text box onto a canvas context (expects CSS-pixel coords, i.e. a context whose transform already accounts for devicePixelRatio)
	function drawTextsOnto(targetCtx, offX, offY) {
		offX = offX || 0;
		offY = offY || 0;
		// positioned by baseline rather than by the top of the em box: CSS puts the baseline at (half-leading + ascent) below the content top, and the ascent is a font metric, not something derivable from the size.
		targetCtx.textBaseline = 'alphabetic';
		for (let t of texts) {
			let content = t.innerText;
			if (!content.trim()) {
				continue;
			}
			let size = parseFloat(t.style.fontSize) || currentTextSize();
			// text boxes are positioned in world coordinates (wx/wy)
			let left = (parseFloat(t.dataset.wx) || 0) - offX;
			let top = (parseFloat(t.dataset.wy) || 0) - offY;
			let cs = getComputedStyle(t);
			let padL = parseFloat(cs.paddingLeft) || 0;
			let padT = parseFloat(cs.paddingTop) || 0;
			// the colored background block behind the text
			if (t.style.backgroundColor) {
				targetCtx.fillStyle = t.style.backgroundColor;
				targetCtx.fillRect(left, top, t.offsetWidth, t.offsetHeight);
			}
			targetCtx.fillStyle = t.style.color || offBlack;
			targetCtx.font = `600 ${size}px "Limkin", sans-serif`;
			let lineH = size * 1.2;
			let halfLeading = (lineH - size) / 2;
			let metrics = targetCtx.measureText('M');
			let ascent = metrics.fontBoundingBoxAscent || size * 0.8;
			let baseline = top + padT + halfLeading + ascent;
			content.split('\n').forEach((line, i) => {
				targetCtx.fillText(line, left + padL, baseline + i * lineH);
			});
		}
	}
	// bounding box (in world CSS px) of everything drawn — the raster buffer's non-transparent pixels plus the text boxes. `src` is the pixel source (the world buffer for the whiteboard, the screen canvas for annotate) and (srcOX, srcOY) is the world coord at that source's pixel (0,0).
	function drawnBounds(src, srcOX, srcOY) {
		let dpr = window.devicePixelRatio || 1;
		let sctx = src.getContext('2d');
		let d = sctx.getImageData(0, 0, src.width, src.height).data;
		let cw = src.width, ch = src.height;
		let minX = cw, minY = ch, maxX = -1, maxY = -1;
		for (let y = 0; y < ch; y++) {
			let row = y * cw * 4;
			for (let x = 0; x < cw; x++) {
				if (d[row + x * 4 + 3] !== 0) {
					if (x < minX) minX = x;
					if (x > maxX) maxX = x;
					if (y < minY) minY = y;
					if (y > maxY) maxY = y;
				}
			}
		}
		let x1 = maxX >= 0 ? srcOX + minX / dpr : Infinity;
		let y1 = maxY >= 0 ? srcOY + minY / dpr : Infinity;
		let x2 = maxX >= 0 ? srcOX + (maxX + 1) / dpr : -Infinity;
		let y2 = maxY >= 0 ? srcOY + (maxY + 1) / dpr : -Infinity;
		for (let t of texts) {
			if (!t.innerText.trim()) {
				continue;
			}
			let l = parseFloat(t.dataset.wx) || 0;
			let tp = parseFloat(t.dataset.wy) || 0;
			x1 = Math.min(x1, l);
			y1 = Math.min(y1, tp);
			x2 = Math.max(x2, l + t.offsetWidth);
			y2 = Math.max(y2, tp + t.offsetHeight);
		}
		if (!isFinite(x1)) {
			return null;
		}
		let pad = 12;
		x1 -= pad;
		y1 -= pad;
		x2 += pad;
		y2 += pad;
		return { x: x1, y: y1, w: Math.max(1, x2 - x1), h: Math.max(1, y2 - y1) };
	}

	function exitDraw() {
		// drop any half-drawn line so its preview isn't baked into the save
		cancelLine();
		brush.style.display = 'none';
		if (drawLayer.dataset.mode == 'whiteboard') {
			// keep the text as editable boxes (not baked in) so it can still be edited after closing and reopening the whiteboard
			removeEmptyTexts();
			captureWhiteboard();
			saveWhiteboard();
		}
		// clear the mode first so blurring the text boxes doesn't push history
		drawLayer.dataset.mode = '';
		delete document.body.dataset.draw;
		overlay.dataset.drawing = 0;
		clearTexts();
		ctx.clearRect(0, 0, canvasW, canvasH);
	}

	function clearDrawing() {
		lineStart = null;
		lineBase = null;
		if (drawLayer.dataset.mode == 'whiteboard') {
			// record the drawn area as one undo step, then wipe it and recenter. the buffer is thrown away rather than just blanked — keeping a large one alive meant clearing didn't shake off the slowdown that drawing far from the origin had introduced.
			let b = contentRect();
			if (b) {
				// snapshot to a canvas rather than ImageData: it's a plain blit instead of a pixel readback, so clearing stays undoable however much has been drawn
				let snapshot = document.createElement('canvas');
				snapshot.width = b.w;
				snapshot.height = b.h;
				let snapshotCtx = snapshot.getContext('2d');
				snapshotCtx.imageSmoothingEnabled = false;
				compositeWorld(snapshotCtx, b.x, b.y, b.w, b.h);
				clearTexts();
				resetWorld();
				renderView();
				pushEntry({ region: b, beforeCanvas: snapshot, cleared: true, panX: panX, panY: panY, zoom: zoom, texts: [] });
			} else {
				clearTexts();
				renderView();
				pushHistory();
			}
		} else {
			ctx.clearRect(0, 0, canvasW, canvasH);
			clearTexts();
			pushHistory();
		}
		whiteboardImage = null;
		whiteboardCropX = 0;
		whiteboardCropY = 0;
		whiteboardPanX = 0;
		whiteboardPanY = 0;
		whiteboardZoom = 1;
		whiteboardTexts = [];
		saveWhiteboard();
	}

	// download the current drawing as a PNG, cropped to just the drawn area
	function saveDrawing() {
		let dpr = window.devicePixelRatio || 1;
		let out = document.createElement('canvas');
		let outCtx;
		if (drawLayer.dataset.mode == 'whiteboard') {
			// union the drawn-content bounds with the text boxes (world px)
			let cr = contentRect();
			let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
			if (cr) { x1 = cr.x; y1 = cr.y; x2 = cr.x + cr.w; y2 = cr.y + cr.h; }
			for (let t of texts) {
				if (!t.innerText.trim()) { continue; }
				let l = parseFloat(t.dataset.wx) || 0, tp = parseFloat(t.dataset.wy) || 0;
				x1 = Math.min(x1, l); y1 = Math.min(y1, tp);
				x2 = Math.max(x2, l + t.offsetWidth); y2 = Math.max(y2, tp + t.offsetHeight);
			}
			if (!isFinite(x1)) { x1 = panX; y1 = panY; x2 = panX + canvasW / zoom; y2 = panY + canvasH / zoom; }
			let pad = 12;
			x1 = x1 - pad; y1 = y1 - pad;
			x2 = x2 + pad; y2 = y2 + pad;
			let w = Math.max(1, Math.round(x2 - x1)), h = Math.max(1, Math.round(y2 - y1));
			out.width = w; out.height = h;
			outCtx = out.getContext('2d');
			outCtx.imageSmoothingEnabled = false;
			outCtx.fillStyle = resolveColor('off-white');
			outCtx.fillRect(0, 0, w, h);
			compositeWorld(outCtx, x1, y1, w, h);
			drawTextsOnto(outCtx, x1, y1);
		} else {
			// annotate: crop the screen canvas to its drawn bounds
			let b = drawnBounds(canvas, 0, 0) || { x: 0, y: 0, w: canvasW, h: canvasH };
			out.width = Math.round(b.w * dpr);
			out.height = Math.round(b.h * dpr);
			outCtx = out.getContext('2d');
			outCtx.imageSmoothingEnabled = false;
			outCtx.drawImage(canvas,
				Math.round(b.x * dpr), Math.round(b.y * dpr), out.width, out.height,
				0, 0, out.width, out.height);
			outCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
			outCtx.imageSmoothingEnabled = false;
			drawTextsOnto(outCtx, b.x, b.y);
		}
		let link = document.createElement('a');
		link.download = buildSaveName();
		link.href = out.toDataURL('image/png');
		link.click();
	}

	// filename: yy_mm_dd-course_name_version-resource_name-NN.png (all lowercase)
	function buildSaveName() {
		let slug = (str) => (str || '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '_')
			.replace(/^_+|_+$/g, '');
		let now = new Date();
		let pad = (n) => String(n).padStart(2, '0');
		let date = `${pad(now.getFullYear() % 100)}_${pad(now.getMonth() + 1)}_${pad(now.getDate())}`;
		// course name + version and resource name, pulled from the page
		let titleEl = document.querySelector('.resource-menu-header-title');
		let full = titleEl ? titleEl.textContent.trim().replace(/\s+/g, ' ') : '';
		let versionEl = titleEl ? titleEl.querySelector('.resource-menu-header-version') : null;
		let version = versionEl ? versionEl.textContent.trim() : '';
		let course = version ? full.slice(0, full.length - version.length).trim() : full;
		let resourceEl = document.querySelector(`.resource-menu-link[href="${window.location.pathname}"] .resource-menu-link-heading`);
		let resource = resourceEl ? resourceEl.textContent.trim() : '';
		saveCount++;
		let parts = [date, slug(`${course} ${version}`), slug(resource), pad(saveCount)];
		return `${parts.join('-')}.png`;
	}

	// on resize, keep the canvas exactly screen-sized. the whiteboard just re-renders the camera view at the new size; annotation grows the canvas (grows only, so nothing is lost) and redraws.
	window.addEventListener('resize', () => {
		if (!drawLayer.dataset.mode) {
			return;
		}
		if (drawLayer.dataset.mode == 'whiteboard') {
			canvasW = window.innerWidth;
			canvasH = window.innerHeight;
			applyCanvasSize();
			updateCanvasOffset();
			renderView();
			repositionTexts();
			return;
		}
		let newW = Math.max(canvasW, window.innerWidth);
		let newH = Math.max(canvasH, window.innerHeight);
		if (newW == canvasW && newH == canvasH) {
			return;
		}
		let src = canvas.toDataURL();
		let oldW = canvasW;
		let oldH = canvasH;
		canvasW = newW;
		canvasH = newH;
		applyCanvasSize();
		let img = new Image();
		img.onload = () => ctx.drawImage(img, 0, 0, oldW, oldH);
		img.src = src;
	});

	// flood fill for the paint bucket tool
	function colorToRGBA(color) {
		let c = document.createElement('canvas');
		c.width = 1;
		c.height = 1;
		let cx = c.getContext('2d');
		cx.fillStyle = color;
		cx.fillRect(0, 0, 1, 1);
		return cx.getImageData(0, 0, 1, 1).data;
	}
	// flood the given ImageData from (startX,startY); returns true if it changed
	function floodImage(imageData, w, h, startX, startY, color) {
		let data = imageData.data;
		let fill = colorToRGBA(color);
		let start = (startY * w + startX) * 4;
		let target = [data[start], data[start + 1], data[start + 2], data[start + 3]];
		if (target[0] == fill[0] && target[1] == fill[1] && target[2] == fill[2] && target[3] == fill[3]) {
			return false;
		}
		let tolerance = 48;
		function matches(p) {
			let i = p * 4;
			return Math.abs(data[i] - target[0]) <= tolerance &&
				Math.abs(data[i + 1] - target[1]) <= tolerance &&
				Math.abs(data[i + 2] - target[2]) <= tolerance &&
				Math.abs(data[i + 3] - target[3]) <= tolerance;
		}

		// filled a span at a time rather than a pixel at a time.
		// pushing all four neighbours of every pixel grew the stack to roughly two and a half times the pixel count — twelve million entries for a full-screen fill on a retina display, hundreds of megabytes of array, which is what was taking the tab down. here the stack only ever holds seed points for rows still to do, and the mask guarantees each pixel is visited once.
		let seen = new Uint8Array(w * h);
		let stack = [startY * w + startX];
		let filled = false;
		while (stack.length) {
			let p = stack.pop();
			let y = Math.floor(p / w);
			let x = p - y * w;
			// back up to the start of this run
			while (x > 0 && !seen[p - 1] && matches(p - 1)) {
				p--;
				x--;
			}
			// then run right, seeding the rows above and below as their own runs open up
			let spanUp = false;
			let spanDown = false;
			while (x < w && !seen[p] && matches(p)) {
				seen[p] = 1;
				let i = p * 4;
				data[i] = fill[0];
				data[i + 1] = fill[1];
				data[i + 2] = fill[2];
				data[i + 3] = fill[3];
				filled = true;
				if (y > 0) {
					let up = p - w;
					if (!seen[up] && matches(up)) {
						if (!spanUp) {
							stack.push(up);
							spanUp = true;
						}
					} else {
						spanUp = false;
					}
				}
				if (y < h - 1) {
					let down = p + w;
					if (!seen[down] && matches(down)) {
						if (!spanDown) {
							stack.push(down);
							spanDown = true;
						}
					} else {
						spanDown = false;
					}
				}
				p++;
				x++;
			}
		}
		return filled;
	}
	// paint bucket: bounded to the visible screen region so it never floods the whole (mostly off-screen) world. x,y are draw coords.
	function floodFill(x, y, color) {
		if (isWhiteboard()) {
			let r = visibleWorldRect();
			if (r.w <= 0 || r.h <= 0) {
				return;
			}
			ensureWorldCovers(r.x, r.y, r.x + r.w, r.y + r.h);
			let sx = Math.floor(x) - r.x, sy = Math.floor(y) - r.y;
			if (sx < 0 || sx >= r.w || sy < 0 || sy >= r.h) {
				return;
			}
			let imageData = wbGetImage(r.x, r.y, r.w, r.h);
			if (floodImage(imageData, r.w, r.h, sx, sy, color)) {
				wbPutImage(imageData, r.x, r.y);
				markOpDirty(r.x, r.y, r.w, r.h);
				flush();
			}
			return;
		}
		let dpr = window.devicePixelRatio || 1;
		let w = canvas.width, h = canvas.height;
		let sx = Math.floor(x * dpr), sy = Math.floor(y * dpr);
		if (sx < 0 || sx >= w || sy < 0 || sy >= h) {
			return;
		}
		let imageData = ctx.getImageData(0, 0, w, h);
		if (floodImage(imageData, w, h, sx, sy, color)) {
			ctx.putImageData(imageData, 0, 0);
		}
	}

	// snapshot/restore the visible region, used for the shape/line rubber-band preview (whiteboard -> world buffer, annotate -> screen canvas).
	function captureRegion() {
		if (isWhiteboard()) {
			let r = visibleWorldRect();
			ensureWorldCovers(r.x, r.y, r.x + r.w, r.y + r.h);
			return { wb: true, img: wbGetImage(r.x, r.y, r.w, r.h), x: r.x, y: r.y };
		}
		return { img: ctx.getImageData(0, 0, canvas.width, canvas.height), x: 0, y: 0 };
	}
	function restoreRegion(base) {
		if (!base || !base.img) {
			return;
		}
		if (base.wb) {
			wbPutImage(base.img, base.x, base.y);
		} else {
			ctx.putImageData(base.img, base.x, base.y);
		}
	}

	// pixel-art drawing: snap to a grid the size of the brush and stamp square blocks. drawSize is in the draw coordinate space (world px on the whiteboard, so a stroke is the same size regardless of zoom).
	function stampPixel(x, y) {
		let px = drawSize;
		let gx = Math.floor(x / px) * px;
		let gy = Math.floor(y / px) * px;
		dctx().fillRect(gx, gy, px, px);
		markOpDirty(gx, gy, px, px);
	}
	function drawPixelLine(x0, y0, x1, y1) {
		let px = drawSize;
		let dist = Math.hypot(x1 - x0, y1 - y0);
		let steps = Math.max(1, Math.ceil(dist / (px / 2)));
		for (let i = 0; i <= steps; i++) {
			let t = i / steps;
			stampPixel(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
		}
	}

	// outline shapes (square / ellipse / arrow) drawn on the pixel grid, using the same chunky stamping as the pencil at the current color and size
	function drawShape(kind, x0, y0, x1, y1) {
		let c = dctx();
		c.globalCompositeOperation = 'source-over';
		c.fillStyle = drawColor;
		if (kind == 'square') {
			let ax = Math.min(x0, x1), ay = Math.min(y0, y1);
			let bx = Math.max(x0, x1), by = Math.max(y0, y1);
			drawPixelLine(ax, ay, bx, ay);
			drawPixelLine(bx, ay, bx, by);
			drawPixelLine(bx, by, ax, by);
			drawPixelLine(ax, by, ax, ay);
		} else if (kind == 'ellipse') {
			let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
			let rx = Math.abs(x1 - x0) / 2, ry = Math.abs(y1 - y0) / 2;
			// ramanujan perimeter estimate to pick a gap-free number of steps
			let perim = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
			let steps = Math.max(8, Math.ceil(perim / (drawSize / 2)));
			for (let i = 0; i <= steps; i++) {
				let a = (i / steps) * Math.PI * 2;
				stampPixel(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
			}
		} else {
			// arrow: a shaft plus a large, wide two-line head at the end point
			drawPixelLine(x0, y0, x1, y1);
			let ang = Math.atan2(y1 - y0, x1 - x0);
			let head = Math.max(drawSize * 5, 28);
			// ~50° off the backward axis on each side = a wide arrowhead
			let a1 = ang + Math.PI * 0.72;
			let a2 = ang - Math.PI * 0.72;
			drawPixelLine(x1, y1, x1 + head * Math.cos(a1), y1 + head * Math.sin(a1));
			drawPixelLine(x1, y1, x1 + head * Math.cos(a2), y1 + head * Math.sin(a2));
		}
	}
	function isShapeTool(t) {
		return t == 'square' || t == 'ellipse' || t == 'arrow';
	}
	// hold Shift to snap: squares/circles to equal sides, arrows/lines to 45°
	function constrainShapeEnd(kind, x0, y0, cx, cy) {
		let dx = cx - x0;
		let dy = cy - y0;
		if (kind == 'arrow' || kind == 'line') {
			let dist = Math.hypot(dx, dy);
			let a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
			return [x0 + dist * Math.cos(a), y0 + dist * Math.sin(a)];
		}
		let side = Math.max(Math.abs(dx), Math.abs(dy));
		let sx = dx < 0 ? -1 : 1;
		let sy = dy < 0 ? -1 : 1;
		return [x0 + sx * side, y0 + sy * side];
	}
	// brush preview: outline the grid cell the pen/eraser will fill next. x,y are draw coords; on the whiteboard the outline is mapped back to screen px.
	let brush = drawLayer.querySelector('.presentation-draw-brush');
	function updateBrush(x, y) {
		if (tool != 'pen' && tool != 'erase') {
			brush.style.display = 'none';
			return;
		}
		let px = drawSize;
		let gx = Math.floor(x / px) * px;
		let gy = Math.floor(y / px) * px;
		if (isWhiteboard()) {
			let scr = drawSize * zoom;
			brush.style.width = `${scr}px`;
			brush.style.height = `${scr}px`;
			brush.style.left = `${worldToScreenX(gx)}px`;
			brush.style.top = `${worldToScreenY(gy)}px`;
		} else {
			brush.style.width = `${px}px`;
			brush.style.height = `${px}px`;
			brush.style.left = `${gx}px`;
			brush.style.top = `${gy}px`;
		}
		brush.style.display = 'block';
	}
	// re-render live previews at the last cursor position so a color/size change shows up immediately (without needing to move the mouse)
	function refreshPreview() {
		if (tool == 'line' && lineStart) {
			restoreRegion(lineBase);
			let c = dctx();
			c.globalCompositeOperation = 'source-over';
			c.fillStyle = drawColor;
			drawPixelLine(lineStart.x, lineStart.y, ptrX, ptrY);
			flush();
		}
		// mid-drag shape: repaint it so a color/size change shows immediately
		if (drawing && shapeBase && isShapeTool(tool)) {
			restoreRegion(shapeBase);
			drawShape(tool, startX, startY, shapeEndX, shapeEndY);
			flush();
		}
		updateBrush(ptrX, ptrY);
	}
	// cancel a half-drawn line (restores the canvas snapshot taken at click 1)
	function cancelLine() {
		if (lineBase) {
			restoreRegion(lineBase);
		}
		lineStart = null;
		lineBase = null;
		linePressed = false;
		lineMoved = false;
		lineFresh = false;
	}

	canvas.addEventListener('pointerdown', (e) => {
		// a pinch (two touches) must never start a stroke
		if (pinching || (e.pointerType == 'touch' && touchPts.size >= 2)) {
			return;
		}
		if (tool == 'text') {
			return;
		}
		updateCanvasOffset();
		// snapshot the region for undo before this operation modifies the world
		beginOp();
		if (tool == 'bucket') {
			// fill continuously while the mouse stays down (committed on release)
			bucketing = true;
			lastBucketX = evX(e);
			lastBucketY = evY(e);
			floodFill(evX(e), evY(e), drawColor);
			return;
		}
		if (tool == 'line') {
			// a press begins either a click (chained polyline) or a drag (single line). we decide which on release
			linePressed = true;
			lineMoved = false;
			linePressX = evX(e);
			linePressY = evY(e);
			lineFresh = (lineStart == null);
			if (lineFresh) {
				lineStart = { x: evX(e), y: evY(e) };
				lineBase = captureRegion();
			}
			return;
		}
		drawing = true;
		startX = lastX = evX(e);
		startY = lastY = evY(e);
		if (isShapeTool(tool)) {
			// snapshot the canvas so the shape can be rubber-banded live
			shapeBase = captureRegion();
			shapeEndX = startX;
			shapeEndY = startY;
			return;
		}
		let c = dctx();
		c.globalCompositeOperation = tool == 'erase' ? 'destination-out' : 'source-over';
		c.fillStyle = tool == 'erase' ? 'rgba(0,0,0,1)' : drawColor;
		stampPixel(lastX, lastY);
		flush();
	});
	canvas.addEventListener('pointermove', (e) => {
		if (pinching) {
			return;
		}
		ptrX = evX(e);
		ptrY = evY(e);
		// follow the cursor with the brush preview (pen/eraser only)
		updateBrush(evX(e), evY(e));
		// bucket: keep filling under the cursor while the mouse is held down
		if (bucketing) {
			if (Math.hypot(evX(e) - lastBucketX, evY(e) - lastBucketY) >= 4) {
				lastBucketX = evX(e);
				lastBucketY = evY(e);
				floodFill(evX(e), evY(e), drawColor);
			}
			return;
		}
		// rubber-band the line from the current anchor to the cursor
		if (tool == 'line' && lineStart) {
			if (linePressed && !lineMoved &&
				(Math.abs(evX(e) - linePressX) > 3 || Math.abs(evY(e) - linePressY) > 3)) {
				lineMoved = true;
			}
			let ex = evX(e), ey = evY(e);
			if (e.shiftKey) {
				[ex, ey] = constrainShapeEnd('line', lineStart.x, lineStart.y, ex, ey);
			}
			restoreRegion(lineBase);
			let c = dctx();
			c.globalCompositeOperation = 'source-over';
			c.fillStyle = drawColor;
			drawPixelLine(lineStart.x, lineStart.y, ex, ey);
			flush();
			return;
		}
		if (!drawing) {
			return;
		}
		if (isShapeTool(tool)) {
			let ex = evX(e);
			let ey = evY(e);
			if (e.shiftKey) {
				[ex, ey] = constrainShapeEnd(tool, startX, startY, ex, ey);
			}
			shapeEndX = ex;
			shapeEndY = ey;
			restoreRegion(shapeBase);
			drawShape(tool, startX, startY, ex, ey);
			flush();
			return;
		}
		// reapply the color every move so changing it mid-stroke takes effect now
		let c = dctx();
		c.globalCompositeOperation = tool == 'erase' ? 'destination-out' : 'source-over';
		c.fillStyle = tool == 'erase' ? 'rgba(0,0,0,1)' : drawColor;
		drawPixelLine(lastX, lastY, evX(e), evY(e));
		flush();
		lastX = evX(e);
		lastY = evY(e);
	});
	canvas.addEventListener('pointerleave', () => {
		brush.style.display = 'none';
	});
	window.addEventListener('pointerup', (e) => {
		if (pinching) {
			return;
		}
		// bucket: finish the continuous fill as one undo step
		if (bucketing) {
			bucketing = false;
			pushHistory();
			return;
		}
		// line: resolve the press as a click (chain) or a drag (single line)
		if (tool == 'line' && linePressed) {
			linePressed = false;
			let ex = evX(e), ey = evY(e);
			if (e.shiftKey) {
				[ex, ey] = constrainShapeEnd('line', lineStart.x, lineStart.y, ex, ey);
			}
			if (lineMoved) {
				// drag: draw a single line and end the chain
				restoreRegion(lineBase);
				let c = dctx();
				c.globalCompositeOperation = 'source-over';
				c.fillStyle = drawColor;
				drawPixelLine(lineStart.x, lineStart.y, ex, ey);
				flush();
				pushHistory();
				lineStart = null;
				lineBase = null;
			} else if (!lineFresh) {
				// click while chaining: commit this segment and continue from here
				restoreRegion(lineBase);
				let c = dctx();
				c.globalCompositeOperation = 'source-over';
				c.fillStyle = drawColor;
				drawPixelLine(lineStart.x, lineStart.y, ex, ey);
				flush();
				pushHistory();
				lineStart = { x: ex, y: ey };
				lineBase = captureRegion();
				beginOp();
			}
			// a fresh first click just sets the anchor; wait for the next point
			return;
		}
		if (!drawing) {
			return;
		}
		drawing = false;
		if (shapeBase) {
			// commit the final shape without the dashed preview box
			restoreRegion(shapeBase);
			drawShape(tool, startX, startY, shapeEndX, shapeEndY);
			shapeBase = null;
			flush();
		}
		dctx().globalCompositeOperation = 'source-over';
		pushHistory();
	});

	// hijack scrolling on the whiteboard to pan the infinite canvas (annotate stays fixed to the viewport). deltas are batched onto an animation frame.
	let pendingPanX = 0, pendingPanY = 0, panScheduled = false;
	let pinching = false;
	function applyPan() {
		panScheduled = false;
		let dx = pendingPanX, dy = pendingPanY;
		pendingPanX = 0;
		pendingPanY = 0;
		if ((!dx && !dy) || drawLayer.dataset.mode != 'whiteboard') {
			return;
		}
		// don't pan mid-stroke; drop any half-drawn line so its anchor can't drift
		if (drawing || bucketing) {
			return;
		}
		if (lineStart) {
			cancelLine();
		}
		// screen deltas become world deltas at the current zoom
		panX += dx / zoom;
		panY += dy / zoom;
		clampPan();
		renderView();
		repositionTexts();
		updateBrush(ptrX, ptrY);
	}
	// zoom to `newZoom`, keeping the world point under (fx, fy) screen px fixed
	function applyZoom(newZoom, fx, fy) {
		if (drawLayer.dataset.mode != 'whiteboard' || drawing || bucketing) {
			return;
		}
		newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
		if (Math.abs(newZoom - zoom) < 1e-4) {
			return;
		}
		if (lineStart) {
			cancelLine();
		}
		panX += fx / zoom - fx / newZoom;
		panY += fy / zoom - fy / newZoom;
		zoom = newZoom;
		clampPan();
		renderView();
		repositionTexts();
		updateBrush(ptrX, ptrY);
	}
	drawLayer.addEventListener('wheel', (e) => {
		// over the toolbar, scroll the toolbar. it overflows sideways when the window is narrow, and a plain wheel only reports vertical movement, so that delta is what drives the axis the toolbar actually has.
		let toolbar = e.target.closest ? e.target.closest('.presentation-draw-toolbar') : null;
		if (toolbar) {
			let sideways = toolbar.scrollWidth > toolbar.clientWidth;
			let upDown = toolbar.scrollHeight > toolbar.clientHeight;
			if (sideways) {
				e.preventDefault();
				toolbar.scrollLeft += e.deltaX || e.deltaY;
			} else if (upDown) {
				e.preventDefault();
				toolbar.scrollTop += e.deltaY;
			}
			return;
		}
		if (drawLayer.dataset.mode != 'whiteboard') {
			return;
		}
		e.preventDefault();
		// trackpad pinch (and ctrl/⌘+scroll) zooms around the cursor; plain scroll / two-finger swipe pans
		if (e.ctrlKey || e.metaKey) {
			applyZoom(zoom * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
			return;
		}
		pendingPanX += e.deltaX;
		pendingPanY += e.deltaY;
		if (!panScheduled) {
			panScheduled = true;
			requestAnimationFrame(applyPan);
		}
	}, { passive: false });

	// two-finger touch pinch to zoom. tracked in the capture phase so a second finger cancels any stroke the first finger started before it can draw.
	let touchPts = new Map();
	let pinchStart = null;
	drawLayer.addEventListener('pointerdown', (e) => {
		if (drawLayer.dataset.mode != 'whiteboard' || e.pointerType != 'touch') {
			return;
		}
		touchPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (touchPts.size == 2) {
			// entering a pinch: abandon any in-progress drawing and reset the screen so the first finger's partial stroke is discarded
			drawing = false;
			bucketing = false;
			cancelLine();
			renderView();
			let pts = [...touchPts.values()];
			pinchStart = {
				dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
				zoom: zoom
			};
			pinching = true;
		}
	}, true);
	drawLayer.addEventListener('pointermove', (e) => {
		if (e.pointerType != 'touch' || !touchPts.has(e.pointerId)) {
			return;
		}
		touchPts.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (pinching && touchPts.size == 2 && pinchStart) {
			e.preventDefault();
			let pts = [...touchPts.values()];
			let dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
			let mx = (pts[0].x + pts[1].x) / 2, my = (pts[0].y + pts[1].y) / 2;
			applyZoom(pinchStart.zoom * dist / pinchStart.dist, mx, my);
		}
	}, true);
	function endTouch(e) {
		if (!touchPts.has(e.pointerId)) {
			return;
		}
		touchPts.delete(e.pointerId);
		if (touchPts.size < 2) {
			pinching = false;
			pinchStart = null;
		}
	}
	drawLayer.addEventListener('pointerup', endTouch, true);
	drawLayer.addEventListener('pointercancel', endTouch, true);

	// tool buttons (📝 / ✏️) enter a drawing mode
	for (let toolButton of overlay.querySelectorAll('.presentation-draw-tool')) {
		toolButton.addEventListener('click', () => enterDraw(toolButton.dataset.draw));
	}

	// tool selection (pencil / eraser / bucket / square / ellipse / text)
	let toolButtons = [...drawToolbar.querySelectorAll('.presentation-draw-tool-btn')];
	function setTool(nextTool) {
		// leaving the text tool deselects the active box (and drops it if empty)
		if (tool == 'text' && nextTool != 'text') {
			if (activeText) {
				activeText.blur();
			}
			removeEmptyTexts();
			selectText(null);
		}
		// abandon any half-drawn line and clear the brush preview
		cancelLine();
		if (nextTool != 'pen' && nextTool != 'erase') {
			brush.style.display = 'none';
		}
		tool = nextTool;
		toolButtons.forEach(b => b.dataset.active = b.dataset.tool == nextTool ? 1 : 0);
		// only capture clicks on the text layer while the text tool is active
		textLayer.style.pointerEvents = nextTool == 'text' ? 'auto' : 'none';
		// crosshair cursor for drawing tools (text uses a text caret)
		canvas.style.cursor = nextTool == 'text' ? 'text' : 'crosshair';
	}

	// toolbar: colors, brush sizes, tools, undo/redo, clear, save, close
	let colorButtons = [...drawToolbar.querySelectorAll('.presentation-draw-color')];
	let sizeButtons = [...drawToolbar.querySelectorAll('.presentation-draw-size')];
	for (let swatch of colorButtons) {
		swatch.addEventListener('click', () => {
			drawColorName = swatch.dataset.color;
			drawColor = resolveColor(drawColorName);
			colorButtons.forEach(x => x.dataset.active = 0);
			swatch.dataset.active = 1;
			// picking a color keeps the current tool. while editing text, it recolors the active box's background (with contrasting ink)
			if (tool == 'text' && activeText) {
				applyTextColors(activeText, drawColorName);
				activeText.focus();
				pushHistory();
			}
			refreshPreview();
		});
	}
	for (let sizeButton of sizeButtons) {
		sizeButton.addEventListener('click', () => {
			// brush size applies to the pencil, eraser, and text, so don't force a tool change here
			drawSize = parseInt(sizeButton.dataset.size);
			sizeButtons.forEach(x => x.dataset.active = 0);
			sizeButton.dataset.active = 1;
			if (tool == 'text' && activeText) {
				activeText.style.fontSize = `${currentTextSize()}px`;
				activeText.dataset.size = drawSize;
				activeText.focus();
				pushHistory();
			}
			refreshPreview();
		});
	}
	// clicking the toolbar shouldn't blur the text box being edited — so a color/size tweak (or an accidental tool click) keeps the type selected. only clicking the drawing area ends a text session.
	drawToolbar.addEventListener('mousedown', (e) => {
		if (tool == 'text' && activeText) {
			e.preventDefault();
		}
	});
	for (let b of toolButtons) {
		b.addEventListener('click', () => setTool(b.dataset.tool));
	}
	drawToolbar.querySelector('.presentation-draw-undo').addEventListener('click', undo);
	drawToolbar.querySelector('.presentation-draw-redo').addEventListener('click', redo);
	drawToolbar.querySelector('.presentation-draw-clear').addEventListener('click', clearDrawing);
	drawToolbar.querySelector('.presentation-draw-save').addEventListener('click', saveDrawing);

	drawToolbar.querySelector('.presentation-draw-newtimer').addEventListener('click', () => window.createTimer());
	drawToolbar.querySelector('.presentation-draw-randomizer').addEventListener('click', () => window.createRandomizer());
	drawToolbar.querySelector('.presentation-draw-pin').addEventListener('click', () => window.createPin());
	drawToolbar.querySelector('.presentation-draw-soundboard').addEventListener('click', () => window.toggleSoundboard && window.toggleSoundboard());
	drawToolbar.querySelector('.presentation-draw-close').addEventListener('click', exitDraw);


	// slide counter opens a jump-to menu
	let countMenu = overlay.querySelector('.presentation-count-menu');
	let menuHTML = '';
	for (let s = 0; s < slides.length; s++) {
		let heading = slides[s].querySelector('h1, h2, h3, h4, h5, h6');
		let label = heading ? heading.textContent.trim() : (slides[s].classList.contains('presentation-slide-final') ? 'The end' : `Slide ${s + 1}`);
		menuHTML += `<button class="presentation-count-item" data-slide="${s}">${s + 1}. ${label}</button>`;
	}
	countMenu.innerHTML = menuHTML;
	let countItems = [...countMenu.querySelectorAll('.presentation-count-item')];
	countEl.addEventListener('click', (e) => {
		e.stopPropagation();
		overlay.dataset.menu = overlay.dataset.menu == 1 ? 0 : 1;
		countItems.forEach((it, i) => it.dataset.active = i == index ? 1 : 0);
		if (countItems[index]) {
			countItems[index].scrollIntoView({ block: 'nearest' });
		}
	});
	for (let item of countItems) {
		item.addEventListener('click', (e) => {
			e.stopPropagation();
			showSlide(parseInt(item.dataset.slide));
			overlay.dataset.menu = 0;
		});
	}
	overlay.addEventListener('click', () => { overlay.dataset.menu = 0; });
	document.addEventListener('keydown', (e) => {
		// typing into a field belonging to a floating widget (a timer, a randomizer, a pin) goes to that field, not to the shortcuts. a whiteboard text box is contenteditable too, but it has its own handling further down — Escape there stops editing — so it has to fall through rather than be caught here.
		let inWhiteboardText = e.target.classList && e.target.classList.contains('presentation-draw-textbox');
		if (!inWhiteboardText && e.target.closest && e.target.closest('input, textarea, [contenteditable="true"]')) {
			return;
		}
		// a modified key is someone using a browser shortcut, not a tool one — except command/control z, which is undo everywhere else too and is claimed below while a drawing surface is up
		let undoChord = (e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() == 'z';
		if ((e.metaKey || e.ctrlKey || e.altKey) && !(undoChord && drawLayer.dataset.mode)) {
			return;
		}

		// the soundboard takes the keyboard over while it's up: its own letters are instruments, and the tools underneath would otherwise fire at the same time. only s is left through, to close it again.
		if (document.body.dataset.soundboard == '1' && e.key != 's' && e.key != 'Escape') {
			return;
		}

		// outside the presentation — on the homepage, a course menu or a resource page — the tool shortcuts still work, so the same letters reach for the same things wherever you are
		if (overlay.dataset.active != 1 && overlay.dataset.drawing != 1) {
			if (e.key == 'a') {
				enterDraw('annotate');
			} else if (e.key == 'w') {
				enterDraw('whiteboard');
			} else if (e.key == 'p') {
				window.createPin();
			} else if (e.key == 't') {
				window.createTimer();
			} else if (e.key == 'r') {
				window.createRandomizer();
			} else if (e.key == 's') {
				// opens only — s should never be the thing that closes it, since it doubles as a note on the piano and a tool in the drawing modes. the ❌ and Escape close it.
				if (window.openSoundboard) {
					window.openSoundboard();
				}
			}
			return;
		}
		// while drawing, suspend slide navigation; the toolbar shortcuts and Escape (leave draw mode) take over
		if (drawLayer.dataset.mode) {
			// if the caret is in a text box, let keys type normally — except Escape, which stops editing that box (without leaving draw mode)
			if (e.target.classList && e.target.classList.contains('presentation-draw-textbox')) {
				if (e.key == 'Escape') {
					e.preventDefault();
					e.target.blur();
					selectText(null);
					// drop the box if nothing was typed into it
					removeEmptyTexts();
				}
				return;
			}
			// undo and redo also answer to the usual command/control shortcuts, alongside the z and x on the toolbar. handled before the letter shortcuts below and returning for any modified key, so command-z can't also fall through and reach for a tool.
			if (e.metaKey || e.ctrlKey) {
				if (e.key.toLowerCase() == 'z') {
					e.preventDefault();
					if (e.shiftKey) {
						redo();
					} else {
						undo();
					}
				}
				return;
			}
			if (e.key == 'Escape') {
				e.preventDefault();
				// while chaining a line, Escape ends the chain instead of closing
				if (tool == 'line' && lineStart) {
					cancelLine();
				} else {
					exitDraw();
				}
			} else if ((e.key >= '1' && e.key <= '9') || e.key == '0') {
				let idx = e.key == '0' ? 9 : e.key - 1;
				if (colorButtons[idx]) {
					colorButtons[idx].click();
				}
			} else if (e.key == 'q') {
				sizeButtons[0].click();
			} else if (e.key == 'w') {
				sizeButtons[1].click();
			} else if (e.key == 'e') {
				sizeButtons[2].click();
			} else if (e.key == 'a') {
				setTool('pen');
			} else if (e.key == 's') {
				setTool('erase');
			} else if (e.key == 'd') {
				setTool('bucket');
			} else if (e.key == 'f') {
				setTool('square');
			} else if (e.key == 'g') {
				setTool('ellipse');
			} else if (e.key == 'h') {
				setTool('line');
			} else if (e.key == 'j') {
				setTool('arrow');
			} else if (e.key == 't') {
				setTool('text');
			} else if (e.key == 'z') {
				undo();
			} else if (e.key == 'x') {
				redo();
			} else if (e.key == 'c') {
				clearDrawing();
			} else if (e.key == 'v') {
				e.preventDefault();
				saveDrawing();
			} else if (e.key == 'u') {
				window.createPin();
			} else if (e.key == 'i') {
				window.createTimer();
			} else if (e.key == 'o') {
				window.createRandomizer();
			} else if (e.key == 'p') {
				// opens only — s should never be the thing that closes it, since it doubles as a note on the piano and a tool in the drawing modes. the ❌ and Escape close it.
				if (window.openSoundboard) {
					window.openSoundboard();
				}
			}
			return;
		}
		if (e.key == 'ArrowRight') {
			showSlide(index + 1);
		} else if (e.key == 'ArrowLeft') {
			showSlide(index - 1);
		} else if (e.key == 'ArrowDown') {
			// page down within the current slide (smooth)
			e.preventDefault();
			slides[index].scrollBy({ top: slides[index].clientHeight * 0.4, behavior: 'smooth' });
		} else if (e.key == 'ArrowUp') {
			e.preventDefault();
			slides[index].scrollBy({ top: slides[index].clientHeight * -0.4, behavior: 'smooth' });
		} else if (e.key == 'Escape') {
			closePresentation();
		} else if (e.key == 's') {
			if (window.openSoundboard) {
				window.openSoundboard();
			}
		} else if (e.key == 'a') {
			enterDraw('annotate');
		} else if (e.key == 'w') {
			enterDraw('whiteboard');
		} else if (e.key == 'p') {
			window.createPin();
		} else if (e.key == 'r') {
			window.createRandomizer();
		} else if (e.key == 't') {
			window.createTimer();
		} else if (e.key == 'n') {
			openNotes();
		} else if (e.key == 'i') {
			toggleBare();
		}
	});
}
initPresentation();
