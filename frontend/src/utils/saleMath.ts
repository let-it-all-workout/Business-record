import { Sale } from '../types';

/** Same rounding the API uses when it stores a sale. */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  const cents = Math.round((Math.abs(value) + 1e-8) * 100);
  return (sign * cents) / 100;
}

export function effectiveQuantity(sale: Pick<Sale, 'quantity' | 'refundedQuantity'>): number {
  const sold = Number(sale.quantity) || 0;
  const refunded = Number(sale.refundedQuantity) || 0;
  return Math.max(0, sold - refunded);
}

export function saleRevenue(sale: Pick<Sale, 'quantity' | 'refundedQuantity' | 'sellingPrice'>): number {
  return roundMoney(effectiveQuantity(sale) * (Number(sale.sellingPrice) || 0));
}

export function saleProfit(sale: Pick<Sale, 'quantity' | 'refundedQuantity' | 'sellingPrice' | 'purchasePrice'>): number {
  const units = effectiveQuantity(sale);
  const selling = Number(sale.sellingPrice) || 0;
  const cost = Number(sale.purchasePrice) || 0;
  return roundMoney(units * (selling - cost));
}

/** Profit divided by revenue. This is margin, not markup on cost. */
export function marginPercent(profit: number, revenue: number): number {
  if (!revenue) return 0;
  return (profit / revenue) * 100;
}

/** A whole number from a form field. Decimals such as 1.5 are rejected. */
export function wholeQuantity(value: string, minimum = 1): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const units = Number(trimmed);
  if (!Number.isSafeInteger(units) || units < minimum) return null;
  return units;
}
