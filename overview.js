// Header animation
function initTitle() {
	let colors = ['pink', 'green', 'blue', 'yellow', 'purple', 'red'];
	let colorIndex = 0;
	let letterIndex = 0;
	let title = document.querySelector('.overview-header-title-big');
	let temp = "";
	let words = title.innerText.split(" ");
	for (let word of words) {
		temp += `<span>`;
		for (let letter of word) {
			temp += `<span style="--primary: var(--${colors[colorIndex]}); animation-delay: ${-letterIndex/12}s">${letter}</span>`;
			colorIndex++;
			letterIndex++;
			if (colorIndex >= colors.length) {
				colorIndex = 0;
			}
		}
		temp += `</span>`;
		temp += `<span><span>&nbsp;</span></span>`;
	}
	title.innerHTML = temp;
}
initTitle();


// Emoji animation
let emoji = document.querySelector('.overview-header-title-emoji').innerText;
function emojiLoop() {

	// Initalize elmnt
	let elmnt = document.createElement('span');
	elmnt.classList.add('overview-header-title-emoji-anim');
	elmnt.innerText = emoji;

	// Add to DOM
	let container = document.querySelector('.overview-header-title-emoji');
	container.appendChild(elmnt);

	// Animate
	setTimeout(() => {
		let dirX = Math.random() < .5 ? -1 : 1;
		let dirY = Math.random() < .5 ? -1 : 1;
		let dest = [dirX*(Math.random()*500), dirY*(Math.random()*500)];
		while (dest[0]*dest[0] + dest[1]*dest[1] < 125000) {
			dest = [dirX*(Math.random()*500), dirY*(Math.random()*500)];
		}
		elmnt.style.transform = `translate(${dest[0]}%, ${dest[1]}%) rotate(${Math.random()*1000-500}deg)`;
		elmnt.style.opacity = 0;
		elmnt.style.filter = `blur(20px)`;
	}, 50)

	// Remove
	setTimeout(() => {
		elmnt.remove();
	}, 5500)
}

// Initiate emojis
setInterval(emojiLoop, 250);