# ПДД — Тренажёр

Веб-приложение для изучения и повторения правил дорожного движения.

## О проекте

Проект представляет собой простой браузерный тренажёр по ПДД с использованием изображений дорожных знаков и вопросов.

Приложение работает полностью в браузере и не требует установки дополнительного программного обеспечения.

## Возможности

* Тестирование знаний ПДД
* Вопросы с вариантами ответов
* Изображения дорожных знаков
* Подсчёт результатов
* Работа непосредственно в браузере
* Не требует установки

## Онлайн

Проект доступен по адресу:

**https://pdd.vladimirmikhailov.com**

## Запуск локально

Клонировать репозиторий:

```bash
git clone git@github.com:newzealandgrom/pddcourse.git
```

Перейти в директорию проекта:

```bash
cd pddcourse
```

После этого открыть `index.html` в браузере.

Также можно запустить простой локальный HTTP-сервер:

```bash
python3 -m http.server 8000
```

После запуска открыть:

```text
http://localhost:8000
```

## Структура проекта

```text
pddcourse/
├── index.html            # точка входа (SPA, роутинг по #/…)
├── CNAME                 # домен pdd.vladimirmikhailov.com для GitHub Pages
├── assets/
│   ├── css/              # стили и шрифты
│   └── js/               # store.js (прогресс), quiz.js, exam.js, views.js, ref.js, app.js …
├── data/
│   ├── *.json            # вопросы, билеты, темы, знаки, разметка, ПДД, штрафы, «Перед экзаменом»
│   ├── course/m01–m22.json  # уроки курса
│   ├── db.js, course.js  # СОБИРАЮТСЯ из JSON скриптом tools/build.py — руками не править
├── img/                  # знаки, разметка, картинки к вопросам
├── tools/build.py        # сборка db.js / course.js + версия файлов в index.html
└── .claude/agents/       # роли pdd-* для Claude Code (аудит правил, вопросов, прогресса)
```

## Технологии

* HTML5
* CSS3
* JavaScript
* SVG

## Развёртывание

Проект размещён на **GitHub Pages** (ветка `master`, корень репозитория).
После `git push` в `master` сайт обновляется сам примерно за 1–2 минуты.

### Как обновить сайт

```bash
cd pddcourse
git pull                      # забрать изменения с GitHub
# … правки в data/*.json, data/course/*.json, assets/ …
python3 tools/build.py        # пересобрать data/db.js, data/course.js и версию файлов в index.html
python3 tools/build.py --check
git add -A
git commit -m "Что поменялось"
git push
```

Проверить, что сборка опубликована: вкладка **Actions** репозитория (`pages build and deployment` — зелёная галочка).
Если в браузере всё ещё старая версия — обнови страницу с очисткой кэша: **Cmd+Shift+R** (Mac) или **Ctrl+F5** (Windows).

### Прогресс учеников

Прогресс хранится в `localStorage` браузера отдельно для каждого адреса:
`http://` и `https://` — разные хранилища. Поэтому в **Settings → Pages** должна стоять галочка **Enforce HTTPS**,
а открывать курс нужно всегда по `https://pdd.vladimirmikhailov.com`.
Перенос между браузерами — «Мой прогресс» → «Сохранить в файл» / «Загрузить из файла» (загрузка объединяет прогресс).

## Автор

**newzealandgrom**

GitHub:
https://github.com/newzealandgrom/pddcourse
