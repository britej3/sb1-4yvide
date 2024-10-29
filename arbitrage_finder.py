from typing import Dict, Optional, List
import asyncio
from web3 import Web3
import logging
from dex_interface import DEXInterface
from config import MIN_PROFIT_THRESHOLD, MAX_SLIPPAGE

logger = logging.getLogger(__name__)

class ArbitrageFinder:
    def __init__(self, dexes: List[DEXInterface]):
        self.dexes = dexes
        
    async def find_opportunity(self, token_pair: Tuple[str, str], amount: int) -> Optional[Dict]:
        prices = await asyncio.gather(*[
            dex.get_price(token_pair[0], token_pair[1], amount)
            for dex in self.dexes
        ])
        
        best_buy = min(prices)
        best_sell = max(prices)
        
        profit = best_sell - best_buy
        profit_usd = self._calculate_usd_profit(profit, token_pair[1])
        
        if profit_usd > MIN_PROFIT_THRESHOLD:
            return {
                'buy_dex': self.dexes[prices.index(best_buy)],
                'sell_dex': self.dexes[prices.index(best_sell)],
                'profit_usd': profit_usd,
                'amount_in': amount,
                'min_out': int(best_buy * (1 - MAX_SLIPPAGE / 100))
            }
        return None
        
    def _calculate_usd_profit(self, profit_amount: int, token: str) -> float:
        # Implement price lookup for token/USD
        # This is simplified - you'd want to use a price feed
        return float(profit_amount) * 0.000001  # Example conversion