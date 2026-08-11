export const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const fmt = (n, currency = 'KRW') => {
  const num = Number(n) || 0;
  if (currency === 'USD') {
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return num.toLocaleString('ko-KR') + '원';
};

export const stripCommas = (v) => v.replace(/,/g, '');

export const fmtInput = (raw, currency) => {
  const digits = stripCommas(raw).replace(/[^0-9.]/g, '');
  if (!digits) return '';
  if (currency === 'USD') return digits;
  const num = parseInt(digits, 10);
  if (isNaN(num)) return '';
  return num.toLocaleString('ko-KR');
};

export const USD_TO_KRW = 1500; // 1 USD = 1,500 KRW (기본 폴백값)

export const toKRW = (amount, currency = 'KRW', rate = USD_TO_KRW) => {
  const n = Number(amount) || 0;
  return currency === 'USD' ? Math.round(n * rate) : n;
};

export const calcCostKRW = (item, rate = USD_TO_KRW) => {
  if (item.totalCost !== undefined && item.totalCost !== null) {
    return Number(item.totalCost);
  }
  return toKRW(item.buyPrice, item.buyCurrency || 'KRW', rate) +
    (Number(item.costWash) || 0) +
    (Number(item.costRepair) || 0) +
    (Number(item.costShip) || 0) +
    (Number(item.costDuty) || 0);
};

export const todayStr = () => {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

export const isSameMonth = (dateStr, year, month) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (year !== undefined && month !== undefined) {
    return d.getFullYear() === year && d.getMonth() === month;
  }
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};
