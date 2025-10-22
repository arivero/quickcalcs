import { mountDualOperandCalculator } from '../shared/mountDualOperandCalculator.js';
import { createLockManager } from '../shared/lockManager.js';

const lock = createLockManager('A');

const controller = mountDualOperandCalculator({
  selectors: {
    fieldValueA: '[data-field-value="A"]',
    fieldValueB: '[data-field-value="B"]',
    fieldA: '[data-field="A"]',
    fieldB: '[data-field="B"]',
    resultValue: '[data-result-value]',
    operationButtons: '[data-op]',
    clearButton: '[data-action="clear-all"]',
    swapButton: '[data-action="swap-operands"]',
    padRoot: '[data-pad]',
  },
  resolvePadTarget: () => lock.getActive(),
});

const toggleLockBtn = document.querySelector('[data-action="toggle-lock"]');
const lockDisplays = Array.from(document.querySelectorAll('[data-lock-display]'));
const lockSubtitle = toggleLockBtn?.querySelector('[data-lock-subtitle]');
const padRoot = document.querySelector('[data-pad]');
const latchIndicators = Array.from(document.querySelectorAll('[data-latch-indicator]'));
const fieldCards = Array.from(document.querySelectorAll('[data-field]'));

function describeTarget(target) {
  return target === 'A' ? 'Left operand' : 'Right operand';
}

function syncLockState() {
  const target = lock.getActive();
  controller.setActiveOperand(target);
  toggleLockBtn?.setAttribute(
    'aria-label',
    `Toggle input lock (currently ${describeTarget(target).toLowerCase()})`,
  );
  lockDisplays.forEach((el) => {
    el.textContent = describeTarget(target);
  });
  if (lockSubtitle) {
    const next = target === 'A' ? 'right' : 'left';
    lockSubtitle.textContent = `Tap to switch to the ${next} operand`;
  }
  padRoot?.setAttribute('data-target', target);
  latchIndicators.forEach((indicator) => {
    indicator.classList.toggle('is-active', indicator.dataset.latchIndicator === target);
  });
}

function setLockTarget(next) {
  if (next !== 'A' && next !== 'B') return;
  lock.clearLock();
  lock.setActive(next);
  syncLockState();
}

toggleLockBtn?.addEventListener('click', (ev) => {
  ev.preventDefault();
  const current = lock.getActive();
  setLockTarget(current === 'A' ? 'B' : 'A');
});

fieldCards.forEach((card) => {
  card.addEventListener('click', () => {
    const field = card.getAttribute('data-field');
    setLockTarget(field);
  });
});

syncLockState();
