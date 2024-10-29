function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i < period + 1; i++) {
    const difference = prices[i] - prices[i - 1];
    if (difference >= 0) {
      gains += difference;
    } else {
      losses -= difference;
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  return 100 - (100 / (1 + (avgGain / avgLoss)));
}

function calculateEMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1];

  const multiplier = 2 / (period + 1);
  let ema = prices[0];

  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

function calculateMACD(prices) {
  const shortEMA = calculateEMA(prices, 12);
  const longEMA = calculateEMA(prices, 26);
  const macdLine = shortEMA - longEMA;
  const signalLine = calculateEMA([macdLine], 9);

  return {
    signal: signalLine,
    histogram: macdLine - signalLine
  };
}

function calculateVolatility(prices, period = 20) {
  if (prices.length < period) return 0;

  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
}

function calculateMomentum(prices, period = 10) {
  if (prices.length < period) return 0;
  return (prices[prices.length - 1] - prices[prices.length - period]) / prices[prices.length - period];
}

function calculateIndicators(priceHistory) {
  const closes = priceHistory.map(p => p.price);
  return {
    rsi: calculateRSI(closes, 14),
    macd: calculateMACD(closes),
    ema20: calculateEMA(closes, 20),
    ema50: calculateEMA(closes, 50),
    volatility: calculateVolatility(closes, 20),
    momentum: calculateMomentum(closes, 10)
  };
}

module.exports = {
  calculateIndicators,
  calculateRSI,
  calculateEMA,
  calculateMACD,
  calculateVolatility,
  calculateMomentum
};