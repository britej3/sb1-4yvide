const { web3 } = require('../config/web3');
const logger = require('../utils/logger');
const { TOKENS, MAX_SLIPPAGE } = require('../utils/constants');

// AAVE V3 Flash Loan Contract ABI (minimal required)
const AAVE_LENDING_POOL_ABI = [
  {
    "inputs": [
      {"internalType": "address[]", "name": "assets", "type": "address[]"},
      {"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"},
      {"internalType": "uint256[]", "name": "modes", "type": "uint256[]"},
      {"internalType": "address", "name": "onBehalfOf", "type": "address"},
      {"internalType": "bytes", "name": "params", "type": "bytes"},
      {"internalType": "uint16", "name": "referralCode", "type": "uint16"}
    ],
    "name": "flashLoan",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

class FlashLoanService {
  constructor() {
    // AAVE V3 Lending Pool on Polygon
    this.lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD';
    this.lendingPool = new web3.eth.Contract(AAVE_LENDING_POOL_ABI, this.lendingPoolAddress);
    this.minProfit = web3.utils.toWei('0.1', 'ether'); // 0.1 MATIC minimum profit
  }

  async executeFlashLoan(token, amount, arbitrageData) {
    try {
      logger.info(`Initiating flash loan for ${amount} ${token}`);

      const params = web3.eth.abi.encodeParameters(
        ['address', 'uint256', 'bytes'],
        [token, amount, arbitrageData]
      );

      const tx = {
        from: web3.eth.defaultAccount,
        to: this.lendingPoolAddress,
        data: this.lendingPool.methods.flashLoan(
          [token],                    // assets
          [amount],                   // amounts
          [0],                        // modes (0 = no debt)
          web3.eth.defaultAccount,    // onBehalfOf
          params,                     // params
          0                          // referralCode
        ).encodeABI(),
        gas: 3000000
      };

      const receipt = await web3.eth.sendTransaction(tx);
      logger.info('Flash loan executed:', receipt.transactionHash);
      return receipt;

    } catch (error) {
      logger.error('Flash loan execution failed:', error);
      throw error;
    }
  }

  async checkProfitability(route) {
    try {
      const { sourceToken, targetToken, amount } = route;
      
      // Get prices from different DEXes
      const [priceA, priceB] = await Promise.all([
        this.getPriceFromDex('quickswap', sourceToken, targetToken, amount),
        this.getPriceFromDex('sushiswap', sourceToken, targetToken, amount)
      ]);

      const profit = priceB.sub(priceA);
      const fees = this.calculateFees(amount);
      
      return {
        isProfitable: profit.gt(fees),
        expectedProfit: profit.sub(fees).toString(),
        route: {
          buy: priceA,
          sell: priceB,
          fees
        }
      };
    } catch (error) {
      logger.error('Error checking profitability:', error);
      return { isProfitable: false };
    }
  }

  calculateFees(amount) {
    // AAVE flash loan fee (0.09%) + gas estimate
    const flashLoanFee = amount.mul(9).div(10000);
    const estimatedGas = web3.utils.toWei('0.05', 'ether'); // 0.05 MATIC
    return flashLoanFee.add(estimatedGas);
  }

  async getPriceFromDex(dex, tokenIn, tokenOut, amount) {
    // Implementation for getting prices from different DEXes
    // This is a placeholder - implement actual DEX price fetching
    return web3.utils.toBN(0);
  }
}

module.exports = new FlashLoanService();