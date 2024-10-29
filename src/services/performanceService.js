const logger = require('../utils/logger');

class PerformanceService {
  constructor() {
    this.maxDailyLoss = 0.03;
    this.maxConsecutiveLosses = 3;
    this.consecutiveLosses = 0;
  }

  async checkPerformanceMetrics(profits, initialCapital, trades) {
    if (profits.daily < -this.maxDailyLoss * initialCapital) {
      logger.warn('Daily loss limit reached');
      return false;
    }

    if (this.consecutiveLosses >= this.maxConsecutiveLosses) {
      logger.warn('Max consecutive losses reached');
      return false;
    }

    const roi = (profits.total / initialCapital) * 100;
    const winRate = trades.length > 0 ? 
      (trades.filter(t => t.profit > 0).length / trades.length) * 100 : 0;

    logger.info(`Performance Metrics - ROI: ${roi.toFixed(2)}%, Win Rate: ${winRate.toFixed(2)}%`);
    return true;
  }

  updateProfitMetrics(profit, profits) {
    profits.total += profit;
    profits.daily += profit;
    profits.weekly += profit;

    if (profit < 0) {
      this.consecutiveLosses++;
    } else {
      this.consecutiveLosses = 0;
    }

    return profits;
  }

  getPerformanceStats(trades, profits, initialCapital) {
    return {
      consecutiveLosses: this.consecutiveLosses,
      roi: (profits.total / initialCapital) * 100,
      winRate: trades.length > 0 ? 
        (trades.filter(t => t.profit > 0).length / trades.length) * 100 : 0
    };
  }
}

module.exports = new PerformanceService();