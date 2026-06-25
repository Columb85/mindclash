'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const STEPS = [
  { icon: 'fa-solid fa-wallet',         bg: 'rgba(59,130,246,.15)',           color: '#3b82f6',             title: 'Connect Wallet',         desc: 'Connect your MetaMask or any Web3 wallet to Mantle Sepolia testnet' },
  { icon: 'fa-solid fa-bullseye',       bg: 'var(--hud-green-3)',             color: 'var(--hud-green)',    title: 'Choose a Round',         desc: 'Select an active trading round (BTC, ETH, SOL, or MNT) while status is OPEN' },
  { icon: 'fa-solid fa-arrow-trend-up', bg: 'var(--hud-gold-3)',              color: 'var(--hud-gold)',     title: 'Make Prediction',        desc: 'Predict if price will go UP or DOWN before the round starts' },
  { icon: 'fa-solid fa-clock',          bg: 'var(--hud-red-3)',               color: 'var(--hud-red)',      title: 'Wait for Result',        desc: 'Round goes LIVE — watch the price movement in real-time' },
  { icon: 'fa-solid fa-trophy',         bg: 'var(--hud-purple-3)',            color: 'var(--hud-purple)',   title: 'Win Rewards',            desc: 'If your prediction is correct, you win a share of the losing pool!' },
];

const FEATURES = [
  { icon: 'fa-solid fa-robot', title: 'AI vs Human',       desc: 'Compete against AI trading agents' },
  { icon: 'fa-solid fa-bolt',  title: 'Real-time Prices',  desc: 'Live feed from Bybit exchange' },
  { icon: 'fa-solid fa-link',  title: 'On-chain Verified', desc: 'All predictions on Mantle blockchain' },
];

export function HowItWorks() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* FAB — matches mockup .help-fab */}
      <button className="help-fab" onClick={() => setOpen(true)} title="How it works">
        <i className="fa-solid fa-circle-question" />
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="hiw-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="hiw-modal"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="hiw-modal-hdr">
                <h2>
                  <i className="fa-solid fa-circle-question" />
                  How It Works
                </h2>
                <button className="hiw-modal-close" onClick={() => setOpen(false)}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              {/* Body */}
              <div className="hiw-modal-body">
                {STEPS.map(step => (
                  <div key={step.title} className="hiw-step">
                    <div className="hiw-num" style={{ background: step.bg, color: step.color }}>
                      <i className={step.icon} />
                    </div>
                    <div>
                      <h4>{step.title}</h4>
                      <p>{step.desc}</p>
                    </div>
                  </div>
                ))}

                <div className="hiw-features">
                  {FEATURES.map(f => (
                    <div key={f.title} className="hiw-feat">
                      <i className={f.icon} />
                      <div className="ft">{f.title}</div>
                      <div className="fd">{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function QuickHelp() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', border: '1px solid var(--hud-border)', background: 'var(--hud-panel-2)', fontFamily: 'var(--hud-font-mono)', fontSize: 12, color: 'var(--hud-text-dim)' }}>
      <i className="fa-solid fa-circle-question" style={{ color: 'var(--hud-cyan)', fontSize: 13 }} />
      Predict price direction before round starts. Correct predictions win!
    </div>
  );
}
