// Everything lives on the device (localStorage): no accounts server, no
// subscriptions, no hidden paid tiers. Free forever.

const KEY = 'aigs.v1';

export function uid(prefix) {
  return (
    (prefix || 'p') +
    Math.random().toString(36).slice(2, 8) +
    Date.now().toString(36).slice(-3)
  );
}

function blank() {
  return {
    version: 1,
    user: { name: '', joined: Date.now() },
    settings: { lang: 'ar', quality: 'auto', sound: true },
    projects: [],
    ratings: {},
    comments: {},
    seeded: false
  };
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const data = JSON.parse(raw);
    const base = blank();
    return {
      version: 1,
      user: Object.assign(base.user, data.user || {}),
      settings: Object.assign(base.settings, data.settings || {}),
      projects: Array.isArray(data.projects) ? data.projects : [],
      ratings: data.ratings || {},
      comments: data.comments || {},
      seeded: !!data.seeded
    };
  } catch (e) {
    return blank();
  }
}

export const db = {
  data: read(),

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {
      /* storage full or blocked: the session still works in memory */
    }
  },

  projects() {
    return this.data.projects.slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));
  },

  byKind(kind) {
    return this.projects().filter((p) => p.spec && p.spec.kind === kind);
  },

  get(id) {
    if (!id) return null;
    return this.data.projects.find((p) => p.id === id) || null;
  },

  create(spec, extra) {
    const now = Date.now();
    const project = Object.assign(
      {
        id: uid(),
        spec: spec,
        created: now,
        updated: now,
        published: false,
        author: this.data.user.name || '',
        plays: 0
      },
      extra || {}
    );
    this.data.projects.push(project);
    this.save();
    return project;
  },

  update(id, patch) {
    const p = this.get(id);
    if (!p) return null;
    Object.assign(p, patch, { updated: Date.now() });
    this.save();
    return p;
  },

  saveSpec(id, spec) {
    const p = this.get(id);
    if (!p) return null;
    p.spec = spec;
    p.updated = Date.now();
    this.save();
    return p;
  },

  duplicate(id) {
    const p = this.get(id);
    if (!p) return null;
    const copy = JSON.parse(JSON.stringify(p.spec));
    copy.title = {
      ar: copy.title.ar + ' (نسخة)',
      en: copy.title.en + ' (copy)'
    };
    return this.create(copy, { author: this.data.user.name || '' });
  },

  remove(id) {
    this.data.projects = this.data.projects.filter((p) => p.id !== id);
    delete this.data.ratings[id];
    delete this.data.comments[id];
    this.save();
  },

  publish(id) {
    const p = this.get(id);
    if (!p) return null;
    p.published = true;
    p.publishedAt = Date.now();
    if (!p.author) p.author = this.data.user.name || 'Player';
    this.save();
    return p;
  },

  unpublish(id) {
    const p = this.get(id);
    if (p) {
      p.published = false;
      this.save();
    }
    return p;
  },

  published() {
    return this.data.projects
      .filter((p) => p.published)
      .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
  },

  rate(id, stars) {
    const value = Math.max(1, Math.min(5, Math.round(stars)));
    const arr = this.data.ratings[id] || (this.data.ratings[id] = []);
    arr.push(value);
    this.save();
    return this.rating(id);
  },

  rating(id) {
    const arr = this.data.ratings[id] || [];
    if (!arr.length) return { avg: 0, count: 0 };
    const sum = arr.reduce((a, b) => a + b, 0);
    return { avg: sum / arr.length, count: arr.length };
  },

  comment(id, text) {
    const body = String(text || '').trim();
    if (!body) return null;
    const arr = this.data.comments[id] || (this.data.comments[id] = []);
    const entry = {
      id: uid('c'),
      text: body,
      by: this.data.user.name || 'Guest',
      at: Date.now()
    };
    arr.push(entry);
    this.save();
    return entry;
  },

  comments(id) {
    return (this.data.comments[id] || []).slice().reverse();
  },

  play(id) {
    const p = this.get(id);
    if (p) {
      p.plays = (p.plays || 0) + 1;
      this.save();
    }
  },

  setName(name) {
    this.data.user.name = String(name || '').trim().slice(0, 40);
    this.save();
  },

  setSetting(key, value) {
    this.data.settings[key] = value;
    this.save();
  },

  markSeeded() {
    this.data.seeded = true;
    this.save();
  },

  exportAll() {
    return JSON.stringify(this.data, null, 2);
  },

  importAll(text) {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') throw new Error('invalid');
    const base = blank();
    this.data = {
      version: 1,
      user: Object.assign(base.user, parsed.user || {}),
      settings: Object.assign(base.settings, parsed.settings || {}),
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      ratings: parsed.ratings || {},
      comments: parsed.comments || {},
      seeded: true
    };
    this.save();
    return this.data;
  },

  reset() {
    this.data = blank();
    this.save();
  }
};
