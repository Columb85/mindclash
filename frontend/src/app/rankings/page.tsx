'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HudConnectButton } from '@/components/ui/HudConnectButton';
import { Navigation, View } from '@/components/layout/Navigation';
import { LiveTicker } from '@/components/dashboard/ActivityFeed';
import { ClashBalance } from '@/components/ui/ClashBalance';
import { OnlineCounter } from '@/components/ui/OnlineCounter';
import { ModeIndicator } from '@/components/ui/ModeIndicator';
import { Leaderboard } from '@/components/dashboard/Leaderboard';

export default function RankingsPage() {
  const [currentView, setCurrentView] = useState<View>('lobby');

  return (
    <div className="min-h-screen">
      {/* ── HUD Topbar ── */}
      <header className="hud-topbar">
        <div className="hud-topbar-inner">
          <Link href="/" className="hud-logo-text">
            <span className="logo-mind">Mind</span>
            <span className="logo-clash">Clash</span>
          </Link>
          <Navigation currentView={currentView} onViewChange={setCurrentView} activePage="rankings" />
          <div className="hud-topbar-right">
            <OnlineCounter />
            <ClashBalance />
            <ModeIndicator />
            <HudConnectButton />
          </div>
        </div>
      </header>

      {/* ── Ticker bar ── */}
      <div className="hud-ticker-bar">
        <div className="hud-shell">
          <LiveTicker />
        </div>
      </div>

      {/* ── Breadcrumb ── */}
      <div className="hud-breadcrumb">
        <div className="hud-shell">
          <span className="bc-cur">
            <i className="fa-solid fa-trophy" style={{ marginRight: 6 }} />
            Rankings
          </span>
        </div>
      </div>

      {/* ── Main ── */}
      <main className="hud-shell py-5">
        <Leaderboard />
      </main>

      {/* ── Footer ── */}
      <footer className="hud-footer">
        <div className="hud-footer-inner">
          MindClash · Mantle Turing Test Hackathon 2026
        </div>
      </footer>
    </div>
  );
}
