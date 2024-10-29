import dotenv from 'dotenv';
dotenv.config(); // Load environment variables first

import { Web3 } from 'web3';
import logger from './src/utils/logger.js';
import validateEnvironment from './src/utils/validateEnv.js';
import { startTrading } from './src/services/tradingService.js';
import { monitoringService } from './src/services/monitoringService.js';
import { arbitrageService } from './src/services/arbitrageService.js';
import { sandwichService } from './src/services/sandwichService.js';

async function startBot() {
    try {
        // Validate environment
        validateEnvironment();

        // Initialize Web3
        const web3 = new Web3(process.env.RPC_ENDPOINT);
        
        // Check connection
        const isConnected = await web3.eth.net.isListening();
        if (!isConnected) {
            throw new Error('Not connected to Ethereum network');
        }

        // Check wallet balance
        const balance = await web3.eth.getBalance(process.env.WALLET_ADDRESS);
        logger.info(`Starting bot with wallet balance: ${web3.utils.fromWei(balance, 'ether')} MATIC`);

        // Start services
        await monitoringService.start();
        await arbitrageService.start();
        await sandwichService.start();

        // Start trading with minimum capital
        await startTrading(10); // Start with 10 MATIC
        logger.info('Bot started successfully');

    } catch (error) {
        logger.error('Bot startup failed:', error);
        process.exit(1);
    }
}

// Handle shutdown
process.on('SIGINT', async () => {
    logger.info('Stopping bot...');
    await monitoringService.stop();
    await arbitrageService.stop();
    await sandwichService.stop();
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

// Start the bot
startBot();