/* Public profile dates: fromis9.fanpla.jp/news/2/ and sonymusic.co.jp/artist/ohmygirl/profile/.
   Names are UI identities, never API IDs. Unknown authors remain selectable. */
(() => {
 const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[\s_\-\uFE0E\uFE0F]/g,'');
 const groups=[
  {names:['fromis_9','프로미스나인'],members:[
   ['송하영','1997-09-29','SONG HA YOUNG','SONG HAYOUNG','하영'],
   ['박지원','1998-03-20','PARK JI WON','PARK JIWON','지원'],
   ['이채영','2000-05-14','LEE CHAE YOUNG','LEE CHAEYOUNG','채영'],
   ['이나경','2000-06-01','LEE NA GYUNG','LEE NAGYUNG','LEE NA KYUNG','나경'],
   ['백지헌','2003-04-17','BAEK JI HEON','BAEK JIHEON','지헌','헌이']]},
  {names:['OH MY GIRL','오마이걸'],members:[
   ['효정','1994-07-28','HYOJUNG','최효정','쩡이 💙'],['미미','1995-05-01','MIMI','김미현','친절한 곰돌씨'],
   ['유아','1995-09-17','YOOA','유시아','🤫'],['승희','1996-01-25','SEUNGHEE','현승희','승희클라미'],
   ['유빈','1997-09-09','YUBIN','BINNIE','비니','배유빈'],['아린','1999-06-18','ARIN','최예원']]}
 ].map(group=>({...group,members:group.members.map(([name,birthday,...aliases])=>({key:'artist:'+normalize(name),name,birthday,aliases:[name,...aliases].map(normalize)}))}));
 const roster=group=>groups.find(g=>g.names.some(name=>normalize(name)===normalize(group)))?.members||[];
 const find=(name,group)=> (group?roster(group):groups.flatMap(g=>g.members)).find(m=>m.aliases.includes(normalize(name)));
 const compare=(a,b)=>(find(a)?.birthday||'9999').localeCompare(find(b)?.birthday||'9999')||a.localeCompare(b,'ko');
 window.FrommArtists=Object.freeze({roster,find,compare,normalize,group(name){return groups.find(g=>g.members.some(m=>m.aliases.includes(normalize(name))))?.names[0]||'';}});
})();
