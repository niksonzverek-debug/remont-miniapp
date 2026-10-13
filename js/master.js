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
                <option value="Посудомоечная машина">🍽️ Посудомоечная</option>
                <option value="Другое">📱 Другое</option>
            </select>

            <label>Бренд</label>
            <input id="brand" placeholder="LG, Samsung, Indesit..." autocomplete="off">

            <label>Модель (необязательно)</label>
            <input id="model" placeholder="Модель" autocomplete="off">
        </div>

        <div class="card">
            <label>Выполненные работы</label>
            <div class="checks">
                <label><input type="checkbox" value="Замена насоса"> Замена насоса</label>
                <label><input type="checkbox" value="Замена тэна"> Замена тэна</label>
                <label><input type="checkbox" value="Замена подшипников + профилактика"> Замена подшипников + профилактика</label>
                <label><input type="checkbox" value="Профилактика"> Профилактика</label>
                <label><input type="checkbox" value="Ремонт платы"> Ремонт платы</label>
            </div>

            <label>Другая работа (необязательно)</label>
            <input id="work_custom" placeholder="Например: чистка фильтра" autocomplete="off">
        </div>

        <div class="card">
            <label>Стоимость (сум)</label>
            <input id="price" type="number" inputmode="numeric" placeholder="500000">

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
            <label>Телефон клиента</label>
            <input id="client_phone" type="tel" inputmode="tel" placeholder="+998 90 123 45 67">

            <label>Адрес (необязательно)</label>
            <input id="address" placeholder="Улица, дом, квартира" autocomplete="off">
        </div>

        <button id="submit" onclick="submitAct()">📤 Отправить</button>
    `;

    const phoneInput = document.getElementById('client_phone');
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
    const device = document.getElementById('device').value;
    const brand = document.getElementById('brand').value.trim();
    const model = document.getElementById('model').value.trim() || '—';

    const works = [];
    document.querySelectorAll('.checks input[type=checkbox]:checked').forEach(cb => {
        works.push(cb.value);
    });
    const custom = document.getElementById('work_custom').value.trim();
    if (custom) works.push(custom);

    const priceRaw = document.getElementById('price').value;
    const price = parseInt(priceRaw);
    const guarantee = parseInt(document.getElementById('guarantee').value);
    const client_phone = document.getElementById('client_phone').value.trim();
    const address = document.getElementById('address').value.trim();

    if (!brand) return showAlert('Укажите бренд');
    if (works.length === 0) return showAlert('Выберите хотя бы одну работу');
    if (!price || price <= 0) return showAlert('Укажите корректную стоимость');
    if (!validPhone(client_phone)) return showAlert('Неверный номер телефона (998XXXXXXXXX)');

    const data = {
        event: 'create_act',
        device: device,
        brand: brand,
        model: model,
        works: works,
        price: price,
        guarantee_days: guarantee,
        client_phone: cleanPhone(client_phone),
        address: address,
    };

    console.log("Отправляем данные:", data);
    sendToBot(data);
}

// ============ СТАРТ ============

renderMasterMenu();
