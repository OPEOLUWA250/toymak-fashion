const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./helpers.cjs');

const { weightDraftFromKg, parseWeight, switchWeightUnit, formatOtherUnit } = load('lib/product-weight.ts');

test('saved weights open in grams below 1 kg and in kilograms from 1 kg', () => {
  assert.deepEqual(weightDraftFromKg(0.5), { value: '500', unit: 'g' });
  assert.deepEqual(weightDraftFromKg(0.035), { value: '35', unit: 'g' });
  assert.deepEqual(weightDraftFromKg(1), { value: '1', unit: 'kg' });
  assert.deepEqual(weightDraftFromKg(1.25), { value: '1.25', unit: 'kg' });
});

test('grams and kilograms are both saved as kilograms', () => {
  assert.deepEqual(parseWeight({ value: '350', unit: 'g' }), { kg: 0.35, error: null });
  assert.deepEqual(parseWeight({ value: '0.5', unit: 'kg' }), { kg: 0.5, error: null });
  assert.deepEqual(parseWeight({ value: '0,5', unit: 'kg' }), { kg: 0.5, error: null });
  assert.deepEqual(parseWeight({ value: ' 1.2 ', unit: 'kg' }), { kg: 1.2, error: null });
  assert.deepEqual(parseWeight({ value: '1', unit: 'g' }), { kg: 0.001, error: null });
});

test('empty, zero, tiny and too-heavy weights are refused with a reason', () => {
  for (const draft of [{ value: '', unit: 'g' }, { value: '0', unit: 'kg' }, { value: '-2', unit: 'g' }, { value: 'abc', unit: 'kg' }]) {
    assert.equal(parseWeight(draft).kg, null);
    assert.match(parseWeight(draft).error, /350 g or 1\.2 kg/);
  }
  assert.match(parseWeight({ value: '0.2', unit: 'g' }).error, /at least 1 g/);
  assert.match(parseWeight({ value: '71', unit: 'kg' }).error, /at most 70 kg/);
  assert.match(parseWeight({ value: '70001', unit: 'g' }).error, /at most 70 kg/);
  assert.equal(parseWeight({ value: '70', unit: 'kg' }).kg, 70);
});

test('switching unit keeps the same weight, and leaves unreadable text alone', () => {
  assert.deepEqual(switchWeightUnit({ value: '500', unit: 'g' }, 'kg'), { value: '0.5', unit: 'kg' });
  assert.deepEqual(switchWeightUnit({ value: '1.2', unit: 'kg' }, 'g'), { value: '1200', unit: 'g' });
  assert.deepEqual(switchWeightUnit({ value: '', unit: 'g' }, 'kg'), { value: '', unit: 'kg' });
  const same = { value: '5', unit: 'kg' };
  assert.equal(switchWeightUnit(same, 'kg'), same);
});

test('the hint shows the weight in the other unit', () => {
  assert.equal(formatOtherUnit({ kg: 0.35 }, 'g'), '0.35 kg');
  assert.equal(formatOtherUnit({ kg: 1.2 }, 'kg'), '1,200 g');
});
