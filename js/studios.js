// Game Studio, App Studio, World Builder, the player, and export/share.

import { L, lang } from './i18n.js';
import { db } from './store.js';
import { createGame } from './engine2d.js';
import { createWorld, loadThree } from './world3d.js';
import { planProject, applyCommand } from './ai.js';
import { toast, download, escapeHTML, slug, copyText } from './ui.js';

/* ---------------------------------------------------------------- helpers */

export function deviceInfo() {
  const info = {
    dpr: window.devicePixelRatio || 1,
    width: (window.screen && window.screen.width) || 0,
    height: (window.screen && window.screen.height) || 0,
    cores: navigator.hardwareConcurrency || 0,
    memory: navigator.deviceMemory || 0,
    platform: navigator.platform || '',
    gpu: ''
  };
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl') || probe.getContext('experimental-webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) info.gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '';
      else info.gpu = gl.getParameter(gl.RENDERER) || '';
    }
  } catch (e) {
    info.gpu = '';
  }
  return info;
}

export function autoQuality() {
  const info = deviceInfo();
  const strong =
    (info.dpr >= 2 && (info.cores >= 6 || info.memory >= 4)) || info.cores >= 8;
  return strong ? '4k' : 'hd';
}

export function dprFor(quality) {
  let q = quality;
  if (!q || q === 'auto') {
    const preferred = db.data.settings.quality;
    q = preferred && preferred !== 'auto' ? preferred : autoQuality();
  }
  return Math.min(window.devicePixelRatio || 1, q === '4k' ? 2 : 1.5);
}

function rerender() {
  if (typeof window.__aigsRerender === 'function') window.__aigsRerender();
}

function titleOf(spec) {
  if (!spec || !spec.title) return 'Project';
  return spec.title[lang] || spec.title.en || spec.title.ar || 'Project';
}

function qualityOptions(current) {
  const q = current || 'auto';
  return (
    '<option value="auto"' + (q === 'auto' ? ' selected' : '') + '>' +
    L({ ar: 'تلقائي حسب الجهاز', en: 'Auto (by device)' }) + '</option>' +
    '<option value="hd"' + (q === 'hd' ? ' selected' : '') + '>Full HD 1080p</option>' +
    '<option value="4k"' + (q === '4k' ? ' selected' : '') + '>4K Ultra HD 2160p</option>'
  );
}

function pageHead(title, sub) {
  const head = document.createElement('div');
  head.className = 'page-head';
  head.innerHTML =
    '<div class="stack"><h1 class="page-title">' + escapeHTML(title) + '</h1>' +
    '<p class="page-sub">' + escapeHTML(sub) + '</p></div>';
  return head;
}

/* ------------------------------------------------------------ entry panel */

function entryPanel(kind, presetPrompt) {
  const panel = document.createElement('div');
  panel.className = 'card stack';
  const isApp = kind === 'app';
  panel.innerHTML =
    '<div class="section-title">' + L({ ar: 'مشروع جديد', en: 'New project' }) + '</div>' +
    '<textarea id="new-prompt" rows="3" placeholder="' +
    (isApp
      ? L({ ar: 'اكتب فكرة التطبيق… مثال: تطبيق متجر إلكتروني للهواتف', en: 'Describe the app… e.g. a mobile shopping app' })
      : L({ ar: 'اكتب فكرة اللعبة… مثال: لعبة سباق سيارات 3D في مدينة ساحلية', en: 'Describe the game… e.g. a 3D racing game in a coastal city' })) +
    '">' + escapeHTML(presetPrompt || '') + '</textarea>' +
    '<div class="row">' +
    '<button class="btn primary" id="new-create">' + L({ ar: 'أنشئ بـ OMAR AI', en: 'Create with OMAR AI' }) + '</button>' +
    '<span class="hint">' + L({ ar: 'مجاني بالكامل — لا اشتراكات ولا رسوم تصدير.', en: 'Completely free — no subscriptions, no export fees.' }) + '</span>' +
    '</div>';

  const input = panel.querySelector('#new-prompt');
  panel.querySelector('#new-create').addEventListener('click', () => {
    const text = input.value.trim();
    if (!text) {
      toast(L({ ar: 'اكتب فكرة المشروع أولاً', en: 'Describe your idea first' }), 'warn');
      input.focus();
      return;
    }
    const plan = planProject(text, { kind: kind });
    const project = db.create(plan.spec, { author: db.data.user.name || '' });
    location.hash = (kind === 'app' ? '#/app/' : '#/game/') + project.id;
  });

  return panel;
}

function projectList(kind) {
  const items = db.projects().filter((p) => p.spec && p.spec.kind === kind);
  if (!items.length) return null;
  const wrap = document.createElement('div');
  wrap.className = 'stack';
  wrap.innerHTML = '<div class="section-title">' + L({ ar: 'مشاريعي', en: 'My projects' }) + '</div>';

  const grid = document.createElement('div');
  grid.className = 'grid';
  items.forEach((project) => {
    const card = document.createElement('div');
    card.className = 'card clickable';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.style.textAlign = 'start';
    card.innerHTML =
      '<div class="proj-thumb" style="background:linear-gradient(140deg,' +
      escapeHTML((project.spec.theme && project.spec.theme.bg1) || '#1b2440') + ',' +
      escapeHTML((project.spec.theme && project.spec.bg2) || (project.spec.theme && project.spec.accent) || '#4f46e5') + ')">' +
      escapeHTML(project.spec.dim === '3d' ? '3D' : project.spec.kind === 'app' ? 'APP' : '2D') + '</div>' +
      '<div class="proj-title">' + escapeHTML(titleOf(project.spec)) + '</div>' +
      '<div class="proj-meta"><span>' +
      escapeHTML(project.spec.kind === 'app' ? L({ ar: 'تطبيق', en: 'App' }) : L(project.spec.genreLabel || { ar: 'لعبة', en: 'Game' })) +
      '</span></div>';
    const openProject = () => {
      location.hash = (kind === 'app' ? '#/app/' : '#/game/') + project.id;
    };
    card.addEventListener('click', openProject);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openProject();
      }
    });
    grid.appendChild(card);
  });
  wrap.appendChild(grid);
  return wrap;
}

/* -------------------------------------------------------------- game studio */

export function gameStudioView(id) {
  const root = document.createElement('div');
  root.className = 'page';

  const project = id ? db.get(id) : null;
  if (!project || !project.spec || project.spec.kind !== 'game') {
    root.appendChild(
      pageHead(
        'Game Studio',
        L({
          ar: 'ألعاب 2D و3D: مغامرات، سباقات، حروب، عالم مفتوح، محاكاة، رعب، ومتعددة اللاعبين.',
          en: '2D and 3D games: adventure, racing, war, open world, simulation, horror, and multiplayer.'
        })
      )
    );
    root.appendChild(entryPanel('game'));
    const list = projectList('game');
    if (list) root.appendChild(list);
    return root;
  }

  const spec = project.spec;

  const bar = document.createElement('div');
  bar.className = 'studio-bar';
  bar.innerHTML =
    '<div class="studio-bar-title">' + escapeHTML(titleOf(spec)) + '</div>' +
    '<span class="pill accent">' + escapeHTML(spec.genreLabel ? L(spec.genreLabel) : spec.genre) + '</span>' +
    '<span class="pill">' + (spec.dim === '3d' ? '3D' : '2D') + '</span>' +
    (spec.multiplayer ? '<span class="pill">' + L({ ar: 'متعدد اللاعبين', en: 'Multiplayer' }) + '</span>' : '') +
    '<div class="row" style="margin-inline-start:auto">' +
    '<span class="hint">' + L({ ar: 'الجودة', en: 'Quality' }) + '</span>' +
    '<select id="q-select" style="width:auto">' + qualityOptions(spec.quality) + '</select>' +
    '</div>';

  const stage = document.createElement('div');
  stage.className = 'stage';
  stage.innerHTML =
    '<canvas class="stage-canvas" id="game-canvas"></canvas>' +
    '<div class="hud">' +
    '<div class="hud-item">' + L({ ar: 'النقاط', en: 'Score' }) + ' <b id="hud-score">0</b></div>' +
    '<div class="hud-item">' + L({ ar: 'الصحة', en: 'HP' }) + ' <b id="hud-hp">' + (spec.rules ? spec.rules.hp : 3) + '</b></div>' +
    '<div class="hud-item">' + L({ ar: 'الوقت', en: 'Time' }) + ' <b id="hud-time">' + (spec.rules ? spec.rules.time : 90) + '</b></div>' +
    '<div class="hud-item">' + L({ ar: 'المستوى', en: 'Level' }) + ' <b id="hud-level">1</b></div>' +
    '</div>' +
    '<div class="overlay is-hidden" id="game-over">' +
    '<div class="overlay-card">' +
    '<h3 id="over-title">' + L({ ar: 'انتهت اللعبة', en: 'Game over' }) + '</h3>' +
    '<p class="hint" id="over-sub"></p>' +
    '<button class="btn primary" id="over-restart">' + L({ ar: 'إعادة اللعب', en: 'Play again' }) + '</button>' +
    '</div></div>';

  const actions = document.createElement('div');
  actions.className = 'studio-actions';
  actions.innerHTML =
    '<button class="btn primary" id="act-play">' + L({ ar: 'إيقاف مؤقت', en: 'Pause' }) + '</button>' +
    '<button class="btn" id="act-restart">' + L({ ar: 'إعادة', en: 'Restart' }) + '</button>' +
    '<button class="btn" id="act-save">' + L({ ar: 'حفظ المشروع', en: 'Save project' }) + '</button>' +
    '<button class="btn" id="act-export-html">' + L({ ar: 'تصدير اللعبة', en: 'Export game' }) + '</button>' +
    '<button class="btn" id="act-export-json">' + L({ ar: 'تصدير JSON', en: 'Export JSON' }) + '</button>' +
    '<button class="btn ok" id="act-publish">' + L({ ar: project.published ? 'منشور' : 'نشر', en: project.published ? 'Published' : 'Publish' }) + '</button>' +
    '<button class="btn ghost" id="act-share">' + L({ ar: 'مشاركة', en: 'Share' }) + '</button>' +
    (spec.dim === '3d' ? '<a class="btn ghost" href="#/world/' + project.id + '">World Builder</a>' : '') +
    '<a class="btn ghost" href="#/publish">' + L({ ar: 'مركز النشر', en: 'Publish center' }) + '</a>';

  const controls = document.createElement('div');
  controls.className = 'card stack';
  controls.innerHTML =
    '<div class="section-title">' + L({ ar: 'طريقة اللعب', en: 'How to play' }) + '</div>' +
    '<div class="hint">' +
    L({
      ar: 'الحواسيب: أسهم لوحة المفاتيح أو WASD. الهواتف: اسحب إصبعك على الشاشة. مسافة للإطلاق في ألعاب الحرب.',
      en: 'Desktop: arrow keys or WASD. Phones: drag your finger on the screen. Space shoots in war games.'
    }) +
    '</div>' +
    '<div class="spec-list">' +
    '<div><span>' + L({ ar: 'الهدف', en: 'Goal' }) + '</span><b>' + L({ ar: 'اجمع النقاط وابقَ حياً', en: 'Collect points and stay alive' }) + '</b></div>' +
    '<div><span>' + L({ ar: 'الأعداء', en: 'Enemies' }) + '</span><b>' + String(spec.rules ? spec.rules.enemies : 0) + '</b></div>' +
    '<div><span>' + L({ ar: 'العوائق', en: 'Obstacles' }) + '</span><b>' + String(spec.rules ? spec.rules.obstacles : 0) + '</b></div>' +
    '</div>';

  const aiCard = document.createElement('div');
  aiCard.className = 'card stack';
  aiCard.innerHTML =
    '<div class="section-title">OMAR AI</div>' +
    '<div class="hint">' +
    L({ ar: 'عدّل المشروع بأمر نصي: اجعل الليل، أضف سيارات، أضف مبانٍ، اجعل الألوان حمراء، اجعله أصعب.', en: 'Change the project by command: make it night, add cars, add buildings, make the colors red, make it harder.' }) +
    '</div>' +
    '<div class="chat-input">' +
    '<input type="text" id="cmd-input" placeholder="' + L({ ar: 'أمر التعديل…', en: 'Editing command…' }) + '">' +
    '<button class="btn sm primary" id="cmd-apply">' + L({ ar: 'تطبيق', en: 'Apply' }) + '</button>' +
    '</div>';

  const summary = document.createElement('div');
  summary.className = 'card stack';
  summary.innerHTML =
    '<div class="section-title">' + L({ ar: 'ملخص المشروع', en: 'Project summary' }) + '</div>' +
    '<div class="spec-list">' +
    '<div><span>' + L({ ar: 'المحرك', en: 'Engine' }) + '</span><b>OMAR AI ' + (spec.dim === '3d' ? '3D' : '2D') + '</b></div>' +
    '<div><span>' + L({ ar: 'النوع', en: 'Genre' }) + '</span><b>' + escapeHTML(spec.genreLabel ? L(spec.genreLabel) : spec.genre) + '</b></div>' +
    '<div><span>' + L({ ar: 'الجودة', en: 'Quality' }) + '</span><b>' + escapeHTML(String(spec.quality || 'auto')) + '</b></div>' +
    '<div><span>' + L({ ar: 'السيارات', en: 'Cars' }) + '</span><b>' + String((spec.world && spec.world.cars) || 0) + '</b></div>' +
    '<div><span>' + L({ ar: 'المباني', en: 'Buildings' }) + '</span><b>' + String((spec.world && spec.world.buildings) || 0) + '</b></div>' +
    '</div>';

  const main = document.createElement('div');
  main.className = 'studio-main';
  main.appendChild(bar);
  main.appendChild(stage);
  main.appendChild(actions);

  if (spec.dim === '3d') {
    const note = document.createElement('div');
    note.className = 'card flat';
    note.innerHTML =
      '<p class="hint">' +
      L({
        ar: 'اللعب يجري على محرك OMAR AI السريع المتوافق مع الهواتف والكمبيوتر، والعالم ثلاثي الأبعاد الكامل (مدن، شوارع، مبانٍ، منازل، سيارات، طبيعة، بحار) تبنيه وتعدّله في World Builder.',
        en: 'Gameplay runs on the fast OMAR AI runtime that works on phones and computers; the full 3D world (cities, streets, buildings, houses, cars, nature, seas) is built and edited in World Builder.'
      }) +
      '</p>';
    main.appendChild(note);
  }

  const side = document.createElement('div');
  side.className = 'studio-side';
  side.appendChild(controls);
  side.appendChild(aiCard);
  side.appendChild(summary);

  const studio = document.createElement('div');
  studio.className = 'studio';
  studio.appendChild(main);
  studio.appendChild(side);
  root.appendChild(studio);

  let engine = null;
  let paused = false;
  let playBtn = null;

  function setText(sel, value) {
    const node = stage.querySelector(sel);
    if (node) node.textContent = value;
  }

  function showOver(info) {
    const overlay = stage.querySelector('#game-over');
    const title = stage.querySelector('#over-title');
    const sub = stage.querySelector('#over-sub');
    if (!overlay) return;
    overlay.classList.remove('is-hidden');
    const isTime = info && info.reason === 'time';
    if (title) {
      title.textContent = isTime
        ? L({ ar: 'انتهى الوقت', en: 'Time is up' })
        : L({ ar: 'انتهت اللعبة', en: 'Game over' });
    }
    if (sub) {
      sub.textContent =
        L({ ar: 'نقاطك', en: 'Your score' }) + ': ' + ((info && info.score) || 0) +
        ' — ' + L({ ar: 'المستوى', en: 'level' }) + ' ' + ((info && info.level) || 1);
    }
  }

  function mount() {
    if (engine) {
      engine.destroy();
      engine = null;
    }
    paused = false;
    const overlay = stage.querySelector('#game-over');
    if (overlay) overlay.classList.add('is-hidden');
    const canvas = stage.querySelector('#game-canvas');
    engine = createGame(canvas, project.spec, {
      dpr: dprFor(project.spec.quality),
      onState: function (state) {
        setText('#hud-score', String(state.score));
        setText('#hud-hp', String(state.hp));
        setText('#hud-time', String(state.time));
        setText('#hud-level', String(state.level));
      },
      onOver: function (info) {
        showOver(info);
        if (project.id) db.play(project.id);
      }
    });
    engine.start();
    if (playBtn) playBtn.textContent = L({ ar: 'إيقاف مؤقت', en: 'Pause' });
  }

  mount();

  playBtn = actions.querySelector('#act-play');
  playBtn.addEventListener('click', () => {
    if (!engine) return;
    if (paused) {
      engine.resume();
      paused = false;
      playBtn.textContent = L({ ar: 'إيقاف مؤقت', en: 'Pause' });
    } else {
      engine.pause();
      paused = true;
      playBtn.textContent = L({ ar: 'متابعة', en: 'Resume' });
    }
  });

  actions.querySelector('#act-restart').addEventListener('click', () => {
    if (engine) engine.restart();
    const overlay = stage.querySelector('#game-over');
    if (overlay) overlay.classList.add('is-hidden');
    paused = false;
    playBtn.textContent = L({ ar: 'إيقاف مؤقت', en: 'Pause' });
  });

  actions.querySelector('#act-save').addEventListener('click', () => {
    db.saveSpec(project.id, project.spec);
    toast(L({ ar: 'تم حفظ المشروع', en: 'Project saved' }), 'ok');
  });

  actions.querySelector('#act-export-html').addEventListener('click', () => {
    exportGameHTML(project);
  });

  actions.querySelector('#act-export-json').addEventListener('click', () => {
    exportProjectJSON(project);
  });

  actions.querySelector('#act-publish').addEventListener('click', () => {
    db.publish(project.id);
    db.play(project.id);
    toast(L({ ar: 'تم النشر في مجتمع الألعاب', en: 'Published to the community' }), 'ok');
    rerender();
  });

  actions.querySelector('#act-share').addEventListener('click', () => {
    const link = shareLink(project.spec);
    copyText(link).then((ok) => {
      toast(
        ok
          ? L({ ar: 'تم نسخ رابط المشاركة', en: 'Share link copied' })
          : link,
        ok ? 'ok' : 'warn'
      );
    });
  });

  bar.querySelector('#q-select').addEventListener('change', (e) => {
    project.spec.quality = e.target.value;
    db.saveSpec(project.id, project.spec);
    mount();
    toast(L({ ar: 'تم ضبط الجودة', en: 'Quality updated' }), 'ok');
  });

  aiCard.querySelector('#cmd-apply').addEventListener('click', () => {
    const input = aiCard.querySelector('#cmd-input');
    const text = input.value.trim();
    if (!text) return;
    const result = applyCommand(project.spec, text);
    if (!result.ok) {
      toast(
        L({
          ar: 'لم أفهم التعديل. جرّب: اجعل الليل، أضف سيارات، أضف مبانٍ، اجعله أصعب.',
          en: 'I did not catch that. Try: make it night, add cars, add buildings, make it harder.'
        }),
        'warn'
      );
      return;
    }
    db.saveSpec(project.id, result.spec);
    input.value = '';
    toast(L({ ar: 'تم التعديل بواسطة OMAR AI', en: 'Updated by OMAR AI' }), 'ok');
    rerender();
  });

  stage.querySelector('#over-restart').addEventListener('click', () => {
    if (engine) engine.restart();
    paused = false;
    playBtn.textContent = L({ ar: 'إيقاف مؤقت', en: 'Pause' });
    const overlay = stage.querySelector('#game-over');
    if (overlay) overlay.classList.add('is-hidden');
  });

  root.__cleanup = function () {
    if (engine) {
      engine.destroy();
      engine = null;
    }
  };

  return root;
}

/* --------------------------------------------------------------- app studio */

function appFrameHTML(spec, device, openIndex) {
  const accent = (spec.theme && spec.theme.accent) || '#7c5cff';
  const accent2 = (spec.theme && spec.theme.accent2) || '#22d3ee';
  const items = spec.items || [];
  const tabs = spec.tabs || [];
  const title = titleOf(spec);

  let body = '';
  if (openIndex >= 0 && items[openIndex]) {
    const item = items[openIndex];
    body =
      '<div class="mock-detail">' +
      '<button class="btn sm ghost" id="mock-back" style="width:fit-content">' +
      L({ ar: 'رجوع', en: 'Back' }) + '</button>' +
      '<div class="mock-hero" style="background:linear-gradient(140deg,' + escapeHTML(accent) + ',' + escapeHTML(accent2) + ')">' +
      escapeHTML(item.ico || '•') + '</div>' +
      '<div class="mock-title">' + escapeHTML(L(item.t)) + '</div>' +
      '<div class="mock-sub">' + escapeHTML(L(item.s)) + '</div>' +
      '<div class="mock-price" style="margin-inline-start:0">' + escapeHTML(item.price || '') + '</div>' +
      '<p class="hint">' +
      L({
        ar: 'هذه الشاشة مُولّدة من وصفك، ويمكن تعديلها بأمر نصي من OMAR AI.',
        en: 'This screen was generated from your description, and can be changed by an OMAR AI command.'
      }) +
      '</p>' +
      '<button class="btn primary block">' + L({ ar: 'تنفيذ', en: 'Continue' }) + '</button>' +
      '</div>';
  } else {
    const rows = items
      .map((item, index) => {
        return (
          '<div class="mock-item" data-item="' + index + '">' +
          '<div class="mock-thumb">' + escapeHTML(item.ico || '•') + '</div>' +
          '<div class="stack" style="gap:0"><span class="mock-title">' + escapeHTML(L(item.t)) + '</span>' +
          '<span class="mock-sub">' + escapeHTML(L(item.s)) + '</span></div>' +
          '<span class="mock-price">' + escapeHTML(item.price || '') + '</span>' +
          '</div>'
        );
      })
      .join('');
    body = rows || '<div class="empty">' + L({ ar: 'لا توجد عناصر بعد', en: 'No items yet' }) + '</div>';
  }

  return (
    '<div class="mock-head">' +
    '<div class="avatar" style="background:linear-gradient(140deg,' + escapeHTML(accent) + ',' + escapeHTML(accent2) + ')">' +
    escapeHTML(title.slice(0, 1)) + '</div>' +
    '<div class="stack" style="gap:0;min-width:0">' +
    '<span class="mock-title">' + escapeHTML(title) + '</span>' +
    '<span class="mock-sub">' + escapeHTML(L(spec.tagline || { ar: '', en: '' })) + '</span>' +
    '</div></div>' +
    '<div class="mock-tabs">' +
    tabs
      .map((tab, index) => {
        return (
          '<span class="pill' + (index === 0 ? ' accent' : '') + '">' + escapeHTML(L(tab)) + '</span>'
        );
      })
      .join('') +
    '</div>' +
    '<div class="mock-body">' + body + '</div>' +
    '<div class="mock-nav">' +
    tabs
      .slice(0, 4)
      .map((tab, index) => {
        return '<span class="' + (index === 0 ? 'on' : '') + '">' + escapeHTML(L(tab)) + '</span>';
      })
      .join('') +
    '</div>'
  );
}

export function appStudioView(id) {
  const root = document.createElement('div');
  root.className = 'page';

  const project = id ? db.get(id) : null;
  if (!project || !project.spec || project.spec.kind !== 'app') {
    root.appendChild(
      pageHead(
        'App Studio',
        L({
          ar: 'تطبيقات iPhone وiPad وAndroid والكمبيوتر: متاجر، تعليم، تواصل، ذكاء اصطناعي، وترفيه.',
          en: 'iPhone, iPad, Android and desktop apps: stores, education, social, AI, and entertainment.'
        })
      )
    );
    root.appendChild(entryPanel('app'));
    const list = projectList('app');
    if (list) root.appendChild(list);
    return root;
  }

  const spec = project.spec;
  let device = 'phone';
  let openIndex = -1;

  const bar = document.createElement('div');
  bar.className = 'studio-bar';
  bar.innerHTML =
    '<div class="studio-bar-title">' + escapeHTML(titleOf(spec)) + '</div>' +
    '<span class="pill accent">' + L({ ar: 'تطبيق', en: 'App' }) + '</span>' +
    '<span class="pill">' + escapeHTML(String(spec.items ? spec.items.length : 0)) + ' ' + L({ ar: 'عناصر', en: 'items' }) + '</span>' +
    '<div class="row" style="margin-inline-start:auto">' +
    '<span class="hint">' + L({ ar: 'الجودة', en: 'Quality' }) + '</span>' +
    '<select id="app-q" style="width:auto">' + qualityOptions(spec.quality) + '</select>' +
    '</div>';

  const preview = document.createElement('div');
  preview.className = 'card stack';
  preview.innerHTML =
    '<div class="devicebar">' +
    '<div class="seg" id="dev-seg">' +
    '<button type="button" data-dev="phone" class="is-on">' + L({ ar: 'هاتف', en: 'Phone' }) + '</button>' +
    '<button type="button" data-dev="tablet">' + L({ ar: 'تابلت', en: 'Tablet' }) + '</button>' +
    '<button type="button" data-dev="desktop">' + L({ ar: 'كمبيوتر', en: 'Desktop' }) + '</button>' +
    '</div>' +
    '<span class="hint">' + L({ ar: 'معاينة تفاعلية — اضغط أي عنصر', en: 'Interactive preview — tap any item' }) + '</span>' +
    '</div>' +
    '<div class="device-stage"><div class="appframe phone" id="frame"></div></div>';

  const actions = document.createElement('div');
  actions.className = 'studio-actions';
  actions.innerHTML =
    '<button class="btn" id="app-save">' + L({ ar: 'حفظ المشروع', en: 'Save project' }) + '</button>' +
    '<button class="btn" id="app-export">' + L({ ar: 'تصدير التطبيق', en: 'Export app' }) + '</button>' +
    '<button class="btn" id="app-json">' + L({ ar: 'تصدير JSON', en: 'Export JSON' }) + '</button>' +
    '<button class="btn ok" id="app-publish">' + L({ ar: project.published ? 'منشور' : 'نشر', en: project.published ? 'Published' : 'Publish' }) + '</button>' +
    '<button class="btn ghost" id="app-share">' + L({ ar: 'مشاركة', en: 'Share' }) + '</button>';

  const aiCard = document.createElement('div');
  aiCard.className = 'card stack';
  aiCard.innerHTML =
    '<div class="section-title">OMAR AI</div>' +
    '<div class="hint">' +
    L({ ar: 'أوامر جاهزة: أضف عنصر — الوضع الداكن — وضع فاتح.', en: 'Ready commands: add item — dark mode — light mode.' }) +
    '</div>' +
    '<div class="chat-input">' +
    '<input type="text" id="app-cmd" placeholder="' + L({ ar: 'أمر التعديل…', en: 'Editing command…' }) + '">' +
    '<button class="btn sm primary" id="app-cmd-apply">' + L({ ar: 'تطبيق', en: 'Apply' }) + '</button>' +
    '</div>';

  const notes = document.createElement('div');
  notes.className = 'card stack';
  notes.innerHTML =
    '<div class="section-title">' + L({ ar: 'ملاحظات النشر', en: 'Publishing notes' }) + '</div>' +
    '<div class="hint">' +
    L({
      ar: 'المتاجر الخارجية قد تفرض رسوماً مستقلة (مثل حساب Apple Developer أو Google Play). هذه رسوم اختيارية تخصّ المتجر، وليست رسوماً على المنصة.',
      en: 'External stores may charge their own fees (an Apple Developer or Google Play account). Those are optional store fees, not platform fees.'
    }) +
    '</div>';

  const main = document.createElement('div');
  main.className = 'studio-main';
  main.appendChild(bar);
  main.appendChild(preview);
  main.appendChild(actions);

  const side = document.createElement('div');
  side.className = 'studio-side';
  side.appendChild(aiCard);
  side.appendChild(notes);

  const studio = document.createElement('div');
  studio.className = 'studio';
  studio.appendChild(main);
  studio.appendChild(side);
  root.appendChild(studio);

  const frame = preview.querySelector('#frame');

  function renderFrame() {
    frame.className = 'appframe ' + device;
    frame.innerHTML = appFrameHTML(spec, device, openIndex);
    frame.querySelectorAll('[data-item]').forEach((node) => {
      node.addEventListener('click', () => {
        openIndex = Number(node.getAttribute('data-item'));
        renderFrame();
      });
    });
    const back = frame.querySelector('#mock-back');
    if (back) {
      back.addEventListener('click', () => {
        openIndex = -1;
        renderFrame();
      });
    }
  }

  renderFrame();

  preview.querySelectorAll('[data-dev]').forEach((button) => {
    button.addEventListener('click', () => {
      device = button.getAttribute('data-dev');
      preview.querySelectorAll('[data-dev]').forEach((b) => b.classList.remove('is-on'));
      button.classList.add('is-on');
      openIndex = -1;
      renderFrame();
    });
  });

  actions.querySelector('#app-save').addEventListener('click', () => {
    db.saveSpec(project.id, project.spec);
    toast(L({ ar: 'تم حفظ المشروع', en: 'Project saved' }), 'ok');
  });

  actions.querySelector('#app-export').addEventListener('click', () => {
    exportAppHTML(project);
  });

  actions.querySelector('#app-json').addEventListener('click', () => {
    exportProjectJSON(project);
  });

  actions.querySelector('#app-publish').addEventListener('click', () => {
    db.publish(project.id);
    toast(L({ ar: 'تم النشر في المجتمع', en: 'Published to the community' }), 'ok');
    rerender();
  });

  actions.querySelector('#app-share').addEventListener('click', () => {
    const link = shareLink(project.spec);
    copyText(link).then((ok) => {
      toast(ok ? L({ ar: 'تم نسخ رابط المشاركة', en: 'Share link copied' }) : link, ok ? 'ok' : 'warn');
    });
  });

  bar.querySelector('#app-q').addEventListener('change', (e) => {
    project.spec.quality = e.target.value;
    db.saveSpec(project.id, project.spec);
    toast(L({ ar: 'تم ضبط الجودة', en: 'Quality updated' }), 'ok');
  });

  aiCard.querySelector('#app-cmd-apply').addEventListener('click', () => {
    const input = aiCard.querySelector('#app-cmd');
    const text = input.value.trim();
    if (!text) return;
    const result = applyCommand(project.spec, text);
    if (!result.ok) {
      toast(L({ ar: 'لم أفهم التعديل', en: 'I did not catch that' }), 'warn');
      return;
    }
    db.saveSpec(project.id, result.spec);
    input.value = '';
    toast(L({ ar: 'تم التعديل بواسطة OMAR AI', en: 'Updated by OMAR AI' }), 'ok');
    rerender();
  });

  return root;
}

/* ------------------------------------------------------------- world builder */

function drawWorldFallback(container, spec) {
  const canvas = document.createElement('canvas');
  canvas.className = 'world-canvas';
  container.appendChild(canvas);
  const w = Math.max(240, container.clientWidth || 600);
  const h = Math.max(200, container.clientHeight || 400);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const theme = spec.theme || {};
  const world = spec.world || {};

  ctx.fillStyle = theme.ground || '#2f7d4f';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = theme.sea || '#0891b2';
  ctx.fillRect(0, h * 0.72, w, h * 0.28);
  ctx.fillStyle = theme.road || '#1f2937';
  ctx.fillRect(0, h * 0.44, w, h * 0.09);
  ctx.fillRect(w * 0.46, 0, w * 0.08, h);

  let seed = Number(spec.seed) || 12345;
  const rand = (min, max) => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return min + (seed / 4294967296) * (max - min);
  };
  const count = Math.min(60, Number(world.buildings) || 20);
  for (let i = 0; i < count; i++) {
    const bw = rand(14, 40);
    const bh = rand(20, 90);
    const x = rand(0, w - bw);
    const y = rand(0, h * 0.42);
    ctx.fillStyle = world.night ? '#2b3350' : '#8fa0b8';
    ctx.fillRect(x, y, bw, bh);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '12px sans-serif';
  ctx.fillText('2D world map (3D preview unavailable)', 12, h - 12);
}

export function worldView(id) {
  const root = document.createElement('div');
  root.className = 'page';

  const project = id ? db.get(id) : null;
  if (!project || !project.spec || project.spec.kind !== 'game') {
    root.appendChild(
      pageHead(
        'World Builder',
        L({
          ar: 'ابنِ المدن والشوارع والمباني والمنازل والسيارات والطبيعة والبحار — عالم ثلاثي الأبعاد كامل.',
          en: 'Build cities, streets, buildings, houses, cars, nature and seas — a complete 3D world.'
        })
      )
    );
    root.appendChild(entryPanel('game', 'لعبة عالم مفتوح ثلاثية الأبعاد في مدينة ساحلية كبيرة'));
    const list = projectList('game');
    if (list) root.appendChild(list);
    return root;
  }

  const spec = project.spec;
  if (!spec.world) {
    spec.world = {
      size: 240, buildings: 24, houses: 12, trees: 36, cars: 8,
      mountains: 6, sea: true, beach: true, night: false, roads: true
    };
  }

  const bar = document.createElement('div');
  bar.className = 'studio-bar';
  bar.innerHTML =
    '<div class="studio-bar-title">' + escapeHTML(titleOf(spec)) + '</div>' +
    '<span class="pill accent">World Builder</span>' +
    '<div class="row" style="margin-inline-start:auto">' +
    '<span class="hint">' + L({ ar: 'الجودة', en: 'Quality' }) + '</span>' +
    '<select id="world-q" style="width:auto">' + qualityOptions(spec.quality) + '</select>' +
    '</div>';

  const wrap = document.createElement('div');
  wrap.className = 'world-wrap';
  const hint = document.createElement('div');
  hint.className = 'world-hint';
  hint.style.zIndex = '3';
  hint.textContent = L({
    ar: 'اسحب للتدوير — استخدم إصبعين للتكبير والتصغير',
    en: 'Drag to orbit — pinch to zoom'
  });
  wrap.appendChild(hint);

  const tools = document.createElement('div');
  tools.className = 'card stack';
  tools.innerHTML =
    '<div class="section-title">' + L({ ar: 'عناصر العالم', en: 'World elements' }) + '</div>' +
    '<div class="toolbar">' +
    '<button type="button" class="tool" data-add="buildings">' + L({ ar: '+ مبانٍ', en: '+ Buildings' }) + '</button>' +
    '<button type="button" class="tool" data-add="houses">' + L({ ar: '+ منازل', en: '+ Houses' }) + '</button>' +
    '<button type="button" class="tool" data-add="trees">' + L({ ar: '+ أشجار', en: '+ Trees' }) + '</button>' +
    '<button type="button" class="tool" data-add="cars">' + L({ ar: '+ سيارات', en: '+ Cars' }) + '</button>' +
    '<button type="button" class="tool" data-add="mountains">' + L({ ar: '+ جبال', en: '+ Mountains' }) + '</button>' +
    '<button type="button" class="tool" id="toggle-sea">' + L({ ar: 'بحر وشاطئ', en: 'Sea & beach' }) + '</button>' +
    '<button type="button" class="tool" id="toggle-night">' + L({ ar: 'ليل / نهار', en: 'Night / day' }) + '</button>' +
    '<button type="button" class="tool" id="regen">' + L({ ar: 'توليد عالم جديد', en: 'Regenerate world' }) + '</button>' +
    '</div>' +
    '<div class="hint">' +
    L({
      ar: 'كل تغيير يُحفظ في المشروع فوراً، وينعكس على اللعبة عند تشغيلها.',
      en: 'Every change is saved to the project instantly and shows up when you run the game.'
    }) +
    '</div>';

  const actions = document.createElement('div');
  actions.className = 'studio-actions';
  actions.innerHTML =
    '<button class="btn primary" id="world-save">' + L({ ar: 'حفظ المشروع', en: 'Save project' }) + '</button>' +
    '<a class="btn" href="#/game/' + project.id + '">' + L({ ar: 'افتح Game Studio', en: 'Open Game Studio' }) + '</a>' +
    '<button class="btn" id="world-json">' + L({ ar: 'تصدير JSON', en: 'Export JSON' }) + '</button>' +
    '<button class="btn ghost" id="world-share">' + L({ ar: 'مشاركة', en: 'Share' }) + '</button>';

  const main = document.createElement('div');
  main.className = 'studio-main';
  main.appendChild(bar);
  main.appendChild(wrap);
  main.appendChild(actions);

  const side = document.createElement('div');
  side.className = 'studio-side';
  side.appendChild(tools);

  const stats = document.createElement('div');
  stats.className = 'card stack';
  const paintStats = () => {
    const world = spec.world;
    stats.innerHTML =
      '<div class="section-title">' + L({ ar: 'إحصاءات العالم', en: 'World stats' }) + '</div>' +
      '<div class="spec-list">' +
      '<div><span>' + L({ ar: 'المباني', en: 'Buildings' }) + '</span><b>' + String(world.buildings || 0) + '</b></div>' +
      '<div><span>' + L({ ar: 'المنازل', en: 'Houses' }) + '</span><b>' + String(world.houses || 0) + '</b></div>' +
      '<div><span>' + L({ ar: 'الأشجار', en: 'Trees' }) + '</span><b>' + String(world.trees || 0) + '</b></div>' +
      '<div><span>' + L({ ar: 'السيارات', en: 'Cars' }) + '</span><b>' + String(world.cars || 0) + '</b></div>' +
      '<div><span>' + L({ ar: 'الجبال', en: 'Mountains' }) + '</span><b>' + String(world.mountains || 0) + '</b></div>' +
      '<div><span>' + L({ ar: 'البحر', en: 'Sea' }) + '</span><b>' + (world.sea ? L({ ar: 'نعم', en: 'Yes' }) : L({ ar: 'لا', en: 'No' })) + '</b></div>' +
      '<div><span>' + L({ ar: 'الوقت', en: 'Time' }) + '</span><b>' + (world.night ? L({ ar: 'ليل', en: 'Night' }) : L({ ar: 'نهار', en: 'Day' })) + '</b></div>' +
      '</div>';
  };
  paintStats();
  side.appendChild(stats);

  const studio = document.createElement('div');
  studio.className = 'studio';
  studio.appendChild(main);
  studio.appendChild(side);
  root.appendChild(studio);

  let api = null;
  let disposed = false;

  async function mount() {
    if (disposed) return;
    if (api) {
      api.dispose();
      api = null;
    }
    const old = wrap.querySelector('canvas');
    if (old) old.remove();
    try {
      api = await createWorld(wrap, spec, {
        quality: spec.quality,
        shadows: true
      });
    } catch (err) {
      while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
      wrap.appendChild(hint);
      drawWorldFallback(wrap, spec);
      toast(
        L({
          ar: 'معاينة 3D غير متاحة على هذا الجهاز — تم عرض خريطة مبسّطة.',
          en: '3D preview is unavailable on this device — showing a simplified map.'
        }),
        'warn'
      );
    }
  }

  function persist() {
    db.saveSpec(project.id, spec);
    paintStats();
  }

  function applyWorld() {
    persist();
    if (api) {
      api.apply(spec);
    } else {
      mount();
    }
  }

  tools.querySelectorAll('[data-add]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.getAttribute('data-add');
      const step = key === 'trees' ? 12 : key === 'cars' ? 4 : key === 'mountains' ? 2 : 6;
      const limits = { buildings: 80, houses: 60, trees: 160, cars: 40, mountains: 20 };
      spec.world[key] = Math.min(limits[key] || 60, (spec.world[key] || 0) + step);
      applyWorld();
    });
  });

  tools.querySelector('#toggle-sea').addEventListener('click', () => {
    spec.world.sea = !spec.world.sea;
    spec.world.beach = spec.world.sea;
    applyWorld();
  });

  tools.querySelector('#toggle-night').addEventListener('click', () => {
    spec.world.night = !spec.world.night;
    spec.theme = spec.theme || {};
    if (spec.world.night) {
      spec.theme.sky = '#05060f';
      spec.theme.bg1 = '#05060f';
      spec.theme.bg2 = '#0b1020';
    } else if (spec.theme.sky === '#05060f') {
      spec.theme.sky = '#0e7490';
      spec.theme.bg1 = '#0b1020';
      spec.theme.bg2 = '#141b33';
    }
    applyWorld();
  });

  tools.querySelector('#regen').addEventListener('click', () => {
    spec.seed = Math.floor(Math.random() * 900000) + 1000;
    applyWorld();
    toast(L({ ar: 'تم توليد عالم جديد', en: 'New world generated' }), 'ok');
  });

  bar.querySelector('#world-q').addEventListener('change', (e) => {
    spec.quality = e.target.value;
    persist();
    mount();
    toast(L({ ar: 'تم ضبط الجودة', en: 'Quality updated' }), 'ok');
  });

  actions.querySelector('#world-save').addEventListener('click', () => {
    persist();
    toast(L({ ar: 'تم حفظ عالم المشروع', en: 'World saved' }), 'ok');
  });

  actions.querySelector('#world-json').addEventListener('click', () => {
    exportProjectJSON(project);
  });

  actions.querySelector('#world-share').addEventListener('click', () => {
    const link = shareLink(spec);
    copyText(link).then((ok) => {
      toast(ok ? L({ ar: 'تم نسخ رابط المشاركة', en: 'Share link copied' }) : link, ok ? 'ok' : 'warn');
    });
  });

  root.__cleanup = function () {
    disposed = true;
    if (api) {
      api.dispose();
      api = null;
    }
  };

  mount();

  return root;
}

/* ------------------------------------------------------------------- player */

export function playView(param) {
  const root = document.createElement('div');
  root.className = 'page';

  const project = db.get(param);
  const spec = project ? project.spec : decodeSpec(param);

  if (!spec) {
    root.innerHTML =
      '<div class="empty">' +
      L({
        ar: 'الرابط لا يحتوي على مشروع صالح.',
        en: 'This link does not contain a valid project.'
      }) +
      '</div>';
    return root;
  }

  if (spec.kind === 'app') {
    root.innerHTML =
      '<div class="page-head"><h1 class="page-title">' + escapeHTML(titleOf(spec)) + '</h1></div>' +
      '<div class="card stack"><p>' +
      L({
        ar: 'هذا تطبيق، وليس لعبة. افتحه من App Studio لمشاهدة واجهاته.',
        en: 'This is an app, not a game. Open it in App Studio to see its screens.'
      }) +
      '</p>' + (project ? '<a class="btn primary" href="#/app/' + project.id + '">App Studio</a>' : '') + '</div>';
    return root;
  }

  if (project) db.play(project.id);

  const bar = document.createElement('div');
  bar.className = 'studio-bar';
  bar.innerHTML =
    '<div class="studio-bar-title">' + escapeHTML(titleOf(spec)) + '</div>' +
    '<span class="pill accent">' + escapeHTML(spec.genreLabel ? L(spec.genreLabel) : spec.genre) + '</span>' +
    '<span class="pill">' + (spec.dim === '3d' ? '3D' : '2D') + '</span>' +
    '<div class="row" style="margin-inline-start:auto">' +
    (project ? '<a class="btn sm" href="#/game/' + project.id + '">' + L({ ar: 'فتح في الاستوديو', en: 'Open in studio' }) + '</a>' : '') +
    '<button class="btn sm" id="play-restart">' + L({ ar: 'إعادة', en: 'Restart' }) + '</button>' +
    '</div>';

  const stage = document.createElement('div');
  stage.className = 'stage';
  stage.innerHTML = '<canvas class="stage-canvas" id="play-canvas"></canvas>';

  root.appendChild(bar);
  root.appendChild(stage);

  const engine = createGame(stage.querySelector('#play-canvas'), spec, {
    dpr: dprFor(spec.quality)
  });
  engine.start();

  bar.querySelector('#play-restart').addEventListener('click', () => engine.restart());

  root.__cleanup = function () {
    engine.destroy();
  };

  return root;
}

/* ------------------------------------------------------------ export/share */

export function exportProjectJSON(project) {
  if (!project || !project.spec) return;
  const name = slug(project.spec.title && project.spec.title.en) + '-project.json';
  const ok = download(
    name,
    JSON.stringify(
      {
        platform: 'AI GAME STUDIO',
        developer: 'OMAR NAJMI',
        ai: 'OMAR AI',
        exportedAt: new Date().toISOString(),
        project: project.spec
      },
      null,
      2
    ),
    'application/json'
  );
  toast(
    ok
      ? L({ ar: 'تم تصدير ملف المشروع', en: 'Project file exported' })
      : L({ ar: 'تعذّر التصدير', en: 'Export failed' }),
    ok ? 'ok' : 'warn'
  );
}

export async function exportGameHTML(project) {
  if (!project || !project.spec) return;
  let engineSrc = '';
  try {
    const res = await fetch('js/engine2d.js');
    if (res && res.ok) engineSrc = await res.text();
  } catch (e) {
    engineSrc = '';
  }

  const cleaned = engineSrc
    .replace(/^export\s+/gm, '')
    .replace(/\bexport\s+/g, '');

  const name = slug(project.spec.title && project.spec.title.en, 'game');
  const specJSON = JSON.stringify(project.spec, null, 2);

  if (!cleaned) {
    exportProjectJSON(project);
    toast(
      L({
        ar: 'تم تصدير بيانات المشروع (تعذّر تضمين المحرك).',
        en: 'Project data exported (the engine could not be embedded).'
      }),
      'warn'
    );
    return;
  }

  const html =
    '<!doctype html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
    '<title>' + escapeHTML(titleOf(project.spec)) + '</title>\n<style>\n' +
    'html,body{margin:0;height:100%;background:#04050c;color:#e9edff;font-family:-apple-system,BlinkMacSystemFont,"SF Arabic","Segoe UI",Tahoma,sans-serif;overflow:hidden}\n' +
    '#stage{position:fixed;inset:0}\ncanvas{display:block;width:100%;height:100%;touch-action:none}\n' +
    '#hint{position:fixed;inset-block-end:0;inset-inline:0;text-align:center;font-size:11px;color:#9aa3c0;padding:6px;background:rgba(6,8,16,.5)}\n' +
    '</style>\n</head>\n<body>\n<div id="stage"><canvas id="game"></canvas></div>\n' +
    '<div id="hint">Arrows / WASD · drag to move · space to shoot</div>\n<script>\n' +
    cleaned +
    '\nvar spec = ' + specJSON + ';\n' +
    'var engine = createGame(document.getElementById("game"), spec, { dpr: Math.min(window.devicePixelRatio || 1, 2) });\n' +
    'engine.start();\n</script>\n</body>\n</html>';

  const ok = download(name + '.html', html, 'text/html;charset=utf-8');
  toast(
    ok
      ? L({ ar: 'تم تصدير اللعبة كملف مستقل', en: 'Game exported as a standalone file' })
      : L({ ar: 'تعذّر التصدير', en: 'Export failed' }),
    ok ? 'ok' : 'warn'
  );
}

export function exportAppHTML(project) {
  if (!project || !project.spec) return;
  const spec = project.spec;
  const accent = (spec.theme && spec.theme.accent) || '#7c5cff';
  const accent2 = (spec.theme && spec.theme.accent2) || '#22d3ee';
  const items = spec.items || [];
  const tabs = spec.tabs || [];

  const rows = items
    .map((item) => {
      return (
        '<div class="item"><div class="thumb">' + escapeHTML(item.ico || '•') + '</div>' +
        '<div class="txt"><b>' + escapeHTML(L(item.t)) + '</b><span>' + escapeHTML(L(item.s)) + '</span></div>' +
        '<div class="price">' + escapeHTML(item.price || '') + '</div></div>'
      );
    })
    .join('');

  const tabRows = tabs
    .map((tab) => '<span>' + escapeHTML(L(tab)) + '</span>')
    .join('');

  const html =
    '<!doctype html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>' + escapeHTML(titleOf(spec)) + '</title>\n<style>\n' +
    'body{margin:0;background:' + escapeHTML((spec.theme && spec.theme.bg1) || '#0b0e1a') + ';color:#e9edff;font-family:-apple-system,BlinkMacSystemFont,"SF Arabic","Segoe UI",Tahoma,sans-serif}\n' +
    '.app{max-width:420px;margin:0 auto;min-height:100vh;background:' + escapeHTML((spec.theme && spec.theme.bg2) || '#131a2e') + ';border-inline:1px solid rgba(255,255,255,.08)}\n' +
    '.head{padding:18px;display:flex;gap:10px;align-items:center;border-bottom:1px solid rgba(255,255,255,.08)}\n' +
    '.logo{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;font-weight:800;background:linear-gradient(140deg,' + escapeHTML(accent) + ',' + escapeHTML(accent2) + ')}\n' +
    '.head b{display:block;font-size:15px}\n.head span{font-size:11.5px;color:#9aa3c0}\n' +
    '.tabs{display:flex;gap:8px;padding:10px 14px;overflow:auto;border-bottom:1px solid rgba(255,255,255,.06)}\n' +
    '.tabs span{font-size:11.5px;color:#9aa3c0;padding:4px 10px;border:1px solid rgba(255,255,255,.12);border-radius:999px;white-space:nowrap}\n' +
    '.tabs span:first-child{color:#fff;border-color:' + escapeHTML(accent) + '}\n' +
    '.body{padding:14px;display:flex;flex-direction:column;gap:10px}\n' +
    '.item{display:flex;gap:10px;align-items:center;padding:11px;border-radius:13px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}\n' +
    '.thumb{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;background:linear-gradient(140deg,' + escapeHTML(accent) + '55,' + escapeHTML(accent2) + '33)}\n' +
    '.txt{flex:1;min-width:0}\n.txt b{display:block;font-size:13px}\n.txt span{font-size:11.5px;color:#9aa3c0}\n' +
    '.price{font-size:12px;font-weight:800;color:#6ee7b7}\n' +
    'footer{padding:14px;text-align:center;font-size:10.5px;color:#9aa3c0;border-top:1px solid rgba(255,255,255,.06)}\n' +
    '</style>\n</head>\n<body>\n<div class="app">\n' +
    '<div class="head"><div class="logo">' + escapeHTML(titleOf(spec).slice(0, 1)) + '</div>' +
    '<div><b>' + escapeHTML(titleOf(spec)) + '</b><span>' + escapeHTML(L(spec.tagline || { ar: '', en: '' })) + '</span></div></div>\n' +
    '<div class="tabs">' + tabRows + '</div>\n' +
    '<div class="body">' + rows + '</div>\n' +
    '<footer>AI GAME STUDIO — Developed by OMAR NAJMI — Powered by OMAR AI</footer>\n' +
    '</div>\n</body>\n</html>';

  const name = slug(spec.title && spec.title.en, 'app');
  const ok = download(name + '-app.html', html, 'text/html;charset=utf-8');
  toast(
    ok
      ? L({ ar: 'تم تصدير التطبيق كملف مستقل', en: 'App exported as a standalone file' })
      : L({ ar: 'تعذّر التصدير', en: 'Export failed' }),
    ok ? 'ok' : 'warn'
  );
}

export function shareLink(spec) {
  try {
    const json = JSON.stringify(spec);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return location.origin + location.pathname + '#/play/' + btoa(binary);
  } catch (e) {
    return location.href;
  }
}

export function decodeSpec(param) {
  try {
    const binary = atob(param);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (e) {
    return null;
  }
}

// Exposed so the account screen can report whether the 3D module loaded.
export async function threeAvailable() {
  try {
    await loadThree();
    return true;
  } catch (e) {
    return false;
  }
}
