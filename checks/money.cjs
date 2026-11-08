const assert = require("node:assert/strict");

const {
  parseAmountToCentavos,
  formatCentavos,
} = require("../src/lib/money.ts");

assert.equal(parseAmountToCentavos("180.50"), 18050);
assert.equal(parseAmountToCentavos("1.234"), null);
assert.equal(formatCentavos(18050), "₱180.50");
assert.equal(formatCentavos(0), "₱0.00");
assert.equal(parseAmountToCentavos(""), null);
assert.equal(parseAmountToCentavos(" "), null);
assert.equal(parseAmountToCentavos("0"), null);
assert.equal(parseAmountToCentavos("-1"), null);
assert.equal(parseAmountToCentavos("hello"), null);
assert.equal(parseAmountToCentavos(" 1.25 "), 125);
console.log("Money checks passed");

assert.equal(parseAmountToCentavos("90071992547409.91"), Number.MAX_SAFE_INTEGER);
assert.equal(parseAmountToCentavos("90071992547409.92"), null);
assert.equal(parseAmountToCentavos("Infinity"), null);
assert.equal(parseAmountToCentavos("1e3"), null);
assert.equal(parseAmountToCentavos("0.01"), 1);
assert.equal(formatCentavos(-125), "-₱1.25");
assert.equal(formatCentavos(Number.MAX_SAFE_INTEGER), "₱90,071,992,547,409.91");
for (let fraction = 0; fraction < 100; fraction++) {
  const text = `90071992547409.${String(fraction).padStart(2, "0")}`;
  const exact = 9007199254740900n + BigInt(fraction);
  assert.equal(parseAmountToCentavos(text), exact > BigInt(Number.MAX_SAFE_INTEGER) ? null : Number(exact));
}
assert.throws(() => formatCentavos(1.5));
assert.throws(() => formatCentavos(Infinity));
console.log("Money boundary checks passed");
