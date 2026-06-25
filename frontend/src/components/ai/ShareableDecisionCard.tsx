'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, ExternalLink, ArrowUp, ArrowDown, Copy, Check, X } from 'lucide-react';
import { buildDecisionShareText, openShareOnX } from '@/lib/share-x';

const EXPLORER = 'https://sepolia.mantlescan.xyz';

interface DecisionData {
  agentName: string;
  tokenId: number;
  strategy: string;
  color: string;
  direction: string;
  confidence: number;     // 0-1000
  reasoning: string;
  asset: string;
  txHash?: string;
  timestamp?: number;
}

interface Props {
  decision: DecisionData;
  onClose?: () => void;
}

export function ShareableDecisionCard({ decision, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const confPct = (decision.confidence / 10).toFixed(1);
  const explorerUrl = decision.txHash ? `${EXPLORER}/tx/${decision.txHash}` : null;
  const verifyUrl = decision.txHash
    ? `${window.location.origin}/verify?tx=${decision.txHash}`
    : null;

  const shareText = buildDecisionShareText({
    agentName: decision.agentName,
    direction: decision.direction,
    asset: decision.asset,
    confidence: decision.confidence,
    strategy: decision.strategy,
    txHash: decision.txHash,
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareX = () => openShareOnX(shareText);

  const handleShareTelegram = () => {
    const text = encodeURIComponent(shareText);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(explorerUrl || '')}&text=${text}`, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="max-w-md w-full"
        onClick={e => e.stopPropagation()}
      >
        {/* The visual card */}
        <div
          ref={cardRef}
          className="rounded-2xl overflow-hidden"
          style={{
            background: `linear-gradient(135deg, #0a0a12 0%, ${decision.color}15 50%, #0a0a12 100%)`,
            border: `1px solid ${decision.color}40`,
          }}
        >
          {/* Top bar */}
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${decision.color}20` }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
                   style={{ background: `${decision.color}20`, color: decision.color, border: `1px solid ${decision.color}40` }}>
                #{decision.tokenId}
              </div>
              <div>
                <div className="text-sm font-bold text-white">{decision.agentName}</div>
                <div className="text-[12px]" style={{ color: `${decision.color}aa` }}>
                  ERC-8004 · {decision.strategy}
                </div>
              </div>
            </div>
            <img src="/mindclash-logo.png" alt="MindClash" className="h-6 opacity-80" />
          </div>

          {/* Decision display */}
          <div className="px-5 py-6 flex items-center justify-center gap-6">
            {/* Direction */}
            <div className="text-center">
              <div className={`text-5xl font-black flex items-center gap-2 ${
                decision.direction === 'UP' ? 'text-green-400' : 'text-red-400'
              }`}>
                {decision.direction === 'UP' ? <ArrowUp className="w-10 h-10" /> : <ArrowDown className="w-10 h-10" />}
                {decision.direction}
              </div>
              <div className="text-xs text-gray-500 mt-1">{decision.asset}/USDT</div>
            </div>

            {/* Confidence gauge */}
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#1f2937" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="40"
                  fill="none"
                  stroke={decision.color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - decision.confidence / 1000)}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black text-white">{confPct}%</span>
                <span className="text-[13px] text-gray-500">confidence</span>
              </div>
            </div>
          </div>

          {/* Reasoning */}
          <div className="px-5 pb-4">
            <div className="p-3 rounded-lg bg-black/30 border border-gray-800/50">
              <div className="text-[12px] text-gray-500 uppercase tracking-wider mb-1">On-chain reasoning</div>
              <div className="text-xs text-gray-300 font-mono leading-relaxed">{decision.reasoning}</div>
            </div>
          </div>

          {/* Footer with verification */}
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: `1px solid ${decision.color}15`, background: 'rgba(0,0,0,0.3)' }}>
            <div className="text-[12px] text-gray-600">
              {decision.timestamp
                ? new Date(decision.timestamp * 1000).toLocaleString()
                : new Date().toLocaleString()}
            </div>
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[12px] text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="w-2.5 h-2.5" /> Verify on MantleScan
              </a>
            )}
          </div>
        </div>

        {/* Share buttons */}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={handleShareX}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700 hover:border-gray-500 text-sm font-bold text-white transition"
          >
            <span className="text-lg">𝕏</span>
            Share on X
          </button>
          <button
            onClick={handleShareTelegram}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-sm font-bold text-blue-400 transition"
          >
            <Share2 className="w-4 h-4" />
            Telegram
          </button>
          <button
            onClick={handleCopy}
            className="px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700 hover:border-gray-500 text-sm font-bold text-white transition"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700 hover:border-gray-500 text-sm text-gray-400 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
