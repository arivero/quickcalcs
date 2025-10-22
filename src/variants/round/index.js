import { evaluateBinaryOperation } from '../shared/precision.js';

const SYMBOL_TIMES = '\u00d7';
const SYMBOL_MINUS = '\u2212';
const OPS = ['+', SYMBOL_TIMES, SYMBOL_MINUS, ':'];

const state = {
  a: '0',
  b: '0',
  target: 'A',
  opIndex: 1,
  locked: null,
};

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
  opWheel: {
    buttons: Array.from(document.querySelectorAll('[data-op]')),
    display: document.querySelector('[data-op-display]'),
  },
  actions: {
    clear: document.querySelector('[data-action="clear"]'),
    backspace: document.querySelector('[data-action="backspace"]'),
    reset: document.querySelector('[data-action="reset"]'),
  },
};

let swiping = false;
let lastHot = null;
let flipArmed = false;

function enforceTargetForLock() {
  if (!state.locked) return;
  const other = state.locked === 'A' ? 'B' : 'A';
  if (state.target !== other) state.target = other;
}

function currentStr() {
  return state.target === 'A' ? state.a : state.b;
}

function setCurrentStr(value) {
  if (state.target === 'A') state.a = value;
  else state.b = value;
}

function toNum(str) {
  if (str === '' || str === '-' || str === '.' || str === '-.') return 0;
  return Number(str);
}

function normZeros(str) {
  if (str === '' || str === '-' || str === '.' || str === '-.') return str;
  const neg = str.startsWith('-');
  let trimmed = neg ? str.slice(1) : str;
  if (trimmed.startsWith('0') && trimmed !== '0' && !trimmed.startsWith('0.')) {
    trimmed = trimmed.replace(/^0+/, '');
    if (trimmed === '') trimmed = '0';
  }
  return neg ? `-${trimmed}` : trimmed;
}

function render() {
  enforceTargetForLock();
  const op = OPS[state.opIndex];

  els.values.A.textContent = state.a;
  els.values.B.textContent = state.b;
  els.expr.A.textContent = state.a;
  els.expr.B.textContent = state.b;
  els.expr.op.textContent = op;
  els.opWheel.display.textContent = op;

  const { text } = evaluateBinaryOperation(op, toNum(state.a), toNum(state.b));
  els.result.textContent = text;

  els.fields.A.classList.toggle('is-active', state.target === 'A');
  els.fields.B.classList.toggle('is-active', state.target === 'B');
  els.fields.A.classList.toggle('is-locked', state.locked === 'A');
  els.fields.B.classList.toggle('is-locked', state.locked === 'B');

  els.opWheel.buttons.forEach((btn, idx) => {
    btn.classList.toggle('is-active', idx === state.opIndex);
  });
}

function appendDigit(digit) {
  let value = currentStr();
  if (value === '0') value = '';
  if (value === '-0') value = '-';
  setCurrentStr(normZeros(`${value}${digit}`));
  render();
}

function appendDot() {
  const value = currentStr();
  if (!value.includes('.')) {
    if (value === '' || value === '-') setCurrentStr(`${value}0.`);
    else setCurrentStr(`${value}.`);
    render();
  }
}

function toggleSign() {
  const value = currentStr();
  if (value.startsWith('-')) setCurrentStr(value.slice(1));
  else setCurrentStr(`-${value}`);
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
  state.target = 'A';
  state.locked = null;
  flipArmed = false;
  render();
}

function toggleLock(which) {
  if (which !== 'A' && which !== 'B') return;
  state.locked = state.locked === which ? null : which;
  if (state.locked) {
    state.target = state.locked === 'A' ? 'B' : 'A';
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
    if (state.locked) {
      const other = state.locked === 'A' ? 'B' : 'A';
      if (state.target !== other) state.target = other;
      setCurrentStr('0');
    } else if (flipArmed) {
      const nextTarget = state.target === 'A' ? 'B' : 'A';
      state.target = nextTarget;
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
    // Swallow capture failures (e.g., Safari)
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

// Bindings
els.opWheel.buttons.forEach((btn, index) => {
  btn.addEventListener('click', (event) => {
    event.preventDefault();
    state.opIndex = index;
    render();
  });
});

els.fields.A?.addEventListener('click', () => toggleLock('A'));
els.fields.B?.addEventListener('click', () => toggleLock('B'));

els.actions.clear?.addEventListener('click', (event) => {
  event.preventDefault();
  clearOne();
});

els.actions.backspace?.addEventListener('click', (event) => {
  event.preventDefault();
  backspace();
});

els.actions.reset?.addEventListener('click', (event) => {
  event.preventDefault();
  resetAll();
});

els.dial?.addEventListener('pointerdown', onDialPointerDown);
els.dial?.addEventListener('pointermove', onDialPointerMove);
window.addEventListener('pointerup', onDialPointerUp);

// Initial paint
resetAll();
