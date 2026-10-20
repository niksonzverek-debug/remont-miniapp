// miniapp/js/client.js

try { if (window.Telegram?.WebApp) { window.Telegram.WebApp.ready(); window.Telegram.WebApp.expand(); } } catch (_) {}

// ============ СОСТОЯНИЕ ============
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
         'remont_bt_identity_saved','remont_bt_registered','remont_bt_master_application'].forEach(k => localStorage.removeItem(k));
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

function renderClientMenu() {
    document.body.classList.remove('bt-inner-page', 'bt-order-page');
    document.body.innerHTML = `
        <main class="bt-client-home">
          <header class="bt-brand-head"><img class="bt-brand-logo" src="img/remont-bt-icon.png" alt="Remont BT"><div><strong>REMONT BT</strong><small>ELECTRIC STEEL BLUE</small></div></header>
          <div class="bt-greeting"><h2>Личный кабинет</h2><p>Здравствуйте, <span id="clientWelcomeName">${escapeClient(tg.initDataUnsafe?.user?.first_name || localStorage.getItem('remont_bt_name') || 'клиент')}</span>!</p></div>
          <button class="bt-main-action" onclick="showNewOrder()">＋ Создать заявку</button>
          <div class="client-home-grid bt-home-tiles">
            <button class="menu-btn" onclick="showMyOrders()"><span class="emoji">📋</span><span>Мои заявки</span></button>
            <button class="menu-btn" onclick="showMyActs()"><span class="emoji">📄</span><span>Акты и гарантия</span></button>
            <button class="menu-btn" onclick="showEnterPromo()"><span class="emoji">🎟️</span><span>Промокоды</span></button>
            <button class="menu-btn" onclick="showProfile()"><span class="emoji">👤</span><span>Профиль</span></button>
          </div>
          <section class="bt-live-panel bt-chat-preview" onclick="showMessages()" role="button" tabindex="0" onkeydown="if(event.key==='Enter')showMessages()"><div class="bt-section-title">✉ Живой чат <span class="bt-glow-dot">●</span></div><div class="bt-chat-preview-row"><span class="bt-chat-avatar">⚙</span><div><strong>Связь с мастером</strong><p>Сообщения и вопросы по вашему ремонту</p></div><span class="bt-chat-chevron">→</span></div></section>
          <section class="bt-live-panel" id="btRecentOrder" hidden><div class="bt-section-title">⚡ Электрическая цепь ремонта</div><div id="btOrderLabel" class="bt-order-label"></div><div class="bt-circuit"><span>Заявка</span><span>Принято</span><span>Ремонт</span><span>Акт</span></div></section>
          <div id="btAdvertiserSlot"></div><nav class="bt-client-bottom-nav" aria-label="Навигация"><button onclick="renderClientMenu()"><span>⌂</span>Главная</button><button onclick="showMyOrders()"><span>▤</span>Заявки</button><button onclick="showMessages()"><span>✉</span>Чат</button><button onclick="showProfile()"><span>♙</span>Профиль</button></nav>
        </main>`;
    clientApi('/api/advertiser/dashboard').then(d => {
        if (!d?.advertiser || document.getElementById('clientAdvertiserBtn')) return;
        const slot = document.getElementById('btAdvertiserSlot'); if (!slot) return;
        const btn = document.createElement('button'); btn.id='clientAdvertiserBtn'; btn.className='bt-main-action bt-advertiser-action';
        btn.textContent='📣 Кабинет рекламодателя'; btn.onclick=()=>{window.location.href='advertiser.html';}; slot.appendChild(btn);
    }).catch(()=>{});
    clientApi('/api/client/dashboard').then(d => {
        const name=String(d.profile?.name||'').trim(); const n=document.getElementById('clientWelcomeName'); if(n&&name)n.textContent=name;
        const orders=Array.isArray(d.orders)?d.orders:[]; if(!orders.length)return;
        const recent=orders[0]; const panel=document.getElementById('btRecentOrder');if(!panel)return;
        panel.hidden=false;
        const status=String(recent.status||'').toLowerCase();
        const step=/закры|заверш|готов|complete|closed/.test(status)?4:/ремонт|работ|progress/.test(status)?3:/принят|accepted|назначен/.test(status)?2:1;
        panel.querySelectorAll('.bt-circuit span').forEach((node,i)=>node.classList.toggle('bt-complete',i<step));
        const label=document.getElementById('btOrderLabel');if(label)label.textContent='Заявка '+String(recent.id||'')+' · '+String(recent.device||'Техника');
    }).catch(()=>{});
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
        <label for="masterApplicationBirthDate">Дата рождения *</label><input id="masterApplicationBirthDate" name="birth_date" required inputmode="text" autocomplete="bday" placeholder="ДДММГГГГ или ДД.ММ.ГГГГ" value="${escapeClient(saved.birth_date || '')}">
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

function setPage(title, body) {
    document.body.classList.add('bt-inner-page');
    document.body.classList.remove('bt-order-page');
    document.body.innerHTML = `<main class="bt-inner-content"><button class="back-btn" onclick="renderClientMenu()">← Главная</button><h1>${title}</h1>${body}</main>` + btClientBottomNav();
}

function btClientBottomNav() {
    return `<nav class="bt-client-bottom-nav bt-inner-nav" aria-label="Навигация"><button type="button" onclick="renderClientMenu()"><span>⌂</span>Главная</button><button type="button" onclick="showMyOrders()"><span>▤</span>Заявки</button><button type="button" onclick="showMessages()"><span>✉</span>Чат</button><button type="button" onclick="showProfile()"><span>♙</span>Профиль</button></nav>`;
}

async function showMyOrders() {
    setPage('📋 Мои заявки', '<p class="subtitle">Загружаем ваши заявки…</p>');
    try {
        const d = await clientApi('/api/client/dashboard');
        const rows = d.orders || [];
        const status = {new:'Новая — ждёт мастера', accepted:'Мастер принял', in_progress:'В работе', act_issued:'Акт выдан — ожидает подтверждения', act_pending:'Ожидает подтверждения акта', completed:'Завершена', closed:'Завершена', cancelled:'Отменена'};
        const content = rows.length ? rows.map(o => `<article class="card"><b>${escapeClient(o.id || 'Заявка')}</b><p>${escapeClient([o.device,o.brand,o.model].filter(Boolean).join(' '))}</p><p>${escapeClient(o.problem || '')}</p><p><b>Статус:</b> ${escapeClient(status[o.status] || o.status || 'На обработке')}</p><p class="subtitle">${escapeClient(o.created_at || '')}</p>${o.promocode ? `<p>🎟️ Промокод: ${escapeClient(o.promocode)}</p>` : ''}${o.status === 'act_issued' ? `<button onclick="confirmClientAct('${escapeClient(o.id)}')">✅ Подтвердить выполнение</button><p class="subtitle">Если не подтвердить, акт автоматически подтвердится через 5 минут после выдачи.</p>` : ''}</article>`).join('') : '<div class="card">Заявок пока нет. Создайте первую заявку.</div>';
        setPage('📋 Мои заявки', content);
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
    } catch (e) { showAlert(e.message); }
}

async function showMyActs() {
    setPage('📄 Акты и документы', '<p class="subtitle">Загружаем документы…</p>');
    try {
        const d = await clientApi('/api/client/dashboard');
        const rows = d.acts || [];
        const content = rows.length ? rows.map(a => `<article class="card"><b>Акт ${escapeClient(a.number || '—')}</b><p>${escapeClient([a.device,a.brand,a.model].filter(Boolean).join(' '))}</p><p>Стоимость: ${escapeClient(String(a.final_price ?? a.price ?? '—'))} сум</p><p>Гарантия: ${escapeClient(a.guarantee_text || '—')} · до ${escapeClient(a.guarantee_until || '—')}</p><p>Статус: ${escapeClient(a.status || '—')}</p></article>`).join('') : '<div class="card">Актов пока нет.</div>';
        setPage('📄 Акты и документы', content);
    } catch (e) { setPage('📄 Акты и документы', `<div class="card error">${escapeClient(e.message)}</div>`); }
}

function showEnterPromo() {
    setPage('🎟️ Промокод', '<div class="card"><label>Введите промокод</label><input id="promo_code" placeholder="REMONT10" maxlength="64" autocapitalize="characters"><button id="promoSubmit" onclick="submitPromoFromApp()">Активировать</button><p id="promoStatus" class="subtitle"></p></div>');
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
        setPage('👤 Профиль', `<form id="profileForm" class="card"><label>ФИО</label><input name="name" required minlength="2" value="${escapeClient(p.name || '')}"><label>Телефон</label><input name="phone" type="tel" required value="${escapeClient(p.phone || '')}"><label>Пол</label><select name="gender"><option value="">Не указан</option><option ${p.gender==='Мужской'?'selected':''}>Мужской</option><option ${p.gender==='Женский'?'selected':''}>Женский</option></select><label>Дата рождения (ДД.ММ.ГГГГ)</label><input name="birth_date" placeholder="25.04.1995" value="${escapeClient(p.birth_date || '')}"><label>ПИНФЛ (14 цифр)</label><input name="pinfl" inputmode="numeric" maxlength="14" value="${escapeClient(p.pinfl || '')}"><button type="submit">Сохранить профиль</button><p id="profileStatus" class="subtitle"></p></form><p class="subtitle">При активной рассрочке изменение профиля блокируется до полного погашения.</p>`);
        document.getElementById('profileForm').addEventListener('submit', saveClientProfile);
    } catch (e) {
        let p={}; try{p={name:localStorage.getItem('remont_bt_name')||'',phone:localStorage.getItem('remont_bt_phone')||''};}catch(_){}
        renderLocalProfile(p, 'Данные сохранены локально, сервер пока недоступен.');
    }
}
function renderLocalProfile(p, note='') {
    setPage('👤 Профиль', `<form id="profileForm" class="card"><p class="subtitle">${escapeClient(note)}</p><label>ФИО</label><input name="name" required minlength="2" value="${escapeClient(p.name||'')}"><label>Телефон</label><input name="phone" type="tel" required value="${escapeClient(p.phone||'')}"><label>Пол</label><select name="gender"><option value="">Не указан</option><option ${p.gender==='Мужской'?'selected':''}>Мужской</option><option ${p.gender==='Женский'?'selected':''}>Женский</option></select><label>Дата рождения (ДД.ММ.ГГГГ)</label><input name="birth_date" placeholder="25.04.1995" value="${escapeClient(p.birth_date||'')}"><label>ПИНФЛ (14 цифр)</label><input name="pinfl" inputmode="numeric" maxlength="14" value="${escapeClient(p.pinfl||'')}"><button type="submit">Сохранить профиль</button><p id="profileStatus" class="subtitle"></p></form>`);
    document.getElementById('profileForm').addEventListener('submit',saveClientProfile);
}
async function saveClientProfile(event) {
    event.preventDefault(); const f = new FormData(event.currentTarget); const status = document.getElementById('profileStatus');
    const data = Object.fromEntries(f.entries()); data.name=String(data.name||'').trim(); data.phone=cleanPhone(data.phone);
    if(data.name.length<2||!validPhone(data.phone)){status.textContent='Проверьте ФИО и номер +998XXXXXXXXX.';status.className='error';return;}
    try { localStorage.setItem('remont_bt_name',data.name); localStorage.setItem('remont_bt_phone',data.phone); } catch(_){}
    try {
      const r = await clientApi('/api/client/profile', 'POST', data); status.textContent = r.message || 'Профиль сохранён на сервере.'; status.className = 'notice';
    } catch (e) {
      if(typeof queueOperation==='function') queueOperation({event:'register_client',client_name:data.name,client_phone:data.phone,client_registration_id:getClientRegistrationId(data.phone),client_registration_no:getClientRegistrationNo(data.phone)});
      status.textContent='Данные сохранены на устройстве и поставлены в очередь. Передайте очередь через кнопку внизу приложения.'; status.className='notice';
    }
}

async function showMessages() {
    setPage('💬 Написать мастеру', '<p class="subtitle">Загружаем переписку…</p>');
    let history = '';
    try {
        const d = await clientApi('/api/client/dashboard');
        const rows = d.messages || [];
        history = rows.length ? rows.map(m => `<article class="card"><p><b>${String(m.from_id) === String(tg.initDataUnsafe?.user?.id) ? 'Вы' : 'Мастер'}</b> <span class="subtitle">${escapeClient(m.created_at || '')}</span></p><p>${escapeClient(m.text || (m.type === 'photo' ? 'Фото' : m.type === 'video' ? 'Видео' : 'Сообщение'))}</p></article>`).join('') : '<div class="card">Сообщений пока нет.</div>';
    } catch (e) { history = `<div class="card error">${escapeClient(e.message)}</div>`; }
    setPage('💬 Написать мастеру', `${history}<div class="card"><p>Напишите мастеру по вашей заявке.</p><textarea id="masterMessage" maxlength="1500" placeholder="Ваше сообщение"></textarea><button onclick="sendClientMessage()">Отправить сообщение</button><p id="messageStatus" class="subtitle"></p></div>`);
}
async function sendClientMessage() {
    const field = document.getElementById('masterMessage'); const status = document.getElementById('messageStatus');
    try { const r = await clientApi('/api/client/message', 'POST', {text:field.value}); status.textContent = r.message || 'Сообщение отправлено.'; status.className='notice'; field.value=''; }
    catch (e) { status.textContent = e.message; status.className='error'; }
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

// ============ НОВАЯ ЗАЯВКА ============

function showNewOrder() {
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

        <div class="card" id="clientIdentityCard">
            <label>Ваше имя / ФИО *</label>
            <input id="client_name" placeholder="Введите ФИО" autocomplete="off" autocapitalize="words" spellcheck="false">

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

            ${
                isNewClientFlow
                    ? '<p class="subtitle">Введите ФИО и телефон нового клиента.</p>'
                    : '<p class="subtitle" id="clientRegistrationNo">Регистрационный номер будет показан после ввода телефона.</p><p class="subtitle">Если вы ещё не зарегистрированы, сохраните данные перед созданием заявки.</p><button type="button" class="secondary" onclick="submitRegistration()">💾 Сохранить регистрацию</button>'
            }
        </div>

        <div class="card">
            <label>Вид техники</label>
            <select id="device" onchange="onDeviceChange()">
                <option value="">— Выберите —</option>
                <option value="Стиральная машина">🧺 Стиральная машина</option>
                <option value="Холодильник">❄️ Холодильник</option>
                <option value="Кондиционер">🌬️ Кондиционер</option>
                <option value="Микроволновка">📻 Микроволновка</option>
                <option value="__other__">✏️ Другое (ввести вручную)</option>
            </select>

            <div id="device_custom_wrap" style="display:none;margin-top:10px;">
                <label>Укажите вид техники</label>
                <input id="device_custom" placeholder="Например: Пылесос" autocomplete="off">
            </div>

            <label>Бренд</label>
            <select id="brand" onchange="onBrandChange()">
                <option value="">— Выберите —</option>
                <option value="LG">LG</option>
                <option value="Samsung">Samsung</option>
                <option value="Indesit">Indesit</option>
                <option value="Bosch">Bosch</option>
                <option value="Beko">Beko</option>
                <option value="__other__">✏️ Другое (ввести вручную)</option>
            </select>

            <div id="brand_custom_wrap" style="display:none;margin-top:10px;">
                <label>Укажите бренд</label>
                <input id="brand_custom" placeholder="Например: Whirlpool" autocomplete="off">
            </div>

            <label>Модель (необязательно)</label>
            <input id="model" placeholder="Например: F2M5HS6S" autocomplete="off">
        </div>

        <div class="card">
            <label>Что не работает?</label>
            <textarea id="problem" placeholder="Например: не сливает воду, шумит при отжиме..." maxlength="500"></textarea>
        </div>

        <div class="card">
            <label>Когда удобно приехать?</label>
            <select id="when_date">
                ${dateOptions.join('')}
            </select>

            <label style="margin-top:14px;">Время</label>
            <select id="when_time">
                <option value="">— Выберите —</option>
                ${timeOptions.join('')}
            </select>
        </div>

        <div class="card">
            <label>Дом (номер дома) *</label>
            <input id="house" name="remont_address_house_entry" placeholder="Например: 15А" autocomplete="new-password" autocorrect="off" spellcheck="false" data-form-type="other" readonly onpointerdown="this.removeAttribute('readonly')" onkeydown="this.removeAttribute('readonly')">

            <label>Квартира (необязательно)</label>
            <input id="apartment" name="remont_address_apartment_entry" placeholder="Например: 42" autocomplete="new-password" autocorrect="off" spellcheck="false" data-form-type="other" readonly onpointerdown="this.removeAttribute('readonly')" onkeydown="this.removeAttribute('readonly')">

            <button onclick="sendLocation()" style="margin-top:14px;padding:14px;font-size:16px;background:#f0f0f0;border:1px solid #ddd;border-radius:10px;width:100%;cursor:pointer;">
                📍 Отправить мою локацию
            </button>

            <p id="location_status" style="color:#888;font-size:13px;margin-top:8px;">
                Локация не отправлена
            </p>
        </div>

        <div class="card">
            <label>Комментарий к заказу (необязательно)</label>
            <textarea id="comment" placeholder="Любая дополнительная информация" maxlength="300"></textarea>
        </div>

        <div class="card promo-card" id="orderPromoCard">
            <label>🎟️ Промокод (необязательно)</label>
            <input id="order_promo_code" placeholder="Например, REMONT10" maxlength="64" autocapitalize="characters" autocomplete="off" style="text-transform:uppercase">
            <button type="button" id="orderPromoCheck" onclick="checkOrderPromo()">Проверить промокод</button>
            <p id="orderPromoStatus" class="subtitle">Активный промокод привяжется к вашему аккаунту автоматически при отправке заявки.</p>
        </div>

        <button id="submit" onclick="submitOrder()">📤 Отправить заявку</button>
    ` + btClientBottomNav();

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

        const savedPhone = isNewClientFlow
            ? (hasNewClientIdentity ? (localStorage.getItem('remont_bt_phone') || '') : '')
            : (localStorage.getItem('remont_bt_phone') || '');

        document.getElementById('client_name').value = savedName;
        document.getElementById('client_phone').value =
            formatClientPhone(savedPhone);

        const regNoEl = document.getElementById('clientRegistrationNo');

        const updateClientRegNo = () => {
            const phone = document.getElementById('client_phone').value;
            const no = getClientRegistrationNo(phone);

            if (regNoEl) {
                regNoEl.textContent =
                    (no.startsWith('CL-OFF-')
                        ? 'Локальный номер синхронизации: '
                        : 'Регистрационный номер: ') + no;
            }
        };

        if (!isNewClientFlow) updateClientRegNo();

        attachPhoneMask(
            document.getElementById('client_phone'),
            () => {
                if (!isNewClientFlow) updateClientRegNo();
            }
        );

        // Зарегистрированному клиенту не нужно повторно вводить ФИО и телефон:
        // сервер возьмёт их из базы по Telegram user_id. Новая регистрация
        // (new_client=1) всегда показывает поля.
        const identityCard = document.getElementById('clientIdentityCard');
        // После успешного шага регистрации ФИО/телефон уже введены; не просим повторно в форме заявки.
        // The contact gate verified the phone. Ask the name only on the first order.
        const savedConfirmation = localStorage.getItem('remont_bt_customer_name_confirmed') === '1';
        identityCard.style.display = savedConfirmation ? 'none' : 'block';
        const verifiedPhone = localStorage.getItem('remont_bt_phone') || '';
        if (verifiedPhone) document.getElementById('client_phone').value = formatClientPhone(verifiedPhone);
        document.getElementById('client_phone').readOnly = true;
        clientApi('/api/client/profile').then(d => {
            const profile = d.profile || {};
            if (profile.phone) {
                document.getElementById('client_phone').value = formatClientPhone(profile.phone);
                localStorage.setItem('remont_bt_phone', profile.phone);
            }
            if (profile.name_confirmed) {
                identityCard.style.display = 'none';
                localStorage.setItem('remont_bt_customer_name_confirmed','1');
            } else {
                identityCard.style.display = 'block';
            }
        }).catch(() => {});

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

    const model = document.getElementById('model').value.trim();
    const problem = document.getElementById('problem').value.trim();
    const when_date = document.getElementById('when_date').value;
    const when_time = document.getElementById('when_time').value;
    const house = document.getElementById('house').value.trim();
    const apartment = document.getElementById('apartment').value.trim();
    const comment = document.getElementById('comment').value.trim();

    const nameInput = document.getElementById('client_name');
    const phoneInput = document.getElementById('client_phone');

    const client_name = (nameInput ? nameInput.value : '').trim();
    const client_phone = cleanPhone(phoneInput ? phoneInput.value : '');
    const order_promo_code = (document.getElementById('order_promo_code')?.value || '').trim().toUpperCase();

    if (document.getElementById('clientIdentityCard')?.style.display !== 'none' && client_name.length < 2) {
        return showAlert('Введите имя клиента');
    }
    if (!isKnownRegisteredClient) {
        if (client_name.length < 2) return showAlert('Введите имя клиента');
        if (!validPhone(client_phone)) return showAlert('Введите корректный номер телефона +998XXXXXXXXX');
    }

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
        localStorage.setItem('remont_bt_name', client_name);
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

    console.log('Отправляем заявку:', data);

    const btn = document.getElementById('submit');
    btn.textContent = '⏳ Отправка...';
    btn.disabled = true;

    const ok = sendToBot(data);
    if (ok) {
        try {
            localStorage.setItem('remont_bt_registered', '1');
            if (client_name.length >= 2) localStorage.setItem('remont_bt_customer_name_confirmed', '1');
        } catch (_) {}
    }

    if (!ok) {
        btn.textContent = '📤 Отправить заявку';
        btn.disabled = false;
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
