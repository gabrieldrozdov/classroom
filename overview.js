// Header animation
function initTitle() {
	let colors = ['pink', 'green', 'blue', 'yellow', 'purple', 'red'];
	let colorIndex = 0;
	let title = document.querySelector('.overview-header-title-big');
	let temp = "";
	let words = title.innerText.split(" ");
	for (let word of words) {
		temp += `<span style="--primary: var(--${colors[colorIndex]}); animation-delay: ${-colorIndex/3}s"><span>${word}</span></span>`;
		colorIndex++;
		if (colorIndex >= colors.length) {
			colorIndex = 0;
		}
	}
	title.innerHTML = temp;
}
initTitle();

// Emoji animation
function emojiLoop() {

	// Initalize elmnt
	let emoji = document.querySelector('.overview-header-title-emoji').innerText;
	let elmnt = document.createElement('div');
	elmnt.classList.add('overview-emoji');
	elmnt.innerText = emoji;
	elmnt.style.fontSize = Math.random()*5+2+"vw";
	elmnt.style.opacity = 0;
	elmnt.style.filter = `blur(${Math.random()*4}px)`;

	// Origin
	let diceRoll = Math.random();
	let origin = [0, 0];
	// if (diceRoll < .25) { // from top
	// 	origin = [Math.random()*50-25, -25];
	// } else if (diceRoll < .5) { // from right
	// 	origin = [25, Math.random()*50-25];
	// } else if (diceRoll < .75) { // from bottom
	// 	origin = [Math.random()*50-25, 25];
	// } else { // from left
	// 	origin = [-25, Math.random()*50-25];
	// }
	elmnt.style.transform = `translate(calc(${origin[0]}vmin - 50%), calc(${origin[1]}vmin - 50%)) rotate(0deg)`;

	// Duration
	let duration = Math.random()*5+3;
	elmnt.style.transition = `transform ${duration}s linear, opacity 1s`;

	// Add to DOM
	let header = document.querySelector('.overview-header');
	header.appendChild(elmnt);

	// Destination
	diceRoll = Math.random();
	let destination;
	if (diceRoll < .25) { // to top
		destination = [Math.random()*100-50, -50];
	} else if (diceRoll < .5) { // to right
		destination = [50, Math.random()*100-50];
	} else if (diceRoll < .75) { // to bottom
		destination = [Math.random()*100-50, 50];
	} else { // to left
		destination = [-50, Math.random()*100-50];
	}

	// Animate
	setTimeout(() => {
		elmnt.style.transform = `translate(calc(${destination[0]}vmin - 50%), calc(${destination[1]}vmin - 50%)) rotate(${Math.random()*2000-1000}deg)`;
		elmnt.style.opacity = 1;
	}, 50)

	// Remove
	setTimeout(() => {
		elmnt.style.opacity = 0;
		setTimeout(() => {
			elmnt.remove();
		}, 1000)
	}, duration*1000-1000)
}

// Initiate emojis
setInterval(emojiLoop, 100);
emojiLoop();
for (let i=0; i<20; i++) {
	emojiLoop();
}

// Reduce lag when resizing screen
window.addEventListener('resize', () => {
	for (let emoji of document.querySelectorAll('.overview-emoji')) {
		emoji.style.display = 'none';
	}
})

// Remove elements when switching tab
document.addEventListener("visibilitychange", () => {
	for (let emoji of document.querySelectorAll('.overview-emoji')) {
		emoji.style.display = 'none';
	}
});

// Link observer
for (let section of document.querySelectorAll('.section')) {
	section.dataset.active = 0;
}


// Link styling
function initLinks() {
	let dir = -1;
	const observer = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting) {
				dir *= -1;
				let elmnt = entry.target;
				elmnt.dataset.active = 1;
				elmnt.style.transform = `rotate(${Math.random()*2*dir}deg) translate(${Math.random()*5*dir}%, 0)`;
				observer.unobserve(entry.target);
			}
		});
	});
	for (let link of document.querySelectorAll('.overview-menu-links > a')) {
		observer.observe(link);
	}
}
initLinks();