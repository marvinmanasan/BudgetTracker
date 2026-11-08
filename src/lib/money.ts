export function parseAmountToCentavos(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") {
    return null;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  // Convert the digits separately so decimal floating-point rounding cannot lose a centavo.
  const [whole, fraction = ""] = trimmed.split(".");
  const centavos = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(centavos)) {
    return null;
  }
  return centavos;
}

export function formatCentavos(centavos: number): string {
  if (!Number.isSafeInteger(centavos)) throw new Error("Expected whole, safe centavos.");
  const absolute = Math.abs(centavos);
  const whole = Math.trunc(absolute / 100).toLocaleString("en-PH");
  const fraction = String(absolute % 100).padStart(2, "0");
  return `${centavos < 0 ? "-" : ""}₱${whole}.${fraction}`;
}
