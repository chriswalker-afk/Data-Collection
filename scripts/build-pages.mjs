import {cpSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync} from 'node:fs';
import {dirname, join, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

// Build exactly the static files required by GitHub Pages, not the Worker or tests.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=join(root,'dist');
rmSync(output,{recursive:true,force:true});
mkdirSync(output,{recursive:true});
for(const name of ['index.html','multiplayer.html','awards.html','styles.css','favicon.svg']){
  copyFileSync(join(root,name),join(output,name));
}
for(const name of ['src','styles','content']){
  cpSync(join(root,name),join(output,name),{recursive:true});
}
mkdirSync(join(output,'multiplayer'),{recursive:true});
copyFileSync(join(root,'multiplayer/client.js'),join(output,'multiplayer/client.js'));
// Keep Pages publishing independent of the backend; never publish Worker internals.

// Validate navigation and local assets against the actual publish artifact.
for(const page of ['index.html','multiplayer.html','awards.html']){
  const html=readFileSync(join(output,page),'utf8');
  for(const required of ['index.html','multiplayer.html','awards.html']){
    if(!html.includes(required) && !(page==='index.html'&&required==='index.html')){
      throw new Error(page+' is missing a navigation route to '+required);
    }
  }
  for(const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)){
    const raw=match[1];
    if(raw.startsWith('#') || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(raw))continue;
    const asset=raw.split(/[?#]/,1)[0];
    if(!asset)continue;
    const path=resolve(output,dirname(page),asset);
    if(!(path===output||path.startsWith(output+sep)) || !existsSync(path)){
      throw new Error(page+' has a missing or unsafe asset: '+raw);
    }
  }
}
for(const name of ['multiplayer/worker.js','multiplayer/rules.js','multiplayer/scenarios.js']){
  if(existsSync(join(output,name)))throw new Error('Worker backend must not be deployed to Pages: '+name);
}
console.log('Pages publish artifact verified: all three modes, styles, scripts and content exist.');
