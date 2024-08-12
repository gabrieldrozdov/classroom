// Color controls
const colors = ['red', 'blue', 'purple', 'yellow', 'green', 'pink'];
let activeColor = 'red';
function setColor(colorName) {
	// Set global color
	activeColor = colorName;
	const root = document.querySelector('html');
	root.style.setProperty("--primary", `var(--${colorName})`);

	// Display correct color toggle in header
	document.querySelectorAll(`.header-colors button`).forEach((btn) => {btn.dataset.active = 0});
	const activeColorToggle = document.querySelector(`.header-colors button[data-color="${colorName}"]`);
	activeColorToggle.dataset.active = 1;
}

// Font controls
const fonts = ['Neon', 'Argon', "Xenon", 'Radon', 'Krypton'];
let activeFont = 'Neon';
function setFont(fontName) {
	// Set global font
	activeFont = fontName;
	const root = document.querySelector('html');
	root.style.setProperty("--font", `'Monaspace ${fontName}', monospace`);

	// Display correct font toggle in header
	document.querySelectorAll(`.header-fonts button`).forEach((btn) => {btn.dataset.active = 0});
	const activeFontToggle = document.querySelector(`.header-fonts button[data-font="${fontName}"]`);
	activeFontToggle.dataset.active = 1;
}

// Set random styles for color and font
function setRandomStyles() {
	setColor(colors[Math.floor(Math.random()*colors.length)]);
	setFont(fonts[Math.floor(Math.random()*fonts.length)]);
}
setRandomStyles();