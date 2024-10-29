import os
from dotenv import load_dotenv
import base58

load_dotenv()

# Network Configuration
RPC_ENDPOINTS = [
    "https://api.mainnet-beta.solana.com",
    "https://solana-api.projectserum.com",
    "https://rpc.ankr.com/solana"
]
WS_ENDPOINTS = [
    "wss://api.mainnet-beta.solana.com",
    "wss://solana-api.projectserum.com"
]

# Account Settings
PRIVATE_KEY = os.getenv('PRIVATE_KEY', '')
PUBLIC_KEY = base58.b58encode(base58.b58decode(PRIVATE_KEY)[32:]).decode() if PRIVATE_KEY else ''

# DEX Settings
RAYDIUM_POOLS = {
    'SOL/USDC': 'xxxxx',  # Replace with actual pool addresses
    'SOL/USDT': 'xxxxx',
}
ORCA_POOLS = {
    'SOL/USDC': 'xxxxx',
    'SOL/USDT': 'xxxxx',
}

# Performance Settings
PARALLEL_EXECUTIONS = 3
EXECUTION_TIMEOUT = 2  # seconds
MIN_PROFIT_SOL = 0.01
MAX_RETRIES = 3

# Risk Management
MAX_POSITION_SIZE = 0.5  # SOL
SLIPPAGE_TOLERANCE = 0.5  # %
CIRCUIT_BREAKER = -1  # SOL