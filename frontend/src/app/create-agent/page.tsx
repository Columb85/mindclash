'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Sparkles, ExternalLink, Loader2, CheckCircle2,
  BarChart3, Brain, Zap, Shield, ChevronRight, Lock, AlertCircle,
  WifiOff, Activity, TrendingUp, TrendingDown,
} from 'lucide-react';
import Link from 'next/link';
import { useAccount, usePublicClient, useNetwork, useSwitchNetwork, useContractWrite, useWaitForTransaction } from 'wagmi';
import toast from 'react-hot-toast';
import { useCreateAgent, useAgentProfile } from '@/hooks/useAgentContract';
import { useMyAgent } from '@/hooks/useMyAgent';
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

const STRATEGY_ICONS = {
  momentum: Zap,
  'mean-reversion': BarChart3,
  neural: Brain,
} as const;

type Phase = 'design' | 'minting' | 'success';

export default function CreateAgentPage() {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  const publicClient = usePublicClient();
  const { createAgent, isLoading: isMinting, isSuccess, txHash } = useCreateAgent();
  const { tokenId, registered, canCreate, remaining, limit, isLoading: isChecking, refetch, registerAgent } = useMyAgent();
  const { profile, refetch: refetchProfile } = useAgentProfile(tokenId > 0 ? BigInt(tokenId) : undefined);

  const [name, setName] = useState('');
  const [strategyId, setStrategyId] = useState<string>('momentum');
  const [version, setVersion] = useState('1.0.0');
  const [phase, setPhase] = useState<Phase>('design');
  const [mintedTokenId, setMintedTokenId] = useState<number | null>(null);
  const registeredRef = useRef(false);

  // Record Decision state
  type DecisionResult = {
    direction: 'UP' | 'DOWN';
    confidence: number;
    reasoning: string;
    strategy: string;
    price: number;
    asset: string;
  };
  const [selectedAsset, setSelectedAsset] = useState('BTC');
  const [pendingDecision, setPendingDecision] = useState<DecisionResult | null>(null);
  const [isFetchingDecision, setIsFetchingDecision] = useState(false);

  const { write: writeRecordDecision, data: recordTxData, isLoading: isRecording } = useContractWrite({
    address: CONTRACTS.mantleSepolia.agentNFT as `0x${string}`,
    abi: RECORD_DECISION_ABI,
    functionName: 'recordDecision',
  });
  const { isLoading: isWaitingRecord, isSuccess: isRecordSuccess } = useWaitForTransaction({
    hash: recordTxData?.hash,
  });

  useEffect(() => {
    if (isRecordSuccess) {
      toast.success('Decision recorded on-chain!');
      setPendingDecision(null);
      refetchProfile();
    }
  }, [isRecordSuccess, refetchProfile]);

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
          strategy: registered?.strategy || displayStrategy,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPendingDecision(json.decision as DecisionResult);
      } else {
        toast.error(json.error || 'Failed to get decision');
      }
    } catch {
      toast.error('Backend unreachable');
    } finally {
      setIsFetchingDecision(false);
    }
  };

  const handleRecordOnChain = () => {
    if (!pendingDecision || !tokenId) return;
    const nft = CONTRACTS.mantleSepolia.agentNFT;
    if (!nft) { toast.error('Contract address not loaded'); return; }
    writeRecordDecision({
      args: [
        BigInt(tokenId),
        pendingDecision.direction,
        BigInt(pendingDecision.confidence),
        BigInt(250),
        pendingDecision.reasoning,
      ],
    });
  };

  const isWrongNetwork = isConnected && chain?.id !== MANTLE_SEPOLIA_ID;

  // Load contract addresses from /deployed-addresses.json if env vars are absent
  useEffect(() => {
    if (!CONTRACTS.mantleSepolia.agentNFT) {
      loadDeployedAddresses();
    }
  }, []);

  const strategy = AGENT_STRATEGIES.find(s => s.id === strategyId) ?? AGENT_STRATEGIES[0];
  const StrategyIcon = STRATEGY_ICONS[strategy.id as keyof typeof STRATEGY_ICONS] ?? Bot;

  const hasAgent = tokenId > 0;
  const displayName = registered?.name || profile?.name || name || 'Your Agent';
  const displayStrategy = registered?.strategy || strategyId;

  const canMint = isConnected && canCreate && !isWrongNetwork && name.trim().length >= 3 && name.trim().length <= 32;

  const handleMint = () => {
    if (!canMint || !address) return;
    if (!canCreate) {
      toast.error(`Limit: ${MAX_AGENTS_PER_WALLET} agent per wallet`);
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

  return (
    <div className="min-h-screen bg-[#06060a] text-white">
      <header className="border-b border-gray-800/50 bg-[#06060a]/95 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-white transition text-sm">← Back</Link>
          <div className="w-px h-5 bg-gray-800" />
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <h1 className="text-lg font-black">Agent Creator</h1>
          <span className="text-[10px] text-gray-500 font-mono ml-auto">
            {remaining}/{limit} slot{limit !== 1 ? 's' : ''} left
          </span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">

        {/* Wrong network banner — shown to any user not on Mantle Sepolia */}
        {isWrongNetwork && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-red-500/40 bg-red-500/8 p-4 flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-red-400 shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-bold text-red-400">Wrong Network</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Switch to <strong className="text-gray-300">Mantle Sepolia</strong> (Chain ID 5003) to create an agent.
              </div>
            </div>
            {switchNetwork && (
              <button
                onClick={() => switchNetwork(MANTLE_SEPOLIA_ID)}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition">
                Switch
              </button>
            )}
          </motion.div>
        )}

        {isChecking && (
          <div className="flex items-center justify-center gap-2 py-20 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            Checking agent quota…
          </div>
        )}

        {!isChecking && hasAgent && phase !== 'minting' && phase !== 'success' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
              <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-amber-400">Creation limit reached</div>
                <div className="text-xs text-gray-500 mt-1">
                  Each wallet can own <strong className="text-gray-300">{MAX_AGENTS_PER_WALLET}</strong> agent NFT on-chain.
                  You already have one — duel with champions or record decisions with your agent.
                </div>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 p-6 space-y-4 text-center">
              <Bot className="w-14 h-14 mx-auto text-emerald-400" />
              <div>
                <div className="text-xl font-black text-emerald-400">{displayName}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Token #{tokenId} • {displayStrategy} • v{registered?.version || profile?.version || '1.0.0'}
                </div>
              </div>
              {profile && (
                <div className="flex justify-center gap-6 text-[10px] text-gray-500">
                  <span>{Number(profile.totalDecisions)} decisions</span>
                  <span>{Number(profile.totalDecisions) > 0
                    ? `${((Number(profile.correctDecisions) / Number(profile.totalDecisions)) * 100).toFixed(0)}% win`
                    : '0% win'}</span>
                </div>
              )}
              {!registered && (
                <button onClick={handleSyncRegister}
                  className="text-xs px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800">
                  Sync to server
                </button>
              )}
              <div className="flex gap-3 justify-center pt-2">
                <Link href={`/duel?agent=${tokenId}`}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-red-500/20 border border-red-500/40 text-red-400 text-sm">
                  Enter Duel <ChevronRight className="w-4 h-4" />
                </Link>
                <a href={`${EXPLORER}/token/0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837?a=${tokenId}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm">
                  <ExternalLink className="w-4 h-4" /> MantleScan
                </a>
              </div>
            </div>

            {/* Record Decision panel */}
            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-bold text-purple-300">Record On-Chain Decision</span>
                <span className="ml-auto text-[10px] text-gray-600">AI → MetaMask → chain</span>
              </div>

              {/* Asset selector */}
              <div className="flex gap-2">
                {['BTC', 'ETH', 'SOL', 'MNT'].map(a => (
                  <button key={a} onClick={() => setSelectedAsset(a)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${
                      selectedAsset === a
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                        : 'border-gray-700 text-gray-500 hover:text-gray-300'
                    }`}>
                    {a}
                  </button>
                ))}
              </div>

              {/* Get Decision button */}
              {!pendingDecision && (
                <button onClick={handleFetchDecision} disabled={isFetchingDecision || isWrongNetwork}
                  className="w-full py-2.5 rounded-xl text-sm font-bold border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 disabled:opacity-40 flex items-center justify-center gap-2">
                  {isFetchingDecision
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing market…</>
                    : <><Brain className="w-4 h-4" /> Get AI Decision ({selectedAsset})</>}
                </button>
              )}

              {/* Decision result */}
              {pendingDecision && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl border p-4 space-y-3 ${
                    pendingDecision.direction === 'UP'
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-red-500/30 bg-red-500/5'
                  }`}>
                  <div className="flex items-center gap-3">
                    {pendingDecision.direction === 'UP'
                      ? <TrendingUp className="w-6 h-6 text-green-400" />
                      : <TrendingDown className="w-6 h-6 text-red-400" />}
                    <div>
                      <div className={`text-lg font-black ${pendingDecision.direction === 'UP' ? 'text-green-400' : 'text-red-400'}`}>
                        {pendingDecision.direction} — {(pendingDecision.confidence / 10).toFixed(0)}% confidence
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {selectedAsset} @ ${pendingDecision.price?.toFixed(2)} • stake 250
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 italic leading-relaxed">"{pendingDecision.reasoning}"</p>
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleRecordOnChain}
                      disabled={isRecording || isWaitingRecord || isWrongNetwork}
                      className="flex-1 py-2 rounded-lg text-xs font-bold bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 disabled:opacity-40 flex items-center justify-center gap-2">
                      {isRecording || isWaitingRecord
                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Signing…</>
                        : 'Sign on-chain (MetaMask)'}
                    </button>
                    <button onClick={() => setPendingDecision(null)}
                      className="px-3 py-2 rounded-lg text-xs text-gray-500 border border-gray-700 hover:text-gray-300">
                      Refresh
                    </button>
                  </div>
                  {recordTxData?.hash && (
                    <a href={`${EXPLORER}/tx/${recordTxData.hash}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-blue-400">
                      <ExternalLink className="w-3 h-3" /> {recordTxData.hash.slice(0, 20)}…
                    </a>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {!isChecking && !hasAgent && phase === 'design' && (
            <motion.div key="design" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black">Create Your AI Agent</h2>
                <p className="text-sm text-gray-500">
                  Mint one ERC-8004 agent NFT per wallet. Pick a strategy — your agent uses it in duels and on-chain decisions.
                </p>
              </div>

              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 flex items-center gap-3">
                <Shield className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-xs text-gray-400">
                  Limit: <strong className="text-white">{MAX_AGENTS_PER_WALLET} agent / wallet</strong> (enforced on-chain + server)
                </span>
              </div>

              {!isConnected && (
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 text-center">
                  <div className="text-sm text-yellow-400 font-bold">Connect wallet to create</div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Agent Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. AlphaHunter, TrendSniper..." maxLength={32}
                  className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 text-sm" />
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>{name.length < 3 ? 'Min 3 characters' : '✓ Valid'}</span>
                  <span>{name.length}/32</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Strategy</label>
                <div className="space-y-3">
                  {AGENT_STRATEGIES.map(s => {
                    const Icon = STRATEGY_ICONS[s.id];
                    const isSelected = strategyId === s.id;
                    return (
                      <button key={s.id} onClick={() => setStrategyId(s.id)}
                        className="w-full rounded-xl border p-4 text-left transition"
                        style={{
                          borderColor: isSelected ? `${s.color}60` : 'rgba(255,255,255,0.06)',
                          background: isSelected ? `${s.color}08` : 'rgba(255,255,255,0.02)',
                        }}>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `${s.color}15` }}>
                            <Icon className="w-5 h-5" style={{ color: s.color }} />
                          </div>
                          <div>
                            <div className="text-sm font-bold" style={{ color: isSelected ? s.color : '#d1d5db' }}>{s.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{s.description}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Version</label>
                <input type="text" value={version} onChange={e => setVersion(e.target.value)}
                  className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50" />
              </div>

              <button onClick={handleMint} disabled={!canMint}
                className="w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-3 disabled:opacity-30"
                style={{ background: `${strategy.color}20`, border: `1px solid ${strategy.color}40`, color: strategy.color }}>
                <Sparkles className="w-5 h-5" />
                Mint Agent NFT
              </button>

              <p className="text-center text-[10px] text-gray-600">
                Gas ~0.001 MNT • One agent per wallet forever
              </p>
            </motion.div>
          )}

          {phase === 'minting' && (
            <motion.div key="minting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-20 space-y-6">
              <Loader2 className="w-12 h-12 text-yellow-400 animate-spin" />
              <div className="text-center">
                <div className="text-lg font-bold">Minting {name.trim()}…</div>
                <div className="text-xs text-gray-500">Confirm in wallet, then we register your agent</div>
              </div>
              {!isMinting && !isSuccess && (
                <button onClick={() => setPhase('design')} className="text-xs text-gray-500">← Back</button>
              )}
            </motion.div>
          )}

          {phase === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 text-center py-8">
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-400" />
              <h2 className="text-2xl font-black text-green-400">{name.trim()} is live!</h2>
              {(mintedTokenId || tokenId) > 0 && (
                <p className="text-sm text-gray-500">Agent NFT #{mintedTokenId || tokenId} on Mantle Sepolia</p>
              )}
              {txHash && (
                <a href={`${EXPLORER}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-400">
                  <ExternalLink className="w-4 h-4" /> View transaction
                </a>
              )}
              <div className="flex gap-3 justify-center">
                <Link href={`/duel?agent=${mintedTokenId || tokenId}`}
                  className="px-6 py-3 rounded-xl font-bold bg-red-500/20 border border-red-500/40 text-red-400 text-sm">
                  Challenge in Duel →
                </Link>
                <button onClick={() => { setPhase('design'); setName(''); refetch(); }}
                  className="px-6 py-3 rounded-xl border border-gray-700 text-gray-400 text-sm opacity-50 cursor-not-allowed"
                  title="Limit: 1 agent per wallet">
                  Create Another
                </button>
              </div>
              <p className="text-[10px] text-gray-600 flex items-center justify-center gap-1">
                <AlertCircle className="w-3 h-3" /> Limit {MAX_AGENTS_PER_WALLET}/wallet — no second mint possible
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
