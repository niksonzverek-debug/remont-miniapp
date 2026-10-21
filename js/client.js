// miniapp/js/client.js

// ============ СОСТОЯНИЕ ============
let btOrderOperationId = null;
let btHomeTimer = null;
let btOrderProgressTimer = null;
function btStopOrderProgressRefresh() {
    if (btOrderProgressTimer) { clearInterval(btOrderProgressTimer); btOrderProgressTimer = null; }
}
let orderData = {
    device: "",
    brand: "",
    model: "",
    problem: "",
    when_date: "",
    when_time: "",
    house: "",
    apartment: "",
    comment: "",
    location: null,
};

const clientUrlParams = new URLSearchParams(location.search);
const currentClientTelegramId = String(tg?.initDataUnsafe?.user?.id || '');
// Mini App localStorage is shared by Telegram accounts on the same device. Scope
// profile/autofill data to the Telegram UID; never clear the offline operation queue.
if (currentClientTelegramId) {
    const storedProfileUid = String(localStorage.getItem('remont_bt_profile_uid') || '');
    if (storedProfileUid !== currentClientTelegramId) {
        ['remont_bt_name','remont_bt_phone','remont_bt_house','remont_bt_apartment',
         'remont_bt_identity_saved','remont_bt_registered','remont_bt_master_application','remont_bt_customer_name_confirmed'].forEach(k => localStorage.removeItem(k));
    }
}
const isNewClientFlow = clientUrlParams.get("new_client") === "1";
// Регистрационный номер в ссылке добавляет бот только для уже зарегистрированного клиента.
const hasJustRegisteredLocally = isNewClientFlow && localStorage.getItem('remont_bt_identity_saved') === '1';
const isKnownRegisteredClient = hasJustRegisteredLocally || (!isNewClientFlow && (
    clientUrlParams.get("registered") === "1" ||
    /^CL-[A-Z0-9-]{6,38}$/.test(clientUrlParams.get("registration_no") || "") ||
    localStorage.getItem("remont_bt_registered") === "1"
));

// ============ ГЛАВНОЕ МЕНЮ КЛИЕНТА ==========

function btClientRecentOrder(d){
    const orders=Array.isArray(d?.orders)?d.orders:[];
    const panel=document.getElementById('btRecentOrder');if(!panel)return;
    const recent=orders[0];if(!recent){panel.hidden=true;return;}
    panel.hidden=false;
    const status=String(recent.status||'').toLowerCase();
    const step=['closed','completed'].includes(status)?4:status==='act_issued'?4:status==='in_progress'?3:status==='accepted'?2:1;
    panel.querySelectorAll('.bt-circuit span').forEach((node,i)=>node.classList.toggle('bt-complete',i<step));
    const statuses={new:'Новая',accepted:'Принята',in_progress:'В ремонте',act_issued:'Акт оформлен',closed:'Закрыта',completed:'Завершена',rejected:'Отклонена',cancelled:'Отменена'};
    const label=document.getElementById('btOrderLabel');
    if(label)label.textContent='Заявка '+String(recent.id||'')+' · '+String(recent.device||'Техника')+' · '+(statuses[recent.status]||recent.display_status||'Обрабатывается');
}
function btRenderReferralPanel(box,r){
  if(!box)return;
  const url=String(r?.link||'');
  if(!r?.enabled||!url){box.hidden=true;box.replaceChildren();return;}
  box.hidden=false;
  box.innerHTML=`<b>🎁 Пригласить друга</b><p>Друг получит скидку ${Number(r.new_client_discount_percent)||0}%, а вам начислится ${Number(r.referrer_reward_percent)||0}% после его первого завершённого ремонта.</p><p>Накопленных скидок: ${Number(r.discount_credits)||0}. Приглашено: ${Number(r.invited_count)||0}.</p><input id="btReferralLink" readonly value="${escapeClient(url)}"><button type="button" onclick="btCopyReferralLink()">Копировать ссылку</button><button type="button" class="secondary" onclick="btShareReferralLink()">Поделиться</button>`;
}
function btRefreshClientReviewsEntry(){
 const el=document.getElementById('btClientReviewsEntry');if(!el)return;
 el.hidden=true;
 clientApi('/api/client/master-reviews').then(data=>{
   if(el.isConnected)el.hidden=!data.enabled;
 }).catch(()=>{if(el.isConnected)el.hidden=true});
}
function showClientMasterReviews(){
 setPage('⭐ Отзывы о мастере','<article class="card" id="btMasterReviewsPanel"><p class="subtitle">Загружаем отзывы…</p></article>');
 clientApi('/api/client/master-reviews').then(data=>{
   const el=document.getElementById('btMasterReviewsPanel');if(!el)return;
   if(!data.enabled){el.innerHTML='<p class="subtitle">Мастер пока не включил показ отзывов.</p>';return;}
   const reviews=Array.isArray(data.reviews)?data.reviews:[];
   const title='<h2>Отзывы о '+escapeClient(data.master_name||'мастере')+'</h2>';
   const summary=reviews.length?'<p class="subtitle">Оценка '+escapeClient(data.average_rating)+' из 5 · отзывов: '+escapeClient(data.count)+'</p>':'<p class="subtitle">Показ отзывов включён, но опубликованных отзывов ещё нет.</p>';
   el.innerHTML=title+summary+reviews.map(r=>'<div class="bt-public-review"><b>'+('⭐'.repeat(Math.min(5,Math.max(1,Number(r.rating)||1))))+'</b><small>'+escapeClient([r.device,r.brand].filter(Boolean).join(' · '))+' · '+escapeClient(String(r.created_at||'').slice(0,10))+'</small><p>'+escapeClient(r.text||'Без комментария')+'</p></div>').join('');
 }).catch(()=>{const el=document.getElementById('btMasterReviewsPanel');if(el)el.textContent='Не удалось загрузить отзывы. Повторите позже.'});
}
function btRefreshClientReferralEntry(){
 const el=document.getElementById('btClientReferralEntry');if(!el)return;
 el.hidden=true;
 clientApi('/api/client/referral').then(r=>{
   if(!el.isConnected)return;
   el.hidden=!(r.enabled&&r.link);
 }).catch(()=>{if(el.isConnected)el.hidden=true});
}
function showClientReferral(){
 setPage('🎁 Пригласить друга','<article class="card" id="btReferralPanel"><p class="subtitle">Проверяем доступность приглашений…</p></article>');
 clientApi('/api/client/referral').then(r=>{
   const box=document.getElementById('btReferralPanel');if(!box)return;
   if(!r.enabled||!r.link){box.innerHTML='<p class="subtitle">Реферальная программа у вашего мастера сейчас недоступна.</p>';return;}
   btRenderReferralPanel(box,r);
 }).catch(()=>{const box=document.getElementById('btReferralPanel');if(box)box.textContent='Не удалось проверить программу. Повторите позже.'});
}
function renderClientMenu() {
    window.RemontMobile?.enter('client/home',()=>renderClientMenu(),{root:true});
    btStopOrderProgressRefresh();
    btStopChatRefresh();
    if(btHomeTimer){clearInterval(btHomeTimer);btHomeTimer=null;}
    document.body.classList.remove('bt-inner-page', 'bt-order-page');
    document.body.innerHTML = `
        <main class="bt-client-home">
          <header class="bt-brand-head bt-compact-header bt-client-header"><img class="bt-brand-logo bt-header-logo" src="img/remont-bt-icon.png" alt="Remont BT"><div class="bt-header-copy"><span class="bt-header-hello">Здравствуйте!</span><strong class="bt-header-name" id="clientWelcomeName">${escapeClient(tg.initDataUnsafe?.user?.first_name || localStorage.getItem('remont_bt_name') || 'клиент')}</strong></div><span class="bt-header-role">👤 <span>Клиент</span></span></header>
          <button class="bt-client-promo-banner" type="button" onclick="showEnterPromo()"><span>🎁</span><span><b>У вас есть промокод?</b><small>Получите скидку на ремонт</small></span><span aria-hidden="true">›</span></button>
          <div class="client-home-grid bt-home-tiles">
            <button class="menu-btn" onclick="showNewOrder()"><span class="emoji bt-line-icon">⊕</span><b>Создать заявку</b><small>Новый ремонт</small></button>
            <button class="menu-btn" onclick="showMyOrders()"><span class="emoji bt-line-icon">▤</span><b>Мои заявки</b><small>История</small></button>
            <button class="menu-btn" onclick="showMyActs()"><span class="emoji bt-line-icon">◫</span><b>Мои акты</b><small>Гарантия</small></button>
            <button class="menu-btn" onclick="showEnterPromo()"><span class="emoji bt-line-icon">◇</span><b>Промокоды</b><small>Скидки</small></button>
            <button class="menu-btn bt-reviews-entry" id="btClientReviewsEntry" type="button" onclick="showClientMasterReviews()" hidden><span class="emoji bt-line-icon">☆</span><b>Отзывы о мастере</b><small>Оценки клиентов</small></button>
            <button class="menu-btn bt-referral-entry" id="btClientReferralEntry" type="button" onclick="showClientReferral()" hidden><span class="emoji bt-line-icon">↗</span><b>Пригласить друга</b><small>Рефералы</small></button>
            <button class="menu-btn" onclick="showProfile()"><span class="emoji bt-line-icon">◎</span><b>Профиль</b><small>Мои данные</small></button>
            <button class="menu-btn" onclick="showClientFAQ()"><span class="emoji bt-line-icon">♧</span><b>F.A.Q.</b><small>Помощь</small></button>
          </div>
          <section class="bt-live-panel" id="btRecentOrder" hidden><div class="bt-section-title">⚡ Электрическая цепь ремонта</div><div id="btOrderLabel" class="bt-order-label"></div><div class="bt-circuit"><span>Заявка</span><span>Принято</span><span>Ремонт</span><span>Акт</span></div></section>
          <section class="bt-live-panel bt-home-chat" id="btHomeChat" aria-label="Чат с мастером">
            <div class="bt-section-title">✉ Живой чат <span class="bt-glow-dot">●</span></div>
            <div id="btChatHistory" class="bt-chat-history bt-home-chat-history" aria-live="polite"><p class="subtitle">Загружаем переписку…</p></div>
            <form class="bt-chat-compose bt-home-chat-compose" onsubmit="event.preventDefault();sendClientMessage()">
              <label for="masterMessage">Сообщение мастеру</label>
              <textarea id="masterMessage" maxlength="1500" rows="2" placeholder="Напишите сообщение прямо здесь…"></textarea>
              <div class="bt-chat-compose-actions"><label class="bt-chat-attach" for="clientChatFile">＋ Фото / видео</label><input id="clientChatFile" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" hidden onchange="btDescribeChatFile()"><button id="clientChatSend" type="submit">➤ Отправить</button></div>
              <p id="clientChatFileName" class="subtitle"></p><p id="messageStatus" class="subtitle" role="status"></p>
            </form>
          </section>
          <div id="btAdvertiserSlot"></div><nav class="bt-client-bottom-nav" aria-label="Навигация"><button onclick="renderClientMenu()"><span>⌂</span>Главная</button><button onclick="showMyOrders()"><span>▤</span>Заявки</button><button onclick="btFocusHomeChat()"><span>✉</span>Чат</button><button onclick="showProfile()"><span>♙</span>Профиль</button></nav>
        </main>`;
    btRefreshClientReferralEntry();
    btRefreshClientReviewsEntry();
    clientApi('/api/advertiser/dashboard').then(d => {
        if (!d?.advertiser || document.getElementById('clientAdvertiserBtn')) return;
        const slot = document.getElementById('btAdvertiserSlot'); if (!slot) return;
        const btn = document.createElement('button'); btn.id='clientAdvertiserBtn'; btn.className='bt-main-action bt-advertiser-action';
        btn.textContent='📣 Кабинет рекламодателя'; btn.onclick=()=>openAdvertiserCabinet(); slot.appendChild(btn);
    }).catch(()=>{});
    clientApi('/api/client/dashboard').then(d => {
        const name=String(d.profile?.name||'').trim().replace(/\s+([.,!?])/g,'$1'); const n=document.getElementById('clientWelcomeName'); if(n&&name)n.textContent=name;
        btClientRecentOrder(d);
    }).catch(()=>{});
    // Home chat is functional, not a separate navigation screen.
    btRefreshClientChat(true);
    btChatAutoTimer=setInterval(()=>{
        if(document.getElementById('btHomeChat'))btRefreshClientChat(true);
        else btStopChatRefresh();
    },12000);
    btHomeTimer=setInterval(()=>{
        if(!document.querySelector('.bt-client-home')){clearInterval(btHomeTimer);btHomeTimer=null;return;}
        clientApi('/api/client/dashboard').then(d=>{
            btClientRecentOrder(d);
        }).catch(()=>{});
    },20000);
}

function showClientFAQ(){
    const items=[
      ['Как создать заявку?','На главной нажмите «Создать заявку», выберите технику и опишите неисправность. После отправки заявка появится в «Мои заявки».'],
      ['Как связаться с мастером?','Переписка расположена прямо на главной странице. Введите сообщение или прикрепите фото и видео.'],
      ['Где посмотреть статус ремонта?','Откройте «Мои заявки»: там отображается ход выполнения и актуальный статус.'],
      ['Где найти акт и гарантию?','В разделе «Мои акты» доступны документы, сумма ремонта и срок гарантии.'],
      ['Как применить промокод?','Перейдите в «Промокоды» и введите код. Условия скидки зависят от промокода.'],
      ['Можно ли повторить прошлую заявку?','Откройте прошлую заявку и выберите повторное обращение. Проверьте данные перед отправкой.']
    ];
    setPage('F.A.Q. — Помощь',`<article class="card bt-faq-card"><p class="subtitle">Частые вопросы о пользовании Remont BT.</p>${items.map(([q,a])=>`<details><summary>${escapeClient(q)}</summary><p>${escapeClient(a)}</p></details>`).join('')}<button type="button" onclick="renderClientMenu()">← Главная</button></article>`);
}
function btFocusHomeChat(){
    const chat=document.getElementById('btHomeChat');
    if(!chat){renderClientMenu();return;}
    chat.scrollIntoView({behavior:'smooth',block:'start'});
    const input=document.getElementById('masterMessage');
    if(input)setTimeout(()=>input.focus({preventScroll:true}),250);
}
function openAdvertiserCabinet(){
    if(window.RemontMobile?.confirmNavigation && !window.RemontMobile.confirmNavigation())return;
    const url=new URL('advertiser.html',location.href);
    const params=new URLSearchParams(location.search);
    for(const key of ['session_uid','session_exp','session_sig']){
        const value=params.get(key);if(value)url.searchParams.set(key,value);
    }
    // Telegram may not repeat initData after a page navigation in a WebView.
    // Store only for this tab. The server still verifies its signature and freshness.
    try{
        const telegramData=String(window.Telegram?.WebApp?.initData||'');
        if(telegramData){
            sessionStorage.setItem('remontbt_adv_auth',JSON.stringify({data:telegramData,uid:String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id||''),time:Date.now()}));
        }
    }catch(_){ }
    location.href=url.href;
}

function requestMasterRole() { showMasterApplicationForm(); }

function showMasterChoice() {
    setPage('🧑‍🔧 Кабинет мастера', `<div class="card master-choice-card">
      <p>Выберите действие:</p>
      <div class="master-choice-actions">
        <button class="master-choice-btn" type="button" onclick="showExistingMasterHelp()"><span>🔐</span><span><b>Я уже мастер</b><small>Войти в свой кабинет</small></span></button>
        <button class="master-choice-btn" type="button" onclick="showMasterApplicationForm()"><span>🧑‍🔧</span><span><b>Я хочу стать мастером</b><small>Отправить заявку администратору</small></span></button>
      </div>
    </div>`);
}

function showExistingMasterHelp(message='') {
    setPage('🔐 Вход мастера', `<form id="masterPhoneLoginForm" class="card master-auth-card">
      <p>Введите номер телефона, который привязан к вашему кабинету мастера.</p>
      <label for="masterPhoneLogin">Номер телефона</label>
      <input id="masterPhoneLogin" name="phone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="+998 90 123 45 67" value="${escapeClient(localStorage.getItem('remont_bt_phone') || '')}">
      <button id="masterPhoneLoginButton" type="submit">Проверить и войти</button>
      <p id="masterPhoneLoginStatus" class="${message?'error':'subtitle'}" role="status">${escapeClient(message || 'Доступ проверяется по вашему Telegram ID и номеру телефона.')}</p>
    </form>`);
    const form=document.getElementById('masterPhoneLoginForm');
    form?.addEventListener('submit', async e => {
      e.preventDefault();
      const field=document.getElementById('masterPhoneLogin');
      const status=document.getElementById('masterPhoneLoginStatus');
      const button=document.getElementById('masterPhoneLoginButton');
      const phone=cleanPhone(field?.value || '');
      if(!validPhone(phone)){status.textContent='Введите корректный номер +998XXXXXXXXX.';status.className='error';return;}
      const initData=String(window.Telegram?.WebApp?.initData || '');
      const query=new URLSearchParams(location.search);
      const sessionUid=query.get('session_uid')||'';const sessionExp=query.get('session_exp')||'';const sessionSig=query.get('session_sig')||'';
      const signedSession=sessionUid&&sessionExp&&sessionSig?`${sessionUid}:${sessionExp}:${sessionSig}`:String(localStorage.getItem('remontBT.master.session.v1')||'');
      if(!initData&&!signedSession){status.textContent='Откройте приложение кнопкой из чата с ботом Telegram. Обычная HTTPS-ссылка не подтверждает ваш Telegram ID.';status.className='error';return;}
      const apiBase=String(window.REMONT_ADVERTISER_API_BASE || '').replace(/\/$/,'');
      if(!apiBase){status.textContent='API не настроен. Сообщите администратору.';status.className='error';return;}
      button.disabled=true;status.textContent='Проверяем номер и Telegram ID…';status.className='subtitle';
      try{
        const response=await fetch(apiBase+'/api/master/login',{method:'POST',headers:{'Content-Type':'application/json',...(initData?{'X-Telegram-Init-Data':initData}:{}),...(signedSession?{'X-Remont-Session':signedSession}:{})},body:JSON.stringify({phone,master_uid:query.get('master_uid'),master_exp:query.get('master_exp'),master_sig:query.get('master_sig')}),cache:'no-store'});
        const data=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(data.error || `Ошибка входа (${response.status})`);
        if(!data.session || !data.user_id)throw new Error('Сервер не подтвердил кабинет мастера.');
        localStorage.setItem('remontBT.master.session.v1',data.session);
        localStorage.setItem('remont_bt_phone',phone);
        const target=new URL('index.html',location.href);target.searchParams.set('role','master');target.searchParams.set('appv','20261020-master-pinfl-order-fix5');
        status.textContent='Доступ подтверждён. Открываем кабинет…';status.className='notice';
        location.href=target.href;
      }catch(err){status.textContent=err.message || 'Не удалось проверить доступ.';status.className='error';button.disabled=false;}
    });
}

const MASTER_APPLICATION_QUEUE_KEY = 'remont_bt_master_application_queue_v2';
let masterApplicationSyncInProgress = false;

function normalizeMasterBirthDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    let day, month, year;
    let m = raw.match(/^(\d{2})(\d{2})(\d{4})$/);
    if (m) {
        day = Number(m[1]); month = Number(m[2]); year = Number(m[3]);
    } else {
        // Разрешены только ДД,ММ,ГГГГ / ДД.ММ.ГГГГ / ДД/ММ/ГГГГ / ДД\\ММ\\ГГГГ.
        m = raw.match(/^(\d{2})([.,/\\])(\d{2})\2(\d{4})$/);
        if (!m) return '';
        day = Number(m[1]); month = Number(m[3]); year = Number(m[4]);
    }
    const date = new Date(year, month - 1, day);
    if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() ||
        date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || date > new Date()) return '';
    return `${String(day).padStart(2,'0')}.${String(month).padStart(2,'0')}.${String(year).padStart(4,'0')}`;
}

function recoverMasterApplicationQueue() {
    const uid = currentMasterApplicationOwner();
    if (!/^\d{1,20}$/.test(uid)) return;
    const items = getMasterApplicationQueue();
    let changed = false;
    for (const item of items) {
        if (String(item.telegram_user_id || '') !== uid || item.status !== 'blocked') continue;
        const err = String(item.last_error || '');
        // Retry old requests blocked only because the API rejected the not-yet-registered user.
        if (/401|403|Telegram|авторизац|подтвердить/i.test(err)) {
            item.status = 'pending';
            item.last_error = '';
            changed = true;
        }
    }
    if (changed) saveMasterApplicationQueue(items);
}

function getMasterApplicationQueue() {
    try {
        const parsed = JSON.parse(localStorage.getItem(MASTER_APPLICATION_QUEUE_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
}
function saveMasterApplicationQueue(items) {
    try { localStorage.setItem(MASTER_APPLICATION_QUEUE_KEY, JSON.stringify(items.slice(-20))); return true; }
    catch (e) { console.error('Не удалось сохранить очередь заявки мастера:', e); return false; }
}
function currentMasterApplicationOwner() {
    return String(currentClientTelegramId || (typeof currentQueueOwnerId === 'function' ? currentQueueOwnerId() : '') || '');
}
function queueMasterApplication(data) {
    const uid = currentMasterApplicationOwner();
    if (!/^\d{1,20}$/.test(uid)) return false;
    const items = getMasterApplicationQueue().filter(x => String(x.telegram_user_id || '') !== uid);
    items.push({
        operation_id: (typeof uuidV4 === 'function' ? uuidV4() : `${Date.now()}-${Math.random()}`),
        telegram_user_id: uid,
        payload: {name:data.name, phone:data.phone, gender:data.gender, birth_date:data.birth_date, pinfl:data.pinfl},
        queued_at: new Date().toISOString(),
        attempts: 0,
        status: 'pending'
    });
    return saveMasterApplicationQueue(items);
}
function migrateLegacyMasterApplicationQueue() {
    if (typeof getOfflineQueue !== 'function' || typeof saveOfflineQueue !== 'function') return;
    const legacy = getOfflineQueue();
    const remain = [];
    let changed = false;
    for (const item of legacy) {
        if (item && item.event === 'submit_master_application' && ['pending','retry'].includes(item.local_status)) {
            const uid = String(item.telegram_user_id || '');
            const owner = currentMasterApplicationOwner();
            if (uid && uid === owner && item.name && item.phone && item.pinfl) {
                const current = getMasterApplicationQueue();
                if (!current.some(x => x.telegram_user_id === uid && x.payload?.pinfl === item.pinfl && x.payload?.phone === item.phone)) {
                    current.push({operation_id:item.operation_id || (typeof uuidV4==='function'?uuidV4():String(Date.now())), telegram_user_id:uid,
                        payload:{name:item.name,phone:item.phone,gender:item.gender,birth_date:item.birth_date,pinfl:item.pinfl},
                        queued_at:item.queued_at || new Date().toISOString(),attempts:0,status:'pending'});
                    saveMasterApplicationQueue(current);
                }
                changed = true;
                continue;
            }
        }
        remain.push(item);
    }
    if (changed) saveOfflineQueue(remain);
}
async function syncMasterApplicationQueue() {
    if (masterApplicationSyncInProgress || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
    const uid = currentMasterApplicationOwner();
    if (!/^\d{1,20}$/.test(uid)) return;
    const items = getMasterApplicationQueue();
    const item = items.find(x => String(x.telegram_user_id || '') === uid && x.status === 'pending');
    if (!item) return;
    masterApplicationSyncInProgress = true;
    try {
        const result = await clientApi('/api/master/apply', 'POST', item.payload);
        if (!result || result.ok !== true) throw new Error('Сервер не подтвердил приём заявки.');
        saveMasterApplicationQueue(getMasterApplicationQueue().filter(x => x.operation_id !== item.operation_id));
        try { localStorage.removeItem('remont_bt_master_application'); } catch (_) {}
        const status = document.getElementById('masterApplicationStatus');
        const button = document.querySelector('#masterApplicationForm button[type="submit"]');
        if (status) { status.textContent = result.already_master ? 'Кабинет мастера уже активен.' : 'Заявка отправлена на сервер и находится на рассмотрении.'; status.className = 'notice'; }
        if (button) { button.textContent = result.already_master ? 'Кабинет уже активен' : '✓ Заявка отправлена'; button.disabled = true; }
    } catch (err) {
        const authOrConfigError = /Telegram не передал данные авторизации|API не настроен|Откройте приложение кнопкой из чата/i.test(String(err?.message || ''));
        const current = getMasterApplicationQueue();
        const idx = current.findIndex(x => x.operation_id === item.operation_id);
        if (idx >= 0) {
            current[idx].attempts = Number(current[idx].attempts || 0) + 1;
            current[idx].last_attempt_at = new Date().toISOString();
            const statusCode = Number(err && err.status || 0);
            const retryableAuthFailure = statusCode === 401 || statusCode === 403 || /Telegram не передал данные авторизации|подтвердить Telegram|откройте приложение через кнопку бота/i.test(String(err?.message || ''));
            if ((statusCode >= 400 && statusCode < 500 && !retryableAuthFailure) || (authOrConfigError && !retryableAuthFailure)) {
                current[idx].status = 'blocked';
                current[idx].last_error = String(err.message || 'Сервер отклонил заявку');
            } else {
                current[idx].status = 'pending';
                current[idx].last_error = String(err.message || 'Временно не удалось отправить заявку');
            }
            saveMasterApplicationQueue(current);
        }
        const status = document.getElementById('masterApplicationStatus');
        const button = document.querySelector('#masterApplicationForm button[type="submit"]');
        const code = Number(err && err.status || 0);
        const retryableAuthFailure = code === 401 || code === 403 || /Telegram не передал данные авторизации|подтвердить Telegram|откройте приложение через кнопку бота/i.test(String(err?.message || ''));
        if (status && ((code >= 400 && code < 500 && !retryableAuthFailure) || (authOrConfigError && !retryableAuthFailure))) {
            status.textContent = `Сервер отклонил заявку: ${err.message || 'проверьте данные'}. Исправьте данные в форме и отправьте снова.`;
            status.className = 'error';
            if (button) { button.textContent = 'Проверить данные и отправить заявку'; button.disabled = false; }
        } else if (status) {
            status.textContent = 'Заявка сохранена в очереди и автоматически отправится, когда сервер подтвердит авторизацию или восстановится связь. Ничего дополнительно нажимать не нужно.';
            status.className = 'notice';
            if (button) { button.textContent = '⏳ Заявка ожидает отправки'; button.disabled = true; }
        }
        // Network errors and 5xx responses stay pending and are retried automatically.
        console.warn('Автосинхронизация заявки мастера не завершена:', err?.message || err);
    } finally { masterApplicationSyncInProgress = false; }
}
function startMasterApplicationAutoSync() {
    migrateLegacyMasterApplicationQueue();
    recoverMasterApplicationQueue();
    syncMasterApplicationQueue();
}
window.addEventListener('online', startMasterApplicationAutoSync);
window.addEventListener('focus', startMasterApplicationAutoSync);
document.addEventListener('visibilitychange', () => { if (!document.hidden) startMasterApplicationAutoSync(); });
setInterval(startMasterApplicationAutoSync, 15000);

function showMasterApplicationForm() {
    // The previous version kept the full master application (including PINFL) as a reusable local draft.
    // Pending offline submissions now live in a separate, automatically synchronized queue.
    let saved = {};
    try { localStorage.removeItem('remont_bt_master_application'); } catch (_) {}
    setPage('🧑‍🔧 Заявка мастера', `<p class="subtitle">Укажите ФИО, телефон и данные для проверки ПИНФЛ. Пол и дата рождения сверяются с первыми цифрами ПИНФЛ. После проверки заявка уйдёт администратору; доступ выдаётся только после одобрения и привязывается к вашему Telegram ID.</p>
      <form id="masterApplicationForm" class="card master-auth-card">
        <label for="masterApplicationName">ФИО *</label><input id="masterApplicationName" name="name" required minlength="2" maxlength="150" autocomplete="name" value="${escapeClient(saved.name || localStorage.getItem('remont_bt_name') || '')}">
        <label for="masterApplicationPhone">Телефон *</label><input id="masterApplicationPhone" name="phone" required type="tel" inputmode="tel" autocomplete="tel" placeholder="+998 90 123 45 67" value="${escapeClient(saved.phone || localStorage.getItem('remont_bt_phone') || '')}">
        <label for="masterApplicationGender">Пол *</label><select id="masterApplicationGender" name="gender" required><option value="">Выберите пол</option><option value="Мужской" ${saved.gender==='Мужской'?'selected':''}>Мужской</option><option value="Женский" ${saved.gender==='Женский'?'selected':''}>Женский</option></select>
        <label for="masterApplicationBirthDate">Дата рождения *</label><input id="masterApplicationBirthDate" name="birth_date" required inputmode="numeric" autocomplete="bday" placeholder="ДДММГГГГ или ДД.ММ.ГГГГ" value="${escapeClient(saved.birth_date || '')}">
        <label for="masterApplicationPinfl">ПИНФЛ (14 цифр) *</label><input id="masterApplicationPinfl" name="pinfl" required inputmode="numeric" autocomplete="off" minlength="14" maxlength="14" pattern="[0-9]{14}" placeholder="14 цифр" value="${escapeClient(saved.pinfl || '')}">
        <button type="submit">Проверить данные и отправить заявку</button><p id="masterApplicationStatus" class="subtitle" role="status"></p>
      </form>`);
    // Phone is already verified in Telegram before either cabinet is opened.
    clientApi('/api/client/profile').then(d => {
        const phone = d?.profile?.phone;
        const field = document.getElementById('masterApplicationPhone');
        if (phone && field) { field.value = phone; field.readOnly = true; }
    }).catch(() => {});
    const form=document.getElementById('masterApplicationForm');
    form?.addEventListener('submit',e=>{e.preventDefault();submitMasterApplication(form);});
    const birthInput = document.getElementById('masterApplicationBirthDate');
    birthInput?.addEventListener('blur', () => {
      const normalized = normalizeMasterBirthDate(birthInput.value);
      if (normalized) birthInput.value = normalized;
    });
    const uid = currentMasterApplicationOwner();
    const queued = getMasterApplicationQueue().find(x => String(x.telegram_user_id || '') === uid && ['pending','blocked'].includes(x.status));
    if (queued) {
      const status = document.getElementById('masterApplicationStatus');
      const button = form?.querySelector('button[type="submit"]');
      if (queued.status === 'pending') {
        if (status) { status.textContent='Есть заявка, ожидающая отправки. Она отправится автоматически при восстановлении связи.'; status.className='notice'; }
        if (button) { button.textContent='⏳ Заявка ожидает отправки'; button.disabled=true; }
      } else {
        if (status) { status.textContent=`Не удалось автоматически отправить сохранённую заявку: ${queued.last_error || 'проверьте авторизацию Telegram и данные'}. Исправьте данные и отправьте снова.`; status.className='error'; }
        if (button) { button.textContent='Проверить данные и отправить заявку'; button.disabled=false; }
      }
    }
    startMasterApplicationAutoSync();
}

async function submitMasterApplication(form){
    const data=Object.fromEntries(new FormData(form).entries());
    data.name=String(data.name||'').trim(); data.phone=cleanPhone(data.phone); data.gender=String(data.gender||'').trim(); data.birth_date=normalizeMasterBirthDate(data.birth_date); data.pinfl=String(data.pinfl||'').replace(/\D/g,''); data.event='submit_master_application';
    const status=document.getElementById('masterApplicationStatus');
    const button=form.querySelector('button[type="submit"]');
    if(data.name.length<2)return showAlert('Введите ФИО.');
    if(!validPhone(data.phone))return showAlert('Введите корректный номер +998XXXXXXXXX.');
    if(!['Мужской','Женский'].includes(data.gender))return showAlert('Выберите пол.');
    if(!data.birth_date)return showAlert('Не удалось распознать дату. Используйте только ДДММГГГГ, ДД,ММ,ГГГГ, ДД.ММ.ГГГГ, ДД/ММ/ГГГГ или ДД\\ММ\\ГГГГ.');
    const [birthDay,birthMonth,birthYear]=data.birth_date.split('.').map(Number);
    if(!/^\d{14}$/.test(data.pinfl))return showAlert('ПИНФЛ должен содержать ровно 14 цифр.');
    const first=Number(data.pinfl[0]); const map={3:['Мужской',1900],4:['Женский',1900],5:['Мужской',2000],6:['Женский',2000]}; const pin=map[first];
    if(!pin)return showAlert('Первая цифра ПИНФЛ не соответствует допустимому формату.');
    // PINFL: first digit = century/gender, then DDMMYY. Example: 3 20 04 95 = 20.04.1995.
    const pinDate=`${data.pinfl.slice(1,3)}.${data.pinfl.slice(3,5)}.${pin[1]+Number(data.pinfl.slice(5,7))}`;
    if(pin[0]!==data.gender||pinDate!==data.birth_date)return showAlert(`Проверьте данные: по ПИНФЛ указаны пол ${pin[0]} и дата рождения ${pinDate}.`);
    try {
      localStorage.setItem('remont_bt_phone',data.phone);
      localStorage.setItem('remont_bt_name',data.name);
      if(currentClientTelegramId)localStorage.setItem('remont_bt_profile_uid',currentClientTelegramId);
    } catch(_) {}
    // Persist first, then try the server. This prevents a 401/network error from losing the form.
    if(!queueMasterApplication(data)) {
      if(status){status.textContent='Не удалось сохранить заявку в очереди устройства. Освободите место в браузере и повторите.';status.className='error';}
      if(button)button.disabled=false;
      return;
    }
    if(button){button.disabled=true;button.textContent='⏳ Отправляем заявку…';}
    await syncMasterApplicationQueue();
}

async function clientApi(path, method='GET', body=null) {
    // Telegram may restore the Mini App after navigation; initialise the SDK before requests.
    try { if (window.Telegram?.WebApp) { window.Telegram.WebApp.ready(); window.Telegram.WebApp.expand(); } } catch (_) {}
    const initData = String(window.Telegram?.WebApp?.initData || '');
    const query = new URLSearchParams(window.location.search);
    const sessionUid = query.get('session_uid') || '';
    const sessionExp = query.get('session_exp') || '';
    const sessionSig = query.get('session_sig') || '';
    const signedSession = sessionUid && sessionExp && sessionSig ? `${sessionUid}:${sessionExp}:${sessionSig}` : '';
    if (!initData && !signedSession) throw new Error('Telegram не передал данные авторизации. Нажмите /start в чате с ботом, чтобы обновить кнопку приложения.');
    const base = String(window.REMONT_ADVERTISER_API_BASE || '').replace(/\/$/, '');
    if (!base) throw new Error('API временно недоступен. Откройте приложение позже.');
    const headers = {'Content-Type':'application/json'};
    if (initData) headers['X-Telegram-Init-Data'] = initData;
    if (signedSession) headers['X-Remont-Session'] = signedSession;
    const res = await fetch(base + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store'
    });
    let data = {};
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) { const err = new Error(data.error || `Ошибка запроса (${res.status})`); err.status = res.status; throw err; }
    return data;
}

// Unified mobile navigation replaces legacy client-specific touch handlers.
let btClientPageBack=()=>renderClientMenu();
let btClientActPreviewNumber='';
function btClientRestoreRoute(title){
    if(title.includes('Отзывы о мастере'))return ()=>showClientMasterReviews();
    if(title.includes('Пригласить друга'))return ()=>showClientReferral();
    if(title.includes('F.A.Q.'))return ()=>showClientFAQ();
    if(title.includes('Кабинет мастера'))return ()=>showMasterChoice();
    if(title.includes('Вход мастера'))return ()=>showExistingMasterHelp();
    if(title.includes('Заявка мастера'))return ()=>showMasterApplicationForm();
    if(title.includes('Мои заявки'))return ()=>showMyOrders();
    if(title.includes('Акты и документы'))return ()=>showMyActs();
    if(title.includes('Просмотр акта')){const number=btClientActPreviewNumber;return ()=>showClientActPreview(number);}
    if(title.includes('Промокоды'))return ()=>showEnterPromo();
    if(title.includes('Профиль'))return ()=>showProfile();
    if(title.includes('Живой чат'))return ()=>showMessages();
    if(title.includes('Контакты мастера'))return ()=>showCallMaster();
    return ()=>renderClientMenu();
}
function setPage(title, body) {
    window.RemontMobile?.enter('client/page/'+title+(title.includes('Просмотр акта')?'/'+btClientActPreviewNumber:''),btClientRestoreRoute(title));
    btStopOrderProgressRefresh();
    if(!String(title).includes('Живой чат'))btStopChatRefresh();
    if(btHomeTimer){clearInterval(btHomeTimer);btHomeTimer=null;}
    document.body.classList.add('bt-inner-page');
    document.body.classList.remove('bt-order-page');
    btClientPageBack=()=>renderClientMenu();
    document.body.innerHTML = `<main class="bt-inner-content"><button class="back-btn" onclick="btClientPageBack()">← Главная</button><h1>${title}</h1>${body}</main>` + btClientBottomNav();
}

function btClientBottomNav() {
    return `<nav class="bt-client-bottom-nav bt-inner-nav" aria-label="Навигация"><button type="button" onclick="renderClientMenu()"><span>⌂</span>Главная</button><button type="button" onclick="showMyOrders()"><span>▤</span>Заявки</button><button type="button" onclick="btFocusHomeChat()"><span>✉</span>Чат</button><button type="button" onclick="showProfile()"><span>♙</span>Профиль</button></nav>`;
}

const btOrderStatusLabels = {
    new: 'Ожидает мастера', accepted: 'Принята мастером', in_progress: 'Выполняется ремонт',
    act_issued: 'Ожидает подтверждения акта', act_pending_delivery:'Акт готов — ожидает уведомления', rejected: 'Отклонена мастером',
    closed: 'Завершена', completed: 'Завершена', cancelled: 'Отменена'
};
function btOrderTimeline(o) {
    const status = String(o.status || 'new');
    const steps = [{label:'Заявка',done:true},{label:'Принято',done:['accepted','in_progress','act_issued','closed','completed'].includes(status)},
        {label:'Ремонт',done:['act_issued','closed','completed'].includes(status)},
        {label:'Акт',done:['act_issued','closed','completed'].includes(status)}];
    if (status === 'rejected' || status === 'cancelled') return `<div class="bt-order-stage-note">${escapeClient(btOrderStatusLabels[status])}</div>`;
    return `<div class="bt-status-timeline" aria-label="Этапы заявки">${steps.map(s=>`<span class="${s.done?'done':''}"><i>${s.done?'✓':'·'}</i>${s.label}</span>`).join('')}</div>`;
}
function btOrderCards(rows) {
    return rows.length ? rows.map(o => {
        const confirmationReady=Boolean(o.can_confirm_act === true);
        const displayStatus=String(o.display_status||o.status||'');
        const label=btOrderStatusLabels[displayStatus]||displayStatus||'Обрабатывается';
        const date=String(o.updated_at||o.act_issued_at||o.created_at||'').replace('T',' ').slice(0,16);
        let deadline='';
        const remaining=Number(o.act_confirmation_deadline||0)*1000-Date.now();
        if(confirmationReady && remaining>0)deadline=`<p class="subtitle">Если не подтвердить акт, он может автоматически закрыться после ${Math.ceil(remaining/60000)} мин. Ознакомьтесь с документом заранее.</p>`;
        return `<article class="card bt-order-progress-card">
            <div class="card-row"><b>${escapeClient(o.id||'Заявка')}</b><span class="status-pill">${escapeClient(label)}</span></div>
            <h3>${escapeClient([o.device,o.brand,o.model].filter(Boolean).join(' ')||'Ремонт техники')}</h3>
            <p>${escapeClient(o.problem||'')}</p>${btOrderTimeline(o)}
            <p class="subtitle">Обновлено: ${escapeClient(date||'—')}</p>
            ${o.promocode?`<p>🎟️ Промокод: ${escapeClient(o.promocode)}</p>`:''}
            ${confirmationReady?`<button onclick="confirmClientAct('${escapeClient(o.id)}')">✅ Подтвердить выполнение</button>${deadline}`:''}
            <button type="button" class="secondary" onclick="btRepeatOrder('${escapeClient(o.id)}')">↻ Повторить заявку</button>
        </article>`;
    }).join('') : '<div class="card">Заявок пока нет. Создайте первую заявку.</div>';
}
async function btRefreshOrderCards() {
    if (document.hidden || !document.getElementById('btOrdersList')) return;
    try {
        const result=await clientApi('/api/client/dashboard');
        const list=document.getElementById('btOrdersList');
        if(list)list.innerHTML=btOrderCards(result.orders||[]);
    } catch(_) { /* Keep last known status; users may retry manually. */ }
}
async function showMyOrders() {
    setPage('📋 Мои заявки', '<p class="subtitle">Загружаем ваши заявки…</p>');
    try {
        const d = await clientApi('/api/client/dashboard');
        setPage('📋 Мои заявки', `<p class="subtitle">Статусы обновляются автоматически каждые 20 секунд.</p><div id="btOrdersList">${btOrderCards(d.orders||[])}</div>`);
        btOrderProgressTimer=setInterval(btRefreshOrderCards,20000);
    } catch (e) { setPage('📋 Мои заявки', `<div class="card error">${escapeClient(e.message)}</div>`); }
}

async function confirmClientAct(orderId) {
    if (tg && typeof tg.showConfirm === 'function') {
        tg.showConfirm('Подтверждаете, что работы выполнены?', async yes => {
            if (yes) await confirmClientActRequest(orderId);
        });
        return;
    }
    if (confirm('Подтверждаете, что работы выполнены?')) await confirmClientActRequest(orderId);
}
async function confirmClientActRequest(orderId) {
    try {
        const r = await clientApi('/api/client/confirm-act', 'POST', {order_id: orderId});
        if (tg && typeof tg.showAlert === 'function') tg.showAlert(r.message || 'Заявка закрыта.');
        await showMyOrders();
    } catch (e) {
        if (e.status===409) { await showMyOrders(); showAlert('Статус обновился. Заявка больше не требует подтверждения.'); }
        else showAlert(e.message);
    }
}

let btClientActsCache=[];
const btActMoney=value=>new Intl.NumberFormat('ru-RU').format(Number(value||0))+' сум';
function btWarrantyIndicator(act){
    const raw=String(act.guarantee_until||'');
    const m=/^(\d{2})\.(\d{2})\.(\d{4})$/.exec(raw);
    if(!m || Number(act.guarantee_days||0)===0)return '<p class="subtitle">Гарантия: согласно условиям акта.</p>';
    const end=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),23,59,59);
    const active=Number.isFinite(end.getTime())&&end>=new Date();
    return `<p class="bt-warranty-note ${active?'bt-warranty-active':'bt-warranty-expired'}">${active?'✓ Гарантия действует':'Срок гарантии истёк'}</p>`;
}
async function showMyActs() {
    setPage('📄 Акты и документы', '<p class="subtitle">Загружаем документы…</p>');
    try {
        const d = await clientApi('/api/client/dashboard');
        btClientActsCache = d.acts || [];
        const statuses={sending:'Отправляется',sent:'Отправлен клиенту',pending_client:'Ожидает регистрации клиента',pending_delivery:'Ожидает доставки',confirmed:'Подтверждён',cancelled:'Отменён',draft:'Черновик'};
        const content=btClientActsCache.length?btClientActsCache.map(a=>`<article class="card">
          <div class="card-row"><b>Акт № ${escapeClient(a.number||'—')}</b><span class="status-pill">${escapeClient(statuses[a.status]||a.status||'—')}</span></div>
          <p>${escapeClient([a.device,a.brand,a.model].filter(Boolean).join(' '))}</p>
          <p>Стоимость ремонта: ${escapeClient(btActMoney(a.price))}</p>
          ${Number(a.discount_amount||0)>0?`<p>Скидка: −${escapeClient(btActMoney(a.discount_amount))}</p>`:''}
          <p><b>Итого: ${escapeClient(btActMoney(a.final_price??a.price))}</b></p>
          <p>Гарантия: ${escapeClient(a.guarantee_text||'—')} · до ${escapeClient(a.guarantee_until||'—')}</p>
          ${btWarrantyIndicator(a)}
          <button type="button" onclick="showClientActPreview('${escapeClient(a.number)}')">📄 Посмотреть акт</button></article>`).join(''):'<div class="card">Актов пока нет.</div>';
        setPage('📄 Акты и документы',content);
    } catch(e){setPage('📄 Акты и документы',`<div class="card error">${escapeClient(e.message)}</div>`);}
}
function showClientActPreview(number){
    btClientActPreviewNumber=number;
    const act=btClientActsCache.find(a=>String(a.number)===String(number));
    if(!act){showMyActs();return;}
    const works=Array.isArray(act.works)?act.works:[];
    setPage('📄 Просмотр акта',`<article class="card bt-act-readable"><h2>Акт № ${escapeClient(act.number)}</h2>
      <p><b>Техника:</b> ${escapeClient([act.device,act.brand,act.model].filter(Boolean).join(' '))}</p>
      <p><b>Выполненные работы:</b></p><ol>${works.map(w=>`<li>${escapeClient(w)}</li>`).join('')||'<li>Не указаны</li>'}</ol>
      <p><b>Стоимость ремонта:</b> ${escapeClient(btActMoney(act.price))}</p>
      ${Number(act.discount_amount||0)>0?`<p><b>Скидка:</b> −${escapeClient(btActMoney(act.discount_amount))}</p>`:''}
      <p><b>Итого к оплате:</b> ${escapeClient(btActMoney(act.final_price??act.price))}</p>
      <p><b>Гарантия:</b> ${escapeClient(act.guarantee_text||'—')} · до ${escapeClient(act.guarantee_until||'—')}</p>
      <p>Для просмотра оригинала нажмите «Открыть PDF».</p>
      <button type="button" onclick="openClientActPdf('${escapeClient(number)}')">📄 Открыть PDF</button>
      <button type="button" class="secondary" onclick="downloadClientActPdf('${escapeClient(number)}')">↓ Сохранить PDF</button>
      <button type="button" class="back-btn" onclick="showMyActs()">← Все акты</button></article>`);
}
async function openClientActPdf(number){
    try{
        const r=await clientApi(`/api/client/acts/${encodeURIComponent(String(number))}/view-link`,'POST',{});
        const url=String(window.REMONT_ADVERTISER_API_BASE||'http://127.0.0.1:8767').replace(/\/$/,'')+r.path;
        const app=window.Telegram?.WebApp;
        if(app&&typeof app.openLink==='function')app.openLink(url,{try_instant_view:false});
        else window.open(url,'_blank','noopener,noreferrer');
    }catch(e){showAlert(e.message)}
}
async function downloadClientActPdf(number){
    try{
        const base=String(window.REMONT_ADVERTISER_API_BASE||'http://127.0.0.1:8767').replace(/\/$/,'');
        const link=await clientApi(`/api/client/acts/${encodeURIComponent(String(number))}/view-link`,'POST',{});
        const r=await fetch(base+link.path,{cache:'no-store'});
        if(!r.ok){const err=await r.json().catch(()=>({}));throw Error(err.error||'PDF недоступен')}
        const blob=await r.blob(),url=URL.createObjectURL(blob);
        const a=document.createElement('a');a.href=url;a.download=`Akt_${String(number).replace(/[^a-zA-Z0-9_-]/g,'_')}.pdf`;
        document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(e){showAlert(e.message)}
}

function showEnterPromo() {
    // Promo codes must remain usable even when referrals are disabled.
    setPage('🎟️ Промокоды', '<div class="card"><label>Введите промокод</label><input id="promo_code" placeholder="REMONT10" maxlength="64" autocapitalize="characters"><button id="promoSubmit" onclick="submitPromoFromApp()">Активировать</button><p id="promoStatus" class="subtitle"></p></div><div class="card" id="btReferralPanel" hidden></div>');
    clientApi('/api/client/referral').then(r=>btRenderReferralPanel(document.getElementById('btReferralPanel'),r))
       .catch(()=>{const box=document.getElementById('btReferralPanel');if(box){box.hidden=true;box.replaceChildren();}});
}

async function btCopyReferralLink() {
    const text=document.getElementById('btReferralLink')?.value||''; if(!text)return;
    try { await navigator.clipboard.writeText(text); showAlert('Ссылка скопирована.'); }
    catch(_) { document.getElementById('btReferralLink')?.select(); showAlert('Выделена ссылка — скопируйте её.'); }
}
function btShareReferralLink(){
    const link=document.getElementById('btReferralLink')?.value||''; if(!link)return;
    const share='https://t.me/share/url?url='+encodeURIComponent(link)+'&text='+encodeURIComponent('Приглашаю в Remont BT!');
    if(tg?.openTelegramLink)tg.openTelegramLink(share);else window.open(share,'_blank','noopener');
}
async function submitPromoFromApp() {
    const code = (document.getElementById('promo_code')?.value || '').trim().toUpperCase();
    const status = document.getElementById('promoStatus');
    if (!code) { status.textContent = 'Введите промокод.'; return; }
    try { const r = await clientApi('/api/client/promo', 'POST', {code}); status.textContent = r.message || 'Промокод активирован.'; status.className = 'notice'; }
    catch (e) { status.textContent = e.message; status.className = 'error'; }
}

async function showProfile() {
    setPage('👤 Профиль', '<p class="subtitle">Загружаем профиль…</p>');
    try {
        const d = await clientApi('/api/client/profile'); const p = d.profile || {};
        setPage('👤 Профиль', `<form id="profileForm" class="card">${p.public_name?`<p class="notice"><b>Ваш номер в Remont BT:</b> ${escapeClient(p.public_name)}</p>`:''}<label>ФИО</label><input name="name" required minlength="2" value="${escapeClient(p.name || '')}"><label>Телефон</label><input name="phone" type="tel" required value="${escapeClient(p.phone || '')}"><label>Пол</label><select name="gender"><option value="">Не указан</option><option ${p.gender==='Мужской'?'selected':''}>Мужской</option><option ${p.gender==='Женский'?'selected':''}>Женский</option></select><label>Дата рождения (ДД.ММ.ГГГГ)</label><input name="birth_date" inputmode="numeric" pattern="[0-9.]*" placeholder="25.04.1995" value="${escapeClient(p.birth_date || '')}"><label>ПИНФЛ (14 цифр)</label><input name="pinfl" inputmode="numeric" maxlength="14" value="${escapeClient(p.pinfl || '')}"><button type="submit">Сохранить профиль</button><p id="profileStatus" class="subtitle"></p></form><button type="button" class="secondary" onclick="showClientFAQ()">♧ F.A.Q. — Помощь</button><p class="subtitle">При активной рассрочке изменение профиля блокируется до полного погашения.</p>`);
        document.getElementById('profileForm').addEventListener('submit', saveClientProfile);
    } catch (e) {
        let p={}; try{p={name:localStorage.getItem('remont_bt_name')||'',phone:localStorage.getItem('remont_bt_phone')||''};}catch(_){}
        renderLocalProfile(p, 'Данные сохранены локально, сервер пока недоступен.');
    }
}
function renderLocalProfile(p, note='') {
    setPage('👤 Профиль', `<form id="profileForm" class="card"><p class="subtitle">${escapeClient(note)}</p><label>ФИО</label><input name="name" required minlength="2" value="${escapeClient(p.name||'')}"><label>Телефон</label><input name="phone" type="tel" required value="${escapeClient(p.phone||'')}"><label>Пол</label><select name="gender"><option value="">Не указан</option><option ${p.gender==='Мужской'?'selected':''}>Мужской</option><option ${p.gender==='Женский'?'selected':''}>Женский</option></select><label>Дата рождения (ДД.ММ.ГГГГ)</label><input name="birth_date" inputmode="numeric" pattern="[0-9.]*" placeholder="25.04.1995" value="${escapeClient(p.birth_date||'')}"><label>ПИНФЛ (14 цифр)</label><input name="pinfl" inputmode="numeric" maxlength="14" value="${escapeClient(p.pinfl||'')}"><button type="submit">Сохранить профиль</button><p id="profileStatus" class="subtitle"></p></form>`);
    document.getElementById('profileForm').addEventListener('submit',saveClientProfile);
}
async function saveClientProfile(event) {
    event.preventDefault(); const f = new FormData(event.currentTarget); const status = document.getElementById('profileStatus');
    const data = Object.fromEntries(f.entries()); data.name=String(data.name||'').trim(); data.phone=cleanPhone(data.phone);
    if(data.name.length<2||!validPhone(data.phone)){status.textContent='Проверьте ФИО и номер +998XXXXXXXXX.';status.className='error';return;}
    try { localStorage.setItem('remont_bt_name',data.name); localStorage.setItem('remont_bt_phone',data.phone); } catch(_){}
    try {
      const r = await clientApi('/api/client/profile', 'POST', data);window.RemontMobile?.clearDirty(); status.textContent = r.message || 'Профиль сохранён на сервере.'; status.className = 'notice';
    } catch (e) {
      if(typeof queueOperation==='function') queueOperation({event:'register_client',client_name:data.name,client_phone:data.phone,client_registration_id:getClientRegistrationId(data.phone),client_registration_no:getClientRegistrationNo(data.phone)});
      status.textContent='Данные сохранены на устройстве и поставлены в очередь. Передайте очередь через кнопку внизу приложения.'; status.className='notice';
    }
}

let btChatAutoTimer = null;
let btChatBlobUrls = [];
function btStopChatRefresh() {
    if(btChatAutoTimer){clearInterval(btChatAutoTimer);btChatAutoTimer=null;}
    btChatBlobUrls.forEach(url=>URL.revokeObjectURL(url));btChatBlobUrls=[];
}
function btChatAuthHeaders(){
    const headers={};
    const initData=String(window.Telegram?.WebApp?.initData||'');
    const query=new URLSearchParams(location.search);
    const uid=query.get('session_uid'),exp=query.get('session_exp'),sig=query.get('session_sig');
    if(initData)headers['X-Telegram-Init-Data']=initData;
    if(uid&&exp&&sig)headers['X-Remont-Session']=`${uid}:${exp}:${sig}`;
    if(!Object.keys(headers).length)throw new Error('Откройте чат через кнопку Telegram.');
    return headers;
}
async function btLoadChatMedia(container, mediaId, kind){
    if(!container || !container.isConnected || !/^[a-f0-9]{32}$/.test(mediaId))return;
    try{
        const base=String(window.REMONT_ADVERTISER_API_BASE||'').replace(/\/$/,'');
        const res=await fetch(`${base}/api/chat/media/${encodeURIComponent(mediaId)}`,{headers:btChatAuthHeaders(),cache:'no-store'});
        if(!res.ok)throw new Error('Не удалось получить вложение');
        const blob=await res.blob();
        if(!container.isConnected)return;
        const url=URL.createObjectURL(blob);btChatBlobUrls.push(url);
        container.innerHTML='';
        const media=document.createElement(kind==='video'?'video':'img');
        media.src=url;media.className='bt-chat-media';
        if(kind==='video'){media.controls=true;media.preload='metadata';}
        media.alt=kind==='photo'?'Фото из переписки':'Видео из переписки';
        container.appendChild(media);
    }catch(e){if(container.isConnected)container.textContent=e.message;}
}
function btChatBubble(m){
    const mine=String(m.from_id)===String(tg?.initDataUnsafe?.user?.id||currentClientTelegramId);
    const media=String(m.media_id||'');const kind=m.type==='video'?'video':m.type==='photo'?'photo':'';
    return `<div class="bt-chat-bubble ${mine?'mine':'theirs'}"><div class="bt-chat-sender">${mine?'Вы':'Мастер'}</div>`+
        (m.text?`<p>${escapeClient(m.text)}</p>`:'')+
        (kind&&/^[a-f0-9]{32}$/.test(media)?`<div class="bt-chat-media-slot" data-media-id="${media}" data-media-kind="${kind}">Загружаем ${kind==='photo'?'фото':'видео'}…</div>`:'')+
        `<small>${escapeClient(String(m.created_at||'').replace('T',' ').slice(0,16))}</small></div>`;
}
async function btRefreshClientChat(silent=false){
    if(!document.getElementById('btChatHistory'))return;
    try{
        const d=await clientApi('/api/client/dashboard');
        const rows=Array.isArray(d.messages)?d.messages:[];
        const history=document.getElementById('btChatHistory');if(!history)return;
        const fingerprint=rows.map(m=>`${m.id}:${m.media_id||''}`).join('|');
        if(history.dataset.fingerprint===fingerprint)return;
        btChatBlobUrls.forEach(url=>URL.revokeObjectURL(url));btChatBlobUrls=[];
        history.dataset.fingerprint=fingerprint;
        history.innerHTML=rows.length?rows.map(btChatBubble).join(''):'<p class="subtitle">Пока нет сообщений. Напишите мастеру прямо здесь.</p>';
        for(const slot of history.querySelectorAll('[data-media-id]'))btLoadChatMedia(slot,slot.dataset.mediaId,slot.dataset.mediaKind);
        // Polling обновляет только историю сообщений. PDF здесь не создаём и не скачиваем.
    }catch(e){
        if(!silent){
            const history=document.getElementById('btChatHistory');
            if(history)history.innerHTML=`<p class="subtitle">${escapeClient(e.message||'Чат временно недоступен')}</p>`;
        }
        const status=document.getElementById('messageStatus');
        if(status && !silent)status.textContent=e.message||'Не удалось загрузить чат.';
    }
}
async function showMessages(){
    btStopChatRefresh();
    setPage('💬 Живой чат',`<section class="bt-chat-shell"><div id="btChatHistory" class="bt-chat-history"><p class="subtitle">Загружаем переписку…</p></div>
    <form class="bt-chat-compose" onsubmit="event.preventDefault();sendClientMessage()">
    <label for="masterMessage">Сообщение мастеру</label><textarea id="masterMessage" maxlength="1500" rows="2" placeholder="Напишите сообщение…"></textarea>
    <div class="bt-chat-compose-actions"><label class="bt-chat-attach" for="clientChatFile">＋ Фото / видео</label><input id="clientChatFile" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onchange="btDescribeChatFile()" hidden><button id="clientChatSend" type="submit">➤ Отправить</button></div>
    <p id="clientChatFileName" class="subtitle"></p><p id="messageStatus" role="status" class="subtitle"></p></form></section>`);
    await btRefreshClientChat();
    btChatAutoTimer=setInterval(()=>{if(document.getElementById('btChatHistory'))btRefreshClientChat(true);else btStopChatRefresh();},12000);
}
function btDescribeChatFile(){
    const file=document.getElementById('clientChatFile')?.files?.[0];
    const target=document.getElementById('clientChatFileName');
    if(target)target.textContent=file?`${file.name} · ${(file.size/1048576).toFixed(1)} МБ (максимум 6 МБ)`:' ';
}
function btFileToBase64(file){
    return new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onerror=()=>reject(new Error('Не удалось прочитать файл.'));
        reader.onload=()=>resolve(String(reader.result||'').split(',')[1]||'');
        reader.readAsDataURL(file);
    });
}
async function sendClientMessage(){
    const field=document.getElementById('masterMessage'),status=document.getElementById('messageStatus'),btn=document.getElementById('clientChatSend');
    const file=document.getElementById('clientChatFile')?.files?.[0];
    const text=String(field?.value||'').trim();
    if(!text&&!file){status.textContent='Напишите сообщение или добавьте файл.';return;}
    if(file&&file.size>6*1024*1024){status.textContent='Фото или видео должно быть не больше 6 МБ.';return;}
    btn.disabled=true;status.className='subtitle';status.textContent='Отправляем…';
    try{
        let response;
        if(file){
            const allowed=['image/jpeg','image/png','image/webp','video/mp4','video/webm'];
            if(!allowed.includes(file.type))throw new Error('Выберите JPG, PNG, WebP, MP4 или WebM.');
            const content=await btFileToBase64(file);
            response=await clientApi('/api/client/message-media','POST',{text,media_type:file.type,file_name:file.name,data:content});
        }else response=await clientApi('/api/client/message','POST',{text});
        status.textContent=response.message||'Сообщение сохранено.';status.className='notice';
        if(field)field.value='';const input=document.getElementById('clientChatFile');if(input)input.value='';
        btDescribeChatFile();window.RemontMobile?.clearDirty();await btRefreshClientChat();
    }catch(e){status.textContent=e.message;status.className='error';}
    finally{if(btn?.isConnected)btn.disabled=false;}
}
function escapeClient(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }


// ============ ФОРМАТИРОВАНИЕ ТЕЛЕФОНА ============

function formatClientPhone(value) {
    const d = String(value || "").replace(/\D/g, "").slice(0, 12);

    if (!d) return "";

    if (!d.startsWith("998")) return "+" + d;

    return "+998" +
        (d.length > 3 ? " " + d.slice(3, 5) : "") +
        (d.length > 5 ? " " + d.slice(5, 8) : "") +
        (d.length > 8 ? " " + d.slice(8, 10) : "") +
        (d.length > 10 ? " " + d.slice(10) : "");
}

function attachPhoneMask(input, onInput) {
    if (!input) return;

    input.addEventListener("input", e => {
        e.target.value = formatClientPhone(e.target.value);
        if (onInput) onInput();
    });
}

// ============ ПЕРВИЧНАЯ РЕГИСТРАЦИЯ ============

function showRegistrationScreen() {
    window.RemontMobile?.enter('client/registration',()=>showRegistrationScreen());
    document.body.innerHTML = `
        <h1>👤 Регистрация клиента</h1>
        <p class="subtitle">Введите ФИО и телефон, чтобы продолжить оформление заявки.</p>

        <div class="card">
            <label>Ваше имя / ФИО *</label>
            <input
                id="client_name"
                placeholder="Введите ФИО"
                autocomplete="off"
                autocapitalize="words"
                spellcheck="false"
            >

            <label>Номер телефона *</label>
            <input
                id="client_phone"
                type="tel"
                inputmode="tel"
                placeholder="+998 90 123 45 67"
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
            >
        </div>

        <button id="registrationContinue" onclick="submitRegistration()">
            Сохранить
        </button>
        <p id="registrationStatus" class="subtitle" role="status"></p>
    `;

    // Это экран первичной регистрации из /start: поля всегда пустые.
    // Не используем localStorage/автозаполнение браузера, чтобы на общем или
    // тестовом телефоне данные предыдущего клиента не попали в новую заявку.
    const phoneInput = document.getElementById("client_phone");
    document.getElementById("client_name").value = "";
    phoneInput.value = "";
    attachPhoneMask(phoneInput);
}

// Быстрые адреса принадлежат конкретному Telegram ID. GPS-позицию не сохраняем.
function btClientAddressStorageKey(){
    return currentClientTelegramId ? 'remont_bt_addresses_v1_'+currentClientTelegramId : '';
}
function btSavedAddresses(){
    const key=btClientAddressStorageKey();if(!key)return {};
    try{const data=JSON.parse(localStorage.getItem(key)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch(_){return {};}
}
function btAddressOptions(){
    const addresses=btSavedAddresses();
    return Object.entries({home:'Дом',work:'Работа'}).filter(([key])=>addresses[key]?.house)
        .map(([key,label])=>`<option value="${key}">${label} · ${escapeClient(addresses[key].house)}</option>`).join('');
}
function btUseSavedAddress(){
    const choice=document.getElementById('btSavedAddressPicker')?.value;
    const saved=btSavedAddresses()[choice];if(!saved)return;
    document.getElementById('house').value=saved.house||'';
    document.getElementById('apartment').value=saved.apartment||'';
    const status=document.getElementById('location_status');
    if(status)status.textContent='Адрес заполнен. Для отправки новой GPS-точки нажмите «Отправить мою локацию».';
}
function btSaveCurrentAddress(which){
    const key=btClientAddressStorageKey();
    if(!key)return showAlert('Откройте приложение через Telegram для сохранения адреса.');
    const house=String(document.getElementById('house')?.value||'').trim();
    const apartment=String(document.getElementById('apartment')?.value||'').trim();
    if(!house)return showAlert('Сначала укажите дом.');
    try{
        const addresses=btSavedAddresses();addresses[which]={house,apartment};
        localStorage.setItem(key,JSON.stringify(addresses));
        const picker=document.getElementById('btSavedAddressPicker');
        if(picker){picker.innerHTML='<option value="">— Выбрать адрес —</option>'+btAddressOptions();picker.value=which;}
        const status=document.getElementById('btAddressSaveStatus');
        if(status)status.textContent='Адрес сохранён на этом устройстве (без GPS).';
    }catch(_){showAlert('Не удалось сохранить адрес на устройстве.');}
}
async function btRepeatOrder(orderId){
    try{
        const result=await clientApi('/api/client/dashboard');
        const previous=(result.orders||[]).find(o=>String(o.id)===String(orderId));
        if(!previous)throw new Error('Прошлая заявка не найдена.');
        // Новый идентификатор операции: повторная заявка — самостоятельный заказ.
        showNewOrder();
        for(const [field,custom] of [['device','device_custom'],['brand','brand_custom']]){
            const select=document.getElementById(field),value=String(previous[field]||'');
            if(!select||!value)continue;
            const existing=[...select.options].some(option=>option.value===value);
            select.value=existing?value:'__other__';
            if(field==='device')onDeviceChange();else onBrandChange();
            if(!existing){const input=document.getElementById(custom);if(input)input.value=value;}
        }
        for(const name of ['problem','house','apartment']){
            const input=document.getElementById(name);if(input)input.value=String(previous[name]||'');
        }
        // Дата и время намеренно новые, прежние промокод и GPS не копируются.
        showAlert('Данные техники и адрес перенесены. Проверьте дату, время и при необходимости укажите локацию.');
    }catch(e){showAlert(e.message||'Не удалось повторить заявку.');}
}
// ============ НОВАЯ ЗАЯВКА ============

function showNewOrder() {
    window.RemontMobile?.enter('client/new-order',()=>showNewOrder());
    btOrderOperationId=uuidV4();
    orderData = {
        device: "",
        brand: "",
        model: "",
        problem: "",
        when_date: "",
        when_time: "",
        house: "",
        apartment: "",
        comment: "",
        location: null,
    };

    const dateOptions = [];
    const today = new Date();
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const months = [
        'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
        'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'
    ];

    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);

        const label =
            `${d.getDate()} ${months[d.getMonth()]}, ${days[d.getDay()]}`;

        const value =
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        dateOptions.push(`<option value="${value}">${label}</option>`);
    }

    const timeOptions = [];

    for (let h = 9; h <= 21; h++) {
        timeOptions.push(
            `<option value="${String(h).padStart(2, '0')}:00">${String(h).padStart(2, '0')}:00</option>`
        );

        if (h < 21) {
            timeOptions.push(
                `<option value="${String(h).padStart(2, '0')}:30">${String(h).padStart(2, '0')}:30</option>`
            );
        }
    }

    document.body.classList.add('bt-inner-page', 'bt-order-page');
    document.body.innerHTML = `
        <button class="back-btn" onclick="renderClientMenu()">← Назад</button>
        <h1>📝 Новая заявка</h1>
        <p class="subtitle">Заполните данные — мастер свяжется</p>

        <div class="card" id="clientIdentityCard" style="display:none">
            <label for="client_name">Ваше ФИО (только при первой заявке)</label>
            <input id="client_name" maxlength="150" placeholder="Введите ФИО" autocomplete="name" autocapitalize="words">
        </div>

        <div class="card">
            <label>Вид техники</label>
            <select id="device" class="bt-client-select" onchange="onDeviceChange()">
                <option value="">— Выберите —</option>
                <option value="Стиральная машина">🧺 Стиральная машина</option>
                <option value="Холодильник">❄️ Холодильник</option>
                <option value="Кондиционер">🌬️ Кондиционер</option>
                <option value="Микроволновая печь">▣ Микроволновая печь</option>
                <option value="Пылесос">◌ Пылесос</option>
                <option value="__other__">✏️ Другое (ввести вручную)</option>
            </select>

            <div id="device_custom_wrap" style="display:none;margin-top:10px;">
                <label>Укажите вид техники</label>
                <input id="device_custom" placeholder="Например: Пылесос" autocomplete="off">
            </div>

            <label>Бренд</label>
            <select id="brand" class="bt-client-select" onchange="onBrandChange()">
                <option value="">— Выберите —</option>
                <option value="LG">LG</option>
                <option value="Samsung">Samsung</option>
                <option value="Indesit">Indesit</option>
                <option value="Bosch">Bosch</option>
                <option value="Атлант">Атлант</option>
                <option value="__other__">✏️ Другое (ввести вручную)</option>
            </select>

            <div id="brand_custom_wrap" style="display:none;margin-top:10px;">
                <label>Укажите бренд</label>
                <input id="brand_custom" placeholder="Например: Whirlpool" autocomplete="off">
            </div>

        </div>

        <div class="card">
            <label>Что не работает?</label>
            <textarea id="problem" placeholder="Например: не сливает воду, шумит при отжиме..." maxlength="500"></textarea>
        </div>

        <div class="card">
            <label>Когда удобно приехать?</label>
            <select id="when_date" class="bt-client-select bt-date-select">
                ${dateOptions.join('')}
            </select>

            <label style="margin-top:14px;">Время</label>
            <select id="when_time" class="bt-client-select bt-time-select">
                <option value="">— Выберите —</option>
                ${timeOptions.join('')}
            </select>
        </div>

        <div class="card">
            <div class="bt-client-address-row"><div><label for="house">Дом *</label><input id="house" maxlength="80" placeholder="15А" autocomplete="off"></div><div><label for="apartment">Квартира</label><input id="apartment" maxlength="80" placeholder="42" autocomplete="off"></div></div>
            <div class="bt-saved-address-box"><label for="btSavedAddressPicker">Сохранённый адрес</label>
                <select id="btSavedAddressPicker" class="bt-client-select" onchange="btUseSavedAddress()"><option value="">— Выбрать адрес —</option>${btAddressOptions()}</select>
                <div class="bt-saved-address-actions"><button type="button" class="secondary" onclick="btSaveCurrentAddress('home')">⌂ Запомнить как дом</button><button type="button" class="secondary" onclick="btSaveCurrentAddress('work')">⌂ Запомнить как работу</button></div>
                <p id="btAddressSaveStatus" class="subtitle" role="status">Адреса сохраняются только на этом устройстве.</p>
            </div>
            <button onclick="sendLocation()" style="margin-top:14px;padding:14px;font-size:16px;background:#f0f0f0;border:1px solid #ddd;border-radius:10px;width:100%;cursor:pointer;">
                📍 Отправить мою локацию
            </button>

            <p id="location_status" style="color:#888;font-size:13px;margin-top:8px;">
                Локация не отправлена
            </p>
        </div>

        <div class="card promo-card" id="orderPromoCard">
            <label>🎟️ Промокод (необязательно)</label>
            <input id="order_promo_code" placeholder="Например, REMONT10" maxlength="64" autocapitalize="characters" autocomplete="off" style="text-transform:uppercase">
            <button type="button" id="orderPromoCheck" onclick="checkOrderPromo()">Проверить промокод</button>
            <p id="orderPromoStatus" class="subtitle">Активный промокод привяжется к вашему аккаунту автоматически при отправке заявки.</p>
        </div>

        <button id="submit" class="bt-client-submit" onclick="submitOrder()">📤 Отправить заявку</button>
    ` + btClientBottomNav();
    btEnhanceClientOrderPickers();

    try {
        document.getElementById('house').value = isNewClientFlow
            ? '' : (localStorage.getItem('remont_bt_house') || '');

        document.getElementById('apartment').value = isNewClientFlow
            ? '' : (localStorage.getItem('remont_bt_apartment') || '');

        const hasNewClientIdentity = isNewClientFlow &&
            localStorage.getItem('remont_bt_identity_saved') === '1';
        const savedName = isNewClientFlow
            ? (hasNewClientIdentity ? (localStorage.getItem('remont_bt_name') || '') : '')
            : (localStorage.getItem('remont_bt_name') || (tg.initDataUnsafe?.user?.first_name || ''));

        document.getElementById('client_name').value = savedName;
        const identityCard=document.getElementById('clientIdentityCard');
        const firstNameDone=localStorage.getItem('remont_bt_customer_name_confirmed')==='1';
        identityCard.style.display=firstNameDone?'none':'block';
        clientApi('/api/client/profile').then(d=>{
            const profile=d.profile||{};
            if(profile.name)document.getElementById('client_name').value=profile.name;
            if(profile.name_confirmed){
                identityCard.style.display='none';
                localStorage.setItem('remont_bt_customer_name_confirmed','1');
            }else identityCard.style.display='block';
        }).catch(()=>{});
    } catch (e) {
        console.error('Ошибка инициализации формы клиента:', e);
    }
}

// ============ РЕГИСТРАЦИЯ КЛИЕНТА ============

async function submitRegistration() {
    const nameEl = document.getElementById('client_name');
    const phoneEl = document.getElementById('client_phone');
    const button = document.getElementById('registrationContinue');
    const status = document.getElementById('registrationStatus');
    const name = (nameEl ? nameEl.value : '').trim();
    const phone = cleanPhone(phoneEl ? phoneEl.value : '');
    if (name.length < 2) return showAlert('Введите ФИО не короче 2 символов.');
    if (!validPhone(phone)) return showAlert('Введите корректный номер +998XXXXXXXXX.');

    const data = {
        name, phone,
        client_registration_id: getClientRegistrationId(phone),
        client_registration_no: getClientRegistrationNo(phone)
    };
    if (button) button.disabled = true;
    if (status) { status.textContent = 'Сохраняем регистрацию на сервере…'; status.className = 'subtitle'; }

    try {
        // Registration is complete only after the server confirms a successful write.
        const result = await clientApi('/api/client/register', 'POST', data);
        localStorage.setItem('remont_bt_name', name);
        localStorage.setItem('remont_bt_phone', phone);
        localStorage.setItem('remont_bt_registered', '1');
        localStorage.setItem('remont_bt_identity_saved', '1');
        if (currentClientTelegramId) localStorage.setItem('remont_bt_profile_uid', currentClientTelegramId);
        window.RemontMobile?.clearDirty();
        showAlert(result.message || 'Регистрация сохранена на сервере.');
        renderClientMenu();
    } catch (err) {
        // Do not mark the client registered and do not silently put registration
        // into an offline queue: the client must know the server did not confirm it.
        if (button) button.disabled = false;
        if (status) {
            status.textContent = err.message || 'Не удалось сохранить регистрацию на сервере. Проверьте связь и повторите.';
            status.className = 'error';
        } else {
            showAlert(err.message || 'Не удалось сохранить регистрацию на сервере. Проверьте связь и повторите.');
        }
    }
}

const btClientPickerIcons={
    device:['♻','❄','◈','▣','◉','✎'],
    brand:['LG','S','I','B','A','✎'],
};
function btRenderStyledClientPicker(selectId){
    const native=document.getElementById(selectId);if(!native||native.dataset.enhanced)return;
    const choices=[...native.options].filter(option=>option.value);
    const prefix=selectId==='device'?'device':selectId==='brand'?'brand':'';
    const options=choices.map((option,i)=>{
        const icon=prefix?btClientPickerIcons[prefix][i]:selectId==='when_date'?'◷':'◉';
        return `<button type="button" class="bt-client-picker-option" role="option" data-picker-value="${escapeClient(option.value)}" onclick="btChooseClientPicker('${selectId}',this)"><span class="bt-master-choice-icon">${escapeClient(icon)}</span><span>${escapeClient(option.textContent.replace(/^\s*[📻🧺❄🌬✏️]+\s*/u,'').trim())}</span><span aria-hidden="true">✓</span></button>`;
    }).join('');
    const summary=choices.find(o=>o.value===native.value)?.textContent||'Выберите вариант';
    const details=document.createElement('details');details.className='bt-client-picker';details.id=selectId+'StyledPicker';
    details.innerHTML=`<summary><span id="${selectId}StyledSummary">${escapeClient(summary)}</span><span aria-hidden="true">⌄</span></summary><div class="bt-client-picker-options" role="listbox">${options}</div>`;
    native.before(details);native.classList.add('bt-enhanced-native-select');native.dataset.enhanced='1';
}
function btChooseClientPicker(selectId,button){
    const native=document.getElementById(selectId);if(!native)return;
    native.value=button.dataset.pickerValue;
    document.getElementById(selectId+'StyledPicker').open=false;
    document.getElementById(selectId+'StyledSummary').textContent=button.querySelector('span:nth-child(2)')?.textContent||native.value;
    for(const other of document.querySelectorAll(`#${selectId}StyledPicker .bt-client-picker-option`))other.classList.toggle('selected',other===button);
    native.dispatchEvent(new Event('change',{bubbles:true}));
}
function btEnhanceClientOrderPickers(){['device','brand','when_date','when_time'].forEach(btRenderStyledClientPicker);}

// ============ ВЫБОР "ДРУГОЕ" ============

function onDeviceChange() {
    const val = document.getElementById('device').value;
    const wrap = document.getElementById('device_custom_wrap');

    wrap.style.display = val === '__other__' ? 'block' : 'none';
}

function onBrandChange() {
    const val = document.getElementById('brand').value;
    const wrap = document.getElementById('brand_custom_wrap');

    wrap.style.display = val === '__other__' ? 'block' : 'none';
}

// ============ ЛОКАЦИЯ ============

function sendLocation() {
    const status = document.getElementById('location_status');

    status.textContent = '⏳ Определяем локацию...';
    status.style.color = '#888';

    if (tg.LocationManager &&
        typeof tg.LocationManager.init === 'function') {
        try {
            tg.LocationManager.init(() => {
                tg.LocationManager.getLocation((loc) => {
                    if (loc && loc.latitude != null && loc.longitude != null) {
                        orderData.location = {
                            lat: loc.latitude,
                            lon: loc.longitude,
                        };

                        status.textContent =
                            `✅ ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`;
                        status.style.color = '#43a047';
                    } else {
                        getBrowserLocation();
                    }
                });
            });

            return;
        } catch (e) {
            console.error('LocationManager error:', e);
        }
    }

    getBrowserLocation();
}

function getBrowserLocation() {
    const status = document.getElementById('location_status');

    if (!navigator.geolocation) {
        status.textContent = '❌ Геолокация не поддерживается';
        status.style.color = '#e53935';
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            orderData.location = {
                lat: pos.coords.latitude,
                lon: pos.coords.longitude,
            };

            status.textContent =
                `✅ ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
            status.style.color = '#43a047';
        },
        (err) => {
            let msg = 'Не удалось получить локацию';

            if (err.code === 1) msg = 'Вы запретили доступ';
            else if (err.code === 2) msg = 'Локация недоступна';
            else if (err.code === 3) msg = 'Превышено время ожидания';

            status.textContent = `❌ ${msg}`;
            status.style.color = '#e53935';
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}

// Проверка промокода в форме заявки: проверка не активирует и не списывает использование.
async function checkOrderPromo() {
    const input = document.getElementById('order_promo_code');
    const status = document.getElementById('orderPromoStatus');
    const button = document.getElementById('orderPromoCheck');
    const code = (input?.value || '').trim().toUpperCase();
    if (!code) { if (status) { status.textContent = 'Введите промокод.'; status.className = 'subtitle error'; } return false; }
    if (button) { button.disabled = true; button.textContent = 'Проверяем…'; }
    try {
        const r = await clientApi('/api/client/promo/check', 'POST', {code});
        const timeLeft = r.expires_at ? (r.expires_in_hours >= 24 ? `Осталось ${Math.floor(r.expires_in_hours / 24)} дн. ${r.expires_in_hours % 24} ч.` : `Осталось ${r.expires_in_hours} ч.`) : 'Срок действия не ограничен';
        const usesLeft = r.remaining_uses === null || r.remaining_uses === undefined ? 'Лимит: без персонального ограничения' : `Осталось использований для вас: ${r.remaining_uses}`;
        if (status) { status.textContent = `✅ Скидка ${r.discount_percent}% · ${usesLeft} · ${timeLeft}. При отправке заявки код привяжется к аккаунту.`; status.className = 'notice'; }
        return true;
    } catch (e) {
        if (status) { status.textContent = e.message || 'Не удалось проверить промокод.'; status.className = 'subtitle error'; }
        return false;
    } finally {
        if (button) { button.disabled = false; button.textContent = 'Проверить промокод'; }
    }
}

function confirmPromoContinue(message) {
    return new Promise(resolve => {
        if (tg && typeof tg.showConfirm === 'function') tg.showConfirm(message, resolve);
        else resolve(window.confirm(message));
    });
}

// ============ ОТПРАВКА ЗАЯВКИ ============

async function submitOrder() {
    let device = document.getElementById('device').value;
    let brand = document.getElementById('brand').value;

    if (device === '__other__') {
        device = document.getElementById('device_custom').value.trim();
        if (!device) return showAlert('Укажите вид техники');
    }

    if (brand === '__other__') {
        brand = document.getElementById('brand_custom').value.trim();
        if (!brand) return showAlert('Укажите бренд');
    }

    const model = '';
    const problem = document.getElementById('problem').value.trim();
    const when_date = document.getElementById('when_date').value;
    const when_time = document.getElementById('when_time').value;
    const house = document.getElementById('house').value.trim();
    const apartment = document.getElementById('apartment').value.trim();
    const comment = '';

    const nameInput = document.getElementById('client_name');
    const phoneInput = null;

    const client_name = (nameInput ? nameInput.value : '').trim();
    const client_phone = cleanPhone(localStorage.getItem('remont_bt_phone') || '');
    const order_promo_code = (document.getElementById('order_promo_code')?.value || '').trim().toUpperCase();

    if (document.getElementById('clientIdentityCard')?.style.display !== 'none' && client_name.length < 2) {
        return showAlert('Введите имя клиента');
    }
    if(!validPhone(client_phone))return showAlert('Не удалось получить подтверждённый номер. Закройте приложение и откройте снова из Telegram.');

    if (!device) return showAlert('Выберите вид техники');
    if (!brand) return showAlert('Выберите бренд');

    if (!problem || problem.length < 5) {
        return showAlert('Опишите проблему');
    }

    if (!when_date) return showAlert('Выберите дату');
    if (!when_time) return showAlert('Выберите время');
    if (!house) return showAlert('Укажите дом');

    try {
        localStorage.setItem('remont_bt_house', house);
        localStorage.setItem('remont_bt_apartment', apartment);
        if (client_name.length >= 2) localStorage.setItem('remont_bt_name', client_name);
        if (client_phone) localStorage.setItem('remont_bt_phone', client_phone);
    } catch (e) {
        console.warn('Не удалось сохранить данные локально:', e);
    }

    const data = {
        event: 'new_order',
        client_name: client_name,
        client_phone: client_phone,
        client_registration_id: getClientRegistrationId(
            client_phone,
            !isNewClientFlow
        ),
        client_registration_no: getClientRegistrationNo(
            client_phone,
            !isNewClientFlow
        ),
        device: device,
        brand: brand,
        model: model || '—',
        problem: problem,
        when_date: when_date,
        when_time: when_time,
        house: house,
        apartment: apartment,
        comment: comment,
        promo_code: order_promo_code,
        location: orderData.location || null,
    };

    // Даже если клиент не нажал «Проверить», сервер проверит и привяжет активный код
    // при обработке заявки. Неактивный/неизвестный код требует явного подтверждения.
    if (order_promo_code) {
        try {
            await clientApi('/api/client/promo/check', 'POST', {code: order_promo_code});
        } catch (e) {
            const proceed = await confirmPromoContinue(`⚠️ ${e.message || 'Промокод не активен.'}\n\nНажмите OK, чтобы продолжить создание заявки без этой скидки, или Отмена, чтобы вернуться и изменить промокод.`);
            if (!proceed) return;
            data.promo_code = '';
            data.promo_code_invalid_confirmed = true;
        }
    }

    // Do not log client personal data in browser console.

    const btn = document.getElementById('submit');
    btn.textContent = '⏳ Отправка...';
    btn.disabled = true;

    // Submit through the authenticated API. Telegram WebApp.sendData works only
    // from reply-keyboard launches and must not be used for menu-button launches.
    data.operation_id=btOrderOperationId||uuidV4();
    try {
        const result=await clientApi('/api/client/order','POST',data);
        if(!result.ok)throw new Error('Сервер не подтвердил заявку.');
        if(client_name.length>=2){
            localStorage.setItem('remont_bt_customer_name_confirmed','1');
            localStorage.setItem('remont_bt_name',client_name);
        }
        localStorage.setItem('remont_bt_registered','1');
        btOrderOperationId=null;
        // Остаёмся в Mini App: Telegram-чат не открывается автоматически.
        window.RemontMobile?.clearDirty();
        renderClientMenu();
        const notice=document.createElement('div');
        notice.className='bt-order-success-notice';
        notice.role='status';
        notice.textContent=`✓ Заявка ${result.order_id||''} сохранена. Мастер увидит её в кабинете.`;
        const anchor=document.querySelector('.bt-client-home .bt-client-promo-banner');
        if(anchor)anchor.insertAdjacentElement('afterend',notice);
        setTimeout(()=>{if(notice.isConnected)notice.remove();},9500);
    } catch(err) {
        // Keep operation_id for an idempotent retry if the response was lost.
        showAlert(err.message||'Не удалось отправить заявку. Проверьте связь и повторите.');
        if(btn?.isConnected){btn.textContent='📤 Отправить заявку';btn.disabled=false;}
    }

}

// ============ ПОЗВОНИТЬ ============

async function showCallMaster() {
    setPage('📞 Контакты мастера', '<p class="subtitle">Загружаем контакты…</p>');
    try {
        const d = await clientApi('/api/client/dashboard');
        const phone = String(d.master?.phone || '').trim();
        setPage('📞 Контакты мастера', phone ? `<div class="card"><p>${escapeClient(d.master?.name || 'Ваш мастер')}</p><a class="menu-btn" href="tel:${escapeClient(phone)}">Позвонить: ${escapeClient(phone)}</a></div>` : '<div class="card">Номер мастера пока не указан. Напишите мастеру через раздел сообщений.</div>');
    } catch (e) { setPage('📞 Контакты мастера', `<div class="card error">${escapeClient(e.message)}</div>`); }
}

// ============ СТАРТ ============

async function startRemontApp(){
  const role = clientUrlParams.get('role') || 'client';
  if (role === 'master_entry') {
    // The master entry button opens the application directly for new users.
    // If this Telegram account has since been approved, open the master cabinet instead.
    try {
      await clientApi('/api/master/dashboard');
      const target = new URL('index.html', location.href);
      target.searchParams.set('role', 'master');
      target.searchParams.set('appv', '20261020-master-flow-fix6');
      location.replace(target.href);
      return;
    } catch (_) {
      // Not approved (or temporarily unavailable): keep the application form available.
    }
    showMasterApplicationForm();
    return;
  }

  // Local storage is only a cache and may be stale/shared on the device.
  // Ask the server first; only a registered server profile may bypass registration.
  try {
    const d = await clientApi('/api/client/profile');
    const profile = d.profile || {};
    if (profile.phone) {
      try {
        localStorage.setItem('remont_bt_name', profile.name);
        localStorage.setItem('remont_bt_phone', profile.phone);
        localStorage.setItem('remont_bt_registered', '1');
        localStorage.setItem('remont_bt_identity_saved', '1');
        if (currentClientTelegramId) localStorage.setItem('remont_bt_profile_uid', currentClientTelegramId);
      } catch (_) {}
      renderClientMenu();
      return;
    }
  } catch (err) {
    // Never ask for personal details again just because the API is unavailable.
    document.body.innerHTML = '<div class="card"><h2>Не удалось открыть кабинет</h2><p class="subtitle">Проверьте подключение к серверу и попробуйте снова. Повторно вводить номер не нужно.</p><button onclick="location.reload()">Повторить</button></div>';
    console.warn('Client profile check failed:', err);
    return;
  }
  // Contact-first onboarding is performed in Telegram. Do not resurrect the
  // legacy manual registration form for an account without a server profile.
  document.body.innerHTML = '<div class="card"><h2>Подтвердите номер в Telegram</h2><p class="subtitle">Вернитесь в чат с ботом, нажмите /start и отправьте свой контакт кнопкой Telegram. Затем откройте кабинет снова.</p><button onclick="location.reload()">Проверить ещё раз</button></div>';
}
migrateLegacyMasterApplicationQueue();
startRemontApp();
startMasterApplicationAutoSync();
