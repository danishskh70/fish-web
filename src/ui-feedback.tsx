import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { Sheet, Btn, Icon } from "./lib";

/* ---------- Toast ---------- */
export interface ToastItem {
  id: string;
  message: string;
  type: "ok" | "bad" | "info";
}

interface ToastContextValue {
  toast: (message: string, type?: "ok" | "bad" | "info") => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  success: () => {},
  error: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: "ok" | "bad" | "info" = "ok") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    setTimeout(() => removeToast(id), 3500);
  }, [removeToast]);

  const success = useCallback((msg: string) => toast(msg, "ok"), [toast]);
  const error = useCallback((msg: string) => toast(msg, "bad"), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      <div className="toaster-container" aria-live="polite" role="region">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-item ${t.type}`} onClick={() => removeToast(t.id)}>
            <Icon n={t.type === "bad" ? "alert" : t.type === "info" ? "clock" : "check"} size={18} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/* ---------- Confirm Sheet Dialog ---------- */
export interface ConfirmOptions {
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue>({
  confirm: async () => false,
});

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (val: boolean) => void }) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...opts, resolve });
    });
  }, []);

  const handleChoice = (val: boolean) => {
    if (state) {
      state.resolve(val);
      setState(null);
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <Sheet onClose={() => handleChoice(false)}>
          <h3>{state.title}</h3>
          {state.body && <div className="sub mb" style={{ lineHeight: 1.4 }}>{state.body}</div>}
          <div className="row mt">
            <Btn
              block
              variant={state.danger ? "danger" : ""}
              onClick={() => handleChoice(true)}
            >
              {state.confirmLabel ?? "Confirm"}
            </Btn>
            <Btn
              block
              variant="ghost"
              onClick={() => handleChoice(false)}
            >
              {state.cancelLabel ?? "Cancel"}
            </Btn>
          </div>
        </Sheet>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  return ctx.confirm;
};

/* ---------- Error Boundary ---------- */
interface ErrorBoundaryProps {
  children: React.ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Component error captured
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page center" style={{ paddingTop: 80, paddingLeft: 20, paddingRight: 20 }}>
          <div className="avatar warn" style={{ margin: "0 auto 16px", width: 64, height: 64 }}>
            <Icon n="alert" size={32} />
          </div>
          <h2 style={{ fontSize: "1.4rem", marginBottom: 8 }}>Something went wrong</h2>
          <div className="sub mb" style={{ maxWidth: 360, margin: "0 auto 20px" }}>
            An unexpected render error occurred. Your saved data is safe on the server.
          </div>
          {this.state.error?.message && (
            <div className="alert bad mb" style={{ textAlign: "left", fontSize: "0.82rem" }}>
              {this.state.error.message}
            </div>
          )}
          <div className="row" style={{ justifyContent: "center", gap: 10 }}>
            <button
              className="btn"
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = "/dashboard";
              }}
            >
              Go to Dashboard
            </button>
            <button
              className="btn outline"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ---------- Debounced Search Input ---------- */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className = "",
  delay = 200,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  delay?: number;
}) {
  const [inner, setInner] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInner(value);
  }, [value]);

  const handleChange = (newVal: string) => {
    setInner(newVal);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onChange(newVal);
    }, delay);
  };

  const handleClear = () => {
    setInner("");
    onChange("");
  };

  return (
    <div className={`srch ${className}`}>
      <Icon n="search" size={18} />
      <input
        className="input"
        placeholder={placeholder}
        value={inner}
        onChange={(e) => handleChange(e.target.value)}
        aria-label={placeholder}
      />
      {inner && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--mut)",
            padding: 4,
            display: "grid",
            placeItems: "center",
          }}
        >
          <Icon n="minus" size={16} />
        </button>
      )}
    </div>
  );
}

/* ---------- Skeleton Shimmer Loader ---------- */
export function Skeleton({
  width,
  height = 20,
  radius = 8,
  className = "",
  style = {},
}: {
  width?: string | number;
  height?: string | number;
  radius?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        width: width ?? "100%",
        height,
        borderRadius: radius,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

/* ---------- Number Badge ---------- */
export function NumberBadge({ count, tone = "bad" }: { count: number; tone?: "bad" | "warn" | "info" | "ok" }) {
  if (count <= 0) return null;
  return (
    <span className={`badge-pill ${tone}`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
