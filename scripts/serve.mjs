import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const production = process.argv.includes('--dist');
const root = resolve(production ? 'dist' : '.');
const port = Number(process.env.PORT || 5173);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let path = resolve(root, `.${pathname}`);
    if (!production && ['/vendor/three.module.js', '/vendor/three.core.js'].includes(pathname)) {
      path = resolve(root, 'node_modules/three/build', pathname.split('/').at(-1));
    }
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    res.writeHead(200, { 'Content-Type': `${types[extname(path)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-cache' });
    res.end(await readFile(path));
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Hillion is ready: http://localhost:${port}`));
