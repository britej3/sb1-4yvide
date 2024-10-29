import logger from '../utils/logger.js';

class MonitoringService {
  constructor() {
    this.metrics = {
      scannedOpportunities: 0,
      validOpportunities: 0,
      executedTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      lastOpportunityTime: null,
      averageExecutionTime: 0,
      profitablePositions: 0
    };
    
    this.alerts = [];
    this.isRunning = false;
    this.monitoringInterval = null;
  }

  async start() {
    this.isRunning = true;
    this.monitoringInterval = setInterval(() => this.logMetrics(), 5000);
    logger.info('Monitoring service started');
  }

  async stop() {
    this.isRunning = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    logger.info('Monitoring service stopped');
  }

  logMetrics() {
    const timeSinceLastOpportunity = this.metrics.lastOpportunityTime ? 
      Date.now() - this.metrics.lastOpportunityTime : 
      null;

    logger.info('Bot Metrics:', {
      scanned: this.metrics.scannedOpportunities,
      valid: this.metrics.validOpportunities,
      executed: this.metrics.executedTrades,
      successful: this.metrics.successfulTrades,
      profitable: this.metrics.profitablePositions,
      avgExecutionTime: `${this.metrics.averageExecutionTime.toFixed(2)}ms`,
      timeSinceLastOpportunity: timeSinceLastOpportunity ? 
        `${(timeSinceLastOpportunity / 1000).toFixed(1)}s ago` : 
        'No opportunities yet'
    });
  }

  getMetrics() {
    return {
      ...this.metrics,
      winRate: this.metrics.executedTrades > 0 ? 
        (this.metrics.successfulTrades / this.metrics.executedTrades) * 100 : 0,
      recentAlerts: this.getRecentAlerts()
    };
  }
}

export const monitoringService = new MonitoringService();
export default monitoringService;