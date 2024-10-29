from solana.rpc.api import Client
from solana.transaction import Transaction
from solana.system_program import TransactionInstruction
import base58
from typing import Dict, Optional
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

class TransactionExecutor:
    def __init__(self, client: Client, private_key: str):
        self.client = client
        self.private_key = base58.b58decode(private_key)
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.nonce = 0
        self._last_block_height = 0
        
    async def execute_transaction(self, instructions: list, priority: bool = True) -> Optional[str]:
        try:
            tx = await self._build_transaction(instructions)
            if priority:
                tx = await self._prioritize_transaction(tx)
            
            signature = await self._send_transaction(tx)
            return await self._confirm_transaction(signature)
        except Exception as e:
            logger.error(f"Transaction execution failed: {e}")
            return None
            
    async def _build_transaction(self, instructions: list) -> Transaction:
        recent_blockhash = await self.client.get_recent_blockhash()
        tx = Transaction()
        tx.recent_blockhash = recent_blockhash['result']['value']['blockhash']
        
        for instruction in instructions:
            tx.add(TransactionInstruction(
                keys=instruction['keys'],
                program_id=instruction['program_id'],
                data=instruction['data']
            ))
            
        return tx
        
    async def _prioritize_transaction(self, tx: Transaction) -> Transaction:
        # Implement priority fee calculation and addition
        return tx
        
    async def _send_transaction(self, tx: Transaction) -> str:
        tx.sign(self.private_key)
        return await self.client.send_transaction(tx, opts={"skip_preflight": True})
        
    async def _confirm_transaction(self, signature: str, max_retries: int = 3) -> Optional[str]:
        for _ in range(max_retries):
            try:
                confirmation = await self.client.confirm_transaction(signature)
                if confirmation.get('result'):
                    return signature
            except Exception:
                await asyncio.sleep(0.1)
        return None