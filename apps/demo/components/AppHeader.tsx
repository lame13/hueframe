'use client';

import { BrandMark, GitHubIcon } from './icons';

interface AppHeaderProps {
  readonly canReset: boolean;
  readonly canExport: boolean;
  readonly onReset: () => void;
  readonly onExport: () => void;
}

export function AppHeader({ canReset, canExport, onReset, onExport }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <BrandMark className="app-header__mark" width={30} height={30} />
        <span className="app-header__copy">
          <span className="app-header__title">Image → Theme</span>
          <span className="app-header__subtitle">Turn a photo into a website palette.</span>
        </span>
      </div>

      <div className="app-header__actions">
        <button type="button" className="btn btn--quiet" onClick={onReset} disabled={!canReset}>
          Reset
        </button>
        <button type="button" className="btn btn--dark" onClick={onExport} disabled={!canExport}>
          Export CSS
        </button>
        <a
          className="icon-btn"
          href="https://github.com/lame13/hueframe"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View hueframe on GitHub (opens in a new tab)"
          title="View hueframe on GitHub (opens in a new tab)"
        >
          <GitHubIcon width={20} height={20} />
        </a>
      </div>
    </header>
  );
}
