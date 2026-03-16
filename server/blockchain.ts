/**
 * Blockchain service — connects to Sepolia via a public RPC or Alchemy/Infura.
 * Reads KnightCoin ERC-20 balances and emits deposit/withdraw events.
 *
 * The server only READS from the chain (balance lookups).
 * All writes (transfers, deposits) happen from the user's MetaMask in the browser.
 */
import { ethers } from "ethers";

// Minimal ERC-20 ABI — only the functions we need server-side
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

// Sepolia chain ID
export const SEPOLIA_CHAIN_ID = 11155111;

// Configuration — reads from env, falls back to defaults
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
const CONTRACT_ADDRESS = process.env.KC_CONTRACT_ADDRESS || "";

let provider: ethers.JsonRpcProvider | null = null;
let contract: ethers.Contract | null = null;

/**
 * Initialize the blockchain provider and contract.
 * Safe to call even without a contract address (blockchain features just stay disabled).
 */
export function initBlockchain() {
  if (!CONTRACT_ADDRESS) {
    console.log("[blockchain] No KC_CONTRACT_ADDRESS set — on-chain features disabled");
    return;
  }

  try {
    provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    contract = new ethers.Contract(CONTRACT_ADDRESS, ERC20_ABI, provider);
    console.log(`[blockchain] Connected to Sepolia, contract: ${CONTRACT_ADDRESS}`);
  } catch (err) {
    console.error("[blockchain] Failed to connect:", err);
  }
}

/**
 * Check if blockchain features are active.
 */
export function isBlockchainEnabled(): boolean {
  return contract !== null && provider !== null;
}

/**
 * Get the on-chain KC balance for a wallet address.
 * Returns the balance as a human-readable number (e.g. 1000.5).
 */
export async function getOnChainBalance(walletAddress: string): Promise<number> {
  if (!contract) return 0;
  try {
    const raw = await contract.balanceOf(walletAddress);
    const decimals = await contract.decimals();
    return parseFloat(ethers.formatUnits(raw, decimals));
  } catch (err) {
    console.error("[blockchain] Balance lookup failed:", err);
    return 0;
  }
}

/**
 * Verify that a transaction hash is a valid KC transfer on Sepolia.
 * Used to confirm deposits (user transfers KC to the market).
 * Returns { from, to, amount } or null if invalid.
 */
export async function verifyTransaction(
  txHash: string
): Promise<{ from: string; to: string; amount: number } | null> {
  if (!provider || !contract) return null;
  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) return null;

    // Parse Transfer events from the receipt
    const contractAddress = await contract.getAddress();
    const iface = new ethers.Interface(ERC20_ABI);

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== contractAddress.toLowerCase()) continue;
      try {
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed && parsed.name === "Transfer") {
          const decimals = await contract!.decimals();
          return {
            from: parsed.args[0],
            to: parsed.args[1],
            amount: parseFloat(ethers.formatUnits(parsed.args[2], decimals)),
          };
        }
      } catch {
        continue;
      }
    }
    return null;
  } catch (err) {
    console.error("[blockchain] Transaction verification failed:", err);
    return null;
  }
}

/**
 * Get blockchain config for the frontend.
 */
export function getBlockchainConfig() {
  return {
    enabled: isBlockchainEnabled(),
    contractAddress: CONTRACT_ADDRESS || null,
    chainId: SEPOLIA_CHAIN_ID,
    chainName: "Sepolia",
    rpcUrl: "https://rpc.sepolia.org",
    blockExplorer: "https://sepolia.etherscan.io",
  };
}
