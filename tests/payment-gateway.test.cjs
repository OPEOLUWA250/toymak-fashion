const assert = require("node:assert/strict");
const { test } = require("node:test");
const { load } = require("./helpers.cjs");

const { PAYSTACK_ENABLED, getPaymentGatewayForCountry, getCheckoutCurrency } = load("lib/utils.ts");

test("with Paystack switched off, every country pays through Stripe", { skip: PAYSTACK_ENABLED }, () => {
  for (const country of ["Nigeria", "United Kingdom", "United States", "Ghana"]) {
    assert.equal(getPaymentGatewayForCountry(country), "stripe", country);
  }
});

test("Nigerian orders are still charged in naira", () => {
  assert.equal(getCheckoutCurrency("Nigeria"), "NGN");
  assert.equal(getCheckoutCurrency("United States"), "USD");
  assert.equal(getCheckoutCurrency("United Kingdom"), "GBP");
});
