'use client';

import type { Theme, ThemeMode } from 'hueframe';

import { DesktopIcon, PhoneIcon } from './icons';
import { TEMPLATE_VIEWS } from './templates';
import {
  MODE_OPTIONS,
  TEMPLATES,
  type Device,
  type ModePreference,
  type StudioStatus,
  type TemplateId,
} from '@/lib/studio';

interface PreviewPaneProps {
  readonly status: StudioStatus;
  readonly theme: Theme | null;
  readonly modePreference: ModePreference;
  /** What the preference resolves to once `system` is taken into account. */
  readonly effectiveMode: ThemeMode;
  readonly template: TemplateId;
  readonly device: Device;
  readonly onMode: (mode: ModePreference) => void;
  readonly onTemplate: (template: TemplateId) => void;
  readonly onDevice: (device: Device) => void;
}

export function PreviewPane({
  status,
  theme,
  modePreference,
  effectiveMode,
  template,
  device,
  onMode,
  onTemplate,
  onDevice,
}: PreviewPaneProps) {
  const Template = TEMPLATE_VIEWS[template];

  return (
    <section className="preview" aria-label="Website preview">
      <div className="preview__head">
        <h2 className="preview__title">Website preview</h2>

        <div className="preview__controls">
          <div className="segmented" role="group" aria-label="Preview template">
            {TEMPLATES.map((option) => (
              <button
                key={option.id}
                type="button"
                className="segmented__item"
                aria-pressed={template === option.id}
                title={option.blurb}
                onClick={() => onTemplate(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="segmented" role="group" aria-label="Colour mode">
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className="segmented__item"
                aria-pressed={modePreference === option.id}
                data-resolved={
                  modePreference === 'system' && effectiveMode === option.id ? 'true' : undefined
                }
                title={
                  option.id === 'system'
                    ? `Follow your system setting (currently ${effectiveMode})`
                    : undefined
                }
                onClick={() => onMode(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="segmented segmented--icons" role="group" aria-label="Preview width">
            {(['desktop', 'mobile'] as const).map((entry) => (
              <button
                key={entry}
                type="button"
                className="segmented__item"
                aria-pressed={device === entry}
                aria-label={entry === 'desktop' ? 'Desktop preview' : 'Mobile preview'}
                title={entry === 'desktop' ? 'Desktop' : 'Mobile'}
                onClick={() => onDevice(entry)}
              >
                {entry === 'desktop' ? (
                  <DesktopIcon width={17} height={17} />
                ) : (
                  <PhoneIcon width={17} height={17} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="preview__viewport" data-device={device}>
        <div className="preview__frame" data-device={device}>
          <Template
            theme={theme}
            busy={status === 'extracting'}
          />
        </div>
      </div>
    </section>
  );
}
