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

// ============ КРАСИВЫЙ PICKER ============

function openWheelPicker(title, items, selectedIndex, onSelect) {
    // Удаляем старый пикер, если был
    const old = document.getElementById('custom_picker');
    if (old) old.remove();

    const ITEM_HEIGHT = 44;
    const VISIBLE = 5;
    const CENTER_IDX = Math.floor(VISIBLE / 2);

    // Создаём модальное окно
    const modal = document.createElement('div');
    modal.id = 'custom_picker';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); z-index: 9999;
        display: flex; align-items: flex-end; justify-content: center;
        animation: fadeIn 0.2s ease;
    `;

    modal.innerHTML = `
        <style>
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            .cp-content {
                background: white; border-radius: 16px 16px 0 0;
                width: 100%; max-width: 500px;
                padding: 20px 0;
                animation: slideUp 0.25s ease;
                user-select: none;
                -webkit-user-select: none;
            }
            .cp-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 0 20px 16px; border-bottom: 1px solid #eee;
            }
            .cp-title {
                font-size: 17px; font-weight: 600; color: #222; flex: 1; text-align: center;
            }
            .cp-btn {
                background: none; border: none; font-size: 16px; cursor: pointer;
                padding: 8px; color: #2481cc; font-weight: 500;
            }
            .cp-btn.cancel { color: #888; }
            .cp-btn.choose { color: #2481cc; font-weight: 600; }
            .cp-wheel-wrap {
                position: relative; height: ${ITEM_HEIGHT * VISIBLE}px; margin-top: 10px;
                overflow: hidden;
                -webkit-mask-image: linear-gradient(to bottom, transparent, black 25%, black 75%, transparent);
                mask-image: linear-gradient(to bottom, transparent, black 25%, black 75%, transparent);
            }
            .cp-wheel {
                list-style: none; padding: 0; margin: 0;
                transition: transform 0.25s cubic-bezier(0.25, 1, 0.5, 1);
            }
            .cp-wheel li {
                height: ${ITEM_HEIGHT}px; line-height: ${ITEM_HEIGHT}px;
                text-align: center; font-size: 20px; color: #999;
                transition: color 0.2s, font-weight 0.2s, transform 0.2s;
            }
            .cp-wheel li.active {
                color: #222; font-weight: 600; transform: scale(1.1);
            }
            .cp-highlight {
                position: absolute; top: ${ITEM_HEIGHT * CENTER_IDX}px; left: 20px; right: 20px;
                height: ${ITEM_HEIGHT}px; pointer-events: none;
                border-top: 2px solid #2481cc; border-bottom: 2px solid #2481cc;
                background: rgba(36, 129, 204, 0.05);
            }
        </style>
        <div class="cp-content">
            <div class="cp-header">
                <button class="cp-btn cancel" onclick="closePicker()">Отмена</button>
                <div class="cp-title">${title}</div>
                <button class="cp-btn choose" onclick="choosePicker()">Выбрать</button>
            </div>
            <div class="cp-wheel-wrap">
                <div class="cp-highlight"></div>
                <ul class="cp-wheel" id="cp_wheel">
                    ${items.map((it, i) => `<li data-idx="${i}">${it}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Смещение: показываем выбранное в центре
    const wheel = document.getElementById('cp_wheel');
    let currentIndex = selectedIndex || 0;
    let startY = 0;
    let startTransform = -currentIndex * ITEM_HEIGHT;
    let currentTransform = startTransform;

    function updateTransform(animate = true) {
        wheel.style.transition = animate ? 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)' : 'none';
        wheel.style.transform = `translateY(${currentTransform + CENTER_IDX * ITEM_HEIGHT}px)`;
        updateActive();
    }

    function updateActive() {
        const items = wheel.querySelectorAll('li');
        items.forEach((li, i) => {
            li.classList.toggle('active', i === currentIndex);
        });
    }

    function snapToNearest() {
        const offset = currentTransform + CENTER_IDX * ITEM_HEIGHT;
        currentIndex = Math.round(-currentTransform / ITEM_HEIGHT);
        currentIndex = Math.max(0, Math.min(items.length - 1, currentIndex));
        currentTransform = -currentIndex * ITEM_HEIGHT;
        updateTransform(true);
    }

    updateTransform(false);

    // ====== Жесты ======
    let isDragging = false;
    let startTouchY = 0;
    let startMoveY = 0;

    function onStart(y) {
        isDragging = true;
        startTouchY = y;
        startMoveY = currentTransform;
        wheel.style.transition = 'none';
    }

    function onMove(y) {
        if (!isDragging) return;
        const delta = y - startTouchY;
        currentTransform = startMoveY + delta;

        // Ограничение
        const max = CENTER_IDX * ITEM_HEIGHT;
        const min = -(items.length - 1 - CENTER_IDX) * ITEM_HEIGHT;
        if (currentTransform > max) currentTransform = max + (currentTransform - max) * 0.3;
        if (currentTransform < min) currentTransform = min + (currentTransform - min) * 0.3;

        wheel.style.transition = 'none';
        wheel.style.transform = `translateY(${currentTransform + CENTER_IDX * ITEM_HEIGHT}px)`;
    }

    function onEnd() {
        if (!isDragging) return;
        isDragging = false;
        snapToNearest();
    }

    // Touch
    wheel.parentElement.addEventListener('touchstart', (e) => onStart(e.touches[0].clientY), { passive: true });
    wheel.parentElement.addEventListener('touchmove', (e) => { e.preventDefault(); onMove(e.touches[0].clientY); }, { passive: false });
    wheel.parentElement.addEventListener('touchend', onEnd);

    // Mouse
    wheel.parentElement.addEventListener('mousedown', (e) => { e.preventDefault(); onStart(e.clientY); });
    document.addEventListener('mousemove', (e) => onMove(e.clientY));
    document.addEventListener('mouseup', onEnd);

    // Клик по элементу
    wheel.querySelectorAll('li').forEach((li) => {
        li.addEventListener('click', (e) => {
            const idx = parseInt(li.dataset.idx);
            currentIndex = idx;
            currentTransform = -idx * ITEM_HEIGHT;
            updateTransform(true);
        });
    });

    // Сохраняем в глобальных переменных для кнопки "Выбрать"
    window._pickerSelect = () => {
        onSelect(currentIndex);
        closePicker();
    };
}

function closePicker() {
    const el = document.getElementById('custom_picker');
    if (el) el.remove();
}

function choosePicker() {
    if (window._pickerSelect) window._pickerSelect();
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

    // Время: 09:00 – 21:00 с шагом 30 мин
    const timeItems = [];
    for (let h = 9; h <= 21; h++) {
        timeItems.push(`${String(h).padStart(2, '0')}:00`);
        if (h < 21) timeItems.push(`${String(h).padStart(2, '0')}:30`);
    }

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

            <button type="button" onclick="openDateWheel()" id="btn_date" class="picker-btn">
                📅 Выберите дату
            </button>

            <label style="margin-top:14px;">Время</label>
            <button type="button" onclick="openTimeWheel()" id="btn_time" class="picker-btn">
                ⏰ Выберите время
            </button>
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
            .picker-btn {
                width:100%;padding:14px;font-size:16px;
                background:white;border:2px solid #ddd;border-radius:10px;
                cursor:pointer;text-align:left;color:#666;margin-top:8px;
            }
            .picker-btn.selected {
                color:#2481cc;border-color:#2481cc;font-weight:600;
            }
        </style>
    `;
}

// ============ ОТКРЫТИЕ ПИКЕРОВ ============

function openDateWheel() {
    const currentIdx = orderData.when_date
        ? window._dateValues.indexOf(orderData.when_date)
        : 0;

    openWheelPicker('Выберите дату', window._dateItems, currentIdx >= 0 ? currentIdx : 0, (idx) => {
        orderData.when_date = window._dateValues[idx];
        const btn = document.getElementById('btn_date');
        btn.textContent = `📅 ${window._dateItems[idx]}`;
        btn.classList.add('selected');
    });
}

function openTimeWheel() {
    const currentIdx = orderData.when_time
        ? window._timeItems.indexOf(orderData.when_time)
        : 0;

    openWheelPicker('Выберите время', window._timeItems, currentIdx >= 0 ? currentIdx : 0, (idx) => {
        orderData.when_time = window._timeItems[idx];
        const btn = document.getElementById('btn_time');
        btn.textContent = `⏰ ${window._timeItems[idx]}`;
        btn.classList.add('selected');
    });
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
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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
    if (!problem || problem.length < 5) return showAlert('Опишите проблему');
    if (!when_date) return showAlert('Выберите дату');
    if (!when_time) return showAlert('Выберите время');
    if (!house) return showAlert('Укажите дом');

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
        <div class="empty">Список актов придёт в чат бота 📩</div>
    `;
}

// ============ ВВОД ПРОМОКОДА ============

function showEnterPromo() {
    document.body.innerHTML = `
        <button class="back-btn" onclick="renderClientMenu()">← Назад</button>
        <h1>🎟️ Ввести промокод</h1>
        <div class="card">
            <label>Промокод</label>
            <input id="promo_code" placeholder="BLOGER10" autocapitalize="characters"
                   style="text-transform:uppercase;font-size:20px;text-align:center;letter-spacing:2px;">
        </div>
        <button id="submit" onclick="submitPromo()">✅ Активировать</button>
    `;
    document.getElementById('promo_code').focus();
}

function submitPromo() {
    const code = document.getElementById('promo_code').value.trim().toUpperCase();
    if (!code || code.length < 4) return showAlert('Введите промокод');
    sendToBot({ event: 'enter_promo', code: code });
}

// ============ ПРОФИЛЬ ============

function showProfile() {
    sendEvent('get_profile');
    document.body.innerHTML = `
        <button class="back-btn" onclick="renderClientMenu()">← Назад</button>
        <h1>👤 Мой профиль</h1>
        <div class="empty">Профиль придёт в чат бота 📩</div>
    `;
}

// ============ ПОЗВОНИТЬ ============

function showCallMaster() {
    sendEvent('get_master_phone');
    document.body.innerHTML = `
        <button class="back-btn" onclick="renderClientMenu()">← Назад</button>
        <h1>📞 Позвонить мастеру</h1>
        <div class="empty">Номер мастера придёт в чат бота 📩</div>
    `;
}

// ============ СТАРТ ============

renderClientMenu();
