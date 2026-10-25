'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
function source(name){
 const short=html.match(new RegExp('^function '+name+'\\([^\\n]*\\}\\r?$','m'));
 const full=html.match(new RegExp('^(?:async )?function '+name+'\\([^]*?^}','m'));
 assert.ok(short||full,name);return (short||full)[0];
}
function setup(){
 const c=vm.createContext({Date,Map,Number,String,Array,Set,JSON,AbortController,setTimeout,clearTimeout,
  auth:{token:'test-token',uuid:'device-not-user',accountKey:'account-a'},
  state:{chatMessages:[],onlyMyReplies:false,filter:'all',chatQuery:''},
  chatMatchCache:null,replyIdentity:{context:null,id:'',status:'idle',owner:null,promise:null},
  currentAuth(){return c.auth;},document:{querySelectorAll:()=>[]},
  syncMyReplyTools(){},renderDateCalendar(){},render(){},syncVisibleReplyLabels(){},
  specialTextState:()=>null,normType:v=>String(v||'text'),
  compareMessages:(a,b)=>new Date(a.createdAt)-new Date(b.createdAt),
  voteSearchText:()=>''
 });
 for(const n of ['replyUserId','replyAuthContext','replyAuthCurrent','currentReplyUserId','isArtist','looksLikeIdOnly','normalizeQuotedValue','getQuotedMessage','isReplyToMe','chatMessageMatches','messageStableKey','chatContextEnabled','chatMessageVisible','chatMatches','filteredMessages','localDateKeyFromISO','chatDateSet','calendarActivityInfo','firstMessageOnDate','resetReplyIdentity','ensureReplyIdentity']) vm.runInContext(source(n),c);
 c.replyIdentity.context=c.replyAuthContext();c.replyIdentity.status='ready';c.replyIdentity.id='fan-a';return c;
}
const reply=(id,userId,patch={})=>({messageId:id,userType:'star',type:'text',content:'답장 본문',createdAt:'2026-10-25T05:00:00Z',mentionedMessage:{messageId:'original',userId,content:'인용 원문'},...patch});
test('personal replies require the authenticated profile ID and an artist sender',()=>{
 const c=setup();assert.equal(c.isReplyToMe(reply('mine','fan-a')),true);
 for(const value of ['fan-b','device-not-user','account-a','',null,undefined]) assert.equal(c.isReplyToMe(reply('other',value)),false);
 assert.equal(c.isReplyToMe(reply('self','fan-a',{userType:'fan'})),false);
 c.auth={...c.auth,token:'different-token'};assert.equal(c.isReplyToMe(reply('stale','fan-a')),false);
});
test('quote identity survives nested/string payloads; display aliases match only the exact original ID',()=>{
 const c=setup();
 assert.equal(c.normalizeQuotedValue(JSON.stringify({message:{messageId:'o',userId:'fan-a',content:'hello'}})).userId,'fan-a');
 const m=reply('mine','fan-a',{embeddedMentionedMessage:{messageId:'original',content:'display quote'}});
 assert.equal(c.getQuotedMessage(m).content,'display quote');assert.equal(c.isReplyToMe(m),true);
 m.embeddedMentionedMessage.messageId='different';assert.equal(c.isReplyToMe(m),false);
 assert.equal(c.isReplyToMe(reply('text','fan-a',{mentionedMessage:'인용 원문'})),false);
});
test('IDs retain exact values; unsafe numeric IDs and missing IDs never identify the current fan',()=>{
 const c=setup();assert.equal(c.replyUserId('9007199254740993'),'9007199254740993');
 assert.equal(c.replyUserId(0),'0');assert.equal(c.replyUserId(Number.MAX_SAFE_INTEGER+1),'');
 for(const v of [null,undefined,{},false,'   ']) assert.equal(c.replyUserId(v),'');
 c.replyIdentity.id='0';assert.equal(c.isReplyToMe(reply('zero',0)),true);
});
test('filter and text search share the personal reply predicate without indexing user identifiers',()=>{
 const c=setup();c.state.chatMessages=[reply('other','fan-b'),reply('mine','fan-a'),reply('plain','fan-a',{mentionedMessage:null})];
 c.state.onlyMyReplies=true;assert.deepEqual(Array.from(c.filteredMessages(),m=>m.messageId),['mine']);
 c.state.chatQuery='인용 원문';assert.equal(c.filteredMessages().length,1);
 c.state.chatQuery='fan-a';assert.equal(c.filteredMessages().length,0);
 c.state.chatQuery='';c.state.onlyMyReplies=false;assert.equal(c.filteredMessages().length,3);
});
test('calendar keeps general conversation dates and has no personal reply markers',()=>{
 const c=setup();c.state.chatMessages=[reply('mine','fan-a'),reply('other','fan-b',{createdAt:'2026-10-24T05:00:00Z'}),reply('original','fan-a',{userType:'fan',createdAt:'2026-09-01T05:00:00Z'})];
 c.state.chatQuery='no match';const a=c.calendarActivityInfo();
 assert.equal(a.dates.size,3);assert.equal(a.replyDates,undefined);assert.equal(a.replyMonths,undefined);assert.equal(a.replyYears,undefined);
 c.replyIdentity.id='';assert.equal(c.calendarActivityInfo().dates.size,3);c.replyIdentity.id='fan-a';
 c.state.onlyMyReplies=true;assert.equal(c.firstMessageOnDate('2026-10-24'),null);assert.equal(c.firstMessageOnDate('2026-10-25').messageId,'mine');
});
test('profile lookup coalesces GETs, does not infer UUID on failure, and retries explicitly',async()=>{
 const c=setup();c.resetReplyIdentity();let count=0,fail=true;
 c.frommApiRequest=async(path,options)=>{count++;assert.equal(path,'/v2/user/fan/profile');assert.equal(options.method,'GET');if(fail) throw Error('network');return {data:{profile:{id:'fan-a'}}};};
 assert.deepEqual(await Promise.all([c.ensureReplyIdentity(),c.ensureReplyIdentity()]),[false,false]);assert.equal(count,1);assert.equal(c.currentReplyUserId(),'');
 assert.equal(await c.ensureReplyIdentity(),false);assert.equal(count,1);
 fail=false;assert.equal(await c.ensureReplyIdentity({retry:true}),true);assert.equal(count,2);assert.equal(c.currentReplyUserId(),'fan-a');
 assert.equal(await c.ensureReplyIdentity(),true);assert.equal(count,2);
});
test('logout/account change discards a late profile response and clears personal filters',async()=>{
 const c=setup();c.resetReplyIdentity();let resolve;
 c.frommApiRequest=()=>new Promise(r=>{resolve=r;});
 const pending=c.ensureReplyIdentity();const signal=c.replyIdentity.owner.signal;c.state.onlyMyReplies=true;
 c.auth={token:'token-b',uuid:'device-b',accountKey:'b'};c.resetReplyIdentity();resolve({data:{profile:{id:'fan-a'}}});
 assert.equal(await pending,false);assert.equal(signal.aborted,true);assert.equal(c.currentReplyUserId(),'');assert.equal(c.state.onlyMyReplies,false);
});

test('conversation context keeps surrounding messages while match navigation intersects own replies and text',()=>{
 const c=setup();c.state.chatMessages=[reply('other','fan-b'),reply('mine','fan-a'),reply('normal','fan-a',{mentionedMessage:null})];
 c.state.onlyMyReplies=true;c.state.chatContext=true;
 assert.equal(c.filteredMessages().length,3);assert.deepEqual(Array.from(c.chatMatches(),m=>m.messageId),['mine']);
 c.state.chatQuery='인용 원문';assert.equal(c.filteredMessages().length,3);assert.equal(c.chatMatches().length,1);
 c.state.chatQuery='no match';assert.equal(c.chatMatches().length,0);assert.equal(c.filteredMessages().length,3);
 c.state.chatContext=false;assert.equal(c.filteredMessages().length,0);
});
test('match cache updates after query, identity, or source changes and is reused for repeated arrows',()=>{
 const c=setup();c.state.onlyMyReplies=true;c.state.chatMessages=[reply('a','fan-a'),reply('b','fan-b')];
 const first=c.chatMatches();assert.equal(c.chatMatches(),first);
 c.replyIdentity.id='fan-b';assert.deepEqual(Array.from(c.chatMatches(),m=>m.messageId),['b']);
 c.state.chatMessages.push(reply('b2','fan-b'));assert.equal(c.chatMatches().length,2);
 c.auth={...c.auth,token:'other'};assert.equal(c.chatMatches().length,0);
});
