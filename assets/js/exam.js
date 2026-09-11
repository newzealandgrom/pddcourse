/* Экзамен по правилам ГИБДД:
   20 вопросов из 4 тематических блоков по 5, 20 минут.
   1 ошибка  → +5 вопросов из того же блока и +5 минут;
   2 ошибки в разных блоках → +10 вопросов (по 5 из каждого) и +10 минут;
   3 ошибки, 2 ошибки в одном блоке, ошибка в дополнительных вопросах
   или истёкшее время — экзамен не сдан. */
(function () {
  'use strict';

  var esc = UI.esc, H = null;

  function blockOf(i) { return Math.floor(i / 5); }

  function pickTicket() {
    var t = window.DB.tickets[Math.floor(Math.random() * window.DB.tickets.length)];
    return { n: t.n, qs: t.qids.map(function (id) { return H.qById(id); }).filter(Boolean) };
  }

  /* Вопросы того же тематического блока из других билетов */
  function extraForBlock(block, excludeSrc, n) {
    var lo = block * 5 + 1, hi = block * 5 + 5;
    var pool = window.DB.questions.filter(function (q) {
      return q.nInTicket >= lo && q.nInTicket <= hi && !excludeSrc[q.srcId];
    });
    var seen = {}, uniq = [];
    UI.shuffle(pool, Date.now() % 65521).forEach(function (q) {
      if (!seen[q.srcId]) { seen[q.srcId] = 1; uniq.push(q); }
    });
    return uniq.slice(0, n);
  }

  var V = {};

  V.intro = function () {
    var exams = Store.exams();
    var passed = exams.filter(function (e) { return e.passed; }).length;
    var history = exams.slice(0, 8).map(function (e) {
      var d = new Date(e.ts);
      return '<div class="topic-row">' +
        '<span class="topic-n">' + String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') +
          ' · билет ' + e.ticket + (e.extra ? ' · +' + e.extra + ' доп.' : '') + '</span>' +
        '<span class="topic-pct" style="color:' + (e.passed ? 'var(--go)' : 'var(--stop)') + '">' +
          (e.passed ? 'сдан' : 'не сдан') + '</span>' +
        '<span class="topic-pct">' + e.correct + '/' + e.total + '</span></div>';
    }).join('');

    return '<div class="wrap-narrow">' +
      '<div class="page-head"><h1>Экзамен как в ГИБДД</h1>' +
        '<p>Всё по действующему регламенту: случайный билет, четыре тематических блока, обратный отсчёт. Никаких подсказок до конца — разбор будет только после.</p></div>' +

      '<div class="hero" style="padding:26px 26px 34px">' +
        '<div style="font-size:15.5px;color:var(--fg-2);margin-bottom:18px">' +
          'Билет — 20 вопросов из четырёх тематических блоков по пять. На всё 20 минут.</div>' +
        '<div class="tbl-wrap" style="margin:0">' +
          '<table><thead><tr><th>Что произошло</th><th>Что дальше</th></tr></thead><tbody>' +
            '<tr><td>Ни одной ошибки</td><td style="color:var(--go)">Экзамен сдан</td></tr>' +
            '<tr><td>Одна ошибка</td><td>+5 вопросов из того же блока и +5 минут</td></tr>' +
            '<tr><td>Две ошибки в разных блоках</td><td>+10 вопросов и +10 минут</td></tr>' +
            '<tr><td>Две ошибки в одном блоке</td><td style="color:var(--stop)">Экзамен не сдан</td></tr>' +
            '<tr><td>Три ошибки</td><td style="color:var(--stop)">Экзамен не сдан</td></tr>' +
            '<tr><td>Ошибка в дополнительном вопросе</td><td style="color:var(--stop)">Экзамен не сдан</td></tr>' +
            '<tr><td>Кончилось время</td><td style="color:var(--stop)">Экзамен не сдан</td></tr>' +
          '</tbody></table>' +
        '</div>' +
        '<div class="hero-cta" style="margin-top:24px"><button class="btn btn-primary btn-lg" id="ex-go">Начать экзамен</button></div>' +
      '</div>' +

      (exams.length
        ? '<h2 style="margin:36px 0 10px;font-size:19px">Попытки</h2>' +
          '<p style="color:var(--fg-3);font-size:14px;margin-bottom:14px">Сдано ' + passed + ' из ' + exams.length + '.</p>' + history
        : '') +
    '</div>';
  };

  V.introBind = function () {
    var b = document.getElementById('ex-go');
    if (b) b.onclick = function () { run(); };
  };

  function run() {
    var t = pickTicket();
    if (t.qs.length < 20) { location.hash = '#/train'; return; }

    var state = {
      ticket: t.n,
      errors: [],          // {block, index}
      byBlock: [0, 0, 0, 0],
      stage: 'main',       // main | extra
      extraBlocks: [],
      extraCount: 0,
      used: {}
    };
    t.qs.forEach(function (q) { state.used[q.srcId] = 1; });

    Quiz.start({
      title: 'Экзамен', sub: 'билет ' + t.n,
      questions: t.qs,
      mode: 'exam',
      timeLimit: 20 * 60,
      back: '#/exam', backLabel: 'Прервать',
      onAnswer: function (i, correct) {
        if (correct) return;
        if (state.stage === 'extra') {          // в дополнительных ошибаться нельзя
          setTimeout(function () { Quiz.finish('extra-error'); }, 400);
          return 'stop';
        }
        var b = blockOf(i);
        state.errors.push({ block: b, index: i });
        state.byBlock[b]++;
        if (state.errors.length >= 3 || state.byBlock[b] >= 2) {
          setTimeout(function () { Quiz.finish(state.byBlock[b] >= 2 ? 'two-in-block' : 'three-errors'); }, 400);
          return 'stop';
        }
      },
      onFinish: function (res) { onFinish(res, state); }
    });
  }

  function onFinish(res, state) {
    /* Основная часть пройдена без фатальных ошибок — выдаём дополнительные вопросы */
    if (state.stage === 'main' && res.reason === 'done' && state.errors.length > 0 && state.errors.length <= 2) {
      var blocks = state.errors.map(function (e) { return e.block; });
      var uniq = blocks.filter(function (b, i) { return blocks.indexOf(b) === i; });
      var extra = [];
      uniq.forEach(function (b) {
        extra = extra.concat(extraForBlock(b, state.used, 5));
      });
      if (extra.length) {
        state.stage = 'extra';
        state.extraBlocks = uniq;
        state.extraCount = extra.length;
        var mins = uniq.length * 5;
        showExtraNotice(uniq.length, mins, function () {
          Quiz.start({
            title: 'Дополнительные вопросы', sub: mins + ' минут, ошибаться нельзя',
            questions: extra, mode: 'exam',
            timeLimit: mins * 60,
            back: '#/exam', backLabel: 'Прервать',
            onAnswer: function (i, correct) {
              if (!correct) {
                setTimeout(function () { Quiz.finish('extra-error'); }, 400);
                return 'stop';
              }
            },
            onFinish: function (r2) {
              var merged = {
                total: res.total + r2.total,
                correct: res.correct + r2.correct,
                picks: res.picks.concat(r2.picks),
                questions: res.questions.concat(r2.questions),
                reason: r2.reason,
                extraFrom: res.total
              };
              verdict(merged, state);
            }
          });
        });
        return;
      }
    }
    verdict(res, state);
  }

  function showExtraNotice(nBlocks, mins, go) {
    document.getElementById('view').innerHTML =
      '<div class="wrap-narrow"><div class="result">' +
        '<div style="font-size:44px;margin-bottom:18px">⏱️</div>' +
        '<h2>' + (nBlocks === 1 ? 'Одна ошибка' : 'Две ошибки в разных блоках') + '</h2>' +
        '<p>Экзамен продолжается: ' + (nBlocks * 5) + ' дополнительных ' +
          UI.plural(nBlocks * 5, 'вопрос', 'вопроса', 'вопросов') + ' и ' + mins + ' ' +
          UI.plural(mins, 'минута', 'минуты', 'минут') + '. В них ошибаться уже нельзя.</p>' +
        '<div class="result-cta"><button class="btn btn-primary btn-lg" id="ex-cont">Продолжить</button></div>' +
      '</div></div>';
    document.getElementById('ex-cont').onclick = go;
    window.scrollTo(0, 0);
  }

  function verdict(res, state) {
    var failReason = {
      'three-errors': 'Три ошибки — по регламенту экзамен прекращается.',
      'two-in-block': 'Две ошибки в одном тематическом блоке — это несдача, даже если остальное решено верно.',
      'extra-error': 'Ошибка в дополнительном вопросе. В них права на ошибку нет.',
      'time': 'Время вышло. На экзамене таймер не останавливают.'
    }[res.reason];

    /* Досрочное завершение с неотвеченными вопросами — тоже несдача */
    var unanswered = res.picks.filter(function (p) { return p === null; }).length;
    if (!failReason && unanswered) failReason = 'Остались неотвеченные вопросы — ' + unanswered + '.';

    /* Фатальные ошибки уже отсечены выше по reason: три ошибки, две в одном блоке,
       ошибка в дополнительных, истёкшее время. Значит одна-две ошибки в разных блоках,
       закрытые дополнительными вопросами, — это сдача. */
    var passed = !failReason;

    Store.saveExam({
      ticket: state.ticket, passed: passed,
      correct: res.correct, total: res.total,
      extra: state.extraCount || 0, reason: res.reason
    });

    var pct = Math.round(res.correct * 100 / res.total);
    H.showResult({
      pct: pct, passed: passed, res: res,
      title: passed ? 'Экзамен сдан' : 'Экзамен не сдан',
      text: passed
        ? (state.extraCount
            ? 'Сдано: ' + (state.errors.length === 1 ? 'одна ошибка закрыта' : 'две ошибки закрыты') +
              ' дополнительными вопросами. По регламенту это зачёт, но на реальном экзамене запас лучше иметь побольше.'
            : 'Чисто, без единой ошибки. Именно так это и выглядит в ГИБДД — повтори ещё на нескольких билетах, и можно идти сдавать.')
        : esc(failReason) + ' Ничего страшного: разбери ошибки ниже и попробуй снова.',
      actions: [
        { href: '#/exam', label: 'Ещё попытка', primary: true },
        { href: '#/mistakes', label: 'Работа над ошибками' },
        { href: '#/train', label: 'К тренировкам' }
      ]
    });
  }

  window.Exam = V;
  window.Exam._init = function (helpers) { H = helpers; };
})();
