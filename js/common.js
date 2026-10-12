// miniapp/js/common.js

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Применяем тему Telegram
function applyTheme() {
    const root = document.documentElement;
    const params = tg.themeParams;
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

// Хелпер: показать алерт
function showAlert(msg) {
    tg.showAlert(msg);
}

// Хелпер: показать подтверждение
function showConfirm(msg, callback) {
    tg.showConfirm(msg, callback);
}

// Отправка данных в бота
function sendToBot(data) {
    tg.sendData(JSON.stringify(data));
    tg.close();
}

// Отправка события (без закрытия)
function sendEvent(type, payload = {}) {
    tg.sendData(JSON.stringify({ event: type, ...payload }));
}

// Форматирование цены
function fmtPrice(n) {
    return new Intl.NumberFormat('ru-RU').format(n) + ' сум';
}

// Форматирование телефона
function fmtPhone(p) {
    p = (p || '').replace(/\D/g, '');
    if (p.length === 12 && p.startsWith('998')) {
        return `+${p.slice(0,3)} ${p.slice(3,5)} ${p.slice(5,8)} ${p.slice(8,10)} ${p.slice(10)}`;
    }
    return p;
}

// Нормализация телефона
function cleanPhone(p) {
    return (p || '').replace(/\D/g, '');
}

// Валидация телефона
function validPhone(p) {
    return /^998\d{9}$/.test(cleanPhone(p));
}