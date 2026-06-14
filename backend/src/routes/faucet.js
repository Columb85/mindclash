/**
 * MNT Testnet Faucet — sends small amount of MNT for gas to users.
 * Rate-limited: 1 claim per address per 24h, global 10 req/min.
 */

const express = require('express');
const { ethers } = require('ethers');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const DRIP_AMOUNT = '0.5';
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const claims = new Map();

const faucetLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  message: { error: 'Too many faucet requests. Try again in 1 minute.' },
});

router.post('/mnt', faucetLimiter, async (req, res) => {
  const { address } = req.body || {};

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Valid EVM address required' });
  }

  const key = address.toLowerCase();
  const lastClaim = claims.get(key);
  if (lastClaim && Date.now() - lastClaim < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - lastClaim)) / 60_000);
    return res.status(429).json({ error: `Already claimed. Next in ~${remaining} min.`, cooldownMin: remaining });
  }

  const pk = process.env.AGENT_PRIVATE_KEY;
  if (!pk) {
    return res.status(503).json({ error: 'Faucet wallet not configured' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(pk, provider);

    const faucetBal = await provider.getBalance(wallet.address);
    if (faucetBal < ethers.parseEther('0.2')) {
      return res.status(503).json({ error: 'Faucet temporarily empty. Try again later.' });
    }

    const userBal = await provider.getBalance(address);
    if (userBal >= ethers.parseEther('1.0')) {
      return res.status(400).json({ error: 'You already have enough MNT for gas.' });
    }

    const tx = await wallet.sendTransaction({
      to: address,
      value: ethers.parseEther(DRIP_AMOUNT),
    });
    const receipt = await tx.wait();

    claims.set(key, Date.now());
    console.log(`[FAUCET] Sent ${DRIP_AMOUNT} MNT → ${address} tx=${receipt.hash}`);

    res.json({
      success: true,
      amount: DRIP_AMOUNT,
      txHash: receipt.hash,
      explorer: `${process.env.EXPLORER_URL}/tx/${receipt.hash}`,
    });
  } catch (err) {
    console.error('[FAUCET] Error:', err.message);
    res.status(500).json({ error: 'Faucet transaction failed. Try again.' });
  }
});

router.get('/mnt/status', (req, res) => {
  const address = req.query.address;
  if (!address) return res.json({ canClaim: true, cooldownMin: 0 });

  const key = String(address).toLowerCase();
  const lastClaim = claims.get(key);
  if (!lastClaim || Date.now() - lastClaim >= COOLDOWN_MS) {
    return res.json({ canClaim: true, cooldownMin: 0 });
  }
  const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - lastClaim)) / 60_000);
  res.json({ canClaim: false, cooldownMin: remaining });
});

module.exports = router;
