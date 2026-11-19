// OMAR AI — the assistant that turns an idea into a playable project.
// It runs entirely on the device (rule-based planning over open source code),
// which is what keeps the platform free with no subscription and no API key.

import { L, lang } from './i18n.js';
import { db } from './store.js';
import { toast } from './ui.js';

const GAME_WORDS = [
  'لعبة', 'لعبه', 'ألعاب', 'العاب', 'لعب',
  'game', 'games', 'gaming', 'gameplay', 'platformer'
];

const APP_WORDS = [
  'تطبيق', 'تطبيقات', 'برنامج', 'ابل', 'ابليكيشن',
  'app', 'apps', 'application', 'متجر', 'store', 'shop'
];

const MULTI_WORDS = [
  'متعدد اللاعبين', 'متعددة اللاعبين', 'لاعبين', 'اونلاين', 'أونلاين', 'اون لاين',
  'multiplayer', 'online', 'co-op', 'coop', 'pvp'
];

const GENRES = [
  {
    id: 'horror',
    ar: 'رعب',
    en: 'Horror',
    words: ['رعب', 'مرعب', 'مخيف', 'وحش', 'زومبي', 'اشباح', 'أشباح', 'horror', 'scary', 'zombie', 'ghost', 'survival'],
    dim: '3d',
    theme: {
      bg1: '#160b1f', bg2: '#2a0f1f', ground: '#241a2e', player: '#f472b6',
      accent: '#a855f7', enemy: '#ef4444', sky: '#1b1026', sea: '#1e1b4b', road: '#2a2233'
    },
    rules: { speed: 210, hp: 3, enemies: 6, obstacles: 8, collectibles: 8, time: 90, shoot: false }
  },
  {
    id: 'racing',
    ar: 'سباق',
    en: 'Racing',
    words: ['سباق', 'سيارات', 'سيارة', 'عجلة', 'دراجة', 'race', 'racing', 'car', 'drift', 'speed', 'driving'],
    dim: '3d',
    theme: {
      bg1: '#0b1224', bg2: '#101b34', ground: '#1b2540', player: '#fbbf24',
      accent: '#22d3ee', enemy: '#ef4444', sky: '#0d1526', sea: '#0e7490', road: '#141c30'
    },
    rules: { speed: 285, hp: 3, enemies: 4, obstacles: 12, collectibles: 10, time: 80, shoot: false }
  },
  {
    id: 'war',
    ar: 'حرب',
    en: 'War',
    words: ['حرب', 'قتال', 'معركة', 'جيش', 'عسكري', 'دبابة', 'جندي', 'war', 'battle', 'shooter', 'combat', 'army', 'tank', 'soldier', 'fps'],
    dim: '3d',
    theme: {
      bg1: '#111509', bg2: '#1b2410', ground: '#28331a', player: '#a3e635',
      accent: '#f97316', enemy: '#dc2626', sky: '#141a0d', sea: '#0f766e', road: '#2b3320'
    },
    rules: { speed: 235, hp: 5, enemies: 7, obstacles: 10, collectibles: 6, time: 100, shoot: true }
  },
  {
    id: 'openworld',
    ar: 'عالم مفتوح',
    en: 'Open World',
    words: ['عالم مفتوح', 'مدينة', 'مدن', 'شارع', 'شوارع', 'open world', 'openworld', 'city', 'sandbox', 'world'],
    dim: '3d',
    theme: {
      bg1: '#071a1d', bg2: '#0b2530', ground: '#2f7d4f', player: '#fde047',
      accent: '#22d3ee', enemy: '#f97316', sky: '#0e7490', sea: '#0891b2', road: '#1f2937'
    },
    rules: { speed: 245, hp: 4, enemies: 6, obstacles: 9, collectibles: 12, time: 120, shoot: false }
  },
  {
    id: 'simulation',
    ar: 'محاكاة',
    en: 'Simulation',
    words: ['محاكاة', 'مزرعة', 'مطعم', 'إدارة', 'ادارة', 'تجارة', 'simulation', 'sim', 'farm', 'tycoon', 'manage', 'business', 'restaurant'],
    dim: '3d',
    theme: {
      bg1: '#0f1a12', bg2: '#16240f', ground: '#3f8f5b', player: '#34d399',
      accent: '#fbbf24', enemy: '#f87171', sky: '#0b2b25', sea: '#0284c7', road: '#334155'
    },
    rules: { speed: 205, hp: 4, enemies: 3, obstacles: 6, collectibles: 14, time: 120, shoot: false }
  },
  {
    id: 'adventure',
    ar: 'مغامرة',
    en: 'Adventure',
    words: ['مغامرة', 'مغامرات', 'رحلة', 'بطل', 'كنز', 'adventure', 'quest', 'hero', 'treasure', 'explore'],
    dim: '2d',
    theme: {
      bg1: '#0a1622', bg2: '#132b3a', ground: '#2a6f7f', player: '#facc15',
      accent: '#38bdf8', enemy: '#fb7185', sky: '#0d2233', sea: '#0369a1', road: '#1e3a4c'
    },
    rules: { speed: 245, hp: 3, enemies: 5, obstacles: 8, collectibles: 12, time: 100, shoot: false }
  }
];

const DEFAULT_GENRE = {
  id: 'arena',
  ar: 'ساحة',
  en: 'Arena',
  words: [],
  dim: '2d',
  theme: {
    bg1: '#0b1020', bg2: '#141b33', ground: '#1c2540', player: '#7c5cff',
    accent: '#22d3ee', enemy: '#f87171', sky: '#0b1020', sea: '#0e7490', road: '#1b2440'
  },
  rules: { speed: 245, hp: 3, enemies: 6, obstacles: 8, collectibles: 10, time: 90, shoot: false }
};

const TITLES = {
  horror: {
    ar: ['الظلام القادم', 'همس الأرواح', 'بيت الأشباح'],
    en: ['The Coming Dark', 'Whisper of Souls', 'Haunted House']
  },
  racing: {
    ar: ['سرعة الضوء', 'سباق النجوم', 'طريق المجد'],
    en: ['Light Speed', 'Star Racer', 'Road of Glory']
  },
  war: {
    ar: ['خط النار', 'جبهة الصحراء', 'أبطال الميدان'],
    en: ['Line of Fire', 'Desert Front', 'Field Heroes']
  },
  openworld: {
    ar: ['مدينة الأفق', 'عالم بلا حدود', 'شوارع الذهب'],
    en: ['Skyline City', 'World Without Limits', 'Golden Streets']
  },
  simulation: {
    ar: ['إمبراطورية المزرعة', 'مدير المدينة', 'مطعم الأحلام'],
    en: ['Farm Empire', 'City Manager', 'Dream Restaurant']
  },
  adventure: {
    ar: ['كنز الجبال', 'رحلة البطل', 'أسرار الجزيرة'],
    en: ['Mountain Treasure', 'Hero Journey', 'Island Secrets']
  },
  arena: {
    ar: ['ساحة الأبطال', 'تحدي النجوم', 'مغامرة الليل'],
    en: ['Hero Arena', 'Star Challenge', 'Night Quest']
  }
};

const APP_TITLES = {
  store: { ar: ['متجر سريع', 'سوق الجوال', 'متجر الذهب'], en: ['Swift Store', 'Mobile Market', 'Golden Shop'] },
  education: { ar: ['تعلّم بذكاء', 'مدرسة الجيب', 'مسار الدروس'], en: ['Smart Learn', 'Pocket School', 'Lesson Path'] },
  social: { ar: ['حلقة الأصدقاء', 'نبض المجتمع', 'تواصل'], en: ['Friend Circle', 'Community Pulse', 'Connect'] },
  ai: { ar: ['مساعد ذكي', 'عقل رقمي', 'OMAR AI'], en: ['Smart Assistant', 'Digital Mind', 'OMAR AI'] },
  entertainment: { ar: ['عالم الترفيه', 'شاشة', 'مزاج'], en: ['Fun World', 'Screen', 'Mood'] },
  utility: { ar: ['أداة يومية', 'منظّم الحياة', 'لوحة سريعة'], en: ['Daily Tool', 'Life Organizer', 'Quick Panel'] }
};

const APP_WORDS_BY_TYPE = {
  store: ['متجر', 'تسوق', 'بيع', 'منتجات', 'shop', 'store', 'ecommerce', 'market', 'products'],
  education: ['تعليم', 'تعلم', 'مدرسة', 'دورة', 'درس', 'education', 'learn', 'school', 'course', 'study'],
  social: ['تواصل', 'اجتماعي', 'دردشة', 'اصدقاء', 'أصدقاء', 'chat', 'social', 'community', 'friends'],
  ai: ['ذكاء اصطناعي', 'ذكاء', 'مساعد', 'assistant', 'chatbot', 'ai', 'bot'],
  entertainment: ['ترفيه', 'فيديو', 'أفلام', 'افلام', 'موسيقى', 'entertainment', 'video', 'movie', 'music', 'stream']
};

const STEPS = [
  { ar: 'قراءة الفكرة وفهم المطلوب', en: 'Reading the idea and the requirements' },
  { ar: 'تصميم تجربة الاستخدام وقواعد اللعب', en: 'Designing the experience and the game rules' },
  { ar: 'توليد الأكواد والواجهات', en: 'Generating the code and the interfaces' },
  { ar: 'بناء العالم والعناصر', en: 'Building the world and its elements' },
  { ar: 'ضبط الجودة تلقائياً حسب الجهاز', en: 'Tuning quality automatically for the device' },
  { ar: 'اختبار المشروع وتجهيزه للتشغيل', en: 'Testing the project and preparing it to run' }
];

function normalize(value) {
  return String(value || '').toLowerCase();
}

function hashOf(text) {
  let hash = 0;
  const s = String(text || '');
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return hash || 12345;
}

function hasAny(text, words) {
  for (let i = 0; i < words.length; i++) {
    if (text.indexOf(words[i].toLowerCase()) !== -1) return true;
  }
  return false;
}

function pick(list, index) {
  if (!list || !list.length) return '';
  return list[index % list.length];
}

function detectAppType(text) {
  const types = ['store', 'education', 'social', 'ai', 'entertainment'];
  for (let i = 0; i < types.length; i++) {
    if (hasAny(text, APP_WORDS_BY_TYPE[types[i]])) return types[i];
  }
  return 'utility';
}

function appContent(type) {
  if (type === 'store') {
    return {
      tagline: { ar: 'تسوّق كل ما تحتاجه في مكان واحد', en: 'Everything you need in one place' },
      tabs: [
        { ar: 'الرئيسية', en: 'Home' },
        { ar: 'المنتجات', en: 'Products' },
        { ar: 'السلة', en: 'Cart' },
        { ar: 'حسابي', en: 'Profile' }
      ],
      items: [
        { t: { ar: 'ساعة ذكية', en: 'Smart Watch' }, s: { ar: 'إصدار 2025 — مقاومة للماء', en: '2025 edition — water resistant' }, price: '$149', ico: '⌚' },
        { t: { ar: 'سماعات لاسلكية', en: 'Wireless Earbuds' }, s: { ar: 'عزل ضجيج نشط', en: 'Active noise cancelling' }, price: '$89', ico: '🎧' },
        { t: { ar: 'حقيبة سفر', en: 'Travel Backpack' }, s: { ar: 'خفيفة ومتينة', en: 'Light and durable' }, price: '$64', ico: '🎒' },
        { t: { ar: 'شاحن سريع', en: 'Fast Charger' }, s: { ar: '65 واط — ثلاث منافذ', en: '65W — three ports' }, price: '$39', ico: '🔌' },
        { t: { ar: 'هاتف ذكي', en: 'Smartphone' }, s: { ar: 'شاشة 6.7 بوصة', en: '6.7 inch display' }, price: '$699', ico: '📱' },
        { t: { ar: 'حاسوب محمول', en: 'Laptop' }, s: { ar: '16 جيجابايت رام', en: '16GB RAM' }, price: '$1,199', ico: '💻' }
      ]
    };
  }
  if (type === 'education') {
    return {
      tagline: { ar: 'تعلّم خطوة بخطوة مع OMAR AI', en: 'Learn step by step with OMAR AI' },
      tabs: [
        { ar: 'الدروس', en: 'Lessons' },
        { ar: 'التقدم', en: 'Progress' },
        { ar: 'الاختبارات', en: 'Quizzes' },
        { ar: 'حسابي', en: 'Profile' }
      ],
      items: [
        { t: { ar: 'الدرس 1: الأساسيات', en: 'Lesson 1: Basics' }, s: { ar: '12 دقيقة', en: '12 min' }, price: '✓', ico: '📘' },
        { t: { ar: 'الدرس 2: التطبيق العملي', en: 'Lesson 2: Practice' }, s: { ar: '18 دقيقة', en: '18 min' }, price: '✓', ico: '🧪' },
        { t: { ar: 'الدرس 3: المشروع', en: 'Lesson 3: Project' }, s: { ar: '25 دقيقة', en: '25 min' }, price: '✓', ico: '🛠️' },
        { t: { ar: 'اختبار سريع', en: 'Quick quiz' }, s: { ar: '10 أسئلة', en: '10 questions' }, price: '★', ico: '📝' },
        { t: { ar: 'مراجعة نهائية', en: 'Final review' }, s: { ar: 'ملخص شامل', en: 'Full summary' }, price: '★', ico: '🎓' }
      ]
    };
  }
  if (type === 'social') {
    return {
      tagline: { ar: 'شارك لحظاتك وابنِ مجتمعك', en: 'Share your moments and build your community' },
      tabs: [
        { ar: 'الخلاصة', en: 'Feed' },
        { ar: 'الأصدقاء', en: 'Friends' },
        { ar: 'الرسائل', en: 'Messages' },
        { ar: 'حسابي', en: 'Profile' }
      ],
      items: [
        { t: { ar: 'سارة', en: 'Sara' }, s: { ar: 'شاركت صورة من رحلتها', en: 'Shared a photo from her trip' }, price: '♡ 24', ico: '🖼️' },
        { t: { ar: 'خالد', en: 'Khalid' }, s: { ar: 'انضم إلى مجموعة التصميم', en: 'Joined the design group' }, price: '♡ 12', ico: '👥' },
        { t: { ar: 'ليان', en: 'Layan' }, s: { ar: 'نشرت مقطعاً قصيراً', en: 'Posted a short clip' }, price: '♡ 98', ico: '🎬' },
        { t: { ar: 'عمر', en: 'Omar' }, s: { ar: 'يسأل عن أفضل محرر أكواد', en: 'Asking about the best code editor' }, price: '♡ 41', ico: '💬' }
      ]
    };
  }
  if (type === 'ai') {
    return {
      tagline: { ar: 'مساعد ذكي يفهمك ويشتغل معك', en: 'An assistant that understands and works with you' },
      tabs: [
        { ar: 'المحادثة', en: 'Chat' },
        { ar: 'الأدوات', en: 'Tools' },
        { ar: 'الملفات', en: 'Files' },
        { ar: 'الإعدادات', en: 'Settings' }
      ],
      items: [
        { t: { ar: 'اكتب نصاً', en: 'Write text' }, s: { ar: 'مقالات ورسائل ومحتوى', en: 'Articles, messages and content' }, price: '›', ico: '✍️' },
        { t: { ar: 'حلّل ملفاً', en: 'Analyze a file' }, s: { ar: 'ملخصات ونتائج سريعة', en: 'Fast summaries and insights' }, price: '›', ico: '📄' },
        { t: { ar: 'ولّد كوداً', en: 'Generate code' }, s: { ar: 'واجهات ومنطق برمجي', en: 'Interfaces and logic' }, price: '›', ico: '⌨️' },
        { t: { ar: 'صمّم صورة', en: 'Design an image' }, s: { ar: 'أفكار بصرية للمشاريع', en: 'Visual ideas for projects' }, price: '›', ico: '🎨' }
      ]
    };
  }
  if (type === 'entertainment') {
    return {
      tagline: { ar: 'أفلام ومقاطع وموسيقى بلا نهاية', en: 'Films, clips and music without end' },
      tabs: [
        { ar: 'الأفلام', en: 'Movies' },
        { ar: 'المقاطع', en: 'Clips' },
        { ar: 'الموسيقى', en: 'Music' },
        { ar: 'المفضلة', en: 'Saved' }
      ],
      items: [
        { t: { ar: 'الصحراء الكبرى', en: 'The Great Desert' }, s: { ar: 'فيلم وثائقي — 48 دقيقة', en: 'Documentary — 48 min' }, price: '▶', ico: '🎬' },
        { t: { ar: 'ليل المدينة', en: 'City Night' }, s: { ar: 'موسيقى هادئة', en: 'Calm music' }, price: '▶', ico: '🎵' },
        { t: { ar: 'مغامرة الفضاء', en: 'Space Adventure' }, s: { ar: 'مسلسل — 8 حلقات', en: 'Series — 8 episodes' }, price: '▶', ico: '🚀' },
        { t: { ar: 'مقاطع مضحكة', en: 'Funny clips' }, s: { ar: 'مجموعة يومية', en: 'Daily collection' }, price: '▶', ico: '😂' }
      ]
    };
  }
  return {
    tagline: { ar: 'أداة يومية سريعة وبسيطة', en: 'A fast, simple daily tool' },
    tabs: [
      { ar: 'الرئيسية', en: 'Home' },
      { ar: 'المهام', en: 'Tasks' },
      { ar: 'التقارير', en: 'Reports' },
      { ar: 'حسابي', en: 'Profile' }
    ],
    items: [
      { t: { ar: 'مهمة جديدة', en: 'New task' }, s: { ar: 'أضف ما تريد إنجازه', en: 'Add what you want to finish' }, price: '+', ico: '➕' },
      { t: { ar: 'تذكير', en: 'Reminder' }, s: { ar: 'لا تنسَ المواعيد', en: 'Never miss a date' }, price: '›', ico: '⏰' },
      { t: { ar: 'تقرير أسبوعي', en: 'Weekly report' }, s: { ar: 'ملخص الأداء', en: 'Performance summary' }, price: '›', ico: '📊' },
      { t: { ar: 'ملاحظات', en: 'Notes' }, s: { ar: 'أفكار ومسودات', en: 'Ideas and drafts' }, price: '›', ico: '📝' }
    ]
  };
}

export function planProject(prompt, options) {
  const opts = options || {};
  const raw = String(prompt || '').trim();
  const text = normalize(raw);
  const seed = hashOf(raw || String(Date.now()));

  const gameHit = hasAny(text, GAME_WORDS);
  const appHit = hasAny(text, APP_WORDS);
  let kind = appHit && !gameHit ? 'app' : 'game';
  if (opts.kind === 'game' || opts.kind === 'app') kind = opts.kind;

  if (kind === 'app') {
    const appType = opts.appType || detectAppType(text);
    const content = appContent(appType);
    const pool = APP_TITLES[appType] || APP_TITLES.utility;
    const title = {
      ar: pick(pool.ar, seed),
      en: pick(pool.en, seed)
    };
    const spec = {
      kind: 'app',
      appType: appType,
      title: title,
      tagline: content.tagline,
      tabs: content.tabs,
      items: content.items,
      theme: {
        accent: '#7c5cff',
        accent2: '#22d3ee',
        bg1: '#0b0e1a',
        bg2: '#131a2e'
      },
      quality: 'auto',
      seed: seed,
      prompt: raw,
      createdAt: Date.now()
    };

    const reply = {
      ar:
        'فهمت فكرتك: ' + title.ar + '.\n' +
        'هذا ' + L({ ar: 'تطبيق', en: 'app' }) + ' — ' + content.tagline.ar + '.\n' +
        'جهّزت لك الواجهات والشاشات والبيانات، ويمكنك تعديلها بالأوامر النصية في أي وقت.',
      en:
        'Got your idea: ' + title.en + '.\n' +
        'It is an app — ' + content.tagline.en + '.\n' +
        'The interfaces, screens and data are ready, and you can change anything with text commands.'
    };

    return { spec: spec, kind: 'app', steps: STEPS, reply: reply };
  }

  let genre = DEFAULT_GENRE;
  for (let i = 0; i < GENRES.length; i++) {
    if (hasAny(text, GENRES[i].words)) {
      genre = GENRES[i];
      break;
    }
  }

  let dim = genre.dim;
  if (hasAny(text, ['3d', 'ثلاثي', 'ثلاثية', '3 d'])) dim = '3d';
  if (hasAny(text, ['2d', 'ثنائي', 'ثنائية'])) dim = '2d';

  const multiplayer = hasAny(text, MULTI_WORDS);
  const pool = TITLES[genre.id] || TITLES.arena;
  const title = {
    ar: pick(pool.ar, seed),
    en: pick(pool.en, seed)
  };

  const night = hasAny(text, ['ليل', 'ظلام', 'night', 'dark']);
  const sea = !hasAny(text, ['صحراء', 'desert', 'بدون بحر']);

  const spec = {
    kind: 'game',
    genre: genre.id,
    genreLabel: { ar: genre.ar, en: genre.en },
    dim: dim,
    multiplayer: multiplayer,
    title: title,
    theme: genre.theme,
    rules: Object.assign({}, genre.rules),
    world: {
      size: 240,
      buildings: genre.id === 'openworld' ? 34 : 24,
      houses: 14,
      trees: 40,
      cars: multiplayer ? 14 : 10,
      mountains: 8,
      sea: sea,
      beach: sea,
      night: night,
      roads: true
    },
    quality: hasAny(text, ['4k', 'ألترا', 'ultra']) ? '4k' : 'auto',
    seed: seed,
    prompt: raw,
    createdAt: Date.now()
  };

  const dimLabel = dim === '3d' ? '3D' : '2D';
  const reply = {
    ar:
      'فهمت فكرتك: ' + title.ar + '.\n' +
      'النوع: ' + genre.ar + ' — ' + dimLabel + (multiplayer ? ' — متعدد اللاعبين' : '') + '.\n' +
      'جهّزت القواعد والشخصيات والعالم والألوان. اضغط "شغّل" لتجربتها الآن، أو عدّلها بأمر نصي مثل: اجعل الليل، أضف سيارات، أضف مبانٍ.',
    en:
      'Got your idea: ' + title.en + '.\n' +
      'Type: ' + genre.en + ' — ' + dimLabel + (multiplayer ? ' — multiplayer' : '') + '.\n' +
      'The rules, characters, world and palette are ready. Press run to try it, or change it with a command such as: make it night, add cars, add buildings.'
  };

  return { spec: spec, kind: 'game', steps: STEPS, reply: reply };
}

export function looksLikeCommand(text) {
  const t = normalize(text).trim();
  const starters = [
    'عدل', 'عدّل', 'غير', 'غيّر', 'اجعل', 'أضف', 'اضف', 'زد', 'قلل', 'قلّل',
    'أزل', 'ازل', 'احذف', 'بدل', 'بدّل', 'حول', 'حوّل', 'كبر', 'صغر', 'غير الألوان',
    'make', 'add', 'remove', 'change', 'set', 'increase', 'decrease', 'switch',
    'turn', 'bigger', 'smaller'
  ];
  return starters.some((word) => t.indexOf(word) === 0);
}

export function applyCommand(spec, text) {
  const next = JSON.parse(JSON.stringify(spec || {}));
  const t = normalize(text);
  const changed = [];
  const has = (words) => hasAny(t, words);

  if (!next.kind) return { spec: next, changed: changed, ok: false };

  if (next.kind === 'app') {
    if (has(['أضف عنصر', 'اضف عنصر', 'عناصر', 'add item', 'more items'])) {
      next.items = (next.items || []).concat([
        {
          t: { ar: 'عنصر جديد', en: 'New item' },
          s: { ar: 'أضيف بواسطة OMAR AI', en: 'Added by OMAR AI' },
          price: '›',
          ico: '✨'
        }
      ]);
      changed.push({ ar: 'إضافة عنصر إلى الواجهة', en: 'Added an item to the interface' });
    }
    if (has(['داكن', 'dark', 'ليل', 'night'])) {
      next.theme = Object.assign({}, next.theme, { bg1: '#05060f', bg2: '#0b1020' });
      changed.push({ ar: 'تحويل الواجهة إلى الوضع الداكن', en: 'Switched the interface to dark mode' });
    }
    if (has(['فاتح', 'light', 'نهار', 'day'])) {
      next.theme = Object.assign({}, next.theme, { bg1: '#141a2e', bg2: '#1f2740' });
      changed.push({ ar: 'تفتيح ألوان الواجهة', en: 'Lightened the interface' });
    }
    return { spec: next, changed: changed, ok: changed.length > 0 };
  }

  if (!next.world) {
    next.world = {
      size: 240, buildings: 24, houses: 12, trees: 36, cars: 8,
      mountains: 6, sea: true, beach: true, night: false, roads: true
    };
  }
  if (!next.rules) {
    next.rules = { speed: 240, hp: 3, enemies: 6, obstacles: 8, collectibles: 10, time: 90, shoot: false };
  }
  if (!next.theme) next.theme = {};

  if (has(['ليل', 'ظلام', 'night', 'dark'])) {
    next.world.night = true;
    next.theme.bg1 = '#05060f';
    next.theme.bg2 = '#0b1020';
    next.theme.sky = '#04050c';
    changed.push({ ar: 'تحويل المشهد إلى الليل', en: 'Switched the scene to night' });
  } else if (has(['نهار', 'صباح', 'day', 'sunny', 'sunlight'])) {
    next.world.night = false;
    if (!next.theme.bg1 || next.theme.bg1 === '#05060f') {
      next.theme.bg1 = '#0b1020';
      next.theme.bg2 = '#141b33';
    }
    next.theme.sky = '#0e7490';
    changed.push({ ar: 'تحويل المشهد إلى النهار', en: 'Switched the scene to daytime' });
  }

  if (has(['سيارات', 'سيارة', 'cars', 'car'])) {
    next.world.cars = Math.min(40, (next.world.cars || 8) + 8);
    changed.push({ ar: 'زيادة السيارات في العالم', en: 'Added more cars to the world' });
  }

  if (has(['مبانٍ', 'مباني', 'أبراج', 'ابنية', 'buildings', 'city', 'مدينة'])) {
    next.world.buildings = Math.min(80, (next.world.buildings || 20) + 12);
    next.world.houses = Math.min(60, (next.world.houses || 10) + 6);
    changed.push({ ar: 'توسيع المدينة والمباني', en: 'Expanded the city and its buildings' });
  }

  if (has(['أشجار', 'اشجار', 'طبيعة', 'trees', 'nature', 'trees'])) {
    next.world.trees = Math.min(150, (next.world.trees || 30) + 20);
    changed.push({ ar: 'زيادة الأشجار والطبيعة', en: 'Added more trees and nature' });
  }

  if (has(['جبال', 'جبل', 'mountains', 'mountain'])) {
    next.world.mountains = Math.min(24, (next.world.mountains || 6) + 4);
    changed.push({ ar: 'إضافة جبال إلى الأفق', en: 'Added mountains to the horizon' });
  }

  if (has(['بحر', 'شاطئ', 'sea', 'beach', 'ocean'])) {
    next.world.sea = true;
    next.world.beach = true;
    changed.push({ ar: 'إضافة البحر والشاطئ', en: 'Added the sea and the beach' });
  }

  if (has(['أصعب', 'اصعب', 'صعب', 'harder', 'hard', 'difficult'])) {
    next.rules.enemies = Math.min(20, (next.rules.enemies || 5) + 3);
    next.rules.speed = Math.min(420, (next.rules.speed || 240) + 25);
    changed.push({ ar: 'زيادة صعوبة اللعب', en: 'Increased the difficulty' });
  }

  if (has(['أسهل', 'اسهل', 'سهل', 'easier', 'easy'])) {
    next.rules.enemies = Math.max(0, (next.rules.enemies || 5) - 3);
    changed.push({ ar: 'تقليل صعوبة اللعب', en: 'Made the game easier' });
  }

  if (has(['أسرع', 'اسرع', 'سرعة', 'faster', 'speed'])) {
    next.rules.speed = Math.min(460, (next.rules.speed || 240) + 30);
    changed.push({ ar: 'زيادة سرعة اللاعب', en: 'Increased the player speed' });
  }

  if (has(['أبطأ', 'ابطأ', 'slower'])) {
    next.rules.speed = Math.max(120, (next.rules.speed || 240) - 30);
    changed.push({ ar: 'تقليل سرعة اللاعب', en: 'Reduced the player speed' });
  }

  if (has(['أحمر', 'احمر', 'red'])) {
    next.theme.accent = '#ef4444';
    next.theme.player = '#fca5a5';
    changed.push({ ar: 'تغيير الألوان إلى الأحمر', en: 'Changed the palette to red' });
  } else if (has(['أزرق', 'ازرق', 'blue'])) {
    next.theme.accent = '#38bdf8';
    next.theme.player = '#60a5fa';
    changed.push({ ar: 'تغيير الألوان إلى الأزرق', en: 'Changed the palette to blue' });
  } else if (has(['أخضر', 'اخضر', 'green'])) {
    next.theme.accent = '#34d399';
    next.theme.player = '#6ee7b7';
    changed.push({ ar: 'تغيير الألوان إلى الأخضر', en: 'Changed the palette to green' });
  } else if (has(['بنفسجي', 'purple', 'violet'])) {
    next.theme.accent = '#a855f7';
    next.theme.player = '#c4b5fd';
    changed.push({ ar: 'تغيير الألوان إلى البنفسجي', en: 'Changed the palette to purple' });
  }

  if (has(['3d', 'ثلاثي', 'ثلاثية'])) {
    next.dim = '3d';
    changed.push({ ar: 'تحويل المشروع إلى ثلاثي الأبعاد', en: 'Switched the project to 3D' });
  } else if (has(['2d', 'ثنائي', 'ثنائية'])) {
    next.dim = '2d';
    changed.push({ ar: 'تحويل المشروع إلى ثنائي الأبعاد', en: 'Switched the project to 2D' });
  }

  if (has(['4k', 'ألترا', 'ultra'])) {
    next.quality = '4k';
    changed.push({ ar: 'ضبط الجودة على 4K Ultra HD', en: 'Set quality to 4K Ultra HD' });
  } else if (has(['hd', 'full hd', 'عالي'])) {
    next.quality = 'hd';
    changed.push({ ar: 'ضبط الجودة على Full HD', en: 'Set quality to Full HD' });
  }

  return { spec: next, changed: changed, ok: changed.length > 0 };
}

/* --------------------------------------------------------------------------
   The assistant screen
   -------------------------------------------------------------------------- */

let messages = [];
let timers = [];

const SAMPLES = [
  { ar: 'اصنع لعبة سباق سيارات ثلاثية الأبعاد بجودة 4K', en: 'Make a 3D racing game in 4K quality' },
  { ar: 'لعبة حرب عالم مفتوح مع دبابات', en: 'An open world war game with tanks' },
  { ar: 'لعبة رعب في مدينة مهجورة', en: 'A horror game in an abandoned city' },
  { ar: 'لعبة محاكاة مزرعة كبيرة', en: 'A large farm simulation game' },
  { ar: 'تطبيق متجر إلكتروني للهواتف', en: 'A mobile shopping app' },
  { ar: 'تطبيق تعليمي للأطفال', en: 'An education app for children' }
];

function clearTimers() {
  timers.forEach((id) => clearTimeout(id));
  timers = [];
}

function lastProjectId() {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].projectId) return messages[i].projectId;
  }
  return null;
}

export function aiView() {
  const root = document.createElement('div');
  root.className = 'ai-view';

  root.innerHTML =
    '<div class="ai-head">' +
    '<div class="ai-orb"></div>' +
    '<div><div class="ai-title">OMAR AI</div>' +
    '<div class="ai-sub">' +
    L({ ar: 'مساعدك الذكي لصناعة الألعاب والتطبيقات — يعمل على جهازك بدون اشتراك', en: 'Your AI partner for games and apps — runs on your device, no subscription' }) +
    '</div></div>' +
    '<span class="pill free">' +
    L({ ar: 'مجاني بالكامل', en: '100% free' }) +
    '</span>' +
    '</div>' +
    '<div class="chat">' +
    '<div class="chat-log" id="ai-log"></div>' +
    '<div class="chat-foot">' +
    '<div class="chips" id="ai-chips"></div>' +
    '<div class="chat-input">' +
    '<textarea id="ai-in" rows="2" placeholder="' +
    L({ ar: 'اكتب فكرتك… مثال: لعبة مغامرات ثلاثية الأبعاد في مدينة ساحلية', en: 'Describe your idea… e.g. a 3D adventure game in a coastal city' }) +
    '"></textarea>' +
    '<button class="btn primary" id="ai-send">' +
    L({ ar: 'إرسال', en: 'Send' }) +
    '</button>' +
    '</div>' +
    '<div class="hint">' +
    L({ ar: 'أوامر التعديل تعمل أيضاً: "اجعل الليل" — "أضف سيارات" — "اجعل الألوان حمراء".', en: 'Editing commands work too: "make it night" — "add cars" — "make the colors red".' }) +
    '</div>' +
    '</div></div>';

  const $ = (sel) => root.querySelector(sel);

  function welcome() {
    const box = document.createElement('div');
    box.className = 'msg ai';
    box.innerHTML =
      '<div class="msg-ac">OM</div>' +
      '<div class="msg-body">' +
      L({
        ar: 'مرحباً! أنا OMAR AI.\nاكتب فكرة لعبة أو تطبيق، وسأصمم المشروع وأكتب الأكواد والواجهات وأبني العالم، ثم أجهّزه للتشغيل والنشر.\n\nكل الأدوات هنا مجانية: لا اشتراكات، لا رسوم على التصدير أو التحرير.',
        en: 'Hello! I am OMAR AI.\nDescribe a game or an app idea and I will design the project, write the code and interfaces, build the world, and prepare it to run and publish.\n\nEvery tool here is free: no subscriptions, no fees on export or editing.'
      }) +
      '</div>';
    return box;
  }

  function projectRoute(id) {
    const project = db.get(id);
    if (!project) return '#/library';
    if (project.spec.kind === 'app') return '#/app/' + id;
    return '#/game/' + id;
  }

  function bubble(message) {
    const wrap = document.createElement('div');
    wrap.className = 'msg ' + (message.role === 'user' ? 'user' : 'ai');

    if (message.role !== 'user') {
      const ac = document.createElement('div');
      ac.className = 'msg-ac';
      ac.textContent = 'OM';
      wrap.appendChild(ac);
    }

    const body = document.createElement('div');
    body.className = 'msg-body';
    body.textContent = L(message.text);

    if (message.steps && message.steps.length) {
      const steps = document.createElement('div');
      steps.className = 'steps';
      const done = message.done || 0;
      message.steps.forEach((step, index) => {
        const row = document.createElement('div');
        row.className = 'step' + (index < done ? ' is-done' : '');
        row.innerHTML =
          '<span class="dot">' + (index < done ? '✓' : '') + '</span><span>' + L(step) + '</span>';
        steps.appendChild(row);
      });
      body.appendChild(steps);
    }

    if (message.changed && message.changed.length) {
      const steps = document.createElement('div');
      steps.className = 'steps';
      message.changed.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'step is-done';
        row.innerHTML = '<span class="dot">✓</span><span>' + L(item) + '</span>';
        steps.appendChild(row);
      });
      body.appendChild(steps);
    }

    if (message.projectId && message.ready) {
      const actions = document.createElement('div');
      actions.className = 'msg-actions';

      const open = document.createElement('a');
      open.className = 'btn sm primary';
      open.href = projectRoute(message.projectId);
      open.textContent = L({ ar: 'افتح الاستوديو', en: 'Open studio' });
      actions.appendChild(open);

      const play = document.createElement('a');
      play.className = 'btn sm';
      play.href = '#/play/' + message.projectId;
      play.textContent = L({ ar: 'شغّل الآن', en: 'Run now' });
      actions.appendChild(play);

      const project = db.get(message.projectId);
      if (project && project.spec.kind === 'game' && project.spec.dim === '3d') {
        const world = document.createElement('a');
        world.className = 'btn sm';
        world.href = '#/world/' + message.projectId;
        world.textContent = L({ ar: 'World Builder', en: 'World Builder' });
        actions.appendChild(world);
      }

      body.appendChild(actions);
    }

    wrap.appendChild(body);
    return wrap;
  }

  function renderLog() {
    const log = $('#ai-log');
    if (!log) return;
    log.innerHTML = '';
    if (!messages.length) {
      log.appendChild(welcome());
    } else {
      messages.forEach((message) => log.appendChild(bubble(message)));
    }
    log.scrollTop = log.scrollHeight;
  }

  function renderChips() {
    const box = $('#ai-chips');
    if (!box) return;
    box.innerHTML = '';
    SAMPLES.forEach((sample) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = L(sample);
      chip.addEventListener('click', () => {
        const input = $('#ai-in');
        if (!input) return;
        input.value = L(sample);
        input.focus();
      });
      box.appendChild(chip);
    });
  }

  function send() {
    const input = $('#ai-in');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    messages.push({ role: 'user', text: { ar: text, en: text } });

    const existingId = lastProjectId();
    const existing = existingId ? db.get(existingId) : null;

    if (existing && looksLikeCommand(text)) {
      const result = applyCommand(existing.spec, text);
      if (result.ok) {
        db.saveSpec(existing.id, result.spec);
      }
      messages.push({
        role: 'ai',
        text: result.ok
          ? {
              ar: 'تم التعديل على مشروع "' + existing.spec.title.ar + '".',
              en: 'Updated the project "' + existing.spec.title.en + '".'
            }
          : {
              ar: 'لم أفهم هذا التعديل. جرّب: اجعل الليل، أضف سيارات، أضف مبانٍ، اجعل الألوان حمراء، اجعل اللعبة أصعب، حوّلها إلى 3D.',
              en: 'I did not catch that change. Try: make it night, add cars, add buildings, make the colors red, make it harder, switch to 3D.'
            },
        changed: result.changed,
        projectId: existing.id,
        ready: true
      });
      renderLog();
      return;
    }

    const plan = planProject(text);
    const project = db.create(plan.spec, { author: db.data.user.name || '' });
    const message = {
      role: 'ai',
      text: plan.reply,
      steps: plan.steps,
      done: 0,
      projectId: project.id,
      ready: false
    };
    messages.push(message);
    renderLog();

    let index = 0;
    const tick = () => {
      if (!root.isConnected) return;
      index += 1;
      message.done = index;
      if (index >= plan.steps.length) {
        message.ready = true;
      }
      renderLog();
      if (index < plan.steps.length) {
        timers.push(setTimeout(tick, 380));
      } else {
        toast(
          L({ ar: 'تم إنشاء المشروع وحفظه في مكتبتك', en: 'Project created and saved to your library' }),
          'ok'
        );
      }
    };
    timers.push(setTimeout(tick, 420));
  }

  $('#ai-chips') && renderChips();
  $('#ai-send').addEventListener('click', send);
  $('#ai-in').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  // A view that was left mid-animation stops its timers, so finish those steps.
  messages.forEach((message) => {
    if (message.steps && message.steps.length && !message.ready) {
      message.done = message.steps.length;
      message.ready = true;
    }
  });

  renderLog();

  root.__cleanup = clearTimers;
  return root;
}
