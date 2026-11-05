'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'../..');
async function serve(base=root){
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),rel=decodeURIComponent(url.pathname).replace(/^\/fromm-viewer\//,''),file=path.resolve(base,rel||'index.html');
  if(!url.pathname.startsWith('/fromm-viewer/')||!file.startsWith(base+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  const type={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.mp4':'video/mp4'};
  res.setHeader('Content-Type',type[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));return{url:`http://127.0.0.1:${server.address().port}/fromm-viewer/`,close:()=>new Promise(r=>server.close(r))};
}
async function seed(page){await page.evaluate(()=>{
 setActiveAuth('synthetic','synthetic','synthetic');hideLoginGate();
 state.rooms=Array.from({length:30},(_,i)=>({id:'room-'+i,hostChatRoomId:'room-'+i,host:{nick:i?'아티스트 '+(i+1):'테스트 아티스트',profileUrlThumbnail:'https://fixture.test/avatar.svg'}}));state.room=state.rooms[0];state.filter='all';state.chatHistoryComplete=true;state.hasMoreMessages=false;
 state.messages=Array.from({length:180},(_,i)=>({messageId:'m'+i,type:i%4===0?'image':i%9===0?'video':i%11===0?'sound':'text',userType:'star',content:i%4===0?'https://fixture.test/photo.svg':'스크롤과 가독성을 확인하는 합성 대화 '+i,createdAt:1791534600000+i*60000,...(i===1?{mentionedMessage:{messageId:'original',userId:'fan',content:'밝은 말풍선 속 인용 답장'}}:{})}));
 state.chatMessages=state.messages;state.live.discoveryLoaded=true;state.live.channelsLoaded=true;state.live.channels=[{id:'fixture-channel',channelName:'테스트 채널',isSubscribed:true}];
 const rooms=document.querySelector('#rooms');rooms.replaceChildren();state.rooms.forEach((room,i)=>{const b=document.createElement('button');b.className='room'+(i?'':' active');b.textContent=room.host.nick;b.onclick=()=>selectRoom(i,b);rooms.append(b);});render();scrollTo(0,0);
 });await page.waitForTimeout(120);}
async function open(browser,url,{width=1440,height=900,installed=false,login=false,serviceWorkers="block",lowPower=false,userAgent}={}){
 const context=await browser.newContext({viewport:{width,height},isMobile:width<700||height<500,hasTouch:width<700||height<500,serviceWorkers,...(userAgent?{userAgent}:{})});
 if(lowPower)await context.addInitScript(()=>Object.defineProperty(navigator,'deviceMemory',{get:()=>2}));
 if(installed)await context.addInitScript(()=>{const original=matchMedia.bind(window),m=new EventTarget();Object.defineProperties(m,{matches:{get:()=>true},media:{value:'(display-mode: standalone)'}});window.matchMedia=q=>q==='(display-mode: standalone)'?m:original(q);});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  let u=new URL(route.request().url());if(u.pathname==='/__fromm_proxy')u=new URL(u.searchParams.get('url'));
  if(u.hostname==='fixture.test')return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" fill="#94d9c4"/><circle cx="320" cy="160" r="90" fill="#edf8f0"/><path d="M100 400Q320 120 540 400" fill="#428e7a"/></svg>'});
  if(u.hostname.endsWith('frommyarti.com'))return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{messages:[],posts:[],votes:[],isLast:true,nextCursor:null,channels:[],liveRooms:[]}})});
  if(u.origin===new URL(url).origin)return route.continue();return route.abort();
 });await page.goto(url);if(!login)await seed(page);return{page,context,errors};
}
module.exports={serve,seed,open};
