'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import {
  Brain, Zap, Shield, TrendingUp, TrendingDown, Trophy,
  ArrowRight, Cpu, Globe, Layers, Users,
  BarChart2, Lock, Sparkles, Bot, ChevronDown
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.mindclash.xyz/api';

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to, duration = 2 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = to / (duration * 60);
    const id = setInterval(() => {
      start = Math.min(start + step, to);
      setVal(Math.floor(start));
      if (start >= to) clearInterval(id);
    }, 1000 / 60);
    return () => clearInterval(id);
  }, [inView, to, duration]);
  return <span ref={ref}>{val.toLocaleString()}</span>;
}

// ── Live stats ────────────────────────────────────────────────────────────────
interface Stats { totalRounds: number; totalAgents: number; totalPlayers: number; totalDecisions: number }
function useLiveStats(): Stats {
  const [stats, setStats] = useState<Stats>({ totalRounds: 1247, totalAgents: 3, totalPlayers: 89, totalDecisions: 4821 });
  useEffect(() => {
    Promise.allSettled([
      fetch(`${API_URL}/leaderboard/stats`).then(r => r.json()),
      fetch(`${API_URL}/contracts/stats`).then(r => r.json()),
    ]).then(([lb, cs]) => {
      const l = lb.status === 'fulfilled' ? lb.value : null;
      const c = cs.status === 'fulfilled' ? cs.value : null;
      setStats(prev => ({
        totalRounds:    c?.stats?.totalRounds    ?? prev.totalRounds,
        totalAgents:    l?.stats?.totalAgents    ?? prev.totalAgents,
        totalPlayers:   c?.stats?.totalPlayers   ?? prev.totalPlayers,
        totalDecisions: l?.stats?.totalDecisions ?? prev.totalDecisions,
      }));
    });
  }, []);
  return stats;
}

// ── Animated grid background ──────────────────────────────────────────────────
function GridBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Solid black base — covers the global layout Background */}
      <div style={{ position: 'absolute', inset: 0, background: '#000' }} />

      {/* Grid lines */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,212,170,0.045) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,170,0.045) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      {/* Radial fade overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,212,170,0.12) 0%, transparent 60%)',
      }} />

      {/* ── Glowing orbs (existing) ── */}
      <motion.div
        animate={{ x: [0, 40, 0], y: [0, -30, 0], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: '15%', left: '10%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,170,0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <motion.div
        animate={{ x: [0, -50, 0], y: [0, 40, 0], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{
          position: 'absolute', top: '40%', right: '5%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, 50, 0], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        style={{
          position: 'absolute', bottom: '10%', left: '30%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      {/* ── Floating particles (existing) ── */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`p${i}`}
          animate={{ y: [0, -20, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.7, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            left: `${8 + (i * 8) % 90}%`,
            top: `${10 + (i * 13) % 80}%`,
            width: i % 3 === 0 ? 3 : 2, height: i % 3 === 0 ? 3 : 2,
            borderRadius: '50%',
            background: i % 2 === 0 ? '#00D4AA' : '#a855f7',
            boxShadow: `0 0 6px ${i % 2 === 0 ? '#00D4AA' : '#a855f7'}`,
          }}
        />
      ))}

      {/* ── Scanning horizontal lines ── */}
      {[0.2, 0.55, 0.8].map((startY, i) => (
        <motion.div
          key={`scan${i}`}
          initial={{ x: '-100%', opacity: 0 }}
          animate={{ x: ['−100%', '110%'], opacity: [0, 0.6, 0.6, 0] }}
          transition={{
            duration: 4 + i * 1.5,
            repeat: Infinity,
            delay: i * 3.5 + 2,
            ease: 'easeInOut',
            repeatDelay: 6,
          }}
          style={{
            position: 'absolute',
            top: `${startY * 100}%`,
            left: 0, right: 0,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${i % 2 === 0 ? '#00D4AA' : '#a855f7'}60, transparent)`,
          }}
        />
      ))}

      {/* ── Floating hexagons ── */}
      {[
        { x: '8%',  y: '20%', size: 40, color: '#00D4AA', dur: 7,  delay: 0 },
        { x: '88%', y: '15%', size: 30, color: '#a855f7', dur: 9,  delay: 1.5 },
        { x: '75%', y: '60%', size: 50, color: '#00D4AA', dur: 11, delay: 3 },
        { x: '5%',  y: '70%', size: 35, color: '#3b82f6', dur: 8,  delay: 2 },
        { x: '50%', y: '85%', size: 28, color: '#a855f7', dur: 10, delay: 0.5 },
        { x: '92%', y: '45%', size: 22, color: '#00D4AA', dur: 6,  delay: 4 },
      ].map(({ x, y, size, color, dur, delay }, i) => (
        <motion.div
          key={`hex${i}`}
          animate={{ y: [0, -15, 0], rotate: [0, 60, 0], opacity: [0.12, 0.28, 0.12] }}
          transition={{ duration: dur, repeat: Infinity, delay, ease: 'easeInOut' }}
          style={{
            position: 'absolute', left: x, top: y,
            width: size, height: size,
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            background: `linear-gradient(135deg, ${color}30, ${color}08)`,
            border: `1px solid ${color}40`,
          }}
        />
      ))}

      {/* ── Diagonal data streams ── */}
      {[
        { left: '15%', color: '#00D4AA', dur: 5,  delay: 0 },
        { left: '40%', color: '#a855f7', dur: 7,  delay: 2 },
        { left: '65%', color: '#3b82f6', dur: 6,  delay: 4 },
        { left: '85%', color: '#00D4AA', dur: 8,  delay: 1 },
      ].map(({ left, color, dur, delay }, i) => (
        <motion.div
          key={`stream${i}`}
          animate={{ y: ['-10%', '110%'], opacity: [0, 1, 0] }}
          transition={{ duration: dur, repeat: Infinity, delay, ease: 'linear', repeatDelay: 3 }}
          style={{
            position: 'absolute', left,
            top: 0,
            width: 1,
            height: 60 + i * 20,
            background: `linear-gradient(180deg, transparent, ${color}80, transparent)`,
          }}
        />
      ))}

      {/* ── Corner accent brackets ── */}
      {[
        { top: 80, left: 80, rotate: 0 },
        { top: 80, right: 80, rotate: 90 },
        { bottom: 80, right: 80, rotate: 180 },
        { bottom: 80, left: 80, rotate: 270 },
      ].map((pos, i) => (
        <motion.div
          key={`corner${i}`}
          animate={{ opacity: [0.08, 0.2, 0.08] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.7 }}
          style={{
            position: 'absolute', ...pos,
            width: 30, height: 30,
            borderTop: '1px solid #00D4AA',
            borderLeft: '1px solid #00D4AA',
            transform: `rotate(${pos.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}

// ── Fade-in section ───────────────────────────────────────────────────────────
function Section({ children, className = '', id, style }: { children: React.ReactNode; className?: string; id?: string; style?: React.CSSProperties }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-120px' });
  return (
    <motion.section ref={ref} id={id}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0.4, y: 12 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={className}
      style={style}
    >
      {children}
    </motion.section>
  );
}

// ── Gradient border card ──────────────────────────────────────────────────────
function GlassCard({ children, className = '', accent = '#00D4AA' }: { children: React.ReactNode; className?: string; accent?: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'rgba(26,26,26,0.6)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${hovered ? accent + '60' : 'rgba(42,42,42,0.8)'}`,
        boxShadow: hovered ? `0 0 30px ${accent}18, inset 0 0 30px ${accent}05` : 'none',
        transition: 'all 0.3s ease',
        borderRadius: 20,
      }}
      className={className}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const stats = useLiveStats();
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, -40]);
  return (
    <div className="relative min-h-screen bg-dark-bg text-white overflow-x-hidden">
      <GridBackground />

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 inset-x-0 z-50"
        style={{
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,212,170,0.1)',
        }}
      >
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <span className="text-base font-black tracking-tight" style={{ background: 'linear-gradient(135deg,#00D4AA,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>MindClash</span>
          <div className="hidden md:flex items-center gap-7 text-sm text-gray-400">
            {[['#how-it-works','How It Works'],['#features','Features'],['#tech','Tech Stack']].map(([href, label]) => (
              <a key={href} href={href}
                className="hover:text-white transition-colors relative group">
                {label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-[#00D4AA] group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </div>
          <Link href="/app"
            className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm text-black transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg,#00D4AA,#00A896)', boxShadow: '0 0 20px rgba(0,212,170,0.3)' }}
          >
            Launch App <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </motion.nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className="relative flex flex-col items-center pt-28 pb-20 px-6" style={{ zIndex: 1, minHeight: '100vh' }}>
        {/* Parallax only on headline block — stats stay visible while scrolling */}
        <motion.div style={{ y: heroY }} className="flex flex-col items-center">

          {/* Hackathon badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="mb-8 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wide"
            style={{
              background: 'rgba(0,212,170,0.08)',
              border: '1px solid rgba(0,212,170,0.25)',
              color: '#00D4AA',
              boxShadow: '0 0 20px rgba(0,212,170,0.1)',
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Mantle Turing Test Hackathon 2026
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] animate-pulse" />
          </motion.div>

          {/* BIG LOGO */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, type: 'spring', stiffness: 120 }}
            className="mb-6 relative"
          >
            <div style={{
              position: 'absolute', inset: '-30px',
              background: 'radial-gradient(circle, rgba(0,212,170,0.15) 0%, transparent 70%)',
              filter: 'blur(20px)',
              borderRadius: '50%',
            }} />
            <img
              src="/mindclash-logo.png"
              alt="MindClash"
              className="relative"
              style={{ height: 160, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 30px rgba(0,212,170,0.4))' }}
            />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black text-center tracking-tight leading-none max-w-5xl"
          >
            <span className="text-white">AI vs Human</span>
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #00D4AA 0%, #00ffcc 40%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Prediction War
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mt-6 text-lg md:text-xl text-gray-400 text-center max-w-2xl leading-relaxed"
          >
            Challenge neural network agents in real-time crypto price battles.
            Stake{' '}<span className="text-[#00D4AA] font-semibold">$CLASH</span>, earn Points,
            record decisions on{' '}<span className="text-white font-semibold">Mantle blockchain</span>.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mt-9 flex flex-col sm:flex-row items-center gap-4"
          >
            <Link href="/app"
              className="group relative flex items-center gap-3 px-9 py-4 rounded-2xl font-black text-base text-black overflow-hidden transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #00D4AA 0%, #00A896 100%)',
                boxShadow: '0 0 40px rgba(0,212,170,0.45), 0 4px 20px rgba(0,0,0,0.4)',
              }}
            >
              <span className="relative z-10">Enter the Arena</span>
              <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #00ffcc 0%, #00D4AA 100%)' }} />
            </Link>
            <a href="#how-it-works"
              className="flex items-center gap-2 px-9 py-4 rounded-2xl font-bold text-base text-gray-300 transition-all hover:text-white"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              How it works <ChevronDown className="w-4 h-4" />
            </a>
          </motion.div>
        </motion.div>

        {/* Live stats — outside parallax fade, always visible */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl w-full"
        >
            {[
              { label: 'Rounds Played',  value: stats.totalRounds,    icon: BarChart2, color: '#00D4AA', suffix: '' },
              { label: 'AI Agents',      value: stats.totalAgents,    icon: Bot,       color: '#a855f7', suffix: '' },
              { label: 'Players',        value: stats.totalPlayers,   icon: Users,     color: '#3b82f6', suffix: '' },
              { label: 'AI Decisions',   value: stats.totalDecisions, icon: Brain,     color: '#f59e0b', suffix: '' },
            ].map(({ label, value, icon: Icon, color }, idx) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 + idx * 0.08 }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
              >
                <GlassCard accent={color} className="p-5 flex flex-col items-center text-center relative overflow-hidden">
                  {/* Glow backdrop */}
                  <div style={{
                    position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
                    width: 80, height: 80, borderRadius: '50%',
                    background: color + '18', filter: 'blur(20px)',
                  }} />
                  {/* Icon with gradient ring */}
                  <div className="relative mb-3" style={{ width: 52, height: 52 }}>
                    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} viewBox="0 0 52 52">
                      <defs>
                        <linearGradient id={`ig${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={color} stopOpacity="0.8" />
                          <stop offset="100%" stopColor={color} stopOpacity="0.2" />
                        </linearGradient>
                      </defs>
                      <circle cx="26" cy="26" r="24" fill={color + '12'} stroke={`url(#ig${idx})`} strokeWidth="1.5" />
                    </svg>
                    <div style={{
                      position:'absolute', inset:0,
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <Icon style={{ width: 22, height: 22, color }} strokeWidth={1.8} />
                    </div>
                  </div>
                  {/* Number */}
                  <div className="text-2xl font-black leading-none" style={{
                    background: `linear-gradient(135deg, #fff 0%, ${color} 100%)`,
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>
                    <Counter to={value} />
                  </div>
                  {/* Label */}
                  <div className="text-[11px] text-gray-500 mt-1.5 leading-tight">{label}</div>
                  {/* Bottom accent bar */}
                  <div style={{
                    position:'absolute', bottom:0, left:'20%', right:'20%',
                    height: 2, borderRadius: 1,
                    background: `linear-gradient(90deg, transparent, ${color}80, transparent)`,
                  }} />
                </GlassCard>
              </motion.div>
            ))}
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-12 flex flex-col items-center gap-2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 rounded-full flex items-start justify-center pt-2"
            style={{ border: '1px solid rgba(0,212,170,0.3)' }}
          >
            <div className="w-1 h-2 rounded-full bg-[#00D4AA]" />
          </motion.div>
        </motion.div>
      </div>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <Section id="how-it-works" className="py-20 px-6 relative -mt-8" style={{ zIndex: 1 }}>
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <motion.div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
              style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)', color: '#00D4AA' }}>
              <Zap className="w-3 h-3" /> How It Works
            </motion.div>
            <h2 className="text-4xl md:text-5xl font-black text-white">Three Steps to Battle</h2>
          </div>

          <div className="relative grid md:grid-cols-3 gap-6">
            {/* connector line */}
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,170,0.3), transparent)' }} />

            {[
              { step:'01', icon: Zap,         title:'Connect & Get $CLASH',    desc:'Connect your wallet on Mantle Sepolia. Use the faucet to get free $CLASH tokens to start playing.', color:'#00D4AA' },
              { step:'02', icon: TrendingUp,  title:'Join a Prediction Round', desc:'Pick BTC, ETH or MNT. Predict UP or DOWN against a Groq-powered AI agent within the time window.', color:'#a855f7' },
              { step:'03', icon: Trophy,      title:'Win & Earn Points',       desc:'Correct predictions win the pool. AI decisions are recorded on-chain. Climb the leaderboard.', color:'#f59e0b' },
            ].map(({ step, icon: Icon, title, desc, color }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
              >
                <GlassCard accent={color} className="relative p-7 h-full">
                  {/* Step number */}
                  <div className="absolute top-5 right-5 text-6xl font-black select-none"
                    style={{ color: color + '10', lineHeight: 1 }}>{step}</div>

                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                    style={{ background: `linear-gradient(135deg, ${color}25, ${color}10)`, border: `1px solid ${color}30` }}>
                    <Icon className="w-6 h-6" style={{ color }} />
                  </div>
                  <div className="text-[11px] font-bold tracking-widest uppercase mb-2" style={{ color }}>Step {step}</div>
                  <h3 className="text-lg font-black text-white mb-3">{title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <Section id="features" className="py-28 px-6 relative" style={{ zIndex: 1 }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, transparent 0%, rgba(0,212,170,0.02) 50%, transparent 100%)',
        }} />
        <div className="container mx-auto max-w-5xl relative">
          <div className="text-center mb-16">
            <motion.div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
              style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', color: '#a855f7' }}>
              <Sparkles className="w-3 h-3" /> Features
            </motion.div>
            <h2 className="text-4xl md:text-5xl font-black text-white">Built Different</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {[
              { icon: Brain,  title:'Neural Network AI Agents',   desc:'Three bots powered by Groq LLaMA-70B make real-time decisions using market data, technical analysis and LLM reasoning. Not random — actual intelligence.', accent:'#00D4AA', tag:'Groq AI' },
              { icon: Shield, title:'On-Chain Decision Records',  desc:'Every AI prediction is signed and recorded on Mantle blockchain via smart contracts. Fully transparent, verifiable, immutable history.', accent:'#a855f7', tag:'Mantle' },
              { icon: Cpu,    title:'Mint Your Own AI Agent',     desc:'Users can mint ERC-8004 Agent NFTs that use the same LLM engine to generate decisions. Sign transactions directly from your wallet.', accent:'#f59e0b', tag:'ERC-8004 NFT' },
              { icon: Layers, title:'Dual Stack Protocol',        desc:'AI Benchmark Stack measures neural network performance. Game Protocol handles prediction rounds, staking and reward distribution.', accent:'#3b82f6', tag:'Protocol' },
              { icon: Globe,  title:'Live Price Oracle',          desc:'Real-time BTC, ETH and MNT prices via Pyth Network oracle integration. All predictions resolve against actual market data feeds.', accent:'#10b981', tag:'Pyth Oracle' },
              { icon: Lock,   title:'Fair & Transparent',         desc:'All game logic lives on-chain. Smart contracts handle staking, round resolution and reward distribution — no hidden house edge.', accent:'#ef4444', tag:'Smart Contracts' },
            ].map(({ icon: Icon, title, desc, accent, tag }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 2) * 0.1 + Math.floor(i / 2) * 0.15, duration: 0.6 }}
              >
                <GlassCard accent={accent} className="flex gap-5 p-6 h-full">
                  <div className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center self-start"
                    style={{
                      background: `linear-gradient(135deg, ${accent}20, ${accent}08)`,
                      border: `1px solid ${accent}30`,
                      boxShadow: `0 0 20px ${accent}15`,
                    }}>
                    <Icon className="w-7 h-7" style={{ color: accent }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-base font-black text-white">{title}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: accent + '15', color: accent, border: `1px solid ${accent}30` }}>{tag}</span>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── LIVE AI PREVIEW ───────────────────────────────────────────────── */}
      <Section className="py-28 px-6 relative" style={{ zIndex: 1 }}>
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] animate-pulse" /> Live Preview
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">AI Thinking in Real-Time</h2>
          <p className="text-gray-400 mb-12 max-w-lg mx-auto text-base">
            Watch bots analyze market conditions and post on-chain predictions using Groq's fastest inference.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { name:'ATLAS', asset:'BTC/USD', dir:'UP',   conf:78, color:'#00D4AA', delay:0 },
              { name:'NEXUS', asset:'ETH/USD', dir:'DOWN', conf:65, color:'#a855f7', delay:0.15 },
              { name:'VOID',  asset:'MNT/USD', dir:'UP',   conf:82, color:'#3b82f6', delay:0.3 },
            ].map(({ name, asset, dir, conf, color, delay }) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay, duration: 0.5 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <GlassCard accent={color} className="p-5 text-left">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg,${color}30,${color}10)`, border:`1px solid ${color}40` }}>
                        <Bot className="w-4.5 h-4.5" style={{ color }} />
                      </div>
                      <div>
                        <div className="font-black text-sm" style={{ color }}>{name}</div>
                        <div className="text-[10px] text-gray-500">AI Agent</div>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background:'rgba(0,212,170,0.1)', color:'#00D4AA', border:'1px solid rgba(0,212,170,0.2)' }}>
                      <span className="w-1 h-1 rounded-full bg-[#00D4AA] animate-pulse" />
                      ON-CHAIN
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 mb-1 font-mono">{asset}</div>
                  <div className="flex items-center gap-2 mb-4">
                    {dir === 'UP'
                      ? <TrendingUp className="w-5 h-5 text-[#00D4AA]" />
                      : <TrendingDown className="w-5 h-5 text-[#ff3366]" />
                    }
                    <span className="text-2xl font-black" style={{ color: dir === 'UP' ? '#00D4AA' : '#ff3366' }}>{dir}</span>
                    <span className="text-xs text-gray-500 ml-auto">{conf}%</span>
                  </div>

                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${conf}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: delay + 0.3, duration: 1, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${color}, ${color}90)` }}
                    />
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── TECH STACK ────────────────────────────────────────────────────── */}
      <Section id="tech" className="py-28 px-6 relative" style={{ zIndex: 1 }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(0,212,170,0.03) 0%, transparent 70%)',
        }} />
        <div className="container mx-auto max-w-4xl text-center relative">
          <motion.div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
            <Cpu className="w-3 h-3" /> Technology
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-14">Built On The Best</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { name:'Mantle Network', role:'L2 Blockchain', desc:'Fast EVM L2 for on-chain game logic & transactions',   color:'#00D4AA', dot:'M' },
              { name:'Groq',           role:'AI Inference',  desc:'LLaMA-70B for real-time neural bot decisions',          color:'#f97316', dot:'G' },
              { name:'Pyth Oracle',    role:'Price Feeds',   desc:'Sub-second real-time crypto price data on-chain',       color:'#a855f7', dot:'P' },
              { name:'RainbowKit',     role:'Web3 UX',       desc:'Seamless wallet connect & transaction signing',         color:'#3b82f6', dot:'R' },
            ].map(({ name, role, desc, color, dot }, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
              >
                <GlassCard accent={color} className="p-6 text-left h-full">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 font-black text-lg"
                    style={{
                      background: `linear-gradient(135deg, ${color}30, ${color}10)`,
                      border: `1px solid ${color}40`,
                      color,
                      boxShadow: `0 0 20px ${color}20`,
                    }}
                  >{dot}</div>
                  <div className="text-[11px] font-bold tracking-wider uppercase mb-1" style={{ color }}>{role}</div>
                  <div className="text-base font-black text-white mb-2">{name}</div>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <Section className="py-32 px-6 relative" style={{ zIndex: 1 }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,212,170,0.06) 0%, transparent 70%)',
        }} />
        <div className="container mx-auto max-w-2xl text-center relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, type: 'spring' }}
            className="mb-8 relative inline-block"
          >
            <div style={{
              position: 'absolute', inset: '-40px',
              background: 'radial-gradient(circle, rgba(0,212,170,0.2) 0%, transparent 65%)',
              filter: 'blur(20px)',
            }} />
            <img src="/mindclash-logo.png" alt="MindClash"
              style={{ height: 140, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 40px rgba(0,212,170,0.5))' }}
              className="relative mx-auto"
            />
          </motion.div>

          <h2 className="text-5xl md:text-6xl font-black text-white mb-4 leading-tight">
            Ready to<br />
            <span style={{
              background: 'linear-gradient(135deg, #00D4AA 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Beat the AI?</span>
          </h2>
          <p className="text-gray-400 mb-10 text-lg">
            Connect your wallet, get free $CLASH and start predicting.
          </p>
          <Link href="/app"
            className="inline-flex items-center gap-3 px-12 py-5 rounded-2xl font-black text-lg text-black transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #00D4AA 0%, #00A896 100%)',
              boxShadow: '0 0 60px rgba(0,212,170,0.5), 0 8px 30px rgba(0,0,0,0.4)',
            }}
          >
            Launch App <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="mt-5 text-xs text-gray-600">
            Testnet · Mantle Sepolia · No real funds required
          </div>
        </div>
      </Section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="relative py-10 px-6" style={{ zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <span>MindClash © 2026</span>
          <div className="flex items-center gap-5">
            <span>Mantle Turing Test Hackathon</span>
            <span className="text-gray-700">·</span>
            <a href="https://github.com" className="hover:text-gray-400 transition-colors">GitHub</a>
            <span className="text-gray-700">·</span>
            <Link href="/app" className="hover:text-[#00D4AA] transition-colors">Launch App</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
