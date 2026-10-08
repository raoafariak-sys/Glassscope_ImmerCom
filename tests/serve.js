// Minimal static server for tests: serves the site under /Glassscope_ImmerCom/, the same project
// subpath GitHub Pages uses, so any root-relative asset path shows up as a 404.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = '/Glassscope_ImmerCom/';
const PORT = Number(process.env.PORT || 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
};

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (!url.pathname.startsWith(BASE)) {
    res.writeHead(404).end('Not under ' + BASE);
    return;
  }
  let rel;
  try {
    rel = decodeURIComponent(url.pathname.slice(BASE.length));
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }
  if (rel.includes('\0')) {
    res.writeHead(400).end('Bad request');
    return;
  }
  rel = rel || 'index.html';
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.resolve(ROOT, rel);
  const segments = path.relative(ROOT, file).split(path.sep);
  // Stay inside the site; never serve dotfiles (such as .git) or node_modules.
  if (!file.startsWith(ROOT + path.sep) || segments.some((s) => s.startsWith('.') || s === 'node_modules')) {
    res.writeHead(404).end('Not found');
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404).end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Serving ${ROOT} at http://127.0.0.1:${PORT}${BASE}`);
});
