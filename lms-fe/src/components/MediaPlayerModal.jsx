import React, { useEffect, useMemo } from "react";

export default function MediaPlayerModal({
    open,
    onClose,
    title,
    src,
    mimeType,
    ext,
}) {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === "Escape" && onClose?.();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    const isVideo = useMemo(() => {
        if ((mimeType || "").startsWith("video/")) return true;
        const e = String(ext || "").toLowerCase();
        return e === "mp4";
    }, [mimeType, ext]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            {/* overlay */}
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />

            {/* modal */}
            <div className="absolute left-1/2 top-1/2 w-[92%] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
                {/* header */}
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 truncate text-sm font-semibold">
                        {isVideo ? "📺" : "🔊"}{" "}
                        {title || (isVideo ? "Phát video" : "Phát âm thanh")}
                    </div>
                    <button
                        onClick={onClose}
                        className="shrink-0 rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                    >
                        Đóng
                    </button>
                </div>

                {/* player */}
                {isVideo ? (
                    <video
                        src={src}
                        controls
                        autoPlay
                        playsInline
                        controlsList="nodownload noplaybackrate noremoteplayback"
                        disablePictureInPicture
                        disableRemotePlayback
                        className="w-full max-h-[70vh] rounded-xl bg-black"
                    />
                ) : (
                    <audio
                        src={src}
                        controls
                        autoPlay
                        controlsList="nodownload noplaybackrate noremoteplayback"
                        disableRemotePlayback
                        className="w-full"
                    />
                )}
            </div>
        </div>
    );
}
