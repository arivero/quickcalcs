import { mountDualOperandCalculator } from '../shared/mountDualOperandCalculator.js';

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
    operationValue: '[data-operation-value]',
    padRoot: '[data-pad]',
  },
  resolvePadTarget: ({ lastActive }) => lastActive,
});

if (!controller) {
  throw new Error('Dial DOM calculator failed to initialize');
}

const fieldCards = Array.from(document.querySelectorAll('[data-field]'));
const centerButton = document.querySelector('[data-action="toggle-active"]');
const activeIndicator = document.querySelector('[data-active-indicator]');
const swapButton = document.querySelector('[data-action="swap-operands"]');
const clearAllButton = document.querySelector('[data-action="clear-all"]');

function updateActiveIndicator(which) {
  if (!activeIndicator || !centerButton) return;
  const label = which === 'A' ? 'A' : 'B';
  activeIndicator.textContent = label;
  centerButton.classList.toggle('is-b', which === 'B');
  centerButton.setAttribute(
    'aria-label',
    `Toggle active operand (currently ${label === 'A' ? 'left' : 'right'})`,
  );
}

function toggleOperand() {
  const next = controller.getActiveOperand() === 'A' ? 'B' : 'A';
  controller.setActiveOperand(next);
  updateActiveIndicator(next);
}

centerButton?.addEventListener('click', (event) => {
  event.preventDefault();
  toggleOperand();
});

fieldCards.forEach((card) => {
  card.addEventListener('click', () => {
    const field = card.getAttribute('data-field');
    if (field === 'A' || field === 'B') {
      controller.setActiveOperand(field);
      updateActiveIndicator(field);
    }
  });
});

swapButton?.addEventListener('click', () => {
  queueMicrotask(() => {
    updateActiveIndicator(controller.getActiveOperand());
  });
});

clearAllButton?.addEventListener('click', () => {
  queueMicrotask(() => {
    updateActiveIndicator(controller.getActiveOperand());
  });
});

updateActiveIndicator(controller.getActiveOperand());
