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
        <button class="menu-btn" onclick="sendEvent('get_promos')">
            <span class="emoji">🎟️</span> Промокоды
        </button>
        <button class="menu-btn" onclick="sendEvent('get_clients')">
            <span class="emoji">👥</span> Клиенты
        </button>
    `;
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

renderMasterMenu();