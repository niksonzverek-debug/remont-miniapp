# -*- coding: utf-8 -*-
"""Local-only admin API that mutates master accounts in the live bot State."""
from __future__ import annotations
import json
import secrets
import threading
import re
import os
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
HOST, PORT = "127.0.0.1", 8766
_TOKEN_FILE = ROOT / ".admin_api_token"
_server = None

def _ensure_token():
    if _TOKEN_FILE.exists():
        token = _TOKEN_FILE.read_text(encoding="utf-8").strip()
        if len(token) >= 32:
            return token
    token = secrets.token_urlsafe(40)
    _TOKEN_FILE.write_text(token, encoding="utf-8")
    try:
        _TOKEN_FILE.chmod(0o600)
    except OSError:
        pass
    return token

REFERRAL_CONFIG = ROOT / "referral_program.json"
SNAPSHOT_RETENTION = 14
_backup_thread_started = False

def _read_referral_settings():
    defaults = {"enabled": False, "new_client_discount_percent": 5.0,
                "referrer_reward_percent": 5.0, "unlimited_rewards": False,
                "updated_at": None}
    try:
        saved = json.loads(REFERRAL_CONFIG.read_text(encoding="utf-8"))
        if isinstance(saved, dict): defaults.update(saved)
    except (OSError, ValueError):
        pass
    return defaults

def _write_referral_settings(payload):
    if not isinstance(payload, dict):
        raise ValueError("Ожидались настройки в формате JSON.")
    current = _read_referral_settings()
    enabled = payload.get("enabled", current["enabled"])
    unlimited = payload.get("unlimited_rewards", current["unlimited_rewards"])
    if not isinstance(enabled, bool) or not isinstance(unlimited, bool):
        raise ValueError("Параметры включения должны быть true/false.")
    if unlimited:
        raise ValueError("Безлимитные приглашения отключены: действует лимит 10 приглашений и запрос мастеру на следующие 10.")
    try:
        new_discount = float(payload.get("new_client_discount_percent", current["new_client_discount_percent"]))
        reward = float(payload.get("referrer_reward_percent", current["referrer_reward_percent"]))
    except (TypeError, ValueError):
        raise ValueError("Проценты должны быть числами.")
    if not (0 <= new_discount <= 100 and 0 <= reward <= 100):
        raise ValueError("Проценты должны быть в диапазоне от 0 до 100.")
    saved = {"enabled": enabled, "new_client_discount_percent": new_discount,
             "referrer_reward_percent": reward, "unlimited_rewards": False,
             "updated_at": datetime.now().isoformat(timespec="seconds")}
    tmp = REFERRAL_CONFIG.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(saved, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, REFERRAL_CONFIG)
    return saved

def _referral_summary(state):
    settings = _read_referral_settings()
    referrals = []
    sources = {}
    for mid, bucket in getattr(state, "_masters_data", {}).items():
        clients = bucket.get("clients", {}) if isinstance(bucket, dict) else {}
        for cid, client in clients.items():
            if not isinstance(client, dict): continue
            referrer = next((client.get(k) for k in ("referred_by", "referrer_id", "invited_by", "referral_parent_id") if client.get(k) not in (None, "")), None)
            source = next((client.get(k) for k in ("acquisition_source", "lead_source", "referral_source", "source") if client.get(k) not in (None, "")), None)
            if source:
                src = str(source).strip()
                if src.lower() not in {"admin_panel", "manual", "вручную", "unknown", "неизвестно"}:
                    sources[src] = sources.get(src, 0) + 1
            if referrer is not None:
                referrals.append({"client_id": str(cid), "client_name": client.get("name", client.get("full_name", "—")),
                                  "phone": client.get("phone", "—"), "referrer_id": str(referrer),
                                  "master_id": str(mid), "created_at": client.get("created_at", "—"),
                                  "reward_status": ("Начислено" if client.get("referral_first_repair_rewarded") else ("Ожидает первого ремонта" if client.get("referred_by") else "—"))})
    return {"settings": settings, "referral_count": len(referrals), "referrals": referrals,
            "source_counts": sorted([{"source": k, "count": v} for k, v in sources.items()], key=lambda x: (-x["count"], x["source"].lower())),
            "tracking_note": "Реферальные связи, скидочные кредиты и источники привлечения сохраняются ботом; начисление пригласившему происходит после отправки акта клиенту."}

def _create_daily_snapshot(state):
    folder = ROOT / "backups"
    folder.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    target = folder / f"admin_db_snapshot_{stamp}.json"
    suffix = 1
    while target.exists():
        target = folder / f"admin_db_snapshot_{stamp}_{suffix:02d}.json"; suffix += 1
    data = state._serializable_data()
    tmp = target.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, target)
    snapshots = sorted(folder.glob("admin_db_snapshot_*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    for old in snapshots[SNAPSHOT_RETENTION:]:
        try: old.unlink()
        except OSError: pass
    return target

def _daily_backup_loop(state):
    # Check hourly; take at most one automatic snapshot per local calendar day.
    while True:
        try:
            folder = ROOT / "backups"
            folder.mkdir(parents=True, exist_ok=True)
            today = datetime.now().strftime("%Y%m%d")
            today_exists = any(p.name.startswith(f"admin_db_snapshot_{today}_") for p in folder.glob("admin_db_snapshot_*.json"))
            if not today_exists:
                _create_daily_snapshot(state)
        except Exception as exc:
            try:
                with (ROOT / "admin_backup_errors.log").open("a", encoding="utf-8") as f:
                    f.write(f"{datetime.now().isoformat(timespec='seconds')} {type(exc).__name__}: {exc}\n")
            except OSError: pass
        # 60 minute interval; daemon thread does not block bot shutdown.
        threading.Event().wait(3600)

class _Handler(BaseHTTPRequestHandler):
    state = None
    token = None
    def _send(self, status, payload):
        # Record successful write operations without storing tokens or submitted private fields.
        if getattr(self, "command", "") == "POST" and status == 200:
            try:
                entry = {"time": datetime.now().isoformat(timespec="seconds"), "action": urlparse(self.path).path,
                         "result": str(payload.get("message", payload.get("name", "Операция выполнена")))[:240]}
                with (ROOT / "admin_actions.jsonl").open("a", encoding="utf-8") as audit:
                    audit.write(json.dumps(entry, ensure_ascii=False) + "\n")
            except OSError:
                pass
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)
    def _authorized(self):
        return self.client_address[0] in ("127.0.0.1", "::1") and secrets.compare_digest(self.headers.get("X-Remont-Admin", ""), self.token or "")

    def _bucket(self, master_id):
        try:
            mid = int(master_id)
        except (TypeError, ValueError):
            return None
        return getattr(self.state, "_masters_data", {}).get(mid)

    def _record_key(self, records, record_id):
        for key in records:
            if str(key) == str(record_id):
                return key
        return None

    def _update_record(self, kind, master_id, record_id, fields):
        if not isinstance(fields, dict) or not fields:
            return 400, {"error": "Не переданы поля для изменения."}
        bucket = self._bucket(master_id)
        if bucket is None:
            return 404, {"error": "Мастер не найден."}
        allowed = {
            "clients": {"name", "full_name", "phone", "username", "address", "house", "apartment"},
            "orders": {"title", "device", "status", "price", "address", "house", "apartment", "work", "parts", "promo_code", "payment_status", "payment_method", "guarantee", "comment"},
            "acts": {"device", "status", "price", "address", "house", "apartment", "work", "parts", "promo_code", "payment_status", "payment_method", "guarantee", "comment"},
            "promocodes": {"active", "discount_percent", "reward_percent", "expires_at", "partner_name", "partner_contact"},
        }
        if kind not in allowed:
            return 400, {"error": "Этот тип записей нельзя изменять из панели."}
        if set(fields) - allowed[kind]:
            return 400, {"error": "Переданы запрещённые поля: " + ", ".join(sorted(set(fields)-allowed[kind]))}
        records = bucket.get(kind)
        if not isinstance(records, dict):
            return 404, {"error": "Раздел данных не найден."}
        key = self._record_key(records, record_id)
        if key is None or not isinstance(records.get(key), dict):
            return 404, {"error": "Запись не найдена."}
        rec = records[key]
        for field, value in fields.items():
            target = field
            if kind in ("orders", "acts"):
                if field == "title":
                    target = next((x for x in ("title", "problem", "description") if x in rec), "problem")
                elif field == "price":
                    target = "final_price" if "final_price" in rec and "price" not in rec else "price"
            elif kind == "clients" and field == "name":
                target = next((x for x in ("name", "full_name", "fio") if x in rec), "name")
            if kind == "promocodes":
                if field == "active":
                    if not isinstance(value, bool):
                        return 400, {"error": "Поле active должно быть true или false."}
                elif field in ("discount_percent", "reward_percent"):
                    try: value = float(value)
                    except (TypeError, ValueError): return 400, {"error": f"Поле {field} должно быть числом."}
                    if not 0 <= value <= 100: return 400, {"error": f"Поле {field} должно быть от 0 до 100."}
                elif field == "expires_at":
                    value = str(value).strip() or None
                    if value:
                        try: datetime.fromisoformat(value)
                        except ValueError: return 400, {"error": "Дата должна быть ISO, например 2026-12-31T23:59:00."}
            elif field == "price":
                if value != "":
                    try: value = float(value)
                    except (TypeError, ValueError): return 400, {"error": "Сумма должна быть числом."}
                    if value < 0: return 400, {"error": "Сумма не может быть отрицательной."}
            if field in ("name", "full_name", "phone", "username", "device", "status", "title", "address", "house", "apartment", "work", "parts", "promo_code", "payment_status", "payment_method", "guarantee", "comment", "partner_name", "partner_contact"):
                value = str(value).strip()
                if len(value) > 500: return 400, {"error": f"Слишком длинное значение поля {field}."}
            if kind == "promocodes" and field == "expires_at":
                rec[target] = value
            else:
                rec[target] = value
        self.state.save_now()
        return 200, {"ok": True, "message": "Изменения сохранены в живом состоянии бота."}

    def _create_snapshot(self):
        from config import DATA_FILE
        root = Path(__file__).resolve().parent
        folder = root / "backups"
        folder.mkdir(exist_ok=True)
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        target = folder / f"admin_db_snapshot_{stamp}.json"
        suffix = 1
        while target.exists():
            target = folder / f"admin_db_snapshot_{stamp}_{suffix:02d}.json"
            suffix += 1
        data = self.state._serializable_data()
        tmp = target.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        os.replace(tmp, target)
        snapshots = sorted(folder.glob("admin_db_snapshot_*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
        for old in snapshots[SNAPSHOT_RETENTION:]:
            try: old.unlink()
            except OSError: pass
        return target

    def do_POST(self):
        if not self._authorized():
            return self._send(403, {"error": "Доступ запрещён."})
        path = urlparse(self.path).path
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > 4096:
                return self._send(400, {"error": "Некорректный размер запроса."})
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:
            return self._send(400, {"error": "Некорректный JSON."})
        state = self.state
        try:
            match_request = re.fullmatch(r"/master-requests/(\d+)/(approve|reject)", path)
            if match_request:
                from config import SUPER_ADMIN_ID
                uid = int(match_request.group(1))
                approved = match_request.group(2) == "approve"
                try:
                    request = state.decide_master_request(uid, approved, admin_id=SUPER_ADMIN_ID)
                except ValueError as exc:
                    return self._send(409, {"error": str(exc)})
                # Notify the user through Telegram Bot API; role is already persisted even if notification fails.
                try:
                    from config import TOKEN
                    import urllib.request
                    from urllib.parse import urlencode
                    from keyboards import master_webapp_reply_kb
                    if approved:
                        from urllib.parse import urlencode
                        import hashlib, hmac, time
                        expires = int(time.time()) + 30 * 24 * 60 * 60
                        token_payload = f"{uid}:{expires}"
                        signature = hmac.new(str(TOKEN).encode("utf-8"), token_payload.encode("utf-8"), hashlib.sha256).hexdigest()
                        query = urlencode({"launch": "keyboard", "role": "master", "master_uid": uid, "master_exp": expires, "master_sig": signature})
                        master_url = "https://niksonzverek-debug.github.io/remont-miniapp/index.html?appv=20261018-integrated-act-authdiag&" + query
                        markup = {"keyboard": [[{"text": "🧰 Открыть кабинет мастера · v6", "web_app": {"url": master_url}}]], "resize_keyboard": True, "is_persistent": True}
                        message = "🎉 Ваша заявка одобрена! Роль мастера активирована. Откройте кабинет мастера кнопкой ниже."
                    else:
                        markup = {"keyboard": [[{"text": "📱 Открыть приложение", "web_app": {"url": "https://niksonzverek-debug.github.io/remont-miniapp/client.html?launch=keyboard&role=client&registered=1"}}], [{"text": "❌ Заявка отклонена — подать снова"}],], "resize_keyboard": True, "is_persistent": True}
                        message = "Заявка на роль мастера отклонена администратором. Вы можете продолжить пользоваться кабинетом клиента или подать заявку повторно."
                    body = json.dumps({"chat_id": uid, "text": message, "reply_markup": markup}, ensure_ascii=False).encode("utf-8")
                    req = urllib.request.Request(f"https://api.telegram.org/bot{TOKEN}/sendMessage", data=body, headers={"Content-Type":"application/json"}, method="POST")
                    with urllib.request.urlopen(req, timeout=5) as response: response.read()
                except Exception:
                    pass
                return self._send(200, {"ok": True, "message": "Заявка одобрена. Роль мастера активирована." if approved else "Заявка отклонена.", "request": request})
            if path == "/masters":
                raw_mid = payload.get("master_id")
                phone = str(payload.get("phone") or "").strip()
                mid = 0
                if raw_mid not in (None, ""):
                    try: mid = int(raw_mid)
                    except (TypeError, ValueError): return self._send(400, {"error": "Telegram ID должен быть числом."})
                    if mid <= 0: return self._send(400, {"error": "Telegram ID должен быть положительным числом."})
                if not mid and not phone: return self._send(400, {"error": "Укажите Telegram ID или телефон."})
                from config import SUPER_ADMIN_ID
                if mid == int(SUPER_ADMIN_ID): return self._send(400, {"error": "Этот ID уже принадлежит суперадминистратору."})
                try:
                    if mid:
                        state.invite_master_by_id(mid, phone or None)
                        extra = " и номером телефона" if phone else ""
                        return self._send(200, {"ok": True, "message": f"Приглашение по Telegram ID {mid}{extra} сохранено. Роль мастера будет активирована после завершения регистрации."})
                    normalized = state.invite_master_by_phone(phone)
                    return self._send(200, {"ok": True, "message": f"Приглашение по телефону {normalized} сохранено. Мастер должен пройти регистрацию и подтвердить этот номер кнопкой Telegram «Поделиться контактом». Роль активируется после завершения регистрации."})
                except ValueError as exc:
                    return self._send(400, {"error": str(exc)})
            match = re.fullmatch(r"/masters/(\d+)/enabled", path)
            if match:
                mid = int(match.group(1))
                from config import SUPER_ADMIN_ID
                if mid == int(SUPER_ADMIN_ID):
                    return self._send(400, {"error": "Нельзя отключить суперадминистратора."})
                if not state.is_master_account(mid):
                    return self._send(404, {"error": "Мастер не найден."})
                enabled = payload.get("enabled")
                if not isinstance(enabled, bool):
                    return self._send(400, {"error": "Поле enabled должно быть true или false."})
                state.set_master_enabled(mid, enabled)
                return self._send(200, {"ok": True, "message": f"Доступ мастеру {mid} {'включён' if enabled else 'отключён'}."})


            if path == "/clients/reassign":
                try:
                    source_mid=int(payload.get("source_master_id")); target_mid=int(payload.get("target_master_id"))
                    client_id=str(payload.get("client_id"))
                except (TypeError,ValueError):
                    return self._send(400,{"error":"Неверный ID клиента или мастера."})
                if source_mid==target_mid:
                    return self._send(400,{"error":"Клиент уже закреплён за этим мастером."})
                source=self._bucket(source_mid); target=self._bucket(target_mid)
                if source is None or target is None:
                    return self._send(404,{"error":"Исходный или целевой мастер не найден."})
                clients=source.get("clients")
                if not isinstance(clients,dict):
                    return self._send(404,{"error":"У исходного мастера не найден раздел клиентов."})
                key=self._record_key(clients,client_id)
                if key is None:
                    return self._send(404,{"error":"Клиент не найден у исходного мастера."})
                target_clients=target.setdefault("clients",{})
                if self._record_key(target_clients,client_id) is not None:
                    return self._send(409,{"error":"У нового мастера уже есть клиент с таким ID. Переназначение отменено, чтобы не перезаписать данные."})
                client=clients.pop(key)
                if isinstance(client,dict):
                    client["master_id"]=target_mid
                    client["reassigned_at"]=datetime.now().isoformat()
                    client["previous_master_id"]=source_mid
                try:
                    numeric_key=int(client_id)
                    new_key=numeric_key if numeric_key not in target_clients else client_id
                except ValueError:
                    new_key=client_id
                target_clients[new_key]=client
                state.save_now()
                return self._send(200,{"ok":True,"message":"Клиент переназначен. История старых заказов и актов сохранена у прежнего мастера."})

            if path == "/clients":
                mid = int(payload.get("master_id", 0))
                bucket = self._bucket(mid)
                if bucket is None:
                    return self._send(404, {"error": "Мастер не найден."})
                name = str(payload.get("name", "")).strip()
                phone = str(payload.get("phone", "")).strip()
                username = str(payload.get("username", "")).strip().lstrip("@")
                if not name or len(name) > 150:
                    return self._send(400, {"error": "Имя клиента обязательно (до 150 символов)."})
                if len(phone) > 40 or len(username) > 64:
                    return self._send(400, {"error": "Телефон или username слишком длинный."})
                uid = int(bucket.get("temp_client_uid", -1)) - 1
                while uid in bucket.get("clients", {}):
                    uid -= 1
                bucket["temp_client_uid"] = uid
                bucket.setdefault("clients", {})[uid] = {
                    "name": name, "phone": phone, "username": username or None,
                    "registered": False, "created_at": datetime.now().isoformat(),
                    "master_id": mid, "source": "admin_panel"
                }
                self.state.save_now()
                return self._send(200, {"ok": True, "message": f"Клиент добавлен (внутренний ID {uid})."})
            if path == "/promocodes":
                mid = int(payload.get("master_id", 0))
                bucket = self._bucket(mid)
                if bucket is None:
                    return self._send(404, {"error": "Мастер не найден."})
                from models.promocode import Promocode
                code = str(payload.get("code", "")).strip().upper()
                if not Promocode.is_valid_code(code):
                    return self._send(400, {"error": "Код: 4–20 символов A-Z, 0-9, _ или -."})
                if code in bucket.get("promocodes", {}):
                    return self._send(409, {"error": "Такой промокод уже существует у этого мастера."})
                try:
                    discount = float(payload.get("discount_percent", 0))
                    reward = float(payload.get("reward_percent", 0))
                    max_uses = int(payload.get("max_activations", 1))
                except (TypeError, ValueError):
                    return self._send(400, {"error": "Скидка, вознаграждение и лимит должны быть числами."})
                if not 0 <= discount <= 100 or not 0 <= reward <= 100 or max_uses < 1:
                    return self._send(400, {"error": "Проценты должны быть 0–100, лимит — минимум 1."})
                expires = str(payload.get("expires_at", "")).strip() or None
                if expires:
                    try: datetime.fromisoformat(expires)
                    except ValueError: return self._send(400, {"error": "Дата должна быть ISO: 2026-12-31T23:59:00."})
                uses_raw = str(payload.get("max_uses_per_client", "")).strip()
                try: uses_per_client = int(uses_raw) if uses_raw else None
                except ValueError: return self._send(400, {"error": "Лимит на клиента должен быть числом."})
                if uses_per_client is not None and uses_per_client < 1:
                    return self._send(400, {"error": "Лимит на клиента — минимум 1."})
                partner_card = "".join(ch for ch in str(payload.get("partner_card", "")) if ch.isdigit())
                if not 16 <= len(partner_card) <= 19:
                    return self._send(400, {"error": "Для рекламодателя укажите номер карты длиной 16–19 цифр."})
                promo = Promocode(code, str(payload.get("partner_name", "")).strip(),
                    str(payload.get("partner_contact", "")).strip(), discount, reward,
                    max_uses, mid, max_uses_per_client=uses_per_client, expires_at=expires,
                    partner_card=partner_card)
                from advertiser_service import ensure_advertiser_for_promo
                # Создаём карточку рекламодателя даже при создании промокода из панели.
                # Ссылка активации для созданной из панели записи доступна мастеру в /advertisers.
                ensure_advertiser_for_promo(self.state, promo, "")
                bucket.setdefault("promocodes", {})[code] = promo.to_dict()
                self.state.save_now()
                return self._send(200, {"ok": True, "message": f"Промокод {code} создан. Ссылку активации рекламодателя можно скопировать в Telegram-команде /advertisers."})
            match = re.fullmatch(r"/records/(clients|orders|acts|promocodes)/([^/]+)/([^/]+)", path)
            if match:
                from urllib.parse import unquote
                status, result = self._update_record(match.group(1), unquote(match.group(2)), unquote(match.group(3)), payload.get("fields"))
                return self._send(status, result)
            if path == "/referral/settings":
                try:
                    saved = _write_referral_settings(payload)
                except ValueError as exc:
                    return self._send(400, {"error": str(exc)})
                return self._send(200, {"ok": True, "settings": saved, "message": "Настройки реферальной программы сохранены. Реферальные ссылки, скидочные кредиты и лимит приглашений обрабатываются ботом."})
            if path == "/backups/snapshot":
                target = self._create_snapshot()
                return self._send(200, {"ok": True, "name": target.name})
            match = re.fullmatch(r"/backups/restore/([^/]+)", path)
            if match:
                from config import DATA_FILE
                from urllib.parse import unquote
                name = unquote(match.group(1))
                if not re.fullmatch(r"admin_db_snapshot_\d{8}_\d{6}(?:_\d{2})?\.json", name):
                    return self._send(400, {"error": "Некорректное имя снимка."})
                root = Path(__file__).resolve().parent
                snapshot = root / "backups" / name
                if not snapshot.is_file():
                    return self._send(404, {"error": "Снимок не найден."})
                try:
                    data = json.loads(snapshot.read_text(encoding="utf-8"))
                    if not isinstance(data, dict) or not isinstance(data.get("masters_data"), dict):
                        return self._send(400, {"error": "Файл не похож на резервную копию базы Remont BT."})
                    # Always preserve the current live state before restoring.
                    self._create_snapshot()
                    target = Path(DATA_FILE)
                    target.parent.mkdir(parents=True, exist_ok=True)
                    temp = target.with_suffix(target.suffix + ".restore_tmp")
                    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
                    os.replace(temp, target)
                    self.state.load()
                    return self._send(200, {"ok": True, "message": "База восстановлена. Текущее состояние сохранено отдельным снимком."})
                except Exception as exc:
                    return self._send(500, {"error": f"Ошибка восстановления: {exc}"})
            return self._send(404, {"error": "Маршрут не найден."})
        except Exception as exc:
            return self._send(500, {"error": f"Ошибка изменения данных: {exc}"})
    def do_GET(self):
        if not self._authorized():
            return self._send(403, {"error": "Доступ запрещён."})
        if urlparse(self.path).path == "/referral/summary":
            return self._send(200, _referral_summary(self.state))
        if urlparse(self.path).path == "/master-requests":
            rows = [dict(r) for r in getattr(self.state, "master_requests", {}).values() if isinstance(r, dict)]
            rows.sort(key=lambda r: r.get("created_at", ""), reverse=True)
            return self._send(200, {"requests": rows})

        if urlparse(self.path).path == "/health":
            return self._send(200, {"ok": True})

        if urlparse(self.path).path == "/audit":
            audit_path = ROOT / "admin_actions.jsonl"
            entries = []
            if audit_path.exists():
                for line in audit_path.read_text(encoding="utf-8", errors="replace").splitlines()[-100:]:
                    try:
                        item = json.loads(line)
                        if isinstance(item, dict): entries.append(item)
                    except ValueError:
                        continue
            return self._send(200, {"entries": list(reversed(entries))})

        if urlparse(self.path).path == "/backups/snapshots":
            folder = Path(__file__).resolve().parent / "backups"
            folder.mkdir(exist_ok=True)
            items = []
            for p in sorted(folder.glob("admin_db_snapshot_*.json"), key=lambda x: x.stat().st_mtime, reverse=True)[:30]:
                items.append({"name": p.name, "size": p.stat().st_size,
                              "created": datetime.fromtimestamp(p.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S")})
            return self._send(200, {"snapshots": items})
        return self._send(404, {"error": "Маршрут не найден."})
    def log_message(self, fmt, *args):
        pass

def start_admin_api(state):
    """Start the admin mutation API inside the bot process, sharing the live State instance."""
    global _server
    if _server is not None:
        return _server
    token = _ensure_token()
    handler = type("BoundAdminHandler", (_Handler,), {"state": state, "token": token})
    try:
        _server = ThreadingHTTPServer((HOST, PORT), handler)
    except OSError as exc:
        # Admin API is optional; the Telegram bot must still start.
        print(f"Локальное управление админ-панели недоступно: {exc}")
        return None
    thread = threading.Thread(target=_server.serve_forever, name="remont-admin-api", daemon=True)
    thread.start()
    global _backup_thread_started
    if not _backup_thread_started:
        backup_thread = threading.Thread(target=_daily_backup_loop, args=(state,), name="remont-admin-daily-backup", daemon=True)
        backup_thread.start()
        _backup_thread_started = True
    print("Локальный API админ-панели запущен на 127.0.0.1:8766")
    return _server
