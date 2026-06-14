'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { areContractsDeployed, loadDeployedAddresses, CONTRACTS } from '@/lib/contracts';
import { Tooltip } from './Tooltip';

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
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 animate-pulse"
        style={{ border: '1px solid var(--hud-border)', background: 'var(--hud-panel)', clipPath: 'polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)' }}
      >
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--hud-text-dim)' }} />
        <span style={{ fontFamily: 'var(--hud-font-head)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--hud-text-dim)' }}>
          INIT
        </span>
      </div>
    );
  }

  if (mode === 'live') {
    return (
      <Tooltip text="Connected to Mantle Sepolia · Real on-chain transactions" position="bottom">
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px',
            border: '1px solid rgba(0,255,136,.3)',
            background: 'rgba(0,51,32,.5)',
            clipPath: 'polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)',
            fontFamily: 'var(--hud-font-head)',
            fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--hud-green)',
          }}
        >
          <span className="live-dot" style={{ width: 6, height: 6 }} />
          LIVE
        </div>
      </Tooltip>
    );
  }

  return (
    <div className="group relative">
      <div
        className="cursor-help"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 10px',
          border: '1px solid rgba(251,191,36,.3)',
          background: 'rgba(40,30,0,.5)',
          clipPath: 'polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)',
          fontFamily: 'var(--hud-font-head)',
          fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--hud-gold)',
        }}
      >
        <span className="live-dot" style={{ width: 6, height: 6, background: 'var(--hud-gold)', boxShadow: '0 0 6px var(--hud-gold)' }} />
        DEMO
      </div>

      {/* Tooltip */}
      <div
        className="absolute top-full right-0 mt-2 w-64 p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
        style={{ background: 'var(--hud-panel)', border: '1px solid var(--hud-border-hi)', clipPath: 'polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%)' }}
      >
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--hud-gold)' }} />
          <div>
            <p style={{ fontFamily: 'var(--hud-font-head)', fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Demo Mode Active</p>
            <p style={{ fontFamily: 'var(--hud-font-mono)', fontSize: 10, color: 'var(--hud-text-dim)', lineHeight: 1.5 }}>
              Contracts not deployed. AI decisions are simulated locally. Deploy to Mantle Sepolia for real on-chain tracking.
            </p>
          </div>
        </div>
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
            <span className="text-xs text-gray-300">Mantle Sepolia (5003)</span>
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
