import { useEffect, useRef, useState } from 'react';
import { errorMessage } from '../../lib/api';
import { Spinner } from '../../components/ui/Button';
import { useGoogleLogin } from './auth.api';

// "Continue with Google" with Google Identity Services (the official button, in a Google iframe).
// Google gives an ID token ("credential"); POST /auth/google checks it with Google and sets the session cookie.
// The client ID is public (it ships in every app). The origin (http://localhost:5173) must be allowed on the
// "TransitPro Web" client in Google Cloud; while the app is in Testing, only its test users can sign in.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '556994393607-5l8a2rpeb7qv82ql30mu3pbrn56404c6.apps.googleusercontent.com';
const SCRIPT = 'https://accounts.google.com/gsi/client';

interface GoogleId {
  initialize(o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: 'popup'; auto_select?: boolean; cancel_on_tap_outside?: boolean }): void;
  renderButton(el: HTMLElement, o: Record<string, unknown>): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

// The script is loaded once, the first time a Google button is shown
let loading: Promise<GoogleId> | null = null;
function loadGoogle(): Promise<GoogleId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('Google sign-in did not load')));
    s.onerror = () => {
      loading = null;
      reject(new Error('Google sign-in could not load. Check your internet connection.'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

// The latest callback, so Google (initialized once) always calls the current component
let onCredential: (token: string) => void = () => {};

// Our own button from the design (same in light and dark mode) is what people see. Google's real button is
// rendered on top of it, invisible and stretched to the same size: the click goes to Google (popup, ID token),
// which keeps Google's security model while the look stays ours.
export function GoogleButton() {
  const wrap = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const google = useGoogleLogin();
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

  onCredential = (token) => google.mutate(token);

  // Stretch Google's button over ours. It is drawn at the width we ask for (max 400 px) and 40 px high
  // (size "large"), so the scale is known without measuring Google's frame.
  const GOOGLE_H = 40;
  const fit = () => {
    const w = wrap.current;
    const g = box.current;
    if (!w || !g) return;
    const width = Number(g.dataset.width) || Math.min(400, w.offsetWidth);
    g.style.width = `${width}px`;
    g.style.height = `${GOOGLE_H}px`;
    g.style.transform = `scale(${w.offsetWidth / width}, ${w.offsetHeight / GOOGLE_H})`;
  };

  useEffect(() => {
    let alive = true;
    const ro = new ResizeObserver(fit);
    loadGoogle()
      .then((id) => {
        if (!alive || !box.current || !wrap.current) return;
        const width = Math.max(200, Math.min(400, wrap.current.offsetWidth));
        box.current.dataset.width = String(width);
        id.initialize({ client_id: CLIENT_ID, callback: (r) => onCredential(r.credential), ux_mode: 'popup', auto_select: false, cancel_on_tap_outside: true });
        box.current.innerHTML = '';
        id.renderButton(box.current, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', width, locale: 'en' });
        fit();
        ro.observe(wrap.current);
        setState('ready');
      })
      .catch((e: Error) => {
        if (!alive) return;
        setState('failed');
        setLoadError(e.message);
      });
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, []);

  const busy = google.isPending;
  return (
    <div className="flex flex-col gap-2">
      <div ref={wrap} className="group relative h-[52px] w-full overflow-hidden rounded-[14px]">
        {/* What people see */}
        <div
          aria-hidden="true"
          className={`flex h-full w-full items-center justify-center gap-2.5 rounded-[14px] border border-field bg-surface text-[15px] font-bold text-ink transition-colors duration-200 group-hover:border-muted/50 group-hover:bg-soft group-focus-within:ring-2 group-focus-within:ring-primary/40 ${
            state === 'ready' && !busy ? '' : 'opacity-60'
          }`}
        >
          {busy ? <Spinner /> : <GoogleLogo />}
          {busy ? 'Signing you in…' : 'Continue with Google'}
        </div>
        {/* What is clicked: Google's button, invisible, stretched over ours */}
        <div
          ref={box}
          className={`absolute left-0 top-0 origin-top-left overflow-hidden opacity-[0.01] ${state === 'ready' && !busy ? '' : 'pointer-events-none'}`}
          aria-label="Continue with Google"
        />
      </div>
      {(google.isError || loadError) && (
        <p role="alert" className="text-center text-[13px] font-semibold text-danger">
          {loadError ?? errorMessage(google.error)}
        </p>
      )}
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
