export const TOKENS = {
    WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    WBTC: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
};

// Optimized settings for better performance
export const SCAN_INTERVAL = 100; // 100ms between scans
export const PRICE_UPDATE_INTERVAL = 50; // 50ms for price updates
export const MIN_PROFIT = 0.0005; // 0.05% minimum profit
export const MAX_SLIPPAGE = 0.002; // 0.2% max slippage
export const GAS_LIMIT = 250000;
export const MIN_CAPITAL = 10; // 10 MATIC
export const MAX_POSITIONS = 5;