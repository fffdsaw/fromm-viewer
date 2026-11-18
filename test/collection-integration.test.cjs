'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8').replace(/\r\n/g,'\n');
const fn=name=>html.match(new RegExp('^(?:async )?function '+name+'\\([^]*?^}','m'))[0];
test('all/video/photo views sort copies and never change canonical feed/cursor; photo selection keys match across scopes',()=>{
 const posts=[{id:'v',type:'video',displayStartAt:2,_channelId:'a'},{id:'p',type:'image',displayStartAt:3,_channelId:'a'},{id:'r',type:'live_record',displayStartAt:1}],page={posts,lastPost:posts[2]},state={};
 const c=vm.createContext({state,channelVideoState:{mediaType:'all'},channelVideoPage:()=>page});vm.runInContext(fn('collectionOrderedPosts')+fn('visibleChannelPosts')+fn('downloadSelectionKey'),c);
 assert.deepEqual(Array.from(c.visibleChannelPosts(),p=>p.id),['p','v']);state.collectionSort={channel:'asc'};assert.deepEqual(Array.from(c.visibleChannelPosts(),p=>p.id),['v','p']);
 c.channelVideoState.mediaType='image';assert.deepEqual(Array.from(c.visibleChannelPosts(),p=>p.id),['p']);c.channelVideoState.mediaType='video';assert.deepEqual(Array.from(c.visibleChannelPosts(),p=>p.id),['v']);assert.deepEqual(posts.map(p=>p.id),['v','p','r']);assert.equal(page.lastPost.id,'r');
 assert.equal(c.downloadSelectionKey('channel',posts[1]),c.downloadSelectionKey('channel-image',posts[1]));assert.notEqual(c.downloadSelectionKey('channel',posts[0]),c.downloadSelectionKey('channel-image',posts[0]));
});
for(const kind of ['channel','replay'])test(kind+' oldest-first loads remaining canonical pages before changing order; failures/cancel leave prior order',async()=>{
 let rendered=0,alerts=[],error=false,context='same',loads=0;const page={isLast:false,lastPost:{id:'raw0'}},state={filter:'live',live:{centerMode:kind,replayFilter:'a'}};const button={disabled:false,textContent:''};
 const c=vm.createContext({state,pcMediaPresentation:()=>false,setSortButtonLabel:direction=>{button.textContent=direction;},channelVideoState:{loading:false},Date,JSON,$:()=>button,sleep:async()=>{},channelVideoSession:()=>()=>true,downloadSelectionContext:()=>context,channelVideoPage:()=>page,replayHasMore:()=>!page.isLast,replayPagingFor:()=>page,videoListError:()=>error,safeErrorDetail:x=>x,window:{alert:x=>alerts.push(x)},renderLiveView:()=>rendered++});
 const load=async()=>{loads++;page.lastPost={id:'raw'+loads};page.isLast=loads===2;};c.loadChannelVideos=c.loadReplayCenter=load;vm.runInContext(fn('toggleCollectionSort'),c);await c.toggleCollectionSort();assert.equal(loads,2);assert.equal(state.collectionSort[kind],'asc');assert.equal(rendered,1);assert.equal(button.disabled,false);
 await c.toggleCollectionSort();assert.equal(state.collectionSort[kind],'desc');assert.equal(loads,2,'return to recent uses loaded canonical pages');
 page.isLast=false;error=true;await c.toggleCollectionSort();assert.equal(state.collectionSort[kind],'desc');assert.equal(alerts.length,1);assert.equal(button.disabled,false);
 error=false;c.loadChannelVideos=c.loadReplayCenter=async()=>{context='changed';state.filter='image';state.sortDirection='asc';};await c.toggleCollectionSort();assert.equal(state.collectionSort[kind],'desc');assert.equal(alerts.length,1);assert.equal(button.disabled,false);assert.equal(button.textContent,'asc','cancelled collection work cannot overwrite another tab’s sort label');
});
