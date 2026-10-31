/* Движок вопросов. Два режима:
   learn — сразу показывает правильный ответ и объяснение;
   exam  — молчит до конца, есть таймер и сетка вопросов, как в ГИБДД. */
(function () {
  'use strict';

  var esc = UI.esc, md = UI.md;
  var cur = null;

  function stop() {
    if (cur && cur.timer) { clearInterval(cur.timer); cur.timer = null; }
    document.removeEventListener('keydown', onKey);
    cur = null;
  }

  function onKey(e) {
    if (!cur || cur.finished) return;
    var q = cur.questions[cur.idx];
    if (e.key >= '1' && e.key <= '9') {
      var n = +e.key - 1;
      if (q && n < q.answers.length) { e.preventDefault(); pick(n); }
    } else if (e.key === 'Enter' || e.key === ' ') {
      var b = document.getElementById('q-next');
      if (b && !b.disabled) { e.preventDefault(); b.click(); }
    } else if (e.key === 'ArrowRight') { go(cur.idx + 1); }
    else if (e.key === 'ArrowLeft') { go(cur.idx - 1); }
  }

  function start(opt) {
    stop();
    cur = {
      title: opt.title,
      sub: opt.sub || '',
      questions: opt.questions,
      mode: opt.mode || 'learn',
      picks: opt.questions.map(function () { return null; }),
      idx: 0,
      finished: false,
      left: opt.timeLimit || 0,
      timeLimit: opt.timeLimit || 0,
      onFinish: opt.onFinish,
      back: opt.back || '#/course',
      backLabel: opt.backLabel || 'Выйти',
      extraFrom: opt.extraFrom || 0,     // с какого индекса пошли дополнительные вопросы
      onAnswer: opt.onAnswer,
      shuffleOpts: opt.shuffleOpts !== false
    };
    /* Порядок вариантов — случайный при каждом запуске, чтобы не запоминать ответ по позиции */
    if (cur.shuffleOpts) {
      cur.order = cur.questions.map(function (q) {
        return UI.shuffle(q.answers.map(function (_, j) { return j; }));
      });
    } else {
      cur.order = cur.questions.map(function (q) { return q.answers.map(function (_, j) { return j; }); });
    }
    document.addEventListener('keydown', onKey);
    if (cur.timeLimit) {
      cur.timer = setInterval(function () {
        cur.left--;
        var t = document.getElementById('q-timer');
        if (t) {
          t.textContent = UI.fmtTime(Math.max(0, cur.left));
          t.classList.toggle('low', cur.left <= 60);
        }
        if (cur.left <= 0) finish('time');
      }, 1000);
    }
    render();
  }

  function addQuestions(list, extraSeconds) {
    if (!cur) return;
    cur.extraFrom = cur.questions.length;
    cur.questions = cur.questions.concat(list);
    list.forEach(function (q) {
      cur.picks.push(null);
      var idxs = q.answers.map(function (_, j) { return j; });
      cur.order.push(cur.shuffleOpts ? UI.shuffle(idxs) : idxs);
    });
    cur.left += extraSeconds || 0;
    cur.idx = cur.extraFrom;
    render();
  }

  function pick(shownIdx) {
    if (!cur || cur.finished) return;
    var i = cur.idx;
    if (cur.picks[i] !== null) return;
    var real = cur.order[i][shownIdx];
    cur.picks[i] = real;
    var q = cur.questions[i];
    var correct = real === q.correct;
    if (q.srcId) Store.recordAnswer(q.srcId, correct);
    if (cur.onAnswer) {
      var res = cur.onAnswer(i, correct, q);
      if (res === 'stop') return;
    }
    render();
    if (cur.mode === 'exam') {
      setTimeout(function () {
        if (!cur || cur.finished) return;
        var next = nextUnanswered();
        if (next >= 0) go(next); else render();
      }, 260);
    }
  }

  function nextUnanswered() {
    for (var i = cur.idx + 1; i < cur.questions.length; i++) if (cur.picks[i] === null) return i;
    for (var j = 0; j < cur.questions.length; j++) if (cur.picks[j] === null) return j;
    return -1;
  }

  function go(i) {
    if (!cur || cur.finished) return;
    if (i < 0 || i >= cur.questions.length) return;
    cur.idx = i;
    render();
  }

  function score() {
    var ok = 0;
    cur.questions.forEach(function (q, i) { if (cur.picks[i] === q.correct) ok++; });
    return ok;
  }

  function finish(reason) {
    if (!cur || cur.finished) return;
    cur.finished = true;
    if (cur.timer) { clearInterval(cur.timer); cur.timer = null; }
    var res = {
      total: cur.questions.length,
      correct: score(),
      picks: cur.picks.slice(),
      questions: cur.questions.slice(),
      reason: reason || 'done',
      timeUsed: cur.timeLimit ? cur.timeLimit - cur.left : 0,
      extraFrom: cur.extraFrom
    };
    document.removeEventListener('keydown', onKey);
    var cb = cur.onFinish;
    cur = null;
    if (cb) cb(res);
  }

  function render() {
    if (!cur) return;
    var i = cur.idx, q = cur.questions[i], picked = cur.picks[i];
    var revealed = cur.mode === 'learn' && picked !== null;
    var answered = cur.picks.filter(function (p) { return p !== null; }).length;

    var head =
      '<div class="lesson-nav">' +
        '<a class="btn btn-sm btn-ghost" href="' + cur.back + '">← ' + esc(cur.backLabel) + '</a>' +
        '<div class="crumb"><b style="color:var(--fg)">' + esc(cur.title) + '</b>' +
        (cur.sub ? ' · ' + esc(cur.sub) : '') + '</div>' +
      '</div>';

    var top =
      '<div class="quiz-top">' +
        '<span class="quiz-count">Вопрос ' + (i + 1) + ' из ' + cur.questions.length + '</span>' +
        UI.bar(answered * 100 / cur.questions.length) +
        (cur.timeLimit ? '<span class="timer' + (cur.left <= 60 ? ' low' : '') + '" id="q-timer">' + UI.fmtTime(Math.max(0, cur.left)) + '</span>' : '') +
      '</div>';

    var grid = '';
    if (cur.mode === 'exam') {
      grid = '<div class="qgrid">' + cur.questions.map(function (qq, j) {
        var c = 'qdot';
        if (j === i) c += ' on';
        if (cur.picks[j] !== null) c += ' right';
        if (cur.extraFrom && j >= cur.extraFrom) c += ' extra';
        return '<button class="' + c + '" data-go="' + j + '">' + (j + 1) + '</button>';
      }).join('') + '</div>';
    }

    var opts = cur.order[i].map(function (real, shown) {
      var c = 'opt';
      if (revealed) {
        if (real === q.correct) c += ' right';
        else if (real === picked) c += ' wrong';
      } else if (picked === real) c += ' picked';
      return '<button class="' + c + '" data-pick="' + shown + '"' + (picked !== null ? ' disabled' : '') + '>' +
        '<span class="opt-k">' + (shown + 1) + '</span><span>' + esc(q.answers[real]) + '</span></button>';
    }).join('');

    var verdict = '';
    if (revealed) {
      var right = picked === q.correct;
      verdict = '<div class="verdict ' + (right ? 'right' : 'wrong') + '">' +
        '<div class="verdict-t">' + (right ? 'Верно' : 'Неверно — правильный ответ №' + (cur.order[i].indexOf(q.correct) + 1)) + '</div>' +
        (q.tip ? '<div>' + esc(q.tip) + '</div>' : '') + '</div>';
    }

    var last = i === cur.questions.length - 1;
    var allDone = cur.picks.every(function (p) { return p !== null; });
    var foot;
    if (cur.mode === 'learn') {
      foot = '<div class="quiz-foot">' +
        '<button class="btn btn-primary" id="q-next"' + (picked === null ? ' disabled' : '') + '>' +
          (last ? 'Показать результат' : 'Дальше') + '</button>' +
        (i > 0 ? '<button class="btn btn-sm" data-go="' + (i - 1) + '">Назад</button>' : '') +
        '<span class="quiz-hint"><kbd>1</kbd>…<kbd>' + q.answers.length + '</kbd> — ответ, <kbd>Enter</kbd> — дальше</span>' +
      '</div>';
    } else {
      foot = '<div class="quiz-foot">' +
        '<button class="btn' + (allDone ? ' btn-primary' : '') + '" id="q-next">' +
          (allDone ? 'Завершить' : 'Завершить досрочно') + '</button>' +
        (i > 0 ? '<button class="btn btn-sm" data-go="' + (i - 1) + '">Назад</button>' : '') +
        (i < cur.questions.length - 1 ? '<button class="btn btn-sm" data-go="' + (i + 1) + '">Вперёд</button>' : '') +
        '<span class="quiz-hint"><kbd>1</kbd>…<kbd>' + q.answers.length + '</kbd> — ответ, <kbd>←</kbd><kbd>→</kbd> — листать</span>' +
      '</div>';
    }

    var card = '<div class="q-card">' +
      (q.img ? '<div class="q-img"><img src="img/' + esc(q.img) + '" alt=""></div>' : '') +
      '<div class="q-text">' + esc(q.text) + '</div>' +
      '<div class="opts">' + opts + '</div>' + verdict + '</div>';

    var host = document.getElementById('view');
    host.innerHTML = '<div class="wrap-narrow">' + head + top + grid + card + foot + '</div>';

    host.querySelectorAll('[data-pick]').forEach(function (b) {
      b.onclick = function () { pick(+b.dataset.pick); };
    });
    host.querySelectorAll('[data-go]').forEach(function (b) {
      b.onclick = function () { go(+b.dataset.go); };
    });
    var nb = document.getElementById('q-next');
    if (nb) nb.onclick = function () {
      if (cur.mode === 'learn') { if (last) finish('done'); else go(i + 1); }
      else finish('done');
    };
    window.scrollTo(0, 0);
  }

  window.Quiz = { start: start, stop: stop, finish: finish, addQuestions: addQuestions, active: function () { return cur; } };
})();
