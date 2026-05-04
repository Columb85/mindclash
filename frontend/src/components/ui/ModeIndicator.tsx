'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Zap, AlertTriangle } from 'lucide-react';
import { areContractsDeployed, loadDeployedAddresses, CONTRACTS } from '@/lib/contracts';

type Mode = 'demo' | 'live' | 'checking';

export function ModeIndicator() {
  const [mode, setMode] = useState<Mode>('checking');
  const [contractsReady, setContractsReady] = useState(false);

  useEffect(() => {
    async function checkContracts() {
      // First check env vars
      if (areContractsDeployed()) {
        setContractsReady(true);
        setMode('live');
        return;
      }

      // Try to load from deployed-addresses.json
      const loaded = await loadDeployedAddresses();
      if (loaded && areContractsDeployed()) {
        setContractsReady(true);
        setMode('live');
      } else {
        setMode('demo');
      }
    }

    checkContracts();
  }, []);

  if (mode === 'checking') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-500/20 border border-gray-500/30 animate-pulse">
        <div className="w-2 h-2 rounded-full bg-gray-400" />
        <span className="text-xs font-medium text-gray-400">Checking...</span>
      </div>
    );
  }

  if (mode === 'live') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span className="text-xs font-semibold text-green-400">LIVE</span>
        <Wifi className="w-3 h-3 text-green-400" />
      </div>
    );
  }

  return (
    <div className="group relative">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 cursor-help">
        <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
        <span className="text-xs font-semibold text-yellow-400">DEMO</span>
        <WifiOff className="w-3 h-3 text-yellow-400" />
      </div>
      
      {/* Tooltip */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-dark-surface rounded-lg border border-dark-border shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-white mb-1">Demo Mode Active</p>
            <p className="text-[10px] text-gray-400">
              Contracts not deployed yet. AI decisions are simulated locally. 
              Deploy to Mantle Sepolia for real on-chain tracking.
            </p>
          </div>
        </div>
        
        {/* Arrow */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-dark-surface border-l border-t border-dark-border rotate-45" />
      </div>
    </div>
  );
}

// Extended version with more info for debugging
export function ModeIndicatorExtended() {
  const [mode, setMode] = useState<Mode>('checking');
  const [addresses, setAddresses] = useState<{agentNFT: string; agentRegistry: string} | null>(null);

  useEffect(() => {
    async function checkContracts() {
      if (areContractsDeployed()) {
        setAddresses({
          agentNFT: CONTRACTS.mantleSepolia.agentNFT,
          agentRegistry: CONTRACTS.mantleSepolia.agentRegistry,
        });
        setMode('live');
        return;
      }

      const loaded = await loadDeployedAddresses();
      if (loaded && areContractsDeployed()) {
        setAddresses({
          agentNFT: CONTRACTS.mantleSepolia.agentNFT,
          agentRegistry: CONTRACTS.mantleSepolia.agentRegistry,
        });
        setMode('live');
      } else {
        setMode('demo');
      }
    }

    checkContracts();
  }, []);

  return (
    <div className="glass p-4 rounded-xl border border-dark-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white">Network Status</h3>
        {mode === 'live' ? (
          <div className="flex items-center gap-1.5 text-green-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-xs font-semibold">LIVE ON MANTLE</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-yellow-400">
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-xs font-semibold">DEMO MODE</span>
          </div>
        )}
      </div>

      {mode === 'live' && addresses && (
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-dark-surface/50 rounded-lg px-3 py-2">
            <span className="text-xs text-gray-400">AgentNFT</span>
            <a 
              href={`https://sepolia.mantlescan.xyz/address/${addresses.agentNFT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-blue-400 hover:text-blue-300 transition"
            >
              {addresses.agentNFT.slice(0, 6)}...{addresses.agentNFT.slice(-4)}
            </a>
          </div>
          <div className="flex items-center justify-between bg-dark-surface/50 rounded-lg px-3 py-2">
            <span className="text-xs text-gray-400">AgentRegistry</span>
            <a 
              href={`https://sepolia.mantlescan.xyz/address/${addresses.agentRegistry}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-blue-400 hover:text-blue-300 transition"
            >
              {addresses.agentRegistry.slice(0, 6)}...{addresses.agentRegistry.slice(-4)}
            </a>
          </div>
          <div className="flex items-center justify-between bg-dark-surface/50 rounded-lg px-3 py-2">
            <span className="text-xs text-gray-400">Network</span>
            <span className="text-xs text-gray-300">Mantle Sepolia (5001)</span>
          </div>
        </div>
      )}

      {mode === 'demo' && (
        <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-yellow-300 font-medium mb-1">Contracts Not Deployed</p>
              <p className="text-[10px] text-gray-400">
                Run <code className="bg-dark-bg px-1 rounded">npx hardhat run scripts/deploy.js --network mantleSepolia</code> to deploy.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
