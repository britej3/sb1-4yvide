const { web3 } = require('../config/web3');
const logger = require('../utils/logger');
const { PRICE_UPDATE_INTERVAL, TOKENS } = require('../utils/constants');

// QuickSwap Router ABI (minimal required functions)
const ROUTER_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' }
    ],
    name: 'getAmountsOut',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function'
  }
];

class PriceService {
  constructor() {
    this.prices = {};
    this.subscribers = new Set();
    this.router = new web3.eth.Contract(ROUTER_ABI, TOKENS.QUICKSWAP_ROUTER);
    this.priceHistory = new Map();
    this.lastUpdate = 0;
    this.updatePromise = null;
    
    // Initialize price history for each token
    Object.keys(TOKENS).forEach(token => {
      if (token !== 'QUICKSWAP_ROUTER' && token !== 'USDC') {
        this.priceHistory.set(token, []);
      }
    });
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers() {
    const priceData = {
      ...this.prices,
      timestamp: Date.now()
    };
    this.subscribers.forEach(callback => callback(priceData));
  }

  async updatePrices() {
    const now = Date.now();
    if (now - this.lastUpdate < PRICE_UPDATE_INTERVAL) return;
    if (this.updatePromise) return;

    try {
      this.updatePromise = this._fetchPrices();
      await this.updatePromise;
      this.lastUpdate = now;
    } catch (error) {
      logger.error('Price update error:', error);
    } finally {
      this.updatePromise = null;
    }
  }

  async _fetchPrices() {
    const oneToken = web3.utils.toWei('1', 'ether');
    const pricePromises = [];
    const tokens = [];

    // Build parallel price fetch requests
    for (const [token, address] of Object.entries(TOKENS)) {
      if (token !== 'QUICKSWAP_ROUTER' && token !== 'USDC') {
        tokens.push(token);
        pricePromises.push(this.getTokenPrice(address, TOKENS.USDC, oneToken));
      }
    }

    try {
      const prices = await Promise.all(pricePromises);
      const updates = {};

      prices.forEach((price, index) => {
        const token = tokens[index];
        updates[token] = price;
        this.updatePriceHistory(token, price);
      });

      this.prices = updates;
      this.notifySubscribers();
      logger.debug('Prices updated:', updates);
    } catch (error) {
      logger.error('Batch price fetch error:', error);
    }
  }

  updatePriceHistory(token, price) {
    const history = this.priceHistory.get(token);
    if (!history) return;

    history.push({
      price,
      timestamp: Date.now()
    });

    // Keep last 100 price points
    if (history.length > 100) {
      history.shift();
    }
  }

  async getTokenPrice(tokenAddress, quoteToken, amount) {
    try {
      const path = [tokenAddress, quoteToken];
      const amounts = await this.router.methods.getAmountsOut(amount, path).call();
      return Number(web3.utils.fromWei(amounts[1], 'mwei'));
    } catch (error) {
      logger.error(`Error fetching price for ${tokenAddress}:`, error);
      return 0;
    }
  }

  getPriceHistory(token, limit = 100) {
    const history = this.priceHistory.get(token);
    if (!history) return [];
    return history.slice(-limit);
  }

  getLatestPrice(token) {
    return this.prices[token] || 0;
  }
}

module.exports = new PriceService();