import asyncio
import logging
from web3 import Web3
from eth_account import Account
from config import (
    NETWORK, RPC_URLS, PRIVATE_KEY, 
    SUSHI_ROUTER, CAMELOT_ROUTER,
    CIRCUIT_BREAKER
)
from dex_interface import DEXInterface
from arbitrage_finder import ArbitrageFinder
import json
import signal
import sys

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ArbitrumMEVBot:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(RPC_URLS[NETWORK]))
        self.account = Account.from_key(PRIVATE_KEY)
        
        # Initialize DEX interfaces
        self.dexes = [
            DEXInterface(self.w3, SUSHI_ROUTER, self._load_abi('sushiswap')),
            DEXInterface(self.w3, CAMELOT_ROUTER, self._load_abi('camelot'))
        ]
        
        self.finder = ArbitrageFinder(self.dexes)
        self.total_profit = 0
        self.running = False
        
    def _load_abi(self, name: str) -> str:
        with open(f'abis/{name}.json') as f:
            return json.load(f)
            
    async def start(self):
        self.running = True
        logger.info(f"Starting MEV bot on {NETWORK}")
        
        # Setup signal handlers
        for sig in (signal.SIGTERM, signal.SIGINT):
            asyncio.get_event_loop().add_signal_handler(sig, self.stop)
            
        try:
            while self.running:
                if self.total_profit < CIRCUIT_BREAKER:
                    logger.warning("Circuit breaker triggered! Stopping bot...")
                    self.stop()
                    break
                    
                # Monitor for opportunities
                await self._check_opportunities()
                await asyncio.sleep(0.1)  # Rate limiting
                
        except Exception as e:
            logger.error(f"Fatal error: {e}")
            self.stop()
            
    async def _check_opportunities(self):
        # Example token pairs to monitor
        token_pairs = [
            # USDC/USDT pair
            ('0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', 
             '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'),
            # WETH/USDC pair
            ('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
             '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8')
        ]
        
        for pair in token_pairs:
            opportunity = await self.finder.find_opportunity(
                pair,
                Web3.to_wei(10, 'ether')  # Example amount
            )
            
            if opportunity:
                await self._execute_arbitrage(opportunity)
                
    async def _execute_arbitrage(self, opportunity: dict):
        try:
            # Implementation of arbitrage execution
            logger.info(f"Executing arbitrage with potential profit: ${opportunity['profit_usd']:.2f}")
            # Add your execution logic here
            pass
            
        except Exception as e:
            logger.error(f"Arbitrage execution failed: {e}")
            
    def stop(self):
        logger.info("Shutting down MEV bot...")
        self.running = False

async def main():
    bot = ArbitrumMEVBot()
    try:
        await bot.start()
    except Exception as e:
        logger.error(f"Startup error: {e}")
    finally:
        sys.exit(0)

if __name__ == "__main__":
    asyncio.run(main())