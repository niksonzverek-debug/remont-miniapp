
/* Versioned legal terms acknowledgement. Server is the authority. */
let btLegalApproved = false;
let btLegalChecking = false;
async function btLegalGate(api, onSuccess, role){
  if(btLegalApproved){onSuccess();return;}
  if(btLegalChecking)return;
  btLegalChecking=true;
  try{
    const status=await api('/api/legal/status');
    if(status.accepted){btLegalApproved=true;onSuccess();return;}
    btLegalDialog(api,onSuccess,role,status.version);
  }catch(e){
    alert('Не удалось проверить условия использования. Проверьте подключение и повторите попытку. '+(e.message||''));
  }finally{btLegalChecking=false;}
}
function btLegalDialog(api,onSuccess,role,version){
  document.getElementById('btLegalOverlay')?.remove();
  const uz=String(document.documentElement.lang||localStorage.getItem('remont_lang')||'ru').toLowerCase().startsWith('uz');
  const div=document.createElement('div');div.id='btLegalOverlay';div.className='bt-legal-overlay';
  div.innerHTML=`<section class="bt-legal-dialog" role="dialog" aria-modal="true" aria-label="${uz?'Foydalanish shartlari':'Условия использования'}">
   <img class="bt-legal-logo" src="img/remont-bt-icon.png" alt="ТехСервис">
   <div class="bt-legal-shield">🛡️</div><h2>${uz?'TehServis foydalanish shartlari':'Условия использования ТехСервис'}</h2>
   <p>${uz?'TehServis mijozlar va mustaqil ustalar uchun raqamli vositalarni taqdim etadi.':'ТехСервис предоставляет цифровые инструменты клиентам и независимым мастерам.'}</p>
   <div class="bt-legal-facts"><p>🔧 ${uz?'Usta ta’mirlash sifati, kafolat, to‘lov va o‘z soliqlari uchun javob beradi.':'Мастер самостоятельно отвечает за качество ремонта, гарантии, расчёты и свои налоги.'}</p>
   <p>💠 ${uz?'Platforma operatori o‘z xizmatlari va qonuniy majburiyatlari uchun javobgar.':'Оператор отвечает за работу платформы и собственные обязательства по закону.'}</p>
   <p>🔒 ${uz?'Ma’lumotlar maxfiylik siyosatiga muvofiq qayta ishlanadi.':'Данные обрабатываются согласно политике конфиденциальности.'}</p></div>
   <a class="bt-legal-read" href="legal.html" target="_blank" rel="noopener">📄 ${uz?'To‘liq shartlar va maxfiylik siyosatini o‘qish':'Прочитать полные условия и политику данных'} ↗</a>
   <p class="bt-legal-version">${uz?'Tahrir':'Редакция'}: ${version}</p>
   <button class="bt-legal-accept" type="button">${uz?'Tanishdim va roziman':'Ознакомлен и согласен'}</button>
   <button class="bt-legal-later" type="button">${uz?'Hozir emas':'Не согласен / Назад'}</button>
   <p class="bt-legal-error" role="status"></p>
   </section>`;
  document.body.appendChild(div);
  div.querySelector('.bt-legal-later').onclick=()=>div.remove();
  div.querySelector('.bt-legal-accept').onclick=async()=>{
    const button=div.querySelector('.bt-legal-accept'),error=div.querySelector('.bt-legal-error');
    button.disabled=true;error.textContent='';
    try{await api('/api/legal/accept','POST',{version,accepted:true});btLegalApproved=true;div.remove();onSuccess();}
    catch(e){error.textContent=e.message||'Не удалось сохранить согласие';button.disabled=false;}
  };
}

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
const masterActStatusLabels={sending:'Отправляется',sent:'Отправлен клиенту',pending:'Ожидает привязки',pending_client:'Ожидает регистрации клиента',pending_delivery:'Ожидает доставки',confirmed:'Подтверждён клиентом',confirmed_automatic:'Подтверждён автоматически',cancelled:'Отменён',draft:'Черновик'};
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
function btMasterActPaymentLabel(status){return status==='paid'?'✓ Оплачено':status==='unpaid'?'Не оплачено':'Оплата не указана';}
let btMasterPaymentSaving=false;
async function btMasterSaveActPayment(number,status){
 if(btMasterPaymentSaving)return;
 btMasterPaymentSaving=true;
 try{
  await masterApi(`/api/master/acts/${encodeURIComponent(String(number))}/payment-status`,'POST',{status});
  const act=masterCache.acts.find(a=>String(a.number)===String(number));
  if(act)act.payment_status=status;
  masterToast('Статус оплаты сохранён');
  previewMasterAct(number);
 }catch(e){masterToast(e.message||'Не удалось сохранить статус',true)}
 finally{btMasterPaymentSaving=false;}
}
function btMasterAskPayment(number){
 btMasterLastActNumber=number;
 masterShell('Оплата по акту',`<article class="card"><h2>Акт № ${masterEsc(number)} создан</h2><p>Клиент оплатил выполненную работу?</p>
 <div class="button-row"><button type="button" onclick="btMasterSaveActPayment('${masterEsc(number)}','paid')">Да, оплатил</button><button type="button" class="secondary" onclick="btMasterSaveActPayment('${masterEsc(number)}','unpaid')">Нет, ещё не оплатил</button></div>
 <button type="button" class="back-btn" onclick="showMasterActs()">Ответить позже</button></article>`);
}
async function previewMasterAct(number){
 btMasterLastActNumber=number;
 clearMasterPdfUrl();
 masterShell('Просмотр акта',`<article class="card"><h2>Акт № ${masterEsc(number)}</h2>
 <p class="subtitle">Содержимое акта отображается сразу. PDF откроется в просмотрщике телефона или браузере.</p>
 ${masterActSummary(number)}<div class="card"><p><b>Оплата:</b> ${masterEsc(btMasterActPaymentLabel(masterCache.acts.find(a=>String(a.number)===String(number))?.payment_status))}</p>
 ${!['paid','unpaid'].includes(masterCache.acts.find(a=>String(a.number)===String(number))?.payment_status)?`<div class="button-row"><button type="button" onclick="btMasterSaveActPayment('${masterEsc(number)}','paid')">✓ Оплачено</button><button type="button" class="secondary" onclick="btMasterSaveActPayment('${masterEsc(number)}','unpaid')">Не оплачено</button></div>`:'<p class="subtitle">Ответ мастера зафиксирован и не подлежит изменению.</p>'}</div>
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
  const marketing=await masterApi('/api/master/marketing-link');
  const registrationUrl=String(marketing.url||'');
  if(!/^https:\/\/t\.me\/[A-Za-z0-9_]+\?start=m_[0-9]+$/.test(registrationUrl))throw new Error('Не удалось получить ссылку регистрации мастера.');
  const text=`🧾 Акт № ${number} — ТехСервис\n\n📄 Нажмите, чтобы открыть акт (24 часа):\n${url}\n\n📱 Нажмите, чтобы открыть ТехСервис и пройти регистрацию у мастера:\n${registrationUrl}`;
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);masterToast('Текст акта и ссылка регистрации скопированы.');}
  else window.prompt('Скопируйте сообщение с актом и регистрацией:',text);
 }catch(e){masterToast(e.message,true)}
}
async function shareMasterAct(number){
 try{
  // Telegram share/url cannot encode hidden hyperlinks. The bot sends an HTML
  // message with two real text links; forwarding preserves their formatting.
  const result=await masterApi(`/api/master/acts/${encodeURIComponent(String(number))}/share-message`,'POST',{public_base:masterApiBase});
  masterToast(result.message||'Сообщение отправлено в чат с ботом. Перешлите его клиенту.');
  // Open the bot chat where the formatted, forwardable message was delivered.
  if(result.chat_url && /^https:\/\/t\.me\/[A-Za-z0-9_]+$/.test(result.chat_url)){
   const app=window.Telegram?.WebApp;
   if(app && typeof app.openTelegramLink==='function') app.openTelegramLink(result.chat_url);
   else window.open(result.chat_url,'_blank','noopener,noreferrer');
  }
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
   'Моя ссылка для клиентов':()=>showMasterInviteLink(),
   'Моя ссылка для оплаты':()=>showMasterPaymentQr(),
   'Мой депозит':()=>showMasterFinance(),
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
     ${home?`<button type="button" class="bt-master-deposit-link bt-header-deposit" onclick="showMasterFinance()" aria-label="Открыть мой депозит"><span>Мой депозит</span><strong id="btMasterHomeDepositValue">Загружаем…</strong><span aria-hidden="true">›</span></button>`:''}
   </header><section id="masterContent">${home?'':`<h1 class="bt-screen-heading">${masterEsc(title)}</h1>`}${body}</section>
   <nav class="master-bottom-nav"><button onclick="renderMasterMenu()"><span>⌂</span><small>Главная</small></button><button id="btMasterOrdersNav" onclick="showMasterOrders()"><span>▤</span><small>Заказы</small></button><button id="btMasterChatsNav" onclick="showMasterMessages()"><span>✉</span><small>Чаты</small></button><button onclick="showMasterProfile()"><span>◎</span><small>Профиль</small></button></nav><p id="masterToast" class="subtitle" role="status"></p></main>`;
  // Reuse the existing language control; only move it into the master header.
  // ui-language.js recreates it after document.body.innerHTML is replaced.
  setTimeout(() => {
    const header = document.querySelector('.master-app .bt-master-header');
    const languageWidget = document.getElementById('remontLangToggle');
    if (header && languageWidget && !header.contains(languageWidget)) header.appendChild(languageWidget);
  }, 0);
  btUpdateMasterAttention();
  window.scrollTo({top:0,left:0,behavior:'instant'});
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
  // The super-admin (450540408) is authorized server-side to use the
  // existing master profile (8159262843). The API still authenticates the
  // actual Telegram session; this only avoids rejecting its canonical owner ID.
  const returnedMasterId=String(dash.authenticated_master_id||'');
  const isAuthorizedOwnerAlias=(expectedId==='450540408' && returnedMasterId==='8159262843');
  if (expectedId && returnedMasterId !== expectedId && !isAuthorizedOwnerAlias) {
    localStorage.removeItem('remontBT.master.session.v1');
    throw new Error('Кабинет открыт под другим Telegram ID. Откройте новую кнопку кабинета из чата с ботом.');
  }
  masterCurrentUserId=String(dash.authenticated_master_id||'');
  masterCache={...masterCache,profile:dash.profile,stats:dash.stats,orders:orders.orders||[],clients:clients.clients||[],messages:messages.messages||[],acts:acts.acts||[],promos:promos.promocodes||[]};
  btUpdateMasterAttention();
  btStartMasterAttention();
  return masterCache;
}
// Dashboard deposit is informational; issuance is also checked immediately before opening the form.
let btMasterFinanceSnapshot = null;
function btMasterDepositValue(d){
  if (!d || typeof d !== 'object') return null;
  const v = d.available_tiyin ?? d.balance_tiyin;
  return v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
}
function btMasterMoney(tiyin){
  return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(Number(tiyin)/100);
}
function btMasterDepositShortage(tiyin){
  return 'Депозит исчерпан. Пополните баланс для продолжения выдачи актов. Не хватает '+btMasterMoney(Math.abs(tiyin))+' сум.';
}
async function btMasterRefreshDeposit(){
  try{
    const d=await masterApi('/api/master/finance');
    btMasterFinanceSnapshot=btMasterDepositValue(d);
  }catch(_){ btMasterFinanceSnapshot=null; }
  const balance=document.getElementById('btMasterHomeDepositValue');
  if(balance) balance.textContent=btMasterFinanceSnapshot===null?'Баланс недоступен':btMasterMoney(btMasterFinanceSnapshot)+' сум';
  const button=document.getElementById('btMasterHomeCreateAct');
  if(button){
    const locked=btMasterFinanceSnapshot!==null&&btMasterFinanceSnapshot<0;
    button.textContent=locked?'🔒 Создать акт':'＋ Создать акт';
    button.setAttribute('aria-label',locked?btMasterDepositShortage(btMasterFinanceSnapshot):'Создать акт');
  }
}
async function btMasterCanOpenAct(){
  // Always refresh the value: the balance may have changed since the dashboard rendered.
  try{
    const d=await masterApi('/api/master/finance');
    btMasterFinanceSnapshot=btMasterDepositValue(d);
  }catch(_){btMasterFinanceSnapshot=null; /* Existing server-side issuance policy remains authoritative. */}
  if(btMasterFinanceSnapshot!==null&&btMasterFinanceSnapshot<0){
    const message=btMasterDepositShortage(btMasterFinanceSnapshot);
    masterToast(message,true);
    if(typeof showAlert==='function')showAlert(message);
    return false;
  }
  return true;
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
  if(!btLegalApproved){void btLegalGate(masterApi,renderMasterMenu,"master");return;}
  try { await loadMasterData(); } catch(e) { masterShell('Панель мастера',`<article class="card error">${masterEsc(e.message)}</article>`); return; }
  const s=masterCache.stats||{};
  masterShell('Панель мастера',`${btMasterOldOrders().length?`<div class="card bt-overdue-orders"><b>⚠ Заявки ожидают более двух часов: ${btMasterOldOrders().length}</b><p class="subtitle">Проверьте очередь новых обращений.</p><button type="button" onclick="showMasterOrders()">Открыть ожидающие заявки</button></div>`:''}
  <button class="bt-master-new-orders ${Number(s.new_orders)>0?'bt-attention-urgent':''}" onclick="showMasterOrders()"><span><b>⚡ Новые заявки</b><small>Ожидают принятия</small></span><span class="count-bubble">${s.new_orders||0}</span></button>
  <button id="btMasterHomeCreateAct" class="bt-master-primary bt-red-action" onclick="showCreateAct()">＋ Создать акт</button>
  <div class="master-action-grid bt-master-feature-grid bt-six-tiles">
    <button class="menu-btn" onclick="showMasterOrders()"><span class="emoji">▤</span><b>Заявки</b><small>Все обращения</small></button>
    <button class="menu-btn" onclick="showMasterActs()"><span class="emoji">▧</span><b>Акты</b><small>Документы</small></button>
    <button class="menu-btn" onclick="showMasterClients()"><span class="emoji">♙</span><b>Клиенты</b><small>Контакты</small></button>
    <button class="menu-btn" onclick="showMasterPromos()"><span class="emoji">◇</span><b>Промокоды</b><small>Скидки</small></button>
    <button class="menu-btn" onclick="showMasterFinanceReport()"><span class="emoji">▥</span><b>Финансы</b><small>Отчёт</small></button>
    <button class="menu-btn" onclick="showMasterInviteLink()"><span class="emoji">↗</span><b>Моя ссылка</b><small>Для клиентов</small></button>
    <button class="menu-btn" onclick="showMasterPaymentQr()"><span class="emoji">▦</span><b>Paynet Xolis</b><small>Ссылка для оплаты</small></button>

    <button class="menu-btn" onclick="showMasterFAQ()"><span class="emoji">♧</span><b>F.A.Q.</b><small>Помощь</small></button>
    <button class="menu-btn" onclick="showMasterSupport()"><span class="emoji">✉</span><b>Поддержка</b><small>Написать администратору</small></button>
  </div>
  <section class="bt-master-message-panel ${Number(s.unread_messages)>0?'bt-attention-urgent':''}" aria-label="Последние сообщения">
    <div class="bt-recent-head"><button type="button" class="bt-recent-all" onclick="showMasterMessages()"><b>✉ Последние сообщения</b><small>Все чаты →</small></button><span class="count-bubble">${s.unread_messages||0}</span></div>
    <div id="btMasterRecentThreads" class="bt-recent-list">${btMasterRecentThreadsMarkup()}</div>
  </section>`);
  void btMasterRefreshDeposit();
}
function showMasterFAQ(){
 const ru=[["Как зарегистрироваться мастером?", "Откройте приложение мастера в Telegram, заполните ФИО, телефон и остальные обязательные данные. Отправьте заявку на рассмотрение; после одобрения откроется кабинет."], ["Какие два способа создать заявку?", "Первый: открыть соответствующий раздел в кабинете и заполнить заявку. Второй: отправить или переслать геолокацию клиента прямо в чат бота и продолжить оформление через предложенные кнопки."], ["ВАЖНО: как быстро оформить заявку через локацию?", "Когда клиент прислал Вам геолокацию, перешлите её боту. Или сами отправьте точку в чат бота. Бот предложит продолжить оформление. Это удобно при обращении по телефону или в личной переписке; сама локация ещё не создаёт готовую заявку."], ["Как принимать заявки?", "В разделе «Заявки» откройте новое обращение, проверьте сведения и нажмите «Принять». Не принимайте заявки, которые не сможете выполнить."], ["Как открыть маршрут?", "В принятой заявке нажмите «Показать маршрут», если сохранены координаты или адрес. Перед выездом уточните точный адрес у клиента."], ["Как связаться с клиентом?", "Откройте чат из заявки или раздел «Чаты»; уточните неисправность, время и адрес."], ["Как создать акт по заявке?", "Откройте принятую заявку → «Создать акт», заполните работы, детали, стоимость, гарантию и обязательные поля, проверьте итоговую сумму."], ["Как создать акт без заявки?", "На главной выберите «Создать акт» и укажите имя и телефон клиента, технику, работы, стоимость, гарантию и адрес. Такой вариант подходит для обращений лично или по телефону."], ["Как учитываются скидки?", "Если у найденного клиента действует промокод или реферальная скидка, предварительная итоговая сумма показывается над кнопкой «Создать акт». При выдаче акта сервер пересчитывает сумму по действующим правилам."], ["Что означает кнопка «Создать акт»?", "Нажатие подтверждает получение оплаты за ремонт согласно предупреждению в форме. Перед нажатием проверьте данные и сумму."], ["Где посмотреть акт и гарантию?", "Откройте «Акты», выберите нужный документ и PDF. В нём зафиксированы работы, стоимость и гарантийные условия."], ["Как исправить акт?", "Откройте акт и отправьте запрос на исправление, если функция доступна. Не создавайте повторный акт взамен уже выданного."], ["Как клиент подтверждает акт?", "Клиент может подтвердить акт в доступном интерфейсе. Если он не отвечает, предусмотрено автоматическое подтверждение по настроенному сроку."], ["Как клиент оставляет отзыв?", "После ремонта клиенту доступно приглашение оценить работу. Попросите его оставить честную оценку, не навязывая ответ."], ["Как работает комиссия и депозит?", "Комиссия рассчитывается при выдаче акта по действующему тарифу. Баланс и операции смотрите в разделе финансов. При недостатке депозита создание новых актов может быть ограничено."], ["Как пополнить депозит?", "Откройте баланс, перейдите по доступной ссылке оплаты, прикрепите чек при необходимости и дождитесь проверки."], ["Как работают промокоды и рекламная ссылка?", "В соответствующих разделах создавайте промокоды и получайте ссылку для клиентов. Условия, срок действия, лимиты и вознаграждение партнёра указаны в настройках."], ["Что даёт идентификация?", "Она добровольная. После проверки документов администратором появляется отметка «Личность проверена». За первое одобрение предусмотрен однократный бонус 20 000 сум."], ["Как написать в поддержку или группу?", "Откройте «Написать в поддержку» в кабинете мастера, опишите проблему и укажите номер заявки или акта. Если опубликована официальная ссылка на группу поддержки, используйте её. Не отправляйте пароли и токены."], ["Что делать, если Mini App не обновился?", "Полностью закройте Mini App и откройте его из актуальной кнопки в чате Telegram."]];
 const uz=[["Usta sifatida qanday ro‘yxatdan o‘taman?", "Telegramdagi usta ilovasini oching, F.I.Sh., telefon va boshqa majburiy ma’lumotlarni kiriting. Ariza tasdiqlangach kabinet ochiladi."], ["Buyurtma yaratishning ikki usuli qanday?", "Birinchisi: kabinetdagi buyurtma shaklini to‘ldirish. Ikkinchisi: mijoz lokatsiyasini bot chatiga yuborish yoki uzatish va bot ko‘rsatgan bosqichlarni davom ettirish."], ["MUHIM: lokatsiya orqali qanday tez boshlash mumkin?", "Mijoz sizga lokatsiya yuborgan bo‘lsa, uni botga uzating. Yoki o‘zingiz bot chatiga nuqta yuboring. Bot buyurtmani davom ettirishni taklif qiladi. Faqat lokatsiya yuborish tayyor buyurtma degani emas."], ["Buyurtmani qanday qabul qilaman?", "«Buyurtmalar» bo‘limida yangi murojaatni oching, ma’lumotlarni tekshiring va «Qabul qilish» tugmasini bosing."], ["Mijozga yo‘nalishni qanday ochaman?", "Qabul qilingan buyurtmada koordinata yoki manzil bo‘lsa, «Marshrutni ko‘rsatish» tugmasini bosing."], ["Mijoz bilan qanday bog‘lanaman?", "Buyurtma yoki «Chatlar» bo‘limidan yozing, manzil va vaqtni aniqlashtiring."], ["Buyurtma asosida dalolatnoma qanday yaratiladi?", "Qabul qilingan buyurtmadan «Dalolatnoma yaratish»ni tanlang, ishlar, narx, kafolat va kerakli ma’lumotlarni kiriting."], ["Buyurtmasiz dalolatnoma yaratish mumkinmi?", "Ha. Asosiy sahifada «Dalolatnoma yaratish»ni tanlang, mijoz ismi, telefon, texnika, ishlar, narx va manzilni kiriting."], ["Chegirmalar qanday hisoblanadi?", "Mijozda amaldagi promokod yoki taklif chegirmasi bo‘lsa, tugma ustida taxminiy yakuniy summa ko‘rsatiladi. Dalolatnoma chiqarilganda server summani qayta tekshiradi."], ["«Dalolatnoma yaratish» nimani tasdiqlaydi?", "Tugmani bosish ta’mir uchun to‘lov olinganini tasdiqlaydi. Oldin ma’lumot va summani tekshiring."], ["Dalolatnoma va kafolat qayerda?", "«Dalolatnomalar» bo‘limida kerakli PDFni oching. Ishlar, narx va kafolat shu yerda."], ["Dalolatnomadagi xatoni qanday tuzataman?", "Mavjud bo‘lsa, dalolatnomadan tuzatish so‘rovini yuboring. Takroriy dalolatnoma yaratmang."], ["Mijoz dalolatnomani qanday tasdiqlaydi?", "Mijoz tasdiqlash tugmasidan foydalanishi mumkin. Javob bo‘lmasa, belgilangan vaqtdan so‘ng avtomatik tasdiqlash ishlashi mumkin."], ["Mijoz qanday fikr qoldiradi?", "Ta’mirdan keyin mijoz baholash taklifini olishi mumkin. Halol baho qoldirishni so‘rang."], ["Komissiya va depozit qanday ishlaydi?", "Komissiya dalolatnoma chiqarilganda tarif bo‘yicha hisoblanadi. Balans va operatsiyalarni moliya bo‘limida ko‘ring."], ["Depozitni qanday to‘ldiraman?", "Balans sahifasidan to‘lov havolasiga o‘ting, kerak bo‘lsa chekni biriktiring va tekshiruvni kuting."], ["Promokod va reklama havolasi nima?", "Tegishli bo‘limlarda mijozlar uchun kodlar va havolalarni boshqaring; muddat va limitlarga rioya qiling."], ["Shaxsni tasdiqlash nima beradi?", "Ixtiyoriy tekshiruvdan so‘ng «Shaxs tasdiqlangan» belgisi paydo bo‘ladi. Birinchi tasdiq uchun bir martalik 20 000 so‘m bonus belgilangan."], ["Yordamga yoki guruhga qanday yozaman?", "Kabinetdagi «Yordamga yozish» orqali muammo va buyurtma/dalolatnoma raqamini yuboring. Rasmiy guruh havolasi bo‘lsa, undan foydalaning. Parol va token yubormang."], ["Mini App yangilanmasa nima qilaman?", "Ilovani to‘liq yoping va Telegramdagi yangi tugma orqali qayta oching."]];
 ru.push(['Правовая информация','ТехСервис предоставляет программную платформу. Мастер самостоятельно отвечает за ремонт, оплату, гарантию и налоги. Полные условия и политика данных доступны по кнопке ниже.']);
 uz.push(['Huquqiy ma’lumot','TehServis raqamli platforma. Usta ta’mirlash, to‘lov, kafolat va soliqlar uchun mustaqil javob beradi. To‘liq hujjatlar quyidagi tugma orqali ochiladi.']);
 const language=(document.documentElement.lang||localStorage.getItem('remont_lang')||'ru').toLowerCase();
 const items=language.startsWith('uz')?uz:ru;
 masterShell('F.A.Q. — Помощь',`<article class="card bt-faq-card"><p class="subtitle">${language.startsWith('uz')?'Tizimdan foydalanish bo‘yicha savol-javoblar.':'Подробная инструкция по работе с ТехСервис.'}</p>${items.map(([q,a])=>`<details><summary>${masterEsc(q)}</summary><p>${masterEsc(a)}</p></details>`).join('')}<button type="button" onclick="window.open('legal.html','_blank')">🛡 Правовая информация / Huquqiy ma’lumot</button><button type="button" class="secondary" onclick="renderMasterMenu()">← Главная</button></article>`);
}

// Navigation uses confirmed GPS coordinates first; house/apartment remain visible in the order.
function masterOrderDestination(order){
 const candidates=[order?.location,order?.geo,order?.coordinates,order?.client_location];
 for(const l of candidates){
  if(!l||typeof l!=='object')continue;
  const lat=Number(l.lat??l.latitude),lon=Number(l.lon??l.lng??l.longitude);
  if(Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180&&!(lat===0&&lon===0))
   return {lat,lon};
 }
 const address=String(order?.address||'').trim();
 if(address&&address!=='📍 Геолокация клиента'&&!/^GPS[: ]/i.test(address)){
  const clean=address.replace(/(?:,|\s)\s*(?:кв\.?|квартира|apt\.?|apartment)\s*[^,;]*/ig,'').trim();
  if(clean)return {address:clean};
 }
 return null;
}
function masterOrderMapUrl(order){
 const dest=masterOrderDestination(order);
 if(!dest)return '';
 const target=dest.address||`${dest.lat},${dest.lon}`;
 return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target)}`;
}
function masterNavLink(dest,provider){
 const point=dest.address||`${dest.lat},${dest.lon}`;
 if(provider==='yandex')return dest.address?`https://yandex.com/maps/?text=${encodeURIComponent(dest.address)}`:`https://yandex.com/maps/?rtext=~${dest.lat},${dest.lon}&rtt=auto`;
 if(provider==='2gis')return dest.address?`https://2gis.ru/search/${encodeURIComponent(dest.address)}`:`https://2gis.ru/routeSearch/rsType/car/to/${dest.lon},${dest.lat}`;
 return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(point)}`;
}
function masterPreferredNavigator(){
 try{
  const saved=localStorage.getItem('bt_master_preferred_nav')||'';
  return ['google','yandex','2gis'].includes(saved)?saved:'';
 }catch(e){return '';}
}
function masterOpenNavigation(dest,provider){
 const url=masterNavLink(dest,provider);
 // Called directly in a click handler, so Telegram/Android can open the external link.
 if(window.Telegram?.WebApp?.openLink){
  try{window.Telegram.WebApp.openLink(url);return;}catch(e){}
 }
 window.open(url,'_blank','noopener,noreferrer');
}
function masterSetPreferredNavigator(value){
 try{
  if(['google','yandex','2gis'].includes(value))localStorage.setItem('bt_master_preferred_nav',value);
  else localStorage.removeItem('bt_master_preferred_nav');
 }catch(e){masterToast('Не удалось сохранить выбор на этом устройстве',true);return;}
 const status=document.getElementById('masterNavigatorStatus');
 if(status)status.textContent=value?'Выбор сохранён. Маршрут будет открываться без дополнительного окна.':'При открытии маршрута будет предложен выбор навигатора.';
}
function showMasterRoute(orderId){
 const order=masterCache.orders.find(o=>String(o.id)===String(orderId));
 const dest=masterOrderDestination(order);
 if(!dest){masterToast('В заявке нет координат или адреса для маршрута',true);return;}
 const existing=document.getElementById('btMasterNavChooser');if(existing)existing.remove();
 const saved=masterPreferredNavigator();
 if(saved){
  // A saved preference must actually skip the chooser.
  masterOpenNavigation(dest,saved);
  return;
 }
 const modal=document.createElement('div');modal.id='btMasterNavChooser';
 modal.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,6,19,.82);display:flex;align-items:center;justify-content:center;padding:20px';
 modal.innerHTML=`<div role="dialog" aria-modal="true" aria-label="Выбор навигатора" style="width:min(100%,420px);background:#0b1d33;border:1px solid #3388cf;border-radius:18px;padding:20px;box-shadow:0 0 26px #147dba55;color:#eaf5ff"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><b style="font-size:19px">📍 Показать маршрут</b><button type="button" id="btNavClose" class="secondary" style="width:auto">✕</button></div><p style="opacity:.8">Выберите приложение для навигации</p><div style="display:grid;gap:9px"><button type="button" data-nav="google">Google Maps</button><button type="button" data-nav="yandex">Яндекс Карты</button><button type="button" data-nav="2gis">2ГИС</button></div><label style="display:flex;align-items:center;gap:10px;margin-top:16px"><input type="checkbox" id="btNavRemember" ${saved?'checked':''} style="position:absolute;opacity:0;width:1px;height:1px;pointer-events:none"><span id="btNavRememberMark" aria-hidden="true" style="display:inline-flex;align-items:center;justify-content:center;width:25px;height:25px;flex:none;border:2px solid ${saved?'#22c55e':'#36b6ee'};border-radius:7px;background:${saved?'#137345':'#09172b'};color:#fff;font-size:19px;font-weight:900;box-shadow:0 0 9px ${saved?'#22c55e77':'#36b6ee44'}">${saved?'✓':''}</span> Запомнить мой выбор</label></div>`;
 document.body.appendChild(modal);
 const rememberInput=modal.querySelector('#btNavRemember');
 const rememberMark=modal.querySelector('#btNavRememberMark');
 const updateRememberMark=()=>{const on=rememberInput.checked;rememberMark.textContent=on?'✓':'';rememberMark.style.borderColor=on?'#22c55e':'#36b6ee';rememberMark.style.background=on?'#137345':'#09172b';rememberMark.style.boxShadow=on?'0 0 10px #22c55e88':'0 0 9px #36b6ee44';};
 rememberInput.addEventListener('change',updateRememberMark);
 const close=()=>modal.remove();modal.querySelector('#btNavClose').onclick=close;
 modal.addEventListener('click',e=>{if(e.target===modal)close();});
 modal.querySelectorAll('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>{
  const provider=btn.dataset.nav;
  try{if(modal.querySelector('#btNavRemember').checked)localStorage.setItem('bt_master_preferred_nav',provider);else localStorage.removeItem('bt_master_preferred_nav');}catch(e){}
  close();
  masterOpenNavigation(dest,provider);
 }));
}
function statusLabel(s){return ({new:'Новая',accepted:'Принята',rejected:'Отклонена',in_progress:'В работе',act_issued:'Акт отправлен',closed:'Закрыта',completed:'Завершена',archived_admin:'Удалена администратором'})[s]||s||'—';}
async function showMasterOrders(){try{await loadMasterData();}catch(e){return masterShell('Заявки',`<article class="card error">${masterEsc(e.message)}</article>`)}
 const rows=masterCache.orders.map(o=>{
   const id=masterEsc(o.id),route=masterOrderDestination(o);
   const actions=`${o.status==='new'?`<button onclick="decideMasterOrder('${id}','accept')">✓ Принять</button><button class="secondary" onclick="decideMasterOrder('${id}','reject')">Отклонить</button>`:''}${o.status==='accepted'&&!o.act_number?`<button onclick="showMasterCreateAct('${id}')">📄 Создать акт</button>`:''}${o.client_id?`<button class="secondary" onclick="openMasterChat('${masterEsc(o.client_id)}')">💬 Чат</button>`:''}${o.status==='accepted'&&route?`<button type="button" class="secondary" onclick="showMasterRoute('${id}')">📍 Показать маршрут</button>`:''}`;
   return `<article class="card order-card bt-order-compact ${o.status==='new'?'bt-new-order':''}"><div class="card-row"><b>${id}</b><span class="status-pill ${o.status==='new'?'status-new':''}">${masterEsc(statusLabel(o.status))}</span></div><div class="bt-order-summary"><strong>${masterEsc([o.device,o.brand,o.model].filter(Boolean).join(' ')||'Ремонт техники')}</strong><span>${masterEsc(o.client_name||'Клиент')}</span></div><p class="subtitle bt-order-short">${masterEsc([o.when_date,o.when_time,o.address||o.house].filter(Boolean).join(' · '))}</p><details class="bt-order-details"><summary>Подробнее о заявке</summary><p><b>Телефон:</b> ${masterEsc(o.client_phone||'—')}</p><p>${masterEsc(o.problem||o.comment||'Описание не указано')}</p>${o.status==='archived_admin'?`<p><b>Причина удаления:</b> ${masterEsc(o.admin_archive_reason||'Не указана')}</p>`:''}</details><div class="button-row bt-order-actions">${actions}</div></article>`;
 }).join('');
 const initialFilter=masterCache.orders.some(o=>o.status==='new')?'new':masterCache.orders.some(o=>o.status==='accepted')?'accepted':'all';
 masterShell('Заявки',`<div class="section-heading"><p>Сначала показываются последние заявки. Действия доступны только по заявкам вашего кабинета.</p><select id="orderFilter" onchange="filterMasterOrders()"><option value="all">Все статусы</option><option value="new">Новые</option><option value="accepted">Принятые</option><option value="act_issued">Акт отправлен</option><option value="closed">Закрытые</option><option value="archived_admin">Архив (удалены администратором)</option></select></div><div id="masterOrderList" class="stack-list">${rows||'<article class="card">Заявок пока нет.</article>'}</div>`);
 const filter=document.getElementById('orderFilter');if(filter){filter.value=initialFilter;filterMasterOrders();}
}
function filterMasterOrders(){const f=document.getElementById('orderFilter')?.value||'all';document.querySelectorAll('#masterOrderList .order-card').forEach((el,i)=>{const o=masterCache.orders[i];el.style.display=f==='all'||o?.status===f?'':'none';});}
async function decideMasterOrder(id,decision){try{const r=await masterApi(`/api/master/orders/${encodeURIComponent(id)}/decision`,'POST',{decision});masterToast(r.message);await showMasterOrders();}catch(e){masterToast(e.message,true);}}
// Search is intentionally blank until the master supplies a full phone number.
function btClientPhone(value){let d=String(value||'').replace(/\D/g,'');if(d.length===9)d='998'+d;return d;}
function btClientWarranty(act){
 const raw=String(act.guarantee_until||'').trim();
 if(!raw||raw==='—'||Number(act.guarantee_days)===0)return 'Без гарантии';
 const m=raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
 const until=m?new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),23,59,59):new Date(raw);
 if(Number.isNaN(until.getTime()))return 'Гарантия: '+raw;
 const days=Math.max(0,Math.ceil((until.getTime()-Date.now())/86400000));
 return days>0?'Действует · осталось '+days+' дн.':'Гарантия истекла';
}
async function showMasterClients(){
 masterShell('Поиск клиента',`<article class="card bt-client-search"><label for="btClientPhone">Номер телефона клиента</label><input id="btClientPhone" type="tel" inputmode="tel" autocomplete="off" placeholder="+998 XX XXX XX XX" onkeydown="if(event.key==='Enter'){event.preventDefault();btSearchMasterClient()}"><button type="button" onclick="btSearchMasterClient()">Найти клиента</button><p class="subtitle">Введите полный номер телефона. Список клиентов не отображается.</p></article><div id="btClientSearchResults" aria-live="polite"></div>`);
}
async function btSearchMasterClient(){
 const input=document.getElementById('btClientPhone'),out=document.getElementById('btClientSearchResults');if(!input||!out)return;
 const wanted=btClientPhone(input.value);if(wanted.length!==12||!wanted.startsWith('998')){out.innerHTML='<article class="card">Введите номер Узбекистана полностью: +998 XX XXX XX XX.</article>';return;}
 out.innerHTML='<article class="card">Ищем клиента…</article>';
 try{
   // Only data scoped to the authenticated master is used; never search global records.
   await loadMasterData();
   if(!document.getElementById('btClientSearchResults'))return;
   const acts=masterCache.acts.filter(a=>btClientPhone(a.client_phone)===wanted&&a.status!=='cancelled');
   const client=masterCache.clients.find(c=>btClientPhone(c.phone)===wanted);
   if(!client&&!acts.length){out.innerHTML='<article class="card">Клиент с таким номером не найден.</article>';return;}
   const rows=acts.map(a=>`<div class="bt-client-repair"><b>${masterEsc([a.device,a.brand,a.model].filter(Boolean).join(' ')||'Бытовая техника')}</b><div>Стоимость: ${masterEsc(fmtPrice(a.final_price??a.price??0))}</div><div>Дата ремонта: ${masterEsc(String(a.created_at||'').slice(0,10)||'—')}</div><div>Гарантия: ${masterEsc(btClientWarranty(a))}</div></div>`).join('');
   out.innerHTML=`<article class="card bt-client-result"><h2>${masterEsc(client?.name||acts[0]?.client_name||'Клиент')}</h2><p>${masterEsc(input.value)}</p>${rows||'<p class="subtitle">Ремонтов у этого мастера пока нет.</p>'}</article>`;
 }catch(e){out.innerHTML=`<article class="card error">${masterEsc(e.message)}</article>`;}
}
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
    const mine=m.sender_role==='master' || (m.sender_role!=='client' && String(m.from_id)===String(masterCurrentUserId));
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
let btActsObserver=null;
async function showMasterActs(){
 try{await loadMasterData();}catch(e){return masterShell('Акты',`<article class="card error">${masterEsc(e.message)}</article>`);}
 clearMasterPdfUrl();
 const rows=masterCache.acts.filter(a=>a.status!=='cancelled').map(a=>`<article class="card bt-master-act-compact">
 <div class="card-row"><b>№ ${masterEsc(a.number)}</b><span class="status-pill">${masterEsc(masterActStatus(a.status))}</span></div>
 <div><b>${masterEsc(a.client_name||'Клиент')}</b> · ${masterEsc([a.device,a.brand].filter(Boolean).join(' '))}</div>
 <div class="subtitle"><b>${masterEsc(fmtPrice(a.final_price??a.price??0))}</b> · ${masterEsc(btMasterActPaymentLabel(a.payment_status))}</div>
 <button type="button" class="secondary" onclick="previewMasterAct('${masterEsc(a.number)}')">Подробнее ›</button></article>`);
 if(btActsObserver){btActsObserver.disconnect();btActsObserver=null;}
 // Render only three act cards initially; add the next three when scrolling near the end.
 const listId='btMasterActPagedList', markerId='btMasterActsSentinel';
 masterShell('Акты',`<div id="${listId}" class="stack-list">${rows.slice(0,3).join('')||'<article class="card">Актов пока нет.</article>'}</div>${rows.length>3?`<div id="${markerId}" class="bt-acts-more-sentinel" aria-label="Загрузка следующих актов">Прокрутите вниз для следующих актов</div>`:''}`);
 if(rows.length<=3)return;
 const list=document.getElementById(listId),marker=document.getElementById(markerId);
 if(!list||!marker)return;
 let next=3;
 const appendNext=()=>{
   if(!document.getElementById(listId)||document.getElementById(listId)!==list){btActsObserver?.disconnect();return;}
   const chunk=rows.slice(next,next+3);if(!chunk.length){marker.remove();btActsObserver?.disconnect();return;}
   list.insertAdjacentHTML('beforeend',chunk.join(''));next+=chunk.length;
   if(next>=rows.length){marker.remove();btActsObserver?.disconnect();}
 };
 if('IntersectionObserver' in window){
   btActsObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))appendNext();},{rootMargin:'220px 0px'});
   btActsObserver.observe(marker);
 }else{
   // Legacy WebView fallback: load all remaining cards to avoid inaccessible history.
   while(next<rows.length)appendNext();
 }

}
async function showMasterCreateAct(orderId){if(!btLegalApproved){void btLegalGate(masterApi,()=>showMasterCreateAct(orderId),"master");return;}if(!(await btMasterCanOpenAct()))return;try{await loadMasterData()}catch(e){return masterToast(e.message,true)}const o=masterCache.orders.find(x=>String(x.id)===String(orderId));if(!o||o.status!=='accepted'||o.act_number)return masterToast('Заявка уже недоступна для создания акта.',true);renderMasterActForm(o);}
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
 return `<label id="${id}Label">${masterEsc(label)}</label><details class="bt-master-picker ${['actDevice','actBrand'].includes(id)?(selected?'bt-act-complete':'bt-act-required'):''}" id="${id}Picker"><summary role="button"><span id="${id}Summary">${current?masterEsc((current.icon||'')+' '+(current.label||current.value)):'Выберите вариант'}</span><span aria-hidden="true">⌄</span></summary><div class="bt-master-picker-options" role="listbox" aria-labelledby="${id}Label">${options}</div></details><input id="${id}" type="hidden" value="${masterEsc(selected)}">`;
}
function chooseMasterActItem(button,id){
 const value=button.dataset.value||'';document.getElementById(id).value=value;
 const list=document.getElementById(id+'Picker');if(list)list.open=false;
 const summary=document.getElementById(id+'Summary');if(summary)summary.textContent=button.querySelector('span:nth-child(2)')?.textContent||value;
 for(const other of document.querySelectorAll(`#${id}Picker .bt-master-choice`))other.classList.toggle('selected',other===button);
 if(id==='actGuarantee')toggleMasterCustomGuarantee();else toggleActCustom(id,id+'CustomWrap');
 if(id==='actDevice')renderMasterActWorks();
 if(id==='actDevice'||id==='actBrand')btActUpdateChoiceGlow(id);
}
function btActUpdateChoiceGlow(id){
 const picker=document.getElementById(id+'Picker');if(!picker)return;
 const selected=document.getElementById(id)?.value||'';
 const custom=selected==='__other__'?(document.getElementById(id+'Custom')?.value.trim()||''):selected;
 picker.classList.toggle('bt-act-complete',!!custom);
 picker.classList.toggle('bt-act-required',!custom);
}
function btActUpdateLocationGlow(){
 const button=document.getElementById('actLocationButton');if(!button)return;
 button.classList.toggle('bt-act-complete',!!actGeoLocation);
 button.classList.toggle('bt-act-required',!actGeoLocation);
}
function toggleActCustom(selectId,wrapId){
 const el=document.getElementById(selectId),wrap=document.getElementById(wrapId);
 if(wrap)wrap.style.display=el?.value==='__other__'?'block':'none';
 if(selectId==='actDevice'||selectId==='actBrand')btActUpdateChoiceGlow(selectId);
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
            `<p class="subtitle">Это черновик. Предварительную сумму со скидкой смотрите над кнопкой «Создать акт». При выдаче сервер проверит её повторно. PDF ещё не создан.</p>`;
        container.scrollIntoView({behavior:'smooth',block:'nearest'});
    }catch(e){masterToast(e.message||'Не удалось показать черновик.',true);}
}
function btMasterOldOrders(){
    const now=Date.now();
    return (masterCache.orders||[]).filter(o=>o.status==='new').map(o=>({o,age:now-Date.parse(o.created_at||'')}))
        .filter(x=>Number.isFinite(x.age)&&x.age>=2*3600*1000)
        .sort((a,b)=>b.age-a.age).slice(0,5);
}
async function renderMasterActForm(o=null){
 if(!(await btMasterCanOpenAct()))return;
 // A new form is a new issuance; retries within this form keep the same ID.
 masterActRequestId=null;
 btMasterActOrder=o;
 actGeoLocation=null;
 const manual=!o, id=o?String(o.id):'', safeId=id.replace(/'/g,"\\'");
 const device=o?.device==='Микроволновка'?'Микроволновая печь':o?.device||'';
 const initialDevice=masterAppliances.some(i=>i.value===device)?device:(device?'__other__':'');
 const brand=o?.brand||'';
 const initialBrand=masterBrands.some(i=>i.value===brand)?brand:(brand?'__other__':'');
 masterShell('Создать акт',`<button class="back-btn" onclick="${manual?'renderMasterMenu()':'showMasterOrders()'}">← Назад</button>${o?`<article class="card"><h2>Заявка ${masterEsc(o.id)}</h2><p><b>Клиент:</b> ${masterEsc(o.client_name||'Клиент')} · ${masterEsc(o.client_phone||'')}</p><p><b>Техника:</b> ${masterEsc([o.device,o.brand,o.model].filter(Boolean).join(' '))}</p><p>${masterEsc(o.problem||'')}</p><button class="secondary" type="button" onclick="renderMasterActForm(null)">Создать акт без заявки</button></article>`:`<article class="card"><h2>Акт без заявки</h2><p>Для клиента, обратившегося лично или по телефону. Регистрация в Telegram не обязательна.</p></article>`}<form class="stack-list" onsubmit="event.preventDefault();submitMasterAct(event,'${safeId}');return false;"><article class="card bt-master-act-form">${manual?`<label>ФИО клиента</label><input id="actClientName" maxlength="150" required placeholder="Имя и фамилия"><label>Телефон клиента</label><input id="actClientPhone" required type="tel" inputmode="tel" maxlength="60" placeholder="+998 …">`:''}
 ${masterChoiceMarkup('actDevice','Вид техники',masterAppliances,initialDevice)}
 <div id="actDeviceCustomWrap" style="display:none"><label>Укажите вид техники</label><input oninput="btActUpdateChoiceGlow('actDevice')" id="actDeviceCustom" maxlength="120" value="${masterEsc(initialDevice==='__other__'?device:'')}" placeholder="Введите технику"></div>
 ${masterChoiceMarkup('actBrand','Бренд',masterBrands,initialBrand)}
 <div id="actBrandCustomWrap" style="display:none"><label>Укажите бренд</label><input oninput="btActUpdateChoiceGlow('actBrand')" id="actBrandCustom" maxlength="120" value="${masterEsc(initialBrand==='__other__'?brand:'')}" placeholder="Введите бренд"></div>
 <label>Модель (если есть)</label><input id="actModel" maxlength="120" value="${masterEsc(o?.model||'')}" placeholder="Модель техники">
 <label>Выполненные работы <small class="subtitle">Можно выбрать несколько</small></label><div id="actWorksList" class="bt-master-works"></div>

 <div id="actWorksCustomWrap" style="display:none"><label>Свои работы (каждая с новой строки)</label><textarea id="actWorksCustom" maxlength="3000" rows="4" placeholder="Дополнительная работа 1&#10;Дополнительная работа 2"></textarea></div>
 <label>Стоимость, сум</label><input id="actPrice" inputmode="numeric" autocomplete="off" required placeholder="Например, 500 000" oninput="formatActPrice(this)">
 ${masterChoiceMarkup('actGuarantee','Гарантия',masterGuarantees,'30')}
 <div id="actGuaranteeCustomWrap" style="display:none"><label>Свой срок гарантии, месяцев</label><input id="actGuaranteeMonths" inputmode="numeric" type="number" min="1" max="120" step="1" placeholder="Например, 12"></div>
 <div class="bt-master-address-row"><div><label>Дом *</label><input id="actHouse" required maxlength="80" value="${masterEsc(o?.house||'')}" placeholder="15А"></div><div><label>Квартира</label><input id="actApartment" maxlength="80" value="${masterEsc(o?.apartment||'')}" placeholder="42"></div></div>
 <button id="actLocationButton" type="button" class="secondary bt-act-required" onclick="captureActLocation()">⌖ Указать текущую локацию</button><p id="actLocationStatus" class="subtitle">Для создания акта требуется локация. Нажмите кнопку и разрешите доступ к GPS.</p>

 <div id="actDiscountQuote" class="bt-act-quote" hidden aria-live="polite"></div>
 <button id="actSubmit" type="submit">▣ Создать акт</button><p class="bt-act-payment-warning"><b>Нажимая «Создать акт», Вы подтверждаете, что получили оплату за выполненный ремонт и работы.</b></p><p id="actStatus" role="status" class="subtitle"></p></article></form>`);
 toggleActCustom('actDevice','actDeviceCustomWrap');toggleActCustom('actBrand','actBrandCustomWrap');renderMasterActWorks();btActUpdateLocationGlow();
 btActQuoteBind(id);
}
function formatActPrice(input){const digits=String(input.value||'').replace(/\D/g,'');input.value=digits?digits.replace(/\B(?=(\d{3})+(?!\d))/g,' '):'';btActQuoteSchedule();}
// Server-authoritative quote: do not silently hide errors or permit an unverified charge.
let btActQuoteTimer=null;
let btActQuoteVersion=0;
let btActQuoteOrderId='';
let btActQuoteVerified=null;
function btActQuoteInputs(){
 const price=Number((document.getElementById('actPrice')?.value||'').replace(/\D/g,''));
 const phone=document.getElementById('actClientPhone')?.value.trim()||'';
 const order_id=btActQuoteOrderId;
 return {price,order_id,client_phone:phone};
}
function btActQuoteSignature(input){return JSON.stringify(input);}
function btActQuoteHide(){const box=document.getElementById('actDiscountQuote');if(box){box.hidden=true;box.replaceChildren();}}
function btActQuoteMessage(message){
 const box=document.getElementById('actDiscountQuote');if(!box)return;
 box.hidden=false;box.replaceChildren();const p=document.createElement('div');p.textContent=message;box.append(p);
}
function btActQuoteDisplay(data){
 const box=document.getElementById('actDiscountQuote');if(!box)return;
 const discount=Number(data.discount_amount||0),final=Number(data.final_price);
 if(!Number.isFinite(discount)||!Number.isFinite(final)||discount<0||final<0)throw new Error('Сервер вернул некорректный расчёт скидки.');
 if(discount===0){btActQuoteHide();return;}
 const title=document.createElement('b');title.textContent=String(data.label||'Скидка клиента');
 const amount=document.createElement('div');amount.textContent='Скидка: −'+Math.round(discount).toLocaleString('ru-RU')+' сум';
 const total=document.createElement('b');total.textContent='Итого к оплате: '+Math.round(final).toLocaleString('ru-RU')+' сум';
 const note=document.createElement('small');note.textContent='Предварительный расчёт. При выдаче акта сервер проверит скидку повторно.';
 box.replaceChildren(title,amount,total,note);box.hidden=false;
}
function btActQuoteBind(orderId){
 btActQuoteOrderId=String(orderId||'');btActQuoteVersion++;btActQuoteVerified=null;
 clearTimeout(btActQuoteTimer);btActQuoteHide();
 const phone=document.getElementById('actClientPhone');if(phone)phone.addEventListener('input',btActQuoteSchedule);
}
function btActQuoteSchedule(){
 const version=++btActQuoteVersion;btActQuoteVerified=null;clearTimeout(btActQuoteTimer);btActQuoteHide();
 const input=btActQuoteInputs();
 if(!Number.isSafeInteger(input.price)||input.price<=0||(!input.order_id&&input.client_phone.replace(/\D/g,'').length<9))return;
 btActQuoteTimer=setTimeout(async()=>{
  try{
   const data=await masterApi('/api/master/act/quote','POST',input);
   if(version!==btActQuoteVersion||!document.getElementById('actDiscountQuote'))return;
   if(Number(data.price)!==input.price)throw new Error('Расчёт не совпадает с введённой стоимостью.');
   btActQuoteVerified={signature:btActQuoteSignature(input),discount:Number(data.discount_amount||0),final:Number(data.final_price)};
   btActQuoteDisplay(data);
  }catch(error){if(version===btActQuoteVersion){btActQuoteVerified=null;btActQuoteMessage('⚠️ Не удалось проверить скидку: '+(error.message||'ошибка сервера')+'. Создание акта недоступно до успешной проверки.');}}
 },350);
}
async function btActQuoteBeforeSubmit(){
 const input=btActQuoteInputs();
 if(!Number.isSafeInteger(input.price)||input.price<=0)throw new Error('Укажите корректную стоимость.');
 if(!input.order_id&&input.client_phone.replace(/\D/g,'').length<9)throw new Error('Укажите телефон клиента для проверки скидки.');
 const signature=btActQuoteSignature(input),previous=btActQuoteVerified;
 let data;
 try{data=await masterApi('/api/master/act/quote','POST',input);}
 catch(error){btActQuoteMessage('⚠️ Проверка скидки не удалась: '+(error.message||'ошибка сервера'));throw new Error('Акт не создан: невозможно проверить итоговую стоимость. Повторите попытку.');}
 const discount=Number(data.discount_amount||0),final=Number(data.final_price);
 if(Number(data.price)!==input.price||!Number.isSafeInteger(discount)||discount<0||!Number.isSafeInteger(final)||final<0||discount+final!==input.price)throw new Error('Акт не создан: сервер вернул некорректный расчёт.');
 btActQuoteVerified={signature,discount,final};btActQuoteDisplay(data);
 // A new/changed discount must be seen before the master confirms payment.
 if(discount>0&&(!previous||previous.signature!==signature||previous.discount!==discount||previous.final!==final)){
  document.getElementById('actDiscountQuote')?.scrollIntoView({behavior:'smooth',block:'center'});
  throw new Error('Обнаружена скидка клиента. Проверьте итог к оплате выше и нажмите «Создать акт» ещё раз.');
 }
 return data;
}
// Keep the same operation ID on retries, including ambiguous network failures.
let masterActRequestId=null;
function masterNewActRequestId(){
 if(!masterActRequestId){
  if(!globalThis.crypto?.randomUUID)throw new Error('Обновите Telegram/WebView: требуется безопасный идентификатор операции.');
  masterActRequestId=crypto.randomUUID();
 }
 return masterActRequestId;
}
let actGeoLocation=null;
function captureActLocation(){const status=document.getElementById('actLocationStatus');if(!navigator.geolocation){if(status)status.textContent='Браузер не поддерживает определение локации.';return;}if(status)status.textContent='Определяем локацию…';navigator.geolocation.getCurrentPosition(pos=>{actGeoLocation={latitude:pos.coords.latitude,longitude:pos.coords.longitude,accuracy:pos.coords.accuracy};if(status)status.textContent=`📍 Локация сохранена (точность около ${Math.round(pos.coords.accuracy)} м)`;btActUpdateLocationGlow();},err=>{if(status)status.textContent=err.code===1?'Разрешите доступ к локации в браузере.':'Не удалось определить локацию. Повторите попытку — без GPS акт сохранить нельзя.';btActUpdateLocationGlow();},{enableHighAccuracy:true,timeout:12000,maximumAge:60000});}
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
  await btActQuoteBeforeSubmit();
  payload.request_id=masterNewActRequestId();
  const r=await masterApi('/api/master/act','POST',payload);
  // Reset only after the server confirms success (including idempotent replay).
  // A failed/ambiguous network request must retain its ID for safe retry.
  masterActRequestId=null;
  window.RemontMobile?.clearDirty();
  st.textContent=r.message||`Акт № ${r.number||''} создан.`;st.className='notice';masterToast(st.textContent);
  // Не скачиваем PDF автоматически: мастер открывает его в разделе «Акты».
  try{await loadMasterData();btMasterAskPayment(r.number);}catch(e){st.textContent='Акт создан. Откройте «Все акты», чтобы отметить оплату. Повторно создавать акт не нужно.';}
 }catch(e){
   const networkFailure=(typeof navigator!=='undefined'&&navigator.onLine===false)||/failed to fetch|networkerror|load failed|fetch failed/i.test(String(e.message||''));
   if(networkFailure&&payload&&typeof queueOperation==='function'){
     const offline={event:'offline_create_act',client_name:payload.client_name||'',client_phone:payload.client_phone||'',device:payload.device,brand:payload.brand,model:payload.model||'—',works:payload.works,price:payload.price,guarantee_days:payload.guarantee_days,guarantee_months:payload.guarantee_months,house:payload.house,apartment:payload.apartment,location:{lat:payload.location.latitude,lon:payload.location.longitude},order_id:payload.order_id||'',request_id:payload.request_id,local_registration_id:(typeof getLocalRegistrationId==='function'?getLocalRegistrationId():'')};
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
  masterShell('Промокоды',`<div class="bt-promo-actions"><button type="button" onclick="showCreateMasterPromo()">＋ Создать промокод</button></div><div class="stack-list">${rows||'<p class="bt-promo-empty">Промокодов пока нет.</p>'}</div>`);
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
async function showCreateAct(){if(!btLegalApproved){void btLegalGate(masterApi,showCreateAct,"master");return;}if(!(await btMasterCanOpenAct()))return;const accepted=masterCache.orders.find(o=>o.status==='accepted'&&!o.act_number);if(accepted)return showMasterCreateAct(accepted.id);return renderMasterActForm(null);}
function showCreatePromoForm(){showCreateMasterPromo();}
function sendEvent(){showAlert('Это действие теперь выполняется в мастерской панели. Выберите раздел в меню.');return false;}
bootMasterApp();

async function showMasterProfile(){
  try{await loadMasterData()}catch(e){return masterShell('Настройки профиля',`<article class="card error">${masterEsc(e.message)}</article>`)}
  const p=masterCache.profile||{},r=p.referral_settings||{};
  const localEnabled=r.master_enabled!==undefined?!!r.master_enabled:(r.enabled!==false);
  const adminEnabled=r.admin_enabled!==false;
  masterShell('Настройки профиля',`<style id="bt-master-profile-tweaks">.bt-identity-status{padding:9px 12px;border-radius:10px;border:1px solid #ef4444;box-shadow:0 0 12px rgba(255,38,55,.45);color:#ffb7bd;font-weight:700}.bt-identity-approved{border-color:#24d57b;box-shadow:0 0 12px rgba(26,220,105,.5);color:#baffd4}.bt-profile-form input:not([type=file]):not([type=checkbox]),.bt-profile-form textarea{border-color:#e64a5e;box-shadow:0 0 9px rgba(238,46,68,.3)}.bt-profile-form .bt-field-filled{border-color:#25c878!important;box-shadow:0 0 9px rgba(37,200,120,.28)!important}.bt-avatar-file-button{display:inline-flex;align-items:center;justify-content:center;padding:13px 18px;border:1px solid #36b8ff;border-radius:12px;background:linear-gradient(125deg,#167bca,#275fe0);color:#fff;font-weight:700;cursor:pointer;margin:8px 0}.bt-avatar-file-input{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;overflow:hidden!important}.bt-avatar-file-button:focus-within{outline:2px solid #fff}.bt-client-repair{padding:12px 0;border-top:1px solid #31557d;line-height:1.65}.bt-promo-actions{margin:6px 0 18px}.bt-promo-actions button{width:auto;max-width:100%;padding:12px 18px}.bt-promo-empty{margin:0;padding:12px 4px;color:#a9bed9}</style><article class="card settings-intro"><h2>Профиль мастера</h2><p class="subtitle">Переключатели сохраняются сразу после нажатия. Остальные поля сохраняются кнопкой ниже.</p></article>
  <article class="card"><h2>🪪 Идентификация личности</h2><p id="identityStatus">Загрузка статуса…</p><button type="button" onclick="showMasterIdentity()">Пройти идентификацию</button></article>
  <form class="stack-list bt-profile-form" onsubmit="event.preventDefault();saveMasterSettings()">
  <article class="card"><label for="masterProfileName">Имя мастера</label><input id="masterProfileName" maxlength="100" required value="${masterEsc(p.name||'')}"><label for="masterProfilePhone">Телефон</label><input id="masterProfilePhone" maxlength="40" value="${masterEsc(p.phone||'')}" placeholder="+998…"><label for="masterAbout">О мастере (видно клиентам)</label><textarea id="masterAbout" maxlength="700" rows="4" placeholder="Опыт работы, специализация, подход к ремонту">${masterEsc(p.about||'')}</textarea><label for="masterAvatar">Фото профиля (видно клиентам)</label><div id="masterAvatarPreview">${p.avatar?`<img src="${masterEsc(p.avatar)}" alt="Фото мастера" style="width:96px;height:96px;border-radius:50%;object-fit:cover">`:''}</div><label for="masterAvatar" class="bt-avatar-file-button">📷 Выбрать фото профиля</label><input id="masterAvatar" class="bt-avatar-file-input" type="file" accept="image/jpeg,image/png,image/webp" onchange="btPreviewMasterAvatar(this)"><p id="btAvatarFileName" class="subtitle">JPG, PNG или WebP · до 4 МБ</p><button type="button" class="secondary" onclick="btClearMasterAvatar()">Удалить фото</button></article>
  <article class="card"><h2>🗺️ Навигатор</h2><p class="subtitle">Выберите, где открывать маршрут к клиенту. Настройка сохраняется на этом устройстве.</p>
  <label for="masterPreferredNavigator">Приложение для маршрутов</label>
  <select id="masterPreferredNavigator" onchange="masterSetPreferredNavigator(this.value)">
    <option value="" ${!masterPreferredNavigator()?'selected':''}>Спрашивать каждый раз</option>
    <option value="google" ${masterPreferredNavigator()==='google'?'selected':''}>Google Maps</option>
    <option value="yandex" ${masterPreferredNavigator()==='yandex'?'selected':''}>Яндекс Карты</option>
    <option value="2gis" ${masterPreferredNavigator()==='2gis'?'selected':''}>2ГИС</option>
  </select>
  <p id="masterNavigatorStatus" class="subtitle" role="status">${masterPreferredNavigator()?'Выбор сохранён. Маршрут будет открываться без дополнительного окна.':'При открытии маршрута будет предложен выбор навигатора.'}</p></article>
  <article class="card"><h2>Реферальная программа</h2><p class="subtitle">Рефералы работают отдельно от промокодов. Настройка мастера и разрешение администратора проверяются сервером.</p>
  <label class="toggle-row bt-setting-toggle"><span>Разрешить рефералы моим клиентам</span><input id="masterReferralEnabled" type="checkbox" ${localEnabled?'checked':''} onchange="btSaveMasterToggle(this,'referrals')"></label>
  <p id="masterReferralToggleState" class="subtitle" role="status">${!adminEnabled?'⛔ Администратор отключил программу для всех. Ваша галочка сохраняется, но клиенты не увидят ссылку, пока администратор не включит программу.':localEnabled?'✅ Программа доступна клиентам, привязанным к вам.':'Рефералы выключены — клиенты не увидят кнопку приглашения.'}</p>
  <label>Скидка новому клиенту, %</label><input id="masterReferralDiscount" type="number" min="0" max="100" step="0.5" value="${Number(r.new_client_discount_percent??5)}">
  <label>Вознаграждение пригласившему, %</label><input id="masterReferralReward" type="number" min="0" max="100" step="0.5" value="${Number(r.referrer_reward_percent??5)}">
  <label>Приглашений в одной партии</label><input id="masterReferralInvites" type="number" min="1" max="100" step="1" value="${Number(r.invites_per_batch??10)}">
  </article><article class="card"><button id="masterSettingsSave" type="submit">Сохранить остальные настройки</button><p id="masterSettingsStatus" class="subtitle" role="status"></p></article></form>
  <button class="bt-master-support-entry" type="button" onclick="showMasterSupport()">💬 Написать в поддержку</button>`);masterIdentityStatus();btProfileMarkFields();
}
function btProfileMarkFields(){
 const form=document.querySelector('.bt-profile-form');if(!form)return;
 for(const field of form.querySelectorAll('input:not([type=file]):not([type=checkbox]),textarea')){
  const update=()=>field.classList.toggle('bt-field-filled',String(field.value||'').trim().length>0);
  update();field.addEventListener('input',update);
 }
}
function btIdentityFileChosen(input){
 const file=input.files?.[0],label=document.getElementById(input.id+'Label'),preview=document.getElementById(input.id+'Preview');
 if(label)label.textContent=file?file.name:'Выбрать фото';
 if(preview){preview.replaceChildren();if(file&&file.type.startsWith('image/')){const img=document.createElement('img');img.alt='Предпросмотр выбранного фото';img.src=URL.createObjectURL(file);img.onload=()=>URL.revokeObjectURL(img.src);preview.appendChild(img)}}
}
function btIdentityPicker(id,title,required){return `<div class="bt-identity-field"><label for="${id}">${title}${required?' *':''}</label><label class="bt-identity-file-button" for="${id}"><span aria-hidden="true">📷</span><span id="${id}Label">Выбрать фото</span></label><input id="${id}" class="bt-identity-file-input" type="file" accept="image/jpeg,image/png" ${required?'required':''} onchange="btIdentityFileChosen(this)"><div id="${id}Preview" class="bt-identity-preview"></div><small>JPG или PNG, до 4 МБ</small></div>`}
async function showMasterIdentity(){
  masterShell('Идентификация',`<article class="card bt-identity-card"><h2>🪪 Добровольная идентификация</h2><p class="subtitle">Документы проверяет администратор. После одобрения однократно начисляется 20 000 сум на депозит. Без идентификации можно продолжать работать.</p><form class="bt-identity-form" onsubmit="event.preventDefault();submitMasterIdentity()"><label for="identityName">ФИО как в паспорте или ID-карте</label><input id="identityName" autocomplete="name" required maxlength="180" placeholder="Фамилия, имя, отчество">${btIdentityPicker('identityFront','Лицевая сторона паспорта / ID',true)}${btIdentityPicker('identityBack','Обратная сторона (если есть)',false)}${btIdentityPicker('identitySelfie','Селфи',true)}<label class="bt-identity-consent"><input id="identityConsent" type="checkbox" required><span>Согласен на обработку персональных данных для проверки личности</span></label><button class="bt-identity-submit" type="submit" id="identitySend">Отправить документы</button><p id="identityMessage" role="status" aria-live="polite"></p></form></article><button type="button" class="secondary bt-identity-back" onclick="showMasterProfile()">← Назад к профилю</button>`);
  document.querySelector('.bt-identity-card')?.scrollIntoView({block:'start'});
}
async function submitMasterIdentity(){const btn=document.getElementById('identitySend'),msg=document.getElementById('identityMessage');btn.disabled=true;try{const image=async id=>{const f=document.getElementById(id).files[0];if(!f)return null;if(!['image/jpeg','image/png'].includes(f.type)||f.size>4*1024*1024)throw Error('JPG/PNG до 4 МБ');return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Ошибка файла'));reader.readAsDataURL(f)})};const payload={full_name:document.getElementById('identityName').value,consent:document.getElementById('identityConsent').checked,front:await image('identityFront'),back:await image('identityBack'),selfie:await image('identitySelfie')};const r=await masterApi('/api/master/identity','POST',payload);msg.textContent=r.message;setTimeout(showMasterProfile,900)}catch(e){msg.textContent=e.message;btn.disabled=false}}
async function masterIdentityStatus(){
 const el=document.getElementById('identityStatus');if(!el)return;
 try{
  const r=await masterApi('/api/master/identity');if(!document.getElementById('identityStatus'))return;
  const status=String(r.status||'unverified').toLowerCase();
  const labels={unverified:'Не проверена',pending:'На проверке у администратора',approved:'Личность проверена администратором',rejected:'Требуется повторная проверка'};
  el.textContent=labels[status]||'Статус не определён';
  el.className='bt-identity-status '+(status==='approved'?'bt-identity-approved':'bt-identity-unverified');
  const btn=el.parentElement?.querySelector('button');if(btn&&status==='approved'){btn.style.display='none';}
 }catch(e){el.textContent='Не удалось получить статус проверки';el.className='bt-identity-status bt-identity-unverified';}
}
async function btSaveMasterToggle(el,kind){
  const old=!el.checked,desired=!!el.checked;
  const status=document.getElementById('masterReferralToggleState');
  el.disabled=true;
  if(status){status.textContent='Сохраняем…';status.className='subtitle'}
  try{
    const body={referral_settings:{enabled:desired}};
    const result=await masterApi('/api/master/settings','POST',body);
    if(!masterCache.profile)masterCache.profile={};
    window.RemontMobile?.clearDirty();
    masterCache.profile.referral_settings={...(masterCache.profile.referral_settings||{}),master_enabled:desired,enabled:desired};
    if(status){status.textContent=(desired?(masterCache.profile?.referral_settings?.admin_enabled===false?'Галочка сохранена, но администратор отключил программу. Клиентской кнопки пока не будет.':'Рефералы включены. Клиенты с привязкой к вам увидят ссылку.'):'Рефералы отключены: клиентская кнопка приглашения скрыта');status.className='notice'}
  }catch(e){
    el.checked=old;
    if(status){status.textContent='Не удалось сохранить: '+e.message;status.className='error'}
  }finally{el.disabled=false}
}
function btClearMasterAvatar(){const label=document.getElementById('btAvatarFileName');if(label)label.textContent='Фото будет удалено после сохранения настроек.';window.btMasterAvatarDraft='';document.getElementById('masterAvatarPreview').replaceChildren();const inp=document.getElementById('masterAvatar');if(inp)inp.value='';}
async function btPreviewMasterAvatar(input){
 const file=input.files?.[0];if(!file)return;const label=document.getElementById('btAvatarFileName');if(label)label.textContent=file.name;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>4*1024*1024){masterToast('Фото: JPG, PNG или WebP до 4 МБ',true);return;}
 try{
  const bitmap=await createImageBitmap(file),c=document.createElement('canvas');c.width=256;c.height=256;
  const ctx=c.getContext('2d'),scale=Math.max(256/bitmap.width,256/bitmap.height);
  ctx.drawImage(bitmap,(256-bitmap.width*scale)/2,(256-bitmap.height*scale)/2,bitmap.width*scale,bitmap.height*scale);
  bitmap.close?.();const url=c.toDataURL('image/jpeg',0.75);
  if(url.length>180000)throw Error('Фото слишком большое. Выберите другое.');
  window.btMasterAvatarDraft=url;
  const box=document.getElementById('masterAvatarPreview');box.replaceChildren();const img=document.createElement('img');img.src=url;img.alt='Новое фото';img.style.cssText='width:96px;height:96px;border-radius:50%;object-fit:cover';box.appendChild(img);
 }catch(e){masterToast(e.message||'Не удалось обработать фото',true)}
}
async function saveMasterSettings(){
  const btn=document.getElementById('masterSettingsSave'),st=document.getElementById('masterSettingsStatus');
  if(!btn||!st)return;
  btn.disabled=true;st.textContent='Сохраняем…';st.className='subtitle';
  const data={name:document.getElementById('masterProfileName').value.trim(),phone:document.getElementById('masterProfilePhone').value.trim(),about:document.getElementById('masterAbout').value.trim(),referral_settings:{new_client_discount_percent:Number(document.getElementById('masterReferralDiscount').value),referrer_reward_percent:Number(document.getElementById('masterReferralReward').value),invites_per_batch:Number(document.getElementById('masterReferralInvites').value)}};
  try{
    if(window.btMasterAvatarDraft!==undefined)data.avatar=window.btMasterAvatarDraft;
    const r=await masterApi('/api/master/settings','POST',data);
    if(!masterCache.profile)masterCache.profile={};
    masterCache.profile.name=data.name;masterCache.profile.phone=data.phone;masterCache.profile.about=data.about;if(data.avatar!==undefined){masterCache.profile.avatar=data.avatar;window.btMasterAvatarDraft=undefined;}
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


// ТехСервис: отдельные инструменты привлечения клиентов и показа платёжного QR.
async function showMasterInviteLink(){
  masterShell('Моя ссылка для клиентов',`<article class="card"><h2>Приглашайте клиентов</h2><p class="subtitle">Клиенты по этой ссылке закрепляются за вами. Их приглашённые друзья также сохраняют привязку к вашему кабинету.</p><div id="btInviteLinkStatus">Получаем ссылку…</div><button type="button" class="secondary" onclick="renderMasterMenu()">← Главная</button></article>`);
  const out=document.getElementById('btInviteLinkStatus');
  try{
    const d=await masterApi('/api/master/marketing-link');
    if(!out)return;
    out.innerHTML=`<label for="btInviteLinkUrl">Ваша ссылка</label><input id="btInviteLinkUrl" readonly value="${masterEsc(d.url||'')}"><button type="button" onclick="btCopyMasterInviteLink()">🔗 Копировать ссылку</button><p class="subtitle">${masterEsc(d.public_name||'')}</p>`;
  }catch(e){
    if(out)out.innerHTML=`<p class="error">${masterEsc(e.message)}</p><p class="subtitle">Если название мастерской ещё не заполнено, настройте его ниже.</p><button type="button" onclick="showMasterMarketingLink()">Настроить название мастерской</button>`;
  }
}
async function btCopyMasterInviteLink(){
 const value=document.getElementById('btInviteLinkUrl')?.value;
 if(!value)return;
 try{await navigator.clipboard.writeText(value);masterToast('Ссылка скопирована');}
 catch(_){document.getElementById('btInviteLinkUrl')?.select();masterToast('Выделите ссылку и скопируйте');}
}
async function showMasterPaymentQr(){
  masterShell('Моя ссылка для оплаты',`<article class="card"><h2>Paynet Xolis</h2>
    <p class="subtitle">Вставьте ссылку на оплату из Paynet Xolis. Клиент увидит кнопку оплаты в своём акте, только если ссылка сохранена.</p>
    <label for="btMasterPaymentLink">Ссылка Paynet Xolis</label>
    <textarea id="btMasterPaymentLink" rows="4" maxlength="2048" placeholder="https://app.paynet.uz/qr-online/..."></textarea>
    <div id="btMasterPaymentLinkStatus" class="subtitle" role="status"></div>
    <button type="button" id="btMasterPaymentLinkSave" onclick="btSaveMasterPaymentLink()">Сохранить ссылку</button>
    <button type="button" class="secondary" onclick="btTestMasterPaymentLink()">Проверить ссылку</button>
    <button type="button" class="secondary" onclick="btRemoveMasterPaymentLink()">Удалить ссылку</button>
    <button type="button" class="secondary" onclick="renderMasterMenu()">← Главная</button>
    <p class="subtitle">Переход по ссылке не подтверждает оплату. Проверяйте поступление денег в Paynet Xolis.</p></article>`);
  try{
    await loadMasterData();
    const field=document.getElementById('btMasterPaymentLink');
    if(field)field.value=masterCache.profile?.paynet_url||'';
  }catch(e){const status=document.getElementById('btMasterPaymentLinkStatus');if(status)status.textContent=e.message;}
}
function btValidMasterPaymentLink(value){
  if(!value)return true;
  try{const u=new URL(value);return u.protocol==='https:' && ['app.paynet.uz','paynet.uz'].includes(u.hostname.toLowerCase()) && !u.username && !u.password && !/\s/.test(value) && value.length<=2048;}
  catch(_){return false;}
}
async function btSaveMasterPaymentLink(){
  const field=document.getElementById('btMasterPaymentLink'),status=document.getElementById('btMasterPaymentLinkStatus'),button=document.getElementById('btMasterPaymentLinkSave');
  if(!field||!status||!button)return;
  const url=field.value.trim();
  if(!url){status.textContent='Введите ссылку или нажмите «Удалить ссылку».';return;}
  if(!btValidMasterPaymentLink(url)){status.textContent='Нужна корректная HTTPS-ссылка Paynet Xolis.';return;}
  button.disabled=true;status.textContent='Сохраняем…';
  try{
    await masterApi('/api/master/settings','POST',{paynet_url:url});
    if(!masterCache.profile)masterCache.profile={};masterCache.profile.paynet_url=url;
    status.textContent='Ссылка сохранена. Клиент увидит кнопку оплаты в акте.';
  }catch(e){status.textContent='Ошибка: '+e.message;}finally{button.disabled=false;}
}
function btTestMasterPaymentLink(){
  const field=document.getElementById('btMasterPaymentLink'),status=document.getElementById('btMasterPaymentLinkStatus');
  const url=field?.value.trim()||'';
  if(!url||!btValidMasterPaymentLink(url)){if(status)status.textContent='Сначала укажите корректную ссылку Paynet.';return;}
  window.open(url,'_blank','noopener,noreferrer');
}
async function btRemoveMasterPaymentLink(){
  const status=document.getElementById('btMasterPaymentLinkStatus'),field=document.getElementById('btMasterPaymentLink');
  if(!status||!field)return;
  status.textContent='Удаляем…';
  try{await masterApi('/api/master/settings','POST',{paynet_url:''});
    if(!masterCache.profile)masterCache.profile={};masterCache.profile.paynet_url='';field.value='';
    status.textContent='Ссылка удалена. Кнопка оплаты у клиента скрыта.';
  }catch(e){status.textContent='Ошибка: '+e.message;}
}

/* Finance module: read-only balance and manual Paynet Xolis receipt request.
   The API is opt-in and never changes legacy act issuance until cutover. */
async function showMasterFinance(){
  masterShell('Мой депозит', '<article class="card"><p id="financeStatus">Загружаем баланс…</p></article>');
  try {
    const d = await masterApi('/api/master/finance');
    const fmt = t => new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(Number(t||0)/100);
    const effectiveBalance = Number.isFinite(Number(d.available_tiyin)) ? Number(d.available_tiyin) : Number(d.balance_tiyin||0);
    const labels={admin_credit:'Пополнение администратором',receipt_credit:'Подтверждённый чек',act_commission:'Комиссия за акт',correction:'Корректировка'};
    const operations=(d.operations||[]).map(o=>`<div class="finance-compact-row"><b>${masterEsc(labels[o.kind]||o.kind)}</b><span>${masterEsc(fmt(o.amount_tiyin))} сум</span><small>${masterEsc(o.created_at||'')}</small></div>`).join('');
    const receipts=(d.receipts||[]).map(r=>`<div class="finance-compact-row"><b>${masterEsc(fmt(r.amount_tiyin))} сум</b><span>${masterEsc(({pending:'Ожидает проверки',approved:'Подтверждено',rejected:'Отклонено'})[r.status]||r.status)}</span>${r.review_note?`<small>${masterEsc(r.review_note)}</small>`:''}</div>`).join('');
    const paymentUrl = typeof d.payment_url==='string' && /^https:\/\/[^\s]+$/i.test(d.payment_url) ? d.payment_url : '';
    const paymentLink = paymentUrl ? `<a class="btn master-deposit-pay-link" href="${masterEsc(paymentUrl)}" target="_blank" rel="noopener noreferrer">💳 Перейти к оплате</a>` : '<p class="subtitle">Ссылка на оплату пока не настроена.</p>';
    masterShell('Мой депозит', `<style>
      .finance-compact .card{padding:14px 16px!important;margin:0 0 10px!important}
      .finance-compact .card h2{margin:0 0 9px!important}
      .finance-compact .card p{margin:5px 0!important;line-height:1.35!important}
      .finance-compact .master-deposit-pay-link{display:block;text-align:center;padding:12px 14px;margin:10px 0 6px;text-decoration:none;border-radius:12px;background:linear-gradient(120deg,#147bda,#346ff1);color:white;font-weight:700}
      .finance-compact form{display:grid;gap:8px}
      .finance-compact form label{margin:0!important}
      .finance-compact #financeAmount,.finance-compact .master-deposit-file-picker{margin:0!important;box-sizing:border-box;width:100%}
      .finance-compact .finance-required-invalid{border:1px solid #ff405e!important;box-shadow:0 0 9px #ff315b8a!important}
      .finance-compact .finance-required-valid{border:1px solid #29c980!important;box-shadow:0 0 9px #20d18b70!important}
      .finance-compact #masterFinanceSubmitReceipt.finance-submit-ready{box-shadow:0 0 0 1px #34ef9b,0 0 16px #20d68d!important;border:1px solid #37e5a0!important}
      .finance-compact #masterFinanceSubmitReceipt.finance-submit-waiting{box-shadow:0 0 0 1px #f34c68,0 0 12px #ff315b70!important;border:1px solid #f34c68!important}
      .finance-compact .finance-compact-row{display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px 8px;padding:7px 0;border-bottom:1px solid #ffffff18}
      .finance-compact .finance-compact-row small{width:100%;opacity:.7}
      .finance-compact details summary{cursor:pointer;font-weight:700}
      .finance-compact details[open] summary{margin-bottom:8px}
    </style><div class="finance-compact">
    <article class="card"><h2>Баланс: ${masterEsc(fmt(effectiveBalance))} сум</h2><p class="subtitle" style="color:#ffd38a;font-weight:700">⚠️ После оплаты сохраните скриншот чека — он понадобится для подтверждения пополнения.</p>${paymentLink}<p class="subtitle">Пополнение пока доступно только через приложение Paynet Xolis.</p><p class="subtitle">Комиссия: ${masterEsc((Number(d.commission_basis_points)/100).toLocaleString('ru-RU'))}% за выданный акт. Зачисление после проверки администратором.</p></article>
    <article class="card"><h2>Отправить чек пополнения</h2><form onsubmit="event.preventDefault();submitMasterFinanceReceipt()">
      <label for="financeAmount">Сумма, сум</label><input id="financeAmount" type="text" inputmode="numeric" autocomplete="off" placeholder="Например: 100 000" oninput="masterFinanceSubmissionId=null;masterFinanceFormatAmount(this);masterFinanceUpdateValidity()" required>
      <label for="financeReceipt">Чек JPG/PNG, до 4 МБ</label><label class="master-deposit-file-picker" id="financeReceiptPicker" for="financeReceipt"><span class="master-deposit-file-icon" aria-hidden="true">📎</span><span id="financeReceiptLabel">Выбрать чек</span></label>
      <input id="financeReceipt" class="master-deposit-file-input" type="file" accept="image/jpeg,image/png" required onchange="masterFinanceReceiptSelected(this)">
      <button type="submit" id="masterFinanceSubmitReceipt" class="finance-submit-waiting">Отправить на проверку</button><p id="financeUploadStatus" role="status"></p>
    </form></article>
    <article class="card"><details ${receipts?'':'open'}><summary>Заявки на пополнение${d.receipts?.length?' ('+d.receipts.length+')':''}</summary>${receipts||'<p class="subtitle">Заявок пока нет.</p>'}</details></article>
    <article class="card"><details ${operations?'':'open'}><summary>Последние операции${d.operations?.length?' ('+d.operations.length+')':''}</summary>${operations||'<p class="subtitle">Операций пока нет.</p>'}</details></article>
    </div>`);
    masterFinanceUpdateValidity();
  }catch(e){masterShell('Мой депозит',`<article class="card"><p class="error">${masterEsc(e.message)}</p><p>Финансовый раздел пока не активирован администратором. Остальные функции мастера работают как раньше.</p></article>`)}
}
function masterFinanceAmountNumber(value){
 const digits=String(value||'').replace(/\D/g,'');
 return digits ? Number(digits) : NaN;
}
function masterFinanceFormatAmount(input){
 if(!input)return;
 const previous=input.value;
 const cursor=input.selectionStart??previous.length;
 const digitsBefore=previous.slice(0,cursor).replace(/\D/g,'').length;
 const digits=previous.replace(/\D/g,'').slice(0,9);
 const formatted=digits.replace(/\B(?=(\d{3})+(?!\d))/g,' ');
 input.value=formatted;
 if(typeof input.setSelectionRange==='function'){
  let position=0,seen=0;
  while(position<formatted.length && seen<digitsBefore){if(/\d/.test(formatted[position]))seen++;position++;}
  try{input.setSelectionRange(position,position)}catch(e){}
 }
}
function masterFinanceUpdateValidity(){
 const amount=document.getElementById('financeAmount');
 const picker=document.getElementById('financeReceiptPicker');
 const button=document.getElementById('masterFinanceSubmitReceipt');
 const file=document.getElementById('financeReceipt')?.files?.[0];
 const number=masterFinanceAmountNumber(amount?.value);
 const validAmount=!!amount?.value && Number.isSafeInteger(number) && number>=1000 && number<=100000000;
 const validFile=!!file && ['image/jpeg','image/png'].includes(file.type) && file.size>0 && file.size<=4*1024*1024;
 amount?.classList.toggle('finance-required-valid',validAmount);
 amount?.classList.toggle('finance-required-invalid',!validAmount);
 picker?.classList.toggle('finance-required-valid',validFile);
 picker?.classList.toggle('finance-required-invalid',!validFile);
 button?.classList.toggle('finance-submit-ready',validAmount&&validFile);
 button?.classList.toggle('finance-submit-waiting',!(validAmount&&validFile));
 if(button)button.disabled=!(validAmount&&validFile)||masterFinanceReceiptSending;
}
function masterFinanceReceiptSelected(input){
  const file=input?.files?.[0];
  const label=document.getElementById('financeReceiptLabel');
  const status=document.getElementById('financeUploadStatus');
  if(label)label.textContent=file ? file.name : 'Выбрать чек';
  if(status)status.textContent='';
  // A different receipt or amount must not reuse the previous request identifier.
  masterFinanceSubmissionId=null;
  masterFinanceUpdateValidity();
}
let masterFinanceReceiptSending = false;
let masterFinanceSubmissionId = null;
async function submitMasterFinanceReceipt(){
  if(masterFinanceReceiptSending)return;
  const status=document.getElementById('financeUploadStatus');
  const file=document.getElementById('financeReceipt')?.files?.[0];
  const amountText=document.getElementById('financeAmount')?.value;
  const amountNumber=masterFinanceAmountNumber(amountText);
  if(!Number.isSafeInteger(amountNumber)||amountNumber<1000||amountNumber>100000000){if(status)status.textContent='Укажите сумму от 1 000 до 100 000 000 сум.';return;}
  if(!file||!['image/jpeg','image/png'].includes(file.type)||file.size===0||file.size>4*1024*1024){if(status)status.textContent='Нужен JPG или PNG до 4 МБ.';return;}
  masterFinanceSubmissionId ||= (globalThis.crypto?.randomUUID?.() || 'receipt-'+Date.now()+'-'+Math.random().toString(36).slice(2));
  masterFinanceReceiptSending=true;
  const submitButton=document.querySelector('#financeReceipt')?.closest('form')?.querySelector('button[type=submit]');
  if(submitButton)submitButton.disabled=true;
  if(status)status.textContent='Отправляем чек…';
  try{
    const image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Ошибка чтения чека'));reader.readAsDataURL(file)});
    await masterApi('/api/master/finance/receipt','POST',{amount:String(amountNumber),image,submission_id:masterFinanceSubmissionId});
    masterFinanceSubmissionId=null;
    await showMasterFinance();masterToast('Чек отправлен на проверку.');
  }catch(e){if(status)status.textContent=e.message;}
  finally{masterFinanceReceiptSending=false;if(submitButton)submitButton.disabled=false;}
}

/* Read-only master earnings report; sourced from PostgreSQL issued acts. */
async function showMasterFinanceReport(){
  masterShell('Финансы','<article class="card">Загружаем отчёт…</article>');
  try {
    const d=await masterApi('/api/master/finance');
    const r=d.report;
    if(!r)throw new Error('Финансовая аналитика пока не подключена на сервере.');
    const fmt=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(Number(n||0)/100);
    const periods=[['today','Сегодня'],['days7','Последние 7 дней'],['days30','Последние 30 дней'],['all','За всё время']];
    const blocks=periods.map(([key,title])=>{const p=r[key]||{};return `<article class="card"><h2>${title}</h2><p>Выдано актов: <b>${masterEsc(p.acts||0)}</b></p><p>Сумма ремонтов: <b>${masterEsc(fmt(p.gross_tiyin))} сум</b></p><p>Комиссия: <b>${masterEsc(fmt(p.commission_tiyin))} сум</b></p><p>После комиссии: <b>${masterEsc(fmt(p.net_tiyin))} сум</b></p></article>`}).join('');
    masterShell('Финансы',`${Number(r.missing_commissions)>0?'<article class="card"><p class="error">Некоторые акты ещё не имеют подтверждённого расчёта комиссии. Итог предварительный.</p></article>':''}${blocks}<article class="card"><h2>Произвольный период</h2><label>С даты</label><input type="date" id="masterReportFrom"><label>По дату включительно</label><input type="date" id="masterReportTo"><button type="button" id="masterReportApply">Показать</button><div id="masterReportCustom" role="status"></div></article><article class="card"><p class="subtitle">Отчёт по выданным актам. Сумма после комиссии не учитывает стоимость запчастей и другие расходы.</p></article>`);
    const apply=document.getElementById('masterReportApply');
    if(apply)apply.addEventListener('click',()=>{
      const from=document.getElementById('masterReportFrom').value;
      const to=document.getElementById('masterReportTo').value;
      const target=document.getElementById('masterReportCustom');
      if(!from||!to||from>to){target.textContent='Выберите корректный период: дата начала не позже даты окончания.';return;}
      const result={acts:0,gross_tiyin:0,commission_tiyin:0,net_tiyin:0};
      for(const [day,record] of Object.entries(r.daily||{})){
        if(day<from||day>to)continue;
        for(const key of Object.keys(result))result[key]+=Number(record[key]||0);
      }
      target.innerHTML=`<p>Выдано актов: <b>${masterEsc(result.acts)}</b></p><p>Сумма ремонтов: <b>${masterEsc(fmt(result.gross_tiyin))} сум</b></p><p>Комиссия: <b>${masterEsc(fmt(result.commission_tiyin))} сум</b></p><p>После комиссии: <b>${masterEsc(fmt(result.net_tiyin))} сум</b></p>`;
    });
  } catch(e) {masterShell('Финансы',`<article class="card error">${masterEsc(e.message)}</article>`);}
}

/* Live mandatory-field feedback. Event delegation supports dynamically rendered Mini App pages. */
(function(){
  function applicable(el){
    return el && el.matches && el.matches('input,select,textarea') &&
      (el.closest('.bt-master-act-form') || el.closest('.bt-order-page'));
  }
  function required(el){
    if(el.required) return true;
    if(!el.closest('.bt-order-page')) return false;
    return ['device','brand','problem','address','device_custom','brand_custom'].includes(el.id) &&
      el.offsetParent !== null;
  }
  function refresh(el){
    if(!applicable(el)) return;
    const isRequired=required(el);
    el.classList.toggle('bt-required-neon',isRequired);
    el.classList.remove('bt-field-empty','bt-field-ready');
    if(!isRequired || el.disabled || el.type==='hidden') return;
    const hasValue=String(el.value||'').trim().length>0;
    const valid=hasValue && (typeof el.checkValidity!=='function' || el.checkValidity());
    el.classList.add(valid?'bt-field-ready':'bt-field-empty');
  }
  document.addEventListener('input',function(e){refresh(e.target);},true);
  document.addEventListener('change',function(e){refresh(e.target);},true);
  const observer=new MutationObserver(function(){
    document.querySelectorAll('.bt-master-act-form input,.bt-master-act-form select,.bt-master-act-form textarea,.bt-order-page input,.bt-order-page select,.bt-order-page textarea').forEach(refresh);
  });
  function start(){observer.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

/* Required act choices: red neon until selected, green after completion. */
(function(){const style=document.createElement('style');style.textContent=`.bt-master-picker.bt-act-required,.bt-act-required#actLocationButton{border:1px solid #ff4058!important;box-shadow:0 0 7px rgba(255,45,75,.65),0 0 16px rgba(255,45,75,.25)!important}.bt-master-picker.bt-act-complete,.bt-act-complete#actLocationButton{border:1px solid #29d986!important;box-shadow:0 0 7px rgba(41,217,134,.65),0 0 16px rgba(41,217,134,.22)!important}`;document.head.appendChild(style)})();
