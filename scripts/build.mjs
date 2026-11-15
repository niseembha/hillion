import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const path of ['index.html', 'src', 'assets']) await cp(path, `dist/${path}`, { recursive: true });
await mkdir('dist/vendor', { recursive: true });
for (const file of ['three.module.js', 'three.core.js']) await cp(`node_modules/three/build/${file}`, `dist/vendor/${file}`);
await cp('node_modules/three/LICENSE', 'dist/vendor/THREE-LICENSE.txt');
console.log('Hillion built → dist/ (static, self-hosted Three.js)');
