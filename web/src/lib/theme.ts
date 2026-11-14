import { useSyncExternalStore } from 'react';

// Light / dark / system theme. The choice is a per-device preference kept in localStorage (no personal data).
// public/theme-init.js applies it before the first paint (no white flash); this module keeps it in sync after.
export type ThemePref = 'light' | 'dark' | 'system';

const KEY = 'tp-theme';
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const listeners = new Set<() => void>();

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

let pref: ThemePref = read();

const isDark = (p: ThemePref) => p === 'dark' || (p === 'system' && !!media?.matches);

function apply() {
  const dark = isDark(pref);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a101d' : '#1E4FD8');
}

export function setTheme(next: ThemePref) {
  pref = next;
  try {
    if (next === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
  } catch {
    /* private window: the choice lasts until the tab closes */
  }
  apply();
  listeners.forEach((l) => l());
}

// "System" follows the computer's setting live
media?.addEventListener('change', () => {
  if (pref === 'system') {
    apply();
    listeners.forEach((l) => l());
  }
});

// Labels and receipts always print light
if (typeof window !== 'undefined') {
  window.addEventListener('beforeprint', () => (document.documentElement.dataset.theme = 'light'));
  window.addEventListener('afterprint', apply);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useTheme() {
  const current = useSyncExternalStore(subscribe, () => pref);
  return { pref: current, dark: isDark(current), setTheme };
}
