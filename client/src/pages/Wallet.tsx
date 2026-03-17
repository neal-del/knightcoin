import { useAuth } from "@/lib/auth";
import { formatKC } from "@/lib/format";
import { useWallet } from "@/lib/wallet";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Wallet as WalletIcon,
  Link2,
  Unlink,
  ArrowDownToLine,
  ArrowUpFromLine,
  ExternalLink,
  Copy,
  CheckCircle2,
  AlertCircle,
  Coins,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function WalletPage() {
  const { user } = useAuth();
  const {
    walletAddress,
    hasMetaMask,
    isLinked,
    onChainBalance,
    blockchainEnabled,
    loading,
    connectWallet,
    disconnectWallet,
    refreshOnChainBalance,
  } = useWallet();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Fetch transaction history
  const { data: transactions = [] } = useQuery({
    queryKey: ["/api/wallet/transactions"],
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <WalletIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Sign in to view your wallet</p>
      </div>
    );
  }

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Address copied" });
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Wallet</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your KnightCoin balance and optionally connect a MetaMask wallet
        </p>
      </div>

      {/* Off-chain balance card */}
      <div className="rounded-xl bg-card border border-border p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Coins className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              In-App Balance
            </p>
            <p className="text-2xl font-bold text-primary tabular-nums" data-testid="text-offchain-balance">
              {formatKC(user.balance)} KC
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          This is your spendable balance for placing bets. Earned from signup bonus,
          daily login, and winning bets.
        </p>
      </div>

      {/* MetaMask / on-chain section */}
      <div className="rounded-xl bg-card border border-border p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path d="M20.5 3L12.5 9l1.5-3.5L20.5 3z" fill="#E2761B" stroke="#E2761B" strokeWidth="0.25" />
              <path d="M3.5 3l7.9 6.1L10 5.5 3.5 3z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" />
              <path d="M17.5 17.5l-2 3.5 4.5 1.2 1.3-4.5-3.8-.2z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" />
              <path d="M2.7 17.7l1.3 4.5 4.5-1.2-2-3.5-3.8.2z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" />
              <path d="M8.2 10.5L7 12.3l4.5.2-.2-4.8-3.1 2.8z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" />
              <path d="M15.8 10.5L12.6 7.6l-.1 4.9 4.5-.2-1.2-1.8z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" />
              <path d="M8.5 21l2.7-1.3-2.3-1.8-.4 3.1z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" />
              <path d="M12.8 19.7l2.7 1.3-.4-3.1-2.3 1.8z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.25" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              MetaMask Wallet {isLinked && <span className="text-green-400">(Linked)</span>}
            </p>
            {isLinked && walletAddress ? (
              <div className="flex items-center gap-2">
                <p className="text-sm font-mono text-foreground" data-testid="text-wallet-address">
                  {truncateAddress(walletAddress)}
                </p>
                <button onClick={copyAddress} className="text-muted-foreground hover:text-foreground transition-colors">
                  {copied ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                </button>
                <a
                  href={`https://sepolia.etherscan.io/address/${walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not connected</p>
            )}
          </div>
        </div>

        {isLinked && blockchainEnabled && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">On-Chain Balance</p>
              <p className="text-lg font-bold text-orange-400 tabular-nums" data-testid="text-onchain-balance">
                {formatKC(onChainBalance)} KC
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={refreshOnChainBalance} data-testid="button-refresh-onchain">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {!isLinked ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Connect your MetaMask wallet to get the full crypto experience.
              Your KC will exist as a real ERC-20 token on the Ethereum Sepolia testnet.
              This is optional — you can keep using KnightCoin without a wallet.
            </p>
            {!hasMetaMask ? (
              <Button
                onClick={connectWallet}
                className="w-full gap-2"
                variant="outline"
                data-testid="button-install-metamask"
              >
                <AlertCircle className="w-4 h-4" />
                Install MetaMask to Connect
              </Button>
            ) : (
              <Button
                onClick={connectWallet}
                className="w-full gap-2"
                disabled={loading}
                data-testid="button-connect-wallet"
              >
                <Link2 className="w-4 h-4" />
                {loading ? "Connecting..." : "Connect MetaMask"}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {blockchainEnabled && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="gap-2" disabled data-testid="button-deposit">
                  <ArrowDownToLine className="w-4 h-4" />
                  Deposit KC
                </Button>
                <Button variant="outline" className="gap-2" disabled data-testid="button-withdraw">
                  <ArrowUpFromLine className="w-4 h-4" />
                  Withdraw KC
                </Button>
              </div>
            )}
            {!blockchainEnabled && (
              <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                <p className="text-xs text-yellow-500/80">
                  Wallet linked, but the KnightCoin contract hasn't been deployed to Sepolia yet.
                  On-chain features (deposit/withdraw) will activate once the admin deploys the contract.
                </p>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2 text-muted-foreground"
              onClick={disconnectWallet}
              disabled={loading}
              data-testid="button-disconnect-wallet"
            >
              <Unlink className="w-3 h-3" />
              Disconnect Wallet
            </Button>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="rounded-xl bg-card border border-border p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">How the Hybrid System Works</h2>
        <div className="space-y-3 text-xs text-muted-foreground">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[10px] font-bold text-primary">1</span>
            </div>
            <p>
              <strong className="text-foreground">Off-chain (default):</strong> Your in-app KC balance
              is fast and free. Bets resolve instantly with no gas fees. Most students will use this.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[10px] font-bold text-orange-400">2</span>
            </div>
            <p>
              <strong className="text-foreground">On-chain (optional):</strong> Connect MetaMask to hold
              KC as a real ERC-20 token on Sepolia. You can deposit KC into the app for betting, and
              withdraw winnings back to your wallet. Requires free test ETH for gas fees.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[10px] font-bold text-muted-foreground">3</span>
            </div>
            <p>
              <strong className="text-foreground">Get test ETH:</strong> Visit a{" "}
              <a
                href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Sepolia faucet
              </a>{" "}
              to get free test ETH for gas fees. You only need to do this once.
            </p>
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      {(transactions as any[]).length > 0 && (
        <div className="rounded-xl bg-card border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Recent Transactions</h2>
          <div className="space-y-2">
            {(transactions as any[]).slice(0, 10).map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-xs text-foreground">{tx.description}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleDateString()}
                    {tx.txHash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-primary hover:underline"
                      >
                        View on Etherscan
                      </a>
                    )}
                  </p>
                </div>
                <span
                  className={`text-xs font-mono font-bold tabular-nums ${
                    tx.amount >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {tx.amount >= 0 ? "+" : ""}
                  {formatKC(tx.amount)} KC
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
