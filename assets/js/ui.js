/* Хелперы разметки и рендер блоков урока. */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* Мягкая разметка внутри текста: **жирный**, *курсив* */
  function md(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  }

  function el(html) {
    var d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstElementChild;
  }

  /* mulberry32: целочисленная арифметика через Math.imul, без потери точности на больших сидах */
  function shuffle(arr, seed) {
    var a = arr.slice(), s = (seed == null ? Math.random() * 4294967296 : seed) >>> 0;
    function rnd() {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* Нормализация для поиска: регистр и ё→е (в ПДД пишут «перекресток») */
  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/\u0451/g, '\u0435'); }

  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  function bar(pct, cls) {
    return '<div class="bar ' + (cls || '') + '"><i style="width:' + Math.max(0, Math.min(100, pct)) + '%"></i></div>';
  }

  function ring(pct, color) {
    var r = 66, c = 2 * Math.PI * r;
    return '<svg width="152" height="152" viewBox="0 0 152 152">' +
      '<circle cx="76" cy="76" r="' + r + '" fill="none" stroke="#1E2735" stroke-width="10"/>' +
      '<circle cx="76" cy="76" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="10" stroke-linecap="round"' +
      ' stroke-dasharray="' + c + '" stroke-dashoffset="' + (c - c * pct / 100) + '"/></svg>';
  }

  /* ── Справочники по номерам ── */
  var signBy = {}, markBy = {}, penBy = {};
  function indexRefs() {
    (window.DB.signs || []).forEach(function (s) { if (!signBy[s.num]) signBy[s.num] = s; });
    (window.DB.markup || []).forEach(function (m) { if (!markBy[m.num]) markBy[m.num] = m; });
    (window.DB.penalties || []).forEach(function (p) { if (p.article_part) penBy[p.article_part] = p; });
  }

  function signStrip(nums, caption, kind) {
    var src = kind === 'markup' ? markBy : signBy;
    var cls = kind === 'markup' ? 'sign-mini mk' : 'sign-mini';
    var items = (nums || []).map(function (n) {
      var s = src[n];
      if (!s) return '';
      return '<div class="' + cls + '">' +
        (s.img ? '<img src="img/' + esc(s.img) + '" alt="' + esc(s.title || s.num) + '" loading="lazy">' : '') +
        '<div class="sign-mini-n">' + esc(s.num) + '</div>' +
        '<div class="sign-mini-t">' + esc(s.title || '') + '</div></div>';
    }).join('');
    if (!items) return '';
    return '<div class="sign-strip">' + items + '</div>' +
      (caption ? '<div class="strip-cap">' + esc(caption) + '</div>' : '');
  }

  /* ── Рендер одного блока урока ── */
  function block(b) {
    if (!b || !b.type) return '';
    switch (b.type) {
      case 'p':
        return '<p>' + md(b.text) + '</p>';
      case 'h':
        return '<h3>' + esc(b.text) + '</h3>';
      case 'list':
        var tag = b.ordered ? 'ol' : 'ul';
        return '<' + tag + '>' + (b.items || []).map(function (i) { return '<li>' + md(i) + '</li>'; }).join('') + '</' + tag + '>';
      case 'note':
        var v = ['key', 'warn', 'tip', 'mistake', 'law'].indexOf(b.variant) >= 0 ? b.variant : 'key';
        var ico = { key: '🔑', warn: '⚠️', tip: '💡', mistake: '❌', law: '📖' }[v];
        return '<div class="note ' + v + '">' +
          (b.title ? '<div class="note-t">' + ico + ' ' + esc(b.title) + '</div>' : '') +
          '<div>' + md(b.text) + '</div></div>';
      case 'table':
        return '<div class="tbl-wrap"><table>' +
          (b.head ? '<thead><tr>' + b.head.map(function (h) { return '<th>' + md(h) + '</th>'; }).join('') + '</tr></thead>' : '') +
          '<tbody>' + (b.rows || []).map(function (r) {
            return '<tr>' + r.map(function (c) { return '<td>' + md(c) + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table></div>';
      case 'rule':
        var ref = String(b.ref || ''), label;
        if (penBy[ref] || /\sч\.\s|УК РФ/.test(ref)) label = 'ст. ' + ref.replace(' УК РФ', '') + (/УК РФ/.test(ref) ? ' УК' : ' КоАП');
        else if (signBy[ref]) label = 'знак ' + ref;
        else if (markBy[ref]) label = 'разметка ' + ref;
        else if (/^\d/.test(ref)) label = 'п. ' + ref;
        else label = ref;
        return '<div class="rule-q"><span class="rule-ref">' + esc(label) + '</span>' + esc(b.text) + '</div>';
      case 'signs':
        return signStrip(b.nums, b.caption, 'signs');
      case 'markup':
        return signStrip(b.nums, b.caption, 'markup');
      case 'errors':
        return errorsTable();
      case 'steps':
        return '<div class="steps">' + (b.items || []).map(function (s) {
          return '<div class="step"><div class="step-n"></div><div><div class="step-t">' + esc(s.title) + '</div>' +
            '<div class="step-x">' + md(s.text) + '</div></div></div>';
        }).join('') + '</div>';
      default:
        return '';
    }
  }

  var POINT_STYLE = {
    7: { cls: 'stop',  label: 'Грубые ошибки — 7 баллов', hint: 'Любая из них заканчивает экзамен сразу' },
    4: { cls: 'warn',  label: 'Ошибки на 4 балла', hint: 'Две такие — и экзамен окончен' },
    3: { cls: 'warn',  label: 'Ошибки на 3 балла', hint: 'Три такие — и экзамен окончен' },
    2: { cls: 'key',   label: 'Ошибки на 2 балла', hint: 'Допустимо не больше трёх' },
    1: { cls: 'tip',   label: 'Мелкие ошибки — 1 балл', hint: 'Можно допустить до шести' }
  };

  function errorsTable() {
    var list = window.DB.practice || [];
    if (!list.length) return '';
    var by = {};
    list.forEach(function (e) { (by[e.points] = by[e.points] || []).push(e); });
    return Object.keys(by).sort(function (a, b) { return b - a; }).map(function (pt) {
      var st = POINT_STYLE[pt] || { cls: 'key', label: pt + ' балла', hint: '' };
      return '<div class="err-group err-' + st.cls + '">' +
        '<div class="err-head"><span class="err-pts">' + pt + '</span>' +
        '<span><b>' + esc(st.label) + '</b>' +
        (st.hint ? '<span class="err-hint">' + esc(st.hint) + '</span>' : '') + '</span></div>' +
        '<ul class="err-list">' + by[pt].map(function (e) {
          return '<li>' + esc(e.text) + (e.rules ? '<span class="err-ref">' + esc(e.rules) + '</span>' : '') + '</li>';
        }).join('') + '</ul></div>';
    }).join('');
  }

  function blocks(list) {
    return (list || []).map(block).join('');
  }

  function fmtTime(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  window.UI = {
    esc: esc, md: md, el: el, shuffle: shuffle, plural: plural, norm: norm,
    bar: bar, ring: ring, blocks: blocks, block: block,
    signStrip: signStrip, indexRefs: indexRefs, fmtTime: fmtTime,
    signBy: function (n) { return signBy[n]; },
    markBy: function (n) { return markBy[n]; }
  };
})();
