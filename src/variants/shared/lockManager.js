const OPERANDS = ['A', 'B'];

function otherOperand(which) {
  return which === 'A' ? 'B' : 'A';
}

export function createLockManager(initialTarget = 'A') {
  let active = OPERANDS.includes(initialTarget) ? initialTarget : 'A';
  let locked = null;

  function getActive() {
    return active;
  }

  function getLocked() {
    return locked;
  }

  function enforce() {
    if (locked && active === locked) {
      active = otherOperand(locked);
    }
    return active;
  }

  function setActive(next) {
    if (!OPERANDS.includes(next)) return active;
    active = next;
    enforce();
    return active;
  }

  function toggleLock(operand) {
    if (!OPERANDS.includes(operand)) return { active, locked };
    if (locked === operand) {
      locked = null;
    } else {
      locked = operand;
      active = otherOperand(operand);
    }
    enforce();
    return { active, locked };
  }

  function lockTo(operand) {
    if (!OPERANDS.includes(operand)) return { active, locked };
    locked = operand;
    active = otherOperand(operand);
    enforce();
    return { active, locked };
  }

  function clearLock() {
    locked = null;
    return active;
  }

  function reset(target = 'A') {
    locked = null;
    active = OPERANDS.includes(target) ? target : 'A';
    return active;
  }

  function isLocked(operand) {
    return locked === operand;
  }

  return {
    getActive,
    getLocked,
    setActive,
    toggleLock,
    lockTo,
    clearLock,
    reset,
    enforce,
    isLocked,
  };
}

