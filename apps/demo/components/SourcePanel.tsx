/* eslint-disable @next/next/no-img-element -- the source image is a local blob URL
   from the dropped file, which next/image cannot optimise or serve. */
'use client';

import { useId } from 'react';
import type { SampledColor, Theme, ThemeRole } from 'hueframe';

import { SampledPalette } from './SampledPalette';
import { ThemeRoles } from './ThemeRoles';
import { ShuffleIcon, UploadIcon, WarnIcon } from './icons';
import { SAMPLE_PHOTOS, type SamplePhoto, type SourcePhoto, type StudioStatus } from '@/lib/studio';

interface SourcePanelProps {
  readonly photo: SourcePhoto | null;
  readonly status: StudioStatus;
  readonly error: string | null;
  readonly palette: readonly SampledColor[];
  readonly theme: Theme | null;
  readonly readable: boolean;
  readonly onFile: (file: File) => void;
  readonly onSample: (sample: SamplePhoto) => void;
  readonly onRoleColor: (role: ThemeRole, hex: string) => void;
  readonly onToggleLock: (role: ThemeRole) => void;
  readonly onShuffle: () => void;
  readonly onCheckContrast: () => void;
}

export function SourcePanel({
  photo,
  status,
  error,
  palette,
  theme,
  readable,
  onFile,
  onSample,
  onRoleColor,
  onToggleLock,
  onShuffle,
  onCheckContrast,
}: SourcePanelProps) {
  const inputId = useId();

  return (
    <aside className="panel" aria-label="Theme controls">
      <section className="panel__section">
        <h2 className="panel__title">Source image</h2>

        <div
          className="dropzone"
          data-busy={status === 'extracting'}
          data-empty={photo ? undefined : 'true'}
        >
          {photo ? (
            <img key={photo.url} className="dropzone__image" src={photo.url} alt={`Source: ${photo.name}`} />
          ) : (
            <div className="dropzone__empty">
              <UploadIcon width={22} height={22} />
              <p className="dropzone__hint">Drop a photo here</p>
              <p className="dropzone__sub">or paste one with ⌘V</p>
              <button
                type="button"
                className="btn btn--tiny"
                onClick={() => onSample(SAMPLE_PHOTOS[0])}
              >
                Use the sample photo
              </button>
            </div>
          )}
          {status === 'extracting' && <span className="dropzone__busy">Sampling colours…</span>}
        </div>

        <label className="btn btn--outline btn--block" htmlFor={inputId}>
          {photo ? 'Replace image' : 'Choose an image'}
          <input
            id={inputId}
            className="visually-hidden"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onFile(file);
              }
              event.target.value = '';
            }}
          />
        </label>

        <div className="samples">
          <p className="samples__label" id={`${inputId}-samples`}>
            Sample photos
          </p>
          <ul className="samples__grid" aria-labelledby={`${inputId}-samples`}>
            {SAMPLE_PHOTOS.map((sample) => {
              const active = photo?.url === sample.url;
              return (
                <li key={sample.id}>
                  <button
                    type="button"
                    className="samples__item"
                    data-active={active ? 'true' : undefined}
                    aria-pressed={active}
                    title={sample.label}
                    onClick={() => onSample(sample)}
                  >
                    <img
                      className="samples__thumb"
                      src={sample.url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="visually-hidden">Use the {sample.label} photo</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {error ? (
          <p className="panel__error" role="alert">
            <WarnIcon width={15} height={15} />
            {error}
          </p>
        ) : null}
      </section>

      <section className="panel__section">
        <h2 className="panel__title">Sampled colours</h2>
        <SampledPalette palette={palette} busy={status === 'extracting'} />
      </section>

      <section className="panel__section">
        <div className="panel__titleRow">
          <h2 className="panel__title">Theme colours</h2>
          <button
            type="button"
            className="btn btn--tiny"
            onClick={onShuffle}
            disabled={!theme}
            title="Re-derive the theme from the same photo, keeping locked colours"
          >
            <ShuffleIcon width={14} height={14} />
            New variation
          </button>
        </div>

        <ThemeRoles theme={theme} onColor={onRoleColor} onToggleLock={onToggleLock} />

        <p className="panel__note" data-warn={theme ? !readable : undefined}>
          {theme && !readable
            ? 'Some text pairs are below AA. Check the contrast report.'
            : 'Adjusted for readable text. Lock a colour to keep it.'}
        </p>
      </section>

      <button
        type="button"
        className="btn btn--outline btn--block"
        onClick={onCheckContrast}
        disabled={!theme}
      >
        Check contrast
      </button>

      <p className="panel__footnote">Photos stay on your device.</p>
    </aside>
  );
}
