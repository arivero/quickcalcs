export function installCircularTests(context) {
  const {
    state,
    computeResult,
    angleToIndex,
    hitDial,
    toggleSign,
    appendDot,
    appendDigit,
    draw,
    console: logger = console,
    getLayout,
    shouldRun,
  } = context;

  let testsRun = false;

  function maybeRunTests() {
    if (testsRun) return;
    if (!shouldRun()) return;
    testsRun = true;
    runTests();
  }

  function runTests() {
    const layout = getLayout();

    logger.log('%cRunning canvas calculator tests…', 'color:#6ea8fe');

    state.setA('12.5');
    state.setB('3');
    state.setOpIndex(1);
    logger.assert(computeResult() === '37.5', '12.5×3 should be 37.5');

    state.setA('5');
    state.setB('2');
    state.setOpIndex(3);
    logger.assert(computeResult() === '2.5', '5:2 should be 2.5');

    const cxw = layout.wheel.x;
    const cyw = layout.wheel.y;
    const rw = layout.wheel.r * 0.8;
    logger.assert(angleToIndex(cxw, cyw - rw) === 0, 'Top sector should be +');
    logger.assert(angleToIndex(cxw + rw, cyw) === 1, 'Right sector should be ×');
    logger.assert(angleToIndex(cxw, cyw + rw) === 2, 'Bottom sector should be −');
    logger.assert(angleToIndex(cxw - rw, cyw) === 3, 'Left sector should be :');

    const order = layout.dial.cells.map((c) => c.label).join('');
    logger.assert(order === '.1234567890±', 'Dial order should be . ± 1..9 0 clockwise from top');
    const rt = (layout.dial.rInner + layout.dial.rOuter) / 2;
    const topHit = hitDial(layout.dial.cx, layout.dial.cy - rt);
    logger.assert(topHit && topHit.label === '.', 'Top of dial should be decimal point');

    state.setEnteringA(true);
    state.setA('12');
    toggleSign();
    logger.assert(state.getA() === '-12', '± should toggle sign to negative');
    toggleSign();
    logger.assert(state.getA() === '12', '± toggles back to positive');

    state.setA('');
    state.setEnteringA(true);
    appendDot();
    logger.assert(state.getA() === '0.', 'Empty + dot yields 0.');
    appendDot();
    logger.assert(state.getA() === '0.', 'Only one dot allowed');

    logger.assert(typeof draw === 'function', 'draw() should be defined');
    draw();

    const cellPM = layout.dial.cells.find((c) => c.label === '±');
    const rr2 = (layout.dial.rInner + layout.dial.rOuter) / 2;
    const hx = layout.dial.cx + Math.cos(cellPM.am) * rr2;
    const hy = layout.dial.cy + Math.sin(cellPM.am) * rr2;
    const h = hitDial(hx, hy);
    logger.assert(h && h.label === '±', "11 o'clock sector should be ±");

    const rr3 = (layout.dial.rInner + layout.dial.rOuter) / 2;
    const rightHit = hitDial(layout.dial.cx + rr3, layout.dial.cy);
    logger.assert(rightHit && rightHit.label === '3', "3 o'clock sector should be 3");
    const bottomHit = hitDial(layout.dial.cx, layout.dial.cy + rr3);
    logger.assert(bottomHit && bottomHit.label === '6', "6 o'clock sector should be 6");

    state.setEnteringA(true);
    state.setA('');
    appendDigit('0');
    appendDigit('0');
    appendDigit('5');
    logger.assert(state.getA() === '5', 'Leading zeros should collapse to 5');

    state.setEnteringA(false);
    state.setB('');
    appendDot();
    toggleSign();
    logger.assert(state.getB() === '-0.', 'B supports sign then dot as -0.');

    const step12 = (Math.PI * 2) / 12;
    const rr4 = (layout.dial.rInner + layout.dial.rOuter) / 2;
    const angCW = -Math.PI / 2 + (step12 / 2 + 0.02);
    const angCCW = -Math.PI / 2 - (step12 / 2 + 0.02);
    const xCW = layout.dial.cx + Math.cos(angCW) * rr4;
    const yCW = layout.dial.cy + Math.sin(angCW) * rr4;
    const xCCW = layout.dial.cx + Math.cos(angCCW) * rr4;
    const yCCW = layout.dial.cy + Math.sin(angCCW) * rr4;
    logger.assert(hitDial(xCW, yCW)?.label === '1', "+15° from 12 o'clock should be 1");
    logger.assert(hitDial(xCCW, yCCW)?.label === '±', "-15° from 12 o'clock should be ±");

    logger.log('%cAll tests passed', 'color:#3dd9b6');
  }

  return { maybeRunTests };
}
