import { useEffect, useRef, useState } from 'react';
import { errorMessage } from '../../lib/api';
import { useTheme } from '../../lib/theme';
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

export function GoogleButton() {
  const box = useRef<HTMLDivElement>(null);
  const google = useGoogleLogin();
  const { dark } = useTheme();
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

  onCredential = (token) => google.mutate(token);

  useEffect(() => {
    let alive = true;
    loadGoogle()
      .then((id) => {
        if (!alive || !box.current) return;
        id.initialize({ client_id: CLIENT_ID, callback: (r) => onCredential(r.credential), ux_mode: 'popup', auto_select: false, cancel_on_tap_outside: true });
        box.current.innerHTML = '';
        id.renderButton(box.current, {
          type: 'standard',
          theme: dark ? 'filled_black' : 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'center',
          width: Math.min(400, Math.max(200, Math.round(box.current.parentElement?.clientWidth ?? 360))),
        });
        setState('ready');
      })
      .catch((e: Error) => {
        if (!alive) return;
        setState('failed');
        setLoadError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [dark]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex min-h-[44px] w-full justify-center">
        {state === 'loading' && <span className="tp-skeleton absolute inset-0 rounded-[10px]" aria-label="Loading Google sign-in" />}
        <div ref={box} className={`transition-opacity duration-200 ${state === 'ready' && !google.isPending ? 'opacity-100' : 'opacity-60'}`} />
      </div>
      {google.isPending && <p className="text-[13px] text-muted">Signing you in with Google…</p>}
      {(google.isError || loadError) && (
        <p role="alert" className="text-center text-[13px] font-semibold text-danger">
          {loadError ?? errorMessage(google.error)}
        </p>
      )}
    </div>
  );
}
