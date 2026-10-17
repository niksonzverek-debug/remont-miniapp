// Общая логика Mini App: безопасная отправка и локальная очередь для автономного режима.
const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : {
    initData: '', initDataUnsafe: {}, themeParams: {}, platform: 'browser', version: '0',
    ready() {}, expand() {}, onEvent() {}, showAlert(msg) { alert(msg); }, close() {},
    sendData() { throw new Error('Telegram sendData недоступен вне Telegram'); }
};
const isKeyboardLaunch = window.WEBAPP_SENDDATA_SUPPORTED === true;
const OFFLINE_QUEUE_KEY = 'remont_bt_offline_queue_v1';
const LOCAL_REGISTRATION_KEY = 'remont_bt_local_registration_id';

function uuidV4() {
    try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (_) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}
function getLocalRegistrationId() {
    try {
        let id = localStorage.getItem(LOCAL_REGISTRATION_KEY);
        if (!id) { id = uuidV4(); localStorage.setItem(LOCAL_REGISTRATION_KEY, id); }
        return id;
    } catch (_) { return uuidV4(); }
}
function getClientRegistrationId(phone, byTelegramUser = true) {
    const user = tg.initDataUnsafe && tg.initDataUnsafe.user;
    if (byTelegramUser && user && user.id) return 'tg-client-' + String(user.id);
    const digits = String(phone || '').replace(/\D/g, '');
    const key = 'remont_bt_client_registration_' + (digits || 'unknown');
    try { let id=localStorage.getItem(key); if(!id){id='client-'+uuidV4();localStorage.setItem(key,id);} return id; }
    catch (_) { return 'client-'+uuidV4(); }
}
function getClientRegistrationNo(phone, byTelegramUser = true) {
    const user = tg.initDataUnsafe && tg.initDataUnsafe.user;
    const urlRegistrationNo = new URLSearchParams(location.search).get('registration_no');
    if (byTelegramUser && urlRegistrationNo && /^CL-[A-Z0-9-]{6,38}$/.test(urlRegistrationNo)) {
        const key = 'remont_bt_registration_no_tg_' + String(user && user.id ? user.id : 'local');
        try { localStorage.setItem(key, urlRegistrationNo); } catch (_) {}
        return urlRegistrationNo;
    }
    const digits = String(phone || '').replace(/\D/g, '');
    const keyPart = byTelegramUser && user && user.id ? 'tg_' + String(user.id) : 'phone_' + (digits || 'unknown');
    const key = 'remont_bt_registration_no_' + keyPart;
    try {
        let no = localStorage.getItem(key);
        if (!no) { no = 'CL-OFF-' + uuidV4().replace(/-/g, '').slice(0, 10).toUpperCase(); localStorage.setItem(key, no); }
        return no;
    } catch (_) { return 'CL-OFF-' + uuidV4().replace(/-/g, '').slice(0, 10).toUpperCase(); }
}
function getOfflineQueue() {
    try {
        const raw = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
        return Array.isArray(raw) ? raw : [];
    } catch (_) { return []; }
}
function currentQueueOwnerId() {
    const id = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : null;
    return id === null || id === undefined || id === '' ? '' : String(id);
}
function isQueueItemForCurrentUser(item) {
    const uid = currentQueueOwnerId();
    return Boolean(uid) && String(item && item.telegram_user_id || '') === uid &&
        (!item.launch_role || item.launch_role === 'client');
}
function saveOfflineQueue(queue) {
    try { localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.slice(-100))); } catch (e) {
        console.error('Не удалось сохранить очередь локально', e);
        showAlert('Не удалось сохранить запись на устройстве. Освободите место в браузере и повторите.');
    }
    renderOfflineQueueBanner();
}
function queueOperation(data) {
    const queue = getOfflineQueue();
    const op = { ...data };
    op.operation_id = String(op.operation_id || uuidV4());
    op.local_registration_id = String(op.local_registration_id || getLocalRegistrationId());
    op.queued_at = op.queued_at || new Date().toISOString();
    op.telegram_user_id = tg.initDataUnsafe && tg.initDataUnsafe.user ? String(tg.initDataUnsafe.user.id) : null;
    op.launch_role = new URLSearchParams(location.search).get('role') || null;
    if (!queue.some(x => x.operation_id === op.operation_id)) queue.push({ ...op, local_status: 'pending' });
    saveOfflineQueue(queue);
    return op;
}
function showAlert(msg) {
    const message = typeof translateMiniText === 'function' ? translateMiniText(String(msg)) : String(msg);
    try { if (tg && typeof tg.showAlert === 'function') tg.showAlert(message); else alert(message); }
    catch (_) { alert(message); }
}
function sendToBot(data) {
    const op = queueOperation(data);
    if (!isKeyboardLaunch) {
        showAlert('Запись сохранена на этом устройстве и ожидает отправки. Когда появится связь, откройте форму кнопкой в клавиатуре чата с ботом и нажмите «Передать сохранённые записи».');
        return false;
    }
    try {
        tg.sendData(JSON.stringify(op));
        const queue = getOfflineQueue().map(item => item.operation_id === op.operation_id
            ? { ...item, local_status: 'submitted', submitted_at: new Date().toISOString() } : item);
        saveOfflineQueue(queue);
        // Telegram сам закрывает Web App после sendData. Не вызываем close() повторно:
        // это может опередить ответ бота с восстановленной reply-клавиатурой.
        return true;
    } catch (e) {
        console.error('sendData error:', e);
        showAlert('Не удалось передать запись. Она сохранена локально — повторите отправку при восстановлении связи.');
        return false;
    }
}
function sendEvent(type, payload = {}) { return sendToBot({ event: type, ...payload }); }
function flushOfflineQueue() {
    if (!isKeyboardLaunch) {
        showAlert('Для синхронизации откройте форму кнопкой в клавиатуре чата с ботом.');
        return false;
    }
    const queue = getOfflineQueue();
    if (!currentQueueOwnerId()) {
        showAlert('Не удалось определить аккаунт Telegram. Закройте приложение и откройте его из чата с ботом.');
        return false;
    }
    const pending = queue.filter(x => isQueueItemForCurrentUser(x) && (x.local_status === 'pending' || x.local_status === 'retry'));
    if (!pending.length) {
        const unownedLegacyItems = queue.some(x => !x.telegram_user_id && (x.local_status === 'pending' || x.local_status === 'retry'));
        showAlert(unownedLegacyItems
            ? 'В очереди остались записи старой версии без ID владельца. Они не отправлены автоматически, чтобы не передать данные другого клиента. Проверьте их вручную перед повторной отправкой.'
            : 'Новых записей в очереди этого аккаунта нет. Если отправка ранее не подтвердилась, повторите её из этого же аккаунта.');
        return false;
    }
    const batch = [];
    for (const item of pending) {
        const trial = [...batch, Object.fromEntries(Object.entries(item).filter(([k]) => k !== 'local_status' && k !== 'submitted_at'))];
        if (JSON.stringify({ event: 'sync_batch', operations: trial }).length > 3500) break;
        batch.push(trial[trial.length - 1]);
    }
    if (!batch.length) {
        showAlert('Запись слишком большая для безопасной передачи одним пакетом. Откройте её и отправьте отдельно.');
        return false;
    }
    try {
        tg.sendData(JSON.stringify({ event: 'sync_batch', operations: batch }));
        const sentIds = new Set(batch.map(x => x.operation_id));
        saveOfflineQueue(queue.map(x => sentIds.has(x.operation_id)
            ? { ...x, local_status: 'submitted', submitted_at: new Date().toISOString() } : x));
        // Telegram сам закрывает Web App после sendData. Не вызываем close() повторно:
        // это может опередить ответ бота с восстановленной reply-клавиатурой.
        return true;
    } catch (e) {
        saveOfflineQueue(queue.map(x => pending.some(p => p.operation_id === x.operation_id)
            ? { ...x, local_status: 'retry' } : x));
        showAlert('Передача не удалась. Записи остались в локальной очереди.');
        return false;
    }
}
function retrySubmittedQueue() {
    const queue = getOfflineQueue().map(x => isQueueItemForCurrentUser(x) && x.local_status === 'submitted'
        ? { ...x, local_status: 'retry' } : x);
    saveOfflineQueue(queue);
    flushOfflineQueue();
}
function clearSubmittedQueue() {
    const queue = getOfflineQueue().filter(x => !(isQueueItemForCurrentUser(x) && x.local_status === 'submitted'));
    saveOfflineQueue(queue);
    showAlert('Отправленные записи этого аккаунта удалены из локальной очереди. Делайте это только после подтверждения бота в чате.');
}
function renderOfflineQueueBanner() {
    // Техническая очередь скрыта от клиента и мастера; локальное сохранение продолжает работать.
    const existing = document.getElementById("offlineQueueBanner");
    if (existing) existing.remove();
}

function applyTheme() {
    const root = document.documentElement;
    const params = tg.themeParams || {};
    if (params.bg_color) root.style.setProperty('--bg', params.bg_color);
    if (params.text_color) root.style.setProperty('--text', params.text_color);
    if (params.hint_color) root.style.setProperty('--hint', params.hint_color);
    if (params.link_color) root.style.setProperty('--link', params.link_color);
    if (params.button_color) root.style.setProperty('--button', params.button_color);
    if (params.button_text_color) root.style.setProperty('--button_text', params.button_text_color);
    if (params.secondary_bg_color) { root.style.setProperty('--secondary_bg', params.secondary_bg_color); root.style.setProperty('--card_bg', params.secondary_bg_color); }
}
applyTheme();
try { tg.ready(); tg.expand(); tg.onEvent('themeChanged', applyTheme); } catch (_) {}
try { if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js?v=20261018fresh1').then(reg => reg.update()).catch(() => {}); } catch (_) {}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderOfflineQueueBanner);
else renderOfflineQueueBanner();
function fmtPrice(n) { return new Intl.NumberFormat('ru-RU').format(n) + ' сум'; }
function fmtPhone(p) {
    p = (p || '').replace(/\D/g, '');
    if (p.length === 12 && p.startsWith('998')) return `+${p.slice(0,3)} ${p.slice(3,5)} ${p.slice(5,8)} ${p.slice(8,10)} ${p.slice(10)}`;
    return p;
}
function cleanPhone(p) { return (p || '').replace(/\D/g, ''); }
function validPhone(p) { return /^998\d{9}$/.test(cleanPhone(p)); }

// Базовая двуязычность интерфейса Mini App. Язык хранится локально на устройстве.
const REMONT_UZ = [
 ['Создать заявку','Buyurtma yaratish'],['Новая заявка','Yangi buyurtma'],['Вид техники','Texnika turi'],['Ваше имя / ФИО','Ism-familiyangiz'],['Как к вам обращаться','Ismingiz'],['Номер телефона','Telefon raqami'],['Сохранить регистрацию отдельно','Roʻyxatdan oʻtishni alohida saqlash'],['Эти данные помогают зарегистрировать клиента и восстановить связь с заказом даже после временного сбоя.','Bu maʼlumotlar mijozni roʻyxatdan oʻtkazish va uzilishdan keyin buyurtmani topishga yordam beradi.'],['Бренд','Brend'],['Модель','Model'],['Описание проблемы','Muammo tavsifi'],['Когда удобно?','Qachon qulay?'],['Дата','Sana'],['Время','Vaqt'],['Дом / улица','Koʻcha va uy'],['Номер дома','Uy raqami'],['Квартира','Xonadon'],['Комментарий','Izoh'],['Отправить заявку','Buyurtmani yuborish'],['Отправить','Yuborish'],['Стоимость (сум)','Narxi (soʻm)'],['На что распространяется гарантия?','Kafolat nimaga tegishli?'],['Исключения / ограничения гарантии','Kafolat istisnolari / cheklovlari'],['Срок гарантии','Kafolat muddati'],['Работы выполнены','Bajarilgan ishlar'],['Добавить работу','Ish qoʻshish'],['Сохранить акт','Dalolatnomani saqlash'],['Создать акт','Dalolatnoma yaratish'],['Новый акт','Yangi dalolatnoma'],['ФИО клиента (если известно)','Mijozning F.I.Sh. (maʼlum boʻlsa)'],['Введите имя клиента','Mijoz ismini kiriting'],['Введите номер телефона +998XXXXXXXXX','+998XXXXXXXXX telefon raqamini kiriting'],['Неверный номер телефона (998XXXXXXXXX)','Telefon raqami notoʻgʻri (998XXXXXXXXX)'],['Запись сохранена на этом устройстве и ожидает отправки. Когда появится связь, откройте форму кнопкой в клавиатуре чата с ботом и нажмите «Передать сохранённые записи».','Yozuv qurilmada saqlandi va yuborishni kutmoqda. Aloqa tiklangach, bot chatidagi tugma orqali formani ochib, «Saqlangan yozuvlarni yuborish» tugmasini bosing.'],['🔄 Локальная очередь:','🔄 Mahalliy navbat:'],['Ожидают отправки:','Yuborishni kutmoqda:'],['Переданы в Telegram:','Telegramga yuborildi:'],['Передать сохранённые записи','Saqlangan yozuvlarni yuborish'],['Повторить отправленные','Yuborilganlarni qayta yuborish'],['Очистить подтверждённые','Tasdiqlanganlarni tozalash'],['Регистрация синхронизирована','Roʻyxatdan oʻtish sinxronlandi'],['Заявка отправлена','Buyurtma yuborildi'],['Нет соединения','Ulanish yoʻq'],['Откройте приложение из Telegram. Вне Telegram отправка данных боту недоступна.','Ilovani Telegram ichidan oching. Telegramdan tashqarida botga maʼlumot yuborib boʻlmaydi.']
];
function currentMiniLang() { try { return localStorage.getItem('remont_bt_lang') || 'ru'; } catch (_) { return 'ru'; } }
function translateMiniText(value) {
    if (currentMiniLang() !== 'uz') return value;
    let out = String(value);
    for (const [ru, uz] of REMONT_UZ) out = out.split(ru).join(uz);
    return out;
}
function translateMiniDom() {
    if (currentMiniLang() !== 'uz' || !document.body) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            const parent = node.parentElement;
            if (!parent || ['SCRIPT','STYLE','TEXTAREA'].includes(parent.tagName) || parent.id === 'remontLangToggle') return NodeFilter.FILTER_REJECT;
            return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
    });
    const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => { const translated = translateMiniText(node.nodeValue); if (translated !== node.nodeValue) node.nodeValue = translated; });
    document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(el => { if (!el.dataset.remontOriginalPlaceholder) el.dataset.remontOriginalPlaceholder=el.placeholder; el.placeholder=translateMiniText(el.dataset.remontOriginalPlaceholder); });
}
function toggleMiniLanguage() {
    const next = currentMiniLang() === 'ru' ? 'uz' : 'ru';
    try { localStorage.setItem('remont_bt_lang', next); } catch (_) {}
    if (document.documentElement) document.documentElement.lang = next === 'uz' ? 'uz' : 'ru';
    const btn = document.getElementById('remontLangToggle');
    if (btn) btn.textContent = next === 'ru' ? 'Oʻzbekcha' : 'Русский';
    if (next === 'ru') location.reload(); else translateMiniDom();
}
function ensureMiniLanguageButton() {
    if (!document.body || document.getElementById('remontLangToggle')) return;
    const btn=document.createElement('button'); btn.id='remontLangToggle'; btn.type='button';
    btn.textContent=currentMiniLang()==='ru'?'Oʻzbekcha':'Русский';
    btn.style.cssText='position:sticky;top:6px;float:right;z-index:99999;margin:6px 8px 0 0;padding:8px 11px;border:1px solid #7b8d87;border-radius:12px;background:var(--card_bg,#fff);color:var(--text,#17231f);font:600 13px sans-serif;';
    btn.onclick=toggleMiniLanguage; document.body.prepend(btn);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { ensureMiniLanguageButton(); translateMiniDom(); });
else { ensureMiniLanguageButton(); translateMiniDom(); }
try { new MutationObserver(() => { ensureMiniLanguageButton(); if (!document.getElementById('offlineQueueBanner')) renderOfflineQueueBanner(); translateMiniDom(); }).observe(document.body, {childList:true,subtree:true}); } catch (_) {}


// Навигация Mini App: системная кнопка Telegram «Назад» + свайп от левого края.
(function installMiniAppBackNavigation(){
  if (window.__remontBackNavigationInstalled) return;
  window.__remontBackNavigationInstalled = true;
  function isClientHome(){ return !!document.querySelector('.client-home-grid'); }
  function goBack(){
    const role = new URLSearchParams(location.search).get('role') || '';
    const back = document.querySelector('.back-btn,[data-action="back"],.back-button,button[aria-label="Назад"]');
    if (back) { back.click(); return true; }
    if (role === 'client' && typeof renderClientMenu === 'function' && !isClientHome()) { renderClientMenu(); return true; }
    if (role === 'master') {
      if (typeof renderMasterMenu === 'function') { renderMasterMenu(); return true; }
      if (typeof showMasterDashboard === 'function') { showMasterDashboard(); return true; }
      if (typeof renderMasterHome === 'function') { renderMasterHome(); return true; }
    }
    if (role === 'advertiser' && history.length > 1) { history.back(); return true; }
    return false;
  }
  function updateTelegramBackButton(){
    try {
      if (!tg || !tg.BackButton) return;
      const role = new URLSearchParams(location.search).get('role') || '';
      const hasBack = !!document.querySelector('.back-btn,[data-action="back"],.back-button,button[aria-label="Назад"]') || (role === 'client' && !isClientHome());
      if (hasBack) tg.BackButton.show(); else tg.BackButton.hide();
    } catch (_) {}
  }
  try { if (tg && typeof tg.onEvent === 'function') tg.onEvent('backButtonClicked', goBack); } catch (_) {}
  try { new MutationObserver(updateTelegramBackButton).observe(document.body, {childList:true,subtree:true}); } catch (_) {}
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', updateTelegramBackButton); else updateTelegramBackButton();
  let startX=0,startY=0,tracking=false,claimed=false;
  document.addEventListener('touchstart', e=>{
    if(!e.touches || e.touches.length!==1) { tracking=false; return; }
    const t=e.touches[0]; startX=t.clientX; startY=t.clientY; tracking=startX<=32; claimed=false;
  },{passive:true,capture:true});
  document.addEventListener('touchmove', e=>{
    if(!tracking || !e.touches || e.touches.length!==1) return;
    const t=e.touches[0], dx=t.clientX-startX, dy=t.clientY-startY;
    const target=e.target;
    if(target && target.closest && target.closest('input,textarea,select,[contenteditable="true"],.leaflet-container,canvas')) { tracking=false; return; }
    if(dx>12 && Math.abs(dx)>Math.abs(dy)*1.15) { claimed=true; if(e.cancelable) e.preventDefault(); }
    else if(Math.abs(dy)>18 && Math.abs(dy)>Math.abs(dx)) tracking=false;
  },{passive:false,capture:true});
  document.addEventListener('touchend', e=>{
    if(!tracking || !e.changedTouches || !e.changedTouches.length) return;
    tracking=false; const t=e.changedTouches[0], dx=t.clientX-startX, dy=t.clientY-startY;
    if(dx>=70 && Math.abs(dy)<=Math.max(70,dx*.65)) { if(claimed && e.cancelable) e.preventDefault(); goBack(); }
    claimed=false;
  },{passive:false,capture:true});
})();
