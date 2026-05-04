'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Zap, Target } from 'lucide-react';
import { Achievement } from '@/contexts/PlayerContext';

interface AchievementToastProps {
  achievement: Achievement | null;
  onClose?: () => void;
}

const iconMap: Record<string, React.ElementType> = {
  trophy: Trophy,
  star:   Star,
  zap:    Zap,
  target: Target,
  '🏆':  Trophy,
  '⭐':  Star,
  '🌟':  Star,
  '⚡':  Zap,
  '🎯':  Target,
};

const colorMap: Record<Achievement['type'], string> = {
  bronze:   'from-orange-500 to-orange-700',
  silver:   'from-gray-400 to-gray-600',
  gold:     'from-yellow-400 to-yellow-600',
  platinum: 'from-purple-400 to-purple-600',
};

export function AchievementToast({ achievement, onClose }: AchievementToastProps) {
  React.useEffect(() => {
    if (achievement && onClose) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  if (!achievement) return null;

  const Icon      = iconMap[achievement.icon] ?? Trophy;
  const gradient  = colorMap[achievement.type] ?? colorMap.gold;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -100, scale: 0.8 }}
        className="fixed top-4 right-4 z-50 max-w-md"
      >
        <div className={`bg-gradient-to-r ${gradient} p-1 rounded-lg shadow-2xl`}>
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="flex items-start gap-4">
              <div className={`bg-gradient-to-br ${gradient} p-3 rounded-full`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">
                  🎉 Achievement Unlocked!
                </h3>
                <p className="text-xl font-bold text-white mb-1">
                  {achievement.title}
                </p>
                <p className="text-sm text-gray-300">
                  {achievement.description}
                </p>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
