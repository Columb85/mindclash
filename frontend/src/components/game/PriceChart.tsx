'use client';

import { useMemo, useRef, useState, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { PricePoint } from '@/types/room';

interface PriceChartProps {
  history: PricePoint[];
  startPrice?: number;
  anchorPrice?: number;
  height?: number;
  status: 'open' | 'live' | 'resolved';
  winner?: 'UP' | 'DOWN' | 'TIE' | null;
  startTime: number;
  endTime: number;
}

/**
 * Premium price chart inspired by TradingView / Bloomberg terminal.
 * - Smooth cubic bezier curves (Catmull-Rom → Bezier)
 * - Gradient fill with multiple opacity stops
 * - Right-side price axis with tick marks
 * - Bottom time axis
 * - Subtle grid with 0.04 opacity
 * - Glow line effect
 * - Animated drawing
 */

function catmullRomToBezier(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)} L${points[1].x.toFixed(1)},${points[1].y.toFixed(1)}`;
  }

  const tension = 0.3;
  let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export function PriceChart({
  history,
  startPrice,
  anchorPrice,
  height = 280,
  status,
  winner,
  startTime,
  endTime,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setWidth(w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const padL = 0;    // no left axis — clean
  const padR = 60;   // right axis for price labels
  const padT = 24;
  const padB = 24;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const gridRows = 6;
  const gridCols = 8;

  const {
    pathD, areaD, minP, maxP, lastPoint, startX, endX,
    fillColor, priceTicks, timeTicks,
  } = useMemo(() => {
    const empty = {
      pathD: '', areaD: '', minP: 0, maxP: 1,
      lastPoint: null as { x: number; y: number } | null,
      startX: padL, endX: width - padR,
      lineColor: '#60a5fa', fillColor: '#60a5fa',
      priceTicks: [] as { y: number; label: string }[],
      timeTicks: [] as { x: number; label: string }[],
    };
    if (history.length < 2) return empty;

    const t0 = history[0].t;
    const tN = history[history.length - 1].t;
    const tSpan = Math.max(1, tN - t0);

    const prices = history.map(p => p.price);

    // ── Outlier filtering: clamp extreme ticks to ±3% of median ──
    const sorted = [...prices].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const clampRange = median * 0.03; // 3% band
    const clampedPrices = prices.map(p =>
      Math.max(median - clampRange, Math.min(median + clampRange, p))
    );

    let lo = Math.min(...clampedPrices);
    let hi = Math.max(...clampedPrices);
    if (startPrice != null) {
      const clampedStart = Math.max(median - clampRange, Math.min(median + clampRange, startPrice));
      lo = Math.min(lo, clampedStart);
      hi = Math.max(hi, clampedStart);
    }
    const range = Math.max(1e-9, hi - lo);
    const pad = range * 0.15;
    lo -= pad; hi += pad;
    const priceSpan = hi - lo;

    const xOf = (t: number) => padL + ((t - t0) / tSpan) * chartW;
    const yOf = (p: number) => padT + (1 - (p - lo) / priceSpan) * chartH;

    const pts = history.map((p, i) => ({ x: xOf(p.t), y: yOf(clampedPrices[i]) }));
    // Downsample if too many points for smooth rendering
    const sampled = pts.length > 200
      ? pts.filter((_, i) => i % Math.ceil(pts.length / 200) === 0 || i === pts.length - 1)
      : pts;

    const d = catmullRomToBezier(sampled);
    const bottom = padT + chartH;
    const area = `${d} L${sampled[sampled.length - 1].x.toFixed(1)},${bottom} L${sampled[0].x.toFixed(1)},${bottom} Z`;

    const last = pts[pts.length - 1];

    let lc = '#60a5fa';
    if (startPrice != null) {
      const current = prices[prices.length - 1];
      if (current > startPrice) lc = '#22c55e';
      else if (current < startPrice) lc = '#ef4444';
    }
    if (status === 'resolved' && winner) {
      lc = winner === 'UP' ? '#22c55e' : winner === 'DOWN' ? '#ef4444' : '#6b7280';
    }

    // Price ticks
    const pTicks: { y: number; label: string }[] = [];
    for (let i = 0; i <= gridRows; i++) {
      const p = lo + (priceSpan / gridRows) * i;
      pTicks.push({ y: yOf(p), label: formatPrice(p) });
    }

    // Time ticks
    const tTicks: { x: number; label: string }[] = [];
    for (let i = 0; i <= gridCols; i++) {
      const t = t0 + (tSpan / gridCols) * i;
      const d = new Date(t * 1000);
      tTicks.push({ x: xOf(t), label: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}` });
    }

    return {
      pathD: d, areaD: area, minP: lo, maxP: hi, lastPoint: last,
      startX: xOf(Math.max(t0, Math.min(tN, startTime))),
      endX: xOf(Math.max(t0, Math.min(tN, endTime))),
      lineColor: lc, fillColor: lc,
      priceTicks: pTicks, timeTicks: tTicks,
    };
  }, [history, startPrice, status, winner, startTime, endTime, height, width, chartW, chartH, padL, padR, padT, padB]);

  const anchorY = useMemo(() => {
    if (anchorPrice == null || maxP === minP) return null;
    const yOf = (p: number) => padT + (1 - (p - minP) / (maxP - minP)) * chartH;
    return yOf(anchorPrice);
  }, [anchorPrice, minP, maxP, chartH, padT]);

  const id = 'pc';
  const neon = '#a855f7';
  const neonCyan = '#22d3ee';

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden" style={{ background: '#08080d' }}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet"
        className="w-full block" style={{ height }}>
        <defs>
          {/* Neon fill gradient (cyan -> purple) */}
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={neon} stopOpacity="0.35" />
            <stop offset="55%" stopColor={neonCyan} stopOpacity="0.10" />
            <stop offset="100%" stopColor={neonCyan} stopOpacity="0" />
          </linearGradient>

          {/* Neon line gradient (cyan -> purple) */}
          <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={neonCyan} />
            <stop offset="100%" stopColor={neon} />
          </linearGradient>

          {/* Line glow */}
          <filter id={`${id}-glow`} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Subtle line glow (double) */}
          <filter id={`${id}-glow2`} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix in="blur" type="matrix"
              values={`0 0 0 0 ${parseInt(fillColor.slice(1,3),16)/255}
                       0 0 0 0 ${parseInt(fillColor.slice(3,5),16)/255}
                       0 0 0 0 ${parseInt(fillColor.slice(5,7),16)/255}
                       0 0 0 0.3 0`} result="colorBlur"/>
            <feMerge>
              <feMergeNode in="colorBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ═══ GRID ═══ */}
        {priceTicks.map((tick, i) => (
          <g key={`hgrid-${i}`}>
            <line
              x1={padL} x2={width - padR}
              y1={tick.y} y2={tick.y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
            {/* Right axis label */}
            <text
              x={width - padR + 8} y={tick.y + 3}
              fontSize="9" fontFamily="ui-monospace, monospace"
              fill="rgba(255,255,255,0.25)"
            >
              {tick.label}
            </text>
          </g>
        ))}
        {timeTicks.map((tick, i) => (
          <g key={`vgrid-${i}`}>
            <line
              x1={tick.x} x2={tick.x}
              y1={padT} y2={padT + chartH}
              stroke="rgba(255,255,255,0.025)"
              strokeWidth="1"
            />
            <text
              x={tick.x} y={height - 4}
              textAnchor="middle" fontSize="8"
              fontFamily="ui-monospace, monospace"
              fill="rgba(255,255,255,0.18)"
            >
              {tick.label}
            </text>
          </g>
        ))}

        {/* ═══ ZONES ═══ */}
        {status !== 'resolved' && (
          <>
            {/* Pre-lock zone (prediction window) */}
            {startX > padL + 2 && (
              <rect x={padL} y={padT} width={Math.max(0, startX - padL)} height={chartH}
                fill="rgba(59,130,246,0.05)" />
            )}
            {/* Live zone */}
            {endX > startX && (
              <rect x={startX} y={padT} width={Math.max(0, endX - startX)} height={chartH}
                fill="rgba(239,68,68,0.04)" />
            )}
            {/* Lock line */}
            <line x1={startX} x2={startX} y1={padT} y2={padT + chartH}
              stroke="rgba(59,130,246,0.55)" strokeWidth="1.5" strokeDasharray="5 3" />
            <rect x={startX - 22} y={padT} width={44} height={16} rx="3"
              fill="rgba(59,130,246,0.18)" />
            <text x={startX} y={padT + 11} textAnchor="middle" fontSize="9" fontWeight="700"
              fill="rgba(59,130,246,0.9)" fontFamily="ui-monospace, monospace">LOCK</text>

            {/* Settle line */}
            <line x1={endX} x2={endX} y1={padT} y2={padT + chartH}
              stroke="rgba(168,85,247,0.55)" strokeWidth="1.5" strokeDasharray="5 3" />
            <rect x={endX - 28} y={padT} width={56} height={16} rx="3"
              fill="rgba(168,85,247,0.18)" />
            <text x={endX} y={padT + 11} textAnchor="middle" fontSize="9" fontWeight="700"
              fill="rgba(168,85,247,0.9)" fontFamily="ui-monospace, monospace">SETTLE</text>
          </>
        )}

        {/* ═══ ANCHOR LINE ═══ */}
        {anchorY !== null && (
          <g>
            <line x1={padL} x2={width - padR} y1={anchorY} y2={anchorY}
              stroke="rgba(251,191,36,0.2)" strokeWidth="1" strokeDasharray="6 4" />
            <rect x={width - padR + 2} y={anchorY - 8} width={padR - 4} height={16} rx={3}
              fill="rgba(251,191,36,0.12)" />
            <text x={width - padR + 8} y={anchorY + 3} fontSize="9"
              fontFamily="ui-monospace, monospace" fill="rgba(251,191,36,0.6)">
              {formatPrice(anchorPrice!)}
            </text>
          </g>
        )}

        {/* ═══ FILL ═══ */}
        {areaD && <path d={areaD} fill={`url(#${id}-fill)`} />}

        {/* ═══ GLOW LINE (behind main) ═══ */}
        {pathD && (
          <motion.path
            d={pathD}
            fill="none"
            stroke={`url(#${id}-line)`}
            strokeWidth="7"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.3"
            filter={`url(#${id}-glow)`}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        )}

        {/* ═══ MAIN LINE ═══ */}
        {pathD && (
          <motion.path
            d={pathD}
            fill="none"
            stroke={`url(#${id}-line)`}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter={`url(#${id}-glow)`}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        )}

        {/* ═══ CURRENT PRICE CROSSHAIR + DOT ═══ */}
        {lastPoint && (
          <g>
            {/* Dashed crosshair from current point to right price axis */}
            <line x1={padL} x2={width - padR} y1={lastPoint.y} y2={lastPoint.y}
              stroke={neon} strokeOpacity="0.4" strokeWidth="1" strokeDasharray="4 4" />
            {/* Outer pulse */}
            {status !== 'resolved' && (
              <motion.circle
                cx={lastPoint.x} cy={lastPoint.y}
                r="4"
                fill={neon}
                animate={{ r: [4, 16], opacity: [0.6, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
            {/* Dot */}
            <circle cx={lastPoint.x} cy={lastPoint.y} r="4"
              fill="#fff" stroke={neon} strokeWidth="2.5" filter={`url(#${id}-glow)`} />
            {/* Price label on right axis */}
            <rect x={width - padR + 2} y={lastPoint.y - 9} width={padR - 4} height={18} rx={3}
              fill={neon} opacity="0.95" />
            <text x={width - padR + 8} y={lastPoint.y + 3} fontSize="9" fontWeight="700"
              fontFamily="ui-monospace, monospace" fill="#fff">
              {formatPrice(history[history.length - 1]?.price ?? 0)}
            </text>
          </g>
        )}

        {/* ═══ CHART BORDER ═══ */}
        <rect x={padL} y={padT} width={chartW} height={chartH}
          fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" rx={0} />
      </svg>

      {/* ═══ OVERLAY LEGEND ═══ */}
      <div className="absolute top-2 left-3 flex items-center gap-4 text-[12px] pointer-events-none">
        {startPrice != null && (
          <span className="flex items-center gap-1.5 text-yellow-400/80 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            Start {formatPrice(startPrice)}
          </span>
        )}
        <span className="flex items-center gap-1.5" style={{ color: `${neon}cc` }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: neon }} />
          Live
        </span>
      </div>
    </div>
  );
}

function formatPrice(p: number) {
  if (p >= 10000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 100) return p.toFixed(1);
  return p.toFixed(2);
}
