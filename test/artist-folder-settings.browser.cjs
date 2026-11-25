'use strict';
// Synthetic subscriptions and real isolated OPFS. No account or OS folders.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve,open,seed}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
try{
 const wrapper={newContext:async options=>{const c=await browser.newContext(options);await c.addInitScript(()=>{
  window.folderPath=['Pictures'];window.denyFolder=false;
  window.showDirectoryPicker=async()=>{let dir=await navigator.storage.getDirectory();for(const part of folderPath)dir=await dir.getDirectoryHandle(part,{create:true});return dir;};
  FileSystemHandle.prototype.requestPermission=async()=>denyFolder?'denied':'granted';
 });return c;}};
 const {page,context,errors}=await open(wrapper,server.url,{width:1440});
 const rooms=[['j','박지원'],['c','이채영'],['h','송하영'],['n','이나경'],['b','백지헌'],['oh','효정']].map(([id,nick])=>({id:'fixture-'+id,hostChatRoomId:'host-'+id,host:{nick}}));
 const roster=()=>page.evaluate(rooms=>{state.rooms=rooms;state.room=rooms.find(r=>r.hostChatRoomId==='host-h');},rooms);
 const show=async()=>{await page.evaluate(()=>FrommGlowME.setRailOpen(true));await page.locator('#glassSettingsBtn').click();await page.locator('[data-settings-tab="general"]').click();};
 const close=()=>page.locator('#glassSettingsDialog .glass-settings-done').click();
 await roster();await show();await page.getByRole('button',{name:'폴더 선택',exact:true}).click();
 const hayoung=page.locator('[data-artist-folder="host-h"]'),fromis=page.locator('[data-folder-group="fromis_9"]'),toggle=page.getByRole('switch',{name:'아티스트별 저장 폴더',exact:true});
 assert.deepEqual(await fromis.locator('h4').allTextContents(),['송하영','박지원','이채영','이나경','백지헌']);
 assert.equal(await fromis.locator('.artist-folder-count').innerText(),'0/5 지정');
 await page.evaluate(()=>folderPath=['Pictures','fromis_9','송하영']);await hayoung.locator('.artist-folder-choose').click();
 await page.waitForFunction(()=>document.querySelector('[data-artist-folder="host-h"] .artist-folder-path').title==='Pictures / fromis_9 / 송하영');
 assert.equal(await fromis.locator('.artist-folder-count').innerText(),'1/5 지정');
 assert.equal(await hayoung.locator('.artist-folder-choose').innerText(),'변경');
 assert.equal(await page.locator('[data-artist-folder="host-c"] [data-folder-value]').innerText(),'Pictures · 기본 폴더');
 // Long unrelated names remain truthful: no invented absolute parent path.
 const long='별도-'+ '긴폴더이름'.repeat(12);
 await page.evaluate(name=>folderPath=[name],long);await page.locator('[data-artist-folder="host-j"] .artist-folder-choose').click();
 await page.waitForFunction(name=>document.querySelector('[data-artist-folder="host-j"] .artist-folder-path').title===name,long);
 const overflow=await page.locator('[data-artist-folder="host-j"] [data-folder-value]').evaluate(e=>({scroll:e.scrollWidth,width:e.clientWidth,mode:getComputedStyle(e).textOverflow}));assert.ok(overflow.scroll>overflow.width);assert.equal(overflow.mode,'ellipsis');await page.locator('[data-artist-folder="host-j"] .artist-folder-path').focus();assert.equal(await page.locator('[data-artist-folder="host-j"] [data-folder-value]').evaluate(e=>getComputedStyle(e).whiteSpace),'normal','keyboard focus reveals the full path');await toggle.focus();
 assert.equal(await fromis.locator('.artist-folder-count').innerText(),'2/5 지정');
 const box=await toggle.boundingBox();assert.ok(Math.abs(box.width-128)<1&&box.height>=44);await page.waitForFunction(()=>document.querySelector('#artistFoldersEnabled').hasAttribute('data-glass-ready'));
 const alpha=()=>page.locator('#artistFoldersEnabled canvas').evaluate(canvas=>{const {data}=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);let min=canvas.height,max=0;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]>12){min=Math.min(min,y);max=Math.max(max,y);}return{min,max};});
 const trackColor=()=>page.locator('#artistFoldersEnabled canvas').evaluate(c=>Array.from(c.getContext('2d').getImageData(Math.floor(c.width*40/164),Math.floor(c.height/2),1,1).data).slice(0,3));
 assert.deepEqual(await trackColor(),[22,123,101],'initial connected switch uses the active Glow palette');
 const rest=await alpha();await toggle.click();await page.waitForTimeout(250);const middle=await alpha();assert.ok(middle.min<rest.min-3,'approved capsule swells above the stationary track');
 const out=process.env.ARTIST_FOLDER_DIR;if(out){fs.mkdirSync(out,{recursive:true});await toggle.screenshot({path:path.join(out,'toggle-transition.png')});}
 // Reversal is continuous within the same event turn, without a new origin.
 const reversed=await toggle.evaluate(button=>{const before=button.querySelector('canvas').toDataURL();for(let i=0;i<5;i++)button.click();return before===button.querySelector('canvas').toDataURL();});assert.equal(reversed,true);
 await page.waitForTimeout(600);const panel=await page.locator('#glassSettingsDialog').boundingBox();assert.ok(panel.y>=11&&panel.y+panel.height<=901,'expanded panel stays within viewport');assert.equal(await toggle.getAttribute('aria-checked'),'true');assert.equal(await page.locator('#artistFolderList').isVisible(),true);
 await toggle.focus();await toggle.press('Space');await page.waitForTimeout(600);assert.equal(await toggle.getAttribute('aria-checked'),'false');assert.equal(await page.locator('#artistFolderList').isVisible(),false);
 assert.equal(await page.evaluate(()=>FrommSaveFolder.name(currentAccountScope(),'host-h')),'송하영','OFF preserves handle');
 // Save real synthetic bytes with the existing media batch pipeline in OFF,
 // then ON. Check default and assigned destination without replacing writers.
 const prepareMedia=()=>page.evaluate(()=>{state.filter='media';state.chatHistoryComplete=true;state.hasMoreMessages=false;state.messages=[{messageId:'folder-toggle-photo',userType:'star',type:'image',content:'https://fixture.test/photo.svg',createdAt:1791534600000}];state.chatMessages=state.messages;state.selected=new Set(['folder-toggle-photo']);buildMediaSequences();render();});
 await close();await prepareMedia();
 async function save(){await page.locator('#saveSelectedBtn').click();await page.locator('#saveResultModal').waitFor();assert.match(await page.locator('#saveResultSummary').innerText(),/새로 저장 1개/);await page.getByRole('button',{name:'확인',exact:true}).click();await page.locator('#saveResultModal').waitFor({state:'hidden'});}
 await save();
 async function counts(){return page.evaluate(async()=>{const root=await navigator.storage.getDirectory(),base=await root.getDirectoryHandle('Pictures'),artist=await(await base.getDirectoryHandle('fromis_9')).getDirectoryHandle('송하영');const list=async dir=>{const files=[];for await(const[name,handle]of dir.entries())if(handle.kind==='file')files.push({name,size:(await handle.getFile()).size});return files;};return{base:await list(base),artist:await list(artist)};});}
 let files=await counts();assert.equal(files.base.length,1);assert.equal(files.artist.length,0);
 await page.reload();await seed(page);await roster();await page.evaluate(()=>FrommSaveFolder.ready);await prepareMedia();await show();assert.equal(await toggle.getAttribute('aria-checked'),'false','OFF restored on reload');assert.equal(await page.evaluate(()=>FrommSaveFolder.name(currentAccountScope(),'host-h')),'송하영');await toggle.press('Enter');await page.waitForTimeout(600);await close();await page.evaluate(()=>{state.selected=new Set(['folder-toggle-photo']);syncDownloadSelection();});await save();files=await counts();assert.equal(files.base.length,1);assert.equal(files.artist.length,1);assert.ok(files.artist[0].size>0);
 await show();await fromis.locator('summary').click();await page.waitForTimeout(250);await close();
 await page.reload();await seed(page);await roster();await show();assert.equal(await fromis.getAttribute('open'),null,'group state restored');assert.equal(await toggle.getAttribute('aria-checked'),'true');await fromis.locator('summary').click();
 for(const theme of ['glow','classic']){await page.evaluate(theme=>FrommThemes.set(theme),theme);await page.waitForTimeout(100);assert.deepEqual(await trackColor(),theme==='classic'?[255,91,115]:[22,123,101],'Canvas follows current theme');if(out)await page.locator('.artist-save-folders').scrollIntoViewIfNeeded();if(out)await page.screenshot({path:path.join(out,'settings-'+theme+'.png')});assert.ok((await toggle.boundingBox()).height>=44);}
 await page.emulateMedia({reducedMotion:'reduce'});await toggle.click();assert.equal(await page.locator('#artistFolderList').isVisible(),false);await toggle.click();assert.equal(await page.locator('#artistFolderList').isVisible(),true);
 // Removing an override only changes routing, leaving real files in place.
 await hayoung.getByRole('button',{name:'송하영 저장 폴더 메뉴'}).click();await page.keyboard.press('Escape');assert.equal(await page.locator('#glassSettingsDialog').isVisible(),true,'Escape dismisses only the menu');await hayoung.getByRole('button',{name:'송하영 저장 폴더 메뉴'}).click();await page.getByRole('menuitem',{name:'송하영 기본 저장 폴더 사용'}).click();assert.equal(await fromis.locator('.artist-folder-count').innerText(),'1/5 지정');assert.deepEqual(await counts(),files);
 await page.evaluate(()=>setActiveAuth('other-synthetic','other-device','other-account'));await close();await show();assert.equal(await page.evaluate(()=>FrommSaveFolder.enabled(currentAccountScope())),true);assert.equal(await fromis.locator('.artist-folder-count').innerText(),'0/5 지정');
 await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('.artist-save-folders').isVisible(),false,'mobile stays outside this feature');
 assert.deepEqual(errors,[]);await context.close();console.log('Grouped birthday roster/counts, truthful long paths, 520ms capsule sampling/reversal, keyboard, OFF/default and ON/override real writes, reload/group/account persistence, non-destructive reset, themes, reduced motion and mobile exclusion PASS');
}finally{await browser.close();await server.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
