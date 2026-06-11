'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Home, MapPinOff } from 'lucide-react';

function NotFoundBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: '#000' }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,212,170,0.045) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,170,0.045) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,212,170,0.12) 0%, transparent 60%)',
      }} />
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
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -20, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.7, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            left: `${10 + (i * 11) % 85}%`,
            top: `${15 + (i * 12) % 75}%`,
            width: 2, height: 2, borderRadius: '50%',
            background: i % 2 === 0 ? '#00D4AA' : '#a855f7',
            boxShadow: `0 0 6px ${i % 2 === 0 ? '#00D4AA' : '#a855f7'}`,
          }}
        />
      ))}
    </div>
  );
}

export default function NotFound() {
  return (
    <div className="relative min-h-screen bg-dark-bg text-white overflow-hidden">
      <NotFoundBackground />

      {/* Nav */}
      <nav
        className="fixed top-0 inset-x-0 z-50"
        style={{
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,212,170,0.1)',
        }}
      >
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-base font-black tracking-tight"
            style={{ background: 'linear-gradient(135deg,#00D4AA,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            MindClash
          </Link>
          <Link href="/app"
            className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm text-black transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg,#00D4AA,#00A896)', boxShadow: '0 0 20px rgba(0,212,170,0.3)' }}
          >
            Launch App <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pt-20 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 120 }}
          className="mb-6 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wide"
          style={{
            background: 'rgba(168,85,247,0.08)',
            border: '1px solid rgba(168,85,247,0.25)',
            color: '#a855f7',
          }}
        >
          <MapPinOff className="w-3.5 h-3.5" />
          Page not found
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="relative mb-4"
        >
          <div style={{
            position: 'absolute', inset: '-40px',
            background: 'radial-gradient(circle, rgba(0,212,170,0.12) 0%, transparent 70%)',
            filter: 'blur(30px)',
          }} />
          <span
            className="relative block font-black leading-none select-none"
            style={{
              fontSize: 'clamp(7rem, 22vw, 14rem)',
              background: 'linear-gradient(135deg, #00D4AA 0%, #00ffcc 35%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 40px rgba(0,212,170,0.25))',
            }}
          >
            404
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl md:text-4xl font-black text-white mb-4"
        >
          This arena doesn&apos;t exist
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-gray-400 text-base md:text-lg max-w-md leading-relaxed mb-10"
        >
          The page you&apos;re looking for was removed, moved, or never entered the battle.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <Link href="/"
            className="group flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-base text-black transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #00D4AA 0%, #00A896 100%)',
              boxShadow: '0 0 30px rgba(0,212,170,0.35)',
            }}
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
          <Link href="/app"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base text-gray-300 transition-all hover:text-white"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Enter the Arena
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Glitch lines decoration */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16 flex flex-col gap-2 w-full max-w-xs"
        >
          {[0.6, 0.4, 0.7].map((w, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.15, 0.4, 0.15], scaleX: [0.8, 1, 0.8] }}
              transition={{ duration: 2 + i, repeat: Infinity, delay: i * 0.4 }}
              style={{
                height: 1,
                width: `${w * 100}%`,
                margin: '0 auto',
                background: `linear-gradient(90deg, transparent, ${i % 2 === 0 ? '#00D4AA' : '#a855f7'}60, transparent)`,
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
