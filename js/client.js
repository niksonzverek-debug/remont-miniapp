// miniapp/js/client.js

// ============ ГЛАВНОЕ МЕНЮ КЛИЕНТА ============

function renderClientMenu() {
    document.body.innerHTML = `
        <h1>👤 Личный кабинет</h1>
        <p class="subtitle">Здравствуйте, ${tg.initDataUnsafe?.user?.first_name || 'друг'}!</p>

        <button class="menu-btn" onclick="showMyActs()">
            <span class="emoji">📄</span> Мои акты
        </button>
        <button class="menu-btn" onclick="showEnterPromo()">
            <span class="emoji">🎟️</span> Ввести промокод
        </button>
        <button class="menu-btn" onclick="showCallMaster()">
            <span class="emoji">📞</span> Позвонить мастеру
        </button>
        <button class="menu-btn" onclick="showFeedbackList()">
            <span class="emoji">⭐</span> Оставить отзыв
        </button>
    `;
}

// ============ МОИ АКТЫ ============

function showMyActs() {
    sendEvent('get_my_acts');
    document.body.innerHTML = `
        <button class="back-btn" onclick="renderClientMenu()">← Назад</button>
        <h1>📄 Мои акты</h1>
        <div class="empty">
            Запрос отправлен.<br>
            Список актов придёт в чат бота 📩
        </div>
    `;
}

// ============ ВВОД ПРОМОКОДА ============

function showEnterPromo() {
    document.body.innerHTML = `
        <button class="back-btn" onclick="renderClientMenu()">← Назад</button>
        <h1>🎟️ Ввести промокод</h1>
        <p class="subtitle">Введите код и получите скидку</p>

        <div class="card">
            <label>Промокод</label>
            <input id="promo_code" placeholder="BLOGER10" autocapitalize="characters"
                   style="text-transform:uppercase; font-size:20px; text-align:center; letter-spacing:2px;">
        </div>

        <button id="submit" onclick="submitPromo()">✅ Активировать</button>
    `;

    document.getElementById('promo_code').focus();
}

function submitPromo() {
    const code = document.getElementById('promo_code').value.trim().toUpperCase();
    if (!code || code.length < 4) {
        return showAlert('Введите промокод (минимум 4 символа)');
    }
    sendToBot({
        event: 'enter_promo',
        code: code,
    });
}

// ============ ПОЗВОНИТЬ МАСТЕРУ ============

function showCallMaster() {
    sendEvent('get_master_phone');
    document.body.innerHTML = `
        <button class="back-btn" onclick="renderClientMenu()">← Назад</button>
        <h1>📞 Позвонить мастеру</h1>
        <div class="empty">
            Номер мастера придёт в чат бота 📩
        </div>
    `;
}

// ============ ОТЗЫВЫ ============

function showFeedbackList() {
    sendEvent('get_feedback_list');
    document.body.innerHTML = `
        <button class="back-btn" onclick="renderClientMenu()">← Назад</button>
        <h1>⭐ Оставить отзыв</h1>
        <p class="subtitle">Выберите акт, по которому хотите оставить отзыв</p>
        <div class="empty">
            Список ваших актов придёт в чат бота 📩
        </div>
    `;
}

// ============ СТАРТ ============

renderClientMenu();