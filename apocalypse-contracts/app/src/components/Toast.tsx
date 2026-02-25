import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle, XCircle, Loader2, Info, ExternalLink, X } from "lucide-react";

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
    success: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
    error: <XCircle className="w-5 h-5 text-red-400    shrink-0 mt-0.5" />,
    loading: <Loader2 className="w-5 h-5 text-violet-400  shrink-0 mt-0.5 animate-spin" />,
    info: <Info className="w-5 h-5 text-sky-400     shrink-0 mt-0.5" />,
};

const BORDERS: Record<ToastType, string> = {
    success: "border-emerald-500/40",
    error: "border-red-500/40",
    loading: "border-violet-500/40",
    info: "border-sky-500/40",
};

function ToastItem({ t, dismiss }: { t: Toast; dismiss: (id: string) => void }) {
    return (
        <div
            className={`relative flex gap-3 p-4 rounded-xl border bg-zinc-900/95 backdrop-blur-sm shadow-2xl text-sm max-w-sm w-full transition-all duration-300 ${BORDERS[t.type]}`}
        >
            {ICONS[t.type]}
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-white leading-snug">{t.title}</p>
                {t.message && (
                    <p className="text-zinc-400 mt-0.5 text-xs leading-relaxed break-all">{t.message}</p>
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
                        className="inline-flex items-center gap-1 mt-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                    >
                        {t.isEr ? "View on ER Explorer" : "View on Explorer"} <ExternalLink className="w-3 h-3" />
                    </a>
                )}
            </div>
            <button
                onClick={() => dismiss(t.id)}
                className="absolute top-2 right-2 text-zinc-600 hover:text-zinc-300 transition-colors"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end">
            {toasts.map(t => <ToastItem key={t.id} t={t} dismiss={dismiss} />)}
        </div>
    );
}
