'use client';

import { useState } from 'react';
import { isThemeReadable } from 'hueframe';

import { AppHeader } from '@/components/AppHeader';
import { ContrastDialog } from '@/components/ContrastDialog';
import { ExportDialog } from '@/components/ExportDialog';
import { PreviewPane } from '@/components/PreviewPane';
import { SourcePanel } from '@/components/SourcePanel';
import { useStudio } from '@/lib/use-studio';

type OpenDialog = 'none' | 'export' | 'contrast';

export default function PlaygroundPage() {
  const studio = useStudio({ withSample: true });
  const [dialog, setDialog] = useState<OpenDialog>('none');

  const readable = studio.activeTheme ? isThemeReadable(studio.activeTheme) : true;
  const closeDialog = () => setDialog('none');

  return (
    <div className="app">
      <AppHeader
        canReset={studio.canReset}
        canExport={studio.canExport}
        onReset={studio.reset}
        onExport={() => setDialog('export')}
      />

      <div className="app__body">
        <SourcePanel
          photo={studio.state.photo}
          status={studio.status}
          error={studio.state.error}
          palette={studio.state.palette}
          theme={studio.activeTheme}
          readable={readable}
          onFile={studio.loadFile}
          onSample={studio.loadSample}
          onRoleColor={studio.setRoleColor}
          onToggleLock={studio.toggleLock}
          onShuffle={studio.shuffle}
          onCheckContrast={() => setDialog('contrast')}
        />

        <PreviewPane
          status={studio.status}
          theme={studio.activeTheme}
          modePreference={studio.state.modePreference}
          effectiveMode={studio.effectiveMode}
          template={studio.state.template}
          device={studio.state.device}
          onMode={studio.setMode}
          onTemplate={studio.setTemplate}
          onDevice={studio.setDevice}
        />
      </div>

      {studio.isDragging ? (
        <div className="drop-hint">
          <span>Drop a photo to recolour the page</span>
        </div>
      ) : null}

      <p className="visually-hidden" role="status" aria-live="polite">
        {studio.status === 'extracting'
          ? 'Reading colours from the image.'
          : studio.state.palette.length > 0
            ? `Theme ready with ${studio.state.palette.length} sampled colours.`
            : ''}
      </p>

      <ExportDialog open={dialog === 'export'} onClose={closeDialog} themes={studio.themes} />
      <ContrastDialog
        open={dialog === 'contrast'}
        onClose={closeDialog}
        theme={studio.activeTheme}
      />
    </div>
  );
}
