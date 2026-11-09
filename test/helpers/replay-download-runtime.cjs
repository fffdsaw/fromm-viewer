'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const source=()=>fs.readFileSync(path.join(root,'index.html'),'utf8');
const fn=(name,html=source())=>{const found=html.match(new RegExp('^(?:async )?function '+name+'\\([^]*?^}','m'));if(!found)throw Error(name);return found[0]};
function context({html=source(),fetcher=fetch,mobile=false,extra={}}={}){
 const c=vm.createContext({FrommVideoDownload:require('../../web-video-download.js'),fetch:fetcher,URL,URLSearchParams,Blob,Uint8Array,DataView,Map,Set,TextDecoder,
  AbortController,window:{crypto:webcrypto,addEventListener(){},removeEventListener(){}},navigator:{userAgent:mobile?'Android':'Windows'},
  state:{live:{replayPlaylistCache:new Map()}},friendlyNetworkError:e=>e,localProxyUrl:x=>x,
  setTimeout:(fn,ms)=>{const t=setTimeout(fn,ms);t.unref?.();return t},clearTimeout,...extra});
 for(const n of ['replayAuthParams','replaySignedUrl','replayManifestAttributes','videoQualityLabel','replayVariantsFromMaster','replayVariantFromMaster','videoQualityAuth','fetchReplayText','resolveReplayMediaPlaylist','parseReplayDownloadPlaylist','replayDownloadIv','fetchReplayBuffer','downloadReplayStream'])vm.runInContext(fn(n,html),c);
 if(html.includes('function prepareReplayDownloadStage'))vm.runInContext(fn('prepareReplayDownloadStage',html),c);
 return c;
}
module.exports={context,fn,source,root};
