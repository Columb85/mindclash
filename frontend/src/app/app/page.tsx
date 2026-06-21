'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import { HudConnectButton } from '@/components/ui/HudConnectButton';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { GameRoundInterface } from '@/components/game/GameRoundInterface';
import { RoomsList } from '@/components/game/RoomsList';
import { UserProfile } from '@/components/profile/UserProfile';
import { Navigation, View } from '@/components/layout/Navigation';
import { ProtocolStats } from '@/components/dashboard/ProtocolStats';
import { LiveTicker } from '@/components/dashboard/ActivityFeed';
import { Room } from '@/types/room';
import { AIAgentProvider } from '@/contexts/AIAgentContext';
import { AIAgentMonitor } from '@/components/ai/AIAgentMonitor';
import { ModeIndicator } from '@/components/ui/ModeIndicator';
import { HowItWorks } from '@/components/ui/HowItWorks';
import { ClashBalance } from '@/components/ui/ClashBalance';
import { FaucetPanel } from '@/components/ui/FaucetPanel';
import { OnlineCounter } from '@/components/ui/OnlineCounter';
import { QuickJoinButton } from '@/components/ui/QuickJoinButton';
import { RecentWinners } from '@/components/ui/RecentWinners';
import { BotComparison } from '@/components/ui/BotComparison';
import { ActiveRoundBanner } from '@/components/game/ActiveRoundBanner';
import { useActiveRound } from '@/contexts/ActiveRoundContext';
import { useKeyboardShortcuts, KeyboardHints } from '@/hooks/useKeyboardShortcuts';
import { useClash } from '@/contexts/ClashContext';
import { useRooms } from '@/contexts/RoomsContext';
import toast from 'react-hot-toast';

const ACTIVE_ROOM_KEY = 'mindclash_active_room';
const IN_ROOM_VIEW_KEY = 'mindclash_in_room_view';

function loadStoredRoomId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(ACTIVE_ROOM_KEY);
}

function wasInRoomView(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(IN_ROOM_VIEW_KEY) === 'true';
}

function setInRoomView(active: boolean) {
  if (typeof window === 'undefined') return;
  if (active) sessionStorage.setItem(IN_ROOM_VIEW_KEY, 'true');
  else sessionStorage.removeItem(IN_ROOM_VIEW_KEY);
}

/** Collapsible AI Agent Monitor — matches mockup .ai-section */
function AIMonitorSection() {
  const [open, setOpen] = useState(false);
  return (
    <div className="hud-ai-section">
      <button
        onClick={() => setOpen(v => !v)}
        className="hud-ai-toggle"
      >
        <span className="hud-ai-toggle-icon">
          <i className="fa-solid fa-robot" />
        </span>
        <span className="hud-ai-toggle-title">AI Agent Monitor</span>
        <span className="hud-ai-toggle-sub">Live decisions · ERC-8004 NFTs</span>
        <span className="hud-ai-toggle-live">
          <span className="live-dot" style={{ width: 6, height: 6 }} />
          LIVE
        </span>
        <i
          className={`fa-solid fa-chevron-down ml-auto transition-transform duration-200${open ? ' rotate-180' : ''}`}
          style={{ color: 'var(--hud-text-dim)', fontSize: 12 }}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden hud-ai-body"
          >
            <AIAgentMonitor />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const [mounted, setMounted] = useState(false);
  const { address } = useAccount();
  const { clashBalance } = useClash();
  const { rooms, roomsReady } = useRooms();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setViewingRoom, pinRoom } = useActiveRound();
  const [currentView, setCurrentView] = useState<View>('lobby');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const liveCount  = rooms.filter(r => r.status === 'live').length;
  const openCount  = rooms.filter(r => r.status === 'open').length;

  const enterGameView = useCallback((roomId: string, syncUrl = true) => {
    setActiveRoomId(roomId);
    setCurrentView('game');
    pinRoom(roomId);
    setInRoomView(true);
    if (syncUrl) {
      router.replace(`/app?room=${encodeURIComponent(roomId)}`, { scroll: false });
    }
  }, [pinRoom, router]);

  const handleEnterRoom = (room: Room) => {
    enterGameView(room.id);
  };

  // Deep-link: /app?room=ROOM_ID or /app?view=profile; restore room after reload
  useEffect(() => {
    const roomId = searchParams.get('room');
    const view = searchParams.get('view');
    if (roomId) {
      enterGameView(roomId, false);
      return;
    }
    if (view === 'profile') {
      setCurrentView('profile');
      return;
    }

    const storedRoomId = loadStoredRoomId();
    if (storedRoomId && wasInRoomView()) {
      enterGameView(storedRoomId, true);
    }
  }, [searchParams, enterGameView]);

  // Once rooms load, validate stored room still exists and is joinable.
  // Allow 'resolved' so the ResolutionReveal modal can display results.
  useEffect(() => {
    if (!roomsReady || currentView !== 'game' || !activeRoomId) return;
    const room = rooms.find(r => r.id === activeRoomId);
    if (!room) {
      setCurrentView('lobby');
      setInRoomView(false);
      router.replace('/app', { scroll: false });
      toast('That round is no longer available', { icon: '⏳' });
      return;
    }
    if (room.status !== 'open' && room.status !== 'live' && room.status !== 'resolved') {
      setCurrentView('lobby');
      setInRoomView(false);
      router.replace('/app', { scroll: false });
    }
  }, [roomsReady, rooms, activeRoomId, currentView, router]);

  // Custom event from ActiveRoundContext when already on /app
  useEffect(() => {
    const handler = (e: Event) => {
      const roomId = (e as CustomEvent<{ roomId: string }>).detail?.roomId;
      if (roomId) enterGameView(roomId);
    };
    window.addEventListener('mindclash:return-to-round', handler);
    return () => window.removeEventListener('mindclash:return-to-round', handler);
  }, [enterGameView]);

  // Sync viewing room for away-detection
  useEffect(() => {
    setViewingRoom(currentView === 'game' ? activeRoomId : null);
  }, [currentView, activeRoomId, setViewingRoom]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onQuickJoin: () => {
      const openRoom = rooms.find(r => r.status === 'open');
      if (openRoom) {
        toast(`⚡ Joining ${openRoom.asset || 'BTC'} round...`, { duration: 1500 });
        handleEnterRoom(openRoom);
      } else {
        toast('No open rounds available', { icon: '⏳' });
      }
    },
    onHelp: () => {
      const helpBtn = document.querySelector('.help-fab') as HTMLButtonElement;
      if (helpBtn) helpBtn.click();
    },
  }, currentView === 'lobby');

  const handleBackToLobby = () => {
    setCurrentView('lobby');
    setInRoomView(false);
    router.replace('/app', { scroll: false });
    // Keep activeRoomId so user can return via banner; viewingRoom cleared by effect
  };

  if (!mounted) {
    return (
      <div className="min-h-screen" style={{ background: '#080a0f' }}>
        <div className="hud-topbar">
          <div className="hud-topbar-inner">
            <span className="hud-logo-text">
              <span className="logo-mind">Mind</span>
              <span className="logo-clash">Clash</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AIAgentProvider>
      <div className="min-h-screen">

        {/* ── HUD Topbar — sticky only ────────────────────────────────────── */}
        <header className="hud-topbar">
          <div className="hud-topbar-inner">
            <Link href="/" className="hud-logo-text">
              <span className="logo-mind">Mind</span>
              <span className="logo-clash">Clash</span>
            </Link>
            <Navigation currentView={currentView} onViewChange={setCurrentView} />
            <div className="hud-topbar-right">
              <OnlineCounter />
              <ClashBalance />
              <ModeIndicator />
              <HudConnectButton />
            </div>
          </div>
        </header>

        {/* ── Ticker bar — scrolls away ────────────────────────────────────── */}
        <div className="hud-ticker-bar">
          <div className="hud-shell">
            <LiveTicker />
          </div>
        </div>

        {/* ── Main ───────────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {currentView === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="hud-shell" style={{ paddingTop: 12 }}>
                <ActiveRoundBanner />
              </div>
              <UserProfile userAddress={address} />
            </motion.div>
          )}

          {currentView !== 'profile' && (
            <motion.main
              key={currentView}
              className="hud-shell py-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {currentView !== 'game' && <ActiveRoundBanner />}

              {/* ═══ LOBBY ═══════════════════════════════════════════════════ */}
              {currentView === 'lobby' && (
                <div className="space-y-5">

                  {/* 1 · Page title + live status + Quick Join */}
                  <div className="hud-page-hdr">
                    <div>
                      <h1>Live Rounds</h1>
                      <p>Predict UP or DOWN · Stake $CLASH · Beat the AI</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <QuickJoinButton onJoin={handleEnterRoom} />
                      <div className="hud-page-badges">
                        {liveCount > 0 && (
                          <span className="hud-pbadge hud-pbadge-live">
                            <span className="live-dot" style={{ width: 6, height: 6, background: 'var(--hud-red)', boxShadow: '0 0 6px var(--hud-red)' }} />
                            {liveCount} LIVE
                          </span>
                        )}
                        {openCount > 0 && (
                          <span className="hud-pbadge hud-pbadge-open">
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--hud-green)', display: 'inline-block' }} />
                            {openCount} OPEN
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Testnet banner */}
                  <div className="hud-testnet-banner">
                    <span className="hud-testnet-dot" />
                    <div className="hud-testnet-main">
                      <span className="hud-testnet-lbl">TESTNET</span>
                      <span style={{ marginLeft: 8 }}>Mantle Sepolia (5003) · No real money · Groq LLM bots make live on-chain decisions</span>
                    </div>
                    <div className="hud-testnet-tags">
                      <span className="hud-testnet-tag"><span className="dot" style={{ background: 'var(--hud-green)' }} />Groq AI</span>
                      <span className="hud-testnet-tag"><span className="dot" style={{ background: 'var(--hud-cyan)' }} />Mantle Chain</span>
                      <span className="hud-testnet-tag"><span className="dot" style={{ background: 'var(--hud-purple)' }} />Bybit + Pyth</span>
                    </div>
                  </div>

                  {/* 2 · Protocol stats bar */}
                  <ProtocolStats />

                  {/* 3 · Faucet — only show if user has no CLASH yet */}
                  {clashBalance === 0 && <FaucetPanel />}

                  {/* 4 · Bot Performance + Recent Winners — horizontal row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                    <BotComparison />
                    <RecentWinners />
                  </div>

                  {/* 5 · PRIMARY: rounds list */}
                  <RoomsList onEnterRoom={handleEnterRoom} />

                  {/* 6 · SECONDARY: AI monitor (collapsed by default) */}
                  <AIMonitorSection />

                  {/* 7 · Keyboard hints — small bar at bottom */}
                  <KeyboardHints />

                </div>
              )}

              {/* ═══ GAME (inside a round) ═══════════════════════════════════ */}
              {currentView === 'game' && activeRoomId && (
                <div className="space-y-4">
                  <button
                    onClick={handleBackToLobby}
                    className="hud-btn hud-btn-outline"
                  >
                    <i className="fa-solid fa-arrow-left text-xs" />
                    Back to Lobby
                  </button>
                  <GameRoundInterface roomId={activeRoomId} onRoundComplete={handleBackToLobby} />
                </div>
              )}
            </motion.main>
          )}
        </AnimatePresence>

        <footer className="hud-footer">
          <div className="hud-footer-inner">
            <span>MindClash · Mantle Turing Test Hackathon 2026</span>
          </div>
        </footer>

        <HowItWorks />
      </div>
    </AIAgentProvider>
  );
}
