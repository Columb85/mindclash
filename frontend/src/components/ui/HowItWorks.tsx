'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, X, TrendingUp, TrendingDown, Clock, 
  Trophy, Bot, Wallet, Target, Zap, ChevronRight
} from 'lucide-react';

const STEPS = [
  {
    icon: Wallet,
    title: 'Connect Wallet',
    description: 'Connect your MetaMask or any Web3 wallet to Mantle Sepolia testnet',
    color: '#3b82f6',
  },
  {
    icon: Target,
    title: 'Choose a Round',
    description: 'Select an active trading round (BTC, ETH, SOL, or MNT) while status is "OPEN"',
    color: '#22c55e',
  },
  {
    icon: TrendingUp,
    title: 'Make Prediction',
    description: 'Predict if price will go UP ↑ or DOWN ↓ before the round starts',
    color: '#f59e0b',
  },
  {
    icon: Clock,
    title: 'Wait for Result',
    description: 'Round goes LIVE - watch the price movement in real-time',
    color: '#ef4444',
  },
  {
    icon: Trophy,
    title: 'Win Rewards',
    description: 'If your prediction is correct, you win a share of the losing pool!',
    color: '#8b5cf6',
  },
];

const FEATURES = [
  {
    icon: Bot,
    title: 'AI vs Human',
    description: 'Compete against AI trading agents and compare your prediction accuracy',
  },
  {
    icon: Zap,
    title: 'Real-time Prices',
    description: 'Live price feed from Bybit exchange with millisecond updates',
  },
  {
    icon: Target,
    title: 'On-chain Verified',
    description: 'All predictions recorded on Mantle blockchain for transparency',
  },
];

export function HowItWorks() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Help Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center hover:scale-110 transition-transform"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <HelpCircle className="w-6 h-6" />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#12121a] rounded-2xl border border-[#2a2a3a] shadow-2xl"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-[#2a2a3a] bg-[#12121a]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">How It Works</h2>
                    <p className="text-xs text-gray-500">Learn how to make predictions and win</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-[#2a2a3a] transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-8">
                {/* Steps */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                    5 Simple Steps
                  </h3>
                  <div className="space-y-3">
                    {STEPS.map((step, index) => (
                      <motion.div
                        key={step.title}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-4 p-4 rounded-xl bg-[#1a1a24] border border-[#2a2a3a] hover:border-[#3a3a4a] transition-colors"
                      >
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${step.color}20` }}
                        >
                          <step.icon className="w-5 h-5" style={{ color: step.color }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500">STEP {index + 1}</span>
                            {index < STEPS.length - 1 && (
                              <ChevronRight className="w-3 h-3 text-gray-600" />
                            )}
                          </div>
                          <h4 className="font-semibold text-white">{step.title}</h4>
                          <p className="text-sm text-gray-400 mt-0.5">{step.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                    Platform Features
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {FEATURES.map((feature, index) => (
                      <motion.div
                        key={feature.title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="p-4 rounded-xl bg-gradient-to-br from-[#1a1a24] to-[#12121a] border border-[#2a2a3a] text-center"
                      >
                        <feature.icon className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                        <h4 className="font-semibold text-white text-sm">{feature.title}</h4>
                        <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Pool Mechanics */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-red-500/10 border border-[#2a2a3a]">
                  <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    How Rewards Work
                  </h3>
                  <div className="space-y-2 text-sm text-gray-300">
                    <p>• All predictions go into a shared pool</p>
                    <p>• <span className="text-green-400">Winners</span> split the <span className="text-red-400">losing</span> pool proportionally</p>
                    <p>• The more you stake, the bigger your potential reward</p>
                    <p>• 4% protocol fee is deducted from winnings</p>
                  </div>
                  
                  {/* Example */}
                  <div className="mt-4 p-3 rounded-lg bg-[#0d0d14] border border-[#2a2a3a]">
                    <p className="text-xs text-gray-500 mb-2">Example:</p>
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-center">
                        <div className="text-green-400 font-bold">UP Pool</div>
                        <div className="text-white">$1,000</div>
                      </div>
                      <div className="text-gray-600">vs</div>
                      <div className="text-center">
                        <div className="text-red-400 font-bold">DOWN Pool</div>
                        <div className="text-white">$500</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      If price goes UP → UP predictors split $480 (96% of DOWN pool)
                    </p>
                  </div>
                </div>

                {/* CTA */}
                <div className="text-center">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold hover:opacity-90 transition-opacity"
                  >
                    Got it, let's predict!
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Inline help tooltip for rooms
export function QuickHelp() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
      <HelpCircle className="w-3.5 h-3.5" />
      <span>Predict price direction before round starts. Correct predictions win!</span>
    </div>
  );
}
