/**
 * Format a KnightCoin value to always show exactly 2 decimal places.
 * Examples: 1000 → "1,000.00", 42.5 → "42.50", 0.123 → "0.12"
 */
export function formatKC(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
