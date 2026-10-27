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
for(const name of ['src','styles','content','critter-lab']){
  cpSync(join(root,name),join(output,name),{recursive:true});
}
mkdirSync(join(output,'multiplayer'),{recursive:true});
copyFileSync(join(root,'multiplayer/client.js'),join(output,'multiplayer/client.js'));
copyFileSync(join(root,'multiplayer/mode-ui.js'),join(output,'multiplayer/mode-ui.js'));
for(const file of ['ceremony-ui.js','keepsakes.js','award-catalogue.js','team-ui.js','avatar.js','avatar-ui.js','host-studio.js','host-studio-ui.js','blitz-ui.js','class-quest-ui.js','relay-ui.js','mosaic-art.js','mosaic-art-ui.js']){
  copyFileSync(join(root,'multiplayer',file),join(output,'multiplayer',file));
}
if(!readFileSync(join(output,'multiplayer/client.js'),'utf8').includes("from './mode-ui.js'")){
  throw new Error('Published multiplayer client must import its Game UI module');
}
if(!readFileSync(join(output,'multiplayer/client.js'),'utf8').includes("from './ceremony-ui.js'")){
  throw new Error('Published multiplayer client must import its Ceremony UI module');
}
if(!readFileSync(join(output,'multiplayer/client.js'),'utf8').includes("from './team-ui.js'")){
  throw new Error('Published multiplayer client must include the accessible Team UI module');
}
if(!readFileSync(join(output,'multiplayer/client.js'),'utf8').includes("from './host-studio-ui.js'")){
  throw new Error('Published multiplayer client must load the Host Studio');
}
if(!readFileSync(join(output,'multiplayer/host-studio-ui.js'),'utf8').includes("from './host-studio.js'")){
  throw new Error('Published Host Studio must include its validated configuration model');
}
if(!readFileSync(join(output,'multiplayer/client.js'),'utf8').includes("from './blitz-ui.js'")){
  throw new Error('Published multiplayer client must import the Blitz UI module');
}
if(!readFileSync(join(output,'multiplayer/client.js'),'utf8').includes("from './class-quest-ui.js'")){
  throw new Error('Published multiplayer client must import the Class Quest display');
}
if(!readFileSync(join(output,'multiplayer/client.js'),'utf8').includes("from './relay-ui.js'")){
  throw new Error('Published multiplayer client must import the Class Mosaic presentation');
}
if(!readFileSync(join(output,'multiplayer/relay-ui.js'),'utf8').includes('export function createRelayUI')){
  throw new Error('Published Class Mosaic UI missing');
}
if(!readFileSync(join(output,'multiplayer/ceremony-ui.js'),'utf8').includes("from './mosaic-art-ui.js'")){
  throw new Error('Ceremony must use the identical shared picture reveal');
}
for(const artwork of ['garden','reef','stars']){
  const svg=readFileSync(join(output,'styles','mosaic-'+artwork+'.svg'),'utf8');
  if(!svg.includes('viewBox="0 0 1600 900"')||!svg.includes('<svg'))
    throw new Error('Invalid cooperative mosaic artwork: '+artwork);
}
// Keep Pages publishing independent of the backend; never publish Worker internals.

// Validate navigation and local assets against the actual publish artifact.
for(const page of ['index.html','multiplayer.html','awards.html','critter-lab/index.html']){
  const html=readFileSync(join(output,page),'utf8');
  if(page!=='critter-lab/index.html'){
    for(const required of ['index.html','multiplayer.html','awards.html']){
      if(!html.includes(required) && !(page==='index.html'&&required==='index.html')){
        throw new Error(page+' is missing a navigation route to '+required);
      }
    }
  }
  if(page==='critter-lab/index.html' && (!html.includes('../index.html') || !html.includes('../multiplayer.html'))){
    throw new Error('Critter Lab must have links back to the Arcade and Multiplayer');
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
if(!readFileSync(join(output,'src/app.js'),'utf8').includes("'./critter-lab/index.html'")){
  throw new Error('Homepage is missing its Critter Lab invitation');
}
if(!readFileSync(join(output,'multiplayer.html'),'utf8').includes('href="./critter-lab/index.html"')){
  throw new Error('Multiplayer join screen is missing its Critter Lab link');
}
for(const name of ['multiplayer/worker.js','multiplayer/rules.js','multiplayer/scenarios.js','multiplayer/modes.js','multiplayer/game-bank.js','multiplayer/ceremony-rules.js','multiplayer/team-rules.js','multiplayer/blitz-rules.js','multiplayer/race-rules.js','multiplayer/class-quest-rules.js','multiplayer/relay-bank.js','multiplayer/relay-rules.js','multiplayer/relay-adapter.js']){
  if(existsSync(join(output,name)))throw new Error('Worker backend must not be deployed to Pages: '+name);
}
console.log('Pages publish artifact verified: three Arcade modes plus Critter Lab, styles, scripts and content exist.');
