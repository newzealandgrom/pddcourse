/* Справочники: знаки, разметка, текст ПДД, термины, штрафы. И статистика. */
(function () {
  'use strict';

  var esc = UI.esc;
  var R = {}, H = null;

  /* ─────────── Знаки ─────────── */

  var signFilter = { group: 'Все', q: '' };

  var SHORT = {
    'Предупреждающие знаки': 'Предупреждающие',
    'Знаки приоритета': 'Приоритета',
    'Запрещающие знаки': 'Запрещающие',
    'Предписывающие знаки': 'Предписывающие',
    'Знаки особых предписаний': 'Особых предписаний',
    'Информационные знаки': 'Информационные',
    'Знаки сервиса': 'Сервиса',
    'Знаки дополнительной информации (таблички)': 'Таблички'
  };

  R.signs = function () {
    var groups = ['Все'].concat(window.DB.signs.map(function (s) { return s.group; })
      .filter(function (g, i, a) { return a.indexOf(g) === i; }));

    return '<div class="wrap">' +
      '<div class="page-head"><h1>Дорожные знаки</h1>' +
        '<p>Все 310 знаков из приложения 1 к ПДД. Нажми на знак — откроется полное описание: где ставится, что требует и что бывает за нарушение.</p></div>' +
      '<div class="toolbar">' +
        '<input class="search" id="s-q" placeholder="Найти знак: «главная дорога», «обгон», 3.24…" value="' + esc(signFilter.q) + '">' +
      '</div>' +
      '<div class="tabs" style="margin-bottom:24px">' + groups.map(function (g) {
        return '<button class="tab' + (g === signFilter.group ? ' on' : '') + '" data-g="' + esc(g) + '">' +
          esc(SHORT[g] || g) + '</button>';
      }).join('') + '</div>' +
      '<div id="s-list"></div></div>';
  };

  R.signsBind = function (host) {
    function draw() {
      var q = UI.norm(signFilter.q).trim();
      var list = window.DB.signs.filter(function (s) {
        if (signFilter.group !== 'Все' && s.group !== signFilter.group) return false;
        if (!q) return true;
        return UI.norm(s.title).indexOf(q) >= 0 ||
               s.num.indexOf(q) >= 0 ||
               UI.norm(s.desc).indexOf(q) >= 0;
      });
      var byGroup = {};
      list.forEach(function (s) { (byGroup[s.group] = byGroup[s.group] || []).push(s); });
      var html = Object.keys(byGroup).map(function (g) {
        return '<div class="group-h">' + esc(g) + ' <span style="color:var(--fg-3);font-weight:400;font-size:13px">' +
          byGroup[g].length + '</span></div><div class="sign-grid">' +
          byGroup[g].map(function (s) {
            return '<button class="sign-card" data-sign="' + esc(s.num) + '">' +
              (s.img ? '<img src="img/' + esc(s.img) + '" alt="" loading="lazy">' : '<div style="height:72px"></div>') +
              '<div class="n">' + esc(s.num) + '</div><div class="t">' + esc(s.title || '') + '</div></button>';
          }).join('') + '</div>';
      }).join('');
      document.getElementById('s-list').innerHTML = html ||
        '<div class="empty"><h3>Ничего не нашлось</h3><p>Попробуй другое слово или номер знака.</p></div>';
      document.querySelectorAll('[data-sign]').forEach(function (b) {
        b.onclick = function () { showSign(b.dataset.sign); };
      });
    }
    var inp = document.getElementById('s-q');
    inp.oninput = function () { signFilter.q = inp.value; draw(); };
    host.querySelectorAll('[data-g]').forEach(function (b) {
      b.onclick = function () {
        signFilter.group = b.dataset.g;
        host.querySelectorAll('[data-g]').forEach(function (x) { x.classList.toggle('on', x === b); });
        draw();
      };
    });
    draw();
  };

  function showSign(num) {
    var s = UI.signBy(num);
    if (!s) return;
    var bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = '<div class="modal">' +
      '<button class="modal-x">✕</button>' +
      (s.img ? '<img src="img/' + esc(s.img) + '" alt="">' : '') +
      '<div class="eyebrow" style="color:var(--paint);margin-bottom:4px">' + esc(s.num) + '</div>' +
      '<h3>' + esc(s.title || '') + '</h3>' +
      '<div class="chip" style="margin:12px 0 16px">' + esc(s.group) + '</div>' +
      '<div class="desc">' + esc(s.desc || 'Описание не приводится.') + '</div></div>';
    document.body.appendChild(bg);
    function close() { bg.remove(); document.removeEventListener('keydown', onEsc); }
    function onEsc(e) { if (e.key === 'Escape') close(); }
    bg.onclick = function (e) { if (e.target === bg) close(); };
    bg.querySelector('.modal-x').onclick = close;
    document.addEventListener('keydown', onEsc);
  }

  /* ─────────── Разметка ─────────── */

  R.markup = function () {
    var byGroup = {};
    window.DB.markup.forEach(function (m) { (byGroup[m.group] = byGroup[m.group] || []).push(m); });
    return '<div class="wrap">' +
      '<div class="page-head"><h1>Дорожная разметка</h1>' +
        '<p>Линии, стрелки и надписи на асфальте — такие же требования, как знаки. Сплошную пересекать нельзя, прерывистую можно, и это только начало.</p></div>' +
      Object.keys(byGroup).map(function (g) {
        return '<div class="group-h">' + esc(g) + '</div>' +
          byGroup[g].map(function (m) {
            return '<div class="review-item" style="display:flex;gap:18px;align-items:flex-start">' +
              (m.img ? '<img src="img/' + esc(m.img) + '" alt="" style="width:92px;flex:none;background:#fff;border-radius:8px;padding:6px" loading="lazy">' : '') +
              '<div><div class="review-q" style="color:var(--paint)">' + esc(m.num) + '</div>' +
              '<div class="review-a">' + esc(m.desc) + '</div></div></div>';
          }).join('');
      }).join('') + '</div>';
  };

  /* ─────────── Текст ПДД ─────────── */

  var rulesQ = '';

  R.rules = function () {
    return '<div class="wrap">' +
      '<div class="page-head"><h1>Текст правил</h1>' +
        '<p>Официальные ПДД целиком: 26 разделов, разметка, допуск к эксплуатации и перечень неисправностей. Пригодится, когда нужна точная формулировка.</p></div>' +
      '<div class="toolbar"><input class="search" id="r-q" placeholder="Поиск по тексту правил: «обгон», «12.4», «уступить»…" value="' + esc(rulesQ) + '"></div>' +
      '<div id="r-list"></div></div>';
  };

  R.rulesBind = function () {
    function draw() {
      var q = UI.norm(rulesQ).trim();
      var html = window.DB.rules.map(function (sec) {
        var items = sec.items.filter(function (it) {
          return !q || UI.norm(it.text).indexOf(q) >= 0 || (it.num || '').indexOf(q) >= 0;
        });
        if (!items.length) return '';
        return '<div class="rules-sec"><h2>' + esc(sec.fullTitle) + '</h2>' +
          items.map(function (it) {
            var t = esc(it.text);
            if (q) {
              try {
                t = t.replace(new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
              } catch (e) {}
            }
            return '<div class="rule-item"><div class="rule-n">' + esc(it.num || '') + '</div>' +
              '<div class="rule-t">' + t + '</div></div>';
          }).join('') + '</div>';
      }).join('');
      document.getElementById('r-list').innerHTML = html ||
        '<div class="empty"><h3>Ничего не нашлось</h3></div>';
    }
    var inp = document.getElementById('r-q');
    var t = null;
    inp.oninput = function () {
      rulesQ = inp.value;
      clearTimeout(t);
      t = setTimeout(draw, 180);
    };
    draw();
  };

  /* ─────────── Термины ─────────── */

  R.terms = function () {
    return '<div class="wrap">' +
      '<div class="page-head"><h1>Словарь ПДД</h1>' +
        '<p>64 термина из пункта 1.2 — именно этими словами написаны все вопросы билетов. Половина ошибок на экзамене происходит из-за того, что человек не отличает «остановку» от «стоянки», а «уступить» от «пропустить».</p></div>' +
      '<div class="toolbar"><input class="search" id="t-q" placeholder="Найти термин…"></div>' +
      '<div id="t-list"></div></div>';
  };

  R.termsBind = function () {
    function draw(q) {
      q = UI.norm(q).trim();
      var list = window.DB.terms.filter(function (t) {
        return !q || UI.norm(t.term).indexOf(q) >= 0 || UI.norm(t.def).indexOf(q) >= 0;
      });
      document.getElementById('t-list').innerHTML = list.map(function (t) {
        return '<div class="term"><div class="term-n">' + esc(t.term) + '</div>' +
          '<div class="term-d">' + esc(t.def) + '</div></div>';
      }).join('') || '<div class="empty"><h3>Ничего не нашлось</h3></div>';
    }
    var inp = document.getElementById('t-q');
    inp.oninput = function () { draw(inp.value); };
    draw('');
  };

  /* ─────────── Штрафы ─────────── */

  var penGroup = 'Все';

  R.penalties = function () {
    var groups = ['Все'].concat(window.DB.penalties.map(function (p) { return p.group; })
      .filter(function (g, i, a) { return g && a.indexOf(g) === i; }));
    var upd = window.DB.penaltiesUpdated;
    return '<div class="wrap">' +
      '<div class="page-head"><h1>Штрафы</h1>' +
        '<p>Статьи главы 12 КоАП и связанные статьи Уголовного кодекса — то, чем заканчиваются нарушения на практике.' +
        (upd ? ' Суммы приведены на ' + esc(upd) + '.' : '') + '</p></div>' +
      '<div class="toolbar"><input class="search" id="p-q" placeholder="Найти: «опьянение», «ремень», «12.9»…"></div>' +
      (groups.length > 1
        ? '<div class="tabs" style="margin-bottom:22px">' + groups.map(function (g) {
            return '<button class="tab' + (g === penGroup ? ' on' : '') + '" data-pg="' + esc(g) + '">' + esc(g) + '</button>';
          }).join('') + '</div>'
        : '') +
      '<div style="border:1px solid var(--line-soft);border-radius:16px;overflow:hidden" id="p-list"></div></div>';
  };

  R.penaltiesBind = function (host) {
    function draw(q) {
      q = UI.norm(q).trim();
      var list = window.DB.penalties.filter(function (p) {
        if (penGroup !== 'Все' && p.group !== penGroup) return false;
        return !q || UI.norm(p.text).indexOf(q) >= 0 ||
          UI.norm(p.article_part).indexOf(q) >= 0 ||
          UI.norm(p.penalty).indexOf(q) >= 0;
      });
      document.getElementById('p-list').innerHTML = list.map(function (p) {
        return '<div class="pen-row">' +
          '<div class="pen-art">' + esc(p.article_part || '') + '</div>' +
          '<div>' + esc(p.text || '') + '</div>' +
          '<div class="pen-p">' + esc(p.penalty || '') + '</div></div>';
      }).join('') || '<div class="empty"><h3>Ничего не нашлось</h3></div>';
    }
    var inp = document.getElementById('p-q');
    inp.oninput = function () { draw(inp.value); };
    host.querySelectorAll('[data-pg]').forEach(function (b) {
      b.onclick = function () {
        penGroup = b.dataset.pg;
        host.querySelectorAll('[data-pg]').forEach(function (x) { x.classList.toggle('on', x === b); });
        draw(inp.value);
      };
    });
    draw('');
  };


  /* ─────────── Перед экзаменом ─────────── */

  R.before = function () {
    var g = window.DB.guide || [];
    return '<div class="wrap">' +
      '<div class="page-head"><h1>Перед экзаменом</h1>' +
        '<p>Всё, что стоит знать до того, как идти в ГИБДД: как устроены оба экзамена, за что снимают баллы на вождении, что делать с волнением и что изменилось в правилах. Актуально на сентябрь 2026 года.</p></div>' +
      '<div class="guide-grid">' + g.map(function (s) {
        return '<a class="guide-card" href="#/before/' + esc(s.id) + '">' +
          '<div class="guide-ico">' + s.icon + '</div>' +
          '<div class="guide-t">' + esc(s.title) + '</div>' +
          '<div class="guide-s">' + esc(s.sub) + '</div></a>';
      }).join('') + '</div></div>';
  };

  R.beforeOne = function (id) {
    var g = window.DB.guide || [];
    var i = -1;
    g.forEach(function (s, n) { if (s.id === id) i = n; });
    if (i < 0) return H.notFound();
    var s = g[i], prev = i > 0 ? g[i - 1] : null, next = i < g.length - 1 ? g[i + 1] : null;
    return '<div class="wrap-narrow">' +
      '<div class="lesson-nav"><a class="btn btn-sm btn-ghost" href="#/before">← Перед экзаменом</a>' +
        '<span class="crumb">' + (i + 1) + ' из ' + g.length + '</span></div>' +
      '<div style="font-size:34px;margin-bottom:10px">' + s.icon + '</div>' +
      '<h1 style="margin-bottom:8px">' + esc(s.title) + '</h1>' +
      '<div class="eyebrow" style="margin-bottom:28px">' + esc(s.sub) + '</div>' +
      '<div class="lesson-body">' + UI.blocks(s.blocks) + '</div>' +
      '<div class="lesson-foot">' +
        (next ? '<a class="btn btn-primary" href="#/before/' + next.id + '">' + esc(next.title) + ' →</a>' : '') +
        (prev ? '<a class="btn btn-sm btn-ghost" href="#/before/' + prev.id + '">← ' + esc(prev.title) + '</a>' : '') +
      '</div></div>';
  };

  /* ─────────── Статистика ─────────── */

  function lastSeen() {
    var days = Store.all().days;
    if (!days || !days.length) return '';
    var d = days[days.length - 1].split('-');
    var today = new Date();
    var t = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    if (days[days.length - 1] === t) return 'сегодня';
    var M = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
    return +d[2] + ' ' + M[+d[1] - 1];
  }

  R.stats = function () {
    var acc = Store.accuracy();
    var answered = Store.answeredCount();
    var mistakes = Store.mistakes();
    var exams = Store.exams();
    var passedExams = exams.filter(function (e) { return e.passed; }).length;
    var pct = H.overall();

    var topics = window.DB.topics.map(function (t) {
      return { t: t, s: H.topicStat(t) };
    }).sort(function (a, b) {
      if (!a.s.seen) return 1;
      if (!b.s.seen) return -1;
      return a.s.pct - b.s.pct;
    });

    var rows = topics.map(function (x) {
      var color = !x.s.seen ? 'var(--fg-3)' : x.s.pct >= 90 ? 'var(--go)' : x.s.pct >= 70 ? 'var(--paint)' : 'var(--stop)';
      return '<div class="topic-row">' +
        '<span class="topic-n">' + esc(x.t.name) + '</span>' +
        '<span class="topic-pct" style="color:var(--fg-3);flex:0 0 88px">' + x.s.seen + '/' + x.s.total + '</span>' +
        '<span class="topic-bar">' + UI.bar(x.s.pct, x.s.pct >= 85 ? 'go' : '') + '</span>' +
        '<span class="topic-pct" style="color:' + color + '">' + (x.s.seen ? x.s.pct + '%' : '—') + '</span></div>';
    }).join('');

    var weak = topics.filter(function (x) { return x.s.seen >= 3 && x.s.pct < 80; }).slice(0, 3);

    var mods = H.plan().map(function (p) {
      var mp = H.moduleProgress(p.id);
      return '<div class="topic-row"><span class="topic-n">' + p.icon + ' ' + esc(p.title) + '</span>' +
        '<span class="topic-bar">' + UI.bar(mp, mp >= 100 ? 'go' : '') + '</span>' +
        '<span class="topic-pct">' + mp + '%</span></div>';
    }).join('');

    return '<div class="wrap">' +
      '<div class="page-head"><h1>Мой прогресс</h1>' +
        '<p>Слабые темы вверху списка — с них и стоит начинать повторение.</p></div>' +

      '<div class="stat-row">' +
        '<div class="stat accent"><div class="stat-n">' + pct + '%</div><div class="stat-l">курс пройден</div></div>' +
        '<div class="stat"><div class="stat-n">' + answered + '</div><div class="stat-l">вопросов повидала</div></div>' +
        '<div class="stat"><div class="stat-n">' + acc + '%</div><div class="stat-l">точность ответов</div></div>' +
        '<div class="stat"><div class="stat-n">' + passedExams + '<span style="color:var(--fg-3);font-size:17px">/' + exams.length + '</span></div><div class="stat-l">экзаменов сдано</div></div>' +
      '</div>' +

      (weak.length
        ? '<div class="note mistake" style="margin-bottom:30px"><div class="note-t">❌ Слабые места</div>' +
          '<div>' + weak.map(function (w) { return esc(w.t.name) + ' — ' + w.s.pct + '%'; }).join('; ') + '. ' +
          (mistakes.length ? 'В работе над ошибками ждёт ' + mistakes.length + ' ' +
            UI.plural(mistakes.length, 'вопрос', 'вопроса', 'вопросов') + '.' : '') + '</div></div>'
        : '') +

      '<h2 style="margin:0 0 14px;font-size:19px">Темы</h2>' +
      '<div style="margin-bottom:38px">' + rows + '</div>' +

      '<h2 style="margin:0 0 14px;font-size:19px">Модули курса</h2>' +
      '<div style="margin-bottom:38px">' + mods + '</div>' +

      '<h2 style="margin:0 0 14px;font-size:19px">Сохранение прогресса</h2>' +
      (location.protocol === 'http:' && !/^(localhost|127\.|\[::1\])/.test(location.hostname)
        ? '<div class="note warn" style="margin:0 0 20px"><div class="note-t">⚠️ Открыт адрес без https</div>' +
          '<div>Для браузера <b>http://' + esc(location.host) + '</b> и <b>https://' + esc(location.host) + '</b> — два разных сайта, ' +
          'и прогресс у них хранится отдельно. Сохрани прогресс в файл кнопкой ниже, открой ' +
          '<a href="https://' + esc(location.host) + '/#/stats">https://' + esc(location.host) + '</a> и загрузи файл там — ' +
          'прогресс сложится, ничего не пропадёт. Дальше открывай курс только по https.</div></div>'
        : '') +
      (Store.storageWorks
        ? '<div class="note tip" style="margin:0 0 20px"><div class="note-t">✓ Всё сохраняется само</div>' +
          '<div>Каждый пройденный урок, тест и экзамен записываются сразу. Можно закрыть вкладку, выключить компьютер и вернуться — всё будет на месте. ' +
          'Только Safari (на iPhone и Mac) может стереть данные сайта, если не заходить сюда больше недели, — поэтому время от времени сохраняй прогресс в файл.' +
          (lastSeen() ? ' Последнее занятие: <b>' + esc(lastSeen()) + '</b>.' : '') + '</div></div>'
        : '<div class="note mistake" style="margin:0 0 20px"><div class="note-t">❌ Браузер запретил сохранение</div>' +
          '<div>Прогресс исчезнет, когда закроешь вкладку. Обычно это режим инкогнито или запрет на хранение данных сайтов — попробуй открыть файл в обычном окне браузера.</div></div>') +
      '<p style="color:var(--fg-3);font-size:14.5px;max-width:62ch;margin-bottom:16px">' +
        'Прогресс живёт внутри этого браузера на этом компьютере. Чтобы перенести его на другой компьютер или в другой браузер — сохрани файл здесь и загрузи его там. ' +
        'Загрузка не стирает то, что уже есть: прогресс из файла добавляется к текущему.</p>' +
      '<div class="hero-cta">' +
        '<button class="btn btn-sm" id="st-exp">Сохранить в файл</button>' +
        '<button class="btn btn-sm" id="st-imp">Загрузить из файла</button>' +
      '</div>' +

      '<h2 style="margin:38px 0 14px;font-size:19px">Начать заново</h2>' +
      '<p style="color:var(--fg-3);font-size:14.5px;max-width:62ch;margin-bottom:16px">' +
        'Сбросит вообще всё: пройденные уроки, результаты тестов, историю экзаменов и список вопросов на повторение. ' +
        'Отменить это будет нельзя, поэтому если хочешь подстраховаться — сначала сохрани прогресс в файл.</p>' +
      '<button class="btn btn-sm" id="st-reset" style="color:var(--stop);border-color:rgba(255,92,92,.35)">Сбросить весь прогресс</button>' +
      '<input type="file" id="st-file" accept=".json" hidden>' +
    '</div>';
  };

  R.statsBind = function () {
    document.getElementById('st-exp').onclick = function () {
      var blob = new Blob([Store.export()], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'пдд-прогресс.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    };
    var file = document.getElementById('st-file');
    document.getElementById('st-imp').onclick = function () { file.click(); };
    file.onchange = function () {
      var f = file.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        if (Store.import(r.result)) { alert('Готово: прогресс из файла добавлен.'); location.reload(); }
        else alert('Не получилось прочитать файл — похоже, это не файл прогресса или он повреждён.');
      };
      r.readAsText(f);
    };
    document.getElementById('st-reset').onclick = function () {
      if (!confirm('Весь прогресс будет удалён: пройденные уроки, результаты тестов и история экзаменов.\n\nОтменить это будет нельзя. Точно начать заново?')) return;
      Store.reset();
      location.hash = '#/';
      alert('Готово. Курс начат с чистого листа.');
    };
  };

  window.Ref = R;
  window.Ref._init = function (helpers) { H = helpers; };
})();
