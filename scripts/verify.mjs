import {readFile,access,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const files=['dist/app.js','dist/geometry.mjs','dist/furniture.mjs','dist/extra-furniture.mjs','dist/extra-models.js','dist/screen-model.mjs','dist/wall-placement.mjs','dist/tabletop-placement.mjs','dist/software-renderer.js'];
for(const file of files){const r=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
await access('dist/index.html');await access('dist/vendor/three.module.min.js');
const photos=JSON.parse(await readFile('dist/assets/photos.json','utf8'));
for(const photo of photos)await access('dist/'+photo.src.replace(/^\.\//,''));
const testFiles=(await readdir('tests')).filter(f=>f.endsWith('.test.mjs')).map(f=>'tests/'+f);
const tests=spawnSync(process.execPath,['--test',...testFiles],{stdio:'inherit'});if(tests.status!==0)process.exit(tests.status||1);
console.log('Static build verified: HTML, JavaScript, 14 reference photos, furniture geometry and screen motion.');
