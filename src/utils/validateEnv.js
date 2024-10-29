import logger from './logger.js';

export default function validateEnvironment() {
  const required = [
    'RPC_ENDPOINT',
    'PRIVATE_KEY',
    'WALLET_ADDRESS'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate RPC endpoint
  if (!process.env.RPC_ENDPOINT.includes('alchemy.com')) {
    throw new Error('Invalid RPC endpoint. Must be Alchemy endpoint.');
  }

  // Validate private key format
  if (!/^[0-9a-f]{64}$/i.test(process.env.PRIVATE_KEY)) {
    throw new Error('Invalid private key format');
  }

  // Validate wallet address format
  if (!/^0x[0-9a-fA-F]{40}$/i.test(process.env.WALLET_ADDRESS)) {
    throw new Error('Invalid wallet address format');
  }

  logger.info('Environment validation successful');
  return true;
}