// AI GAME STUDIO — shell, router and the app-level screens.
// Developed by OMAR NAJMI. Powered by OMAR AI. Free forever.

import { L, lang, setLang, fmt, dateLabel } from './i18n.js';
import { db } from './store.js';
import { toast, escapeHTML, download, copyText, slug } from './ui.js';
import { planProject, aiView } from './ai.js';
import {
  gameStudioView,
  appStudioView,
  worldView,
  playView,
  exportProjectJSON,
  exportGameHTML,
  exportAppHTML,
  shareLink,
  deviceInfo,
  autoQuality,
  threeAvailable
} from './studios.js';

/* ------------------------------------------------------------------- icons */

const ICONS = {
  home: 'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
  spark: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM18 16l.9 2.1L21 19l-2.1.9L18 22l-.9-2.1L15 19l2.1-.9z',
  pad: 'M7 8h10a5 5 0 0 1 5 5v1a4 4 0 0 1-7.2 2.4L14 16h-4l-.8.4A4 4 0 0 1 2 14v-1a5 5 0 0 1 5-5zM7.5 12v2M6.5 13h2M16 12.5h.01M18 14.5h.01',
  phone: 'M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM11 18h2',
  cube: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  users: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  upload: 'M12 16V4M7 9l5-5 5 5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8'
};

function icon(name, size) {
  const path = ICONS[name] || ICONS.home;
  const s = size || 18;
  return (
    '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" ' +
    'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="' + path + '"/></svg>'
  );
}

/* --------------------------------------------------------------------- nav */

const NAV = [
  { id: 'home', icon: 'home', label: { ar: 'الرئيسية', en: 'Home' } },
  { id: 'ai', icon: 'spark', label: { ar: 'OMAR AI', en: 'OMAR AI' } },
  { id: 'game', icon: 'pad', label: { ar: 'Game Studio', en: 'Game Studio' } },
  { id: 'app', icon: 'phone', label: { ar: 'App Studio', en: 'App Studio' } },
  { id: 'world', icon: 'cube', label: { ar: 'World Builder', en: 'World Builder' } },
  { id: 'library', icon: 'folder', label: { ar: 'مكتبتي', en: 'My Library' } },
  { id: 'community', icon: 'users', label: { ar: 'مجتمع الألعاب', en: 'Community' } },
  { id: 'publish', icon: 'upload', label: { ar: 'مركز النشر', en: 'Publish Center' } },
  { id: 'account', icon: 'user', label: { ar: 'إعدادات الحساب', en: 'Account' } }
];

const TITLES = {
  home: { ar: 'الرئيسية', en: 'Home' },
  ai: { ar: 'OMAR AI', en: 'OMAR AI' },
  game: { ar: 'Game Studio', en: 'Game Studio' },
  app: { ar: 'App Studio', en: 'App Studio' },
  world: { ar: 'World Builder', en: 'World Builder' },
  library: { ar: 'مكتبتي', en: 'My Library' },
  community: { ar: 'مجتمع الألعاب', en: 'Community' },
  publish: { ar: 'مركز النشر', en: 'Publish Center' },
  account: { ar: 'إعدادات الحساب', en: 'Account' },
  play: { ar: 'تشغيل المشروع', en: 'Play project' }
};

/* ------------------------------------------------------------------- shell */

const shell = {
  view: null,
  current: null,
  currentRoute: 'home'
};

function renderShell() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const active = shell.currentRoute;

  sidebar.innerHTML =
    '<div class="brand">' +
    '<div class="brand-logo">AI</div>' +
    '<div class="brand-text"><strong>AI GAME STUDIO</strong>' +
    '<span>' + L({ ar: 'بـ OMAR AI', en: 'by OMAR AI' }) + '</span></div>' +
    '</div>' +
    '<nav class="nav">' +
    NAV.map((item) => {
      const on = item.id === active ? ' is-active' : '';
      return (
        '<a class="nav-item' + on + '" href="#/' + item.id + '" data-route="' + item.id + '">' +
        '<span class="nav-ico">' + icon(item.icon) + '</span>' +
        '<span>' + escapeHTML(L(item.label)) + '</span></a>'
      );
    }).join('') +
    '</nav>' +
    '<div class="side-foot">' +
    '<span class="free-chip">' + L({ ar: 'مجاني بالكامل', en: '100% free' }) + '</span>' +
    '<span>' + L({ ar: 'المطور: OMAR NAJMI', en: 'Developed by OMAR NAJMI' }) + '</span>' +
    '<span>' + L({ ar: 'الذكاء الاصطناعي: OMAR AI', en: 'Powered by OMAR AI' }) + '</span>' +
    '</div>';
}

function renderTopbar() {
  const bar = document.getElementById('topbar');
  if (!bar) return;
  const title = TITLES[shell.currentRoute] || TITLES.home;
  const userName = db.data.user.name || '';
  const initial = (userName || 'A').trim().slice(0, 1).toUpperCase();

  bar.innerHTML =
    '<div class="top-title">' + escapeHTML(L(title)) +
    '<small>' + L({ ar: 'منصة مجانية', en: 'free platform' }) + '</small></div>' +
    '<div class="top-actions">' +
    '<div class="lang-switch">' +
    '<button type="button" class="lang-btn' + (lang === 'ar' ? ' is-on' : '') + '" data-lang="ar">العربية</button>' +
    '<button type="button" class="lang-btn' + (lang === 'en' ? ' is-on' : '') + '" data-lang="en">EN</button>' +
    '</div>' +
    '<a class="user-chip" href="#/account">' +
    '<span class="avatar">' + escapeHTML(initial) + '</span>' +
    '<span class="label">' +
    escapeHTML(userName || L({ ar: 'حسابي', en: 'My account' })) + '</span></a>' +
    '</div>';

  bar.querySelectorAll('[data-lang]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = button.getAttribute('data-lang');
      if (next === lang) return;
      setLang(next);
      db.setSetting('lang', next);
      renderShell();
      renderRoute();
    });
  });
}

/* ------------------------------------------------------------------ router */

const VIEWS = {
  home: homeView,
  ai: aiView,
  game: (param) => gameStudioView(param),
  app: (param) => appStudioView(param),
  world: (param) => worldView(param),
  library: libraryView,
  community: communityView,
  publish: publishView,
  account: accountView,
  play: (param) => playView(param)
};

function parseHash() {
  const raw = String(location.hash || '').replace(/^#\/?/, '');
  const parts = raw.split('/');
  const name = parts.shift() || 'home';
  return { name: name, param: parts.join('/') };
}

function renderRoute() {
  const view = document.getElementById('view');
  if (!view) return;

  if (shell.current && typeof shell.current.__cleanup === 'function') {
    try {
      shell.current.__cleanup();
    } catch (e) {
      /* a failed cleanup must not block navigation */
    }
  }

  const route = parseHash();
  const name = VIEWS[route.name] ? route.name : 'home';
  shell.currentRoute = name;
  renderShell();
  renderTopbar();

  view.innerHTML = '';
  let node = null;
  try {
    node = VIEWS[name](route.param);
  } catch (err) {
    node = document.createElement('div');
    node.className = 'card stack';
    node.innerHTML =
      '<h3>' + L({ ar: 'حدث خطأ في هذه الشاشة', en: 'This screen failed to load' }) + '</h3>' +
      '<p class="hint">' + escapeHTML(String((err && err.message) || err)) + '</p>';
  }

  if (node) {
    view.appendChild(node);
    shell.current = node;
  } else {
    shell.current = null;
  }

  window.scrollTo(0, 0);
  document.title = L(TITLES[name] || TITLES.home) + ' — AI GAME STUDIO';
}

/* ------------------------------------------------------------------- utils */

function statsRow() {
  const projects = db.projects();
  const published = db.published();
  return (
    '<div class="row">' +
    '<div class="stat"><b>' + fmt(projects.length) + '</b><span>' +
    L({ ar: 'مشروع', en: 'projects' }) + '</span></div>' +
    '<div class="stat"><b>' + fmt(published.length) + '</b><span>' +
    L({ ar: 'منشور', en: 'published' }) + '</span></div>' +
    '<div class="stat"><b>0</b><span>' + L({ ar: 'اشتراكات', en: 'subscriptions' }) + '</span></div>' +
    '<div class="stat"><b>0</b><span>' + L({ ar: 'رسوم', en: 'fees' }) + '</span></div>' +
    '</div>'
  );
}

function createFromPrompt(prompt, kind) {
  const text = String(prompt || '').trim();
  if (!text) {
    toast(L({ ar: 'اكتب فكرة المشروع أولاً', en: 'Describe your idea first' }), 'warn');
    return null;
  }
  const plan = planProject(text, { kind: kind });
  const project = db.create(plan.spec, { author: db.data.user.name || '' });
  toast(L({ ar: 'تم إنشاء المشروع', en: 'Project created' }), 'ok');
  return project;
}

function deleteProject(project) {
  const ok = window.confirm(
    L({ ar: 'حذف هذا المشروع نهائياً؟', en: 'Delete this project permanently?' })
  );
  if (!ok) return;
  db.remove(project.id);
  toast(L({ ar: 'تم حذف المشروع', en: 'Project deleted' }), 'ok');
  renderRoute();
}

/* -------------------------------------------------------------------- home */

function homeView() {
  const root = document.createElement('div');
  root.className = 'page';

  const featured = [
    { route: 'game', icon: 'pad', title: { ar: 'Game Studio', en: 'Game Studio' },
      body: { ar: 'ألعاب 2D و3D: مغامرات، سباقات، حروب، عالم مفتوح، محاكاة، رعب، ومتعددة اللاعبين.', en: '2D and 3D games: adventure, racing, war, open world, simulation, horror and multiplayer.' } },
    { route: 'app', icon: 'phone', title: { ar: 'App Studio', en: 'App Studio' },
      body: { ar: 'تطبيقات iPhone وiPad وAndroid والكمبيوتر: متاجر، تعليم، تواصل، ذكاء اصطناعي وترفيه.', en: 'iPhone, iPad, Android and desktop apps: stores, education, social, AI and entertainment.' } },
    { route: 'world', icon: 'cube', title: { ar: 'World Builder', en: 'World Builder' },
      body: { ar: 'مدن وشوارع ومبانٍ ومنازل وسيارات وطبيعة وبحار — بيئات ثلاثية الأبعاد واقعية.', en: 'Cities, streets, buildings, houses, cars, nature and seas — realistic 3D environments.' } },
    { route: 'ai', icon: 'spark', title: { ar: 'OMAR AI', en: 'OMAR AI' },
      body: { ar: 'اكتب الفكرة فقط: يصمم المشروع ويكتب الأكواد والواجهات ويبني العالم ويصلح الأخطاء.', en: 'Write only the idea: it designs, writes code and interfaces, builds the world and fixes errors.' } }
  ];

  const freeItems = [
    { ar: 'بدون اشتراكات شهرية أو سنوية', en: 'No monthly or yearly subscriptions' },
    { ar: 'بدون رسوم لفتح أدوات صناعة الألعاب', en: 'No fees to unlock game-making tools' },
    { ar: 'بدون رسوم لإنشاء التطبيقات', en: 'No fees to create apps' },
    { ar: 'بدون باقات مدفوعة مخفية', en: 'No hidden paid tiers' },
    { ar: 'بدون قيود مدفوعة على أدوات التصميم', en: 'No paid limits on design tools' },
    { ar: 'بدون رسوم على تصدير ملفات المشاريع', en: 'No fees on exporting project files' },
    { ar: 'بدون رسوم على أدوات التحرير', en: 'No fees on editing tools' },
    { ar: 'أدوات ذكاء اصطناعي مجانية على جهازك', en: 'Free AI tools that run on your device' }
  ];

  root.innerHTML =
    '<section class="hero">' +
    '<h1 class="hero-title">AI <span>GAME STUDIO</span></h1>' +
    '<p class="hero-sub">' +
    L({
      ar: 'منصة متكاملة لصناعة الألعاب والتطبيقات بالذكاء الاصطناعي. اكتب فكرتك فقط، ويتولى OMAR AI التصميم والأكواد والواجهات والعوالم والاختبار — ثم شغّل وانشر وشارك.',
      en: 'A complete platform for making games and apps with AI. Write your idea, and OMAR AI takes care of the design, the code, the interfaces, the worlds and the testing — then run, publish and share.'
    }) +
    '</p>' +
    '<div class="hero-actions">' +
    '<a class="btn primary" href="#/ai">' + L({ ar: 'ابدأ بفكرة', en: 'Start with an idea' }) + '</a>' +
    '<a class="btn" href="#/game">Game Studio</a>' +
    '<a class="btn" href="#/app">App Studio</a>' +
    '<a class="btn ghost" href="#/world">World Builder</a>' +
    '</div>' +
    '<div class="credit-line">' +
    '<span class="pill accent">' + L({ ar: 'المطور: OMAR NAJMI', en: 'Developed by OMAR NAJMI' }) + '</span>' +
    '<span class="pill">' + L({ ar: 'الذكاء الاصطناعي: OMAR AI', en: 'Powered by OMAR AI' }) + '</span>' +
    '<span class="pill free">' + L({ ar: 'مجاني بالكامل', en: 'Free forever' }) + '</span>' +
    '</div>' +
    '</section>' +
    '<div class="row">' + statsRow() + '</div>' +
    '<div class="card stack">' +
    '<div class="section-title">' + L({ ar: 'ابدأ الآن', en: 'Start now' }) + '</div>' +
    '<div class="field"><span>' + L({ ar: 'فكرة اللعبة أو التطبيق', en: 'Your game or app idea' }) + '</span>' +
    '<textarea id="home-prompt" rows="3" placeholder="' +
    L({ ar: 'مثال: لعبة سباق سيارات ثلاثية الأبعاد بجودة 4K في مدينة ساحلية', en: 'e.g. a 3D racing game in 4K set in a coastal city' }) +
    '"></textarea></div>' +
    '<div class="row">' +
    '<button class="btn primary" id="home-create">' + L({ ar: 'أنشئ بـ OMAR AI', en: 'Create with OMAR AI' }) + '</button>' +
    '<button class="btn" id="home-app">' + L({ ar: 'أنشئ تطبيقاً', en: 'Create an app' }) + '</button>' +
    '<span class="hint">' + L({ ar: 'يمكنك التعديل لاحقاً بالأوامر النصية.', en: 'You can change everything later with text commands.' }) + '</span>' +
    '</div></div>' +
    '<div class="card stack">' +
    '<div class="section-title">' + L({ ar: 'ضمان المجانية الكاملة', en: 'The free-forever guarantee' }) + '</div>' +
    '<div class="free-list">' +
    freeItems.map((item) => '<div class="free-item"><b>✓</b><span>' + escapeHTML(L(item)) + '</span></div>').join('') +
    '</div>' +
    '<p class="hint">' +
    L({
      ar: 'قد تحتاج نماذج الذكاء الاصطناعي الكبيرة أو الاستضافة السحابية إلى موارد مدفوعة، لذلك يعتمد OMAR AI على توليد محلي مفتوح المصدر داخل المنصة، وأي خدمة خارجية اختيارية تُوضّح تكلفتها قبل الاستخدام.',
      en: 'Large AI models and cloud hosting can require paid resources, so OMAR AI generates locally inside the platform, and any optional external service states its cost before use.'
    }) +
    '</p></div>' +
    '<div class="grid cols-2">' +
    featured.map((feature) => {
      return (
        '<a class="card clickable" href="#/' + feature.route + '" style="text-decoration:none;color:inherit">' +
        '<div class="card-ico">' + icon(feature.icon, 20) + '</div>' +
        '<h3>' + escapeHTML(L(feature.title)) + '</h3>' +
        '<p>' + escapeHTML(L(feature.body)) + '</p></a>'
      );
    }).join('') +
    '</div>' +
    '<div class="card stack">' +
    '<div class="section-title">' + L({ ar: 'الجودة', en: 'Quality' }) + '</div>' +
    '<div class="grid cols-2">' +
    '<div class="card flat"><h3>Full HD</h3><p>' +
    L({ ar: 'دقة 1920×1080، رسومات واضحة، وإضاءة وظلال عالية الجودة.', en: '1920×1080, crisp graphics, high quality lighting and shadows.' }) +
    '</p></div>' +
    '<div class="card flat"><h3>4K Ultra HD</h3><p>' +
    L({ ar: 'دقة 3840×2160، تفاصيل دقيقة، خامات عالية الجودة، وإضاءة وانعكاسات وظلال متطورة.', en: '3840×2160, fine detail, high quality materials, advanced lighting, reflections and shadows.' }) +
    '</p></div>' +
    '</div>' +
    '<p class="hint">' +
    L({
      ar: 'يُضبط مستوى الجودة تلقائياً حسب قدرة الجهاز، لتعمل المشاريع على الهواتف والكمبيوتر دون التضحية بالأداء.',
      en: 'Quality is chosen automatically from the device capability, so projects run on phones and computers without wasting performance.'
    }) +
    '</p></div>';

  root.querySelector('#home-create').addEventListener('click', () => {
    const project = createFromPrompt(root.querySelector('#home-prompt').value, 'game');
    if (project) location.hash = '#/game/' + project.id;
  });

  root.querySelector('#home-app').addEventListener('click', () => {
    const value = root.querySelector('#home-prompt').value;
    const project = createFromPrompt(value || 'تطبيق متجر إلكتروني للهواتف', 'app');
    if (project) location.hash = '#/app/' + project.id;
  });

  return root;
}

/* ----------------------------------------------------------------- library */

function projectCard(project) {
  const spec = project.spec || {};
  const isApp = spec.kind === 'app';
  const title = (spec.title && (spec.title[lang] || spec.title.en)) || 'Project';
  const theme = spec.theme || {};

  const card = document.createElement('div');
  card.className = 'proj-card';
  card.innerHTML =
    '<div class="proj-thumb" style="background:linear-gradient(140deg,' +
    escapeHTML(theme.bg1 || '#1b2440') + ',' + escapeHTML(theme.bg2 || theme.accent || '#4f46e5') + ')">' +
    escapeHTML(isApp ? 'APP' : spec.dim === '3d' ? '3D' : '2D') + '</div>' +
    '<div class="proj-title">' + escapeHTML(title) + '</div>' +
    '<div class="proj-meta">' +
    '<span class="pill">' + escapeHTML(isApp ? L({ ar: 'تطبيق', en: 'App' }) : L(spec.genreLabel || { ar: 'لعبة', en: 'Game' })) + '</span>' +
    (project.published ? '<span class="pill free">' + L({ ar: 'منشور', en: 'Published' }) + '</span>' : '') +
    (project.demo ? '<span class="pill accent">' + L({ ar: 'نموذج', en: 'Sample' }) + '</span>' : '') +
    '<span>' + escapeHTML(dateLabel(project.updated)) + '</span>' +
    '</div>';

  const actions = document.createElement('div');
  actions.className = 'proj-actions';

  const open = document.createElement('a');
  open.className = 'btn sm primary';
  open.href = '#' + (isApp ? '/app/' : '/game/') + project.id;
  open.textContent = L({ ar: 'افتح', en: 'Open' });
  actions.appendChild(open);

  if (!isApp) {
    const play = document.createElement('a');
    play.className = 'btn sm';
    play.href = '#/play/' + project.id;
    play.textContent = L({ ar: 'شغّل', en: 'Run' });
    actions.appendChild(play);
  }

  const publishBtn = document.createElement('button');
  publishBtn.type = 'button';
  publishBtn.className = 'btn sm ok';
  publishBtn.textContent = project.published
    ? L({ ar: 'إلغاء النشر', en: 'Unpublish' })
    : L({ ar: 'نشر', en: 'Publish' });
  publishBtn.addEventListener('click', () => {
    if (project.published) db.unpublish(project.id);
    else db.publish(project.id);
    toast(L({ ar: 'تم تحديث حالة النشر', en: 'Publishing updated' }), 'ok');
    renderRoute();
  });
  actions.appendChild(publishBtn);

  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'btn sm';
  exportBtn.textContent = L({ ar: 'تصدير', en: 'Export' });
  exportBtn.addEventListener('click', () => {
    if (isApp) exportAppHTML(project);
    else exportGameHTML(project);
  });
  actions.appendChild(exportBtn);

  const share = document.createElement('button');
  share.type = 'button';
  share.className = 'btn sm ghost';
  share.textContent = L({ ar: 'مشاركة', en: 'Share' });
  share.addEventListener('click', () => {
    const link = shareLink(project.spec);
    copyText(link).then((ok) => {
      toast(ok ? L({ ar: 'تم نسخ الرابط', en: 'Link copied' }) : link, ok ? 'ok' : 'warn');
    });
  });
  actions.appendChild(share);

  const dup = document.createElement('button');
  dup.type = 'button';
  dup.className = 'btn sm ghost';
  dup.textContent = L({ ar: 'نسخة', en: 'Copy' });
  dup.addEventListener('click', () => {
    db.duplicate(project.id);
    toast(L({ ar: 'تم إنشاء نسخة', en: 'Copy created' }), 'ok');
    renderRoute();
  });
  actions.appendChild(dup);

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'btn sm danger';
  del.textContent = L({ ar: 'حذف', en: 'Delete' });
  del.addEventListener('click', () => deleteProject(project));
  actions.appendChild(del);

  card.appendChild(actions);
  return card;
}

function libraryView() {
  const root = document.createElement('div');
  root.className = 'page';
  const projects = db.projects();

  root.innerHTML =
    '<div class="page-head"><div class="stack">' +
    '<h1 class="page-title">' + L({ ar: 'مكتبتي', en: 'My Library' }) + '</h1>' +
    '<p class="page-sub">' +
    L({ ar: 'كل مشاريعك محفوظة على جهازك. افتحها، شغّلها، صدّرها، أو انشرها متى شئت.', en: 'Every project is stored on your device. Open it, run it, export it, or publish it whenever you like.' }) +
    '</p></div></div>';

  if (!projects.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML =
      L({ ar: 'لا توجد مشاريع بعد.', en: 'No projects yet.' }) +
      ' <a href="#/ai">' + L({ ar: 'ابدأ بفكرة', en: 'Start with an idea' }) + '</a>';
    root.appendChild(empty);
    return root;
  }

  const grid = document.createElement('div');
  grid.className = 'grid';
  projects.forEach((project) => {
    if (!project.spec) return;
    grid.appendChild(projectCard(project));
  });
  root.appendChild(grid);
  return root;
}

/* --------------------------------------------------------------- community */

function communityCard(project) {
  const spec = project.spec || {};
  const title = (spec.title && (spec.title[lang] || spec.title.en)) || 'Project';
  const rating = db.rating(project.id);
  const comments = db.comments(project.id);

  const card = document.createElement('div');
  card.className = 'pub-card';

  card.innerHTML =
    '<div class="row between">' +
    '<div class="stack" style="gap:2px;min-width:0">' +
    '<div class="proj-title">' + escapeHTML(title) + '</div>' +
    '<div class="proj-meta">' +
    '<span class="pill accent">' + escapeHTML(spec.kind === 'app' ? L({ ar: 'تطبيق', en: 'App' }) : L(spec.genreLabel || { ar: 'لعبة', en: 'Game' })) + '</span>' +
    '<span class="pill">' + escapeHTML(project.author || 'OMAR AI') + '</span>' +
    '<span>' + fmt(project.plays || 0) + ' ' + L({ ar: 'تشغيل', en: 'plays' }) + '</span>' +
    '</div></div>' +
    '<div class="stars" data-stars="' + project.id + '">' +
    [1, 2, 3, 4, 5]
      .map((n) => '<button type="button" class="star' + (n <= Math.round(rating.avg) ? ' on' : '') + '" data-rate="' + n + '">★</button>')
      .join('') +
    '</div>' +
    '</div>' +
    '<div class="rate-line">' +
    '<span>' + (rating.count ? rating.avg.toFixed(1) + ' / 5 — ' + fmt(rating.count) + ' ' + L({ ar: 'تقييم', en: 'votes' }) : L({ ar: 'لا تقييمات بعد', en: 'No ratings yet' })) + '</span>' +
    '</div>';

  const actions = document.createElement('div');
  actions.className = 'proj-actions';

  if (spec.kind !== 'app') {
    const play = document.createElement('a');
    play.className = 'btn sm primary';
    play.href = '#/play/' + project.id;
    play.textContent = L({ ar: 'جرّب الآن', en: 'Try it' });
    actions.appendChild(play);
  }

  const share = document.createElement('button');
  share.type = 'button';
  share.className = 'btn sm';
  share.textContent = L({ ar: 'مشاركة', en: 'Share' });
  share.addEventListener('click', () => {
    const link = shareLink(project.spec);
    copyText(link).then((ok) => {
      toast(ok ? L({ ar: 'تم نسخ الرابط', en: 'Link copied' }) : link, ok ? 'ok' : 'warn');
    });
  });
  actions.appendChild(share);

  const open = document.createElement('a');
  open.className = 'btn sm ghost';
  open.href = '#' + (spec.kind === 'app' ? '/app/' : '/game/') + project.id;
  open.textContent = L({ ar: 'الاستوديو', en: 'Studio' });
  actions.appendChild(open);

  card.appendChild(actions);

  card.querySelectorAll('[data-rate]').forEach((button) => {
    button.addEventListener('click', () => {
      db.rate(project.id, Number(button.getAttribute('data-rate')));
      toast(L({ ar: 'شكراً لتقييمك', en: 'Thanks for rating' }), 'ok');
      renderRoute();
    });
  });

  const list = document.createElement('div');
  list.className = 'stack';
  list.style.gap = '6px';
  if (comments.length) {
    comments.slice(0, 3).forEach((comment) => {
      const row = document.createElement('div');
      row.className = 'cmt';
      row.innerHTML =
        '<b>' + escapeHTML(comment.by) + '</b> ' +
        '<span class="when">' + escapeHTML(dateLabel(comment.at)) + '</span>' +
        '<div>' + escapeHTML(comment.text) + '</div>';
      list.appendChild(row);
    });
  } else {
    const row = document.createElement('div');
    row.className = 'hint';
    row.textContent = L({ ar: 'لا تعليقات بعد — كن أول من يعلّق.', en: 'No comments yet — be the first.' });
    list.appendChild(row);
  }
  card.appendChild(list);

  const form = document.createElement('div');
  form.className = 'cmt-form';
  form.innerHTML =
    '<input type="text" placeholder="' + L({ ar: 'اكتب تعليقاً…', en: 'Write a comment…' }) + '" aria-label="comment">' +
    '<button type="button" class="btn sm">' + L({ ar: 'إضافة', en: 'Add' }) + '</button>';
  const input = form.querySelector('input');
  const add = () => {
    const text = input.value.trim();
    if (!text) return;
    db.comment(project.id, text);
    toast(L({ ar: 'تم إضافة التعليق', en: 'Comment added' }), 'ok');
    renderRoute();
  };
  form.querySelector('button').addEventListener('click', add);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') add();
  });
  card.appendChild(form);

  return card;
}

function communityView() {
  const root = document.createElement('div');
  root.className = 'page';
  const published = db.published();

  root.innerHTML =
    '<div class="page-head"><div class="stack">' +
    '<h1 class="page-title">' + L({ ar: 'مجتمع الألعاب', en: 'Community' }) + '</h1>' +
    '<p class="page-sub">' +
    L({
      ar: 'جرّب ألعاب وتطبيقات المستخدمين، قيّمها، وعلّق عليها. نشر أي مشروع مجاني بلا رسوم.',
      en: 'Try other users’ games and apps, rate them and comment. Publishing any project is free.'
    }) +
    '</p></div></div>';

  if (!published.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML =
      L({ ar: 'لا مشاريع منشورة بعد.', en: 'Nothing published yet.' }) +
      ' <a href="#/publish">' + L({ ar: 'انشر مشروعك الأول', en: 'Publish your first project' }) + '</a>';
    root.appendChild(empty);
    return root;
  }

  const grid = document.createElement('div');
  grid.className = 'grid cols-2';
  published.forEach((project) => {
    if (!project.spec) return;
    grid.appendChild(communityCard(project));
  });
  root.appendChild(grid);
  return root;
}

/* ----------------------------------------------------------------- publish */

function publishView() {
  const root = document.createElement('div');
  root.className = 'page';
  const projects = db.projects();

  root.innerHTML =
    '<div class="page-head"><div class="stack">' +
    '<h1 class="page-title">' + L({ ar: 'مركز النشر', en: 'Publish Center' }) + '</h1>' +
    '<p class="page-sub">' +
    L({ ar: 'شغّل مشروعك، اختبره، صدّر ملفاته، ثم انشره في المجتمع — كل ذلك مجاناً.', en: 'Run the project, test it, export its files, then publish it to the community — all for free.' }) +
    '</p></div></div>';

  if (!projects.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML =
      L({ ar: 'لا توجد مشاريع للنشر بعد.', en: 'No projects to publish yet.' }) +
      ' <a href="#/ai">' + L({ ar: 'أنشئ مشروعاً', en: 'Create a project' }) + '</a>';
    root.appendChild(empty);
    return root;
  }

  const picker = document.createElement('div');
  picker.className = 'card stack';
  picker.innerHTML =
    '<div class="section-title">' + L({ ar: 'اختر المشروع', en: 'Choose a project' }) + '</div>' +
    '<select id="pub-select">' +
    projects
      .map((project) => {
        const spec = project.spec || {};
        const title = (spec.title && (spec.title[lang] || spec.title.en)) || 'Project';
        return '<option value="' + project.id + '">' + escapeHTML(title) +
          (project.published ? ' — ' + L({ ar: 'منشور', en: 'published' }) : '') + '</option>';
      })
      .join('') +
    '</select>' +
    '<div class="studio-actions" id="pub-actions"></div>' +
    '<div class="divider"></div>' +
    '<div class="section-title">' + L({ ar: 'خطوات التحقق قبل النشر', en: 'Checks before publishing' }) + '</div>' +
    '<div class="checklist">' +
    [
      { ar: 'شغّل المشروع واختبره داخل الاستوديو', en: 'Run the project and test it inside the studio' },
      { ar: 'اضبط الجودة (Full HD أو 4K) حسب الجهاز', en: 'Set the quality (Full HD or 4K) for the device' },
      { ar: 'احفظ المشروع', en: 'Save the project' },
      { ar: 'صدّر ملفات المشروع كنسخة احتياطية', en: 'Export the project files as a backup' },
      { ar: 'انشر في مجتمع الألعاب أو شارك الرابط', en: 'Publish to the community or share the link' }
    ]
      .map((item) => '<div class="check"><span class="tick">✓</span><span>' + escapeHTML(L(item)) + '</span></div>')
      .join('') +
    '</div>';

  root.appendChild(picker);

  const actions = picker.querySelector('#pub-actions');
  const select = picker.querySelector('#pub-select');

  function currentProject() {
    return db.get(select.value);
  }

  function paintActions() {
    const project = currentProject();
    if (!project) {
      actions.innerHTML = '';
      return;
    }
    const spec = project.spec || {};
    const isApp = spec.kind === 'app';
    actions.innerHTML =
      '<a class="btn primary" href="#" id="pub-run">' + L({ ar: 'تشغيل / اختبار', en: 'Run / test' }) + '</a>' +
      '<button type="button" class="btn" id="pub-export">' + L({ ar: isApp ? 'تنزيل ملفات التطبيق' : 'تنزيل ملفات اللعبة', en: isApp ? 'Download app files' : 'Download game files' }) + '</button>' +
      '<button type="button" class="btn" id="pub-json">' + L({ ar: 'تصدير JSON', en: 'Export JSON' }) + '</button>' +
      '<button type="button" class="btn ok" id="pub-publish">' + L({ ar: project.published ? 'إلغاء النشر' : 'نشر', en: project.published ? 'Unpublish' : 'Publish' }) + '</button>' +
      '<button type="button" class="btn ghost" id="pub-share">' + L({ ar: 'نسخ رابط المشاركة', en: 'Copy share link' }) + '</button>';

    actions.querySelector('#pub-run').addEventListener('click', (e) => {
      e.preventDefault();
      location.hash = isApp ? '#/app/' + project.id : '#/play/' + project.id;
    });

    actions.querySelector('#pub-export').addEventListener('click', () => {
      if (isApp) exportAppHTML(project);
      else exportGameHTML(project);
    });

    actions.querySelector('#pub-json').addEventListener('click', () => {
      exportProjectJSON(project);
    });

    actions.querySelector('#pub-publish').addEventListener('click', () => {
      if (project.published) db.unpublish(project.id);
      else db.publish(project.id);
      toast(L({ ar: 'تم تحديث حالة النشر', en: 'Publishing updated' }), 'ok');
      paintActions();
      renderRoute();
    });

    actions.querySelector('#pub-share').addEventListener('click', () => {
      const link = shareLink(project.spec);
      copyText(link).then((ok) => {
        toast(ok ? L({ ar: 'تم نسخ رابط المشاركة', en: 'Share link copied' }) : link, ok ? 'ok' : 'warn');
      });
    });
  }

  paintActions();
  select.addEventListener('change', paintActions);

  const stores = document.createElement('div');
  stores.className = 'card stack';
  stores.innerHTML =
    '<div class="section-title">' + L({ ar: 'متطلبات المتاجر الخارجية', en: 'External store requirements' }) + '</div>' +
    '<p class="hint">' +
    L({
      ar: 'النشر داخل المنصة والمشاركة مجانيان بالكامل. أما النشر في متاجر خارجية فقد يفرض رسوم حساب مطوّر مستقلة تخص المتجر نفسه، وهي اختيارية تماماً.',
      en: 'Publishing inside the platform and sharing are completely free. Publishing to external stores may require their own developer account fees, which are entirely optional.'
    }) +
    '</p>' +
    '<div class="grid cols-2">' +
    [
      { name: 'Apple App Store', price: '$99 / ' + L({ ar: 'سنة', en: 'year' }), note: { ar: 'لنشر تطبيقات iPhone وiPad', en: 'For iPhone and iPad apps' } },
      { name: 'Google Play', price: '$25 ' + L({ ar: 'مرة واحدة', en: 'one time' }), note: { ar: 'لنشر تطبيقات Android', en: 'For Android apps' } },
      { name: 'Steam', price: '$100 / ' + L({ ar: 'لكل لعبة', en: 'per game' }), note: { ar: 'لألعاب الكمبيوتر', en: 'For desktop games' } },
      { name: 'itch.io', price: L({ ar: 'مجاني', en: 'Free' }), note: { ar: 'نشر ألعاب مستقلة', en: 'Independent game publishing' } }
    ]
      .map((store) => {
        return (
          '<div class="store-card"><b>' + escapeHTML(store.name) + '</b>' +
          '<span class="price">' + escapeHTML(store.price) + '</span>' +
          '<span class="hint">' + escapeHTML(L(store.note)) + '</span></div>'
        );
      })
      .join('') +
    '</div>' +
    '<p class="hint">' +
    L({
      ar: 'يمكنك أيضاً نشر المشروع كموقع ويب مجاناً من زر Run في المنصة، ومشاركة الرابط مع أي شخص.',
      en: 'You can also publish a project as a free website with the Run button in this app, and share the link with anyone.'
    }) +
    '</p>';

  root.appendChild(stores);
  return root;
}

/* ----------------------------------------------------------------- account */

function accountView() {
  const root = document.createElement('div');
  root.className = 'page';
  const info = deviceInfo();
  const name = db.data.user.name || '';

  root.innerHTML =
    '<div class="page-head"><div class="stack">' +
    '<h1 class="page-title">' + L({ ar: 'إعدادات الحساب', en: 'Account' }) + '</h1>' +
    '<p class="page-sub">' +
    L({ ar: 'الملف الشخصي موجود على جهازك، دون تسجيل أو بريد إلكتروني.', en: 'Your profile lives on your device — no sign-up, no email.' }) +
    '</p></div></div>' +
    '<div class="grid cols-2">' +
    '<div class="card stack">' +
    '<div class="row"><div class="avatar lg">' + escapeHTML((name || 'A').slice(0, 1).toUpperCase()) + '</div>' +
    '<div class="stack" style="gap:2px"><div class="proj-title">' +
    escapeHTML(name || L({ ar: 'لاعب', en: 'Player' })) + '</div>' +
    '<span class="hint">' + escapeHTML(dateLabel(db.data.user.joined)) + '</span></div></div>' +
    '<div class="field"><span>' + L({ ar: 'اسم الملف الشخصي', en: 'Profile name' }) + '</span>' +
    '<input type="text" id="acc-name" maxlength="40" value="' + escapeHTML(name) + '"></div>' +
    '<button class="btn primary" id="acc-save">' + L({ ar: 'حفظ الاسم', en: 'Save name' }) + '</button>' +
    '<button class="btn" id="acc-share-app">' + L({ ar: 'شارك رابط التطبيق', en: 'Share the app link' }) + '</button>' +
    '</div>' +
    '<div class="card stack">' +
    '<div class="section-title">' + L({ ar: 'التفضيلات', en: 'Preferences' }) + '</div>' +
    '<div class="field"><span>' + L({ ar: 'اللغة', en: 'Language' }) + '</span>' +
    '<div class="lang-switch"><button type="button" class="lang-btn' + (lang === 'ar' ? ' is-on' : '') + '" data-acc-lang="ar">العربية</button>' +
    '<button type="button" class="lang-btn' + (lang === 'en' ? ' is-on' : '') + '" data-acc-lang="en">English</button></div></div>' +
    '<div class="field"><span>' + L({ ar: 'جودة الرسومات', en: 'Graphics quality' }) + '</span>' +
    '<select id="acc-quality">' +
    '<option value="auto"' + (db.data.settings.quality === 'auto' ? ' selected' : '') + '>' +
    L({ ar: 'تلقائي (مستحسن)', en: 'Auto (recommended)' }) + '</option>' +
    '<option value="hd"' + (db.data.settings.quality === 'hd' ? ' selected' : '') + '>Full HD 1080p</option>' +
    '<option value="4k"' + (db.data.settings.quality === '4k' ? ' selected' : '') + '>4K Ultra HD 2160p</option>' +
    '</select></div>' +
    '<div class="hint">' + L({ ar: 'المستوى المقترح لجهازك', en: 'Suggested for your device' }) + ': ' +
    (autoQuality() === '4k' ? '4K Ultra HD' : 'Full HD') + '</div>' +
    '</div>' +
    '<div class="card stack">' +
    '<div class="section-title">' + L({ ar: 'معلومات الجهاز', en: 'Device information' }) + '</div>' +
    '<dl class="kv">' +
    '<dt>' + L({ ar: 'المنصة', en: 'Platform' }) + '</dt><dd>' + escapeHTML(info.platform || '—') + '</dd>' +
    '<dt>' + L({ ar: 'الشاشة', en: 'Screen' }) + '</dt><dd>' + escapeHTML(info.width + '×' + info.height) + '</dd>' +
    '<dt>' + L({ ar: 'كثافة البكسل', en: 'Pixel ratio' }) + '</dt><dd>' + escapeHTML(String(info.dpr)) + '</dd>' +
    '<dt>' + L({ ar: 'أنوية المعالج', en: 'CPU cores' }) + '</dt><dd>' + escapeHTML(String(info.cores || '—')) + '</dd>' +
    '<dt>' + L({ ar: 'كرت الرسوم', en: 'GPU' }) + '</dt><dd>' + escapeHTML(info.gpu || '—') + '</dd>' +
    '<dt>' + L({ ar: 'محرك 3D', en: '3D engine' }) + '</dt><dd id="acc-three">' +
    L({ ar: 'جارٍ التحقق…', en: 'Checking…' }) + '</dd>' +
    '</dl>' +
    '<div class="hint">' + L({ ar: 'تُختار الجودة تلقائياً من هذه المعلومات.', en: 'Quality is chosen automatically from this information.' }) + '</div>' +
    '</div>' +
    '<div class="card stack">' +
    '<div class="section-title">' + L({ ar: 'البيانات والنسخ الاحتياطي', en: 'Data and backup' }) + '</div>' +
    '<button class="btn" id="acc-export">' + L({ ar: 'تنزيل نسخة من كل البيانات', en: 'Download a full backup' }) + '</button>' +
    '<label class="btn" style="cursor:pointer">' + L({ ar: 'استعادة نسخة احتياطية', en: 'Restore a backup' }) +
    '<input type="file" id="acc-import" accept="application/json,.json" style="display:none"></label>' +
    '<button class="btn danger" id="acc-reset">' + L({ ar: 'حذف كل البيانات', en: 'Delete all data' }) + '</button>' +
    '<p class="hint">' +
    L({ ar: 'كل المشاريع والتقييمات والتعليقات تُحفظ في متصفح جهازك فقط.', en: 'All projects, ratings and comments are stored only in this device’s browser.' }) +
    '</p>' +
    '<div class="divider"></div>' +
    '<div class="hint">AI GAME STUDIO — ' + L({ ar: 'المطور: OMAR NAJMI', en: 'Developed by OMAR NAJMI' }) +
    ' — ' + L({ ar: 'الذكاء الاصطناعي: OMAR AI', en: 'Powered by OMAR AI' }) + '</div>' +
    '</div>' +
    '</div>';

  root.querySelector('#acc-save').addEventListener('click', () => {
    db.setName(root.querySelector('#acc-name').value);
    toast(L({ ar: 'تم حفظ الاسم', en: 'Name saved' }), 'ok');
    renderShell();
    renderTopbar();
  });

  root.querySelector('#acc-share-app').addEventListener('click', () => {
    const url = location.origin + location.pathname;
    const shareData = {
      title: 'AI GAME STUDIO',
      text: L({ ar: 'منصة مجانية بالكامل لصناعة الألعاب والتطبيقات بالذكاء الاصطناعي', en: 'A completely free platform for making games and apps with AI' }),
      url: url
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
      return;
    }
    copyText(url).then((ok) => {
      toast(ok ? L({ ar: 'تم نسخ الرابط', en: 'Link copied' }) + ': ' + url : url, ok ? 'ok' : 'warn');
    });
  });

  root.querySelectorAll('[data-acc-lang]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = button.getAttribute('data-acc-lang');
      if (next === lang) return;
      setLang(next);
      db.setSetting('lang', next);
      renderShell();
      renderRoute();
    });
  });

  root.querySelector('#acc-quality').addEventListener('change', (e) => {
    db.setSetting('quality', e.target.value);
    toast(L({ ar: 'تم حفظ إعداد الجودة', en: 'Quality saved' }), 'ok');
  });

  const threeEl = root.querySelector('#acc-three');
  threeAvailable().then((ok) => {
    if (threeEl) {
      threeEl.textContent = ok
        ? L({ ar: 'متاح (three.js)', en: 'Available (three.js)' })
        : L({ ar: 'غير متاح', en: 'Unavailable' });
    }
  });

  root.querySelector('#acc-export').addEventListener('click', () => {
    const ok = download('ai-game-studio-backup.json', db.exportAll(), 'application/json');
    toast(ok ? L({ ar: 'تم تنزيل النسخة الاحتياطية', en: 'Backup downloaded' }) : L({ ar: 'تعذّر التنزيل', en: 'Download failed' }), ok ? 'ok' : 'warn');
  });

  const importInput = root.querySelector('#acc-import');
  importInput.addEventListener('change', () => {
    const file = importInput.files && importInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        db.importAll(String(reader.result || ''));
        setLang(db.data.settings.lang || 'ar');
        toast(L({ ar: 'تمت الاستعادة', en: 'Backup restored' }), 'ok');
        renderShell();
        renderRoute();
      } catch (err) {
        toast(L({ ar: 'الملف غير صالح', en: 'That file is not valid' }), 'warn');
      }
    };
    reader.readAsText(file);
  });

  root.querySelector('#acc-reset').addEventListener('click', () => {
    const ok = window.confirm(
      L({ ar: 'سيتم حذف كل المشاريع والبيانات. هل أنت متأكد؟', en: 'This deletes every project and all data. Are you sure?' })
    );
    if (!ok) return;
    db.reset();
    toast(L({ ar: 'تم حذف البيانات', en: 'Data deleted' }), 'ok');
    renderRoute();
  });

  return root;
}

/* -------------------------------------------------------------------- boot */

function seedCommunity() {
  if (db.data.seeded) return;
  db.markSeeded();
  const samples = [
    { prompt: 'لعبة سباق سيارات ثلاثية الأبعاد في مدينة ساحلية بجودة 4K', plays: 184 },
    { prompt: 'لعبة رعب في مدينة مهجورة ليلاً', plays: 96 },
    { prompt: 'تطبيق تعليمي للأطفال', plays: 63 }
  ];
  samples.forEach((sample, index) => {
    const plan = planProject(sample.prompt);
    const project = db.create(plan.spec, { author: 'OMAR AI', demo: true });
    db.publish(project.id);
    project.plays = sample.plays;
    db.data.ratings[project.id] = [5, 4, 5, 4, 5];
    db.data.comments[project.id] = [
      {
        id: 'sample-' + index,
        text: L({ ar: 'نموذج جاهز من OMAR AI — جرّبه وعدّله كما تشاء.', en: 'A ready sample from OMAR AI — try it and change it as you like.' }),
        by: 'OMAR AI',
        at: Date.now() - 86400000 * (index + 1)
      }
    ];
  });
  db.save();
}

function boot() {
  setLang(db.data.settings.lang === 'en' ? 'en' : 'ar');
  shell.view = document.getElementById('view');
  seedCommunity();

  window.__aigsRerender = renderRoute;
  window.__aigsBooted = true;

  renderShell();
  renderTopbar();
  renderRoute();

  window.addEventListener('hashchange', renderRoute);
}

boot();
