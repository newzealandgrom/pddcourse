#!/usr/bin/env python3
"""Собирает data/db.js и data/course.js из JSON-файлов в data/.

Приложение грузит данные через <script>, чтобы работать и с file://, поэтому
после любой правки JSON нужно пересобрать:

    python3 tools/build.py          # пересобрать
    python3 tools/build.py --check  # только проверить, что .js совпадают с JSON

Заодно проставляет в index.html версию ?v=… (хеш скриптов, стилей и данных),
чтобы браузеры после обновления сайта не брали старые файлы из кэша.
"""
import glob
import hashlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')

# Порядок ключей важен только для стабильного diff
DB_PARTS = [
    ('questions', 'questions.json'),
    ('tickets', 'tickets.json'),
    ('topics', 'topics.json'),
    ('signs', 'signs.json'),
    ('markup', 'markup.json'),
    ('terms', 'terms.json'),
    ('penalties', 'penalties.json'),
    ('rules', 'rules.json'),
    ('plan', 'course-plan.json'),
    ('guide', 'guide.json'),
    ('practice', 'practice.json'),
]


def load(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def dump(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':'))


def build_db():
    db = {key: load(os.path.join(DATA, name)) for key, name in DB_PARTS}
    return 'window.DB = ' + dump(db) + ';\n'


def build_course():
    plan = load(os.path.join(DATA, 'course-plan.json'))
    course = []
    for p in plan:
        path = os.path.join(DATA, 'course', p['id'] + '.json')
        if os.path.exists(path):
            course.append(load(path))
    return 'window.COURSE = ' + dump(course) + ';\n'


ASSET_RE = re.compile(r'((?:src|href)="(?:data|assets)/[^"?]+\.(?:js|css))(?:\?v=[^"]*)?"')


def build_index(db_js, course_js):
    h = hashlib.sha1()
    h.update(db_js.encode('utf-8'))
    h.update(course_js.encode('utf-8'))
    for path in sorted(glob.glob(os.path.join(ROOT, 'assets', 'js', '*.js')) +
                       glob.glob(os.path.join(ROOT, 'assets', 'css', '*.css'))):
        with open(path, 'rb') as f:
            h.update(f.read())
    with open(os.path.join(ROOT, 'index.html'), encoding='utf-8') as f:
        html = f.read()
    return ASSET_RE.sub(lambda m: m.group(1) + '?v=' + h.hexdigest()[:10] + '"', html)


def main():
    check = '--check' in sys.argv
    db_js, course_js = build_db(), build_course()
    outputs = {
        os.path.join(DATA, 'db.js'): db_js,
        os.path.join(DATA, 'course.js'): course_js,
        os.path.join(ROOT, 'index.html'): build_index(db_js, course_js),
    }
    stale = []
    for path, text in outputs.items():
        try:
            with open(path, encoding='utf-8') as f:
                same = f.read() == text
        except FileNotFoundError:
            same = False
        if same:
            continue
        if check:
            stale.append(os.path.relpath(path, ROOT))
        else:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(text)
            print('собран', os.path.relpath(path, ROOT))
    if check and stale:
        print('устарели, запусти python3 tools/build.py:', ', '.join(stale))
        sys.exit(1)
    print('ok')


if __name__ == '__main__':
    main()
