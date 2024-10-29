import { Web3 } from 'web3';
import logger from '../utils/logger.js';
import { dexService } from './dexService.js';
import { TOKENS, MIN_PROFIT, SCAN_INTERVAL } from '../utils/constants.js';

class ArbitrageService {
  constructor() {
    this.isRunning = false;
    this.scanInterval = null;
    this.lastScan = Date.now();
    this.web3 = new Web3(process.env.INFURA_ENDPOINT);
    this.minProfitThreshold = this.web3.utils.toWei(MIN_PROFIT.toString(), 'ether');
    
    // Token paths for triangular arbitrage
    this.triangularPaths = [
      [TOKENS.WMATIC, TOKENS.USDC, TOKENS.WETH],
      [TOKENS.WETH, TOKENS.USDC, TOKENS.WBTC],
      [TOKENS.WMATIC, TOKENS.USDT, TOKENS.WETH],
      [TOKENS.DAI, TOKENS.USDC, TOKENS.USDT]
    ];
  }

  async findArbitrageOpportunities() {
    if (!this.isRunning) return [];
    
    const opportunities = [];
    const amount = this.web3.utils.toWei('1', 'ether');

    try {
      // Check direct arbitrage opportunities
      for (const tokenA of Object.values(TOKENS)) {
        for (const tokenB of Object.values(TOKENS)) {
          if (tokenA === tokenB) continue;

          const prices = await dexService.getPrices(tokenA, tokenB, amount);
          if (prices.size < 2) continue;

          const [bestBuy, bestSell] = this.findBestPrices(prices);
          const profit = this.calculateProfit(bestBuy.price, bestSell.price);

          if (profit > this.minProfitThreshold) {
            opportunities.push({
              type: 'arbitrage',
              tokenA,
              tokenB,
              buyDex: bestBuy.dex,
              sellDex: bestSell.dex,
              expectedProfit: profit,
              amount
            });
          }
        }
      }

      // Check triangular arbitrage opportunities
      for (const path of this.triangularPaths) {
        const triangularOpp = await this.checkTriangularArbitrage(path, amount);
        if (triangularOpp) {
          opportunities.push(triangularOpp);
        }
      }

    } catch (error) {
      logger.error('Error finding arbitrage opportunities:', error);
    }

    return opportunities;
  }

  async checkTriangularArbitrage(path, amount) {
    try {
      const [tokenA, tokenB, tokenC] = path;
      
      const pricesAB = await dexService.getPrices(tokenA, tokenB, amount);
      const pricesBC = await dexService.getPrices(tokenB, tokenC, amount);
      const pricesCA = await dexService.getPrices(tokenC, tokenA, amount);

      const bestAB = Math.min(...pricesAB.values());
      const bestBC = Math.min(...pricesBC.values());
      const bestCA = Math.min(...pricesCA.values());

      const profit = this.calculateTriangularProfit(bestAB, bestBC, bestCA);

      if (profit > this.minProfitThreshold) {
        return {
          type: 'triangularArbitrage',
          path: [tokenA, tokenB, tokenC],
          expectedProfit: profit,
          amount
        };
      }
    } catch (error) {
      logger.debug('Error checking triangular arbitrage:', error.message);
    }
    return null;
  }

  findBestPrices(prices) {
    const priceArray = Array.from(prices.entries());
    priceArray.sort((a, b) => a[1] - b[1]);
    
    return [
      { dex: priceArray[0][0], price: priceArray[0][1] },
      { dex: priceArray[priceArray.length - 1][0], price: priceArray[priceArray.length - 1][1] }
    ];
  }

  calculateProfit(buyPrice, sellPrice) {
    const fee = this.web3.utils.toWei('0.003', 'ether'); // 0.3% fee
    return sellPrice - buyPrice - fee;
  }

  calculateTriangularProfit(priceAB, priceBC, priceCA) {
    const fee = 0.003; // 0.3% fee per trade
    return (1 / priceAB) * (1 / priceBC) * (1 / priceCA) * (1 - fee) ** 3 - 1;
  }

  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    logger.info('Starting arbitrage scanner');
    
    this.scanInterval = setInterval(async () => {
      try {
        await this.findArbitrageOpportunities();
      } catch (error) {
        logger.error('Scan error:', error);
      }
    }, SCAN_INTERVAL);
  }

  async stop() {
    this.isRunning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }
    logger.info('Arbitrage scanner stopped');
  }
}

export const arbitrageService = new ArbitrageService();
export const findArbitrageOpportunities = () => arbitrageService.findArbitrageOpportunities();