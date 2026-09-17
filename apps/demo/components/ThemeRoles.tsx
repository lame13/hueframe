'use client';

import { useState } from 'react';
import { THEME_ROLES, isHexColor, normalizeHex, type Theme, type ThemeRole } from 'hueframe';

import { LockIcon } from './icons';

export const ROLE_LABELS: Record<ThemeRole, string> = {
  background: 'Background',
  surface: 'Surface',
  text: 'Text',
  primary: 'Primary',
  accent: 'Accent',
};

interface ThemeRolesProps {
  readonly theme: Theme | null;
  readonly onColor: (role: ThemeRole, hex: string) => void;
  readonly onToggleLock: (role: ThemeRole) => void;
}

function RoleRow({
  theme,
  role,
  onColor,
  onToggleLock,
}: {
  theme: Theme;
  role: ThemeRole;
  onColor: (role: ThemeRole, hex: string) => void;
  onToggleLock: (role: ThemeRole) => void;
}) {
  const value = theme.roles[role];
  const [draft, setDraft] = useState(value.hex);
  const [lastHex, setLastHex] = useState(value.hex);

  // Re-sync when the theme changes from outside this row (a new variation, a
  // new photo, or the other mode). Adjusting during render is the documented
  // way to do this without an extra render pass.
  if (value.hex !== lastHex) {
    setLastHex(value.hex);
    setDraft(value.hex);
  }

  const commit = (next: string) => {
    const trimmed = next.trim().replace(/^#/, '');
    if (isHexColor(trimmed)) {
      onColor(role, normalizeHex(trimmed));
    } else {
      setDraft(value.hex);
    }
  };

  return (
    <li className="role">
      <span className="role__swatch" style={{ background: value.hex }}>
        <input
          type="color"
          className="role__picker"
          value={value.hex}
          aria-label={`${ROLE_LABELS[role]} colour`}
          onChange={(event) => {
            setDraft(event.target.value);
            onColor(role, event.target.value);
          }}
        />
      </span>

      <span className="role__label">{ROLE_LABELS[role]}</span>

      <input
        className="role__hex"
        value={draft}
        spellCheck={false}
        aria-label={`${ROLE_LABELS[role]} hex value`}
        data-user={value.source === 'user' ? 'true' : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            commit(event.currentTarget.value);
            event.currentTarget.blur();
          }
          if (event.key === 'Escape') {
            setDraft(value.hex);
            event.currentTarget.blur();
          }
        }}
      />

      <button
        type="button"
        className="role__lock"
        aria-pressed={value.locked}
        aria-label={`${value.locked ? 'Unlock' : 'Lock'} ${ROLE_LABELS[role]}`}
        title={value.locked ? 'Locked — survives a new variation' : 'Lock to keep this colour'}
        onClick={() => onToggleLock(role)}
      >
        <LockIcon open={!value.locked} width={16} height={16} />
      </button>
    </li>
  );
}

export function ThemeRoles({ theme, onColor, onToggleLock }: ThemeRolesProps) {
  if (!theme) {
    return (
      <ul className="roles" aria-hidden="true">
        {THEME_ROLES.map((role) => (
          <li key={role} className="role role--placeholder">
            <span className="role__swatch" />
            <span className="role__label">{ROLE_LABELS[role]}</span>
            <span className="role__hex">#──────</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="roles">
      {THEME_ROLES.map((role) => (
        <RoleRow
          key={`${theme.mode}-${role}`}
          theme={theme}
          role={role}
          onColor={onColor}
          onToggleLock={onToggleLock}
        />
      ))}
    </ul>
  );
}
