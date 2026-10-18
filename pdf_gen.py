# pdf_gen.py
"""Генерация PDF-актов."""

import os
from datetime import datetime
from fpdf import FPDF

from config import PDF_DIR, FONT_PATH, FONT_BOLD_PATH
from utils import format_price, format_phone, safe_filename, fmt_date_short


def generate_pdf(act, master):
    os.makedirs(PDF_DIR, exist_ok=True)
    num_safe = safe_filename(act.get("number", "act"))
    path = os.path.join(PDF_DIR, f"{num_safe}.pdf")

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.add_font("DejaVu", "", FONT_PATH)
    pdf.add_font("DejaVu", "B", FONT_BOLD_PATH)
    pdf.set_font("DejaVu", size=11)

    LM = pdf.l_margin

    def reset_x():
        pdf.set_x(LM)

    def line(color=200):
        pdf.set_draw_color(color, color, color)
        pdf.set_line_width(0.3)
        y = pdf.get_y() + 2
        pdf.line(LM, y, pdf.w - LM, y)
        pdf.ln(4)

    def section(title):
        pdf.set_font("DejaVu", "B", size=12)
        reset_x()
        pdf.multi_cell(pdf.epw, 7, title, align="L")
        pdf.set_font("DejaVu", size=11)

    def w(text, bold=False):
        pdf.set_font("DejaVu", "B" if bold else "", size=11)
        reset_x()
        pdf.multi_cell(pdf.epw, 6, text, align="L")
        pdf.set_font("DejaVu", size=11)

    # Заголовок
    pdf.set_font("DejaVu", "B", size=18)
    reset_x()
    pdf.cell(pdf.epw, 12, "АКТ ВЫПОЛНЕННЫХ РАБОТ",
             new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(2)
    line()

    date_str = fmt_date_short(act.get("created_at", ""))
    w(f"Акт № {act.get('number', '—')}")
    w(f"Дата: {date_str}")
    pdf.ln(2)
    line()

    # Исполнитель
    section("ИСПОЛНИТЕЛЬ")
    w(f"ФИО: {master.get('name', '—')}")
    w(f"ПИНФЛ: {master.get('pinfl', '—')}")
    w(f"Телефон: {format_phone(master.get('phone', '—'))}")
    pdf.ln(2)
    line()

    # Заказчик
    section("ЗАКАЗЧИК")
    w(f"ФИО: {act.get('client_name', '—')}")
    w(f"Телефон: {format_phone(act.get('client_phone', '—'))}")
    pdf.ln(2)
    line()

    # Работа
    section("ИНФОРМАЦИЯ О РАБОТЕ")
    w(f"Техника: {act.get('device', '—')}")
    w(f"Бренд: {act.get('brand', '—')}")
    w(f"Модель: {act.get('model', '—')}")
    pdf.ln(1)
    w("Выполненные работы:", bold=True)
    for work in act.get("works", []):
        w(f"  • {work}")
    pdf.ln(2)

    # Стоимость и скидка. Снимок промокода/реферальной скидки — источник
    # истины для документа: referral_discount_snapshot раньше не попадал
    # в discount_amount верхнего уровня, поэтому PDF скрывал скидку.
    price = int(act.get("price", 0) or 0)
    promo_snapshot = act.get("promo_snapshot") or {}
    referral_snapshot = act.get("referral_discount_snapshot") or {}
    discount_snapshot = promo_snapshot or referral_snapshot
    discount_amount = int(
        discount_snapshot.get("discount_amount", act.get("discount_amount", 0)) or 0
    )
    final_price = int(
        discount_snapshot.get(
            "final_price", act.get("final_price", max(0, price - discount_amount))
        ) or 0
    )
    w(f"Стоимость ремонта: {format_price(price)} сум")
    if discount_amount > 0:
        percent = discount_snapshot.get("discount_percent", discount_snapshot.get("percent"))
        label = f"Скидка ({percent}%): " if percent is not None else "Скидка: "
        w(f"{label}-{format_price(discount_amount)} сум")
    w(f"ИТОГО К ОПЛАТЕ: {format_price(final_price)} сум", bold=True)

    w(f"Запчасть/узел: {act.get('replaced_part') or 'Не указана'}")
    w(f"Гарантийный срок: {act.get('guarantee_text', '—')}")
    w(f"Гарантия действует до: {act.get('guarantee_until', '—')}")
    if int(act.get("guarantee_days") or 0) > 0:
        w("ГАРАНТИЙНЫЕ УСЛОВИЯ", bold=True)
        w("Гарантия распространяется только на заменённую деталь, указанную в настоящем акте, при условии её установки мастером и соблюдения правил эксплуатации.")
        w("Гарантия не распространяется на другие детали и узлы техники, а также на иные неисправности, возникшие независимо от заменённой детали, включая новые поломки, неправильную эксплуатацию, механические повреждения, попадание жидкости, перепады напряжения и вмешательство третьих лиц.")
        w("Если заменённая деталь неисправна или работает некорректно в течение гарантийного срока, клиенту следует связаться с мастером по указанному в акте телефону для проверки и решения вопроса по гарантии.")
    else:
        w("Гарантия на заменённые детали не предоставляется.")
    pdf.ln(2)

    loc = act.get("location") or {}
    if loc.get("address"):
        w(f"Адрес: {loc['address']}")
    if loc.get("house"):
        w(f"Дом: {loc['house']}")
    if loc.get("apartment"):
        w(f"Квартира: {loc['apartment']}")
    latitude = loc.get("latitude", loc.get("lat"))
    longitude = loc.get("longitude", loc.get("lon"))
    if latitude is not None and longitude is not None:
        w(f"Координаты локации: {latitude}, {longitude}")

    pdf.ln(6)
    line()

    completed = fmt_date_short(act.get("completed_at") or act.get("created_at", ""))
    pdf.set_font("DejaVu", "B", size=13)
    reset_x()
    pdf.multi_cell(pdf.epw, 10, f"ДАТА ЗАВЕРШЕНИЯ РЕМОНТА: {completed}", align="C")

    pdf.output(path)
    return path