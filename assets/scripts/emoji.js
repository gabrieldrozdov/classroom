// readers who ask for less motion get a still emoji instead of the trail
const emojiReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// emoji animation
let emoji = document.querySelector('.menu-header-title-emoji').innerText;
let fullRotation = Math.PI * 2;
let angle = Math.random() * fullRotation;
let direction = 1;
function emojiLoop() {
	if (emojiReducedMotion.matches) {
		return
	}

	// initalize elmnt
	let elmnt = document.createElement('span');
	elmnt.classList.add('menu-header-title-emoji-anim');
	elmnt.innerText = emoji;

	// add to DOM
	let container = document.querySelector('.menu-header-title-emoji-anim-wrapper');
	container.appendChild(elmnt);

	// animate
	setTimeout(() => {
		// 1. pick a random angle in radians (0 to 2*PI)
		angle += fullRotation/24;
		if (angle >= fullRotation) {
			angle = 0;
		}

		// 2. set your fixed distance
		const distance = 500;

		// 3. calculate x and y using trigonometry
		const dest = [Math.cos(angle) * distance, Math.sin(angle) * distance];

		elmnt.style.transform = `translate(${dest[0]}%, ${dest[1]}%) rotate(${Math.random()*1000-500}deg)`;
		elmnt.style.opacity = 0;
	}, 50)

	// remove
	setTimeout(() => {
		elmnt.remove();
	}, 3500)
}

// initiate emojis
setInterval(emojiLoop, 150);

// manual burst
function emojiBurst() {
	for (let i=0; i<24; i++) {
		emojiLoop();
	}
}
