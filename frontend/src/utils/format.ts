/**
 * Format numbers with commas for thousands separator
 */
export function formatNumber(num: number | string): string {
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numValue)) return '0';
  
  // Format with commas
  return numValue.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Format currency with symbol and commas
 */
export function formatCurrency(
  amount: number | string,
  currency: string = 'USD',
  showSymbol: boolean = true
): string {
  const currencySymbols: Record<string, string> = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'NGN': '₦', 'KES': 'KSh',
    'GHS': '₵', 'ZAR': 'R', 'INR': '₹', 'CNY': '¥', 'JPY': '¥',
    'AUD': 'A$', 'CAD': 'C$', 'CHF': 'CHF', 'AED': 'د.إ', 'SAR': '﷼',
    'EGP': 'E£', 'TZS': 'TSh', 'UGX': 'USh', 'RWF': 'RF', 'ETB': 'Br',
    'MAD': 'د.م.', 'XOF': 'CFA', 'XAF': 'FCFA', 'BRL': 'R$', 'MXN': '$',
    'ARS': '$', 'CLP': '$', 'COP': '$', 'PEN': 'S/', 'PHP': '₱',
    'THB': '฿', 'SGD': 'S$', 'MYR': 'RM', 'IDR': 'Rp', 'VND': '₫',
    'KRW': '₩', 'HKD': 'HK$', 'NZD': 'NZ$', 'SEK': 'kr', 'NOK': 'kr',
    'DKK': 'kr', 'PLN': 'zł', 'CZK': 'Kč', 'HUF': 'Ft', 'RON': 'lei',
    'TRY': '₺', 'ILS': '₪', 'RUB': '₽', 'PKR': '₨', 'BDT': '৳',
    'LKR': 'Rs', 'NPR': 'Rs',
  };

  const numValue = typeof amount === 'string' ? parseFloat(amount) : amount;
  const symbol = currencySymbols[currency] || currency || '$';
  if (!Number.isFinite(numValue)) return showSymbol ? `${symbol}0.00` : '0.00';
  const formatted = numValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return showSymbol ? `${symbol}${formatted}` : formatted;
}

/**
 * Parse formatted number string back to number
 */
export function parseFormattedNumber(formatted: string): number {
  // Remove commas and parse
  const cleaned = formatted.replace(/,/g, '');
  return parseFloat(cleaned) || 0;
}


















