/* Mobile-only Fromm private JSON collector. No uploads, auth export, or automatic polling.
 * Compatible with Work kit v1 schema; no raw IDs or media URLs in exported JSON.
 */
(() => {
'use strict';
const MEMBERS=[{id:'song_hayoung',name:'송하영'},{id:'park_jiwon',name:'박지원'},
{id:'lee_chaeyoung',name:'이채영'},{id:'lee_nagyung',name:'이나경'},
{id:'baek_jiheon',name:'백지헌'}];
const START='2000-01-01T00:00:00.000Z';
const USER_TYPES=['star','fan','user','viewer','system','admin','bot','artist'];
const MEDIA_TYPES=['text','image','video','sound','audio','emoticon','sticker'];
const str=v=>typeof v==='string'||typeof v==='number'?String(v):'';
const millis=v=>v==null||v===''?NaN:new Date(v).getTime();
const sourceType=m=>USER_TYPES.includes(str(m.userType).toLowerCase())?str(m.userType).toLowerCase():'unknown';
const contentType=m=>{const t=str(m.type).toLowerCase();return t==='audio'?'sound':MEDIA_TYPES.includes(t)?t:'unknown';};
function redact(value){
 let text=str(value),count=0;
 function replace(re,token){text=text.replace(re,()=>{count++;return token;});}
 replace(/\b(?:Bearer\s+)?eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gi,'[인증정보]');
 replace(/\b(?:access[_-]?token|refresh[_-]?token|authorization|password|device[_-]?id|uuid)\s*[:=]\s*[^\s,;]+/gi,'[인증정보]');
 replace(/https?:\/\/[^\s<>]+/gi,'[링크]');
 replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[이메일]');
 replace(/(?:\+82[ -]?(?:0)?1[016789]|01[016789])[ -]?\d{3,4}[ -]?\d{4}\b/g,'[전화번호]');
 return {text,count};
}
const stableKey=m=>str(m.messageId)?'id:'+str(m.messageId):JSON.stringify([m.createdAt,m.userType,m.type,m.content]);
function quotedId(m){
 const fields=['embeddedMentionedMessage','mentionedMessage','mentionDetailMessage','replyMessage','embeddedReplyMessage','quotedMessage','mentionDetail'];
 function find(v,depth=0){
  if(!v||typeof v!=='object'||depth>3)return '';
  for(const k of ['messageId','id','starChatId','chatMessageId'])if(str(v[k]))return str(v[k]);
  for(const k of ['message','mentionedMessage','embeddedMentionedMessage','data']){
   const val=find(v[k],depth+1);if(val)return val;
  }
  return '';
 }
 for(const k of fields){const id=find(m[k]);if(id)return id;}
 return '';
}
function failureCode(e){
 const code=Number(e?.status||e?.httpStatus||0);
 if(code===401||code===403)return 'authentication_or_permission';
 if(code===429)return 'rate_limited';
 if(code>=400&&code<=599)return 'http_'+code;
 return 'network_or_schema';
}
async function collect({request,extract,roomId,endAt,limit=500,
 wait=ms=>new Promise(r=>setTimeout(r,ms)),cancelled=()=>false,onProgress=()=>{},maxPages=20}){
 const rows=[],seen=new Map(),minimum=millis(START);
 let cursor=millis(endAt),pages=0,attempts=0,duplicates=0,idConflicts=0,noId=0,invalidDates=0,status='in_progress';
 if(!Number.isFinite(cursor))throw new Error('invalid_end');
 const snapshotEnd=new Date(cursor).toISOString();
 while(pages<maxPages){
  if(cancelled()){status='cancelled';break;}
  let batch;
  try{
   if(attempts)await wait(1000);
   if(cancelled()){status='cancelled';break;}
   attempts++;
   batch=extract(await request('/v2/chat/message/'+encodeURIComponent(roomId)+'/messages',
    {findStartAt:START,findEndAt:new Date(cursor).toISOString(),limit:String(limit)}));
   if(!Array.isArray(batch)||batch.length>limit||batch.some(m=>!m||typeof m!=='object')){
    status='schema_error';break;
   }
  }catch(e){
   if(cancelled()){status='cancelled';break;}
   if(limit>100&&[400,422].includes(Number(e?.status))){limit=100;continue;}
   status=failureCode(e);break;
  }
  pages++;
  if(!batch.length){status='api_range_exhausted';break;}
  let oldest=Infinity,newest=-Infinity,added=0;
  for(const m of batch){
   const t=millis(m.createdAt);
   if(!Number.isFinite(t)||t<minimum||t>cursor){invalidDates++;continue;}
   oldest=Math.min(oldest,t);newest=Math.max(newest,t);
   const key=stableKey(m),signature=JSON.stringify([m.createdAt,m.userType,m.type,m.content,quotedId(m)]);
   if(seen.has(key)){duplicates++;if(seen.get(key)!==signature)idConflicts++;continue;}
   if(!str(m.messageId))noId++;
   seen.set(key,signature);rows.push(m);added++;
  }
  onProgress({pages,count:rows.length});
  if(invalidDates||!Number.isFinite(oldest)){status='invalid_timestamp';break;}
  if(batch.length>=limit&&oldest===newest){status='timestamp_boundary_saturated';break;}
  if(oldest===cursor){
   if(batch.length>=limit){status='cursor_stalled';break;}
   cursor=oldest-1;
  }else{
   if(!added){status='cursor_stalled';break;}
   cursor=oldest;
  }
  if(cursor<minimum){status='api_range_exhausted';break;}
 }
 if(status==='in_progress')status='page_limit';
 rows.sort((a,b)=>millis(a.createdAt)-millis(b.createdAt)||stableKey(a).localeCompare(stableKey(b)));
 return {rows,status,snapshotEnd,pages,attempts,duplicates,idConflicts,noId,invalidDates,
  nextEndAt:new Date(cursor).toISOString(),pageLimit:limit};
}
function makeExport(result,member,ownTypes=[],confirmed=false){
 if(!MEMBERS.some(m=>m.id===member.id&&m.name===member.name))throw new Error('invalid_member');
 const allowedOwn=ownTypes.filter(t=>['fan','user','viewer'].includes(t)),verified=confirmed&&allowedOwn.length>0;
 const ids=new Map();
 result.rows.forEach((m,i)=>{if(str(m.messageId))ids.set(str(m.messageId),'m'+String(i+1).padStart(8,'0'));});
 let redactions=0;
 const messages=result.rows.map((m,i)=>{
  const type=contentType(m),source=sourceType(m),content=type==='text'?redact(m.content):{text:null,count:0};
  redactions+=content.count;const quote=quotedId(m);
  return {message_ref:'m'+String(i+1).padStart(8,'0'),created_at:new Date(millis(m.createdAt)).toISOString(),
   sender_role:source==='star'?'artist':verified&&allowedOwn.includes(source)?'user':'unknown',
   source_user_type:source,content_type:type,text:content.text,reply_to_ref:quote?ids.get(quote)||null:null,
   reply_link_status:!quote?'none':ids.has(quote)?'in_dataset':'target_unavailable',redaction_count:content.count};
 });
 const counts={artist:0,user:0,unknown:0,text:0,non_text:0},sourceTypes={};
 for(const m of messages){
  counts[m.sender_role]++;counts[m.content_type==='text'?'text':'non_text']++;
  sourceTypes[m.source_user_type]=(sourceTypes[m.source_user_type]||0)+1;
 }
 return {
  schema_version:'1.0.0',dataset_kind:'fromm_private_conversation',member:{...member},exported_at:new Date().toISOString(),
  source:{viewer_url:'https://fffdsaw.github.io/fromm-viewer/',inspected_build:'mobile-collector-v1',
   inspected_blob_sha:'',actual_build_verified:false},
  privacy:{contains_auth_fields:false,contains_media_urls:false,contains_original_ids:false,
   contains_private_message_text:true,public_repository_allowed:false,
   text_redaction:'common_contacts_auth_and_all_http_urls',redaction_count:redactions,
   manual_private_content_review_required:true},
  coverage:{status:result.status,api_range_exhausted:result.status==='api_range_exhausted',
   full_account_history_verified:false,pagination_boundary_semantics_verified:false,
   requested_start_at:START,snapshot_end_at:result.snapshotEnd,next_end_at:result.nextEndAt,
   observed_start_at:messages[0]?.created_at||null,observed_end_at:messages.at(-1)?.created_at||null,
   pages:result.pages,request_attempts:result.attempts,page_limit:result.pageLimit,
   duplicate_rows:result.duplicates,conflicting_message_ids:result.idConflicts,
   messages_without_original_id:result.noId,invalid_timestamp_rows:result.invalidDates,
   same_timestamp_order:'stable_id_order_not_confirmed_send_order',
   limitations:['Only records returned under the current account/subscription permissions.',
    'An empty page confirms API range exhaustion, not absence of deleted or inaccessible history.',
    'No-ID identical rows may be indistinguishable; timestamp saturation stops collection.',
    'Collection does not determine whether an artist message responds to this user.',
    'Mobile collection may stop early due to browser memory, throttling or page limits.']},
  sender_mapping:{status:verified?'user_confirmed':'unverified',artist_rule:'source_user_type_equals_star',
   own_user_types:verified?allowedOwn:[],
   confirmation_basis:verified?'user_checked_nonstar_samples_against_own_sent_messages':null,
   observed_source_types:sourceTypes},counts,messages
 };
}
const core={MEMBERS,redact,sourceType,contentType,collect,makeExport,failureCode};
if(typeof module!=='undefined'&&module.exports){module.exports=core;return;}
if(location.origin!=='https://fffdsaw.github.io'||!location.pathname.startsWith('/fromm-viewer/')
 ||!/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||''))return;
if(typeof state==='undefined'||typeof frommApiJson!=='function'
 ||typeof extractMessages!=='function'||typeof currentAuth!=='function')return;
if(document.getElementById('fromm-mobile-private-collector'))return;
const host=document.createElement('div');
host.id='fromm-mobile-private-collector';
host.style.cssText='position:fixed;inset:0;z-index:16000;pointer-events:none';
const shadow=host.attachShadow({mode:'open'});
shadow.innerHTML="<style>\n:host{font:14px/1.5 system-ui,-apple-system,sans-serif;color:#163531}\n*,*::before,*::after{box-sizing:border-box}\n.fab{position:fixed;right:14px;bottom:calc(84px + env(safe-area-inset-bottom));background:#daf8ed;border:1px solid #6fbbac;color:#153e36;border-radius:99px;box-shadow:0 4px 20px #142e3138;padding:12px 16px;font-weight:700;font-size:13px;min-height:46px;pointer-events:auto;cursor:pointer}\n.overlay{position:fixed;inset:0;display:none;align-items:flex-end;justify-content:center;background:#0d242a9c;pointer-events:auto}\n.overlay.open{display:flex}\nsection{width:100%;max-width:600px;max-height:min(92dvh,850px);overflow:auto;overscroll-behavior:contain;padding:16px 18px calc(18px + env(safe-area-inset-bottom));border-radius:22px 22px 0 0;background:#f4fffa;box-shadow:0 -8px 40px #101f2233}\nh2{font-size:19px;margin:0;color:#133b33}h3{font-size:15px;margin:12px 0 6px}p{margin:8px 0}label{display:block;margin:10px 0;font-weight:650}\nselect,button{font:inherit}select{display:block;width:100%;padding:12px 10px;border:1px solid #93bdb0;border-radius:10px;background:white;color:#153e36;min-height:46px;margin-top:4px}\nbutton{border:1px solid #83b9ab;background:white;color:#11372f;border-radius:10px;min-height:44px;padding:9px 12px;cursor:pointer}\nbutton.primary{background:#087765;color:white;border-color:#087765;font-weight:750}\nbutton:disabled{opacity:.5;cursor:default}button:focus-visible,select:focus-visible,input:focus-visible{outline:3px solid #2c9a83}\n.buttons{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.small{font-size:12px;color:#476b60}\n.warning{padding:10px;background:#e6f3ed;border-radius:10px;font-size:12px}\n.report{font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere;background:#e6f7ef;padding:10px;border-radius:10px}\n.top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}\n.check{display:flex;align-items:flex-start;gap:8px;font-weight:400}.check input{width:18px;height:18px;flex-shrink:0;margin-top:2px}\n.example{white-space:pre-wrap;overflow-wrap:anywhere;background:white;padding:9px;border:1px solid #c7e1d7;border-radius:8px;font-size:12px}\n[hidden]{display:none!important}\n@media(min-width:650px){.overlay{align-items:center}section{border-radius:22px;max-height:85dvh}}\n</style>\n<button id=\"launch\" class=\"fab\" aria-label=\"개인 대화 수집 열기\" aria-expanded=\"false\">내 대화 수집</button>\n<div id=\"overlay\" class=\"overlay\"><section role=\"dialog\" aria-modal=\"true\" aria-label=\"개인 대화 수집\">\n<div class=\"top\"><h2>개인 대화 수집</h2><button id=\"close\">닫기</button></div>\n<p class=\"warning\">본인 계정의 대화만 읽어 휴대폰에 JSON으로 저장해요. 로그인 토큰이나 원본 ID는 내보내지 않습니다. 다만 대화 텍스트는 민감할 수 있으니 파일을 외부에 공개하지 마세요.</p>\n<p class=\"small\">프롬웹에서 로그인한 뒤 진행하세요. 수집하는 동안 이 브라우저 화면을 유지해야 해요. 멤버 1명씩 저장합니다.</p>\n<label>멤버<select id=\"member\"></select></label>\n<label>실제 채팅방 직접 확인<select id=\"room\"></select></label>\n<label>수집 범위(휴대폰 메모리 보호)<select id=\"pages\"><option value=\"20\">기본 · 최대 20페이지 (약 1만 건 상한)</option><option value=\"60\">확장 · 최대 60페이지 (약 3만 건 상한)</option></select></label>\n<div class=\"buttons\"><button class=\"primary\" id=\"start\">선택 멤버 수집 시작</button><button id=\"stop\" disabled>중단</button></div>\n<p class=\"report\" id=\"status\" role=\"status\" aria-live=\"polite\">시작 전 · 멤버와 채팅방을 확인하세요.</p>\n<div id=\"verify\" hidden><h3>조회 결과 확인</h3><p class=\"report\" id=\"stats\"></p><div id=\"samples\"></div>\n<p class=\"warning\">아래 비(非)아티스트 유형의 예시가 내가 직접 보낸 메시지인지 실제 대화 화면과 비교하세요. 자신 없으면 선택하지 않아도 돼요.</p>\n<div id=\"types\"></div><label class=\"check\"><input type=\"checkbox\" id=\"confirmed\">선택한 유형이 내가 보낸 메시지임을 직접 확인했어요.</label>\n<button class=\"primary\" id=\"save\">JSON 파일 휴대폰에 저장</button>\n<p class=\"small\">저장된 파일의 개인정보를 직접 확인하세요. 기록은 이 화면의 메모리에만 있고, 업로드·자동 전송은 하지 않습니다.</p></div>\n</section></div>";
document.body.append(host);
const q=id=>shadow.getElementById(id);
let running=false,stopped=false,result=null,selectedMember=null,abort=null,rooms=[];
for(const member of MEMBERS)q('member').add(new Option(member.name,member.id));
function status(text){q('status').textContent=text;}
function reset(){
 if(running)return;
 result=null;selectedMember=null;q('verify').hidden=true;
 q('samples').replaceChildren();q('types').replaceChildren();q('confirmed').checked=false;
}
function refreshRooms(){
 rooms=Array.isArray(state.rooms)?state.rooms.filter(r=>str(r.hostChatRoomId)):[];
 q('room').replaceChildren();
 q('room').add(new Option(rooms.length?'채팅방을 선택하세요':'채팅방 없음 · 로그인 확인',''));
 for(let i=0;i<rooms.length;i++){
  const room=rooms[i],name=str(room.host?.nick||room.chatRoomName)||'이름 없는 채팅방';
  q('room').add(new Option(name,String(i)));
 }
 autoMatchRoom();
}
function autoMatchRoom(){
 const member=MEMBERS.find(m=>m.id===q('member').value);
 const exact=rooms.map((room,i)=>({room,i})).filter(x=>
  str(x.room.host?.nick||x.room.chatRoomName).replace(/\s/g,'')===member.name);
 q('room').value=exact.length===1?String(exact[0].i):'';
 reset();
}
function toggle(open){
 if(!open&&running){status('먼저 중단을 눌러주세요. 현재 조회 뒤 저장할 수 있어요.');return;}
 q('overlay').classList.toggle('open',open);
 q('launch').setAttribute('aria-expanded',String(open));
 if(open){refreshRooms();q('close').focus();}
 else{reset();q('launch').focus();}
}
q('launch').onclick=()=>toggle(true);
q('close').onclick=()=>toggle(false);
q('member').onchange=autoMatchRoom;
q('room').onchange=reset;q('pages').onchange=reset;
q('stop').onclick=()=>{stopped=true;abort?.abort();status('중단 중… 받은 기록은 부분 파일로 저장할 수 있어요.');};
q('start').onclick=async()=>{
 if(running)return;
 const member=MEMBERS.find(m=>m.id===q('member').value),index=Number(q('room').value);
 const room=q('room').value!==''?rooms[index]:null;
 if(!member||!room){status('실제 채팅방을 먼저 선택하세요.');return;}
 const name=str(room.host?.nick||room.chatRoomName);
 if(!confirm(member.name+' 대화로 저장할 방: '+name+'\n실제 멤버의 채팅방이 맞나요?'))return;
 const auth=currentAuth();
 if(!auth?.token||!auth?.uuid){status('프롬웹에 먼저 로그인해 주세요.');return;}
 const accountChanged=()=>{const a=currentAuth();return a.token!==auth.token||a.uuid!==auth.uuid;};
 const roomId=str(room.hostChatRoomId),maxPages=Number(q('pages').value);
 reset();selectedMember=member;running=true;stopped=false;abort=new AbortController();
 q('member').disabled=q('room').disabled=q('pages').disabled=q('start').disabled=true;
 q('stop').disabled=false;status('수집 중… 이 화면을 유지해 주세요.');
 try{
  result=await collect({roomId,endAt:new Date().toISOString(),maxPages,
   request:(path,params)=>{
    if(accountChanged())throw Object.assign(new Error('account_changed'),{status:401});
    return frommApiJson(path,params,{signal:abort.signal});
   },extract:extractMessages,cancelled:()=>stopped||accountChanged(),
   onProgress:p=>status(member.name+' · '+p.count.toLocaleString()+'건 · '+p.pages+'페이지')});
  const preview=makeExport(result,member);
  q('stats').textContent='수집 상태: '+result.status+
   '\n전체 메시지: '+result.rows.length.toLocaleString()+
   '\n아티스트 메시지: '+preview.counts.artist.toLocaleString()+
   '\n발신자 미확인: '+preview.counts.unknown.toLocaleString()+
   '\n조회 페이지: '+result.pages+
   '\n조회 구간 종료: '+(preview.coverage.api_range_exhausted?'예':'아니요 · 부분 기록')+
   '\n계정 전체 기록 보장: 안 됨';
  q('samples').replaceChildren();q('types').replaceChildren();
  for(const type of Object.keys(preview.sender_mapping.observed_source_types).filter(t=>t!=='star')){
   const examples=result.rows.filter(m=>sourceType(m)===type&&contentType(m)==='text').slice(-2);
   const heading=document.createElement('h3');heading.textContent=type+' 유형 · 직접 확인할 예시';
   const sample=document.createElement('p');sample.className='example';
   sample.textContent=examples.map(m=>redact(m.content).text.slice(0,140)).join('\n')||'(텍스트 없음)';
   q('samples').append(heading,sample);
   if(['fan','user','viewer'].includes(type)){
    const label=document.createElement('label');label.className='check';
    const check=document.createElement('input');check.type='checkbox';check.className='own-type';check.value=type;
    label.append(check,document.createTextNode(type+' 유형을 내 메시지로 지정'));q('types').append(label);
   }
  }
  q('verify').hidden=false;
  status(member.name+' 수집 '+(result.status==='api_range_exhausted'?'완료':'부분 종료')+
   ' · 유형을 확인하고 JSON을 저장해 주세요.');
 }catch(_){
  result=null;status('수집 오류 · 로그인이나 연결 상태를 확인해 주세요. 기존 기록은 변경하지 않았어요.');
 }finally{
  running=false;abort=null;
  q('member').disabled=q('room').disabled=q('pages').disabled=q('start').disabled=false;
  q('stop').disabled=true;
 }
};
q('save').onclick=()=>{
 if(!result||!selectedMember||running)return;
 const types=Array.from(shadow.querySelectorAll('.own-type:checked')).map(x=>x.value);
 const data=makeExport(result,selectedMember,types,q('confirmed').checked);
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='fromm_'+selectedMember.id+'_'+new Date().toISOString().slice(0,10)+
  '_'+(data.coverage.api_range_exhausted?'api-range':'partial')+'.json';
 a.style.display='none';document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
 status('저장 요청 완료. 휴대폰 다운로드 폴더에서 파일을 확인한 다음 멤버를 바꿔주세요.');
};
})();