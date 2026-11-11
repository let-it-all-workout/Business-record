/** Money and stock math shared by sale, refund, and edit. */

export function roundMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    throw inputError('Amount must be a number');
  }
  const sign = amount < 0 ? -1 : 1;
  // The small nudge keeps values such as 1.005 and 12.345 from landing just under the cent.
  const cents = Math.round((Math.abs(amount) + 1e-8) * 100);
  return (sign * cents) / 100;
}

export function wholeUnits(value, label = 'Quantity') {
  const units = Number(value);
  if (!Number.isInteger(units)) {
    throw inputError(`${label} must be a whole number`);
  }
  return units;
}

export function profitForUnits(quantity, sellingPrice, purchasePrice) {
  return roundMoney(Number(quantity) * (Number(sellingPrice) - Number(purchasePrice)));
}

export function weightedPurchasePrice(lines) {
  const units = lines.reduce((sum, line) => sum + Number(line.quantity), 0);
  if (units <= 0) return 0;
  const cost = lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.purchasePrice), 0);
  return roundMoney(cost / units);
}

/**
 * Split an integer across weights so the shares are integers and sum to amount.
 * Uses the largest-remainder method. Math.round on each share can drop units.
 */
export function allocateIntegers(amount, weights) {
  if (!Number.isInteger(amount)) {
    throw inputError('Allocation amount must be a whole number');
  }
  const sign = amount < 0 ? -1 : 1;
  const absolute = Math.abs(amount);
  const total = weights.reduce((sum, weight) => sum + Number(weight), 0);
  if (absolute === 0) return weights.map(() => 0);
  if (!Number.isInteger(total) || total <= 0) {
    throw inputError('Cannot split units across empty stock lines');
  }
  if (absolute > total) {
    throw inputError('Cannot move more units than these batches hold');
  }

  const raw = weights.map((weight) => (absolute * Number(weight)) / total);
  const base = raw.map((value) => Math.floor(value));
  let left = absolute - base.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  const shares = base.slice();
  for (let i = 0; i < left; i += 1) {
    shares[order[i].index] += 1;
  }
  for (let i = 0; i < shares.length; i += 1) {
    if (shares[i] > Number(weights[i])) {
      throw inputError('Stock allocation exceeded a batch');
    }
  }
  return shares.map((share) => share * sign);
}

export function inputError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}
