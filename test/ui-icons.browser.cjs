'use strict';
// Production UI with synthetic metadata only; no account or real LIVE requests.
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const shotDir = process.env.UI_ICON_SCREENSHOT_DIR;
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
      const page = await context.newPage();
      const errors=[]; page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/*',route=>{
        const url=new URL(route.request().url());
        if(url.hostname==='cdn.example') return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="440"><rect width="640" height="440" fill="#354158"/></svg>'});
        if(url.hostname==='viewer.test') return route.fulfill({contentType:url.pathname.endsWith('.js')?'text/javascript':'text/html',body:fs.readFileSync(path.join(root,url.pathname.endsWith('.js')?path.basename(url.pathname):'index.html'))});
        return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{posts:[],isLast:true,channels:[],liveRooms:[]}})});
      });
      await page.goto('https://viewer.test/index.html');
      await page.evaluate(()=>{setActiveAuth('fixture','fixture','fixture');hideLoginGate();state.room={id:'a',host:{nick:'Test'}};state.chatHistoryComplete=true;state.hasMoreMessages=false;state.filter='all';syncLiveToolbarControls();render();});
      const centered=async selector=>{
        const b=page.locator(selector).first(); await b.waitFor({state:'attached'});
        const g=await b.evaluate(el=>{const r=el.getBoundingClientRect(),s=el.querySelector('svg').getBoundingClientRect();return {dx:s.x+s.width/2-r.x-r.width/2,dy:s.y+s.height/2-r.y-r.height/2,inside:s.left>=r.left&&s.right<=r.right&&s.top>=r.top&&s.bottom<=r.bottom};});
        assert.ok(Math.abs(g.dx)<=0.5&&Math.abs(g.dy)<=0.5&&g.inside,`${width} ${selector}: centered and unclipped`);
      };
      const shot=async name=>{if(shotDir){fs.mkdirSync(shotDir,{recursive:true});await page.screenshot({path:path.join(shotDir,`${name}-${width}.png`)});}};
      await page.locator('#chatToolsBtn').click();
      await centered('#chatToolsBtn');
      await page.locator('#chatSearchInput').fill('test');
      await centered('#chatSearchClear');
      await page.locator('#chatSearchClear').click();
      assert.equal(await page.locator('#chatSearchInput').inputValue(),'');
      await page.locator('#datePickerBtn').click();
      for(const s of ['#datePrevMonth','#dateNextMonth']) await centered(s);
      await shot('search-calendar');
      await page.evaluate(()=>openImageLightbox('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"/>'));
      await centered('#lightboxClose'); await shot('lightbox');
      await page.locator('#lightboxClose').click();
      assert.equal(await page.locator('#imageLightbox').evaluate(e=>e.classList.contains('open')),false);
      await page.evaluate(()=>document.querySelector('.save-result-modal').classList.add('open'));
      await centered('#saveResultClose'); await page.locator('#saveResultClose').click();
      await page.evaluate(()=>{document.querySelector('#scrollTopBtn').classList.add('visible');});
      await centered('#scrollTopBtn');
      await page.evaluate(()=>{
        state.messages=[{messageId:'photo',type:'image',userType:'star',content:'https://cdn.example/photo.svg',createdAt:1791534600000},{messageId:'video',type:'video',userType:'star',content:'https://cdn.example/video.mp4',thumbnail:'https://cdn.example/photo.svg',createdAt:1791534599000},{messageId:'audio',type:'sound',userType:'star',content:'https://cdn.example/audio.wav',createdAt:1791534598000}];
        state.chatMessages=state.messages;buildMediaSequences();state.filter='media';render();
      });
      assert.equal(await page.locator('.card-download').count(),3);
      for(const link of await page.locator('.card-download').all()) {
        assert.equal(await link.evaluate(el=>{const s=getComputedStyle(el);return s.alignItems==='center'&&s.justifyContent==='center';}),true,'media download remains centered');
      }
      await shot('media');
      await page.evaluate(()=>{state.filter='live';state.live.centerMode='live';state.live.discoveryLoaded=true;renderLiveView();});
      await shot('live');
      await page.evaluate(()=>{
        state.filter='live';state.live.centerMode='replay';state.live.channelsLoaded=true;state.live.channels=[{id:'a',channelName:'Test'}];
        const p={id:'r1',type:'live_record',title:'Replay',displayStartAt:1791534600000,_channelId:'a',_channelName:'Test'};
        state.live.replayPosts=[p];Object.assign(replayPagingFor('a'),{loaded:true,isLast:true});renderLiveView();
      });
      await centered('.replay-play');await shot('replay');
      assert.equal(await page.locator('.replay-play').evaluate(e=>e.getBoundingClientRect().width),40);
      await page.evaluate(()=>{state.live.centerMode='channel';channelVideoState.channelId='a';channelVideoState.pages.set('a',{loaded:true,isLast:true,posts:[{id:'v1',type:'video',title:'Channel',_channelId:'a'}]});renderLiveView();});
      await centered('.channel-video-play');await shot('channel');
      assert.deepEqual(errors,[]);
      console.log(`${width}: play, close, search, calendar and scroll icons centered; clear/close actions PASS`);
      await context.close();
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
