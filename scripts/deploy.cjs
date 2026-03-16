/**
 * Deploy KnightCoin ERC-20 to Sepolia testnet.
 *
 * Usage:
 *   SEPOLIA_RPC_URL=https://... DEPLOYER_PRIVATE_KEY=0x... \
 *     npx hardhat run scripts/deploy.cjs --network sepolia --config hardhat.config.cjs
 *
 * The deployer wallet receives the initial 1,000,000 KC supply
 * and becomes the contract owner (can mint, airdrop, set market address).
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying KnightCoin with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const KnightCoin = await ethers.getContractFactory("KnightCoin");
  const token = await KnightCoin.deploy();
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("KnightCoin deployed to:", address);
  console.log("\nAdd this to your .env:");
  console.log(`VITE_KC_CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
