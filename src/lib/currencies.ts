
export type Currency = {
  code: string;
  name: string;
  symbol: string;
};

export const currencies: Currency[] = [
  { code: 'USD', name: 'United States Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
];

export function getCurrencySymbol(code: string): string {
  const currency = currencies.find(c => c.code === code);
  return currency ? currency.symbol : '$';
}
