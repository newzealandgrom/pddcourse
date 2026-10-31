/* Прогресс ученика. Хранится в localStorage браузера.
   Всё завёрнуто в try/catch: если браузер запретит хранилище (бывает при
   открытии файла напрямую), приложение продолжит работать в памяти. */
(function () {
  'use strict';

  var KEY = 'pdd.progress.v1';

  /* Каждый раз новый объект: вложенные {} и [] не должны делиться между копиями */
  function blank() {
    return {
      lessons: {},   // lessonId -> ts
      modules: {},   // moduleId -> {best, attempts, passed, ts}
      answers: {},   // srcId -> {ok, no, streak, ts}
      tickets: {},   // номер -> {best, passed, ts}
      exams: [],     // история экзаменов
      days: [],      // даты занятий 'ГГГГ-ММ-ДД'
      started: null
    };
  }

  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }

  /* Приводит данные из хранилища или файла к ожидаемой форме: битые поля заменяются пустыми */
  function normalize(d) {
    var s = blank();
    if (!isObj(d)) return s;
    ['lessons', 'modules', 'answers', 'tickets'].forEach(function (k) { if (isObj(d[k])) s[k] = d[k]; });
    if (Array.isArray(d.exams)) s.exams = d.exams;
    if (Array.isArray(d.days)) s.days = d.days.filter(function (x) { return typeof x === 'string'; });
    if (typeof d.started === 'number') s.started = d.started;
    return s;
  }

  var mem = null, last = null, canSave = true;

  function read() {
    if (mem) return mem;
    try {
      var raw = localStorage.getItem(KEY);
      mem = raw ? normalize(JSON.parse(raw)) : blank();
    } catch (e) {
      canSave = false;
      mem = last || blank();
    }
    if (!mem.started) mem.started = Date.now();
    last = mem;
    return mem;
  }

  /* Перед каждой записью перечитываем хранилище: если курс открыт в двух вкладках,
     иначе вторая вкладка затёрла бы прогресс первой своей устаревшей копией. */
  function fresh() {
    if (canSave) mem = null;
    return read();
  }

  function changed() {
    try { window.dispatchEvent(new Event('store:change')); } catch (e) {}
  }

  function save() {
    last = mem;
    if (canSave) {
      try { localStorage.setItem(KEY, JSON.stringify(mem)); }
      catch (e) { canSave = false; }
    }
    changed();
  }

  /* Другая вкладка что-то записала — сбрасываем кэш, чтобы показывать свежие данные */
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY && e.key !== null) return;
    mem = null;
    changed();
  });

  function dayKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function touchDay(s) {
    var t = dayKey(new Date());
    if (s.days.indexOf(t) < 0) s.days.push(t);
  }

  /* Объединение двух копий прогресса: ничего пройденного не теряется */
  function merge(a, b) {
    var out = normalize(a), k;
    for (k in b.lessons) if (!out.lessons[k] || b.lessons[k] < out.lessons[k]) out.lessons[k] = b.lessons[k];
    for (k in b.modules) {
      var m = out.modules[k], n = b.modules[k];
      if (!isObj(n)) continue;
      out.modules[k] = m ? {
        best: Math.max(m.best || 0, n.best || 0),
        attempts: Math.max(m.attempts || 0, n.attempts || 0),
        passed: !!(m.passed || n.passed),
        ts: Math.max(m.ts || 0, n.ts || 0)
      } : n;
    }
    for (k in b.answers) {
      var x = out.answers[k], y = b.answers[k];
      if (!isObj(y)) continue;
      out.answers[k] = !x ? y : {
        ok: Math.max(x.ok || 0, y.ok || 0),
        no: Math.max(x.no || 0, y.no || 0),
        streak: (y.ts || 0) > (x.ts || 0) ? y.streak || 0 : x.streak || 0,
        ts: Math.max(x.ts || 0, y.ts || 0)
      };
    }
    for (k in b.tickets) {
      var t = out.tickets[k], u = b.tickets[k];
      if (!isObj(u)) continue;
      out.tickets[k] = t ? {
        best: Math.max(t.best || 0, u.best || 0),
        passed: !!(t.passed || u.passed),
        ts: Math.max(t.ts || 0, u.ts || 0)
      } : u;
    }
    var seen = {};
    out.exams = out.exams.concat(b.exams).filter(function (e) {
      if (!isObj(e)) return false;
      var id = e.ts + ':' + e.ticket;
      if (seen[id]) return false;
      seen[id] = 1;
      return true;
    }).sort(function (p, q) { return (q.ts || 0) - (p.ts || 0); }).slice(0, 60);
    out.days = out.days.concat(b.days).filter(function (d, i, arr) { return arr.indexOf(d) === i; }).sort();
    out.started = Math.min(out.started || Date.now(), b.started || Date.now());
    return out;
  }

  var Store = {
    get storageWorks() { read(); return canSave; },

    all: read,

    reset: function () {
      mem = blank();
      mem.started = Date.now();
      save();
    },

    /* ── Уроки ── */
    lessonDone: function (id) { return !!read().lessons[id]; },
    markLesson: function (id) {
      var s = fresh();
      if (!s.lessons[id]) { s.lessons[id] = Date.now(); touchDay(s); save(); }
    },
    unmarkLesson: function (id) { var s = fresh(); delete s.lessons[id]; save(); },

    /* ── Ответы на вопросы ── */
    recordAnswer: function (srcId, correct) {
      var s = fresh();
      var a = s.answers[srcId] || { ok: 0, no: 0, streak: 0, ts: 0 };
      if (correct) { a.ok++; a.streak++; } else { a.no++; a.streak = 0; }
      a.ts = Date.now();
      s.answers[srcId] = a;
      touchDay(s);
      save();
    },
    answerOf: function (srcId) { return read().answers[srcId] || null; },

    /* Вопросы, которые стоит повторить: отвечены неверно и ещё не закреплены */
    mistakes: function () {
      var s = read(), out = [];
      for (var id in s.answers) {
        var a = s.answers[id];
        if (a.no > 0 && a.streak < 2) out.push({ id: id, a: a });
      }
      out.sort(function (x, y) {
        var d = (y.a.no - y.a.ok) - (x.a.no - x.a.ok);
        return d !== 0 ? d : x.a.ts - y.a.ts;
      });
      return out.map(function (x) { return x.id; });
    },

    /* ── Тесты модулей ── */
    saveModule: function (id, pct, passed) {
      var s = fresh();
      var m = s.modules[id] || { best: 0, attempts: 0, passed: false, ts: 0 };
      m.attempts++;
      m.best = Math.max(m.best, pct);
      m.passed = m.passed || passed;
      m.ts = Date.now();
      s.modules[id] = m;
      touchDay(s);
      save();
    },
    moduleOf: function (id) { return read().modules[id] || null; },

    /* ── Билеты ── */
    saveTicket: function (n, pct, passed) {
      var s = fresh();
      var t = s.tickets[n] || { best: 0, passed: false, ts: 0 };
      t.best = Math.max(t.best, pct);
      t.passed = t.passed || passed;
      t.ts = Date.now();
      s.tickets[n] = t;
      touchDay(s);
      save();
    },
    ticketOf: function (n) { return read().tickets[n] || null; },

    /* ── Экзамены ── */
    saveExam: function (rec) {
      var s = fresh();
      rec.ts = Date.now();
      s.exams.unshift(rec);
      if (s.exams.length > 60) s.exams.length = 60;
      touchDay(s);
      save();
    },
    exams: function () { return read().exams; },

    /* ── Сводка ── */
    /* Сколько дней подряд были занятия; сегодняшний пропуск серию ещё не обрывает */
    streak: function () {
      var days = read().days;
      if (!days.length) return 0;
      var d = new Date();
      if (days.indexOf(dayKey(d)) < 0) d.setDate(d.getDate() - 1);
      var n = 0;
      while (days.indexOf(dayKey(d)) >= 0 && n < 4000) { n++; d.setDate(d.getDate() - 1); }
      return n;
    },

    answeredCount: function () {
      var s = read(), n = 0;
      for (var k in s.answers) n++;
      return n;
    },

    accuracy: function () {
      var s = read(), ok = 0, tot = 0;
      for (var k in s.answers) { ok += s.answers[k].ok; tot += s.answers[k].ok + s.answers[k].no; }
      return tot ? Math.round(ok * 100 / tot) : 0;
    },

    /* ── Перенос прогресса ── */
    export: function () { return JSON.stringify(read()); },
    /* Файл не заменяет текущий прогресс, а добавляется к нему */
    import: function (str) {
      try {
        var d = JSON.parse(str);
        if (!isObj(d) || !(isObj(d.lessons) || isObj(d.answers) || isObj(d.modules))) return false;
        mem = merge(fresh(), normalize(d));
        save();
        return true;
      } catch (e) { return false; }
    }
  };

  /* Просим браузер не стирать данные сайта при нехватке места и по таймеру (Safari) */
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}

  window.Store = Store;
})();
