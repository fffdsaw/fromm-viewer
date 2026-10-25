'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
function source(name){const m=html.match(new RegExp('^(?:async )?function '+name+'\\([^]*?^}', 'm'));assert.ok(m,name);return m[0];}
const c=vm.createContext({Date,Map,Number,String,Array,Set,isHttpMediaUrl:value=>/^https?:\/\//.test(value)});
for(const name of ['esc','voteId','voteText','voteStatusLabel','voteDateLabel','votePercent','voteResultsVisible','voteArtistPick','voteSearchText','voteMessageMarkup','voteDetailMarkup']){
 // Some short pure functions are deliberately single-line.
 const m=html.match(new RegExp('^function '+name+'\\([^\\n]*\\}\\r?$', 'm'));
 vm.runInContext(m ? m[0] : source(name),c);
}
const vote={id:7,topic:'Synthetic question',status:'ended',isArtiPickExposed:true,artiPickOptionId:2,hasArtiParticipated:true,
 options:[{optionId:1,text:'A',percentage:0},{optionId:2,text:'B',percentage:100},{optionId:3,text:'C',percentage:null}]};
test('vote ids retain exact safe values and reject unsafe request targets',()=>{
 for(const v of [0,-1,1.5,Number.MAX_SAFE_INTEGER+1,'../participate','','0',{},null]) assert.equal(c.voteId(v),'');
 assert.equal(c.voteId(7),'7');assert.equal(c.voteId('9223372036854775807'),'9223372036854775807');
});
test('percentages distinguish zero, missing, malformed and out-of-range data',()=>{
 assert.equal(c.votePercent(0),0);assert.equal(c.votePercent(100),100);
 for(const value of [null,undefined,'0',false,-1,101,NaN,4.5]) assert.equal(c.votePercent(value),null);
});
test('fan results remain concealed until ended or an existing participation is present',()=>{
 assert.equal(c.voteResultsVisible({status:'ongoing'}),false);
 assert.equal(c.voteResultsVisible({status:'ongoing',myPickOptionId:1}),true);
 for(const status of ['scheduled','deleted','unknown']) assert.equal(c.voteResultsVisible({status,myPickOptionId:1}),false);
});
test('artist pick requires ended public result, a matching id and no explicit nonparticipation',()=>{
 assert.equal(c.voteArtistPick(vote,vote.options[1]),true);
 for(const patch of [{status:'ongoing'},{isArtiPickExposed:false},{isArtiPickExposed:null},{artiPickOptionId:null},{hasArtiParticipated:false}]) assert.equal(c.voteArtistPick({...vote,...patch},vote.options[1]),false);
 assert.equal(c.voteArtistPick(vote,vote.options[0]),false);
});
test('result markup renders genuine zero and missing values separately',()=>{
 const markup=c.voteDetailMarkup(vote);
 assert.match(markup,/>0%</);assert.match(markup,/>100%</);assert.match(markup,/>미제공</);
 assert.equal((markup.match(/vote-artist-pick/g)||[]).length,1);
 const privateResult=c.voteDetailMarkup({...vote,status:'ongoing',myPickOptionId:null});
 assert.doesNotMatch(privateResult,/>100%|vote-artist-pick|width:100%/);
 assert.doesNotMatch(c.voteDetailMarkup({...vote,status:'deleted'}),/Synthetic question|100%|vote-option/);
});
test('card and detail escape server content and reject non-HTTPS image sources',()=>{
 const untrusted={...vote,topic:'<img src=x onerror=alert(1)>',options:[{optionId:2,text:'<script>bad</script>',originalImageUrl:'javascript:bad',percentage:55}]};
 const card=c.voteMessageMarkup({vote:untrusted});assert.match(card,/&lt;img/);assert.doesNotMatch(card,/<img/);
 const detail=c.voteDetailMarkup(untrusted);assert.match(detail,/&lt;script/);assert.doesNotMatch(detail,/<script|javascript:|<img/);
 assert.equal(c.voteStatusLabel({status:'toString'}),'상태 미확인');
});
test('vote search indexes questions/options without identifiers or image URLs',()=>{
 assert.equal(c.voteSearchText({...vote,topic:'Question',options:[{text:'Answer',originalImageUrl:'secret-url'}]}),'Question\nAnswer');
 assert.doesNotMatch(c.voteSearchText(vote),/7|optionId/);
});
