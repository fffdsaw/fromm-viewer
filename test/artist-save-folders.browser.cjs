'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {serve,open,seed}=require('./helpers/phase3-fixture.cjs');
const {seedCollection}=require('./helpers/collection-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch();try{
 const setup={newContext:async options=>{const c=await browser.newContext(options);await c.addInitScript(()=>{
  window.folderName='Default-fixture';window.pickerCalls=[];window.writePermission='granted';window.permissionCalls=[];
  window.showDirectoryPicker=async()=>{const name=folderName;pickerCalls.push({name,active:navigator.userActivation.isActive});return(await navigator.storage.getDirectory()).getDirectoryHandle(name,{create:true});};
  FileSystemHandle.prototype.requestPermission=async function(){permissionCalls.push({name:this.name,active:navigator.userActivation.isActive});return writePermission;};
 });return c;}};
 const {page,context,errors}=await open(setup,server.url,{width:1440});
 async function artists(){await page.evaluate(()=>{state.rooms=[{id:'synthetic-h',hostChatRoomId:'host-h',host:{nick:'송하영'}},{id:'synthetic-j',hostChatRoomId:'host-j',host:{nick:'박지원'}}];state.room=state.rooms[0];});}
 async function settings(){await page.evaluate(()=>FrommGlowME.setRailOpen(true));await page.locator('#glassSettingsBtn').click();await page.locator('[data-settings-tab="general"]').click();}
 async function close(){await page.locator('#glassSettingsDialog .glass-settings-done').click();}
 await artists();await settings();await page.getByRole('button',{name:'폴더 선택',exact:true}).click();
 await page.evaluate(()=>folderName='Hayoung-fixture');await page.getByRole('button',{name:'송하영 저장 폴더 지정',exact:true}).click();
 await page.locator('[data-artist-folder="host-h"]').getByText('Hayoung-fixture',{exact:true}).waitFor();
 assert.equal(await page.locator('[data-artist-folder="host-j"]').getByText('기본 저장 폴더 사용',{exact:true}).count(),1);
 if(process.env.DESKTOP_FOLLOWUP_SCREENSHOT_DIR){fs.mkdirSync(process.env.DESKTOP_FOLLOWUP_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:process.env.DESKTOP_FOLLOWUP_SCREENSHOT_DIR+'/artist-folders.png'});}
 await close();
 let requests=0;
 await page.route('**/*',route=>{
  let u=new URL(route.request().url());if(u.pathname==='/__fromm_proxy')u=new URL(u.searchParams.get('url'));
  if(u.pathname.startsWith('/media/posts/folder-')){requests++;return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{post:{id:u.pathname.split('/').at(-1),type:'image',isVisible:true,urls:['https://fixture.test/photo.svg']}}})});}
  return route.fallback();
 });
 async function feed(){await seedCollection(page,'channel',1,'a');await page.evaluate(()=>{
  channelVideoState.mediaType='image';channelVideoState.pages.set(channelVideoPageKey(),{loaded:true,isLast:true,posts:[{id:'folder-h',_channelId:'a',type:'image',title:'합성 H',displayStartAt:1791534600000,_artistAuthor:'SONG HA YOUNG',thumbnail:{url:'https://fixture.test/photo.svg'}},{id:'folder-j',_channelId:'a',type:'image',title:'합성 J',displayStartAt:1791534600001,_artistAuthor:'PARK JI WON',thumbnail:{url:'https://fixture.test/photo.svg'}}]});renderLiveView();
 });}
 async function save(id){await page.locator(`[data-channel-photo-download="${id}"]`).click();await page.locator('#saveResultModal').waitFor();const text=await page.locator('#saveResultSummary').textContent();await page.getByRole('button',{name:'확인',exact:true}).click();await page.locator('#saveResultModal').waitFor({state:'hidden'});return text;}
 await feed();assert.match(await save('folder-h'),/저장 완료/);assert.match(await save('folder-j'),/저장 완료/);
 const files=()=>page.evaluate(async()=>{const root=await navigator.storage.getDirectory(),result={};for(const name of ['Default-fixture','Hayoung-fixture']){result[name]=[];for await(const[file,handle]of(await root.getDirectoryHandle(name)).entries())if(handle.kind==='file')result[name].push({name:file,size:(await handle.getFile()).size});}return result;});
 const stored=await files();assert.equal(stored['Default-fixture'].length,1);assert.equal(stored['Hayoung-fixture'].length,1);assert.ok(Object.values(stored).flat().every(f=>f.size>0));
 assert.match(await save('folder-h'),/기존 파일/);assert.deepEqual(await files(),stored);
 await page.evaluate(()=>{state.postSelected=new Set(channelVideoPage().posts.map(post=>downloadSelectionKey('channel-image',post)));syncDownloadSelection();});
 await page.locator('#saveSelectedBtn').click();await page.locator('#saveResultModal').waitFor();assert.match(await page.locator('#saveResultSummary').textContent(),/기존 파일 2장/);await page.getByRole('button',{name:'확인',exact:true}).click();await page.locator('#saveResultModal').waitFor({state:'hidden'});assert.deepEqual(await files(),stored,'mixed artist batch resolves both destinations before duplicate checks');

 await page.reload();await seed(page);await artists();await page.evaluate(()=>FrommSaveFolder.ready);await feed();assert.match(await save('folder-h'),/기존 파일/);assert.equal(await page.evaluate(()=>pickerCalls.length),0,'persisted artist handle, no picker on reload');
 await page.evaluate(()=>writePermission='denied');const before=requests;assert.match(await save('folder-h'),/쓰기 권한/);assert.equal(requests,before,'denied permission before details');await page.evaluate(()=>writePermission='granted');
 await page.route('**/artist-file/*',route=>route.fulfill({contentType:route.request().url().endsWith('sound')?'audio/mp4':route.request().url().endsWith('video')?'video/mp4':'image/jpeg',body:Buffer.alloc(2048,0x5a)}));
 await page.evaluate(async()=>{await setFilter('media');state.chatHistoryComplete=true;state.hasMoreMessages=false;state.messages=['image','video','sound'].map((type,i)=>({messageId:'artist-file-'+i,type,userType:'star',createdAt:1791534600000+i*1000,content:location.origin+'/artist-file/'+type}));state.chatMessages=state.messages;state.selected=new Set(state.messages.map(m=>m.messageId));buildMediaSequences();render();});
 await page.locator('#saveSelectedBtn').click();await page.locator('#saveResultModal').waitFor();assert.match(await page.locator('#saveResultSummary').textContent(),/새로 저장 3개/);await page.getByRole('button',{name:'확인',exact:true}).click();await page.locator('#saveResultModal').waitFor({state:'hidden'});
 const media=await page.evaluate(async()=>{const dir=await(await navigator.storage.getDirectory()).getDirectoryHandle('Hayoung-fixture'),result=[];async function walk(d,prefix=''){for await(const[name,h]of d.entries())if(h.kind==='directory')await walk(h,prefix+name+'/');else result.push({name:prefix+name,size:(await h.getFile()).size});}await walk(dir);return result;});
 assert.equal(media.filter(f=>f.name.startsWith('audio/')).length,1);assert.ok(media.filter(f=>/\.(jpg|mp4)$/.test(f.name)&&!f.name.startsWith('audio/')).length>=2);assert.ok(media.every(f=>f.size>0));
 await feed();
 await settings();await page.getByRole('button',{name:'송하영 기본 저장 폴더 사용',exact:true}).click();await page.locator('[data-artist-folder="host-h"]').getByText('기본 저장 폴더 사용',{exact:true}).waitFor();await close();assert.match(await save('folder-h'),/저장 완료/);assert.equal((await files())['Hayoung-fixture'].length,3,'reset never deletes existing files');
 await page.evaluate(()=>setActiveAuth('other-synthetic','other-device','other-account'));assert.equal(await page.evaluate(()=>FrommSaveFolder.name(currentAccountScope(),'host-h')),'');
 assert.deepEqual(errors,[]);await context.close();console.log('PC per-subscription settings, alias routing, separate real file writes, default fallback, duplicates, IDB reload, denial, non-destructive reset and account isolation PASS');
}finally{await browser.close();await server.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
