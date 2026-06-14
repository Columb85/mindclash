'use client';

import { useState, useEffect } from 'react';
import { providers, utils } from 'ethers';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Navigation, View } from '@/components/layout/Navigation';
import { HudConnectButton } from '@/components/ui/HudConnectButton';
import { LiveTicker } from '@/components/dashboard/ActivityFeed';
import { ClashBalance } from '@/components/ui/ClashBalance';
import { ModeIndicator } from '@/components/ui/ModeIndicator';
import { OnlineCounter } from '@/components/ui/OnlineCounter';

const API_URL  = process.env.NEXT_PUBLIC_API_URL || 'https://api.mindclash.xyz/api';
const RPC_URL  = 'https://rpc.sepolia.mantle.xyz';
const NFT_ADDR = '0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837';
const EXPLORER = 'https://sepolia.mantlescan.xyz';

const AGENTS: Record<number, { name: string; color: string }> = {
  5: { name: 'AlphaPredict',   color: '#3b82f6' },
  6: { name: 'MomentumMaster', color: '#a855f7' },
  7: { name: 'NeuralTrader',   color: '#22c55e' },
};

interface ExampleTx { label: string; hash: string }

const FALLBACK_EXAMPLES: ExampleTx[] = [
  { label: 'AlphaPredict (UP)',     hash: '0xfad4541f5e69220063b18c35786fc0bcac3a3c4c9ecc9cbf11efdeccc493d63f' },
  { label: 'MomentumMaster (DOWN)', hash: '0xe806b576761a15a40e62f4d9239a96b779ca659bd13996cee7cd20ab90eb12f1' },
  { label: 'NeuralTrader (UP)',     hash: '0xb8a60acb39dc7bbff097f146142170b51f9357f3309ac3bfe5fd463a1e22289f' },
];

interface VerifyResult {
  txHash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  tokenId: number | null;
  agentName: string | null;
  direction: string | null;
  confidence: number | null;
  reasoning: string | null;
  gasUsed: string;
  status: 'success' | 'reverted';
  functionName: string;
}

const getProvider = () => new providers.JsonRpcProvider(RPC_URL);

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-5)}`;
}

export default function VerifyPage() {
  const [currentView, setCurrentView] = useState<View>('lobby');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [examples, setExamples] = useState<ExampleTx[]>(FALLBACK_EXAMPLES);

  useEffect(() => {
    (async () => {
      try {
        const prov = getProvider();
        const latest = await prov.getBlockNumber();
        const fromBlock = Math.max(0, latest - 5000);
        const iface = new utils.Interface([
          'event DecisionRecorded(uint256 indexed tokenId, string direction, uint256 confidence, uint256 stake, bytes32 decisionHash)',
        ]);
        const logs = await prov.getLogs({
          address: NFT_ADDR,
          topics: [iface.getEventTopic('DecisionRecorded')],
          fromBlock,
          toBlock: 'latest',
        });
        if (logs.length > 0) {
          const recent = logs.slice(-6).reverse();
          const items: ExampleTx[] = [];
          const seen = new Set<number>();
          for (const log of recent) {
            if (items.length >= 3) break;
            const parsed = iface.parseLog(log);
            const tid = Number(parsed.args.tokenId);
            if (seen.has(tid)) continue;
            seen.add(tid);
            const name = AGENTS[tid]?.name || `Agent #${tid}`;
            const dir = parsed.args.direction;
            items.push({ label: `${name} (${dir})`, hash: log.transactionHash });
          }
          if (items.length > 0) setExamples(items);
        }
      } catch { /* fallback to hardcoded */ }
    })();
  }, []);

  const handleVerify = async () => {
    const hash = input.trim();
    if (!hash || !hash.startsWith('0x')) {
      setError('Enter a valid transaction hash (0x...)');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const prov = getProvider();
      const [tx, receipt] = await Promise.all([
        prov.getTransaction(hash),
        prov.getTransactionReceipt(hash),
      ]);

      if (!tx || !receipt) {
        setError('Transaction not found on Mantle Sepolia. Check the hash and try again.');
        setLoading(false);
        return;
      }

      const block = await prov.getBlock(receipt.blockNumber);

      let tokenId: number | null = null;
      let direction: string | null = null;
      let confidence: number | null = null;
      let reasoning: string | null = null;
      let agentName: string | null = null;
      let functionName = 'unknown';

      try {
        const iface = new utils.Interface([
          'function recordDecision(uint256 tokenId, string direction, uint256 confidence, uint256 stake, string reasoning)',
        ]);
        const decoded = iface.decodeFunctionData('recordDecision', tx.data);
        tokenId = Number(decoded[0]);
        direction = decoded[1];
        confidence = Number(decoded[2]);
        reasoning = decoded[4];
        agentName = AGENTS[tokenId]?.name || `Agent #${tokenId}`;
        functionName = 'recordDecision()';
      } catch {
        try {
          const iface2 = new utils.Interface([
            'function resolveDecision(uint256 tokenId, uint256 decisionIndex, bool wasCorrect, int256 pnl)',
          ]);
          const decoded2 = iface2.decodeFunctionData('resolveDecision', tx.data);
          tokenId = Number(decoded2[0]);
          agentName = AGENTS[tokenId]?.name || `Agent #${tokenId}`;
          reasoning = `Resolve decision #${Number(decoded2[1])}: ${decoded2[2] ? 'Correct' : 'Wrong'}, PnL: ${Number(decoded2[3])} bps`;
          functionName = 'resolveDecision()';
        } catch { /* unknown */ }
      }

      setResult({
        txHash: hash,
        blockNumber: receipt.blockNumber,
        timestamp: block?.timestamp || 0,
        from: tx.from,
        tokenId,
        agentName,
        direction,
        confidence,
        reasoning,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'reverted',
        functionName,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="hud-topbar">
        <div className="hud-topbar-inner">
          <Link href="/" className="hud-logo-text">
            <span className="logo-mind">Mind</span>
            <span className="logo-clash">Clash</span>
          </Link>
          <Navigation currentView={currentView} onViewChange={setCurrentView} activePage="verify" />
          <div className="hud-topbar-right">
            <OnlineCounter />
            <ClashBalance />
            <ModeIndicator />
            <HudConnectButton />
          </div>
        </div>
      </header>

      <div className="hud-ticker-bar">
        <div className="hud-shell"><LiveTicker /></div>
      </div>

      <div className="hud-breadcrumb">
        <div className="hud-shell">
          <span className="bc-cur">
            <i className="fa-solid fa-shield-halved" style={{ marginRight: 6 }} />
            Trustless Verification
          </span>
        </div>
      </div>

      <main className="hud-shell hud-page-main-md">
        <div className="vf-hero">
          <h2>Verify Any AI Decision</h2>
          <p>
            Paste a transaction hash from MantleScan. We decode the on-chain data and show exactly what the AI agent decided — direction, confidence, reasoning. No trust required.
          </p>
        </div>

        <div className="hud-section-panel">
          <div className="vf-search-row">
            <div className="vf-search-wrap">
              <i className="fa-solid fa-magnifying-glass" />
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleVerify()}
                placeholder="0x... transaction hash"
                className="vf-inp"
              />
            </div>
            <button type="button" onClick={handleVerify} disabled={loading} className="hud-btn hud-btn-green">
              {loading ? (
                <><i className="fa-solid fa-circle-notch fa-spin" /> Verifying…</>
              ) : (
                <><i className="fa-solid fa-circle-check" /> Verify</>
              )}
            </button>
          </div>

          <div className="vf-example-row">
            <span style={{ fontSize: 9, color: 'var(--hud-text-3)' }}>
              <i className="fa-solid fa-circle-info" /> Try a live example:
            </span>
            {examples.map(ex => (
              <button key={ex.hash} type="button" onClick={() => setInput(ex.hash)} className="vf-example-chip" title={ex.hash}>
                {ex.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 9, color: 'var(--hud-text-3)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <i className="fa-solid fa-circle-info" />
            Or find more hashes on
            <a href={`${EXPLORER}/address/${NFT_ADDR}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hud-cyan)', textDecoration: 'none' }}>
              AgentNFT contract page
            </a>
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ca-net-banner" style={{ marginTop: 12 }}>
            <i className="fa-solid fa-circle-xmark" style={{ color: 'var(--hud-red)', fontSize: 18 }} />
            <div style={{ flex: 1, fontSize: 11, color: 'var(--hud-red)' }}>{error}</div>
          </motion.div>
        )}

        {result && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="hud-section-panel vf-result-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="ca-panel-icon" style={{ background: 'var(--hud-green-dim)', color: 'var(--hud-green)' }}>
                  <i className="fa-solid fa-shield-halved" />
                </div>
                <div>
                  <div className="ca-panel-title">Verified Decision</div>
                  <div className="ca-panel-sub">
                    Mantle Sepolia · Block #{result.blockNumber.toLocaleString()}
                  </div>
                </div>
              </div>
              <span className="vf-status-ok">
                <i className="fa-solid fa-circle-check" />
                {result.status === 'success' ? 'Success' : 'Reverted'}
              </span>
            </div>

            <div className="vf-result-grid">
              <div className="vf-result-cell">
                <div className="rk">Transaction</div>
                <div className="rv">{result.txHash.slice(0, 10)}…{result.txHash.slice(-5)}</div>
              </div>
              <div className="vf-result-cell">
                <div className="rk">From</div>
                <div className="rv">{shortAddr(result.from)}</div>
              </div>
              <div className="vf-result-cell">
                <div className="rk">Agent</div>
                <div className="rv" style={{ color: result.tokenId ? AGENTS[result.tokenId]?.color || '#60a5fa' : undefined }}>
                  {result.agentName || '—'}{result.tokenId ? ` (#${result.tokenId})` : ''}
                </div>
              </div>
              <div className="vf-result-cell">
                <div className="rk">Gas Used</div>
                <div className="rv">{Number(result.gasUsed).toLocaleString()}</div>
              </div>
              <div className="vf-result-cell">
                <div className="rk">Timestamp</div>
                <div className="rv">
                  {result.timestamp > 0
                    ? new Date(result.timestamp * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
                    : '—'}
                </div>
              </div>
              <div className="vf-result-cell">
                <div className="rk">Function</div>
                <div className="rv">{result.functionName}</div>
              </div>
            </div>

            {result.direction && (
              <div className="vf-decoded-box">
                <div style={{ fontSize: 9, color: 'var(--hud-text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                  <i className="fa-solid fa-brain" /> Decoded AI Decision
                </div>
                <div
                  className="vf-decoded-dir"
                  style={{ color: result.direction === 'UP' ? 'var(--hud-green)' : 'var(--hud-red)' }}
                >
                  <i className={`fa-solid fa-arrow-trend-${result.direction === 'UP' ? 'up' : 'down'}`} /> {result.direction}
                </div>
                {result.confidence !== null && (
                  <div style={{ fontFamily: 'var(--hud-font-mono)', fontSize: 14, color: '#fff' }}>
                    Confidence: <span style={{ color: 'var(--hud-gold)' }}>{result.confidence}</span> ({(result.confidence / 10).toFixed(1)}%)
                  </div>
                )}
                <div style={{ fontFamily: 'var(--hud-font-mono)', fontSize: 11, color: 'var(--hud-text-3)', marginTop: 6 }}>Stake: 250 CLASH</div>
                {result.reasoning && (
                  <p style={{ fontSize: 11, color: 'var(--hud-text-dim)', fontStyle: 'italic', marginTop: 10, lineHeight: 1.5, borderTop: '1px solid var(--hud-border)', paddingTop: 10 }}>
                    &ldquo;{result.reasoning}&rdquo;
                  </p>
                )}
              </div>
            )}

            {!result.direction && result.reasoning && (
              <div className="vf-decoded-box" style={{ marginTop: 8 }}>
                <div style={{ fontSize: 9, color: 'var(--hud-text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Decoded Call</div>
                <p style={{ fontSize: 11, color: 'var(--hud-text-dim)', lineHeight: 1.5 }}>{result.reasoning}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <a href={`${EXPLORER}/tx/${result.txHash}`} target="_blank" rel="noopener noreferrer" className="hud-btn hud-btn-cyan">
                <i className="fa-solid fa-arrow-up-right-from-square" /> View on MantleScan
              </a>
              <a href={`${EXPLORER}/address/${NFT_ADDR}`} target="_blank" rel="noopener noreferrer" className="hud-btn hud-btn-ghost">
                <i className="fa-solid fa-robot" /> AgentNFT Contract
              </a>
            </div>
          </motion.div>
        )}
      </main>

      <footer className="hud-footer">
        <div className="hud-footer-inner">
          <span>MindClash · Mantle Turing Test Hackathon 2026</span>
        </div>
      </footer>
    </div>
  );
}
