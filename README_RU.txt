REMONT BT — ПОЛНЫЙ КОМПЛЕКТ ДЛЯ GITHUB PAGES

В архив включены все файлы мини-приложения, а не только изменённые: index.html, client.html, advertiser.html, offline.html, js/common.js, js/advertiser-config.js, js/advertiser.js, js/client.js, js/master.js, css/style.css, sw.js и manifest.webmanifest.

КАК ОБНОВИТЬ:
1. Распакуй архив на компьютере.
2. В GitHub открой репозиторий niksonzverek-debug/remont-miniapp и проверь, что GitHub Pages публикует корень репозитория (Settings → Pages → Build and deployment).
3. Загрузить нужно содержимое папки сайта из архива в корень публикации, сохраняя структуру папок js/ и css/. Не загружай папку remont_bt/miniapp целиком как вложенную папку.
4. Commit changes. Дождись завершения GitHub Pages deployment.
5. Открой сайт с жёстким обновлением Ctrl+F5. В Telegram закрой Mini App полностью и открой снова.

ВАЖНО: advertiser_api.py — серверный файл. GitHub Pages Python не запускает. Он лежит отдельно в BACKEND_SEPARATE и требует отдельного обновления на сервере, если этот backend используется.

Проверено при сборке: ссылки на локальные JS/CSS файлы, присутствующие в HTML, должны иметь соответствующие файлы в архиве; JS-файлы проверяются на синтаксис. Это не заменяет живой тест с Telegram/backend.
