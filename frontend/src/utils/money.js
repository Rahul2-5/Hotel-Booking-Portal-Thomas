const moneyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

export function formatMoney(amount) {
  return moneyFormatter.format(amount);
}
