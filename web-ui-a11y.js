/* Presentation-only modal focus. Authentication and stored credentials are untouched. */
(() => {
  'use strict';
  const gate=document.querySelector('#loginGate');
  if(!gate)return;
  const saved=new Map();let active=false,returnTo=null;
  gate.setAttribute('role','dialog');gate.setAttribute('aria-modal','true');
  gate.setAttribute('aria-label','Fromm 로그인');gate.tabIndex=-1;
  const visible=el=>el?.isConnected&&!el.closest('[inert]')&&el.getClientRects().length>0;
  const focusable=()=>[...gate.querySelectorAll('button,input,select,a[href],[tabindex="0"]')].filter(el=>!el.disabled&&visible(el));
  function sync(){
    const open=!gate.classList.contains('hidden');
    if(open){
      if(!active){returnTo=gate.contains(document.activeElement)?null:document.activeElement;active=true;}
      for(const el of document.body.children){
        if(el===gate||['SCRIPT','STYLE','LINK'].includes(el.tagName))continue;
        if(!saved.has(el))saved.set(el,el.inert);
        el.inert=true;
      }
      if(!gate.contains(document.activeElement))(focusable()[0]||gate).focus({preventScroll:true});
    }else if(active){
      active=false;for(const [el,prior] of saved)el.inert=prior;saved.clear();
      const fallback=document.querySelector('#sidebarToggleBtn');
      if(visible(returnTo)&&returnTo!==document.body)returnTo.focus({preventScroll:true});
      else if(visible(fallback))fallback.focus({preventScroll:true});
      returnTo=null;
    }
  }
  gate.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const nodes=focusable(),first=nodes[0]||gate,last=nodes.at(-1)||gate;
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===gate)){
      event.preventDefault();last.focus();
    }else if(!event.shiftKey&&(document.activeElement===last||!nodes.length)){
      event.preventDefault();first.focus();
    }
  });
  document.addEventListener('focusin',event=>{
    if(active&&!gate.contains(event.target))(focusable()[0]||gate).focus({preventScroll:true});
  });
  new MutationObserver(sync).observe(gate,{attributes:true,attributeFilter:['class']});
  new MutationObserver(()=>{if(active)sync();}).observe(document.body,{childList:true});
  window.FrommA11y=Object.freeze({syncLogin:sync});sync();
})();
