from web3 import Web3
import asyncio
import logging
from typing import Dict, Set, List, Callable
import json
import time
from concurrent.futures import ThreadPoolExecutor
from collections import deque
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class Chain(Enum):
    ETH = 'ethereum'
    BSC = 'bsc'
    POLYGON = 'polygon'
    ARBITRUM = 'arbitrum'
    OPTIMISM = 'optimism'
    AVALANCHE = 'avalanche'

@dataclass
class MempoolConfig:
    chain: Chain
    rpc_urls: List[str]
    ws_urls: List[str]
    min_profit: float
    max_gas: int

class EnhancedMempoolMonitor:
    def __init__(self, configs: List[MempoolConfig], callback: Callable):
        self.configs = configs
        self.callback = callback
        self.executors = {
            chain: ThreadPoolExecutor(max_workers=8)
            for chain in Chain
        }
        self.transaction_cache = {
            chain: deque(maxlen=10000)
            for chain in Chain
        }
        self.web3_instances = {}
        self.ws_connections = {}
        self._running = False
        self.opportunity_queue = asyncio.Queue()
        
    async def start(self):
        self._running = True
        try:
            # Start monitors for each chain
            monitors = [
                self._monitor_chain(config)
                for config in self.configs
            ]
            
            # Start opportunity processor
            processors = [
                self._process_opportunities()
                for _ in range(4)  # 4 parallel processors
            ]
            
            await asyncio.gather(
                *monitors,
                *processors
            )
            
        except Exception as e:
            logger.error(f"Mempool monitoring error: {e}")
            self.stop()

    async def _monitor_chain(self, config: MempoolConfig):
        while self._running:
            try:
                # Websocket monitoring for pending transactions
                ws = await self._setup_ws_connection(config)
                await self._subscribe_to_mempool(ws, config.chain)
                
                # REST API fallback
                rest_task = asyncio.create_task(
                    self._poll_pending_transactions(config)
                )
                
                while self._running:
                    msg = await ws.recv()
                    await self._handle_transaction(msg, config)
                    
            except Exception as e:
                logger.error(f"Chain monitoring error for {config.chain}: {e}")
                await asyncio.sleep(1)

    async def _process_opportunities(self):
        while self._running:
            try:
                opportunity = await self.opportunity_queue.get()
                await self._analyze_and_execute(opportunity)
                self.opportunity_queue.task_done()
            except Exception as e:
                logger.error(f"Opportunity processing error: {e}")

    async def _analyze_and_execute(self, tx_data: Dict):
        try:
            # Quick pre-filtering
            if not self._is_profitable_opportunity(tx_data):
                return

            # Detailed analysis in thread pool
            chain = tx_data['chain']
            executor = self.executors[chain]
            is_profitable = await asyncio.get_event_loop().run_in_executor(
                executor,
                self._detailed_analysis,
                tx_data
            )

            if is_profitable:
                await self.callback(tx_data)

        except Exception as e:
            logger.error(f"Analysis error: {e}")

    def _is_profitable_opportunity(self, tx_data: Dict) -> bool:
        # Quick memory-based checks
        try:
            # Check if similar transaction recently processed
            tx_hash = tx_data.get('hash')
            chain = tx_data.get('chain')
            
            if tx_hash in self.transaction_cache[chain]:
                return False

            # Basic profitability check
            gas_price = int(tx_data.get('gasPrice', 0))
            value = int(tx_data.get('value', 0))
            
            if gas_price > self.configs[chain].max_gas:
                return False

            # Add to cache
            self.transaction_cache[chain].append(tx_hash)
            return True

        except Exception:
            return False

    async def _setup_ws_connection(self, config: MempoolConfig):
        # Implement WebSocket connection with auto-reconnect
        pass

    async def _subscribe_to_mempool(self, ws, chain: Chain):
        # Subscribe to pending transactions
        subscription = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "eth_subscribe",
            "params": ["newPendingTransactions"]
        }
        await ws.send(json.dumps(subscription))

    async def _poll_pending_transactions(self, config: MempoolConfig):
        # Fallback REST API polling
        while self._running:
            try:
                web3 = self._get_web3(config)
                txs = await web3.eth.get_pending_transactions()
                for tx in txs:
                    await self._handle_transaction(tx, config)
            except Exception as e:
                logger.error(f"Polling error for {config.chain}: {e}")
            await asyncio.sleep(0.1)  # 100ms polling interval

    def _get_web3(self, config: MempoolConfig) -> Web3:
        if config.chain not in self.web3_instances:
            self.web3_instances[config.chain] = Web3(
                Web3.WebsocketProvider(config.ws_urls[0])
            )
        return self.web3_instances[config.chain]

    def stop(self):
        self._running = False
        for executor in self.executors.values():
            executor.shutdown(wait=False)