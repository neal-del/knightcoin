/**
 * MetaMask / Ethereum wallet integration hook.
 * Handles connect, disconnect, chain switching, and on-chain KC balance reads.
 */
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { apiRequest } from "./queryClient";
import { useAuth } from "./auth";

// Sepolia chain ID
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111 in hex

interface WalletContextType {
  /** Connected wallet address (null if not connected) */
  walletAddress: string | null;
  /** Whether MetaMask is installed */
  hasMetaMask: boolean;
  /** Whether the wallet is connected to the browser */
  isConnected: boolean;
  /** Whether the user's wallet is linked to their KnightCoin account */
  isLinked: boolean;
  /** On-chain KC balance (0 if not linked or blockchain disabled) */
  onChainBalance: number;
  /** Whether blockchain features are enabled on the server */
  blockchainEnabled: boolean;
  /** Whether we're currently connecting/linking */
  loading: boolean;
  /** Connect MetaMask and link wallet to account */
  connectWallet: () => Promise<void>;
  /** Disconnect wallet from account */
  disconnectWallet: () => Promise<void>;
  /** Refresh on-chain balance */
  refreshOnChainBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
  walletAddress: null,
  hasMetaMask: false,
  isConnected: false,
  isLinked: false,
  onChainBalance: 0,
  blockchainEnabled: false,
  loading: false,
  connectWallet: async () => {},
  disconnectWallet: async () => {},
  refreshOnChainBalance: async () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { user, refreshUser } = useAuth();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [onChainBalance, setOnChainBalance] = useState(0);
  const [blockchainEnabled, setBlockchainEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasMetaMask = typeof window !== "undefined" && typeof (window as any).ethereum !== "undefined";
  const isConnected = walletAddress !== null;
  const isLinked = user?.walletAddress !== null && user?.walletAddress !== undefined;

  // Check blockchain config on mount
  useEffect(() => {
    apiRequest("GET", "/api/blockchain/config")
      .then((res) => res.json())
      .then((config) => setBlockchainEnabled(config.enabled))
      .catch(() => {});
  }, []);

  // Sync wallet address from user's linked wallet
  useEffect(() => {
    if (user?.walletAddress) {
      setWalletAddress(user.walletAddress);
    } else {
      setWalletAddress(null);
      setOnChainBalance(0);
    }
  }, [user?.walletAddress]);

  // Listen for MetaMask account changes
  useEffect(() => {
    if (!hasMetaMask) return;
    const ethereum = (window as any).ethereum;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setWalletAddress(null);
      }
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    return () => ethereum.removeListener("accountsChanged", handleAccountsChanged);
  }, [hasMetaMask]);

  const switchToSepolia = useCallback(async () => {
    const ethereum = (window as any).ethereum;
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError: any) {
      // Chain not added yet — add it
      if (switchError.code === 4902) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: SEPOLIA_CHAIN_ID,
              chainName: "Sepolia Testnet",
              nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://rpc.sepolia.org"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
      }
    }
  }, []);

  const connectWallet = useCallback(async () => {
    if (!hasMetaMask) {
      window.open("https://metamask.io/download/", "_blank");
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      const ethereum = (window as any).ethereum;

      // Request account access
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0];

      // Switch to Sepolia
      await switchToSepolia();

      // Link wallet to KnightCoin account via API
      await apiRequest("POST", "/api/wallet/link", { walletAddress: address });
      setWalletAddress(address);
      await refreshUser();
    } catch (err) {
      console.error("Wallet connection failed:", err);
    } finally {
      setLoading(false);
    }
  }, [hasMetaMask, user, switchToSepolia, refreshUser]);

  const disconnectWallet = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      await apiRequest("POST", "/api/wallet/unlink");
      setWalletAddress(null);
      setOnChainBalance(0);
      await refreshUser();
    } catch (err) {
      console.error("Wallet disconnect failed:", err);
    } finally {
      setLoading(false);
    }
  }, [user, refreshUser]);

  const refreshOnChainBalance = useCallback(async () => {
    if (!isLinked) return;
    try {
      const res = await apiRequest("GET", "/api/wallet/onchain-balance");
      const data = await res.json();
      setOnChainBalance(data.balance || 0);
    } catch {
      // Silently fail
    }
  }, [isLinked]);

  // Auto-refresh on-chain balance when wallet is linked
  useEffect(() => {
    if (isLinked && blockchainEnabled) {
      refreshOnChainBalance();
    }
  }, [isLinked, blockchainEnabled, refreshOnChainBalance]);

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        hasMetaMask,
        isConnected,
        isLinked,
        onChainBalance,
        blockchainEnabled,
        loading,
        connectWallet,
        disconnectWallet,
        refreshOnChainBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
