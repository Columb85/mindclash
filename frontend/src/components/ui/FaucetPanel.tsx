'use client';

import { ReactNode, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Droplets, ExternalLink, CheckCircle2, Loader2, Coins, Zap, Gift, Clock } from 'lucide-react';
import { useAccount, useContractRead, useContractWrite, useWaitForTransaction } from 'wagmi';
import { CLASH_TOKEN_ADDRESS, CLASH_ABI } from '@/contexts/ClashContext';

const MANTLE_FAUCET_URL = 'https://faucet.sepolia.mantle.xyz/';
const MANTLESCAN_TOKEN  = `https://sepolia.mantlescan.xyz/address/${CLASH_TOKEN_ADDRESS}`;

function formatCooldown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface Step {
  icon: ReactNode;
  title: string;
  desc: string;
  action?: { label: string; href?: string; onClick?: () => void; disabled?: boolean; variant?: 'blue' | 'purple' | 'green' | 'gray' };
}

export function FaucetPanel() {
  const { address, isConnected } = useAccount();

  // ── Read canClaimFaucet from contract ───────────────────────────────────────
  const { data: claimData, refetch } = useContractRead({
    address: CLASH_TOKEN_ADDRESS,
    abi: CLASH_ABI,
    functionName: 'canClaimFaucet',
    args: [address as `0x${string}`],
    enabled: isConnected && !!address,
    watch: false,
  });

  const canClaim   = (claimData as [boolean, bigint] | undefined)?.[0] ?? true;
  const timeLeft   = Number((claimData as [boolean, bigint] | undefined)?.[1] ?? 0);

  // ── Write: claimFaucet() ────────────────────────────────────────────────────
  const { write: doClaimFaucet, data: txData, isLoading: isWriting, error: writeError } = useContractWrite({
    address: CLASH_TOKEN_ADDRESS,
    abi: CLASH_ABI,
    functionName: 'claimFaucet',
  });

  const { isLoading: isConfirming, isSuccess } = useWaitForTransaction({
    hash: txData?.hash,
    onSuccess: () => refetch(),
  });

  const isBusy = isWriting || isConfirming;

  const claimButtonLabel = useMemo(() => {
    if (!isConnected)  return 'Connect wallet';
    if (isWriting)     return 'Confirm in wallet…';
    if (isConfirming)  return 'Confirming tx…';
    if (isSuccess)     return 'Claimed! +1 000 CLASH ✓';
    if (!canClaim && timeLeft > 0) return `Cooldown: ${formatCooldown(timeLeft)}`;
    return 'Claim 1 000 CLASH';
  }, [isConnected, isWriting, isConfirming, isSuccess, canClaim, timeLeft]);

  const claimVariant = isSuccess ? 'green' : (!canClaim && timeLeft > 0) ? 'gray' : 'purple';

  const handleClaimClash = () => {
    if (!isConnected || isBusy || isSuccess || (!canClaim && timeLeft > 0)) return;
    doClaimFaucet?.();
  };

  const steps: Step[] = [
    {
      icon: <Droplets className="w-5 h-5 text-blue-400" />,
      title: 'Get MNT for gas',
      desc: 'Mantle Sepolia testnet gas. Free, instant.',
      action: { label: 'Open Faucet ↗', href: MANTLE_FAUCET_URL, variant: 'blue' },
    },
    {
      icon: <Gift className="w-5 h-5 text-purple-400" />,
      title: 'Claim 1 000 $CLASH',
      desc: !canClaim && timeLeft > 0
        ? `On-chain faucet · next claim in ${formatCooldown(timeLeft)}`
        : 'On-chain faucet · once per 24h · ClashToken contract',
      action: {
        label: claimButtonLabel,
        onClick: handleClaimClash,
        disabled: !isConnected || isBusy || isSuccess || (!canClaim && timeLeft > 0),
        variant: claimVariant,
      },
    },
    {
      icon: <Zap className="w-5 h-5 text-yellow-400" />,
      title: 'Place your first prediction',
      desc: 'Minimum 10 CLASH. Beat the bots, earn PTS.',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden border border-[#2f2f4e]/60"
      style={{ background: 'linear-gradient(135deg, rgba(20,20,31,0.95) 0%, rgba(13,13,20,0.98) 100%)' }}
    >
      {/* Top glow bar */}
      <div className="h-[2px] w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Get Started — Free Tokens</h3>
              <p className="text-[10px] text-gray-500">Mantle Sepolia Testnet · No real money needed</p>
            </div>
          </div>
          <a
            href={MANTLESCAN_TOKEN}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-purple-400 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            $CLASH
          </a>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-3 rounded-xl bg-[#0d0d14]/60 border border-[#1f1f2e]/80"
            >
              {/* Step number */}
              <div className="shrink-0 w-6 h-6 rounded-full bg-[#1f1f2e] flex items-center justify-center text-[10px] font-bold text-gray-400">
                {i + 1}
              </div>

              {/* Icon */}
              <div className="shrink-0">{step.icon}</div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white">{step.title}</p>
                <p className="text-[10px] text-gray-500 truncate">{step.desc}</p>
              </div>

              {/* Action */}
              {step.action && (
                step.action.href ? (
                  <a
                    href={step.action.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 transition-all"
                  >
                    {step.action.label}
                  </a>
                ) : (
                  <motion.button
                    whileTap={{ scale: step.action.disabled ? 1 : 0.95 }}
                    onClick={step.action.onClick}
                    disabled={step.action.disabled}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                      step.action.variant === 'green'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
                        : step.action.variant === 'gray'
                        ? 'bg-[#1f1f2e] text-gray-500 border border-[#2f2f3e] cursor-not-allowed'
                        : step.action.disabled
                        ? 'bg-[#1f1f2e] text-gray-500 cursor-not-allowed'
                        : 'text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'
                    }`}
                  >
                    {(isWriting || isConfirming) && <Loader2 className="w-3 h-3 animate-spin" />}
                    {isSuccess && <CheckCircle2 className="w-3 h-3" />}
                    {!canClaim && timeLeft > 0 && !isBusy && !isSuccess && <Clock className="w-3 h-3" />}
                    {step.action.label}
                  </motion.button>
                )
              )}
            </div>
          ))}
        </div>

        {/* Tx link after successful claim */}
        {isSuccess && txData?.hash && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
            <span className="text-[11px] text-green-400 font-semibold">1 000 CLASH minted on-chain!</span>
            <a
              href={`https://sepolia.mantlescan.xyz/tx/${txData.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-[10px] text-gray-400 hover:text-green-400 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Tx
            </a>
          </motion.div>
        )}

        {/* Error hint */}
        {writeError && (
          <p className="mt-2 text-[10px] text-red-400 px-1">
            {writeError.message?.includes('cooldown') ? 'Faucet cooldown not expired yet.' : 'Transaction rejected.'}
          </p>
        )}

        {/* Network info footer */}
        <div className="mt-4 flex items-center gap-4 pt-3 border-t border-[#1f1f2e]/60 text-[10px] text-gray-600">
          <span>Chain: Mantle Sepolia (5003)</span>
          <span>·</span>
          <span>RPC: rpc.sepolia.mantle.xyz</span>
          <span>·</span>
          <span className="text-gray-500">No real funds at risk</span>
        </div>
      </div>
    </motion.div>
  );
}
