import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  LEGACY_SITE_ORIGIN,CUSTOM_SITE_ORIGIN,ALLOWED_SITE_ORIGINS,
  allowedBrowserOrigin,corsResponseOrigin
} from '../multiplayer/origin-policy.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('strict multiplayer CORS allows both owned sites and local classroom development',()=>{
  assert.equal(LEGACY_SITE_ORIGIN,'https://chriswalker-afk.github.io');
  assert.equal(CUSTOM_SITE_ORIGIN,'https://sampling.mrwalkermaths.com');
  assert.equal(ALLOWED_SITE_ORIGINS.length,4,'Only two public and two local origins should be admitted');
  for(const origin of ALLOWED_SITE_ORIGINS){
    assert.equal(allowedBrowserOrigin(origin),true,origin);
    assert.equal(corsResponseOrigin(origin),origin,'Valid origin must be echoed in CORS');
  }
  assert.equal(allowedBrowserOrigin(null),true,'Server-to-server requests without Origin remain possible');
  for(const origin of [
    'null','', 'https://example.org','https://sampling.mrwalkermaths.com.evil.example',
    'http://sampling.mrwalkermaths.com','https://calendar.mrwalkermaths.com'
  ]){
    assert.equal(allowedBrowserOrigin(origin),false,'Must reject '+origin);
    assert.notEqual(corsResponseOrigin(origin),origin,'Never reflect an unrecognised Origin');
  }
  const worker=read('multiplayer/worker.js');
  assert.match(worker,/allowedBrowserOrigin\(origin\)/);
  assert.match(worker,/corsResponseOrigin\(origin\)/);
});

test('Solo, Multiplayer, Awards, and Critter Lab links work at either site root',()=>{
  const roots=[
    'https://chriswalker-afk.github.io/Data-Collection/',
    'https://sampling.mrwalkermaths.com/'
  ];
  for(const file of ['index.html','multiplayer.html','awards.html','critter-lab/index.html']){
    const html=read(file);
    for(const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)){
      const raw=match[1];
      if(raw.startsWith('#')||/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(raw))continue;
      assert.ok(!raw.startsWith('/'),file+' must not hardcode a site-root link: '+raw);
      for(const root of roots){
        const base=new URL(file,root);
        const destination=new URL(raw,base);
        assert.equal(destination.origin,base.origin,file+' crosses host on '+raw);
        assert.ok(destination.pathname.startsWith(new URL(root).pathname),
          file+' must stay inside the site root on '+root+': '+raw);
      }
    }
  }
  const client=read('multiplayer/client.js');
  assert.match(client,/sampling-arcade-multiplayer\.chris-walker-d8b\.workers\.dev/);
  assert.doesNotMatch(client,/chriswalker-afk\.github\.io\/Data-Collection/);
});
