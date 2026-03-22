/**
 * Logarithmic Market Scoring Rule (LMSR) implementation
 * for mutually exclusive multi-outcome markets.
 *
 * Cost function:  C(q) = b * ln( Σ_i  e^(q_i / b) )
 * Price of outcome i:  p_i(q) = e^(q_i / b) / Σ_j e^(q_j / b)   (softmax)
 *
 * All prices are in [0,1] and always sum to 1.
 */

/**
 * Compute the cost function C(q) = b * ln( Σ e^(q_i/b) )
 * We use the log-sum-exp trick for numerical stability.
 */
export function costFunction(q: number[], b: number): number {
  const maxQ = Math.max(...q);
  const sumExp = q.reduce((acc, qi) => acc + Math.exp((qi - maxQ) / b), 0);
  return b * (maxQ / b + Math.log(sumExp));
}

/**
 * Compute the price vector (probabilities) for all outcomes.
 * p_i = e^(q_i/b) / Σ_j e^(q_j/b)   (softmax)
 */
export function priceVector(q: number[], b: number): number[] {
  const maxQ = Math.max(...q);
  const exps = q.map((qi) => Math.exp((qi - maxQ) / b));
  const sumExp = exps.reduce((acc, e) => acc + e, 0);
  return exps.map((e) => e / sumExp);
}

/**
 * Compute the cost of buying `delta` shares of outcome `k`.
 * cost = C(q') - C(q)  where q' = q + delta * e_k
 */
export function tradeCost(q: number[], b: number, k: number, delta: number): number {
  const qPrime = q.map((qi, i) => (i === k ? qi + delta : qi));
  return costFunction(qPrime, b) - costFunction(q, b);
}

/**
 * Execute a trade: buy `delta` shares of outcome `k`.
 * Returns { cost, newQ, newPrices, avgPrice }.
 */
export function executeTrade(
  q: number[],
  b: number,
  k: number,
  delta: number
): {
  cost: number;
  newQ: number[];
  newPrices: number[];
  avgPrice: number;
} {
  const cost = tradeCost(q, b, k, delta);
  const newQ = q.map((qi, i) => (i === k ? qi + delta : qi));
  const newPrices = priceVector(newQ, b);
  const avgPrice = delta !== 0 ? cost / delta : newPrices[k];
  return { cost, newQ, newPrices, avgPrice };
}

/**
 * Given a KC amount to spend and the current state, compute how many
 * shares can be purchased for outcome k.
 * We solve: C(q + Δ·e_k) - C(q) = kcAmount
 * Using binary search since C is monotonically increasing in Δ.
 */
export function sharesForCost(
  q: number[],
  b: number,
  k: number,
  kcAmount: number
): number {
  // Binary search for the number of shares
  let lo = 0;
  let hi = kcAmount * 20; // upper bound: at min price ~0.05, shares ≈ amount/0.05
  const maxIter = 100;
  const tolerance = 0.0001;

  for (let i = 0; i < maxIter; i++) {
    const mid = (lo + hi) / 2;
    const cost = tradeCost(q, b, k, mid);
    if (Math.abs(cost - kcAmount) < tolerance) {
      return mid;
    }
    if (cost < kcAmount) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

/**
 * Default liquidity parameter for new markets.
 * Higher b = more liquidity, less price impact per trade.
 * Lower b = less liquidity, more price impact.
 * b = 100 means the AMM can lose at most ~100 KC.
 */
export const DEFAULT_LMSR_B = 100;

/**
 * Initialize q vector for a market with n options at equal probabilities.
 * For equal prices, all q_i should be 0 (softmax of equal values = 1/n each).
 */
export function initializeQ(numOptions: number): number[] {
  return new Array(numOptions).fill(0);
}
