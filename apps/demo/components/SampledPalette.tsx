'use client';

import { useEffect, useState } from 'react';
import type { SampledColor } from 'hueframe';

import { PhotoIcon } from './icons';
import { PALETTE_SIZE } from '@/lib/studio';

interface SampledPaletteProps {
  readonly palette: readonly SampledColor[];
  readonly busy: boolean;
}

export function SampledPalette({ palette, busy }: SampledPaletteProps) {
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = window.setTimeout(() => setCopied(null), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (palette.length === 0) {
    return (
      <ul className="swatches" aria-busy={busy}>
        {Array.from({ length: PALETTE_SIZE }, (_, index) => (
          <li key={index} className="swatches__item swatches__item--empty" aria-hidden="true" />
        ))}
        <li className="swatches__status">
          <PhotoIcon width={14} height={14} />
          {busy ? 'Sampling colours…' : 'Waiting for a photo'}
        </li>
      </ul>
    );
  }

  return (
    <ul className="swatches">
      {palette.map((sample) => (
        <li key={`${sample.hex}-${sample.population}`} className="swatches__item">
          <button
            type="button"
            className="swatches__button"
            style={{ background: sample.hex }}
            title={`${sample.hex} · ${Math.round(sample.population * 100)}% of pixels`}
            onClick={() => {
              void navigator.clipboard?.writeText(sample.hex).then(
                () => setCopied(sample.hex),
                () => setCopied(null),
              );
            }}
          >
            <span className="visually-hidden">
              Copy {sample.hex}, {Math.round(sample.population * 100)} percent of the image
            </span>
          </button>
        </li>
      ))}
      <li className="swatches__status" role="status">
        {copied ? `Copied ${copied}` : 'Tap a swatch to copy'}
      </li>
    </ul>
  );
}
