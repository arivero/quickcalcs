const buffer = new ArrayBuffer(8);
const view = new DataView(buffer);
const LOW_MASK = 0xfffffff0;

function normalizeDecimalString(str) {
  if (!str.includes('.')) return str;
  let next = str.replace(/(\.\d*?)0+$/, '$1');
  if (next.endsWith('.')) next = next.slice(0, -1);
  return next;
}

export function truncateTo48Bits(value) {
  if (!Number.isFinite(value)) return value;
  view.setFloat64(0, value);
  const hi = view.getUint32(0);
  const lo = view.getUint32(4) & LOW_MASK;
  view.setUint32(0, hi);
  view.setUint32(4, lo);
  return view.getFloat64(0);
}

export function formatTruncated(value) {
  if (!Number.isFinite(value)) {
    if (Number.isNaN(value)) return '—';
    return value >= 0 ? '∞' : '−∞';
  }
  const truncated = truncateTo48Bits(value);
  const normalized = Number.parseFloat(truncated.toPrecision(14));
  const text = normalized.toString();
  return normalizeDecimalString(text);
}

export function evaluateBinaryOperation(op, A, B) {
  if (!Number.isFinite(A) || !Number.isFinite(B)) {
    return { value: NaN, text: '—' };
  }
  let result;
  switch (op) {
    case '+':
      result = A + B;
      break;
    case '−':
      result = A - B;
      break;
    case '×':
      result = A * B;
      break;
    case ':':
      if (B === 0) {
        return { value: Infinity, text: '∞' };
      }
      result = A / B;
      break;
    default:
      return { value: NaN, text: '—' };
  }

  if (!Number.isFinite(result)) {
    if (Number.isNaN(result)) return { value: NaN, text: '—' };
    return { value: result, text: result >= 0 ? '∞' : '−∞' };
  }

  const truncated = truncateTo48Bits(result);
  return { value: truncated, text: formatTruncated(truncated) };
}
