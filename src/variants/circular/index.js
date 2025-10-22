import { evaluateBinaryOperation } from '../shared/precision.js';
import { OPS as SHARED_OPS } from '../shared/ops.js';

;(() => {
    const cv = document.getElementById('cv');
    const ctx = cv.getContext('2d');

    // --- State ---
    let aStr = "";   // operand A (can be negative & decimal)
    let bStr = "";   // operand B
    let enteringA = true; // which operand we append to
    const OPS = SHARED_OPS; // order is important for wheel
    let opIndex = 1; // default to ×

    // Focus & swipe control
    let focusedField = null, // 'A' | 'B' | null
        pointerMode = null; // 'dial' | 'wheel' | 'btnClear' | 'btnBack' | 'btnSwap' | 'fieldA' | 'fieldB' | 'center' | null
    let swipeDisabled = false; // when a field is focused, disable swipe keypad

    // Pointer interaction state
    let pointerActive = false;
    let lastKeyCell = null; // track the last sector we were over

    // Layout cache (CSS pixel units)
    const L = {
      dial: {cx:0, cy:0, rOuter:0, rInner:0, cells:[]},
      fieldA: {x:0,y:0,w:0,h:0},
      fieldB: {x:0,y:0,w:0,h:0},
      result: {x:0,y:0,w:0,h:0},
      wheel: {x:0,y:0,r:0, innerR:0},
      btnClear: {x:0,y:0,w:0,h:0},
      btnBack: {x:0,y:0,w:0,h:0},
      btnSwap: {x:0,y:0,w:0,h:0},
    };

    const DPR = Math.max(1, window.devicePixelRatio || 1);
    let maybeRunTests = () => {};

    function resize() {
      const r = cv.getBoundingClientRect();
      cv.width = Math.max(1, Math.floor(r.width * DPR));
      cv.height = Math.max(1, Math.floor(r.height * DPR));
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); // draw in CSS pixels
      computeLayout(r.width, r.height);
      draw();
      maybeRunTests();
    }

    function computeLayout(W, H) {
      const padOuter = 16;
      const gap = 12;
      // Top region heights
      const fieldH = Math.min(72, Math.max(56, H * 0.08));
      const resultH = Math.min(110, Math.max(86, H * 0.12));

      // Fields A [left] and B [right] with a small operation wheel in between
      const wheelSize = Math.min(88, Math.max(72, W * 0.12));
      const wheelR = wheelSize/2;
      const wheelCx = W/2;
      const wheelCy = padOuter + fieldH/2; // center with fields

      const fieldW = (W - padOuter*2 - wheelSize - 3*gap) / 2; // breathing room around the wheel
      L.fieldA = {x: padOuter, y: padOuter, w: fieldW, h: fieldH};
      L.fieldB = {x: W - padOuter - fieldW, y: padOuter, w: fieldW, h: fieldH};
      L.wheel = {x: wheelCx, y: wheelCy, r: wheelR, innerR: wheelR * 0.6};

      // Result card under A/B
      L.result = {x: padOuter, y: L.fieldA.y + fieldH + gap, w: W - padOuter*2, h: resultH};

      // Dial region centered below the result
      const dialAreaTop = L.result.y + resultH + 16;
      const dialAreaH = H - dialAreaTop - 70; // leave space for bottom buttons
      const dialAreaW = Math.min(W - padOuter*2, 520);
      const cx = W/2;
      const cy = dialAreaTop + dialAreaH/2;
      const rOuter = Math.min(dialAreaW, dialAreaH) * 0.46; // margin to edges
      const rInner = rOuter * 0.58; // hollow center
      L.dial = {cx, cy, rOuter, rInner, cells: []};
      buildDialCells();

      // Buttons under dial
      const btnW = Math.min(140, (W - padOuter*2 - gap*2)/3);
      const btnH = 44;
      const btnY = Math.min(H - btnH - 10, cy + rOuter + 16);
      let bx = (W - (btnW*3 + gap*2))/2;
      L.btnClear = {x: bx, y: btnY, w: btnW, h: btnH}; bx += btnW + gap;
      L.btnBack  = {x: bx, y: btnY, w: btnW, h: btnH}; bx += btnW + gap;
      L.btnSwap  = {x: bx, y: btnY, w: btnW, h: btnH};
    }

    function buildDialCells() {
      const {cx, cy, rOuter, rInner} = L.dial;
      // 12 sectors clockwise from 12 o'clock: '.' (12), '±' (11), then digits 1..9,0
      // Clock layout: 12='.', 11='±', then 1..9, 0 at 10 o'clock
      const labels = ['.','1','2','3','4','5','6','7','8','9','0','±'];
      const step = Math.PI * 2 / labels.length;
      const startAtTop = -Math.PI/2 - step/2; // shift half-step so numbers land at 0°,30°,… and separators at 15°,45°,…
      L.dial.cells = labels.map((label, i) => {
        const a0 = startAtTop + i * step;
        const a1 = a0 + step;
        const am = (a0 + a1)/2;
        return { id: 'seg'+i, label, a0, a1, am, cx, cy, rOuter, rInner };
      });
    }

    // --- Drawing helpers ---
    function roundRectPath(x,y,w,h,r=14) {
      const rr = Math.min(r, Math.min(w,h)/2);
      ctx.beginPath();
      ctx.moveTo(x+rr,y);
      ctx.arcTo(x+w,y,x+w,y+h,rr);
      ctx.arcTo(x+w,y+h,x,y+h,rr);
      ctx.arcTo(x,y+h,x,y,rr);
      ctx.arcTo(x,y,x+w,y,rr);
      ctx.closePath();
    }

    function drawField(box, label, value, active) {
      roundRectPath(box.x, box.y, box.w, box.h, 14);
      ctx.fillStyle = '#111a2e';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = active ? 'rgba(110,168,254,1)' : 'rgba(255,255,255,0.25)';
      ctx.stroke();

      // label
      ctx.fillStyle = '#98a2b3';
      ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.textBaseline = 'top';
      ctx.fillText(label, box.x+10, box.y+6);

      // value (auto size & vertically centered)
      const vf = Math.floor(Math.min(40, Math.max(20, box.h * 0.5)));
      ctx.fillStyle = '#eaf2ff';
      ctx.font = vf + 'px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(value.length ? value : ' ', box.x + box.w/2, box.y + box.h/2 + 2);
    }

    function drawResult(box, resultText) {
      roundRectPath(box.x, box.y, box.w, box.h, 16);
      ctx.fillStyle = '#0b1222';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.stroke();

      // Title
      ctx.fillStyle = '#98a2b3';
      ctx.font = '13px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Result', box.x+12, box.y+8);

      // Value centered vertically
      ctx.fillStyle = '#eaf2ff';
      const rf = Math.floor(Math.min(72, Math.max(28, box.h * 0.55)));
      ctx.font = rf + 'px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(resultText, box.x + box.w/2, box.y + box.h*0.62);
    }

    function drawWheel() {
      const {x:cx, y:cy, r, innerR} = L.wheel;
      // outer ring
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
      ctx.fillStyle = '#141b2d'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.stroke();

      // sectors and labels
      for (let i=0;i<4;i++){
        const angle0 = (-Math.PI/2) + i*(Math.PI/2);
        const angle1 = angle0 + Math.PI/2;
        // sector highlight if selected
        if (i === opIndex){
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, r, angle0, angle1);
          ctx.closePath();
          ctx.fillStyle = 'rgba(110,168,254,0.22)';
          ctx.fill();
        }
        // label at mid-angle
        const mid = (angle0+angle1)/2;
        const rx = cx + Math.cos(mid) * (r*0.58);
        const ry = cy + Math.sin(mid) * (r*0.58);
        ctx.fillStyle = i === opIndex ? '#eaf2ff' : '#cbd5e1';
        ctx.font = '22px system-ui, -apple-system, Segoe UI, Roboto';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(OPS[i], rx, ry);
      }

      // inner disk (shows current op)
      ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI*2); ctx.fillStyle = '#0f1628'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.stroke();
      ctx.fillStyle = '#eaf2ff';
      ctx.font = Math.floor(innerR * 0.7) + 'px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(OPS[opIndex], cx, cy);
    }

    function drawDial() {
      const {cx, cy, rOuter, rInner, cells} = L.dial;
      for (const cell of cells) {
        // ring segment
        ctx.beginPath();
        ctx.arc(cx, cy, rOuter, cell.a0, cell.a1);
        ctx.arc(cx, cy, rInner, cell.a1, cell.a0, true);
        ctx.closePath();
        const isActive = (pointerMode==='dial' && lastKeyCell && lastKeyCell.id===cell.id);
        ctx.fillStyle = '#111a2e';
        ctx.fill();
        ctx.strokeStyle = isActive ? 'rgba(110,168,254,1)' : 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1; ctx.stroke();

        // label
        const rText = (rOuter + rInner) / 2;
        const tx = cx + Math.cos(cell.am) * rText;
        const ty = cy + Math.sin(cell.am) * rText;
        ctx.fillStyle = '#eaf2ff';
        const fs = Math.floor(Math.min(42, (rOuter - rInner) * 0.7));
        ctx.font = fs + 'px system-ui, -apple-system, Segoe UI, Roboto';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(cell.label, tx, ty);
      }

      // center (empty) — tap here to reset (visual hint only)
      ctx.beginPath(); ctx.arc(cx, cy, rInner * 0.5, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1; ctx.stroke();
    }

    function drawButton(box, label, filled=false) {
      roundRectPath(box.x, box.y, box.w, box.h, 12);
      ctx.fillStyle = filled ? '#203455' : '#101a2e';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#eaf2ff'; ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, box.x + box.w/2, box.y + box.h/2);
    }

    // === NEW: master draw() ===
    function draw() {
      const W = cv.width / DPR, H = cv.height / DPR;
      ctx.clearRect(0,0,W,H);

      drawField(L.fieldA, enteringA ? 'A (active)' : 'A', aStr, enteringA);
      drawField(L.fieldB, !enteringA ? 'B (active)' : 'B', bStr, !enteringA);
      drawWheel();
      drawResult(L.result, computeResult());
      drawDial();
      drawButton(L.btnClear, 'Clear', pointerMode==='btnClear' && pointerActive);
      drawButton(L.btnBack,  'Backspace', pointerMode==='btnBack' && pointerActive);
      drawButton(L.btnSwap,  'Swap A↔B', pointerMode==='btnSwap' && pointerActive);
    }

    function computeResult() {
      const { text } = evaluateBinaryOperation(OPS[opIndex], Number(aStr), Number(bStr));
      return text;
    }

    function normalizeZeros(s) {
      // Preserve sign and leading zeros only when followed by '.'
      const neg = s.startsWith('-');
      let t = neg ? s.slice(1) : s;
      if (t.startsWith('0') && !t.startsWith('0.')) {
        t = t.replace(/^0+(?=\d)/, '');
        if (t === '') t = '0';
      }
      return neg ? '-' + t : t;
    }

    function appendDigit(d) {
      if (enteringA) {
        let s = aStr;
        if (s === '-') s = '-0';
        if (s === '') s = '0';
        s += d;
        aStr = normalizeZeros(s);
      } else {
        let s = bStr;
        if (s === '-') s = '-0';
        if (s === '') s = '0';
        s += d;
        bStr = normalizeZeros(s);
      }
    }

    function appendDot() {
      if (enteringA) {
        let s = aStr;
        if (s === '' || s === '-') s += '0';
        if (!s.includes('.')) s += '.';
        aStr = s;
      } else {
        let s = bStr;
        if (s === '' || s === '-') s += '0';
        if (!s.includes('.')) s += '.';
        bStr = s;
      }
    }

    function toggleSign() {
      if (enteringA) {
        aStr = aStr.startsWith('-') ? aStr.slice(1) : ('-' + (aStr || ''));
      } else {
        bStr = bStr.startsWith('-') ? bStr.slice(1) : ('-' + (bStr || ''));
      }
    }

    function applyCell(label){
      if (label === '±') return toggleSign();
      if (label === '.') return appendDot();
      return appendDigit(label);
    }

    function startNewPair() {
      aStr=''; bStr=''; enteringA = true; focusedField=null; swipeDisabled=false;
    }

    function onDown(ev) {
      ev.preventDefault();
      pointerActive = true; lastKeyCell = null; pointerMode = null;
      cv.setPointerCapture?.(ev.pointerId);
      const {x,y} = toLocal(ev);

      // Focus fields: clicking A or B toggles focus and disables swipe
      if (inRect(L.fieldA,x,y)) { pointerMode='fieldA'; focusedField = (focusedField==='A'? null : 'A'); enteringA = true; swipeDisabled = !!focusedField; draw(); return; }
      if (inRect(L.fieldB,x,y)) { pointerMode='fieldB'; focusedField = (focusedField==='B'? null : 'B'); enteringA = false; swipeDisabled = !!focusedField; draw(); return; }

      if (inCenter(x,y)) { pointerMode='center'; startNewPair(); draw(); return; }
      if (hitWheel(x,y)) { pointerMode = 'wheel'; opIndex = angleToIndex(x,y); draw(); return; }
      if (inRect(L.btnClear,x,y)) { pointerMode='btnClear'; startNewPair(); draw(); return; }
      if (inRect(L.btnBack,x,y))  { pointerMode='btnBack';
        if (focusedField==='A') aStr=aStr.slice(0,-1);
        else if (focusedField==='B') bStr=bStr.slice(0,-1);
        draw(); return; }
      if (inRect(L.btnSwap,x,y))  { pointerMode='btnSwap'; enteringA=!enteringA; focusedField=null; swipeDisabled=false; draw(); return; }

      const key = hitDial(x,y);
      if (key) {
        if (swipeDisabled) { draw(); return; }
        pointerMode = 'dial';
        // Start of a new pair when beginning a swipe on A
        if (enteringA) { aStr=''; bStr=''; }
        lastKeyCell = key; applyCell(key.label); draw(); return; }

      draw();
    }

    function onMove(ev) {
      if (!pointerActive) return;
      const {x,y} = toLocal(ev);
      if (pointerMode === 'wheel') {
        opIndex = angleToIndex(x,y); draw(); return;
      }
      if (pointerMode === 'dial') {
        const key = hitDial(x,y);
        if (key && (!lastKeyCell || key.id !== lastKeyCell.id)) {
          lastKeyCell = key; applyCell(key.label); draw(); return;
        }
        if (!key && lastKeyCell) { lastKeyCell = null; draw(); return; }
      }
    }

    function onUp(ev) {
      if (!pointerActive) return;
      pointerActive = false;
      if (pointerMode === 'dial') {
        // switch operand after a swipe sequence ends
        enteringA = !enteringA;
      }
      lastKeyCell = null;
      pointerMode = null;
      draw();
    }

    // Utility
    function inRect(box, x, y) { return x>=box.x && y>=box.y && x<=box.x+box.w && y<=box.y+box.h; }
    function toLocal(ev) { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left), y: (ev.clientY - r.top) }; }

    function hitDial(x,y) {
      const {cx, cy, rOuter, rInner, cells} = L.dial;
      const dx = x - cx, dy = y - cy;
      const r = Math.hypot(dx, dy);
      if (r < rInner || r > rOuter) return null; // not in ring
      // angle 0 at top, clockwise
      let a = Math.atan2(dy, dx) + Math.PI/2; if (a < 0) a += Math.PI*2;
      const step = (Math.PI*2) / cells.length;
      // align hit-test with rotated segments (separators at 15°,45°,…)
      let aa = a + step/2; if (aa >= Math.PI*2) aa -= Math.PI*2;
      const idx = Math.floor(aa / step) % cells.length;
      return cells[idx];
    }

    function inCenter(x,y) {
      const {cx, cy, rInner} = L.dial; return Math.hypot(x-cx, y-cy) <= rInner * 0.5;
    }

    function hitWheel(x,y) {
      const dx = x - L.wheel.x, dy = y - L.wheel.y;
      const d2 = dx*dx + dy*dy;
      const r = L.wheel.r, r2 = r*r;
      const ir2 = L.wheel.innerR * L.wheel.innerR;
      return d2 <= r2 && d2 >= ir2;
    }

    function angleToIndex(x,y) {
      const ang = Math.atan2(y - L.wheel.y, x - L.wheel.x); // -PI..PI, 0 at +x
      // Map so that index 0 (+) is at top (-PI/2), then clockwise in quadrants
      let a = ang + Math.PI/2; // now 0 at top
      if (a < 0) a += Math.PI*2;
      const idx = Math.floor(a / (Math.PI/2)) % 4; // 4 sectors
      return idx;
    }

    cv.addEventListener('pointerdown', onDown, {passive:false});
    cv.addEventListener('pointermove', onMove, {passive:true});
    cv.addEventListener('pointerup', onUp, {passive:true});
    cv.addEventListener('pointercancel', onUp, {passive:true});
    window.addEventListener('resize', resize);

    if (typeof __INCLUDE_TESTS__ !== 'undefined' && __INCLUDE_TESTS__) {
      import('./tests.js').then(({ installCircularTests }) => {
        const tester = installCircularTests({
          getLayout: () => L,
          state: {
            getA: () => aStr,
            setA: (value) => { aStr = value; },
            getB: () => bStr,
            setB: (value) => { bStr = value; },
            getOpIndex: () => opIndex,
            setOpIndex: (value) => { opIndex = value; },
            getEnteringA: () => enteringA,
            setEnteringA: (value) => { enteringA = value; },
          },
          computeResult,
          angleToIndex,
          hitDial,
          toggleSign,
          appendDot,
          appendDigit,
          draw,
          console,
          shouldRun: () => typeof location !== 'undefined' && location.hash.includes('test'),
        });
        maybeRunTests = tester.maybeRunTests;
        maybeRunTests();
      }).catch((err) => {
        console.error('Failed to load test harness', err);
      });
    }

    // Initial mount
    resize();
  })();
