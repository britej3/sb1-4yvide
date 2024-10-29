const { web3 } = require('../config/web3');
const logger = require('../utils/logger');
const { calculateIndicators } = require('../utils/indicators');
const { TOKENS, MAX_SLIPPAGE } = require('../utils/constants');
const dexService = require('./dexService');

class StrategyService {
  constructor() {
    this.strategies = {
      triangularArbitrage: {
        enabled: true,
        minProfit: 0.002, // 0.2%
        maxSlippage: 0.005 // 0.5%
      },
      flashLoan: {
        enabled: true,
        minProfit: 0.003, // 0.3%
        maxAmount: web3.utils.toWei('1000', 'ether')
      },
      sandwich: {
        enabled: true,
        minProfit: 0.001, // 0.1%
        maxGas: web3.utils.toWei('150', 'gwei')
      },
      marketMaking: {
        enabled: true,
        spreadMin: 0.001, // 0.1%
        orderSize: web3.utils.toWei('0.1', 'ether')
      }
    };

    this.tokenPairs = [
      [TOKENS.WMATIC, TOKENS.USDC],
      [TOKENS.WETH, TOKENS.USDC],
      [TOKENS.WBTC, TOKENS.USDC],
      [TOKENS.DAI, TOKENS.USDC]
    ];

    this.scanInterval = 500; // 500ms
    this.lastScan = new Map();
  }

  async findOpportunities() {
    const opportunities = [];

    // Parallel strategy execution
    const promises = [
      this.findTriangularArbitrage(),
      this.findFlashLoanOpportunities(),
      this.findSandwichOpportunities(),
      this.findMarketMakingOpportunities()
    ];

    const results = await Promise.all(promises);
    return results.flat().filter(opp => opp !== null);
  }

  async findTriangularArbitrage() {
    const opportunities = [];
    const tokens = [TOKENS.WMATIC, TOKENS.USDC, TOKENS.WETH];

    for (let i = 0; i < tokens.length; i++) {
      const tokenA = tokens[i];
      const tokenB = tokens[(i + 1) % tokens.length];
      const tokenC = tokens[(i + 2) % tokens.length];

      const pricesAB = await dexService.getPrices(tokenA, tokenB, web3.utils.toWei('1', 'ether'));
      const pricesBC = await dexService.getPrices(tokenB, tokenC, web3.utils.toWei('1', 'ether'));
      const pricesCA = await dexService.getPrices(tokenC, tokenA, web3.utils.toWei('1', 'ether'));

      const profit = this.calculateTriangularProfit(pricesAB, pricesBC, pricesCA);
      
      if (profit > this.strategies.triangularArbitrage.minProfit) {
        opportunities.push({
          type: 'triangularArbitrage',
          tokens: [tokenA, tokenB, tokenC],
          profit,
          confidence: 0.9
        });
      }
    }

    return opportunities;
  }

  async findFlashLoanOpportunities() {
    const opportunities = [];

    for (const [tokenA, tokenB] of this.tokenPairs) {
      const prices = await dexService.getPrices(tokenA, tokenB, this.strategies.flashLoan.maxAmount);
      const bestBuy = Math.min(...prices.values());
      const bestSell = Math.max(...prices.values());
      
      const profit = (bestSell - bestBuy) / bestBuy;
      
      if (profit > this.strategies.flashLoan.minProfit) {
        opportunities.push({
          type: 'flashLoan',
          tokenIn: tokenA,
          tokenOut: tokenB,
          amount: this.strategies.flashLoan.maxAmount,
          profit,
          confidence: 0.85
        });
      }
    }

    return opportunities;
  }

  async findSandwichOpportunities() {
    const pendingTxs = await web3.eth.getPendingTransactions();
    const opportunities = [];

    for (const tx of pendingTxs) {
      if (this.isSwapTransaction(tx)) {
        const decoded = this.decodeSwapTransaction(tx);
        if (!decoded) continue;

        const { tokenIn, tokenOut, amount } = decoded;
        const frontRunAmount = amount * 0.2; // 20% of victim's amount
        
        const profit = await this.simulateSandwichProfit(tokenIn, tokenOut, frontRunAmount, amount);
        
        if (profit > this.strategies.sandwich.minProfit) {
          opportunities.push({
            type: 'sandwich',
            target: tx,
            tokenIn,
            tokenOut,
            frontRunAmount,
            profit,
            confidence: 0.95
          });
        }
      }
    }

    return opportunities;
  }

  async findMarketMakingOpportunities() {
    const opportunities = [];

    for (const [tokenA, tokenB] of this.tokenPairs) {
      const orderbook = await this.getOrderbook(tokenA, tokenB);
      const spread = (orderbook.lowestAsk - orderbook.highestBid) / orderbook.highestBid;
      
      if (spread > this.strategies.marketMaking.spreadMin) {
        opportunities.push({
          type: 'marketMaking',
          tokenA,
          tokenB,
          bidPrice: orderbook.highestBid * 1.001,
          askPrice: orderbook.lowestAsk * 0.999,
          amount: this.strategies.marketMaking.orderSize,
          confidence: 0.8
        });
      }
    }

    return opportunities;
  }

  calculateTriangularProfit(pricesAB, pricesBC, pricesCA) {
    // Calculate profit after fees
    const fee = 0.003; // 0.3% fee per trade
    return (1 / pricesAB) * (1 / pricesBC) * (1 / pricesCA) * (1 - fee) ** 3 - 1;
  }

  isSwapTransaction(tx) {
    const swapMethods = [
      'swapExactTokensForTokens',
      'swapTokensForExactTokens',
      'swapExactETHForTokens',
      'swapTokensForExactETH'
    ];
    
    return swapMethods.some(method => 
      tx.input.includes(web3.utils.sha3(method).slice(0, 10))
    );
  }

  async getOrderbook(tokenA, tokenB) {
    // Implement orderbook fetching from DEX
    return {
      highestBid: 0,
      lowestAsk: 0
    };
  }
}

module.exports = new StrategyService();