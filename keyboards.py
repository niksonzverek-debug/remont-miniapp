# keyboards.py
"""Все клавиатуры бота."""

from telegram import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    ReplyKeyboardMarkup,
    KeyboardButton,
)
from config import BTN_BACK, BTN_MENU, BTN_CANCEL, BTN_SKIP, TOKEN, MASTER_ID, logger
import hashlib
import hmac
import time
from urllib.parse import urlencode
from telegram import WebAppInfo

MINIAPP_URL = "https://niksonzverek-debug.github.io/remont-miniapp"
MASTER_APP_RELEASE = "20261018-act-launch-authfix6"

def _master_session_query(master_id=None):
    """Подписанная сессия конкретного мастера на случай пустого initData."""
    from state import state
    uid = int(master_id if master_id is not None else state.active_master_id)
    # Build a signed launch URL even if master state has not loaded yet.
    # This does NOT grant access: advertiser_api._auth and the /api/master
    # route still verify the signature and state.is_master(uid) server-side.
    if uid <= 0:
        logger.error("Cannot sign Mini App master session: invalid Telegram user id")
        return ""
    expires = int(time.time()) + 30 * 24 * 60 * 60
    payload = f"{uid}:{expires}"
    signature = hmac.new(str(TOKEN).encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return urlencode({"master_uid": uid, "master_exp": expires, "master_sig": signature})

def master_webapp_reply_kb(master_id=None):
    """Reply-клавиатура с WebApp-кнопкой и подписанной сессией нужного мастера."""
    session = _master_session_query(master_id)
    suffix = "&" + session if session else ""
    # Keep the signed session in both query and fragment. Telegram WebViews normally
    # preserve query parameters; fragment is a fallback for clients that rewrite them.
    app_url = f"{MINIAPP_URL}/index.html?appv=20261018-act-launch-authfix6&launch=keyboard&role=master{suffix}"
    # Log URL parameter names and runtime module path only; never log the signature/token.
    logger.info("Master WebApp launch: module=%s master_id=%s signed_session=%s url_query_keys=%s release=%s",
                __file__, master_id if master_id is not None else getattr(__import__("state").state, "active_master_id", None),
                bool(session), sorted(__import__("urllib.parse", fromlist=["urlparse", "parse_qs"]).parse_qs(__import__("urllib.parse", fromlist=["urlparse"]).urlparse(app_url).query).keys()), MASTER_APP_RELEASE)
    return ReplyKeyboardMarkup([
        [KeyboardButton(
            "🧰 Открыть кабинет мастера · v6",
            web_app=WebAppInfo(url=app_url))],
    ], resize_keyboard=True, is_persistent=True)


def master_webapp_kb(master_id=None):
    """Inline-клавиатура с WebApp и подписанной сессией нужного мастера."""
    session = _master_session_query(master_id)
    suffix = "&" + session if session else ""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton(
            "🧰 Открыть кабинет мастера · v6",
            web_app=WebAppInfo(url=f"{MINIAPP_URL}/index.html?appv=20261018-act-launch-authfix6&role=master{suffix}"))],
    ])


def client_webapp_kb():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton(
            "👤 Открыть личный кабинет",
            web_app=WebAppInfo(url=f"{MINIAPP_URL}/client.html?appv=20261018-act-launch-authfix6"))],
    ])

def client_new_registration_kb():
    """Единственная кнопка клиента: открыть WebApp и пройти первичную регистрацию."""
    return ReplyKeyboardMarkup([
        [KeyboardButton(
            "📱 Открыть приложение",
            web_app=WebAppInfo(url=f"{MINIAPP_URL}/client.html?appv=20261018-act-launch-authfix6&launch=keyboard&role=client&new_client=1"))],
    ], resize_keyboard=True, is_persistent=True)


def master_candidate_reply_kb(registration_no=None):
    """Client app remains available while a pre-added master completes verification."""
    return ReplyKeyboardMarkup([
        [KeyboardButton(
            "📱 Открыть приложение",
            web_app=WebAppInfo(url=f"{MINIAPP_URL}/client.html?appv=20261018-act-launch-authfix6&launch=keyboard&role=client&registered=1&registration_no={registration_no or ''}"))],
        [KeyboardButton("👨‍🔧 Вход в кабинет мастера")],
    ], resize_keyboard=True, is_persistent=True)


def _public_reviews_enabled():
    # Отзывы показываются клиентам только после явного включения мастером.
    try:
        from state import state
        return bool(state.master.get("reviews_public")) and any(
            not fb.get("hidden", False) for fb in state.feedback.values()
        )
    except Exception:
        return False


def _client_session_query(registration_no):
    """Create a per-user signed fallback session for Telegram clients that omit initData.

    The token is signed with the existing bot token, expires after 30 days and is only
    attached to the registered user's personal Web App button. Telegram initData remains
    the preferred authentication method.
    """
    try:
        from state import state
        user_id = None
        record = None
        value = str(registration_no or "")
        for master_id, bucket in getattr(state, "_masters_data", {}).items():
            records = (bucket.get("clients", {}) or {})
            if value.isdigit() and int(value) in records:
                user_id = int(value); record = records.get(user_id); break
            if value.startswith("CL-"):
                for key, candidate in records.items():
                    if isinstance(candidate, dict) and str(candidate.get("registration_no") or "") == value:
                        user_id = int(candidate.get("user_id", key)); record = candidate; break
                if user_id is not None: break
        if user_id is None or not isinstance(record, dict) or not record.get("registered"):
            return ""
        expires = int(time.time()) + 30 * 24 * 60 * 60
        message = f"{user_id}:{expires}"
        signature = hmac.new(str(TOKEN).encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()
        return urlencode({"session_uid": user_id, "session_exp": expires, "session_sig": signature})
    except Exception:
        return ""


def client_webapp_reply_kb(registration_no=None):
    """Persistent client Web App button; preserves keyboard sendData for new orders."""
    registered = False
    registration_value = registration_no
    if registration_no and str(registration_no).startswith("CL-"):
        registered = True
    elif registration_no is not None and str(registration_no).isdigit():
        try:
            from state import state
            record = state.get_client(int(registration_no))
            if record and record.get("registered"):
                registered = True
                registration_value = record.get("registration_no")
        except Exception:
            pass
    if registered:
        suffix = "registered=1&registration_no=" + str(registration_value)
        signed = _client_session_query(registration_no)
        if signed:
            suffix += "&" + signed
    else:
        suffix = "new_client=1"
    rows = [[KeyboardButton(
        "📱 Открыть приложение",
        web_app=WebAppInfo(url=f"{MINIAPP_URL}/client.html?appv=20261018-act-launch-authfix6&launch=keyboard&role=client&{suffix}"))]]
    # The promotion request is available only after successful client registration.
    if registered:
        try:
            from state import state
            uid = None
            if str(registration_no or "").isdigit():
                candidate = int(registration_no)
                record = state.get_client(candidate)
                if record and record.get("registered"):
                    uid = candidate
            if uid is None:
                for bucket in state._masters_data.values():
                    for key, value in (bucket.get("clients", {}) or {}).items():
                        if isinstance(value, dict) and str(value.get("registration_no")) == str(registration_no):
                            try: uid = int(value.get("user_id", key))
                            except (TypeError, ValueError): uid = None
                            break
                    if uid is not None: break
            request = state.master_requests.get(str(uid)) if uid is not None else None
            if uid is None or not state.is_master(uid):
                label = "⏳ Заявка мастера на рассмотрении" if request and request.get("status")=="pending" else ("❌ Заявка отклонена — подать снова" if request and request.get("status")=="rejected" else "🧑‍🔧 Стать мастером")
                rows.append([KeyboardButton(label)])
        except Exception:
            rows.append([KeyboardButton("🧑‍🔧 Стать мастером")])
    return ReplyKeyboardMarkup(rows, resize_keyboard=True, is_persistent=True)

# ============================================================
# МАСТЕР — ГЛАВНОЕ МЕНЮ
# ============================================================

def master_kb(master_id=None):
    """Единая клавиатура мастера; передавайте Telegram ID при наличии."""
    return master_webapp_reply_kb(master_id)


def client_kb(registration_no=None):
    return client_webapp_reply_kb(registration_no)


# ============================================================
# УНИВЕРСАЛЬНЫЕ
# ============================================================

def back_kb():
    return ReplyKeyboardMarkup([
        [KeyboardButton(BTN_BACK), KeyboardButton(BTN_MENU)],
    ], resize_keyboard=True)


def skip_kb():
    return ReplyKeyboardMarkup([
        [KeyboardButton(BTN_SKIP)],
        [KeyboardButton(BTN_BACK), KeyboardButton(BTN_MENU)],
    ], resize_keyboard=True)


def cancel_kb():
    return ReplyKeyboardMarkup([
        [KeyboardButton(BTN_BACK), KeyboardButton(BTN_MENU)],
        [KeyboardButton(BTN_CANCEL)],
    ], resize_keyboard=True)


def phone_kb():
    return ReplyKeyboardMarkup([
        [KeyboardButton("📱 Поделиться контактом", request_contact=True)],
        [KeyboardButton(BTN_BACK), KeyboardButton(BTN_MENU)],
    ], resize_keyboard=True)


def location_kb():
    return ReplyKeyboardMarkup([
        [KeyboardButton("📍 Отправить локацию", request_location=True)],
        [KeyboardButton(BTN_BACK), KeyboardButton(BTN_MENU)],
    ], resize_keyboard=True)


# ============================================================
# ПРОМОКОДЫ
# ============================================================

def promo_menu_kb():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("➕ Создать промокод", callback_data="promo_create")],
        [InlineKeyboardButton("📋 Список промокодов", callback_data="promo_list")],
        [InlineKeyboardButton("🧮 Калькулятор", callback_data="promo_calc")],
        [InlineKeyboardButton(BTN_MENU, callback_data="goto_menu")],
    ])


def promo_card_kb(code, is_active=True, remaining=0, balance=0):
    buttons = []
    if balance > 0:
        buttons.append([InlineKeyboardButton(
            "💰 Выплатить партнёру", callback_data=f"promo_pay_{code}")])
    buttons.append([InlineKeyboardButton(
        "📜 История выплат", callback_data=f"promo_paylog_{code}")])
    buttons.append([InlineKeyboardButton(
        "📊 Все акты по промокоду", callback_data=f"promo_acts_{code}")])
    buttons.append([InlineKeyboardButton(
        "✏️ Изменить лимит", callback_data=f"promo_limit_{code}")])

    if is_active:
        buttons.append([InlineKeyboardButton(
            "⏸ Деактивировать", callback_data=f"promo_deact_{code}")])
    else:
        buttons.append([InlineKeyboardButton(
            "▶️ Активировать", callback_data=f"promo_act_{code}")])

    buttons.append([InlineKeyboardButton(
        "🗑 Удалить", callback_data=f"promo_del_{code}")])
    buttons.append([InlineKeyboardButton(
        "🔙 К списку", callback_data="promo_list")])
    buttons.append([InlineKeyboardButton(BTN_MENU, callback_data="goto_menu")])
    return InlineKeyboardMarkup(buttons)


def promo_limit_kb(code):
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("1", callback_data=f"plimset_{code}_1"),
         InlineKeyboardButton("2", callback_data=f"plimset_{code}_2"),
         InlineKeyboardButton("3", callback_data=f"plimset_{code}_3")],
        [InlineKeyboardButton("5", callback_data=f"plimset_{code}_5"),
         InlineKeyboardButton("10", callback_data=f"plimset_{code}_10"),
         InlineKeyboardButton("25", callback_data=f"plimset_{code}_25")],
        [InlineKeyboardButton("✏️ Другое", callback_data=f"plimcustom_{code}")],
        [InlineKeyboardButton("🔙 Назад", callback_data=f"promo_open_{code}")],
    ])


def promo_delete_confirm_kb(code):
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("✅ Да, удалить", callback_data=f"promodel_yes_{code}")],
        [InlineKeyboardButton("❌ Нет", callback_data=f"promo_open_{code}")],
    ])

async def prompt_reply_keyboard(query, text, reply_markup=None):
    """Use a new message when a flow needs a ReplyKeyboardMarkup.

    Telegram only accepts InlineKeyboardMarkup in edit_message_text; remove the
    old inline buttons and send a new message carrying the requested reply keyboard.
    """
    try:
        await query.edit_message_reply_markup(reply_markup=None)
    except Exception:
        pass
    return await query.message.reply_text(text, reply_markup=reply_markup)


def advertiser_webapp_kb():
    """Кнопка открытия личного кабинета рекламодателя внутри Telegram."""
    return InlineKeyboardMarkup([[InlineKeyboardButton(
        "📊 Открыть кабинет рекламодателя",
        web_app=WebAppInfo(url=f"{MINIAPP_URL}/advertiser.html?appv=20261018-act-launch-authfix6"))]])
