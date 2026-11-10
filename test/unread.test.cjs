'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

test('unread badges are scoped per account, deduplicate across push/REST and keep toggles independent',async()=>{
 const store=new Map(),listeners=new Map(),rest=new Map(),roomButtons=[];
 const rooms=[{hostChatRoomId:'room-a',host:{nick:'아티스트 A'}},{hostChatRoomId:'room-b',host:{nick:'아티스트 B'}}];
 let account='person-a',loggedIn=true,playCount=0,desktopCount=0;
 const glyph=()=>({hidden:true,textContent:'',className:'',setAttribute(){}});
 function button(){
  const elements=new Map();
  return {dataset:{},attrs:{},badge:null,classList:{toggle(){}},querySelector(sel){return elements.get(sel)||null;},append(el){this.badge=el;elements.set('.rail-unread',el);},setAttribute(k,v){this.attrs[k]=v;}};
 }
 for(let i=0;i<rooms.length;i++)roomButtons.push(button());
 const doc={
  hidden:false,createElement:glyph,
  querySelector(sel){if(sel==='#loginGate')return{classList:{contains:n=>n==='hidden'&&loggedIn}};if(sel==='#rooms')return{querySelectorAll:()=>roomButtons};return null;},
  addEventListener(){}
 };
 const sdk={
  initializeApp:()=>({}),initializeAuth:()=>({}),inMemoryPersistence:{},
  signInWithCustomToken:async()=>({}),initializeFirestore:()=>({}),
  collection:()=>({}),where:(key,op,v)=>({key,op,v}),
  query:(collection,host)=>({host:host.v}),onSnapshot:(q,opt,cb)=>{listeners.set(q.host,cb);return()=>listeners.delete(q.host);},
  terminate:async()=>{},deleteApp:async()=>{}
 };
 const jwt='x.'+Buffer.from(JSON.stringify({accessHostChatRoomIds:['room-a','room-b']})).toString('base64url')+'.x';
 const context={
  state:{rooms,room:null,filter:'image'},
  document:doc,
  currentAuth:()=>({token:'synthetic',uuid:'synthetic',accountKey:account}),
  currentAccountScope:()=>account,
  frommApiRequest:async()=>({data:{accessToken:jwt}}),
  frommApiJson:async(host)=>({rows:rest.get(host)||[]}),
  FROMM_COMPAT:{endpoints:{messages:host=>host}},
  extractMessages:reply=>reply.rows,
  isArtist:msg=>['star','bot'].includes(msg.userType),
  crypto:{randomUUID:()=>Math.random().toString()},
  Uint8Array,TextDecoder,Date,Promise,Set,Map,Math,JSON,Number,String,Array,Uint8Array,
  atob:s=>Buffer.from(s,'base64url').toString('binary'),
  localStorage:{getItem:key=>store.get(key)||null,setItem:(key,val)=>store.set(key,val)},
  Audio:class{pause(){}set currentTime(v){}play(){playCount++;return Promise.resolve();}},
  Notification:class{static permission='granted';constructor(){desktopCount++;}close(){}},
  window:{addEventListener(){},dispatchEvent(){},focus(){},FrommConversation:{loadFirebase:async()=>sdk}},
  Event:class{},setInterval:()=>0,
  setTimeout:()=>0,clearTimeout(){},clearInterval(){},
  console
 };
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../web-unread.js'),'utf8'),context,{filename:'web-unread.js'});
 const unread=context.window.FrommUnread;
 async function settle(){for(let i=0;i<24;i++)await Promise.resolve();}
 await settle();
 assert.equal(listeners.size,2,'each subscribed room has a live listener');
 const initial=Date.now()-15000;
 function snap(room,items){
  const cb=listeners.get(room);assert.ok(cb,'listener for '+room);
  cb({metadata:{fromCache:false},docChanges:()=>items.map(item=>({type:'added',doc:{id:item.messageId,data:()=>({...item,hostChatRoomId:room})}}))});
 }
 const msg=(id,at)=>({messageId:id,createdAt:at,userType:'star',type:'text',content:'test '+id});
 snap('room-a',[msg('old',initial)]);
 snap('room-b',[msg('old-b',initial)]);
 assert.equal(unread.getCount('room-a'),0);
 assert.equal(unread.getCount('room-b'),0);
 const time=Date.now()+5000;
 snap('room-b',[msg('new-b1',time)]);
 assert.equal(unread.getCount('room-b'),1);
 assert.equal(roomButtons[1].badge.textContent,'1');
 assert.equal(playCount,0,'sound defaults to off');
 unread.setPrefs({sound:true});
 assert.deepEqual(JSON.parse(store.get('fromm.viewer.alerts.v1:person-a')),{sound:true,desktop:false});
 snap('room-b',[msg('new-b2',time+100)]);
 assert.equal(unread.getCount('room-b'),2);
 assert.equal(playCount,1,'new event triggers a sound');
 assert.equal(desktopCount,0,'browser alerts remain off');
 context.state.room=rooms[1];context.state.filter='all';unread.markSeen('room-b');
 assert.equal(unread.getCount('room-b'),0,'entering a room clears its badge');
 context.state.room=null;context.state.filter='image';
 account='person-b';unread.sync();await settle();
 assert.equal(unread.getCount('room-b'),0,'unread state never crosses account scopes');
 assert.equal(unread.prefs.sound,false,'settings do not leak between accounts');
 assert.equal(JSON.parse(store.get('fromm.viewer.alerts.v1:person-a')).sound,true);
 assert.equal(roomButtons[1].badge.hidden,true);
});
