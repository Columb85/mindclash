'use client';

import { useEffect, useCallback } from 'react';
import { Tooltip } from '@/components/ui/Tooltip';

type ShortcutHandler = () => void;

interface Shortcuts {
  onAsset1?: ShortcutHandler; // 1 - BTC
  onAsset2?: ShortcutHandler; // 2 - ETH
  onAsset3?: ShortcutHandler; // 3 - SOL
  onUp?: ShortcutHandler;     // U - UP
  onDown?: ShortcutHandler;   // D - DOWN
  onEnter?: ShortcutHandler;  // Enter - Confirm
  onEscape?: ShortcutHandler; // Esc - Cancel/Close
  onQuickJoin?: ShortcutHandler; // Q - Quick Join
  onHelp?: ShortcutHandler;   // ? - Help
}

export function useKeyboardShortcuts(shortcuts: Shortcuts, enabled = true) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    // Don't trigger if user is typing in an input
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const key = e.key.toLowerCase();

    switch (key) {
      case '1':
        shortcuts.onAsset1?.();
        break;
      case '2':
        shortcuts.onAsset2?.();
        break;
      case '3':
        shortcuts.onAsset3?.();
        break;
      case 'u':
        shortcuts.onUp?.();
        break;
      case 'd':
        shortcuts.onDown?.();
        break;
      case 'enter':
        shortcuts.onEnter?.();
        break;
      case 'escape':
        shortcuts.onEscape?.();
        break;
      case 'q':
        shortcuts.onQuickJoin?.();
        break;
      case '?':
        shortcuts.onHelp?.();
        break;
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function KeyboardHints({ context = 'lobby' }: { context?: 'lobby' | 'game' }) {
  return (
    <div className="kbd-hints">
      {context === 'lobby' && (
        <>
          <Tooltip text="Join the next available round instantly" position="top">
            <span className="kbd-hint"><kbd>Q</kbd> Quick Join</span>
          </Tooltip>
          <Tooltip text="Open How It Works guide" position="top">
            <span className="kbd-hint"><kbd>?</kbd> Help</span>
          </Tooltip>
        </>
      )}
      {context === 'game' && (
        <>
          <Tooltip text="Predict price will go UP" position="top">
            <span className="kbd-hint"><kbd>U</kbd> UP</span>
          </Tooltip>
          <Tooltip text="Predict price will go DOWN" position="top">
            <span className="kbd-hint"><kbd>D</kbd> DOWN</span>
          </Tooltip>
          <Tooltip text="Confirm your prediction" position="top">
            <span className="kbd-hint"><kbd>Enter</kbd> Confirm</span>
          </Tooltip>
          <Tooltip text="Return to lobby" position="top">
            <span className="kbd-hint"><kbd>Esc</kbd> Back</span>
          </Tooltip>
        </>
      )}
    </div>
  );
}
