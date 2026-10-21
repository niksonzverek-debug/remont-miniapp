/* Remont BT: one mobile shell for Telegram viewport and gesture/back navigation.
 * No business/API data is persisted by this module. Version 20261021-fullscreen-v1.
 */
(function (win, doc) {
  'use strict';
  if (win.RemontMobile) return;
  const tg = win.Telegram && win.Telegram.WebApp;
  const STACK_LIMIT = 35;
  const state = {stack: [], drafts: new Map(), moving: false, busyUntil: 0, dirty: false,
    restoring: false, fullscreenRequested: false, fullscreenFailed: false,
    handlers: [], observer: null, gesture: null, historyGuard: false,
    stepBack: null, backVisible: null};
  const root = doc.documentElement;
  const listen = (node, name, fn, opts) => {node.addEventListener(name, fn, opts);state.handlers.push(() => node.removeEventListener(name, fn, opts));};
  function validNumber(n) { return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0; }
  function insets() {
    let safe={}, content={};
    try {safe=tg?.safeAreaInset||{}; content=tg?.contentSafeAreaInset||{};}catch(_){}
    return {top:validNumber(safe.top),bottom:validNumber(safe.bottom),left:validNumber(safe.left),right:validNumber(safe.right),
      contentTop:validNumber(content.top),contentBottom:validNumber(content.bottom),
      contentLeft:validNumber(content.left),contentRight:validNumber(content.right)};
  }
  function viewport() {
    const i = insets();
    const visual = win.visualViewport;
    // Telegram viewportHeight excludes keyboard on clients supporting its API.
    const h = tg && tg.viewportHeight || visual && visual.height || win.innerHeight;
    const stable = tg && tg.viewportStableHeight || win.innerHeight;
    root.style.setProperty('--rb-viewport-height', Math.round(h) + 'px');
    root.style.setProperty('--rb-viewport-stable-height', Math.round(stable) + 'px');
    for (const [key, val] of Object.entries(i)) root.style.setProperty('--rb-'+key.replace(/[A-Z]/g,s=>'-'+s.toLowerCase()),val+'px');
    const active=doc.activeElement;
    const editableFocused=active && /^(INPUT|TEXTAREA)$/.test(active.tagName) && !['checkbox','radio','file','button','submit'].includes(active.type);
    const keyboardVisible=!!(visual && win.innerHeight - visual.height - visual.offsetTop > 140);
    root.classList.toggle('rb-keyboard-open', keyboardVisible || !!(editableFocused && (tg && ['android','android_x','ios','weba','webk'].includes(tg.platform))));
    root.classList.toggle('rb-fullscreen', !!(tg && tg.isFullscreen));
  }
  function initTelegram() {
    try {tg?.ready?.();tg?.expand?.();} catch(e) {console.warn('[Remont BT] Expand:',e);}
    try {
      if (tg?.isVersionAtLeast?.('7.7')) tg.disableVerticalSwipes?.();
    } catch(e) {console.warn('[Remont BT] Vertical swipe setting:',e);}
    if(tg?.onEvent) {
      for(const [event, cb] of [
        ['viewportChanged',viewport], ['safeAreaChanged',viewport], ['contentSafeAreaChanged',viewport],
        ['fullscreenChanged',viewport], ['fullscreenFailed', () => {state.fullscreenFailed=true;viewport();}],
        ['backButtonClicked',() => back('telegram')]
      ]) {
        try {tg.onEvent(event,cb);if(tg.offEvent)state.handlers.push(()=>tg.offEvent(event,cb));}catch(_){}
      }
    }
    // Fullscreen is a best-effort feature, one request per document only.
    if(tg?.isVersionAtLeast?.('8.0') && typeof tg.requestFullscreen === 'function' && !state.fullscreenRequested) {
      state.fullscreenRequested=true;
      try {if(!tg.isFullscreen)tg.requestFullscreen();}catch(e){state.fullscreenFailed=true;console.info('[Remont BT] Fullscreen unavailable; using Expand.');}
    }
    viewport();
  }
  function editable(el) {
    return el && el.closest && el.closest('input,textarea,select,[contenteditable],button, a, summary, label, [role="slider"], [role="scrollbar"], [data-no-swipe], .swiper, .splide, .carousel, .leaflet-container, .map, .bt-date-select, .bt-time-select, canvas');
  }
  function captureFields() {
    const fields=[];
    doc.querySelectorAll('input,textarea,select').forEach((el,idx)=>{
      if(!el.isConnected || el.type==='file' || el.type==='password' || el.type==='hidden' || el.disabled) return;
      const key=el.id?'#'+el.id:el.name?'[name="'+CSSescape(el.name)+'"]:'+idx:null;
      if(!key)return;
      fields.push({key,byId:!!el.id, name:el.name, index:idx, value:el.value, checked:el.checked, selected:el.selectedIndex, type:el.type});
    });
    return fields;
  }
  function CSSescape(t) {return String(t).replace(/["\\]/g,'\\$&');}
  function restoreFields(snapshot) {
    if(!snapshot?.length)return;
    let done=false;
    let rounds=0;
    const targetEntry=state.stack[state.stack.length-1];
    const restore=()=>{
      if(state.stack[state.stack.length-1]!==targetEntry)return;
      for(const f of snapshot){
        let el=null;
        if(f.byId) el=doc.getElementById(f.key.slice(1));
        else {const matches=doc.querySelectorAll(f.key);el=matches[0]||null;}
        if(!el||el.disabled||el.type==='file')continue;
        if(el.dataset.rbUserEdited==='1')continue;
        if(f.type==='checkbox'||f.type==='radio')el.checked=f.checked;
        else if(el.tagName==='SELECT'){
          el.value=f.value;
          if(el.value!==f.value && f.selected>=0)el.selectedIndex=f.selected;
          state.restoringInputs=true;try{el.dispatchEvent(new Event('change',{bubbles:true}));}finally{state.restoringInputs=false;}
        }else el.value=f.value;
        done=true;
      }
      rounds++;
      if(rounds<10)win.setTimeout(restore,140);
    };
    win.setTimeout(restore,0);
  }
  function syncBackButton(){
    try {if(!tg?.BackButton)return;
      const visible=state.stack.length>1 || !!state.stepBack || !!doc.querySelector('dialog[open], [aria-modal="true"]');
      if(visible===state.backVisible)return;
      state.backVisible=visible;
      if(visible)tg.BackButton.show(); else tg.BackButton.hide();
    }catch(_){}
  }
  function syncClosing(){
    try {if(!tg)return;
      if(state.dirty || state.drafts.size)tg.enableClosingConfirmation?.();
      else tg.disableClosingConfirmation?.();
    } catch(_){}
  }
  function saveCurrentDraft(){
    const current=state.stack[state.stack.length-1];
    if(!current || !state.dirty)return;
    const fields=captureFields();
    if(fields.length){current.fields=fields;current.wasDirty=true;state.drafts.set(current.key,fields);}
  }
  function enter(key,restore,opts={}){
    if(!key)return;
    const id=String(key);
    const last=state.stack[state.stack.length-1];
    if(state.restoring){
      state.restoring=false;
      if(last){last.key=id;last.restore=restore||last.restore;last.root=!!opts.root;}
      else state.stack.push({key:id,restore,root:!!opts.root});
      syncBackButton();return;
    }
    if(last?.key===id){if(restore)last.restore=restore;syncBackButton();return;}
    saveCurrentDraft();
    if(last)last.fields=captureFields();
    if(opts.root)state.stack=[{key:id,restore,root:true}];
    else {
      state.stack.push({key:id,restore,root:false});
      if(state.stack.length>STACK_LIMIT)state.stack.splice(1,state.stack.length-STACK_LIMIT);
    }
    state.dirty=state.drafts.has(id);
    const oldDraft=state.drafts.get(id);
    if(oldDraft)restoreFields(oldDraft);
    syncClosing();syncBackButton();
  }
  function ask(message){return win.confirm(message);}
  function clearDirty(){
    const current=state.stack[state.stack.length-1];
    if(current){state.drafts.delete(current.key);current.fields=null;current.wasDirty=false;}
    state.dirty=false;syncClosing();
  }
  function close(){
    if((state.dirty || state.drafts.size) && !ask('Есть несохранённые данные. Закрыть приложение? Черновики этого открытия будут потеряны.'))return false;
    state.drafts.clear();state.dirty=false;syncClosing();
    if(tg && typeof tg.close==='function') {tg.close();return true;}
    // Browser preview: let the browser control its own window.
    return false;
  }
  function back(origin='ui'){
    if(state.moving || Date.now()<state.busyUntil)return false;
    const modal=doc.querySelector('dialog[open], [aria-modal="true"]');
    if(modal){
      if(state.dirty && modal.querySelector('input,textarea,select') && !ask('Закрыть окно? Несохранённые изменения в нём могут быть потеряны.'))return false;
      if(modal.matches('dialog') && typeof modal.close==='function')modal.close();
      else {const cancel=modal.querySelector('[data-dismiss], [aria-label="Закрыть"], .modal-close');if(cancel)cancel.click();else return false;}
      syncBackButton();state.busyUntil=Date.now()+400;return true;
    }
    if(typeof state.stepBack==='function'){
      if(state.stepBack()!==false){state.busyUntil=Date.now()+430;return true;}
    }
    if(state.stack.length<=1)return close();
    saveCurrentDraft();
    const leaving=state.stack.pop(),previous=state.stack[state.stack.length-1];
    if(!previous?.restore){state.stack.push(leaving);return false;}
    state.busyUntil=Date.now()+550;
    state.moving=true;state.restoring=true;
    try {
      const result=previous.restore();
      if(result && typeof result.catch==='function') result.catch(e=>console.warn('[Remont BT] Back restore:',e));
      restoreFields(previous.fields || state.drafts.get(previous.key));
      state.dirty=!!state.drafts.has(previous.key);syncClosing();
      const settle=()=>win.setTimeout(()=>{state.restoring=false;syncBackButton();},120);
      if(result && typeof result.finally==='function') result.finally(settle).catch(()=>{});
      else settle();
    }catch(e){state.stack.push(leaving);state.restoring=false;console.error('[Remont BT] Navigation:',e);}
    finally{state.moving=false;syncBackButton();}
    return true;
  }
  function pointerStart(e){
    state.gesture=null;
    if(e.isPrimary===false || (e.pointerType==='mouse' && e.button!==0) || editable(e.target))return;
    const minEdge=Math.max(28,insets().left+24);
    if(e.clientX>minEdge || (e.pointerType==='touch' && e.width>85))return;
    state.gesture={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now(),valid:true};
  }
  function pointerMove(e){const g=state.gesture;if(!g||g.id!==e.pointerId)return;
    const dx=e.clientX-g.x,dy=e.clientY-g.y;
    if(Math.abs(dy)>22 && Math.abs(dy)>Math.abs(dx)*.85)state.gesture=null;
    if(dx< -18)state.gesture=null;
  }
  function pointerEnd(e){const g=state.gesture;state.gesture=null;if(!g||g.id!==e.pointerId)return;
    const dx=e.clientX-g.x,dy=e.clientY-g.y,ms=Math.max(1,performance.now()-g.time);
    if(dx>=85 && Math.abs(dy)<=Math.min(80,dx*.52) && (dx>=135||dx/ms>.25))back('swipe');
  }
  function markEdited(e){const el=e.target;
    if(state.restoringInputs || !el?.matches?.('input,textarea,select,[contenteditable="true"]'))return;
    if(el.matches('input[type="file"],input[type="hidden"]'))return;
    el.dataset.rbUserEdited='1';
    if(!el.closest('form, .bt-inner-content, .bt-order-page, .master-app, .bt-home-chat'))return;
    state.dirty=true;syncClosing();
  }
  function init(){
    initTelegram();
    listen(win,'resize',viewport,{passive:true});
    listen(win,'orientationchange',viewport,{passive:true});
    if(win.visualViewport){listen(win.visualViewport,'resize',viewport,{passive:true});listen(win.visualViewport,'scroll',viewport,{passive:true});}
    listen(doc,'pointerdown',pointerStart,{passive:true,capture:true});
    listen(doc,'pointermove',pointerMove,{passive:true,capture:true});
    listen(doc,'pointerup',pointerEnd,{passive:true,capture:true});
    listen(doc,'pointercancel',()=>{state.gesture=null;},{passive:true,capture:true});
    listen(doc,'input',markEdited,{passive:true,capture:true});
    listen(doc,'change',markEdited,{passive:true,capture:true});
    listen(doc,'focusin',viewport,{passive:true});
    listen(doc,'focusout',()=>win.setTimeout(viewport,150),{passive:true});
    listen(doc,'click',e=>{
      // Bottom navigation may leave a draft; enter()/back() preserve it in memory.
      const button=e.target?.closest?.('.back-btn,[data-action="back"],.back-button');
      if(!button || state.stack.length<=1)return;
      e.preventDefault();e.stopImmediatePropagation();back('button');
    },true);
    // Browser Back is only overridden inside an authenticated Telegram Mini App.
    if(tg?.initData && win.history?.replaceState && win.history?.pushState){
      try{win.history.replaceState({...win.history.state,remontBase:true},'');win.history.pushState({remontGuard:true},'');state.historyGuard=true;
        listen(win,'popstate',()=>{if(state.historyGuard){back('system');win.history.pushState({remontGuard:true},'');}});
      }catch(_) {state.historyGuard=false;}
    }
    if(doc.body && win.MutationObserver){state.observer=new win.MutationObserver(syncBackButton);state.observer.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','aria-modal']});}
    syncBackButton();
  }
  win.RemontMobile={enter,back,close,clearDirty,viewport,
    confirmNavigation(){return !(state.dirty||state.drafts.size)||ask('Есть несохранённые данные. Перейти в другой кабинет?');},
    setStepBack(fn){state.stepBack=typeof fn==='function'?fn:null;syncBackButton();},
    getState(){return {depth:state.stack.length,dirty:state.dirty,drafts:state.drafts.size,fullscreenFailed:state.fullscreenFailed};},
    destroy(){state.handlers.splice(0).forEach(f=>{try{f();}catch(_){}});state.observer?.disconnect();state.gesture=null;state.stack=[];state.drafts.clear();try{tg?.enableVerticalSwipes?.();}catch(_){};try{tg?.BackButton?.hide?.();}catch(_){};delete win.RemontMobile;}
  };
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window,document);
