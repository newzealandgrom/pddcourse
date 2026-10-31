/* Экраны: главная, карта курса, модуль, урок, тесты, тренировки, экзамен. */
(function () {
  'use strict';

  var esc = UI.esc;
  var V = {};

  /* ─────────── Данные курса ─────────── */

  function plan() { return window.DB.plan; }
  function planOf(id) { return plan().filter(function (m) { return m.id === id; })[0]; }
  function courseOf(id) { return (window.COURSE || []).filter(function (m) { return m.id === id; })[0]; }
  function ready(id) { var c = courseOf(id); return !!(c && c.lessons && c.lessons.length); }

  var qById = {}, qBySrc = {};
  function indexQuestions() {
    window.DB.questions.forEach(function (q) {
      qById[q.id] = q;
      if (!qBySrc[q.srcId]) qBySrc[q.srcId] = q;
    });
  }

  /* Три модуля про знаки делят один пул вопросов «Дорожные знаки» — режем его на равные части */
  var SPLIT = { m05: 0, m06: 1, m07: 2 };

  function moduleQuestions(id) {
    var p = planOf(id);
    if (!p) return [];
    var seen = {}, out = [];
    p.topics.forEach(function (t) {
      var topic = window.DB.topics.filter(function (x) { return x.name === t; })[0];
      if (!topic) return;
      topic.qids.forEach(function (qid) {
        var q = qById[qid];
        if (!q || seen[q.srcId]) return;
        seen[q.srcId] = 1; out.push(q);
      });
    });
    if (SPLIT[id] != null) {
      var part = SPLIT[id], of = 3;
      out = out.filter(function (_, i) { return i % of === part; });
    }
    return out;
  }

  function moduleTestSet(id) {
    var all = moduleQuestions(id);
    var n = Math.min(20, all.length);
    return UI.shuffle(all, Date.now() % 100000).slice(0, n);
  }

  function lessonsDone(id) {
    var c = courseOf(id);
    if (!c) return 0;
    return c.lessons.filter(function (l) { return Store.lessonDone(l.id); }).length;
  }

  function moduleProgress(id) {
    var c = courseOf(id);
    var total = c && c.lessons ? c.lessons.length : (planOf(id).lessons || 1);
    var done = lessonsDone(id);
    var m = Store.moduleOf(id);
    var lessonPart = total ? done / total : 0;
    var testPart = m && m.passed ? 1 : 0;
    return Math.round((lessonPart * 0.65 + testPart * 0.35) * 100);
  }

  function overall() {
    var sum = 0;
    plan().forEach(function (p) { sum += moduleProgress(p.id); });
    return Math.round(sum / plan().length);
  }

  function nextStep() {
    var list = plan();
    for (var i = 0; i < list.length; i++) {
      var p = list[i], c = courseOf(p.id);
      if (!c) continue;
      for (var j = 0; j < c.lessons.length; j++) {
        if (!Store.lessonDone(c.lessons[j].id)) {
          return { kind: 'lesson', module: p, lesson: c.lessons[j], n: j + 1, of: c.lessons.length };
        }
      }
      var m = Store.moduleOf(p.id);
      if (!m || !m.passed) return { kind: 'test', module: p };
    }
    return { kind: 'exam' };
  }

  /* ─────────── Главная ─────────── */

  V.home = function () {
    var pct = overall();
    var step = nextStep();
    var answered = Store.answeredCount();
    var acc = Store.accuracy();
    var streak = Store.streak();
    var doneLessons = plan().reduce(function (s, p) { return s + lessonsDone(p.id); }, 0);
    var totalLessons = (window.COURSE || []).reduce(function (s, m) { return s + m.lessons.length; }, 0) || 86;

    var cta, ctaSub;
    if (step.kind === 'lesson') {
      cta = '<a class="btn btn-primary btn-lg" href="#/lesson/' + step.lesson.id + '">' +
        (pct === 0 ? 'Начать учиться' : 'Продолжить') + '</a>';
      ctaSub = step.module.title + ' · урок ' + step.n + ' из ' + step.of + ' — «' + step.lesson.title + '»';
    } else if (step.kind === 'test') {
      cta = '<a class="btn btn-primary btn-lg" href="#/test/' + step.module.id + '">Пройти тест модуля</a>';
      ctaSub = step.module.title + ' — теория прочитана, осталось проверить себя';
    } else {
      cta = '<a class="btn btn-primary btn-lg" href="#/exam">Сдать экзамен</a>';
      ctaSub = 'Весь курс пройден. Теперь — экзамен как в ГИБДД';
    }

    var exams = Store.exams();
    var passedExams = exams.filter(function (e) { return e.passed; }).length;

    return '<div class="wrap">' +
      '<div class="hero">' +
        '<h1>' + (pct === 0 ? 'Права — это про свободу.<br>Начнём с правил.' : 'С возвращением. Едем дальше.') + '</h1>' +
        '<p class="hero-lead">' +
          (pct === 0
            ? 'Полный курс ПДД для категории B: 22 модуля с объяснениями простым языком, тест после каждой темы, все 800 официальных вопросов и экзамен по правилам ГИБДД.'
            : esc(ctaSub)) +
        '</p>' +
        '<div class="hero-cta">' + cta +
          (pct > 0 ? '<a class="btn btn-lg" href="#/course">Карта курса</a>' : '<a class="btn btn-lg" href="#/course">Посмотреть программу</a>') +
        '</div>' +
        (pct > 0 ? '<div style="margin-top:26px;max-width:420px">' +
          '<div class="nav-progress-top"><span>Курс пройден на</span><b>' + pct + '%</b></div>' +
          UI.bar(pct) + '</div>' : '') +
      '</div>' +

      '<div class="stat-row">' +
        '<div class="stat accent"><div class="stat-n">' + doneLessons + '<span style="color:var(--fg-3);font-size:17px">/' + totalLessons + '</span></div><div class="stat-l">уроков пройдено</div></div>' +
        '<div class="stat"><div class="stat-n">' + answered + '<span style="color:var(--fg-3);font-size:17px">/800</span></div><div class="stat-l">вопросов решено</div></div>' +
        '<div class="stat"><div class="stat-n" style="color:' + (!answered ? 'var(--fg-3)' : acc >= 90 ? 'var(--go)' : acc >= 70 ? 'var(--paint)' : 'var(--stop)') + '">' + acc + '%</div><div class="stat-l">правильных ответов</div></div>' +
        '<div class="stat"><div class="stat-n">' + streak + '</div><div class="stat-l">' + UI.plural(streak, 'день подряд', 'дня подряд', 'дней подряд') + '</div></div>' +
      '</div>' +

      (pct === 0 ? planBlock() : '') +

      '<h2 style="margin-bottom:14px">Куда пойти</h2>' +
      '<div class="pick-grid">' +
        tile('#/course', '🗺️', 'Учебный курс', '22 модуля от терминов до экзамена', pct) +
        tile('#/train', '🎯', 'Тренировка', 'По темам, билетам, ошибкам', null) +
        tile('#/exam', '🏁', 'Экзамен ГИБДД', '20 вопросов, 20 минут, всё по-настоящему',
          null, exams.length ? (passedExams + ' из ' + exams.length + ' сдано') : null) +
        tile('#/before', '💛', 'Перед экзаменом', 'Как всё пройдёт, что с волнением делать', null) +
        tile('#/signs', '🚸', 'Дорожные знаки', 'Все 310 знаков с пояснениями', null) +
        tile('#/rules', '📖', 'Текст ПДД', 'Официальные правила целиком, с поиском', null) +
        tile('#/stats', '📊', 'Мой прогресс', 'Что уже знаю, что стоит повторить', null) +
      '</div>' +
    '</div>';
  };

  /* Показывается только новичку: понятный график на месяц */
  function planBlock() {
    var weeks = [
      ['Неделя 1', 'Модули 1–6', 'Язык дороги, обязанности водителя, светофор и первые знаки. Самое лёгкое — чтобы втянуться.'],
      ['Неделя 2', 'Модули 7–12', 'Остальные знаки, разметка, манёвры, скорость и обгон. Здесь начинается настоящая езда.'],
      ['Неделя 3', 'Модули 13–18', 'Стоянка, перекрёстки, пешеходы. Перекрёстки — самая важная тема курса, на неё не жалей времени.'],
      ['Неделя 4', 'Модули 19–22 и билеты', 'Техника, первая помощь, ответственность. Дальше — билеты и экзамены до уверенного результата.']
    ];
    return '<div style="margin-bottom:36px">' +
      '<h2 style="margin-bottom:6px">План на месяц</h2>' +
      '<p style="color:var(--fg-3);font-size:14.5px;margin-bottom:20px;max-width:60ch">' +
        'Примерно по часу в день — и через месяц можно идти сдавать. Порядок не обязателен, но так материал ложится лучше всего.</p>' +
      '<div class="steps">' + weeks.map(function (w) {
        return '<div class="step"><div class="step-n"></div><div>' +
          '<div class="step-t">' + w[0] + ' · <span style="color:var(--paint)">' + w[1] + '</span></div>' +
          '<div class="step-x">' + w[2] + '</div></div></div>';
      }).join('') + '</div></div>';
  }

  function tile(href, ico, title, sub, pct, note) {
    return '<a class="pick" href="' + href + '" style="text-decoration:none;display:block">' +
      '<div style="font-size:21px;margin-bottom:9px">' + ico + '</div>' +
      '<div class="pick-t">' + esc(title) + '</div>' +
      '<div class="pick-s">' + esc(sub) + '</div>' +
      (pct !== null && pct !== undefined
        ? '<div class="pick-foot">' + UI.bar(pct) + '<span class="pick-pct">' + pct + '%</span></div>'
        : note ? '<div class="pick-foot"><span class="pick-pct">' + esc(note) + '</span></div>' : '') +
    '</a>';
  }

  /* ─────────── Карта курса ─────────── */

  V.course = function () {
    var step = nextStep();
    var nextId = step.module ? step.module.id : null;
    var pct = overall();

    var stops = plan().map(function (p, i) {
      var prog = moduleProgress(p.id);
      var c = courseOf(p.id);
      var m = Store.moduleOf(p.id);
      var cls = 'stop' + (prog >= 100 ? ' done' : '') + (p.id === nextId ? ' now' : '');
      var meta;
      if (!c) {
        meta = '<span class="stop-lock">материал готовится</span>';
      } else {
        meta = '<span class="stop-bar">' + UI.bar(prog, prog >= 100 ? 'go' : '') + '</span>' +
          '<span class="stop-score">' + lessonsDone(p.id) + '/' + c.lessons.length + ' ' +
          UI.plural(c.lessons.length, 'урок', 'урока', 'уроков') + '</span>' +
          (m && m.best ? '<span class="chip ' + (m.passed ? 'go' : '') + '">тест ' + m.best + '%</span>' : '') +
          '<span class="chip">' + moduleQuestions(p.id).length + ' ' + UI.plural(moduleQuestions(p.id).length, 'вопрос', 'вопроса', 'вопросов') + '</span>';
      }
      return '<button class="' + cls + '" data-mod="' + p.id + '"' + (c ? '' : ' disabled style="opacity:.55;cursor:default"') + '>' +
        '<span class="stop-node">' + (prog >= 100 ? '✓' : p.icon) + '</span>' +
        '<span class="stop-body">' +
          '<span class="stop-t">' + (i + 1) + '. ' + esc(p.title) + '</span>' +
          '<span class="stop-s">' + esc(p.sub) + '</span>' +
          '<span class="stop-meta">' + meta + '</span>' +
        '</span></button>';
    }).join('');

    return '<div class="wrap">' +
      '<div class="page-head">' +
        '<h1>Карта курса</h1>' +
        '<p>Двадцать два модуля в том порядке, в котором их удобно изучать: сначала язык дороги, потом знаки, потом манёвры и перекрёстки. После каждого модуля — тест из настоящих экзаменационных вопросов по этой теме.</p>' +
        '<div style="max-width:420px;margin-top:20px">' +
          '<div class="nav-progress-top"><span>Пройдено</span><b>' + pct + '%</b></div>' + UI.bar(pct) +
        '</div>' +
      '</div>' +
      '<div class="route' + (pct ? ' has-progress' : '') + '" style="--done:' + pct + '%">' + stops + '</div>' +
    '</div>';
  };

  V.courseBind = function (host) {
    host.querySelectorAll('[data-mod]').forEach(function (b) {
      b.onclick = function () { location.hash = '#/module/' + b.dataset.mod; };
    });
  };

  /* ─────────── Модуль ─────────── */

  V.module = function (id) {
    var p = planOf(id), c = courseOf(id);
    if (!p) return notFound();
    if (!c) return '<div class="wrap-narrow"><div class="empty"><h3>Материал готовится</h3><p>Модуль «' + esc(p.title) + '» скоро появится.</p><a class="btn" href="#/course">К карте курса</a></div></div>';

    var qs = moduleQuestions(id);
    var m = Store.moduleOf(id);
    var idx = plan().map(function (x) { return x.id; }).indexOf(id);

    var lessons = c.lessons.map(function (l, i) {
      var done = Store.lessonDone(l.id);
      return '<a class="stop' + (done ? ' done' : '') + '" href="#/lesson/' + l.id + '" style="text-decoration:none">' +
        '<span class="stop-node">' + (done ? '✓' : i + 1) + '</span>' +
        '<span class="stop-body">' +
          '<span class="stop-t">' + esc(l.title) + '</span>' +
          '<span class="stop-s">' + (l.minutes || 7) + ' мин чтения' +
            (l.checks && l.checks.length ? ' · ' + l.checks.length + ' ' + UI.plural(l.checks.length, 'вопрос', 'вопроса', 'вопросов') + ' на понимание' : '') + '</span>' +
        '</span></a>';
    }).join('');

    var allRead = lessonsDone(id) === c.lessons.length;

    return '<div class="wrap-narrow">' +
      '<div class="lesson-nav"><a class="btn btn-sm btn-ghost" href="#/course">← Карта курса</a>' +
        '<span class="crumb">Модуль ' + (idx + 1) + ' из ' + plan().length + '</span></div>' +
      '<div class="page-head">' +
        '<div style="font-size:34px;margin-bottom:10px">' + p.icon + '</div>' +
        '<h1>' + esc(p.title) + '</h1>' +
        '<p>' + esc(c.intro || p.sub) + '</p>' +
      '</div>' +

      '<h2 style="margin:30px 0 14px;font-size:19px">Уроки</h2>' +
      '<div class="route" style="padding-left:46px">' + lessons + '</div>' +

      '<div class="hero" style="margin-top:30px;padding:26px">' +
        '<h2 style="font-size:21px">Тест по модулю</h2>' +
        '<p class="hero-lead" style="margin:12px 0 20px;font-size:15.5px">' +
          Math.min(20, qs.length) + ' ' + UI.plural(Math.min(20, qs.length), 'вопрос', 'вопроса', 'вопросов') +
          ' из официальных билетов ГИБДД по этой теме. С разбором каждого ответа. Сдано — от 85%.' +
          (m && m.best ? ' Твой лучший результат: <b>' + m.best + '%</b>.' : '') +
        '</p>' +
        '<div class="hero-cta">' +
          '<a class="btn ' + (allRead ? 'btn-primary' : '') + '" href="#/test/' + id + '">' +
            (m && m.attempts ? 'Пройти ещё раз' : 'Пройти тест') + '</a>' +
          (c.cards && c.cards.length ? '<a class="btn" href="#/cards/' + id + '">Карточки на запоминание</a>' : '') +
          '<a class="btn btn-ghost" href="#/topic/' + id + '">Все ' + qs.length + ' ' + UI.plural(qs.length, 'вопрос', 'вопроса', 'вопросов') + ' темы</a>' +
        '</div>' +
      '</div>' +

      (idx < plan().length - 1
        ? '<div class="lesson-foot"><a class="btn btn-ghost" href="#/module/' + plan()[idx + 1].id + '">Следующий модуль: ' + esc(plan()[idx + 1].title) + ' →</a></div>'
        : '') +
    '</div>';
  };

  /* ─────────── Урок ─────────── */

  function findLesson(lid) {
    var mods = window.COURSE || [];
    for (var i = 0; i < mods.length; i++) {
      var ls = mods[i].lessons || [];
      for (var j = 0; j < ls.length; j++) {
        if (ls[j].id === lid) return { module: mods[i], lesson: ls[j], i: j, of: ls.length };
      }
    }
    return null;
  }

  V.lesson = function (lid) {
    var f = findLesson(lid);
    if (!f) return notFound();
    var p = planOf(f.module.id) || {};
    var done = Store.lessonDone(lid);

    var checks = '';
    if (f.lesson.checks && f.lesson.checks.length) {
      checks = '<div id="checks" style="margin-top:40px">' +
        '<h3 style="font-family:var(--display);font-size:19px;margin-bottom:6px">Проверь себя</h3>' +
        '<p style="color:var(--fg-3);font-size:14.5px;margin-bottom:18px">Короткие вопросы на понимание — не из билетов, а чтобы убедиться, что мысль дошла.</p>' +
        f.lesson.checks.map(function (c, i) {
          return '<div class="q-card" style="padding:20px;margin-bottom:12px" data-check="' + i + '">' +
            '<div class="q-text" style="font-size:16.5px;margin-bottom:14px">' + esc(c.q) + '</div>' +
            '<div class="opts">' + c.options.map(function (o, j) {
              return '<button class="opt" style="padding:11px 15px;font-size:15px" data-c="' + i + '" data-o="' + j + '">' +
                '<span class="opt-k">' + (j + 1) + '</span><span>' + esc(o) + '</span></button>';
            }).join('') + '</div>' +
            '<div class="verdict-slot"></div></div>';
        }).join('') + '</div>';
    }

    var kp = '';
    if (f.lesson.keyPoints && f.lesson.keyPoints.length) {
      kp = '<div class="keypoints"><h4>Запомнить из этого урока</h4><ul>' +
        f.lesson.keyPoints.map(function (k) { return '<li>' + UI.md(k) + '</li>'; }).join('') + '</ul></div>';
    }

    var prev = f.i > 0 ? f.module.lessons[f.i - 1] : null;
    var next = f.i < f.of - 1 ? f.module.lessons[f.i + 1] : null;

    return '<div class="wrap-narrow">' +
      '<div class="lesson-nav">' +
        '<a class="btn btn-sm btn-ghost" href="#/module/' + f.module.id + '">← ' + esc(p.title || f.module.title) + '</a>' +
        '<span class="crumb">Урок ' + (f.i + 1) + ' из ' + f.of + '</span>' +
        (done ? '<span class="chip go">✓ пройден</span>' : '') +
      '</div>' +
      '<h1 style="margin-bottom:8px">' + esc(f.lesson.title) + '</h1>' +
      '<div class="eyebrow" style="margin-bottom:28px">' + (f.lesson.minutes || 7) + ' мин чтения</div>' +
      '<div class="lesson-body">' + UI.blocks(f.lesson.blocks) + '</div>' +
      kp + checks +
      '<div class="lesson-foot">' +
        '<button class="btn btn-primary" id="l-done">' + (done ? 'Пройдено ✓' : 'Урок пройден') + '</button>' +
        (next ? '<a class="btn" data-forward href="#/lesson/' + next.id + '">Следующий урок</a>'
              : '<a class="btn" data-forward href="#/test/' + f.module.id + '">Перейти к тесту модуля</a>') +
        (prev ? '<a class="btn btn-ghost btn-sm" href="#/lesson/' + prev.id + '">← Предыдущий</a>' : '') +
      '</div>' +
    '</div>';
  };

  V.lessonBind = function (host, lid) {
    var f = findLesson(lid);
    var btn = document.getElementById('l-done');
    if (btn) btn.onclick = function () {
      Store.markLesson(lid);
      btn.textContent = 'Пройдено ✓';
      var next = f && f.i < f.of - 1 ? f.module.lessons[f.i + 1] : null;
      if (next) location.hash = '#/lesson/' + next.id;
      else location.hash = '#/test/' + f.module.id;
    };

    /* Переход вперёд тоже считается прохождением урока: раньше отмечала только
       кнопка «Урок пройден», и уроки, пролистанные через «Следующий урок», оставались непройденными */
    host.querySelectorAll('[data-forward]').forEach(function (a) {
      a.addEventListener('click', function () { Store.markLesson(lid); });
    });

    host.querySelectorAll('[data-c]').forEach(function (b) {
      b.onclick = function () {
        var ci = +b.dataset.c, oi = +b.dataset.o;
        var card = host.querySelector('[data-check="' + ci + '"]');
        if (card.dataset.answered) return;
        card.dataset.answered = '1';
        var c = f.lesson.checks[ci];
        card.querySelectorAll('[data-c="' + ci + '"]').forEach(function (o) {
          var j = +o.dataset.o;
          o.disabled = true;
          if (j === c.correct) o.classList.add('right');
          else if (j === oi) o.classList.add('wrong');
        });
        var right = oi === c.correct;
        card.querySelector('.verdict-slot').innerHTML =
          '<div class="verdict ' + (right ? 'right' : 'wrong') + '" style="margin-top:14px">' +
          '<div class="verdict-t">' + (right ? 'Верно' : 'Не совсем') + '</div>' +
          '<div>' + esc(c.explain || '') + '</div></div>';
      };
    });
  };

  /* ─────────── Тест модуля ─────────── */

  V.test = function (id) {
    var p = planOf(id);
    if (!p) { location.hash = '#/course'; return ''; }
    var qs = moduleTestSet(id);
    if (!qs.length) return '<div class="wrap-narrow"><div class="empty"><h3>Вопросов пока нет</h3></div></div>';

    setTimeout(function () {
      Quiz.start({
        title: p.title, sub: 'тест модуля',
        questions: qs, mode: 'learn',
        back: '#/module/' + id, backLabel: 'К модулю',
        onFinish: function (res) {
          var pct = Math.round(res.correct * 100 / res.total);
          var passed = pct >= 85;
          Store.saveModule(id, pct, passed);
          showResult({
            pct: pct, passed: passed, res: res,
            title: passed ? 'Тест сдан' : 'Ещё нужно повторить',
            text: passed
              ? 'Отличный результат по теме «' + p.title + '». Можно двигаться дальше.'
              : 'Для зачёта нужно 85%. Посмотри разбор ошибок ниже — там сразу видно, что именно пропустила.',
            actions: [
              passed ? { href: '#/course', label: 'К карте курса', primary: true } : { href: '#/test/' + id, label: 'Пройти ещё раз', primary: true },
              { href: '#/module/' + id, label: 'Вернуться к урокам' },
              { href: '#/topic/' + id, label: 'Прорешать всю тему' }
            ]
          });
        }
      });
    }, 0);
    return '<div class="wrap-narrow"><div class="empty">Готовим вопросы…</div></div>';
  };

  /* ─────────── Экран результата ─────────── */

  function showResult(o) {
    var color = o.passed ? 'var(--go)' : o.pct >= 60 ? 'var(--paint)' : 'var(--stop)';
    var wrong = [];
    o.res.questions.forEach(function (q, i) {
      if (o.res.picks[i] !== q.correct) wrong.push({ q: q, pick: o.res.picks[i], n: i + 1 });
    });

    var review = wrong.length
      ? '<h2 style="margin:44px 0 16px;font-size:20px">Разбор ошибок · ' + wrong.length + '</h2>' +
        wrong.map(function (w) {
          return '<div class="review-item">' +
            '<div class="review-q">' + w.n + '. ' + esc(w.q.text) + '</div>' +
            (w.q.img ? '<div class="q-img" style="max-width:340px;margin:0 0 12px"><img src="img/' + esc(w.q.img) + '" alt=""></div>' : '') +
            '<div class="review-a" style="color:var(--stop)">Твой ответ: <b>' + (w.pick === null ? '— не отвечено —' : esc(w.q.answers[w.pick])) + '</b></div>' +
            '<div class="review-a" style="color:var(--go)">Правильно: <b>' + esc(w.q.answers[w.q.correct]) + '</b></div>' +
            (w.q.tip ? '<div class="review-tip">' + esc(w.q.tip) + '</div>' : '') +
          '</div>';
        }).join('')
      : '<div class="note tip" style="max-width:600px;margin:40px auto 0"><div class="note-t">💡 Ни одной ошибки</div>' +
        '<div>Это уровень, с которым экзамен сдают с первого раза.</div></div>';

    document.getElementById('view').innerHTML =
      '<div class="wrap-narrow">' +
        '<div class="result">' +
          '<div class="result-ring">' + UI.ring(o.pct, color) +
            '<div class="result-ring-n">' + o.pct + '%<small>' + o.res.correct + ' из ' + o.res.total + '</small></div>' +
          '</div>' +
          '<h2>' + esc(o.title) + '</h2>' +
          '<p>' + o.text + '</p>' +
          '<div class="result-cta">' + o.actions.map(function (a) {
            return '<a class="btn ' + (a.primary ? 'btn-primary' : '') + '" href="' + a.href + '">' + esc(a.label) + '</a>';
          }).join('') + '</div>' +
        '</div>' + review +
      '</div>';
    window.scrollTo(0, 0);
  }

  /* ─────────── Тренировки ─────────── */

  V.train = function () {
    var mistakes = Store.mistakes();
    var topics = window.DB.topics.map(function (t) {
      var stat = topicStat(t);
      return '<button class="pick" data-topic="' + esc(t.name) + '">' +
        '<div class="pick-t">' + esc(t.name) + '</div>' +
        '<div class="pick-s">' + t.qids.length + ' ' + UI.plural(t.qids.length, 'вопрос', 'вопроса', 'вопросов') + '</div>' +
        '<div class="pick-foot">' + UI.bar(stat.pct, stat.pct >= 85 ? 'go' : '') +
          '<span class="pick-pct">' + (stat.seen ? stat.pct + '%' : '—') + '</span></div>' +
      '</button>';
    }).join('');

    return '<div class="wrap">' +
      '<div class="page-head"><h1>Тренировка</h1>' +
        '<p>Здесь можно решать вопросы как угодно: по одной теме, целыми билетами, подряд все 800 или только те, где ты уже ошибалась.</p></div>' +

      '<div class="pick-grid" style="margin-bottom:36px">' +
        '<a class="pick" href="#/mistakes" style="text-decoration:none;display:block' + (mistakes.length ? ';border-color:rgba(255,92,92,.35)' : '') + '">' +
          '<div style="font-size:21px;margin-bottom:9px">🔁</div>' +
          '<div class="pick-t">Работа над ошибками</div>' +
          '<div class="pick-s">' + (mistakes.length
            ? mistakes.length + ' ' + UI.plural(mistakes.length, 'вопрос ждёт', 'вопроса ждут', 'вопросов ждут') + ' повторения'
            : 'Пока пусто — ошибок нет') + '</div></a>' +
        '<a class="pick" href="#/tickets" style="text-decoration:none;display:block">' +
          '<div style="font-size:21px;margin-bottom:9px">🎫</div>' +
          '<div class="pick-t">Билеты</div>' +
          '<div class="pick-s">40 официальных билетов по 20 вопросов</div></a>' +
        '<a class="pick" href="#/marathon" style="text-decoration:none;display:block">' +
          '<div style="font-size:21px;margin-bottom:9px">🏃</div>' +
          '<div class="pick-t">Марафон 800</div>' +
          '<div class="pick-s">Все вопросы подряд, с разбором каждого</div></a>' +
        '<a class="pick" href="#/exam" style="text-decoration:none;display:block">' +
          '<div style="font-size:21px;margin-bottom:9px">🏁</div>' +
          '<div class="pick-t">Экзамен как в ГИБДД</div>' +
          '<div class="pick-s">20 вопросов, 20 минут, доп. вопросы за ошибки</div></a>' +
      '</div>' +

      '<h2 style="margin-bottom:6px">По темам</h2>' +
      '<p style="color:var(--fg-3);font-size:14.5px;margin-bottom:18px">26 тем официальной программы. Полоска показывает долю правильных ответов.</p>' +
      '<div class="pick-grid">' + topics + '</div>' +
    '</div>';
  };

  function topicStat(t) {
    var ok = 0, tot = 0, seen = 0, done = {};
    t.qids.forEach(function (qid) {
      var q = qById[qid];
      if (!q || done[q.srcId]) return;
      done[q.srcId] = 1;
      var a = Store.answerOf(q.srcId);
      if (a) { ok += a.ok; tot += a.ok + a.no; seen++; }
    });
    return { pct: tot ? Math.round(ok * 100 / tot) : 0, seen: seen, total: Object.keys(done).length };
  }

  V.trainBind = function (host) {
    host.querySelectorAll('[data-topic]').forEach(function (b) {
      b.onclick = function () { location.hash = '#/topicq/' + encodeURIComponent(b.dataset.topic); };
    });
  };

  /* Тренировка: по названию темы или по модулю */
  function runSet(opt) {
    setTimeout(function () {
      Quiz.start({
        title: opt.title, sub: opt.sub || 'тренировка',
        questions: opt.questions, mode: 'learn',
        back: opt.back || '#/train', backLabel: opt.backLabel || 'К тренировкам',
        onFinish: function (res) {
          var pct = Math.round(res.correct * 100 / res.total);
          var passAt = opt.passAt || 85;
          if (opt.onDone) opt.onDone(pct, res);
          showResult({
            pct: pct, passed: pct >= passAt, res: res,
            title: opt.verdict ? opt.verdict(pct >= passAt, pct)
              : pct >= 90 ? 'Прекрасно' : pct >= 70 ? 'Неплохо' : 'Есть над чем поработать',
            text: opt.verdictText ? opt.verdictText(pct >= passAt, pct)
              : pct >= 90 ? 'Тема уверенно закрыта.'
              : pct >= 70 ? 'Основное понятно, но пара мест требует внимания. Разбор ниже.'
              : 'Стоит вернуться к теории по этой теме, а потом прорешать ещё раз.',
            actions: (opt.actions || []).concat([{ href: opt.back || '#/train', label: 'К тренировкам' }])
          });
        }
      });
    }, 0);
    return '<div class="wrap-narrow"><div class="empty">Готовим вопросы…</div></div>';
  }

  V.topicq = function (name) {
    var t = window.DB.topics.filter(function (x) { return x.name === decodeURIComponent(name); })[0];
    if (!t) return notFound();
    var seen = {}, qs = [];
    t.qids.forEach(function (id) {
      var q = qById[id];
      if (q && !seen[q.srcId]) { seen[q.srcId] = 1; qs.push(q); }
    });
    return runSet({
      title: t.name, questions: UI.shuffle(qs, Date.now() % 99991),
      actions: [{ href: '#/topicq/' + encodeURIComponent(t.name), label: 'Ещё раз', primary: true }]
    });
  };

  V.topic = function (id) {
    var p = planOf(id);
    if (!p) return notFound();
    return runSet({
      title: p.title, sub: 'все вопросы темы',
      questions: UI.shuffle(moduleQuestions(id), Date.now() % 99991),
      back: '#/module/' + id, backLabel: 'К модулю',
      /* Все вопросы темы решены не хуже, чем нужно для теста модуля, — тест засчитан */
      onDone: function (pct) { Store.saveModule(id, pct, pct >= 85); },
      verdict: function (ok) { return ok ? 'Тест модуля засчитан' : 'Ещё нужно повторить'; },
      verdictText: function (ok) {
        return ok ? 'Вся тема решена на зачёт — тест модуля засчитан.'
          : 'Для зачёта модуля нужно 85%. Разбор ошибок ниже.';
      },
      actions: [{ href: '#/topic/' + id, label: 'Ещё раз', primary: true }]
    });
  };

  V.mistakes = function () {
    var ids = Store.mistakes();
    if (!ids.length) {
      return '<div class="wrap-narrow"><div class="empty">' +
        '<h3>Ошибок нет</h3><p>Как только где-то ошибёшься, вопрос попадёт сюда и будет возвращаться, пока не ответишь на него верно два раза подряд.</p>' +
        '<a class="btn" href="#/train" style="margin-top:18px">К тренировкам</a></div></div>';
    }
    var qs = ids.map(function (s) { return qBySrc[s]; }).filter(Boolean).slice(0, 40);
    return runSet({
      title: 'Работа над ошибками', sub: qs.length + ' ' + UI.plural(qs.length, 'вопрос', 'вопроса', 'вопросов'),
      questions: qs,
      actions: [{ href: '#/mistakes', label: 'Следующая порция', primary: true }]
    });
  };

  V.marathon = function () {
    var seen = {}, qs = [];
    window.DB.questions.forEach(function (q) { if (!seen[q.srcId]) { seen[q.srcId] = 1; qs.push(q); } });
    return runSet({ title: 'Марафон', sub: qs.length + ' вопросов', questions: qs });
  };

  V.tickets = function () {
    var items = window.DB.tickets.map(function (t) {
      var s = Store.ticketOf(t.n);
      var cls = 'ticket-b' + (s ? (s.passed ? ' done' : ' fail') : '');
      return '<button class="' + cls + '" data-t="' + t.n + '"><b>' + t.n + '</b>' +
        '<span>' + (s ? s.best + '%' : '20 вопр.') + '</span></button>';
    }).join('');
    return '<div class="wrap">' +
      '<div class="page-head"><h1>Билеты</h1>' +
        '<p>Сорок официальных билетов ГИБДД, по 20 вопросов в каждом. Здесь разбор показывается сразу после ответа — это тренировка, а не экзамен.</p></div>' +
      '<div class="ticket-grid">' + items + '</div></div>';
  };

  V.ticketsBind = function (host) {
    host.querySelectorAll('[data-t]').forEach(function (b) {
      b.onclick = function () { location.hash = '#/ticket/' + b.dataset.t; };
    });
  };

  V.ticket = function (n) {
    n = +n;
    var t = window.DB.tickets.filter(function (x) { return x.n === n; })[0];
    if (!t) return notFound();
    var qs = t.qids.map(function (id) { return qById[id]; }).filter(Boolean);
    return runSet({
      title: 'Билет ' + n, sub: '20 вопросов', questions: qs,
      back: '#/tickets', backLabel: 'К билетам',
      passAt: 90,
      onDone: function (pct) { Store.saveTicket(n, pct, pct >= 90); },
      verdict: function (ok) { return ok ? 'Билет решён' : 'Билет не решён'; },
      verdictText: function (ok, pct) {
        return ok ? 'Не больше двух ошибок — на экзамене с таким результатом есть шанс сдать.'
          : 'Для зачёта билета нужно 90% — не больше двух ошибок из двадцати. Разбор ниже.';
      },
      actions: [
        n < 40 ? { href: '#/ticket/' + (n + 1), label: 'Билет ' + (n + 1), primary: true } : { href: '#/tickets', label: 'К билетам', primary: true }
      ]
    });
  };

  /* ─────────── Карточки на запоминание ─────────── */

  V.cards = function (id) {
    var c = courseOf(id), p = planOf(id);
    if (!c || !c.cards || !c.cards.length) return notFound();
    var cards = UI.shuffle(c.cards, Date.now() % 9973);
    setTimeout(function () { runCards(cards, p, id); }, 0);
    return '<div class="wrap-narrow"><div class="empty">Тасуем карточки…</div></div>';
  };

  function runCards(cards, p, id) {
    var i = 0;
    function draw() {
      var c = cards[i];
      document.getElementById('view').innerHTML =
        '<div class="wrap-narrow">' +
          '<div class="lesson-nav"><a class="btn btn-sm btn-ghost" href="#/module/' + id + '">← К модулю</a>' +
            '<span class="crumb">' + esc(p.title) + ' · карточка ' + (i + 1) + ' из ' + cards.length + '</span></div>' +
          '<div class="quiz-top">' + UI.bar((i + 1) * 100 / cards.length) + '</div>' +
          '<div class="flash" id="flash">' +
            '<div class="flash-in">' +
              '<div class="flash-face"><div><div>' + UI.md(c.front) + '</div>' +
                '<div class="flash-hint">нажми, чтобы перевернуть</div></div></div>' +
              '<div class="flash-face flash-back"><div>' + UI.md(c.back) + '</div></div>' +
            '</div></div>' +
          '<div class="quiz-foot" style="justify-content:center">' +
            (i > 0 ? '<button class="btn btn-sm" id="c-prev">← Назад</button>' : '') +
            '<button class="btn btn-primary" id="c-next">' + (i === cards.length - 1 ? 'Готово' : 'Следующая') + '</button>' +
          '</div></div>';
      var f = document.getElementById('flash');
      f.onclick = function () { f.classList.toggle('flipped'); };
      var nx = document.getElementById('c-next');
      nx.onclick = function () {
        if (i === cards.length - 1) location.hash = '#/module/' + id;
        else { i++; draw(); }
      };
      var pv = document.getElementById('c-prev');
      if (pv) pv.onclick = function () { i--; draw(); };
      window.scrollTo(0, 0);
    }
    draw();
  }

  function notFound() {
    return '<div class="wrap-narrow"><div class="empty"><h3>Страница не найдена</h3>' +
      '<a class="btn" href="#/" style="margin-top:16px">На главную</a></div></div>';
  }

  window.Views = V;
  window.Views._init = function () { indexQuestions(); };
  window.Views._helpers = {
    plan: plan, planOf: planOf, courseOf: courseOf, moduleQuestions: moduleQuestions,
    moduleProgress: moduleProgress, overall: overall, nextStep: nextStep, topicStat: topicStat,
    qById: function (id) { return qById[id]; }, qBySrc: function (s) { return qBySrc[s]; },
    showResult: showResult, notFound: notFound, lessonsDone: lessonsDone
  };
})();
