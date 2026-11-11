import assert from 'node:assert/strict';
import {
  allocateIntegers,
  profitForUnits,
  roundMoney,
  weightedPurchasePrice,
  wholeUnits,
} from './calculations.js';

const refundOneOfTen = allocateIntegers(1, [3, 3, 4]);
assert.deepEqual(refundOneOfTen, [0, 0, 1]);
assert.equal(refundOneOfTen.reduce((sum, n) => sum + n, 0), 1);

const refundOneOfThree = allocateIntegers(1, [2, 1]);
assert.deepEqual(refundOneOfThree, [1, 0]);

const full = allocateIntegers(10, [3, 3, 4]);
assert.deepEqual(full, [3, 3, 4]);

assert.equal(roundMoney(1.005), 1.01);
assert.equal(roundMoney(12.345), 12.35);
assert.equal(roundMoney(-1.005), -1.01);
assert.equal(profitForUnits(3, 20, 12.5), 22.5);
assert.equal(profitForUnits(3, 20, 10.01), 29.97);
assert.equal(wholeUnits(4), 4);
assert.throws(() => wholeUnits(1.5), /whole number/);
assert.throws(() => wholeUnits('1.5'), /whole number/);
assert.equal(weightedPurchasePrice([
  { quantity: 2, purchasePrice: 10 },
  { quantity: 1, purchasePrice: 13 },
]), 11);

console.log('calculation checks passed');
