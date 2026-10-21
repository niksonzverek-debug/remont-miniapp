/* ТехСервис — мастерский WebApp. Act button click fix 20261020. */
const masterApiBase = window.REMONT_ADVERTISER_API_BASE || 'http://127.0.0.1:8767';
let masterCache = {orders:[], clients:[], messages:[], acts:[], promos:[], stats:{}};
let activeChatClientId = null;
let masterCurrentUserId = String(tg?.initDataUnsafe?.user?.id || (localStorage.getItem('remontBT.master.session.v1') || '').split(':')[0] || '');
const masterEsc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function masterAuthHeaders() {
  const headers = {};
  const initData = String((tg && tg.initData) || '').trim();
  if (initData) headers['X-Telegram-Init-Data'] = initData;
  const savedSession = String(localStorage.getItem('remontBT.master.session.v1') || '');
  const telegramId = String(tg?.initDataUnsafe?.user?.id || '');
  const savedId = savedSession.split(':')[0];
  if (initData && telegramId && savedSession && savedId !== telegramId) {
    localStorage.removeItem('remontBT.master.session.v1');
  } else if (savedSession) headers['X-Remont-Session'] = savedSession;
  if (!initData && !savedSession) throw new Error('Откройте кабинет кнопкой из чата с ботом Telegram.');
  return headers;
}
function masterApi(path, method='GET', payload=null) {
  let headers;
  try { headers = masterAuthHeaders(); } catch (error) { return Promise.reject(error); }
  if (payload !== null) headers['Content-Type']='application/json';
  return fetch(masterApiBase + path, {method, headers, body: payload === null ? undefined : JSON.stringify(payload), cache:'no-store'})
    .then(async r => { const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error || `Ошибка сервера (${r.status})`); return d; });
}
/* Документ открывается для просмотра, без автоматического скачивания. */
let masterPdfUrl = null;
function clearMasterPdfUrl(){ if(masterPdfUrl){ URL.revokeObjectURL(masterPdfUrl); masterPdfUrl=null; } }
async function getMasterActPdf(number){
  const headers=masterAuthHeaders();
  const response=await fetch(masterApiBase+`/api/master/acts/${encodeURIComponent(String(number))}/pdf`,{headers,cache:'no-store'});
  if(!response.ok){const e=await response.json().catch(()=>({}));throw new Error(e.error||`Не удалось открыть акт (${response.status})`);}
  const blob=await response.blob();
  if(!blob.size||!String(blob.type).includes('pdf'))throw new Error('Сервер не вернул корректный PDF.');
  return blob;
}
async function downloadMasterAct(number){
  try{
    const blob=await getMasterActPdf(number),url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`Akt_${String(number).replace(/[^a-zA-Z0-9_-]/g,'_')}.pdf`;
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(e){masterToast(e.message,true);}
}
const masterActStatusLabels={sending:'Отправляется',sent:'Отправлен клиенту',pending:'Ожидает привязки',pending_client:'Ожидает регистрации клиента',pending_delivery:'Ожидает доставки',confirmed:'Подтверждён клиентом',cancelled:'Отменён',draft:'Черновик'};
function masterActStatus(v){return masterActStatusLabels[v]||v||'Без статуса';}
function masterActSummary(number){
 const act=masterCache.acts.find(a=>String(a.number)===String(number));
 if(!act)return '<p class="subtitle">Сведения об акте можно посмотреть в разделе «Все акты».</p>';
 const works=Array.isArray(act.works)?act.works:[];
 const fmt=n=>new Intl.NumberFormat('ru-RU').format(Number(n||0));
 const money=fmt(act.final_price??act.price??0);
 return `<div class="bt-act-readable"><p><b>Клиент:</b> ${masterEsc(act.client_name||'—')}</p>
 <p><b>Телефон:</b> ${masterEsc(act.client_phone||'—')}</p><p><b>Техника:</b> ${masterEsc([act.device,act.brand,act.model].filter(Boolean).join(' '))}</p>
 <p><b>Выполненные работы:</b></p><ol>${works.map(w=>`<li>${masterEsc(w)}</li>`).join('')||'<li>Не указаны</li>'}</ol>
 <p><b>Стоимость ремонта:</b> ${masterEsc(fmt(act.price))} сум</p>
 ${Number(act.discount_amount||0)>0?`<p><b>Скидка:</b> −${masterEsc(fmt(act.discount_amount))} сум</p>`:''}
 <p><b>Итого к оплате:</b> ${masterEsc(money)} сум</p>
 ${act.amounts_need_review?'<p class="error">Внимание: сумма старого акта требует сверки администратором.</p>':''}
 <p><b>Гарантия:</b> ${masterEsc(act.guarantee_text||'—')}</p>
 <p><b>Статус:</b> ${masterEsc(masterActStatus(act.status))}</p></div>`;
}
async function masterActPublicUrl(number,purpose='share-link'){
 const r=await masterApi(`/api/master/acts/${encodeURIComponent(String(number))}/${purpose}`,'POST',{});
 return masterApiBase.replace(/\/$/,'')+String(r.path);
}
function openMasterDocumentUrl(url){
 const app=window.Telegram?.WebApp;
 if(app&&typeof app.openLink==='function')app.openLink(url,{try_instant_view:false});
 else window.open(url,'_blank','noopener,noreferrer');
}
async function openMasterActPdf(number){
 try{const url=await masterActPublicUrl(number,'view-link');openMasterDocumentUrl(url)}
 catch(e){masterToast(e.message,true)}
}
async function previewMasterAct(number){
 btMasterLastActNumber=number;
 clearMasterPdfUrl();
 masterShell('Просмотр акта',`<article class="card"><h2>Акт № ${masterEsc(number)}</h2>
 <p class="subtitle">Содержимое акта отображается сразу. PDF откроется в просмотрщике телефона или браузере.</p>
 ${masterActSummary(number)}
 <div class="button-row"><button type="button" onclick="openMasterActPdf('${masterEsc(number)}')">📄 Открыть PDF</button>
 <button type="button" class="secondary" onclick="downloadMasterAct('${masterEsc(number)}')">↓ Сохранить PDF</button></div>
 <div class="button-row"><button type="button" onclick="shareMasterAct('${masterEsc(number)}')">↗ Поделиться через Telegram</button>
 <button type="button" class="secondary" onclick="copyMasterActLink('${masterEsc(number)}')">🔗 Копировать ссылку</button></div>
 <p class="subtitle">Ссылка для передачи человеку без регистрации действительна 24 часа. Любой, кто получит ссылку, сможет прочитать этот акт.</p>
 <button type="button" class="secondary" onclick="showMasterActCorrection('${masterEsc(number)}')">✎ Заявка на исправление</button>
 <button type="button" class="back-btn" onclick="showMasterActs()">← Все акты</button></article>`);
}
async function copyMasterActLink(number){
 try{
  const url=await masterActPublicUrl(number);
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);masterToast('Ссылка скопирована. Действует 24 часа.');}
  else window.prompt('Скопируйте ссылку на акт (действует 24 часа):',url);
 }catch(e){masterToast(e.message,true)}
}
async function shareMasterAct(number){
 try{
  const url=await masterActPublicUrl(number);
  const shareUrl='https://t.me/share/url?url='+encodeURIComponent(url)+'&text='+encodeURIComponent(`Акт выполненных работ № ${number} — ТехСервис. Ссылка действительна 24 часа.`);
  const app=window.Telegram?.WebApp;
  if(app&&typeof app.openTelegramLink==='function')app.openTelegramLink(shareUrl);
  else window.open(shareUrl,'_blank','noopener,noreferrer');
  masterToast('Выберите получателя в Telegram. Передаётся защищённая ссылка на PDF, а не открытый доступ к базе.');
 }catch(e){masterToast(e.message,true)}
}
function showMasterActCorrection(number){
 btMasterLastActNumber=number;
  masterShell('Исправление акта',`<article class="card"><h2>Акт № ${masterEsc(number)}</h2><p class="subtitle">Напишите, что нужно исправить. Запрос будет сохранён на сервере и передан администратору. Сам акт мастер изменить не может.</p><label for="masterCorrectionReason">Что изменить?</label><textarea id="masterCorrectionReason" maxlength="1500" required rows="6" placeholder="Например: исправить модель, сумму, выполненные работы…"></textarea><button type="button" id="masterCorrectionSend" onclick="sendMasterActCorrection('${masterEsc(number)}')">Отправить администратору</button><p id="masterCorrectionResult" role="status" class="subtitle"></p><button type="button" class="back-btn" onclick="showMasterActs()">← Акты</button></article>`);
}
async function sendMasterActCorrection(number){
  const reason=document.getElementById('masterCorrectionReason')?.value.trim(),button=document.getElementById('masterCorrectionSend'),status=document.getElementById('masterCorrectionResult');
  if(!reason||reason.length<10){if(status)status.textContent='Опишите исправление не менее чем 10 символами.';return;}
  button.disabled=true;
  try{const r=await masterApi(`/api/master/acts/${encodeURIComponent(String(number))}/correction`,'POST',{reason});status.textContent=r.message||'Заявка отправлена.';status.className='notice';masterToast(status.textContent);}
  catch(e){status.textContent=e.message;status.className='error';button.disabled=false;}
}
let btMasterLastActNumber='';
let btMasterActOrder=null;
let btMasterLastPayoutCode='';
function btMasterRestoreRoute(title){
 const actNumber=btMasterLastActNumber, clientId=activeChatClientId, actOrder=btMasterActOrder, promoCode=btMasterLastPayoutCode;
 const map={
   'Панель мастера':()=>renderMasterMenu(),
   'Заявки':()=>showMasterOrders(),
   'Клиенты':()=>showMasterClients(),
   'Чаты':()=>showMasterMessages(),
   'Акты':()=>showMasterActs(),
   'Промокоды':()=>showMasterPromos(),
   'Новый промокод':()=>showCreateMasterPromo(),
   'Настройки профиля':()=>showMasterProfile(),
   'Написать в поддержку':()=>showMasterSupport(),
   'Рекламная ссылка':()=>showMasterMarketingLink(),
   'Диалог':()=>openMasterChat(clientId),
   'Просмотр акта':()=>previewMasterAct(actNumber),
   'Исправление акта':()=>showMasterActCorrection(actNumber),
   'Создать акт':()=>renderMasterActForm(actOrder),
   'Выплата рекламодателю':()=>showMasterPayout(promoCode),
   'F.A.Q. — Помощь':()=>showMasterFAQ(),
   'Вход мастера':()=>showMasterLogin()
 };
 return map[title]||(()=>renderMasterMenu());
}
function masterShell(title, body) {
 const routeSuffix=title==='Диалог'?String(activeChatClientId||''):['Просмотр акта','Исправление акта'].includes(title)?String(btMasterLastActNumber||''):title==='Выплата рекламодателю'?String(btMasterLastPayoutCode||''):'';
 window.RemontMobile?.enter('master/page/'+title+'/'+routeSuffix,btMasterRestoreRoute(title),{root:title==='Панель мастера'});
  if(title!=='Диалог' && typeof btMasterStopChatMedia==='function') btMasterStopChatMedia();
  btMasterCurrentScreen=title;
  const name=String(masterCache.profile?.name||tg.initDataUnsafe?.user?.first_name||'Мастер').trim().replace(/\s+([.,!?])/g,'$1');
  const home=title==='Панель мастера';
  document.body.innerHTML = `<main class="master-app"><header class="portal-head bt-compact-header bt-master-header">
     <img class="bt-header-logo" src="img/remont-bt-icon.png" alt="ТехСервис">
     <div class="bt-header-copy"><span class="bt-header-hello">Здравствуйте!</span><strong class="bt-header-name">${masterEsc(name)}</strong></div>
     <span class="bt-header-role">🧰 <span>Мастер</span></span>
   </header><section id="masterContent">${home?'':`<h1 class="bt-screen-heading">${masterEsc(title)}</h1>`}${body}</section>
   <nav class="master-bottom-nav"><button onclick="renderMasterMenu()"><span>⌂</span><small>Главная</small></button><button id="btMasterOrdersNav" onclick="showMasterOrders()"><span>▤</span><small>Заказы</small></button><button id="btMasterChatsNav" onclick="showMasterMessages()"><span>✉</span><small>Чаты</small></button><button onclick="showMasterProfile()"><span>◎</span><small>Профиль</small></button></nav><p id="masterToast" class="subtitle" role="status"></p></main>`;
  btUpdateMasterAttention();
}
function masterToast(message, error=false) { const e=document.getElementById('masterToast'); if(e){e.textContent=message;e.className=error?'error':'notice';} else showAlert(message); }
function showMasterLogin(message='') {
  masterShell('Вход мастера', `<article class="card master-auth-card"><h2>🔐 Вход в кабинет</h2><p>Введите номер телефона, привязанный к вашему кабинету. Сервер дополнительно проверит Telegram ID — одного номера недостаточно.</p><form id="masterLoginForm" onsubmit="event.preventDefault(); submitMasterLogin()"><label for="masterLoginPhone">Номер телефона</label><input id="masterLoginPhone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="+998 90 123 45 67"><button id="masterLoginButton" type="submit">Проверить и войти</button><p id="masterLoginStatus" class="${message?'error':'subtitle'}" role="status">${masterEsc(message)}</p></form></article>`);
}
async function submitMasterLogin() {
  const field=document.getElementById('masterLoginPhone'), status=document.getElementById('masterLoginStatus'), button=document.getElementById('masterLoginButton');
  if(!field||!status||!button)return;
  const initData=String(tg?.initData||'');
  const qp=new URLSearchParams(location.search);
  if(!initData && !(qp.get('master_uid')&&qp.get('master_exp')&&qp.get('master_sig'))){status.textContent='Откройте кабинет кнопкой, которую бот прислал после одобрения. Обычная HTTPS-ссылка не подтверждает Telegram ID.';status.className='error';return;}
  const digits=String(field.value||'').replace(/\D/g,'');
  const phone=digits.startsWith('998')&&digits.length===12?'+'+digits:(digits.length===9?'+998'+digits:'+'+digits);
  if(!/^\+998\d{9}$/.test(phone)){status.textContent='Введите корректный номер +998XXXXXXXXX.';status.className='error';return;}
  button.disabled=true; status.textContent='Проверяем номер и Telegram ID…'; status.className='subtitle';
  try {
    const response=await fetch(masterApiBase+'/api/master/login',{method:'POST',headers:{'Content-Type':'application/json',...(initData?{'X-Telegram-Init-Data':initData}:{})},body:JSON.stringify({phone,master_uid:qp.get('master_uid'),master_exp:qp.get('master_exp'),master_sig:qp.get('master_sig')}),cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||`Ошибка входа (${response.status})`);
    if(!data.session||!data.user_id)throw new Error('Сервер не выдал сессию.');
    localStorage.setItem('remontBT.master.session.v1',data.session);
    masterCurrentUserId=String(data.user_id);
    await loadMasterData(); await renderMasterMenu();
  } catch(e) { status.textContent=e.message||'Не удалось войти.'; status.className='error'; button.disabled=false; }
}

async function bootMasterApp() {
  const saved=String(localStorage.getItem('remontBT.master.session.v1')||'');
  if(!String(tg?.initData||'')&&!saved) return showMasterLogin();
  try { await loadMasterData(); await renderMasterMenu(); }
  catch(e) {
    if(saved && !String(tg?.initData||'')) localStorage.removeItem('remontBT.master.session.v1');
    showMasterLogin(e.message||'Сессия не принята. Проверьте номер телефона и откройте приложение из Telegram.');
  }
}
async function masterRefresh() { try { await loadMasterData(); renderMasterMenu(); } catch(e) { masterShell('Панель мастера',`<article class="card error">${masterEsc(e.message)}<p>Откройте WebApp из Telegram и попробуйте обновить.</p></article>`); } }
async function loadMasterData() {
  const [dash,orders,clients,messages,acts,promos]=await Promise.all([
    masterApi('/api/master/dashboard'),masterApi('/api/master/orders'),masterApi('/api/master/clients'),masterApi('/api/master/messages'),masterApi('/api/master/acts'),masterApi('/api/master/promos')
  ]);
  const telegramId=String(tg?.initDataUnsafe?.user?.id||'');
  const signedId=String(new URLSearchParams(location.search).get('master_uid')||'');
  const expectedId=String((tg?.initData && telegramId) ? telegramId : (signedId || masterCurrentUserId));
  if (expectedId && String(dash.authenticated_master_id||'') !== expectedId) {
    localStorage.removeItem('remontBT.master.session.v1');
    throw new Error('Кабинет открыт под другим Telegram ID. Откройте новую кнопку кабинета из чата с ботом.');
  }
  masterCurrentUserId=String(dash.authenticated_master_id||'');
  masterCache={...masterCache,profile:dash.profile,stats:dash.stats,orders:orders.orders||[],clients:clients.clients||[],messages:messages.messages||[],acts:acts.acts||[],promos:promos.promocodes||[]};
  btUpdateMasterAttention();
  btStartMasterAttention();
  return masterCache;
}
let btMasterCurrentScreen='';
let btMasterAttentionTimer=null;
let btMasterAttentionInFlight=false;
function btUpdateMasterAttention(){
  const s=masterCache.stats||{};
  document.querySelector('#btMasterOrdersNav')?.classList.toggle('bt-attention-nav',Number(s.new_orders)>0);
  document.querySelector('#btMasterChatsNav')?.classList.toggle('bt-attention-nav',Number(s.unread_messages)>0);
  const newBtn=document.querySelector('.bt-master-new-orders'),msgBtn=document.querySelector('.bt-master-message-panel');
  newBtn?.classList.toggle('bt-attention-urgent',Number(s.new_orders)>0);
  msgBtn?.classList.toggle('bt-attention-urgent',Number(s.unread_messages)>0);
  if(newBtn)newBtn.querySelector('.count-bubble').textContent=String(s.new_orders||0);
  if(msgBtn){msgBtn.querySelector('.count-bubble').textContent=String(s.unread_messages||0);
}
}
function btStartMasterAttention(){
  if(btMasterAttentionTimer)return;
  btMasterAttentionTimer=setInterval(async()=>{
    if(document.hidden||btMasterAttentionInFlight)return;
    btMasterAttentionInFlight=true;
    try{
      const d=await masterApi('/api/master/dashboard');
      masterCache.stats=d.stats||{};
      btUpdateMasterAttention();
      if(btMasterCurrentScreen==='Панель мастера' && document.getElementById('btMasterRecentThreads')){
        try {const inbox=await masterApi('/api/master/messages'); masterCache.messages=inbox.messages||[];
          const el=document.getElementById('btMasterRecentThreads');if(el)el.innerHTML=btMasterRecentThreadsMarkup();
        }catch(_){ /* сохраняем последние сообщения при сетевом сбое */ }
      }
      if(btMasterCurrentScreen==='Чаты'&&Number(d.stats?.unread_messages)>0){
        await showMasterMessages();
      }
    }catch(_){ /* no stale-UI overwrite during network failure */ }
    finally{btMasterAttentionInFlight=false;}
  },12000);
}
// All edge gestures and Telegram BackButton events are handled centrally.
function btMasterRecentThreads(limit=3){
  const grouped=new Map();
  for(const message of masterCache.messages||[]){
    const clientId=String(message.client_id||'');
    if(!/^\d{1,20}$/.test(clientId)||String(message.from_id)===String(masterCurrentUserId))continue;
    const last=grouped.get(clientId);
    if(!last || String(message.created_at||'')>=String(last.created_at||''))grouped.set(clientId,message);
  }
  return [...grouped.entries()].map(([id,last])=>{
    const client=masterCache.clients.find(c=>String(c.id)===id);
    const name=String(client?.name||last.client_name||'Клиент').trim();
    const unread=(masterCache.messages||[]).filter(msg=>String(msg.client_id)===id&&String(msg.to_id)===String(masterCurrentUserId)&&!msg.read_by_master).length;
    const preview=String(last.text||({photo:'📷 Фото',video:'🎬 Видео'}[last.type]||'Сообщение'));
    return {id,name,preview,unread,created_at:String(last.created_at||'')};
  }).sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,limit);
}
function btMasterRecentThreadsMarkup(){
  const list=btMasterRecentThreads(3);
  return list.length?list.map(t=>`<button class="bt-recent-chat ${t.unread?'bt-unread-thread':''}" type="button" onclick="openMasterChat('${t.id}')" aria-label="Открыть чат: ${masterEsc(t.name)}">
    <span class="bt-recent-avatar">${masterEsc(t.name.charAt(0).toUpperCase()||'К')}</span>
    <span class="bt-recent-main"><b>${masterEsc(t.name)}</b><small>${masterEsc(t.preview.slice(0,100))}</small></span>
    <span class="bt-recent-side">${t.unread?`<em>${t.unread}</em>`:''}<small>${masterEsc(t.created_at.replace('T',' ').slice(11,16))}</small></span>
  </button>`).join(''):'<p class="subtitle bt-recent-empty">Сообщений пока нет.</p>';
}
async function renderMasterMenu() {
  try { await loadMasterData(); } catch(e) { masterShell('Панель мастера',`<article class="card error">${masterEsc(e.message)}</article>`); return; }
  const s=masterCache.stats||{};
  masterShell('Панель мастера',`${btMasterOldOrders().length?`<div class="card bt-overdue-orders"><b>⚠ Заявки ожидают более двух часов: ${btMasterOldOrders().length}</b><p class="subtitle">Проверьте очередь новых обращений.</p><button type="button" onclick="showMasterOrders()">Открыть ожидающие заявки</button></div>`:''}
  <button class="bt-master-new-orders ${Number(s.new_orders)>0?'bt-attention-urgent':''}" onclick="showMasterOrders()"><span><b>⚡ Новые заявки</b><small>Ожидают принятия</small></span><span class="count-bubble">${s.new_orders||0}</span></button>
  <button class="bt-master-primary" onclick="showCreateAct()">＋ Создать акт</button>
  <div class="master-action-grid bt-master-feature-grid bt-six-tiles">
    <button class="menu-btn" onclick="showMasterOrders()"><span class="emoji">▤</span><b>Заявки</b><small>Все обращения</small></button>
    <button class="menu-btn" onclick="showMasterActs()"><span class="emoji">▧</span><b>Акты</b><small>Документы</small></button>
    <button class="menu-btn" onclick="showMasterClients()"><span class="emoji">♙</span><b>Клиенты</b><small>Контакты</small></button>
    <button class="menu-btn" onclick="showMasterMessages()"><span class="emoji">✉</span><b>Чаты</b><small>Переписка</small></button>
    <button class="menu-btn" onclick="showMasterPromos()"><span class="emoji">◇</span><b>Промокоды</b><small>Скидки</small></button>
    <button class="menu-btn" onclick="showMasterFAQ()"><span class="emoji">♧</span><b>F.A.Q.</b><small>Помощь</small></button>
    <button class="menu-btn" onclick="showMasterSupport()"><span class="emoji">✉</span><b>Поддержка</b><small>Написать администратору</small></button>
  </div>
  <section class="bt-master-message-panel ${Number(s.unread_messages)>0?'bt-attention-urgent':''}" aria-label="Последние сообщения">
    <div class="bt-recent-head"><button type="button" class="bt-recent-all" onclick="showMasterMessages()"><b>✉ Последние сообщения</b><small>Все чаты →</small></button><span class="count-bubble">${s.unread_messages||0}</span></div>
    <div id="btMasterRecentThreads" class="bt-recent-list">${btMasterRecentThreadsMarkup()}</div>
  </section>`);
}
function showMasterFAQ(){
  const items=[
   ['Как принимать заявки?','Откройте «Заявки», выберите обращение и нажмите «Принять». Новые обращения выделяются цветом.'],
   ['Как создать акт?','Нажмите «Создать акт», выберите технику, работы, стоимость и гарантию. Проверьте итоговую сумму и отправьте акт клиенту.'],
   ['Где посмотреть сообщения?','На главной отображаются три последних клиента. Нажмите имя или сообщение для открытия диалога. Все остальные переписки — в разделе «Чаты».'],
   ['Как работают промокоды?','Откройте «Промокоды». Система промокодов работает отдельно от реферальной программы; отключение промокода доступно администратору.'],
   ['Как исправить акт?','Откройте нужный акт, выберите «Заявка на исправление» и отправьте описание администратору.'],
   ['Где моя рекламная ссылка?','Откройте «Профиль» → «Рекламная ссылка». Там можно скопировать персональную ссылку мастера.']
  ];
  masterShell('F.A.Q. — Помощь',`<article class="card bt-faq-card"><p class="subtitle">Ответы на частые вопросы о работе в ТехСервис.</p>${items.map(([q,a])=>`<details><summary>${masterEsc(q)}</summary><p>${masterEsc(a)}</p></details>`).join('')}<button type="button" class="secondary" onclick="renderMasterMenu()">← Главная</button></article>`);
}
function statusLabel(s){return ({new:'Новая',accepted:'Принята',rejected:'Отклонена',in_progress:'В работе',act_issued:'Акт отправлен',closed:'Закрыта',completed:'Завершена'})[s]||s||'—';}
async function showMasterOrders(){try{await loadMasterData();}catch(e){return masterShell('Заявки',`<article class="card error">${masterEsc(e.message)}</article>`)}
 const rows=masterCache.orders.map(o=>`<article class="card order-card ${o.status==='new'?'bt-new-order':''}"><div class="card-row"><b>${masterEsc(o.id)}</b><span class="status-pill ${o.status==='new'?'status-new':''}">${masterEsc(statusLabel(o.status))}</span></div><h3>${masterEsc([o.device,o.brand,o.model].filter(Boolean).join(' ')||'Ремонт техники')}</h3><p><b>Клиент:</b> ${masterEsc(o.client_name||'Клиент')} · ${masterEsc(o.client_phone||'телефон не указан')}</p><p>${masterEsc(o.problem||o.comment||'Описание не указано')}</p><p class="subtitle">${masterEsc([o.when_date,o.when_time,o.address||o.house].filter(Boolean).join(' · '))}</p>${o.status==='new'&&Date.now()-Date.parse(o.created_at||'')>2*3600*1000?'<p class="bt-overdue-note">⚠ Ожидает ответа более двух часов</p>':''}<div class="button-row">${o.status==='new'?`<button onclick="decideMasterOrder('${masterEsc(o.id)}','accept')">✓ Принять</button><button class="secondary" onclick="decideMasterOrder('${masterEsc(o.id)}','reject')">Отклонить</button>`:''}${o.status==='accepted'&&!o.act_number?`<button onclick="showMasterCreateAct('${masterEsc(o.id)}')">📄 Создать акт</button>`:''}<button class="secondary" onclick="openMasterChat('${masterEsc(o.client_id)}')">💬 Написать клиенту</button></div></article>`).join('');
 masterShell('Заявки',`<div class="section-heading"><p>Сначала показываются последние заявки. Действия доступны только по заявкам вашего кабинета.</p><select id="orderFilter" onchange="filterMasterOrders()"><option value="all">Все статусы</option><option value="new">Новые</option><option value="accepted">Принятые</option><option value="act_issued">Акт отправлен</option><option value="closed">Закрытые</option></select></div><div id="masterOrderList" class="stack-list">${rows||'<article class="card">Заявок пока нет.</article>'}</div>`);}
function filterMasterOrders(){const f=document.getElementById('orderFilter')?.value||'all';document.querySelectorAll('#masterOrderList .order-card').forEach((el,i)=>{const o=masterCache.orders[i];el.style.display=f==='all'||o?.status===f?'':'none';});}
async function decideMasterOrder(id,decision){try{const r=await masterApi(`/api/master/orders/${encodeURIComponent(id)}/decision`,'POST',{decision});masterToast(r.message);await showMasterOrders();}catch(e){masterToast(e.message,true);}}
async function showMasterClients(){try{await loadMasterData();}catch(e){return masterShell('Клиенты',`<article class="card error">${masterEsc(e.message)}</article>`)}const rows=masterCache.clients.map(c=>`<article class="card"><div class="card-row"><b>${masterEsc(c.name||'Клиент')}</b><span class="status-pill">${c.registered?'Зарегистрирован':'Без регистрации'}</span></div><p>${masterEsc(c.phone||'Телефон не указан')}</p><p class="subtitle">${masterEsc(c.public_name||c.registration_no||'')}</p><div class="button-row"><button onclick="openMasterChat('${masterEsc(c.id)}')">💬 Написать</button>${c.phone?`<a class="secondary menu-btn" href="tel:${masterEsc(c.phone)}">📞 Позвонить</a>`:''}</div></article>`).join('');masterShell('Клиенты',`<input id="clientSearch" placeholder="Поиск по имени, телефону" oninput="filterMasterClients()"><div id="masterClientList" class="stack-list">${rows||'<article class="card">Клиентов пока нет.</article>'}</div>`);}
function filterMasterClients(){const q=(document.getElementById('clientSearch')?.value||'').toLowerCase();document.querySelectorAll('#masterClientList .card').forEach(el=>el.style.display=el.textContent.toLowerCase().includes(q)?'':'none');}
async function showMasterMessages(){
    try{await loadMasterData();}catch(e){return masterShell('Чаты',`<article class="card error">${masterEsc(e.message)}</article>`)}
    const grouped=new Map();
    for(const m of masterCache.messages){
        const id=String(m.client_id||'');if(!/^\d+$/.test(id))continue;
        if(!grouped.has(id))grouped.set(id,[]);
        grouped.get(id).push(m);
    }
    const threads=[...grouped.entries()].map(([id,ms])=>{
        ms.sort((a,b)=>String(a.created_at||'').localeCompare(String(b.created_at||'')));
        const last=ms[ms.length-1];
        const client=masterCache.clients.find(c=>String(c.id)===id);
        const name=String(client?.name||last.client_name||'Клиент');
        const unread=ms.filter(m=>String(m.to_id)===String(masterCurrentUserId)&&!m.read_by_master).length;
        return {id,name,last,unread};
    }).sort((a,b)=>String(b.last.created_at||'').localeCompare(String(a.last.created_at||'')));
    const rows=threads.map(t=>{
        const preview=t.last.text||({photo:'📷 Фото',video:'🎬 Видео'}[t.last.type]||'Сообщение');
        return `<button type="button" class="chat-list-item bt-inbox-thread ${t.unread?'bt-unread-thread':''}" onclick="openMasterChat('${t.id}')"><span class="chat-avatar">${masterEsc(t.name.trim().charAt(0).toUpperCase()||'К')}</span><span class="chat-info"><b>${masterEsc(t.name)}</b><small>${masterEsc(preview).slice(0,115)}</small></span><span class="bt-inbox-aside"><small>${masterEsc(String(t.last.created_at||'').replace('T',' ').slice(0,16))}</small>${t.unread?`<span class="bt-inbox-unread" aria-label="${t.unread} новых сообщений">${t.unread}</span>`:''}</span></button>`;
    }).join('');
    masterShell('Чаты',`<p class="subtitle">Выберите клиента — откроется его переписка. Новые сообщения отмечены числом справа.</p><div class="chat-list">${rows||'<article class="card">Сообщений пока нет.</article>'}</div>`);
}

let btMasterChatRefreshTimer=null;
let btMasterChatUrls=[];
function btMasterStopChatMedia(){
    if(btMasterChatRefreshTimer){clearInterval(btMasterChatRefreshTimer);btMasterChatRefreshTimer=null;}
    btMasterChatUrls.forEach(u=>URL.revokeObjectURL(u));btMasterChatUrls=[];
}
function btMasterChatBubble(m){
    const mine=String(m.from_id)===String(masterCurrentUserId);
    const mid=String(m.media_id||'');
    const kind=m.type==='video'?'video':m.type==='photo'?'photo':'';
    return `<div class="message-bubble ${mine?'mine':'theirs'}"><b>${mine?'Вы':'Клиент'}</b>`+
        (m.text?`<p>${masterEsc(m.text)}</p>`:'')+
        (kind&&/^[a-f0-9]{32}$/.test(mid)?`<div class="bt-chat-media-slot" data-media-id="${mid}" data-media-kind="${kind}">Загрузка файла…</div>`:'')+
        `<small>${masterEsc((m.created_at||'').replace('T',' ').slice(0,16))}</small></div>`;
}
async function btMasterDisplayMedia(el){
    if(!el?.isConnected)return;
    try{
        const headers=masterAuthHeaders();
        const r=await fetch(masterApiBase+`/api/chat/media/${encodeURIComponent(el.dataset.mediaId)}`,{headers,cache:'no-store'});
        if(!r.ok)throw new Error('Не удалось получить файл.');
        const blob=await r.blob();if(!el.isConnected)return;
        const url=URL.createObjectURL(blob);btMasterChatUrls.push(url);
        const media=document.createElement(el.dataset.mediaKind==='video'?'video':'img');
        media.src=url;media.className='bt-chat-media';media.alt='Вложение из переписки';
        if(media.tagName==='VIDEO'){media.controls=true;media.preload='metadata';}
        el.textContent='';el.appendChild(media);
    }catch(e){if(el.isConnected)el.textContent=e.message;}
}
function btMasterRenderMessages(messages){
    const h=document.getElementById('btMasterChatHistory');if(!h)return;
    const fingerprint=messages.map(m=>`${m.id}:${m.media_id||''}`).join('|');
    if(h.dataset.fingerprint===fingerprint)return;
    h.dataset.fingerprint=fingerprint;
    btMasterChatUrls.forEach(u=>URL.revokeObjectURL(u));btMasterChatUrls=[];
    h.innerHTML=messages.length?messages.map(btMasterChatBubble).join(''):'<p class="subtitle">Напишите клиенту первое сообщение.</p>';
    h.querySelectorAll('[data-media-id]').forEach(btMasterDisplayMedia);
    h.scrollTop=h.scrollHeight;
}
async function btMasterRefreshOpenChat(){
    if(!document.getElementById('btMasterChatHistory')||!activeChatClientId)return;
    try{
        const result=await masterApi('/api/master/messages?client_id='+encodeURIComponent(String(activeChatClientId)));
        masterCache.messages=Array.isArray(result.messages)?result.messages:[];
        btMasterRenderMessages(masterCache.messages.filter(m=>String(m.client_id)===String(activeChatClientId)));
    }catch(e){const status=document.getElementById('replyStatus');if(status)status.textContent=e.message;}
}
async function openMasterChat(clientId){
    btMasterStopChatMedia();activeChatClientId=String(clientId);
    try{await loadMasterData();}catch(e){return masterToast(e.message,true);}
    const c=masterCache.clients.find(x=>String(x.id)===activeChatClientId)||
      (()=>{const m=masterCache.messages.find(x=>String(x.client_id)===activeChatClientId);return m?{id:activeChatClientId,name:m.client_name||'Клиент',phone:m.client_phone||''}:null;})();
    if(!c){masterToast('Переписка с этим клиентом не найдена.',true);return;}
    masterShell('Диалог',`<button class="back-btn" onclick="showMasterMessages()">← Все диалоги</button>
        <article class="card chat-header"><div class="chat-avatar">${masterEsc((c.name||'К').slice(0,1).toUpperCase())}</div><div><h2>${masterEsc(c.name||'Клиент')}</h2><p class="subtitle">${masterEsc(c.phone||'Телефон не указан')}</p></div></article>
        <div id="btMasterChatHistory" class="chat-history bt-chat-history"></div>
        <form class="card bt-chat-compose" onsubmit="event.preventDefault();sendMasterReply()"><label for="masterReplyText">Сообщение для ${masterEsc(c.name||'клиента')}</label><textarea id="masterReplyText" maxlength="1500" placeholder="Введите ответ…"></textarea>
        <div class="bt-chat-compose-actions"><label class="bt-chat-attach" for="masterChatFile">＋ Фото / видео</label><input id="masterChatFile" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" hidden onchange="btMasterDescribeFile()"><button id="masterReplySend" type="submit">➤ Отправить</button></div><p id="btMasterFileName" class="subtitle"></p><p id="replyStatus" class="subtitle" role="status"></p></form>`);
    btMasterRenderMessages(masterCache.messages.filter(m=>String(m.client_id)===activeChatClientId));
    await btMasterRefreshOpenChat();
    btMasterChatRefreshTimer=setInterval(()=>{if(document.getElementById('btMasterChatHistory'))btMasterRefreshOpenChat();else btMasterStopChatMedia();},12000);
}
function btMasterDescribeFile(){
    const f=document.getElementById('masterChatFile')?.files?.[0];const e=document.getElementById('btMasterFileName');
    if(e)e.textContent=f?`${f.name} · ${(f.size/1048576).toFixed(1)} МБ · максимум 6 МБ`:'';
}
function btMasterFileBase64(file){return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onerror=()=>reject(new Error('Не удалось прочитать файл.'));fr.onload=()=>resolve(String(fr.result||'').split(',')[1]||'');fr.readAsDataURL(file);});}
async function sendMasterReply(){
    const field=document.getElementById('masterReplyText'),status=document.getElementById('replyStatus'),btn=document.getElementById('masterReplySend');
    const text=String(field?.value||'').trim();const file=document.getElementById('masterChatFile')?.files?.[0];
    if(!activeChatClientId||(!text&&!file)){if(status)status.textContent='Напишите сообщение или добавьте файл.';return;}
    if(file&&(file.size>6*1024*1024||!['image/jpeg','image/png','image/webp','video/mp4','video/webm'].includes(file.type))){status.textContent='Файл должен быть JPG, PNG, WebP, MP4 или WebM до 6 МБ.';return;}
    btn.disabled=true;status.textContent='Отправляем…';
    try{
        let response;
        if(file){const data=await btMasterFileBase64(file);response=await masterApi('/api/master/message-media','POST',{client_id:activeChatClientId,text,media_type:file.type,file_name:file.name,data});}
        else response=await masterApi('/api/master/message','POST',{client_id:activeChatClientId,text});
        window.RemontMobile?.clearDirty();status.textContent=response.message||'Сообщение отправлено.';status.className='notice';field.value='';const input=document.getElementById('masterChatFile');if(input)input.value='';btMasterDescribeFile();
        await btMasterRefreshOpenChat();
    }catch(e){status.textContent=e.message;status.className='error';}
    finally{if(btn?.isConnected)btn.disabled=false;}
}
async function retryMasterActDelivery(number){
 try{
   const result=await masterApi('/api/master/acts/'+encodeURIComponent(number)+'/retry-delivery','POST',{});
   masterToast(result.message||'Отправка выполнена',!result.delivered);
   await showMasterActs();
 }catch(e){masterToast(e.message||'Не удалось отправить уведомление',true)}
}
async function showMasterActs(){
 try{await loadMasterData();}catch(e){return masterShell('Акты',`<article class="card error">${masterEsc(e.message)}</article>`);}
 clearMasterPdfUrl();
 const rows=masterCache.acts.map(a=>`<article class="card"><div class="card-row"><b>Акт № ${masterEsc(a.number)}</b><span class="status-pill">${masterEsc(masterActStatus(a.status))}</span></div><p>${masterEsc([a.client_name,a.client_phone].filter(Boolean).join(' · '))}</p><p>${masterEsc([a.device,a.brand,a.model].filter(Boolean).join(' '))}</p><p><b>Итого: ${masterEsc(fmtPrice(a.final_price??a.price??0))}</b>${Number(a.discount_amount||0)>0?` · скидка ${masterEsc(fmtPrice(a.discount_amount))}`:''} · гарантия: ${masterEsc(a.guarantee_text||'—')}</p>${a.amounts_need_review?'<p class="error">Требуется проверка суммы в админке</p>':''}<p class="subtitle">Заявка: ${masterEsc(a.order_id||'без заявки')} · ${masterEsc(a.created_at||'')}</p>${a.correction_request_status==='pending'?'<p class="subtitle">📝 Запрос на исправление ожидает администратора</p>':a.correction_request_status==='resolved'?'<p class="subtitle">✓ Исправления внесены администратором</p>':''}<div class="button-row"><button type="button" onclick="previewMasterAct('${masterEsc(a.number)}')">◫ Открыть акт</button><button type="button" class="secondary" onclick="shareMasterAct('${masterEsc(a.number)}')">↗ Поделиться</button>${['pending','sending','pending_client','pending_delivery','sending_failed'].includes(a.status)?`<button type="button" onclick="retryMasterActDelivery('${masterEsc(a.number)}')">↻ Повторить доставку</button>`:''}</div><button type="button" class="secondary" onclick="showMasterActCorrection('${masterEsc(a.number)}')">✎ Подать заявку на исправление</button></article>`).join('');
 masterShell('Акты',`<div class="stack-list">${rows||'<article class="card">Актов пока нет.</article>'}</div>`);
}
async function showMasterCreateAct(orderId){try{await loadMasterData()}catch(e){return masterToast(e.message,true)}const o=masterCache.orders.find(x=>String(x.id)===String(orderId));if(!o||o.status!=='accepted'||o.act_number)return masterToast('Заявка уже недоступна для создания акта.',true);renderMasterActForm(o);}
/* Каждый список содержит 5 стандартных вариантов и шестой «Другое». */
const masterAppliances=[
 {value:'Стиральная машина',icon:'♻'},
 {value:'Холодильник',icon:'❄'},
 {value:'Кондиционер',icon:'◈'},
 {value:'Микроволновая печь',icon:'▣'},
 {value:'Пылесос',icon:'◉'},
 {value:'__other__',label:'Другое',icon:'✎'}
];
const masterBrands=[{value:'LG',icon:'LG'},{value:'Samsung',icon:'S'},{value:'Indesit',icon:'I'},{value:'Bosch',label:'Bosh (Bosch)',icon:'B'},{value:'Атлант',icon:'А'},{value:'__other__',label:'Другое',icon:'✎'}];
const masterWorksByDevice={
 'Стиральная машина':['Замена насоса','Замена нагревательного элемента','Профилактика','Замена подшипников','Ремонт платы'],
 'Холодильник':['Замена датчиков','Замена нагревательного элемента','Замена компрессора','Замена таймера','Устранение утечки'],
 'Кондиционер':['Замена датчиков','Профилактика','Замена компрессора','Заправка фреоном','Устранение утечки'],
 'Микроволновая печь':['Замена магнетрона','Замена трансформатора','Замена конденсатора','Ремонт платы','Профилактика'],
 'Пылесос':['Замена двигателя','Замена шланга','Замена мешка','Ремонт платы','Профилактика'],
 '__other__':['Диагностика','Ремонт платы','Замена детали','Профилактика','Ремонт']
};
const masterWorkIcons=['◇','⚙','✧','◉','⌁'];
const masterGuarantees=[{value:'0',label:'Без гарантии',icon:'⊘'},{value:'7',label:'7 дней',icon:'◷'},{value:'30',label:'1 месяц',icon:'◷'},{value:'90',label:'3 месяца',icon:'◷'},{value:'180',label:'6 месяцев',icon:'◷'},{value:'custom',label:'Своя гарантия, месяцев',icon:'✎'}];
function masterChoiceMarkup(id,label,items,selected=''){
 const current=items.find(i=>i.value===selected);
 const options=items.map(i=>`<button type="button" class="bt-master-choice" role="option" data-value="${masterEsc(i.value)}" onclick="chooseMasterActItem(this,'${id}')"><span class="bt-master-choice-icon">${masterEsc(i.icon)}</span><span>${masterEsc(i.label||i.value)}</span><span class="bt-master-check">✓</span></button>`).join('');
 return `<label id="${id}Label">${masterEsc(label)}</label><details class="bt-master-picker" id="${id}Picker"><summary role="button"><span id="${id}Summary">${current?masterEsc((current.icon||'')+' '+(current.label||current.value)):'Выберите вариант'}</span><span aria-hidden="true">⌄</span></summary><div class="bt-master-picker-options" role="listbox" aria-labelledby="${id}Label">${options}</div></details><input id="${id}" type="hidden" value="${masterEsc(selected)}">`;
}
function chooseMasterActItem(button,id){
 const value=button.dataset.value||'';document.getElementById(id).value=value;
 const list=document.getElementById(id+'Picker');if(list)list.open=false;
 const summary=document.getElementById(id+'Summary');if(summary)summary.textContent=button.querySelector('span:nth-child(2)')?.textContent||value;
 for(const other of document.querySelectorAll(`#${id}Picker .bt-master-choice`))other.classList.toggle('selected',other===button);
 if(id==='actGuarantee')toggleMasterCustomGuarantee();else toggleActCustom(id,id+'CustomWrap');
 if(id==='actDevice')renderMasterActWorks();
}
function toggleActCustom(selectId,wrapId){
 const el=document.getElementById(selectId),wrap=document.getElementById(wrapId);
 if(wrap)wrap.style.display=el?.value==='__other__'?'block':'none';
}
function renderMasterActWorks(){
 const panel=document.getElementById('actWorksList');if(!panel)return;
 const device=document.getElementById('actDevice')?.value||'__other__';
 const works=masterWorksByDevice[device]||masterWorksByDevice.__other__;
 panel.innerHTML=works.map((work,i)=>`<label class="bt-master-work-option"><input type="checkbox" name="actWork" value="${masterEsc(work)}"><span class="bt-master-choice-icon">${masterWorkIcons[i]}</span><span>${masterEsc(work)}</span><span class="bt-master-check">✓</span></label>`).join('')+`<label class="bt-master-work-option bt-master-custom-work"><input type="checkbox" id="actWorksOther" onchange="toggleMasterCustomWorks()"><span class="bt-master-choice-icon">✎</span><span>Другое (указать вручную)</span><span class="bt-master-check">✓</span></label>`;
 document.getElementById('actWorksCustomWrap').style.display='none';
}
function toggleMasterCustomWorks(){
 const wrap=document.getElementById('actWorksCustomWrap');if(wrap)wrap.style.display=document.getElementById('actWorksOther')?.checked?'block':'none';
}
function masterSelectedWorks(){
 const works=[...document.querySelectorAll('input[name="actWork"]:checked')].map(e=>e.value);
 if(document.getElementById('actWorksOther')?.checked){
   const extra=document.getElementById('actWorksCustom')?.value.split(/[\n;]+/).map(s=>s.trim()).filter(Boolean)||[];
   if(!extra.length)throw new Error('Укажите дополнительные выполненные работы. Каждую напишите с новой строки.');
   works.push(...extra);
 }
 const result=[...new Set(works)];
 if(!result.length)throw new Error('Выберите хотя бы одну выполненную работу.');
 if(result.length>30)throw new Error('Можно указать не более 30 выполненных работ.');
 if(result.some(w=>w.length>200))throw new Error('Описание одной работы не должно превышать 200 символов.');
 return result;
}
function toggleMasterCustomGuarantee(){
 const wrap=document.getElementById('actGuaranteeCustomWrap');if(wrap)wrap.style.display=document.getElementById('actGuarantee')?.value==='custom'?'block':'none';
}
function masterApplyWorkTemplate(template){
    const options=[...document.querySelectorAll('input[name="actWork"]')];
    if(!options.length)return;
    for(const item of options){
        item.checked=(template==='maintenance' ? /профилак/i.test(item.value) :
                      template==='basic' ? /замена|диагностик|ремонт/i.test(item.value) && item===options.find(x=>/замена|диагностик|ремонт/i.test(x.value)) : false);
    }
    const status=document.getElementById('actTemplateStatus');
    if(status)status.textContent=template==='maintenance'?'Выбрана профилактика. Проверьте список работ.':
        template==='basic'?'Выбрана типовая работа. Дополните при необходимости.':'Выбор очищен.';
}
function masterPreviewDraftAct(){
    try{
        const works=masterSelectedWorks();
        const device=document.getElementById('actDevice')?.value==='__other__'?document.getElementById('actDeviceCustom')?.value:document.getElementById('actDevice')?.value;
        const brand=document.getElementById('actBrand')?.value==='__other__'?document.getElementById('actBrandCustom')?.value:document.getElementById('actBrand')?.value;
        const priceRaw=String(document.getElementById('actPrice')?.value||'').replace(/\D/g,'');
        const amount=Number(priceRaw);
        if(!device||!brand||!Number.isSafeInteger(amount)||amount<=0)throw Error('Укажите технику, бренд и стоимость.');
        const warranty=document.getElementById('actGuarantee')?.value==='custom'?(document.getElementById('actGuaranteeMonths')?.value+' мес.'):(masterGuarantees.find(x=>x.value===document.getElementById('actGuarantee')?.value)?.label||'—');
        const container=document.getElementById('btMasterActDraftPreview');
        if(!container)return;
        container.hidden=false;
        container.innerHTML=`<h3>Предварительный просмотр</h3><p>${masterEsc([device,brand,document.getElementById('actModel')?.value].filter(Boolean).join(' '))}</p>`+
            `<p><b>Работы:</b> ${masterEsc(works.join(', '))}</p><p><b>Стоимость до скидки:</b> ${masterEsc(new Intl.NumberFormat('ru-RU').format(amount))} сум</p>`+
            `<p><b>Гарантия:</b> ${masterEsc(warranty)}</p>`+
            `<p class="subtitle">Это черновик. Промокод и окончательную сумму рассчитывает сервер после создания акта. PDF ещё не создан и клиенту не отправлен.</p>`;
        container.scrollIntoView({behavior:'smooth',block:'nearest'});
    }catch(e){masterToast(e.message||'Не удалось показать черновик.',true);}
}
function btMasterOldOrders(){
    const now=Date.now();
    return (masterCache.orders||[]).filter(o=>o.status==='new').map(o=>({o,age:now-Date.parse(o.created_at||'')}))
        .filter(x=>Number.isFinite(x.age)&&x.age>=2*3600*1000)
        .sort((a,b)=>b.age-a.age).slice(0,5);
}
function renderMasterActForm(o=null){
 btMasterActOrder=o;
 actGeoLocation=null;
 const manual=!o, id=o?String(o.id):'', safeId=id.replace(/'/g,"\\'");
 const device=o?.device==='Микроволновка'?'Микроволновая печь':o?.device||'';
 const initialDevice=masterAppliances.some(i=>i.value===device)?device:(device?'__other__':'');
 const brand=o?.brand||'';
 const initialBrand=masterBrands.some(i=>i.value===brand)?brand:(brand?'__other__':'');
 masterShell('Создать акт',`<button class="back-btn" onclick="${manual?'renderMasterMenu()':'showMasterOrders()'}">← Назад</button>${o?`<article class="card"><h2>Заявка ${masterEsc(o.id)}</h2><p><b>Клиент:</b> ${masterEsc(o.client_name||'Клиент')} · ${masterEsc(o.client_phone||'')}</p><p><b>Техника:</b> ${masterEsc([o.device,o.brand,o.model].filter(Boolean).join(' '))}</p><p>${masterEsc(o.problem||'')}</p><button class="secondary" type="button" onclick="renderMasterActForm(null)">Создать акт без заявки</button></article>`:`<article class="card"><h2>Акт без заявки</h2><p>Для клиента, обратившегося лично или по телефону. Регистрация в Telegram не обязательна.</p></article>`}<form class="stack-list" onsubmit="event.preventDefault();submitMasterAct(event,'${safeId}');return false;"><article class="card bt-master-act-form">${manual?`<label>ФИО клиента</label><input id="actClientName" maxlength="150" required placeholder="Имя и фамилия"><label>Телефон клиента</label><input id="actClientPhone" required type="tel" inputmode="tel" maxlength="60" placeholder="+998 …">`:''}
 ${masterChoiceMarkup('actDevice','Вид техники',masterAppliances,initialDevice)}
 <div id="actDeviceCustomWrap" style="display:none"><label>Укажите вид техники</label><input id="actDeviceCustom" maxlength="120" value="${masterEsc(initialDevice==='__other__'?device:'')}" placeholder="Введите технику"></div>
 ${masterChoiceMarkup('actBrand','Бренд',masterBrands,initialBrand)}
 <div id="actBrandCustomWrap" style="display:none"><label>Укажите бренд</label><input id="actBrandCustom" maxlength="120" value="${masterEsc(initialBrand==='__other__'?brand:'')}" placeholder="Введите бренд"></div>
 <label>Модель (если есть)</label><input id="actModel" maxlength="120" value="${masterEsc(o?.model||'')}" placeholder="Модель техники">
 <label>Выполненные работы <small class="subtitle">Можно выбрать несколько</small></label><div id="actWorksList" class="bt-master-works"></div>
 <div class="bt-work-templates"><button type="button" class="secondary" onclick="masterApplyWorkTemplate('maintenance')">✧ Профилактика</button><button type="button" class="secondary" onclick="masterApplyWorkTemplate('basic')">⚙ Типовая работа</button><button type="button" class="secondary" onclick="masterApplyWorkTemplate('clear')">× Снять выбор</button></div><p id="actTemplateStatus" class="subtitle"></p>
 <div id="actWorksCustomWrap" style="display:none"><label>Свои работы (каждая с новой строки)</label><textarea id="actWorksCustom" maxlength="3000" rows="4" placeholder="Дополнительная работа 1&#10;Дополнительная работа 2"></textarea></div>
 <label>Стоимость, сум</label><input id="actPrice" inputmode="numeric" autocomplete="off" required placeholder="Например, 500 000" oninput="formatActPrice(this)">
 ${masterChoiceMarkup('actGuarantee','Гарантия',masterGuarantees,'30')}
 <div id="actGuaranteeCustomWrap" style="display:none"><label>Свой срок гарантии, месяцев</label><input id="actGuaranteeMonths" inputmode="numeric" type="number" min="1" max="120" step="1" placeholder="Например, 12"></div>
 <div class="bt-master-address-row"><div><label>Дом *</label><input id="actHouse" required maxlength="80" value="${masterEsc(o?.house||'')}" placeholder="15А"></div><div><label>Квартира</label><input id="actApartment" maxlength="80" value="${masterEsc(o?.apartment||'')}" placeholder="42"></div></div>
 <button type="button" class="secondary" onclick="captureActLocation()">⌖ Указать текущую локацию</button><p id="actLocationStatus" class="subtitle">Для создания акта требуется локация. Нажмите кнопку и разрешите доступ к GPS.</p>
 <button type="button" class="secondary" onclick="masterPreviewDraftAct()">◫ Посмотреть черновик акта</button>
 <div id="btMasterActDraftPreview" class="bt-act-draft-preview" hidden></div>
 <button id="actSubmit" type="submit">▣ Создать акт</button><p id="actStatus" role="status" class="subtitle"></p></article></form>`);
 toggleActCustom('actDevice','actDeviceCustomWrap');toggleActCustom('actBrand','actBrandCustomWrap');renderMasterActWorks();
}
function formatActPrice(input){const digits=String(input.value||'').replace(/\D/g,'');input.value=digits?digits.replace(/\B(?=(\d{3})+(?!\d))/g,' '):'';}
let actGeoLocation=null;
function captureActLocation(){const status=document.getElementById('actLocationStatus');if(!navigator.geolocation){if(status)status.textContent='Браузер не поддерживает определение локации.';return;}if(status)status.textContent='Определяем локацию…';navigator.geolocation.getCurrentPosition(pos=>{actGeoLocation={latitude:pos.coords.latitude,longitude:pos.coords.longitude,accuracy:pos.coords.accuracy};if(status)status.textContent=`📍 Локация сохранена (точность около ${Math.round(pos.coords.accuracy)} м)`;},err=>{if(status)status.textContent=err.code===1?'Разрешите доступ к локации в браузере.':'Не удалось определить локацию. Повторите попытку — без GPS акт сохранить нельзя.';},{enableHighAccuracy:true,timeout:12000,maximumAge:60000});}
async function submitMasterAct(event,orderId){
 if(event){event.preventDefault();event.stopPropagation();}
 const btn=document.getElementById('actSubmit'),st=document.getElementById('actStatus');
 if(!btn||!st)return false;
 if(btn.disabled)return false;
 let payload=null;
 btn.disabled=true;btn.textContent='⌛ Создаём акт…';st.textContent='Сохраняем данные на сервере…';st.className='subtitle';
 try{
  const getChoice=(id,customId)=>{const v=document.getElementById(id)?.value||'';return v==='__other__'?document.getElementById(customId)?.value.trim():v;};
  const digits=document.getElementById('actPrice').value.replace(/\D/g,'');
  const guaranteeChoice=document.getElementById('actGuarantee').value;
  const months=guaranteeChoice==='custom'?Number(document.getElementById('actGuaranteeMonths').value):null;
  if(guaranteeChoice==='custom'&&(!Number.isInteger(months)||months<1||months>120))throw new Error('Укажите свой срок гарантии от 1 до 120 месяцев.');
  const works=masterSelectedWorks();
  payload={device:getChoice('actDevice','actDeviceCustom'),brand:getChoice('actBrand','actBrandCustom'),model:document.getElementById('actModel').value.trim(),works,price:Number(digits),guarantee_days:months===null?Number(guaranteeChoice):Math.min(months*30,3650),guarantee_scope:'',guarantee_exclusions:'',house:document.getElementById('actHouse').value.trim(),apartment:document.getElementById('actApartment').value.trim(),location:actGeoLocation};
  if(months!==null)payload.guarantee_months=months;
  if(orderId){payload.order_id=orderId;const linked=masterCache.orders.find(o=>String(o.id)===String(orderId));if(linked){payload.client_name=linked.client_name||'';payload.client_phone=linked.client_phone||'';}}
  else{payload.client_name=document.getElementById('actClientName').value.trim();payload.client_phone=document.getElementById('actClientPhone').value.trim();}
  if(!payload.device||!payload.brand||!payload.works.length||!payload.price||payload.price<=0)throw new Error('Заполните технику, бренд, работы и стоимость.');
  if(!payload.house)throw new Error('Укажите дом.');
  if(!payload.location||typeof payload.location.latitude!=='number'||typeof payload.location.longitude!=='number')throw new Error('Укажите GPS-локацию нажатием соответствующей кнопки.');
  const r=await masterApi('/api/master/act','POST',payload);
  window.RemontMobile?.clearDirty();
  st.textContent=r.message||`Акт № ${r.number||''} создан.`;st.className='notice';masterToast(st.textContent);
  // Не скачиваем PDF автоматически: мастер открывает его в разделе «Акты».
  try{await showMasterActs();}catch(e){st.textContent='Акт создан, но список не обновился. Откройте «Все акты». Через кнопку создавать его повторно не нужно.';}
 }catch(e){
   const networkFailure=(typeof navigator!=='undefined'&&navigator.onLine===false)||/failed to fetch|networkerror|load failed|fetch failed/i.test(String(e.message||''));
   if(networkFailure&&payload&&typeof queueOperation==='function'){
     const offline={event:'offline_create_act',client_name:payload.client_name||'',client_phone:payload.client_phone||'',device:payload.device,brand:payload.brand,model:payload.model||'—',works:payload.works,price:payload.price,guarantee_days:payload.guarantee_days,guarantee_months:payload.guarantee_months,house:payload.house,apartment:payload.apartment,location:{lat:payload.location.latitude,lon:payload.location.longitude},order_id:payload.order_id||'',local_registration_id:(typeof getLocalRegistrationId==='function'?getLocalRegistrationId():'')};
     queueOperation(offline);st.textContent='Сервер недоступен. Акт помещён в очередь и пока НЕ создан на сервере.';st.className='notice';btn.textContent='▣ Акт ожидает отправки';btn.disabled=true;
   }else{st.textContent=e.message||'Не удалось создать акт.';st.className='error';btn.textContent='▣ Повторить создание акта';btn.disabled=false;}
 }
 return false;
}
async function showMasterPromos(){
  try{await loadMasterData()}catch(e){return masterShell('Промокоды',`<article class="card error">${masterEsc(e.message)}</article>`)}
  const money=n=>new Intl.NumberFormat('ru-RU').format(Number(n||0))+' сум';
  const rows=masterCache.promos.map(p=>{
    const st=p.stats||{};
    return `<article class="card bt-promo-detail-card"><div class="card-row"><b>${masterEsc(p.code)}</b><span class="status-pill">${p.active?'Активен':p.awaiting_master_activation?'Ожидает активации':p.disabled_by_admin?'Отключён администратором':'Отключён'}</span></div>
      <p>${masterEsc(p.partner_name||'Рекламодатель')} · ${masterEsc(p.partner_contact||'')}</p>
      <p>Скидка клиенту: ${masterEsc(p.discount_percent)}% · вознаграждение: ${masterEsc(p.reward_percent)}%</p>
      <details class="bt-promo-details"><summary>Посмотреть подробности промокода <span>⌄</span></summary>
       <div class="bt-promo-stats">
        <p><b>Рекламодатель:</b> ${masterEsc(p.partner_name||'—')}</p>
        <p><b>Telegram:</b> ${masterEsc(p.partner_contact||'—')}</p>
        <p><b>Телефон:</b> ${masterEsc(p.partner_phone||'Не указан')}</p>
        <p><b>Карта для выплат:</b> ${p.card_last4?'•••• '+masterEsc(p.card_last4):'Не указана'}</p>
        <p><b>Кабинет рекламодателя:</b> ${p.advertiser_linked?'Создан':'Не привязан'}</p>
        <p><b>Создан:</b> ${masterEsc(p.created_at||'—')}</p>
        <p><b>Действует до:</b> ${masterEsc(p.expires_at||'Без срока')}</p>
        <p><b>Использований на клиента:</b> ${masterEsc(p.max_uses_per_client??p.max_activations??'Без лимита')}</p>
        <p><b>Регистраций по ссылке:</b> ${masterEsc(st.link_registrations||0)}</p>
        <p><b>Активаций:</b> ${masterEsc(st.unique_clients||0)}</p>
        <p><b>Актов со скидкой:</b> ${masterEsc(st.applied_count||0)}</p>
        <p><b>Завершённых ремонтов:</b> ${masterEsc(st.completed_count||0)}</p>
        <p><b>Сумма скидок:</b> ${money(st.total_discount)}</p>
        <p><b>Вознаграждение начислено:</b> ${money(st.total_reward)}</p>
        <p><b>Выплачено:</b> ${money(st.paid_to_partner)}</p>
        <p><b>К выплате:</b> ${money(st.balance_due)}</p>
       </div></details>${Number(st.balance_due)>0 && p.advertiser_linked?`<button type="button" class="bt-payout-action" onclick="showMasterPayout('${masterEsc(p.code)}')">💳 Выплатить рекламодателю · ${money(st.balance_due)}</button>`:''}${!p.active&&p.awaiting_master_activation?`<button type="button" onclick="activateMasterPromo('${masterEsc(p.code)}')">✓ Активировать промокод</button>`:''}</article>`;
  }).join('');
  masterShell('Промокоды',`<button onclick="showCreateMasterPromo()">＋ Создать промокод</button><div class="stack-list">${rows||'<article class="card">Промокодов пока нет.</article>'}</div>`);
}
let btMasterPayoutRequestId='';
async function showMasterPayout(code){
 btMasterLastPayoutCode=code;
 try{await loadMasterData();}catch(e){return masterToast(e.message,true)}
 const promo=masterCache.promos.find(x=>x.code===code);
 if(!promo)return masterToast('Промокод не найден.',true);
 const balance=Math.max(0,Math.floor(Number(promo.stats?.balance_due||0)));
 if(!balance)return masterToast('Задолженности по этому промокоду нет.',true);
 btMasterPayoutRequestId=(typeof crypto!=='undefined'&&crypto.randomUUID)?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2).padEnd(24,'0')}`;
 masterShell('Выплата рекламодателю',`<article class="card"><h2>${masterEsc(code)}</h2>
  <p><b>Рекламодатель:</b> ${masterEsc(promo.partner_name||'—')}</p>
  <p><b>Карта:</b> ${promo.card_last4?'•••• '+masterEsc(promo.card_last4):'Уточните реквизиты'}</p>
  <p><b>Задолженность:</b> ${new Intl.NumberFormat('ru-RU').format(balance)} сум</p>
  <p class="subtitle">Переведите деньги рекламодателю через свой банк. ТехСервис не списывает деньги с карты.
  После перевода укажите сумму и прикрепите скриншот/фото чека.</p>
  <form class="bt-payout-row" onsubmit="event.preventDefault();submitMasterPayout('${masterEsc(code)}')">
   <label>Сумма перевода, сум</label><input id="btPayoutAmount" required inputmode="numeric" pattern="[0-9 ]*" value="${balance}" data-max="${balance}">
   <label>Чек перевода (JPG/PNG, до 4 МБ)</label><input type="file" id="btPayoutReceipt" required accept="image/jpeg,image/png">
   <button type="submit" id="btPayoutSubmit">Подтвердить выплату с чеком</button>
   <p id="btPayoutStatus" role="status" class="subtitle"></p>
  </form><button class="back-btn" type="button" onclick="showMasterPromos()">← Промокоды</button></article>`);
}
async function submitMasterPayout(code){
 const btn=document.getElementById('btPayoutSubmit'),st=document.getElementById('btPayoutStatus');
 const amount=Number((document.getElementById('btPayoutAmount')?.value||'').replace(/\s/g,''));
 const maximum=Number(document.getElementById('btPayoutAmount')?.dataset?.max||0);
 const file=document.getElementById('btPayoutReceipt')?.files?.[0];
 if(!Number.isSafeInteger(amount)||amount<1||amount>maximum){st.textContent='Укажите сумму от 1 до остатка задолженности.';return;}
 if(!file||!['image/jpeg','image/png'].includes(file.type)||file.size>4*1024*1024){st.textContent='Прикрепите JPG или PNG до 4 МБ.';return;}
 if(!confirm(`Вы действительно перевели ${new Intl.NumberFormat('ru-RU').format(amount)} сум рекламодателю?`))return;
 btn.disabled=true;st.textContent='Загружаем чек в Telegram и сохраняем выплату…';st.className='subtitle';
 try{
    const reader=new FileReader();const content=await new Promise((resolve,reject)=>{
        reader.onload=()=>resolve(String(reader.result||'').split(',')[1]||'');
        reader.onerror=()=>reject(new Error('Чек не удалось прочитать.'));
        reader.readAsDataURL(file);
    });
    const res=await masterApi('/api/master/payout-with-receipt','POST',{
        code,amount,mime_type:file.type,data:content,request_id:btMasterPayoutRequestId
    });
    st.textContent=res.message||'Выплата сохранена.';st.className='notice';
    btn.textContent='✓ Выплата записана';
    await loadMasterData();
 }catch(e){st.textContent=e.message;st.className='error';btn.disabled=false;}
}
async function activateMasterPromo(code){
 if(!confirm(`Активировать промокод ${code}? После активации только администратор сможет его отключить.`))return;
 try{const result=await masterApi(`/api/master/promos/${encodeURIComponent(code)}/activate`,'POST',{});masterToast(result.message||'Промокод активирован');await showMasterPromos();}
 catch(e){masterToast(e.message,true)}
}
function showCreateMasterPromo(){masterShell('Новый промокод',`<button class="back-btn" onclick="showMasterPromos()">← Назад</button><form class="card" onsubmit="event.preventDefault();submitMasterPromo()"><label>Код</label><input id="pCode" required maxlength="20" pattern="[A-Za-z0-9_-]{4,20}" placeholder="PARTNER10"><label>Имя партнёра</label><input id="pName" required maxlength="150"><label>Telegram партнёра</label><input id="pContact" required maxlength="150" placeholder="@username"><label>Телефон рекламодателя</label><input id="pPartnerPhone" required type="tel" placeholder="+998901234567"><label>Номер карты</label><input id="pCard" required inputmode="numeric" maxlength="23" placeholder="16–19 цифр"><label>Скидка клиенту, %</label><input id="pDiscount" required type="number" min="1" max="50" value="5"><label>Вознаграждение партнёру, %</label><input id="pReward" required type="number" min="0" max="30" value="5"><label>Использований на клиента</label><input id="pLimit" required type="number" min="1" max="100" value="1"><label>Действует до</label><input id="pExpiry" required type="date" value="${new Date(Date.now()+30*86400000).toISOString().slice(0,10)}"><button type="submit" id="promoSubmit">Создать промокод</button><p id="promoStatus" class="subtitle"></p></form>`);}
async function submitMasterPromo(){const btn=document.getElementById('promoSubmit'),st=document.getElementById('promoStatus');btn.disabled=true;try{const r=await masterApi('/api/master/promo','POST',{code:document.getElementById('pCode').value.trim().toUpperCase(),partner_name:document.getElementById('pName').value.trim(),partner_contact:document.getElementById('pContact').value.trim(),partner_phone:document.getElementById('pPartnerPhone').value.trim(),partner_card:document.getElementById('pCard').value.replace(/\D/g,''),discount_percent:Number(document.getElementById('pDiscount').value),reward_percent:Number(document.getElementById('pReward').value),max_act:Number(document.getElementById('pLimit').value),expires_at:document.getElementById('pExpiry').value+'T23:59:59'});st.textContent=r.message;await showMasterPromos();}catch(e){st.textContent=e.message;st.className='error';btn.disabled=false;}}
function showCreateAct(){const accepted=masterCache.orders.find(o=>o.status==='accepted'&&!o.act_number);if(accepted)return showMasterCreateAct(accepted.id);return renderMasterActForm(null);}
function showCreatePromoForm(){showCreateMasterPromo();}
function sendEvent(){showAlert('Это действие теперь выполняется в мастерской панели. Выберите раздел в меню.');return false;}
bootMasterApp();

async function showMasterProfile(){
  try{await loadMasterData()}catch(e){return masterShell('Настройки профиля',`<article class="card error">${masterEsc(e.message)}</article>`)}
  const p=masterCache.profile||{},r=p.referral_settings||{};
  const reviews=!!p.show_reviews;
  const localEnabled=r.master_enabled!==undefined?!!r.master_enabled:(r.enabled!==false);
  const adminEnabled=r.admin_enabled!==false;
  masterShell('Настройки профиля',`<article class="card settings-intro"><h2>Профиль мастера</h2><p class="subtitle">Переключатели сохраняются сразу после нажатия. Остальные поля сохраняются кнопкой ниже.</p></article>
  <form class="stack-list" onsubmit="event.preventDefault();saveMasterSettings()">
  <article class="card"><label for="masterProfileName">Имя мастера</label><input id="masterProfileName" maxlength="100" required value="${masterEsc(p.name||'')}"><label for="masterProfilePhone">Телефон</label><input id="masterProfilePhone" maxlength="40" value="${masterEsc(p.phone||'')}" placeholder="+998…"></article>
  <article class="card"><h2>Отзывы</h2><p class="subtitle">Показывать отзывы в публичном профиле мастера.</p><label class="toggle-row bt-setting-toggle"><span>Показывать отзывы</span><input id="masterShowReviews" type="checkbox" ${reviews?'checked':''} onchange="btSaveMasterToggle(this,'reviews')"></label><p id="masterReviewsToggleState" class="subtitle" role="status">${reviews?'Отзывы включены':'Отзывы скрыты'}</p></article>
  <article class="card"><h2>Реферальная программа</h2><p class="subtitle">Рефералы работают отдельно от промокодов. Настройка мастера и разрешение администратора проверяются сервером.</p>
  <label class="toggle-row bt-setting-toggle"><span>Разрешить рефералы моим клиентам</span><input id="masterReferralEnabled" type="checkbox" ${localEnabled?'checked':''} onchange="btSaveMasterToggle(this,'referrals')"></label>
  <p id="masterReferralToggleState" class="subtitle" role="status">${!adminEnabled?'⛔ Администратор отключил программу для всех. Ваша галочка сохраняется, но клиенты не увидят ссылку, пока администратор не включит программу.':localEnabled?'✅ Программа доступна клиентам, привязанным к вам.':'Рефералы выключены — клиенты не увидят кнопку приглашения.'}</p>
  <label>Скидка новому клиенту, %</label><input id="masterReferralDiscount" type="number" min="0" max="100" step="0.5" value="${Number(r.new_client_discount_percent??5)}">
  <label>Вознаграждение пригласившему, %</label><input id="masterReferralReward" type="number" min="0" max="100" step="0.5" value="${Number(r.referrer_reward_percent??5)}">
  <label>Приглашений в одной партии</label><input id="masterReferralInvites" type="number" min="1" max="100" step="1" value="${Number(r.invites_per_batch??10)}">
  </article><article class="card"><button id="masterSettingsSave" type="submit">Сохранить остальные настройки</button><p id="masterSettingsStatus" class="subtitle" role="status"></p></article></form>
  <button class="bt-master-support-entry" type="button" onclick="showMasterSupport()">💬 Написать в поддержку</button>`);
}
async function btSaveMasterToggle(el,kind){
  const old=!el.checked,desired=!!el.checked;
  const status=document.getElementById(kind==='reviews'?'masterReviewsToggleState':'masterReferralToggleState');
  el.disabled=true;
  if(status){status.textContent='Сохраняем…';status.className='subtitle'}
  try{
    const body=kind==='reviews'?{show_reviews:desired}:{referral_settings:{enabled:desired}};
    const result=await masterApi('/api/master/settings','POST',body);
    if(!masterCache.profile)masterCache.profile={};
    window.RemontMobile?.clearDirty();
    if(kind==='reviews')masterCache.profile.show_reviews=desired;
    else masterCache.profile.referral_settings={...(masterCache.profile.referral_settings||{}),master_enabled:desired,enabled:desired};
    if(status){status.textContent=kind==='reviews'?(desired?'Отзывы включены и сохранены':'Отзывы скрыты и сохранены'):(desired?(masterCache.profile?.referral_settings?.admin_enabled===false?'Галочка сохранена, но администратор отключил программу. Клиентской кнопки пока не будет.':'Рефералы включены. Клиенты с привязкой к вам увидят ссылку.'):'Рефералы отключены: клиентская кнопка приглашения скрыта');status.className='notice'}
  }catch(e){
    el.checked=old;
    if(status){status.textContent='Не удалось сохранить: '+e.message;status.className='error'}
  }finally{el.disabled=false}
}
async function saveMasterSettings(){
  const btn=document.getElementById('masterSettingsSave'),st=document.getElementById('masterSettingsStatus');
  if(!btn||!st)return;
  btn.disabled=true;st.textContent='Сохраняем…';st.className='subtitle';
  const data={name:document.getElementById('masterProfileName').value.trim(),phone:document.getElementById('masterProfilePhone').value.trim(),referral_settings:{new_client_discount_percent:Number(document.getElementById('masterReferralDiscount').value),referrer_reward_percent:Number(document.getElementById('masterReferralReward').value),invites_per_batch:Number(document.getElementById('masterReferralInvites').value)}};
  try{
    const r=await masterApi('/api/master/settings','POST',data);
    if(!masterCache.profile)masterCache.profile={};
    masterCache.profile.name=data.name;masterCache.profile.phone=data.phone;
    masterCache.profile.referral_settings={...(masterCache.profile.referral_settings||{}),...data.referral_settings};
    window.RemontMobile?.clearDirty();
    st.textContent=r.message||'Настройки сохранены';st.className='notice';
  }catch(e){st.textContent=e.message;st.className='error'}finally{btn.disabled=false}
}
function showMasterSupport(){
  masterShell('Написать в поддержку',`<article class="card"><h2>💬 Поддержка ТехСервис</h2><p class="subtitle">Опишите вопрос или проблему. Сообщение сохранится на сервере и будет передано администратору.</p>
  <label for="masterSupportMessage">Ваше сообщение</label><textarea id="masterSupportMessage" rows="6" maxlength="1500" placeholder="Что не работает? Что требуется исправить?"></textarea>
  <button type="button" id="masterSupportSend" onclick="sendMasterSupport()">Отправить в поддержку</button><p id="masterSupportStatus" class="subtitle" role="status"></p>
  <button class="secondary" type="button" onclick="renderMasterMenu()">← На главную</button></article>`);
}
async function sendMasterSupport(){
  const message=document.getElementById('masterSupportMessage')?.value.trim()||'',status=document.getElementById('masterSupportStatus'),btn=document.getElementById('masterSupportSend');
  if(message.length<5){if(status){status.textContent='Опишите вопрос минимум пятью символами.';status.className='error'}return;}
  btn.disabled=true;if(status){status.textContent='Отправка…';status.className='subtitle'}
  try{
    const response=await masterApi('/api/master/support','POST',{message});
    if(status){status.textContent=response.message||'Обращение принято';status.className='notice'}
    document.getElementById('masterSupportMessage').value='';
  }catch(e){if(status){status.textContent=e.message;status.className='error'}btn.disabled=false}
}


async function showMasterMarketingLink(){
  try{await loadMasterData()}catch(e){return masterShell('Рекламная ссылка',`<article class="card error">${masterEsc(e.message)}</article>`)}
  const p=masterCache.profile||{};
  masterShell('Рекламная ссылка',`<article class="card"><h2>Ссылка вашей мастерской</h2><p class="subtitle">Укажите название мастерской. Ссылка будет вести клиентов именно к вам.</p><label for="marketingShopName">Название мастерской / рекламное название</label><input id="marketingShopName" maxlength="80" required value="${masterEsc(p.marketing_name||'')}" placeholder="Например, Master Aziz"><button onclick="saveMasterMarketingLink()">Сохранить и получить ссылку</button><div id="marketingLinkResult" class="stack-list"></div></article>`)
}
async function saveMasterMarketingLink(){
 const name=(document.getElementById('marketingShopName')?.value||'').trim(); const out=document.getElementById('marketingLinkResult');
 if(name.length<2){out.textContent='Введите название не короче двух символов.';return;}
 try{const saved=await masterApi('/api/master/settings','POST',{marketing_name:name}); const d=await masterApi('/api/master/marketing-link');
  if (String(d.master_id||'') !== String(masterCurrentUserId||'')) throw new Error('Ошибка: ссылка создана для другого мастера. Обновите кабинет.');
  masterCache.profile.marketing_name=name; out.innerHTML=`<p><b>${masterEsc(name)}</b> · ${masterEsc(d.public_name||'')}</p><input id="masterMarketingUrl" readonly value="${masterEsc(d.url)}"><button onclick="navigator.clipboard.writeText(document.getElementById('masterMarketingUrl').value).then(()=>masterToast('Ссылка скопирована')).catch(()=>document.getElementById('masterMarketingUrl').select())">Копировать ссылку</button><p class="subtitle">Отправьте эту ссылку клиентам. Переход закрепляется за вашим профилем мастера.</p>`;masterToast(saved.message||'Ссылка готова');}catch(e){out.textContent=e.message;}
}
