export const currency = (n, sym='₹') => `${sym}${Number(n || 0).toFixed(2)}`
