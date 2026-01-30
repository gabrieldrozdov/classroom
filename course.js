// Header animation
function initTitle() {
	let letterIndex = 0;
	let title = document.querySelector('.menu-header-title-big');
	let temp = "";
	let words = title.innerText.split(" ");
	for (let word of words) {
		temp += `<span>`;
		for (let letter of word) {
			temp += `<span style="animation-delay: ${-letterIndex/12}s">${letter}</span>`;
			letterIndex++;
		}
		temp += `</span>`;
		temp += `<span><span>&nbsp;</span></span>`;
	}
	title.innerHTML = temp;
}
initTitle();