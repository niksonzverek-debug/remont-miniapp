// miniapp/js/common.js

const tg = window.Telegram.WebApp;

console.log("=== Mini App START ===");
console.log("initData length:", tg.initData?.length || 0);
console.log("platform:", tg.platform);
console.log("version:", tg.version);
console.log("user:", tg.initDataUnsafe?.user);

tg.ready();
tg.expand();

// sendData is supported for Web Apps opened from a reply-keyboard button,
 // but not for the bot's Main Mini App/menu button.
const isMainMiniApp = window.WEBAPP_SENDDATA_SUPPORTED !== true;

function applyTheme() {
    const root = document.documentElement;
    const params = tg.themeParams || {};
    if (params.bg_color) root.style.setProperty('--bg', params.bg_color);
    if (params.text_color) root.style.setProperty('--text', params.text_color);
    if (params.hint_color) root.style.setProperty('--hint', params.hint_color);
    if (params.link_color) root.style.setProperty('--link', params.link_color);
    if (params.button_color) root.style.setProperty('--button', params.button_color);
    if (params.button_text_color) root.style.setProperty('--button_text', params.button_text_color);
    if (params.secondary_bg_color) {
        root.style.setProperty('--secondary_bg', params.secondary_bg_color);
        root.style.setProperty('--card_bg', params.secondary_bg_color);
    }
}
applyTheme();
tg.onEvent('themeChanged', applyTheme);

function showAlert(msg) {
    try { tg.showAlert(msg); } catch (e) { alert(msg); }
}

function sendToBot(data) {
    console.log("sendToBot called:", data);
    console.log("isMainMiniApp:", isMainMiniApp);
    console.log("initData len:", tg.initData?.length);

    if (isMainMiniApp) {
        showAlert("Эта форма открыта через кнопку «Открыть» в меню Telegram. В таком режиме Telegram не передаёт форму боту через sendData. Чтобы отправить данные без сервера, откройте форму кнопкой в клавиатуре чата с ботом.");
        return false;
    }

    try {
        tg.sendData(JSON.stringify(data));
        setTimeout(() => { try { tg.close(); } catch (e) {} }, 200);
        return true;
    } catch (e) {
        console.error("sendData error:", e);
        showAlert("Ошибка: " + e.message);
        return false;
    }
}

function sendEvent(type, payload = {}) {
    return sendToBot({ event: type, ...payload });
}

function fmtPrice(n) {
    return new Intl.NumberFormat('ru-RU').format(n) + ' сум';
}
function fmtPhone(p) {
    p = (p || '').replace(/\D/g, '');
    if (p.length === 12 && p.startsWith('998')) {
        return `+${p.slice(0,3)} ${p.slice(3,5)} ${p.slice(5,8)} ${p.slice(8,10)} ${p.slice(10)}`;
    }
    return p;
}
function cleanPhone(p) { return (p || '').replace(/\D/g, ''); }
function validPhone(p) { return /^998\d{9}$/.test(cleanPhone(p)); }