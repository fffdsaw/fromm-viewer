'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {serve,open,seed}=require('./helpers/phase3-fixture.cjs');
const {seedCollection}=require('./helpers/collection-fixture.cjs');

(async()=>{
 const server=await serve(),browser=await chromium.launch();
 try{
  const setup={newContext:async options=>{
   const context=await browser.newContext(options);
   await context.addInitScript(()=>{
    localStorage.setItem('fromm.glassEngine.v1',JSON.stringify({engine:'ybouane'}));
    window.pickerCalls=[];window.permissionCalls=[];
    window.folderName='Pictures-fixture';window.writePermission='granted';
    window.showDirectoryPicker=async ({mode})=>{
     pickerCalls.push({mode,active:navigator.userActivation.isActive});
     return (await navigator.storage.getDirectory()).getDirectoryHandle(folderName,{create:true});
    };
    FileSystemHandle.prototype.requestPermission=async function({mode}){
     permissionCalls.push({name:this.name,mode,active:navigator.userActivation.isActive});
     return writePermission;
    };
   });
   return context;
  }};
  const {page,context,errors}=await open(setup,process.env.FROMM_SAVE_FOLDER_PUBLIC_URL||server.url,{width:1440});
  const image='https://fixture.test/save-folder.svg';
  let detailCalls=0;
  const photo={id:'folder-photo',_channelId:'a',type:'image',isVisible:true,title:'폴더 사진',displayStartAt:1791534600000,urls:[image],thumbnail:{url:image}};
  await page.route('**/*',route=>{
   let url=new URL(route.request().url());if(url.pathname==='/__fromm_proxy')url=new URL(url.searchParams.get('url'));
   if(url.href===image)return route.fulfill({contentType:'image/svg+xml',headers:{'access-control-allow-origin':'*'},body:'<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><rect width="12" height="12" fill="#217b63"/></svg>'});
   if(url.pathname==='/media/posts/folder-photo'){detailCalls++;return route.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({success:true,data:{post:photo}})});}
   return route.fallback();
  });
  async function channelPhoto(){
   await seedCollection(page,'channel',2,'a');
   await page.evaluate(post=>{channelVideoPage().posts.unshift(post);renderLiveView();},photo);
  }
  async function save(message){
   await page.locator('[data-channel-photo-download="folder-photo"]').click();
   const sheet=page.locator('#saveResultModal');await sheet.waitFor();
   assert.match(await sheet.locator('#saveResultSummary').textContent(),message);
   await sheet.getByRole('button',{name:'확인',exact:true}).click();await sheet.waitFor({state:'hidden'});
  }
  async function settings(){
   await page.evaluate(()=>FrommGlowME.setRailOpen(true));
   await page.locator('#glassSettingsBtn').click();
  }
  await channelPhoto();await save(/저장 완료/);
  assert.deepEqual(await page.evaluate(()=>pickerCalls),[{mode:'readwrite',active:true}]);
  await save(/기존 파일/);
  assert.equal(await page.evaluate(()=>pickerCalls.length),1);
  await page.reload();await seed(page);await channelPhoto();
  await page.evaluate(()=>FrommSaveFolder.ready);
  await save(/기존 파일/);
  assert.deepEqual(await page.evaluate(()=>pickerCalls),[]);
  assert.deepEqual(await page.evaluate(()=>permissionCalls),[{name:'Pictures-fixture',mode:'readwrite',active:true}]);
  const fetched=detailCalls;
  await page.evaluate(()=>{window.writePermission='denied';});
  await save(/쓰기 권한/);
  assert.equal(detailCalls,fetched,'denying permission stops the save before requesting media');
  assert.equal(await page.evaluate(()=>pickerCalls.length),0);
  await page.evaluate(()=>{window.writePermission='granted';window.folderName='Changed-fixture';});
  await settings();await page.locator('[data-settings-tab="general"]').click();
  await page.getByRole('button',{name:'폴더 변경',exact:true}).click();
  await page.locator('#settings-panel-general').getByText('Changed-fixture',{exact:true}).waitFor();
  await page.locator('[data-settings-tab="glass"]').click();
  await page.locator('.glass-preview-lens [data-glass-material="convex"]').waitFor();
  assert.equal(await page.getByLabel('광학 엔진').count(),0,'a saved experimental selection no longer replaces Meapri');
  await page.locator('#glassSettingsDialog .glass-settings-done').click();
  await save(/저장 완료/);
  const files=await page.evaluate(async()=>{
   const root=await navigator.storage.getDirectory();
   const folder=await root.getDirectoryHandle('Changed-fixture');
   const result=[];for await(const [,handle] of folder.entries())result.push(await (await handle.getFile()).text());return result;
  });
  assert.equal(files.length,1);assert.match(files[0],/<svg/);
  await page.evaluate(()=>setActiveAuth('other-token','other-device','other-fixture'));
  await settings();await page.locator('[data-settings-tab="general"]').click();
  await page.getByRole('button',{name:'폴더 선택',exact:true}).waitFor();
  assert.deepEqual(errors,[]);await context.close();
  console.log('Desktop folder reuse, IndexedDB reload, denied write, change folder, account scope, and Meapri migration PASS');
 }finally{await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
