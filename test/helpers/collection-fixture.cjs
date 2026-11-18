'use strict';
async function seedCollection(p,mode,n=2,selected='all'){
 await p.evaluate(({mode,n,selected})=>{
  clearDownloadSelection();state.filter='live';state.live.centerMode=mode;state.live.replaySelected=null;channelVideoState.selected=null;channelVideoState.mediaType='all';
  state.live.channels=[{id:'a',channelName:'fromis_9'},{id:'b',channelName:'OH MY GIRL'}].slice(0,n);state.live.channelsLoaded=true;state.live.replayFilter=selected;
  const posts=(kind,id,count)=>Array.from({length:count},(_,i)=>({id:kind+id+i,title:'합성 '+id+' '+i,type:kind==='r'?'live_record':'video',_channelId:id,_channelName:id==='a'?'fromis_9':'OH MY GIRL',thumbnail:{url:'https://fixture.test/photo.svg'},displayStartAt:1791534600000-i*60000}));
  state.live.replayPosts=[...posts('r','a',13),...posts('r','b',7)];state.live.replayPaging=new Map([['a',{loaded:true,isLast:true}],['b',{loaded:true,isLast:true}]]);
  channelVideoState.channelId=selected;channelVideoState.pages=new Map(['a','b'].map(id=>[id,{loaded:true,isLast:true,posts:posts('v',id,id==='a'?13:7)}]));
  renderLiveView();syncLoadingUI();scrollTo(0,0);
 },{mode,n,selected});
}
async function contentFilter(p,type){await p.locator('[data-channel-content-menu]').click();await p.locator(`[data-morph-value="${type}"]`).click();await p.waitForFunction(type=>channelVideoState.mediaType===type&&!channelVideoState.loading,type);}
async function stableGeometry(p){return p.evaluate(()=>({scroll:scrollY,boxes:['.viewer-header','#sortBtn','.media-card,.replay-card','.replay-filter-strip'].map(s=>document.querySelector(s)?Object.fromEntries(Object.entries(document.querySelector(s).getBoundingClientRect().toJSON()).map(([k,v])=>[k,Math.round(v*10)/10])):null)}));}
module.exports={seedCollection,contentFilter,stableGeometry};
