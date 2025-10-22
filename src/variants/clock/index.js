import { evaluateBinaryOperation } from '../shared/precision.js';
import { appendDigitStr, appendDotStr, toggleSignStr } from '../shared/digits.js';
import { OPS } from '../shared/ops.js';
import { createLockManager } from '../shared/lockManager.js';

const state = {
  a: '0',
  b: '0',
  opIndex: 1,
};

const lock = createLockManager('A');

const els = {
  fields: {
    A: document.querySelector('[data-field="A"]'),
    B: document.querySelector('[data-field="B"]'),
  },
  values: {
    A: document.querySelector('[data-field-value="A"]'),
    B: document.querySelector('[data-field-value="B"]'),
  },
  expr: {
    A: document.querySelector('[data-expr-a]'),
    B: document.querySelector('[data-expr-b]'),
    op: document.querySelector('[data-expr-op]'),
  },
  result: document.querySelector('[data-result]'),
  dial: document.querySelector('[data-dial]'),
  pad: document.querySelector('[data-pad]'),
  toggleClock: document.querySelector('[data-toggle-clock]'),
  clockShell: document.querySelector('[data-clock-shell]'),
  clockFace: document.querySelector('[data-clock-face]'),
  hands: {
    hour: document.querySelector('[data-clock-hour]'),
    minute: document.querySelector('[data-clock-minute]'),
  },
  opSelect: document.querySelector('[data-op-select]'),
  actions: {
    clear: document.querySelector('[data-action="clear"]'),
    backspace: document.querySelector('[data-action="backspace"]'),
    reset: document.querySelector('[data-action="reset"]'),
  },
};

let swiping = false;
let lastHot = null;
let flipArmed = false;
let clockVisible = true;
const ringButtons = els.pad ? Array.from(els.pad.querySelectorAll('button[data-ring-pos]')) : [];

function layoutRing() {
  if (!els.pad || ringButtons.length === 0) return;
  const bounds = els.pad.getBoundingClientRect();
  const sampleButton = ringButtons[0];
  const sampleSize = sampleButton.offsetWidth || sampleButton.getBoundingClientRect().width;
  const radius = Math.max(36, Math.min(bounds.width, bounds.height) / 2 - sampleSize / 2 - 12);
  els.pad.style.setProperty('--ring-radius', `${radius}px`);
  const offset = sampleSize * 0.6;
  if (els.fields.A && els.fields.B) {
    els.fields.A.style.left = `${offset}px`;
    els.fields.A.style.bottom = `${offset}px`;
    els.fields.B.style.right = `${offset}px`;
    els.fields.B.style.bottom = `${offset}px`;
  }
  if (els.toggleClock) {
    els.toggleClock.style.position = 'absolute';
    els.toggleClock.style.left = `${offset}px`;
    els.toggleClock.style.top = `${offset * 0.6}px`;
  }
  if (els.opSelect) {
    els.opSelect.style.position = 'absolute';
    els.opSelect.style.right = `${offset}px`;
    els.opSelect.style.top = `${offset * 0.6}px`;
  }
}

function currentStr() {
  return lock.getActive() === 'A' ? state.a : state.b;
}

function setCurrentStr(value) {
  if (lock.getActive() === 'A') state.a = value;
  else state.b = value;
}

function toNum(str) {
  if (str === '' || str === '-' || str === '.' || str === '-.') return 0;
  return Number(str);
}

function render() {
  lock.enforce();
  const op = OPS[state.opIndex];

  els.values.A.textContent = state.a;
  els.values.B.textContent = state.b;
  els.expr.A.textContent = state.a;
  els.expr.B.textContent = state.b;
  els.expr.op.textContent = op;
  els.opSelect.value = op;

  const { text } = evaluateBinaryOperation(op, toNum(state.a), toNum(state.b));
  els.result.textContent = text;

  const active = lock.getActive();
  els.fields.A.classList.toggle('is-active', active === 'A');
  els.fields.B.classList.toggle('is-active', active === 'B');
  els.fields.A.classList.toggle('is-locked', lock.isLocked('A'));
  els.fields.B.classList.toggle('is-locked', lock.isLocked('B'));
  els.expr.A.classList.toggle('is-active', active === 'A');
  els.expr.B.classList.toggle('is-active', active === 'B');
  els.clockShell?.classList.toggle('is-hidden', !clockVisible);
  if (els.clockFace) {
    els.clockFace.style.display = clockVisible ? 'block' : 'none';
  }
  els.toggleClock.textContent = clockVisible ? 'Hide' : 'Show';
}

function appendDigit(digit) {
  let value = currentStr();
  if (value === '0') value = '';
  if (value === '-0') value = '-';
  setCurrentStr(appendDigitStr(value, digit));
  render();
}

function appendDot() {
  const value = currentStr();
  const next = appendDotStr(value);
  if (next !== value) {
    setCurrentStr(next);
    render();
  }
}

function toggleSign() {
  const value = currentStr();
  setCurrentStr(toggleSignStr(value));
  render();
}

function backspace() {
  const value = currentStr();
  if (value.length <= 1 || (value.length === 2 && value.startsWith('-') && !value.includes('.'))) {
    setCurrentStr('0');
  } else {
    setCurrentStr(value.slice(0, -1));
  }
  flipArmed = false;
  render();
}

function clearOne() {
  setCurrentStr('0');
  flipArmed = false;
  render();
}

function resetAll() {
  state.a = '0';
  state.b = '0';
  lock.reset('A');
  state.opIndex = OPS.indexOf('×') >= 0 ? OPS.indexOf('×') : 0;
  flipArmed = false;
  render();
}

function toggleLock(which) {
  if (which !== 'A' && which !== 'B') return;
  lock.toggleLock(which);
  if (lock.getLocked()) {
    flipArmed = false;
  }
  render();
}

function buttonFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  return el.closest('[data-ring-pos]');
}

function setHot(button) {
  if (lastHot === button) return;
  if (lastHot) lastHot.classList.remove('is-hot');
  if (button) button.classList.add('is-hot');
  lastHot = button;
}

function handleKey(btn) {
  if (!btn) return;
  const { digit, action } = btn.dataset;
  if (digit) {
    appendDigit(digit);
  } else if (action === 'dot') {
    appendDot();
  } else if (action === 'sign') {
    toggleSign();
  }
}

function onDialPointerDown(ev) {
  if (ev.pointerType === 'mouse' && ev.button !== 0) return;
  ev.preventDefault();
  const startBtn = buttonFromPoint(ev.clientX, ev.clientY);
  if (startBtn) {
    if (lock.getLocked()) {
      const other = lock.getLocked() === 'A' ? 'B' : 'A';
      if (lock.getActive() !== other) lock.setActive(other);
      setCurrentStr('0');
    } else if (flipArmed) {
      const nextTarget = lock.getActive() === 'A' ? 'B' : 'A';
      lock.setActive(nextTarget);
      setCurrentStr('0');
    }
    handleKey(startBtn);
    setHot(startBtn);
  } else {
    setHot(null);
  }
  swiping = true;
  try {
    ev.target.setPointerCapture(ev.pointerId);
  } catch {
    // ignore
  }
  flipArmed = true;
}

function onDialPointerMove(ev) {
  if (!swiping) return;
  const btn = buttonFromPoint(ev.clientX, ev.clientY);
  if (btn) {
    if (btn !== lastHot) {
      handleKey(btn);
      setHot(btn);
    }
  } else {
    setHot(null);
  }
}

function onDialPointerUp() {
  if (!swiping) return;
  swiping = false;
  setHot(null);
}

function updateClock() {
  const now = new Date();
  const minutes = now.getMinutes() + now.getSeconds() / 60;
  const hours = (now.getHours() % 12) + minutes / 60;
  if (els.hands.minute) {
    els.hands.minute.style.transform = `translate(-50%, 50%) rotate(${minutes * 6}deg)`;
  }
  if (els.hands.hour) {
    els.hands.hour.style.transform = `translate(-50%, 50%) rotate(${hours * 30}deg)`;
  }
}

// Bindings
els.fields.A?.addEventListener('click', () => toggleLock('A'));
els.fields.B?.addEventListener('click', () => toggleLock('B'));

els.actions.clear?.addEventListener('click', (ev) => {
  ev.preventDefault();
  clearOne();
});

els.actions.backspace?.addEventListener('click', (ev) => {
  ev.preventDefault();
  backspace();
});

els.actions.reset?.addEventListener('click', (ev) => {
  ev.preventDefault();
  resetAll();
});

// Prevent dial from stealing pointerdown on corner controls
[
  els.toggleClock,
  els.opSelect,
  els.fields.A,
  els.fields.B,
].forEach((el) => {
  el?.addEventListener('pointerdown', (ev) => {
    ev.stopPropagation();
  }, { passive: true });
});

els.opSelect?.addEventListener('change', (ev) => {
  const value = ev.target.value;
  const idx = OPS.indexOf(value);
  if (idx !== -1) {
    state.opIndex = idx;
    render();
  }
});

els.toggleClock?.addEventListener('click', (ev) => {
  ev.preventDefault();
  clockVisible = !clockVisible;
  render();
});

els.dial?.addEventListener('pointerdown', onDialPointerDown);
els.dial?.addEventListener('pointermove', onDialPointerMove);
window.addEventListener('pointerup', onDialPointerUp);
window.addEventListener('resize', layoutRing);

requestAnimationFrame(() => {
  layoutRing();
});

render();
updateClock();
setInterval(updateClock, 1000);
