/* Быстрый поиск по всему: знаки, разметка, термины, пункты ПДД, темы, уроки.
   Открывается по Ctrl+K / ⌘K или по кнопке в боковом меню. */
(function () {
  'use strict';

  var esc = UI.esc;
  var index = null, box = null, sel = 0, hits = [];

  function build() {
    if (index) return index;
    index = [];

    window.DB.signs.forEach(function (s) {
      index.push({
        kind: 'знак', ico: 'sign', img: s.img,
        title: s.num + ' · ' + (s.title || ''),
        sub: (s.desc || '').slice(0, 110),
        key: UI.norm(s.num + ' ' + (s.title || '') + ' ' + (s.desc || '')),
        go: function () { location.hash = '#/signs'; setTimeout(function () {
          var i = document.getElementById('s-q');
          if (i) { i.value = s.num; i.dispatchEvent(new Event('input')); }
        }, 60); }
      });
    });

    window.DB.markup.forEach(function (m) {
      index.push({
        kind: 'разметка', ico: '〰️',
        title: 'Разметка ' + m.num,
        sub: (m.desc || '').slice(0, 110),
        key: UI.norm(m.num + ' разметка ' + (m.desc || '')),
        go: function () { location.hash = '#/markup'; }
      });
    });

    window.DB.terms.forEach(function (t) {
      index.push({
        kind: 'термин', ico: '🔤',
        title: t.term,
        sub: t.def.slice(0, 120),
        key: UI.norm(t.term + ' ' + t.def),
        go: function () { location.hash = '#/terms'; setTimeout(function () {
          var i = document.getElementById('t-q');
          if (i) { i.value = t.term; i.dispatchEvent(new Event('input')); }
        }, 60); }
      });
    });

    window.DB.rules.forEach(function (sec) {
      sec.items.forEach(function (it) {
        if (!it.num) return;
        index.push({
          kind: 'пункт ПДД', ico: '📖',
          title: 'п. ' + it.num + ' — ' + sec.title,
          sub: it.text.slice(0, 130),
          key: UI.norm(it.num + ' ' + sec.title + ' ' + it.text),
          go: function () { location.hash = '#/rules'; setTimeout(function () {
            var i = document.getElementById('r-q');
            if (i) { i.value = it.num; i.dispatchEvent(new Event('input')); }
          }, 60); }
        });
      });
    });

    window.DB.plan.forEach(function (p, n) {
      index.push({
        kind: 'модуль', ico: p.icon,
        title: (n + 1) + '. ' + p.title,
        sub: p.sub,
        key: UI.norm(p.title + ' ' + p.sub + ' ' + p.topics.join(' ')),
        go: function () { location.hash = '#/module/' + p.id; }
      });
    });

    (window.COURSE || []).forEach(function (m) {
      (m.lessons || []).forEach(function (l) {
        index.push({
          kind: 'урок', ico: '📄',
          title: l.title,
          sub: (m.title || '') + ' · ' + (l.keyPoints && l.keyPoints[0] ? l.keyPoints[0] : ''),
          key: UI.norm(l.title + ' ' + (l.keyPoints || []).join(' ')),
          go: function () { location.hash = '#/lesson/' + l.id; }
        });
      });
    });

    window.DB.topics.forEach(function (t) {
      index.push({
        kind: 'тренировка', ico: '🎯',
        title: t.name,
        sub: t.qids.length + ' вопросов по этой теме',
        key: UI.norm('тренировка ' + t.name),
        go: function () { location.hash = '#/topicq/' + encodeURIComponent(t.name); }
      });
    });

    return index;
  }

  function search(q) {
    q = UI.norm(q).trim();
    if (!q) return [];
    var words = q.split(/\s+/);
    var out = [];
    build().forEach(function (it) {
      var score = 0, ok = true;
      words.forEach(function (w) {
        var pos = it.key.indexOf(w);
        if (pos < 0) { ok = false; return; }
        score += pos < 30 ? 10 : pos < 120 ? 4 : 1;
        if (UI.norm(it.title).indexOf(w) >= 0) score += 15;
      });
      if (ok) out.push({ it: it, score: score });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, 24).map(function (x) { return x.it; });
  }

  function draw(q) {
    hits = search(q);
    sel = 0;
    var list = box.querySelector('#sr-list');
    if (!q.trim()) {
      list.innerHTML = '<div class="sr-tip">Ищи что угодно: название знака, номер пункта ПДД, термин, тему для тренировки.<br>' +
        '<span style="color:var(--fg-3)">Например: «главная дорога», «13.9», «обгон», «прилегающая территория»</span></div>';
      return;
    }
    if (!hits.length) {
      list.innerHTML = '<div class="sr-tip">Ничего не нашлось по запросу «' + esc(q) + '».</div>';
      return;
    }
    list.innerHTML = hits.map(function (h, i) {
      return '<button class="sr-item' + (i === 0 ? ' on' : '') + '" data-i="' + i + '">' +
        (h.ico === 'sign' && h.img
          ? '<img class="sr-img" src="img/' + esc(h.img) + '" alt="">'
          : '<span class="sr-ico">' + h.ico + '</span>') +
        '<span class="sr-body"><span class="sr-t">' + esc(h.title) + '</span>' +
        '<span class="sr-s">' + esc(h.sub) + '</span></span>' +
        '<span class="sr-kind">' + esc(h.kind) + '</span></button>';
    }).join('');
    list.querySelectorAll('[data-i]').forEach(function (b) {
      b.onclick = function () { pick(+b.dataset.i); };
    });
  }

  function move(d) {
    if (!hits.length) return;
    sel = (sel + d + hits.length) % hits.length;
    var items = box.querySelectorAll('.sr-item');
    items.forEach(function (x, i) { x.classList.toggle('on', i === sel); });
    if (items[sel]) items[sel].scrollIntoView({ block: 'nearest' });
  }

  function pick(i) {
    var h = hits[i];
    close();
    if (h) h.go();
  }

  function open() {
    if (box) return;
    box = document.createElement('div');
    box.className = 'modal-bg sr-bg';
    box.innerHTML = '<div class="sr">' +
      '<input class="sr-input" id="sr-q" placeholder="Найти знак, пункт правил, термин…" autocomplete="off">' +
      '<div id="sr-list" class="sr-list"></div>' +
      '<div class="sr-foot"><kbd>↑</kbd><kbd>↓</kbd> выбрать · <kbd>Enter</kbd> открыть · <kbd>Esc</kbd> закрыть</div>' +
    '</div>';
    document.body.appendChild(box);
    var inp = box.querySelector('#sr-q');
    inp.oninput = function () { draw(inp.value); };
    inp.onkeydown = function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); pick(sel); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
    };
    box.onclick = function (e) { if (e.target === box) close(); };
    draw('');
    inp.focus();
  }

  function close() {
    if (box) { box.remove(); box = null; hits = []; }
  }

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K' || e.key === 'л' || e.key === 'Л')) {
      e.preventDefault();
      box ? close() : open();
    }
  });

  window.Search = { open: open, close: close, reset: function () { index = null; } };
})();
