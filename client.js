
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

// Отдельный сценарий для новых клиентов, пришедших через /start.
const isNewClientFlow =
    new URLSearchParams(location.search).get("new_client") === "1";

// ============ ГЛАВНОЕ МЕНЮ КЛИЕНТА ==========

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

// ============ ОТДЕЛЬНЫЙ ЭКРАН РЕГИСТРАЦИИ ============

function showRegistrationScreen() {
    document.body.innerHTML = `
        <h1>📝 Регистрация клиента</h1>
        <p class="subtitle">Укажите имя и номер телефона</p>

        <div class="card" id="registrationForm">
            <label for="client_name">Ваше имя / ФИО *</label>
            <input
                id="client_name"
                placeholder="Как к вам обращаться"
                autocomplete="name"
            >

            <label for="client_phone">Номер телефона *</label>
            <input
                id="client_phone"
                type="tel"
                inputmode="tel"
                placeholder="+998 90 123 45 67"
                autocomplete="tel"
            >

            <button
                type="button"
                class="secondary"
                id="registrationSubmit"
                onclick="submitRegistration()"
            >
                💾 Зарегистрироваться
            </button>

            <p class="subtitle" id="registrationStatus">
                Проверьте имя и номер перед отправкой.
            </p>
        </div>
    `;

    const phoneInput = document.getElementById('client_phone');

    phoneInput.addEventListener('input', event => {
        const digits = event.target.value
            .replace(/\D/g, '')
            .slice(0, 12);

        event.target.value = digits.startsWith('998')
            ? '+998' +
              (digits.length > 3 ? ' ' + digits.slice(3, 5) : '') +
              (digits.length > 5 ? ' ' + digits.slice(5, 8) : '') +
              (digits.length > 8 ? ' ' + digits.slice(8, 10) : '') +
              (digits.length > 10 ? ' ' + digits.slice(10) : '')
            : (digits ? '+' + digits : '');
    });
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
            <input id="client_name" placeholder="Как к вам обращаться" autocomplete="name">

            <label>Номер телефона *</label>
            <input
                id="client_phone"
                type="tel"
                inputmode="tel"
                placeholder="+998 90 123 45 67"
                autocomplete="tel"
            >

            <p class="subtitle" id="clientRegistrationNo">
                Регистрационный номер будет показан после ввода телефона.
            </p>

            <p class="subtitle">
                Если вы ещё не зарегистрированы, сохраните данные перед созданием заявки.
            </p>

            <button type="button" class="secondary" onclick="submitRegistration()">
                💾 Сохранить регистрацию
            </button>
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
            <input id="house" placeholder="Например: 15А" autocomplete="off">

            <label>Квартира (необязательно)</label>
            <input id="apartment" placeholder="Например: 42" autocomplete="off">

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

        <button id="submit" onclick="submitOrder()">📤 Отправить заявку</button>
    `;

    try {
        document.getElementById('house').value =
            localStorage.getItem('remont_bt_house') || '';

        document.getElementById('apartment').value =
            localStorage.getItem('remont_bt_apartment') || '';

        const savedName = isNewClientFlow
            ? ''
            : (localStorage.getItem('remont_bt_name') ||
               (tg.initDataUnsafe?.user?.first_name || ''));

        const savedPhone = isNewClientFlow
            ? ''
            : (localStorage.getItem('remont_bt_phone') || '');

        document.getElementById('client_name').value = savedName;
        document.getElementById('client_phone').value = savedPhone;

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

        if (!isNewClientFlow) {
            updateClientRegNo();
        }

        document.getElementById('client_phone').addEventListener('input', e => {
            const d = e.target.value.replace(/\D/g, '').slice(0, 12);

            e.target.value = d.startsWith('998')
                ? '+998' +
                  (d.length > 3 ? ' ' + d.slice(3, 5) : '') +
                  (d.length > 5 ? ' ' + d.slice(5, 8) : '') +
                  (d.length > 8 ? ' ' + d.slice(8, 10) : '') +
                  (d.length > 10 ? ' ' + d.slice(10) : '')
                : (d ? '+' + d : '');

            if (!isNewClientFlow) {
                updateClientRegNo();
            }
        });

        document.getElementById('clientIdentityCard')
            .style.setProperty('display', 'block', 'important');

    } catch (e) {
        console.error('Ошибка инициализации формы клиента:', e);
    }
}

// ============ РЕГИСТРАЦИЯ КЛИЕНТА ============

function submitRegistration() {
    const nameEl = document.getElementById('client_name');
    const phoneEl = document.getElementById('client_phone');

    const name = (nameEl ? nameEl.value : '').trim();
    const phone = cleanPhone(phoneEl ? phoneEl.value : '');

    if (name.length < 2) {
        return showAlert('Введите имя клиента');
    }

    if (!validPhone(phone)) {
        return showAlert('Введите корректный номер +998XXXXXXXXX');
    }

    try {
        localStorage.setItem('remont_bt_name', name);
        localStorage.setItem('remont_bt_phone', phone);
    } catch (_) {}

    sendEvent('register_client', {
        client_name: name,
        client_phone: phone,
        client_registration_id: getClientRegistrationId(phone),
        client_registration_no: getClientRegistrationNo(phone)
    });

    const status = document.getElementById('registrationStatus');
    if (status) {
        status.textContent = '✅ Данные отправлены боту. Дождитесь подтверждения в Telegram.';
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

        if (!device) {
            return showAlert('Укажите вид техники');
        }
    }

    if (brand === '__other__') {
        brand = document.getElementById('brand_custom').value.trim();

        if (!brand) {
            return showAlert('Укажите бренд');
        }
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

    if (client_name.length < 2) {
        return showAlert('Введите имя клиента');
    }

    if (!validPhone(client_phone)) {
        return showAlert('Введите корректный номер телефона +998XXXXXXXXX');
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
        localStorage.setItem('remont_bt_phone', client_phone);
    } catch (e) {
        console.warn('Не удалось сохранить данные локально:', e);
    }

    const data = {
        event: 'new_order',
        client_name,
        client_phone,
        client_registration_id: getClientRegistrationId(
            client_phone,
            !isNewClientFlow
        ),
        client_registration_no: getClientRegistrationNo(
            client_phone,
            !isNewClientFlow
        ),
        device,
        brand,
        model: model || '—',
        problem,
        when_date,
        when_time,
        house,
        apartment,
        comment,
        location: orderData.location || null,
    };

    console.log('Отправляем заявку:', data);

    const btn = document.getElementById('submit');
    btn.textContent = '⏳ Отправка...';
    btn.disabled = true;

    const ok = sendToBot(data);

    if (!ok) {
        btn.textContent = '📤 Отправить заявку';
        btn.disabled = false;
    }
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
            <input
                id="promo_code"
                placeholder="BLOGER10"
                autocapitalize="characters"
                style="text-transform:uppercase;font-size:20px;text-align:center;letter-spacing:2px;"
            >
        </div>

        <button id="submit" onclick="submitPromo()">✅ Активировать</button>
    `;

    document.getElementById('promo_code').focus();
}

function submitPromo() {
    const code = document.getElementById('promo_code').value.trim().toUpperCase();

    if (!code || code.length < 4) {
        return showAlert('Введите промокод');
    }

    sendToBot({
        event: 'enter_promo',
        code
    });
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

if (isNewClientFlow) {
    showRegistrationScreen();
} else {
    showNewOrder();
}
