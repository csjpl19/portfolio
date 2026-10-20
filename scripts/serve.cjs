// Serveur d’aperçu local uniquement. GitHub Pages sert directement les fichiers.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf' };
http.createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = pathname.replace(/^\/+/, '') || 'index.html';
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(root + path.sep) || relative.split(/[\\/]/).some(p => p.startsWith('.') || ['node_modules', 'scripts', 'tests'].includes(p))) {
      res.writeHead(403); res.end('Accès interdit'); return;
    }
    const data = fs.readFileSync(filename);
    res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Page introuvable'); }
}).listen(port, '127.0.0.1', () => console.log(`Portfolio : http://127.0.0.1:${port}`));
