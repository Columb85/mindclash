'use client';

import { useState } from 'react';
import { providers, Contract, utils } from 'ethers';
import { motion } from 'framer-motion';
import { Search, Shield, ExternalLink, CheckCircle2, XCircle, Clock, ArrowUp, ArrowDown, Info } from 'lucide-react';
import Link from 'next/link';

const RPC_URL  = 'https://rpc.sepolia.mantle.xyz';
const NFT_ADDR = '0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837';
const EXPLORER = 'https://sepolia.mantlescan.xyz';

const AGENT_NFT_ABI = [
  'function getRecentDecisions(uint256 tokenId, uint256 limit) view returns (tuple(string direction, uint256 confidence, uint256 stake, uint256 timestamp, bool wasCorrect, int256 pnl, string reasoning, bytes32 decisionHash)[])',
  'function agentProfiles(uint256) view returns (string name, string version, uint256 createdAt, uint256 totalDecisions, uint256 correctDecisions, uint256 totalPnL, bool isActive)',
  'event DecisionRecorded(uint256 indexed tokenId, bytes32 decisionHash, string direction, uint256 confidence)',
];

const AGENTS: Record<number, { name: string; strategy: string; color: string }> = {
  5: { name: 'AlphaPredict',   strategy: 'Momentum',       color: '#3b82f6' },
  6: { name: 'MomentumMaster', strategy: 'Mean-Reversion', color: '#a855f7' },
  7: { name: 'NeuralTrader',   strategy: 'Neural Net',     color: '#22c55e' },
};

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
}

const getProvider = () => new providers.JsonRpcProvider(RPC_URL);

export default function VerifyPage() {
  const [input, setInput]       = useState('');
  const [result, setResult]     = useState<VerifyResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

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
      // Fetch transaction + receipt
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

      // Try to decode calldata as recordDecision
      let tokenId: number | null = null;
      let direction: string | null = null;
      let confidence: number | null = null;
      let reasoning: string | null = null;
      let agentName: string | null = null;

      try {
        const iface = new utils.Interface([
          'function recordDecision(uint256 tokenId, string direction, uint256 confidence, uint256 stake, string reasoning)',
        ]);
        const decoded = iface.decodeFunctionData('recordDecision', tx.data);
        tokenId    = Number(decoded[0]);
        direction  = decoded[1];
        confidence = Number(decoded[2]);
        reasoning  = decoded[4];
        agentName  = AGENTS[tokenId]?.name || `Agent #${tokenId}`;
      } catch {
        // Not a recordDecision call — try resolveDecision
        try {
          const iface2 = new utils.Interface([
            'function resolveDecision(uint256 tokenId, uint256 decisionIndex, bool wasCorrect, int256 pnl)',
          ]);
          const decoded2 = iface2.decodeFunctionData('resolveDecision', tx.data);
          tokenId   = Number(decoded2[0]);
          agentName = AGENTS[tokenId]?.name || `Agent #${tokenId}`;
          reasoning = `Resolve decision #${Number(decoded2[1])}: ${decoded2[2] ? 'Correct' : 'Wrong'}, PnL: ${Number(decoded2[3])} bps`;
        } catch {
          // Unknown function
        }
      }

      setResult({
        txHash:      hash,
        blockNumber: receipt.blockNumber,
        timestamp:   block?.timestamp || 0,
        from:        tx.from,
        tokenId,
        agentName,
        direction,
        confidence,
        reasoning,
        gasUsed:     receipt.gasUsed.toString(),
        status:      receipt.status === 1 ? 'success' : 'reverted',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06060a] text-white">
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-[#06060a]/95 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-white transition text-sm">← Back</Link>
          <div className="w-px h-5 bg-gray-800" />
          <Shield className="w-5 h-5 text-green-400" />
          <h1 className="text-lg font-black">Trustless Verification</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-3xl space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-black">Verify Any AI Decision</h2>
          <p className="text-gray-400 text-sm max-w-lg mx-auto">
            Paste a transaction hash from MantleScan. We decode the on-chain data and show you exactly 
            what the AI agent decided — direction, confidence, reasoning. No trust required.
          </p>
        </div>

        {/* Search box */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleVerify()}
                placeholder="0x... transaction hash"
                className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <button
              onClick={handleVerify}
              disabled={loading}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 rounded-xl text-sm font-bold transition"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>

          {/* Quick examples — real on-chain decision hashes */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-gray-600 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Try a live example:
            </span>
            {[
              { label: 'AlphaPredict (DOWN)', hash: '0x7f70fd4047d479274959c5b56587b5de7d78e1c974cecbe1477d1a0c952b3fdf' },
              { label: 'NeuralTrader (DOWN)', hash: '0x1860e12822caf6d87c20658da012f528ccfc8697f3352cf90c65c951d3d7673d' },
              { label: 'MomentumMaster (DOWN)', hash: '0x39bd3902a99b1e2d3a1bfbe3d48d52fbcbc81bc54709433f6c2783c463447e49' },
            ].map(ex => (
              <button
                key={ex.hash}
                onClick={() => setInput(ex.hash)}
                className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px] font-mono text-blue-400 hover:bg-blue-500/20 transition truncate max-w-[180px]"
                title={ex.hash}
              >
                {ex.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Info className="w-3 h-3" />
            <span>Or find more hashes on</span>
            <a
              href={`${EXPLORER}/address/${NFT_ADDR}#internaltx`}
              target="_blank"
              className="text-blue-400 hover:text-blue-300"
            >
              AgentNFT contract page
            </a>
          </div>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Result */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-gray-800 bg-gray-900/40 overflow-hidden"
          >
            {/* Status bar */}
            <div className={`px-5 py-3 flex items-center justify-between ${
              result.status === 'success' ? 'bg-green-500/10 border-b border-green-500/20' : 'bg-red-500/10 border-b border-red-500/20'
            }`}>
              <div className="flex items-center gap-2">
                {result.status === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className={`text-sm font-bold ${result.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  Transaction {result.status === 'success' ? 'Confirmed' : 'Reverted'}
                </span>
              </div>
              <a
                href={`${EXPLORER}/tx/${result.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="w-3 h-3" />
                View on MantleScan
              </a>
            </div>

            <div className="p-5 space-y-5">
              {/* Transaction info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Transaction Hash</div>
                  <div className="text-xs font-mono text-white break-all">{result.txHash}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Block</div>
                  <div className="text-xs text-white">
                    #{result.blockNumber.toLocaleString()}
                    {result.timestamp > 0 && (
                      <span className="text-gray-500 ml-2">
                        ({new Date(result.timestamp * 1000).toLocaleString()})
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">From</div>
                  <a
                    href={`${EXPLORER}/address/${result.from}`}
                    target="_blank"
                    className="text-xs font-mono text-blue-400 hover:text-blue-300"
                  >
                    {result.from}
                  </a>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Gas Used</div>
                  <div className="text-xs text-white">{Number(result.gasUsed).toLocaleString()}</div>
                </div>
              </div>

              {/* Agent Decision (if decoded) */}
              {result.agentName && (
                <>
                  <div className="h-px bg-gray-800" />
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Decoded AI Decision</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Agent</div>
                        <div className="flex items-center gap-2">
                          {result.tokenId && AGENTS[result.tokenId] && (
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: AGENTS[result.tokenId].color }} />
                          )}
                          <span className="text-sm font-bold text-white">{result.agentName}</span>
                          {result.tokenId && (
                            <span className="text-[10px] text-gray-500">Token #{result.tokenId}</span>
                          )}
                        </div>
                      </div>

                      {result.direction && (
                        <div>
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Direction</div>
                          <div className={`flex items-center gap-1 text-lg font-black ${
                            result.direction === 'UP' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {result.direction === 'UP' ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
                            {result.direction}
                          </div>
                        </div>
                      )}

                      {result.confidence !== null && (
                        <div>
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Confidence</div>
                          <div className="text-sm font-bold text-white">
                            {(result.confidence / 10).toFixed(1)}%
                          </div>
                          <div className="mt-1 h-1.5 w-32 rounded-full bg-gray-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${Math.min(result.confidence / 10, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {result.reasoning && (
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Reasoning (on-chain)</div>
                        <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700 text-xs text-gray-300 font-mono">
                          {result.reasoning}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Transparency note */}
              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-gray-400 space-y-2">
                <div className="font-bold text-blue-400 text-sm">How to verify independently</div>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Open the <a href={`${EXPLORER}/tx/${result.txHash}`} target="_blank" className="text-blue-400 underline">transaction on MantleScan</a></li>
                  <li>Click "Decode Input Data" to see the raw parameters</li>
                  <li>Confirm: tokenId, direction, confidence, and reasoning match what is shown above</li>
                  <li>Check the block timestamp — this is when the decision was immutably recorded</li>
                </ol>
                <p className="mt-2 text-gray-500">
                  This data is read directly from the Mantle blockchain. No backend involved. 
                  We cannot alter what was recorded on-chain.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
