// miniapp/js/common.js

const tg = window.Telegram.WebApp;

console.log("=== Mini App START ===");
console.log("initData length:", tg.initData?.length || 0);
console.log("user:", tg.initDataUnsafe?.user);

tg.ready();
tg.expand();

// Применяем тему Telegram
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

function showConfirm(msg, callback) {
    try { tg.showConfirm(msg, callback); } catch (e) { callback(confirm(msg)); }
}

// ВАЖНО: НЕ вызываем tg.close() — Telegram сам закроет после sendData
function sendToBot(data) {
    console.log("sendToBot:", data);
    try {
        tg.sendData(JSON.stringify(data));
    } catch (e) {
        console.error("sendData error:", e);
        showAlert("Ошибка отправки: " + e.message);
    }
}

function sendEvent(type, payload = {}) {
    sendToBot({ event: type, ...payload });
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

function cleanPhone(p) {
    return (p || '').replace(/\D/g, '');
}

function validPhone(p) {
    return /^998\d{9}$/.test(cleanPhone(p));
}