// settings.js — persisted user settings + the settings modal body.
// localStorage key `cube-tool-settings` holds one object: { dec: 2, ... }.
// Invalid or missing values fall back to the schema default.
// To add a setting: add a SCHEMA entry and an item in SECTIONS.

import { createDropdown } from './dropdown.js';

const KEY = 'cube-tool-settings';

export const SCHEMA = {
  dec: { default: 2, options: [0, 2, 3] }, // decimal places for time formatting
};

const listeners = new Set();

function readRaw() {
  try {
    const o = JSON.parse(localStorage.getItem(KEY));
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  } catch { return {}; }
}

function sanitize(key, v) {
  const s = SCHEMA[key];
  return s && !s.options.includes(v) ? s.default : v;
}

function load() {
  const out = { ...readRaw() };
  for (const k of Object.keys(SCHEMA)) out[k] = sanitize(k, out[k]);
  return out;
}

let cache = load();

function emit(key) { listeners.forEach(fn => fn(key, cache[key])); }

// Keep other tabs in sync.
window.addEventListener('storage', e => {
  if (e.key !== KEY && e.key !== null) return;
  const prev = cache;
  cache = load();
  for (const k of new Set([...Object.keys(prev), ...Object.keys(cache)])) {
    if (prev[k] !== cache[k]) emit(k);
  }
});

export const Settings = {
  all()    { return { ...cache }; },
  get(key) { return cache[key]; },
  set(key, value) {
    value = sanitize(key, value);
    if (cache[key] === value) return;
    cache = { ...cache, [key]: value };
    try { localStorage.setItem(KEY, JSON.stringify({ ...readRaw(), [key]: value })); } catch {}
    emit(key);
  },
  /** @returns {() => void} unsubscribe */
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

// ── Settings modal body ───────────────────────────────────────────────────────

const SECTIONS = [
  {
    title: 'formatter & calculator',
    items: [
      {
        key: 'dec',
        label: 'Default decimal place',
        desc: '',
        options: [0, 2, 3],
      },
    ],
  },
];

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/** @returns {{dismissPopup: () => boolean}} dismissPopup closes an open dropdown; true if one was open. */
export function renderSettings(container) {
  const dropdowns = [];

  for (const sec of SECTIONS) {
    const section = el('section', 'settings-section');
    section.appendChild(el('h3', 'settings-heading', sec.title));

    for (const it of sec.items) {
      const row  = el('div', 'setting-row');
      const info = el('div', 'setting-info');
      const label = el('div', 'setting-label', it.label);
      label.id = `setting-${it.key}-label`;
      info.append(label, el('div', 'setting-desc', it.desc));

      const dd = createDropdown({
        options: it.options.map(v => ({ value: v, label: String(v) })),
        value: Settings.get(it.key),
        labelledBy: label.id,
        onChange: v => Settings.set(it.key, v),
      });
      dropdowns.push({ key: it.key, dd });
      row.append(info, dd.el);
      section.appendChild(row);
    }
    container.appendChild(section);
  }

  Settings.onChange((key, v) => dropdowns.forEach(d => d.key === key && d.dd.setValue(v)));

  return {
    dismissPopup() {
      const o = dropdowns.find(d => d.dd.isOpen());
      if (!o) return false;
      o.dd.close();
      return true;
    },
  };
}
