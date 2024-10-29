import { Web3 } from 'web3';
import logger from '../utils/logger.js';
import web3Service from '../config/web3.js';

class SandwichService {
  constructor() {
    this.web3 = web3Service.web3;
    this.minProfitThreshold = this.web3.utils.toWei('0.05', 'ether');
    this.maxGasPrice = this.web3.utils.toWei('100', 'gwei');
    this.pendingTxs = new Map();
    this.isRunning = false;
    this.scanInterval = null;
  }

  async start() {
    if (this.isRunning) return;
    
    try {
      this.isRunning = true;
      logger.info('Starting sandwich scanner');
      
      // Subscribe to pending transactions
      const provider = this.web3.currentProvider;
      provider.on('pending', (tx) => {
        this.handlePendingTransaction(tx);
      });
    } catch (error) {
      logger.error('Failed to start sandwich scanner:', error);
      this.isRunning = false;
    }
  }

  async stop() {
    this.isRunning = false;
    if (this.web3.currentProvider) {
      this.web3.currentProvider.removeAllListeners('pending');
    }
    logger.info('Sandwich scanner stopped');
  }

  async handlePendingTransaction(txHash) {
    try {
      if (!this.isRunning) return;

      const tx = await this.web3.eth.getTransaction(txHash);
      if (!tx || this.pendingTxs.has(tx.hash)) return;

      if (this.isSwapTransaction(tx)) {
        const opportunity = await this.analyzeSandwichOpportunity(tx);
        if (opportunity) {
          this.pendingTxs.set(tx.hash, {
            opportunity,
            timestamp: Date.now()
          });
        }
      }
    } catch (error) {
      logger.debug('Error handling pending transaction:', error.message);
    }
  }

  async findSandwichOpportunities() {
    if (!this.isRunning) return [];

    try {
      const opportunities = [];
      const now = Date.now();

      // Clean old transactions first
      this.cleanupPendingTransactions();

      // Get all valid opportunities
      for (const [hash, data] of this.pendingTxs.entries()) {
        if (now - data.timestamp < 10000) { // Only transactions from last 10 seconds
          opportunities.push(data.opportunity);
        }
      }

      return opportunities;

    } catch (error) {
      logger.error('Error finding sandwich opportunities:', error);
      return [];
    }
  }

  cleanupPendingTransactions() {
    const now = Date.now();
    for (const [hash, data] of this.pendingTxs.entries()) {
      if (now - data.timestamp > 30000) { // Remove after 30 seconds
        this.pendingTxs.delete(hash);
      }
    }
  }

  isSwapTransaction(tx) {
    if (!tx || !tx.input) return false;

    const swapMethods = [
      'swapExactTokensForTokens',
      'swapTokensForExactTokens',
      'swapExactETHForTokens',
      'swapTokensForExactETH'
    ];
    
    return swapMethods.some(method => 
      tx.input.includes(this.web3.utils.sha3(method).slice(0, 10))
    );
  }

  async analyzeSandwichOpportunity(tx) {
    try {
      if (!tx || tx.gasPrice > this.maxGasPrice) {
        return null;
      }

      const decoded = this.decodeSwapTransaction(tx);
      if (!decoded) return null;

      const { tokenIn, tokenOut, amount } = decoded;
      const frontRunAmount = Math.floor(amount * 0.2); // 20% of victim's amount
      
      const profit = await this.simulateSandwichProfit(
        tokenIn, 
        tokenOut, 
        frontRunAmount,
        amount
      );

      if (profit > this.minProfitThreshold) {
        return {
          type: 'sandwich',
          targetTx: tx.hash,
          tokenIn,
          tokenOut,
          frontRunAmount,
          backRunAmount: frontRunAmount,
          expectedProfit: profit,
          maxGas: this.web3.utils.toWei('150', 'gwei')
        };
      }

      return null;
    } catch (error) {
      logger.error('Error analyzing sandwich opportunity:', error);
      return null;
    }
  }

  decodeSwapTransaction(tx) {
    try {
      const methodId = tx.input.slice(0, 10);
      const params = tx.input.slice(10);

      return {
        tokenIn: '0x' + params.slice(24, 64),
        tokenOut: '0x' + params.slice(88, 128),
        amount: parseInt(params.slice(128, 192), 16)
      };
    } catch (error) {
      logger.debug('Error decoding transaction:', error.message);
      return null;
    }
  }

  async simulateSandwichProfit(tokenIn, tokenOut, frontRunAmount, victimAmount) {
    // Simplified profit simulation
    return this.web3.utils.toWei('0.06', 'ether');
  }
}

export const sandwichService = new SandwichService();
export const findSandwichOpportunities = () => sandwichService.findSandwichOpportunities();