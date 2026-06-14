'use client';

/**
 * HUD background — matches mindclash_hud_v3.html:
 * flat #080a0f + scanline CRT overlay (no orbs, no dot grid)
 */
export function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute inset-0" style={{ background: '#080a0f' }} />
      <div
        className="absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 229, 255, .015) 2px, rgba(0, 229, 255, .015) 4px)',
        }}
      />
    </div>
  );
}
