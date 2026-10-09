import * as React from 'react';

/**
 * Tab-bar icon set with outline + filled variants (active = filled),
 * drawn on a 24px grid with 1.6px strokes to match the light type.
 */
type IconProps = React.SVGProps<SVGSVGElement> & { filled?: boolean };

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function HomeIcon({ filled, ...p }: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M3.5 10.2 12 3.5l8.5 6.7V20a.5.5 0 0 1-.5.5h-5.2v-6h-5.6v6H4a.5.5 0 0 1-.5-.5z" fill={filled ? 'currentColor' : 'none'} />
    </svg>
  );
}

export function ShopIcon({ filled, ...p }: IconProps) {
  return (
    <svg {...base} {...p}>
      {filled ? (
        <>
          <circle cx="10.5" cy="10.5" r="7" fill="currentColor" />
          <path d="m15.8 15.8 4.7 4.7" strokeWidth={2.2} />
        </>
      ) : (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m15.5 15.5 5 5" />
        </>
      )}
    </svg>
  );
}

export function HeartIcon({ filled, ...p }: IconProps) {
  return (
    <svg {...base} {...p}>
      <path
        d="M12 20s-7.5-4.4-7.5-10.1A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 7.5 2.6C19.5 15.6 12 20 12 20z"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  );
}

export function BagIcon({ filled, ...p }: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M4.5 8h15l-1 12.5h-13z" fill={filled ? 'currentColor' : 'none'} />
      <path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" />
    </svg>
  );
}

export function UserIcon({ filled, ...p }: IconProps) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="8" r="4" fill={filled ? 'currentColor' : 'none'} />
      <path d="M4 20.5c.8-4 4-6 8-6s7.2 2 8 6z" fill={filled ? 'currentColor' : 'none'} />
    </svg>
  );
}

/** Simple crest monogram used where the raster logo would be too small. */
export function CrestMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 44" aria-hidden {...props}>
      <path
        d="M20 1.5c7 0 13.4 1.4 17.5 3.2.6.3 1 .9 1 1.6V21c0 10.4-8.3 17.8-18.5 21.5C9.8 38.8 1.5 31.4 1.5 21V6.3c0-.7.4-1.3 1-1.6C6.6 2.9 13 1.5 20 1.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      <rect x="9" y="22" width="10" height="7" fill="#b72034" />
      <rect x="9" y="22" width="4.5" height="3.6" fill="#292963" />
      <rect x="21" y="22" width="10" height="2.4" fill="#d52b1e" />
      <rect x="21" y="24.3" width="10" height="2.4" fill="#f9e300" />
      <rect x="21" y="26.6" width="10" height="2.4" fill="#007934" />
      <text x="20" y="16" textAnchor="middle" fontSize="8.5" fontWeight="600" fill="currentColor" letterSpacing="1.2">
        SCCS
      </text>
    </svg>
  );
}
