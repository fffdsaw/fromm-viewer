'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../mobile-private-collector.js');
const {collect,makeExport,redact,MEMBERS}=core;
const endAt='2026-10-13T00:00:00.000Z';
const base=Date.parse(endAt)-10000;
const make=(id,t,extra={})=>({
  messageId:id,createdAt:new Date(t).toISOString(),
  userType:'star',type:'text',content:'합성 테스트',...extra
});
const run=(batches,options={})=>{
  let i=0;
  return collect({roomId:'synthetic-room',endAt,wait:async()=>{},
    request:async(path,query)=>{
      assert.equal(path,'/v2/chat/message/synthetic-room/messages');
      assert.equal(query.findStartAt,'2000-01-01T00:00:00.000Z');
      return batches[i++]||[];
    },extract:x=>x,...options});
};
test('same-timestamp overlap preserves messages and deduplicates',async()=>{
  const result=await run([
    [make('a',base+200),make('b',base+100)],
    [make('b',base+100),make('c',base+100),make('d',base)],
    [make('d',base)],[]
  ]);
  assert.equal(result.status,'api_range_exhausted');
  assert.equal(result.rows.length,4);
  assert.equal(result.duplicates,2);
  const exported=makeExport(result,MEMBERS[0]);
  assert.equal(exported.schema_version,'1.0.0');
  assert.equal(exported.coverage.full_account_history_verified,false);
  assert.equal(exported.coverage.pagination_boundary_semantics_verified,false);
});
test('mobile page cap is always partial, and saturated ms is partial',async()=>{
  const result=await run([[make('a',base),make('b',base)]],{maxPages:1});
  assert.equal(result.status,'page_limit');
  const full=await run([[make('a',base),make('b',base)]],{limit:2});
  assert.equal(full.status,'timestamp_boundary_saturated');
});
test('rate limit and auth errors do not retry or expose raw error text',async()=>{
  for(const code of [401,403,429,500]){
    let requests=0;
    const r=await run([],{request:async()=>{
      requests++;
      throw Object.assign(new Error('secret-response'),{status:code});
    }});
    assert.equal(requests,1);
    assert.equal(r.rows.length,0);
    assert.ok(!JSON.stringify(r).includes('secret-response'));
  }
});
test('explicit 400/422 adjusts page limit, not auth failures',async()=>{
  const attempts=[];
  const r=await run([],{request:async(_,params)=>{
    attempts.push(params.limit);
    if(attempts.length===1)throw Object.assign(new Error(),{status:422});
    return [];
  }});
  assert.deepEqual(attempts,['500','100']);
  assert.equal(r.status,'api_range_exhausted');
});
test('cancellation keeps already-fetched subset',async()=>{
  let stop=false;
  const r=await run([[make('a',base)]],{cancelled:()=>stop,onProgress:()=>{stop=true;}});
  assert.equal(r.status,'cancelled');
  assert.equal(r.rows.length,1);
});
test('own-message sender role must be manually verified',async()=>{
  const r=await run([[make('a',base,{userType:'fan',content:'합성 답장'})],[]]);
  assert.equal(makeExport(r,MEMBERS[1],['fan'],false).counts.user,0);
  const exported=makeExport(r,MEMBERS[1],['fan'],true);
  assert.equal(exported.counts.user,1);
  assert.equal(exported.sender_mapping.status,'user_confirmed');
});
test('private fields, media URLs and original identifiers are excluded',async()=>{
  const r=await run([[
    make('private-a',base,{content:'a@example.com 010-1234-5678 access_token=secret https://private.test/path',uuid:'secret',raw:'secret',email:'secret'}),
    make('private-b',base+1,{userType:'fan',content:'안녕',embeddedMentionedMessage:{messageId:'private-a',content:'private quote'}}),
    make('private-c',base+2,{type:'image',content:'https://media.test/token=secret'})
  ],[]]);
  const exported=makeExport(r,MEMBERS[0],['fan'],true);
  const text=JSON.stringify(exported);
  for(const secret of ['private-a','private-b','media.test','private.test','example.com','010-1234','private quote'])
    assert.ok(!text.includes(secret),secret);
  assert.equal(exported.messages[0].text,'[이메일] [전화번호] [인증정보] [링크]');
  assert.equal(exported.messages[2].text,null);
  assert.equal(exported.messages[1].reply_to_ref,exported.messages[0].message_ref);
});
test('invalid timestamp and unverified quote target are handled',async()=>{
  const bad=await run([[{messageId:'x',createdAt:'not-a-date',userType:'star',type:'text',content:'x'}]]);
  assert.equal(bad.status,'invalid_timestamp');
  const r=await run([[make('x',base,{embeddedReplyMessage:{messageId:'not-in-dataset'}})],[]]);
  const data=makeExport(r,MEMBERS[3]);
  assert.equal(data.messages[0].reply_to_ref,null);
  assert.equal(data.messages[0].reply_link_status,'target_unavailable');
});
test('desktop does not request collector script',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const index=html.indexOf('if (!isMobileDevice) return;');
  const collector=html.indexOf('privateCollector.src = "mobile-private-collector.js?v=1"');
  assert.ok(index>=0 && collector>index,'loader must be in mobile-only block');
  assert.ok(!/<script\s+src=["']mobile-private-collector\.js/.test(html));
});
