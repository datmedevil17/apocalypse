import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle, XCircle, Loader2, Info, ExternalLink, X } from "lucide-react";
import "./Toast.css";

// ============================================================
// Types
// ============================================================
export type ToastType = "success" | "error" | "loading" | "info";

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    txHash?: string;
    isEr?: boolean; // true = Ephemeral Rollup tx, link to Solscan custom endpoint
    duration?: number; // ms, 0 = manual dismiss only
}

interface ToastContextValue {
    toasts: Toast[];
    toast: (t: Omit<Toast, "id">) => string;
    dismiss: (id: string) => void;
    updateToast: (id: string, updates: Partial<Omit<Toast, "id">>) => void;
}

// ============================================================
// Context
// ============================================================
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const counterRef = useRef(0);

    const dismiss = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toast = useCallback((t: Omit<Toast, "id">): string => {
        const id = `toast-${++counterRef.current}`;
        setToasts(prev => [...prev, { ...t, id }]);
        const duration = t.duration ?? (t.type === "loading" ? 0 : 6000);
        if (duration > 0) setTimeout(() => dismiss(id), duration);
        return id;
    }, [dismiss]);

    const updateToast = useCallback((id: string, updates: Partial<Omit<Toast, "id">>) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
        const updated = updates;
        if (updated.type && updated.type !== "loading") {
            const duration = updated.duration ?? 6000;
            if (duration > 0) setTimeout(() => dismiss(id), duration);
        }
    }, [dismiss]);

    return (
        <ToastContext.Provider value={{ toasts, toast, dismiss, updateToast }}>
            {children}
            <ToastContainer toasts={toasts} dismiss={dismiss} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
}

// ============================================================
// Helpers for async tx toasts
// ============================================================
export function useToastTx() {
    const { toast, updateToast } = useToast();

    return useCallback(async (
        fn: () => Promise<string>,
        labels: { pending: string; success: string; errorPrefix?: string; isEr?: boolean }
    ): Promise<string> => {
        const id = toast({ type: "loading", title: labels.pending, duration: 0 });
        try {
            const txHash = await fn();
            const short = `${txHash.slice(0, 8)}…${txHash.slice(-6)}`;
            updateToast(id, {
                type: "success",
                title: labels.success,
                message: `Tx: ${short}`,
                txHash,
                isEr: labels.isEr,
            });
            return txHash;
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            updateToast(id, {
                type: "error",
                title: labels.errorPrefix ?? "Transaction failed",
                message: msg.slice(0, 120),
            });
            throw err;
        }
    }, [toast, updateToast]);
}

// ============================================================
// Toast UI
// ============================================================
const ICONS: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="toast-icon success" size={20} />,
    error: <XCircle className="toast-icon error" size={20} />,
    loading: <Loader2 className="toast-icon loading animate-spin" size={20} />,
    info: <Info className="toast-icon info" size={20} />,
};

function ToastItem({ t, dismiss }: { t: Toast; dismiss: (id: string) => void }) {
    return (
        <div className={`toast-item ${t.type}`}>
            {ICONS[t.type]}
            <div className="toast-content">
                <p className="toast-title">{t.title}</p>
                {t.message && (
                    <p className="toast-message">{t.message}</p>
                )}
                {t.txHash && (
                    <a
                        href={
                            t.isEr
                                ? `https://solscan.io/tx/${t.txHash}?cluster=custom&customUrl=https://devnet.magicblock.app`
                                : `https://explorer.solana.com/tx/${t.txHash}?cluster=devnet`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="toast-link"
                    >
                        {t.isEr ? "View ER Explorer" : "View Explorer"} <ExternalLink size={12} />
                    </a>
                )}
            </div>
            <button
                onClick={() => dismiss(t.id)}
                className="toast-close"
            >
                <X size={14} />
            </button>
        </div>
    );
}

function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
    return (
        <div className="toast-container">
            {toasts.map(t => <ToastItem key={t.id} t={t} dismiss={dismiss} />)}
        </div>
    );
}
