/**
 * Dynamic platform fee calculator.
 * Fee is hidden — users only see their total, not the breakdown.
 */

const TIERS = [
  { max: 500,  sellerRate: 0.03, buyerRate: 0.02 },
  { max: 2000, sellerRate: 0.025, buyerRate: 0.02 },
  { max: 5000, sellerRate: 0.02, buyerRate: 0.015 },
  { max: Infinity, sellerRate: 0.015, buyerRate: 0.01 },
];

/**
 * Calculate fees for a given base price.
 * @param {number} basePrice - The item's agreed price
 * @returns {{ buyerFee, sellerFee, buyerTotal, sellerReceives, platformEarned }}
 */
function calculateFees(basePrice) {
  const tier = TIERS.find((t) => basePrice <= t.max);
  const buyerFee = Math.ceil(basePrice * tier.buyerRate);
  const sellerFee = Math.ceil(basePrice * tier.sellerRate);
  return {
    buyerFee,
    sellerFee,
    buyerTotal: basePrice + buyerFee,
    sellerReceives: basePrice - sellerFee,
    platformEarned: buyerFee + sellerFee,
  };
}

module.exports = { calculateFees };
