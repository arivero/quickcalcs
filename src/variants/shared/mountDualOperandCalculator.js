import { evaluateBinaryOperation } from './precision.js';

export function mountDualOperandCalculator(options = {}) {
  const {
    operations = ['+', '−', '×', ':'],
    selectors = {
      fieldValueA: '[data-field-value="A"]',
      fieldValueB: '[data-field-value="B"]',
      operationValue: '[data-operation-value]',
      fieldA: '[data-field="A"]',
      fieldB: '[data-field="B"]',
      resultValue: '[data-result-value]',
      operationButtons: '[data-op]',
      clearButton: '[data-action="clear-all"]',
      swapButton: '[data-action="swap-operands"]',
      padRoot: '[data-pad]',
    },
    resolvePadTarget,
  } = options;

  const fieldValues = {
    A: document.querySelector(selectors.fieldValueA),
    B: document.querySelector(selectors.fieldValueB),
  };
  const expressionPieces = {
    A: fieldValues.A?.closest('[data-expression="A"]') ?? null,
    B: fieldValues.B?.closest('[data-expression="B"]') ?? null,
  };
  const operationValue = selectors.operationValue
    ? document.querySelector(selectors.operationValue)
    : null;
  const fieldCards = {
    A: document.querySelector(selectors.fieldA),
    B: document.querySelector(selectors.fieldB),
  };
  const resultValue = document.querySelector(selectors.resultValue);
  const opButtons = Array.from(document.querySelectorAll(selectors.operationButtons));
  const expressionValues = {
    A: document.querySelector('[data-expression-value="A"]'),
    B: document.querySelector('[data-expression-value="B"]'),
    op: document.querySelector('[data-expression-op]'),
  };
  const clearBtn = document.querySelector(selectors.clearButton);
  const swapBtn = document.querySelector(selectors.swapButton);

  if (!fieldValues.A || !fieldValues.B || !resultValue) {
    console.warn('Dual operand calculator could not mount: missing elements.');
    return;
  }

  let aStr = '';
  let bStr = '';
  let op = operations[2] ?? '×';
  let lastActive = 'A';
  const pendingClear = { A: false, B: false };

  const determinePadTarget =
    typeof resolvePadTarget === 'function'
      ? (ctx) => resolvePadTarget({ ...ctx, lastActive })
      : ({ pad }) => pad.getAttribute('data-pad');

  function displayValue(s) {
    if (s === '') return '0';
    return s;
  }

  function normalizeZeros(s) {
    const neg = s.startsWith('-');
    let t = neg ? s.slice(1) : s;
    if (t.startsWith('0') && !t.startsWith('0.')) {
      t = t.replace(/^0+(?=\d)/, '');
      if (t === '') t = '0';
    }
    return neg ? '-' + t : t;
  }

  function getOperand(which) {
    return which === 'A' ? aStr : bStr;
  }

  function setOperand(which, value) {
    if (which === 'A') aStr = value;
    else bStr = value;
  }

  function appendDigit(which, digit) {
    let s = getOperand(which);
    if (s === '-') s = '-0';
    if (s === '') s = '0';
    s += digit;
    setOperand(which, normalizeZeros(s));
  }

  function appendDot(which) {
    let s = getOperand(which);
    if (s === '' || s === '-') s += '0';
    if (!s.includes('.')) s += '.';
    setOperand(which, s);
  }

  function toggleSign(which) {
    let s = getOperand(which);
    if (s.startsWith('-')) s = s.slice(1);
    else s = '-' + (s || '');
    setOperand(which, s);
  }

  function backspace(which) {
    let s = getOperand(which);
    if (s.length === 0) return;
    s = s.slice(0, -1);
    setOperand(which, s);
  }

  function refresh() {
    const { text: resultText } = evaluateBinaryOperation(op, Number(aStr), Number(bStr));
    fieldValues.A.textContent = displayValue(aStr);
    fieldValues.B.textContent = displayValue(bStr);
    resultValue.textContent = resultText;
    if (operationValue) {
      operationValue.textContent = op;
    }
    if (expressionValues.A) {
      expressionValues.A.textContent = displayValue(aStr);
      expressionValues.A.classList.toggle('is-active', lastActive === 'A');
    }
    if (expressionValues.B) {
      expressionValues.B.textContent = displayValue(bStr);
      expressionValues.B.classList.toggle('is-active', lastActive === 'B');
    }
    if (expressionValues.op) {
      expressionValues.op.textContent = op;
    }
    opButtons.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.op === op);
    });
    fieldCards.A?.classList.toggle('is-active', lastActive === 'A');
    fieldCards.B?.classList.toggle('is-active', lastActive === 'B');
    expressionPieces.A?.classList.toggle('is-active', lastActive === 'A');
    expressionPieces.B?.classList.toggle('is-active', lastActive === 'B');
  }

  function handlePadButton(target, btn) {
    if (!target) return;
    if (target !== lastActive) {
      pendingClear[target] = true;
    }
    if (pendingClear[target]) {
      setOperand(target, '');
      pendingClear[target] = false;
    }
    if (btn.dataset.digit !== undefined) {
      appendDigit(target, btn.dataset.digit);
    } else {
      switch (btn.dataset.action) {
        case 'dot':
          appendDot(target);
          break;
        case 'sign':
          toggleSign(target);
          break;
        case 'backspace':
          backspace(target);
          break;
        case 'clear':
          setOperand(target, '');
          pendingClear[target] = false;
          break;
        default:
          break;
      }
    }
    lastActive = target;
    refresh();
  }

  document.querySelectorAll(selectors.padRoot).forEach((pad) => {
    pad.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        const target = determinePadTarget({ pad, button: btn });
        if (target !== 'A' && target !== 'B') return;
        handlePadButton(target, btn);
      });
    });
  });

  opButtons.forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      const next = btn.dataset.op;
      if (!operations.includes(next)) return;
      op = next;
      refresh();
    });
  });

  clearBtn?.addEventListener('click', (ev) => {
    ev.preventDefault();
    aStr = '';
    bStr = '';
    lastActive = 'A';
    pendingClear.A = false;
    pendingClear.B = false;
    refresh();
  });

  swapBtn?.addEventListener('click', (ev) => {
    ev.preventDefault();
    const tmp = aStr;
    aStr = bStr;
    bStr = tmp;
    lastActive = lastActive === 'A' ? 'B' : 'A';
    pendingClear.A = false;
    pendingClear.B = false;
    refresh();
  });

  refresh();

  return {
    getActiveOperand() {
      return lastActive;
    },
    setActiveOperand(which) {
      if (which !== 'A' && which !== 'B') return;
      if (which !== lastActive) {
        pendingClear[which] = true;
      }
      lastActive = which;
      refresh();
    },
  };
}
