const buffer = new ArrayBuffer(8);
const view = new DataView(buffer);
const MASK_52 = (1n << 52n) - 1n;
const ROUND_GUARD = 0xfn;
const KEEP_MASK = (1n << 48n) - 1n;

function toBigInt(value) {
  view.setFloat64(0, value, false);
  const hi = BigInt(view.getUint32(0, false));
  const lo = BigInt(view.getUint32(4, false));
  return (hi << 32n) | lo;
}

function fromBigInt(bits) {
  const hi = Number((bits >> 32n) & 0xffffffffn);
  const lo = Number(bits & 0xffffffffn);
  view.setUint32(0, hi, false);
  view.setUint32(4, lo, false);
  return view.getFloat64(0, false);
}

export function roundTo48Bits(value) {
  if (!Number.isFinite(value)) return value;
  let bits = toBigInt(value);
  const sign = bits >> 63n;
  let exponent = (bits >> 52n) & 0x7ffn;
  let mantissa = bits & MASK_52;

  // Leave NaN/Infinity/Subnormal untouched
  if (exponent === 0x7ffn || exponent === 0n) {
    return value;
  }

  const keep = mantissa >> 4n;
  const discarded = mantissa & ROUND_GUARD;
  let rounded = keep;

  const HALF = 0x8n;
  if (discarded > HALF || (discarded === HALF && (keep & 1n) === 1n)) {
    rounded = keep + 1n;
    if (rounded >> 48n) {
      // Carry spilled out; renormalise by bumping exponent
      rounded &= KEEP_MASK;
      exponent += 1n;
      if (exponent >= 0x7ffn) {
        return sign === 0n ? Infinity : -Infinity;
      }
    }
  }

  mantissa = (rounded << 4n) & MASK_52;
  bits = (sign << 63n) | (exponent << 52n) | mantissa;
  return fromBigInt(bits);
}

export function formatRounded(value) {
  const rounded = roundTo48Bits(value);
  if (!Number.isFinite(rounded)) {
    return '—';
  }
  const abs = Math.abs(rounded);
  let text;
  if (abs >= 1e12 || (abs > 0 && abs < 1e-6)) {
    text = rounded.toPrecision(12);
  } else {
    text = rounded.toFixed(12);
  }
  if (text.includes('e') || text.includes('E')) {
    return text;
  }
  if (text.includes('.')) {
    while (text.endsWith('0')) text = text.slice(0, -1);
    if (text.endsWith('.')) text = text.slice(0, -1);
  }
  if (text === '-0') return '0';
  return text;
}

export function truncateTo48Bits(value) {
  return roundTo48Bits(value);
}

export function formatTruncated(value) {
  return formatRounded(value);
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
    case '\u2212':
      result = A - B;
      break;
    case '\u00d7':
      result = A * B;
      break;
    case ':':
      if (B === 0) {
        return { value: NaN, text: '—' };
      }
      result = A / B;
      break;
    default:
      return { value: NaN, text: '—' };
  }

  if (!Number.isFinite(result)) {
    return { value: NaN, text: '—' };
  }

  const rounded = roundTo48Bits(result);
  return { value: rounded, text: formatRounded(rounded) };
}
