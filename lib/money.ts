// Builds the string from Intl's numeric parts only and appends the currency
// code ourselves: symbol placement differs between ICU versions (server vs
// browser) and would otherwise cause hydration mismatches.
export function formatMoney(value: number, currency = "CHF"): string {
  const amount = new Intl.NumberFormat("fr-CH", { style: "currency", currency })
    .formatToParts(value)
    .filter((part) => part.type !== "currency" && part.type !== "literal")
    .map((part) => part.value)
    .join("");
  return `${amount} ${currency}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)} %`;
}
