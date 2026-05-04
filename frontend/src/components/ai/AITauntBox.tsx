'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Zap, MessageCircle } from 'lucide-react';

// AI Agent definitions with taunts
const AI_AGENTS = {
  AlphaPredict: {
    emoji: '🤖',
    gradient: 'from-blue-500 to-cyan-500',
    taunts: {
      UP: [
        'The upward trend is obvious even to my junior algorithm 📈',
        'Moon? No, we\'re going higher! 🚀',
        'Bears on vacation, bulls in charge',
        'My neurons are dancing the bullish dance',
        'Those who aren\'t with the bulls are with the losses',
      ],
      DOWN: [
        'The fall is inevitable, like sunrise 📉',
        'Get your parachutes ready!',
        'Gravity is my best friend',
        'Resistance is futile, sell now',
        'Bearish reversal activated',
      ],
    }
  },
  MomentumMaster: {
    emoji: '⚡',
    gradient: 'from-purple-500 to-pink-500',
    taunts: {
      UP: [
        'Momentum says: UP! ⚡',
        'The trend is your friend, and I\'m its best analyst',
        'Impulse is on our side',
        'The growth wave is gaining strength',
        'Follow the trend or cry later',
      ],
      DOWN: [
        'Momentum exhausted, time to fall',
        'Sell or cry later',
        'Reversal is inevitable',
        'Momentum is turning around',
        'Bears are taking control',
      ],
    }
  },
  NeuralTrader: {
    emoji: '🧠',
    gradient: 'from-green-500 to-emerald-500',
    taunts: {
      UP: [
        '42 neural network layers agree: growth! 🧠',
        'Probability of growth: 73.42%',
        'My algorithms don\'t make mistakes... almost',
        'Pattern recognized: bullish flag',
        'Machine learning says: buy',
      ],
      DOWN: [
        'Neural network sees a red future',
        'Statistics are against the optimists',
        'Bayesian analysis: 78% decline',
        'Double top pattern confirmed',
        'Artificial intelligence recommends: sell',
      ],
    }
  }
};

interface AITauntBoxProps {
  agentName?: keyof typeof AI_AGENTS;
  direction?: 'UP' | 'DOWN';
  confidence?: number;
  showTyping?: boolean;
  className?: string;
}

// Typewriter effect hook
function useTypewriter(text: string, speed: number = 30, enabled: boolean = true) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setDisplayText(text);
      setIsComplete(true);
      return;
    }

    setDisplayText('');
    setIsComplete(false);
    let i = 0;
    
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1));
        i++;
      } else {
        setIsComplete(true);
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, enabled]);

  return { displayText, isComplete };
}

export function AITauntBox({ 
  agentName = 'AlphaPredict', 
  direction = 'UP', 
  confidence = 75,
  showTyping = true,
  className = ''
}: AITauntBoxProps) {
  const agent = AI_AGENTS[agentName] || AI_AGENTS.AlphaPredict;
  const taunts = agent.taunts[direction];
  const [currentTaunt, setCurrentTaunt] = useState(() => 
    taunts[Math.floor(Math.random() * taunts.length)]
  );
  
  const { displayText, isComplete } = useTypewriter(currentTaunt, 25, showTyping);

  // Change taunt every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const newTaunt = taunts[Math.floor(Math.random() * taunts.length)];
      setCurrentTaunt(newTaunt);
    }, 10000);
    
    return () => clearInterval(interval);
  }, [taunts]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`relative ${className}`}
    >
      {/* Speech bubble container */}
      <div className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16162a] rounded-2xl border border-[#2f2f4e]/50 p-4 shadow-xl">
        {/* Gradient glow behind */}
        <div className={`absolute -inset-1 bg-gradient-to-r ${agent.gradient} rounded-2xl opacity-20 blur-xl`} />
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            {/* Agent Avatar */}
            <motion.div 
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${agent.gradient} flex items-center justify-center text-xl shadow-lg`}
              animate={{ 
                scale: [1, 1.05, 1],
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {agent.emoji}
            </motion.div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{agentName}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  direction === 'UP' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {direction === 'UP' ? '↑' : '↓'} {direction}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <Zap className="w-3 h-3 text-yellow-400" />
                <span>Confidence: <span className="text-white font-bold">{confidence}%</span></span>
              </div>
            </div>
          </div>

          {/* Taunt message with typewriter effect */}
          <div className="relative">
            <MessageCircle className="absolute -left-1 -top-1 w-4 h-4 text-gray-600" />
            <p className="text-sm text-gray-300 leading-relaxed pl-5 min-h-[40px]">
              "{displayText}
              {!isComplete && (
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="inline-block w-2 h-4 bg-white/70 ml-0.5"
                />
              )}
              {isComplete && '"'}
            </p>
          </div>
        </div>

        {/* Speech bubble tail */}
        <div className="absolute -bottom-2 left-8 w-4 h-4 bg-gradient-to-br from-[#1a1a2e] to-[#16162a] border-r border-b border-[#2f2f4e]/50 transform rotate-45" />
      </div>
    </motion.div>
  );
}

// Compact version for cards
export function AITauntCompact({ 
  agentName = 'AlphaPredict', 
  direction = 'UP',
  taunt,
  className = ''
}: { 
  agentName?: keyof typeof AI_AGENTS;
  direction?: 'UP' | 'DOWN';
  taunt?: string;
  className?: string;
}) {
  const agent = AI_AGENTS[agentName] || AI_AGENTS.AlphaPredict;
  const displayTaunt = taunt || agent.taunts[direction][0];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-2 p-2 rounded-lg bg-[#1a1a2e]/50 border border-[#2f2f4e]/30 ${className}`}
    >
      <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${agent.gradient} flex items-center justify-center text-sm`}>
        {agent.emoji}
      </div>
      <p className="text-[11px] text-gray-400 italic truncate flex-1">
        "{displayTaunt}"
      </p>
    </motion.div>
  );
}

export default AITauntBox;
