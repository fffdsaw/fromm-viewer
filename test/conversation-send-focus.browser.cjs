'use strict';
// Own send is an explicit jump, including while fresh validation/POST/echo are delayed.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
(async()=>{const server=await serve(),browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
try{for(const cfg of [{width:1440},{width:780,installed:true},{width:390}]){
 const {page,context,errors}=await open(browser,server.url,{...cfg,login:true});
 let holdRules=null,releaseRules,holdPost=null,releasePost,posts=[],mode='empty';
 const rows=Array.from({length:1200},(_,i)=>({messageId:'m'+i,type:'text',userType:'star',content:'이전 대화 '+i,createdAt:Date.now()-1300000+i*1000}));
 await page.route('**/*',async route=>{
  let u=new URL(route.request().url());if(u.pathname==='/__fromm_proxy')u=new URL(u.searchParams.get('url'));if(!u.hostname.endsWith('frommyarti.com'))return route.fallback();
  const answer=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:status===200,data})}).catch(()=>{});
  if(u.pathname==='/v2/user/fan/profile')return answer({profile:{id:'self'}});
  if(u.pathname==='/v2/chat/fanChatRooms/fan'){if(holdRules){const promise=holdRules;holdRules=null;await promise;}return answer({chatRoom:{sendChatRules:{chatMaxLength:450,forbiddenWords:[]}}});}
  if(u.pathname==='/v2/chat/emoticons/host')return answer({emoticonPacks:[{id:'pack',nameAdmin:'인사',tabIconUrl:'https://fixture.test/tab.svg'}]});
  if(u.pathname==='/v2/chat/emoticons/host/emoticon/pack')return answer({emoticonItems:[{id:'heart',imageUrl:'https://fixture.test/heart.svg'}]});
  if(u.pathname.endsWith('/messages')){const start=Date.parse(u.searchParams.get('findStartAt')),end=Date.parse(u.searchParams.get('findEndAt'));return answer({messages:rows.filter(m=>m.createdAt>=start&&m.createdAt<=end).sort((a,b)=>b.createdAt-a.createdAt).slice(0,Number(u.searchParams.get('limit')))});}
  if(u.pathname.endsWith('/replies')){const body=route.request().postDataJSON();posts.push(body);if(holdPost){const promise=holdPost;holdPost=null;await promise;}if(mode==='denied')return answer({},403);if(mode==='direct'){const message={messageId:'fast-sticker',type:'text',userType:'fan',...body,createdAt:Date.now()-1};rows.push(message);return answer({message});}return answer({});}
  return route.fallback();
 });
 await page.evaluate(()=>{setActiveAuth('synthetic','device','');hideLoginGate();FrommConversation.loadFirebase=async()=>{throw Error('fixture fallback')};state.rooms=[{id:'fan',hostChatRoomId:'host',host:{nick:'아티스트'}}];const button=document.createElement('button');button.className='room';document.querySelector('#rooms').replaceChildren(button);selectRoom(0,button)});
 await page.waitForFunction(()=>state.chatHistoryComplete&&FrommConversation.status.phase==='connected');await page.waitForTimeout(1500);
 async function older(){await page.evaluate(()=>{FrommViewState.cancel();renderChatWindow(filteredMessages(),400);scrollTo({top:600,behavior:'instant'})});await page.waitForFunction(()=>state.infiniteRendered<state.infiniteList.length);}
 async function quiet(){assert.equal(await page.locator('#conversationSend').innerText(),'전송');assert.equal(await page.locator('#conversationStatus').isVisible(),false);assert.equal(await page.locator('.conversation-meta').isVisible(),false);assert.equal(await page.locator('#conversationPending small').count(),0);}
 async function pendingAbove(){await page.waitForFunction(()=>{const bubble=document.querySelector('#conversationPending')?.lastElementChild?.getBoundingClientRect(),dock=document.querySelector('#conversationDock').getBoundingClientRect();return bubble&&bubble.bottom<=dock.top-5});const r=await page.locator('#conversationPending').evaluate(e=>({right:e.lastElementChild.getBoundingClientRect().right,input:document.querySelector('#conversationInput').getBoundingClientRect().right}));assert.ok(r.right<=r.input+1);}
 for(const sticker of [false,true]){
  await older();
  if(sticker){await page.locator('#conversationEmoticonButton').click();await page.locator('[data-emoticon="heart"]').click();}
  await page.locator('#conversationInput').fill(sticker?'같이 보내요':'이전 대화에서 보낸 글');
  holdRules=new Promise(resolve=>releaseRules=resolve);holdPost=new Promise(resolve=>releasePost=resolve);const before=posts.length;
  await page.locator('#conversationSend').click();await page.waitForFunction(()=>document.querySelector('#conversationSend').getAttribute('aria-busy')==='true');
  await page.waitForFunction(()=>state.infiniteRendered===state.infiniteList.length&&document.documentElement.scrollHeight-scrollY-innerHeight<3);
  assert.equal(posts.length,before,'fresh rules finish before POST');await quiet();
  releaseRules();await page.waitForFunction(()=>!!document.querySelector('#conversationPending'));while(posts.length===before)await page.waitForTimeout(10);
  await pendingAbove();await quiet();assert.ok((await page.locator('#conversationPending').innerText()).includes(sticker?'같이 보내요':'이전 대화에서 보낸 글'));
  if(sticker){assert.equal(await page.locator('#conversationPending img').getAttribute('src'),'https://fixture.test/heart.svg');assert.equal(await page.locator('#conversationEmoticonPreview').isVisible(),false);}
  if(process.env.CONVERSATION_DIR){fs.mkdirSync(process.env.CONVERSATION_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.CONVERSATION_DIR,(sticker?'sticker':'text')+'-pending-'+cfg.width+'.png')});}
  releasePost();await page.waitForFunction(()=>document.querySelector('#conversationSend').getAttribute('aria-busy')==='false'&&document.querySelector('#conversationInput').value==='');await quiet();await pendingAbove();
  const id='sent-'+posts.length;rows.push({messageId:id,type:'text',userType:'fan',...posts.at(-1),createdAt:Date.now()-1});
  await page.waitForFunction(id=>state.messages.some(m=>m.messageId===id)&&!document.querySelector('#conversationPending'),id,{timeout:10000});
  await page.waitForFunction(id=>{const bubble=document.querySelector(`[data-message-id="${id}"] .bubble`)?.getBoundingClientRect(),dock=document.querySelector('#conversationDock').getBoundingClientRect();return bubble&&bubble.bottom<=dock.top-5;},id);
  assert.equal(await page.locator(`[data-message-id="${id}"]`).count(),1,'receipt reconciles without a duplicate');if(sticker)assert.equal(await page.locator(`[data-message-id="${id}"] .emoticon-img`).count(),1);await quiet();
 }
 // A direct POST reply can beat the first scroll/preview-resize frame.
 await older();await page.locator('#conversationEmoticonButton').click();await page.locator('[data-emoticon="heart"]').click();await page.locator('#conversationInput').fill('바로 전송한 이모티콘');mode='direct';
 await page.locator('#conversationSend').click();await page.waitForFunction(()=>state.messages.some(m=>m.messageId==='fast-sticker'));
 assert.equal(await page.locator('[data-message-id="fast-sticker"] .emoticon-img').count(),1,'fast canonical reply is rendered immediately');
 await page.waitForFunction(()=>{const bubble=document.querySelector('[data-message-id="fast-sticker"] .bubble').getBoundingClientRect(),dock=document.querySelector('#conversationDock').getBoundingClientRect();return bubble.bottom<=dock.top-5;});await quiet();
 // A rejected send keeps the real error and draft; quiet progress never hides failures.
 await older();mode='denied';await page.locator('#conversationInput').fill('권한 오류 초안');await page.locator('#conversationSend').click();await page.waitForFunction(()=>document.querySelector('#conversationStatus').textContent.includes('보내지 못했습니다'));
 assert.equal(await page.locator('#conversationStatus').isVisible(),true);assert.equal(await page.locator('#conversationInput').inputValue(),'권한 오류 초안');assert.equal(await page.locator('#conversationPending').count(),0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await context.close();
 console.log(`${cfg.width}${cfg.installed?' standalone simulation':''}: older reader -> immediate latest on send, delayed validation/POST/echo, quiet text/sticker preview, one canonical receipt and visible failure/draft PASS`);
}}finally{await browser.close();await server.close()}})().catch(error=>{console.error(error);process.exitCode=1});
