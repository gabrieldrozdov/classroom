// the markdown-to-HTML converter, shared by the build and by the /editor/ page. loaded with require() in generator.js and as a plain <script> in the browser, so the editor's live preview is produced by the very same code that writes the site — a shortcode added here shows up in both without being written twice.
// the palette it needs is handed in rather than read from disk, because the build reads it out of style.css while the browser reads it off the stylesheet already applied to the page.
(function (root, factory) {
	if (typeof module == 'object' && module.exports) {
		module.exports = factory();
	} else {
		root.ClassroomMarkdown = factory();
	}
})(typeof globalThis != 'undefined' ? globalThis : this, function () {

// single horizontal wave (reused by the homepage menu lines and the wavy markdown divider)
const menuLine = `<svg viewBox="0 -10 1000 41"><path d="M1000,.5c-13.9,0-21.13,5.78-27.5,10.88-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12c-6.37-5.1-13.6-10.88-27.5-10.88s-21.13,5.78-27.5,10.88c-6.12,4.9-11.4,9.12-22.5,9.12s-16.38-4.23-22.5-9.12C21.13,6.28,13.9.5,0,.5"/></svg>`;

const colors = ["pink", "green", "blue", "yellow", "purple", "red"];

// counter for calendar annotation ids (kept unique across the whole run)
let calendarEntryIndex = 0;

// heading ids used so far on the page being generated, so two headings with the same name don't end up sharing an id (reset per resource)
let headingSlugs = {};

// the primary color currently in effect while a page is being generated, so "[primary rotate]" knows which color to step on from (reset per resource)
let currentPrimary = '';

// hex values for the palette, used to keep calendar day numbers legible on whatever color their entry carries. supplied by the caller: the build reads them out of style.css, the editor off the live stylesheet. left empty, calendars simply fall back to dark day numbers.
let paletteValues = {};
function setPaletteValues(values) {
	paletteValues = values || {};
}

// start a new document: heading ids are deduplicated per page, so the tally starts fresh for each one. hand-written [#name] anchors are claimed up front — they're what links in the text point at, so a heading of the same name is the one that gets numbered. each page also starts with no primary set, so the first "[primary rotate]" on it lands on pink.
function beginDocument(markdownRaw) {
	headingSlugs = {};
	for (let anchor of (markdownRaw || '').matchAll(/^\[#([\w-]+)\]\s*$/gm)) {
		headingSlugs[anchor[1]] = (headingSlugs[anchor[1]] || 0) + 1;
	}
	currentPrimary = '';
}

// calendar annotation ids stay unique across a whole build, so the counter deliberately doesn't reset per document. the editor renders one document over and over and wants the ids stable, so it resets the counter itself.
function resetCalendarIndex() {
	calendarEntryIndex = 0;
}

// convert markdown into HTML Covers the essentials (headings, bold, italic, links, images, lists, code, blockquotes, horizontal rules, and paragraphs) plus custom features for these course pages: FAQ dropdowns, multi-column sections, file embeds, wide media, CTA buttons, anchor links, and colored or highlighted text.
function markdownToHTML(markdown) {

	// palette colors available for colored text, highlights, and dividers. "primary" resolves to the current --primary at that point.
	const paletteColors = "pink|green|blue|yellow|purple|red|primary";

	// small "open in new tab" arrow icon
	const arrowIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>`;

	// plus/minus icons for FAQ dropdowns
	const faqIconPlus = `<span class="resource-preview-markdown-faq-icon-plus">👇</span>`;
	const faqIconMinus = `<span class="resource-preview-markdown-faq-icon-minus">👆</span>`;

	// escape HTML special characters (used inside code)
	function escapeHTML(text) {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
	}

	// attribute values need quotes escaped on top of the above, or the first one in the value closes the attribute early
	function escapeAttribute(text) {
		return escapeHTML(text).replace(/"/g, '&quot;');
	}

	// turn heading text into a URL-friendly id for anchor links
	function slugify(text) {
		return text
			.toLowerCase()
			.replace(/<[^>]+>/g, '')
			.replace(/[^\w\s-]/g, '')
			.trim()
			.replace(/\s+/g, '-');
	}

	// the same, but numbered if the page already has a heading by that name: "week-1", then "week-1-1", "week-1-2", and so on
	function uniqueSlug(text) {
		let slug = slugify(text);
		let taken = headingSlugs[slug] || 0;
		headingSlugs[slug] = taken + 1;
		return taken == 0 ? slug : `${slug}-${taken}`;
	}

	// pick the right media tag based on the file extension
	function mediaTag(src, alt) {
		let ext = src.split(/[?#]/)[0].split('.').pop().toLowerCase();
		if (["mp4", "webm", "mov", "m4v"].includes(ext)) {
			return `<video src="${src}" controls></video>`;
		}
		if (["mp3", "wav", "ogg", "m4a"].includes(ext)) {
			return `<audio src="${src}" controls></audio>`;
		}
		return `<img src="${src}" alt="${alt}">`;
	}

	// month names and weekday headers used by the calendar
	const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	const weekdayNames = ["S", "M", "T", "W", "Th", "F", "S"];

	// a date written as M/D/YY, M/D/YYYY, or YYYY-MM-DD
	const dateToken = `\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}|\\d{4}-\\d{1,2}-\\d{1,2}`;

	// wherever a color can be named — a calendar entry, a table cell, colored or highlighted text — it can be any palette or neutral color, "primary", or a hex code (longer names first so "light-gray" isn't read as "gray")
	const colorNames = "off-white|off-black|light-gray|dark-gray|lighter-gray|gray|pink|green|blue|yellow|purple|red|primary";
	const colorToken = `#[0-9a-fA-F]{3,8}|${colorNames}`;

	// a calendar entry marker on its own line, opening a new entry: [9/15/26] • [9/22/26 - 10/6/26] • [9/15/26 green] • [9/15/26 #ff0088]
	const calendarMarker = new RegExp(`^\\[\\s*(${dateToken})(?:\\s*(?:–|—|-|to)\\s*(${dateToken}))?(?:\\s+(${colorToken}))?\\s*\\]$`);

	// turn a written date into a Date (two-digit years are 2000s)
	function parseDate(text) {
		let slash = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
		if (slash) {
			let year = parseInt(slash[3]);
			if (year < 100) {
				year += 2000;
			}
			return new Date(year, parseInt(slash[1]) - 1, parseInt(slash[2]));
		}
		let iso = text.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
		if (iso) {
			return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));
		}
		return null;
	}

	// identify a calendar day (so two Dates on the same day match)
	function dayKey(date) {
		return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
	}

	// human-readable labels for a single date and for a range
	function formatDate(date) {
		return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
	}
	function formatRange(start, end) {
		if (start.getFullYear() != end.getFullYear()) {
			return `${formatDate(start)} – ${formatDate(end)}`;
		}
		if (start.getMonth() == end.getMonth()) {
			return `${monthNames[start.getMonth()]} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
		}
		return `${monthNames[start.getMonth()]} ${start.getDate()} – ${monthNames[end.getMonth()]} ${end.getDate()}, ${start.getFullYear()}`;
	}

	// a named color becomes the custom property that holds it; a hex code stands as written
	function colorValue(color) {
		return color.startsWith('#') ? color : `var(--${color})`;
	}

	// an entry's color, defaulting to whatever --primary is in effect
	function calendarColor(color) {
		return color ? colorValue(color) : 'var(--primary)';
	}

	// the only two palette colors dark enough to need light text on them. everything else in the palette — the six brand colors and the light grays — takes dark text.
	const darkBackgrounds = ["dark-gray", "off-black"];

	// break a color into channels, if it resolves to a known hex value
	function colorChannels(color) {
		let hex = color && color.startsWith('#') ? color : paletteValues[color];
		if (!hex) {
			return null;
		}
		hex = hex.replace('#', '');
		if (hex.length == 3 || hex.length == 4) {
			hex = hex.split('').map(character => character + character).join('');
		}
		return [parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16)];
	}

	// relative luminance as WCAG defines it, which is what a contrast ratio is measured from. the channels are gamma-corrected first, so a mid-tone lands where the eye puts it rather than where its raw value does.
	function relativeLuminance(channels) {
		let linear = channels.map(channel => {
			let value = channel / 255;
			return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
		});
		return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
	}

	// the contrast between two luminances
	function contrastRatio(one, other) {
		return (Math.max(one, other) + 0.05) / (Math.min(one, other) + 0.05);
	}

	// off-black or off-white text, whichever stays legible on the given background.
	// the palette's own names are settled by name rather than measured, so the six brand colors always take dark text and the two dark grays always take light text however the hex values are tuned later. a hex code written by hand has no such promise attached, so it is measured against both and given whichever wins.
	// "primary" is whatever the last [primary] break set, so a cell painted with it follows the page down.
	function readableTextColor(color) {
		if (color == 'primary') {
			color = currentPrimary || '';
		}
		if (color && !color.startsWith('#')) {
			return darkBackgrounds.includes(color) ? 'var(--off-white)' : 'var(--off-black)';
		}
		let channels = colorChannels(color);
		if (!channels) {
			return 'var(--off-black)';
		}
		let luminance = relativeLuminance(channels);
		let onDark = contrastRatio(luminance, relativeLuminance(colorChannels(paletteValues['off-black'] || '#1a1a1a')));
		let onLight = contrastRatio(luminance, relativeLuminance(colorChannels(paletteValues['off-white'] || '#fafafa')));
		return onLight > onDark ? 'var(--off-white)' : 'var(--off-black)';
	}

	// a table cell can open with markers that set how it's drawn: {bg:color} paints its background, and {left}, {center} or {right} set how its text sits in it. both can be written, in either order.
	const cellMarker = new RegExp(`^\\{(?:bg:\\s*(${colorToken})|(left|center|right))\\s*\\}\\s*`);

	// inside a cell, a backslash standing on its own is a line break, so a cell can hold a list — or anything else written across lines — without leaving the row it belongs to. it has to stand alone to count, which keeps a backslash inside a path or an escape sequence out of it.
	const cellBreak = /(?:^|\s)\\(?=\s|$)/g;

	// split a table row into its cells. a cell written as "<" merges into the one to its left and "^" into the one above, so a merged area is drawn in the markdown as the shape it takes on the page.
	function tableCells(row) {
		return row.trim().replace(/^\||\|$/g, '').split('|').map(cell => {
			let text = cell.trim();
			if (text == '<' || text == '^') {
				return { merge: text == '<' ? 'left' : 'up' };
			}

			// the opening markers, however many of them there are and in whichever order they were written
			let color = '';
			let align = '';
			let marker;
			while ((marker = text.match(cellMarker)) != null) {
				if (marker[1]) {
					color = marker[1];
				} else {
					align = marker[2];
				}
				text = text.slice(marker[0].length);
			}

			// a cell written across lines, or opening with a list marker, goes through the block converter instead of the inline one, so it can hold a list, a heading, or several paragraphs. a two-line break (" \\ \\ ") leaves a blank line between them, which is what separates one paragraph from the next. anything on a single line stays on the inline pass and comes out exactly as it always has.
			let lines = text.split(cellBreak).map(part => part.trim());
			let block = lines.length > 1 || /^(?:[-*+]\s|\d+\.\s)/.test(text);
			return { content: block ? lines.join('\n') : text.trim(), color: color, align: align, block: block };
		});
	}

	// the divider row under a table's header can carry a width for each column: "| --- 2 | --- 1 | --- 1 |" makes the first column twice as wide as the others. the numbers are a ratio rather than a measurement, so they don't have to add up to anything, and a column left without one counts as 1.
	// written as plain dashes, the row says nothing about width and the table sizes its columns to their contents, which is what it has always done.
	const dividerCell = /^:?-{3,}:?\s*(\d+(?:\.\d+)?)?$/;

	// the widths as percentages, or nothing at all if the row names none
	function tableWidths(divider) {
		let cells = divider.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
		let ratios = cells.map(cell => {
			let match = cell.match(dividerCell);
			return match && match[1] ? parseFloat(match[1]) : 0;
		});
		if (!ratios.some(ratio => ratio > 0)) {
			return null;
		}
		let filled = ratios.map(ratio => ratio > 0 ? ratio : 1);
		let total = filled.reduce((sum, ratio) => sum + ratio, 0);
		return filled.map(ratio => (ratio / total * 100).toFixed(4));
	}

	// build the rows of one table section, resolving the merge markers into colspan and rowspan.
	// every position keeps a reference to the cell that owns it, so a marker only has to look one step left or up to find its owner even when that owner started several columns or rows back. a span is widened only from the marker's own edge — the top row of a merged block widens it sideways, the left column downwards — so a block merged both ways is counted once in each direction rather than once per marker.
	function tableSection(rows, tag) {
		let parsed = rows.map(tableCells);
		let owners = [];
		for (let row = 0; row < parsed.length; row++) {
			owners[row] = [];
			for (let column = 0; column < parsed[row].length; column++) {
				let cell = parsed[row][column];
				let owner = null;
				if (cell.merge == 'left') {
					owner = column > 0 ? owners[row][column - 1] : null;
					if (owner && owner.row == row) {
						owner.colspan++;
					}
				} else if (cell.merge == 'up') {
					owner = row > 0 ? owners[row - 1][column] : null;
					if (owner && owner.column == column) {
						owner.rowspan++;
					}
				}

				// a marker with nothing to merge into (the first cell of a row, or of the section) becomes an empty cell of its own rather than disappearing
				if (cell.merge && !owner) {
					cell.merge = '';
					cell.content = '';
				}
				if (!cell.merge) {
					cell.row = row;
					cell.column = column;
					cell.colspan = 1;
					cell.rowspan = 1;
					owner = cell;
				}
				owners[row][column] = owner;
			}
		}

		let sectionHTML = '';
		for (let row of parsed) {
			let cellsHTML = '';
			for (let cell of row) {
				if (cell.merge) {
					continue;
				}
				let attrs = '';
				if (cell.colspan > 1) {
					attrs += ` colspan="${cell.colspan}"`;
				}
				if (cell.rowspan > 1) {
					attrs += ` rowspan="${cell.rowspan}"`;
				}
				let styles = '';
				if (cell.color) {
					styles += `background-color: ${colorValue(cell.color)}; color: ${readableTextColor(cell.color)};`;
				}
				if (cell.align) {
					styles += ` text-align: ${cell.align};`;
				}
				if (styles != '') {
					attrs += ` style="${styles.trim()}"`;
				}
				cellsHTML += `<${tag}${attrs}>${cell.block ? markdownToHTML(cell.content) : inline(cell.content)}</${tag}>`;
			}
			sectionHTML += `<tr>${cellsHTML}</tr>`;
		}
		return sectionHTML;
	}

	// build a month-by-month calendar grid from a "::: calendar" block. every dated day takes on its entry's color and shows the annotation on hover; a range simply colors each of the days it covers.
	function buildCalendar(inner) {

		// split the block into entries: a bracketed date marker opens one, and every line until the next marker is its annotation
		let entries = [];
		let current = null;
		for (let line of inner.split('\n')) {
			let marker = line.trim().match(calendarMarker);
			if (marker) {
				let start = parseDate(marker[1]);
				let end = marker[2] ? parseDate(marker[2]) : null;
				if (start) {
					if (end && end < start) {
						let swap = start;
						start = end;
						end = swap;
					}
					current = { start: start, end: end, color: marker[3] || '', content: '' };
					entries.push(current);
				}
				continue;
			}
			if (current) {
				current.content += `${line}\n`;
			}
		}
		if (entries.length == 0) {
			return '';
		}

		// render each annotation and file it under every day it covers, so a range colors all of its days and each of them opens the note.
		// a marker with nothing written under it is a color and nothing more — it paints its days, but there's no note to open and nothing for it to say in the key, so it never gets an id at all.
		let marked = {};
		for (let entry of entries) {
			entry.annotated = entry.content.trim() != '';
			if (entry.annotated) {
				calendarEntryIndex++;
				entry.id = `calendar-entry-${calendarEntryIndex}`;
				entry.html = markdownToHTML(entry.content.trim());
			}
			let last = entry.end || entry.start;
			let day = new Date(entry.start.getFullYear(), entry.start.getMonth(), entry.start.getDate());
			while (day <= last) {
				let key = dayKey(day);
				if (!marked[key]) {
					marked[key] = [];
				}
				marked[key].push(entry);
				day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
			}
		}

		// the calendar covers every month from the earliest to the latest date, including any months in between with nothing in them
		let min = entries[0].start;
		let max = entries[0].end || entries[0].start;
		for (let entry of entries) {
			let entryEnd = entry.end || entry.start;
			if (entry.start < min) {
				min = entry.start;
			}
			if (entryEnd > max) {
				max = entryEnd;
			}
		}

		let weekdaysHTML = '';
		for (let weekday of weekdayNames) {
			weekdaysHTML += `<span class="resource-preview-markdown-calendar-weekday">${weekday}</span>`;
		}

		let monthsHTML = '';
		let cursor = new Date(min.getFullYear(), min.getMonth(), 1);
		let lastMonth = new Date(max.getFullYear(), max.getMonth(), 1);
		while (cursor <= lastMonth) {
			let year = cursor.getFullYear();
			let month = cursor.getMonth();
			let monthLength = new Date(year, month + 1, 0).getDate();
			let leading = new Date(year, month, 1).getDay();
			let cellCount = Math.ceil((leading + monthLength) / 7) * 7;

			let daysHTML = '';
			for (let cell = 0; cell < cellCount; cell++) {
				let day = cell - leading + 1;

				// days belonging to the neighboring months stay blank
				if (day < 1 || day > monthLength) {
					daysHTML += `<div class="resource-preview-markdown-calendar-day" data-empty="1"></div>`;
					continue;
				}
				let date = new Date(year, month, day);
				let dayEntries = marked[dayKey(date)] || [];
				if (dayEntries.length == 0) {
					daysHTML += `<div class="resource-preview-markdown-calendar-day"><span class="resource-preview-markdown-calendar-day-number">${day}</span></div>`;
					continue;
				}

				// a day carrying more than one entry is split evenly between their colors rather than picking a winner
				let dayColors = dayEntries.map(entry => calendarColor(entry.color));
				let background = dayColors[0];
				if (dayColors.length > 1) {
					let stops = dayColors.map((color, index) => `${color} ${(index / dayColors.length * 100).toFixed(2)}% ${((index + 1) / dayColors.length * 100).toFixed(2)}%`);
					background = `linear-gradient(135deg, ${stops.join(', ')})`;
				}
				let style = `--entry-color: ${dayColors[0]}; --entry-text: ${readableTextColor(dayEntries[0].color)}; background: ${background};`;

				// only the entries carrying a note make the day something to open. a day colored by bare dates alone gets none of that — no focus stop, no button role, nothing for the tooltip to find.
				let noted = dayEntries.filter(entry => entry.annotated);
				let dayAttrs = '';
				if (noted.length > 0) {
					dayAttrs = ` tabindex="0" role="button" aria-expanded="false" aria-describedby="${noted[0].id}" data-annotations="${noted.map(entry => entry.id).join(' ')}" aria-label="${formatDate(date)} — show annotation"`;
				}
				daysHTML += `<div class="resource-preview-markdown-calendar-day" data-marked="1" style="${style}"${dayAttrs}><span class="resource-preview-markdown-calendar-day-number">${day}</span></div>`;
			}

			monthsHTML += `<div class="resource-preview-markdown-calendar-month"><div class="resource-preview-markdown-calendar-month-label">${monthNames[month]} <span class="resource-preview-markdown-calendar-month-label-year">${year}</span></div><div class="resource-preview-markdown-calendar-weekdays">${weekdaysHTML}</div><div class="resource-preview-markdown-calendar-days">${daysHTML}</div></div>`;
			cursor = new Date(year, month + 1, 1);
		}

		// the annotations themselves, listed below the grid as a key — and the tooltip copies its content from here on hover, so the two can never drift apart
		let annotationsHTML = '';
		for (let entry of entries) {
			if (!entry.annotated) {
				continue;
			}
			let label = entry.end && dayKey(entry.end) != dayKey(entry.start) ? formatRange(entry.start, entry.end) : formatDate(entry.start);
			annotationsHTML += `<div class="resource-preview-markdown-calendar-annotation" id="${entry.id}" style="--entry-color: ${calendarColor(entry.color)};"><div class="resource-preview-markdown-calendar-annotation-date">${label}</div><div class="resource-preview-markdown-calendar-annotation-content">${entry.html}</div></div>`;
		}

		// a calendar of nothing but colored dates has no key to show, so it doesn't get an empty one
		let annotations = annotationsHTML != '' ? `<div class="resource-preview-markdown-calendar-annotations">${annotationsHTML}</div>` : '';

		return `<div class="resource-preview-markdown-calendar"><div class="resource-preview-markdown-calendar-months">${monthsHTML}</div>${annotations}</div>`;
	}

	// detect a line made up entirely of CTA buttons: [[label](url)]
	function parseButtons(line) {
		let trimmed = line.trim();
		if (trimmed == '' || !/^(\[\[[^\]]+\]\([^)]+\)\]\s*)+$/.test(trimmed)) {
			return null;
		}
		let buttons = [];
		let regex = /\[\[([^\]]+)\]\(([^)]+)\)\]/g;
		let match;
		while ((match = regex.exec(trimmed)) != null) {
			buttons.push({ label: match[1], url: match[2] });
		}
		return buttons;
	}

	// default emoji per file type, used when an entry doesn't carry its own. anything unrecognised falls back to a plain document.
	const fileEmoji = {
		folder: '📁',
		html: '🌐', htm: '🌐',
		css: '🎨',
		js: '⚙️', mjs: '⚙️', json: '⚙️',
		md: '📝', txt: '📝', rtf: '📝',
		pdf: '📕',
		doc: '📘', docx: '📘',
		xls: '📗', xlsx: '📗', csv: '📗',
		ppt: '📙', pptx: '📙',
		jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️', avif: '🖼️', svg: '🖼️',
		mp4: '🎬', mov: '🎬', webm: '🎬', avi: '🎬',
		mp3: '🎵', wav: '🎵', aiff: '🎵', m4a: '🎵',
		otf: '🔤', ttf: '🔤', woff: '🔤', woff2: '🔤', glyphs: '🔤',
		zip: '🗜️', rar: '🗜️', tar: '🗜️', gz: '🗜️',
		ai: '🖊️', psd: '🖌️', indd: '📐', fig: '🎛️', sketch: '💎',
		file: '📄'
	};

	// build a file tree from a "::: files" block. each line is one entry and nesting comes from indentation (a tab or two spaces per level):
	// my-site index.html 🐈 cat.html images [logo.svg](/logo.svg)
	// an entry is a folder when something is nested underneath it, or when its name ends in a slash. the emoji is inferred from the extension unless the line starts with one, and a link uses the usual [label](url) form.
	function buildFileTree(inner, title) {
		let lines = inner.split('\n').filter(line => line.trim() != '');
		if (lines.length == 0) {
			return '';
		}

		// "::: files [folder] my-site" opens in the folder browser instead of the file listing. the marker is stripped out, so whatever's left is still the title.
		let view = 'file';
		title = (title || '').replace(/\[(file|folder)\]/i, (match, name) => {
			view = name.toLowerCase();
			return '';
		}).trim();

		// indentation is measured in columns so tabs and spaces can be mixed; the shallowest line in the block becomes the root level
		function indentOf(line) {
			let width = 0;
			for (let char of line) {
				if (char == '\t') {
					width += 4;
				} else if (char == ' ') {
					width += 1;
				} else {
					break;
				}
			}
			return width;
		}
		let widths = [...new Set(lines.map(indentOf))].sort((a, b) => a - b);

		let entries = [];
		for (let line of lines) {
			let depth = widths.indexOf(indentOf(line));
			let text = line.trim();

			// a leading emoji overrides whatever the extension would give
			let emoji = '';
			let written = text.match(/^(\p{Extended_Pictographic}(?:‍\p{Extended_Pictographic}|[️\u{1F3FB}-\u{1F3FF}])*)\s+(.*)$/u);
			if (written) {
				emoji = written[1];
				text = written[2].trim();
			}

			// optional link, using the same [label](url) form as everywhere else
			let url = '';
			let link = text.match(/^\[([^\]]*)\]\(([^)]+)\)$/);
			if (link) {
				text = link[1].trim();
				url = link[2].trim();
			}

			let explicitFolder = text.endsWith('/');
			if (explicitFolder) {
				text = text.slice(0, -1);
			}
			entries.push({ depth, name: text, emoji, url, explicitFolder, children: [] });
		}

		// fold the flat list into a tree using the depths
		let root = [];
		let stack = [{ depth: -1, children: root }];
		for (let entry of entries) {
			while (stack.length > 1 && stack[stack.length - 1].depth >= entry.depth) {
				stack.pop();
			}
			stack[stack.length - 1].children.push(entry);
			stack.push(entry);
		}

		// now that nesting is known, settle each entry's type and emoji
		function resolve(nodes) {
			for (let node of nodes) {
				node.folder = node.explicitFolder || node.children.length > 0;
				if (!node.emoji) {
					let ext = node.folder ? 'folder' : (node.name.split('.').pop() || '').toLowerCase();
					node.emoji = fileEmoji[ext] || (node.folder ? fileEmoji.folder : fileEmoji.file);
				}
				resolve(node.children);
			}
		}
		resolve(root);

		// one column of the connector, drawn rather than typed. box-drawing characters can only be as tall as their glyph, so the verticals broke into dashes between rows; an SVG stretched to the row's full height meets the one above and below it exactly.
		// preserveAspectRatio="none" lets a cell stretch to whatever height the row turns out to be. that stretch is uneven — the cell is far taller than it is wide — so the stroke has to opt out of scaling or the verticals come out thinner than the horizontals. vector-effect isn't an inherited property, so it's set on the lines themselves in the CSS rather than here on the <svg>.
		function branchCell(shape) {
			// one path per cell rather than two crossed lines. butt-capped strokes stop dead on the corner point, which leaves a notch out of the outside of an elbow; drawn as a single path the corner is a join and closes itself. a tee doesn't have the problem — its vertical runs straight through the meeting point — but it's written the same way so the three shapes stay comparable.
			let lines = '';
			if (shape == 'through') {
				lines = `<path d="M5 0 V10"/>`;
			} else if (shape == 'tee') {
				lines = `<path d="M5 0 V10 M5 5 H10"/>`;
			} else if (shape == 'elbow') {
				lines = `<path d="M5 0 V5 H10"/>`;
			} else {
				return `<span class="resource-preview-markdown-files-branch-cell"></span>`;
			}
			return `<svg class="resource-preview-markdown-files-branch-cell" viewBox="0 0 10 10" preserveAspectRatio="none" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1">${lines}</svg>`;
		}

		// the indented listing, which is what prints and what shows by default.
		// a connector column is exactly as wide as the emoji column, so the guide line for each level lands under the centre of the emoji it belongs to and the whole thing reads as descending from the folder. top-level entries have no parent to descend from, so they get no connector.
		// `cols` holds one flag per column above this row's own: whether the branch we came through at that level still has entries after it. that is about the child we descended into, not about the folder that owns the column — a folder can have plenty of siblings left while the branch we're inside has run out, and drawing the column then trails a line down past the last entry, attached to nothing.
		function treeHTML(nodes, cols, depth) {
			let out = '';
			nodes.forEach((node, index) => {
				let last = index == nodes.length - 1;
				let cells = depth == 0 ? '' : `${cols.map(more => branchCell(more ? 'through' : 'blank')).join('')}${branchCell(last ? 'elbow' : 'tee')}`;
				let label = `<span class="resource-preview-markdown-files-branch">${cells}</span><span class="resource-preview-markdown-files-label"><span class="resource-preview-markdown-files-emoji">${node.emoji}</span><span class="resource-preview-markdown-files-name">${escapeHTML(node.name)}</span></span>`;
				// the depth lets the CSS put a folder's descender under its own emoji, joining it to the connectors of the entries beneath
				let rowAttrs = `class="resource-preview-markdown-files-row" style="--files-depth: ${depth}"`;
				let row = node.url
					? `<a ${rowAttrs} href="${escapeAttribute(node.url)}">${label}</a>`
					: `<span ${rowAttrs}>${label}</span>`;
				out += `<li class="resource-preview-markdown-files-item" data-folder="${node.folder ? 1 : 0}">${row}`;
				if (node.children.length > 0) {
					// children of a top-level entry start with no columns above them; deeper ones inherit ours plus one for the branch they're in
					let childCols = depth == 0 ? [] : cols.concat(!last);
					out += `<ul class="resource-preview-markdown-files-list">${treeHTML(node.children, childCols, depth + 1)}</ul>`;
				}
				out += `</li>`;
			});
			return out;
		}

		// the finder view is built in the browser from this, so the whole tree travels with the block rather than being re-parsed from the markup
		function data(nodes) {
			return nodes.map(node => ({
				name: node.name,
				emoji: node.emoji,
				folder: node.folder,
				url: node.url || undefined,
				children: node.children.length > 0 ? data(node.children) : undefined
			}));
		}

		// in folder view the title turns into the path you're standing in, so there's one heading rather than a heading and a breadcrumb under it. the back button lives beside it and only shows in that view.
		let rootLabel = title ? ` data-root="${escapeAttribute(title)}"` : '';
		return `<div class="resource-preview-markdown-files" data-view="${view}"${rootLabel} data-tree="${escapeAttribute(JSON.stringify(data(root)))}"><div class="resource-preview-markdown-files-bar"><button class="resource-preview-markdown-files-back" type="button" aria-label="Back">👈</button><span class="resource-preview-markdown-files-title">${title ? inline(title) : ''}</span><button class="resource-preview-markdown-files-toggle" type="button">${view == 'folder' ? 'file view' : 'folder view'}</button></div><ul class="resource-preview-markdown-files-list resource-preview-markdown-files-tree">${treeHTML(root, [], 0)}</ul></div>`;
	}

	// convert inline markdown within a single line of text
	function inline(text) {

		// pull out inline code first so its contents aren't reformatted, then drop the finished spans back in at the end
		let codeSpans = [];
		text = text.replace(/`([^`]+)`/g, (match, code) => {
			codeSpans.push(`<code>${escapeHTML(code)}</code>`);
			return `\u0000${codeSpans.length - 1}\u0000`;
		});

		// inline images (and other media)
		text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => mediaTag(src, alt));

		// links (in-page anchors stay put; everything else opens externally). the label and an arrow are wrapped in their own spans.
		text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
			let attrs = url.startsWith('#') ? '' : ' target="_blank" rel="noopener"';
			return `<a href="${url}"${attrs}><span class="resource-preview-markdown-link-text">${label}</span><span class="resource-preview-markdown-link-arrow">↗</span></a>`;
		});

		// colored text: {c:color text}
		text = text.replace(new RegExp(`\\{c:(${colorToken})\\s+([^}]*)\\}`, 'g'), (match, color, content) => `<span class="resource-preview-markdown-color" style="color: ${colorValue(color)};">${content}</span>`);

		// highlighted text: {h:color text}, its text set to whichever of off-black and off-white stays legible on top so a dark or hand-picked highlight doesn't swallow what it's marking
		text = text.replace(new RegExp(`\\{h:(${colorToken})\\s+([^}]*)\\}`, 'g'), (match, color, content) => `<mark class="resource-preview-markdown-highlight" style="background-color: ${colorValue(color)}; color: ${readableTextColor(color)};">${content}</mark>`);

		// bold
		text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
		text = text.replace(/(^|[^\w])__([^_]+)__(?=[^\w]|$)/g, '$1<strong>$2</strong>');

		// italic
		text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
		text = text.replace(/(^|[^\w])_([^_]+)_(?=[^\w]|$)/g, '$1<em>$2</em>');

		// restore inline code
		text = text.replace(/\u0000(\d+)\u0000/g, (match, index) => codeSpans[index]);

		return text;
	}

	// process the document line by line, grouping block elements
	let html = '';
	let lines = markdown.replace(/\r\n/g, '\n').split('\n');
	let i = 0;
	while (i < lines.length) {
		let line = lines[i];

		// container blocks: FAQ dropdowns and multi-column sections (opened with "::: name" and closed with ":::")
		let container = line.match(/^:::\s*(\w+)\s*(.*)$/);
		if (container) {
			let type = container[1];
			let title = container[2].trim();
			let inner = '';
			i++;
			while (i < lines.length && lines[i].trim() != ':::') {
				inner += `${lines[i]}\n`;
				i++;
			}
			i++; // skip closing :::

			// FAQ dropdown (summary content is wrapped so the <summary> keeps its native toggle behavior, which breaks if it becomes a flex container)
			if (type == 'faq') {
				html += `<details class="resource-preview-markdown-faq"><summary class="resource-preview-markdown-faq-summary"><span class="resource-preview-markdown-faq-summary-inner"><span>${inline(title)}</span><span class="resource-preview-markdown-faq-summary-icon">${faqIconPlus}${faqIconMinus}</span></span></summary><div class="resource-preview-markdown-faq-content">${markdownToHTML(inner.trim())}</div></details>`;
			}

			// multi-column section (columns separated by +++)
			else if (type == 'columns') {
				let columns = inner.split(/^\s*\+\+\+\s*$/m);
				let columnsHTML = '';
				for (let column of columns) {
					columnsHTML += `<div class="resource-preview-markdown-column">${markdownToHTML(column.trim())}</div>`;
				}
				html += `<div class="resource-preview-markdown-columns">${columnsHTML}</div>`;
			}

			// oversized centered text, for a pullquote or a line that carries a whole slide on its own
			else if (type == 'big') {
				html += `<div class="resource-preview-markdown-big">${markdownToHTML(inner.trim())}</div>`;
			}

			// full-width background band (brand color, gray, primary, or a manual value)
			else if (type == 'bg') {
				let color = title.trim();
				let named = ["pink", "green", "blue", "yellow", "purple", "red", "primary", "light-gray", "dark-gray", "off-black", "off-white", "lighter-gray"];
				let background = named.includes(color) ? `var(--${color})` : color;
				// --band-color is what the checkerboard edging picks up, so the strips above and below match the band rather than sitting in the default gray
				html += `<div class="resource-preview-markdown-band" style="background-color: ${background}; --band-color: ${background};"><div class="resource-preview-markdown-band-inner">${markdownToHTML(inner.trim())}</div></div>`;
			}

			// month-by-month calendar built from bracketed date entries
			else if (type == 'calendar') {
				html += buildCalendar(inner);
			}

			// indented file tree, with a finder view to browse it
			else if (type == 'files') {
				html += buildFileTree(inner, title);
			}

			// speaker notes: never shown on the page, never printed. they sit in the flow so each one belongs to the slide it was written in, which is how the presenter window knows which note to show.
			else if (type == 'notes') {
				html += `<div class="resource-preview-markdown-notes">${markdownToHTML(inner.trim())}</div>`;
			}
			continue;
		}

		// file embeds (e.g. Google Sheets) — wider than text content with a bottom bar linking out to the embed in a new tab
		let embed = line.trim().match(/^@\[([^\]]*)\]\(([^)]+)\)$/);
		if (embed) {
			let embedLabel = embed[1] != '' ? embed[1] : embed[2];
			html += `<div class="resource-preview-markdown-embed"><iframe src="${embed[2]}" title="${embed[1]}"></iframe><a class="resource-preview-markdown-embed-bar" href="${embed[2]}" target="_blank"><span class="resource-preview-markdown-embed-bar-label">${embedLabel}</span><span class="resource-preview-markdown-embed-bar-arrow">↗</span></a><p class="resource-preview-markdown-embed-print">Embedded content: <a href="${embed[2]}" target="_blank" rel="noopener">${embed[2]}</a></p></div>`;
			i++;
			continue;
		}

		// standalone media (image, video, audio) — wider than text content
		let media = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
		if (media) {
			html += `<div class="resource-preview-markdown-media">${mediaTag(media[2], media[1])}</div>`;
			i++;
			continue;
		}

		// CTA buttons (consecutive buttons flow in a row and wrap)
		if (parseButtons(line)) {
			let buttonsHTML = '';
			while (i < lines.length && parseButtons(lines[i])) {
				for (let button of parseButtons(lines[i])) {
					let attrs = button.url.startsWith('#') ? '' : ' target="_blank" rel="noopener"';
					buttonsHTML += `<a href="${button.url}"${attrs} class="resource-preview-markdown-button">${inline(button.label)}</a>`;
				}
				i++;
			}
			html += `<div class="resource-preview-markdown-buttons">${buttonsHTML}</div>`;
			continue;
		}

		// anchor points for in-page links: [#name]
		let anchor = line.trim().match(/^\[#([\w-]+)\]$/);
		if (anchor) {
			html += `<span class="resource-preview-markdown-anchor" id="${anchor[1]}"></span>`;
			i++;
			continue;
		}

		// slide break for presentation mode (invisible in normal reading)
		if (line.trim() == '[slide]') {
			html += `<div class="resource-preview-markdown-slide-break"></div>`;
			i++;
			continue;
		}

		// manual page break for printing (hidden on screen)
		if (line.trim() == '[page]') {
			html += `<div class="resource-preview-markdown-pagebreak" aria-hidden="true"></div>`;
			i++;
			continue;
		}

		// ignore content in slides and print, until the next [slide] or [page]
		if (line.trim() == '[ignore]') {
			html += `<div class="resource-preview-markdown-ignore-marker" aria-hidden="true"></div>`;
			i++;
			continue;
		}

		// primary color break: every following element adopts this color (until the next break). "[primary color]" or "[primary]" to reset. "[primary rotate]" steps to the next of the six brand colors.
		let primary = line.trim().match(/^\[primary(?:\s+([\w-]+|#[0-9a-fA-F]{3,8}))?\]$/);
		if (primary) {
			let named = ["pink", "green", "blue", "yellow", "purple", "red", "light-gray", "dark-gray", "off-black", "off-white", "lighter-gray"];
			let requested = primary[1] || '';
			let value = '';
			if (requested == 'rotate') {
				// step along pink, green, blue, yellow, purple, red and back round to pink. rotating from anything outside that sequence (a gray, a hex code, or no color at all) starts it at pink.
				let at = colors.indexOf(currentPrimary);
				currentPrimary = at == -1 ? colors[0] : colors[(at + 1) % colors.length];
				value = `var(--${currentPrimary})`;
			} else {
				currentPrimary = requested;
				if (requested) {
					value = named.includes(requested) ? `var(--${requested})` : requested;
				}
			}
			html += `<div class="resource-preview-markdown-primary" data-primary="${value}"></div>`;
			i++;
			continue;
		}

		// code blocks (fenced with ```)
		if (line.trim().startsWith('```')) {
			let code = '';
			i++;
			while (i < lines.length && !lines[i].trim().startsWith('```')) {
				code += `${lines[i]}\n`;
				i++;
			}
			i++; // skip closing fence
			html += `<pre><code>${escapeHTML(code.replace(/\n$/, ''))}</code></pre>`;
			continue;
		}

		// colored dividers: "--- color style", with both parts optional. a bare "---" is the common case, so it gets the nicest treatment: a wavy divider in the current primary color. naming a color without a style still means solid, which is how it has always behaved.
		let divider = line.trim().match(new RegExp(`^---(?:\\s+(${paletteColors}))?(?:\\s+(solid|wavy|dotted))?$`));
		if (divider) {
			let dividerColor = divider[1] || 'primary';
			let dividerStyle = divider[2] || (divider[1] ? 'solid' : 'wavy');
			if (dividerStyle == 'wavy') {
				// an animated, scrolling wave (like the homepage menu lines)
				html += `<div class="resource-preview-markdown-divider resource-preview-markdown-divider-wavy" style="--divider-color: var(--${dividerColor});">${menuLine.repeat(6)}</div>`;
			} else {
				html += `<hr class="resource-preview-markdown-divider" data-style="${dividerStyle}" style="--divider-color: var(--${dividerColor});">`;
			}
			i++;
			continue;
		}

		// horizontal rules
		if (/^\s*([-*_])\1\1+\s*$/.test(line)) {
			html += `<hr>`;
			i++;
			continue;
		}

		// tables (a row of | cells | followed by a | --- | --- | divider, which may also carry the column widths)
		if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|\-\d.]+\|?\s*$/.test(lines[i + 1]) && /---/.test(lines[i + 1])) {

			// the header row, then the divider, then every line that still looks like a row
			let headRows = [line];
			let widths = tableWidths(lines[i + 1]);
			i += 2;
			let bodyRows = [];
			while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
				bodyRows.push(lines[i]);
				i++;
			}

			// given widths, the table lays out on them rather than on its contents, which is the whole point of naming them — otherwise a long word in one column still drags it wider than it was asked to be
			let columns = widths ? `<colgroup>${widths.map(width => `<col style="width: ${width}%;">`).join('')}</colgroup>` : '';
			let tableClass = widths ? ' class="resource-preview-markdown-table-fixed"' : '';

			// the head and the body are resolved separately: a cell can't reach across the thead/tbody boundary in HTML, so a "^" in the first body row has nothing above it to merge into and stays a cell of its own
			html += `<div class="resource-preview-markdown-table"><table${tableClass}>${columns}<thead>${tableSection(headRows, 'th')}</thead><tbody>${tableSection(bodyRows, 'td')}</tbody></table></div>`;
			continue;
		}

		// headings (with auto-generated ids for anchor links). a leading emoji is split into its own span for separate styling.
		let heading = line.match(/^(#{1,6})\s+(.*)$/);
		if (heading) {
			let level = heading[1].length;
			let text = heading[2].trim();
			let emoji = text.match(/^(\p{Extended_Pictographic}(?:‍\p{Extended_Pictographic}|[️\u{1F3FB}-\u{1F3FF}])*)\s+(.*)$/u);
			let headingInner = emoji
				? `<span class="resource-preview-markdown-heading-text">${inline(emoji[2])}</span> <span class="resource-preview-markdown-heading-emoji">${emoji[1]}</span>`
				: `<span class="resource-preview-markdown-heading-text">${inline(text)}</span>`;
			html += `<h${level} id="${uniqueSlug(text)}">${headingInner}</h${level}>`;
			i++;
			continue;
		}

		// blockquotes
		if (/^\s*>\s?/.test(line)) {
			let quote = '';
			while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
				quote += `${lines[i].replace(/^\s*>\s?/, '')}\n`;
				i++;
			}
			html += `<blockquote>${markdownToHTML(quote.trim())}</blockquote>`;
			continue;
		}

		// unordered lists (marker and content split into their own elements)
		if (/^\s*[-*+]\s+/.test(line)) {
			let items = '';
			while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
				let content = inline(lines[i].replace(/^\s*[-*+]\s+/, ''));
				items += `<li class="resource-preview-markdown-list-item"><span class="resource-preview-markdown-list-marker">→</span><div class="resource-preview-markdown-list-content">${content}</div></li>`;
				i++;
			}
			html += `<ul class="resource-preview-markdown-list">${items}</ul>`;
			continue;
		}

		// ordered lists (marker and content split into their own elements)
		if (/^\s*\d+\.\s+/.test(line)) {
			let items = '';
			let number = 1;
			while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
				let content = inline(lines[i].replace(/^\s*\d+\.\s+/, ''));
				items += `<li class="resource-preview-markdown-list-item"><span class="resource-preview-markdown-list-marker">${number}</span><div class="resource-preview-markdown-list-content">${content}</div></li>`;
				number++;
				i++;
			}
			html += `<ol class="resource-preview-markdown-list">${items}</ol>`;
			continue;
		}

		// blank lines
		if (line.trim() == '') {
			i++;
			continue;
		}

		// paragraphs (gather consecutive lines until the next block or blank line)
		let paragraph = '';
		while (
			i < lines.length &&
			lines[i].trim() != '' &&
			!lines[i].trim().startsWith('```') &&
			!/^:::\s*\w+/.test(lines[i]) &&
			!/^@\[[^\]]*\]\([^)]+\)$/.test(lines[i].trim()) &&
			!/^!\[[^\]]*\]\([^)]+\)$/.test(lines[i].trim()) &&
			!parseButtons(lines[i]) &&
			!/^\[#[\w-]+\]$/.test(lines[i].trim()) &&
			lines[i].trim() != '[slide]' &&
			lines[i].trim() != '[page]' &&
			lines[i].trim() != '[ignore]' &&
			!/^\[primary(\s|\])/.test(lines[i].trim()) &&
			!/^---\s+\w+/.test(lines[i].trim()) &&
			!/^\s*([-*_])\1\1+\s*$/.test(lines[i]) &&
			!/^\s*\|.*\|\s*$/.test(lines[i]) &&
			!/^(#{1,6})\s+/.test(lines[i]) &&
			!/^\s*>\s?/.test(lines[i]) &&
			!/^\s*[-*+]\s+/.test(lines[i]) &&
			!/^\s*\d+\.\s+/.test(lines[i])
		) {
			paragraph += `${paragraph == '' ? '' : ' '}${lines[i].trim()}`;
			i++;
		}

		// safety net: if the line looked like a feature but matched none of the block handlers above (e.g. a malformed divider), render it as plain text so generation always makes progress and never stalls
		if (paragraph == '') {
			paragraph = lines[i].trim();
			i++;
		}
		html += `<p>${inline(paragraph)}</p>`;
	}
	return html;
}

	return {
		markdownToHTML: markdownToHTML,
		setPaletteValues: setPaletteValues,
		beginDocument: beginDocument,
		resetCalendarIndex: resetCalendarIndex,
		colors: colors,
		menuLine: menuLine
	};
});
