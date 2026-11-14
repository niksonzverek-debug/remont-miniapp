
// Territories for manual map correction; independent of registered masters.
const btMapTerritories={"Ташкент (город)":["Бектемирский район","Мирабадский район","Мирзо-Улугбекский район","Сергелийский район","Алмазарский район","Учтепинский район","Чиланзарский район","Шайхантахурский район","Юнусабадский район","Яккасарайский район","Яшнабадский район","Янгихаётский район"],"Ташкентская область":["Аккурганский район","Ахангаранский район","Бекабадский район","Бостанлыкский район","Букинский район","Зангиатинский район","Кибрайский район","Куйичирчикский район","Паркентский район","Пскентский район","Ташкентский район","Уртачирчикский район","Чиназский район","Юкоричирчикский район","Янгиюльский район","город Ангрен","город Бекабад","город Алмалык","город Чирчик","город Янгиюль"],"Андижанская область":["Алтынкульский район","Андижанский район","Асакинский район","Балыкчинский район","Булакбашинский район","Бозский район","Джалакудукский район","Избасканский район","Кургантепинский район","Мархаматский район","Пахтаабадский район","Улугнорский район","Ходжаабадский район","Шахриханский район","город Андижан","город Ханабад"],"Бухарская область":["Алатский район","Бухарский район","Вабкентский район","Гиждуванский район","Джандарский район","Каганский район","Каракульский район","Караулбазарский район","Пешкунский район","Ромитанский район","Шафирканский район","город Бухара","город Каган"],"Джизакская область":["Арнасайский район","Бахмальский район","Галляаральский район","Дустликский район","Зааминский район","Зарбдарский район","Зафарабадский район","Мирзачульский район","Пахтакорский район","Фаришский район","Шараф-Рашидовский район","Янгиабадский район","город Джизак"],"Кашкадарьинская область":["Гузарский район","Дехканабадский район","Камашинский район","Каршинский район","Касанский район","Касбийский район","Китабский район","Миришкорский район","Мубарекский район","Нишанский район","Чиракчинский район","Шахрисабзский район","Яккабагский район","город Карши","город Шахрисабз"],"Навоийская область":["Канимехский район","Карманинский район","Кызылтепинский район","Навбахорский район","Нуратинский район","Тамдынский район","Учкудукский район","Хатырчинский район","город Навои","город Зарафшан"],"Наманганская область":["Касансайский район","Мингбулакский район","Наманганский район","Нарынский район","Папский район","Туракурганский район","Уйчинский район","Учкурганский район","Чартакский район","Чустский район","Янгикурганский район","город Наманган"],"Самаркандская область":["Акдарьинский район","Булунгурский район","Джамбайский район","Иштыханский район","Каттакурганский район","Кошрабатский район","Нарпайский район","Нурабадский район","Пайарыкский район","Пастдаргомский район","Пахтачинский район","Самаркандский район","Тайлакский район","Ургутский район","город Самарканд","город Каттакурган"],"Сурхандарьинская область":["Алтынсайский район","Ангорский район","Байсунский район","Бандиханский район","Денауский район","Джаркурганский район","Кизирикский район","Кумкурганский район","Музрабадский район","Сариасийский район","Термезский район","Узунский район","Шерабадский район","Шурчинский район","город Термез"],"Сырдарьинская область":["Акалтынский район","Баяутский район","Гулистанский район","Мирзаабадский район","Сайхунабадский район","Сардобинский район","Сырдарьинский район","Хавастский район","город Гулистан","город Ширин","город Янгиер"],"Ферганская область":["Алтыарыкский район","Багдадский район","Бешарыкский район","Бувайдинский район","Дангаринский район","Кувинский район","Риштанский район","Сохский район","Ташлакский район","Узбекистанский район","Учкуприкский район","Ферганский район","Фуркатский район","Язъяванский район","город Фергана","город Коканд","город Маргилан","город Кува"],"Хорезмская область":["Багатский район","Гурленский район","Кошкупырский район","Ургенчский район","Хазараспский район","Ханкинский район","Хивинский район","Шаватский район","Янгиарыкский район","Янгибазарский район","Тупраккалинский район","город Ургенч","город Хива"],"Республика Каракалпакстан":["Амударьинский район","Берунийский район","Бозатауский район","Канлыкульский район","Караузякский район","Кегейлийский район","Кунградский район","Муйнакский район","Нукусский район","Тахиаташский район","Тахтакупырский район","Турткульский район","Ходжейлийский район","Чимбайский район","Шуманайский район","Элликкалинский район","город Нукус"]};

/* Versioned legal terms acknowledgement. Server is the authority. */
let btLegalApproved = false;
let btLegalChecking = false;
async function btLegalGate(api, onSuccess, role){
  if(btLegalApproved){onSuccess();return;}
  if(btLegalChecking)return;
  btLegalChecking=true;
  try{
    const status=await api('/api/legal/status');
    if(status.accepted){btLegalApproved=true;onSuccess();return;}
    btLegalDialog(api,onSuccess,role,status.version);
  }catch(e){
    alert('Не удалось проверить условия использования. Проверьте подключение и повторите попытку. '+(e.message||''));
  }finally{btLegalChecking=false;}
}
function btLegalDialog(api,onSuccess,role,version){
  document.getElementById('btLegalOverlay')?.remove();
  const uz=String(document.documentElement.lang||localStorage.getItem('remont_bt_lang')||localStorage.getItem('remont_lang')||'ru').toLowerCase().startsWith('uz');
  const div=document.createElement('div');div.id='btLegalOverlay';div.className='bt-legal-overlay';
  div.innerHTML=`<section class="bt-legal-dialog" role="dialog" aria-modal="true" aria-label="${uz?'Foydalanish shartlari':'Условия использования'}">
   <img class="bt-legal-logo" src="img/remont-bt-icon.png" alt="ТехСервис">
   <div class="bt-legal-shield">🛡️</div><h2>${uz?'TehServis foydalanish shartlari':'Условия использования ТехСервис'}</h2>
   <p>${uz?'TehServis mijozlar va mustaqil ustalar uchun raqamli vositalarni taqdim etadi.':'ТехСервис предоставляет цифровые инструменты клиентам и независимым мастерам.'}</p>
   <div class="bt-legal-facts"><p>🔧 ${uz?'Usta ta’mirlash sifati, kafolat, to‘lov va o‘z soliqlari uchun javob beradi.':'Мастер самостоятельно отвечает за качество ремонта, гарантии, расчёты и свои налоги.'}</p>
   <p>💠 ${uz?'Platforma operatori o‘z xizmatlari va qonuniy majburiyatlari uchun javobgar.':'Оператор отвечает за работу платформы и собственные обязательства по закону.'}</p>
   <p>🔒 ${uz?'Ma’lumotlar maxfiylik siyosatiga muvofiq qayta ishlanadi.':'Данные обрабатываются согласно политике конфиденциальности.'}</p></div>
   <a class="bt-legal-read" href="legal.html" target="_blank" rel="noopener">📄 ${uz?'To‘liq shartlar va maxfiylik siyosatini o‘qish':'Прочитать полные условия и политику данных'} ↗</a>
   <p class="bt-legal-version">${uz?'Tahrir':'Редакция'}: ${version}</p>
   <button class="bt-legal-accept" type="button">${uz?'Tanishdim va roziman':'Ознакомлен и согласен'}</button>
   <button class="bt-legal-later" type="button">${uz?'Hozir emas':'Не согласен / Назад'}</button>
   <p class="bt-legal-error" role="status"></p>
   </section>`;
  document.body.appendChild(div);
  div.querySelector('.bt-legal-later').onclick=()=>div.remove();
  div.querySelector('.bt-legal-accept').onclick=async()=>{
    const button=div.querySelector('.bt-legal-accept'),error=div.querySelector('.bt-legal-error');
    button.disabled=true;error.textContent='';
    try{await api('/api/legal/accept','POST',{version,accepted:true});btLegalApproved=true;div.remove();onSuccess();}
    catch(e){error.textContent=e.message||'Не удалось сохранить согласие';button.disabled=false;}
  };
}

// miniapp/js/client.js

// ============ СОСТОЯНИЕ ============
let btOrderOperationId = null;
let btHomeTimer = null;
let btClientPromoTimer = null;
let btClientHomeGeneration = 0;
function btStopClientPromoCarousel(){
    if(btClientPromoTimer){clearInterval(btClientPromoTimer);btClientPromoTimer=null;}
}
function btStartClientPromoCarousel(generation){
    const banner=document.getElementById('btClientPromoBanner');
    if(!banner)return;
    // Promo-code entry is always available; referral is advertised only when enabled.
    const slides=[{icon:'🎁',title:'У вас есть промокод?',detail:'Получите скидку на ремонт',open:showEnterPromo}];
    let current=0;
    const render=()=>{
        if(generation!==btClientHomeGeneration||!banner.isConnected)return;
        const slide=slides[current];
        const icon=banner.querySelector('[data-promo-icon]');
        const title=banner.querySelector('[data-promo-title]');
        const detail=banner.querySelector('[data-promo-detail]');
        if(icon)icon.textContent=slide.icon;
        if(title)title.textContent=slide.title;
        if(detail)detail.textContent=slide.detail;
        banner.onclick=()=>slide.open();
        banner.setAttribute('aria-label',slide.title+' '+slide.detail);
    };
    render();
    clientApi('/api/client/referral').then(r=>{
        if(generation!==btClientHomeGeneration||!banner.isConnected)return;
        if(r?.enabled&&r?.link){
            slides.push({icon:'🎁',title:'Пригласи друга — получи бонус!',detail:'За первый ремонт друга — бонус на баланс',open:showClientReferral});
            btClientPromoTimer=setInterval(()=>{
                if(generation!==btClientHomeGeneration||!banner.isConnected){btStopClientPromoCarousel();return;}
                current=(current+1)%slides.length;
                render();
            },3000);
        }
    }).catch(()=>{});
}

// Poll-only cache: share a short-lived dashboard response between the home chat,
// home order status and the orders screen. POST/action requests never use this cache.
let btDashboardPollCache={at:0,value:null,pending:null};
function btInvalidateDashboardPoll(){btDashboardPollCache.at=0;btDashboardPollCache.value=null;}
async function btPollClientDashboard(){
    const cache=btDashboardPollCache;
    if(cache.pending)return cache.pending;
    if(cache.value && Date.now()-cache.at<8000)return cache.value;
    cache.pending=clientApi('/api/client/dashboard').then(value=>{
        cache.value=value;cache.at=Date.now();return value;
    }).finally(()=>{cache.pending=null;});
    return cache.pending;
}
let btOrderProgressTimer = null;
function btStopOrderProgressRefresh() {
    if (btOrderProgressTimer) { clearInterval(btOrderProgressTimer); btOrderProgressTimer = null; }
}
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

const clientUrlParams = new URLSearchParams(location.search);
const currentClientTelegramId = String(tg?.initDataUnsafe?.user?.id || '');
// Mini App localStorage is shared by Telegram accounts on the same device. Scope
// profile/autofill data to the Telegram UID; never clear the offline operation queue.
if (currentClientTelegramId) {
    const storedProfileUid = String(localStorage.getItem('remont_bt_profile_uid') || '');
    if (storedProfileUid !== currentClientTelegramId) {
        ['remont_bt_name','remont_bt_phone','remont_bt_house','remont_bt_apartment',
         'remont_bt_identity_saved','remont_bt_registered','remont_bt_master_application','remont_bt_customer_name_confirmed'].forEach(k => localStorage.removeItem(k));
    }
}
const isNewClientFlow = clientUrlParams.get("new_client") === "1";
// Регистрационный номер в ссылке добавляет бот только для уже зарегистрированного клиента.
const hasJustRegisteredLocally = isNewClientFlow && localStorage.getItem('remont_bt_identity_saved') === '1';
const isKnownRegisteredClient = hasJustRegisteredLocally || (!isNewClientFlow && (
    clientUrlParams.get("registered") === "1" ||
    /^CL-[A-Z0-9-]{6,38}$/.test(clientUrlParams.get("registration_no") || "") ||
    localStorage.getItem("remont_bt_registered") === "1"
));

// ============ ГЛАВНОЕ МЕНЮ КЛИЕНТА ==========

function btClientRecentOrder(d){
    const orders=Array.isArray(d?.orders)?d.orders:[];
    const panel=document.getElementById('btRecentOrder');if(!panel)return;
    const recent=orders[0];if(!recent){panel.hidden=true;return;}
    panel.hidden=false;
    const status=String(recent.status||'').toLowerCase();
    const step=['closed','completed'].includes(status)?4:status==='act_issued'?4:status==='in_progress'?3:status==='accepted'?2:1;
    panel.querySelectorAll('.bt-circuit span').forEach((node,i)=>node.classList.toggle('bt-complete',i<step));
    const statuses={new:'Новая',accepted:'Принята',in_progress:'В ремонте',act_issued:'Акт оформлен',closed:'Закрыта',completed:'Завершена',rejected:'Отклонена',cancelled:'Отменена'};
    const label=document.getElementById('btOrderLabel');
    if(label)label.textContent='Заявка '+String(recent.id||'')+' · '+String(recent.device||'Техника')+' · '+(statuses[recent.status]||recent.display_status||'Обрабатывается');
}
function btRenderReferralPanel(box,r){
  if(!box)return;
  const url=String(r?.link||'');
  if(!r?.enabled){box.hidden=true;box.replaceChildren();return;}
  box.hidden=false;
  box.innerHTML=`<b>🎁 Пригласите друга</b><p>Ваш друг получит <b>${Number(r.new_client_discount_percent)||5}% скидки</b> на первый ремонт.</p><p>После завершения его ремонта Вы один раз получите <b>${Number(r.referrer_reward_percent)||1}% от стоимости</b> бонусом на баланс «ТехСервиса».</p><p>Бонусы можно использовать при следующем ремонте. Вывести деньгами нельзя.</p><p>Приглашённых друзей: ${Number(r.invited_count)||0}.</p>${url?`<input id="btReferralLink" readonly value="${escapeClient(url)}"><button type="button" onclick="btCopyReferralLink()">Копировать ссылку</button><button type="button" class="secondary" onclick="btShareReferralLink()">Поделиться</button>`:`<p class="subtitle">${escapeClient(r.message||'Новые приглашения пока недоступны.')}</p>`}`;
}
function btRefreshClientReviewsEntry(){
 const el=document.getElementById('btClientReviewsEntry');if(!el)return;
 el.hidden=false; // Раздел отзывов виден даже без опубликованных отзывов.

}
// Badge always comes from the authenticated client's assigned master's server status.
function btMasterVerifiedBadge(master){
    return master?.identity_verified===true ? '<span class="bt-identity-verified" style="display:inline-flex;align-items:center;gap:5px;color:#20bc95;font-weight:700;font-size:.86rem;margin:5px 0">✔ '+escapeClient((window.btUiLang==='uz'||document.documentElement.lang==='uz')?'Shaxsi tekshirilgan':'Личность проверена')+'</span>' : '';
}
function btUpdateMasterBadge(d){
    const el=document.getElementById('btHomeMasterIdentity');
    if(el)el.innerHTML=btMasterVerifiedBadge(d?.master);
}
function btFormatPublicPhone(value){
 const raw=String(value||'').trim();const digits=raw.replace(/\D/g,'');
 if(digits.length===12&&digits.startsWith('998'))return '+998 '+digits.slice(3,5)+' '+digits.slice(5,8)+' '+digits.slice(8,10)+' '+digits.slice(10,12);
 return raw;
}
function showClientMasterReviews(){
 setPage('👨‍🔧 Мой мастер','<article class="card" id="btMasterReviewsPanel"><p class="subtitle">Загружаем отзывы…</p></article>');
 clientApi('/api/client/master-reviews').then(data=>{
   const el=document.getElementById('btMasterReviewsPanel');if(!el)return;
   const avatar=(typeof data.master_avatar==='string'&&data.master_avatar.startsWith('data:image/jpeg;base64,')&&data.master_avatar.length<=180000)?`<img src="${escapeClient(data.master_avatar)}" alt="Фото мастера" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid #3a8fff">`:'<div style="width:80px;height:80px;border-radius:50%;display:grid;place-items:center;background:#193956;font-size:32px">👨‍🔧</div>';
   const passport=data.verification?.passport_selfie===true?'✅ Паспорт и селфи проверены':'◯ Паспорт и селфи не проверены';
   const profile=`<div style="display:flex;gap:14px;align-items:center;margin-bottom:12px">${avatar}<div><h2 style="margin:0">${escapeClient(data.master_name||'Мастер')}</h2><p class="subtitle">${escapeClient(btFormatPublicPhone(data.master_phone||'Телефон не указан'))}</p></div></div><p class="subtitle">${escapeClient(passport)}</p><p class="subtitle">Самозанятость · скоро</p><p class="subtitle">QR-чек · скоро</p><h3>О мастере</h3><p>${escapeClient(data.master_about||'Мастер пока не добавил информацию о себе.')}</p><hr>`;
   if(!data.enabled){el.innerHTML=profile+'<h3>Отзывы</h3><p class="subtitle">У мастера пока нет отзывов.</p>';return;}
   const reviews=Array.isArray(data.reviews)?data.reviews:[];
   const title=profile+'<h3>Отзывы о мастере</h3>';
   const summary=reviews.length?'<p class="subtitle">Оценка '+escapeClient(data.average_rating)+' из 5 · отзывов: '+escapeClient(data.count)+'</p>':'<p class="subtitle">Показ отзывов включён, но опубликованных отзывов ещё нет.</p>';
   el.innerHTML=title+summary+reviews.map(r=>'<div class="bt-public-review"><b>'+('⭐'.repeat(Math.min(5,Math.max(1,Number(r.rating)||1))))+'</b><small>'+escapeClient([r.device,r.brand].filter(Boolean).join(' · '))+' · '+escapeClient(String(r.created_at||'').slice(0,10))+'</small><p>'+escapeClient(r.text||'Без комментария')+'</p></div>').join('');
 }).catch(()=>{const el=document.getElementById('btMasterReviewsPanel');if(el)el.textContent='Не удалось загрузить отзывы. Повторите позже.'});
}
function btRefreshClientReferralEntry(){
 const el=document.getElementById('btClientReferralEntry');if(!el)return;
 el.hidden=true;
 clientApi('/api/client/referral').then(r=>{
   if(!el.isConnected)return;
   el.hidden=!(r.enabled&&r.link);
 }).catch(()=>{if(el.isConnected)el.hidden=true});
}
function showClientReferral(){
 setPage('🎁 Пригласить друга','<article class="card" id="btReferralPanel"><p class="subtitle">Проверяем доступность приглашений…</p></article>');
 clientApi('/api/client/referral').then(r=>{
   const box=document.getElementById('btReferralPanel');if(!box)return;
   if(!r.enabled){box.innerHTML='<p class="subtitle">Реферальная программа у вашего мастера сейчас недоступна.</p>';return;}
   btRenderReferralPanel(box,r);
 }).catch(()=>{const box=document.getElementById('btReferralPanel');if(box)box.textContent='Не удалось проверить программу. Повторите позже.'});
}
function renderClientMenu() {
    if(!btLegalApproved){void btLegalGate(clientApi,renderClientMenu,"client");return;}
    window.RemontMobile?.enter('client/home',()=>renderClientMenu(),{root:true});
    btStopOrderProgressRefresh();
    btStopChatRefresh();
    if(btHomeTimer){clearInterval(btHomeTimer);btHomeTimer=null;}
    btStopClientPromoCarousel();
    const btPromoGeneration=++btClientHomeGeneration;
    document.body.classList.remove('bt-inner-page', 'bt-order-page');
    document.body.innerHTML = `
        <main class="bt-client-home">
          <header class="bt-brand-head bt-compact-header bt-client-header"><img class="bt-brand-logo bt-header-logo" src="img/remont-bt-icon.png" alt="ТехСервис"><div class="bt-header-copy"><span class="bt-header-hello">Здравствуйте!</span><strong class="bt-header-name" id="clientWelcomeName">${escapeClient(tg.initDataUnsafe?.user?.first_name || localStorage.getItem('remont_bt_name') || 'клиент')}</strong></div><span class="bt-header-role">👤 <span>Клиент</span></span></header>
          <button class="bt-client-promo-banner" id="btClientPromoBanner" type="button" onclick="showEnterPromo()"><span data-promo-icon>🎁</span><span><b data-promo-title>У вас есть промокод?</b><small data-promo-detail>Получите скидку на ремонт</small></span><span aria-hidden="true">›</span></button>
          <button class="bt-main-action bt-client-new-order-action bt-red-action" type="button" onclick="showNewOrder()">＋ Создать заявку</button>
          <div class="client-home-grid bt-home-tiles">
            <button class="menu-btn" onclick="showMyOrders()"><span class="emoji bt-line-icon">▤</span><b>Мои заявки</b><small>История</small></button>
            <button class="menu-btn" onclick="showMyActs()"><span class="emoji bt-line-icon">◫</span><b>Мои акты</b><small>Гарантия</small></button>
            <button class="menu-btn bt-reviews-entry" id="btClientReviewsEntry" type="button" onclick="showClientMasterReviews()" hidden><span class="emoji bt-line-icon">☆</span><b>Мой мастер</b><small>Профиль и отзывы</small></button>
            <button class="menu-btn bt-referral-entry" id="btClientReferralEntry" type="button" onclick="showClientReferral()" hidden><span class="emoji bt-line-icon">↗</span><b>Пригласить друга</b><small>Рефералы</small></button>
            <button class="menu-btn" onclick="showProfile()"><span class="emoji bt-line-icon">◎</span><b>Профиль</b><small>Мои данные</small></button>
            <button class="menu-btn" onclick="showClientFAQ()"><span class="emoji bt-line-icon">♧</span><b>F.A.Q.</b><small>Помощь</small></button>
          </div>
          <section class="bt-live-panel" id="btRecentOrder" hidden><div class="bt-section-title">⚡ Электрическая цепь ремонта</div><div id="btOrderLabel" class="bt-order-label"></div><div class="bt-circuit"><span>Заявка</span><span>Принято</span><span>Ремонт</span><span>Акт</span></div></section>
          <section class="bt-live-panel bt-home-chat" id="btHomeChat" aria-label="Чат с мастером">
            <div class="bt-section-title">✉ Живой чат <span class="bt-glow-dot">●</span></div>
            <div id="btChatHistory" class="bt-chat-history bt-home-chat-history" aria-live="polite"><p class="subtitle">Загружаем переписку…</p></div>
            <form class="bt-chat-compose bt-home-chat-compose" onsubmit="event.preventDefault();sendClientMessage()">
              <label for="masterMessage">Сообщение мастеру</label>
              <textarea id="masterMessage" maxlength="1500" rows="2" placeholder="Напишите сообщение прямо здесь…"></textarea>
              <div class="bt-chat-compose-actions"><label class="bt-chat-attach" for="clientChatFile">＋ Фото / видео</label><input id="clientChatFile" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" hidden onchange="btDescribeChatFile()"><button id="clientChatSend" type="submit">➤ Отправить</button></div>
              <p id="clientChatFileName" class="subtitle"></p><p id="messageStatus" class="subtitle" role="status"></p>
            </form>
          </section>
          <div id="btAdvertiserSlot"></div><nav class="bt-client-bottom-nav" aria-label="Навигация"><button onclick="renderClientMenu()"><span>⌂</span>Главная</button><button onclick="showMyOrders()"><span>▤</span>Заявки</button><button onclick="btFocusHomeChat()"><span>✉</span>Чат</button><button onclick="showProfile()"><span>♙</span>Профиль</button></nav>
        </main>`;
    btRefreshClientReferralEntry();
    window.btMountClientLanguage?.();
    btRefreshClientReviewsEntry();
    btStartClientPromoCarousel(btPromoGeneration);
    clientApi('/api/advertiser/dashboard').then(d => {
        if (!d?.advertiser || document.getElementById('clientAdvertiserBtn')) return;
        const slot = document.getElementById('btAdvertiserSlot'); if (!slot) return;
        const btn = document.createElement('button'); btn.id='clientAdvertiserBtn'; btn.className='bt-main-action bt-advertiser-action';
        btn.textContent='📣 Кабинет рекламодателя'; btn.onclick=()=>openAdvertiserCabinet(); slot.appendChild(btn);
    }).catch(()=>{});
    clientApi('/api/client/dashboard').then(d => {
        const name=String(d.profile?.name||'').trim().replace(/\s+([.,!?])/g,'$1'); const n=document.getElementById('clientWelcomeName'); if(n&&name)n.textContent=name;
        btClientRecentOrder(d);
        btUpdateMasterBadge(d);
    }).catch(()=>{});
    // Home chat is functional, not a separate navigation screen.
    btRefreshClientChat(true);
    btChatAutoTimer=setInterval(()=>{
        if(document.hidden)return;
        if(document.getElementById('btHomeChat'))btRefreshClientChat(true);
        else btStopChatRefresh();
    },20000);
    btHomeTimer=setInterval(()=>{
        if(!document.querySelector('.bt-client-home')){clearInterval(btHomeTimer);btHomeTimer=null;return;}
        if(document.hidden)return;
        btPollClientDashboard().then(d=>{
            btClientRecentOrder(d);
        }).catch(()=>{});
    },30000);
}

function showClientFAQ(){
    const items=[
      ['Что такое ТехСервис?','Это сервис для оформления заявок на ремонт бытовой техники, связи с мастером и хранения электронных актов и гарантий.'],
      ['Как зарегистрироваться?','Откройте приложение клиента из Telegram, укажите имя и телефон и сохраните данные. Повторная регистрация не требуется.'],
      ['Как создать заявку?','На главной нажмите «Создать заявку», выберите технику, опишите неисправность, укажите удобное время и место ремонта, затем отправьте заявку.'],
      ['Как указать место ремонта?','Выберите один способ: введите адрес вручную либо отправьте геолокацию. Если Вы сейчас не дома, укажите домашний адрес текстом — GPS телефона не обязателен.'],
      ['Можно ли отправить геолокацию в чат бота?','Да. После отправки местоположения бот предложит «Создать заявку» или «Отменить». При создании заявки координаты будут использованы как место ремонта; отправка GPS сама по себе заказ не создаёт.'],
      ['Как узнать, принял ли мастер заявку?','Откройте «Мои заявки». Там отображается текущий статус обращения. Если мастер ещё не принял заявку, дождитесь изменения статуса.'],
      ['Как связаться с мастером?','Используйте чат в кабинете клиента. Можно отправить текст и, если доступно в интерфейсе, фото или видео неисправности.'],
      ['Где посмотреть выполненный ремонт?','Откройте «Мои акты». В электронном акте указаны выполненные работы, стоимость и условия гарантии.'],
      ['Что означает гарантия?','Срок и условия гарантии указаны в конкретном акте. Сохраняйте акт и обращайтесь к мастеру при вопросах по выполненному ремонту.'],
      ['Как работают промокоды?','В разделе «Промокоды» введите полученный код. Размер скидки, срок действия и ограничения зависят от условий промокода.'],
      ['Как пригласить друга?','Поделитесь ссылкой: друг получит скидку 5% на первый ремонт, а Вы — 1% стоимости его первого завершённого ремонта бонусом на баланс ТехСервиса. Бонус можно потратить на будущий ремонт, вывести нельзя.'],
      ['Можно ли изменить мастера?','В настройках доступен запрос на смену мастера. Укажите причину; заявку рассмотрит администратор. До подтверждения текущий мастер не меняется.'],
      ['Что делать, если заявка отменена администратором?','Откройте историю заявок и посмотрите статус и причину. При необходимости создайте новую заявку или свяжитесь с поддержкой.'],
      ['Правовая информация и ответственность','ТехСервис предоставляет цифровую платформу, а ремонт, оплату, гарантии и налоговые обязательства мастер и клиент согласуют самостоятельно. Полные условия и политика конфиденциальности доступны в разделе «Правовая информация».'], ['Что делать, если приложение не обновилось?','Полностью закройте Mini App и откройте его снова из актуальной кнопки в Telegram. При повторной ошибке обратитесь в поддержку.']
    ];
    setPage('F.A.Q. — Помощь',`<article class="card bt-faq-card"><p class="subtitle">Частые вопросы о пользовании ТехСервис.</p>${items.map(([q,a])=>`<details><summary>${escapeClient(q)}</summary><p>${escapeClient(a)}</p></details>`).join('')}<button type="button" onclick="window.open('legal.html','_blank')">🛡 Правовая информация / Huquqiy ma’lumot</button><button type="button" onclick="renderClientMenu()">← Главная</button></article>`);
}
function btFocusHomeChat(){
    const chat=document.getElementById('btHomeChat');
    if(!chat){renderClientMenu();return;}
    chat.scrollIntoView({behavior:'smooth',block:'start'});
    const input=document.getElementById('masterMessage');
    if(input)setTimeout(()=>input.focus({preventScroll:true}),250);
}
function openAdvertiserCabinet(){
    if(window.RemontMobile?.confirmNavigation && !window.RemontMobile.confirmNavigation())return;
    const url=new URL('advertiser.html',location.href);
    const params=new URLSearchParams(location.search);
    for(const key of ['session_uid','session_exp','session_sig']){
        const value=params.get(key);if(value)url.searchParams.set(key,value);
    }
    // Telegram may not repeat initData after a page navigation in a WebView.
    // Store only for this tab. The server still verifies its signature and freshness.
    try{
        const telegramData=String(window.Telegram?.WebApp?.initData||'');
        if(telegramData){
            sessionStorage.setItem('remontbt_adv_auth',JSON.stringify({data:telegramData,uid:String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id||''),time:Date.now()}));
        }
    }catch(_){ }
    location.href=url.href;
}

function requestMasterRole() { showMasterApplicationForm(); }

function showMasterChoice() {
    setPage('🧑‍🔧 Кабинет мастера', `<div class="card master-choice-card">
      <p>Выберите действие:</p>
      <div class="master-choice-actions">
        <button class="master-choice-btn" type="button" onclick="showExistingMasterHelp()"><span>🔐</span><span><b>Я уже мастер</b><small>Войти в свой кабинет</small></span></button>
        <button class="master-choice-btn" type="button" onclick="showMasterApplicationForm()"><span>🧑‍🔧</span><span><b>Я хочу стать мастером</b><small>Отправить заявку администратору</small></span></button>
      </div>
    </div>`);
}

function showExistingMasterHelp(message='') {
    setPage('🔐 Вход мастера', `<form id="masterPhoneLoginForm" class="card master-auth-card">
      <p>Введите номер телефона, который привязан к вашему кабинету мастера.</p>
      <label for="masterPhoneLogin">Номер телефона</label>
      <input id="masterPhoneLogin" name="phone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="+998 90 123 45 67" value="${escapeClient(localStorage.getItem('remont_bt_phone') || '')}">
      <button id="masterPhoneLoginButton" type="submit">Проверить и войти</button>
      <p id="masterPhoneLoginStatus" class="${message?'error':'subtitle'}" role="status">${escapeClient(message || 'Доступ проверяется по вашему Telegram ID и номеру телефона.')}</p>
    </form>`);
    const form=document.getElementById('masterPhoneLoginForm');
    form?.addEventListener('submit', async e => {
      e.preventDefault();
      const field=document.getElementById('masterPhoneLogin');
      const status=document.getElementById('masterPhoneLoginStatus');
      const button=document.getElementById('masterPhoneLoginButton');
      const phone=cleanPhone(field?.value || '');
      if(!validPhone(phone)){status.textContent='Введите корректный номер +998XXXXXXXXX.';status.className='error';return;}
      const initData=String(window.Telegram?.WebApp?.initData || '');
      const query=new URLSearchParams(location.search);
      const sessionUid=query.get('session_uid')||'';const sessionExp=query.get('session_exp')||'';const sessionSig=query.get('session_sig')||'';
      const signedSession=sessionUid&&sessionExp&&sessionSig?`${sessionUid}:${sessionExp}:${sessionSig}`:String(localStorage.getItem('remontBT.master.session.v1')||'');
      if(!initData&&!signedSession){status.textContent='Откройте приложение кнопкой из чата с ботом Telegram. Обычная HTTPS-ссылка не подтверждает ваш Telegram ID.';status.className='error';return;}
      const apiBase=String(window.REMONT_ADVERTISER_API_BASE || '').replace(/\/$/,'');
      if(!apiBase){status.textContent='API не настроен. Сообщите администратору.';status.className='error';return;}
      button.disabled=true;status.textContent='Проверяем номер и Telegram ID…';status.className='subtitle';
      try{
        const response=await fetch(apiBase+'/api/master/login',{method:'POST',headers:{'Content-Type':'application/json',...(initData?{'X-Telegram-Init-Data':initData}:{}),...(signedSession?{'X-Remont-Session':signedSession}:{})},body:JSON.stringify({phone,master_uid:query.get('master_uid'),master_exp:query.get('master_exp'),master_sig:query.get('master_sig')}),cache:'no-store'});
        const data=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(data.error || `Ошибка входа (${response.status})`);
        if(!data.session || !data.user_id)throw new Error('Сервер не подтвердил кабинет мастера.');
        localStorage.setItem('remontBT.master.session.v1',data.session);
        localStorage.setItem('remont_bt_phone',phone);
        const target=new URL('index.html',location.href);target.searchParams.set('role','master');target.searchParams.set('appv','20261020-master-pinfl-order-fix5');
        status.textContent='Доступ подтверждён. Открываем кабинет…';status.className='notice';
        location.href=target.href;
      }catch(err){status.textContent=err.message || 'Не удалось проверить доступ.';status.className='error';button.disabled=false;}
    });
}

const MASTER_APPLICATION_QUEUE_KEY = 'remont_bt_master_application_queue_v2';
let masterApplicationSyncInProgress = false;

function normalizeMasterBirthDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    let day, month, year;
    let m = raw.match(/^(\d{2})(\d{2})(\d{4})$/);
    if (m) {
        day = Number(m[1]); month = Number(m[2]); year = Number(m[3]);
    } else {
        // Разрешены только ДД,ММ,ГГГГ / ДД.ММ.ГГГГ / ДД/ММ/ГГГГ / ДД\\ММ\\ГГГГ.
        m = raw.match(/^(\d{2})([.,/\\])(\d{2})\2(\d{4})$/);
        if (!m) return '';
        day = Number(m[1]); month = Number(m[3]); year = Number(m[4]);
    }
    const date = new Date(year, month - 1, day);
    if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() ||
        date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || date > new Date()) return '';
    return `${String(day).padStart(2,'0')}.${String(month).padStart(2,'0')}.${String(year).padStart(4,'0')}`;
}

function recoverMasterApplicationQueue() {
    const uid = currentMasterApplicationOwner();
    if (!/^\d{1,20}$/.test(uid)) return;
    const items = getMasterApplicationQueue();
    let changed = false;
    for (const item of items) {
        if (String(item.telegram_user_id || '') !== uid || item.status !== 'blocked') continue;
        const err = String(item.last_error || '');
        // Retry old requests blocked only because the API rejected the not-yet-registered user.
        if (/401|403|Telegram|авторизац|подтвердить/i.test(err)) {
            item.status = 'pending';
            item.last_error = '';
            changed = true;
        }
    }
    if (changed) saveMasterApplicationQueue(items);
}

function getMasterApplicationQueue() {
    try {
        const parsed = JSON.parse(localStorage.getItem(MASTER_APPLICATION_QUEUE_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
}
function saveMasterApplicationQueue(items) {
    try { localStorage.setItem(MASTER_APPLICATION_QUEUE_KEY, JSON.stringify(items.slice(-20))); return true; }
    catch (e) { console.error('Не удалось сохранить очередь заявки мастера:', e); return false; }
}
function currentMasterApplicationOwner() {
    return String(currentClientTelegramId || (typeof currentQueueOwnerId === 'function' ? currentQueueOwnerId() : '') || '');
}
function queueMasterApplication(data) {
    const uid = currentMasterApplicationOwner();
    if (!/^\d{1,20}$/.test(uid)) return false;
    const items = getMasterApplicationQueue().filter(x => String(x.telegram_user_id || '') !== uid);
    items.push({
        operation_id: (typeof uuidV4 === 'function' ? uuidV4() : `${Date.now()}-${Math.random()}`),
        telegram_user_id: uid,
        payload: {name:data.name, phone:data.phone, gender:data.gender, birth_date:data.birth_date, pinfl:data.pinfl,
                  specializations:[...(data.specializations || [])], service_region:data.service_region,
                  service_district:data.service_district, diagnostic_price:data.diagnostic_price},
        queued_at: new Date().toISOString(),
        attempts: 0,
        status: 'pending'
    });
    return saveMasterApplicationQueue(items);
}
function migrateLegacyMasterApplicationQueue() {
    if (typeof getOfflineQueue !== 'function' || typeof saveOfflineQueue !== 'function') return;
    const legacy = getOfflineQueue();
    const remain = [];
    let changed = false;
    for (const item of legacy) {
        if (item && item.event === 'submit_master_application' && ['pending','retry'].includes(item.local_status)) {
            const uid = String(item.telegram_user_id || '');
            const owner = currentMasterApplicationOwner();
            if (uid && uid === owner && item.name && item.phone && item.pinfl) {
                const current = getMasterApplicationQueue();
                if (!current.some(x => x.telegram_user_id === uid && x.payload?.pinfl === item.pinfl && x.payload?.phone === item.phone)) {
                    current.push({operation_id:item.operation_id || (typeof uuidV4==='function'?uuidV4():String(Date.now())), telegram_user_id:uid,
                        payload:{name:item.name,phone:item.phone,gender:item.gender,birth_date:item.birth_date,pinfl:item.pinfl},
                        queued_at:item.queued_at || new Date().toISOString(),attempts:0,status:'pending'});
                    saveMasterApplicationQueue(current);
                }
                changed = true;
                continue;
            }
        }
        remain.push(item);
    }
    if (changed) saveOfflineQueue(remain);
}
async function syncMasterApplicationQueue() {
    if (masterApplicationSyncInProgress || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
    const uid = currentMasterApplicationOwner();
    if (!/^\d{1,20}$/.test(uid)) return;
    const items = getMasterApplicationQueue();
    const item = items.find(x => String(x.telegram_user_id || '') === uid && x.status === 'pending');
    if (!item) return;
    // Legacy queued one-step applications have no specialization or territory.
    // Never spam the API or silently replace them with guessed values.
    if (!Array.isArray(item.payload?.specializations) || !item.payload.specializations.length ||
        !item.payload.service_region || !item.payload.service_district ||
        item.payload.diagnostic_price === undefined || item.payload.diagnostic_price === null) {
        item.status = 'blocked';
        item.last_error = 'Для заявки нужны специализации, район и стоимость диагностики. Откройте регистрацию мастера и заполните шаги 2 и 3.';
        saveMasterApplicationQueue(items);
        const st = document.getElementById('masterApplicationStatus');
        if (st) { st.textContent = item.last_error; st.className = 'error'; }
        return;
    }
    masterApplicationSyncInProgress = true;
    try {
        const result = await clientApi('/api/master/apply', 'POST', item.payload);
        if (!result || result.ok !== true) throw new Error('Сервер не подтвердил приём заявки.');
        saveMasterApplicationQueue(getMasterApplicationQueue().filter(x => x.operation_id !== item.operation_id));
        try { localStorage.removeItem('remont_bt_master_application'); } catch (_) {}
        const status = document.getElementById('masterApplicationStatus');
        const button = document.querySelector('#masterApplicationForm button[type="submit"]');
        if (status) { status.textContent = result.already_master ? 'Кабинет мастера уже активен.' : 'Заявка отправлена на сервер и находится на рассмотрении.'; status.className = 'notice'; }
        if (button) { button.textContent = result.already_master ? 'Кабинет уже активен' : '✓ Заявка отправлена'; button.disabled = true; }
    } catch (err) {
        const authOrConfigError = /Telegram не передал данные авторизации|API не настроен|Откройте приложение кнопкой из чата/i.test(String(err?.message || ''));
        const current = getMasterApplicationQueue();
        const idx = current.findIndex(x => x.operation_id === item.operation_id);
        if (idx >= 0) {
            current[idx].attempts = Number(current[idx].attempts || 0) + 1;
            current[idx].last_attempt_at = new Date().toISOString();
            const statusCode = Number(err && err.status || 0);
            const retryableAuthFailure = statusCode === 401 || statusCode === 403 || /Telegram не передал данные авторизации|подтвердить Telegram|откройте приложение через кнопку бота/i.test(String(err?.message || ''));
            if ((statusCode >= 400 && statusCode < 500 && !retryableAuthFailure) || (authOrConfigError && !retryableAuthFailure)) {
                current[idx].status = 'blocked';
                current[idx].last_error = String(err.message || 'Сервер отклонил заявку');
            } else {
                current[idx].status = 'pending';
                current[idx].last_error = String(err.message || 'Временно не удалось отправить заявку');
            }
            saveMasterApplicationQueue(current);
        }
        const status = document.getElementById('masterApplicationStatus');
        const button = document.querySelector('#masterApplicationForm button[type="submit"]');
        const code = Number(err && err.status || 0);
        const retryableAuthFailure = code === 401 || code === 403 || /Telegram не передал данные авторизации|подтвердить Telegram|откройте приложение через кнопку бота/i.test(String(err?.message || ''));
        if (status && ((code >= 400 && code < 500 && !retryableAuthFailure) || (authOrConfigError && !retryableAuthFailure))) {
            status.textContent = `Сервер отклонил заявку: ${err.message || 'проверьте данные'}. Исправьте данные в форме и отправьте снова.`;
            status.className = 'error';
            if (button) { button.textContent = 'Проверить данные и отправить заявку'; button.disabled = false; }
        } else if (status) {
            status.textContent = 'Заявка сохранена в очереди и автоматически отправится, когда сервер подтвердит авторизацию или восстановится связь. Ничего дополнительно нажимать не нужно.';
            status.className = 'notice';
            if (button) { button.textContent = '⏳ Заявка ожидает отправки'; button.disabled = true; }
        }
        // Network errors and 5xx responses stay pending and are retried automatically.
        console.warn('Автосинхронизация заявки мастера не завершена:', err?.message || err);
    } finally { masterApplicationSyncInProgress = false; }
}
function startMasterApplicationAutoSync() {
    migrateLegacyMasterApplicationQueue();
    recoverMasterApplicationQueue();
    syncMasterApplicationQueue();
}
window.addEventListener('online', startMasterApplicationAutoSync);
window.addEventListener('focus', startMasterApplicationAutoSync);
document.addEventListener('visibilitychange', () => { if (!document.hidden) startMasterApplicationAutoSync(); });
setInterval(startMasterApplicationAutoSync, 15000);

// The client-to-master path uses the SAME three required steps as a new master.
// The server remains authoritative on skills, territory and price limits.
const BT_CLIENT_MASTER_DEFAULT_SKILLS = {"Бытовая техника":{"washer":"Стиральные машины","fridge":"Холодильники","air_conditioner":"Кондиционеры","microwave":"Микроволновки","dishwasher":"Посудомойки","vacuum":"Пылесосы","ice_maker":"Льдогенераторы","water_heater":"Водонагреватели","tv_audio":"ТВ / аудио / тюнеры","other_appliance":"Прочее"},"Компьютеры, периферия и ПО":{"windows_install":"Установка Windows","desktop":"Настольные ПК","all_in_one":"Моноблоки","laptop":"Ноутбуки","printer":"Принтеры","scanner":"Сканеры"},"Монтаж / демонтаж":{"install_air_conditioner":"Кондиционер — Монтаж","remove_air_conditioner":"Кондиционер — Демонтаж","install_washer":"Стиральная машина — Монтаж","remove_washer":"Стиральная машина — Демонтаж","install_gas_stove":"Газовая плита — Монтаж","remove_gas_stove":"Газовая плита — Демонтаж","install_electric_stove":"Электрическая плита — Монтаж","remove_electric_stove":"Электрическая плита — Демонтаж","install_water_heater":"Водонагреватель — Монтаж","remove_water_heater":"Водонагреватель — Демонтаж","install_gas_boiler":"Газовый котёл — Монтаж","remove_gas_boiler":"Газовый котёл — Демонтаж"}};
let btClientMasterApplyStep = 1;
function btClientMasterCheckedSkills(){
    return [...document.querySelectorAll('#masterApplicationSkills input[name="masterApplySkill"]:checked')].map(el=>el.value);
}
function btClientMasterSkillCounts(){
    document.querySelectorAll('#masterApplicationSkills details').forEach(section=>{
        const count=section.querySelectorAll('input[name="masterApplySkill"]:checked').length;
        const total=section.querySelectorAll('input[name="masterApplySkill"]').length;
        const label=section.querySelector('[data-master-apply-count]');
        if(label)label.textContent=`${count} из ${total}`;
    });
}
function btClientMasterRenderSkills(groups){
    const holder=document.getElementById('masterApplicationSkills');if(!holder)return;
    const old=new Set(btClientMasterCheckedSkills());
    holder.innerHTML=Object.entries(groups).map(([group,items],i)=>{
        if(!items || typeof items!=='object')return '';
        const rows=Object.entries(items).map(([code,label])=>`<label class="bt-client-master-skill"><input type="checkbox" name="masterApplySkill" value="${escapeClient(code)}" ${old.has(code)?'checked':''}><span>${escapeClient(label)}</span></label>`).join('');
        return `<details class="bt-client-master-skill-group" ${i===0?'open':''}><summary><strong>${escapeClient(group)}</strong><small data-master-apply-count>0 из ${Object.keys(items).length}</small></summary><div class="bt-client-master-skill-rows">${rows}</div></details>`;
    }).join('');
    holder.querySelectorAll('input[name="masterApplySkill"]').forEach(box=>box.addEventListener('change',btClientMasterSkillCounts));
    btClientMasterSkillCounts();
}
function btClientMasterRenderTerritories(regions){
    const region=document.getElementById('masterApplicationRegion');
    if(!region || !regions || typeof regions!=='object')return;
    const prior=region.value;
    region.replaceChildren(new Option('Выберите область',''));
    for(const name of Object.keys(regions))region.add(new Option(name,name));
    if(regions[prior])region.value=prior;
    window.btClientMasterTerritoryCatalog=regions;
    btClientMasterRegionChanged();
}
function btClientMasterRegionChanged(){
    const region=document.getElementById('masterApplicationRegion')?.value||'';
    const district=document.getElementById('masterApplicationDistrict');if(!district)return;
    const prior=district.value;
    district.replaceChildren(new Option('Выберите город или район',''));
    const options=(window.btClientMasterTerritoryCatalog||btMapTerritories)[region]||[];
    for(const name of options)district.add(new Option(name,name));
    if(options.includes(prior))district.value=prior;
}
function btClientMasterShowStep(step){
    btClientMasterApplyStep=step;
    document.querySelectorAll('#masterApplicationForm [data-master-apply-step]').forEach(el=>{
        el.hidden=Number(el.dataset.masterApplyStep)!==step;
    });
    const counter=document.getElementById('masterApplicationStepCounter');
    if(counter)counter.textContent=`Шаг ${step} из 3`;
    const st=document.getElementById('masterApplicationStatus');
    if(st && step!==3){st.textContent='';st.className='subtitle';}
    document.getElementById('masterApplicationForm')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function btClientMasterPersonalData(){
    const form=document.getElementById('masterApplicationForm');
    const data=Object.fromEntries(new FormData(form).entries());
    data.name=String(data.name||'').trim();data.phone=cleanPhone(data.phone);
    data.gender=String(data.gender||'').trim();data.birth_date=normalizeMasterBirthDate(data.birth_date);
    data.pinfl=String(data.pinfl||'').replace(/\D/g,'');
    if(data.name.length<2)throw Error('Введите ФИО.');
    if(!validPhone(data.phone))throw Error('Введите корректный номер +998XXXXXXXXX.');
    if(!['Мужской','Женский'].includes(data.gender))throw Error('Выберите пол.');
    if(!data.birth_date)throw Error('Неверная дата рождения. Формат ДД.ММ.ГГГГ.');
    if(!/^\d{14}$/.test(data.pinfl))throw Error('ПИНФЛ должен содержать ровно 14 цифр.');
    const first=Number(data.pinfl[0]);
    const map={3:['Мужской',1900],4:['Женский',1900],5:['Мужской',2000],6:['Женский',2000]};
    const pin=map[first];if(!pin)throw Error('Первая цифра ПИНФЛ не соответствует допустимому формату.');
    const pinDate=`${data.pinfl.slice(1,3)}.${data.pinfl.slice(3,5)}.${pin[1]+Number(data.pinfl.slice(5,7))}`;
    if(pin[0]!==data.gender||pinDate!==data.birth_date)throw Error(`Проверьте данные: по ПИНФЛ указаны пол ${pin[0]} и дата рождения ${pinDate}.`);
    return data;
}
function btClientMasterNextStep(from){
    try{
        if(from===1)btClientMasterPersonalData();
        if(from===2 && !btClientMasterCheckedSkills().length)throw Error('Выберите хотя бы одну специализацию.');
        const st=document.getElementById('masterApplicationStatus');
        if(st){st.textContent='';st.className='subtitle';}
        btClientMasterShowStep(from+1);
    }catch(err){showAlert(err.message||'Проверьте данные на этом шаге.');}
}
function showMasterApplicationForm() {
    const saved={};
    // The client's original account and repair history must stay intact.
    setPage('🧑‍🔧 Заявка мастера', `<p class="subtitle">Регистрация мастера в 3 шага. Ваш клиентский аккаунт и история сохраняются. После проверки заявку рассмотрит администратор.</p>
      <form id="masterApplicationForm" class="card master-auth-card bt-client-master-apply-form">
        <h2 id="masterApplicationStepCounter">Шаг 1 из 3</h2>
        <section data-master-apply-step="1">
          <h3>Личные данные</h3>
          <label for="masterApplicationName">ФИО *</label><input id="masterApplicationName" name="name" required minlength="2" maxlength="150" autocomplete="name" value="${escapeClient(saved.name||localStorage.getItem('remont_bt_name')||'')}">
          <label for="masterApplicationPhone">Телефон *</label><input id="masterApplicationPhone" name="phone" required type="tel" inputmode="tel" autocomplete="tel" placeholder="+998 90 123 45 67" value="${escapeClient(saved.phone||localStorage.getItem('remont_bt_phone')||'')}">
          <label for="masterApplicationGender">Пол *</label><select id="masterApplicationGender" name="gender" required><option value="">Выберите пол</option><option value="Мужской">Мужской</option><option value="Женский">Женский</option></select>
          <label for="masterApplicationBirthDate">Дата рождения *</label><input id="masterApplicationBirthDate" name="birth_date" required inputmode="numeric" autocomplete="bday" placeholder="ДД.ММ.ГГГГ">
          <label for="masterApplicationPinfl">ПИНФЛ (14 цифр) *</label><input id="masterApplicationPinfl" name="pinfl" required inputmode="numeric" autocomplete="off" minlength="14" maxlength="14" pattern="[0-9]{14}" placeholder="14 цифр">
          <button type="button" onclick="btClientMasterNextStep(1)">Далее — специализации →</button>
        </section>
        <section data-master-apply-step="2" hidden>
          <h3>Мои специализации</h3><p class="subtitle">Можно выбрать несколько видов работ. Нажмите на категорию, чтобы раскрыть список.</p>
          <div id="masterApplicationSkills"></div>
          <div class="bt-client-master-apply-nav"><button type="button" class="secondary" onclick="btClientMasterShowStep(1)">← Назад</button><button type="button" onclick="btClientMasterNextStep(2)">Далее →</button></div>
        </section>
        <section data-master-apply-step="3" hidden>
          <h3>Территория и диагностика</h3>
          <label for="masterApplicationRegion">Область *</label><select id="masterApplicationRegion" name="service_region" required onchange="btClientMasterRegionChanged()"><option value="">Выберите область</option></select>
          <label for="masterApplicationDistrict">Город / район *</label><select id="masterApplicationDistrict" name="service_district" required><option value="">Выберите город или район</option></select>
          <label for="masterApplicationPrice">Выезд и диагностика, сум *</label><input id="masterApplicationPrice" name="diagnostic_price" required type="number" min="0" max="200000" step="1" inputmode="numeric" placeholder="Например, 100000">
          <p class="subtitle">Территорию после регистрации можно изменить через поддержку. Цена выше 200 000 сум — только с разрешения администратора.</p>
          <div class="bt-client-master-apply-nav"><button type="button" class="secondary" onclick="btClientMasterShowStep(2)">← Назад</button><button type="submit">Проверить данные и отправить заявку</button></div>
          <p id="masterApplicationStatus" class="subtitle" role="status"></p>
        </section>
      </form>`);
    btClientMasterRenderSkills(BT_CLIENT_MASTER_DEFAULT_SKILLS);
    btClientMasterRenderTerritories(btMapTerritories);
    btClientMasterShowStep(1);
    // Load current server catalog, retaining any already checked choices.
    clientApi('/api/master/registration-catalog').then(catalog=>{
        if(!document.getElementById('masterApplicationForm'))return;
        if(catalog.skills)btClientMasterRenderSkills(catalog.skills);
        if(catalog.regions)btClientMasterRenderTerritories(catalog.regions);
    }).catch(()=>{/* Offline fallback remains, server checks all codes */});
    // Existing client phone has already been verified.
    clientApi('/api/client/profile').then(d=>{
        const phone=d?.profile?.phone;
        const field=document.getElementById('masterApplicationPhone');
        if(phone&&field){field.value=phone;field.readOnly=true;}
    }).catch(()=>{});
    document.getElementById('masterApplicationForm')?.addEventListener('submit',e=>{
        e.preventDefault();submitMasterApplication(e.currentTarget);
    });
    const birthInput=document.getElementById('masterApplicationBirthDate');
    birthInput?.addEventListener('blur',()=>{
        const normalized=normalizeMasterBirthDate(birthInput.value);
        if(normalized)birthInput.value=normalized;
    });
    const uid=currentMasterApplicationOwner();
    const queued=getMasterApplicationQueue().find(x=>String(x.telegram_user_id||'')===uid&&['pending','blocked'].includes(x.status));
    if(queued){
        const status=document.getElementById('masterApplicationStatus');
        const button=document.querySelector('#masterApplicationForm button[type="submit"]');
        if(queued.status==='pending'){
            if(status){status.textContent='Ваша заявка ожидает отправки и будет отправлена автоматически при восстановлении связи.';status.className='notice';}
            if(button){button.disabled=true;button.textContent='⏳ Заявка ожидает отправки';}
            btClientMasterShowStep(3);
        }else{
            if(status){status.textContent=queued.last_error||'Уточните специализации, территорию и отправьте заявку снова.';status.className='error';}
        }
    }
    startMasterApplicationAutoSync();
}
async function submitMasterApplication(form){
    const status=document.getElementById('masterApplicationStatus');
    const button=form.querySelector('button[type="submit"]');
    let data;
    try{
        data=btClientMasterPersonalData();
        data.specializations=btClientMasterCheckedSkills();
        data.service_region=String(document.getElementById('masterApplicationRegion')?.value||'');
        data.service_district=String(document.getElementById('masterApplicationDistrict')?.value||'');
        const rawPrice=String(document.getElementById('masterApplicationPrice')?.value||'').trim();
        data.diagnostic_price=Number(rawPrice);
        data.event='submit_master_application';
        if(!data.specializations.length){btClientMasterShowStep(2);throw Error('Выберите хотя бы одну специализацию.');}
        if(!data.service_region||!data.service_district)throw Error('Выберите область и район обслуживания.');
        if(!rawPrice||!Number.isSafeInteger(data.diagnostic_price)||data.diagnostic_price<0||data.diagnostic_price>200000)
            throw Error('Стоимость диагностики должна быть от 0 до 200 000 сум.');
    }catch(err){
        if(status){status.textContent=err.message;status.className='error';}
        showAlert(err.message||'Проверьте данные заявки.');return;
    }
    try{
        localStorage.setItem('remont_bt_phone',data.phone);
        localStorage.setItem('remont_bt_name',data.name);
        if(currentClientTelegramId)localStorage.setItem('remont_bt_profile_uid',currentClientTelegramId);
    }catch(_){}
    // Keep the full 3-step payload in the retry queue, not just personal data.
    if(!queueMasterApplication(data)){
        if(status){status.textContent='Не удалось сохранить заявку в очереди. Освободите место и повторите.';status.className='error';}
        if(button)button.disabled=false;
        return;
    }
    if(button){button.disabled=true;button.textContent='⏳ Отправляем заявку…';}
    await syncMasterApplicationQueue();
}
async function clientApi(path, method='GET', body=null) {
    // Telegram may restore the Mini App after navigation; initialise the SDK before requests.
    try { if (window.Telegram?.WebApp) { window.Telegram.WebApp.ready(); window.Telegram.WebApp.expand(); } } catch (_) {}
    const initData = String(window.Telegram?.WebApp?.initData || '');
    const query = new URLSearchParams(window.location.search);
    const sessionUid = query.get('session_uid') || '';
    const sessionExp = query.get('session_exp') || '';
    const sessionSig = query.get('session_sig') || '';
    const signedSession = sessionUid && sessionExp && sessionSig ? `${sessionUid}:${sessionExp}:${sessionSig}` : '';
    if (!initData && !signedSession) throw new Error('Telegram не передал данные авторизации. Нажмите /start в чате с ботом, чтобы обновить кнопку приложения.');
    const base = String(window.REMONT_ADVERTISER_API_BASE || '').replace(/\/$/, '');
    if (!base) throw new Error('API временно недоступен. Откройте приложение позже.');
    const headers = {'Content-Type':'application/json'};
    if (initData) headers['X-Telegram-Init-Data'] = initData;
    if (signedSession) headers['X-Remont-Session'] = signedSession;
    const res = await fetch(base + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store'
    });
    let data = {};
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) { const err = new Error(data.error || `Ошибка запроса (${res.status})`); err.status = res.status; throw err; }
    if(method.toUpperCase()!=='GET')btInvalidateDashboardPoll();
    return data;
}

// Unified mobile navigation replaces legacy client-specific touch handlers.
let btClientPageBack=()=>renderClientMenu();
let btClientActPreviewNumber='';
function btClientRestoreRoute(title){
    if(title.includes('Мой мастер')||title.includes('Отзывы о мастере'))return ()=>showClientMasterReviews();
    if(title.includes('Пригласить друга'))return ()=>showClientReferral();
    if(title.includes('F.A.Q.'))return ()=>showClientFAQ();
    if(title.includes('Кабинет мастера'))return ()=>showMasterChoice();
    if(title.includes('Вход мастера'))return ()=>showExistingMasterHelp();
    if(title.includes('Заявка мастера'))return ()=>showMasterApplicationForm();
    if(title.includes('Мои заявки'))return ()=>showMyOrders();
    if(title.includes('Акты и документы'))return ()=>showMyActs();
    if(title.includes('Просмотр акта')){const number=btClientActPreviewNumber;return ()=>showClientActPreview(number);}
    if(title.includes('Промокоды'))return ()=>showEnterPromo();
    if(title.includes('Профиль'))return ()=>showProfile();
    if(title.includes('Живой чат'))return ()=>showMessages();
    if(title.includes('Контакты мастера'))return ()=>showCallMaster();
    return ()=>renderClientMenu();
}
function setPage(title, body) {
    window.RemontMobile?.enter('client/page/'+title+(title.includes('Просмотр акта')?'/'+btClientActPreviewNumber:''),btClientRestoreRoute(title));
    btStopOrderProgressRefresh();
    if(!String(title).includes('Живой чат'))btStopChatRefresh();
    if(btHomeTimer){clearInterval(btHomeTimer);btHomeTimer=null;}
    document.body.classList.add('bt-inner-page');
    document.body.classList.remove('bt-order-page');
    btClientPageBack=()=>renderClientMenu();
    document.body.innerHTML = `<main class="bt-inner-content"><button class="back-btn" onclick="btClientPageBack()">← Главная</button><h1>${title}</h1>${body}</main>` + btClientBottomNav();
}

function btClientBottomNav() {
    return `<nav class="bt-client-bottom-nav bt-inner-nav" aria-label="Навигация"><button type="button" onclick="renderClientMenu()"><span>⌂</span>Главная</button><button type="button" onclick="showMyOrders()"><span>▤</span>Заявки</button><button type="button" onclick="btFocusHomeChat()"><span>✉</span>Чат</button><button type="button" onclick="showProfile()"><span>♙</span>Профиль</button></nav>`;
}

const btOrderStatusLabels = {
    new: 'Ожидает мастера', accepted: 'Принята мастером', in_progress: 'Выполняется ремонт',
    act_issued: 'Ожидает подтверждения акта', act_pending_delivery:'Акт готов — ожидает уведомления', rejected: 'Отклонена мастером',
    closed: 'Завершена', completed: 'Завершена', cancelled: 'Отменена'
};
function btOrderTimeline(o) {
    const status = String(o.status || 'new');
    const steps = [{label:'Заявка',done:true},{label:'Принято',done:['accepted','in_progress','act_issued','closed','completed'].includes(status)},
        {label:'Ремонт',done:['act_issued','closed','completed'].includes(status)},
        {label:'Акт',done:['act_issued','closed','completed'].includes(status)}];
    if (status === 'rejected' || status === 'cancelled') return `<div class="bt-order-stage-note">${escapeClient(btOrderStatusLabels[status])}</div>`;
    return `<div class="bt-status-timeline" aria-label="Этапы заявки">${steps.map(s=>`<span class="${s.done?'done':''}"><i>${s.done?'✓':'·'}</i>${s.label}</span>`).join('')}</div>`;
}
function btActiveOrders(rows) {
    // Only unfinished orders belong to the current-orders screen.
    const inactive = new Set(['closed', 'completed', 'cancelled', 'canceled', 'rejected']);
    return (Array.isArray(rows) ? rows : []).filter(o => {
        const status = String(o?.status || '').toLowerCase();
        const displayStatus = String(o?.display_status || '').toLowerCase();
        if(status==='rejected' && o.response_timeout_pending)return true;
        return !inactive.has(status) && !inactive.has(displayStatus);
    });
}
function btOrderCards(rows) {
    return btActiveOrders(rows).map(o => {
        const confirmationReady=Boolean(o.can_confirm_act === true);
        const displayStatus=String(o.display_status||o.status||'');
        const label=btOrderStatusLabels[displayStatus]||displayStatus||'Обрабатывается';
        const date=String(o.updated_at||o.act_issued_at||o.created_at||'').replace('T',' ').slice(0,16);
        let deadline='';
        const remaining=Number(o.act_confirmation_deadline||0)*1000-Date.now();
        if(confirmationReady && remaining>0)deadline=`<p class="subtitle">Если не подтвердить акт, он может автоматически закрыться после ${Math.ceil(remaining/60000)} мин. Ознакомьтесь с документом заранее.</p>`;
        return `<article class="card bt-order-progress-card">
            <div class="card-row"><b>${escapeClient(o.id||'Заявка')}</b><span class="status-pill">${escapeClient(label)}</span></div>
            <h3>${escapeClient([o.device,o.brand,o.model].filter(Boolean).join(' ')||'Ремонт техники')}</h3>
            <p>${escapeClient(o.problem||'')}</p>${btOrderTimeline(o)}
            <p class="subtitle">Обновлено: ${escapeClient(date||'—')}</p>
            ${o.promocode?`<p>🎟️ Промокод: ${escapeClient(o.promocode)}</p>`:''}
            ${btClientPaymentButton(o)}
            ${['new','rejected'].includes(String(o.status)) && o.response_timeout_pending ? `<div class="bt-order-wait-choice">
                <p><b>⏰ Мастер пока не принял заявку.</b> Вы можете подождать ещё 10 минут или выбрать другого мастера.</p>
                <button type="button" onclick="btClientReassignOrder('${escapeClient(o.id)}')">🔎 Выбрать другого</button>
                ${o.status==='new'?`<button type="button" class="secondary" onclick="btClientWaitOrder('${escapeClient(o.id)}')">⏳ Подождать 10 минут</button>`:''}
            </div>` : ''}
            ${confirmationReady?`<button onclick="confirmClientAct('${escapeClient(o.id)}')">✅ Подтвердить выполнение</button>${deadline}`:''}
        </article>`;
    }).join('');
}
async function btRefreshOrderCards() {
    if (document.hidden || !document.getElementById('btOrdersList')) return;
    try {
        const result=await btPollClientDashboard();
        const list=document.getElementById('btOrdersList');
        if(list){
            const wasActive=Boolean(list.querySelector('.bt-order-progress-card'));
            const activeOrders=btActiveOrders(result.orders||[]);
            if(wasActive !== Boolean(activeOrders.length)){
                clearInterval(btOrderProgressTimer);
                btOrderProgressTimer=null;
                await showMyOrders();
                return;
            }
            list.innerHTML=btOrderCards(activeOrders);
        }
    } catch(_) { /* Keep last known status; users may retry manually. */ }
}
async function showMyOrders() {
    setPage('📋 Мои заявки', '<p class="subtitle">Загружаем ваши заявки…</p>');
    try {
        const d = await clientApi('/api/client/dashboard');
        const activeOrders = btActiveOrders(d.orders||[]);
        setPage('📋 Мои заявки', `${activeOrders.length ? `<div class="card"><b>Мастер: ${escapeClient(d.master?.name||'Не назначен')}</b> ${btMasterVerifiedBadge(d.master)}</div><p class="subtitle">Статусы обновляются автоматически каждые 20 секунд.</p>` : ''}<div id="btOrdersList">${btOrderCards(activeOrders)}</div>`);
        btOrderProgressTimer=setInterval(btRefreshOrderCards,20000);
    } catch (e) { setPage('📋 Мои заявки', `<div class="card error">${escapeClient(e.message)}</div>`); }
}

async function btClientWaitOrder(orderId){
    try{
        const r=await clientApi('/api/client/order/wait','POST',{order_id:String(orderId)});
        showAlert(r.message||'Ожидаем ответа мастера ещё 10 минут.');
        await showMyOrders();
    }catch(e){showAlert(e.message||'Не удалось продлить ожидание.');}
}
async function btClientReassignOrder(orderId){
    try{
        const result=await clientApi('/api/client/order/reassign-options?order_id='+encodeURIComponent(orderId));
        const masters=result.masters||[];
        if(!masters.length){showAlert('Других подходящих мастеров сейчас нет. Вы можете подождать ещё 10 минут.');return;}
        const selected=await btChooseMarketplaceMaster(masters);
        if(selected===null || selected==='linked')return;
        const mode=selected==='public'?'free':'selected';
        const data={order_id:String(orderId),mode};
        if(mode==='selected')data.master_id=Number(selected);
        const done=await clientApi('/api/client/order/reassign','POST',data);
        showAlert(done.message||'Заявка переназначена.');
        await showMyOrders();
    }catch(e){showAlert(e.message||'Не удалось выбрать другого мастера.');}
}

async function confirmClientAct(orderId) {
    if (tg && typeof tg.showConfirm === 'function') {
        tg.showConfirm('Подтверждаете, что работы выполнены?', async yes => {
            if (yes) await confirmClientActRequest(orderId);
        });
        return;
    }
    if (confirm('Подтверждаете, что работы выполнены?')) await confirmClientActRequest(orderId);
}
async function confirmClientActRequest(orderId) {
    try {
        const r = await clientApi('/api/client/confirm-act', 'POST', {order_id: orderId});
        if (tg && typeof tg.showAlert === 'function') tg.showAlert(r.message || 'Заявка закрыта.');
        await showMyOrders();
    } catch (e) {
        if (e.status===409) { await showMyOrders(); showAlert(e.message || 'Не удалось подтвердить акт. Проверьте статус заявки.'); }
        else showAlert(e.message);
    }
}

// Paynet is an external payment page, not proof of payment. Never infer
// payment_status from act confirmation or from opening this link.
function btClientPaynetUrl(record){
    if(!record || String(record.payment_status||'').toLowerCase()==='paid')return '';
    try{
        const u=new URL(String(record.paynet_url||''));
        if(u.protocol!=='https:'||!['app.paynet.uz','paynet.uz'].includes(u.hostname.toLowerCase())||u.username||u.password)return '';
        return u.href;
    }catch(_){return '';}
}
function btClientPaymentButton(record){
    const url=btClientPaynetUrl(record);
    if(!url)return '';
    const amount=Number(record.payment_due_sum??record.client_due_sum??record.final_price??record.price??0);
    return `<a class="btn bt-client-payment-link" href="${escapeClient(url)}" target="_blank" rel="noopener noreferrer">💳 Оплатить ремонт${amount>0?' — '+escapeClient(btActMoney(amount)):''}</a><p class="subtitle">Откроется Paynet Xolis. Переход по ссылке не означает подтверждение оплаты.</p>`;
}

let btClientActsCache=[];
const btActMoney=value=>new Intl.NumberFormat('ru-RU').format(Number(value||0))+' сум';
function btClientActStatus(status){
    const statuses={sending:'Отправляется',sent:'Отправлен клиенту',pending_client:'Ожидает регистрации клиента',pending_delivery:'Ожидает доставки',confirmed:'Подтверждён',confirmed_automatic:'Подтверждён автоматически',confirmed_auto:'Подтверждён автоматически',auto_confirmed:'Подтверждён автоматически',cancelled:'Отменён',draft:'Черновик'};
    return statuses[String(status||'').toLowerCase()]||'Статус уточняется';
}
function btWarrantyIndicator(act){
    const raw=String(act.guarantee_until||'');
    const m=/^(\d{2})\.(\d{2})\.(\d{4})$/.exec(raw);
    if(!m || Number(act.guarantee_days||0)===0)return '<span class="bt-act-warranty-muted">Гарантия по условиям акта</span>';
    const end=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),23,59,59);
    const active=Number.isFinite(end.getTime())&&end>=new Date();
    return `<span class="${active?'bt-warranty-active':'bt-warranty-expired'}">${active?'✓ Гарантия действует':'Гарантия истекла'}</span>`;
}
function btClientActTitle(act){
    return [act.device,act.brand,act.model].filter(Boolean).join(' ')||'Ремонт техники';
}
async function showMyActs() {
    setPage('📄 Акты и документы', '<p class="subtitle">Загружаем документы…</p>');
    try {
        const d=await clientApi('/api/client/dashboard');
        btClientActsCache=(d.acts||[]).filter(a=>a.status!=='cancelled');
        const content=btClientActsCache.length?btClientActsCache.map((a,index)=>`<div class="bt-client-act-card"><button type="button" class="bt-client-act-compact" onclick="showClientActPreviewByIndex(${index})" aria-label="Подробности акта ${escapeClient(a.number||'')}">
          <span class="bt-client-act-head"><strong>Акт № ${escapeClient(a.number||'—')}</strong><span class="bt-client-act-chevron">›</span></span>
          <span class="bt-client-act-device">${escapeClient(btClientActTitle(a))}</span>
          <span class="bt-client-act-meta"><strong>${escapeClient(btActMoney(a.final_price??a.price))}</strong><span>${btWarrantyIndicator(a)}</span></span>
          <span class="bt-client-act-status">${escapeClient(btClientActStatus(a.status))}</span>
        </button>${btClientPaymentButton(a)}</div>`).join(''):'<div class="card">Актов пока нет.</div>';
        setPage('📄 Акты и документы',`<div class="bt-client-act-list">${content}</div>`);
    } catch(e){setPage('📄 Акты и документы',`<div class="card error">${escapeClient(e.message)}</div>`);}
}
function showClientActPreviewByIndex(index){
    const act=btClientActsCache[index];
    if(!act){showMyActs();return;}
    showClientActPreview(act.number);
}
function showClientActPreview(number){
    btClientActPreviewNumber=number;
    const act=btClientActsCache.find(a=>String(a.number)===String(number));
    if(!act){showMyActs();return;}
    const works=Array.isArray(act.works)?act.works:[];
    setPage('📄 Подробности ремонта',`<article class="card bt-act-readable bt-client-act-detail">
      <h2>Акт № ${escapeClient(act.number||'—')}</h2>
      <p class="bt-client-act-detail-status">${escapeClient(btClientActStatus(act.status))}</p>
      <p><b>Техника:</b> ${escapeClient(btClientActTitle(act))}</p>
      <p><b>Выполненные работы:</b></p><ol>${works.map(w=>`<li>${escapeClient(typeof w==='string'?w:(w?.name||w?.title||'Работа'))}</li>`).join('')||'<li>Не указаны</li>'}</ol>
      <p><b>Стоимость ремонта:</b> ${escapeClient(btActMoney(act.price))}</p>
      ${Number(act.discount_amount||0)>0?`<p><b>Скидка:</b> −${escapeClient(btActMoney(act.discount_amount))}</p>`:''}
      <p><b>После скидки:</b> ${escapeClient(btActMoney(act.final_price??act.price))}</p>
      ${Number(act.cashback_used_tiyin||0)>0?`<p><b>Списано кешбэком:</b> −${escapeClient(btActMoney(Number(act.cashback_used_tiyin)/100))}</p>`:''}
      <p><b>К оплате клиентом:</b> ${escapeClient(btActMoney(act.client_due_sum??(Number(act.final_price??act.price)-Number(act.cashback_used_tiyin||0)/100)))}</p>
      <p><b>Гарантия:</b> ${escapeClient(act.guarantee_text||'—')} · до ${escapeClient(act.guarantee_until||'—')}</p>
      <p>${btWarrantyIndicator(act)}</p>
      ${btClientPaymentButton(act)}
      <button type="button" onclick="openClientActPdf('${escapeClient(number)}')">📄 Открыть PDF</button>
      <button type="button" class="secondary" onclick="downloadClientActPdf('${escapeClient(number)}')">↓ Сохранить PDF</button>
      <button type="button" class="back-btn" onclick="showMyActs()">← Все акты</button></article>`);
}
async function openClientActPdf(number){
    try{
        const r=await clientApi(`/api/client/acts/${encodeURIComponent(String(number))}/view-link`,'POST',{});
        const url=String(window.REMONT_ADVERTISER_API_BASE||'http://127.0.0.1:8767').replace(/\/$/,'')+r.path;
        const app=window.Telegram?.WebApp;
        if(app&&typeof app.openLink==='function')app.openLink(url,{try_instant_view:false});
        else window.open(url,'_blank','noopener,noreferrer');
    }catch(e){showAlert(e.message)}
}
async function downloadClientActPdf(number){
    try{
        const base=String(window.REMONT_ADVERTISER_API_BASE||'http://127.0.0.1:8767').replace(/\/$/,'');
        const link=await clientApi(`/api/client/acts/${encodeURIComponent(String(number))}/view-link`,'POST',{});
        const r=await fetch(base+link.path,{cache:'no-store'});
        if(!r.ok){const err=await r.json().catch(()=>({}));throw Error(err.error||'PDF недоступен')}
        const blob=await r.blob(),url=URL.createObjectURL(blob);
        const a=document.createElement('a');a.href=url;a.download=`Akt_${String(number).replace(/[^a-zA-Z0-9_-]/g,'_')}.pdf`;
        document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(e){showAlert(e.message)}
}

function showEnterPromo() {
    // Promo codes must remain usable even when referrals are disabled.
    setPage('🎟️ Промокоды', '<div class="card"><label>Введите промокод</label><input id="promo_code" placeholder="REMONT10" maxlength="64" autocapitalize="characters"><button id="promoSubmit" onclick="submitPromoFromApp()">Активировать</button><p id="promoStatus" class="subtitle"></p></div><div class="card" id="btReferralPanel" hidden></div>');
    clientApi('/api/client/referral').then(r=>btRenderReferralPanel(document.getElementById('btReferralPanel'),r))
       .catch(()=>{const box=document.getElementById('btReferralPanel');if(box){box.hidden=true;box.replaceChildren();}});
}

async function btCopyReferralLink() {
    const text=document.getElementById('btReferralLink')?.value||''; if(!text)return;
    try { await navigator.clipboard.writeText(text); showAlert('Ссылка скопирована.'); }
    catch(_) { document.getElementById('btReferralLink')?.select(); showAlert('Выделена ссылка — скопируйте её.'); }
}
function btShareReferralLink(){
    const link=document.getElementById('btReferralLink')?.value||''; if(!link)return;
    const share='https://t.me/share/url?url='+encodeURIComponent(link)+'&text='+encodeURIComponent('Приглашаю в ТехСервис!');
    if(tg?.openTelegramLink)tg.openTelegramLink(share);else window.open(share,'_blank','noopener');
}
async function submitPromoFromApp() {
    const code = (document.getElementById('promo_code')?.value || '').trim().toUpperCase();
    const status = document.getElementById('promoStatus');
    if (!code) { status.textContent = 'Введите промокод.'; return; }
    try { const r = await clientApi('/api/client/promo', 'POST', {code}); status.textContent = r.message || 'Промокод активирован.'; status.className = 'notice'; }
    catch (e) { status.textContent = e.message; status.className = 'error'; }
}

async function showProfile() {
    setPage('👤 Профиль', '<p class="subtitle">Загружаем профиль…</p>');
    try {
        const d = await clientApi('/api/client/profile'); const p = d.profile || {};
        setPage('👤 Профиль', `<form id="profileForm" class="card">${p.public_name?`<p class="notice"><b>Ваш номер в ТехСервис:</b> ${escapeClient(p.public_name)}</p>`:''}<label>ФИО</label><input name="name" required minlength="2" value="${escapeClient(p.name || '')}"><label>Телефон</label><input name="phone" type="tel" required value="${escapeClient(p.phone || '')}"><label>Пол</label><select name="gender"><option value="">Не указан</option><option ${p.gender==='Мужской'?'selected':''}>Мужской</option><option ${p.gender==='Женский'?'selected':''}>Женский</option></select><label>Дата рождения (ДД.ММ.ГГГГ)</label><input name="birth_date" inputmode="numeric" pattern="[0-9.]*" placeholder="25.04.1995" value="${escapeClient(p.birth_date || '')}"><label>ПИНФЛ (14 цифр)</label><input name="pinfl" inputmode="numeric" maxlength="14" value="${escapeClient(p.pinfl || '')}"><button type="submit">Сохранить профиль</button><p id="profileStatus" class="subtitle"></p></form><button type="button" class="secondary" onclick="showClientFAQ()">♧ F.A.Q. — Помощь</button><p class="subtitle">При активной рассрочке изменение профиля блокируется до полного погашения.</p>`);
        document.getElementById('profileForm').addEventListener('submit', saveClientProfile);
    } catch (e) {
        let p={}; try{p={name:localStorage.getItem('remont_bt_name')||'',phone:localStorage.getItem('remont_bt_phone')||''};}catch(_){}
        renderLocalProfile(p, 'Данные сохранены локально, сервер пока недоступен.');
    }
}
function renderLocalProfile(p, note='') {
    setPage('👤 Профиль', `<form id="profileForm" class="card"><p class="subtitle">${escapeClient(note)}</p><label>ФИО</label><input name="name" required minlength="2" value="${escapeClient(p.name||'')}"><label>Телефон</label><input name="phone" type="tel" required value="${escapeClient(p.phone||'')}"><label>Пол</label><select name="gender"><option value="">Не указан</option><option ${p.gender==='Мужской'?'selected':''}>Мужской</option><option ${p.gender==='Женский'?'selected':''}>Женский</option></select><label>Дата рождения (ДД.ММ.ГГГГ)</label><input name="birth_date" inputmode="numeric" pattern="[0-9.]*" placeholder="25.04.1995" value="${escapeClient(p.birth_date||'')}"><label>ПИНФЛ (14 цифр)</label><input name="pinfl" inputmode="numeric" maxlength="14" value="${escapeClient(p.pinfl||'')}"><button type="submit">Сохранить профиль</button><p id="profileStatus" class="subtitle"></p></form>`);
    document.getElementById('profileForm').addEventListener('submit',saveClientProfile);
}
async function saveClientProfile(event) {
    event.preventDefault(); const f = new FormData(event.currentTarget); const status = document.getElementById('profileStatus');
    const data = Object.fromEntries(f.entries()); data.name=String(data.name||'').trim(); data.phone=cleanPhone(data.phone);
    if(data.name.length<2||!validPhone(data.phone)){status.textContent='Проверьте ФИО и номер +998XXXXXXXXX.';status.className='error';return;}
    try { localStorage.setItem('remont_bt_name',data.name); localStorage.setItem('remont_bt_phone',data.phone); } catch(_){}
    try {
      const r = await clientApi('/api/client/profile', 'POST', data);window.RemontMobile?.clearDirty(); status.textContent = r.message || 'Профиль сохранён на сервере.'; status.className = 'notice';
    } catch (e) {
      if(typeof queueOperation==='function') queueOperation({event:'register_client',client_name:data.name,client_phone:data.phone,client_registration_id:getClientRegistrationId(data.phone),client_registration_no:getClientRegistrationNo(data.phone)});
      status.textContent='Данные сохранены на устройстве и поставлены в очередь. Передайте очередь через кнопку внизу приложения.'; status.className='notice';
    }
}

let btChatAutoTimer = null;
let btChatBlobUrls = [];
function btStopChatRefresh() {
    if(btChatAutoTimer){clearInterval(btChatAutoTimer);btChatAutoTimer=null;}
    btChatBlobUrls.forEach(url=>URL.revokeObjectURL(url));btChatBlobUrls=[];
}
function btChatAuthHeaders(){
    const headers={};
    const initData=String(window.Telegram?.WebApp?.initData||'');
    const query=new URLSearchParams(location.search);
    const uid=query.get('session_uid'),exp=query.get('session_exp'),sig=query.get('session_sig');
    if(initData)headers['X-Telegram-Init-Data']=initData;
    if(uid&&exp&&sig)headers['X-Remont-Session']=`${uid}:${exp}:${sig}`;
    if(!Object.keys(headers).length)throw new Error('Откройте чат через кнопку Telegram.');
    return headers;
}
async function btLoadChatMedia(container, mediaId, kind){
    if(!container || !container.isConnected || !/^[a-f0-9]{32}$/.test(mediaId))return;
    try{
        const base=String(window.REMONT_ADVERTISER_API_BASE||'').replace(/\/$/,'');
        const res=await fetch(`${base}/api/chat/media/${encodeURIComponent(mediaId)}`,{headers:btChatAuthHeaders(),cache:'no-store'});
        if(!res.ok)throw new Error('Не удалось получить вложение');
        const blob=await res.blob();
        if(!container.isConnected)return;
        const url=URL.createObjectURL(blob);btChatBlobUrls.push(url);
        container.innerHTML='';
        const media=document.createElement(kind==='video'?'video':'img');
        media.src=url;media.className='bt-chat-media';
        if(kind==='video'){media.controls=true;media.preload='metadata';}
        media.alt=kind==='photo'?'Фото из переписки':'Видео из переписки';
        container.appendChild(media);
    }catch(e){if(container.isConnected)container.textContent=e.message;}
}
function btChatBubble(m){
    const mine=m.sender_role==='client' || (m.sender_role!=='master' && String(m.from_id)===String(tg?.initDataUnsafe?.user?.id||currentClientTelegramId));
    const media=String(m.media_id||'');const kind=m.type==='video'?'video':m.type==='photo'?'photo':'';
    return `<div class="bt-chat-bubble ${mine?'mine':'theirs'}"><div class="bt-chat-sender">${mine?'Вы':'Мастер'}</div>`+
        (m.text?`<p>${escapeClient(m.text)}</p>`:'')+
        (kind&&/^[a-f0-9]{32}$/.test(media)?`<div class="bt-chat-media-slot" data-media-id="${media}" data-media-kind="${kind}">Загружаем ${kind==='photo'?'фото':'видео'}…</div>`:'')+
        `<small>${escapeClient(String(m.created_at||'').replace('T',' ').slice(0,16))}</small></div>`;
}
let btClientChatInFlight=false;
async function btRefreshClientChat(silent=false){
    if(!document.getElementById('btChatHistory')||btClientChatInFlight)return;
    btClientChatInFlight=true;
    try{
        const d=await btPollClientDashboard();
        const rows=Array.isArray(d.messages)?d.messages:[];
        const history=document.getElementById('btChatHistory');if(!history)return;
        const fingerprint=rows.map(m=>`${m.id}:${m.media_id||''}`).join('|');
        if(history.dataset.fingerprint===fingerprint)return;
        btChatBlobUrls.forEach(url=>URL.revokeObjectURL(url));btChatBlobUrls=[];
        history.dataset.fingerprint=fingerprint;
        history.innerHTML=rows.length?rows.map(btChatBubble).join(''):'<p class="subtitle">Пока нет сообщений. Напишите мастеру прямо здесь.</p>';
        for(const slot of history.querySelectorAll('[data-media-id]'))btLoadChatMedia(slot,slot.dataset.mediaId,slot.dataset.mediaKind);
        // Polling обновляет только историю сообщений. PDF здесь не создаём и не скачиваем.
    }catch(e){
        if(!silent){
            const history=document.getElementById('btChatHistory');
            if(history)history.innerHTML=`<p class="subtitle">${escapeClient(e.message||'Чат временно недоступен')}</p>`;
        }
        const status=document.getElementById('messageStatus');
        if(status && !silent)status.textContent=e.message||'Не удалось загрузить чат.';
    }finally{btClientChatInFlight=false;}
}
async function showMessages(){
    btStopChatRefresh();
    setPage('💬 Живой чат',`<section class="bt-chat-shell"><div id="btChatHistory" class="bt-chat-history"><p class="subtitle">Загружаем переписку…</p></div>
    <form class="bt-chat-compose" onsubmit="event.preventDefault();sendClientMessage()">
    <label for="masterMessage">Сообщение мастеру</label><textarea id="masterMessage" maxlength="1500" rows="2" placeholder="Напишите сообщение…"></textarea>
    <div class="bt-chat-compose-actions"><label class="bt-chat-attach" for="clientChatFile">＋ Фото / видео</label><input id="clientChatFile" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onchange="btDescribeChatFile()" hidden><button id="clientChatSend" type="submit">➤ Отправить</button></div>
    <p id="clientChatFileName" class="subtitle"></p><p id="messageStatus" role="status" class="subtitle"></p></form></section>`);
    await btRefreshClientChat();
    btChatAutoTimer=setInterval(()=>{if(document.hidden)return;if(document.getElementById('btChatHistory'))btRefreshClientChat(true);else btStopChatRefresh();},12000);
}
function btDescribeChatFile(){
    const file=document.getElementById('clientChatFile')?.files?.[0];
    const target=document.getElementById('clientChatFileName');
    if(target)target.textContent=file?`${file.name} · ${(file.size/1048576).toFixed(1)} МБ (максимум 6 МБ)`:' ';
}
function btFileToBase64(file){
    return new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onerror=()=>reject(new Error('Не удалось прочитать файл.'));
        reader.onload=()=>resolve(String(reader.result||'').split(',')[1]||'');
        reader.readAsDataURL(file);
    });
}
async function sendClientMessage(){
    const field=document.getElementById('masterMessage'),status=document.getElementById('messageStatus'),btn=document.getElementById('clientChatSend');
    const file=document.getElementById('clientChatFile')?.files?.[0];
    const text=String(field?.value||'').trim();
    if(!text&&!file){status.textContent='Напишите сообщение или добавьте файл.';return;}
    if(file&&file.size>6*1024*1024){status.textContent='Фото или видео должно быть не больше 6 МБ.';return;}
    btn.disabled=true;status.className='subtitle';status.textContent='Отправляем…';
    try{
        let response;
        if(file){
            const allowed=['image/jpeg','image/png','image/webp','video/mp4','video/webm'];
            if(!allowed.includes(file.type))throw new Error('Выберите JPG, PNG, WebP, MP4 или WebM.');
            const content=await btFileToBase64(file);
            response=await clientApi('/api/client/message-media','POST',{text,media_type:file.type,file_name:file.name,data:content});
        }else response=await clientApi('/api/client/message','POST',{text});
        status.textContent=response.message||'Сообщение сохранено.';status.className='notice';
        if(field)field.value='';const input=document.getElementById('clientChatFile');if(input)input.value='';
        btDescribeChatFile();window.RemontMobile?.clearDirty();await btRefreshClientChat();
    }catch(e){status.textContent=e.message;status.className='error';}
    finally{if(btn?.isConnected)btn.disabled=false;}
}
function escapeClient(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }


// ============ ФОРМАТИРОВАНИЕ ТЕЛЕФОНА ============

function formatClientPhone(value) {
    const d = String(value || "").replace(/\D/g, "").slice(0, 12);

    if (!d) return "";

    if (!d.startsWith("998")) return "+" + d;

    return "+998" +
        (d.length > 3 ? " " + d.slice(3, 5) : "") +
        (d.length > 5 ? " " + d.slice(5, 8) : "") +
        (d.length > 8 ? " " + d.slice(8, 10) : "") +
        (d.length > 10 ? " " + d.slice(10) : "");
}

function attachPhoneMask(input, onInput) {
    if (!input) return;

    input.addEventListener("input", e => {
        e.target.value = formatClientPhone(e.target.value);
        if (onInput) onInput();
    });
}

// ============ ПЕРВИЧНАЯ РЕГИСТРАЦИЯ ============

function showRegistrationScreen() {
    window.RemontMobile?.enter('client/registration',()=>showRegistrationScreen());
    document.body.innerHTML = `
        <h1>👤 Регистрация клиента</h1>
        <p class="subtitle">Введите ФИО и телефон, чтобы продолжить оформление заявки.</p>

        <div class="card">
            <label>Ваше имя / ФИО *</label>
            <input
                id="client_name"
                placeholder="Введите ФИО"
                autocomplete="off"
                autocapitalize="words"
                spellcheck="false"
            >

            <label>Номер телефона *</label>
            <input
                id="client_phone"
                type="tel"
                inputmode="tel"
                placeholder="+998 90 123 45 67"
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
            >
        </div>

        <button id="registrationContinue" onclick="submitRegistration()">
            Сохранить
        </button>
        <p id="registrationStatus" class="subtitle" role="status"></p>
    `;

    // Это экран первичной регистрации из /start: поля всегда пустые.
    // Не используем localStorage/автозаполнение браузера, чтобы на общем или
    // тестовом телефоне данные предыдущего клиента не попали в новую заявку.
    const phoneInput = document.getElementById("client_phone");
    document.getElementById("client_name").value = "";
    phoneInput.value = "";
    attachPhoneMask(phoneInput);
}

// Быстрые адреса принадлежат конкретному Telegram ID. GPS-позицию не сохраняем.
function btClientAddressStorageKey(){
    return currentClientTelegramId ? 'remont_bt_addresses_v1_'+currentClientTelegramId : '';
}
function btSavedAddresses(){
    const key=btClientAddressStorageKey();if(!key)return {};
    try{const data=JSON.parse(localStorage.getItem(key)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch(_){return {};}
}
function btAddressOptions(){
    const addresses=btSavedAddresses();
    return Object.entries({home:'Дом',work:'Работа'}).filter(([key])=>addresses[key]?.house)
        .map(([key,label])=>`<option value="${key}">${label} · ${escapeClient(addresses[key].house)}</option>`).join('');
}
function btUseSavedAddress(){
    const choice=document.getElementById('btSavedAddressPicker')?.value;
    const saved=btSavedAddresses()[choice];if(!saved)return;
    document.getElementById('house').value=saved.house||'';
    document.getElementById('apartment').value=saved.apartment||'';
    const status=document.getElementById('location_status');
    if(status)status.textContent='Адрес заполнен. Для отправки новой GPS-точки нажмите «Отправить мою локацию».';
}
function btSaveCurrentAddress(which){
    const key=btClientAddressStorageKey();
    if(!key)return showAlert('Откройте приложение через Telegram для сохранения адреса.');
    const house=String(document.getElementById('house')?.value||'').trim();
    const apartment=String(document.getElementById('apartment')?.value||'').trim();
    if(!house)return showAlert('Сначала укажите дом.');
    try{
        const addresses=btSavedAddresses();addresses[which]={house,apartment};
        localStorage.setItem(key,JSON.stringify(addresses));
        const picker=document.getElementById('btSavedAddressPicker');
        if(picker){picker.innerHTML='<option value="">— Выбрать адрес —</option>'+btAddressOptions();picker.value=which;}
        const status=document.getElementById('btAddressSaveStatus');
        if(status)status.textContent='Адрес сохранён на этом устройстве (без GPS).';
    }catch(_){showAlert('Не удалось сохранить адрес на устройстве.');}
}
let btAreaUserTouched=false;
// Регион выбирается клиентом при первом оформлении заявки, а затем хранится
// в его серверном профиле. localStorage — только ускоряющий кеш, не источник прав.
function btOrderTerritoryKey(){
    return currentClientTelegramId ? 'tehservis_client_area_v1_'+currentClientTelegramId : '';
}
function btSavedOrderTerritory(){
    const key=btOrderTerritoryKey(); if(!key)return null;
    try{
        const saved=JSON.parse(localStorage.getItem(key)||'null');
        if(saved && Object.hasOwn(btMapTerritories,saved.region))return {region:saved.region,district:saved.district||''};
    }catch(_){}return null;
}
function btStoreOrderTerritory(region,district){
    const key=btOrderTerritoryKey();
    if(!key || !Object.hasOwn(btMapTerritories,region))return;
    try{localStorage.setItem(key,JSON.stringify({region,district}));}catch(_){}
}
function btAreaRefreshPicker(id){
    const el=document.getElementById(id);if(!el)return;
    document.getElementById(id+'StyledPicker')?.remove();
    delete el.dataset.enhanced;
    el.classList.remove('bt-enhanced-native-select');
    el.removeAttribute('style');
    btRenderStyledClientPicker(id);
}
// Customer selects one territory only. District is automatically derived from the map.
function btAreaShowEditor(){
    const controls=document.getElementById('btOrderTerritoryControls');
    if(controls)controls.hidden=false;
    const summary=document.getElementById('btOrderTerritorySummary');
    if(summary)summary.hidden=true;
}
function btAreaRenderState(){
    const summary=document.getElementById('btOrderTerritorySummary');
    const edit=document.getElementById('btOrderTerritoryControls');
    if(!summary||!edit)return;
    const valid=Object.hasOwn(btMapTerritories,orderData.serviceRegion);
    summary.hidden=!valid;
    edit.hidden=valid;
    if(valid)summary.textContent='📍 '+orderData.serviceRegion;
    btClientUpdateSubmitGlow();
}
function btAreaSet(region,_district='',{resetMap=true}={}){
    if(!Object.hasOwn(btMapTerritories,region))return false;
    if(resetMap && orderData.serviceRegion!==region){
        orderData.location=null;orderData.mapAddress='';orderData.serviceDistrict='';
        const status=document.getElementById('location_status');
        if(status){status.textContent='Город / область изменены. Подтвердите точку ремонта на карте заново.';status.style.color='#888';}
    }
    orderData.serviceRegion=region;
    const sel=document.getElementById('btOrderRegion');
    if(sel && sel.value!==region){sel.value=region;btAreaRefreshPicker('btOrderRegion');}
    btAreaRenderState();return true;
}
function btAreaRegionChanged(){
    btAreaUserTouched=true;
    const region=document.getElementById('btOrderRegion')?.value||'';
    if(!Object.hasOwn(btMapTerritories,region)){
        orderData.serviceRegion='';orderData.serviceDistrict='';
        orderData.location=null;orderData.mapAddress='';btAreaRenderState();return;
    }
    btAreaSet(region,'',{resetMap:true});
}
function btAreaInitialize(){
    const select=document.getElementById('btOrderRegion');if(!select)return;
    select.replaceChildren(new Option('— Выберите город / область —',''));
    for(const region of Object.keys(btMapTerritories))select.add(new Option(region,region));
    btAreaRefreshPicker('btOrderRegion');
    const saved=btSavedOrderTerritory();
    if(saved)btAreaSet(saved.region,'',{resetMap:false});
    else btAreaRenderState();
}
// Примерные центры регионов для стартового масштаба карты (не адрес ремонта).
const btRegionMapCenters={
    'Ташкент (город)':[41.30,69.24], 'Ташкентская область':[41.47,69.59],
    'Андижанская область':[40.78,72.34], 'Бухарская область':[39.77,64.42],
    'Джизакская область':[40.12,67.84], 'Кашкадарьинская область':[38.86,65.79],
    'Навоийская область':[40.10,65.37], 'Наманганская область':[41.00,71.67],
    'Самаркандская область':[39.65,66.96], 'Сурхандарьинская область':[37.23,67.28],
    'Сырдарьинская область':[40.49,68.79], 'Ферганская область':[40.38,71.79],
    'Хорезмская область':[41.55,60.63], 'Республика Каракалпакстан':[42.46,59.61]
};

// ============ НОВАЯ ЗАЯВКА ============

function showNewOrder() {
    if(!btLegalApproved){void btLegalGate(clientApi,showNewOrder,"client");return;}
    window.RemontMobile?.enter('client/new-order',()=>showNewOrder());
    btOrderOperationId=uuidV4();
    btAreaUserTouched=false;
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

    document.body.classList.add('bt-inner-page', 'bt-order-page');
    document.body.innerHTML = `
        <button class="back-btn" onclick="renderClientMenu()">← Назад</button>
        <h1>📝 Новая заявка</h1>
        <p class="subtitle">Заполните данные — мастер свяжется</p>

        <div class="card" id="clientIdentityCard" style="display:none">
            <label for="client_name">Ваше ФИО (только при первой заявке)</label>
            <input id="client_name" maxlength="150" placeholder="Введите ФИО" autocomplete="name" autocapitalize="words">
        </div>

        <div class="card bt-client-territory-card" id="btClientAreaCard">
            <div class="bt-client-territory-header"><strong>📍 Ваш город / область</strong><button type="button" onclick="btAreaShowEditor()">Изменить</button></div>
            <p class="subtitle">Укажите, где нужен ремонт. Это ограничит поиск мастеров и поможет карте находить адрес.</p>
            <p id="btOrderTerritorySummary" class="bt-client-territory-summary" hidden></p>
            <div id="btOrderTerritoryControls">
                <label for="btOrderRegion">Город / область *</label>
                <select id="btOrderRegion" class="bt-client-select" onchange="btAreaRegionChanged()"><option value="">— Выберите —</option></select>
            </div>
        </div>

        <div class="card">
            <label for="service_direction">Направление услуги</label>
            <select id="service_direction" class="bt-client-select" onchange="btServiceDirectionChanged()">
                <option value="appliance">Ремонт бытовой техники</option>
                <option value="computer">Ремонт ПК и периферии</option>
                <option value="installation">Монтаж / демонтаж</option>
            </select>
            <label for="device">Вид техники / услуга</label>
            <select id="device" class="bt-client-select" onchange="onDeviceChange()"></select>

            <div id="device_custom_wrap" style="display:none;margin-top:10px;">
                <label>Укажите вид техники</label>
                <input id="device_custom" placeholder="Например: Пылесос" autocomplete="off">
            </div>

            <label>Бренд</label>
            <select id="brand" class="bt-client-select" onchange="onBrandChange()">
                <option value="">— Выберите —</option>
                <option value="LG">LG</option>
                <option value="Samsung">Samsung</option>
                <option value="Indesit">Indesit</option>
                <option value="Bosch">Bosch</option>
                <option value="Атлант">Атлант</option>
                <option value="__other__">✏️ Другое (ввести вручную)</option>
            </select>

            <div id="brand_custom_wrap" style="display:none;margin-top:10px;">
                <label>Укажите бренд</label>
                <input id="brand_custom" placeholder="Например: Whirlpool" autocomplete="off">
            </div>

        </div>

        <div class="card">
            <label>Что не работает?</label>
            <textarea id="problem" placeholder="Например: не сливает воду, шумит при отжиме..." maxlength="500"></textarea>
        </div>

        <div class="card">
            <label>Когда удобно приехать?</label>
            <select id="when_date" class="bt-client-select bt-date-select">
                ${dateOptions.join('')}
            </select>

            <label style="margin-top:14px;">Время</label>
            <select id="when_time" class="bt-client-select bt-time-select">
                <option value="">— Выберите —</option>
                ${timeOptions.join('')}
            </select>
        </div>

        <div class="card">
            <label for="house">Адрес ремонта</label>
            <div class="bt-client-address-row"><div><label for="house">Дом</label><input id="house" maxlength="40" placeholder="15" autocomplete="off" oninput="btClientManualAddressChanged()"></div><div><label for="apartment">Кв.</label><input id="apartment" maxlength="80" placeholder="42" autocomplete="off"></div></div>
            <p class="subtitle">Укажите дом и квартиру. На карте найдите адрес или нажмите «Моя локация».</p>
            <button type="button" onclick="btOpenAddressMap()" class="bt-map-open">🗺️ Открыть карту</button>

            <p id="location_status" style="color:#888;font-size:13px;margin-top:8px;">
                Точка ремонта не выбрана. Откройте карту.
            </p>
        </div>

        <div class="card promo-card" id="orderPromoCard">
            <label>🎟️ Промокод</label>
            <input id="order_promo_code" placeholder="Например, REMONT10" maxlength="64" autocapitalize="characters" autocomplete="off" style="text-transform:uppercase" oninput="this.dataset.btEdited='1'">
            <button type="button" id="orderPromoCheck" onclick="checkOrderPromo()">Проверить промокод</button>
            <p id="orderPromoStatus" class="subtitle">Активный промокод привяжется к вашему аккаунту автоматически при отправке заявки.</p>
        </div>

        <button id="submit" class="bt-client-submit bt-client-submit-glow bt-field-empty" onclick="submitOrder()">📤 Отправить заявку</button>
    ` + btClientBottomNav();
    orderData.location=null;
    orderData.mapAddress='';
    orderData.serviceRegion='';
    orderData.serviceDistrict='';
    btEnhanceClientOrderPickers();
    btServiceDirectionChanged();
    btAreaInitialize();
    btClientBindOrderValidation();

    try {
        document.getElementById('house').value = isNewClientFlow
            ? '' : (localStorage.getItem('remont_bt_house') || '');

        document.getElementById('apartment').value = isNewClientFlow
            ? '' : (localStorage.getItem('remont_bt_apartment') || '');

        const hasNewClientIdentity = isNewClientFlow &&
            localStorage.getItem('remont_bt_identity_saved') === '1';
        const savedName = isNewClientFlow
            ? (hasNewClientIdentity ? (localStorage.getItem('remont_bt_name') || '') : '')
            : (localStorage.getItem('remont_bt_name') || (tg.initDataUnsafe?.user?.first_name || ''));

        document.getElementById('client_name').value = savedName;
        const identityCard=document.getElementById('clientIdentityCard');
        const firstNameDone=localStorage.getItem('remont_bt_customer_name_confirmed')==='1';
        identityCard.style.display=firstNameDone?'none':'block';
        btClientUpdateSubmitGlow();
        clientApi('/api/client/profile').then(d=>{
            const profile=d.profile||{};
            if(!document.getElementById('btClientAreaCard'))return;
            if(!btAreaUserTouched && profile.service_region){
                if(btAreaSet(profile.service_region,profile.service_district,{resetMap:true}))
                    btStoreOrderTerritory(profile.service_region,profile.service_district);
            }
            if(profile.name)document.getElementById('client_name').value=profile.name;
            // Only the server's registered-client promo is trusted, not a code cached from another user.
            // Do not override a code the customer is actively editing.
            const promoInput=document.getElementById('order_promo_code');
            if(promoInput && !promoInput.value.trim() && !promoInput.dataset.btEdited && profile.promocode){
                promoInput.value=String(profile.promocode).trim().toUpperCase();
                promoInput.dataset.btAutofilled='1';
                void checkOrderPromo();
            }
            if(profile.name_confirmed){
                identityCard.style.display='none';
                localStorage.setItem('remont_bt_customer_name_confirmed','1');
            }else identityCard.style.display='block';
        }).then(()=>btClientUpdateSubmitGlow()).catch(()=>{});
    } catch (e) {
        console.error('Ошибка инициализации формы клиента:', e);
    }
}

// ============ РЕГИСТРАЦИЯ КЛИЕНТА ============

async function submitRegistration() {
    const nameEl = document.getElementById('client_name');
    const phoneEl = document.getElementById('client_phone');
    const button = document.getElementById('registrationContinue');
    const status = document.getElementById('registrationStatus');
    const name = (nameEl ? nameEl.value : '').trim();
    const phone = cleanPhone(phoneEl ? phoneEl.value : '');
    if (name.length < 2) return showAlert('Введите ФИО не короче 2 символов.');
    if (!validPhone(phone)) return showAlert('Введите корректный номер +998XXXXXXXXX.');

    const data = {
        name, phone,
        client_registration_id: getClientRegistrationId(phone),
        client_registration_no: getClientRegistrationNo(phone)
    };
    if (button) button.disabled = true;
    if (status) { status.textContent = 'Сохраняем регистрацию на сервере…'; status.className = 'subtitle'; }

    try {
        // Registration is complete only after the server confirms a successful write.
        const result = await clientApi('/api/client/register', 'POST', data);
        localStorage.setItem('remont_bt_name', name);
        localStorage.setItem('remont_bt_phone', phone);
        localStorage.setItem('remont_bt_registered', '1');
        localStorage.setItem('remont_bt_identity_saved', '1');
        if (currentClientTelegramId) localStorage.setItem('remont_bt_profile_uid', currentClientTelegramId);
        window.RemontMobile?.clearDirty();
        showAlert(result.message || 'Регистрация сохранена на сервере.');
        renderClientMenu();
    } catch (err) {
        // Do not mark the client registered and do not silently put registration
        // into an offline queue: the client must know the server did not confirm it.
        if (button) button.disabled = false;
        if (status) {
            status.textContent = err.message || 'Не удалось сохранить регистрацию на сервере. Проверьте связь и повторите.';
            status.className = 'error';
        } else {
            showAlert(err.message || 'Не удалось сохранить регистрацию на сервере. Проверьте связь и повторите.');
        }
    }
}

const btClientPickerIcons={
    device:['🧺','❄️','🌬️','📦','🍽️','🧹','🧊','🚿','📺','🔧','✏️'],
    direction:['🏠','💻','🛠️'],
};
function btGetClientPickerIcon(selectId, option, index){
    const label=String(option?.textContent||'').trim();
    if(selectId==='device')return btClientPickerIcons.device[index]||'🔧';
    if(selectId==='service_direction')return btClientPickerIcons.direction[index]||'📂';
    if(selectId==='when_date')return '📅';
    if(selectId==='when_time')return '🕒';
    if(selectId==='brand'){
        if(option.value==='__other__')return '✏️';
        if(/не\s*применимо/i.test(label))return '—';
        const cleaned=label.replace(/[^A-Za-zА-Яа-яЁё0-9]/g,'').trim();
        return (cleaned[0]||'🏷').toUpperCase();
    }
    return '◉';
}
function btRenderStyledClientPicker(selectId){
    const native=document.getElementById(selectId);if(!native)return;
    const oldPicker=document.getElementById(selectId+'StyledPicker');
    if(oldPicker){oldPicker.remove();delete native.dataset.enhanced;}
    if(native.dataset.enhanced)return;
    const choices=[...native.options].filter(option=>option.value);
    const options=choices.map((option,i)=>{
        const cleanLabel=option.textContent.replace(/^\s*[📻🧺❄🌬✏️🛠💻🏠📅🕒]+\s*/u,'').trim();
        const icon=btGetClientPickerIcon(selectId, option, i);
        return `<button type="button" class="bt-client-picker-option" role="option" data-picker-value="${escapeClient(option.value)}" onclick="btChooseClientPicker('${selectId}',this)"><span class="bt-master-choice-icon">${escapeClient(icon)}</span><span>${escapeClient(cleanLabel)}</span><span aria-hidden="true">✓</span></button>`;
    }).join('');
    const summary=choices.find(o=>o.value===native.value)?.textContent||'Выберите вариант';
    const details=document.createElement('details');details.className='bt-client-picker';details.id=selectId+'StyledPicker';
    details.innerHTML=`<summary><span id="${selectId}StyledSummary">${escapeClient(summary)}</span><span aria-hidden="true">⌄</span></summary><div class="bt-client-picker-options" role="listbox">${options}</div>`;
    native.before(details);native.classList.add('bt-enhanced-native-select');native.dataset.enhanced='1';
}
function btChooseClientPicker(selectId,button){
    const native=document.getElementById(selectId);if(!native)return;
    native.value=button.dataset.pickerValue;
    btClientUpdateSubmitGlow();
    document.getElementById(selectId+'StyledPicker').open=false;
    document.getElementById(selectId+'StyledSummary').textContent=button.querySelector('span:nth-child(2)')?.textContent||native.value;
    for(const other of document.querySelectorAll(`#${selectId}StyledPicker .bt-client-picker-option`))other.classList.toggle('selected',other===button);
    native.dispatchEvent(new Event('change',{bubbles:true}));
}
function btEnhanceClientOrderPickers(){['service_direction','brand','when_date','when_time'].forEach(btRenderStyledClientPicker);}

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

// Ручной адрес имеет приоритет: GPS телефона не должен указывать на работу,
// если клиент вручную вводит адрес дома.
function btClientManualAddressChanged(){
    btClientUpdateSubmitGlow();
    const status=document.getElementById('location_status');
    if(status && !orderData.location)status.textContent='Выберите точку ремонта на карте.';
}
function btClientLocationSelected(lat,lon){
    orderData.location={lat:Number(lat),lon:Number(lon)};
    orderData.mapAddress='';
    btClientUpdateSubmitGlow();
    // Не смешиваем адрес предыдущей заявки с новой точкой GPS.
    const house=document.getElementById('house');
    const apartment=document.getElementById('apartment');
    // Номер дома и квартира остаются: GPS определяет точку, не квартиру.
    btClientUpdateSubmitGlow();
}

// Button glow reflects all required order fields; visual feedback only.
// Patch 04: same stable service codes as service_catalog.py (patch 02).
const BT_SERVICE_OPTIONS = {
  appliance: [
    ['washer','Стиральная машина'],['fridge','Холодильник'],
    ['air_conditioner','Кондиционер'],['microwave','Микроволновая печь'],
    ['dishwasher','Посудомоечная машина'],['vacuum','Пылесос'],
    ['ice_maker','Льдогенератор'],['water_heater','Водонагреватель'],
    ['tv_audio','ТВ / аудио / тюнер'],['other_appliance','Другая бытовая техника']
  ],
  computer: [
    ['windows_install','Установка Windows'],['desktop','Настольный ПК'],
    ['all_in_one','Моноблок'],['laptop','Ноутбук'],
    ['printer','Принтер'],['scanner','Сканер']
  ],
  installation: [
    ['install_air_conditioner','Монтаж кондиционера'],['remove_air_conditioner','Демонтаж кондиционера'],
    ['install_washer','Монтаж стиральной машины'],['remove_washer','Демонтаж стиральной машины'],
    ['install_gas_stove','Монтаж газовой плиты'],['remove_gas_stove','Демонтаж газовой плиты'],
    ['install_electric_stove','Монтаж электрической плиты'],['remove_electric_stove','Демонтаж электрической плиты'],
    ['install_water_heater','Монтаж водонагревателя'],['remove_water_heater','Демонтаж водонагревателя'],
    ['install_gas_boiler','Монтаж газового котла'],['remove_gas_boiler','Демонтаж газового котла']
  ]
};
function btServiceDirectionChanged(){
  const direction=document.getElementById('service_direction')?.value||'appliance';
  const select=document.getElementById('device'); if(!select)return;
  select.replaceChildren(new Option('— Выберите —',''));
  for(const [code,label] of (BT_SERVICE_OPTIONS[direction]||[])){
    const option=new Option(label,code); option.dataset.displayName=label; select.add(option);
  }
  const custom=document.getElementById('device_custom_wrap');if(custom)custom.style.display='none';
  document.getElementById('deviceStyledPicker')?.remove();
  select.classList.remove('bt-enhanced-native-select');
  delete select.dataset.enhanced;
  select.removeAttribute('style');
  btRenderStyledClientPicker('device');
  const directionSummary=document.getElementById('service_directionStyledSummary');
  const directionNative=document.getElementById('service_direction');
  if(directionSummary && directionNative){
    directionSummary.textContent=directionNative.options[directionNative.selectedIndex]?.textContent||'Выберите вариант';
  }
  btClientUpdateSubmitGlow();
}
function btClientUpdateSubmitGlow(){
    const btn=document.getElementById('submit');if(!btn)return;
    const value=id=>String(document.getElementById(id)?.value||'').trim();
    const device=value('device')==='__other__'?value('device_custom'):value('device');
    const brand=value('brand')==='__other__'?value('brand_custom'):value('brand');
    const identity=document.getElementById('clientIdentityCard');
    const nameOk=!identity||identity.style.display==='none'||value('client_name').length>=2;
    const loc=orderData.location;
    const gpsOk=loc&&Number.isFinite(Number(loc.lat))&&Number.isFinite(Number(loc.lon));
    const territoryOk=Object.hasOwn(btMapTerritories,orderData.serviceRegion);
    const ready=Boolean(nameOk&&device&&brand&&value('problem').length>=5&&value('when_date')&&value('when_time')&&gpsOk&&territoryOk);
    btn.classList.toggle('bt-field-ready',ready);btn.classList.toggle('bt-field-empty',!ready);
    for(const id of ['service_direction','device','brand','when_date','when_time']){
        const el=document.getElementById(id);if(!el)continue;
        const chosen=value(id);
        const ok=Boolean(chosen && (chosen!=='__other__' || value(id+'_custom')));
        // Styled <details> is a sibling of the hidden native select.
        const picker=document.getElementById(id+'StyledPicker');
        if(picker){
            picker.classList.toggle('bt-field-ready',ok);
            picker.classList.toggle('bt-field-empty',!ok);
        }
    }
}
function btClientBindOrderValidation(){
    const form=document.getElementById('submit')?.parentElement;if(!form)return;
    form.addEventListener('input',btClientUpdateSubmitGlow);
    form.addEventListener('change',btClientUpdateSubmitGlow);
    btClientUpdateSubmitGlow();
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
                        btClientLocationSelected(loc.latitude,loc.longitude);

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
            btClientLocationSelected(pos.coords.latitude,pos.coords.longitude);

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

// Проверка промокода в форме заявки: проверка не активирует и не списывает использование.
async function checkOrderPromo() {
    const input = document.getElementById('order_promo_code');
    const status = document.getElementById('orderPromoStatus');
    const button = document.getElementById('orderPromoCheck');
    const lang = window.currentMiniLang?.() || 'ru';
    const tr = (ru, uz, en) => lang === 'uz' ? uz : lang === 'en' ? en : ru;
    const code = (input?.value || '').trim().toUpperCase();
    if (!code) {
        if (status) { status.textContent = tr('Введите промокод.','Promokodni kiriting.','Enter a promo code.'); status.className = 'subtitle error'; }
        return false;
    }
    if (button) { button.disabled = true; button.textContent = tr('Проверяем…','Tekshirilmoqda…','Checking…'); }
    try {
        const r = await clientApi('/api/client/promo/check', 'POST', {code});
        const hours = Math.max(0, Number(r.expires_in_hours) || 0);
        const timeLeft = r.expires_at
          ? (hours >= 24
              ? tr(`Осталось ${Math.floor(hours/24)} дн. ${hours%24} ч.`, `${Math.floor(hours/24)} kun ${hours%24} soat qoldi.`, `${Math.floor(hours/24)} days ${hours%24} hours left.`)
              : tr(`Осталось ${hours} ч.`, `${hours} soat qoldi.`, `${hours} hours left.`))
          : tr('Срок действия не ограничен','Amal qilish muddati cheklanmagan','No expiration date');
        const usesLeft = (r.remaining_uses === null || r.remaining_uses === undefined)
          ? tr('Лимит: без персонального ограничения','Limit: shaxsiy cheklovsiz','Limit: no individual restriction')
          : tr(`Осталось использований для вас: ${r.remaining_uses}`, `Sizga ${r.remaining_uses} ta foydalanish qoldi`, `${r.remaining_uses} uses remaining for you`);
        if (status) {
            const discount = tr('Скидка','Chegirma','Discount');
            const message = tr('При отправке заявки код привяжется к аккаунту.', 'Buyurtma yuborilganda kod hisobingizga biriktiriladi.', 'The code will be linked to your account when you submit the request.');
            status.textContent = `✅ ${discount} ${r.discount_percent}% · ${usesLeft} · ${timeLeft}. ${message}`;
            status.className = 'notice';
        }
        return true;
    } catch (e) {
        if (status) {
            status.textContent = lang==='ru' ? (e.message || 'Не удалось проверить промокод.')
                : tr('Не удалось проверить промокод.', 'Promokodni tekshirib boʻlmadi. Kod va amal qilish muddatini tekshiring.', 'Unable to verify the promo code. Check the code and its validity.');
            status.className = 'subtitle error';
        }
        return false;
    } finally {
        if (button) { button.disabled = false; button.textContent = tr('Проверить промокод', 'Promokodni tekshirish', 'Check promo code'); }
    }
}

function confirmPromoContinue(message) {
    return new Promise(resolve => {
        if (tg && typeof tg.showConfirm === 'function') tg.showConfirm(message, resolve);
        else resolve(window.confirm(message));
    });
}

// ============ ОТПРАВКА ЗАЯВКИ ============

async function submitOrder() {
    const service_direction = document.getElementById('service_direction')?.value || 'appliance';
    const service_code = document.getElementById('device').value;
    let device = (BT_SERVICE_OPTIONS[service_direction] || []).find(row => row[0] === service_code)?.[1] || '';
    let brand = document.getElementById('brand').value;

    if (device === '__other__') {
        device = document.getElementById('device_custom').value.trim();
        if (!device) return showAlert('Укажите вид техники');
    }

    if (brand === '__other__') {
        brand = document.getElementById('brand_custom').value.trim();
        if (!brand) return showAlert('Укажите бренд');
    }

    const model = '';
    const problem = document.getElementById('problem').value.trim();
    const when_date = document.getElementById('when_date').value;
    const when_time = document.getElementById('when_time').value;
    const house = document.getElementById('house').value.trim();
    const apartment = document.getElementById('apartment').value.trim();
    const comment = '';

    const nameInput = document.getElementById('client_name');
    const phoneInput = null;

    const client_name = (nameInput ? nameInput.value : '').trim();
    const client_phone = cleanPhone(localStorage.getItem('remont_bt_phone') || '');
    const order_promo_code = (document.getElementById('order_promo_code')?.value || '').trim().toUpperCase();

    if (document.getElementById('clientIdentityCard')?.style.display !== 'none' && client_name.length < 2) {
        return showAlert('Введите имя клиента');
    }
    if(!validPhone(client_phone))return showAlert('Не удалось получить подтверждённый номер. Закройте приложение и откройте снова из Telegram.');

    if (!device) return showAlert('Выберите вид техники');
    if (!brand) return showAlert('Выберите бренд');

    if (!problem || problem.length < 5) {
        return showAlert('Опишите проблему');
    }

    if (!when_date) return showAlert('Выберите дату');
    if (!when_time) return showAlert('Выберите время');
    if(!Object.hasOwn(btMapTerritories,orderData.serviceRegion)){btAreaShowEditor();return showAlert('Выберите город / область для поиска мастеров.');}
    if (!orderData.location) return showAlert('Выберите точку ремонта на карте');

    try {
        localStorage.setItem('remont_bt_house', house);
        localStorage.setItem('remont_bt_apartment', apartment);
        if (client_name.length >= 2) localStorage.setItem('remont_bt_name', client_name);
        if (client_phone) localStorage.setItem('remont_bt_phone', client_phone);
    } catch (e) {
        console.warn('Не удалось сохранить данные локально:', e);
    }

    const data = {
        event: 'new_order',
        client_name: client_name,
        client_phone: client_phone,
        client_registration_id: getClientRegistrationId(
            client_phone,
            !isNewClientFlow
        ),
        client_registration_no: getClientRegistrationNo(
            client_phone,
            !isNewClientFlow
        ),
        device: device,
        service_direction: service_direction,
        service_code: service_code,
        brand: brand,
        model: model || '—',
        problem: problem,
        when_date: when_date,
        when_time: when_time,
        house: [orderData.mapAddress,house && ('дом '+house)].filter(Boolean).join(', ') || (house ? 'дом '+house : ''),
        apartment: apartment,
        comment: comment,
        promo_code: order_promo_code,
        location: orderData.location || null,
        service_region: String(orderData.serviceRegion||''),
        service_district: String(orderData.serviceDistrict||''),
    };

    // Даже если клиент не нажал «Проверить», сервер проверит и привяжет активный код
    // при обработке заявки. Неактивный/неизвестный код требует явного подтверждения.
    if (order_promo_code) {
        try {
            await clientApi('/api/client/promo/check', 'POST', {code: order_promo_code});
        } catch (e) {
            const proceed = await confirmPromoContinue(`⚠️ ${e.message || 'Промокод не активен.'}\n\nНажмите OK, чтобы продолжить создание заявки без этой скидки, или Отмена, чтобы вернуться и изменить промокод.`);
            if (!proceed) return;
            data.promo_code = '';
            data.promo_code_invalid_confirmed = true;
        }
    }

    // Marketplace eligibility is by REGION. The verified map district ranks ties only.
    const serviceRegion = String(orderData.serviceRegion || '').trim();
    const serviceDistrict = String(orderData.serviceDistrict || '').trim();
    if (service_code && serviceRegion) {
        try {
            const matching=await clientApi('/api/client/marketplace-masters?service_code='+encodeURIComponent(service_code)
                +'&region='+encodeURIComponent(serviceRegion)+'&district='+encodeURIComponent(serviceDistrict)
                +'&promo_code='+encodeURIComponent(data.promo_code || ''));
            const masters=matching.masters||[];
            const selected=await btChooseMarketplaceMaster(masters,matching.linked_deposit_limited_id||0);
            if(selected===null)return;
            if(selected==='linked'){
                data.master_search_mode='linked';
                data.service_region=serviceRegion;
                data.service_district=serviceDistrict;
            }else if(selected==='public'){
                data.marketplace_broadcast=true;
                data.service_region=serviceRegion;
                data.service_district=serviceDistrict;
            }else{
                data.selected_master_id=selected;
                data.service_region=serviceRegion;
                data.service_district=serviceDistrict;
            }
        }catch(e){return showAlert(e.message||'Не удалось получить список мастеров.');}
    }

    // Do not log client personal data in browser console.

    const btn = document.getElementById('submit');
    btn.textContent = '⏳ Отправка...';
    btn.disabled = true;

    // Submit through the authenticated API. Telegram WebApp.sendData works only
    // from reply-keyboard launches and must not be used for menu-button launches.
    data.operation_id=btOrderOperationId||uuidV4();
    try {
        const result=await clientApi('/api/client/order','POST',data);
        if(!result.ok)throw new Error('Сервер не подтвердил заявку.');
        if(client_name.length>=2){
            localStorage.setItem('remont_bt_customer_name_confirmed','1');
            localStorage.setItem('remont_bt_name',client_name);
        }
        localStorage.setItem('remont_bt_registered','1');
        btStoreOrderTerritory(orderData.serviceRegion,orderData.serviceDistrict);
        btOrderOperationId=null;
        // Остаёмся в Mini App: Telegram-чат не открывается автоматически.
        window.RemontMobile?.clearDirty();
        renderClientMenu();
        const notice=document.createElement('div');
        notice.className='bt-order-success-notice';
        notice.role='status';
        notice.textContent=`✓ Заявка ${result.order_id||''} сохранена. Мастер увидит её в кабинете.`;
        const anchor=document.querySelector('.bt-client-home .bt-client-promo-banner');
        if(anchor)anchor.insertAdjacentElement('afterend',notice);
        setTimeout(()=>{if(notice.isConnected)notice.remove();},9500);
    } catch(err) {
        // Keep operation_id for an idempotent retry if the response was lost.
        showAlert(err.message||'Не удалось отправить заявку. Проверьте связь и повторите.');
        if(btn?.isConnected){btn.textContent='📤 Отправить заявку';btn.disabled=false;}
    }

}

// ============ ПОЗВОНИТЬ ============

async function showCallMaster() {
    setPage('📞 Контакты мастера', '<p class="subtitle">Загружаем контакты…</p>');
    try {
        const d = await clientApi('/api/client/dashboard');
        const phone = String(d.master?.phone || '').trim();
        setPage('📞 Контакты мастера', phone ? `<div class="card"><p>${escapeClient(d.master?.name || 'Ваш мастер')} ${btMasterVerifiedBadge(d.master)}</p><a class="menu-btn" href="tel:${escapeClient(phone)}">Позвонить: ${escapeClient(phone)}</a></div>` : '<div class="card">Номер мастера пока не указан. Напишите мастеру через раздел сообщений.</div>');
    } catch (e) { setPage('📞 Контакты мастера', `<div class="card error">${escapeClient(e.message)}</div>`); }
}

// ============ СТАРТ ============

async function startRemontApp(){
  const role = clientUrlParams.get('role') || 'client';
  if (role === 'master_entry') {
    // The master entry button opens the application directly for new users.
    // If this Telegram account has since been approved, open the master cabinet instead.
    try {
      await clientApi('/api/master/dashboard');
      const target = new URL('index.html', location.href);
      target.searchParams.set('role', 'master');
      target.searchParams.set('appv', '20261020-master-flow-fix6');
      location.replace(target.href);
      return;
    } catch (_) {
      // Not approved (or temporarily unavailable): keep the application form available.
    }
    showMasterApplicationForm();
    return;
  }

  // Local storage is only a cache and may be stale/shared on the device.
  // Ask the server first; only a registered server profile may bypass registration.
  try {
    const d = await clientApi('/api/client/profile');
    const profile = d.profile || {};
    if (profile.phone) {
      try {
        localStorage.setItem('remont_bt_name', profile.name);
        localStorage.setItem('remont_bt_phone', profile.phone);
        localStorage.setItem('remont_bt_registered', '1');
        localStorage.setItem('remont_bt_identity_saved', '1');
        if (currentClientTelegramId) localStorage.setItem('remont_bt_profile_uid', currentClientTelegramId);
      } catch (_) {}
      if (clientUrlParams.get('new_order') === 'location') {
        const lat = Number(clientUrlParams.get('draft_lat'));
        const lon = Number(clientUrlParams.get('draft_lon'));
        if (Number.isFinite(lat) && Number.isFinite(lon) &&
            Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
          showNewOrder();
          btClientLocationSelected(lat, lon);
          const status = document.getElementById('location_status');
          if (status) status.textContent = '📍 Геолокация из Telegram добавлена к заявке.';
          return;
        }
      }
      const reassign=String(clientUrlParams.get('reassign_order')||'');
      if(/^ORD-[A-Z0-9]{10}$/.test(reassign)){
        await showMyOrders();
        void btClientReassignOrder(reassign);
        return;
      }
      renderClientMenu();
      return;
    }
  } catch (err) {
    // Never ask for personal details again just because the API is unavailable.
    document.body.innerHTML = '<div class="card"><h2>Не удалось открыть кабинет</h2><p class="subtitle">Проверьте подключение к серверу и попробуйте снова. Повторно вводить номер не нужно.</p><button onclick="location.reload()">Повторить</button></div>';
    console.warn('Client profile check failed:', err);
    return;
  }
  // Contact-first onboarding is performed in Telegram. Do not resurrect the
  // legacy manual registration form for an account without a server profile.
  document.body.innerHTML = '<div class="card"><h2>Подтвердите номер в Telegram</h2><p class="subtitle">Вернитесь в чат с ботом, нажмите /start и отправьте свой контакт кнопкой Telegram. Затем откройте кабинет снова.</p><button onclick="location.reload()">Проверить ещё раз</button></div>';
}
migrateLegacyMasterApplicationQueue();
startRemontApp();
startMasterApplicationAutoSync();

/* Live mandatory-field feedback. Event delegation supports dynamically rendered Mini App pages. */
(function(){
  function applicable(el){
    return el && el.matches && el.matches('input,select,textarea') &&
      (el.closest('.bt-master-act-form') || el.closest('.bt-order-page'));
  }
  function required(el){
    if(el.required) return true;
    if(!el.closest('.bt-order-page')) return false;
    return ['device','brand','problem','address','device_custom','brand_custom'].includes(el.id) &&
      el.offsetParent !== null;
  }
  function refresh(el){
    if(!applicable(el)) return;
    const isRequired=required(el);
    el.classList.toggle('bt-required-neon',isRequired);
    el.classList.remove('bt-field-empty','bt-field-ready');
    if(!isRequired || el.disabled || el.type==='hidden') return;
    const hasValue=String(el.value||'').trim().length>0;
    const valid=hasValue && (typeof el.checkValidity!=='function' || el.checkValidity());
    el.classList.add(valid?'bt-field-ready':'bt-field-empty');
  }
  document.addEventListener('input',function(e){refresh(e.target);},true);
  document.addEventListener('change',function(e){refresh(e.target);},true);
  const observer=new MutationObserver(function(){
    document.querySelectorAll('.bt-master-act-form input,.bt-master-act-form select,.bt-master-act-form textarea,.bt-order-page input,.bt-order-page select,.bt-order-page textarea').forEach(refresh);
  });
  function start(){observer.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();


// TEST PATCH: embedded address picker. Coordinates are only saved after explicit confirmation.
// TEST PATCH: center-fixed pin map. No coordinates are saved until confirmation.
// Address picker v12: the map is the only location selector.
// Search and geolocation position its center pin; confirmation reverse-geocodes
// the FINAL center and stores canonical region/district and the full address.
let btAddressMapInstance=null,btAddressMapPoint=null,btAddressMapLabel='';
let btMapLayers=null,btMapStyle='street',btMapRecognizing=false,btMapProgrammaticMove=false;
let btMapLastSearchQuery='';
let btMapSearchTicket=0;
function btMapUpdateCenter(){
    if(!btAddressMapInstance)return;
    const c=btAddressMapInstance.getCenter();
    btAddressMapPoint={lat:c.lat,lon:c.lng};
    const hint=document.getElementById('btMapHint');
    if(hint)hint.textContent=`Точка: ${c.lat.toFixed(6)}, ${c.lng.toFixed(6)} · Передвиньте карту, если нужно`;
    const btn=document.getElementById('btMapConfirm');
    if(btn&&!btMapRecognizing)btn.disabled=false;
}
function btMapSetLayer(style){
    if(!btAddressMapInstance||!btMapLayers)return;
    const next=style==='satellite'?'satellite':'street';
    if(btMapLayers[btMapStyle])btAddressMapInstance.removeLayer(btMapLayers[btMapStyle]);
    btMapStyle=next;
    btMapLayers[next].addTo(btAddressMapInstance);
    const toggle=document.getElementById('btMapLayerToggle');
    if(toggle){toggle.textContent=next==='street'?'🛰️ Спутник':'🗺️ Схема';toggle.setAttribute('aria-label',next==='street'?'Включить спутник':'Включить схему');}
}
function btMapNorm(v){
    return String(v||'').toLocaleLowerCase('ru').replace(/ё/g,'е')
        .replace(/(?:город|район|область|республика|city|district|region|oblast|tumani|tuman|shahri|shahar)/gi,'')
        .replace(/(?:ский|ская|ское|skaya|skiy|sky|iy)$/i,'')
        .replace(/[^a-zа-я0-9]/gi,'');
}
function btMapLatin(v){
    const ru={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'sh',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
    return btMapNorm(v).replace(/[а-я]/g,ch=>ru[ch]||ch).replace(/kh/g,'h')
        .replace(/kibray/g,'qibray').replace(/qibraysk/g,'qibray')
        .replace(/tashkent/g,'toshkent').replace(/(?:skiy|skaya|ski|iy)$/,'');
}
function btMapSameName(a,b){
    const x=btMapNorm(a),y=btMapNorm(b);
    if(!x||!y)return false;
    if(x===y||((x.length>=6&&y.length>=6&&Math.abs(x.length-y.length)<=2)&&(x.startsWith(y)||y.startsWith(x))))return true;
    const lx=btMapLatin(a),ly=btMapLatin(b);
    return lx===ly||((lx.length>=6&&ly.length>=6&&Math.abs(lx.length-ly.length)<=2)&&(lx.startsWith(ly)||ly.startsWith(lx)));
}
function btMapDistrictMatches(region,area,candidate){
    // 'Tashkent City' is NOT 'Ташкентский район': don't erase the admin
    // designation and confuse the city with its namesake district.
    if(region==='Ташкентская область' && area==='Ташкентский район' &&
       !/(?:район|туман|tuman|district|rayon)/i.test(String(candidate||'')))return false;
    return btMapSameName(area,candidate);
}
function btMapTerritoryFromReverse(result){
    const raw=String(result.region||'').trim();
    const address=String(result.address||'');
    const txt=raw+' '+address;
    let region='';
    // Disambiguate Tashkent city from Tashkent region before generic matching.
    if(/ташкентск(?:ая|ой)\s+област|toshkent\s+viloyat|tashkent\s+region|tashkent\s+oblast/i.test(txt)){
        region='Ташкентская область';
    }else if([result.district,...address.split(',')].some(item=>(btMapTerritories['Ташкентская область']||[]).some(area=>btMapDistrictMatches('Ташкентская область',area,item)))){
        region='Ташкентская область';
    }else if([result.district,...address.split(',')].some(item=>(btMapTerritories['Ташкент (город)']||[]).some(area=>btMapDistrictMatches('Ташкент (город)',area,item)))||
        /^(город ташкент|tashkent city|toshkent shahri)$/i.test(raw)){
        region='Ташкент (город)';
    }else if(/^(ташкент|tashkent|toshkent)$/i.test(raw)){
        // The bare name is ambiguous between Tashkent city and region.
        region='';
    }else{
        const regionCandidates=[raw,...address.split(',').map(v=>v.trim())];
        for(const candidate of regionCandidates){
            const matched=Object.keys(btMapTerritories).find(name=>btMapSameName(name,candidate));
            if(matched){region=matched;break;}
        }
    }
    let district='';
    if(region){
        for(const candidate of [result.district,...address.split(',')]){
            const matched=(btMapTerritories[region]||[]).find(name=>btMapDistrictMatches(region,name,candidate));
            if(matched){district=matched;break;}
        }
    }
    return {region,district};
}
function btMapPointKey(p){return `${Number(p.lat).toFixed(5)}:${Number(p.lng ?? p.lon).toFixed(5)}`;}
async function btMapRecognizeCurrentPoint(){
    if(!btAddressMapInstance||btMapRecognizing)return null;
    const pos=btAddressMapInstance.getCenter();
    const key=btMapPointKey(pos);
    const hint=document.getElementById('btMapHint');
    const confirm=document.getElementById('btMapConfirm');
    btMapRecognizing=true;
    if(confirm){confirm.disabled=true;confirm.textContent='⏳ Определяем адрес…';}
    if(hint)hint.textContent='Проверяем адрес и район по метке…';
    try{
        const result=await clientApi('/api/map/reverse?lat='+encodeURIComponent(pos.lat)+'&lon='+encodeURIComponent(pos.lng));
        if(!btAddressMapInstance||btMapPointKey(btAddressMapInstance.getCenter())!==key){
            throw new Error('Метка переместилась во время проверки. Нажмите «Подтвердить адрес» ещё раз.');
        }
        const territory=btMapTerritoryFromReverse(result);
        const address=String(result.address||btAddressMapLabel||'').trim().slice(0,400);
        if(territory.region && territory.region!==orderData.serviceRegion){
            throw new Error('Метка находится в другой области: '+territory.region+'. Уточните точку или измените область в заявке.');
        }
        // A district is NEVER a hard filter: masters can work city/region-wide.
        // Derive it only after verifying the map's region.
        // Reverse geocoders often omit/translate districts. An explicitly chosen
        // territory is retained when the provider has no reliable counterpart.
        // A recognized different region or district is always rejected above.
        if(!address)throw new Error('Не удалось определить адрес. Уточните запрос или выберите другую точку.');
        return {region:orderData.serviceRegion,district:territory.district||'',address};
    }catch(e){
        const feedback=document.getElementById('btMapActionFeedback');
        if(feedback){feedback.textContent=e.message||'Не удалось распознать адрес.';feedback.style.display='block';}
        if(hint)hint.textContent='Попробуйте уточнить адрес в поиске либо передвинуть метку.';
        return null;
    }finally{
        btMapRecognizing=false;
        if(confirm){confirm.disabled=false;confirm.textContent='✓ Подтвердить адрес';}
    }
}
async function btOpenAddressMap(){
    if(!Object.hasOwn(btMapTerritories,orderData.serviceRegion)){
        btAreaShowEditor();return showAlert('Сначала выберите город / область.');
    }
    if(document.getElementById('btAddressOverlay'))return;
    const overlay=document.createElement('div');overlay.id='btAddressOverlay';overlay.className='bt-address-overlay';
    overlay.innerHTML=`<div class="bt-address-dialog bt-map-simple" role="dialog" aria-modal="true" aria-label="Выбор адреса">
      <p class="bt-map-territory-hint">📍 Поиск: ${escapeClient(orderData.serviceRegion)}</p>
      <div class="bt-map-stage"><div id="btAddressMap"></div><button type="button" id="btMapLayerToggle" onclick="btMapSetLayer(btMapStyle==='street'?'satellite':'street')" aria-label="Включить спутник">🛰️ Спутник</button><div class="bt-map-center-pin" aria-hidden="true"><span>📍</span></div></div>
      <div class="bt-address-search"><input id="btMapSearch" placeholder="Улица, дом, махалля или ориентир" autocomplete="street-address" onkeydown="if(event.key==='Enter'){event.preventDefault();btSearchAddressMap();}"></div>
      <div class="bt-map-search-actions"><button type="button" id="btMapSearchButton" onclick="btSearchAddressMap()">🔎 Найти адрес</button><button type="button" id="btMapMyLocation" onclick="btMapUseMyLocation()">📍 Моя локация</button></div>
      <div id="btMapSearchResults" class="bt-map-search-results" aria-live="polite"></div>
      <p id="btMapHint" role="status">Передвигайте карту, чтобы поставить метку на нужное место.</p>
      <p id="btMapActionFeedback" role="alert" style="display:none;margin:0;color:#ffd5a1;font-size:13px;line-height:1.4;"></p>
      <div class="bt-address-actions"><button type="button" onclick="btCloseAddressMap()">Отмена</button><button type="button" id="btMapConfirm" onclick="btConfirmAddressMap()" disabled>✓ Подтвердить адрес</button></div>
    </div>`;
    document.body.append(overlay);
    try{
        if(typeof L==='undefined'){
            await new Promise((resolve,reject)=>{
                const css=document.createElement('link');css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(css);
                const js=document.createElement('script');js.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';js.onload=resolve;js.onerror=reject;document.head.appendChild(js);
            });
        }
        if(!document.getElementById('btAddressOverlay'))return;
        const center=btRegionMapCenters[orderData.serviceRegion]||[41.2995,69.2401];
        const initial=orderData.location||{lat:center[0],lon:center[1]};
        btAddressMapInstance=L.map('btAddressMap',{zoomControl:true}).setView([initial.lat,initial.lon],orderData.location?17:12);
        btMapLayers={
            street:L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}),
            satellite:L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri and contributors'})
        };
        btMapStyle='street';btMapLayers.street.addTo(btAddressMapInstance);
        btMapSetLayer('street');
        btAddressMapLabel='';btMapLastSearchQuery='';btMapSearchTicket++;
        btAddressMapInstance.on('moveend',()=>{
            if(!btMapProgrammaticMove)btAddressMapLabel='';
            btMapUpdateCenter();
        });
        btMapUpdateCenter();
        setTimeout(()=>btAddressMapInstance?.invalidateSize(),100);
    }catch(e){
        const hint=document.getElementById('btMapHint');
        if(hint)hint.textContent='Карта недоступна. Проверьте подключение к интернету.';
        console.warn('Map loading failed',e);
    }
}
function btMapUseMyLocation(){
    const button=document.getElementById('btMapMyLocation');
    const hint=document.getElementById('btMapHint');
    if(!btAddressMapInstance)return;
    if(!navigator.geolocation){if(hint)hint.textContent='Геолокация недоступна. Найдите адрес через поиск или переместите карту.';return;}
    if(button)button.disabled=true;
    if(hint)hint.textContent='Определяем ваше местоположение…';
    navigator.geolocation.getCurrentPosition(pos=>{
        if(!btAddressMapInstance)return;
        const {latitude,longitude}=pos.coords;
        if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude<35||latitude>46||longitude<55||longitude>74){
            if(hint)hint.textContent='Точка вне Узбекистана. Найдите место ремонта через поиск.';
        }else{
            btAddressMapInstance.setView([latitude,longitude],17,{animate:false});
            btAddressMapLabel='';
            btMapUpdateCenter();
            if(hint)hint.textContent='Проверьте положение метки и нажмите «Подтвердить адрес».';
            const feedback=document.getElementById('btMapActionFeedback');if(feedback)feedback.style.display='none';
        }
        if(button)button.disabled=false;
    },err=>{
        if(hint)hint.textContent=err.code===1?'Доступ к геолокации запрещён. Найдите адрес через поиск.':'Не удалось определить местоположение. Найдите адрес через поиск.';
        if(button)button.disabled=false;
    },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}
function btMapSelectFoundPlace(place){
    if(!btAddressMapInstance)return false;
    const lat=Number(place.lat),lon=Number(place.lon);
    if(!Number.isFinite(lat)||!Number.isFinite(lon))return false;
    btMapProgrammaticMove=true;
    try{btAddressMapInstance.setView([lat,lon],17,{animate:false});}
    finally{btMapProgrammaticMove=false;}
    btAddressMapLabel=String(place.address||place.title||'').slice(0,400);
    btMapUpdateCenter();
    const hint=document.getElementById('btMapHint');
    if(hint)hint.textContent='Метка поставлена по найденному адресу. При необходимости сдвиньте карту и подтвердите.';
    const feedback=document.getElementById('btMapActionFeedback');if(feedback)feedback.style.display='none';
    return true;
}
async function btSearchAddressMap(){
    const query=document.getElementById('btMapSearch')?.value.trim();
    const hint=document.getElementById('btMapHint');
    const resultsBox=document.getElementById('btMapSearchResults');
    const feedback=document.getElementById('btMapActionFeedback');
    if(!query||query.length<3){
        if(hint)hint.textContent='Введите хотя бы три символа названия места или улицы.';
        return;
    }
    if(!btAddressMapInstance)return;
    const ticket=++btMapSearchTicket;
    const button=document.getElementById('btMapSearchButton');
    if(hint)hint.textContent='Ищем по разным написаниям адреса…';
    if(feedback)feedback.style.display='none';
    if(resultsBox)resultsBox.replaceChildren();
    if(button)button.disabled=true;
    try{
        const center=btAddressMapInstance.getCenter();
        const params=new URLSearchParams({q:query,lat:String(center.lat),lon:String(center.lng),
            region:orderData.serviceRegion,district:orderData.serviceDistrict});
        const payload=await clientApi('/api/map/geocode?'+params.toString());
        if(ticket!==btMapSearchTicket||!document.getElementById('btAddressOverlay')||!btAddressMapInstance)return;
        const places=Array.isArray(payload.results)?payload.results:[];
        if(!places.length){
            if(hint)hint.textContent='Адрес не найден. Попробуйте другое написание (например, «Офарин, Кибрай») или поставьте метку на карте вручную.';
            return;
        }
        btMapLastSearchQuery=query;
        // Automatic positioning is safe only when the result agrees with the
        // input sufficiently. Never jump to a generic town instead of a street.
        const meaningfulTokens=query.trim().split(/[\s,;]+/).filter(t=>t.length>=3);
        const threshold=meaningfulTokens.length>1?3.5:1.5;
        const confident=Number(places[0].relevance||0)>=threshold;
        if(confident){
            btMapSelectFoundPlace(places[0]);
            if(hint)hint.textContent='Метка на первом подходящем результате. При необходимости выберите другой адрес ниже или сдвиньте карту.';
        }else if(hint){
            hint.textContent='Есть похожие места, но точного совпадения нет. Выберите нужное из списка либо передвиньте карту вручную.';
        }
        if(resultsBox){
            for(const [index,place] of places.entries()){
                const item=document.createElement('button');item.type='button';item.className='bt-map-result';
                if(index===0&&confident)item.classList.add('bt-map-result-current');
                const title=document.createElement('span');title.className='bt-map-result-title';
                title.textContent=place.title||place.address||'Адрес на карте';
                const detail=document.createElement('span');detail.className='bt-map-result-detail';
                detail.textContent=place.address||'';
                item.append(title,detail);
                item.addEventListener('click',()=>{
                    if(!btAddressMapInstance)return;
                    btMapSelectFoundPlace(place);
                    for(const other of resultsBox.querySelectorAll('.bt-map-result'))other.classList.remove('bt-map-result-current');
                    item.classList.add('bt-map-result-current');
                });
                resultsBox.append(item);
            }
        }
    }catch(e){
        if(ticket===btMapSearchTicket&&hint)
            hint.textContent='Сервис поиска временно недоступен. Можно выбрать точку вручную на карте и подтвердить адрес.';
        if(ticket===btMapSearchTicket&&feedback){
            feedback.textContent=e.message||'Ошибка сервиса определения адреса';
            feedback.style.display='block';
        }
        console.warn('Address search failed',e);
    }finally{if(button&&ticket===btMapSearchTicket)button.disabled=false;}
}
async function btConfirmAddressMap(){
    if(!btAddressMapInstance||btMapRecognizing)return;
    const center=btAddressMapInstance.getCenter();
    const hint=document.getElementById('btMapHint');
    if(!Number.isFinite(center.lat)||!Number.isFinite(center.lng))return;
    if(center.lat<35||center.lat>46||center.lng<55||center.lng>74){
        if(hint)hint.textContent='Выберите точку на территории Узбекистана.';return;
    }
    const feedback=document.getElementById('btMapActionFeedback');if(feedback)feedback.style.display='none';
    // A search result, geolocation or manual pan all reach the same verified path.
    const resolved=await btMapRecognizeCurrentPoint();
    if(!resolved)return;
    // Do not save a stale point if the user moved the map while the request was running.
    const current=btAddressMapInstance?.getCenter();
    if(!current||btMapPointKey(current)!==btMapPointKey(center))return;
    orderData.location={lat:Number(center.lat.toFixed(6)),lon:Number(center.lng.toFixed(6))};
    // Area is client-confirmed and already verified against reverse geocoding;
    // the map must never silently replace it with a different city/region.
    orderData.mapAddress=resolved.address;
    orderData.serviceDistrict=resolved.district||'';
    const status=document.getElementById('location_status');
    if(status){status.textContent='✅ '+resolved.region+(resolved.district?', '+resolved.district:'')+' — '+resolved.address;status.style.color='#43dba1';}
    btCloseAddressMap();btClientUpdateSubmitGlow();
}
function btCloseAddressMap(){
    if(btAddressMapInstance){btAddressMapInstance.remove();btAddressMapInstance=null;}
    btAddressMapPoint=null;btMapLayers=null;btMapRecognizing=false;btMapProgrammaticMove=false;btMapSearchTicket++;
    document.getElementById('btAddressOverlay')?.remove();
}

// Patch 06: choose an eligible master; broadcast will be enabled in patch 07.
function btChooseMarketplaceMaster(masters,linkedDepositLimitedId=0){
  return new Promise(resolve=>{
    const shade=document.createElement('div');shade.className='bt-marketplace-shade';
    const panel=document.createElement('div');panel.className='bt-marketplace-panel bt-marketplace-panel-v13';
    const finish=value=>{shade.remove();resolve(value)};
    const makeBtn=(label,cls,action)=>{
      const b=document.createElement('button');b.type='button';b.className=cls;
      b.textContent=label;b.addEventListener('click',e=>{e.stopPropagation();action();});return b;
    };
    const heading=document.createElement('div');heading.className='bt-marketplace-header';
    const title=document.createElement('h3');title.textContent='Выберите мастера';
    const count=document.createElement('p');count.textContent='Подходящих мастеров: '+masters.length+' · нажмите на карточку для подробностей';
    heading.append(title,count);panel.append(heading);

    const own=masters.find(m=>m.my_master);
    if(own){
      const ownWrap=document.createElement('div');ownWrap.className='bt-marketplace-top-actions';
      ownWrap.append(makeBtn('👨‍🔧 Вызвать моего мастера','bt-marketplace-wide-btn',()=>finish(own.master_id)));
      panel.append(ownWrap);
    }
    if(Number(linkedDepositLimitedId)>0){
      const linkedWrap=document.createElement('div');linkedWrap.className='bt-marketplace-top-actions';
      const note=document.createElement('p');note.className='subtitle';
      note.textContent='Ваш прежний мастер временно не принимает новые заказы площадки. Личная заявка возможна, но акт станет доступен после пополнения его депозита.';
      linkedWrap.append(note,makeBtn('👨‍🔧 Личная заявка моему мастеру','bt-marketplace-wide-btn',()=>finish('linked')));
      panel.append(linkedWrap);
    }
    const list=document.createElement('div');list.className='bt-marketplace-list';
    const details=document.createElement('section');details.className='bt-marketplace-detail-view';details.hidden=true;
    const openDetail=m=>{
      list.hidden=true;details.hidden=false;details.replaceChildren();
      const back=makeBtn('← К списку мастеров','bt-marketplace-detail-back',()=>{
        details.hidden=true;list.hidden=false;details.replaceChildren();
      });
      details.append(back);
      const block=document.createElement('div');block.className='bt-marketplace-detail-content';
      const h=document.createElement('h3');h.textContent=String(m.name||'Мастер');block.append(h);
      const add=(text)=>{const p=document.createElement('p');p.textContent=text;block.append(p);};
      add('⭐ '+(Number(m.rating)>0?Number(m.rating).toFixed(1):'Нет оценок')+' · '+Number(m.review_count||0)+' отзывов');
      add('📍 '+String(m.district||'Район не указан'));
      add('🧾 '+Number(m.issued_acts||0)+' выданных актов по выбранной услуге');
      add('💰 Выезд и диагностика: '+Number(m.diagnostic_price_uzs||0).toLocaleString('ru-RU')+' сум');
      if(m.about)add(String(m.about));
      const rh=document.createElement('h4');rh.textContent='Отзывы';block.append(rh);
      const reviews=Array.isArray(m.reviews)?m.reviews:[];
      if(!reviews.length){add('Пока нет опубликованных отзывов.');}
      else for(const review of reviews.slice(0,40)){
        const item=document.createElement('article');item.className='bt-marketplace-review';
        const rhead=document.createElement('strong');
        const rating=Math.min(5,Math.max(1,Number(review.rating)||1));
        rhead.textContent='⭐'.repeat(rating)+(review.created_at?' · '+String(review.created_at).slice(0,10):'');
        const body=document.createElement('p');body.textContent=String(review.text||'Без комментария');
        item.append(rhead,body);block.append(item);
      }
      details.append(block,makeBtn('Выбрать этого мастера','bt-marketplace-detail-select',()=>finish(m.master_id)));
      details.scrollTop=0;
    };
    if(!masters.length){
      const empty=document.createElement('p');empty.className='bt-marketplace-empty';
      empty.textContent='В выбранном городе / области пока нет подходящих мастеров.';list.append(empty);
    }
    for(const m of masters){
      const card=document.createElement('article');
      card.className='bt-marketplace-card bt-marketplace-card-v13';
      card.tabIndex=0;card.setAttribute('role','button');
      card.setAttribute('aria-label','Информация о мастере '+String(m.name||'Мастер'));
      card.addEventListener('click',()=>openDetail(m));
      card.addEventListener('keydown',e=>{
        if(e.target!==card)return;
        if(e.key==='Enter'||e.key===' '){e.preventDefault();openDetail(m);}
      });
      const avatar=document.createElement('div');avatar.className='bt-marketplace-avatar bt-marketplace-avatar-v13';
      if(typeof m.avatar==='string'&&m.avatar.startsWith('data:image/jpeg;base64,')&&m.avatar.length<=180000){
        const pic=document.createElement('img');pic.src=m.avatar;pic.alt='';avatar.append(pic);
      }else avatar.textContent=String(m.name||'М').trim().slice(0,1).toUpperCase();
      const content=document.createElement('div');content.className='bt-marketplace-card-info';
      const name=document.createElement('strong');name.textContent=String(m.name||'Мастер');
      const rating=document.createElement('span');rating.className='bt-marketplace-rating';
      rating.textContent='⭐ '+(Number(m.rating)>0?Number(m.rating).toFixed(1):'Нет оценок')+' · '+Number(m.review_count||0)+' отзывов';
      const facts=document.createElement('div');facts.className='bt-marketplace-card-facts';
      const district=document.createElement('span');district.textContent='📍 '+String(m.district||'—');
      const experience=document.createElement('span');experience.textContent='🧾 '+Number(m.issued_acts||0)+' актов';
      const price=document.createElement('span');const title=document.createElement('span');title.textContent='Выезд и диагностика:';price.append('💰 ',title,' '+Number(m.diagnostic_price_uzs||0).toLocaleString('ru-RU')+' сум');
      facts.append(district,experience,price);content.append(name,rating,facts);
      const select=makeBtn('Выбрать','bt-marketplace-card-select',()=>finish(m.master_id));
      card.append(avatar,content,select);list.append(card);
    }
    panel.append(list,details);
    const footer=document.createElement('div');footer.className='bt-marketplace-footer';
    footer.append(makeBtn('⚡ Найти свободного мастера','bt-marketplace-wide-btn',()=>finish('public')));
    footer.append(makeBtn('Назад к заявке','bt-marketplace-back-btn',()=>finish(null)));
    panel.append(footer);
    shade.addEventListener('click',e=>{if(e.target===shade)finish(null)});
    shade.append(panel);document.body.append(shade);
  });
}

// When Telegram Mini App resumes, refresh the visible view immediately.
document.addEventListener('visibilitychange',()=>{
    if(document.hidden)return;
    btInvalidateDashboardPoll();
    if(document.getElementById('btChatHistory'))btRefreshClientChat(true);
    if(document.getElementById('btOrdersList'))btRefreshOrderCards();
    if(document.querySelector('.bt-client-home'))btPollClientDashboard().then(d=>btClientRecentOrder(d)).catch(()=>{});
});
