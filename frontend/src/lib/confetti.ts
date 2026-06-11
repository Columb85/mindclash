/** Lightweight confetti burst — no external deps */
export function fireConfetti(durationMs = 2200) {
  if (typeof window === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }

  const colors = ['#22c55e', '#4ade80', '#fbbf24', '#60a5fa', '#a78bfa', '#f472b6'];
  const particles = Array.from({ length: 90 }, () => ({
    x: window.innerWidth * (0.35 + Math.random() * 0.3),
    y: window.innerHeight * 0.55,
    vx: (Math.random() - 0.5) * 9,
    vy: -4 - Math.random() * 7,
    w: 4 + Math.random() * 5,
    h: 3 + Math.random() * 4,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.25,
    color: colors[Math.floor(Math.random() * colors.length)],
    life: 1,
  }));

  const start = performance.now();
  let raf = 0;

  const tick = (now: number) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.18;
      p.vx *= 0.99;
      p.rot += p.vr;
      p.life -= 0.012;
      if (p.life <= 0) continue;
      alive++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (alive > 0 && now - start < durationMs) {
      raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
      canvas.remove();
    }
  };

  raf = requestAnimationFrame(tick);
}
