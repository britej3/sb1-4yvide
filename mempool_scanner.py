from web3 import Web3
from typing import List, Dict
import time
from config import ETH_NODE_URL

class MempoolScanner:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(ETH_NODE_URL))
        
    def scan_pending_transactions(self) -> List[Dict]:
        try:
            pending_transactions = self.w3.eth.get_pending_transactions()
            return [tx for tx in pending_transactions if self._is_relevant_transaction(tx)]
        except Exception as e:
            print(f"Error scanning mempool: {e}")
            return []
    
    def _is_relevant_transaction(self, transaction) -> bool:
        # Implement your transaction filtering logic here
        # Example: Check if transaction interacts with DEXes
        relevant_addresses = [
            "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",  # Uniswap V2 Router
            "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",  # Uniswap V3 Router
        ]
        return transaction.get('to') in relevant_addresses