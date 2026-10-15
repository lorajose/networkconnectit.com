export function parsePriceToCents(value: string) {
  const normalized = value.trim().replace(/[$,\s]/g, "");

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [whole, fractional = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(fractional.padEnd(2, "0"));

  if (!Number.isSafeInteger(cents) || cents < 0) {
    return null;
  }

  return cents;
}

export function formatPriceFromCents(
  priceCents: number,
  currency = "USD",
  locale = "en-US"
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency
  }).format(priceCents / 100);
}
