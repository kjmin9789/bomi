import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const allowed = new Map([
  ['/', ['index.html', 'text/html']], ['/index.html', ['index.html', 'text/html']],
  ['/style.css', ['style.css', 'text/css']], ['/app.js', ['app.js', 'text/javascript']],
  ['/model.js', ['model.js', 'text/javascript']], ['/icon.svg', ['icon.svg', 'image/svg+xml']],
  ['/manifest.webmanifest', ['manifest.webmanifest', 'application/manifest+json']]
]);
for (let stage=0;stage<=3;stage++) allowed.set(`/assets/flower-stage-${stage}.png`,[`assets/flower-stage-${stage}.png`,'image/png']);
const port = Number(process.env.PORT || 4173);
createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const file = allowed.get(path);
  if (!file || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); return res.end(); }
  try {
    const body = await readFile(new URL(`./app/${file[0]}`, import.meta.url));
    res.writeHead(200, {'Content-Type': `${file[1]}; charset=utf-8`, 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(500); res.end('Unable to load page'); }
}).listen(port, '127.0.0.1', () => console.log(`Bomi: http://127.0.0.1:${port}`));
