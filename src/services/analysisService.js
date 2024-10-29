const logger = require('../utils/logger');
const { calculateIndicators } = require('../utils/indicators');
const { RSI_PERIOD, RSI_OVERBOUGHT, RSI_OVERSOLD } = require('../utils/constants');

class AnalysisService {
  constructor() {
    this.analysisCache = new Map();
    this.volatilityCache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
    this.minAnalysisInterval = 2000; // 2 seconds
    this.lastAnalysis = null;
  }

  async analyzeMarket(token, priceHistory) {
    const now = Date.now();
    const cacheKey = `${token}-${now}`;
    
    // Return cached analysis if available and recent
    const cached = this.analysisCache.get(cacheKey);
    if (cached && now - cached.timestamp < this.cacheTimeout) {
      return cached.analysis;
    }

    // Ensure minimum interval between analyses
    if (this.lastAnalysis && now - this.lastAnalysis < this.minAnalysisInterval) {
      return null;
    }

    try {
      const indicators = calculateIndicators(priceHistory);
      const volatility = this.calculateVolatility(priceHistory);
      
      const analysis = {
        indicators,
        volatility,
        signals: this.generateSignals(indicators, volatility),
        timestamp: now
      };

      // Cache the analysis
      this.analysisCache.set(cacheKey, {
        analysis,
        timestamp: now
      });

      this.lastAnalysis = now;
      return analysis;
    } catch (error) {
      logger.error('Market analysis failed:', error);
      return null;
    }
  }

  generateSignals(indicators, volatility) {
    const signals = {
      buy: false,
      sell: false,
      strength: 0
    };

    // RSI signals
    if (indicators.rsi < RSI_OVERSOLD) {
      signals.buy = true;
      signals.strength += 1;
    } else if (indicators.rsi > RSI_OVERBOUGHT) {
      signals.sell = true;
      signals.strength += 1;
    }

    // MACD signals
    if (indicators.macd.histogram > 0 && indicators.macd.signal > 0) {
      signals.buy = true;
      signals.strength += 1;
    } else if (indicators.macd.histogram < 0 && indicators.macd.signal < 0) {
      signals.sell = true;
      signals.strength += 1;
    }

    // Trend signals
    if (indicators.ema20 > indicators.ema50) {
      signals.buy = true;
      signals.strength += 0.5;
    } else if (indicators.ema20 < indicators.ema50) {
      signals.sell = true;
      signals.strength += 0.5;
    }

    // Adjust strength based on volatility
    if (volatility > 0.02) { // High volatility
      signals.strength *= 0.8; // Reduce signal strength
    }

    return signals;
  }

  calculateVolatility(priceHistory) {
    const prices = priceHistory.map(p => p.price);
    const returns = [];
    
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  clearCache() {
    const now = Date.now();
    for (const [key, value] of this.analysisCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.analysisCache.delete(key);
      }
    }
  }
}

module.exports = new AnalysisService();