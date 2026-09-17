import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** The product mark: four prints overlapping like a test sheet. */
export function BrandMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="1.5" y="1.5" width="11" height="11" rx="1.6" fill="#4f7c4a" />
      <rect x="11" y="4" width="11" height="11" rx="1.6" fill="#b6c2a3" />
      <rect x="2" y="11.5" width="11" height="11" rx="1.6" fill="#1f3f3a" />
      <rect x="10.5" y="11.5" width="11" height="11" rx="1.6" fill="#f1ebdd" />
    </svg>
  );
}

export function GitHubIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
      <path d="M12 .297C5.37.297 0 5.67 0 12.297c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.043-1.61-4.043-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23a11.51 11.51 0 0 1 3-.405c1.02.005 2.045.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export function LockIcon({ open = false, ...props }: IconProps & { open?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.4" />
      {open ? <path d="M8.5 10.5V8a3.5 3.5 0 0 1 6.8-1.2" /> : <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />}
    </svg>
  );
}

export function DesktopIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
      <rect x="2.5" y="4" width="19" height="13" rx="1.8" />
      <path d="M8 20.5h8M12 17v3.5" />
    </svg>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.4" />
      <path d="M10.5 5.5h3" />
    </svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
      <path d="M12 16V4.5M7.5 9 12 4.5 16.5 9" />
      <path d="M4 15v3.5a1.5 1.5 0 0 0 1.5 1.5h13a1.5 1.5 0 0 0 1.5-1.5V15" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
      <path d="M4.5 12h15M13.5 6l6 6-6 6" />
    </svg>
  );
}

export function ShuffleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
      <path d="M4 7h3.5c2 0 3 1.2 4.2 2.8l1.6 2.4c1.2 1.6 2.2 2.8 4.2 2.8H20" />
      <path d="M4 17h3.5c1.3 0 2.2-.5 3-1.4M17.5 5H20m-2.5 0 2.5 2.5M17.5 15H20m-2.5 0 2.5-2.5" />
      <path d="M14.4 7.2C15.2 6 16 5 17.5 5" />
    </svg>
  );
}

export function ContrastIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17a8.5 8.5 0 0 0 0-17Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path d="M15.5 5.5v-.4a1.6 1.6 0 0 0-1.6-1.6H5.1a1.6 1.6 0 0 0-1.6 1.6v8.8a1.6 1.6 0 0 0 1.6 1.6h.4" />
    </svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
      <path d="M12 4v11.5M7.5 11 12 15.5 16.5 11" />
      <path d="M4.5 18.5h15" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}

export function WarnIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
      <path d="M12 4.5 21 20H3l9-15.5Z" />
      <path d="M12 10v4.2M12 17.2v.1" />
    </svg>
  );
}

export function PhotoIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.4" />
      <path d="M3.5 16.5 9 12l4 3.4 2.6-2.2L20.5 17" />
    </svg>
  );
}

/**
 * The 16 sun rays as `[x1, y1, x2, y2]`, in a 32-unit box.
 *
 * These are precomputed constants rather than `Math.cos`/`Math.sin` calls: the
 * server and the browser can disagree on the last digit of a trig result, which
 * makes the rendered SVG attributes differ and trips React's hydration check.
 */
const SUN_RAYS: readonly (readonly [number, number, number, number])[] = [
  [23.6, 16, 29.2, 16],
  [23.02, 18.91, 26.53, 20.36],
  [21.37, 21.37, 25.33, 25.33],
  [18.91, 23.02, 20.36, 26.53],
  [16, 23.6, 16, 29.2],
  [13.09, 23.02, 11.64, 26.53],
  [10.63, 21.37, 6.67, 25.33],
  [8.98, 18.91, 5.47, 20.36],
  [8.4, 16, 2.8, 16],
  [8.98, 13.09, 5.47, 11.64],
  [10.63, 10.63, 6.67, 6.67],
  [13.09, 8.98, 11.64, 5.47],
  [16, 8.4, 16, 2.8],
  [18.91, 8.98, 20.36, 5.47],
  [21.37, 10.63, 25.33, 6.67],
  [23.02, 13.09, 26.53, 11.64],
];

/** The guesthouse monogram used by the preview template. */
export function SunMark(props: IconProps) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <circle cx="16" cy="16" r="4.6" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        {SUN_RAYS.map(([x1, y1, x2, y2]) => (
          <line key={`${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>
    </svg>
  );
}
