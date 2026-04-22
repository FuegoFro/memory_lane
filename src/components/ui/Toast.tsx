'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

export type ToastKind = 'info' | 'ok' | 'error';

interface ToastState {
  msg: string;
  kind: ToastKind;
  id: number;
}

interface ToastContextValue {
  showToast: (msg: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside a ToastProvider');
  }
  return ctx;
}

const BG: Record<ToastKind, string> = {
  info: 'var(--color-ink)',
  ok: '#4a5d3a',
  error: '#c04a3a',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);

  const showToast = useCallback((msg: string, kind: ToastKind = 'info') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const id = ++nextId.current;
    setToast({ msg, kind, id });
    timerRef.current = setTimeout(() => {
      setToast((t) => (t && t.id === id ? null : t));
    }, 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <div
          role="status"
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: BG[toast.kind],
            color: 'var(--color-paper)',
            padding: '10px 18px',
            borderRadius: 999,
            fontSize: 13,
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            zIndex: 100,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {toast.msg}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
