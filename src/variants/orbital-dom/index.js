import { evaluateBinaryOperation } from '../shared/precision.js';

(() => {
  const OPS = ['+', '×', '−', ':'];
  let opIndex = 1; // default × like the canvas build
  let activeOperand = 'A';
  let aStr = '';
  let bStr = '';

  const fieldValues = {
    A: document.querySelector('[data-field-value="A"]'),
    B: document.querySelector('[data-field-value="B"]'),
  };
  const fieldCards = {
    A: document.querySelector('[data-field="A"]'),
    B: document.querySelector('[data-field="B"]'),
  };
  const activeChip = document.querySelector('[data-active-chip]');
  const opWheelButtons = Array.from(document.querySelectorAll('.op-wheel [data-op]'));
  const opDisplay = document.querySelector('[data-operation-value]');
  const expressionPieces = {
    A: document.querySelector('[data-expression="A"]'),
    B: document.querySelector('[data-expression="B"]'),
  };
  const expressionOp = document.querySelector('[data-expression-op]');
  const resultValue = document.querySelector('[data-result-value]');
  const dial = document.querySelector('[data-dial]');
  const dialKeys = Array.from(document.querySelectorAll('[data-dial-key]'));
  const resetBothBtn = document.querySelector('[data-action="reset-all"]');
  const clearActiveBtn = document.querySelector('[data-action="clear-active"]');
  const backspaceBtn = document.querySelector('[data-action="backspace"]');
  const swapBtn = document.querySelector('[data-action="swap-operands"]');

  if (!fieldValues.A || !fieldValues.B || !resultValue || !dial || dialKeys.length === 0) {
    return;
  }

  const keyboard = {
    displayValue(value) {
      if (value === '') return '0';
      if (value === '-') return '-';
      return value;
    },
    appendDigit(which, digit) {
      let current = getOperand(which);
      if (current === '' || current === '0') {
        current = digit === '0' ? '0' : digit;
      } else if (current === '-') {
        current = '-' + (digit === '0' ? '0' : digit);
      } else {
        current += digit;
      }
      setOperand(which, normalizeZeros(current));
    },
    appendDot(which) {
      let current = getOperand(which);
      if (current === '' || current === '-') {
        current = current === '-' ? '-0' : '0';
      }
      if (!current.includes('.')) {
        current += '.';
        setOperand(which, current);
      }
    },
    toggleSign(which) {
      const current = getOperand(which);
      if (current.startsWith('-')) {
        setOperand(which, current.slice(1));
      } else {
        setOperand(which, '-' + current);
      }
    },
    backspace(which) {
      const current = getOperand(which);
      if (current.length === 0) return;
      setOperand(which, current.slice(0, -1));
    },
    clear(which) {
      setOperand(which, '');
    },
  };

  function getOperand(which) {
    return which === 'A' ? aStr : bStr;
  }

  function setOperand(which, value) {
    if (which === 'A') {
      aStr = value;
    } else {
      bStr = value;
    }
  }

  function normalizeZeros(value) {
    const neg = value.startsWith('-');
    let trimmed = neg ? value.slice(1) : value;
    if (trimmed.startsWith('0') && !trimmed.startsWith('0.')) {
      trimmed = trimmed.replace(/^0+(?=\d)/, '');
      if (trimmed === '') trimmed = '0';
    }
    return neg ? '-' + trimmed : trimmed;
  }

  function setActiveOperand(which) {
    if (which !== 'A' && which !== 'B') return;
    activeOperand = which;
    refresh();
  }

  function toggleActiveOperand() {
    activeOperand = activeOperand === 'A' ? 'B' : 'A';
    refresh();
  }

  function currentOp() {
    return OPS[opIndex] ?? '×';
  }

  function refresh() {
    const opSymbol = currentOp();
    const { text } = evaluateBinaryOperation(opSymbol, Number(aStr || '0'), Number(bStr || '0'));

    fieldValues.A.textContent = keyboard.displayValue(aStr);
    fieldValues.B.textContent = keyboard.displayValue(bStr);
    if (expressionPieces.A) {
      expressionPieces.A.textContent = keyboard.displayValue(aStr);
    }
    if (expressionPieces.B) {
      expressionPieces.B.textContent = keyboard.displayValue(bStr);
    }
    if (expressionOp) expressionOp.textContent = opSymbol;
    resultValue.textContent = text;
    if (opDisplay) opDisplay.textContent = opSymbol;

    opWheelButtons.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.op === opSymbol);
    });
    Object.entries(fieldCards).forEach(([which, el]) => {
      if (!el) return;
      el.classList.toggle('is-active', which === activeOperand);
    });
    Object.entries(expressionPieces).forEach(([which, el]) => {
      if (!el) return;
      el.classList.toggle('is-active', which === activeOperand);
    });
    if (activeChip) {
      activeChip.textContent = `Typing → ${activeOperand}`;
    }
  }

  Object.entries(fieldCards).forEach(([which, el]) => {
    if (!el) return;
    el.addEventListener('click', (ev) => {
      ev.preventDefault();
      setActiveOperand(which);
    });
  });

  opWheelButtons.forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      const index = OPS.indexOf(btn.dataset.op);
      if (index === -1) return;
      opIndex = index;
      refresh();
    });
  });

  let swipeActive = false;
  let lastDialKey = null;

  function handleDialKey(btn) {
    if (!btn) return;
    if (swipeActive && btn === lastDialKey) return;
    lastDialKey?.classList.remove('is-hot');
    lastDialKey = btn;
    btn.classList.add('is-hot');

    if (btn.dataset.digit !== undefined) {
      keyboard.appendDigit(activeOperand, btn.dataset.digit);
    } else {
      switch (btn.dataset.action) {
        case 'dot':
          keyboard.appendDot(activeOperand);
          break;
        case 'sign':
          keyboard.toggleSign(activeOperand);
          break;
        default:
          break;
      }
    }
    refresh();
    if (!swipeActive) {
      btn.classList.remove('is-hot');
      lastDialKey = null;
    }
  }

  dialKeys.forEach((btn) => {
    btn.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      ev.preventDefault();
      swipeActive = true;
      dial.classList.add('is-swiping');
      if (activeOperand === 'A') {
        aStr = '';
        bStr = '';
      } else if (activeOperand === 'B' && bStr === '') {
        bStr = '';
      }
      handleDialKey(btn);
    });
    btn.addEventListener('pointerenter', () => {
      if (!swipeActive) return;
      handleDialKey(btn);
    });
    btn.addEventListener('pointerleave', () => {
      if (btn === lastDialKey && swipeActive) {
        btn.classList.remove('is-hot');
      }
    });
    btn.addEventListener('click', (ev) => {
      if (ev.detail === 0) {
        handleDialKey(btn);
        toggleActiveOperand();
      }
    });
  });

  function endSwipe() {
    if (!swipeActive) return;
    swipeActive = false;
    lastDialKey?.classList.remove('is-hot');
    lastDialKey = null;
    dial.classList.remove('is-swiping');
    toggleActiveOperand();
  }

  dial.addEventListener('pointerdown', (ev) => {
    if (ev.target && ev.target.dataset && ev.target.dataset.dialKey !== undefined) {
      dial.classList.add('is-swiping');
    }
  });

  window.addEventListener('pointerup', endSwipe);
  window.addEventListener('pointercancel', endSwipe);

  resetBothBtn?.addEventListener('click', (ev) => {
    ev.preventDefault();
    aStr = '';
    bStr = '';
    setActiveOperand('A');
  });

  clearActiveBtn?.addEventListener('click', (ev) => {
    ev.preventDefault();
    keyboard.clear(activeOperand);
    refresh();
  });

  backspaceBtn?.addEventListener('click', (ev) => {
    ev.preventDefault();
    keyboard.backspace(activeOperand);
    refresh();
  });

  swapBtn?.addEventListener('click', (ev) => {
    ev.preventDefault();
    const tmp = aStr;
    aStr = bStr;
    bStr = tmp;
    refresh();
  });

  refresh();
})();
