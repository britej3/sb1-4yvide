from web3 import Web3
from typing import List, Dict, Optional
import logging
from eth_abi import encode_abi
from decimal import Decimal
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

class FlashLoanProvider:
    # Flash Loan Provider Addresses
    PROVIDERS = {
        'aave': '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9',
        'dydx': '0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e',
        'balancer': '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
    }
    
    def __init__(self, w3: Web3, provider: str = 'aave'):
        self.w3 = w3
        self.provider = provider
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.vault = self.w3.eth.contract(
            address=self.PROVIDERS[provider],
            abi=self._load_provider_abi()
        )
        
    def _load_provider_abi(self) -> str:
        # Load appropriate ABI based on provider
        abis = {
            'aave': '''[
                {"inputs":[{"internalType":"address[]","name":"assets","type":"address[]"},
                {"internalType":"uint256[]","name":"amounts","type":"uint256[]"},
                {"internalType":"uint256[]","name":"modes","type":"uint256[]"},
                {"internalType":"address","name":"onBehalfOf","type":"address"},
                {"internalType":"bytes","name":"params","type":"bytes"},
                {"internalType":"uint16","name":"referralCode","type":"uint16"}],
                "name":"flashLoan","outputs":[],"stateMutability":"nonpayable","type":"function"}
            ]''',
            'balancer': '''[
                {"inputs":[{"internalType":"bytes32","name":"poolId","type":"bytes32"},
                {"internalType":"address","name":"recipient","type":"address"},
                {"internalType":"address[]","name":"tokens","type":"address[]"},
                {"internalType":"uint256[]","name":"amounts","type":"uint256[]"},
                {"internalType":"bytes","name":"userData","type":"bytes"}],
                "name":"flashLoan","outputs":[],"stateMutability":"nonpayable","type":"function"}
            ]'''
        }
        return abis.get(self.provider, abis['aave'])
        
    async def execute_flash_loan(
        self,
        tokens: List[str],
        amounts: List[int],
        strategy_data: Dict,
        gas_price: Optional[int] = None
    ) -> Dict:
        """Execute flash loan with optimized gas and error handling"""
        try:
            # Validate minimum capital requirements
            total_value = sum(amounts)
            if total_value < Web3.to_wei(100, 'ether'):  # 100 USDT minimum
                raise ValueError("Insufficient capital for flash loan")

            # Prepare flash loan parameters
            loan_params = await self._prepare_loan_params(tokens, amounts, strategy_data)
            
            # Estimate gas and optimize
            gas_estimate = await self._estimate_gas(loan_params)
            gas_price = gas_price or await self._get_optimal_gas_price()
            
            # Execute transaction
            tx_hash = await self._send_transaction(loan_params, gas_estimate, gas_price)
            receipt = await self._wait_for_confirmation(tx_hash)
            
            return {
                'success': receipt.status == 1,
                'tx_hash': tx_hash.hex(),
                'gas_used': receipt.gasUsed,
                'effective_gas_price': receipt.effectiveGasPrice
            }
            
        except Exception as e:
            logger.error(f"Flash loan execution failed: {e}")
            return {'success': False, 'error': str(e)}
            
    async def _prepare_loan_params(self, tokens: List[str], amounts: List[int], strategy_data: Dict) -> Dict:
        """Prepare optimized flash loan parameters based on provider"""
        if self.provider == 'aave':
            return {
                'assets': tokens,
                'amounts': amounts,
                'modes': [0] * len(tokens),  # 0 = no debt, 1 = stable, 2 = variable
                'onBehalfOf': self.w3.eth.default_account,
                'params': encode_abi(['bytes'], [strategy_data.get('callback_data', b'')]),
                'referralCode': 0
            }
        elif self.provider == 'balancer':
            return {
                'poolId': strategy_data['pool_id'],
                'recipient': self.w3.eth.default_account,
                'tokens': tokens,
                'amounts': amounts,
                'userData': strategy_data.get('callback_data', b'')
            }
            
    async def _estimate_gas(self, params: Dict) -> int:
        """Estimate gas cost with safety margin"""
        try:
            base_estimate = await self.vault.functions.flashLoan(
                *params.values()
            ).estimate_gas()
            return int(base_estimate * 1.1)  # Add 10% safety margin
        except Exception as e:
            logger.error(f"Gas estimation failed: {e}")
            return 500000  # Default gas limit
            
    async def _get_optimal_gas_price(self) -> int:
        """Get optimal gas price based on network conditions"""
        base_fee = self.w3.eth.get_block('latest').baseFeePerGas
        priority_fee = self.w3.eth.max_priority_fee
        return base_fee + priority_fee
        
    async def _send_transaction(self, params: Dict, gas_limit: int, gas_price: int) -> bytes:
        """Send transaction with optimized parameters"""
        tx = await self.vault.functions.flashLoan(
            *params.values()
        ).build_transaction({
            'from': self.w3.eth.default_account,
            'gas': gas_limit,
            'maxFeePerGas': gas_price,
            'maxPriorityFeePerGas': self.w3.eth.max_priority_fee,
            'nonce': self.w3.eth.get_transaction_count(self.w3.eth.default_account)
        })
        
        signed_tx = self.w3.eth.account.sign_transaction(tx, self.w3.eth.account.privateKey)
        return await self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
    async def _wait_for_confirmation(self, tx_hash: bytes, timeout: int = 180) -> Dict:
        """Wait for transaction confirmation with timeout"""
        start_time = asyncio.get_event_loop().time()
        while True:
            try:
                receipt = self.w3.eth.get_transaction_receipt(tx_hash)
                if receipt:
                    return receipt
            except Exception:
                if asyncio.get_event_loop().time() - start_time > timeout:
                    raise TimeoutError("Transaction confirmation timeout")
            await asyncio.sleep(1)