'use strict';
// Existing API/media fixtures must also load the real new presentation assets.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),bound=new WeakSet();
module.exports=async page=>{
 if(bound.has(page))return;bound.add(page);
 if(process.env.GLOWME_INSTALLED_MODE==='1')await page.addInitScript(()=>{
  const original=window.matchMedia.bind(window),mode=new EventTarget();
  Object.defineProperties(mode,{matches:{get:()=>true},media:{value:'(display-mode: standalone)'}});
  window.matchMedia=query=>query==='(display-mode: standalone)'?mode:original(query);
 });
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(!['viewer.test','localhost','127.0.0.1'].includes(url.hostname))return route.fallback();
  const file=url.pathname.replace(/^\/fromm-viewer\//,'').replace(/^\//,'');
  if(!['glowme.css','web-glowme.js','web-pwa.js','manifest.webmanifest'].includes(file)&&!/^assets\/glowme\/[a-z0-9-]+\.(png|webp)$/.test(file))return route.fallback();
  const type=file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'application/manifest+json';
  return route.fulfill({contentType:type,body:fs.readFileSync(path.join(root,file))});
 });
};
