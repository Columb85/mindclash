'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAccount, usePublicClient, useChainId, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import toast from 'react-hot-toast';
import { Navigation, View } from '@/components/layout/Navigation';
import { HudConnectButton } from '@/components/ui/HudConnectButton';
import { LiveTicker } from '@/components/dashboard/ActivityFeed';
import { ClashBalance } from '@/components/ui/ClashBalance';
import { ModeIndicator } from '@/components/ui/ModeIndicator';
import { OnlineCounter } from '@/components/ui/OnlineCounter';
import { useCreateAgent, useAgentProfile, parseMintError } from '@/hooks/useAgentContract';
import { useMyAgent } from '@/hooks/useMyAgent';
import { useRegisterERC8004, useERC8004Balance, useERC8004Reputation, buildERC8004URI } from '@/hooks/useERC8004';
import { AGENT_STRATEGIES, MAX_AGENTS_PER_WALLET } from '@/lib/agent-config';
import { AGENT_NFT_ABI, CONTRACTS, loadDeployedAddresses } from '@/lib/contracts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.mindclash.xyz/api';

const RECORD_DECISION_ABI = [
  {
    name: 'recordDecision',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId',   type: 'uint256' },
      { name: 'direction', type: 'string'  },
      { name: 'confidence',type: 'uint256' },
      { name: 'stake',     type: 'uint256' },
      { name: 'reasoning', type: 'string'  },
    ],
    outputs: [{ type: 'bytes32' }],
  },
] as const;

const EXPLORER = 'https://sepolia.mantlescan.xyz';
const MANTLE_SEPOLIA_ID = 5003;
const ASSETS = ['BTC', 'ETH', 'SOL', 'MNT'] as const;

const STRATEGY_META: Record<string, { icon: string; desc: string }> = {
  momentum: {
    icon: 'fa-solid fa-bolt',
    desc: 'Follows trend direction — rides UP/DOWN momentum from RSI + SMA signals',
  },
  'mean-reversion': {
    icon: 'fa-solid fa-chart-bar',
    desc: 'Fades extremes — bets against overbought/oversold crowd behavior',
  },
  neural: {
    icon: 'fa-solid fa-brain',
    desc: 'Weighted signal ensemble — combines RSI, SMA, Bollinger, volume into consensus',
  },
};

type Phase = 'design' | 'minting' | 'success';

type DecisionResult = {
  direction: 'UP' | 'DOWN';
  confidence: number;
  reasoning: string;
  strategy: string;
  price: number;
  asset: string;
};

function formatConfidence(confidence: number): string {
  const pct = confidence > 100 ? confidence / 10 : confidence <= 1 ? confidence * 100 : confidence;
  return `${Math.round(pct)}`;
}

export default function CreateAgentPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  const { createAgent, isLoading: isMinting, isSuccess, isError: isMintError, error: mintErrorObj, txHash, reset: resetMint } = useCreateAgent();
  const { tokenId, registered, canCreate, remaining, limit, isLoading: isChecking, refetch, registerAgent } = useMyAgent();
  const { profile, refetch: refetchProfile } = useAgentProfile(tokenId > 0 ? BigInt(tokenId) : undefined);

  const [currentView, setCurrentView] = useState<View>('lobby');
  const [name, setName] = useState('');
  const [strategyId, setStrategyId] = useState<string>('momentum');
  const [version, setVersion] = useState('1.0.0');
  const [phase, setPhase] = useState<Phase>('design');
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintedTokenId, setMintedTokenId] = useState<number | null>(null);
  const registeredRef = useRef(false);

  const [selectedAsset, setSelectedAsset] = useState('BTC');
  const [pendingDecision, setPendingDecision] = useState<DecisionResult | null>(null);
  const [isFetchingDecision, setIsFetchingDecision] = useState(false);
  const [lastRecordedTx, setLastRecordedTx] = useState<{ hash: string; direction: string; asset: string; reasoning: string } | null>(null);

  const { writeContract: writeRecordDecision, data: recordTxHash, isPending: isRecording } = useWriteContract();
  const { isLoading: isWaitingRecord, isSuccess: isRecordSuccess } = useWaitForTransactionReceipt({
    hash: recordTxHash,
  });

  const { hasERC8004Identity, refetch: refetchERC8004 } = useERC8004Balance();
  const {
    registerAgent: registerERC8004,
    isLoading: isRegisteringERC8004,
    isSuccess: isERC8004Success,
    isError: isERC8004Error,
    error: erc8004Error,
    txHash: erc8004TxHash,
    erc8004AgentId,
    reset: resetERC8004,
  } = useRegisterERC8004();

  const { feedbackCount, summaryValue, hasReputation } = useERC8004Reputation(erc8004AgentId);

  useEffect(() => {
    if (isRecordSuccess && recordTxHash) {
      setLastRecordedTx({
        hash: recordTxHash,
        direction: pendingDecision?.direction || 'UP',
        asset: pendingDecision?.asset || selectedAsset,
        reasoning: pendingDecision?.reasoning || '',
      });
      toast.success('Decision recorded on Mantle!');
      setPendingDecision(null);
      refetchProfile();
    }
  }, [isRecordSuccess, recordTxHash, refetchProfile]);

  const handleERC8004Register = () => {
    const id = mintedTokenId || tokenId;
    if (!id || id <= 0) return;
    const agentURI = buildERC8004URI({
      name: name.trim() || displayName,
      tokenId: id,
      strategy: strategy.name,
    });
    registerERC8004(agentURI);
  };

  useEffect(() => {
    if (isERC8004Error && erc8004Error) {
      const msg = String((erc8004Error as { shortMessage?: string })?.shortMessage || erc8004Error.message || '');
      if (msg.includes('rejected') || msg.includes('denied')) {
        toast.error('ERC-8004 registration cancelled.');
      } else {
        toast.error('ERC-8004 registration failed. You can retry.');
      }
      resetERC8004();
    }
  }, [isERC8004Error, erc8004Error, resetERC8004]);

  useEffect(() => {
    if (isERC8004Success && erc8004AgentId !== null) {
      toast.success(`ERC-8004 Agent #${erc8004AgentId} registered!`);
      refetchERC8004();
      if (tokenId > 0) {
        fetch(`${API_URL}/agents/erc8004-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenId, erc8004AgentId }),
        }).catch(() => {});
      }
    }
  }, [isERC8004Success, erc8004AgentId, refetchERC8004, tokenId]);

  const handleFetchDecision = async () => {
    if (!tokenId || tokenId <= 0) return;
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
          strategy: registered?.strategy || strategyId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPendingDecision(json.decision as DecisionResult);
      } else {
        toast.error(json.error || 'AI decision failed');
      }
    } catch {
      toast.error('API unreachable — check connection');
    } finally {
      setIsFetchingDecision(false);
    }
  };

  const handleRecordOnChain = () => {
    if (!pendingDecision || !tokenId) return;
    const nft = CONTRACTS.mantleSepolia.agentNFT;
    if (!nft) { toast.error('Contract address not loaded'); return; }
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

  const isWrongNetwork = isConnected && chainId !== MANTLE_SEPOLIA_ID;

  useEffect(() => {
    if (!CONTRACTS.mantleSepolia.agentNFT) {
      loadDeployedAddresses();
    }
  }, []);

  const strategy = AGENT_STRATEGIES.find(s => s.id === strategyId) ?? AGENT_STRATEGIES[0];
  const hasAgent = tokenId > 0;
  const displayName = registered?.name || profile?.name || name || 'Your Agent';
  const displayStrategy = AGENT_STRATEGIES.find(s => s.id === (registered?.strategy || strategyId))?.name
    || registered?.strategy
    || strategyId;
  const displayVersion = registered?.version || profile?.version?.toString() || '1.0.0';

  const canMint = isConnected && canCreate && !isWrongNetwork && name.trim().length >= 3 && name.trim().length <= 32 && !isChecking;

  const checkExistingAgentOnChain = async (): Promise<number> => {
    const nft = CONTRACTS.mantleSepolia.agentNFT;
    if (!publicClient || !nft || !address) return 0;
    try {
      const raw = await publicClient.readContract({
        address: nft as `0x${string}`,
        abi: AGENT_NFT_ABI,
        functionName: 'agentToToken',
        args: [address as `0x${string}`],
      });
      return Number(raw ?? 0);
    } catch {
      return 0;
    }
  };

  const handleMint = async () => {
    if (!address) return;
    setMintError(null);

    if (!canCreate || hasAgent) {
      const msg = tokenId > 0
        ? `Wallet already owns Agent NFT #${tokenId}. One agent per wallet.`
        : `Limit: ${MAX_AGENTS_PER_WALLET} agent per wallet`;
      setMintError(msg);
      toast.error(msg);
      return;
    }

    if (!canMint) {
      if (isWrongNetwork) toast.error('Switch to Mantle Sepolia');
      else if (name.trim().length < 3) toast.error('Agent name must be at least 3 characters');
      return;
    }

    const existingId = await checkExistingAgentOnChain();
    if (existingId > 0) {
      const msg = `This wallet already minted Agent NFT #${existingId}. Only one agent per wallet is allowed.`;
      setMintError(msg);
      toast.error(msg, { duration: 5000 });
      await refetch();
      return;
    }

    const tokenURI = JSON.stringify({
      name: name.trim(),
      strategy: strategyId,
      version,
      creator: address,
      createdAt: new Date().toISOString(),
      description: `MindClash AI Agent — ${strategy.name} strategy`,
    });

    registeredRef.current = false;
    setPhase('minting');
    createAgent(address, name.trim(), version, tokenURI);
  };

  useEffect(() => {
    if (!isMintError || !mintErrorObj) return;
    const msg = parseMintError(mintErrorObj);
    setMintError(msg);
    setPhase('design');
    toast.error(msg, { duration: 6000 });
    resetMint();
    refetch();
  }, [isMintError, mintErrorObj, resetMint, refetch]);

  const handleSyncRegister = async () => {
    if (!address || tokenId <= 0) return;
    const res = await registerAgent({
      tokenId,
      name: profile?.name || name || `Agent #${tokenId}`,
      strategy: strategyId,
      version: profile?.version?.toString() || version,
    });
    if (res.ok) toast.success('Agent registered');
    else toast.error(res.error || 'Registration failed');
  };

  useEffect(() => {
    if (!isSuccess || !txHash || !address || registeredRef.current) return;

    const finish = async () => {
      let id = 0;
      const nft = CONTRACTS.mantleSepolia.agentNFT;

      for (let i = 0; i < 10 && id <= 0; i++) {
        if (publicClient && nft) {
          try {
            const raw = await publicClient.readContract({
              address: nft as `0x${string}`,
              abi: AGENT_NFT_ABI,
              functionName: 'agentToToken',
              args: [address as `0x${string}`],
            });
            id = Number(raw ?? 0);
          } catch { /* retry */ }
        }
        if (id <= 0) await new Promise(r => setTimeout(r, 2000));
      }

      if (id > 0) {
        setMintedTokenId(id);
        await registerAgent({
          tokenId: id,
          name: name.trim(),
          strategy: strategyId,
          version,
          txHash,
        });
      }
      registeredRef.current = true;
      await refetch();
      await refetchProfile();
      setPhase('success');
    };

    finish();
  }, [isSuccess, txHash, address, publicClient, name, strategyId, version, registerAgent, refetch, refetchProfile]);

  const winRate = profile && Number(profile.totalDecisions) > 0
    ? `${((Number(profile.correctDecisions) / Number(profile.totalDecisions)) * 100).toFixed(0)}% win`
    : '0% win';

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
        <div className="hud-shell">
          <LiveTicker />
        </div>
      </div>

      <div className="hud-breadcrumb">
        <div className="hud-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span className="bc-cur">
            <i className="fa-solid fa-wand-magic-sparkles" style={{ marginRight: 6 }} />
            Create Agent
          </span>
          <span className="hud-badge hud-badge-gold">
            {remaining} / {limit} slot{limit !== 1 ? 's' : ''} remaining
          </span>
        </div>
      </div>

      <main className="hud-shell ca-main">
        {isWrongNetwork && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="ca-net-banner">
            <i className="fa-solid fa-wifi" style={{ color: 'var(--hud-red)', fontSize: 18 }} />
            <div style={{ flex: 1 }}>
              <div className="ca-net-title">Wrong Network</div>
              <div className="ca-net-sub">
                Switch to <strong>Mantle Sepolia</strong> (Chain ID 5003) to create an agent.
              </div>
            </div>
            {switchChain && (
              <button type="button" onClick={() => switchChain({ chainId: MANTLE_SEPOLIA_ID })} className="hud-btn hud-btn-red">
                Switch
              </button>
            )}
          </motion.div>
        )}

        {isConnected && !isChecking && hasAgent && phase === 'design' && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="ca-already-banner">
            <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--hud-gold)', fontSize: 18 }} />
            <div style={{ flex: 1 }}>
              <div className="ca-already-title">Agent already minted</div>
              <div className="ca-already-sub">
                This wallet owns Agent NFT #{tokenId}. Each wallet can create only one agent — a second mint will fail on-chain.
              </div>
            </div>
          </motion.div>
        )}

        {mintError && phase === 'design' && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="ca-already-banner">
            <i className="fa-solid fa-circle-xmark" style={{ color: 'var(--hud-red)', fontSize: 18 }} />
            <div style={{ flex: 1 }}>
              <div className="ca-already-title">Mint not available</div>
              <div className="ca-already-sub">{mintError}</div>
            </div>
            <button type="button" onClick={() => setMintError(null)} className="hud-btn hud-btn-ghost" style={{ fontSize: 10 }}>
              Dismiss
            </button>
          </motion.div>
        )}

        {isChecking && (
          <div className="ca-phase-center">
            <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 28, color: 'var(--hud-gold)' }} />
            <div className="ca-phase-sub">Checking agent quota…</div>
          </div>
        )}

        {!isChecking && hasAgent && phase !== 'minting' && phase !== 'success' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-0">
            <div className="hud-section-panel ca-agent-panel">
              <div className="ca-agent-summary">
                <i className="fa-solid fa-robot" />
                <div className="ca-agent-name">{displayName}</div>
                <div className="ca-agent-meta">
                  Token #{tokenId} · {displayStrategy} · v{displayVersion}
                </div>
                {profile && (
                  <div className="ca-agent-stats">
                    <span>{Number(profile.totalDecisions)} decisions</span>
                    <span>{winRate}</span>
                  </div>
                )}
              </div>
              <div className="ca-agent-actions">
                {!registered && (
                  <button type="button" onClick={handleSyncRegister} className="hud-btn hud-btn-ghost">
                    <i className="fa-solid fa-arrows-rotate" />
                    Sync
                  </button>
                )}
                <Link href={`/duel?agent=${tokenId}`} className="hud-btn hud-btn-red">
                  <i className="fa-solid fa-bolt" />
                  Enter Duel
                </Link>
                <a
                  href={`${EXPLORER}/token/0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837?a=${tokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hud-btn hud-btn-ghost"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square" />
                  MantleScan
                </a>
              </div>
            </div>

            {/* ── ERC-8004 Panel (existing agent) ───────────────── */}
            <div className="hud-section-panel" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,200,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fa-solid fa-fingerprint" style={{ color: 'var(--hud-cyan)', fontSize: 14 }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--hud-cyan)' }}>ERC-8004 Identity</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Global agent registry on Mantle Sepolia</div>
                </div>
              </div>

              {!hasERC8004Identity && !isERC8004Success && !isRegisteringERC8004 && (
                <button type="button" onClick={handleERC8004Register} disabled={isWrongNetwork} className="hud-btn hud-btn-cyan" style={{ width: '100%', justifyContent: 'center' }}>
                  <i className="fa-solid fa-id-badge" />
                  Register in ERC-8004
                </button>
              )}

              {isRegisteringERC8004 && (
                <div style={{ textAlign: 'center', padding: '6px 0', fontSize: 12 }}>
                  <i className="fa-solid fa-circle-notch fa-spin" style={{ color: 'var(--hud-cyan)', marginRight: 6 }} />
                  Registering…
                </div>
              )}

              {(isERC8004Success || hasERC8004Identity) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <i className="fa-solid fa-circle-check" style={{ color: 'var(--hud-green)' }} />
                  <span style={{ color: 'var(--hud-green)', fontWeight: 600 }}>
                    {erc8004AgentId !== null ? `ERC-8004 Agent #${erc8004AgentId}` : 'Registered in ERC-8004'}
                  </span>
                  {erc8004TxHash && (
                    <a
                      href={`${EXPLORER}/tx/${erc8004TxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--hud-cyan)', fontSize: 10, marginLeft: 'auto' }}
                    >
                      <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 9 }} /> TX
                    </a>
                  )}
                </div>
              )}

              {hasReputation && (
                <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(0,200,255,0.06)', border: '1px solid rgba(0,200,255,0.12)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <i className="fa-solid fa-star" style={{ color: 'var(--hud-gold)', fontSize: 11 }} />
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Reputation:</span>
                    <span style={{ color: 'var(--hud-gold)', fontWeight: 700 }}>{summaryValue}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
                      ({feedbackCount} feedback{feedbackCount !== 1 ? 's' : ''})
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="hud-section-panel ca-record-panel">
              <div className="ca-panel-hdr">
                <div className="ca-panel-icon" style={{ background: 'var(--hud-purple-dim)', color: 'var(--hud-purple)' }}>
                  <i className="fa-solid fa-link" />
                </div>
                <div>
                  <div className="ca-panel-title">Record Decision</div>
                  <div className="ca-panel-sub">AI → MetaMask → chain</div>
                </div>
              </div>

              <div className="hud-chip-row" style={{ marginBottom: 10 }}>
                {ASSETS.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setSelectedAsset(a)}
                    className={`hud-chip${selectedAsset === a ? ' active' : ''}`}
                  >
                    {a}
                  </button>
                ))}
              </div>

              {!pendingDecision && (
                <button
                  type="button"
                  onClick={handleFetchDecision}
                  disabled={isFetchingDecision || isWrongNetwork}
                  className="hud-btn hud-btn-ghost hud-btn-full"
                  style={{ marginBottom: 12 }}
                >
                  {isFetchingDecision ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin" />
                      Analyzing market…
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-brain" />
                      Get AI Decision ({selectedAsset})
                    </>
                  )}
                </button>
              )}

              {pendingDecision && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`ca-decision-preview${pendingDecision.direction === 'DOWN' ? ' dn' : ''}`}
                >
                  <div className="ca-decision-row">
                    <i
                      className={`fa-solid fa-arrow-trend-${pendingDecision.direction === 'UP' ? 'up' : 'down'}`}
                      style={{
                        fontSize: 24,
                        color: pendingDecision.direction === 'UP' ? 'var(--hud-green)' : 'var(--hud-red)',
                      }}
                    />
                    <div>
                      <div className={`ca-decision-dir ${pendingDecision.direction === 'UP' ? 'up' : 'dn'}`}>
                        {pendingDecision.direction} — {formatConfidence(pendingDecision.confidence)}% confidence
                      </div>
                      <div className="ca-decision-meta">
                        {selectedAsset} @ ${pendingDecision.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · stake 250
                      </div>
                    </div>
                  </div>
                  <p className="ca-decision-reason">&ldquo;{pendingDecision.reasoning}&rdquo;</p>
                  <div className="ca-decision-actions">
                    <button
                      type="button"
                      onClick={handleRecordOnChain}
                      disabled={isRecording || isWaitingRecord || isWrongNetwork}
                      className="hud-btn hud-btn-cyan"
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      {isRecording || isWaitingRecord ? (
                        <>
                          <i className="fa-solid fa-circle-notch fa-spin" />
                          Signing…
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-signature" />
                          Sign on-chain
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDecision(null)}
                      className="hud-btn hud-btn-ghost"
                    >
                      Refresh
                    </button>
                  </div>
                  {recordTxHash && (
                    <a
                      href={`${EXPLORER}/tx/${recordTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ca-tx-link"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10 }}
                    >
                      <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 9 }} />
                      {recordTxHash.slice(0, 20)}…
                    </a>
                  )}
                </motion.div>
              )}

              {!pendingDecision && lastRecordedTx && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    padding: '16px',
                    borderRadius: 12,
                    background: 'rgba(0,200,100,0.06)',
                    border: '1px solid rgba(0,200,100,0.2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <i className="fa-solid fa-circle-check" style={{ color: 'var(--hud-green)', fontSize: 18 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--hud-green)' }}>
                        Decision Recorded On-Chain
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                        {lastRecordedTx.direction} on {lastRecordedTx.asset}
                      </div>
                    </div>
                  </div>

                  <a
                    href={`${EXPLORER}/tx/${lastRecordedTx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'rgba(0,200,255,0.06)',
                      border: '1px solid rgba(0,200,255,0.15)',
                      color: 'var(--hud-cyan)',
                      fontSize: 12,
                      fontFamily: 'var(--font-mono, monospace)',
                      textDecoration: 'none',
                      marginBottom: 12,
                    }}
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 10 }} />
                    {lastRecordedTx.hash.slice(0, 10)}...{lastRecordedTx.hash.slice(-8)}
                  </a>

                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'rgba(255,200,0,0.06)',
                    border: '1px solid rgba(255,200,0,0.15)',
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.7)',
                    lineHeight: 1.5,
                  }}>
                    <i className="fa-solid fa-clock" style={{ color: 'var(--hud-gold)', marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <strong style={{ color: 'var(--hud-gold)' }}>Auto-Resolve:</strong>{' '}
                      The backend oracle will verify the market price and resolve this decision within ~10 minutes.
                      Result (WIN/LOSS) and ERC-8004 reputation feedback will be recorded automatically.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setLastRecordedTx(null)}
                    className="hud-btn hud-btn-ghost"
                    style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
                  >
                    <i className="fa-solid fa-brain" />
                    Make Another Decision
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {!isChecking && !hasAgent && phase === 'design' && (
            <motion.div key="design" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="hud-section-panel">
                <div className="ca-setup-hdr">
                  <h2>Create Your AI Agent</h2>
                  <p>
                    Mint one ERC-8004 agent NFT per wallet. Pick a strategy for duels and on-chain decisions.
                  </p>
                </div>

                <div className="ca-limit-notice">
                  <i className="fa-solid fa-circle-info" />
                  <span>
                    <strong>1 agent per wallet</strong> — we check on-chain before minting. If you already created an agent, the transaction will revert with &ldquo;Agent already exists&rdquo;.
                  </span>
                </div>

                <div className="ca-field-lbl">Agent Name</div>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. AlphaHunter, TrendSniper..."
                  maxLength={32}
                  className="ca-inp"
                />
                <div className="ca-inp-meta">
                  <span>{name.length < 3 ? 'Min 3 characters' : '✓ Valid'}</span>
                  <span>{name.length}/32</span>
                </div>

                <div className="ca-field-lbl">Strategy</div>
                {AGENT_STRATEGIES.map(s => {
                  const meta = STRATEGY_META[s.id];
                  const isSelected = strategyId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStrategyId(s.id)}
                      className={`ca-strat-card${isSelected ? ' sel' : ''}`}
                    >
                      <div className="ca-strat-inner">
                        <div
                          className="ca-strat-icon"
                          style={{ background: `${s.color}22`, color: s.color }}
                        >
                          <i className={meta.icon} />
                        </div>
                        <div>
                          <div className="ca-strat-name" style={isSelected ? { color: s.color } : undefined}>
                            {s.name}
                          </div>
                          <div className="ca-strat-desc">{meta.desc}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={handleMint}
                  disabled={!canMint}
                  className="hud-btn hud-btn-gold ca-mint-btn"
                >
                  <i className="fa-solid fa-sparkles" />
                  {hasAgent ? 'Agent Already Minted' : 'Mint Agent NFT'}
                </button>
                <p className="ca-mint-foot">
                  Gas ~0.001 MNT · One agent per wallet forever
                  {!canCreate && isConnected && !isChecking && ' · This wallet cannot mint again'}
                </p>
              </div>
            </motion.div>
          )}

          {phase === 'minting' && (
            <motion.div key="minting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ca-phase-center">
              <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 40, color: 'var(--hud-gold)' }} />
              <div>
                <div className="ca-phase-title">Minting {name.trim()}…</div>
                <div className="ca-phase-sub">Confirm in wallet, then we register your agent</div>
                <div className="ca-phase-sub" style={{ marginTop: 8, color: 'var(--hud-gold)', maxWidth: 320 }}>
                  If this wallet already has an agent, the transaction will fail with &ldquo;Agent already exists&rdquo;.
                </div>
              </div>
              {!isMinting && !isSuccess && (
                <button type="button" onClick={() => { setPhase('design'); resetMint(); }} className="hud-btn hud-btn-ghost">
                  ← Back
                </button>
              )}
            </motion.div>
          )}

          {phase === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="hud-section-panel"
              style={{ textAlign: 'center', padding: '28px 20px' }}
            >
              <i className="fa-solid fa-circle-check ca-success-icon" />
              <h2 className="ca-phase-title" style={{ color: 'var(--hud-green)', marginTop: 12 }}>
                {name.trim()} is live!
              </h2>
              {(mintedTokenId || tokenId) > 0 && (
                <p className="ca-phase-sub" style={{ marginTop: 6 }}>
                  Agent NFT #{mintedTokenId || tokenId} on Mantle Sepolia
                </p>
              )}
              {txHash && (
                <a
                  href={`${EXPLORER}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ca-tx-link"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10 }}
                >
                  <i className="fa-solid fa-arrow-up-right-from-square" />
                  View transaction
                </a>
              )}
              {/* ── ERC-8004 Global Identity Registration ───────────── */}
              <div style={{ marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 10 }}>
                  <i className="fa-solid fa-fingerprint" style={{ color: 'var(--hud-cyan)', fontSize: 14 }} />
                  <span style={{ fontSize: 13, color: 'var(--hud-cyan)', fontWeight: 600, letterSpacing: '0.02em' }}>
                    ERC-8004 Global Identity
                  </span>
                </div>

                {!hasERC8004Identity && !isERC8004Success && !isRegisteringERC8004 && (
                  <button type="button" onClick={handleERC8004Register} className="hud-btn hud-btn-cyan" style={{ width: '100%', justifyContent: 'center' }}>
                    <i className="fa-solid fa-id-badge" />
                    Register in ERC-8004 Registry
                  </button>
                )}

                {isRegisteringERC8004 && (
                  <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 13 }}>
                    <i className="fa-solid fa-circle-notch fa-spin" style={{ color: 'var(--hud-cyan)', marginRight: 8 }} />
                    Registering in ERC-8004 IdentityRegistry…
                  </div>
                )}

                {(isERC8004Success || hasERC8004Identity) && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--hud-green)', fontSize: 13, fontWeight: 600 }}>
                      <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }} />
                      {erc8004AgentId !== null
                        ? `ERC-8004 Agent #${erc8004AgentId} — registered!`
                        : 'Registered in ERC-8004'}
                    </div>
                    {erc8004TxHash && (
                      <a
                        href={`${EXPLORER}/tx/${erc8004TxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ca-tx-link"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11 }}
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 9 }} />
                        ERC-8004 TX
                      </a>
                    )}
                  </div>
                )}

                {hasReputation && (
                  <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(0,200,255,0.06)', border: '1px solid rgba(0,200,255,0.12)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, justifyContent: 'center' }}>
                      <i className="fa-solid fa-star" style={{ color: 'var(--hud-gold)', fontSize: 11 }} />
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>Reputation:</span>
                      <span style={{ color: 'var(--hud-gold)', fontWeight: 700 }}>{summaryValue}</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
                        ({feedbackCount} feedback{feedbackCount !== 1 ? 's' : ''})
                      </span>
                    </div>
                  </div>
                )}

                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 8 }}>
                  IdentityRegistry 0x8004A818…4BD9e · ReputationRegistry 0x8004B663…8713
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 20 }}>
                <Link href="/app" className="hud-btn hud-btn-ghost">
                  ← Back to Arena
                </Link>
                <Link href={`/duel?agent=${mintedTokenId || tokenId}`} className="hud-btn hud-btn-red">
                  <i className="fa-solid fa-bolt" />
                  Challenge in Duel
                </Link>
              </div>
              <p className="ca-mint-foot" style={{ marginTop: 16 }}>
                <i className="fa-solid fa-circle-info" style={{ marginRight: 4 }} />
                Limit {MAX_AGENTS_PER_WALLET}/wallet — no second mint possible
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="hud-footer">
        <div className="hud-footer-inner">
          <span>MindClash · Mantle Turing Test Hackathon 2026</span>
        </div>
      </footer>
    </div>
  );
}
