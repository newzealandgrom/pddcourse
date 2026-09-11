/* Прогресс ученика. Хранится в localStorage браузера.
   Всё завёрнуто в try/catch: если браузер запретит хранилище (бывает при
   открытии файла напрямую), приложение продолжит работать в памяти. */
(function () {
  'use strict';

  var KEY = 'pdd.progress.v1';

  var blank = {
    lessons: {},   // lessonId -> ts
    modules: {},   // moduleId -> {best, attempts, passed, ts}
    answers: {},   // srcId -> {ok, no, streak, ts}
    tickets: {},   // номер -> {best, passed, ts}
    exams: [],     // история экзаменов
    days: [],      // даты занятий 'ГГГГ-ММ-ДД'
    started: null
  };

  var mem = null, canSave = true;

  function read() {
    if (mem) return mem;
    try {
      var raw = localStorage.getItem(KEY);
      mem = raw ? Object.assign({}, blank, JSON.parse(raw)) : Object.assign({}, blank);
    } catch (e) {
      canSave = false;
      mem = Object.assign({}, blank);
    }
    if (!mem.started) mem.started = Date.now();
    return mem;
  }

  function save() {
    if (!canSave) return;
    try { localStorage.setItem(KEY, JSON.stringify(mem)); }
    catch (e) { canSave = false; }
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function touchDay() {
    var s = read(), t = today();
    if (s.days[s.days.length - 1] !== t) { s.days.push(t); save(); }
  }

  var Store = {
    get storageWorks() { read(); return canSave; },

    all: read,

    reset: function () {
      mem = Object.assign({}, blank, { started: Date.now(), lessons: {}, modules: {}, answers: {}, tickets: {}, exams: [], days: [] });
      save();
    },

    /* ── Уроки ── */
    lessonDone: function (id) { return !!read().lessons[id]; },
    markLesson: function (id) {
      var s = read();
      if (!s.lessons[id]) { s.lessons[id] = Date.now(); touchDay(); save(); }
    },
    unmarkLesson: function (id) { var s = read(); delete s.lessons[id]; save(); },

    /* ── Ответы на вопросы ── */
    recordAnswer: function (srcId, correct) {
      var s = read();
      var a = s.answers[srcId] || { ok: 0, no: 0, streak: 0, ts: 0 };
      if (correct) { a.ok++; a.streak++; } else { a.no++; a.streak = 0; }
      a.ts = Date.now();
      s.answers[srcId] = a;
      touchDay();
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
      var s = read();
      var m = s.modules[id] || { best: 0, attempts: 0, passed: false, ts: 0 };
      m.attempts++;
      m.best = Math.max(m.best, pct);
      m.passed = m.passed || passed;
      m.ts = Date.now();
      s.modules[id] = m;
      touchDay();
      save();
    },
    moduleOf: function (id) { return read().modules[id] || null; },

    /* ── Билеты ── */
    saveTicket: function (n, pct, passed) {
      var s = read();
      var t = s.tickets[n] || { best: 0, passed: false, ts: 0 };
      t.best = Math.max(t.best, pct);
      t.passed = t.passed || passed;
      t.ts = Date.now();
      s.tickets[n] = t;
      touchDay();
      save();
    },
    ticketOf: function (n) { return read().tickets[n] || null; },

    /* ── Экзамены ── */
    saveExam: function (rec) {
      var s = read();
      rec.ts = Date.now();
      s.exams.unshift(rec);
      if (s.exams.length > 60) s.exams.length = 60;
      touchDay();
      save();
    },
    exams: function () { return read().exams; },

    /* ── Сводка ── */
    streak: function () {
      var days = read().days;
      if (!days.length) return 0;
      var n = 0, d = new Date();
      for (;;) {
        var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        if (days.indexOf(key) >= 0) { n++; d.setDate(d.getDate() - 1); }
        else if (n === 0) { d.setDate(d.getDate() - 1); if (days.indexOf(
          d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')) < 0) return 0; }
        else break;
        if (n > 400) break;
      }
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
    import: function (str) {
      try {
        var d = JSON.parse(str);
        if (!d || typeof d !== 'object') return false;
        mem = Object.assign({}, blank, d);
        save();
        return true;
      } catch (e) { return false; }
    }
  };

  window.Store = Store;
})();
