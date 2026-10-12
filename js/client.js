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

// ============ КРАСИВЫЙ ПИКЕР (iOS-стиль) ============

function openPicker(title, items, currentIndex, onSelect) {
    // items: массив строк
    // onSelect: callback с выбранным индексом
    if (typeof MobileSelect === 'undefined') {
        // Fallback — обычный select
        const val = prompt(title, items[currentIndex] || '');
        if (val !== null) {
            const idx = items.indexOf(val);
            if (idx !== -1) onSelect(idx);
        }
        return;
    }

    const picker = new MobileSelect({
        title: title,
        trigger: null,
        wheels: [
            { data: items }
        ],
        position: [currentIndex || 0],
        transitionEnd: function (indexArr) {
            onSelect(indexArr[0]);
        }
    });

    picker.show();
}

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

    // Генерируем даты на 7 дней вперёд
    const dateItems = [];
    const dateValues = [];
    const today = new Date();
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const label = `${d.getDate()} ${months[d.getMonth()]}, ${days[d.getDay()]}`;
        const value = d.toISOString().split('T')[0];
        dateItems.push(label);
        dateValues.push(value);
    }

    // Время: с 9:00 до 21:00
    const timeItems = [];
    for (let h = 9; h <= 21; h++) {
        timeItems.push(`${String(h).padStart(2, '0')}:00`);
    }

    // Сохраняем в глобальной области, чтобы пикер имел доступ
    window._dateItems = dateItems;
    window._dateValues = dateValues;
    window._timeItems = timeItems;

    document.body.innerHTML = `
        <button class="back-btn" onclick="renderClientMenu()">← Назад</button>
        <h1>📝 Новая заявка</h1>
        <p class="subtitle">Заполните данные — мастер свяжется</p>

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
            <div style="display:flex;gap:8px;margin-top:8px;">
                <button type="button" onclick="setDay('today')" id="btn_today" class="day-btn">Сегодня</button>
                <button type="button" onclick="setDay('tomorrow')" id="btn_tomorrow" class="day-btn">Завтра</button>
                <button type="button" onclick="setDay('custom')" id="btn_custom" class="day-btn">Выбрать дату</button>
            </div>

            <div id="date_display" style="margin-top:10px;font-size:15px;color:#2481cc;font-weight:600;display:none;"></div>

            <label style="margin-top:14px;">Время</label>
            <button type="button" onclick="openTimePicker()" id="btn_time" class="picker-btn">
                Нажмите, чтобы выбрать время
            </button>
            <div id="time_display" style="margin-top:8px;font-size:15px;color:#2481cc;font-weight:600;display:none;"></div>
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

        <style>
            .day-btn {
                flex:1;padding:12px 8px;font-size:14px;font-weight:600;
                background:#f0f0f0;border:2px solid #ddd;border-radius:10px;
                cursor:pointer;transition:all 0.15s;
            }
            .day-btn.active {
                background:#2481cc;color:white;border-color:#2481cc;
            }
            .picker-btn {
                width:100%;padding:14px;font-size:16px;
                background:#f0f0f0;border:2px solid #ddd;border-radius:10px;
                cursor:pointer;text-align:left;color:#666;
            }
            .picker-btn.selected {
                background:white;color:#2481cc;border-color:#2481cc;font-weight:600;
            }
        </style>
    `;
}

// ============ ВЫБОР ДНЯ ============

function setDay(mode) {
    document.getElementById('btn_today').classList.remove('active');
    document.getElementById('btn_tomorrow').classList.remove('active');
    document.getElementById('btn_custom').classList.remove('active');

    const display = document.getElementById('date_display');
    display.style.display = 'block';

    if (mode === 'today') {
        document.getElementById('btn_today').classList.add('active');
        const d = new Date();
        orderData.when_date = d.toISOString().split('T')[0];
        display.textContent = `📅 Сегодня, ${d.getDate()} ${['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'][d.getMonth()]}`;
    } else if (mode === 'tomorrow') {
        document.getElementById('btn_tomorrow').classList.add('active');
        const d = new Date();
        d.setDate(d.getDate() + 1);
        orderData.when_date = d.toISOString().split('T')[0];
        display.textContent = `📅 Завтра, ${d.getDate()} ${['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'][d.getMonth()]}`;
    } else if (mode === 'custom') {
        document.getElementById('btn_custom').classList.add('active');
        openDatePicker();
    }
}

function openDatePicker() {
    if (typeof MobileSelect === 'undefined') {
        // Fallback
        const items = window._dateItems;
        const current = orderData.when_date ? window._dateValues.indexOf(orderData.when_date) : 0;
        const val = prompt('Выберите дату', items[current] || items[0]);
        if (val !== null) {
            const idx = items.indexOf(val);
            if (idx !== -1) {
                orderData.when_date = window._dateValues[idx];
                document.getElementById('date_display').textContent = `📅 ${items[idx]}`;
            }
        }
        return;
    }

    const picker = new MobileSelect({
        title: 'Выберите дату',
        wheels: [
            { data: window._dateItems }
        ],
        position: [0],
        transitionEnd: function (indexArr) {
            const idx = indexArr[0];
            orderData.when_date = window._dateValues[idx];
            document.getElementById('date_display').textContent = `📅 ${window._dateItems[idx]}`;
        }
    });

    picker.show();
}

// ============ ВЫБОР ВРЕМЕНИ ============

function openTimePicker() {
    if (typeof MobileSelect === 'undefined') {
        // Fallback
        const items = window._timeItems;
        const current = orderData.when_time ? items.indexOf(orderData.when_time) : 0;
        const val = prompt('Выберите время', items[current] || items[0]);
        if (val !== null) {
            const idx = items.indexOf(val);
            if (idx !== -1) {
                orderData.when_time = items[idx];
                updateTimeButton(items[idx]);
            }
        }
        return;
    }

    let currentIdx = 0;
    if (orderData.when_time) {
        const i = window._timeItems.indexOf(orderData.when_time);
        if (i !== -1) currentIdx = i;
    }

    const picker = new MobileSelect({
        title: 'Выберите время',
        wheels: [
            { data: window._timeItems }
        ],
        position: [currentIdx],
        transitionEnd: function (indexArr) {
            const idx = indexArr[0];
            orderData.when_time = window._timeItems[idx];
            updateTimeButton(orderData.when_time);
        }
    });

    picker.show();
}

function updateTimeButton(time) {
    const btn = document.getElementById('btn_time');
    const display = document.getElementById('time_display');
    btn.textContent = time;
    btn.classList.add('selected');
    display.style.display = 'block';
    display.textContent = `⏰ ${time}`;
}

// ============ ВЫБОР "ДРУГОЕ" ============

function onDeviceChange() {
    const val = document.getElementById('device').value;
    const wrap = document.getElementById('device_custom_wrap');
    wrap.style.display = (val === '__other__') ? 'block' : 'none';
}

function onBrandChange() {
    const val = document.getElementById('brand').value;
    const wrap = document.getElementById('brand_custom_wrap');
    wrap.style.display = (val === '__other__') ? 'block' : 'none';
}

// ============ ЛОКАЦИЯ ============

function sendLocation() {
    const status = document.getElementById('location_status');
    status.textContent = '⏳ Определяем локацию...';
    status.style.color = '#888';

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
                        getBrowserLocation();
                    }
                });
            });
            return;
        } catch (e) {
            console.error("LocationManager error:", e);
        }
    }
    getBrowserLocation();
}

function getBrowserLocation() {
    const status = document.getElementById('location_status');

    if (!navigator.geolocation) {
        status.textContent = '❌ Геолокация не поддерживается';
        status.style.color = '#e53935';
        showAlert('Геолокация не поддерживается');
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
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
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
    const when_date = orderData.when_date;
    const when_time = orderData.when_time;
    const house = document.getElementById('house').value.trim();
    const apartment = document.getElementById('apartment').value.trim();
    const comment = document.getElementById('comment').value.trim();

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
