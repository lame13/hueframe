'use client';

import { useMemo, useState } from 'react';
import { exportThemeSetCss, exportThemeSetJson, type ThemeSet } from 'hueframe';

import { Dialog, downloadFile, useCopy } from './Dialog';
import { CheckIcon, CopyIcon, DownloadIcon, WarnIcon } from './icons';

type Tab = 'css' | 'json';

interface ExportDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly themes: ThemeSet | null;
}

/**
 * CSS variables come first because they are the fastest thing to paste into a
 * project; the JSON tokens carry the same values plus the sampled palette and
 * contrast report for design-token pipelines.
 */
export function ExportDialog({ open, onClose, themes }: ExportDialogProps) {
  const [tab, setTab] = useState<Tab>('css');
  const { state: copyState, copy } = useCopy();

  const output = useMemo(() => {
    if (!themes) {
      return '';
    }
    if (tab === 'css') {
      return exportThemeSetCss(themes, {
        includePalette: true,
        prefersColorScheme: true,
      });
    }
    return JSON.stringify(exportThemeSetJson(themes), null, 2);
  }, [tab, themes]);

  const fileName = tab === 'css' ? 'hueframe-theme.css' : 'hueframe-tokens.json';
  const mimeType = tab === 'css' ? 'text/css' : 'application/json';

  return (
    <Dialog
      open={open}
      title="Export theme"
      description="Both the light and dark themes are included."
      onClose={onClose}
      footer={
        <>
          <span className="modal__status" role="status">
            {copyState === 'copied' ? (
              <>
                <CheckIcon width={15} height={15} /> Copied to the clipboard
              </>
            ) : copyState === 'failed' ? (
              <>
                <WarnIcon width={15} height={15} /> The browser blocked the clipboard
              </>
            ) : (
              `${output.split('\n').length} lines`
            )}
          </span>
          <span className="modal__actions">
            <button type="button" className="btn btn--outline" onClick={() => void copy(output)}>
              <CopyIcon width={15} height={15} />
              Copy
            </button>
            <button
              type="button"
              className="btn btn--dark"
              onClick={() => downloadFile(fileName, output, mimeType)}
            >
              <DownloadIcon width={15} height={15} />
              {tab === 'css' ? 'Download .css' : 'Download .json'}
            </button>
          </span>
        </>
      }
    >
      <div className="tabs" role="tablist" aria-label="Export format">
        {(
          [
            ['css', 'CSS variables'],
            ['json', 'JSON tokens'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            className="tabs__item"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <pre className="code" tabIndex={0} aria-label={`${tab.toUpperCase()} output`}>
        <code>{output}</code>
      </pre>
    </Dialog>
  );
}
