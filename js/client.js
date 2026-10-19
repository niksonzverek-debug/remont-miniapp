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
    document.body.innerHTML = `
        <header class="portal-head"><h1>Remont BT</h1><p>Ваш ремонт — под контролем</p></header>
        <h2>👋 Личный кабинет</h2>
        <p class="subtitle">Здравствуйте, <span id="clientWelcomeName">${escapeClient(tg.initDataUnsafe?.user?.first_name || localStorage.getItem('remont_bt_name') || 'клиент')}</span>!</p>
        <div class="client-home-grid">
          <button class="menu-btn" onclick="showNewOrder()"><span class="emoji">📝</span> Создать заявку</button>
          <button class="menu-btn" onclick="showMyOrders()"><span class="emoji">📋</span> Мои заявки и статусы</button>
          <button class="menu-btn" onclick="showMyActs()"><span class="emoji">📄</span> Акты и документы</button>
          <button class="menu-btn" onclick="showEnterPromo()"><span class="emoji">🎟️</span> Промокод</button>
          <button class="menu-btn" onclick="showProfile()"><span class="emoji">👤</span> Профиль</button>
          <button class="menu-btn" onclick="showMessages()"><span class="emoji">💬</span> Написать мастеру</button>
        </div>
        <p class="subtitle">Статусы и история обновляются в приложении. В Telegram приходят только важные уведомления.</p>
    `;
    // Use the authoritative profile name from the database, not Telegram's optional first_name.
    clientApi('/api/client/profile').then(d => {
        const name = String(d.profile?.name || '').trim();
        const node = document.getElementById('clientWelcomeName');
        if (node && name) node.textContent = name;
    }).catch(err => console.warn('Не удалось загрузить имя клиента из профиля:', err.message));
}

function requestMasterRole() { showMasterChoice(); }

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
      const sessionUid=query.get('session_uid')||query.get('master_uid')||'';const sessionExp=query.get('session_exp')||query.get('master_exp')||'';const sessionSig=query.get('session_sig')||query.get('master_sig')||'';
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
        const target=new URL('index.html',location.href);target.searchParams.set('role','master');target.searchParams.set('appv','20261019-masterpinfl1');
        status.textContent='Доступ подтверждён. Открываем кабинет…';status.className='notice';
        location.href=target.href;
      }catch(err){status.textContent=err.message || 'Не удалось проверить доступ.';status.className='error';button.disabled=false;}
    });
}

function showMasterApplicationForm() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('remont_bt_master_application') || '{}') || {}; } catch (_) {}
    setPage('🧑‍🔧 Заявка мастера', `<p class="subtitle">Укажите ФИО, телефон и данные для проверки ПИНФЛ. Пол и дата рождения сверяются с первыми цифрами ПИНФЛ. После проверки заявка уйдёт администратору; доступ выдаётся только после одобрения и привязывается к вашему Telegram ID.</p>
      <form id="masterApplicationForm" class="card master-auth-card">
        <label for="masterApplicationName">ФИО *</label><input id="masterApplicationName" name="name" required minlength="2" maxlength="150" autocomplete="name" value="${escapeClient(saved.name || localStorage.getItem('remont_bt_name') || '')}">
        <label for="masterApplicationPhone">Телефон *</label><input id="masterApplicationPhone" name="phone" required type="tel" inputmode="tel" autocomplete="tel" placeholder="+998 90 123 45 67" value="${escapeClient(saved.phone || localStorage.getItem('remont_bt_phone') || '')}">
        <label for="masterApplicationGender">Пол *</label><select id="masterApplicationGender" name="gender" required><option value="">Выберите пол</option><option value="Мужской" ${saved.gender==='Мужской'?'selected':''}>Мужской</option><option value="Женский" ${saved.gender==='Женский'?'selected':''}>Женский</option></select>
        <label for="masterApplicationBirthDate">Дата рождения *</label><input id="masterApplicationBirthDate" name="birth_date" required inputmode="numeric" placeholder="ДД.ММ.ГГГГ" pattern="[0-9]{2}\.[0-9]{2}\.[0-9]{4}" value="${escapeClient(saved.birth_date || '')}">
        <label for="masterApplicationPinfl">ПИНФЛ (14 цифр) *</label><input id="masterApplicationPinfl" name="pinfl" required inputmode="numeric" autocomplete="off" minlength="14" maxlength="14" pattern="[0-9]{14}" placeholder="14 цифр" value="${escapeClient(saved.pinfl || '')}">
        <button type="submit">Проверить данные и отправить заявку</button><p id="masterApplicationStatus" class="subtitle" role="status"></p>
      </form>`);
    const form=document.getElementById('masterApplicationForm');
    form?.addEventListener('submit',e=>{e.preventDefault();submitMasterApplication(form);});
}

async function submitMasterApplication(form){
    const data=Object.fromEntries(new FormData(form).entries());
    data.name=String(data.name||'').trim(); data.phone=cleanPhone(data.phone); data.gender=String(data.gender||'').trim(); data.birth_date=String(data.birth_date||'').trim(); data.pinfl=String(data.pinfl||'').replace(/\D/g,''); data.event='submit_master_application';
    const status=document.getElementById('masterApplicationStatus');
    const button=form.querySelector('button[type="submit"]');
    if(data.name.length<2)return showAlert('Введите ФИО.');
    if(!validPhone(data.phone))return showAlert('Введите корректный номер +998XXXXXXXXX.');
    if(!['Мужской','Женский'].includes(data.gender))return showAlert('Выберите пол.');
    const birthMatch=data.birth_date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if(!birthMatch)return showAlert('Введите дату рождения в формате ДД.ММ.ГГГГ.');
    const day=Number(birthMatch[1]), month=Number(birthMatch[2]), year=Number(birthMatch[3]);
    const date=new Date(year,month-1,day);
    if(date.getFullYear()!==year||date.getMonth()!==month-1||date.getDate()!==day||date>new Date()||year<1900)return showAlert('Указана некорректная дата рождения.');
    if(!/^\d{14}$/.test(data.pinfl))return showAlert('ПИНФЛ должен содержать ровно 14 цифр.');
    const first=Number(data.pinfl[0]); const map={3:['Мужской',1900],4:['Женский',1900],5:['Мужской',2000],6:['Женский',2000]}; const pin=map[first];
    if(!pin)return showAlert('Первая цифра ПИНФЛ не соответствует допустимому формату.');
    const pinDate=`${data.pinfl.slice(1,3)}.${data.pinfl.slice(3,5)}.${pin[1]+Number(data.pinfl.slice(5,7))}`;
    if(pin[0]!==data.gender||pinDate!==data.birth_date)return showAlert(`Проверьте данные: по ПИНФЛ указаны пол ${pin[0]} и дата рождения ${pinDate}.`);
    try{localStorage.setItem('remont_bt_master_application',JSON.stringify(data)); localStorage.setItem('remont_bt_phone',data.phone); localStorage.setItem('remont_bt_name',data.name);if(currentClientTelegramId)localStorage.setItem('remont_bt_profile_uid',currentClientTelegramId);}catch(_){}
    if(button){button.disabled=true;button.textContent='⏳ Отправляем заявку…';}
    try {
      const result=await clientApi('/api/master/apply','POST',{name:data.name,phone:data.phone,gender:data.gender,birth_date:data.birth_date,pinfl:data.pinfl});
      if(status){status.textContent=result.already_master?'У вас уже есть кабинет мастера. Вернитесь в Telegram и откройте приложение мастера.':(result.existing_master_phone_match?'Найден существующий мастер с этим номером. Заявка отправлена администратору для проверки привязки.':'Ваша заявка отправлена и находится на рассмотрении.');status.className='notice';}
      if(result.already_master) showExistingMasterHelp('Кабинет мастера уже зарегистрирован. Подтвердите телефон для входа.');
      else if(button){button.textContent='✓ Заявка отправлена';}
    } catch(err) {
      if(err.status === 401){
        if(status){status.textContent='Telegram не подтвердил ваш аккаунт. Закройте Mini App и откройте его заново кнопкой из чата с ботом. Заявка не отправлена и не помещена в очередь.';status.className='error';}
        if(button){button.textContent='Повторить после повторного открытия';button.disabled=false;}
      } else if(err.status && err.status < 500){
        if(status){status.textContent=err.message||'Сервер отклонил заявку. Проверьте данные.';status.className='error';}
        if(button){button.textContent='Исправить данные и повторить';button.disabled=false;}
      } else if(typeof queueOperation==='function'){
        queueOperation(data);
        if(status){status.textContent='Сервер временно недоступен. Заявка сохранена в очереди на этом устройстве и отправится после восстановления связи.';status.className='notice';}
        if(button){button.textContent='📦 Заявка сохранена в очереди';button.disabled=false;}
      } else {if(status){status.textContent='Не удалось отправить заявку. Проверьте связь и повторите.';status.className='error';} if(button)button.disabled=false;}
    }
}

async function clientApi(path, method='GET', body=null) {
    // Telegram may restore the Mini App after navigation; initialise the SDK before requests.
    try { if (window.Telegram?.WebApp) { window.Telegram.WebApp.ready(); window.Telegram.WebApp.expand(); } } catch (_) {}
    const initData = String(window.Telegram?.WebApp?.initData || '');
    const query = new URLSearchParams(window.location.search);
    // The /start application buttons use session_*; the dedicated master button
    // uses master_* for the same signed session format.
    const sessionUid = query.get('session_uid') || query.get('master_uid') || '';
    const sessionExp = query.get('session_exp') || query.get('master_exp') || '';
    const sessionSig = query.get('session_sig') || query.get('master_sig') || '';
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
    document.body.innerHTML = `<button class="back-btn" onclick="renderClientMenu()">← Главная</button><h1>${title}</h1>${body}`;
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
            <p class="subtitle">Есть промокод? Введите его здесь — проверим при отправке первой заявки.</p>
        </div>

        <button id="submit" onclick="submitOrder()">📤 Отправить заявку</button>
    `;

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
        identityCard.style.display = (isKnownRegisteredClient || (isNewClientFlow && localStorage.getItem('remont_bt_identity_saved') === '1')) ? 'none' : 'block';

    } catch (e) {
        console.error('Ошибка инициализации формы клиента:', e);
    }
}

// ============ РЕГИСТРАЦИЯ КЛИЕНТА ============

async function submitRegistration() {
    const nameEl=document.getElementById('client_name'), phoneEl=document.getElementById('client_phone');
    const name=(nameEl?nameEl.value:'').trim(), phone=cleanPhone(phoneEl?phoneEl.value:'');
    if(name.length<2)return showAlert('Введите ФИО не короче 2 символов.');
    if(!validPhone(phone))return showAlert('Введите корректный номер +998XXXXXXXXX.');
    try{localStorage.setItem('remont_bt_name',name);localStorage.setItem('remont_bt_phone',phone);localStorage.setItem('remont_bt_identity_saved','1');if(currentClientTelegramId)localStorage.setItem('remont_bt_profile_uid',currentClientTelegramId);}catch(_){}
    const data={event:'register_client',name,phone,client_name:name,client_phone:phone,client_registration_id:getClientRegistrationId(phone),client_registration_no:getClientRegistrationNo(phone)};
    // Open the client menu immediately; server synchronisation happens in the background.
    try{localStorage.setItem('remont_bt_registered','1');}catch(_){}
    renderClientMenu();
    try {
      await clientApi('/api/client/register','POST',{name,phone,client_registration_id:data.client_registration_id,client_registration_no:data.client_registration_no});
      try{localStorage.setItem('remont_bt_registered','1');}catch(_){}
      showAlert('Регистрация сохранена на сервере.');
    } catch(err) {
      if(err.status && err.status !== 401 && err.status < 500){
        try{localStorage.removeItem('remont_bt_registered');localStorage.removeItem('remont_bt_identity_saved');}catch(_){}
        showAlert(err.message || 'Сервер отклонил регистрацию. Проверьте введённые данные.');
        showRegistrationScreen();
      } else if(typeof queueOperation==='function'){
        queueOperation(data);
        showAlert('Профиль открыт. Данные сохранены на устройстве и поставлены в очередь синхронизации.');
      } else showAlert('Профиль открыт, но сервер недоступен и локальная очередь не загрузилась. Не закрывайте приложение до восстановления связи.');
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

// ============ ОТПРАВКА ЗАЯВКИ ============

function submitOrder() {
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

    console.log('Отправляем заявку:', data);

    const btn = document.getElementById('submit');
    btn.textContent = '⏳ Отправка...';
    btn.disabled = true;

    const ok = sendToBot(data);
    if (ok) {
        try { localStorage.setItem('remont_bt_registered', '1'); } catch (_) {}
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
  const role=clientUrlParams.get('role')||'client';
  if(role==='master_entry'){ showMasterChoice(); return; }
  const localKnown=localStorage.getItem('remont_bt_identity_saved')==='1'||localStorage.getItem('remont_bt_registered')==='1';
  if(localKnown||isKnownRegisteredClient){ renderClientMenu(); return; }
  // Existing server-side client profiles should not be forced through registration again.
  try{
    const d=await clientApi('/api/client/profile');
    const profile=d.profile||{};
    if(profile.name&&profile.phone){localStorage.setItem('remont_bt_name',profile.name);localStorage.setItem('remont_bt_phone',profile.phone);localStorage.setItem('remont_bt_registered','1');localStorage.setItem('remont_bt_identity_saved','1');if(currentClientTelegramId)localStorage.setItem('remont_bt_profile_uid',currentClientTelegramId);renderClientMenu();return;}
  }catch(_){}
  showRegistrationScreen();
}
startRemontApp();
