const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

// Run the actual TypeScript aggregation without adding a test dependency.
const filename = path.resolve(__dirname, "../lib/admin-data.ts");
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = module.paths;
loaded._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { deriveCustomers } = loaded.exports;

function order(id, overrides = {}) {
  return {
    id, payment_reference: `payment-${id}`, payment_gateway: "stripe",
    customer_email: "customer@example.com", customer_name: "Customer", customer_phone: "0123456789",
    currency: "GBP", total_amount: 10, subtotal: 10, shipping_cost: 0, tax: 0, discount_applied: 0,
    created_at: new Date("2026-08-01T12:00:00Z"), updated_at: new Date("2026-08-01T12:00:00Z"),
    status: "unshipped", items: [], ...overrides,
  };
}

test("keeps the reported four-order GBP/NGN totals separate", () => {
  const [customer] = deriveCustomers([
    order("1", { currency: "NGN", total_amount: 56374 }),
    order("2", { currency: "NGN", total_amount: 37561.5 }),
    order("3", { total_amount: 48.78 }),
    order("4", { currency: "NGN", total_amount: 56374 }),
  ]);
  assert.equal(customer.orderCount, 4);
  assert.deepEqual(customer.totalSpentByCurrency, { GBP: 48.78, NGN: 150309.5 });
});

test("merges email case and whitespace, keeping the latest contact details regardless of input order", () => {
  const older = order("old", { customer_email: " Customer@Example.com " });
  const latest = order("new", {
    customer_name: "Updated name", customer_phone: "9876543210",
    created_at: new Date("2026-09-04T20:37:23Z"),
  });
  for (const orders of [[older, latest], [latest, older]]) {
    const customers = deriveCustomers(orders);
    assert.equal(customers.length, 1);
    assert.equal(customers[0].email, "customer@example.com");
    assert.equal(customers[0].name, "Updated name");
    assert.equal(customers[0].phone, "9876543210");
    assert.equal(customers[0].orderCount, 2);
    assert.equal(customers[0].lastOrderDate.getTime(), latest.created_at.getTime());
  }
});

test("does not double-count repeated order IDs or payment references", () => {
  const original = order("first");
  const [customer] = deriveCustomers([
    original, { ...original }, order("copy", { payment_reference: original.payment_reference }),
    order("second", { payment_reference: "" }), order("third", { payment_reference: "" }),
  ]);
  assert.equal(customer.orderCount, 3);
  assert.equal(customer.totalSpentByCurrency.GBP, 30);
});

test("sums in minor units and supports USD and zero-value orders", () => {
  const [customer] = deriveCustomers([
    order("1", { total_amount: 0.1 }), order("2", { total_amount: 0.2 }),
    order("3", { currency: "USD", total_amount: 12.34 }),
    order("4", { currency: "NGN", total_amount: 0 }),
  ]);
  assert.deepEqual(customer.totalSpentByCurrency, { GBP: 0.3, USD: 12.34, NGN: 0 });
  assert.equal(customer.orderCount, 4);
});

test("uses the final recorded amount including shipping and tax, without applying discounts again", () => {
  const [customer] = deriveCustomers([order("1", {
    subtotal: 33.99, shipping_cost: 7.99, tax: 6.8, discount_applied: 6, total_amount: 48.78,
  })]);
  assert.equal(customer.totalSpentByCurrency.GBP, 48.78);
});

test("sorts customers by last order instead of comparing unrelated currencies", () => {
  const older = order("1", { currency: "NGN", total_amount: 1000000 });
  const newer = order("2", {
    customer_email: "recent@example.com", total_amount: 1,
    created_at: new Date("2026-09-01T12:00:00Z"),
  });
  assert.equal(deriveCustomers([older, newer])[0].email, "recent@example.com");
});

test("handles no orders without inventing customers or mutating input", () => {
  assert.deepEqual(deriveCustomers([]), []);
  const orders = [order("1"), order("2")];
  const before = JSON.stringify(orders);
  deriveCustomers(orders);
  assert.equal(JSON.stringify(orders), before);
});

test("completed refunds reduce spending without changing the original payment", () => {
  const original = order("refund", {total_amount: 30, refunded_amount: 12.50});
  assert.equal(deriveCustomers([original])[0].totalSpentByCurrency.GBP,17.50);
  assert.equal(original.total_amount,30);
});
