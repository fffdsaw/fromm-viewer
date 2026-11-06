const {chromium}=require('playwright'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),{serve,open,seed}=require('./helpers/phase3-fixture.cjs');
const ref=process.env.RAIL_COMPARE_REF||'da837e217866d9a51c064a621f18e3f33a3267da';
const baseline=fs.mkdtempSync(path.join(os.tmpdir(),'fromm-rail-before-'));
cp.execFileSync('tar',['-xf','-','-C',baseline],{input:cp.execFileSync('git',['archive',ref,'index.html','glowme.css','web-*.js','sw.js','manifest.webmanifest','mobile-sync-test.js','assets/glowme','vendor/meapri'],{cwd:root,maxBuffer:32*1024*1024})});
(async()=>{const browser=await chromium.launch(),before=await serve(baseline),after=await serve(root),rows=[];try{
 for(let run=0;run<3;run++)for(const [label,server] of [['before',before],['after',after]]){
  const {page,context}=await open(browser,server.url,{login:true});
  const startup=await page.evaluate(()=>{const r=performance.getEntriesByType('resource').filter(e=>e.name.includes('/vendor/meapri/'));return{requests:r.length,bytes:r.reduce((n,e)=>n+e.encodedBodySize,0)}});
  await seed(page);await page.mouse.move(700,200);
  const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));const m0=await metrics();
  await page.evaluate(()=>{window.railTrace={frames:[],first:null};const rail=document.querySelector('#sidebar');rail.addEventListener('pointerenter',e=>requestAnimationFrame(()=>requestAnimationFrame(()=>{railTrace.first=performance.now()-e.timeStamp})),{once:true});railTrace.done=new Promise(resolve=>{let last=performance.now(),n=0;const frame=t=>{railTrace.frames.push(t-last);last=t;if(++n<36)requestAnimationFrame(frame);else resolve();};requestAnimationFrame(frame);});});
  await page.mouse.move(35,35);await page.evaluate(()=>railTrace.done);const m1=await metrics();
  const trace=await page.evaluate(()=>({firstVisualMs:railTrace.first,frames:railTrace.frames.slice(1),open:document.querySelector('#sidebarToggleBtn').getAttribute('aria-expanded')==='true',optics:FrommGlass.count}));trace.frames.sort((a,b)=>a-b);
  rows.push({label,run,...startup,firstVisualMs:trace.firstVisualMs,frameP95:trace.frames[Math.ceil(trace.frames.length*.95)-1],frameMax:Math.max(...trace.frames),jsTaskMs:(m1.TaskDuration-m0.TaskDuration)*1000,open:trace.open,optics:trace.optics});await context.close();
 }
 const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];const summary={};for(const label of ['before','after']){const subset=rows.filter(r=>r.label===label);summary[label]=Object.fromEntries(['requests','bytes','firstVisualMs','frameP95','frameMax','jsTaskMs'].map(k=>[k,Math.round(median(subset.map(r=>r[k]))*100)/100]));}
 const result={method:'Linux headless Chromium; 3 cold contexts per version, alternating order; first hover after same synthetic seed; 36 frames; JS TaskDuration is not CPU/GPU utilization',baseline:ref,rows,summary};fs.writeFileSync(process.env.RAIL_RESULTS_PATH||path.join(os.tmpdir(),'fromm-rail-performance.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(summary));
}finally{await browser.close();await before.close();await after.close();fs.rmSync(baseline,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
