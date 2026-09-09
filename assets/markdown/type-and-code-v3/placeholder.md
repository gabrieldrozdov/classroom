# Placeholder Resource

This is a placeholder resource for **Type + Code v3**, authored in markdown and hosted directly on the site. It doubles as a reference for every markdown feature the generator now supports.

[#top]

[primary rotate]
[page]
[slide]

## Text basics

You can write **bold**, *italic*, `inline code`, and [links](https://gdwithgd.com/). Text can be given a color, like {c:pink pink}, {c:green green}, {c:blue blue}, {c:yellow yellow}, {c:purple purple}, and {c:red red}. Text can also be highlighted, like {h:pink pink}, {h:green green}, {h:blue blue}, {h:yellow yellow}, {h:purple purple}, and {h:red red}.

Both take the grays as well as the six brand colors — {h:off-black off-black}, {h:dark-gray dark-gray}, {h:light-gray light-gray} — and a hex code, like {h:#b5e48c this one} or {c:#2b3a55 this text}. A highlight sets its own text to black or white, whichever stays readable on it.

> Blockquotes still work for callouts and pull quotes.

[primary rotate]
[page]
[slide]

## Primary color

Use `[primary color]` to recolor everything that follows — buttons, links, list markers, blockquote bars — until the next break. Use `[primary]` on its own to reset.

- This list marker is a new primary color.
- So is this [link](https://gdwithgd.com/) and the button below.

[[A recolored button](https://gdwithgd.com/)]

`[primary rotate]` steps to the next of the six brand colors instead of naming one — pink, green, blue, yellow, purple, red, then back to pink. Rotating from anything outside that sequence (a gray, a hex code, or no color at all) starts again at pink.

[primary rotate]
[page]
[slide]

## Speaker notes

Wrap anything in `::: notes` … `:::` and it never appears on the page, in a slide, or in print. Press 🧑‍🏫 (or `n`) while presenting and it opens a second window showing the notes for whatever slide you're on, following along as you move.

::: notes
This note belongs to the dividers slide.

- Notes take full markdown, so **bold**, lists and [links](https://gdwithgd.com/) all work
- Mention that a bare `---` is the wavy primary divider
:::

## Dividers

Add a colored divider in solid, wavy, or dotted styles. A bare `---` is a wavy divider in the current primary color:

---

--- pink solid

--- green wavy

--- blue dotted


[primary rotate]
[page]
[slide]

## Lists

Unordered lists use custom split markers:

- First item
- Second item, with some **bold** text
- Third item

Ordered lists number themselves:

1. Step one
2. Step two
3. Step three

[primary rotate]
[page]
[slide]

## Buttons

Consecutive buttons flow in a row and wrap:

[[Primary action](https://gdwithgd.com/)] [[Second button](#faqs)] [[Third button](#top)]

[primary rotate]
[slide]

## Anchor links

Jump to the [FAQs](#faqs) or back to the [top](#top) of the page.

[primary rotate]
[page]
[slide]

## Media

Images, video, and audio break out wider than the text column. Drop a file in `assets/markdown/type-and-code-v3/` and reference it on its own line:

![A placeholder image](https://placehold.co/1200x600)

Put an image on a slide of its own — nothing else between the `[slide]` markers — and in presentation mode it fills the whole slide instead of sitting in a card, the same way a background band does.

[slide]

![Beeki the cat, filling the slide](/assets/media/cats/beeki-1.webp)

[primary rotate]
[page]
[slide]

## Embeds

Embed external files (like Google Sheets) wider than the text, using `@[label](url)`:

@[Example embed](https://gdwithgd.com/)

An embed alone on a slide fills it edge to edge too, with its label bar along the bottom:

[slide]

@[GD with GD, filling the slide](https://gdwithgd.com/)

[slide]

[ignore]

*This note sits after an `[ignore]` marker, so it shows here but is left out of presentation slides and print — until the next `[slide]` or `[page]`.*

[primary rotate]
[page]
[slide]

## Tables

| Feature | Syntax | Notes |
| --- | --- | --- |
| Bold | `**text**` | Inline |
| Color | `{c:pink text}` | Six brand colors |
| Button | `[[label](url)]` | Flows in a row |

[slide]

### Merged cells

A cell written as `<` merges into the cell to its left, and one written as `^` merges into the cell above. Use both together and a cell can cover a block of the grid — the markers draw the merged area as the shape it takes on the page.

[slide]

### Cell colors and alignment

Open a cell with `{bg:color}` to paint its background: a brand color, a gray, `primary`, or a hex code. The text picks black or white on its own, so a cell stays readable whatever it's colored. Open it with `{left}`, `{center}` or `{right}` to set how the text sits in it — and both markers can be used together, in either order.

| {center} Colors, spans and alignment | < | < |
| --- | --- | --- |
| {bg:pink} Across three columns | < | < |
| {bg:blue} Down two rows | {bg:#2b3a55} A hex background | {bg:yellow}{right} Right |
| ^ | {bg:off-black} Dark gray and off-black take light text | < |

[slide]

### Column widths

Add a number to a column's divider cell and it becomes that column's share of the width: `| --- 2 | --- 1 | --- 1 |` makes the first column twice as wide as each of the others. The numbers are a ratio, so they don't have to add up to anything, and a column left without one counts as 1. A plain `| --- | --- |` divider says nothing about width and the table sizes its columns to their contents, the way it always has.

| Term | What it means |
| --- 1 | --- 3 |
| Ratio | The numbers are relative to each other, not measurements — `4 1` and `8 2` give the same two columns. |
| Auto | Leave the divider plain and the columns size themselves to what's in them. |

[slide]

### Lists in a cell

Inside a cell, a backslash on its own is a line break, so a cell can hold a list — or anything else written across lines — without leaving the row it belongs to. Two of them in a row leave a blank line, which starts a new paragraph.

| Week | What's due | {center} Points |
| --- | --- | --- |
| One | - Read the brief \ - Collect ten samples \ - Post to the board | {center} 10 |
| Two | A first pass \ \ Bring it printed, at size. | {center} 20 |

[primary rotate]
[page]
[slide]

## Big text

Wrap a line in `::: big` … `:::` to set it large and centered, like a pullquote. On its own between two `[slide]` markers it carries a whole slide.

::: big
Type is a system, not a decoration.
:::

[primary rotate]
[page]
[slide]

## Background bands

Wrap a section in `::: bg color` … `:::` to give it a full-width background. Use a brand color, a gray, or a manual value.

[slide]

::: bg yellow
### A highlighted section

This whole band stretches edge to edge, while its text stays at the reading width.
:::

[slide]

::: bg purple
### A band alone on a slide

With nothing else between the `[slide]` markers, the band fills the whole slide. Images and embeds do the same.
:::

[slide]

A band can contain `[slide]` markers. Reading down the page it stays one continuous section, but in presentation mode it splits into a slide per segment, each keeping the band's background.

::: bg blue
### A band split across slides

This part is the first slide.

[slide]

And this part is the second — same band, same background, but its own slide.
:::

## Multi-column

::: columns
### Column one

Content on the left side.

- Point A
- Point B

+++

### Column two

Content on the right side.

- Point C
- Point D
:::

[slide]

## Calendars

A `::: calendar` block draws a month-by-month grid covering every month from the earliest to the latest date. Each entry opens with a bracketed date on its own line, and everything until the next date is its annotation — full markdown, shown in a tooltip on hover, click, or tap.

Write a single date as `[9/15/26]` and a range as `[9/22/26 - 10/6/26]`; a range simply colors every day it covers. Dates can also be written `9/15/2026` or `2026-09-15`.

Add a color after the date to tell one kind of entry from another. Any brand color works — `pink`, `green`, `blue`, `yellow`, `purple`, `red`, `off-white`, `light-gray`, `gray`, `dark-gray`, `off-black` — as does any hex code, like `[9/15/26 #ff0088]`. Without one, the entry uses the current primary color. Day numbers switch between black and white to stay readable on dark colors, and a day covered by two entries is split between both.

::: calendar

[9/15/26]
**week 1 • code n pixels**
- html
- pixel fonts

[9/15/26 red]
office hours moved to **3pm**

[9/22/26 - 10/6/26 green]
**project 1 work period**
no class on 9/29 — see the [brief](https://gdwithgd.com/)

[10/1/26 - 10/3/26 blue]
**fall break**

[10/20/26 - 10/24/26 off-black]
**midterm crit**

[11/24/26 light-gray]
thanksgiving

:::

[slide]

::: notes
Notes for the file tree slide — demo the folder view toggle here.
:::

## File trees

A `::: files` block lists a folder structure. One entry per line, nested by indentation — a tab or two spaces per level. Anything with something underneath it is a folder, and so is any name written with a trailing slash, which is how an empty folder is spelled.

Each entry gets an emoji from its file extension: 🌐 for html, 🎨 for css, ⚙️ for js, 🖼️ for images, 🔤 for fonts, 📁 for folders, and so on. Start a line with your own emoji to override it. An entry can also be a link, written the usual way as `[name](url)`.

Text after the block name becomes its title, and the toggle in the corner swaps the indented file view for a folder view: one folder at a time as a grid of icons, where the title becomes the path you are in and each part of it is clickable, with a back arrow beside it. Add `[folder]` to open in that view instead — as in ``::: files [folder] my-site`` — or `[file]` to be explicit about the default. Printing always uses the indented listing.

::: files [folder] my-site
index.html
style.css
🐈 cat.html
assets
	fonts
		LimkinVF.woff2
		LimkinPixel.woff2
	images
		[logo.svg](https://gdwithgd.com/)
		textures
			grain.png
			noise.png
		hero.png
	icons/
scripts
	main.js
	lib
		util.js
downloads/
readme.md
:::

[slide]

[#faqs]

## FAQs

::: faq What is this page?
A placeholder resource showing off the markdown features. Edit `assets/markdown/type-and-code-v3/placeholder.md` to change it.
:::

::: faq How do I add a new markdown resource?
1. Write a `.md` file inside `assets/markdown/`
2. Point a resource's `url` field at it in `collection.json`
3. Run `node generator.js`
:::

::: faq Can FAQ answers contain other markdown?
Yes — answers support **bold**, *italic*, [links](https://gdwithgd.com/), lists, and more.
:::

Back to the [top](#top).
