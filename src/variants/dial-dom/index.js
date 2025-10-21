import { mountDualOperandCalculator } from '../shared/mountDualOperandCalculator.js';

const latchState = { target: 'A' };

const controller = mountDualOperandCalculator({
  selectors: {
    fieldValueA: '[data-field-value="A"]',
    fieldValueB: '[data-field-value="B"]',
    fieldA: '[data-field="A"]',
    fieldB: '[data-field="B"]',
    resultValue: '[data-result-value]',
    operationButtons: '[data-op]',
    operationValue: '[data-operation-value]',
    clearButton: '[data-action="clear-all"]',
    swapButton: '[data-action="swap-operands"]',
    padRoot: '[data-pad]',
  },
  resolvePadTarget: () => latchState.target,
});

const padRoots = Array.from(document.querySelectorAll('[data-pad]'));
const dial = document.querySelector('[data-dial]');
const toggleTargetBtn = document.querySelector('[data-toggle-target]');
const targetDisplay = toggleTargetBtn?.querySelector('[data-target-display]') ?? null;
const targetHint = toggleTargetBtn?.querySelector('.hint') ?? null;
const fieldCards = Array.from(document.querySelectorAll('[data-field]'));

function describeOperand(which) {
  return which === 'A' ? 'operand A' : 'operand B';
}

function syncTargetUI() {
  const { target } = latchState;
  padRoots.forEach((pad) => {
    pad.setAttribute('data-target', target);
  });
  if (dial) {
    dial.setAttribute('data-target', target);
  }
  if (targetDisplay) {
    targetDisplay.textContent = target;
  }
  if (targetHint) {
    const next = target === 'A' ? 'B' : 'A';
    targetHint.textContent = `Tap to switch to operand ${next}`;
  }
  if (toggleTargetBtn) {
    toggleTargetBtn.setAttribute(
      'aria-label',
      `Switch active operand (currently ${describeOperand(target)})`,
    );
  }
}

function setLatchTarget(next) {
  if (next !== 'A' && next !== 'B') return;
  latchState.target = next;
  if (controller && typeof controller.setActiveOperand === 'function') {
    controller.setActiveOperand(next);
  }
  syncTargetUI();
}

fieldCards.forEach((card) => {
  card.addEventListener('click', () => {
    const field = card.getAttribute('data-field');
    setLatchTarget(field);
  });
});

toggleTargetBtn?.addEventListener('click', () => {
  setLatchTarget(latchState.target === 'A' ? 'B' : 'A');
});

setLatchTarget('A');
