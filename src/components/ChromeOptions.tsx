'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  if (typeof document === 'undefined') {
    return 'dark';
  }

  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function ChromeOptions() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <nav className="top-chrome" aria-label="Portfolio sections">
      <span className="chrome-prompt">denis@portfolio</span>
      <div className="chrome-links">
        <a href="#open_source">open_source</a>
        <a href="#robotics">robotics</a>
        <a href="#web">web</a>
        <a href="#contact">contact</a>
      </div>
      <button
        className="chrome-theme"
        type="button"
        aria-label={`Switch to ${nextTheme} mode`}
        onClick={() => setTheme(nextTheme)}
      >
        theme:{theme}
      </button>
    </nav>
  );
}
