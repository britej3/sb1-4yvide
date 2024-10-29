import { Web3 } from 'web3';
import logger from './logger.js';

const web3 = new Web3(process.env.INFURA_ENDPOINT);

export async function executeTransaction(params) {
    try {
        const gasPrice = await web3.eth.getGasPrice();
        const nonce = await web3.eth.getTransactionCount(process.env.WALLET_ADDRESS);

        const tx = {
            from: process.env.WALLET_ADDRESS,
            to: params.to,
            data: params.data,
            value: params.value || '0x0',
            gasPrice: web3.utils.toHex(Math.floor(Number(gasPrice) * 1.1)), // 10% more
            nonce: web3.utils.toHex(nonce)
        };

        // Estimate gas
        const gasLimit = await web3.eth.estimateGas(tx);
        tx.gas = web3.utils.toHex(Math.floor(gasLimit * 1.2)); // 20% buffer

        // Sign and send transaction
        const signedTx = await web3.eth.accounts.signTransaction(tx, process.env.PRIVATE_KEY);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        return receipt;
    } catch (error) {
        logger.error('Transaction execution failed:', error);
        throw error;
    }
}