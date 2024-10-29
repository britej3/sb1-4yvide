import { Web3 } from 'web3';
import logger from '../utils/logger.js';
import { TOKENS } from '../utils/constants.js';

const DEX_ROUTERS = {
  quickswap: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
  sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  apeswap: '0xC0788A3aD43d79aa53B09c2EaCc313A787d1d607',
  jetswap: '0x5C6EC38fb0e2609672BDf628B1fD605A523E5923',
  polycat: '0x94930a328162957FF1dd48900aF67B5439336cBD'
};

const ROUTER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
      { "internalType": "address[]", "name": "path", "type": "address[]" }
    ],
    "name": "getAmountsOut",
    "outputs": [{ "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  }
];

class DEXService {
  constructor() {
    this.web3 = new Web3(process.env.INFURA_ENDPOINT);
    this.dexes = new Map();
    this.priceCache = new Map();
    this.cacheDuration = 200; // Reduced to 200ms for faster updates
    this.initializeDEXes();
  }

  initializeDEXes() {
    for (const [name, address] of Object.entries(DEX_ROUTERS)) {
      this.dexes.set(name, new this.web3.eth.Contract(ROUTER_ABI, address));
    }
  }

  async getPrices(tokenIn, tokenOut, amount) {
    const prices = new Map();
    const cacheKey = `${tokenIn}-${tokenOut}-${amount}`;
    const now = Date.now();

    // Check cache
    if (this.priceCache.has(cacheKey)) {
      const cached = this.priceCache.get(cacheKey);
      if (now - cached.timestamp < this.cacheDuration) {
        return cached.prices;
      }
    }

    // Fetch prices in parallel
    const pricePromises = Array.from(this.dexes.entries()).map(async ([dexName, router]) => {
      try {
        const amounts = await router.methods.getAmountsOut(
          amount,
          [tokenIn, tokenOut]
        ).call();
        return [dexName, amounts[1]];
      } catch (error) {
        logger.debug(`Price fetch failed for ${dexName}:`, error.message);
        return [dexName, '0'];
      }
    });

    const results = await Promise.all(pricePromises);
    results.forEach(([dexName, price]) => {
      if (price !== '0') {
        prices.set(dexName, price);
      }
    });

    // Cache the results
    this.priceCache.set(cacheKey, {
      timestamp: now,
      prices: prices
    });

    return prices;
  }

  getDEXNames() {
    return Array.from(this.dexes.keys());
  }

  clearCache() {
    const now = Date.now();
    for (const [key, value] of this.priceCache.entries()) {
      if (now - value.timestamp > this.cacheDuration) {
        this.priceCache.delete(key);
      }
    }
  }
}

export const dexService = new DEXService();
export default dexService;