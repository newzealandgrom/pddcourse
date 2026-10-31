# Карта проекта: курс ПДД «Полоса»

- Статический SPA без сборщика, работает и с file://. Хостинг — GitHub Pages (newzealandgrom/pddcourse, ветка master, корень), домен pdd.vladimirmikhailov.com (файл CNAME).
- Вход: index.html → data/db.js (window.DB), data/course.js (window.COURSE), assets/js/{store,ui,quiz,views,exam,ref,search,app}.js.
- Данные-источники: data/*.json, data/course/m01–m22.json. db.js/course.js и ?v= в index.html собирает `python3 tools/build.py`; проверка `python3 tools/build.py --check`.
- Прогресс: localStorage ключ `pdd.progress.v1` (store.js). Хранилище своё для каждого origin: http:// и https:// раздельно.
- Пороги: тест модуля 85 %, билет 90 %, модуль = 65 % уроки + 35 % тест.
- Проверки: `node --check assets/js/*.js`, `python3 tools/build.py --check`.
- Ловушки: правки только в JSON, потом сборка; GitHub Pages кэширует на 10 минут (Cache-Control max-age=600).
