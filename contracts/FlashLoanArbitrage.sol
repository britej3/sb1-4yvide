// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";

contract FlashLoanArbitrage is FlashLoanSimpleReceiverBase {
    address public owner;
    
    constructor(address _addressProvider) 
        FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_addressProvider)) 
    {
        owner = msg.sender;
    }
    
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        // Decode arbitrage parameters
        (address tokenIn, address tokenOut, uint256 tradeAmount) = 
            abi.decode(params, (address, address, uint256));
            
        // Execute arbitrage logic here
        // 1. Trade on DEX A
        // 2. Trade on DEX B
        
        // Approve repayment
        uint256 amountToRepay = amount + premium;
        IERC20(asset).approve(address(POOL), amountToRepay);
        
        return true;
    }
    
    function requestFlashLoan(
        address token,
        uint256 amount,
        bytes calldata params
    ) external {
        require(msg.sender == owner, "Only owner");
        POOL.flashLoanSimple(
            address(this),
            token,
            amount,
            params,
            0
        );
    }
    
    function withdraw(address token) external {
        require(msg.sender == owner, "Only owner");
        IERC20 asset = IERC20(token);
        asset.transfer(owner, asset.balanceOf(address(this)));
    }
}