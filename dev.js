// a local server for working on the site from the /editor/ page.
// run `node dev.js` and open http://localhost:5502/editor/. the editor notices the server is there and grows the three things it can't have on the published site: opening a page from the file it was built from, saving back to that same file, and putting media in a folder beside it. every save runs generator.js, so the built page is already current when the save reports back.
// this file is a tool, not part of the site — github pages serves the built html and never runs any of this.

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFile } = require('child_process');

const ROOT = __dirname;

// 5502 is the port live server was already set to, so the editor keeps the same address it always had
const PORT = Number(process.argv.find(arg => /^\d+$/.test(arg))) || 5502;

// by default nothing outside this machine can reach the server at all. `--lan` opens it to the network for checking pages on a phone — writing stays loopback-only either way, so a device on the same wifi can look but not touch.
const LAN = process.argv.includes('--lan');

// the one folder anything is allowed to be written into. paths arrive from a browser, and a path from a browser is not something to hand to fs.writeFileSync unchecked.
const WRITABLE = 'assets/markdown';

// what may be written, by extension: markdown for the pages, and the media the converter knows how to put on one (mediaTag in generate.js), plus pdf for handouts
const MEDIA = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'mp4', 'webm', 'mov', 'm4v', 'mp3', 'wav', 'ogg', 'm4a', 'pdf'];

// pages that aren't part of any course yet. they're ordinary files in the ordinary place, so a draft becomes a real page by being pointed at rather than by being moved.
const DRAFTS = 'assets/markdown/drafts';

// collection.json is hand-edited as often as it's written from here, so it goes back tab-indented the way it already is. (a handful of resource tag arrays were written on one line by hand and come back expanded — a one-time tidy, not a change of meaning.)
const COLLECTION = 'collection.json';

const types = {
	html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8',
	json: 'application/json; charset=utf-8', md: 'text/markdown; charset=utf-8', txt: 'text/plain; charset=utf-8',
	svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
	webp: 'image/webp', avif: 'image/avif', ico: 'image/x-icon',
	mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', m4v: 'video/x-m4v',
	mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4',
	ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2', pdf: 'application/pdf'
};

// ——————————————————————————————
// PATHS
// ——————————————————————————————

// turn a path the browser sent into a real one inside the repo, or null. the leading slash is optional because the editor works in site urls; anything that climbs out of the writable folder, or carries an extension not on the list, is refused rather than quietly corrected.
function resolveWritable(given, extensions) {
	if (typeof given != 'string' || given == '' || given.includes('\0')) {
		return null;
	}
	let relative = path.normalize(given.replace(/^\/+/, ''));
	let full = path.resolve(ROOT, relative);
	let base = path.resolve(ROOT, WRITABLE);
	if (!full.startsWith(base + path.sep)) {
		return null;
	}
	if (!extensions.includes(path.extname(full).slice(1).toLowerCase())) {
		return null;
	}
	return full;
}

// the repo-relative form, which is what the editor shows and what a site url looks like
function sitePath(full) {
	return `/${path.relative(ROOT, full).split(path.sep).join('/')}`;
}

// a name that's safe in a url and readable afterwards: "Studio Photo 2.JPG" becomes "studio-photo-2.jpg"
function mediaName(given) {
	let ext = path.extname(given || '').toLowerCase();
	let stem = path.basename(given || '', path.extname(given || ''))
		.toLowerCase()
		.replace(/['’]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return `${stem || 'file'}${ext}`;
}

// never overwrite something already sitting in the folder — "photo.jpg" becomes "photo-2.jpg" instead
function freeName(dir, name) {
	let ext = path.extname(name);
	let stem = path.basename(name, ext);
	let tried = name;
	let n = 2;
	while (fs.existsSync(path.join(dir, tried))) {
		tried = `${stem}-${n}${ext}`;
		n++;
	}
	return tried;
}

// ——————————————————————————————
// BUILDING
// ——————————————————————————————

// generator.js is a script rather than a module — it builds the moment it's required, and caches collection.json with it. running it as its own process is both simpler and what lets a later build pick up a changed collection.json.
function runGenerator() {
	return new Promise((resolve) => {
		let started = Date.now();
		execFile(process.execPath, ['generator.js'], { cwd: ROOT, maxBuffer: 1024 * 1024 * 16 }, (error, stdout, stderr) => {
			let ms = Date.now() - started;
			if (error) {
				let message = (stderr || error.message || '').trim().split('\n').filter(line => line.trim() != '').pop() || 'the build failed';
				console.log(`   ✗ build failed — ${message}`);
				resolve({ ok: false, ms: ms, message: message });
				return;
			}
			resolve({ ok: true, ms: ms, message: '' });
		});
	});
}

// saves come in faster than a build finishes, so they queue rather than run over each other. each save waits for the build that carries its own change.
let chain = Promise.resolve();
function rebuild() {
	chain = chain.then(runGenerator, runGenerator);
	return chain;
}

// ——————————————————————————————
// WHAT THE SITE IS MADE OF
// ——————————————————————————————

// every markdown file under the markdown folder, with when it was last written. the editor uses it to say how old a page is and to notice a file collection.json points at that isn't there.
function markdownFiles() {
	let files = {};
	(function walk(dir) {
		for (let entry of fs.readdirSync(dir, { withFileTypes: true })) {
			let full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				walk(full);
			} else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
				let stat = fs.statSync(full);
				files[sitePath(full)] = { modified: stat.mtimeMs, bytes: stat.size };
			}
		}
	})(path.resolve(ROOT, WRITABLE));
	return files;
}

// drafts are pages nothing points at yet, so they're listed on their own rather than found by walking the collection
function drafts(files) {
	let prefix = `/${DRAFTS}/`;
	return Object.keys(files)
		.filter(url => url.startsWith(prefix))
		.map(url => ({ name: path.basename(url, '.md'), url: url, modified: files[url].modified, bytes: files[url].bytes }))
		.sort((a, b) => b.modified - a.modified);
}

// ——————————————————————————————
// REQUESTS
// ——————————————————————————————

function send(response, status, body, type) {
	response.writeHead(status, {
		'Content-Type': type || 'text/plain; charset=utf-8',
		// the whole point of this server is seeing a change immediately
		'Cache-Control': 'no-store'
	});
	response.end(body);
}

function sendJSON(response, status, value) {
	send(response, status, JSON.stringify(value), types['json']);
}

function readBody(request, limit) {
	return new Promise((resolve, reject) => {
		let chunks = [];
		let size = 0;
		request.on('data', (chunk) => {
			size += chunk.length;
			if (size > limit) {
				reject(new Error('too large'));
				request.destroy();
				return;
			}
			chunks.push(chunk);
		});
		request.on('end', () => {
			try {
				resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
			} catch (error) {
				reject(new Error('the request wasn’t readable'));
			}
		});
		request.on('error', reject);
	});
}

// writing is loopback-only even when the server is open to the network, so nothing else on the wifi can put a file in the repo
function local(request) {
	let address = request.socket.remoteAddress || '';
	return address == '127.0.0.1' || address == '::1' || address == '::ffff:127.0.0.1';
}

async function handleAPI(request, response, url) {
	if (url.pathname == '/_dev/status' && request.method == 'GET') {
		let collection = null;
		let files = {};
		let message = '';
		try {
			collection = JSON.parse(fs.readFileSync(path.join(ROOT, COLLECTION), 'utf8'));
		} catch (error) {
			// a collection.json that won't parse is the one failure the editor can't work around, so it says so rather than showing an empty site
			message = `collection.json couldn’t be read ~ ${error.message}`;
		}
		try {
			files = markdownFiles();
		} catch (error) {
			files = {};
		}
		sendJSON(response, 200, { ok: true, writing: local(request), collection: collection, files: files, drafts: drafts(files), message: message });
		return;
	}

	if (!local(request)) {
		sendJSON(response, 403, { ok: false, message: 'files can only be changed from this computer' });
		return;
	}

	if (url.pathname == '/_dev/save' && request.method == 'POST') {
		let body = await readBody(request, 4 * 1024 * 1024);
		let file = resolveWritable(body['path'], ['md']);
		if (!file) {
			sendJSON(response, 400, { ok: false, message: `only .md files inside ${WRITABLE}/ can be saved` });
			return;
		}
		if (typeof body['text'] != 'string') {
			sendJSON(response, 400, { ok: false, message: 'nothing to save' });
			return;
		}
		let existed = fs.existsSync(file);
		fs.mkdirSync(path.dirname(file), { recursive: true });
		fs.writeFileSync(file, body['text'], 'utf8');
		console.log(`   ${existed ? '✎' : '+'} ${sitePath(file)}`);
		// a draft is a page nothing points at, so writing one can't change anything the build would produce
		if (sitePath(file).startsWith(`/${DRAFTS}/`)) {
			sendJSON(response, 200, { ok: true, path: sitePath(file), created: !existed, built: false, draft: true, ms: 0, message: '' });
			return;
		}
		let build = await rebuild();
		sendJSON(response, 200, { ok: true, path: sitePath(file), created: !existed, built: build.ok, ms: build.ms, message: build.message });
		return;
	}

	if (url.pathname == '/_dev/media' && request.method == 'POST') {
		let body = await readBody(request, 96 * 1024 * 1024);
		let page = resolveWritable(body['path'], ['md']);
		if (!page) {
			sendJSON(response, 400, { ok: false, message: 'media goes next to a page, and that page isn’t one' });
			return;
		}
		// beside the markdown rather than in with it, matching the media folder type-and-code-v3 already keeps
		let dir = path.join(path.dirname(page), 'media');
		let target = resolveWritable(path.join(path.relative(ROOT, dir), mediaName(body['name'])), MEDIA);
		if (!target) {
			sendJSON(response, 400, { ok: false, message: `${path.extname(body['name'] || '') || 'that file'} isn’t a kind of media a page can show` });
			return;
		}
		let data = Buffer.from(String(body['data'] || '').replace(/^data:[^,]*,/, ''), 'base64');
		if (data.length == 0) {
			sendJSON(response, 400, { ok: false, message: 'that file came through empty' });
			return;
		}
		fs.mkdirSync(dir, { recursive: true });
		let name = freeName(dir, path.basename(target));
		fs.writeFileSync(path.join(dir, name), data);
		console.log(`   + ${sitePath(path.join(dir, name))} (${(data.length / 1024).toFixed(0)}kb)`);
		sendJSON(response, 200, { ok: true, url: sitePath(path.join(dir, name)), name: name });
		return;
	}

	// the whole of collection.json at once. the editor holds the tree it's editing and sends it back entire, so there's no merge to get wrong here — and the parse before the write means a broken tree can't land on disk.
	if (url.pathname == '/_dev/collection' && request.method == 'POST') {
		let body = await readBody(request, 8 * 1024 * 1024);
		let collection = body['collection'];
		if (!Array.isArray(collection) || collection.length == 0) {
			sendJSON(response, 400, { ok: false, message: 'that isn’t a collection' });
			return;
		}
		let file = path.join(ROOT, COLLECTION);
		// a copy of what was there goes next to it, since one bad write would otherwise take the shape of the whole site with it
		try {
			fs.copyFileSync(file, `${file}.backup`);
		} catch (error) {
			// no previous file to keep, which is fine
		}
		fs.writeFileSync(file, `${JSON.stringify(collection, null, '\t')}\n`, 'utf8');
		console.log(`   ✎ /${COLLECTION}`);
		let build = await rebuild();
		sendJSON(response, 200, { ok: true, built: build.ok, ms: build.ms, message: build.message });
		return;
	}

	// renaming, copying and removing the markdown files themselves. the collection entry that points at a file is the editor's to move; this is only the file.
	if (url.pathname == '/_dev/file' && request.method == 'POST') {
		let body = await readBody(request, 64 * 1024);
		let file = resolveWritable(body['path'], ['md']);
		if (!file) {
			sendJSON(response, 400, { ok: false, message: `only .md files inside ${WRITABLE}/ can be changed` });
			return;
		}
		let action = body['action'];

		if (action == 'delete') {
			if (fs.existsSync(file)) {
				fs.unlinkSync(file);
				console.log(`   ✗ ${sitePath(file)}`);
			}
			sendJSON(response, 200, { ok: true });
			return;
		}

		if (action != 'rename' && action != 'duplicate') {
			sendJSON(response, 400, { ok: false, message: 'that isn’t something to do to a file' });
			return;
		}
		let to = resolveWritable(body['to'], ['md']);
		if (!to) {
			sendJSON(response, 400, { ok: false, message: 'that isn’t a place a page can go' });
			return;
		}
		if (!fs.existsSync(file)) {
			sendJSON(response, 400, { ok: false, message: `${sitePath(file)} isn’t there` });
			return;
		}
		// a name already taken gets a number rather than swallowing the file that's there
		fs.mkdirSync(path.dirname(to), { recursive: true });
		let free = path.join(path.dirname(to), freeName(path.dirname(to), path.basename(to)));
		if (action == 'rename') {
			fs.renameSync(file, free);
		} else {
			fs.copyFileSync(file, free);
		}
		console.log(`   ${action == 'rename' ? '→' : '+'} ${sitePath(free)}`);
		sendJSON(response, 200, { ok: true, path: sitePath(free) });
		return;
	}

	if (url.pathname == '/_dev/build' && request.method == 'POST') {
		let build = await rebuild();
		sendJSON(response, 200, { ok: build.ok, ms: build.ms, message: build.message });
		return;
	}

	sendJSON(response, 404, { ok: false, message: 'no such endpoint' });
}

// ——————————————————————————————
// THE SITE ITSELF
// ——————————————————————————————

function serveStatic(request, response, url) {
	let relative = path.normalize(decodeURIComponent(url.pathname).replace(/^\/+/, ''));
	let full = path.resolve(ROOT, relative);
	// a request can't reach outside the repo, however it's spelled
	if (full != ROOT && !full.startsWith(ROOT + path.sep)) {
		send(response, 403, 'no');
		return;
	}
	// a folder means the page inside it, the way github pages serves the built site
	if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
		full = path.join(full, 'index.html');
	}
	if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
		send(response, 404, `not found: ${url.pathname}`, types['html']);
		return;
	}
	let type = types[path.extname(full).slice(1).toLowerCase()] || 'application/octet-stream';
	response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
	fs.createReadStream(full).pipe(response);
}

const server = http.createServer((request, response) => {
	let url = new URL(request.url, `http://localhost:${PORT}`);
	if (url.pathname.startsWith('/_dev/')) {
		handleAPI(request, response, url).catch((error) => {
			sendJSON(response, 400, { ok: false, message: error.message || 'that didn’t work' });
		});
		return;
	}
	serveStatic(request, response, url);
});

server.on('error', (error) => {
	if (error.code == 'EADDRINUSE') {
		console.log(`\n   port ${PORT} is already taken — live server is probably still running on it.`);
		console.log(`   stop it, or start this on another port: node dev.js 5503\n`);
		process.exit(1);
	}
	throw error;
});

server.listen(PORT, LAN ? '0.0.0.0' : '127.0.0.1', () => {
	console.log(`\n   🍎 classroom — http://localhost:${PORT}/`);
	console.log(`   📝 editor   — http://localhost:${PORT}/editor/`);
	console.log(`   ${LAN ? 'open to the network for previewing; files can still only be changed from this computer' : 'this computer only — add --lan to preview on a phone'}`);
	console.log(`   saving a page from the editor rebuilds the site. ctrl-c to stop.\n`);
});
