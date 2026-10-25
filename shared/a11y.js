// a11y.js — modal Tab trap + keyboard-only focus rings.
// Self-contained (injects its own CSS); import once per page.
//
// Ring policy: a ring shows only after keyboard navigation (Tab, or an Esc
// nothing else consumed). Any pointer press hides it. Closing a modal with
// Esc, or restoring focus to its opener, never summons a ring by itself.

const FOCUSABLE = 'a[href],button,input,select,textarea,summary,[tabindex],[contenteditable]';
// Text fields keep their own border-based focus styling.
const TEXT_FIELD = 'input:not([type=checkbox]):not([type=radio]):not([type=button]),textarea,select,[contenteditable]';
const NO_RING = `:is(${TEXT_FIELD}),[tabindex="-1"]`;

const css = `
html:not([data-kbnav]) :focus:not(:is(${TEXT_FIELD})) { outline: none; }
html[data-kbnav] :focus:not(${NO_RING}) {
  outline: 2px solid var(--tool-color, var(--accent, #ff85a1));
  outline-offset: 2px;
}`;
const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

const root$ = document.documentElement;
let kbNav = false;
function setKbNav(on) {
  if (on === kbNav) return;
  kbNav = on;
  root$.toggleAttribute('data-kbnav', on);
}

const stack = []; // open modals; top = last

function focusables(root) {
  return [...root.querySelectorAll(FOCUSABLE)].filter(el =>
    !el.disabled && el.tabIndex >= 0 && !el.closest('[inert],[hidden]') &&
    el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
}

function trapTab(e, root) {
  const items = focusables(root);
  if (!items.length) { e.preventDefault(); root.focus(); return; }
  const i = items.indexOf(document.activeElement);
  const last = items.length - 1;
  if (i === -1 || (e.shiftKey ? i === 0 : i === last)) {
    e.preventDefault();
    items[e.shiftKey ? last : 0].focus();
  }
}

window.addEventListener('keydown', e => {
  if (e.isComposing) return;
  const top = stack[stack.length - 1];

  if (e.key === 'Tab') {
    if (top) trapTab(e, top.root);
    setKbNav(true);
    return;
  }

  if (e.key === 'Escape') {
    if (top) {            // Esc closes the modal: no ring
      e.preventDefault();
      e.stopPropagation();
      top.close();
      return;
    }
    // Esc with no modal: ring unless another handler consumed it.
    setTimeout(() => { if (!e.defaultPrevented) setKbNav(true); });
  }
}, true);

window.addEventListener('pointerdown', () => setKbNav(false), true);

// Pull stray focus (e.g. returning from browser UI) back into the top modal.
document.addEventListener('focusin', e => {
  const top = stack[stack.length - 1];
  if (top && !top.root.contains(e.target)) top.focusInside();
});

/**
 * Register a modal.
 * @param {HTMLElement} root  Overlay element containing the dialog.
 * @param {{close: () => void, initialFocus?: HTMLElement | (() => HTMLElement)}} opts
 *   close: called on Esc; must call release().
 * @returns {{activate: () => void, release: () => void}}
 */
export function trapModal(root, { close, initialFocus } = {}) {
  root.tabIndex = -1;
  root.inert = true; // closed modals must not be tabbable
  let opener = null;

  const entry = {
    root,
    close,
    focusInside() {
      const target = typeof initialFocus === 'function' ? initialFocus() : initialFocus;
      (target || focusables(root)[0] || root).focus({ preventScroll: true });
    },
  };

  return {
    activate() {
      if (stack.includes(entry)) return;
      opener = document.activeElement;
      stack.push(entry);
      root.inert = false;
      entry.focusInside();
    },
    release() {
      const i = stack.indexOf(entry);
      if (i === -1) return;
      stack.splice(i, 1);
      root.inert = true;
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
      opener = null;
    },
  };
}
