// Header animation
function initTitle() {
	let colors = ['pink', 'green', 'blue', 'yellow', 'purple', 'red'];
	let colorIndex = 0;
	let letterIndex = 0;
	let title = document.querySelector('.menu-header-title-big');
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