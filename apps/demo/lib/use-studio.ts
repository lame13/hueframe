'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { extractImagePalette } from './palette';
import { firstImageFile, loadRasterImage } from './pixels';
import {
  OPENING_PHOTO,
  PALETTE_SIZE,
  applyRoleColor,
  deriveThemes,
  hasEdits,
  initialStudioState,
  nextVariation,
  resetEdits,
  sampleToPhoto,
  resolveMode,
  toggleRoleLock,
  withPalette,
  type Device,
  type ModePreference,
  type SamplePhoto,
  type SourcePhoto,
  type StudioState,
  type StudioStatus,
  type StudioThemes,
  type TemplateId,
} from './studio';
import type { SampledColor, Theme, ThemeMode, ThemeRole } from 'hueframe';

export interface Studio {
  readonly state: StudioState;
  readonly themes: StudioThemes | null;
  readonly activeTheme: Theme | null;
  /** Light or dark after resolving the `system` preference. */
  readonly effectiveMode: ThemeMode;
  readonly isDragging: boolean;
  readonly canExport: boolean;
  readonly canReset: boolean;
  readonly status: StudioStatus;
  loadFile: (file: File) => void;
  loadSample: (sample: SamplePhoto) => void;
  setMode: (mode: ModePreference) => void;
  setTemplate: (template: TemplateId) => void;
  setDevice: (device: Device) => void;
  setRoleColor: (role: ThemeRole, hex: string) => void;
  toggleLock: (role: ThemeRole) => void;
  shuffle: () => void;
  reset: () => void;
}

/** Tracks `prefers-color-scheme`, so the "System" option is live. */
function useSystemMode(): ThemeMode {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => setMode(query.matches ? 'dark' : 'light');
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  return mode;
}

/**
 * Owns the playground state: the source photo, the extracted palette, the
 * per-mode edits, and every action the UI can take.
 *
 * Everything stays in the browser. The photo is read through a canvas, never
 * uploaded, and the blob URL is revoked as soon as it is replaced.
 */
export function useStudio({ withSample }: { withSample: boolean }): Studio {
  const [state, setState] = useState(() => initialStudioState(withSample));
  const [isDragging, setIsDragging] = useState(false);
  const objectUrl = useRef<string | null>(null);
  const userSelectedPhoto = useRef(false);
  const activeLoad = useRef<AbortController | null>(null);
  const samplePalettes = useRef(new Map<string, readonly SampledColor[]>());
  // Only the newest load may touch the state: colour extraction is async, so an
  // earlier photo can still be decoding when the next one arrives. Without this
  // guard the stale result could land last and paint the wrong palette.
  const loadId = useRef(0);
  const systemMode = useSystemMode();

  const { palette, variation, edits } = state;
  const themes = useMemo(
    () => deriveThemes({ palette, variation, edits }),
    [palette, variation, edits],
  );
  const effectiveMode = resolveMode(state.modePreference, systemMode);
  const activeTheme = themes ? themes[effectiveMode] : null;

  const ingest = useCallback(async (photo: SourcePhoto) => {
    const id = (loadId.current += 1);
    activeLoad.current?.abort();
    const controller = new AbortController();
    activeLoad.current = controller;
    const { signal } = controller;
    const isCurrent = () => !signal.aborted && id === loadId.current;
    setState((previous) => isCurrent()
      ? { ...previous, photo, status: 'extracting', error: null }
      : previous);
    try {
      let palette = photo.isSample ? samplePalettes.current.get(photo.url) : undefined;
      if (!palette) {
        const raster = await loadRasterImage(photo.url, 360, signal);
        if (!isCurrent()) return;
        palette = await extractImagePalette(raster, PALETTE_SIZE, signal);
        if (!isCurrent()) return;
        if (photo.isSample && palette.length > 0) {
          samplePalettes.current.set(photo.url, palette);
        }
      }
      const result = palette;
      setState((previous) => isCurrent() ? withPalette(previous, photo, result) : previous);
    } catch (error) {
      if (!isCurrent()) return;
      setState((previous) => isCurrent() ? ({
        ...previous,
        status: 'error',
        error: error instanceof Error ? error.message : 'Could not read that image.',
      }) : previous);
    } finally {
      if (activeLoad.current === controller) activeLoad.current = null;
    }
  }, []);

  const loadFile = useCallback(
    (file: File) => {
      userSelectedPhoto.current = true;
      activeLoad.current?.abort();
      if (objectUrl.current) {
        URL.revokeObjectURL(objectUrl.current);
      }
      const url = URL.createObjectURL(file);
      objectUrl.current = url;
      void ingest({ url, name: file.name, isSample: false });
    },
    [ingest],
  );

  const loadSample = useCallback(
    (sample: SamplePhoto) => {
      userSelectedPhoto.current = true;
      void ingest(sampleToPhoto(sample));
      if (objectUrl.current) {
        URL.revokeObjectURL(objectUrl.current);
        objectUrl.current = null;
      }
    },
    [ingest],
  );

  // The playground opens with the sample photo already in place.
  useEffect(() => {
    if (withSample && !userSelectedPhoto.current) {
      void ingest(sampleToPhoto(OPENING_PHOTO));
    }
    return () => {
      loadId.current += 1;
      activeLoad.current?.abort();
      if (objectUrl.current) {
        URL.revokeObjectURL(objectUrl.current);
        objectUrl.current = null;
      }
    };
  }, [ingest, withSample]);

  // Drop a photo anywhere, or paste one straight from the clipboard.
  useEffect(() => {
    const hasFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes('Files');

    const onDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) {
        return;
      }
      event.preventDefault();
      setIsDragging(true);
    };
    const onDragEnd = () => setIsDragging(false);
    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      const file = firstImageFile(Array.from(event.dataTransfer?.files ?? []));
      if (file) {
        loadFile(file);
      }
    };
    const onPaste = (event: ClipboardEvent) => {
      const file = firstImageFile(Array.from(event.clipboardData?.files ?? []));
      if (file) {
        event.preventDefault();
        loadFile(file);
      }
    };

    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragEnd);
    window.addEventListener('dragend', onDragEnd);
    window.addEventListener('drop', onDrop);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragEnd);
      window.removeEventListener('dragend', onDragEnd);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('paste', onPaste);
    };
  }, [loadFile]);

  const setMode = useCallback((modePreference: ModePreference) => {
    setState((previous) => ({ ...previous, modePreference }));
  }, []);

  const setTemplate = useCallback((template: TemplateId) => {
    setState((previous) => ({ ...previous, template }));
  }, []);

  const setDevice = useCallback((device: Device) => {
    setState((previous) => ({ ...previous, device }));
  }, []);

  const setRoleColor = useCallback((role: ThemeRole, hex: string) => {
    setState((previous) =>
      applyRoleColor(previous, resolveMode(previous.modePreference, systemMode), role, hex),
    );
  }, [systemMode]);

  const toggleLock = useCallback((role: ThemeRole) => {
    setState((previous) => {
      const mode = resolveMode(previous.modePreference, systemMode);
      return toggleRoleLock(previous, mode, role, !previous.edits[mode].locked.includes(role));
    });
  }, [systemMode]);

  const shuffle = useCallback(() => {
    setState((previous) => nextVariation(previous, deriveThemes(previous)));
  }, []);

  const reset = useCallback(() => {
    setState((previous) => resetEdits(previous));
  }, []);

  return {
    state,
    themes,
    activeTheme,
    effectiveMode,
    isDragging,
    canExport: state.status === 'ready' && activeTheme !== null,
    canReset: hasEdits(state) || state.variation > 0,
    status: state.status,
    loadFile,
    loadSample,
    setMode,
    setTemplate,
    setDevice,
    setRoleColor,
    toggleLock,
    shuffle,
    reset,
  };
}
