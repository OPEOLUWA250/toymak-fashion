const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./helpers.cjs');

const { normaliseMatchingData } = load('lib/meta-matching.ts');
const address = (country, postalCode = '', city = '') => ({ country, postalCode, city });

test('phones become international digits for the buyer\'s country', () => {
  const ph = (phone, country) => normaliseMatchingData({ customer_phone: phone, shipping_address: address(country) }).ph;
  assert.equal(ph('07700 900123', 'United Kingdom'), '447700900123');
  assert.equal(ph('+44 7700 900123', 'Nigeria'), '447700900123');
  assert.equal(ph('0044 7700 900123', 'United Kingdom'), '447700900123');
  assert.equal(ph('447700900123', 'UK'), '447700900123');
  assert.equal(ph('0803 123 4567', 'Nigeria'), '2348031234567');
  assert.equal(ph('(555) 123-4567', 'United States'), '15551234567');
  assert.equal(ph('612345678', 'France'), undefined);
});

test('postcodes, cities, names and countries follow Meta\'s format', () => {
  const data = normaliseMatchingData({
    customer_email: 'A@B.COM',
    customer_name: "  Mary-Jane  O'Neil Smith ",
    shipping_address: address('United Kingdom', 'M1 1AE', 'St. Albans'),
  });
  assert.deepEqual(data, { em: 'a@b.com', fn: 'maryjane', ln: 'oneilsmith', ct: 'stalbans', zp: 'm11', country: 'gb' });
  assert.equal(normaliseMatchingData({ shipping_address: address('United States', '90210-1234') }).zp, '90210');
  assert.equal(normaliseMatchingData({ shipping_address: address('Nigeria', '100001') }).zp, '100001');
});

test('missing or placeholder details are left out', () => {
  assert.deepEqual(normaliseMatchingData({ customer_name: 'Guest', customer_email: '', shipping_address: address('Narnia') }), {});
  assert.deepEqual(normaliseMatchingData({}), {});
});
