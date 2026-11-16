'use strict';
// Approved common compact video/audio controls and the reported ninth avatar.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {serve,open}=require('./helpers/phase3-fixture.cjs');
const out=process.env.UIUX_RESULTS_DIR;
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'fromm-small-media-')),movie=path.join(temp,'small.mp4');
function wav(){const data=8000*2*18,b=Buffer.alloc(44+data);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(data,40);return b;}
async function routes(p){
 const bytes=(route,body,type)=>{const range=/bytes=(\d+)-(\d*)/.exec(route.request().headers().range||''),start=range?Number(range[1]):0,end=range&&range[2]?Math.min(body.length-1,Number(range[2])):body.length-1;return route.fulfill({status:range?206:200,contentType:type,headers:{'accept-ranges':'bytes',...(range?{'content-range':`bytes ${start}-${end}/${body.length}`}:{})},body:body.subarray(start,end+1)});};
 const audio=wav(),video=fs.readFileSync(movie);await p.route('**/small.mp4',route=>bytes(route,video,'video/mp4'));await p.route('**/small.wav',route=>bytes(route,audio,'audio/wav'));
}
const trackColors={glow:[22,123,101],aqua:[8,119,125],sky:[34,107,158],lavender:[117,81,152],neutral:[70,107,112],classic:[255,91,115]};
async function paintedThemeFill(p,input){
 if(out)fs.mkdirSync(out,{recursive:true});const png=(await input.screenshot(out?{path:path.join(out,'small-player-track.png')}:{})).toString('base64');
 const expected=trackColors[await p.evaluate(()=>FrommThemes.value)];
 return p.evaluate(async ({png,expected})=>{const image=new Image();image.src='data:image/png;base64,'+png;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d');context.drawImage(image,0,0);const data=context.getImageData(0,0,canvas.width,canvas.height).data;let count=0;for(let i=0;i<data.length;i+=4)if(Math.abs(data[i]-expected[0])<12&&Math.abs(data[i+1]-expected[1])<12&&Math.abs(data[i+2]-expected[2])<12)count++;return count>8;},{png,expected});
}

async function rowGeometry(root){
 const look=await root.locator('.small-player-button').evaluateAll(es=>es.map(el=>{const s=getComputedStyle(el);return{background:s.backgroundImage,color:s.backgroundColor,border:s.borderWidth,shadow:s.boxShadow,faces:el.querySelectorAll('.control-glass-surface').length};}));
 assert.ok(look.every(s=>s.background==='none'&&s.color==='rgba(0, 0, 0, 0)'&&s.border==='0px'&&s.shadow==='none'&&s.faces===0),'icon-only buttons retain no circle or engine '+JSON.stringify(look));
 const g=await root.evaluate(el=>{const rect=selector=>el.querySelector(selector).getBoundingClientRect().toJSON();return{play:rect('[data-small="play"]'),seek:rect('.small-player-seek'),sound:rect('[data-small="sound"]'),time:rect('output'),width:el.clientWidth,scroll:el.scrollWidth};});
 assert.ok(g.play.right<g.seek.left&&g.seek.right<g.sound.left,'play → seek → volume');
 assert.ok(Math.abs(g.play.y+g.play.height/2-g.sound.y-g.sound.height/2)<1,'play and volume share one baseline');
 assert.ok(Math.abs(g.play.y+g.play.height/2-g.seek.y-g.seek.height/2)<1,'seek shares the controls baseline');
 assert.ok(g.time.bottom<g.seek.top+g.seek.height/2-4,'time stays clear above the painted seek track');
 assert.ok(g.seek.width>=g.width*.35&&g.scroll<=g.width+1,'usable seek target without overflow');
}
async function volumeUI(p,root,media,{touch=false}={}){
 const button=root.locator('[data-small="sound"]'),popup=root.locator('.small-player-volume-popup'),slider=root.locator('.small-player-level');
 await p.mouse.move(1,1);
 if(touch)await button.tap();else await button.hover();
 await popup.waitFor({state:'visible'});
 assert.equal(await popup.innerText(),'','no percentage text');
 const style=await popup.evaluate(el=>{const css=getComputedStyle(el),slider=el.querySelector('input'),button=el.parentElement.querySelector('button');return{border:css.borderWidth,background:css.backgroundColor,shadow:css.boxShadow,direction:getComputedStyle(slider).writingMode,top:el.getBoundingClientRect().bottom,buttonTop:button.getBoundingClientRect().top};});
 assert.deepEqual([style.border,style.background,style.shadow],['0px','rgba(0, 0, 0, 0)','none']);assert.equal(style.direction,'vertical-lr');assert.ok(style.top<=style.buttonTop+1,'volume rises above the speaker');
 const hit=await slider.boundingBox(),position={x:hit.width/2,y:hit.height*.75};if(touch)await slider.tap({position});else await slider.click({position});assert.ok((await media.evaluate(el=>el.volume))>.1&&(await media.evaluate(el=>el.volume))<.4,'the exposed vertical track accepts pointer/touch input');
 await slider.fill('0.4');assert.ok(Math.abs(await media.evaluate(el=>el.volume)-.4)<.01);assert.equal(await slider.evaluate(el=>el.style.getPropertyValue('--small-player-progress')),'40%');
 assert.ok(await paintedThemeFill(p,slider),'actual volume track paints its theme-colored filled segment');
 await slider.press('Escape');assert.equal(await button.getAttribute('aria-expanded'),'false');
 await button.press('m');assert.equal(await media.evaluate(el=>el.muted),true);await button.press('m');assert.equal(await media.evaluate(el=>el.muted),false);
}
(async()=>{
 execFileSync(process.env.FFMPEG_PATH||'ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=320x180:rate=10','-t','18','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',movie]);
 const s=await serve(),b=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 try{
  for(const [width,height,count] of [[1920,1080,9],[1536,838,9],[1440,900,9],[1280,720,12],[900,560,30],[390,844,9],[320,600,9]]){
   const {page:p,context,errors}=await open(b,s.url,{width,height});await routes(p);
   await p.evaluate(count=>{state.rooms=state.rooms.slice(0,count);document.querySelectorAll('#rooms .room').forEach((row,i)=>{if(i>=count)row.remove()});},count);
   for(const expanded of [false,true]){
    await p.evaluate(value=>{FrommGlowME.setRailOpen(value);document.querySelector('#rooms').scrollTop=0;},expanded);await p.waitForTimeout(260);
    const geometry=await p.evaluate(()=>{const rooms=document.querySelector('#rooms'),area=rooms.getBoundingClientRect(),rows=[...rooms.children].map(el=>{const avatar=el.querySelector('.rail-avatar').getBoundingClientRect(),row=el.getBoundingClientRect();return{top:row.top,bottom:row.bottom,avatarTop:avatar.top,avatarBottom:avatar.bottom,size:avatar.width};}),visible=rows.filter(r=>r.bottom>area.top&&r.top<area.bottom);return{area:area.toJSON(),rows,visible,scroll:rooms.scrollHeight-rooms.clientHeight};});
    assert.ok(geometry.visible.length>0);
    assert.ok(geometry.visible.every(r=>r.avatarTop>=geometry.area.top&&r.avatarBottom<=geometry.area.bottom),'initial visible avatars are complete '+JSON.stringify({width,height,count,expanded,...geometry}));
    assert.ok(geometry.rows.every(r=>r.size===32),'existing avatar dimensions retained');
    if(count===9&&width>=1440){assert.equal(geometry.scroll,0,'all nine profiles fit at the reported desktop size');assert.equal(geometry.visible.length,9);const parent=await p.locator('.rail-artists').boundingBox();assert.ok(parent.y+parent.height-geometry.rows.at(-1).avatarBottom<=18,'profiles fill the artist area down to its breathing rim');}
    await p.locator('#rooms').evaluate(el=>el.scrollTop=el.scrollHeight);await p.waitForTimeout(80);
    const last=await p.locator('#rooms .rail-avatar').last().boundingBox(),area=await p.locator('#rooms').boundingBox();assert.ok(last.y>=area.y&&last.y+last.height<=area.y+area.height,'final avatar is fully reachable');
   }
   await p.evaluate(()=>{FrommGlowME.setRailOpen(false);state.messages=[{messageId:'small-video',type:'video',userType:'star',content:'https://fixture.test/small.mp4',createdAt:1791534600001},{messageId:'small-audio',type:'sound',userType:'star',content:'https://fixture.test/small.wav',createdAt:1791534600000}];state.chatMessages=state.messages;setFilter('media');FrommViewState.cancel();scrollTo(0,0);});
   for(const [id,type] of [['small-video','video'],['small-audio','audio']]){
    const card=p.locator(`[data-message-id="${id}"]`),media=card.locator(type);await card.scrollIntoViewIfNeeded();
    const root=card.locator('.small-player');await root.waitFor();await rowGeometry(root);
    assert.equal(await root.locator('[data-compact="full"]').count(),0,'approved layout omits a fullscreen icon');
    if(type==='audio')assert.equal(await card.locator('.audio-icon').isVisible(),true,'headphone cover remains');
    await root.locator('[data-small="play"]').click();await p.waitForFunction(id=>{const el=document.querySelector(`[data-message-id="${id}"] video,[data-message-id="${id}"] audio`);return !el.paused&&el.currentTime>0;},id);
    await root.locator('[data-small="play"]').click();assert.equal(await media.evaluate(el=>el.paused),true);
    await root.locator('.small-player-seek').fill('6');await p.waitForTimeout(80);assert.ok(Math.abs(await media.evaluate(el=>el.currentTime)-6)<.3,'seek changes decoded media position '+JSON.stringify({id,type,position:await media.evaluate(el=>({t:el.currentTime,ready:el.readyState,source:!!el.getAttribute('src'),paused:el.paused,duration:el.duration,seekable:[...Array(el.seekable.length)].map((_,i)=>[el.seekable.start(i),el.seekable.end(i)])})),range:await root.locator('.small-player-seek').inputValue()}));
    assert.ok(parseFloat(await root.locator('.small-player-seek').evaluate(el=>el.style.getPropertyValue('--small-player-progress')))>30,'seek updates its filled portion');assert.ok(await paintedThemeFill(p,root.locator('.small-player-seek')),'actual seek track paints theme-colored pixels '+id);
    if(type==='audio'&&(width===1440||width===390)){for(const theme of ['glow','aqua','sky','lavender','neutral','classic']){await p.evaluate(theme=>FrommThemes.set(theme),theme);assert.ok((await root.locator('.small-player-button,output').evaluateAll(es=>es.map(el=>getComputedStyle(el).color))).every(color=>color==='rgb(255, 255, 255)'),theme+' keeps gallery glyphs/time white against the dark cover');assert.ok(await paintedThemeFill(p,root.locator('.small-player-seek')),theme+' keeps the gallery seek fill visible');await volumeUI(p,root,media,{touch:width<700});}await p.evaluate(()=>FrommThemes.set('glow'));}
    await volumeUI(p,root,media,{touch:width<700});
    // Finish real decoded video/audio. Both reset to zero and stay paused;
    // the metadata and volume survive, so replay remains immediately usable.
    const keptVolume=await media.evaluate(el=>el.volume);
    await media.evaluate(el=>{el.addEventListener('ended',()=>el.dataset.finished='true',{once:true});el.currentTime=el.duration-.15;el.playbackRate=8;});
    await root.locator('[data-small="play"]').click();
    await p.waitForFunction(id=>{const el=document.querySelector(`[data-message-id="${id}"] video,[data-message-id="${id}"] audio`);return el.dataset.finished==='true'&&el.paused&&el.currentTime===0;},id);
    assert.equal(await root.locator('.small-player-seek').inputValue(),'0');
    assert.equal(parseFloat(await root.locator('.small-player-seek').evaluate(el=>el.style.getPropertyValue('--small-player-progress'))),0);
    await p.waitForTimeout(150);assert.equal(await media.evaluate(el=>el.paused&&el.currentTime===0),true,'completion does not repeat');
    assert.equal(await media.evaluate(el=>el.volume),keptVolume);
   }
   await p.evaluate(()=>{state.filter='all';render();FrommViewState.cancel();scrollTo(0,0);});
   const voice=p.locator('.chat-sound-bubble .chat-audio-player');await voice.scrollIntoViewIfNeeded();
   assert.equal(await voice.locator('.chat-audio-waveform i').count(),21,'conversation keeps its original decorative waveform');
   assert.equal(await voice.locator('.small-player-row').count(),0,'gallery compact row does not replace the conversation player');
   const vg=await voice.evaluate(el=>{const r=selector=>el.querySelector(selector).getBoundingClientRect().toJSON();return{time:r('output'),seek:r('.chat-audio-seek'),download:r('.chat-sound-download'),level:r('.chat-audio-level'),width:el.clientWidth,scroll:el.scrollWidth};});
   assert.ok(vg.seek.top>=vg.time.bottom&&vg.download.left>=vg.seek.right-1,'conversation seek and download share the lower row');
   assert.ok(vg.level.width>vg.level.height&&vg.scroll<=vg.width+1,'original horizontal volume fits the conversation card');
   await voice.locator('.chat-audio-level').fill('0.4');assert.ok(Math.abs(await voice.locator('..').locator('audio').evaluate(el=>el.volume)-.4)<.01);
   if(width===1440||width===390){for(const theme of ['glow','aqua','sky','lavender','neutral','classic']){await p.evaluate(theme=>FrommThemes.set(theme),theme);const colors=await voice.evaluate(el=>({time:getComputedStyle(el.querySelector('output')).color,fill:getComputedStyle(el.querySelector('.chat-audio-seek')).backgroundImage,background:getComputedStyle(el.closest('.bubble')).backgroundColor}));assert.ok(colors.fill.includes('linear-gradient'),theme+' retains the conversation seek track');assert.notEqual(colors.time,colors.background,theme+' keeps conversation time visible');}await p.evaluate(()=>FrommThemes.set('glow'));}
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
   if(out){fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,'unified-small-'+width+'.png')});}
   await context.close();console.log(`${width}x${height}: ${count} profiles/complete rows, gallery video/audio layout and restored conversation waveform, real play/seek/volume/mute and popup PASS`);
  }
 }finally{await b.close();await s.close();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1});
