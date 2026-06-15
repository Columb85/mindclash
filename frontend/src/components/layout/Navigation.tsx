'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useQuests } from '@/contexts/QuestsContext';

export type View = 'lobby' | 'game' | 'profile';

interface NavigationProps {
  currentView: View;
  onViewChange: (view: View) => void;
  activePage?: string;
}

const NAV_ITEMS: { id: View | 'battle' | 'rankings' | 'quests'; label: string; icon: string; color: string; href?: string }[] = [
  { id: 'lobby',       label: 'Arena',    icon: 'fa-solid fa-border-all',         color: '#a855f7' },
  { id: 'battle',      label: 'Battle',   icon: 'fa-solid fa-khanda',             color: '#ff3355', href: '/battle' },
  { id: 'rankings',    label: 'Rankings', icon: 'fa-solid fa-trophy',             color: '#c9a84c', href: '/rankings' },
  { id: 'quests',      label: 'Quests',   icon: 'fa-solid fa-bullseye',           color: '#39ff90', href: '/quests' },
  { id: 'profile',     label: 'Profile',  icon: 'fa-solid fa-circle-user',        color: '#3b82f6' },
];

const QUICK_LINKS = [
  { href: '/duel',         id: 'duel',         label: 'Duel',       desc: '1v1 prediction duel',           icon: 'fa-solid fa-bolt',                color: '#ff3355' },
  { href: '/create-agent', id: 'create-agent', label: 'Create Bot', desc: 'Build and deploy your agent',   icon: 'fa-solid fa-wand-magic-sparkles', color: '#fbbf24' },
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
  const pathname = usePathname();
  const { completedCount, totalCount } = useQuests();
  const hasIncompleteQuests = completedCount < totalCount;
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [morePanelPos, setMorePanelPos] = useState({ top: 0, left: 0 });
  const moreRef = useRef<HTMLDivElement>(null);
  const morePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeMenus = () => {
    setMoreOpen(false);
    setMobileOpen(false);
  };

  useEffect(() => {
    closeMenus();
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (moreRef.current?.contains(target)) return;
      if (morePanelRef.current?.contains(target)) return;
      setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  useEffect(() => {
    if (!moreOpen || !moreRef.current) return;

    const updatePos = () => {
      const btn = moreRef.current?.querySelector('.hud-more-btn');
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setMorePanelPos({
        top: rect.bottom + 6,
        left: Math.max(8, rect.right - 220),
      });
    };

    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [moreOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    const scrollY = window.scrollY;
    document.body.classList.add('hud-mobile-menu-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';

    return () => {
      document.body.classList.remove('hud-mobile-menu-open');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [mobileOpen]);

  const isNavItemActive = (id: string, href?: string) => {
    if (href) return activePage === id;
    return !activePage && currentView === id;
  };

  const handleViewNav = (id: View) => {
    closeMenus();
    if (activePage) {
      router.push(id === 'profile' ? '/app?view=profile' : '/app', { scroll: false });
    } else {
      onViewChange(id);
    }
  };

  const moreMenu = mounted && moreOpen ? createPortal(
    <div
      ref={morePanelRef}
      className="hud-more-panel hud-more-panel--portal"
      style={{ top: morePanelPos.top, left: morePanelPos.left }}
    >
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
    </div>,
    document.body,
  ) : null;

  const mobileMenu = mounted && mobileOpen ? createPortal(
    <>
      <div className="hud-mobile-menu-backdrop" onClick={closeMenus} aria-hidden />
      <div className="hud-mobile-menu-panel" role="dialog" aria-label="Navigation menu">
        <div className="hud-mobile-menu-section">
          <div className="hud-mobile-menu-heading">Main</div>
          {NAV_ITEMS.map(({ id, label, icon, color, href }) => {
            const active = isNavItemActive(id, href);
            if (href) {
              return (
                <Link
                  key={id}
                  href={href}
                  onClick={closeMenus}
                  className={`hud-mobile-menu-item${active ? ' active' : ''}`}
                  style={active ? { borderColor: `${color}55` } : undefined}
                >
                  <span className="hud-mobile-menu-icon" style={{ color }}>
                    <i className={icon} />
                  </span>
                  <span className="hud-mobile-menu-label">{label}</span>
                  {active && <i className="fa-solid fa-chevron-right hud-mobile-menu-arrow" style={{ color }} />}
                </Link>
              );
            }
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleViewNav(id as View)}
                className={`hud-mobile-menu-item${active ? ' active' : ''}`}
                style={active ? { borderColor: `${color}55` } : undefined}
              >
                <span className="hud-mobile-menu-icon" style={{ color }}>
                  <i className={icon} />
                </span>
                <span className="hud-mobile-menu-label">{label}</span>
                {id === 'quests' && hasIncompleteQuests && <span className="hud-nav-badge hud-nav-badge--menu" />}
                {active && <i className="fa-solid fa-chevron-right hud-mobile-menu-arrow" style={{ color }} />}
              </button>
            );
          })}
        </div>

        <div className="hud-mobile-menu-section">
          <div className="hud-mobile-menu-heading">Quick Actions</div>
          {QUICK_LINKS.map(({ href, id, label, icon, color }) => {
            const active = activePage === id;
            return (
              <Link
                key={id}
                href={href}
                onClick={closeMenus}
                className={`hud-mobile-menu-item${active ? ' active' : ''}`}
                style={active ? { borderColor: `${color}55` } : undefined}
              >
                <span className="hud-mobile-menu-icon" style={{ color }}>
                  <i className={icon} />
                </span>
                <span className="hud-mobile-menu-label">{label}</span>
                {active && <i className="fa-solid fa-chevron-right hud-mobile-menu-arrow" style={{ color }} />}
              </Link>
            );
          })}
        </div>

        <div className="hud-mobile-menu-section">
          <div className="hud-mobile-menu-heading">More</div>
          {MORE_LINKS.map(link => {
            const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenus}
                className={`hud-mobile-menu-item hud-mobile-menu-item--compact${active ? ' active' : ''}`}
                style={active ? { borderColor: `${link.color}55` } : undefined}
              >
                <span className="hud-mobile-menu-icon hud-mobile-menu-icon--sm" style={{ color: link.color }}>
                  <i className={link.icon} />
                </span>
                <div className="hud-mobile-menu-text">
                  <span className="hud-mobile-menu-label">{link.label}</span>
                  <span className="hud-mobile-menu-desc">{link.desc}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>,
    document.body,
  ) : null;

  return (
    <>
    <div className="hud-topbar-nav-center">
      {/* ── Desktop nav ─────────────────────────────────────────────────── */}
      <div className="hud-nav-desktop">
        <nav className="hud-nav">
          {NAV_ITEMS.map(({ id, label, icon, color, href }) => {
            if (href) {
              const isActive = activePage === id;
              return (
                <Link
                  key={id}
                  href={href}
                  prefetch={true}
                  scroll={false}
                  className={`hud-nav-btn${isActive ? ' active' : ''}`}
                  style={isActive ? { color } : undefined}
                >
                  <i className={icon} style={{ color: isActive ? color : undefined }} />
                  <span>{label}</span>
                </Link>
              );
            }

            const active = !activePage && currentView === id;
            return (
              <button
                key={id}
                onClick={() => handleViewNav(id as View)}
                className={`hud-nav-btn${active ? ' active' : ''}`}
                style={active ? { color } : undefined}
              >
                <i className={icon} style={{ color: active ? color : undefined }} />
                <span>{label}</span>
                {id === 'quests' && hasIncompleteQuests && (
                  <span className="hud-nav-badge" />
                )}
              </button>
            );
          })}

          <span className="hud-nav-sep" />

          {QUICK_LINKS.map(({ href, id, label, icon }) => (
            <Link
              key={id}
              href={href}
              prefetch={true}
              scroll={false}
              className={`hud-nav-pill hud-nav-pill-${id === 'duel' ? 'red' : 'gold'}${activePage === id ? ' active' : ''}`}
            >
              <i className={icon} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="hud-nav-more-wrap" ref={moreRef}>
          <button
            type="button"
            onClick={() => {
              const btn = moreRef.current?.querySelector('.hud-more-btn');
              if (btn) {
                const rect = btn.getBoundingClientRect();
                setMorePanelPos({
                  top: rect.bottom + 6,
                  left: Math.max(8, rect.right - 220),
                });
              }
              setMoreOpen(v => !v);
            }}
            className={`hud-more-btn${moreOpen ? ' open' : ''}`}
            aria-expanded={moreOpen}
          >
            <span>More</span>
            <i className={`fa-solid fa-chevron-down transition-transform duration-150${moreOpen ? ' rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Mobile menu button ──────────────────────────────────────────── */}
      <button
        type="button"
        className={`hud-mobile-menu-btn${mobileOpen ? ' open' : ''}`}
        onClick={() => setMobileOpen(v => !v)}
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileOpen}
      >
        <i className={`fa-solid ${mobileOpen ? 'fa-xmark' : 'fa-bars'}`} />
      </button>
    </div>
    {moreMenu}
    {mobileMenu}
    </>
  );
}
