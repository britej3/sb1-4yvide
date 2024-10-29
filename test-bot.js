const tradingService = require('./src/services/tradingService');
const logger = require('./src/utils/logger');
const monitoringService = require('./src/services/monitoringService');
const arbitrageService = require('./src/services/arbitrageService');
const sandwichService = require('./src/services/sandwichService');
const validateEnvironment = require('./src/utils/validateEnv');
require('dotenv').config();

async function startBot() {
  try {
    // Validate environment first
    validateEnvironment();
    
    logger.info('Starting trading bot with configuration:', {
      network: 'Polygon',
      wallet: process.env.WALLET_ADDRESS,
      strategies: ['arbitrage', 'sandwich', 'flash-loan']
    });
    
    // Start all services in parallel
    await Promise.all([
      monitoringService.start(),
      arbitrageService.start(),
      sandwichService.start()
    ]);
    
    // Start trading with minimum capital
    await tradingService.start(10); // 10 POL minimum capital
    logger.info('Bot started successfully');
    
    // Log status every 5 seconds
    setInterval(() => {
      const stats = tradingService.getStats();
      const metrics = monitoringService.getMetrics();
      
      logger.info('Bot Status:', {
        running: tradingService.isRunning,
        scanned: metrics.scannedOpportunities,
        valid: metrics.validOpportunities,
        executed: metrics.executedTrades,
        profits: stats.profits
      });
    }, 5000);

  } catch (error) {
    logger.error('Bot startup failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Stopping bot...');
  await monitoringService.stop();
  await arbitrageService.stop();
  await sandwichService.stop();
  await tradingService.stop();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
  process.exit(1);
});

startBot();