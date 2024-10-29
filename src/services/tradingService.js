import { Web3 } from 'web3';
import logger from '../utils/logger.js';
import { TOKENS, MIN_CAPITAL, MAX_POSITIONS } from '../utils/constants.js';
import { findArbitrageOpportunities } from './arbitrageService.js';
import { findSandwichOpportunities } from './sandwichService.js';
import { executeTransaction } from '../utils/transactions.js';

let isRunning = false;
let capital = 0;
const web3 = new Web3(process.env.INFURA_ENDPOINT);

export async function startTrading(initialCapital) {
    if (isRunning) return;
    if (initialCapital < MIN_CAPITAL) {
        throw new Error(`Minimum capital requirement is ${MIN_CAPITAL} MATIC`);
    }

    isRunning = true;
    capital = initialCapital;

    // Start opportunity scanning
    setInterval(scanOpportunities, 500);

    logger.info('Trading service started', { capital: initialCapital });
}

async function scanOpportunities() {
    if (!isRunning) return;

    try {
        // Scan for opportunities in parallel
        const [arbitrageOpps, sandwichOpps] = await Promise.all([
            findArbitrageOpportunities(),
            findSandwichOpportunities()
        ]);

        // Sort opportunities by expected profit
        const allOpportunities = [...arbitrageOpps, ...sandwichOpps]
            .sort((a, b) => b.expectedProfit - a.expectedProfit);

        // Execute best opportunity if profitable
        if (allOpportunities.length > 0) {
            const bestOpp = allOpportunities[0];
            if (bestOpp.expectedProfit > 0) {
                await executeOpportunity(bestOpp);
            }
        }

    } catch (error) {
        logger.error('Error scanning opportunities:', error);
    }
}

async function executeOpportunity(opportunity) {
    try {
        const tx = await executeTransaction(opportunity);
        logger.info('Trade executed successfully', {
            type: opportunity.type,
            profit: web3.utils.fromWei(opportunity.expectedProfit, 'ether'),
            txHash: tx.transactionHash
        });
    } catch (error) {
        logger.error('Trade execution failed:', error);
    }
}

export function stopTrading() {
    isRunning = false;
    logger.info('Trading service stopped');
}