// sounded emoji pads and a few instruments, sharing the bottom-toolbar shape of the annotate and whiteboard tools.
// Tone.js is fetched the first time an instrument is chosen rather than on every page load: most visits never open this, and it's a big download to spend on a teaching aid nobody asked for yet.

function initSoundboard() {

	// each pad will get its own file later; for now they all borrow the airhorn, so swapping one in is a one-line change here.
	const DEFAULT_SOUND = '/assets/sounds/airhorn.mp3';
	const SOUNDS = {};
	// the cats bring their own voices: a handful picked at random and staggered a little, so a burst sounds like several cats rather than one played over itself. never the same file twice in a burst.
	const MEOWS = [1, 2, 3, 4, 5, 6].map(n => `/assets/sounds/meows/meow-${n}.mp3`);
	function playFile(src, volume) {
		try {
			let sound = new Audio(src);
			sound.volume = volume === undefined ? 0.7 : volume;
			let played = sound.play();
			if (played && played.catch) {
				played.catch(() => {});
			}
		} catch (err) {}
	}
	function playMeows() {
		let pool = MEOWS.slice();
		let count = 3 + Math.floor(Math.random() * 2);
		for (let i = 0; i < count && pool.length; i++) {
			let pick = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
			setTimeout(() => playFile(pick, 0.22 + Math.random() * 0.16), i * (90 + Math.random() * 220));
		}
	}

	// a fresh element per hit, so mashing a button overlaps instead of restarting the one clip. overlapping is also how it clips: these samples are mastered close to full scale, so two at 0.7 already sum past 1 and the output stage flattens the peaks. so each new hit is ducked by how many are still sounding -- the first is loudest, and a pile-on stays under the ceiling instead of turning to crackle.
	const PAD_VOLUME = 0.45;
	const PAD_DUCK = 0.62;
	const PAD_VOLUME_MIN = 0.08;
	let padPlaying = 0;
	function playSound(char) {
		try {
			let sound = new Audio(SOUNDS[char] || DEFAULT_SOUND);
			sound.volume = Math.max(PAD_VOLUME_MIN, PAD_VOLUME * Math.pow(PAD_DUCK, padPlaying));
			padPlaying++;
			// both events, and guarded, because a clip that errors or is cut off would otherwise leave the count high and duck everything after it into silence
			let done = false;
			let release = () => {
				if (done) { return; }
				done = true;
				padPlaying = Math.max(0, padPlaying - 1);
			};
			sound.addEventListener('ended', release);
			sound.addEventListener('error', release);
			let played = sound.play();
			if (played && played.catch) {
				played.catch(() => { release(); });
			}
		} catch (err) {}
	}

	let layer = document.createElement('div');
	layer.className = 'soundboard';
	layer.dataset.open = '0';
	layer.dataset.mode = '';
	layer.innerHTML = `
		<div class="soundboard-wash"></div>
		<div class="soundboard-readout">
			<div class="soundboard-readout-group soundboard-waves">
				<div class="soundboard-item"><button class="soundboard-wave" data-wave="sine" aria-label="Sine">🌊</button><span class="soundboard-key">q</span></div>
				<div class="soundboard-item"><button class="soundboard-wave" data-wave="triangle" aria-label="Triangle">📐</button><span class="soundboard-key">w</span></div>
				<div class="soundboard-item"><button class="soundboard-wave" data-wave="square" aria-label="Square">📦</button><span class="soundboard-key">e</span></div>
				<div class="soundboard-item"><button class="soundboard-wave" data-wave="sawtooth" aria-label="Sawtooth">🪚</button><span class="soundboard-key">r</span></div>
				<div class="soundboard-item"><button class="soundboard-wave" data-wave="noise" aria-label="Noise">💥</button><span class="soundboard-key">t</span></div>
			</div>
			<div class="soundboard-readout-group">
				<div class="soundboard-item"><button class="soundboard-attack" data-attack="slow" aria-label="Slow attack">🐌</button><span class="soundboard-key">a</span></div>
				<div class="soundboard-item"><button class="soundboard-attack" data-attack="quick" aria-label="Quick attack">🐆</button><span class="soundboard-key">s</span></div>
			</div>
			<div class="soundboard-readout-group">
				<div class="soundboard-item"><button class="soundboard-decay" data-decay="short" aria-label="Short decay">🩳</button><span class="soundboard-key">d</span></div>
				<div class="soundboard-item"><button class="soundboard-decay" data-decay="long" aria-label="Long decay">👖</button><span class="soundboard-key">f</span></div>
			</div>
			<div class="soundboard-readout-group">
				<span class="soundboard-readout-note"></span><span class="soundboard-readout-hz"></span>
			</div>
		</div>
		<div class="soundboard-octaves"></div>
		<svg class="soundboard-crosshair" preserveAspectRatio="none"><path class="soundboard-crosshair-line soundboard-crosshair-x"/><path class="soundboard-crosshair-line soundboard-crosshair-y"/></svg>
		<div class="soundboard-piano"></div>
		<div class="soundboard-drumpad"></div>
		<div class="soundboard-animalese"></div>
		<div class="soundboard-pads"></div>
		<div class="soundboard-machine"></div>
		<div class="soundboard-toolbar">
			<div class="soundboard-group">
				<div class="soundboard-item"><button class="soundboard-mode" data-instrument="piano" aria-label="Piano">🎹</button><span class="soundboard-key">1</span></div>
				<div class="soundboard-item"><button class="soundboard-mode" data-instrument="trombone" aria-label="Theremin">🪊</button><span class="soundboard-key">2</span></div>
				<div class="soundboard-item"><button class="soundboard-mode" data-instrument="drums" aria-label="Drums">🥁</button><span class="soundboard-key">3</span></div>
				<div class="soundboard-item"><button class="soundboard-mode" data-instrument="animalese" aria-label="Animalese">🔤</button><span class="soundboard-key">4</span></div>
				<div class="soundboard-item"><button class="soundboard-mode" data-instrument="machine" aria-label="Drum machine">🤖</button><span class="soundboard-key">5</span></div>
				<div class="soundboard-item"><button class="soundboard-mode" data-instrument="pads" aria-label="Sound pads">🎛️</button><span class="soundboard-key">6</span></div>
				<div class="soundboard-item"><button class="soundboard-mode" data-instrument="cats" aria-label="Cats">🐱</button><span class="soundboard-key">7</span></div>
			</div>
			<div class="soundboard-group">
				<div class="soundboard-item"><button class="soundboard-close" aria-label="Close soundboard">❌</button><span class="soundboard-key">esc</span></div>
			</div>
		</div>
	`;
	document.body.appendChild(layer);

	// parked on the body rather than inside the layer: the layer carries a z-index, which would trap the particles beneath its own toolbar and keyboards however high they were stacked
	let stage = document.createElement('div');
	stage.className = 'soundboard-stage';
	document.body.appendChild(stage);
	let pianoEl = layer.querySelector('.soundboard-piano');
	let drumpadEl = layer.querySelector('.soundboard-drumpad');
	let animaleseEl = layer.querySelector('.soundboard-animalese');
	let padsEl = layer.querySelector('.soundboard-pads');
	let machineEl = layer.querySelector('.soundboard-machine');
	let readoutEl = layer.querySelector('.soundboard-readout');
	let readoutNote = layer.querySelector('.soundboard-readout-note');
	let readoutHz = layer.querySelector('.soundboard-readout-hz');
	let octavesEl = layer.querySelector('.soundboard-octaves');
	let crosshairEl = layer.querySelector('.soundboard-crosshair');
	let crosshairX = layer.querySelector('.soundboard-crosshair-x');
	let crosshairY = layer.querySelector('.soundboard-crosshair-y');

	/* ——————————— particles ——————————— */

	// one rAF loop drives every moving particle; it sleeps when nothing is on screen so an idle soundboard costs nothing.
	let particles = [];
	let frame = null;
	function step(now) {
		frame = null;
		let next = [];
		for (let p of particles) {
			let age = (now - p.born) / 1000;
			if (age >= p.life) {
				p.el.remove();
				continue;
			}
			p.update(p, age);
			next.push(p);
		}
		particles = next;
		if (particles.length > 0) {
			frame = requestAnimationFrame(step);
		}
	}
	function add(el, life, update) {
		stage.appendChild(el);
		particles.push({ el: el, born: performance.now(), life: life, update: update });
		if (!frame) {
			frame = requestAnimationFrame(step);
		}
	}
	function particle(char, size) {
		let el = document.createElement('span');
		el.className = 'soundboard-particle';
		el.textContent = char;
		el.style.fontSize = `${size || 40}px`;
		return el;
	}
	function vw() { return window.innerWidth; }
	function vh() { return window.innerHeight; }

	// 👏 thrown up from the floor and pulled back down
	const CLAP_GRAVITY = 1500;
	function burstClap(char) {
		for (let i = 0; i < 18; i++) {
			let el = particle(char, 30 + Math.random() * 26);
			let x = Math.random() * vw();
			let vx = (Math.random() * 2 - 1) * 120;
			// aimed at a height rather than given a speed, so they clear the same share of the screen whatever its size — .6 to .9, averaging the .75 asked for. v = sqrt(2 g h) is what reaches height h. the +40 is the head start below the bottom edge, so the height quoted is the one you actually see above the screen edge
			let peak = vh() * (0.6 + Math.random() * 0.3) + 40;
			let vy = -Math.sqrt(2 * CLAP_GRAVITY * peak);
			let spin = (Math.random() * 2 - 1) * 360;
			let delay = Math.random() * 0.35;
			el.style.opacity = 0;
			add(el, 4.5, (p, age) => {
				let t = age - delay;
				if (t < 0) {
					return;
				}
				el.style.opacity = 1;
				// gravity, so they arc and fall back past the bottom edge
				let y = vh() + 40 + vy * t + CLAP_GRAVITY * t * t / 2;
				el.style.transform = `translate(${x + vx * t}px, ${y}px) rotate(${spin * t}deg)`;
			});
		}
	}

	// real cats rather than the emoji. drop more files in and add them here — anything that fails to load quietly falls back to 🐱 so a missing photo doesn't leave a broken image sailing across the room.
	const CAT_IMAGES = [
		'/assets/media/cats/beeki-1.webp',
		'/assets/media/cats/beeki-2.webp',
		'/assets/media/cats/beeki-3.webp',
		'/assets/media/cats/beeki-4.webp',
		'/assets/media/cats/beeki-5.webp',
		'/assets/media/cats/limmie-1.webp',
		'/assets/media/cats/limmie-2.webp',
		'/assets/media/cats/limmie-3.webp',
		'/assets/media/cats/limmie-4.webp',
		'/assets/media/cats/limmie-5.webp'
	];
	function catParticle(size) {
		let el = document.createElement('img');
		el.className = 'soundboard-particle soundboard-particle-cat';
		el.src = CAT_IMAGES[Math.floor(Math.random() * CAT_IMAGES.length)];
		el.alt = '';
		el.style.width = `${size}px`;
		el.addEventListener('error', () => {
			let fallback = particle('🐱', size);
			fallback.style.cssText = el.style.cssText;
			fallback.style.width = '';
			fallback.style.fontSize = `${size}px`;
			if (el.parentNode) {
				el.parentNode.replaceChild(fallback, el);
			}
			// the animation holds a reference to the old node, so hand it over
			for (let p of particles) {
				if (p.el == el) {
					p.el = fallback;
				}
			}
		});
		return el;
	}
	// 🐱 padding across the screen on a sine wave
	function burstCat() {
		for (let i = 0; i < 12; i++) {
			let size = 90 + Math.random() * 90;
			let el = catParticle(size);
			let baseY = vh() * (0.05 + Math.random() * 0.7);
			let speed = 560 + Math.random() * 560;
			let amp = 40 + Math.random() * 90;
			let freq = 1.6 + Math.random() * 1.8;
			let phase = Math.random() * Math.PI * 2;
			let delay = Math.random() * 0.35;
			el.style.opacity = 0;
			add(el, 5, (p, age) => {
				let t = age - delay;
				if (t < 0) {
					return;
				}
				let x = -size - 20 + speed * t;
				if (x > vw() + size) {
					p.life = 0;
					return;
				}
				p.el.style.opacity = 1;
				let y = baseY + Math.sin(phase + t * freq * Math.PI) * amp;
				p.el.style.transform = `translate(${x}px, ${y}px) rotate(${Math.sin(phase + t * freq * Math.PI) * 14}deg)`;
			});
		}
	}

	// 📣 snapping on where they land and snapping off again — no fade, no grow
	function burstMegaphone(char) {
		for (let i = 0; i < 22; i++) {
			let el = particle(char, 28 + Math.random() * 34);
			let x = Math.random() * (vw() - 80);
			let y = Math.random() * (vh() - 120);
			let delay = Math.random() * 0.9;
			let hold = 0.55;
			el.style.transform = `translate(${x}px, ${y}px)`;
			el.style.opacity = 0;
			add(el, delay + hold, (p, age) => {
				let t = age - delay;
				el.style.opacity = t < 0 ? 0 : 1;
			});
		}
	}

	// 🎉 a handful of firework shells, each throwing out a ring of sparks
	function burstParty(char) {
		for (let shell = 0; shell < 5; shell++) {
			let cx = vw() * (0.15 + Math.random() * 0.7);
			let cy = vh() * (0.12 + Math.random() * 0.6);
			let delay = shell * 0.18 + Math.random() * 0.15;
			let sparks = 14;
			for (let i = 0; i < sparks; i++) {
				let el = particle(char, 20 + Math.random() * 18);
				let angle = (i / sparks) * Math.PI * 2 + Math.random() * 0.25;
				let speed = 200 + Math.random() * 260;
				let spin = (Math.random() * 2 - 1) * 540;
				el.style.opacity = 0;
				add(el, delay + 1.7, (p, age) => {
					let t = age - delay;
					if (t < 0) {
						return;
					}
					// slows as it travels and sags on the way out
					let ease = 1 - Math.exp(-t * 2.4);
					let x = cx + Math.cos(angle) * speed * ease;
					let y = cy + Math.sin(angle) * speed * ease + 220 * t * t;
					el.style.opacity = 1;
					el.style.transform = `translate(${x}px, ${y}px) rotate(${spin * t}deg)`;
				});
			}
		}
	}

	// the cats have their own; every other emoji picks from the three at random, so the same pad doesn't look identical twice in a row
	const BURSTS = [burstClap, burstMegaphone, burstParty];
	function react(char) {
		if (char == '🐱') {
			playMeows();
			burstCat();
			return;
		}
		playSound(char);
		BURSTS[Math.floor(Math.random() * BURSTS.length)](char);
	}

	/* ——————————— instruments ——————————— */

	// served from the repo rather than a CDN, so a classroom with patchy wifi (or a CDN having a bad day) can't take the instruments down mid-lesson.
	const TONE_URL = '/assets/scripts/tone.js';
	let tonePromise = null;
	function loadTone() {
		if (window.Tone) {
			return Promise.resolve(window.Tone);
		}
		if (!tonePromise) {
			tonePromise = new Promise((resolve, reject) => {
				let script = document.createElement('script');
				script.src = TONE_URL;
				script.onload = () => resolve(window.Tone);
				script.onerror = () => reject(new Error('Tone.js failed to load'));
				document.head.appendChild(script);
			});
		}
		return tonePromise;
	}

	let piano = null;
	let animalese = null;
	let drums = null;
	let trombone = null;
	let tromboneNoise = null;
	let tromboneNoiseFilter = null;
	let tromboneOn = false;
	// which wave is sounding, and how sharply it starts and stops
	let tromboneWave = 'sine';
	let tromboneAttack = 'quick';
	let tromboneDecay = 'short';
	const TROMBONE_ATTACK = { slow: 0.32, quick: 0.012 };
	const TROMBONE_DECAY = { short: 0.12, long: 4.2 };
	// the drawn wave settles faster than the note fades. a long tail is a nice thing to hear but a dull thing to watch — the line would sit there barely moving for seconds after the sound had become an afterthought.
	const TROMBONE_DECAY_DRAWN = { short: 0.12, long: 0.9 };
	function applyTromboneShape() {
		let attack = TROMBONE_ATTACK[tromboneAttack];
		let release = TROMBONE_DECAY[tromboneDecay];
		if (trombone) {
			trombone.envelope.attack = attack;
			trombone.envelope.release = release;
			trombone.filterEnvelope.attack = attack;
			trombone.filterEnvelope.release = release;
			if (tromboneWave != 'noise') {
				trombone.oscillator.type = tromboneWave;
			}
		}
		if (tromboneNoise) {
			tromboneNoise.envelope.attack = attack;
			tromboneNoise.envelope.release = release;
		}
	}
	function syncTromboneControls() {
		for (let button of layer.querySelectorAll('.soundboard-wave')) {
			button.dataset.active = button.dataset.wave == tromboneWave ? 1 : 0;
		}
		for (let button of layer.querySelectorAll('.soundboard-attack')) {
			button.dataset.active = button.dataset.attack == tromboneAttack ? 1 : 0;
		}
		for (let button of layer.querySelectorAll('.soundboard-decay')) {
			button.dataset.active = button.dataset.decay == tromboneDecay ? 1 : 0;
		}
	}

	function buildInstruments(Tone) {
		if (!piano) {
			// one recording of middle C, repitched by Tone for every other note. drop more files in and add them here — a sample every few semitones keeps the far ends of the keyboard from sounding stretched. a C in every octave, so Tone never has to stretch a sample more than six semitones either way.
			// the files count octaves from the bottom of the keyboard, so piano-c3 is middle C — one higher than scientific pitch, where middle C is C4. Naming them by their own number played everything an octave sharp, so the offset is applied here.
			let pianoUrls = {};
			for (let octave = 0; octave <= 7; octave++) {
				pianoUrls[`C${octave + 1}`] = `piano-c${octave}.mp3`;
			}
			piano = new Tone.Sampler({
				urls: pianoUrls,
				baseUrl: '/assets/sounds/piano/',
				release: 1,
				onerror: () => {}
			});
			// these samples were cut a lot quieter than the rest of the kit -- they peak between -6 and -19 dBFS where the percussion peaks at 0 -- so the piano wants making up rather than trimming. what makes the boost safe is the tanh curve on the way out: a chord sums several samples at once and would otherwise clip hard. Tone.Limiter was the obvious thing to reach for and turned out to be near useless here (it's a compressor, and its attack lets the transient straight through -- measured 0.5 dB of help on a chord that was 9 dB over). the shaper has no attack to slip past, and bounds the output at -0.3 dBFS no matter how many keys are down. it's transparent at normal levels, since tanh(x) ~= x when small.
			piano.connect(new Tone.WaveShaper(x => Math.tanh(x), 2048).toDestination());
			piano.volume.value = 6;
		}
		if (!drums) {
			// players rather than a Sampler: each key is its own recording at its own pitch, so nothing wants transposing
			let urls = {};
			for (let letter of DRUM_LETTERS) {
				urls[letter] = `${DRUM_KIT[letter]}.mp3`;
			}
			drums = new Tone.Players({
				urls: urls,
				baseUrl: '/assets/sounds/percussion/',
				// a missing file shouldn't take the whole kit down with it
				onerror: () => {}
			}).toDestination();
		}
		if (!animalese) {
			let urls = {};
			for (let letter of ANIMALESE_LETTERS) {
				urls[letter] = `voice-${letter}.mp3`;
			}
			animalese = new Tone.Players({
				urls: urls,
				baseUrl: '/assets/sounds/voice/',
				onerror: () => {}
			}).toDestination();
		}
		if (!trombone) {
			// brass, roughly. a plain sawtooth through a clean filter is the synth-lead sound; what makes it read as a trombone is the buzz of the lips and the resonant bore behind it, so the chain adds:
			// distortion — the reedy rasp of the buzz, which also fattens the upper harmonics a saw alone doesn't have vibrato — slow and shallow, the way a player's hand moves filter — a resonant peak standing in for the instrument's own formant, opening up as the note is played louder
			// each stage is built on its own so a browser missing one doesn't cost the whole instrument.
			let tail = null;
			try {
				let vibrato = new Tone.Vibrato({ frequency: 5.2, depth: 0.07 }).toDestination();
				let drive = new Tone.Distortion({ distortion: 0.22, wet: 0.35 }).connect(vibrato);
				tail = drive;
			} catch (err) {
				tail = null;
			}
			trombone = new Tone.MonoSynth({
				oscillator: { type: 'sawtooth' },
				// slower on and off than a keyboard: the note takes a moment to speak, and doesn't stop dead
				envelope: { attack: 0.14, decay: 0.25, sustain: 0.85, release: 0.35 },
				filter: { type: 'lowpass', rolloff: -12, Q: 3.5 },
				// the filter sweep is what gives the brassy "blaat" on the front of each note rather than an even tone
				filterEnvelope: {
					attack: 0.18, decay: 0.35, sustain: 0.55, release: 0.4,
					baseFrequency: 180, octaves: 3.4, exponent: 2
				}
			});
			if (tail) {
				trombone.connect(tail);
			} else {
				trombone.toDestination();
			}
			// the slide between pitches is the whole character of the thing
			trombone.portamento = 0.12;
			trombone.volume.value = -12;

			// the fifth wave. an oscillator can't be noise, so noise gets its own voice, pitched by sweeping a narrow band filter — a whistle rather than a note, but it still follows the hand.
			try {
				// barely filtered: a tight band turns noise into a whistle, and what this wants to be is white noise that shifts with the hand
				tromboneNoiseFilter = new Tone.Filter({ type: 'bandpass', Q: 0.6 });
				if (tail) {
					tromboneNoiseFilter.connect(tail);
				} else {
					tromboneNoiseFilter.toDestination();
				}
				tromboneNoise = new Tone.NoiseSynth({
					noise: { type: 'white' },
					envelope: { attack: 0.14, decay: 0.2, sustain: 1, release: 0.35 }
				}).connect(tromboneNoiseFilter);
				tromboneNoise.volume.value = -6;
			} catch (err) {
				tromboneNoise = null;
			}
			applyTromboneShape();
		}
	}

	// the typing layout: home row is the white keys, the row above holds the accidentals where they'd fall on a real keyboard.
	const WHITE = [
		{ key: 'a', note: 'C4' }, { key: 's', note: 'D4' }, { key: 'd', note: 'E4' },
		{ key: 'f', note: 'F4' }, { key: 'g', note: 'G4' }, { key: 'h', note: 'A4' },
		{ key: 'j', note: 'B4' }, { key: 'k', note: 'C5' }, { key: 'l', note: 'D5' }
	];
	const BLACK = [
		{ key: 'w', note: 'C#4', after: 0 }, { key: 'e', note: 'D#4', after: 1 },
		{ key: 't', note: 'F#4', after: 3 }, { key: 'y', note: 'G#4', after: 4 },
		{ key: 'u', note: 'A#4', after: 5 }, { key: 'o', note: 'C#5', after: 7 }
	];

	// octave offset and velocity, both nudged from the keyboard
	let octave = 0;
	let velocity = 0.7;
	// notes are written at their home octave; this moves them
	function shiftNote(note) {
		if (!octave) {
			return note;
		}
		let match = note.match(/^([A-G]#?)(-?\d+)$/);
		if (!match) {
			return note;
		}
		return match[1] + (parseInt(match[2]) + octave);
	}
	function setOctave(delta) {
		octave = Math.max(-3, Math.min(3, octave + delta));
		let readout = pianoEl.querySelector('.soundboard-octave-value');
		if (readout) {
			readout.textContent = `${octave > 0 ? '+' : ''}${octave}`;
		}
	}
	function setVelocity(delta) {
		velocity = Math.max(0.1, Math.min(1, Math.round((velocity + delta) * 10) / 10));
		let readout = pianoEl.querySelector('.soundboard-velocity-value');
		if (readout) {
			readout.textContent = `${Math.round(velocity * 100)}%`;
		}
	}

	// three rows of the typing keyboard, in the order they sit under the hands
	const DRUM_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
	const DRUM_LETTERS = DRUM_ROWS.join('').split('');

	// animalese: one voice recording per letter, played back off-speed to pitch it. twenty-six keys and twenty-six files, so the keyboard maps straight onto the alphabet with nothing left over.
	const ANIMALESE_LETTERS = DRUM_ROWS.join('').split('');
	// four fixed voices rather than a sliding pitch: the interesting settings are a long way apart, and stepping a semitone at a time to reach them was work for no reward. named by animal, since the number of semitones isn't the point.
	const ANIMALESE_PITCHES = [
		{ id: 'cow', emoji: '🐄', semitones: -18, label: 'Cow' },
		{ id: 'turtle', emoji: '🐢', semitones: -9, label: 'Turtle' },
		{ id: 'duck', emoji: '🦆', semitones: 9, label: 'Duck' },
		{ id: 'squirrel', emoji: '🐿️', semitones: 18, label: 'Squirrel' },
		{ id: 'chick', emoji: '🐥', semitones: 24, label: 'Chick' }
	];
	// the duck is the one that sounds like the game, so it's where this starts
	let animalesePitch = 'duck';
	function animaleseSemitones() {
		let found = ANIMALESE_PITCHES.find(p => p.id == animalesePitch);
		return found ? found.semitones : 0;
	}
	function setAnimalesePitch(id) {
		animalesePitch = id;
		for (let button of animaleseEl.querySelectorAll('.soundboard-animalese-pitch')) {
			button.dataset.active = button.dataset.pitch == id ? 1 : 0;
		}
	}
	// laid out like a kit under the hands: metals along the top row, the core kit on the home row where they're easiest to reach, and hand percussion underneath. the percussion folder holds more than fits — these are the picks, and swapping one is a matter of changing the filename here.
	const DRUM_KIT = {
		q: 'hat-closed', w: 'hat-open', e: 'crash-high', r: 'ride-mid', t: 'tambourine',
		y: 'jingle', u: 'triangle-open', i: 'chimes', o: 'gong', p: 'spin-up',
		a: 'kick-low', s: 'kick-808', d: 'snare', f: 'snare-808', g: 'clap',
		h: 'cowbell', j: 'agogo-high', k: 'agogo-low', l: 'vibraslap',
		z: 'conga-low', x: 'conga-high', c: 'bongo-high', v: 'cuica-high',
		b: 'guiro', n: 'whistle-high', m: 'castanet'
	};

	// eight pads on qwer / asdf, each with its own file. cheers on the top row, signals on the bottom.
	const PAD_ROWS = [
		[
			{ key: 'q', char: '👏', sound: 'applause' },
			{ key: 'w', char: '🎂', sound: 'yay' },
			{ key: 'e', char: '🎉', sound: 'confetti' },
			{ key: 'r', char: '🎆', sound: 'fireworks' }
		],
		[
			{ key: 'a', char: '📣', sound: 'airhorn' },
			{ key: 's', char: '‼️', sound: 'buzz-in' },
			{ key: 'd', char: '✅', sound: 'ding' },
			{ key: 'f', char: '⚠️', sound: 'error' }
		]
	];
	const PADS = {};
	for (let row of PAD_ROWS) {
		for (let pad of row) {
			PADS[pad.key] = pad.char;
			SOUNDS[pad.char] = `/assets/sounds/emojis/${pad.sound}.mp3`;
		}
	}
	function buildPads() {
		let html = '<div class="soundboard-pads-inner">';
		for (let row of PAD_ROWS) {
			for (let pad of row) {
				html += `<button class="soundboard-pad" data-letter="${pad.key}" data-char="${pad.char}"><span class="soundboard-pad-char">${pad.char}</span><span class="soundboard-pad-key">${pad.key}</span></button>`;
			}
		}
		html += '</div>';
		padsEl.innerHTML = html;
	}

	/* ——————————— drum machine ——————————— */

	// one row per voice, sixteen steps across. files are named for the voice so they can be dropped in without touching this list. written low to high, then drawn bottom to top, so the kick sits at the foot of the grid the way it sits at the bottom of the kit id is what the pattern is saved under; file is what it plays
	const MACHINE_VOICES = [
		{ id: 'claves', emoji: '🪵', file: 'claves' },
		{ id: 'cowbell', emoji: '🐄', file: 'cowbell' },
		{ id: 'cymbal', emoji: '💥', file: 'crash' },
		{ id: 'maracas', emoji: '🪇', file: 'maracas' },
		{ id: 'tom-high', emoji: '🍋‍🟩', file: 'tom-hi' },
		{ id: 'tom-mid', emoji: '🍊', file: 'tom-mid' },
		{ id: 'tom-low', emoji: '🍅', file: 'tom-lo' },
		{ id: 'hihat-open', emoji: '🎩', file: 'hihat-open' },
		{ id: 'hihat-closed', emoji: '🧢', file: 'hihat' },
		{ id: 'clap', emoji: '👏', file: 'clap' },
		{ id: 'snare', emoji: '🥁', file: 'snare' },
		{ id: 'rim', emoji: '⭕', file: 'rim' },
		{ id: 'kick', emoji: '🦵', file: 'kick' }
	];
	const MACHINE_STEPS = 16;
	// a column is a beat and the grid is always four measures: sixteen columns in 4/4, twelve in 3/4. The spare columns are dimmed rather than removed, so switching back doesn't lose what was written in them.
	const MACHINE_MEASURES = 4;
	let machineBeats = 4;
	// one pair of bounds for both the saved value and the +/- buttons -- they were two separate literals, which is exactly the kind of thing that drifts apart the next time one of them is changed
	const MACHINE_TEMPO_MIN = 10;
	const MACHINE_TEMPO_MAX = 400;
	function clampTempo(bpm) {
		return Math.max(MACHINE_TEMPO_MIN, Math.min(MACHINE_TEMPO_MAX, bpm));
	}
	let machineTempo = 100;
	let machineStep = 0;
	let machinePlaying = false;
	let machineLoop = null;
	let machinePlayers = null;
	// voice id -> Set of active step indices
	let machinePattern = {};
	for (let voice of MACHINE_VOICES) {
		machinePattern[voice.id] = new Set();
	}

	const MACHINE_KEY = 'classroom-drum-machine';
	function saveMachine() {
		try {
			let pattern = {};
			for (let voice of MACHINE_VOICES) {
				pattern[voice.id] = [...machinePattern[voice.id]];
			}
			localStorage.setItem(MACHINE_KEY, JSON.stringify({
				pattern: pattern, tempo: machineTempo, beats: machineBeats
			}));
		} catch (err) {}
	}
	function loadMachine() {
		try {
			let saved = JSON.parse(localStorage.getItem(MACHINE_KEY) || 'null');
			if (!saved) {
				return;
			}
			machineTempo = clampTempo(parseInt(saved.tempo) || machineTempo);
			machineBeats = saved.beats == 3 ? 3 : 4;
			for (let voice of MACHINE_VOICES) {
				let steps = (saved.pattern || {})[voice.id] || [];
				machinePattern[voice.id] = new Set(steps.map(Number).filter(n => n >= 0 && n < MACHINE_STEPS));
			}
		} catch (err) {}
	}

	// every square is its own coin flip at the same odds. this used to weight each voice by a density and give downbeats a bonus, which made for tidier beats but meant the hi-hat came up seven times as often as the crash -- you could hear the thumb on the scale. no weighting now: any voice on any step is exactly as likely as any other.
	const RANDOM_DENSITY = 0.25;
	function randomizeMachine() {
		let length = machineLength();
		for (let voice of MACHINE_VOICES) {
			let set = machinePattern[voice.id];
			set.clear();
			for (let s = 0; s < length; s++) {
				if (Math.random() < RANDOM_DENSITY) {
					set.add(s);
				}
			}
		}
		syncMachine();
		saveMachine();
	}

	function machineLength() {
		return machineBeats * MACHINE_MEASURES;
	}

	function buildMachine() {
		let html = '<div class="soundboard-machine-inner">';
		html += '<div class="soundboard-machine-grid">';
		for (let voice of MACHINE_VOICES) {
			html += `<div class="soundboard-machine-row" data-voice="${voice.id}"><span class="soundboard-machine-label" title="${voice.id.replace('-', ' ')}">${voice.emoji}</span>`;
			for (let s = 0; s < MACHINE_STEPS; s++) {
				html += `<button class="soundboard-machine-step" data-voice="${voice.id}" data-step="${s}" aria-label="${voice.id} beat ${s + 1}"></button>`;
			}
			html += '</div>';
		}
		html += '</div>';
		html += `<div class="soundboard-machine-controls"><div class="soundboard-item"><button class="soundboard-machine-play" aria-label="Play or pause">▶️</button></div><div class="soundboard-machine-set"><div class="soundboard-item"><button class="soundboard-machine-tempo" data-delta="-5" aria-label="Slower">👇</button></div><span class="soundboard-machine-tempo-value">100 bpm</span><div class="soundboard-item"><button class="soundboard-machine-tempo" data-delta="5" aria-label="Faster">👆</button></div></div><div class="soundboard-machine-set"><div class="soundboard-item"><button class="soundboard-machine-meter" data-beats="3" aria-label="Three four">3️⃣</button></div><div class="soundboard-item"><button class="soundboard-machine-meter" data-beats="4" aria-label="Four four">4️⃣</button></div></div><div class="soundboard-machine-set"><div class="soundboard-item"><button class="soundboard-machine-random" aria-label="Randomize pattern">⁉️</button></div><div class="soundboard-item"><button class="soundboard-machine-clear" aria-label="Clear pattern">🗑️</button></div></div></div>`;
		html += '</div>';
		machineEl.innerHTML = html;
		syncMachine();
	}

	// grey out the steps beyond the bar, mark the meter in use, show the tempo
	function syncMachine() {
		let length = machineLength();
		for (let step of machineEl.querySelectorAll('.soundboard-machine-step')) {
			let index = parseInt(step.dataset.step);
			step.dataset.outside = index >= length ? '1' : '0';
			step.dataset.on = machinePattern[step.dataset.voice].has(index) ? '1' : '0';
			// alternate the shading per measure, so the bar lines move with the time signature instead of staying stuck at every fourth column
			step.dataset.beat = Math.floor(index / machineBeats) % 2;
			step.dataset.downbeat = index % machineBeats == 0 ? '1' : '0';
		}
		for (let button of machineEl.querySelectorAll('.soundboard-machine-meter')) {
			button.dataset.active = parseInt(button.dataset.beats) == machineBeats ? 1 : 0;
		}
		let tempoValue = machineEl.querySelector('.soundboard-machine-tempo-value');
		if (tempoValue) {
			tempoValue.textContent = `${machineTempo} bpm`;
		}
		let play = machineEl.querySelector('.soundboard-machine-play');
		if (play) {
			play.textContent = machinePlaying ? '⏸️' : '▶️';
		}
	}

	function markPlayheadAt(at) {
		for (let step of machineEl.querySelectorAll('.soundboard-machine-step')) {
			step.dataset.now = (machinePlaying && parseInt(step.dataset.step) == at) ? '1' : '0';
		}
	}
	function markPlayhead() {
		markPlayheadAt(machineStep);
	}

	function buildMachinePlayers(Tone) {
		if (machinePlayers) {
			return;
		}
		let urls = {};
		for (let voice of MACHINE_VOICES) {
			urls[voice.id] = `${voice.file}.mp3`;
		}
		// players rather than a Sampler: these are one-shots at their own pitch, not one recording stretched across a keyboard
		machinePlayers = new Tone.Players({
			urls: urls,
			baseUrl: '/assets/sounds/drum-machine/',
			onerror: () => {}
		}).toDestination();
	}

	function machineTick(time) {
		machineStep = (machineStep + 1) % machineLength();
		let hits = MACHINE_VOICES.filter(voice => machinePattern[voice.id].has(machineStep));
		// a closed hat shuts the open one up, the way a foot on the pedal does
		if (hits.some(voice => voice.id == 'hihat-closed')) {
			try {
				let open = machinePlayers.player('hihat-open');
				if (open && open.loaded && open.state == 'started') {
					open.stop(time);
				}
			} catch (err) {}
		}
		for (let voice of hits) {
			try {
				let player = machinePlayers.player(voice.id);
				if (player && player.loaded) {
					player.start(time);
				}
			} catch (err) {}
		}
		// scheduled against the audio clock rather than fired straight from the callback: Tone runs the callback ahead of what you're hearing, so a bare requestAnimationFrame here made the playhead jitter and lead
		let step = machineStep;
		if (Tone.Draw) {
			Tone.Draw.schedule(() => markPlayheadAt(step), time);
		} else {
			requestAnimationFrame(markPlayhead);
		}
	}

	function startMachine() {
		loadTone().then((Tone) => {
			buildMachinePlayers(Tone);
			Tone.start();
			Tone.Transport.bpm.value = machineTempo;
			if (!machineLoop) {
				// eighths rather than quarters: at the same bpm the grid runs at twice the pace, which is the feel a drum machine wants
				machineLoop = Tone.Transport.scheduleRepeat(machineTick, '8n');
			}
			machineStep = -1;
			Tone.Transport.start();
			machinePlaying = true;
			syncMachine();
		}).catch(() => {});
	}
	function stopMachine() {
		machinePlaying = false;
		if (window.Tone && Tone.Transport) {
			Tone.Transport.pause();
		}
		syncMachine();
		markPlayhead();
	}
	function toggleMachine() {
		if (machinePlaying) {
			stopMachine();
		} else {
			startMachine();
		}
	}

	function buildDrumpad() {
		let html = '<div class="soundboard-drumpad-inner">';
		for (let row of DRUM_ROWS) {
			html += '<div class="soundboard-drumpad-row">';
			for (let letter of row.split('')) {
				html += `<button class="soundboard-drumpad-key" data-letter="${letter}">${letter}</button>`;
			}
			html += '</div>';
		}
		html += '</div>';
		drumpadEl.innerHTML = html;
	}

	function buildAnimalese() {
		// borrows the drum keyboard's classes so the keys look the same
		let html = '<div class="soundboard-drumpad-inner">';
		for (let row of DRUM_ROWS) {
			html += '<div class="soundboard-drumpad-row">';
			for (let letter of row.split('')) {
				html += `<button class="soundboard-drumpad-key" data-letter="${letter}">${letter}</button>`;
			}
			html += '</div>';
		}
		// pitch sits under the keys, in the same group the piano's octave and velocity controls use. no key hints on these: every letter on this instrument is already a voice, so there's nothing free to bind.
		html += `<div class="soundboard-piano-controls soundboard-animalese-controls"><div class="soundboard-piano-set">`;
		for (let pitch of ANIMALESE_PITCHES) {
			html += `<div class="soundboard-item"><button class="soundboard-animalese-pitch" data-pitch="${pitch.id}" aria-label="${pitch.label}">${pitch.emoji}</button></div>`;
		}
		html += '</div></div>';
		html += '</div>';
		animaleseEl.innerHTML = html;
		setAnimalesePitch(animalesePitch);
	}

	// a short highlight, restarted cleanly if the same key is hit again
	function flash(el, hold) {
		if (!el) {
			return;
		}
		el.dataset.down = '1';
		clearTimeout(el.flashTimer);
		if (hold) {
			// a held piano key stays lit until the note is released
			return;
		}
		el.flashTimer = setTimeout(() => delete el.dataset.down, 160);
	}

	function buildPiano() {
		let html = '<div class="soundboard-piano-inner">';
		for (let i = 0; i < WHITE.length; i++) {
			html += `<div class="soundboard-key-white" data-note="${WHITE[i].note}" data-letter="${WHITE[i].key}"><span class="soundboard-key-letter">${WHITE[i].key}</span></div>`;
		}
		for (let b of BLACK) {
			// sits on the seam between two white keys
			let left = ((b.after + 1) / WHITE.length) * 100;
			html += `<div class="soundboard-key-black" style="left: ${left}%" data-note="${b.note}" data-letter="${b.key}"><span class="soundboard-key-letter">${b.key}</span></div>`;
		}
		html += '</div>';
		// octave on the left, loudness on the right
		html += `<div class="soundboard-piano-controls"><div class="soundboard-piano-set"><div class="soundboard-item"><button class="soundboard-octave" data-delta="-1" aria-label="Octave down">👇</button><span class="soundboard-key">z</span></div><div class="soundboard-item"><button class="soundboard-octave" data-delta="1" aria-label="Octave up">👆</button><span class="soundboard-key">x</span></div><span class="soundboard-octave-value">0</span></div><div class="soundboard-piano-set"><div class="soundboard-item"><button class="soundboard-velocity" data-delta="-0.1" aria-label="Softer">🔈</button><span class="soundboard-key">c</span></div><div class="soundboard-item"><button class="soundboard-velocity" data-delta="0.1" aria-label="Louder">🔊</button><span class="soundboard-key">v</span></div><span class="soundboard-velocity-value">70%</span></div></div>`;
		pianoEl.innerHTML = html;
	}
	loadMachine();
	buildPiano();
	buildDrumpad();
	buildAnimalese();
	buildPads();
	buildMachine();

	// painting across the grid. whether the drag is turning steps on or off is decided by the first square touched and held for the whole gesture, so a sweep can't toggle a square back off the moment it crosses one that was already set.
	let painting = false;
	let paintTo = false;
	function paintStep(step) {
		if (!step || step.dataset.outside == '1') {
			return;
		}
		let set = machinePattern[step.dataset.voice];
		let index = parseInt(step.dataset.step);
		if (paintTo) {
			set.add(index);
		} else {
			set.delete(index);
		}
		step.dataset.on = paintTo ? '1' : '0';
	}
	machineEl.addEventListener('pointerdown', (e) => {
		let step = e.target.closest('.soundboard-machine-step');
		if (!step) {
			return;
		}
		e.preventDefault();
		painting = true;
		// starting on a lit square means this drag is an eraser
		paintTo = !machinePattern[step.dataset.voice].has(parseInt(step.dataset.step));
		paintStep(step);
	});
	window.addEventListener('pointermove', (e) => {
		if (!painting) {
			return;
		}
		let el = document.elementFromPoint(e.clientX, e.clientY);
		paintStep(el ? el.closest('.soundboard-machine-step') : null);
	});
	window.addEventListener('pointerup', () => {
		if (!painting) {
			return;
		}
		painting = false;
		saveMachine();
	});

	// held down, the tempo keeps moving rather than needing a press per step
	function holdRepeat(button, action) {
		let timer = null;
		let delay = null;
		function stop() {
			clearTimeout(delay);
			clearInterval(timer);
			delay = null;
			timer = null;
		}
		button.addEventListener('pointerdown', (e) => {
			e.preventDefault();
			action();
			delay = setTimeout(() => {
				timer = setInterval(action, 70);
			}, 350);
		});
		for (let event of ['pointerup', 'pointerleave', 'pointercancel']) {
			button.addEventListener(event, stop);
		}
		window.addEventListener('pointerup', stop);
	}
	for (let button of machineEl.querySelectorAll('.soundboard-machine-tempo')) {
		let delta = parseInt(button.dataset.delta);
		holdRepeat(button, () => {
			machineTempo = clampTempo(machineTempo + delta);
			if (window.Tone && Tone.Transport) {
				Tone.Transport.bpm.value = machineTempo;
			}
			syncMachine();
			saveMachine();
		});
	}

	machineEl.addEventListener('click', (e) => {
		if (e.target.closest('.soundboard-machine-play')) {
			toggleMachine();
			return;
		}
		let meter = e.target.closest('.soundboard-machine-meter');
		if (meter) {
			machineBeats = parseInt(meter.dataset.beats);
			// a shorter bar can leave the playhead past its end
			machineStep = machineStep % machineLength();
			syncMachine();
			markPlayhead();
			saveMachine();
			return;
		}
		if (e.target.closest('.soundboard-machine-random')) {
			randomizeMachine();
			return;
		}
		if (e.target.closest('.soundboard-machine-clear')) {
			for (let voice of MACHINE_VOICES) {
				machinePattern[voice.id].clear();
			}
			syncMachine();
			saveMachine();
		}
	});

	padsEl.addEventListener('pointerdown', (e) => {
		let pad = e.target.closest('[data-char]');
		if (pad) {
			e.preventDefault();
			react(pad.dataset.char);
			flash(pad);
		}
	});

	drumpadEl.addEventListener('pointerdown', (e) => {
		let key = e.target.closest('[data-letter]');
		if (key) {
			e.preventDefault();
			playDrum(key.dataset.letter, key);
		}
	});

	animaleseEl.addEventListener('pointerdown', (e) => {
		let pitch = e.target.closest('.soundboard-animalese-pitch');
		if (pitch) {
			e.preventDefault();
			setAnimalesePitch(pitch.dataset.pitch);
			return;
		}
		let key = e.target.closest('[data-letter]');
		if (key) {
			e.preventDefault();
			playAnimalese(key.dataset.letter, key);
		}
	});

	function pianoKeyFor(letter) {
		return pianoEl.querySelector(`[data-letter="${letter}"]`);
	}
	// notes are held rather than clipped to a fixed length: attack on the way down, release on the way up. keyed by the note actually sounding, since the octave can be shifted between press and release.
	let heldNotes = new Map();
	function playNote(note, el, force) {
		let hit = typeof force == 'number' ? force : velocity;
		let sounding = shiftNote(note);
		if (heldNotes.has(note)) {
			return;
		}
		heldNotes.set(note, sounding);
		loadTone().then((Tone) => {
			buildInstruments(Tone);
			Tone.start();
			piano.triggerAttack(sounding, undefined, hit);
		}).catch(() => {});
		flash(el, true);
	}
	function releaseNote(note) {
		let sounding = heldNotes.get(note);
		if (sounding === undefined) {
			return;
		}
		heldNotes.delete(note);
		// looked up by note, not by letter — this is called with the note name
		let key = pianoEl.querySelector(`[data-note="${note}"]`);
		if (key) {
			clearTimeout(key.flashTimer);
			delete key.dataset.down;
		}
		if (piano) {
			try {
				piano.triggerRelease(sounding);
			} catch (err) {}
		}
	}
	function releaseAllNotes() {
		for (let note of [...heldNotes.keys()]) {
			releaseNote(note);
		}
	}

	// struck low on the key means struck hard, the way weighted keys behave
	function velocityFromPoint(key, clientY) {
		let box = key.getBoundingClientRect();
		if (!box.height) {
			return velocity;
		}
		let down = (clientY - box.top) / box.height;
		return Math.max(0.15, Math.min(1, 0.2 + Math.max(0, Math.min(1, down)) * 0.8));
	}

	// pitch by playback rate, the way the game does it: the recording plays faster and comes out higher, rather than being resampled at length.
	function playAnimalese(letter, el) {
		loadTone().then((Tone) => {
			buildInstruments(Tone);
			Tone.start();
			let player = animalese.player(letter);
			if (player && player.loaded) {
				player.playbackRate = Math.pow(2, animaleseSemitones() / 12);
				player.start();
			}
		}).catch(() => {});
		flash(el || animaleseEl.querySelector(`[data-letter="${letter}"]`));
	}

	function playDrum(letter, el) {
		loadTone().then((Tone) => {
			buildInstruments(Tone);
			Tone.start();
			let player = drums.player(letter);
			if (player && player.loaded) {
				player.start();
			}
		}).catch(() => {});
		flash(el || drumpadEl.querySelector(`[data-letter="${letter}"]`));
	}



	/* ——————————— trombone ——————————— */

	// pitch across, volume up the screen; held for as long as the pointer is C to C, seven octaves: an exact number of octaves across the screen, so the lines below land at even sevenths rather than at some awkward fraction of a slightly wider range. C4 is MIDI 60.
	const TROMBONE_LOW = 60 - 3 * 12;   // C1, at the left edge
	const TROMBONE_HIGH = 60 + 4 * 12;  // C8, at the right edge
	// a line at every C the sweep passes through, so the octaves are findable rather than having to be hunted for by ear. positioned as percentages, which keeps them right through a resize without recalculating. the last one is skipped — it would sit on the screen edge, which is already C8.
	function buildOctaveMarks() {
		let html = '';
		for (let midi = Math.ceil(TROMBONE_LOW / 12) * 12; midi < TROMBONE_HIGH; midi += 12) {
			let fraction = (midi - TROMBONE_LOW) / (TROMBONE_HIGH - TROMBONE_LOW);
			html += `<span class="soundboard-octave-mark" style="left: ${(fraction * 100).toFixed(3)}%"><span class="soundboard-octave-mark-label">C${midi / 12 - 1}</span></span>`;
		}
		octavesEl.innerHTML = html;
	}

	function tromboneAt(clientX, clientY) {
		let x = Math.max(0, Math.min(1, clientX / vw()));
		let y = Math.max(0, Math.min(1, clientY / vh()));
		let midi = TROMBONE_LOW + x * (TROMBONE_HIGH - TROMBONE_LOW);
		return { frequency: 440 * Math.pow(2, (midi - 69) / 12), volume: -40 + (1 - y) * 34 };
	}
	function tromboneFrom(e) {
		return tromboneAt(e.clientX, e.clientY);
	}
	// where the pointer is now, for anything that needs the current note without an event to hand — switching wave mid-note, mainly
	function tromboneHere() {
		return tromboneAt(crossX, crossY);
	}
	// sounding and silencing are their own steps so the wave can be swapped underneath a held note
	function tromboneAttackAt(at) {
		if (tromboneWave == 'noise' && tromboneNoise) {
			tromboneNoise.volume.value = at.volume;
			tromboneNoiseFilter.frequency.value = at.frequency;
			tromboneNoise.triggerAttack();
		} else if (trombone) {
			trombone.volume.value = at.volume;
			trombone.triggerAttack(at.frequency);
		}
	}
	function tromboneReleaseVoices() {
		try {
			if (trombone) {
				trombone.triggerRelease();
			}
		} catch (err) {}
		try {
			if (tromboneNoise) {
				tromboneNoise.triggerRelease();
			}
		} catch (err) {}
	}
	function tromboneDown(e) {
		if (layer.dataset.mode != 'trombone' || e.target.closest('.soundboard-toolbar')) {
			return;
		}
		e.preventDefault();
		loadTone().then((Tone) => {
			buildInstruments(Tone);
			Tone.start();
			tromboneAttackAt(tromboneFrom(e));
			tromboneOn = true;
			startWave();
		}).catch(() => {});
	}
	// the crosshair shows where the two axes are being read from, so the pitch and volume you're about to get are legible before you press. held down, both lines take up a travelling sine wave — the note is sounding, and the lines say so. seeded to the middle so there's somewhere sensible to draw before the pointer has been seen at all
	let crossX = window.innerWidth / 2;
	let crossY = window.innerHeight / 2;
	let crossPhase = 0;
	let crossFrame = null;
	// the drawn wave has an envelope of its own, run on the same attack and decay times as the sound: it swells out of a straight line as the note speaks and settles back into one as it dies, rather than snapping between the two.
	let crossEnv = 0;
	let crossEnvTarget = 0;
	let crossLast = 0;
	// walks the brand palette in order for as long as a note is sounding, then hands the line back to off-black when it stops
	const CROSS_COLORS = ['pink', 'green', 'blue', 'yellow', 'purple', 'red'];
	let crossColor = 0;
	let crossColorTimer = null;
	function paintCrossColor() {
		crosshairX.style.stroke = `var(--${CROSS_COLORS[crossColor]})`;
		crosshairY.style.stroke = `var(--${CROSS_COLORS[crossColor]})`;
	}
	// a chained timeout rather than an interval, so the gap can be recomputed from the pitch on every step: high notes flicker, low ones amble
	function stepColor() {
		crossColor = (crossColor + 1) % CROSS_COLORS.length;
		paintCrossColor();
		crossColorTimer = setTimeout(stepColor, 340 - wavePitch() * 290);
	}
	function startColorCycle() {
		clearTimeout(crossColorTimer);
		crossColor = 0;
		paintCrossColor();
		crossColorTimer = setTimeout(stepColor, 340 - wavePitch() * 290);
	}
	function stopColorCycle() {
		clearTimeout(crossColorTimer);
		crossColorTimer = null;
		crosshairX.style.stroke = '';
		crosshairY.style.stroke = '';
	}
	// the wave answers to the same two axes the sound does: it swells with the volume the pointer's height is asking for, and tightens and travels faster as the pitch climbs. read straight off the pointer rather than from the synth, so the line matches what you're about to hear even before Tone has loaded.
	const WAVE_AMPLITUDE_MIN = 4;
	const WAVE_AMPLITUDE_MAX = 110;
	const WAVE_LENGTH_LOW = 280;
	const WAVE_LENGTH_HIGH = 16;
	function waveLoudness() {
		// 0 at the bottom of the screen, 1 at the top — the same way volume runs
		return Math.max(0, Math.min(1, 1 - crossY / vh()));
	}
	function wavePitch() {
		return Math.max(0, Math.min(1, crossX / vw()));
	}
	function waveAmplitude() {
		// scaled by the envelope, so zero is a flat line and one is the full swing
		return (WAVE_AMPLITUDE_MIN + waveLoudness() * (WAVE_AMPLITUDE_MAX - WAVE_AMPLITUDE_MIN)) * crossEnv;
	}
	function waveLength() {
		return WAVE_LENGTH_LOW + wavePitch() * (WAVE_LENGTH_HIGH - WAVE_LENGTH_LOW);
	}

	// the line draws whichever wave is selected, so the shape on screen is the shape being played. phase in radians; i is the sample number, which the noise case needs since noise has no phase to speak of.
	function waveAt(t, i) {
		if (tromboneWave == 'triangle') {
			return Math.asin(Math.sin(t)) * (2 / Math.PI);
		}
		if (tromboneWave == 'square') {
			return Math.sin(t) >= 0 ? 1 : -1;
		}
		if (tromboneWave == 'sawtooth') {
			let f = (t / (Math.PI * 2)) % 1;
			if (f < 0) {
				f += 1;
			}
			return f * 2 - 1;
		}
		if (tromboneWave == 'noise') {
			// hashed rather than Math.random, so a redraw within the same frame gives the same shape and it scrambles as the phase moves on
			let s = Math.sin(i * 12.9898 + Math.floor(crossPhase * 8) * 78.233) * 43758.5453;
			return (s - Math.floor(s)) * 2 - 1;
		}
		return Math.sin(t);
	}

	function drawCrosshair() {
		let width = vw();
		let height = vh();
		crosshairEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
		let setPath = (across, down) => {
			crosshairX.setAttribute('d', across);
			crosshairY.setAttribute('d', down);
		};
		if (crossEnv <= 0.001) {
			setPath(`M0 ${crossY} H${width}`, `M${crossX} 0 V${height}`);
			return;
		}
		// sampled every few pixels — fine enough to read as a curve, coarse enough not to build a thousand-point path sixty times a second
		// finer steps at high pitch, or a tight wave would come out as a zigzag, and the waves that jump rather than curve need finer steps again so the jump reads as a vertical edge instead of a diagonal
		let wavelength = waveLength();
		let amplitude = waveAmplitude();
		let stepPx = Math.max(1.5, Math.min(8, wavelength / 14));
		if (tromboneWave == 'square' || tromboneWave == 'sawtooth') {
			// the jump has to read as a vertical edge, not a diagonal
			stepPx = Math.max(1, Math.min(3, wavelength / 30));
		} else if (tromboneWave == 'noise') {
			// sampled loosely on purpose: dense noise fills in to a solid scribble, where a coarser one still reads as a jagged line
			stepPx = 14;
		}
		let across = '';
		let i = 0;
		for (let x = 0; x <= width; x += stepPx) {
			let y = crossY + waveAt(x / wavelength + crossPhase, i) * amplitude;
			across += `${i == 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)} `;
			i++;
		}
		let down = '';
		i = 0;
		for (let y = 0; y <= height; y += stepPx) {
			let x = crossX + waveAt(y / wavelength + crossPhase, i) * amplitude;
			down += `${i == 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)} `;
			i++;
		}
		setPath(across, down);
	}
	function animateCrosshair(now) {
		crossFrame = null;
		// seconds since the last frame, so the ramp keeps its timing whatever the refresh rate
		let dt = crossLast ? Math.min(0.1, (now - crossLast) / 1000) : 0.016;
		crossLast = now;
		let span = crossEnvTarget > crossEnv
			? TROMBONE_ATTACK[tromboneAttack]
			: TROMBONE_DECAY_DRAWN[tromboneDecay];
		let step = dt / Math.max(0.01, span);
		if (crossEnvTarget > crossEnv) {
			crossEnv = Math.min(crossEnvTarget, crossEnv + step);
		} else {
			crossEnv = Math.max(crossEnvTarget, crossEnv - step);
		}
		// travels faster the higher the note, so pitch reads in the movement as well as in the spacing
		crossPhase += 0.035 + wavePitch() * 0.155;
		drawCrosshair();
		// keeps running through the decay, and only stops once the line is flat
		if (tromboneOn || crossEnv > 0.001) {
			crossFrame = requestAnimationFrame(animateCrosshair);
		} else {
			crossEnv = 0;
			crossLast = 0;
			stopColorCycle();
			drawCrosshair();
		}
	}
	function startWave() {
		startColorCycle();
		crossEnvTarget = 1;
		crossLast = 0;
		if (!crossFrame) {
			crossFrame = requestAnimationFrame(animateCrosshair);
		}
	}
	// asks the wave to settle rather than cutting it: the loop keeps going until the envelope reaches zero, then tidies up after itself
	function stopWave() {
		crossEnvTarget = 0;
		if (!crossFrame && crossEnv > 0.001) {
			crossLast = 0;
			crossFrame = requestAnimationFrame(animateCrosshair);
		}
	}
	// recorded whatever the mode, so switching to the trombone can draw the crosshair where the pointer already is rather than waiting for it to move
	function moveCrosshair(e) {
		crossX = e.clientX;
		crossY = e.clientY;
		if (layer.dataset.mode != 'trombone') {
			return;
		}
		crosshairEl.dataset.show = '1';
		updateReadout();
		if (!tromboneOn) {
			drawCrosshair();
		}
	}
	const READOUT_NAMES = ['C', 'C\u266f', 'D', 'D\u266f', 'E', 'F', 'F\u266f', 'G', 'G\u266f', 'A', 'A\u266f', 'B'];
	// the nearest note to whatever the pointer is asking for, so a slide can be aimed rather than hunted for
	function updateReadout() {
		if (layer.dataset.mode != 'trombone') {
			return;
		}
		let midi = TROMBONE_LOW + wavePitch() * (TROMBONE_HIGH - TROMBONE_LOW);
		let frequency = 440 * Math.pow(2, (midi - 69) / 12);
		let nearest = Math.round(midi);
		readoutNote.textContent = READOUT_NAMES[((nearest % 12) + 12) % 12] + (Math.floor(nearest / 12) - 1);
		readoutHz.textContent = `${frequency.toFixed(1)} Hz`;
	}

	function setTromboneWave(wave) {
		// changed under a held note the sound carries on, just in the new voice: the old one is silenced and the new one picks up at whatever pitch and volume the pointer is asking for. the drawn wave follows on its own, since it reads tromboneWave every frame.
		let holding = tromboneOn;
		if (holding) {
			tromboneReleaseVoices();
		}
		tromboneWave = wave;
		applyTromboneShape();
		syncTromboneControls();
		if (holding) {
			tromboneAttackAt(tromboneHere());
		}
	}
	function setTromboneAttack(name) {
		tromboneAttack = name;
		applyTromboneShape();
		syncTromboneControls();
	}
	function setTromboneDecay(name) {
		tromboneDecay = name;
		applyTromboneShape();
		syncTromboneControls();
	}

	function showCrosshair() {
		crosshairEl.dataset.show = '1';
		updateReadout();
		drawCrosshair();
	}
	function tromboneMove(e) {
		moveCrosshair(e);
		if (!tromboneOn || !trombone) {
			return;
		}
		let at = tromboneFrom(e);
		// ramped rather than set, so it glides instead of stepping
		if (tromboneWave == 'noise' && tromboneNoise) {
			tromboneNoiseFilter.frequency.rampTo(at.frequency, 0.05);
			tromboneNoise.volume.rampTo(at.volume, 0.05);
		} else {
			trombone.frequency.rampTo(at.frequency, 0.05);
			trombone.volume.rampTo(at.volume, 0.05);
		}
	}
	function tromboneUp() {
		if (tromboneOn) {
			tromboneReleaseVoices();
		}
		tromboneOn = false;
		stopWave();
	}
	// built here rather than with the other panels: it reads TROMBONE_LOW and TROMBONE_HIGH, which are declared just above and would still be in the temporal dead zone up there
	buildOctaveMarks();
	syncTromboneControls();

	readoutEl.addEventListener('click', (e) => {
		let wave = e.target.closest('.soundboard-wave');
		if (wave) {
			setTromboneWave(wave.dataset.wave);
			return;
		}
		let attack = e.target.closest('.soundboard-attack');
		if (attack) {
			setTromboneAttack(attack.dataset.attack);
			return;
		}
		let decay = e.target.closest('.soundboard-decay');
		if (decay) {
			setTromboneDecay(decay.dataset.decay);
		}
	});

	layer.addEventListener('pointerdown', tromboneDown);
	window.addEventListener('pointermove', tromboneMove);
	window.addEventListener('pointerup', tromboneUp);
	window.addEventListener('pointercancel', tromboneUp);

	/* ——————————— wiring ——————————— */

	for (let button of layer.querySelectorAll('.soundboard-reaction')) {
		button.addEventListener('click', () => react(button.dataset.char));
	}
	for (let button of layer.querySelectorAll('.soundboard-mode')) {
		button.addEventListener('click', () => setInstrument(button.dataset.instrument));
	}
	layer.querySelector('.soundboard-close').addEventListener('click', () => closeSoundboard());

	// clicking the drawn keys plays them too
	// a held pointer glides across the keys; each new key sounds once as it's crossed, so a drag plays a run rather than needing a click per note
	let sliding = false;
	let lastKey = null;
	function keyUnder(e) {
		let el = document.elementFromPoint(e.clientX, e.clientY);
		return el ? el.closest('[data-note]') : null;
	}
	pianoEl.addEventListener('pointerdown', (e) => {
		let key = e.target.closest('[data-note]');
		if (!key) {
			return;
		}
		e.preventDefault();
		sliding = true;
		lastKey = key;
		playNote(key.dataset.note, key, velocityFromPoint(key, e.clientY));
	});
	window.addEventListener('pointermove', (e) => {
		if (!sliding) {
			return;
		}
		let key = keyUnder(e);
		if (key && key != lastKey) {
			// sliding off a key lets it go, so a run doesn't pile up notes
			if (lastKey) {
				releaseNote(lastKey.dataset.note);
			}
			lastKey = key;
			playNote(key.dataset.note, key, velocityFromPoint(key, e.clientY));
		}
	});
	window.addEventListener('pointerup', () => {
		if (sliding) {
			releaseAllNotes();
		}
		sliding = false;
		lastKey = null;
	});

	pianoEl.addEventListener('click', (e) => {
		let octaveBtn = e.target.closest('.soundboard-octave');
		if (octaveBtn) {
			setOctave(parseInt(octaveBtn.dataset.delta));
			return;
		}
		let velocityBtn = e.target.closest('.soundboard-velocity');
		if (velocityBtn) {
			setVelocity(parseFloat(velocityBtn.dataset.delta));
		}
	});

	// the cats aren't a mode — the button fires them and leaves the current instrument where it is
	function setInstrument(name) {
		if (name == 'cats') {
			react('🐱');
			return;
		}
		// no toggling off: pressing the tool you're already on is a no-op, so there's always something to play
		if (name && layer.dataset.mode == name) {
			return;
		}
		let next = name;
		layer.dataset.mode = next;
		for (let button of layer.querySelectorAll('.soundboard-mode')) {
			button.dataset.active = button.dataset.instrument == next ? 1 : 0;
		}
		tromboneUp();
		releaseAllNotes();
		if (next == 'trombone') {
			showCrosshair();
		} else {
			delete crosshairEl.dataset.show;
		}
		if (next) {
			// warm the library up so the first keypress isn't the one that waits
			loadTone().then(buildInstruments).catch(() => {});
		}
	}

	function openSoundboard() {
		layer.dataset.open = '1';
		// opens on the piano rather than on nothing, so there's something to play the moment it appears
		if (!layer.dataset.mode) {
			setInstrument('piano');
		}
		// the drawing toolbar sits in the same corner, so it stands down while this one is up rather than the two stacking on each other
		document.body.dataset.soundboard = '1';
	}
	function closeSoundboard() {
		layer.dataset.open = '0';
		// the machine deliberately keeps running — closing the panel puts the controls away, it isn't a stop button
		setInstrument('');
		delete document.body.dataset.soundboard;
	}
	function toggleSoundboard() {
		if (layer.dataset.open == '1') {
			closeSoundboard();
		} else {
			openSoundboard();
		}
	}
	window.toggleSoundboard = toggleSoundboard;
	window.openSoundboard = openSoundboard;

	// capture phase, so an instrument's letters reach the instrument instead of the page's tool shortcuts — and only while one is actually chosen.
	document.addEventListener('keyup', (e) => {
		if (layer.dataset.open != '1' || layer.dataset.mode != 'piano') {
			return;
		}
		let letter = e.key.length == 1 ? e.key.toLowerCase() : '';
		let key = letter ? pianoKeyFor(letter) : null;
		if (key) {
			releaseNote(key.dataset.note);
		}
	}, true);
	// a key held while the window loses focus would never see its keyup
	window.addEventListener('blur', releaseAllNotes);

	document.addEventListener('keydown', (e) => {
		if (layer.dataset.open != '1') {
			return;
		}
		if (e.metaKey || e.ctrlKey || e.altKey) {
			return;
		}
		if (e.target.closest && e.target.closest('input, textarea, [contenteditable="true"]')) {
			return;
		}
		if (e.key == 'Escape') {
			e.preventDefault();
			e.stopPropagation();
			closeSoundboard();
			return;
		}
		// the toolbar's own shortcuts, whichever instrument is up
		const MODE_KEYS = { '1': 'piano', '2': 'trombone', '3': 'drums', '4': 'animalese',
			'5': 'machine', '6': 'pads', '7': 'cats' };
		if (MODE_KEYS[e.key]) {
			e.preventDefault();
			e.stopPropagation();
			setInstrument(MODE_KEYS[e.key]);
			return;
		}

		let mode = layer.dataset.mode;
		if (!mode || e.repeat) {
			return;
		}
		let letter = e.key.length == 1 ? e.key.toLowerCase() : '';
		if (!letter) {
			return;
		}
		if (mode == 'trombone') {
			const SHAPE_KEYS = {
				q: () => setTromboneWave('sine'), w: () => setTromboneWave('triangle'),
				e: () => setTromboneWave('square'), r: () => setTromboneWave('sawtooth'),
				t: () => setTromboneWave('noise'),
				a: () => setTromboneAttack('slow'), s: () => setTromboneAttack('quick'),
				d: () => setTromboneDecay('short'), f: () => setTromboneDecay('long')
			};
			if (SHAPE_KEYS[letter]) {
				e.preventDefault();
				e.stopPropagation();
				SHAPE_KEYS[letter]();
			}
			return;
		}
		if (mode == 'pads') {
			if (PADS[letter]) {
				e.preventDefault();
				e.stopPropagation();
				react(PADS[letter]);
				flash(padsEl.querySelector(`[data-letter="${letter}"]`));
			}
			return;
		}
		if (mode == 'piano') {
			const PIANO_KEYS = { z: () => setOctave(-1), x: () => setOctave(1),
				c: () => setVelocity(-0.1), v: () => setVelocity(0.1) };
			if (PIANO_KEYS[letter]) {
				e.preventDefault();
				e.stopPropagation();
				PIANO_KEYS[letter]();
				return;
			}
			let key = pianoKeyFor(letter);
			if (key) {
				e.preventDefault();
				e.stopPropagation();
				playNote(key.dataset.note, key);
			}
		} else if (mode == 'drums' && DRUM_LETTERS.indexOf(letter) >= 0) {
			e.preventDefault();
			e.stopPropagation();
			playDrum(letter);
		} else if (mode == 'animalese' && ANIMALESE_LETTERS.indexOf(letter) >= 0) {
			e.preventDefault();
			e.stopPropagation();
			playAnimalese(letter);
		}
	}, true);
}
initSoundboard();
