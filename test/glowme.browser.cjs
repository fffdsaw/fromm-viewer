'use strict';
// Phase 3 replaces the old drawer geometry. Retain real PWA/cache/a11y coverage.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {serve,open,seed}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch();const audits=[];try{
 const {page,context,errors}=await open(browser,server.url,{width:390,height:844,login:true,serviceWorkers:'allow'});
 async function audit(label){await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const v=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});audits.push({label,violations:v});}
 await audit('login-390');await seed(page);await page.locator('#sidebarToggleBtn').focus();await page.keyboard.press('Enter');await audit('rail-chat-390');
 await page.evaluate(()=>{window.fixtureInstallPrompts=0;const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=async()=>{window.fixtureInstallPrompts++;};e.userChoice=Promise.resolve({outcome:'dismissed'});window.dispatchEvent(e);});
 assert.equal(await page.evaluate(()=>window.fixtureInstallPrompts),0);await page.locator('#installAppBtn').click();assert.equal(await page.evaluate(()=>window.fixtureInstallPrompts),1);
 const sw=await page.evaluate(async()=>{const r=await navigator.serviceWorker.ready;return{scope:r.scope,script:r.active.scriptURL};});assert.equal(sw.scope,server.url);
 const cached=await page.evaluate(async()=>{const out=[];for(const key of await caches.keys())for(const r of await(await caches.open(key)).keys())out.push(r.url);return out;});assert.equal(cached.length,4);assert.ok(cached.every(u=>u.startsWith(server.url+'assets/glowme/')));
 const cdp=await context.newCDPSession(page),manifest=await cdp.send('Page.getAppManifest');assert.equal(manifest.errors.length,0);assert.equal(JSON.parse(manifest.data).scope,'/fromm-viewer/');await cdp.detach();assert.deepEqual(errors,[]);await context.close();
 const app=await open(browser,server.url,{width:1440,height:900,installed:true});assert.equal(await app.page.evaluate(()=>FrommGlowME.pinned),true);
 await app.page.evaluate(()=>setFilter('image'));assert.equal(await app.page.locator('#chatToolsPanel').isVisible(),false);assert.equal(await app.page.evaluate(()=>FrommGlowME.pinned),false);
 await app.page.evaluate(()=>setFilter('all'));assert.equal(await app.page.locator('#chatToolsPanel').isVisible(),true);
 await app.page.setViewportSize({width:390,height:844});assert.equal(await app.page.evaluate(()=>FrommGlowME.pinned),false);await app.context.close();
 fs.writeFileSync(process.env.PHASE3_AUDIT_JSON||'/tmp/fromm-phase3-axe.json',JSON.stringify(audits,null,2));assert.ok(audits.every(a=>!a.violations.length),JSON.stringify(audits));console.log('PWA scope/public-only cache/install opt-in, responsive search and axe PASS');
}finally{await browser.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
