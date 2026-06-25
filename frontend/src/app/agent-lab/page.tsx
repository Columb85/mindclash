'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import toast from 'react-hot-toast';
import { Navigation, View } from '@/components/layout/Navigation';
import { HudConnectButton } from '@/components/ui/HudConnectButton';
import { LiveTicker } from '@/components/dashboard/ActivityFeed';
import { ClashBalance } from '@/components/ui/ClashBalance';
import { ModeIndicator } from '@/components/ui/ModeIndicator';
import { OnlineCounter } from '@/components/ui/OnlineCounter';
import { useMyAgent } from '@/hooks/useMyAgent';
import { useAgentProfile } from '@/hooks/useAgentContract';
import { useAgentDecisions } from '@/hooks/useAgentDecisions';
import { AGENT_STRATEGIES } from '@/lib/agent-config';
import { CONTRACTS, loadDeployedAddresses } from '@/lib/contracts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.mindclash.xyz/api';
const EXPLORER = 'https://sepolia.mantlescan.xyz';
const MANTLE_SEPOLIA_ID = 5003;
const ASSETS = ['BTC', 'ETH', 'SOL', 'MNT'] as const;

const RECORD_DECISION_ABI = [
  {
    name: 'recordDecision',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'direction', type: 'string' },
      { name: 'confidence', type: 'uint256' },
      { name: 'stake', type: 'uint256' },
      { name: 'reasoning', type: 'string' },
    ],
    outputs: [{ type: 'bytes32' }],
  },
] as const;

const STEPS = [
  { n: 1, title: 'Create Agent', desc: 'Mint ERC-8004 NFT on Mantle Sepolia', icon: 'fa-solid fa-wand-magic-sparkles' },
  { n: 2, title: 'Record Decision', desc: 'AI analyzes market → sign on-chain', icon: 'fa-solid fa-brain' },
  { n: 3, title: 'Verify On-Chain', desc: 'Read decisions directly from AgentNFT', icon: 'fa-solid fa-circle-check' },
];

type PendingDecision = {
  direction: 'UP' | 'DOWN';
  confidence: number;
  reasoning: string;
  price: number;
};

function formatTime(ts: number): string {
  if (!ts) return '—';
  const d = new Date(ts * 1000);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function shortHash(hash: string): string {
  if (!hash || hash.length < 12) return hash || '—';
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export default function AgentLabPage() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [currentView, setCurrentView] = useState<View>('lobby');
  const { tokenId, registered, isLoading: isChecking } = useMyAgent();
  const { profile, refetch: refetchProfile } = useAgentProfile(tokenId > 0 ? BigInt(tokenId) : undefined);
  const { decisions, loading: loadingDecisions, error: decisionsError, refetch: refetchDecisions } = useAgentDecisions(
    tokenId > 0 ? tokenId : undefined,
    25,
  );

  const [selectedAsset, setSelectedAsset] = useState<string>('BTC');
  const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(null);
  const [isFetchingDecision, setIsFetchingDecision] = useState(false);

  const { writeContract: writeRecordDecision, data: recordTxHash, isPending: isRecording } = useWriteContract();
  const { isLoading: isWaitingRecord, isSuccess: isRecordSuccess } = useWaitForTransactionReceipt({
    hash: recordTxHash,
  });

  const isWrongNetwork = isConnected && chainId !== MANTLE_SEPOLIA_ID;
  const hasAgent = tokenId > 0;
  const displayName = registered?.name || profile?.name || `Agent #${tokenId}`;
  const displayStrategy = AGENT_STRATEGIES.find(s => s.id === registered?.strategy)?.name || registered?.strategy || '—';
  const nftAddr = CONTRACTS.mantleSepolia.agentNFT;

  useEffect(() => {
    if (!CONTRACTS.mantleSepolia.agentNFT) loadDeployedAddresses();
  }, []);

  useEffect(() => {
    if (!isRecordSuccess) return;
    toast.success('Decision recorded on-chain');
    setPendingDecision(null);
    refetchProfile();
    refetchDecisions();
  }, [isRecordSuccess, refetchProfile, refetchDecisions]);

  const handleFetchDecision = async () => {
    if (!hasAgent) return;
    setIsFetchingDecision(true);
    setPendingDecision(null);
    try {
      const res = await fetch(`${API_URL}/agents/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentTokenId: tokenId,
          asset: selectedAsset,
          duration: 60,
          strategy: registered?.strategy || 'neural',
        }),
      });
      const json = await res.json();
      if (json.success && json.decision) {
        setPendingDecision(json.decision as PendingDecision);
      } else {
        toast.error(json.error || 'AI decision failed');
      }
    } catch {
      toast.error('API unreachable');
    } finally {
      setIsFetchingDecision(false);
    }
  };

  const handleRecordOnChain = () => {
    if (!pendingDecision || !hasAgent) return;
    writeRecordDecision({
      address: CONTRACTS.mantleSepolia.agentNFT as `0x${string}`,
      abi: RECORD_DECISION_ABI,
      functionName: 'recordDecision',
      args: [
        BigInt(tokenId),
        pendingDecision.direction,
        BigInt(pendingDecision.confidence),
        BigInt(250),
        pendingDecision.reasoning,
      ],
    });
  };

  const currentStep = !isConnected ? 0 : !hasAgent ? 1 : pendingDecision || isRecording || isWaitingRecord ? 2 : 3;
  const winRate = profile && Number(profile.totalDecisions) > 0
    ? `${((Number(profile.correctDecisions) / Number(profile.totalDecisions)) * 100).toFixed(0)}%`
    : '0%';

  return (
    <div className="min-h-screen">
      <header className="hud-topbar">
        <div className="hud-topbar-inner">
          <Link href="/" className="hud-logo-text">
            <span className="logo-mind">Mind</span>
            <span className="logo-clash">Clash</span>
          </Link>
          <Navigation currentView={currentView} onViewChange={setCurrentView} activePage="create-agent" />
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

      <main className="ca-main hud-shell" style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 48 }}>
        <div className="alab-hero">
          <span className="hud-badge hud-badge-cyan" style={{ marginBottom: 12 }}>
            <i className="fa-solid fa-flask" style={{ marginRight: 6 }} />
            ERC-8004
          </span>
          <h1>Agent Lab</h1>
          <p>
            Mint your AI agent NFT, record a market decision on Mantle Sepolia,
            and read the proof directly from the AgentNFT smart contract.
          </p>
        </div>

        <div className="alab-steps">
          {STEPS.map(step => (
            <div
              key={step.n}
              className={`alab-step${currentStep >= step.n ? ' active' : ''}${currentStep === step.n ? ' current' : ''}`}
            >
              <div className="alab-step-num">{step.n}</div>
              <div>
                <div className="alab-step-title">
                  <i className={step.icon} style={{ marginRight: 6, fontSize: 13 }} />
                  {step.title}
                </div>
                <div className="alab-step-desc">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {isWrongNetwork && (
          <div className="ca-net-banner" style={{ marginBottom: 20 }}>
            <div>
              <div className="ca-net-title">Switch to Mantle Sepolia</div>
              <div className="ca-net-sub">Chain ID {MANTLE_SEPOLIA_ID} required for agent transactions</div>
            </div>
          </div>
        )}

        {!isConnected && (
          <div className="hud-section-panel alab-cta-panel">
            <i className="fa-solid fa-wallet" style={{ fontSize: 32, color: 'var(--hud-cyan)', marginBottom: 12 }} />
            <h2>Connect Wallet to Start</h2>
            <p>Connect a wallet on Mantle Sepolia (testnet MNT for gas).</p>
            <HudConnectButton />
          </div>
        )}

        {isConnected && !isChecking && !hasAgent && (
          <div className="hud-section-panel alab-cta-panel">
            <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: 32, color: 'var(--hud-gold)', marginBottom: 12 }} />
            <h2>Step 1 — Create Your Agent</h2>
            <p>Mint one ERC-8004 agent NFT per wallet. Takes ~30 seconds + testnet gas.</p>
            <Link href="/create-agent" className="hud-btn hud-btn-gold">
              <i className="fa-solid fa-sparkles" />
              Go to Create Agent
            </Link>
          </div>
        )}

        {isConnected && hasAgent && (
          <>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="hud-section-panel ca-agent-panel">
              <div className="ca-agent-summary">
                <i className="fa-solid fa-robot" style={{ color: 'var(--hud-cyan)' }} />
                <div>
                  <div className="ca-agent-name">{displayName}</div>
                  <div className="ca-agent-meta">
                    NFT #{tokenId} · {displayStrategy} · Mantle Sepolia
                  </div>
                </div>
              </div>
              <div className="ca-agent-stats">
                <span><strong>{profile?.totalDecisions?.toString() ?? '0'}</strong> decisions</span>
                <span><strong>{winRate}</strong> win rate</span>
                <span><strong>{profile?.correctDecisions?.toString() ?? '0'}</strong> correct</span>
              </div>
              <div className="ca-agent-actions">
                {nftAddr && (
                  <a
                    href={`${EXPLORER}/token/${nftAddr}?a=${tokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hud-btn hud-btn-ghost"
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square" />
                    View NFT on Explorer
                  </a>
                )}
                <button type="button" onClick={() => { refetchDecisions(); refetchProfile(); }} className="hud-btn hud-btn-ghost">
                  <i className={`fa-solid fa-arrows-rotate${loadingDecisions ? ' fa-spin' : ''}`} />
                  Refresh chain data
                </button>
              </div>
            </motion.div>

            <div className="hud-section-panel ca-record-panel" style={{ marginTop: 16 }}>
              <div className="ca-panel-hdr">
                <div className="ca-panel-icon" style={{ background: 'var(--hud-purple-dim)', color: 'var(--hud-purple)' }}>
                  <i className="fa-solid fa-brain" />
                </div>
                <div>
                  <div className="ca-panel-title">Step 2 — Record a Decision</div>
                  <div className="ca-panel-sub">AI analyzes live price → you sign recordDecision() on-chain</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {ASSETS.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setSelectedAsset(a)}
                    className={`hud-btn${selectedAsset === a ? ' hud-btn-cyan' : ' hud-btn-ghost'}`}
                    style={{ padding: '10px 14px', fontSize: 12 }}
                  >
                    {a}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleFetchDecision}
                disabled={isFetchingDecision || isWrongNetwork}
                className="hud-btn hud-btn-cyan"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {isFetchingDecision ? (
                  <><i className="fa-solid fa-circle-notch fa-spin" /> Analyzing {selectedAsset}…</>
                ) : (
                  <><i className="fa-solid fa-bolt" /> Get AI Decision</>
                )}
              </button>

              {pendingDecision && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 16 }}>
                  <div className="ca-decision-row">
                    <i
                      className={`fa-solid fa-arrow-trend-${pendingDecision.direction === 'UP' ? 'up' : 'down'}`}
                      style={{ fontSize: 24, color: pendingDecision.direction === 'UP' ? 'var(--hud-green)' : 'var(--hud-red)' }}
                    />
                    <div>
                      <div className={`ca-decision-dir ${pendingDecision.direction === 'UP' ? 'up' : 'dn'}`}>
                        {pendingDecision.direction} — {pendingDecision.confidence}% confidence
                      </div>
                      <div className="ca-decision-meta">
                        {selectedAsset} @ ${pendingDecision.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  <p className="ca-decision-reason">&ldquo;{pendingDecision.reasoning}&rdquo;</p>
                  <button
                    type="button"
                    onClick={handleRecordOnChain}
                    disabled={isRecording || isWaitingRecord || isWrongNetwork}
                    className="hud-btn hud-btn-gold"
                    style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
                  >
                    {isRecording || isWaitingRecord ? (
                      <><i className="fa-solid fa-circle-notch fa-spin" /> Confirm in wallet…</>
                    ) : (
                      <><i className="fa-solid fa-signature" /> Sign recordDecision() on-chain</>
                    )}
                  </button>
                  {recordTxHash && (
                    <a
                      href={`${EXPLORER}/tx/${recordTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ca-tx-link"
                      style={{ display: 'inline-flex', marginTop: 10, gap: 4 }}
                    >
                      <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 13 }} />
                      Pending tx: {recordTxHash.slice(0, 22)}…
                    </a>
                  )}
                </motion.div>
              )}
            </div>

            <div className="hud-section-panel" style={{ marginTop: 16 }}>
              <div className="ca-panel-hdr">
                <div className="ca-panel-icon" style={{ background: 'var(--hud-green-dim)', color: 'var(--hud-green)' }}>
                  <i className="fa-solid fa-link" />
                </div>
                <div>
                  <div className="ca-panel-title">Step 3 — On-Chain Decision Log</div>
                  <div className="ca-panel-sub">
                    Read directly from AgentNFT.getRecentDecisions() — refreshes every 15s
                  </div>
                </div>
              </div>

              {decisionsError && (
                <p style={{ color: 'var(--hud-red)', fontSize: 12, marginBottom: 8 }}>{decisionsError}</p>
              )}

              {loadingDecisions && decisions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--hud-text-dim)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin" /> Reading contract…
                </div>
              ) : decisions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--hud-text-dim)', fontSize: 13 }}>
                  No decisions on-chain yet. Complete Step 2 above.
                </div>
              ) : (
                <div className="alab-log">
                  {decisions.map((d, i) => (
                    <div key={`${d.decisionHash}-${i}`} className="alab-log-row">
                      <div className="alab-log-dir" style={{ color: d.direction === 'UP' ? 'var(--hud-green)' : 'var(--hud-red)' }}>
                        <i className={`fa-solid fa-arrow-trend-${d.direction === 'UP' ? 'up' : 'down'}`} />
                        {d.direction}
                      </div>
                      <div className="alab-log-body">
                        <div className="alab-log-meta">
                          {formatTime(d.timestamp)} · conf {d.confidence} · stake {d.stake}
                          {d.wasCorrect ? ' · ✓ resolved' : ''}
                        </div>
                        <div className="alab-log-reason">{d.reasoning}</div>
                        <div className="alab-log-hash">
                          on-chain hash: <code>{shortHash(d.decisionHash)}</code>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {nftAddr && (
                <div className="alab-contract-info">
                  <span>Contract:</span>
                  <a href={`${EXPLORER}/address/${nftAddr}`} target="_blank" rel="noopener noreferrer">
                    {nftAddr.slice(0, 10)}…{nftAddr.slice(-8)}
                  </a>
                  <span>·</span>
                  <span>Function: getRecentDecisions({tokenId}, 25)</span>
                </div>
              )}
            </div>
          </>
        )}

        <div className="alab-links" style={{ marginTop: 24 }}>
          <Link href="/verify" className="hud-btn hud-btn-ghost">
            <i className="fa-solid fa-magnifying-glass" /> Verify any tx hash
          </Link>
          <Link href="/leaderboard" className="hud-btn hud-btn-ghost">
            <i className="fa-solid fa-trophy" /> System bot leaderboard
          </Link>
          <Link href="/autonomous" className="hud-btn hud-btn-ghost">
            <i className="fa-solid fa-robot" /> Bot decision pipeline
          </Link>
        </div>
      </main>

      <footer className="hud-footer">
        <div className="hud-footer-inner">
          <span>MindClash · ERC-8004 on Mantle Sepolia</span>
        </div>
      </footer>
    </div>
  );
}
