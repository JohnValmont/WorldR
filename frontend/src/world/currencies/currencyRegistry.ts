export type CurrencyConfig = {
  id: string;
  name: string;
  symbol: string;
  locale: string;
  decimalPlaces: number;
};

export const WORLD_CURRENCIES: Record<string, CurrencyConfig> = {
  'dollar': {
    id: 'dollar',
    name: 'Dollar',
    symbol: '$',
    locale: 'en-US',
    decimalPlaces: 0
  }
};

export function getCurrencyConfig(currencyId: string): CurrencyConfig {
  return WORLD_CURRENCIES[currencyId] || WORLD_CURRENCIES['dollar']; // Default fallback for safety
}
