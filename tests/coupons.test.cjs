const assert = require("node:assert/strict");
const { test } = require("node:test");
const { load } = require("./helpers.cjs");

const { canonicalEmail } = load("lib/email-identity.ts");
const { isDisposableEmail } = load("lib/server/disposable-email.ts");

// One signup row (looked up by coupon code) and a count of earlier orders,
// shaped like the real Supabase query chains.
function loadSignups(row, previousOrders = 0) {
  const signups = { select: () => signups, eq: () => signups, maybeSingle: async () => ({ data: row, error: null }) };
  const orders = {
    select: () => orders,
    eq: () => orders,
    then: (resolve) => resolve({ count: previousOrders, error: null }),
  };
  return load("lib/server/signups.ts", {
    "./supabase": { getSupabaseAdmin: () => ({ from: (table) => (table === "orders" ? orders : signups) }) },
    "./settings": { getStoreSettings: async () => ({ welcomeDiscountPercent: 15 }) },
  });
}

const signup = { email: "jane.doe@gmail.com", coupon_redeemed_at: null };

test("one mailbox, many spellings, one canonical address", () => {
  assert.equal(canonicalEmail(" Jane.Doe+promo@Gmail.com "), "janedoe@gmail.com");
  assert.equal(canonicalEmail("janedoe@googlemail.com"), "janedoe@gmail.com");
  assert.equal(canonicalEmail("jane+shop@outlook.com"), "jane@outlook.com");
  assert.equal(canonicalEmail("jane+shop@icloud.com"), "jane@icloud.com");
  // Elsewhere "+" and dots can be different mailboxes, so they're kept.
  assert.equal(canonicalEmail("Jane.Doe+shop@example.com"), "jane.doe+shop@example.com");
});

test("throwaway inbox services are recognised, real providers are not", () => {
  assert.equal(isDisposableEmail("x@mailinator.com"), true);
  assert.equal(isDisposableEmail("x@sub.mailinator.com"), true);
  assert.equal(isDisposableEmail("x@10minutemail.com"), true);
  assert.equal(isDisposableEmail("x@guerrillamail.com"), true);
  for (const real of ["x@gmail.com", "x@yahoo.com", "x@outlook.com", "x@icloud.com", "x@toymakfashion.com"]) {
    assert.equal(isDisposableEmail(real), false, real);
  }
});

test("a welcome code works with the mailbox it was sent to, however it's spelled", async () => {
  const { validateCouponCode } = loadSignups(signup);
  assert.deepEqual(await validateCouponCode("welcome-abc234", "Jane.Doe@gmail.com"), { valid: true, discountPercent: 15 });
  assert.equal((await validateCouponCode("WELCOME-ABC234", "janedoe+shop@gmail.com")).valid, true);
});

test("a welcome code is refused for anyone else's email", async () => {
  const { validateCouponCode } = loadSignups(signup);
  for (const other of ["friend@gmail.com", "jane.doe@yahoo.com", ""]) {
    assert.deepEqual(await validateCouponCode("WELCOME-ABC234", other), { valid: false, discountPercent: 0, reason: "invalid" });
  }
});

test("a used or unknown code is refused even with the right email", async () => {
  assert.equal((await loadSignups({ ...signup, coupon_redeemed_at: "2026-10-01" }).validateCouponCode("WELCOME-ABC234", "jane.doe@gmail.com")).valid, false);
  assert.equal((await loadSignups(null).validateCouponCode("WELCOME-ABC234", "jane.doe@gmail.com")).valid, false);
});

test("a welcome code is for a first order only", async () => {
  const { validateCouponCode } = loadSignups(signup, 1);
  assert.deepEqual(await validateCouponCode("WELCOME-ABC234", "jane.doe@gmail.com"), { valid: false, discountPercent: 0, reason: "already-ordered" });
});
