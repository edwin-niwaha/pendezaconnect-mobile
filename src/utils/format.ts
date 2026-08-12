export function formatCurrency(value?: string | number | null) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "UGX 0";
  return `UGX ${new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(amount)}`;
}

export function formatDate(value?: string | null) {
  if (!value) return "not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-UG", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function joinMeta(parts: Array<string | number | null | undefined>) {
  return parts.filter((part) => part !== undefined && part !== null && part !== "").join(" - ");
}
