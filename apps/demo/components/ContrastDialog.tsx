'use client';

import { useMemo } from 'react';
import { checkThemeContrast, type Theme } from 'hueframe';

import { Dialog } from './Dialog';
import { CheckIcon, WarnIcon } from './icons';

interface ContrastDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly theme: Theme | null;
}

function Badge({ met, label }: { met: boolean; label: string }) {
  return (
    <span className="badge" data-met={met}>
      {met ? <CheckIcon width={13} height={13} /> : <WarnIcon width={13} height={13} />}
      {label}
    </span>
  );
}

export function ContrastDialog({ open, onClose, theme }: ContrastDialogProps) {
  const checks = useMemo(() => (theme ? checkThemeContrast(theme) : []), [theme]);

  return (
    <Dialog
      open={open}
      title="Contrast report"
      description={
        theme
          ? `WCAG 2.1 ratios for the ${theme.mode} theme. AA needs 4.5:1 for body text and 3:1 for large text or UI.`
          : undefined
      }
      onClose={onClose}
    >
      <ul className="checks">
        {checks.map((check) => (
          <li key={check.id} className="check">
            <span
              className="check__sample"
              style={{ background: check.background, color: check.foreground }}
              aria-hidden="true"
            >
              Aa
            </span>
            <span className="check__label">
              {check.label}
              <span className="check__codes">
                {check.foreground} on {check.background}
              </span>
            </span>
            <span className="check__ratio">{check.ratio.toFixed(2)}:1</span>
            <span className="check__badges">
              <Badge met={check.aa} label="AA" />
              <Badge met={check.aaa} label="AAA" />
            </span>
          </li>
        ))}
      </ul>
      <p className="modal__note">
        Locked colours keep their exact value, so a manual edit can lower a pair below AA. Unlock the
        role and press “New variation” to let hueframe fit it again.
      </p>
    </Dialog>
  );
}
