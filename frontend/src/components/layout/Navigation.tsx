'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuests } from '@/contexts/QuestsContext';

export type View = 'lobby' | 'game' | 'profile';

interface NavigationProps {
  currentView: View;
  onViewChange: (view: View) => void;
  activePage?: 'battle' | 'rankings' | 'quests' | 'duel' | 'create-agent'; // For highlighting external page links
}

const NAV_ITEMS: { id: View | 'battle' | 'rankings' | 'quests'; label: string; icon: string; color: string; href?: string }[] = [
  { id: 'lobby',       label: 'Arena',    icon: 'fa-solid fa-border-all',         color: '#a855f7' },
  { id: 'battle',      label: 'Battle',   icon: 'fa-solid fa-khanda',             color: '#ff3355', href: '/battle' },
  { id: 'rankings',    label: 'Rankings', icon: 'fa-solid fa-trophy',             color: '#c9a84c', href: '/rankings' },
  { id: 'quests',      label: 'Quests',   icon: 'fa-solid fa-bullseye',           color: '#39ff90', href: '/quests' },
  { id: 'profile',     label: 'Profile',  icon: 'fa-solid fa-circle-user',        color: '#3b82f6' },
];

const MORE_LINKS = [
  { href: '/agent-lab',   label: 'Agent Lab', desc: 'Mint, test & verify on-chain', icon: 'fa-solid fa-flask',          color: '#00e5ff' },
  { href: '/',            label: 'Home',      desc: 'Back to landing page',           icon: 'fa-solid fa-house',          color: '#00e5ff' },
  { href: '/gauntlet',    label: 'Gauntlet',  desc: 'Beat all 3 champions',           icon: 'fa-solid fa-shield-halved',  color: '#f97316' },
  { href: '/showdown',    label: 'Showdown',  desc: 'Head-to-head battle',            icon: 'fa-solid fa-fire',           color: '#f97316' },
  { href: '/leaderboard', label: 'Rankings',  desc: 'On-chain leaderboard',           icon: 'fa-solid fa-trophy',         color: '#c9a84c' },
  { href: '/verify',      label: 'Verify',    desc: 'On-chain tx proofs',             icon: 'fa-solid fa-circle-check',   color: '#39ff90' },
  { href: '/autonomous',  label: 'Bot Loop',  desc: 'Autonomous agent mode',          icon: 'fa-solid fa-robot',          color: '#00e5ff' },
];

export function Navigation({ currentView, onViewChange, activePage }: NavigationProps) {
  const router = useRouter();
  const { completedCount, totalCount } = useQuests();
  const hasIncompleteQuests = completedCount < totalCount;
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node))
        setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  return (
    /* Outer wrapper — More dropdown lives here, OUTSIDE clipped nav */
    <div className="flex items-center justify-center gap-1">

      {/* Clipped nav — only tab buttons + separators + quick links */}
      <nav className="hud-nav">
        {NAV_ITEMS.map(({ id, label, icon, color, href }) => {
          // Battle is a link to /battle page
          if (href) {
            const isActive = activePage === id;
            return (
              <Link
                key={id}
                href={href}
                prefetch={true}
                className={`hud-nav-btn${isActive ? ' active' : ''}`}
                style={isActive ? { color } : undefined}
              >
                <i className={`${icon} text-[11px]`} style={{ color: isActive ? color : undefined }} />
                <span className="hidden md:inline">{label}</span>
              </Link>
            );
          }
          
          // For regular view buttons - don't highlight if we're on an external page (activePage is set)
          const active = !activePage && currentView === id;
          
          // If on external page, navigate to /app; otherwise switch view
          const handleClick = () => {
            if (activePage) {
              // Navigate to /app - the view will be handled by the app page
              router.push('/app');
            } else {
              onViewChange(id as View);
            }
          };
          
          return (
            <button
              key={id}
              onClick={handleClick}
              className={`hud-nav-btn${active ? ' active' : ''}`}
              style={active ? { color } : undefined}
            >
              <i className={`${icon} text-[11px]`} style={{ color: active ? color : undefined }} />
              <span className="hidden md:inline">{label}</span>
              {id === 'quests' && hasIncompleteQuests && (
                <span
                  className="absolute top-[3px] right-[3px] w-1.5 h-1.5 rounded-full bg-red-500"
                  style={{ boxShadow: '0 0 4px #ff3355' }}
                />
              )}
            </button>
          );
        })}

        <span className="hud-nav-sep" />

        <Link
          href="/duel"
          prefetch={true}
          className={`hud-nav-pill hud-nav-pill-red${activePage === 'duel' ? ' active' : ''}`}
        >
          <i className="fa-solid fa-bolt text-[10px]" />
          <span className="hidden md:inline">Duel</span>
        </Link>
        <Link
          href="/create-agent"
          prefetch={true}
          className={`hud-nav-pill hud-nav-pill-gold${activePage === 'create-agent' ? ' active' : ''}`}
        >
          <i className="fa-solid fa-wand-magic-sparkles text-[10px]" />
          <span className="hidden md:inline">Create Bot</span>
        </Link>
      </nav>

      {/* More dropdown — outside clipped nav so panel isn't cropped */}
      <div className="relative" ref={moreRef}>
        <button
          onClick={() => setMoreOpen(v => !v)}
          className={`hud-more-btn${moreOpen ? ' open' : ''}`}
        >
          <span className="hidden md:inline">More</span>
          <i className={`fa-solid fa-chevron-down text-[9px] transition-transform duration-150${moreOpen ? ' rotate-180' : ''}`} />
        </button>

        {moreOpen && (
          <div className="hud-more-panel">
            {MORE_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMoreOpen(false)}
                className="hud-more-item"
              >
                <span className="hud-more-icon" style={{ borderColor: `${link.color}30` }}>
                  <i className={link.icon} style={{ color: link.color }} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="hud-more-label" style={{ color: link.color }}>{link.label}</div>
                  <div className="hud-more-desc">{link.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
