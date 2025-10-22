// Pure string helpers for digit entry/editing

export function normalizeZeros(s) {
  if (s === '' || s === '-' || s === '.' || s === '-.') return s;
  const neg = s.startsWith('-');
  let t = neg ? s.slice(1) : s;
  if (t.startsWith('0') && t !== '0' && !t.startsWith('0.')) {
    t = t.replace(/^0+/, '');
    if (t === '') t = '0';
  }
  return neg ? '-' + t : t;
}

export function appendDigitStr(s, digit) {
  let t = s;
  if (t === '-') t = '-0';
  if (t === '') t = '0';
  t += digit;
  return normalizeZeros(t);
}

export function appendDotStr(s) {
  let t = s;
  if (t === '' || t === '-') t += '0';
  if (!t.includes('.')) t += '.';
  return t;
}

export function toggleSignStr(s) {
  if (s.startsWith('-')) return s.slice(1);
  return '-' + (s || '');
}

