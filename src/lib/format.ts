export function formatMoney(amount: number, symbol: string | null | undefined) {
  const s = (symbol ?? '').trim();
  const value = (Math.round(amount * 100) / 100).toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  if (!s) return value;
  return /^[A-Za-z]+$/.test(s) ? `${s} ${value}` : `${s}${value}`;
}

/** Returns true when now is inside opening/closing time. Null-safe. */
export function isWithinOpeningHours(open: string | null, close: string | null): boolean | null {
  if (!open || !close) return null;
  const parse = (t: string) => {
    const [h, m] = t.split(':');
    const hh = Number(h);
    const mm = Number(m ?? 0);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    return hh * 60 + mm;
  };
  const o = parse(open);
  const c = parse(close);
  if (o === null || c === null) return null;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  return c >= o ? cur >= o && cur <= c : cur >= o || cur <= c;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}
