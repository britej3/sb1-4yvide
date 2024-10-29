const { web3 } = require('../config/web3');
const logger = require('../utils/logger');
const dexService = require('./dexService');
const { MAX_SLIPPAGE } = require('../utils/constants');

class ExecutionService {
  constructor() {
    this.pendingExecutions = new Map();
    this.maxConcurrent = 5;
    this.executionTimeout = 30000; // 30 seconds
    this.minInterval = 500; // 500ms between executions
    this.lastExecution = 0;
  }

  async executeStrategy(opportunity) {
    try {
      if (this.pendingExecutions.size >= this.maxConcurrent) {
        throw new Error('Max concurrent executions reached');
      }

      const now = Date.now();
      if (now - this.lastExecution < this.minInterval) {
        await new Promise(resolve => setTimeout(resolve, this.minInterval));
      }

      const executionId = `${opportunity.type}-${Date.now()}`;
      this.pendingExecutions.set(executionId, {
        opportunity,
        startTime: now
      });

      let result;
      switch (opportunity.type) {
        case 'triangularArbitrage':
          result = await this.executeTriangularArbitrage(opportunity);
          break;
        case 'flashLoan':
          result = await this.executeFlashLoan(opportunity);
          break;
        case 'sandwich':
          result = await this.executeSandwich(opportunity);
          break;
        case 'marketMaking':
          result = await this.executeMarketMaking(opportunity);
          break;
        default:
          throw new Error(`Unknown strategy type: ${opportunity.type}`);
      }

      this.pendingExecutions.delete(executionId);
      this.lastExecution = Date.now();

      return result;

    } catch (error) {
      logger.error('Strategy execution failed:', error);
      throw error;
    }
  }

  async executeTriangularArbitrage(opportunity) {
    const { tokens } = opportunity;
    
    // Execute trades in sequence
    const trades = [];
    for (let i = 0; i < tokens.length; i++) {
      const tokenIn = tokens[i];
      const tokenOut = tokens[(i + 1) % tokens.length];
      
      const trade = await dexService.executeSwap(
        tokenIn,
        tokenOut,
        opportunity.amount,
        MAX_SLIPPAGE
      );
      
      trades.push(trade);
    }

    return trades;
  }

  async executeFlashLoan(opportunity) {
    // Implementation for flash loan execution
    return null;
  }

  async executeSandwich(opportunity) {
    // Implementation for sandwich execution
    return null;
  }

  async executeMarketMaking(opportunity) {
    // Implementation for market making execution
    return null;
  }

  cleanup() {
    const now = Date.now();
    for (const [id, execution] of this.pendingExecutions.entries()) {
      if (now - execution.startTime > this.executionTimeout) {
        this.pendingExecutions.delete(id);
        logger.warn(`Execution ${id} timed out`);
      }
    }
  }
}

module.exports = new ExecutionService();