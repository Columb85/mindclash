'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import {
  Droplets,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Clock,
  Wallet,
  Zap,
  Coins,
  Info,
  RefreshCw
} from 'lucide-react';
import { mantleSepolia, FAUCET_URLS, getMantleTestnetTokens, checkTestnetBalance, getSepoliaETH } from '@/lib/mantle-testnet';

export function TestnetFaucet() {
  const { address, isConnected } = useAccount();
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [faucetResult, setFaucetResult] = useState<{
    success: boolean;
    message: string;
    txHash?: string;
  } | null>(null);
  const [lastRequestTime, setLastRequestTime] = useState<number | null>(null);

  // Check balance when wallet connects
  useEffect(() => {
    if (address && isConnected) {
      checkBalance();
    }
  }, [address, isConnected]);

  const checkBalance = async () => {
    if (!address) return;
    
    try {
      const result = await checkTestnetBalance(address);
      setBalance(result.balance);
    } catch (error) {
      console.error('Balance check failed:', error);
    }
  };

  const requestMNTTokens = async () => {
    if (!address) return;
    
    setIsLoading(true);
    setFaucetResult(null);
    
    try {
      const result = await getMantleTestnetTokens(address);
      setFaucetResult(result);
      
      if (result.success) {
        setLastRequestTime(Date.now());
        // Check balance after successful request
        setTimeout(checkBalance, 5000); // Wait 5 seconds for transaction
      }
    } catch (error) {
      setFaucetResult({
        success: false,
        message: 'Failed to request tokens. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openFaucet = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const needsTokens = balance < 0.1; // Less than 0.1 MNT
  const hasGas = balance > 0.01; // More than 0.01 MNT for gas

  if (!isConnected) {
    return (
      <div className="glass p-6 rounded-2xl border border-dark-border text-center">
        <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-500" />
        <h3 className="text-lg font-bold text-white mb-2">Connect Wallet</h3>
        <p className="text-sm text-gray-400">Connect your wallet to get testnet tokens</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="glass p-6 rounded-2xl border border-dark-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Testnet Balance</h3>
              <p className="text-sm text-gray-400">Mantle Sepolia Network</p>
            </div>
          </div>
          <button
            onClick={checkBalance}
            className="p-2 rounded-lg bg-dark-surface/50 text-gray-400 hover:text-white transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-dark-surface/30 rounded-lg">
            <span className="text-sm text-gray-400">MNT Balance</span>
            <span className="text-lg font-bold text-white">{balance.toFixed(4)} MNT</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            {hasGas ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-green-400">Sufficient gas for transactions</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400">Need more tokens for gas fees</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Faucet Options */}
      <div className="glass p-6 rounded-2xl border border-dark-border">
        <h3 className="text-lg font-bold text-white mb-4">Get Testnet Tokens</h3>
        
        <div className="space-y-4">
          {/* Quick Request */}
          <div className="border border-dark-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Quick Request</h4>
                  <p className="text-xs text-gray-400">Get 0.1 MNT instantly (if available)</p>
                </div>
              </div>
              <button
                onClick={requestMNTTokens}
                disabled={isLoading || !needsTokens}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Requesting...
                  </span>
                ) : (
                  'Request Tokens'
                )}
              </button>
            </div>
            
            {faucetResult && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-lg text-sm ${
                  faucetResult.success 
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400' 
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  {faucetResult.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{faucetResult.message}</span>
                </div>
                {faucetResult.txHash && (
                  <div className="mt-2 text-xs">
                    <a
                      href={`https://sepolia.mantlescan.xyz/tx/${faucetResult.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      View Transaction →
                    </a>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Official Faucet */}
          <div className="border border-dark-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Official Mantle Faucet</h4>
                  <p className="text-xs text-gray-400">Requires X authentication, more tokens available</p>
                </div>
              </div>
              <button
                onClick={() => openFaucet(FAUCET_URLS.mantleOfficial)}
                className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 font-semibold text-sm border border-purple-500/30 hover:bg-purple-500/30 transition"
              >
                <ExternalLink className="w-4 h-4 inline mr-2" />
                Open Faucet
              </button>
            </div>
          </div>

          {/* Sepolia ETH for Gas */}
          <div className="border border-dark-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Coins className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Get Sepolia ETH</h4>
                  <p className="text-xs text-gray-400">For gas fees on Mantle Sepolia</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openFaucet(FAUCET_URLS.sepoliaETH.infura)}
                  className="px-3 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 font-semibold text-xs border border-yellow-500/30 hover:bg-yellow-500/30 transition"
                >
                  Infura
                </button>
                <button
                  onClick={() => openFaucet(FAUCET_URLS.sepoliaETH.alchemy)}
                  className="px-3 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 font-semibold text-xs border border-yellow-500/30 hover:bg-yellow-500/30 transition"
                >
                  Alchemy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Important Info */}
      <div className="glass p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-semibold text-white mb-2">Important Notes</h4>
            <ul className="space-y-1 text-gray-400">
              <li>• Testnet tokens have no real value and are for testing only</li>
              <li>• Faucets may have rate limits (typically 24 hours)</li>
              <li>• You need both MNT and Sepolia ETH for transactions</li>
              <li>• Tokens may take a few minutes to appear in your wallet</li>
              <li>• Keep some tokens for gas fees when testing the AI agent</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Network Status */}
      <div className="glass p-4 rounded-xl border border-dark-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <div>
              <h4 className="font-semibold text-white">Network Status</h4>
              <p className="text-xs text-gray-400">Mantle Sepolia Testnet</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Chain ID</div>
            <div className="text-sm font-mono text-white">{mantleSepolia.id}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
