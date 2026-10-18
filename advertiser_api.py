"""Минимальный API кабинета рекламодателя. По умолчанию доступен только локально.
Для удалённого доступа используйте HTTPS-туннель и не публикуйте admin_api.
"""
from __future__ import annotations
import hashlib
import hmac
import json
import time
import threading
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, urlencode, parse_qs
from datetime import datetime

from config import TOKEN, MINIAPP_URL, logger

HOST = "127.0.0.1"
PORT = 8767
_server = None


def validate_init_data(init_data: str, max_age_seconds: int = 86400):
    if not init_data or len(init_data) > 12000:
        return None
    from urllib.parse import parse_qsl
    try:
        values = dict(parse_qsl(init_data, keep_blank_values=True, strict_parsing=False))
        received_hash = values.pop("hash", "")
        # Telegram's initData may include a separate Ed25519 `signature` field.
        # It is not part of the HMAC data_check_string; including it makes valid
        # Mini App sessions fail authentication on newer Telegram clients.
        values.pop("signature", None)
        if not received_hash:
            return None
        check_string = "\n".join(f"{k}={v}" for k, v in sorted(values.items()))
        secret = hmac.new(b"WebAppData", TOKEN.encode("utf-8"), hashlib.sha256).digest()
        calculated = hmac.new(secret, check_string.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(calculated, received_hash):
            return None
        auth_date = int(values.get("auth_date", "0"))
        now = int(time.time())
        if auth_date <= 0 or auth_date > now + 60 or now - auth_date > max_age_seconds:
            return None
        user = json.loads(values.get("user", "{}"))
        if not isinstance(user, dict) or not user.get("id"):
            return None
        return {"user": user, "auth_date": auth_date}
    except (ValueError, TypeError, json.JSONDecodeError):
        return None


def _notify_master_with_app_button(chat_id, text):
    """Send a master notification and keep a signed WebApp launch button in chat."""
    try:
        expires = int(time.time()) + 30 * 24 * 60 * 60
        uid = int(chat_id)
        payload = f"{uid}:{expires}"
        signature = hmac.new(str(TOKEN).encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
        query = urlencode({"master_uid": uid, "master_exp": expires, "master_sig": signature})
        app_url = f"{MINIAPP_URL.rstrip('/')}/index.html?appv=20261018-integrated-act-authdiag&launch=keyboard&role=master&{query}"
        markup = {"keyboard": [[{"text": "🧰 Открыть кабинет мастера · v6", "web_app": {"url": app_url}}]], "resize_keyboard": True, "is_persistent": True}
        body = json.dumps({"chat_id": str(uid), "text": str(text)[:3500], "reply_markup": markup}, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(f"https://api.telegram.org/bot{TOKEN}/sendMessage", data=body, headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=8) as response:
            return response.status == 200
    except Exception:
        return False


def _notify_client_with_app_button(chat_id, text):
    """Deliver a message and restore the client's personal, signed WebApp button."""
    try:
        from keyboards import _client_session_query
        from state import state
        uid = int(chat_id)
        client = {}
        for _mid, _bucket in getattr(state, "_masters_data", {}).items():
            candidate = (_bucket.get("clients", {}) or {}).get(uid)
            if isinstance(candidate, dict):
                client = candidate
                break
        signed = _client_session_query(client.get("registration_no") or uid)
        suffix = "registered=1"
        if client.get("registration_no"):
            suffix += "&registration_no=" + str(client["registration_no"])
        if signed:
            suffix += "&" + signed
        app_url = f"{MINIAPP_URL.rstrip('/')}/client.html?launch=keyboard&role=client&{suffix}"
        reply_markup = {"keyboard": [[{"text": "📱 Открыть приложение", "web_app": {"url": app_url}}]], "resize_keyboard": True, "is_persistent": True}
        body = json.dumps({"chat_id": str(uid), "text": str(text)[:3500], "reply_markup": reply_markup}, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(f"https://api.telegram.org/bot{TOKEN}/sendMessage", data=body, headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=8) as response:
            return response.status == 200
    except Exception:
        return False


def _money(value):
    try:
        return int(round(float(value or 0)))
    except (TypeError, ValueError):
        return 0


def advertiser_dashboard(state, telegram_user_id):
    advertiser = next((a for a in state.advertisers.values()
                       if str(a.get("telegram_user_id")) == str(telegram_user_id)
                       and a.get("active", True)), None)
    if not advertiser:
        return None
    advertiser_id = str(advertiser.get("id"))
    promos = []
    seen_codes = set()
    registrations = 0
    activations = 0
    repairs = 0
    accrued = 0
    weekly_repairs = 0
    weekly_accrued = 0
    from datetime import timedelta
    now_local = datetime.now()
    week_start = (now_local - timedelta(days=now_local.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    for mid, bucket in state._masters_data.items():
        for code, raw in (bucket.get("promocodes", {}) or {}).items():
            if not isinstance(raw, dict):
                continue
            if str(raw.get("advertiser_id") or "") != advertiser_id and str(raw.get("partner_contact", "")).lstrip("@").lower() != str(advertiser.get("username", "")).lstrip("@").lower():
                continue
            if code in seen_codes:
                continue
            seen_codes.add(code)
            stats = raw.get("stats", {}) or {}
            registrations += int(stats.get("link_registrations", 0) or 0)
            activations += int(stats.get("unique_clients", 0) or 0)
            repairs += int(stats.get("completed_count", 0) or 0)
            accrued += _money(stats.get("total_reward", 0))
            history = stats.get("completion_history", []) or []
            promo_week_repairs = 0
            promo_week_accrued = 0
            for item in history:
                try:
                    completed_at = datetime.fromisoformat(str(item.get("completed_at", "")))
                    if completed_at >= week_start:
                        promo_week_repairs += 1
                        promo_week_accrued += _money(item.get("partner_reward", 0))
                except (TypeError, ValueError):
                    continue
            weekly_repairs += promo_week_repairs
            weekly_accrued += promo_week_accrued
            promos.append({
                "code": code, "master_id": str(mid), "active": bool(raw.get("active", True)),
                "discount_percent": raw.get("discount_percent", 0),
                "reward_percent": raw.get("reward_percent", 0),
                "uses_per_client": raw.get("max_uses_per_client"),
                "expires_at": raw.get("expires_at"),
                "registrations": int(stats.get("link_registrations", 0) or 0),
                "activations": int(stats.get("unique_clients", 0) or 0),
                "repairs": int(stats.get("completed_count", 0) or 0),
                "accrued": _money(stats.get("total_reward", 0)),
                "weekly_repairs": promo_week_repairs,
                "weekly_accrued": promo_week_accrued,
            })
    payouts = [p for p in state.payouts.values() if str(p.get("advertiser_id")) == advertiser_id]
    paid = sum(_money(p.get("amount")) for p in payouts if p.get("status") in ("confirmed", "accepted"))
    pending = sum(_money(p.get("amount")) for p in payouts if p.get("status") in ("sent", "pending_review"))
    return {
        "advertiser": {"name": advertiser.get("name", "Рекламодатель"), "username": advertiser.get("username", ""),
                       "card_last4": str(advertiser.get("card_number", ""))[-4:] if advertiser.get("card_number") else "",
                       "created_at": advertiser.get("created_at", "")},
        "summary": {"registrations": registrations, "activations": activations, "repairs": repairs, "accrued": accrued,
                    "paid": paid, "pending": pending, "balance": max(0, accrued - paid - pending),
                    "weekly_repairs": weekly_repairs, "weekly_accrued": weekly_accrued,
                    "week_start": week_start.isoformat(timespec="seconds")},
        "promocodes": sorted(promos, key=lambda x: x["code"]),
        "payouts": sorted([{"id": p.get("id"), "code": p.get("code"), "amount": _money(p.get("amount")),
                             "status": p.get("status", "pending_review"), "created_at": p.get("created_at", ""),
                             "note": p.get("note", ""), "has_receipt": bool(p.get("receipt_file_id"))}
                            for p in payouts], key=lambda x: x.get("created_at", ""), reverse=True)[:100],
    }


def _notify_telegram(chat_id, text):
    """Короткое уведомление без передачи полного номера карты или других секретов."""
    try:
        body = urlencode({"chat_id": str(chat_id), "text": str(text)[:3500]}).encode("utf-8")
        req = urllib.request.Request(f"https://api.telegram.org/bot{TOKEN}/sendMessage", data=body, method="POST")
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.status == 200
    except Exception:
        return False


class _Handler(BaseHTTPRequestHandler):
    state = None
    def _cors(self):
        from urllib.parse import urlparse
        configured = urlparse(MINIAPP_URL)
        allowed_origin = f"{configured.scheme}://{configured.netloc}" if configured.scheme and configured.netloc else ""
        origin = self.headers.get("Origin", "")
        # Allow only the configured static Mini App origin, not arbitrary websites.
        if origin and origin.rstrip("/") == allowed_origin.rstrip("/"):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Telegram-Init-Data, X-Remont-Session")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    def _send(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def _auth(self):
        """Authenticate Telegram Mini App requests.

        Primary auth is Telegram initData. The bot's WebApp button also carries a
        signed per-user session. Some Telegram WebViews can send stale/invalid
        initData alongside that valid session, so the signed session is accepted
        only after signature/expiry checks and only for an enabled registered user.
        """
        init_data = self.headers.get("X-Telegram-Init-Data", "")
        verified = validate_init_data(init_data) if init_data else None
        if verified:
            return int(verified["user"]["id"])

        session = self.headers.get("X-Remont-Session", "")
        if session:
            try:
                parts = session.split(":")
                if len(parts) == 3:
                    uid, exp, signature = parts
                    user_id, expires = int(uid), int(exp)
                    message = f"{user_id}:{expires}"
                    expected = hmac.new(str(TOKEN).encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()
                    session_valid = (
                        user_id > 0
                        and int(time.time()) <= expires <= int(time.time()) + 30 * 24 * 60 * 60 + 60
                        and hmac.compare_digest(expected, signature)
                    )
                    if session_valid:
                        # If initData contains a readable Telegram user ID, a session
                        # for a different account must never be accepted.
                        if init_data:
                            try:
                                from urllib.parse import parse_qs
                                raw_user = parse_qs(init_data, keep_blank_values=True).get("user", [""])[0]
                                if raw_user:
                                    init_user_id = int(json.loads(raw_user).get("id", 0))
                                    if init_user_id and init_user_id != user_id:
                                        return None
                            except (ValueError, TypeError, json.JSONDecodeError):
                                # The signed session is independently verified below.
                                pass
                        client = self.state.get_client(user_id)
                        if client and client.get("registered"):
                            return user_id
                        if self.state.is_master(user_id):
                            return user_id
            except (ValueError, TypeError):
                pass

        reason = "empty_init_data" if not init_data else "invalid_signature_or_auth_date"
        try:
            logger.warning("Mini App Telegram auth failed (%s; initData_length=%s; session_present=%s).", reason, len(init_data), bool(session))
        except Exception:
            pass
        return None

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/health":
            return self._send(200, {"ok": True, "service": "remont-bt-api"})
        user_id = self._auth()
        if user_id is None:
            return self._send(401, {"error": "Не удалось подтвердить Telegram. Откройте приложение из чата с ботом."})
        if path.startswith("/api/master/"):
            if not self.state.is_master(user_id):
                return self._send(403, {"error": "Доступ разрешён только зарегистрированному мастеру."})
            bucket = getattr(self.state, "_masters_data", {}).get(int(user_id), {}) or {}
            clients = bucket.get("clients", {}) or {}
            orders = bucket.get("orders", {}) or {}
            acts = bucket.get("acts", {}) or {}
            pending_acts = bucket.get("pending_acts", {}) or {}
            messages = bucket.get("messages", {}) or {}
            promos = bucket.get("promocodes", {}) or {}
            def client_for(uid):
                try: return clients.get(int(uid)) or {}
                except (TypeError, ValueError): return {}
            if path == "/api/master/dashboard":
                profile = bucket.get("master", {}) or {}
                return self._send(200, {"profile": {"name": profile.get("name") or profile.get("full_name") or "Мастер", "phone": profile.get("phone", ""), "marketing_name": profile.get("marketing_name", ""), "show_reviews": profile.get("show_reviews", True), "referral_settings": profile.get("referral_settings", {})},
                    "stats": {"orders": len(orders), "new_orders": sum(1 for o in orders.values() if o.get("status") == "new"),
                              "accepted": sum(1 for o in orders.values() if o.get("status") == "accepted"),
                              "acts": len(acts) + len(pending_acts), "clients": len(clients),
                              "unread_messages": sum(1 for m in messages.values() if str(m.get("to_id")) == str(user_id) and not m.get("read_by_master"))}})
            if path == "/api/master/orders":
                rows=[]
                seen_order_ids = set()
                for o in orders.values():
                    row={k:o.get(k) for k in ("id","client_id","client_name","client_phone","client_username","device","brand","model","problem","when_date","when_time","address","house","apartment","comment","status","created_at","accepted_at","act_number","master_id")}
                    c=client_for(o.get("client_id")); row["client_name"] = row.get("client_name") or c.get("name", "Клиент"); row["client_phone"] = row.get("client_phone") or c.get("phone", "")
                    rows.append(row); seen_order_ids.add(str(row.get("id")))
                # Общие заявки видны мастерам до тех пор, пока их не забрал другой мастер.
                for oid, public_order in (getattr(self.state, "public_orders", {}) or {}).items():
                    if not isinstance(public_order, dict) or str(oid) in seen_order_ids:
                        continue
                    if public_order.get("status") != "new":
                        continue
                    assigned = public_order.get("assigned_master_id")
                    declined = {str(x) for x in (public_order.get("declined_master_ids") or [])}
                    if assigned not in (None, "", 0, "0", user_id, str(user_id)) or str(user_id) in declined:
                        continue
                    row={k:public_order.get(k) for k in ("id","client_id","client_name","client_phone","client_username","device","brand","model","problem","when_date","when_time","address","house","apartment","comment","status","created_at","accepted_at","act_number","master_id")}
                    row["source_public"] = True
                    row["master_id"] = user_id
                    rows.append(row)
                return self._send(200, {"orders": sorted(rows, key=lambda x:str(x.get("created_at") or ""), reverse=True)[:200]})
            if path == "/api/master/marketing-link":
                profile = bucket.get("master", {}) or {}
                if len(str(profile.get("marketing_name") or "").strip()) < 2:
                    return self._send(400, {"error": "Сначала сохраните название мастерской."})
                try:
                    req = urllib.request.Request(f"https://api.telegram.org/bot{TOKEN}/getMe")
                    with urllib.request.urlopen(req, timeout=5) as response:
                        bot_data = json.loads(response.read().decode("utf-8"))
                    username = str((bot_data.get("result") or {}).get("username") or "").strip()
                except Exception:
                    username = ""
                if not username:
                    return self._send(503, {"error": "Не удалось получить имя Telegram-бота. Повторите позже."})
                return self._send(200, {"name": profile.get("marketing_name"), "url": f"https://t.me/{username}?start=master_{int(user_id)}"})
            if path == "/api/master/clients":
                rows=[]
                for uid,c in clients.items():
                    rows.append({"id":uid,"name":c.get("name", "Клиент"),"phone":c.get("phone", ""),"registration_no":c.get("registration_no", ""),"username":c.get("username", ""),"registered":bool(c.get("registered"))})
                return self._send(200, {"clients": sorted(rows, key=lambda x:str(x.get("name") or "").casefold())[:500]})
            if path == "/api/master/messages":
                # Client messages are stored in state.messages; older master replies may
                # live in the per-master bucket. Merge by message ID so both directions
                # appear in one conversation without duplicate bubbles.
                combined = {}
                for source in (getattr(self.state, "messages", {}) or {}, messages):
                    for mid, message in source.items():
                        if not isinstance(message, dict):
                            continue
                        if str(message.get("from_id")) == str(user_id) or str(message.get("to_id")) == str(user_id):
                            combined[str(message.get("id") or mid)] = message
                rows=[]
                for mid, m in combined.items():
                    uid = m.get("from_id") if str(m.get("to_id")) == str(user_id) else m.get("to_id")
                    c=client_for(uid)
                    row={k:m.get(k) for k in ("id","from_id","to_id","type","text","created_at","read_by_master")}
                    row.update({"client_id":uid,"client_name":c.get("name", "Клиент"),"client_phone":c.get("phone", "")})
                    rows.append(row)
                    if str(m.get("to_id")) == str(user_id):
                        m["read_by_master"] = True
                if rows: self.state.save_now()
                return self._send(200, {"messages": sorted(rows, key=lambda x:str(x.get("created_at") or ""))[-300:]})
            if path == "/api/master/acts":
                rows=[]
                for a in list(acts.values()) + list(pending_acts.values()):
                    rows.append({k:a.get(k) for k in ("number","order_id","client_id","client_name","client_phone","device","brand","model","works","price","final_price","guarantee_text","guarantee_until","status","created_at","sent_at")})
                return self._send(200, {"acts": sorted(rows, key=lambda x:str(x.get("created_at") or ""), reverse=True)[:200]})
            if path == "/api/master/promos":
                return self._send(200, {"promocodes": [{"code":k,"partner_name":v.get("partner_name",""),"partner_contact":v.get("partner_contact",""),"discount_percent":v.get("discount_percent",0),"reward_percent":v.get("reward_percent",0),"active":v.get("active",True),"expires_at":v.get("expires_at"),"stats":v.get("stats",{})} for k,v in sorted(promos.items()) if isinstance(v,dict)]})
            return self._send(404, {"error": "Маршрут мастера не найден."})
        if path == "/api/advertiser/dashboard":
            data = advertiser_dashboard(self.state, user_id)
            if data is None:
                return self._send(403, {"error": "Кабинет не привязан к этому Telegram-аккаунту. Откройте ссылку-приглашение от мастера и нажмите /start."})
            return self._send(200, data)
        if path in ("/api/client/dashboard", "/api/client/profile"):
            client = self.state.get_client(user_id)
            if not client or not client.get("registered"):
                return self._send(403, {"error": "Клиент не зарегистрирован. Откройте приложение через /start и завершите регистрацию."})
            orders = [o for o in getattr(self.state, "orders", {}).values() if str(o.get("client_id")) == str(user_id)]
            acts = [a for a in getattr(self.state, "acts", {}).values() if str(a.get("client_id")) == str(user_id)]
            pending_acts = [a for a in getattr(self.state, "pending_acts", {}).values() if str(a.get("client_id")) == str(user_id)]
            messages = [m for m in getattr(self.state, "messages", {}).values()
                        if str(m.get("from_id")) == str(user_id) or str(m.get("to_id")) == str(user_id)]
            master_id = client.get("master_id") or getattr(self.state, "active_master_id", None)
            bucket = getattr(self.state, "_masters_data", {}).get(int(master_id), {}) if master_id else {}
            master = bucket.get("master", {}) if isinstance(bucket, dict) else {}
            def clean_order(o):
                return {k: o.get(k) for k in ("id", "device", "brand", "model", "problem", "when_date", "when_time", "house", "apartment", "address", "comment", "promocode", "status", "created_at", "accepted_at", "completed_at", "act_number") if k in o}
            def clean_act(a):
                return {k: a.get(k) for k in ("number", "device", "brand", "model", "works", "price", "final_price", "promo_snapshot", "guarantee_text", "guarantee_until", "status", "created_at", "sent_at", "confirmed_at", "pdf_file_id") if k in a}
            def clean_message(m):
                return {k: m.get(k) for k in ("id", "from_id", "to_id", "type", "text", "created_at") if k in m}
            profile = {k: client.get(k, "") for k in ("name", "phone", "gender", "birth_date", "pinfl", "registration_no", "username")}
            if path == "/api/client/profile":
                return self._send(200, {"profile": profile})
            return self._send(200, {
                "profile": profile,
                "orders": [clean_order(o) for o in sorted(orders, key=lambda x: str(x.get("created_at", "")), reverse=True)[:100]],
                "acts": [clean_act(a) for a in sorted(acts + pending_acts, key=lambda x: str(x.get("created_at", "")), reverse=True)[:100]],
                "messages": [clean_message(m) for m in sorted(messages, key=lambda x: str(x.get("created_at", ""))) [-100:]],
                "master": {"name": master.get("name", "Мастер"), "phone": master.get("phone", "")},
            })
        return self._send(404, {"error": "Маршрут не найден."})

    def do_POST(self):
        path = urlparse(self.path).path
        user_id = self._auth()
        if user_id is None:
            return self._send(401, {"error": "Не удалось подтвердить Telegram."})
        if path.startswith("/api/master/"):
            if not self.state.is_master(user_id):
                return self._send(403, {"error": "Доступ разрешён только зарегистрированному мастеру."})
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length < 0 or length > 30000: return self._send(413, {"error": "Слишком большой запрос."})
                payload = json.loads(self.rfile.read(length).decode("utf-8")) if length else {}
                if not isinstance(payload, dict): return self._send(400, {"error": "Некорректные данные."})
            except (ValueError, TypeError, json.JSONDecodeError):
                return self._send(400, {"error": "Некорректные данные."})
            bucket = getattr(self.state, "_masters_data", {}).get(int(user_id), {}) or {}
            clients = bucket.setdefault("clients", {}); orders = bucket.setdefault("orders", {}); messages = bucket.setdefault("messages", {}); acts = bucket.setdefault("acts", {}); pending_acts = bucket.setdefault("pending_acts", {})
            if path == "/api/master/settings":
                profile = bucket.setdefault("master", {})
                if "name" in payload:
                    name = str(payload.get("name") or "").strip()[:100]
                    if len(name) < 2: return self._send(400, {"error": "Укажите имя длиной от 2 символов."})
                    profile["name"] = name
                if "phone" in payload:
                    profile["phone"] = str(payload.get("phone") or "").strip()[:40]
                if "marketing_name" in payload:
                    marketing_name = str(payload.get("marketing_name") or "").strip()[:80]
                    if len(marketing_name) < 2: return self._send(400, {"error": "Название мастерской должно содержать минимум 2 символа."})
                    profile["marketing_name"] = marketing_name
                if "show_reviews" in payload:
                    profile["show_reviews"] = bool(payload.get("show_reviews"))
                if "referral_settings" in payload:
                    incoming = payload.get("referral_settings")
                    if not isinstance(incoming, dict): return self._send(400, {"error": "Настройки реферальной программы некорректны."})
                    from referral_service import settings_for_master
                    current = settings_for_master(self.state, user_id)
                    try:
                        discount = float(incoming.get("new_client_discount_percent", current["new_client_discount_percent"]))
                        reward = float(incoming.get("referrer_reward_percent", current["referrer_reward_percent"]))
                        invites = int(incoming.get("invites_per_batch", current["invites_per_batch"]))
                    except (TypeError, ValueError): return self._send(400, {"error": "Проверьте проценты и количество приглашений."})
                    if not 0 <= discount <= 100 or not 0 <= reward <= 100 or not 1 <= invites <= 100:
                        return self._send(400, {"error": "Проценты должны быть 0–100, приглашения — 1–100."})
                    profile["referral_settings"] = {"enabled": bool(incoming.get("enabled", current["enabled"])), "new_client_discount_percent": discount, "referrer_reward_percent": reward, "invites_per_batch": invites}
                self.state.save_now()
                return self._send(200, {"ok": True, "message": "Настройки сохранены."})
            if path == "/api/master/message":
                client_id = str(payload.get("client_id", "")).strip(); message = str(payload.get("text", "")).strip()
                try: uid=int(client_id)
                except (ValueError, TypeError): return self._send(400, {"error": "Выберите клиента из списка диалогов."})
                client = clients.get(uid)
                if uid <= 0 or not client or str(client.get("master_id") or user_id) != str(user_id): return self._send(404, {"error": "Клиент не найден в вашем кабинете."})
                if not message or len(message)>1500: return self._send(400, {"error": "Введите сообщение длиной до 1500 символов."})
                # Save the same conversation record in the global message store (used by
                # the client WebApp) and the master bucket (legacy handlers compatibility).
                msg_id=self.state.gen_msg_number()
                record={"id":msg_id,"from_id":int(user_id),"to_id":uid,"type":"text","text":message,"created_at":datetime.now().isoformat(timespec="seconds")}
                sent = _notify_client_with_app_button(uid, f"📩 Сообщение от мастера {((bucket.get('master') or {}).get('name') or 'Remont BT')}:\n\n{message}")
                if not sent: return self._send(502, {"error": "Не удалось доставить сообщение в Telegram. Возможно, клиент заблокировал бота. Сообщение не отмечено отправленным."})
                self.state.messages[msg_id]=record
                messages[msg_id]=record.copy()
                self.state.save_now()
                return self._send(200, {"ok":True,"message":"Сообщение отправлено выбранному клиенту.","id":msg_id})
            if path.startswith("/api/master/orders/") and path.endswith("/decision"):
                order_id=path[len("/api/master/orders/"):-len("/decision")].strip("/"); order=orders.get(order_id)
                decision=str(payload.get("decision", ""))
                if decision not in ("accept","reject"): return self._send(400, {"error":"Недопустимое действие."})
                public_order = None
                if not order:
                    public_order = (getattr(self.state, "public_orders", {}) or {}).get(order_id)
                    if isinstance(public_order, dict) and public_order.get("status") == "new":
                        assigned = public_order.get("assigned_master_id")
                        if assigned not in (None, "", 0, "0", user_id, str(user_id)):
                            return self._send(409, {"error":"Эту общую заявку уже забрал другой мастер."})
                        if decision == "reject":
                            declined = {str(x) for x in (public_order.get("declined_master_ids") or [])}; declined.add(str(user_id))
                            public_order["declined_master_ids"] = sorted(declined); self.state.save_now()
                            return self._send(200,{"ok":True,"message":"Заявка скрыта из вашей очереди. Другие мастера по-прежнему могут её принять."})
                        public_order["assigned_master_id"] = int(user_id)
                        public_order["master_id"] = int(user_id)
                        public_order["status"] = "accepted"
                        public_order["updated_at"] = datetime.now().isoformat(timespec="seconds")
                        order = dict(public_order)
                        orders[order_id] = order
                        try: client_uid = int(order.get("client_id"))
                        except (TypeError, ValueError): client_uid = 0
                        if client_uid > 0 and client_uid not in clients:
                            for other_mid, other_bucket in getattr(self.state, "_masters_data", {}).items():
                                found = (other_bucket.get("clients", {}) or {}).get(client_uid)
                                if isinstance(found, dict):
                                    copied = dict(found); copied["master_id"] = int(user_id); copied.pop("unassigned", None)
                                    clients[client_uid] = copied; break
                        self.state.save_now()
                        uid = order.get("client_id")
                        if uid:
                            _notify_telegram(uid, f"✅ Мастер принял вашу общую заявку {order_id}.")
                        return self._send(200,{"ok":True,"message":"Общая заявка закреплена за вами и принята."})
                    else:
                        return self._send(404, {"error":"Заявка не найдена в вашем кабинете."})
                if str(order.get("master_id") or user_id) != str(user_id): return self._send(403, {"error":"Заявка назначена другому мастеру."})
                if order.get("status") != "new": return self._send(409, {"error":"Решение доступно только для новой заявки."})
                order["status"]="accepted" if decision=="accept" else "rejected"; order["master_id"]=int(user_id); order["updated_at"]=datetime.now().isoformat(timespec="seconds");
                self.state.save_now()
                uid=order.get("client_id")
                if uid:
                    _notify_telegram(uid, (f"✅ Мастер принял вашу заявку {order_id}." if decision=="accept" else f"❌ Мастер отклонил вашу заявку {order_id}."))
                return self._send(200,{"ok":True,"message":"Заявка принята." if decision=="accept" else "Заявка отклонена."})
            if path == "/api/master/act":
                order_id=str(payload.get("order_id", "")).strip()[:80]
                order=orders.get(order_id) if order_id else None
                if order_id and not order: return self._send(404,{"error":"Заявка не найдена. Если клиент обратился по телефону, создайте акт без заявки."})
                if order and str(order.get("master_id") or user_id) != str(user_id): return self._send(403,{"error":"Заявка назначена другому мастеру."})
                if order and (order.get("status") != "accepted" or order.get("act_number")): return self._send(409,{"error":"Для связанной заявки акт доступен только после принятия и только один раз."})
                device=str(payload.get("device") or (order or {}).get("device") or "").strip()[:120]
                brand=str(payload.get("brand") or (order or {}).get("brand") or "").strip()[:120]
                model=str(payload.get("model") or (order or {}).get("model") or "—").strip()[:120]
                works=payload.get("works", []); works=[str(x).strip()[:200] for x in works if str(x).strip()][:30] if isinstance(works,list) else []
                try: price=int(payload.get("price",0)); guarantee_days=int(payload.get("guarantee_days",30))
                except (TypeError,ValueError): return self._send(400,{"error":"Цена и срок гарантии должны быть числами."})
                if not device or not brand or not works or price<=0 or not 0<=guarantee_days<=3650: return self._send(400,{"error":"Заполните технику, бренд, работу, цену и гарантию."})
                client_name=str(payload.get("client_name") or (order or {}).get("client_name") or "").strip()[:150]
                client_phone=str(payload.get("client_phone") or (order or {}).get("client_phone") or "").strip()[:60]
                if not order and (len(client_name)<2 or len(''.join(ch for ch in client_phone if ch.isdigit()))<7):
                    return self._send(400,{"error":"Для акта без заявки укажите имя клиента и номер телефона."})
                house_value=str(payload.get("house") or (order or {}).get("house") or "").strip()[:80]
                loc_value=payload.get("location") if isinstance(payload.get("location"),dict) else {}
                latitude=loc_value.get("latitude")
                longitude=loc_value.get("longitude")
                if not house_value:
                    return self._send(400,{"error":"Поле «Дом» обязательно для заполнения."})
                try:
                    latitude=float(latitude); longitude=float(longitude)
                except (TypeError,ValueError):
                    return self._send(400,{"error":"Укажите текущую GPS-локацию перед сохранением акта."})
                if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
                    return self._send(400,{"error":"Координаты локации некорректны. Укажите GPS-локацию заново."})
                # При ручном акте попробуем связать клиента по телефону, но не требуем его регистрации в боте.
                def norm_phone(value): return ''.join(ch for ch in str(value or '') if ch.isdigit())
                uid=(order or {}).get("client_id"); client=clients.get(int(uid)) if uid is not None and str(uid).isdigit() else None
                if not order:
                    wanted=norm_phone(client_phone)
                    for candidate_id,candidate in clients.items():
                        if wanted and norm_phone(candidate.get("phone"))==wanted:
                            uid=candidate_id; client=candidate; break
                from datetime import timedelta
                from pdf_gen import generate_pdf
                now=datetime.now(); guarantee_until=(now+timedelta(days=guarantee_days)).strftime("%d.%m.%Y") if guarantee_days else "—"
                guarantee_text={0:"Без гарантии",7:"7 дней",30:"1 месяц",90:"3 месяца",180:"6 месяцев"}.get(guarantee_days,f"{guarantee_days} дней")
                number=self.state.gen_act_number()
                act={"number":number,"master_id":int(user_id),"client_name":client_name or (client or {}).get("name","Клиент"),"client_phone":client_phone or (client or {}).get("phone",""),"client_registration_no":(client or {}).get("registration_no"),"device":device,"brand":brand,"model":model,"works":works,"price":price,"guarantee_days":guarantee_days,"guarantee_text":guarantee_text,"guarantee_until":guarantee_until,"guarantee_scope":str(payload.get("guarantee_scope", "")).strip()[:500],"guarantee_exclusions":str(payload.get("guarantee_exclusions", "")).strip()[:500],"location":{"address":"","house":house_value,"apartment":str(payload.get("apartment") or (order or {}).get("apartment") or "").strip()[:80],"latitude":latitude,"longitude":longitude,"accuracy":loc_value.get("accuracy")},"status":"sending","created_at":now.isoformat(timespec="seconds")}
                if order_id: act["order_id"]=order_id
                if uid is not None and str(uid).isdigit() and int(uid)>0: act["client_id"]=int(uid)
                act["pdf_path"]=generate_pdf(act,bucket.get("master",{}))
                if order:
                    acts[number]=act
                    order.update({"act_number":number,"status":"act_issued","act_issued_at":now.isoformat(timespec="seconds"),"updated_at":now.isoformat(timespec="seconds")})
                else:
                    # Отдельный акт сохраняется в pending_acts до регистрации/привязки клиента.
                    pending_acts[number]=act
                    if client is not None and uid is not None:
                        acts[number]=act; pending_acts.pop(number,None)
                self.state.save_now()
                sent=False
                # Telegram-доставка возможна только если найден клиент с Telegram ID.
                try:
                    import os, uuid as _uuid
                    pdf_path=act.get("pdf_path")
                    if uid is not None and str(uid).isdigit() and int(uid)>0 and pdf_path and os.path.isfile(pdf_path):
                        boundary="----RemontBT"+_uuid.uuid4().hex; caption=f"📄 Акт выполненных работ № {number}" + (f" по заявке {order_id}" if order_id else "")
                        fields={"chat_id":str(uid),"caption":caption}; chunks=[]
                        for key,val in fields.items(): chunks += [f"--{boundary}\r\nContent-Disposition: form-data; name=\"{key}\"\r\n\r\n{val}\r\n".encode()]
                        with open(pdf_path,"rb") as f: file_bytes=f.read()
                        chunks += [f"--{boundary}\r\nContent-Disposition: form-data; name=\"document\"; filename=\"act_{number}.pdf\"\r\nContent-Type: application/pdf\r\n\r\n".encode(),file_bytes,f"\r\n--{boundary}--\r\n".encode()]
                        req=urllib.request.Request(f"https://api.telegram.org/bot{TOKEN}/sendDocument",data=b"".join(chunks),headers={"Content-Type":f"multipart/form-data; boundary={boundary}"},method="POST")
                        with urllib.request.urlopen(req,timeout=12) as resp: sent=resp.status==200
                except Exception as exc: logger.warning("Master WebApp act delivery failed (%s)", type(exc).__name__)
                act["status"]="sent" if sent else ("pending_client" if not order and (client is None or uid is None) else "pending_delivery")
                if sent: act["sent_at"]=datetime.now().isoformat(timespec="seconds")
                self.state.save_now()
                message=f"Акт № {number} создан." + (" PDF отправлен клиенту." if sent else (" PDF сохранён. Клиент не привязан к Telegram — можно распечатать или передать PDF вручную." if not order and (client is None or uid is None) else " Акт сохранён, но PDF не доставлен — проверьте доступность бота."))
                return self._send(200,{"ok":True,"message":message,"number":number,"delivered":sent})
            if path == "/api/master/promo":
                from models.promocode import Promocode
                code=str(payload.get("code", "")).strip().upper(); name=str(payload.get("partner_name", "")).strip(); contact=str(payload.get("partner_contact", "")).strip(); card=''.join(ch for ch in str(payload.get("partner_card", "")) if ch.isdigit())
                try: discount=float(payload.get("discount_percent")); reward=float(payload.get("reward_percent")); limit=int(payload.get("max_act")); expiry=str(payload.get("expires_at", "")).strip()
                except (TypeError,ValueError): return self._send(400,{"error":"Проверьте скидку, вознаграждение и лимит."})
                if not __import__('re').fullmatch(r"[A-Z0-9_-]{4,20}",code): return self._send(400,{"error":"Код должен содержать 4–20 символов A-Z, 0-9, _ или -."})
                if len(name)<2 or not contact or not 16<=len(card)<=19 or not 1<=discount<=50 or not 0<=reward<=30 or not 1<=limit<=100: return self._send(400,{"error":"Проверьте имя, контакт, карту, проценты и лимит."})
                if code in (bucket.get("promocodes",{}) or {}): return self._send(409,{"error":"Промокод с таким кодом уже существует."})
                promo=Promocode(code,name,contact,discount,reward,limit,int(user_id),max_uses_per_client=limit,expires_at=expiry,partner_card=card)
                bucket.setdefault("promocodes", {})[code]=promo.to_dict(); self.state.save_now()
                return self._send(200,{"ok":True,"message":f"Промокод {code} создан."})
            return self._send(404,{"error":"Маршрут мастера не найден."})
        if path.startswith("/api/client/"):
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length < 0 or length > 20000:
                    return self._send(413, {"error": "Слишком большой запрос."})
                payload = json.loads(self.rfile.read(length).decode("utf-8")) if length else {}
                if not isinstance(payload, dict):
                    return self._send(400, {"error": "Некорректные данные."})
                client = self.state.get_client(user_id)
                if not client or not client.get("registered"):
                    return self._send(403, {"error": "Клиент не зарегистрирован."})
                if path == "/api/client/promo":
                    code = str(payload.get("code", "")).strip().upper()[:64]
                    promo = self.state.get_promo(code)
                    if not promo:
                        return self._send(404, {"error": "Промокод не найден."})
                    can, reason = promo.can_client_use(user_id)
                    if not can:
                        return self._send(400, {"error": reason})
                    from promo_service import can_bind_promo
                    allowed, reason = can_bind_promo(self.state, client, code, user_id)
                    if not allowed:
                        return self._send(400, {"error": reason})
                    client["promocode"] = code
                    client["acquisition_source"] = f"promo:{code}"
                    promo.register_entry(user_id)
                    promo.register_link_registration(user_id)
                    self.state.save_promo_now(promo)
                    self.state.save_now()
                    return self._send(200, {"ok": True, "message": f"Промокод {code} активирован.", "discount_percent": promo.discount_percent, "expires_at": promo.expires_at or "Без срока"})
                if path == "/api/client/confirm-act":
                    order_id = str(payload.get("order_id", "")).strip()[:80]
                    order = getattr(self.state, "orders", {}).get(order_id)
                    if not order or str(order.get("client_id")) != str(user_id):
                        return self._send(404, {"error": "Заявка не найдена."})
                    if order.get("status") != "act_issued":
                        return self._send(409, {"error": "Эта заявка не ожидает подтверждения акта."})
                    now = datetime.now().isoformat(timespec="seconds")
                    order.update({"status": "closed", "closed_at": now, "updated_at": now,
                                  "act_confirmed_at": now, "act_confirmation_method": "client"})
                    act_number = order.get("act_number")
                    act = getattr(self.state, "acts", {}).get(act_number) if act_number else None
                    if act:
                        act.update({"status": "confirmed", "confirmed_at": now, "confirmation_method": "client"})
                    self.state.save_now()
                    _notify_telegram(user_id, f"✅ Вы подтвердили выполнение работ по заявке {order_id}. Акт {act_number or ''} подтверждён, заявка закрыта.")
                    master_id = order.get("master_id")
                    if master_id:
                        _notify_telegram(master_id, f"☑️ Заявка {order_id} закрыта. Акт {act_number or '—'} подтверждён клиентом.")
                    return self._send(200, {"ok": True, "message": "Выполнение подтверждено. Заявка закрыта."})
                if path == "/api/client/message":
                    message = str(payload.get("text", "")).strip()
                    if not message or len(message) > 1500:
                        return self._send(400, {"error": "Введите сообщение до 1500 символов."})
                    master_id = client.get("master_id") or getattr(self.state, "active_master_id", None)
                    if not master_id:
                        return self._send(503, {"error": "Мастер пока не назначен."})
                    msg_id = self.state.gen_msg_number()
                    record = {"id": msg_id, "from_id": user_id, "to_id": int(master_id), "type": "text", "text": message, "created_at": datetime.now().isoformat(timespec="seconds")}
                    self.state.messages[msg_id] = record
                    # Mirror the incoming client message into the assigned master's
                    # bucket, so legacy data consumers and the new WebApp agree.
                    master_bucket = getattr(self.state, "_masters_data", {}).get(int(master_id), {}) or {}
                    master_bucket.setdefault("messages", {})[msg_id] = record.copy()
                    self.state.save_now()
                    sent = _notify_master_with_app_button(master_id, f"💬 Сообщение от клиента {client.get('name', '—')} (ID {user_id}):\n\n{message}\n\nОткройте кабинет мастера → «Сообщения» и выберите этот диалог, чтобы ответить именно этому клиенту.")
                    if not sent:
                        return self._send(502, {"error": "Сообщение сохранено, но уведомить мастера сейчас не удалось. Повторите позже."})
                    return self._send(200, {"ok": True, "message": "Сообщение отправлено мастеру."})
                if path == "/api/client/profile":
                    from handlers.client.profile import has_active_installments
                    from utils import clean_phone, valid_phone, parse_birth_date, check_pinfl_against_user
                    if has_active_installments(user_id, client):
                        return self._send(403, {"error": "Изменение профиля заблокировано до полного погашения активной рассрочки."})
                    name = str(payload.get("name", client.get("name", ""))).strip()[:150]
                    phone = clean_phone(payload.get("phone", client.get("phone", "")))
                    gender = str(payload.get("gender", client.get("gender", ""))).strip()[:20]
                    birth_date = str(payload.get("birth_date", client.get("birth_date", ""))).strip()[:20]
                    pinfl = "".join(ch for ch in str(payload.get("pinfl", client.get("pinfl", ""))) if ch.isdigit())
                    if len(name) < 2:
                        return self._send(400, {"error": "Укажите ФИО (не менее 2 символов)."})
                    if not valid_phone(phone):
                        return self._send(400, {"error": "Введите корректный номер +998XXXXXXXXX."})
                    other_uid = self.state.find_client_by_phone(phone)
                    if other_uid is not None and str(other_uid) != str(user_id):
                        return self._send(409, {"error": "Этот номер уже привязан к другой карточке клиента."})
                    if gender or birth_date or pinfl:
                        parsed = parse_birth_date(birth_date)
                        if gender not in ("Мужской", "Женский") or not parsed or len(pinfl) != 14:
                            return self._send(400, {"error": "Проверьте пол, дату рождения и ПИНФЛ (14 цифр)."})
                        ok, _err, _info = check_pinfl_against_user(pinfl, gender, parsed)
                        if not ok:
                            return self._send(400, {"error": "ПИНФЛ не прошёл проверку для указанного пола и даты рождения."})
                    client.update({"name": name, "phone": phone, "registered": True})
                    if gender: client["gender"] = gender
                    if birth_date: client["birth_date"] = birth_date
                    if pinfl: client["pinfl"] = pinfl
                    self.state.save_now()
                    return self._send(200, {"ok": True, "message": "Профиль сохранён.", "profile": {k: client.get(k, "") for k in ("name", "phone", "gender", "birth_date", "pinfl", "registration_no")}})
            except (ValueError, TypeError, json.JSONDecodeError) as exc:
                return self._send(400, {"error": "Некорректные данные запроса."})
        if path == "/api/advertiser/card-request":
            try:
                length = min(int(self.headers.get("Content-Length", "0")), 10000)
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
                card = "".join(ch for ch in str(payload.get("card_number", "")) if ch.isdigit())
                if len(card) < 16 or len(card) > 19:
                    return self._send(400, {"error": "Введите номер карты длиной 16–19 цифр."})
                advertiser = next((a for a in self.state.advertisers.values()
                                   if str(a.get("telegram_user_id")) == str(user_id) and a.get("active", True)), None)
                if not advertiser:
                    return self._send(403, {"error": "Кабинет не привязан к этому Telegram-аккаунту."})
                advertiser["card_change_request"] = {"card_number": card, "status": "pending", "created_at": datetime.now().isoformat(timespec="seconds")}
                self.state.save_now()
                last4 = card[-4:]
                for master_id in advertiser.get("master_ids", []) or [advertiser.get("created_by_master")]:
                    if master_id:
                        _notify_telegram(master_id, f"🔔 Рекламодатель {advertiser.get('name', '—')} запросил изменение карты. Новый номер оканчивается на **** {last4}. Проверьте запрос командой /advertisers.")
                return self._send(200, {"ok": True, "message": "Запрос на изменение реквизитов отправлен мастеру на проверку."})
            except (ValueError, TypeError, json.JSONDecodeError):
                return self._send(400, {"error": "Некорректные данные."})
        match = __import__("re").fullmatch(r"/api/advertiser/payouts/([^/]+)/decision", path)
        if match:
            try:
                length = min(int(self.headers.get("Content-Length", "0")), 10000)
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
                decision = str(payload.get("decision", ""))
                if decision not in ("confirmed", "disputed"):
                    return self._send(400, {"error": "Решение должно быть confirmed или disputed."})
                payout = self.state.payouts.get(match.group(1))
                advertiser = next((a for a in self.state.advertisers.values()
                                   if str(a.get("telegram_user_id")) == str(user_id)), None)
                if not advertiser or not payout or str(payout.get("advertiser_id")) != str(advertiser.get("id")):
                    return self._send(404, {"error": "Выплата не найдена."})
                payout["advertiser_decision"] = decision
                payout["advertiser_decision_at"] = datetime.now().isoformat(timespec="seconds")
                if decision == "disputed":
                    payout["status"] = "disputed"
                    payout["dispute_note"] = str(payload.get("note", ""))[:500]
                    # Возвращаем сумму в задолженность промокода, чтобы спорный перевод не считался оплаченным.
                    bucket = self.state._masters_data.get(int(payout.get("master_id", 0)), {})
                    promo_raw = (bucket.get("promocodes", {}) or {}).get(str(payout.get("code", "")))
                    if isinstance(promo_raw, dict):
                        payments = promo_raw.get("payments", []) or []
                        payment = next((x for x in payments if str(x.get("payout_id")) == str(payout.get("id"))), None)
                        if payment and not payment.get("dispute_reversed"):
                            stats = promo_raw.setdefault("stats", {})
                            amount = _money(payout.get("amount"))
                            stats["total_paid"] = max(0, _money(stats.get("total_paid")) - amount)
                            stats["balance_due"] = _money(stats.get("balance_due")) + amount
                            payment["status"] = "disputed"
                            payment["dispute_reversed"] = True
                else:
                    payout["status"] = "confirmed"
                payout["advertiser_decision_at"] = datetime.now().isoformat(timespec="seconds")
                self.state.save_now()
                if payout.get("master_id"):
                    note = f"Выплата {payout.get('id')} по промокоду {payout.get('code')} подтверждена рекламодателем." if decision == "confirmed" else f"⚠️ Рекламодатель оспорил выплату {payout.get('id')} по промокоду {payout.get('code')}. Причина: {payout.get('dispute_note', 'не указана')}. Проверьте чек и расчёт."
                    _notify_telegram(payout.get("master_id"), note)
                return self._send(200, {"ok": True, "message": "Ответ сохранён."})
            except (ValueError, TypeError, json.JSONDecodeError):
                return self._send(400, {"error": "Некорректные данные."})
        return self._send(404, {"error": "Маршрут не найден."})

    def log_message(self, fmt, *args):
        pass


def start_advertiser_api(state):
    global _server
    if _server is not None:
        return _server
    handler = type("BoundAdvertiserHandler", (_Handler,), {"state": state})
    try:
        _server = ThreadingHTTPServer((HOST, PORT), handler)
    except OSError as exc:
        logger.warning("Кабинет рекламодателя API не запущен: %s", exc)
        return None
    thread = threading.Thread(target=_server.serve_forever, name="remont-advertiser-api", daemon=True)
    thread.start()
    logger.info("Advertiser API listening on %s:%s", HOST, PORT)
    return _server
