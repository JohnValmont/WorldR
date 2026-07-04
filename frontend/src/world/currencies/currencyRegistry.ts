export type CurrencyConfig = {
  id: string;
  name: string;
  symbol: string;
  locale: string;
  decimalPlaces: number;
};

export const WORLD_CURRENCIES: Record<string, CurrencyConfig> = {
  'drennian-day': {
    id: 'drennian-day',
    name: 'Drennian Day',
    symbol: '₯',
    locale: 'en-US',
    decimalPlaces: 0
  }
};

export function getCurrencyConfig(currencyId: string): CurrencyConfig {
  return WORLD_CURRENCIES[currencyId] || WORLD_CURRENCIES['drennian-day']; // Default fallback for safety
}
