// miniapp/js/master.js

// ============ ГЛАВНОЕ МЕНЮ МАСТЕРА ============

function renderMasterMenu() {
    document.body.innerHTML = `
        <h1>👨‍🔧 Панель мастера</h1>
        <p class="subtitle">Привет, ${tg.initDataUnsafe?.user?.first_name || 'мастер'}!</p>

        <button class="menu-btn" onclick="showCreateAct()">
            <span class="emoji">📝</span> Создать акт
        </button>
        <button class="menu-btn" onclick="sendEvent('get_stats')">
            <span class="emoji">📊</span> Моя статистика
        </button>
        <button class="menu-btn" onclick="showCreatePromoForm()">
            <span class="emoji">➕</span> Создать промокод
        </button>
        <button class="menu-btn" onclick="sendEvent('get_promos')">
            <span class="emoji">🎟️</span> Промокоды и статистика
        </button>
        <button class="menu-btn" onclick="sendEvent('get_clients')">
            <span class="emoji">👥</span> Клиенты
        </button>
    `;
}


// ============ СОЗДАНИЕ ПРОМОКОДА ЕДИНОЙ ФОРМОЙ ============
function showCreatePromoForm() {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    const expiryValue = `${expiry.getFullYear()}-${String(expiry.getMonth()+1).padStart(2,'0')}-${String(expiry.getDate()).padStart(2,'0')}`;
    document.body.innerHTML = `
        <button class="back-btn" onclick="renderMasterMenu()">← Назад</button>
        <h1>🎟️ Создать промокод</h1>
        <p class="subtitle">Заполните все данные на одной странице и отправьте форму.</p>
        <div class="card">
            <label>Код промокода *</label>
            <input id="promo_code" maxlength="20" placeholder="BLOGER10" autocapitalize="characters" autocomplete="off">
            <label>Имя партнёра *</label>
            <input id="promo_partner_name" maxlength="150" placeholder="Например, Блогер Ахмед" autocomplete="off">
            <label>Контакт партнёра *</label>
            <input id="promo_partner_contact" maxlength="150" placeholder="@username или телефон" autocomplete="off">
            <label>Номер карты для выплат *</label>
            <input id="promo_partner_card" inputmode="numeric" autocomplete="off" maxlength="23" placeholder="8600 1234 5678 9012">
            <p class="subtitle">Цифры автоматически группируются по 4. Номер карты должен содержать 16–19 цифр.</p>
        </div>
        <div class="card">
            <label>Скидка клиенту, % *</label>
            <input id="promo_discount" type="number" min="1" max="50" value="5" inputmode="numeric">
            <label>Вознаграждение партнёру, % *</label>
            <input id="promo_reward" type="number" min="0" max="30" value="5" inputmode="decimal">
            <label>Сколько раз один клиент может использовать скидку? *</label>
            <input id="promo_max_act" type="number" min="1" max="100" value="1" inputmode="numeric">
            <label>Действует до *</label>
            <input id="promo_expiry" type="date" value="${expiryValue}">
        </div>
        <button id="promo_submit" onclick="submitCreatePromo()">✅ Создать промокод</button>
        <p class="subtitle" id="promo_form_status" role="status"></p>
    `;
    const code = document.getElementById('promo_code');
    code.addEventListener('input', () => { code.value = code.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0,20); });
    const card = document.getElementById('promo_partner_card');
    card.addEventListener('input', () => {
        const digits = card.value.replace(/\D/g, '').slice(0,19);
        card.value = digits.match(/.{1,4}/g)?.join(' ') || '';
    });
}

function submitCreatePromo() {
    const get = id => document.getElementById(id).value.trim();
    const code = get('promo_code').toUpperCase();
    const partner_name = get('promo_partner_name');
    const partner_contact = get('promo_partner_contact');
    const partner_card = get('promo_partner_card').replace(/\D/g, '');
    const discount_percent = Number(get('promo_discount'));
    const reward_percent = Number(get('promo_reward'));
    const max_act = Number(get('promo_max_act'));
    const expiry_date = get('promo_expiry');
    if (!/^[A-Z0-9_-]{4,20}$/.test(code)) return showAlert('Код: 4–20 символов A-Z, 0-9, _ или -.');
    if (partner_name.length < 2) return showAlert('Укажите имя партнёра.');
    if (!partner_contact) return showAlert('Укажите контакт партнёра.');
    if (partner_card.length < 16 || partner_card.length > 19) return showAlert('Номер карты должен содержать 16–19 цифр.');
    if (!(discount_percent >= 1 && discount_percent <= 50)) return showAlert('Скидка должна быть от 1 до 50%.');
    if (!(reward_percent >= 0 && reward_percent <= 30)) return showAlert('Вознаграждение должно быть от 0 до 30%.');
    if (!(Number.isInteger(max_act) && max_act >= 1 && max_act <= 100)) return showAlert('Лимит должен быть от 1 до 100.');
    if (!expiry_date || expiry_date < new Date().toISOString().slice(0,10)) return showAlert('Выберите сегодняшнюю или будущую дату окончания.');
    const btn = document.getElementById('promo_submit');
    btn.disabled = true;
    btn.textContent = '⏳ Отправляем…';
    const ok = sendEvent('create_promo_form', {
        code, partner_name, partner_contact, partner_card,
        discount_percent, reward_percent, max_act,
        expires_at: `${expiry_date}T23:59:59`
    });
    if (!ok) { btn.disabled = false; btn.textContent = '✅ Создать промокод'; }
}

// ============ СОЗДАНИЕ АКТА ============

function showCreateAct() {
    document.body.innerHTML = `
        <button class="back-btn" onclick="renderMasterMenu()">← Назад</button>
        <h1>📝 Новый акт</h1>
        <p class="subtitle">Заполните данные и отправьте</p>

        <div class="card">
            <label>Вид техники</label>
            <select id="device">
                <option value="Стиральная машина">🧺 Стиральная машина</option>
                <option value="Холодильник">❄️ Холодильник</option>
                <option value="Кондиционер">🌬️ Кондиционер</option>
                <option value="Микроволновая печь">Микроволновая печь</option>
                <option value="Пылесос">Пылесос</option>
                <option value="Другое">Другое</option>
            </select>
            <input id="device_custom" placeholder="Введите вид техники" autocomplete="off" style="display:none">

            <label>Бренд</label>
            <select id="brand">
                <option value="LG">LG</option><option value="Samsung">Samsung</option>
                <option value="Indesit">Indesit</option><option value="Bosch">Bosch</option>
                <option value="Атлан">Атлан</option><option value="Другое">Другое</option>
            </select>
            <input id="brand_custom" placeholder="Введите бренд" autocomplete="off" style="display:none">

            <label>Модель (необязательно)</label>
            <input id="model" placeholder="Модель" autocomplete="off">
        </div>

        <div class="card">
            <label>Выполненные работы</label>
            <div class="checks" id="work_options"></div>

            <label>Другая работа (необязательно)</label>
            <input id="work_custom" placeholder="Например: чистка фильтра" autocomplete="off">
        </div>

        <div class="card">
            <label>Стоимость (сум)</label>
            <input id="price" type="text" inputmode="numeric" placeholder="500 000">

            <label>На что распространяется гарантия?</label>
            <textarea id="guarantee_scope" placeholder="Например: замена насоса и работы по его установке" maxlength="500"></textarea>
            <label>Исключения / ограничения гарантии</label>
            <textarea id="guarantee_exclusions" placeholder="Например: другие узлы, внешние повреждения, вмешательство третьих лиц" maxlength="500"></textarea>

            <label>Срок гарантии</label>
            <select id="guarantee">
                <option value="7">7 дней</option>
                <option value="30" selected>1 месяц</option>
                <option value="90">3 месяца</option>
                <option value="180">6 месяцев</option>
                <option value="0">Без гарантии</option>
            </select>
        </div>

        <div class="card">
            <label>ФИО клиента (если известно)</label>
            <input id="client_name" placeholder="ФИО клиента" autocomplete="name">
            <label>Телефон клиента</label>
            <input id="client_phone" type="tel" inputmode="tel" placeholder="+998 90 123 45 67">
            <p class="subtitle" id="clientRegistrationNo">Введите телефон — локальный регистрационный номер будет создан автоматически.</p>

            <label>Дом / улица</label>
            <input id="house" placeholder="Улица, дом" autocomplete="street-address">
            <label>Квартира</label>
            <input id="apartment" placeholder="Номер квартиры" inputmode="text">
            <button type="button" class="secondary" id="get_location" onclick="getActLocation()">📍 Получить текущую локацию</button>
            <p id="location_status" class="subtitle">Локация не добавлена (можно отправить без координат)</p>
        </div>

        <button id="submit" onclick="submitAct()">📤 Отправить</button>
    `;

    const workByDevice = {
        'Стиральная машина': ['Замена насоса','Замена тэна','Замена подшипников + профилактика','Профилактика','Ремонт платы'],
        'Холодильник': ['Замена датчиков','Замена компрессора','Заправка фреоном','Замена тэна','Замена реле'],
        'Кондиционер': ['Профилактика','Заправка фреоном','Замена компрессора','Замена конденсатора','Устранение утечки'],
        'Микроволновая печь': ['Замена магнетрона СВЧ','Замена трансформатора','Замена конденсатора','Ремонт платы','Замена предохранителя'],
        'Пылесос': ['Профилактика','Замена двигателя','Замена шланга','Ремонт платы']
    };
    const deviceSelect = document.getElementById('device');
    const brandSelect = document.getElementById('brand');
    const brandCustom = document.getElementById('brand_custom');
    const deviceCustom = document.getElementById('device_custom');
    deviceSelect.addEventListener('change', () => { deviceCustom.style.display = deviceSelect.value === 'Другое' ? 'block' : 'none'; });
    function renderWorks() {
        const host = document.getElementById('work_options');
        const options = workByDevice[deviceSelect.value] || [];
        host.innerHTML = options.map((w,i)=>`<label><input type="checkbox" value="${w.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"> ${i+1}. ${w}</label>`).join('');
    }
    deviceSelect.addEventListener('change', renderWorks);
    brandSelect.addEventListener('change', () => { brandCustom.style.display = brandSelect.value === 'Другое' ? 'block' : 'none'; });
    renderWorks();
    document.getElementById('price').addEventListener('input', e => {
        const digits = e.target.value.replace(/\D/g, '');
        e.target.value = digits ? new Intl.NumberFormat('ru-RU').format(Number(digits)).replace(/\u00a0/g, ' ') : '';
    });
    window._actLocation = null;
    window.getActLocation = function() {
        const status = document.getElementById('location_status');
        if (!navigator.geolocation) { status.textContent = 'Геолокация недоступна в этом браузере.'; return; }
        status.textContent = 'Получаем координаты…';
        navigator.geolocation.getCurrentPosition(pos => {
            window._actLocation = {lat: pos.coords.latitude, lon: pos.coords.longitude};
            status.textContent = `Локация добавлена: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
        }, () => { status.textContent = 'Не удалось получить локацию. Разрешите доступ к геопозиции или отправьте без неё.'; }, {enableHighAccuracy:true, timeout:10000});
    };

    const phoneInput = document.getElementById('client_phone');
    const regNoEl = document.getElementById('clientRegistrationNo');
    const updateClientRegNo = () => { const digits=phoneInput.value.replace(/\D/g,''); if(regNoEl) regNoEl.textContent=digits.length>=9 ? ('Локальный номер синхронизации: '+getClientRegistrationNo(digits, false)) : 'Введите телефон — локальный регистрационный номер будет создан автоматически.'; };
    phoneInput.addEventListener('input', (e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
        if (digits.length > 0) {
            let formatted = '+';
            if (digits.startsWith('998')) {
                formatted += digits.slice(0, 3);
                if (digits.length > 3) formatted += ' ' + digits.slice(3, 5);
                if (digits.length > 5) formatted += ' ' + digits.slice(5, 8);
                if (digits.length > 8) formatted += ' ' + digits.slice(8, 10);
                if (digits.length > 10) formatted += ' ' + digits.slice(10, 12);
            } else {
                formatted += digits;
            }
            e.target.value = formatted;
        }
    });
}

function submitAct() {
    const deviceChoice = document.getElementById('device').value;
    const device = deviceChoice === 'Другое' ? document.getElementById('device_custom').value.trim() : deviceChoice;
    const brandChoice = document.getElementById('brand').value;
    const brand = brandChoice === 'Другое' ? document.getElementById('brand_custom').value.trim() : brandChoice;
    const model = document.getElementById('model').value.trim() || '—';

    const works = [];
    document.querySelectorAll('.checks input[type=checkbox]:checked').forEach(cb => {
        works.push(cb.value);
    });
    const custom = document.getElementById('work_custom').value.trim();
    if (custom) works.push(custom);

    const priceRaw = document.getElementById('price').value;
    const price = parseInt((priceRaw || '').replace(/\D/g, ''), 10);
    const guarantee = parseInt(document.getElementById('guarantee').value);
    const client_phone = document.getElementById('client_phone').value.trim();
    const house = document.getElementById('house').value.trim();
    const apartment = document.getElementById('apartment').value.trim();
    const address = [house, apartment ? 'кв. ' + apartment : ''].filter(Boolean).join(', ');
    const client_name = document.getElementById('client_name').value.trim();
    const guarantee_scope = document.getElementById('guarantee_scope').value.trim();
    const guarantee_exclusions = document.getElementById('guarantee_exclusions').value.trim();

    if (!device) return showAlert('Укажите вид техники');
    if (!brand) return showAlert('Укажите бренд');
    if (!house) return showAlert('Укажите улицу и номер дома');
    if (works.length === 0) return showAlert('Выберите хотя бы одну работу');
    if (!price || price <= 0) return showAlert('Укажите корректную стоимость');
    if (!validPhone(client_phone)) return showAlert('Неверный номер телефона (998XXXXXXXXX)');

    const data = {
        event: 'offline_create_act',
        order_id: new URLSearchParams(location.search).get('order_id') || null,
        client_name: client_name,
        client_registration_id: getClientRegistrationId(client_phone, false),
        client_registration_no: getClientRegistrationNo(client_phone, false),
        local_registration_id: getLocalRegistrationId(),
        device: device,
        brand: brand,
        model: model,
        works: works,
        price: price,
        guarantee_days: guarantee,
        guarantee_scope: guarantee_scope,
        guarantee_exclusions: guarantee_exclusions,
        client_phone: cleanPhone(client_phone),
        address: address,
        house: house,
        apartment: apartment,
        location: window._actLocation,
    };

    console.log("Отправляем данные:", data);
    sendToBot(data);
}

// ============ СТАРТ ============
const masterScreen = new URLSearchParams(location.search).get('screen');
if (masterScreen === 'promo_create') showCreatePromoForm();
else renderMasterMenu();