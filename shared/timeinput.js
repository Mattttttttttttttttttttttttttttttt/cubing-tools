// timeinput.js: auto-formats typed digits using the `dec` setting.
//
// Each field keeps an underlying text and shows the formatted display.
// Backspace/Delete skip over the auto-inserted ":" and ".".

import { Settings } from './settings.js';

const FORMATTABLE = /^([^\d.:]*)(\d+)([^\d.:]*)$/;   // one digit run, no manual separators
const ADOPTABLE   = /^([^\d.:]*)([\d.:]+)([^\d.:]*)$/;
const VALID_PRE   = /^\s*(dnf\s*\(?)?$/i;     // anything else before the digits is an invalid time
const VALID_SUF   = /^\)?\+?\s*$/;

/**
 * Computes the display for an underlying text.
 * ub[i]: underlying offset at display offset i. rp[u]: display offset after the u-th underlying char.
 * ub/rp are null for pass-through (identity) text.
 */
export function layout(text, dec) {
  const m = FORMATTABLE.exec(text);
  const raw = { under: text, display: text, ub: null, rp: null, strip: 0, preLen: 0 };
  if (!m) return raw;

  const [, pre, core, suf] = m;
  if (!VALID_PRE.test(pre) || !VALID_SUF.test(suf)) return raw; // invalid time: show as typed
  const D = core.replace(/^0+(?=\d)/, '');           // leading zeros carry no value
  const L = D.length;

  // Cells are built right → left; `real` cells map to a typed digit, the rest are padding/separators.
  const cells = [];
  let r = 0;
  const digit = () => { const real = r < L; const ch = real ? D[L - 1 - r] : '0'; r++; return { ch, real }; };
  for (let j = 0; j < dec; j++) cells.push(digit());
  if (dec) cells.push({ ch: '.', real: false });
  cells.push(digit());                                // seconds, ones
  if (r < L) cells.push(digit());                     // seconds, tens
  if (r < L) {                                        // minutes
    cells.push({ ch: ':', real: false });
    while (r < L) cells.push(digit());
  }
  cells.reverse();

  const chars = [
    ...[...pre].map(ch => ({ ch, real: true })),
    ...cells,
    ...[...suf].map(ch => ({ ch, real: true })),
  ];
  let display = '', n = 0;
  const ub = [0], rp = [0];
  for (const c of chars) {
    display += c.ch;
    if (c.real) rp[++n] = display.length;
    ub.push(n);
  }
  return { under: pre + D + suf, display, ub, rp, strip: core.length - D.length, preLen: pre.length };
}

const fields = new Map(); // field → refresh()

function placeholderFor(dec) { return dec ? '0:00.' + '0'.repeat(dec) : '0:00'; }

Settings.onChange(key => {
  if (key !== 'dec') return;
  for (const [f, refresh] of fields) {
    if (f.isConnected) refresh(); else fields.delete(f);
  }
});

export function attachTimeInput(field, { dec: fixedDec } = {}) {
  const getDec = () => fixedDec ?? Settings.get('dec');
  let st = layout('', 0);
  let internal = false;

  const toU = i => (st.ub ? st.ub[i] : i);
  const toD = u => (st.rp ? st.rp[Math.min(u, st.rp.length - 1)] : Math.min(u, st.under.length));

  // Take over a display value that was set outside this module (page logic, storage restore…).
  // Keeps formatting active when the value is exactly what the formatter would produce.
  function adopt(value) {
    const dec = getDec();
    const m = ADOPTABLE.exec(value);
    if (m) {
      const cand = layout(m[1] + m[2].replace(/[.:]/g, '') + m[3], dec);
      if (cand.display === value) { st = cand; return; }
    }
    st = { under: value, display: value, ub: null, rp: null, strip: 0, preLen: 0 };
  }

  const sync = () => { if (field.value !== st.display) adopt(field.value); };

  function commit(text, caret) {
    const lay = layout(text, getDec());
    if (lay.strip && caret > lay.preLen) caret = Math.max(lay.preLen, caret - lay.strip);
    st = lay;
    field.value = lay.display;
    const p = toD(caret);
    field.setSelectionRange(p, p);
    internal = true;
    try { field.dispatchEvent(new Event('input', { bubbles: true })); } finally { internal = false; }
  }

  field.addEventListener('beforeinput', e => {
    if (e.isComposing || !e.cancelable) return;
    sync();
    const type = e.inputType;
    if (type === 'historyUndo' || type === 'historyRedo') { e.preventDefault(); return; }

    const u = st.under;
    let us = toU(field.selectionStart), ue = toU(field.selectionEnd);
    let ins = '';

    switch (type) {
      case 'insertText': case 'insertReplacementText': case 'insertFromPaste':
      case 'insertFromDrop': case 'insertFromYank':
        ins = (e.data ?? e.dataTransfer?.getData('text/plain') ?? '').replace(/[\r\n]+/g, '');
        break;
      case 'deleteContentBackward':
        if (us === ue) us = Math.max(0, us - 1);
        break;
      case 'deleteContentForward':
        if (us === ue) ue = Math.min(u.length, ue + 1);
        break;
      case 'deleteWordBackward':
        if (us === ue) us -= (/(\S+|\s+)$/.exec(u.slice(0, us)) || [''])[0].length;
        break;
      case 'deleteWordForward':
        if (us === ue) ue += (/^(\s*\S+|\s+)/.exec(u.slice(ue)) || [''])[0].length;
        break;
      case 'deleteSoftLineBackward': case 'deleteHardLineBackward':
        if (us === ue) us = 0;
        break;
      case 'deleteSoftLineForward': case 'deleteHardLineForward':
        if (us === ue) ue = u.length;
        break;
      case 'deleteByCut': case 'deleteByDrag': case 'deleteContent':
        break;
      default:
        return; // unknown edit: let the browser apply it; the input handler re-syncs
    }

    e.preventDefault();
    if (us === ue && !ins) return;
    commit(u.slice(0, us) + ins + u.slice(ue), us + ins.length);
  });

  // Fallback for edits we couldn't intercept (IME composition, autofill).
  field.addEventListener('input', () => { if (!internal) adopt(field.value); });

  const refresh = () => { adopt(field.value); field.placeholder = placeholderFor(getDec()); };
  fields.set(field, refresh);
  refresh();
}
