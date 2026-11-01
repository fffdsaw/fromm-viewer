'use strict';
// Real Chromium screenshot comparison of the local experimental Fromm Viewer.
// This uses synthetic UI data only: no login, tokens, Fromm API, or private chats.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const out = path.resolve(root, 'docs/design-review/meapri-regular-levels');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon','.json':'application/json','.svg':'image/svg+xml'};
fs.mkdirSync(out, {recursive:true});
const server = http.createServer((req,res)=>{
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  const rel = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(root,rel);
  if (!file.startsWith(root+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()){
    res.writeHead(404);res.end('Not found');return;
  }
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
});
const view = { width:1440, height:900 };
const clip = {x:0,y:0,width:920,height:730};
async function capture(page,name){
  await page.screenshot({path:path.join(out,name+'.png'),animations:'disabled'});
  await page.screenshot({path:path.join(out,name+'-detail.png'),clip,animations:'disabled'});
}
async function optics(page){
  return page.evaluate(()=>{
    const info = selector=>{
      const el=document.querySelector(selector);
      const css=getComputedStyle(el),box=el.getBoundingClientRect();
      return { background:css.backgroundColor, backdrop:css.backdropFilter||css.webkitBackdropFilter||'none',
        width:Math.round(box.width),height:Math.round(box.height),engine:el.dataset.glowmeRegular||null };
    };
    return {topbar:info('.topbar'),sidebar:info('#sidebar'),
      on:document.querySelector('#glowme-regular-toggle')?.getAttribute('aria-pressed'),
      errors:document.querySelector('#glowme-regular-status')?.textContent||''};
  });
}
async function levelsComparison(browser,suffix){
  const names=['regular-off','regular-weak','regular-medium','regular-strong'];
  const titles=['OFF · 엔진 꺼짐','약하게 · 18%','중간 · 50%','강하게 · 90%'];
  const width=suffix ? clip.width : view.width;
  const height=suffix ? clip.height : view.height;
  const page=await browser.newPage({viewport:{width:1500,height:600},deviceScaleFactor:1});
  const images=names.map((name,i)=>fs.readFileSync(path.join(out,name+suffix+'.png')).toString('base64'));
  const scale=suffix?.80:.49;
  const renderedWidth=Math.round(width*scale),renderedHeight=Math.round(height*scale);
  const wrapperWidth=renderedWidth*2+46;
  await page.setViewportSize({width:wrapperWidth+24,height:renderedHeight*2+220});
  await page.setContent(`<!doctype html><html lang="ko"><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;padding:12px;background:#eef8f3;color:#265946;font:600 15px/1.4 system-ui}
  h1{margin:0 0 9px;font-size:22px}.grid{display:grid;grid-template-columns:repeat(2,${renderedWidth}px);gap:12px}
  .item{background:#dff3e7;border-radius:11px;padding:7px}
  .item strong{display:block;padding:3px 7px 8px}
  img{display:block;width:100%;height:${renderedHeight}px;object-fit:fill;border-radius:8px}
  p{color:#567b68;margin:9px 0;font-size:12px}
  </style><h1>Fromm Viewer · Meapri Regular 굴절 강도별 실제 Chrome 비교</h1>
  <div class="grid">${images.map((data,i)=>`<div class="item"><strong>${titles[i]}</strong><img src="data:image/png;base64,${data}" alt="${titles[i]}"></div>`).join('')}</div>
  <p>동일한 1440×900 Chrome 합성 데이터 · 실제 Meapri 엔진 · 색 보정 없음</p></html>`);
  await page.locator('img').first().evaluate(async img=>img.decode());
  for(const img of await page.locator('img').all())await img.evaluate(el=>el.decode());
  const name='comparison-levels'+suffix+'.png';
  await page.screenshot({path:path.join(out,name),fullPage:true,animations:'disabled'});
  await page.close();
  return name;
}
async function patternComparison(browser,suffix){
  const names=['pattern-weak','pattern-medium','pattern-strong'];
  const titles=['약하게 · 18%','중간 · 50%','강하게 · 90%'];
  const width=suffix ? clip.width : view.width;
  const height=suffix ? clip.height : view.height;
  const page=await browser.newPage({viewport:{width:1500,height:600},deviceScaleFactor:1});
  const images=names.map((name,i)=>fs.readFileSync(path.join(out,name+suffix+'.png')).toString('base64'));
  const scale=suffix?.66:.38;
  const renderedWidth=Math.round(width*scale),renderedHeight=Math.round(height*scale);
  const wrapperWidth=renderedWidth*3+55;
  await page.setViewportSize({width:wrapperWidth+24,height:renderedHeight+125});
  await page.setContent(`<!doctype html><html lang="ko"><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;padding:12px;background:#eef8f3;color:#265946;font:600 15px/1.4 system-ui}
  h1{margin:0 0 9px;font-size:22px}.grid{display:grid;grid-template-columns:repeat(3,${renderedWidth}px);gap:12px}
  .item{background:#dff3e7;border-radius:11px;padding:7px}
  .item strong{display:block;padding:3px 7px 8px}
  img{display:block;width:100%;height:${renderedHeight}px;object-fit:fill;border-radius:8px}
  p{color:#567b68;margin:9px 0;font-size:12px}
  </style><h1>Fromm Viewer · Meapri Regular 굴절 강도별 실제 Chrome 비교</h1>
  <div class="grid">${images.map((data,i)=>`<div class="item"><strong>${titles[i]}</strong><img src="data:image/png;base64,${data}" alt="${titles[i]}"></div>`).join('')}</div>
  <p>동일한 1440×900 Chrome 합성 데이터 · 실제 Meapri 엔진 · 색 보정 없음</p></html>`);
  await page.locator('img').first().evaluate(async img=>img.decode());
  for(const img of await page.locator('img').all())await img.evaluate(el=>el.decode());
  const name='comparison-pattern'+suffix+'.png';
  await page.screenshot({path:path.join(out,name),fullPage:true,animations:'disabled'});
  await page.close();
  return name;
}
async function comparison(browser,suffix){
  const left = fs.readFileSync(path.join(out,'regular-off'+suffix+'.png')).toString('base64');
  const right = fs.readFileSync(path.join(out,'regular-on'+suffix+'.png')).toString('base64');
  const w = suffix ? clip.width : view.width;
  const h = suffix ? clip.height : view.height;
  const scale = suffix ? .90 : .53;
  const paneWidth=Math.round(w*scale);
  const paneHeight=Math.round(h*scale);
  const width=paneWidth*2+44;
  const p=await browser.newPage({viewport:{width,height:paneHeight+136},deviceScaleFactor:1});
  await p.setContent(`<!doctype html><html lang="ko"><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;padding:16px;background:#eef8f3;color:#25523f;
      font:600 16px/1.45 system-ui,sans-serif}
    .labels{display:flex;gap:12px}.pane{width:${paneWidth}px}
    .label{font-size:16px;line-height:25px;margin-bottom:9px;padding:6px 10px;border-radius:8px;background:#e2f1e9}
    img{display:block;width:${paneWidth}px;height:${paneHeight}px;object-fit:fill;border:1px solid #adcdbd;border-radius:10px}
    h1{margin:0 0 9px;font-size:20px}p{margin:8px 0 0;color:#537363;font-size:12px}
  </style><h1>Fromm Viewer · Meapri Liquid Glass Regular — 동일 화면 전후 비교</h1>
  <div class="labels"><div class="pane"><div class="label">BEFORE · Regular OFF</div>
    <img src="data:image/png;base64,${left}" alt="Regular OFF"></div>
  <div class="pane"><div class="label">AFTER · Regular ON</div>
    <img src="data:image/png;base64,${right}" alt="Regular ON"></div></div>
  <p>Chrome 자동 브라우저 테스트 · 가상 계정/대화 표시 · 로그인 데이터 없음 · 같은 화면·크기</p></html>`);
  await p.locator('img').first().evaluate(img=>img.decode());
  await p.locator('img').last().evaluate(img=>img.decode());
  const file='comparison'+suffix+'.png';
  await p.screenshot({path:path.join(out,file),fullPage:true});
  const stats=await p.evaluate(async ()=>{
    const images=[...document.querySelectorAll('img')];
    const getPixels=image=>{
      const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
      return ctx.getImageData(0,0,canvas.width,canvas.height).data;
    };
    const a=getPixels(images[0]),b=getPixels(images[1]);
    let changed=0,sum=0;
    const n=a.length/4;
    for(let i=0;i<a.length;i+=4){
      const d=(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]))/3;
      sum+=d;if(d>=6)changed++;
    }
    return {pixelChangeFraction:Number((changed/n).toFixed(4)),meanRgbDelta:Number((sum/n).toFixed(3))};
  });
  await p.close();
  return {file,...stats};
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const origin='http://127.0.0.1:'+server.address().port;
    const page=await browser.newPage({viewport:view,deviceScaleFactor:1,reducedMotion:'reduce'});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    // Block all real external traffic. All fixture data remain in memory.
    await page.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
    await page.goto(origin+'/index.html?previewBridge=1',{waitUntil:'domcontentloaded',timeout:30000});
    try {
      await page.locator('#glowme-regular-toggle').waitFor({timeout:18000});
    } catch (error) {
      console.warn('Experiment boot delayed; retrying after reload',errors);
      await page.reload({waitUntil:'domcontentloaded',timeout:30000});
      await page.locator('#glowme-regular-toggle').waitFor({timeout:35000});
    }
    await page.evaluate(()=>{
      hideLoginGate();
      setActiveAuth('fixture-only','fixture-only','fixture-only');
      state.room={hostChatRoomId:'fixture-room',host:{nick:'샘플 아티스트'}};
      state.rooms=[state.room];state.filter='all';state.chatHistoryComplete=true;state.hasMoreMessages=false;
      state.messages=Array.from({length:32},(_,i)=>({messageId:'fixture-'+i,type:'text',userType:'star',
        content:['오늘도 즐거운 하루 보내세요 💚','음악과 무대를 함께 즐겨요','Glow ME 샘플 메시지'][i%3],
        createdAt:1793500000000+i*60000}));
      state.chatMessages=state.messages;
      const rooms=document.querySelector('#rooms');
      rooms.innerHTML=['아티스트 A','아티스트 B','아티스트 C','아티스트 D','아티스트 E','아티스트 F']
        .map((name,i)=>'<button type="button" class="room '+(i===0?'active':'')+'">'+name+'</button>').join('');
      document.querySelector('#artistTitle').textContent='샘플 아티스트';
      render();window.scrollTo(0,0);
      const sidebar=document.querySelector('#sidebar');
      sidebar.dispatchEvent(new PointerEvent('pointerenter',{pointerType:'mouse',bubbles:false}));
    });
    await page.mouse.move(1200,800);
    await page.evaluate(()=>document.querySelector('#sidebar').dispatchEvent(new PointerEvent('pointerenter',{pointerType:'mouse',bubbles:false})));
    await page.waitForTimeout(1300);
    const off=await optics(page);
    assert.equal(off.on,'false','Regular must be off by default');
    await capture(page,'regular-off');
    await page.locator('#glowme-regular-toggle').click();
    await page.waitForFunction(()=>document.querySelector('#glowme-regular-toggle')?.getAttribute('aria-pressed')==='true',null,{timeout:15000});
    // Wait for the asynchronous refraction maps to materialize.
    await page.waitForFunction(()=>{
      const filter=getComputedStyle(document.querySelector('.topbar')).backdropFilter;
      return filter && filter!=='none' && filter!=='';
    },null,{timeout:22000});
    await page.mouse.move(1200,800);
    await page.evaluate(()=>document.querySelector('#sidebar').dispatchEvent(new PointerEvent('pointerenter',{pointerType:'mouse',bubbles:false})));
    await page.waitForTimeout(1200);
    const on=await optics(page);
    assert.equal(on.on,'true');
    assert.equal(on.topbar.engine,'bar');
    assert.equal(on.sidebar.engine,'panel');
    // Do not mislabel a CSS-only fallback as a native refractive pass.
    const engineSvg=on.topbar.backdrop.includes('url(')||on.sidebar.backdrop.includes('url(');
    await capture(page,'regular-on');
    const capturedLevels = [];
    for (const [name,value] of [['weak',18],['medium',50],['strong',90]]) {
      await page.locator('#glowme-regular-range').evaluate((el,v)=>{
        el.value=String(v);
        el.dispatchEvent(new Event('input',{bubbles:true}));
      },value);
      await page.waitForFunction(v=>{
        const output=document.querySelector('#glowme-regular-value');
        return output?.textContent === String(v)+'%';
      },value,{timeout:5000});
      // update() will re-generate its map only if size/strength requires it.
      await page.waitForTimeout(1250);
      const current=await optics(page);
      assert.equal(current.on,'true');
      assert.equal(current.topbar.engine,'bar');
      assert.equal(current.sidebar.engine,'panel');
      capturedLevels.push({label:name,strength:value,computed:current});
      await capture(page,'regular-'+name);
    }
    // Optical diagnosis only: an explicit test pattern beneath the glass
    // makes refraction changes visible without changing the default UI.
    await page.locator('#glowme-regular-pattern').check();
    for (const [name,value] of [['weak',18],['medium',50],['strong',90]]) {
      await page.locator('#glowme-regular-range').evaluate((el,v)=>{
        el.value=String(v);
        el.dispatchEvent(new Event('input',{bubbles:true}));
      },value);
      await page.waitForTimeout(1100);
      await capture(page,'pattern-'+name);
    }
    await page.locator('#glowme-regular-pattern').uncheck();
    const full=await comparison(browser,'');
    const detail=await comparison(browser,'-detail');
    const levelsFull=await levelsComparison(browser,'');
    const levelsDetail=await levelsComparison(browser,'-detail');
    const patternDetail=await patternComparison(browser,'-detail');
    const result={method:'real Playwright Chromium, synthetic UI fixture, blocked external requests',
      timestamp:new Date().toISOString(),engineSvgFilterObserved:engineSvg,
      renderingMode:engineSvg?'SVG optical filter':'CSS frost fallback',
      viewport:view,off,on,full,detail,levelsFull,levelsDetail,patternDetail,capturedLevels,uncaughtPageErrors:errors};
    fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result,null,2));
  }finally{
    await browser.close();
    server.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
