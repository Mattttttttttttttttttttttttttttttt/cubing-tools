// dropdown.js — custom select (ARIA select-only combobox).
// Focus stays on the button; the highlighted option is tracked with aria-activedescendant.

let uid = 0;

const CHEVRON = '<svg class="dd-chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg>';

/**
 * @param {{options: {value: *, label: string}[], value: *, onChange?: (v: *) => void, labelledBy?: string}} cfg
 */
export function createDropdown({ options, value, onChange, labelledBy }) {
  const id = `dd${++uid}`;
  let cur = Math.max(0, options.findIndex(o => o.value === value));
  let active = cur;
  let open = false;
  let typed = '', typedTimer;

  const root = document.createElement('div');
  root.className = 'dd';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = `${id}-btn`;
  btn.className = 'dd-btn';
  btn.setAttribute('role', 'combobox');
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', `${id}-list`);
  if (labelledBy) btn.setAttribute('aria-labelledby', `${labelledBy} ${btn.id}`);
  btn.innerHTML = `<span class="dd-val"></span>${CHEVRON}`;
  const valEl = btn.firstChild;

  const list = document.createElement('ul');
  list.className = 'dd-list';
  list.id = `${id}-list`;
  list.setAttribute('role', 'listbox');
  if (labelledBy) list.setAttribute('aria-labelledby', labelledBy);

  const items = options.map((o, i) => {
    const li = document.createElement('li');
    li.className = 'dd-opt';
    li.id = `${id}-o${i}`;
    li.setAttribute('role', 'option');
    li.textContent = o.label;
    li.addEventListener('mouseenter', () => { active = i; render(); });
    li.addEventListener('click', () => choose(i));
    list.appendChild(li);
    return li;
  });

  root.append(btn, list);

  function render() {
    valEl.textContent = options[cur].label;
    items.forEach((li, i) => {
      li.setAttribute('aria-selected', String(i === cur));
      li.classList.toggle('sel', i === cur);
      li.classList.toggle('active', open && i === active);
    });
    if (open) btn.setAttribute('aria-activedescendant', items[active].id);
    else btn.removeAttribute('aria-activedescendant');
  }

  function openList() {
    if (open) return;
    open = true;
    active = cur;
    root.classList.remove('up');
    root.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    // Flip upward when there isn't room below.
    const r = btn.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    if (below < list.offsetHeight + 12 && r.top > below) root.classList.add('up');
    render();
  }

  function closeList() {
    if (!open) return;
    open = false;
    root.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    render();
  }

  function choose(i) {
    const changed = i !== cur;
    cur = i;
    closeList();
    render();
    if (changed) onChange?.(options[i].value);
  }

  function move(i) {
    active = Math.max(0, Math.min(items.length - 1, i));
    render();
  }

  btn.addEventListener('click', () => (open ? closeList() : openList()));
  btn.addEventListener('keyup', e => { if (e.key === ' ') e.preventDefault(); }); // no click on Space release

  btn.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    switch (e.key) {
      case 'ArrowDown': case 'ArrowUp':
        e.preventDefault();
        if (!open) openList();
        else move(active + (e.key === 'ArrowDown' ? 1 : -1));
        return;
      case 'Home': case 'End':
        if (!open) return;
        e.preventDefault();
        move(e.key === 'Home' ? 0 : items.length - 1);
        return;
      case 'Enter': case ' ':
        e.preventDefault();
        if (open) choose(active); else openList();
        return;
      case 'Escape':
        if (!open) return;
        e.preventDefault(); e.stopPropagation();
        closeList();
        return;
      case 'Tab':
        if (open) choose(active); // commit, then let focus move on
        return;
    }
    if (e.key.length === 1) { // type-ahead
      clearTimeout(typedTimer);
      typed += e.key.toLowerCase();
      typedTimer = setTimeout(() => { typed = ''; }, 600);
      const i = options.findIndex(o => o.label.toLowerCase().startsWith(typed));
      if (i === -1) return;
      e.preventDefault();
      if (open) move(i); else choose(i);
    }
  });

  list.addEventListener('pointerdown', e => e.preventDefault()); // keep focus on the button
  root.addEventListener('focusout', () => { if (open) closeList(); });
  document.addEventListener('pointerdown', e => { if (open && !root.contains(e.target)) closeList(); }, true);

  render();

  return {
    el: root,
    isOpen: () => open,
    close: closeList,
    setValue(v) {
      const i = options.findIndex(o => o.value === v);
      if (i !== -1) { cur = i; render(); }
    },
  };
}
