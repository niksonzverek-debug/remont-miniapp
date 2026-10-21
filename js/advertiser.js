(() => {
 const tg = window.Telegram && window.Telegram.WebApp;
 window.RemontMobile?.enter('advertiser/home',()=>{}, {root:true});
 const $ = id => document.getElementById(id);
 let lang = (['ru','uz','en'].includes(localStorage.getItem('remont_bt_lang')) ? localStorage.getItem('remont_bt_lang') : 'ru'); let dashboard = null;
 function filteredPayouts(){
   const filter=$('btPayoutFilter')?.value||'all';
   const month=$('btPayoutMonth')?.value||'';
   return (dashboard?.payouts||[]).filter(p=>(filter==='all'||String(p.status)===filter)&&(!month||String(p.created_at||'').startsWith(month)));
 }
 function downloadPayoutJournal(){
   if(!dashboard)return;
   const rows=filteredPayouts();
   if(!rows.length)return setStatus('Нет записей для выгрузки.');
   const csvValue=value=>{
     let text=String(value??'').replace(/\r|\n/g,' ');
     if(/^[=+@\-]/.test(text))text="'"+text; // defend against spreadsheet formula injection
     return '"'+text.replace(/"/g,'""')+'"';
   };
   const columns=['Дата','Номер','Промокод','Сумма, сум','Статус','Чек прикреплён'];
   const lines=[columns,...rows.map(p=>[p.created_at||'',p.id||'',p.code||'',p.amount||0,p.status||'',p.has_receipt?'Да':'Нет'])];
   const csv='\ufeff'+lines.map(row=>row.map(csvValue).join(';')).join('\r\n');
   const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
   const a=document.createElement('a');a.href=url;a.download='remont_bt_выплаты_'+new Date().toISOString().slice(0,10)+'.csv';
   document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }

 const text = {
  ru:{title:'Кабинет рекламодателя',subtitle:'Статистика привлечения, начисления и выплаты',loading:'Подключаем кабинет…',refresh:'Обновить',regs:'Регистрации по ссылке',activationsLabel:'Активации промокода',activations:'активаций',repairs:'Выполнено ремонтов',accrued:'Начислено всего',paid:'Учтено выплат',balance:'Остаток к выплате',pending:'Выплаты на проверке',weeklyRepairs:'Ремонтов за неделю',weeklyAccrued:'Начислено за неделю',promos:'Мои промокоды',payouts:'История выплат',card:'Реквизиты для выплат',cardHelp:'Полный номер карты не показывается в кабинете. Для изменения отправляется запрос мастеру.',cardPlaceholder:'Новый номер карты',request:'Запросить изменение',noPromos:'Промокодов пока нет.',noPayouts:'Выплат пока нет.',registrations:'регистраций',repairs2:'ремонтов',reward:'вознаграждение',active:'Активен',inactive:'Не активен',sent:'Перевод отправлен',confirmed:'Подтверждено',disputed:'Есть спор',pendingReview:'На проверке',confirm:'Подтвердить получение',dispute:'Оспорить',disputePrompt:'Опишите, что не совпадает:',setup:'Для кабинета не настроен API. Откройте инструкцию в архиве проекта.',needTelegram:'Откройте кабинет через Telegram, чтобы подтвердить аккаунт.',error:'Ошибка',cardSent:'Запрос на изменение реквизитов отправлен мастеру.',loadingError:'Не удалось загрузить данные.',connected:'Кабинет подключён',cardLast:'Карта для выплат: **** ',week:'История начислений отображается по промокодам.'},
  uz:{title:'Reklamachi kabineti',subtitle:'Mijozlar, hisoblangan mukofotlar va toʻlovlar',loading:'Kabinet ulanmoqda…',refresh:'Yangilash',regs:'Havola orqali roʻyxatdan oʻtganlar',activationsLabel:'Promokod faollashtirilgan',activations:'faollashtirish',repairs:'Bajarilgan taʼmirlar',accrued:'Jami hisoblandi',paid:'Hisobga olingan toʻlovlar',balance:'Toʻlanadigan qoldiq',pending:'Tekshiruvdagi toʻlovlar',weeklyRepairs:'Haftadagi taʼmirlar',weeklyAccrued:'Haftada hisoblandi',promos:'Promokodlarim',payouts:'Toʻlovlar tarixi',card:'Toʻlov rekvizitlari',cardHelp:'Toʻliq karta raqami kabinetda koʻrsatilmaydi. Oʻzgartirish uchun ustaga soʻrov yuboriladi.',cardPlaceholder:'Yangi karta raqami',request:'Oʻzgartirishni soʻrash',noPromos:'Promokodlar yoʻq.',noPayouts:'Hozircha toʻlovlar yoʻq.',registrations:'roʻyxatdan oʻtgan',repairs2:'taʼmir',reward:'mukofot',active:'Faol',inactive:'Faol emas',sent:'Pul oʻtkazildi',confirmed:'Tasdiqlandi',disputed:'Nizo bor',pendingReview:'Tekshiruvda',confirm:'Qabul qilinganini tasdiqlash',dispute:'Eʼtiroz bildirish',disputePrompt:'Muammoni tasvirlang:',setup:'API sozlanmagan. Loyiha arxividagi yoʻriqnomani oching.',needTelegram:'Hisobni tasdiqlash uchun kabinetni Telegram ichida oching.',error:'Xato',cardSent:'Karta rekvizitlarini oʻzgartirish soʻrovi ustaga yuborildi.',loadingError:'Maʼlumotlarni yuklab boʻlmadi.',connected:'Kabinet ulandi',cardLast:'Toʻlov kartasi: **** ',week:'Hisoblangan mukofotlar promokodlar boʻyicha koʻrsatiladi.'},
  en:{title:'Advertiser dashboard',subtitle:'Campaign performance, earnings and payments',loading:'Connecting your dashboard…',refresh:'Refresh',regs:'Registrations via link',activationsLabel:'Promo code activations',activations:'activations',repairs:'Completed repairs',accrued:'Total earned',paid:'Payments recorded',balance:'Outstanding balance',pending:'Payments under review',weeklyRepairs:'Repairs this week',weeklyAccrued:'Earned this week',promos:'My promo codes',payouts:'Payment history',card:'Payout details',cardHelp:'The full card number is not displayed. Ask your technician to update payout details.',cardPlaceholder:'New card number',request:'Request change',noPromos:'No promo codes yet.',noPayouts:'No payments yet.',registrations:'registrations',repairs2:'repairs',reward:'reward',active:'Active',inactive:'Inactive',sent:'Transfer sent',confirmed:'Confirmed',disputed:'Disputed',pendingReview:'Under review',confirm:'Confirm receipt',dispute:'Dispute',disputePrompt:'Describe the issue:',setup:'API is not configured. Check the setup instructions.',needTelegram:'Open this dashboard from Telegram to verify your account.',error:'Error',cardSent:'Your request to update payout details was sent to the technician.',loadingError:'Unable to load data.',connected:'Dashboard connected',cardLast:'Payout card: **** ',week:'Earnings are displayed per promo code.'}
 };
 const t = key => (text[lang] && text[lang][key]) || text.ru[key] || key;
 const money = n => new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'uz-UZ').format(Number(n || 0)) + ' сум';
 const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function setLang(next) { lang=next; $('langBtn').textContent=lang==='ru'?'Oʻzbekcha':'Русский'; $('pageTitle').textContent=t('title'); $('pageSubtitle').textContent=t('subtitle'); $('refreshBtn').textContent=t('refresh'); $('mRegistrations').textContent=t('regs'); $('mActivations').textContent=t('activationsLabel'); $('mRepairs').textContent=t('repairs'); $('mAccrued').textContent=t('accrued'); $('mPaid').textContent=t('paid'); $('mBalance').textContent=t('balance'); $('mPending').textContent=t('pending'); $('mWeeklyRepairs').textContent=t('weeklyRepairs'); $('mWeeklyAccrued').textContent=t('weeklyAccrued'); $('promoTitle').textContent=t('promos'); $('payoutTitle').textContent=t('payouts'); $('cardTitle').textContent=t('card'); $('cardHelp').textContent=t('cardHelp'); $('newCard').placeholder=t('cardPlaceholder'); $('requestCardBtn').textContent=t('request'); if(dashboard) render(dashboard); }
 function setStatus(message, isError=false) { $('status').className=isError?'error':'notice'; $('status').textContent=message; $('status').classList.remove('hidden'); }
 async function api(path, method='GET', body=null) {
  const base=String(window.REMONT_ADVERTISER_API_BASE||'').replace(/\/$/,'');
  if(!base) throw new Error(t('setup'));
  const headers={'Content-Type':'application/json'};
  const liveInit=String(tg?.initData||'');
  let storedInit='';
  try{
    const saved=JSON.parse(sessionStorage.getItem('remontbt_adv_auth')||'null');
    const liveUid=String(tg?.initDataUnsafe?.user?.id||'');
    if(saved?.data && Date.now()-Number(saved.time||0)<15*60*1000 && (!liveUid || liveUid===String(saved.uid||'')))storedInit=String(saved.data);
  }catch(_){ }
  if(liveInit||storedInit)headers['X-Telegram-Init-Data']=liveInit||storedInit;
  const params=new URLSearchParams(location.search);
  const uid=params.get('session_uid'),exp=params.get('session_exp'),sig=params.get('session_sig');
  if(/^\d{1,20}$/.test(uid||'') && /^\d{1,20}$/.test(exp||'') && /^[a-f0-9]{64}$/i.test(sig||''))
    headers['X-Remont-Session']=`${uid}:${exp}:${sig}`;
  if(!headers['X-Telegram-Init-Data']&&!headers['X-Remont-Session'])throw new Error(t('needTelegram'));
  const res=await fetch(base+path,{method,headers,body:body?JSON.stringify(body):undefined,cache:'no-store'});
  const data=await res.json().catch(()=>({error:'Bad response'})); if(!res.ok) throw new Error(data.error||t('loadingError')); return data;
 }
 function render(data) {
  dashboard=data; const a=data.advertiser||{},s=data.summary||{};
  $('hello').textContent=a.name||t('title'); $('cardInfo').textContent=a.card_last4?t('cardLast')+a.card_last4:'';
  for(const [id,key] of [['registrations','registrations'],['activations','activations'],['repairs','repairs']]) $(id).textContent=money(s[key]).replace(' сум','');
  ['accrued','paid','balance','pending','weeklyAccrued'].forEach(k=>$(k).textContent=money(k==='weeklyAccrued'?s.weekly_accrued:s[k])); $('weeklyRepairs').textContent=String(s.weekly_repairs||0);
  const promos=data.promocodes||[];
  $('promos').innerHTML=promos.length?promos.map(p=>`<div class="list-item"><div class="row"><b>${esc(p.code)}</b><span class="pill">${p.active?t('active'):t('inactive')}</span></div><div class="muted">${esc(p.discount_percent)}% скидка · ${esc(p.reward_percent)}% ${t('reward')} · лимит на клиента: ${esc(p.uses_per_client||'—')}</div><div>${p.registrations} ${t('registrations')} · ${p.activations||0} ${t('activations')} · ${p.repairs} ${t('repairs2')}</div><div class="muted">${esc(p.expires_at||'')}</div><div><b>${money(p.accrued)}</b></div></div>`).join(''):`<p class="muted">${t('noPromos')}</p>`;
  const payouts=filteredPayouts();
  const total=payouts.reduce((sum,p)=>sum+Number(p.amount||0),0);
  if($('btPayoutSummary'))$('btPayoutSummary').textContent=`Записей: ${payouts.length} · сумма: ${money(total)}. Статусы и чеки соответствуют данным сервера.`;
  $('payouts').innerHTML=payouts.length?payouts.map(p=>{const status=p.status==='confirmed'?t('confirmed'):p.status==='disputed'?t('disputed'):p.status==='sent'?t('sent'):t('pendingReview');return `<div class="list-item"><div class="row"><b>${money(p.amount)}</b><span class="pill">${esc(status)}</span></div><div class="muted">${esc(p.code||'')} · ${esc(p.created_at||'')} · ID ${esc(p.id||'')}</div>${p.has_receipt?'<div class="muted">Чек сохранён в системе</div>':''}${p.status==='sent'?`<div class="row" style="margin-top:8px"><button class="btn" data-decision="confirmed" data-id="${esc(p.id)}">${t('confirm')}</button><button class="btn warn" data-decision="disputed" data-id="${esc(p.id)}">${t('dispute')}</button></div>`:''}</div>`}).join(''):`<p class="muted">${t('noPayouts')}</p>`;
  $('status').classList.add('hidden'); $('app').classList.remove('hidden');
 }
 async function load() { try { setStatus(t('loading')); const data=await api('/api/advertiser/dashboard'); render(data); } catch(e) { if(String(window.REMONT_ADVERTISER_API_BASE||'').trim()==='') { $('setup').classList.remove('hidden'); setStatus(t('setup'),true); } else setStatus(t('error')+': '+e.message,true); } }
 $('langBtn').addEventListener('click',()=>setLang(lang==='ru'?'uz':'ru'));
 $('refreshBtn').addEventListener('click',load);
 $('btPayoutFilter')?.addEventListener('change',()=>{if(dashboard)render(dashboard);});
 $('btPayoutMonth')?.addEventListener('change',()=>{if(dashboard)render(dashboard);});
 $('btPayoutExport')?.addEventListener('click',downloadPayoutJournal);
 $('requestCardBtn').addEventListener('click',async()=>{const card=$('newCard').value.replace(/\D/g,'');try{const r=await api('/api/advertiser/card-request','POST',{card_number:card});setStatus(r.message||t('cardSent'));$('newCard').value='';}catch(e){setStatus(t('error')+': '+e.message,true);}});
 $('payouts').addEventListener('click',async e=>{const b=e.target.closest('[data-decision]');if(!b)return;let note='';if(b.dataset.decision==='disputed'){note=prompt(t('disputePrompt'))||'';if(!note)return;}try{const r=await api(`/api/advertiser/payouts/${encodeURIComponent(b.dataset.id)}/decision`,'POST',{decision:b.dataset.decision,note});setStatus(r.message||t('connected'));await load();}catch(err){setStatus(t('error')+': '+err.message,true);}});
 try { if(tg){tg.ready();tg.expand();} } catch(_) {}
 setLang(lang); load();
})();
