from web3 import Web3
from typing import Dict, List, Tuple
import json
import asyncio
from eth_account import Account
import logging

logger = logging.getLogger(__name__)

class DEXInterface:
    def __init__(self, web3: Web3, router_address: str, router_abi: str):
        self.w3 = web3
        self.router = self.w3.eth.contract(
            address=router_address,
            abi=router_abi
        )
        
    async def get_price(self, token_in: str, token_out: str, amount_in: int) -> int:
        try:
            return await self.router.functions.getAmountsOut(
                amount_in,
                [token_in, token_out]
            ).call()
        except Exception as e:
            logger.error(f"Price fetch error: {e}")
            return 0
            
    async def create_swap_tx(
        self,
        token_in: str,
        token_out: str,
        amount_in: int,
        min_amount_out: int,
        deadline: int
    ) -> Dict:
        return {
            'to': self.router.address,
            'data': self.router.encodeABI(
                fn_name='swapExactTokensForTokens',
                args=[
                    amount_in,
                    min_amount_out,
                    [token_in, token_out],
                    Account.from_key(PRIVATE_KEY).address,
                    deadline
                ]
            ),
            'gas': 250000,
            'maxFeePerGas': self.w3.eth.gas_price,
            'maxPriorityFeePerGas': Web3.to_wei(MAX_PRIORITY_FEE, 'gwei')
        }