import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

// Short confirmation at the bottom right ("Parcel registered", "Agency approved"). Errors stay in the page.
interface Toast {
  id: number;
  text: string;
  tone: 'success' | 'error';
}

const ToastContext = createContext<(text: string, tone?: Toast['tone']) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((text: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-inverse px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(14,23,38,0.25)]"
          >
            <span className={`flex h-6 w-6 items-center justify-center rounded-full ${t.tone === 'success' ? 'bg-success-solid' : 'bg-danger-solid'}`}>
              <Icon name={t.tone === 'success' ? 'check' : 'x'} size={14} strokeWidth={2.6} />
            </span>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
