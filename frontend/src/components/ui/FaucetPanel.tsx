'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CLASH_TOKEN_ADDRESS, CLASH_ABI } from '@/contexts/ClashContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.mindclash.xyz/api';
const MANTLESCAN_TOKEN  = `https://sepolia.mantlescan.xyz/address/${CLASH_TOKEN_ADDRESS}`;

function formatCooldown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function FaucetPanel() {
  const { address, isConnected } = useAccount();

  // ── MNT faucet state ──────────────────────────────────────────────────────
  const [mntClaiming, setMntClaiming] = useState(false);
  const [mntDone, setMntDone] = useState(false);
  const [mntTxHash, setMntTxHash] = useState<string | null>(null);
  const [mntError, setMntError] = useState<string | null>(null);
  const [mntCooldown, setMntCooldown] = useState(0);

  useEffect(() => {
    if (!address) return;
    fetch(`${API_URL}/faucet/mnt/status?address=${address}`)
      .then(r => r.json())
      .then(d => { if (!d.canClaim) setMntCooldown(d.cooldownMin || 0); })
      .catch(() => {});
  }, [address]);

  const handleClaimMnt = useCallback(async () => {
    if (!address || mntClaiming || mntDone || mntCooldown > 0) return;
    setMntClaiming(true);
    setMntError(null);
    try {
      const res = await fetch(`${API_URL}/faucet/mnt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (data.success) {
        setMntDone(true);
        setMntTxHash(data.txHash);
      } else {
        setMntError(data.error || 'Failed');
        if (data.cooldownMin) setMntCooldown(data.cooldownMin);
      }
    } catch {
      setMntError('Network error');
    } finally {
      setMntClaiming(false);
    }
  }, [address, mntClaiming, mntDone, mntCooldown]);

  const mntLabel = useMemo(() => {
    if (!isConnected) return 'Connect wallet';
    if (mntClaiming) return 'Sending MNT…';
    if (mntDone) return 'Received 0.5 MNT ✓';
    if (mntCooldown > 0) return `Cooldown: ${mntCooldown}m`;
    return 'Get 0.5 MNT';
  }, [isConnected, mntClaiming, mntDone, mntCooldown]);

  // ── Read canClaimFaucet from contract ───────────────────────────────────────
  const { data: claimData, refetch } = useReadContract({
    address: CLASH_TOKEN_ADDRESS,
    abi: CLASH_ABI,
    functionName: 'canClaimFaucet',
    args: [address as `0x${string}`],
    query: { enabled: isConnected && !!address },
  });

  const canClaim   = (claimData as [boolean, bigint] | undefined)?.[0] ?? true;
  const timeLeft   = Number((claimData as [boolean, bigint] | undefined)?.[1] ?? 0);

  // ── Write: claimFaucet() ────────────────────────────────────────────────────
  const { writeContract: doClaimFaucet, data: txHash, isPending: isWriting, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (isSuccess) refetch();
  }, [isSuccess, refetch]);

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
    doClaimFaucet({
      address: CLASH_TOKEN_ADDRESS,
      abi: CLASH_ABI,
      functionName: 'claimFaucet',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="hud-panel overflow-hidden"
      style={{ clipPath: 'polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)' }}
    >
      {/* Purple → gold → cyan gradient line (matches mockup .faucet::before) */}
      <div style={{ height: 2, background: 'linear-gradient(90deg,#a855f7,#fbbf24,#00e5ff)', display: 'block' }} />

      <div className="faucet-inner">
        {/* Header — matches mockup .faucet-hdr */}
        <div className="faucet-hdr">
          <div className="faucet-hdr-left">
            <div className="faucet-icon"><i className="fa-solid fa-coins" /></div>
            <div>
              <h3>Get Started — Free Tokens</h3>
              <p>Mantle Sepolia Testnet · No real money needed</p>
            </div>
          </div>
          <a className="faucet-link" href={MANTLESCAN_TOKEN} target="_blank" rel="noopener noreferrer">
            <i className="fa-solid fa-arrow-up-right-from-square" /> $CLASH on Mantlescan
          </a>
        </div>

        {/* Step 1 — built-in MNT faucet */}
        <div className="faucet-step">
          <span className="step-num">1</span>
          <span className="step-icon blue"><i className="fa-solid fa-droplet" /></span>
          <div className="step-text">
            <div className="st">Get MNT for gas</div>
            <div className="sd">
              {mntDone ? 'MNT sent to your wallet!' : mntError || 'Free testnet gas. One click, instant.'}
            </div>
          </div>
          <motion.button
            whileTap={{ scale: (!isConnected || mntClaiming || mntDone || mntCooldown > 0) ? 1 : 0.95 }}
            onClick={handleClaimMnt}
            disabled={!isConnected || mntClaiming || mntDone || mntCooldown > 0}
            className={`step-btn ${mntDone ? 'green' : mntCooldown > 0 ? 'gray' : 'blue'}`}
          >
            {mntClaiming && <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 9 }} />}
            {mntDone && <i className="fa-solid fa-circle-check" style={{ fontSize: 9 }} />}
            {mntLabel}
          </motion.button>
        </div>
        {mntDone && mntTxHash && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', marginTop: -4, marginBottom: 4 }}>
            <a
              href={`https://sepolia.mantlescan.xyz/tx/${mntTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: 'var(--hud-font-mono)', fontSize: 9, color: 'var(--hud-text-3)', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 8 }} /> {mntTxHash.slice(0, 16)}…
            </a>
          </div>
        )}

        {/* Step 2 */}
        <div className="faucet-step">
          <span className="step-num">2</span>
          <span className="step-icon purple"><i className="fa-solid fa-gift" /></span>
          <div className="step-text">
            <div className="st">Claim 1 000 $CLASH</div>
            <div className="sd">
              {!canClaim && timeLeft > 0
                ? `On-chain faucet · next claim in ${formatCooldown(timeLeft)}`
                : 'On-chain faucet · once per 24h · ClashToken contract'}
            </div>
          </div>
          <motion.button
            whileTap={{ scale: (!isConnected || isBusy || isSuccess || (!canClaim && timeLeft > 0)) ? 1 : 0.95 }}
            onClick={handleClaimClash}
            disabled={!isConnected || isBusy || isSuccess || (!canClaim && timeLeft > 0)}
            className={`step-btn ${claimVariant === 'green' ? 'green' : claimVariant === 'gray' ? 'gray' : 'purple'}`}
          >
            {(isWriting || isConfirming) && <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 9 }} />}
            {isSuccess && <i className="fa-solid fa-circle-check" style={{ fontSize: 9 }} />}
            {!canClaim && timeLeft > 0 && !isBusy && !isSuccess && <i className="fa-solid fa-clock" style={{ fontSize: 9 }} />}
            {!isConnected ? 'Connect wallet' : claimButtonLabel}
          </motion.button>
        </div>

        {/* Step 3 */}
        <div className="faucet-step">
          <span className="step-num">3</span>
          <span className="step-icon gold"><i className="fa-solid fa-bolt" /></span>
          <div className="step-text">
            <div className="st">Place your first prediction</div>
            <div className="sd">Minimum 10 CLASH. Beat the bots, earn PTS.</div>
          </div>
        </div>

        {/* Success tx link */}
        {isSuccess && txHash && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginTop: 8, background: 'var(--hud-green-dim)', border: '1px solid rgba(57,255,144,0.3)' }}
          >
            <i className="fa-solid fa-circle-check" style={{ fontSize: 11, color: 'var(--hud-green)' }} />
            <span style={{ fontFamily: 'var(--hud-font-head)', fontSize: 12, fontWeight: 700, color: 'var(--hud-green)', letterSpacing: '0.04em' }}>
              1 000 CLASH minted on-chain!
            </span>
            <a
              href={`https://sepolia.mantlescan.xyz/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginLeft: 'auto', fontFamily: 'var(--hud-font-mono)', fontSize: 9, color: 'var(--hud-text-3)', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 9 }} /> Tx
            </a>
          </motion.div>
        )}

        {/* Error */}
        {writeError && (
          <p style={{ marginTop: 8, fontFamily: 'var(--hud-font-mono)', fontSize: 10, color: 'var(--hud-red)' }}>
            {writeError.message?.includes('cooldown') ? 'Faucet cooldown not expired yet.' : 'Transaction rejected.'}
          </p>
        )}

        {/* Footer */}
        <div className="faucet-foot">
          <span>Chain: Mantle Sepolia (5003)</span>
          <span>·</span>
          <span>RPC: rpc.sepolia.mantle.xyz</span>
          <span>·</span>
          <span style={{ color: 'var(--hud-text-dim)' }}>No real funds at risk</span>
        </div>
      </div>
    </motion.div>
  );
}
