/* Навигация и роутер. Работает из file:// — без сервера и сборки. */
(function () {
  'use strict';

  var NAV = [
    { g: 'Учёба', items: [
      { h: '#/', ico: '🏠', t: 'Главная' },
      { h: '#/course', ico: '🗺️', t: 'Курс' },
      { h: '#/train', ico: '🎯', t: 'Тренировка' },
      { h: '#/exam', ico: '🏁', t: 'Экзамен' },
      { h: '#/before', ico: '💛', t: 'Перед экзаменом' }
    ]},
    { g: 'Справочник', items: [
      { h: '#/signs', ico: '🚸', t: 'Знаки' },
      { h: '#/markup', ico: '〰️', t: 'Разметка' },
      { h: '#/rules', ico: '📖', t: 'Текст ПДД' },
      { h: '#/terms', ico: '🔤', t: 'Словарь' },
      { h: '#/penalties', ico: '⚖️', t: 'Штрафы' }
    ]},
    { g: '', items: [
      { h: '#/stats', ico: '📊', t: 'Мой прогресс' }
    ]}
  ];

  var MNAV = [
    { h: '#/', ico: '🏠', t: 'Главная' },
    { h: '#/course', ico: '🗺️', t: 'Курс' },
    { h: '#/train', ico: '🎯', t: 'Тренировка' },
    { h: '#/before', ico: '💛', t: 'Экзамен' },
    { h: '#/signs', ico: '🚸', t: 'Знаки' },
    { h: '#/stats', ico: '📊', t: 'Прогресс' }
  ];

  function drawNav() {
    var H = Views._helpers;
    var pct = H.overall();
    var mist = Store.mistakes().length;

    document.getElementById('nav').innerHTML =
      '<a class="brand" href="#/" style="text-decoration:none">' +
        '<span class="brand-mark">П</span>' +
        '<span><span class="brand-name">Полоса</span>' +
        '<span class="brand-sub">ПДД · категория B</span></span></a>' +
      '<div class="nav-progress">' +
        '<div class="nav-progress-top"><span>Курс</span><b>' + pct + '%</b></div>' + UI.bar(pct) +
      '</div>' +
      '<button class="nav-search" id="nav-search"><span>🔍</span>Поиск<kbd>' +
        (navigator.platform.indexOf('Mac') >= 0 ? '⌘K' : 'Ctrl K') + '</kbd></button>' +
      NAV.map(function (g) {
        return '<div class="nav-group">' + (g.g ? '<div class="nav-label">' + g.g + '</div>' : '') +
          g.items.map(function (i) {
            var badge = i.h === '#/train' && mist ? '<span class="nav-badge hot">' + mist + '</span>' : '';
            return '<a class="nav-item" href="' + i.h + '" data-nav="' + i.h + '">' +
              '<span class="nav-ico">' + i.ico + '</span>' + i.t + badge + '</a>';
          }).join('') + '</div>';
      }).join('');

    var ns = document.getElementById('nav-search');
    if (ns) ns.onclick = function () { Search.open(); };

    document.getElementById('mnav').innerHTML = MNAV.map(function (i) {
      return '<a href="' + i.h + '" data-mnav="' + i.h + '"><span class="i">' + i.ico + '</span>' + i.t + '</a>';
    }).join('');
  }

  function markActive(hash) {
    var root = '#/' + (hash.split('/')[1] || '');
    var alias = { '#/module': '#/course', '#/lesson': '#/course', '#/test': '#/course',
                  '#/topic': '#/course', '#/cards': '#/course',
                  '#/topicq': '#/train', '#/tickets': '#/train', '#/ticket': '#/train',
                  '#/marathon': '#/train', '#/mistakes': '#/train' };
    if (root === '#/before' || root === '#/exam') key = hash.indexOf('#/before') === 0 ? '#/before' : '#/exam';
    var key = alias[root] || root;
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      a.classList.toggle('on', a.dataset.nav === key);
    });
    document.querySelectorAll('[data-mnav]').forEach(function (a) {
      a.classList.toggle('on', a.dataset.mnav === key);
    });
  }

  var ROUTES = [
    [/^#\/$/,                 function () { return Views.home(); }],
    [/^#\/course$/,           function () { return Views.course(); },   function (h) { Views.courseBind(h); }],
    [/^#\/module\/(\w+)$/,    function (m) { return Views.module(m[1]); }],
    [/^#\/lesson\/([\w-]+)$/, function (m) { return Views.lesson(m[1]); }, function (h, m) { Views.lessonBind(h, m[1]); }],
    [/^#\/test\/(\w+)$/,      function (m) { return Views.test(m[1]); }],
    [/^#\/topic\/(\w+)$/,     function (m) { return Views.topic(m[1]); }],
    [/^#\/topicq\/(.+)$/,     function (m) { return Views.topicq(m[1]); }],
    [/^#\/cards\/(\w+)$/,     function (m) { return Views.cards(m[1]); }],
    [/^#\/train$/,            function () { return Views.train(); },    function (h) { Views.trainBind(h); }],
    [/^#\/tickets$/,          function () { return Views.tickets(); },  function (h) { Views.ticketsBind(h); }],
    [/^#\/ticket\/(\d+)$/,    function (m) { return Views.ticket(m[1]); }],
    [/^#\/marathon$/,         function () { return Views.marathon(); }],
    [/^#\/mistakes$/,         function () { return Views.mistakes(); }],
    [/^#\/exam$/,             function () { return Exam.intro(); },     function () { Exam.introBind(); }],
    [/^#\/before$/,           function () { return Ref.before(); }],
    [/^#\/before\/(\w+)$/,    function (m) { return Ref.beforeOne(m[1]); }],
    [/^#\/signs$/,            function () { return Ref.signs(); },      function (h) { Ref.signsBind(h); }],
    [/^#\/markup$/,           function () { return Ref.markup(); }],
    [/^#\/rules$/,            function () { return Ref.rules(); },      function () { Ref.rulesBind(); }],
    [/^#\/terms$/,            function () { return Ref.terms(); },      function () { Ref.termsBind(); }],
    [/^#\/penalties$/,        function () { return Ref.penalties(); },  function (h) { Ref.penaltiesBind(h); }],
    [/^#\/stats$/,            function () { return Ref.stats(); },      function () { Ref.statsBind(); }]
  ];

  function route() {
    var hash = location.hash || '#/';
    if (window.Quiz) Quiz.stop();
    var host = document.getElementById('view');

    for (var i = 0; i < ROUTES.length; i++) {
      var m = hash.match(ROUTES[i][0]);
      if (m) {
        host.innerHTML = ROUTES[i][1](m);
        if (ROUTES[i][2]) ROUTES[i][2](host, m);
        drawNav();
        markActive(hash);
        window.scrollTo(0, 0);
        return;
      }
    }
    host.innerHTML = Views._helpers.notFound();
    drawNav();
    markActive(hash);
  }

  function boot() {
    if (!window.DB || !window.DB.questions) {
      document.getElementById('view').innerHTML =
        '<div class="wrap-narrow"><div class="empty"><h3>Не загрузились данные</h3>' +
        '<p>Похоже, файл <code>data/db.js</code> лежит не рядом с index.html. Скопируй всю папку целиком.</p></div></div>';
      return;
    }
    window.COURSE = window.COURSE || [];
    UI.indexRefs();
    Views._init();
    Exam._init(Views._helpers);
    Ref._init(Views._helpers);
    window.addEventListener('hashchange', route);

    /* Ссылка на текущий адрес («Ещё попытка», «Пройти ещё раз») не меняет hash,
       а значит не вызывает hashchange — перерисовываем вручную. */
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href^="#/"]') : null;
      if (!a) return;
      if (a.getAttribute('href') === (location.hash || '#/')) { e.preventDefault(); route(); }
    });

    route();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
