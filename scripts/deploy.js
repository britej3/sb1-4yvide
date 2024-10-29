const hre = require("hardhat");

async function main() {
  // AAVE V3 Pool Addresses Provider on Polygon
  const AAVE_POOL_ADDRESSES_PROVIDER = "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb";
  
  console.log("Deploying FlashLoanArbitrage contract...");
  
  const FlashLoanArbitrage = await hre.ethers.getContractFactory("FlashLoanArbitrage");
  const flashLoan = await FlashLoanArbitrage.deploy(AAVE_POOL_ADDRESSES_PROVIDER);
  
  await flashLoan.deployed();
  
  console.log("FlashLoanArbitrage deployed to:", flashLoan.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });