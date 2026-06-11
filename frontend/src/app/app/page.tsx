'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ArrowLeft, ChevronDown, ChevronUp, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { GameRoundInterface } from '@/components/game/GameRoundInterface';
import { RoomsList } from '@/components/game/RoomsList';
import { UserProfile } from '@/components/profile/UserProfile';
import { Navigation, View } from '@/components/layout/Navigation';
import { ProtocolStats } from '@/components/dashboard/ProtocolStats';
import { LiveTicker } from '@/components/dashboard/ActivityFeed';
import { QuestsPanel } from '@/components/dashboard/QuestsPanel';
import { Leaderboard } from '@/components/dashboard/Leaderboard';
import { Room } from '@/types/room';
import { AIAgentProvider } from '@/contexts/AIAgentContext';
import { AIAgentMonitor } from '@/components/ai/AIAgentMonitor';
import { HumanVsAI } from '@/components/ai/HumanVsAI';
import { ModeIndicator } from '@/components/ui/ModeIndicator';
import { HowItWorks } from '@/components/ui/HowItWorks';
import { ClashBalance } from '@/components/ui/ClashBalance';
import { FaucetPanel } from '@/components/ui/FaucetPanel';
import { useClash } from '@/contexts/ClashContext';
import { useRooms } from '@/contexts/RoomsContext';

/** Collapsible AI Agent Monitor — secondary info, off by default */
function AIMonitorSection() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-dark-border overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-dark-surface/40 hover:bg-dark-surface/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <span className="text-sm font-bold text-white">AI Agent Monitor</span>
            <span className="ml-2 text-[10px] text-gray-500">Live decisions · ERC-8004 NFTs</span>
          </div>
          <span className="flex w-2 h-2 ml-1">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400" />
          : <ChevronDown className="w-4 h-4 text-gray-400" />
        }
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <AIAgentMonitor />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  const { address } = useAccount();
  const { clashBalance } = useClash();
  const { rooms } = useRooms();
  const [currentView, setCurrentView] = useState<View>('lobby');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const liveCount  = rooms.filter(r => r.status === 'live').length;
  const openCount  = rooms.filter(r => r.status === 'open').length;

  const handleEnterRoom = (room: Room) => {
    setActiveRoomId(room.id);
    setCurrentView('game');
  };

  const handleBackToLobby = () => {
    setCurrentView('lobby');
    setActiveRoomId(null);
  };

  return (
    <AIAgentProvider>
      <div className="min-h-screen">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-dark-bg/80 border-b border-dark-border">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Link href="/" className="relative flex items-center group">
                  <img
                    src="/mindclash-logo.png"
                    alt="MindClash"
                    className="h-16 w-auto object-contain group-hover:opacity-80 transition-opacity"
                  />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-dark-bg animate-pulse" />
                </Link>
              </div>

              <Navigation currentView={currentView} onViewChange={setCurrentView} />

              <div className="flex items-center gap-2">
                <ClashBalance />
                <ModeIndicator />
                <ConnectButton />
              </div>
            </div>
          </div>
        </header>

        {/* ── Live price ticker ──────────────────────────────────────────── */}
        <div className="border-b border-dark-border/50 bg-dark-bg/30">
          <div className="container mx-auto px-4 py-2">
            <LiveTicker />
          </div>
        </div>

        {/* ── Main ───────────────────────────────────────────────────────── */}
        <main className="container mx-auto px-4 py-5">

          {/* ═══ LOBBY ═══════════════════════════════════════════════════ */}
          {currentView === 'lobby' && (
            <div className="space-y-5">

              {/* 1 · Page title + live status */}
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Live Rounds</h2>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Predict UP or DOWN · Stake $CLASH · Beat the AI
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {liveCount > 0 && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      {liveCount} LIVE
                    </span>
                  )}
                  {openCount > 0 && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/30 text-xs font-bold text-green-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {openCount} open
                    </span>
                  )}
                </div>
              </div>

              {/* Demo mode banner */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: '#f59e0b15', border: '1px solid #f59e0b40', color: '#f59e0b' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                DEMO MODE — Testnet · Mantle Sepolia · Real AI predictions, simulated players
              </div>

              {/* 2 · Protocol stats bar */}
              <ProtocolStats />

              {/* 3 · Faucet — only show if user has no CLASH yet */}
              {clashBalance === 0 && <FaucetPanel />}

              {/* 4 · PRIMARY: rounds list */}
              <RoomsList onEnterRoom={handleEnterRoom} />

              {/* 5 · SECONDARY: AI monitor (collapsed by default) */}
              <AIMonitorSection />

            </div>
          )}

          {/* ═══ AI BATTLE ═══════════════════════════════════════════════ */}
          {currentView === 'ai-battle' && <HumanVsAI />}

          {/* ═══ GAME (inside a round) ═══════════════════════════════════ */}
          {currentView === 'game' && activeRoomId && (
            <div className="space-y-4">
              <button
                onClick={handleBackToLobby}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors bg-dark-surface/50 rounded-lg border border-dark-border hover:border-gray-500"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Lobby
              </button>
              <GameRoundInterface roomId={activeRoomId} />
            </div>
          )}

          {/* ═══ LEADERBOARD ═════════════════════════════════════════════ */}
          {currentView === 'leaderboard' && <Leaderboard />}

          {/* ═══ QUESTS ══════════════════════════════════════════════════ */}
          {currentView === 'quests' && (
            <div className="max-w-4xl mx-auto space-y-5">
              <div>
                <h2 className="text-2xl font-black text-white">Quests & Missions</h2>
                <p className="text-sm text-gray-400 mt-0.5">Complete tasks to earn PTS, climb ranks, unlock rewards</p>
              </div>
              <QuestsPanel />
            </div>
          )}

          {/* ═══ PROFILE ═════════════════════════════════════════════════ */}
          {currentView === 'profile' && <UserProfile userAddress={address} />}

        </main>

        <footer className="border-t border-dark-border/30 mt-16 py-5">
          <div className="container mx-auto px-4 text-center text-xs text-gray-600">
            MindClash · Mantle Turing Test Hackathon 2026
          </div>
        </footer>

        <HowItWorks />
      </div>
    </AIAgentProvider>
  );
}
