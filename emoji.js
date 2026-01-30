

// Emoji animation
let emoji = document.querySelector('.menu-header-title-emoji').innerText;
let fullRotation = Math.PI * 2;
let angle = Math.random() * fullRotation;;
let direction = 1;
function emojiLoop() {

	// Initalize elmnt
	let elmnt = document.createElement('span');
	elmnt.classList.add('menu-header-title-emoji-anim');
	elmnt.innerText = emoji;

	// Add to DOM
	let container = document.querySelector('.menu-header-title-emoji-anim-wrapper');
	container.appendChild(elmnt);

	// Animate
	setTimeout(() => {
		// 1. Pick a random angle in radians (0 to 2*PI)
		angle += fullRotation/24;
		if (angle >= fullRotation) {
			angle = 0;
		}

		// 2. Set your fixed distance
		const distance = 500; 

		// 3. Calculate X and Y using trigonometry
		const dest = [Math.cos(angle) * distance, Math.sin(angle) * distance];

		elmnt.style.transform = `translate(${dest[0]}%, ${dest[1]}%) rotate(${Math.random()*1000-500}deg)`;
		elmnt.style.opacity = 0;
	}, 50)

	// Remove
	setTimeout(() => {
		elmnt.remove();
	}, 3500)
}

// Initiate emojis
setInterval(emojiLoop, 150);

// Manual burst
function emojiBurst() {
	for (let i=0; i<24; i++) {
		emojiLoop();
	}
}