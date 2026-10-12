// miniapp/js/client.js

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

// ============ ГЛАВНОЕ МЕНЮ КЛИЕНТА ============

function renderClientMenu() {
    document.body.innerHTML = `
        <h1>👤 Личный кабинет</h1>
        <p class="subtitle">Здравствуйте, ${tg.initDataUnsafe?.user?.first_name || 'друг'}!</p>

        <button class="menu-btn" onclick="showNewOrder()">
            <span class="emoji">📝</span> Создать заявку
        </button>
        <button class="menu-btn" onclick="showMyActs()">
            <span class="emoji">📄</span> Мои акты
        </button>
        <button class="menu-btn" onclick="showEnterPromo()">
            <span class="emoji">🎟️</span> Ввести промокод
        </button>
        <button class="menu-btn" onclick="showProfile()">
            <span class="emoji">👤</span> Мой профиль
        </button>
        <button class="menu-btn" onclick="showCallMaster()">
            <span class="emoji">📞</span> Позвонить мастеру
        </button>
    `;
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

    document.body.innerHTML = `
        <button class="back-btn" onclick="renderClientMenu()">← Назад</button>
        <h1>📝 Новая заявка</h1>
        <p class="subtitle">Заполните данные — мастер свяжется</p>

        <div class="card">
            <label>Вид техники</label>
            <select id="device">
                <option value="">— Выберите —</option>
                <option value="Стиральная машина">🧺 Стиральная машина</option>
                <option value="Холодильник">❄️ Холодильник</option>
                <option value="Кондиционер">🌬️ Кондиционер</option>
                <option value="Посудомоечная машина">🍽️ Посудомоечная</option>
                <option value="Другое">📱 Другое</option>
            </select>

            <label>Бренд</label>
            <select id="brand">
                <option value="">— Выберите —</option>
                <option value="LG">LG</option>
                <option value="Samsung">Samsung</option>
                <option value="Indesit">Indesit</option>
                <option value="Bosch">Bosch</option>
                <option value="Beko">Beko</option>
                <option value="Другое">Другое</option>
            </select>

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
                <option value="">— Выберите день —</option>
                <option value="Сегодня">Сегодня</option>
                <option value="Завтра">Завтра</option>
                <option value="Послезавтра">Послезавтра</option>
                <option value="На выходных">На выходных</option>
                <option value="В любое время">В любое время</option>
            </select>

            <label>Время</label>
            <select id="when_time">
                <option value="">— Выберите —</option>
                <option value="Утро 9:00–12:00">Утро 9:00–12:00</option>
                <option value="День 12:00–15:00">День 12:00–15:00</option>
                <option value="После обеда 15:00–18:00">После обеда 15:00–18:00</option>
                <option value="Вечер 18:00–21:00">Вечер 18:00–21:00</option>
                <option value="Точное время уточню">Точное время уточню</option>
            </select>
        </div>

        <div class="card">
            <label>Дом (номер дома) *</label>
            <input id="house" placeholder="Например: 15А" autocomplete="off">

            <label>Квартира (необязательно)</label>
            <input id="apartment" placeholder="Например: 42" autocomplete="off">

            <button onclick="sendLocation()" style="margin-top:14px;padding:14px;font-size:16px;background:#f0f0f0;border:1px solid #ddd;border-radius:10px;width:100%;cursor:pointer;">
                📍 Отправить мою локацию
            </button>
            <p id="location_status" style="color:#888;font-size:13px;margin-top:8px;">Локация не отправлена</p>
        </div>

        <div class="card">
            <label>Комментарий к заказу (необязательно)</label>
            <textarea id="comment" placeholder="Любая дополнительная информация" maxlength="300"></textarea>
        </div>

        <button id="submit" onclick="submitOrder()">📤 Отправить заявку</button>
    `;
}

// ============ ЛОКАЦИЯ ============

function sendLocation() {
    const status = document.getElementById('location_status');
    status.textContent = '⏳ Определяем локацию...';
    status.style.color = '#888';

    // Способ 1: Telegram LocationManager (правильный)
    if (tg.LocationManager && typeof tg.LocationManager.init === 'function') {
        try {
            tg.LocationManager.init(() => {
                tg.LocationManager.getLocation((loc) => {
                    if (loc && loc.latitude && loc.longitude) {
                        orderData.location = {
                            lat: loc.latitude,
                            lon: loc.longitude,
                        };
                        status.textContent =
                            `✅ ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`;
                        status.style.color = '#43a047';
                    } else {
                        // Fallback на браузерный API
                        getBrowserLocation();
                    }
                });
            });
            return;
        } catch (e) {
            console.error("LocationManager error:", e);
            // Fallback
        }
    }

    // Способ 2: браузерный API (если Telegram не поддерживает)
    getBrowserLocation();
}

function getBrowserLocation() {
    const status = document.getElementById('location_status');

    if (!navigator.geolocation) {
        status.textContent = '❌ Геолокация не поддерживается';
        status.style.color = '#e53935';
        showAlert('Геолокация не поддерживается на этом устройстве');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            orderData.location = {
                lat: pos.coords.latitude,
                lon: pos.coords.longitude,
            };
            status.textContent =
                `✅ ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)} (точность ±${Math.round(pos.coords.accuracy)} м)`;
            status.style.color = '#43a047';
        },
        (err) => {
            console.error("Geolocation error:", err);
            let msg = 'Не удалось получить локацию';
            if (err.code === 1) msg = 'Вы запретили доступ к геолокации';
            else if (err.code === 2) msg = 'Локация недоступна';
            else if (err.code === 3) msg = 'Превышено время ожидания';

            status.textContent = `❌ ${msg}`;
            status.style.color = '#e53935';
            showAlert(msg);
        },
        {
            enableHighAccuracy: true,   // Точное определение через GPS
            timeout: 15000,              // 15 секунд
            maximumAge: 0,               // Не использовать кэш
        }
    );
}

// ============ ОТПРАВКА ЗАЯВКИ ============

function submitOrder() {
    const device = document.getElementById('device').value;
    const brand = document.getElementById('brand').value;
    const model = document.getElementById('model').value.trim();
    const problem = document.getElementById('problem').value.trim();
    const when_date = document.getElementById('when_date').value;
    const when_time = document.getElementById('when_time').value;
    const house = document.getElementById('house').value.trim();
    const apartment = document.getElementById('apartment').value.trim();
    const comment = document.getElementById('comment').value.trim();

    // Валидация
    if (!device) return showAlert('Выберите вид техники');
    if (!brand) return showAlert('Выберите бренд');
    if (!problem || problem.length < 5) return showAlert('Опишите проблему (минимум 5 символов)');
    if (!when_date) return showAlert('Выберите день');
    if (!when_time) return showAlert('Выберите время');
    if (!house) return showAlert('Укажите номер дома');

    const data = {
        event: 'new_order',
        device: device,
        brand: brand,
        model: model || '—',
        problem: problem,
        when_date: when_date,
        when_time: when_time,
        house: house,
        apartment: apartment,
        comment: comment,
        location: orderData.location || null,
    };

    console.log("Отправляем заявку:", data);

    document.getElementById('submit').textContent = '⏳ Отправка...';
    document.getElementById('submit').disabled = true;

    tg.sendData(JSON.stringify(data));
}

// ============ МОИ АКТЫ ============

function showMyActs() {
    sendEvent('get_my_acts');
    document.body.innerHTML = `
        <button class="back-btn" onclick="renderClientMenu()">← Назад</button>
        <h1>📄 Мои акты</h1>
        <div class="empty">
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
    sendToBot({ event: 'enter_promo', code: code });
}

// ============ МОЙ ПРОФИЛЬ ============

function showProfile() {
    sendEvent('get_profile');
    document.body.innerHTML = `
        <button class="back-btn" onclick="renderClientMenu()">← Назад</button>
        <h1>👤 Мой профиль</h1>
        <div class="empty">
            Профиль придёт в чат бота 📩
        </div>
    `;
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

// ============ СТАРТ ============

renderClientMenu();
