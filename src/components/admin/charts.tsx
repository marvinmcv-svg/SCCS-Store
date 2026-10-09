'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Single-series charts in the one accent hue (no legend needed: the card
 * title names the series). Thin bars with 4px rounded data-ends anchored
 * to the baseline, 2px gaps, recessive grid, hover tooltip on every mark,
 * keyboard focusable, and a data table alternative.
 */

export function ColumnChart({
  data,
  format,
  labelFormat,
  height = 220,
  ariaLabel,
}: {
  data: { label: string; value: number; sub?: string }[];
  format: (n: number) => string;
  labelFormat?: (s: string) => string;
  height?: number;
  ariaLabel: string;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = niceMax(max);
  const W = 1000;
  const H = height;
  const pad = { t: 12, b: 26, l: 0, r: 0 };
  const innerH = H - pad.t - pad.b;
  const slot = W / Math.max(1, data.length);
  const gap = Math.max(2, Math.min(8, slot * 0.25));
  const bw = Math.max(2, slot - gap);
  const ticks = [0, nice / 2, nice];
  const labelEvery = Math.ceil(data.length / 6);

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[220px] w-full" role="img" aria-label={ariaLabel}>
        {ticks.map((tk) => {
          const y = pad.t + innerH - (tk / nice) * innerH;
          return <line key={tk} x1={0} x2={W} y1={y} y2={y} stroke="var(--line)" strokeWidth={1} vectorEffect="non-scaling-stroke" />;
        })}
        {data.map((d, i) => {
          const h = (d.value / nice) * innerH;
          const x = i * slot + gap / 2;
          const y = pad.t + innerH - h;
          const r = Math.min(4, bw / 2, h);
          return (
            <g key={d.label}>
              {d.value > 0 && (
                <path
                  d={`M${x},${pad.t + innerH} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${pad.t + innerH} Z`}
                  fill="var(--accent)"
                  opacity={hover === null || hover === i ? 1 : 0.35}
                />
              )}
              {/* Hit target: full column, larger than the mark. */}
              <rect
                x={i * slot}
                y={0}
                width={slot}
                height={H}
                fill="transparent"
                tabIndex={0}
                aria-label={`${labelFormat ? labelFormat(d.label) : d.label}: ${format(d.value)}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              />
            </g>
          );
        })}
      </svg>
      {/* Axis labels as HTML so text doesn't stretch with the SVG. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex">
        {data.map((d, i) => (
          <span key={d.label} className="t-label flex-1 text-center text-[9.5px] text-ink-3">
            {i % labelEvery === 0 ? (labelFormat ? labelFormat(d.label) : d.label) : ''}
          </span>
        ))}
      </div>
      <span className="t-label pointer-events-none absolute top-0 right-0 text-[9.5px] text-ink-3">{format(nice)}</span>
      {hover !== null && data[hover] && (
        <div
          className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-[8px] bg-ink px-2.5 py-1.5 text-bg shadow-2"
          style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
          role="status"
        >
          <p className="t-label text-[10px] opacity-70">{labelFormat ? labelFormat(data[hover].label) : data[hover].label}</p>
          <p className="t-body tabular font-medium">{format(data[hover].value)}</p>
          {data[hover].sub && <p className="t-caption opacity-70">{data[hover].sub}</p>}
        </div>
      )}
    </div>
  );
}

export function BarList({ data, format, empty }: { data: { label: string; value: number; sub?: string }[]; format: (n: number) => string; empty: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="t-caption text-ink-2">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label} className="group grid grid-cols-[96px_1fr_auto] items-center gap-3" title={`${d.label}: ${format(d.value)}${d.sub ? ` · ${d.sub}` : ''}`}>
          <span className="t-caption truncate text-ink-2">{d.label}</span>
          <span className="h-2 rounded-full bg-bg">
            <span className={cn('block h-2 rounded-full bg-accent transition-opacity group-hover:opacity-80')} style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }} />
          </span>
          <span className="t-caption tabular text-right text-ink">{format(d.value)}</span>
        </li>
      ))}
    </ul>
  );
}

function niceMax(n: number) {
  const p = 10 ** Math.floor(Math.log10(n));
  const m = n / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}
