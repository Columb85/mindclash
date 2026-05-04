'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Target } from 'lucide-react';
import { useQuests, Quest } from '@/contexts/QuestsContext';

function QuestRow({ q }: { q: Quest }) {
  const pct = Math.min(100, (q.progress / q.target) * 100);
  return (
    <div className={`p-3 rounded-lg border transition ${
      q.completed
        ? 'bg-green-500/10 border-green-500/30'
        : 'bg-dark-bg/60 border-dark-border hover:border-blue-500/40'
    }`}>
      <div className="flex items-start gap-2">
        <span className="text-xl flex-shrink-0">{q.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-sm text-white truncate">{q.title}</div>
            {q.completed ? (
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : (
              <span className="text-[10px] text-blue-400 font-semibold whitespace-nowrap">+{q.rewardXp} PTS</span>
            )}
          </div>
          <div className="text-xs text-gray-400 mb-2">{q.description}</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-dark-bg rounded-full overflow-hidden">
              <motion.div
                className={q.completed ? 'h-full bg-green-500' : 'h-full bg-gradient-to-r from-blue-500 to-purple-500'}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
            <span className="text-[10px] text-gray-400 font-mono">{q.progress}/{q.target}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function QuestsPanel({ compact = false }: { compact?: boolean }) {
  const { daily, weekly, completedCount, totalCount } = useQuests();

  return (
    <div className="glass rounded-2xl border border-dark-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-dark-border bg-dark-surface/50">
        <Target className="w-4 h-4 text-purple-500" />
        <span className="font-semibold text-white text-sm">Quests</span>
        <span className="ml-auto text-xs text-gray-400">{completedCount}/{totalCount}</span>
      </div>
      <div className="p-3 space-y-3">
        <div>
          <div className="text-[10px] uppercase text-gray-500 font-semibold mb-2 px-1">Daily</div>
          <div className="space-y-2">
            {(compact ? daily.slice(0, 2) : daily).map(q => <QuestRow key={q.id} q={q} />)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-gray-500 font-semibold mb-2 px-1">Weekly</div>
          <div className="space-y-2">
            {(compact ? weekly.slice(0, 1) : weekly).map(q => <QuestRow key={q.id} q={q} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
