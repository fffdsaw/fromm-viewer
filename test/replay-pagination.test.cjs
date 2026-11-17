'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const fn=name=>html.match(new RegExp('^(?:async )?function '+name+'\\([^]*?^}', 'm'))[0];
const post=(id,type='live_record')=>({id,num:1000-Number(id.slice(1)),displayStartAt:1791534600000-Number(id.slice(1))*1000,type,isVisible:true});
function fixture(){
 const requests=[],state={live:{replayPaging:new Map(),replayPosts:[]}};let valid=true;
 const context=vm.createContext({state,Map,Set,Date,FROMM_CHANNEL_API_BASE:'https://channel-api.fixture.test',sleep:async()=>{},replayListCurrent:()=>()=>valid,
  replayListRequest:(_path,options)=>new Promise(resolve=>requests.push({options,resolve}))});
 for(const name of ['replayPagingFor','replayCursorKey','fetchReplayPage','prefetchReplayPage'])vm.runInContext(fn(name),context);
 const channel={id:'synthetic-channel',channelName:'합성 채널'},paging=context.replayPagingFor(channel.id);
 Object.assign(paging,{loaded:true,lastPost:post('r0'),cursorKeys:new Set([context.replayCursorKey(post('r0'))])});
 return{context,state,requests,channel,paging,invalidate:()=>{valid=false;}};
}
test('a background page that wins a foreground race is not consumed twice',async()=>{
 const h=fixture(),foreground=h.context.fetchReplayPage(h.channel,{loadMore:true}),background=h.context.prefetchReplayPage(h.channel);
 assert.equal(h.requests.length,2);
 h.requests[1].resolve({data:{posts:[post('r1')],isLast:false}});await background;
 h.requests[0].resolve({data:{posts:[post('r1')],isLast:false}});await foreground;
 const next=h.context.fetchReplayPage(h.channel,{loadMore:true}),settled=next.catch(error=>error);
 await new Promise(setImmediate);
 assert.equal(h.requests.length,3,'stale prefetch must request the next raw cursor instead of replaying its old response');
 assert.equal(h.requests[2].options.query.postId,'r1');
 h.requests[2].resolve({data:{posts:[post('r2')],isLast:true}});await settled;
 assert.deepEqual(Array.from(h.state.live.replayPosts,p=>p.id),['r1','r2']);assert.equal(h.paging.isLast,true);
});
test('prefetched mixed pages keep the raw cursor and real repeated pages still fail',async()=>{
 const h=fixture();h.paging.prefetched={cursorKey:h.context.replayCursorKey(h.paging.lastPost),data:{posts:[post('r1','image')],isLast:false},raw:[post('r1','image')]};
 await h.context.fetchReplayPage(h.channel,{loadMore:true});assert.equal(h.requests.length,0);assert.equal(h.paging.lastPost.id,'r1');assert.equal(h.state.live.replayPosts.length,0);assert.equal(h.paging.isLast,false);
 const next=h.context.fetchReplayPage(h.channel,{loadMore:true});h.requests[0].resolve({data:{posts:[post('r1','image')],isLast:false}});
 await assert.rejects(next,/커서/);assert.equal(h.paging.lastPost.id,'r1');assert.equal(h.paging.isLast,false);
});
test('a late background page after a changed list owner cannot populate the queue',async()=>{
 const h=fixture(),work=h.context.prefetchReplayPage(h.channel);h.invalidate();h.requests[0].resolve({data:{posts:[post('r1')],isLast:false}});await work;
 assert.equal(h.paging.prefetched,null);assert.equal(h.paging.lastPost.id,'r0');assert.equal(h.state.live.replayPosts.length,0);
});
