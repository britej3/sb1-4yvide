import { Web3 } from 'web3';
import logger from '../utils/logger.js';

class Web3Service {
  constructor() {
    this.initialize();
  }

  initialize() {
    try {
      // Initialize Web3 with HTTP provider
      const rpcEndpoint = process.env.RPC_ENDPOINT;
      if (!rpcEndpoint) {
        throw new Error('RPC_ENDPOINT not found in environment');
      }

      // Initialize Web3 with WebSocket for real-time data
      this.web3 = new Web3(new Web3.providers.HttpProvider(rpcEndpoint));
      this.ws = new Web3.providers.WebsocketProvider(rpcEndpoint.replace('https', 'wss'));

      // Initialize account
      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('PRIVATE_KEY not found in environment');
      }

      this.account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
      this.web3.eth.accounts.wallet.add(this.account);
      this.web3.eth.defaultAccount = this.account.address;

      // Start monitoring services
      this.startGasPriceMonitoring();
      this.setupWebsocketListeners();

      logger.info('Web3 initialized successfully');
    } catch (error) {
      logger.error('Web3 initialization failed:', error);
      throw error;
    }
  }

  setupWebsocketListeners() {
    // Listen for pending transactions
    this.ws.on('pending', (txHash) => {
      this.handlePendingTransaction(txHash);
    });

    // Listen for new blocks
    this.ws.on('newBlockHeaders', (block) => {
      this.updateGasPrice(block);
    });
  }

  async handlePendingTransaction(txHash) {
    try {
      const tx = await this.web3.eth.getTransaction(txHash);
      if (tx && this.isSwapTransaction(tx)) {
        logger.debug('Potential trading opportunity detected:', {
          txHash,
          to: tx.to,
          value: tx.value
        });
      }
    } catch (error) {
      logger.debug('Error handling pending transaction:', error.message);
    }
  }

  async startGasPriceMonitoring() {
    try {
      setInterval(async () => {
        const gasPrice = await this.web3.eth.getGasPrice();
        this.currentGasPrice = gasPrice;
        
        logger.debug('Gas price updated:', {
          gasPrice: this.web3.utils.fromWei(gasPrice, 'gwei')
        });
      }, 10000); // Check every 10 seconds
    } catch (error) {
      logger.error('Gas price monitoring error:', error);
    }
  }

  async getOptimalGasPrice() {
    try {
      const gasPrice = await this.web3.eth.getGasPrice();
      // Add 10% to current gas price for faster confirmation
      return Math.floor(Number(gasPrice) * 1.1).toString();
    } catch (error) {
      logger.error('Error getting optimal gas price:', error);
      return this.currentGasPrice || '50000000000'; // 50 Gwei fallback
    }
  }

  async validateNetwork() {
    try {
      const chainId = await this.web3.eth.getChainId();
      if (chainId !== 137) { // Polygon Mainnet
        throw new Error('Not connected to Polygon Mainnet');
      }
      return true;
    } catch (error) {
      logger.error('Network validation error:', error);
      return false;
    }
  }

  async getBalance() {
    try {
      const balance = await this.web3.eth.getBalance(this.account.address);
      return this.web3.utils.fromWei(balance, 'ether');
    } catch (error) {
      logger.error('Balance check error:', error);
      return '0';
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
}

const web3Service = new Web3Service();
export default web3Service;