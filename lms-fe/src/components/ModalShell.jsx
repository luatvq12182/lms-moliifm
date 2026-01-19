import React, { useEffect } from "react";

export default function ModalShell({
    open,
    title,
    onClose,
    disableClose = false,
    children,
    maxWidthClass = "max-w-4xl",
}) {
    if (!open) return null;

    // ESC to close
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape" && !disableClose) onClose?.();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose, disableClose]);

    return (
        <div className="fixed inset-0 z-50">
            <div
                className="absolute inset-0 bg-black/40"
                onClick={() => (disableClose ? null : onClose?.())}
            />
            <div className="absolute left-1/2 top-1/2 w-[92%] -translate-x-1/2 -translate-y-1/2">
                <div
                    className={`flex max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl ${maxWidthClass} mx-auto`}
                >
                    <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
                        <div className="text-base font-semibold">{title}</div>
                        <button
                            type="button"
                            disabled={disableClose}
                            onClick={() => (disableClose ? null : onClose?.())}
                            className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-60"
                        >
                            Đóng
                        </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
