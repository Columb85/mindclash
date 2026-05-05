'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Twitter, Github, Globe } from 'lucide-react';

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  duration: Math.random() * 8 + 4,
  delay: Math.random() * 4,
}));

function FloatingParticle({ x, y, size, duration, delay }: { x: number; y: number; size: number; duration: number; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-purple-500/30 pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
      animate={{ y: [0, -40, 0], opacity: [0.2, 0.6, 0.2] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

export function MaintenancePage() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#07070f] flex items-center justify-center relative overflow-hidden">

      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[80px]" />
      </div>

      {/* Floating particles */}
      {PARTICLES.map(p => <FloatingParticle key={p.id} {...p} />)}

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 max-w-lg w-full mx-4"
      >
        {/* Gradient border wrapper */}
        <div className="relative rounded-3xl p-[1px] bg-gradient-to-br from-purple-500/40 via-blue-500/20 to-cyan-500/40">
          <div className="rounded-3xl bg-gradient-to-br from-[#12121e] to-[#0a0a14] p-8 sm:p-12 text-center">

            {/* Title — wordmark only (no image logo) */}
            <motion.div
              className="mb-8 text-center"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 120 }}
            >
              <h1 className="text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent tracking-tight">
                MindClash
              </h1>
              <p className="text-[11px] text-purple-400 font-semibold uppercase tracking-[0.15em] mt-1">
                Where Minds Collide
              </p>
            </motion.div>

            {/* Status icon */}
            <motion.div
              className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 flex items-center justify-center mx-auto mb-6"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            >
              <motion.div
                animate={{ rotate: [360, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              >
                <Zap className="w-9 h-9 text-yellow-400" />
              </motion.div>
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-3xl sm:text-4xl font-black text-white mb-3 leading-tight"
            >
              Updating{dots}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-gray-400 text-base leading-relaxed mb-8"
            >
              We are performing scheduled platform maintenance.<br />
              We&apos;ll be back shortly with improvements!
            </motion.p>

            {/* Status bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-[#0d0d1a] rounded-2xl p-5 mb-8 border border-[#1e1e36]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Status</span>
                <span className="text-xs text-yellow-400 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse inline-block" />
                  In progress
                </span>
              </div>
              <div className="space-y-2.5 text-sm">
                {[
                  { label: 'Frontend',      done: true  },
                  { label: 'API Backend',   done: true  },
                  { label: 'Smart Contracts', done: true },
                  { label: 'AI Agents',     done: false },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-gray-400">{item.label}</span>
                    {item.done ? (
                      <span className="text-green-400 text-xs font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                        Done
                      </span>
                    ) : (
                      <span className="text-yellow-400 text-xs font-semibold flex items-center gap-1.5">
                        <motion.span
                          className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                        Updating
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Mantle badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00D4AA]/10 border border-[#00D4AA]/20 text-[#00D4AA] text-xs font-semibold mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-[#00D4AA] animate-pulse" />
              Powered by Mantle Network
            </motion.div>

            {/* Social links */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="flex items-center justify-center gap-4"
            >
              {[
                { href: 'https://twitter.com', icon: <Twitter className="w-4 h-4" />, label: 'Twitter' },
                { href: 'https://github.com',  icon: <Github className="w-4 h-4" />,  label: 'GitHub'  },
                { href: 'https://mindclash.xyz', icon: <Globe className="w-4 h-4" />, label: 'Website' },
              ].map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-[#1a1a2e] border border-[#2a2a44] flex items-center justify-center text-gray-500 hover:text-white hover:border-purple-500/50 hover:bg-purple-500/10 transition-all duration-200"
                  title={link.label}
                >
                  {link.icon}
                </a>
              ))}
            </motion.div>

          </div>
        </div>

        {/* Bottom text */}
        <p className="text-center text-[11px] text-gray-700 mt-4">
          © 2026 MindClash · Mantle Sepolia Testnet
        </p>
      </motion.div>
    </div>
  );
}
