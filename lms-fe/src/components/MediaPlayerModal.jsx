import React, { useEffect, useMemo } from "react";

export default function MediaPlayerModal({
    open,
    onClose,
    title,
    src,
    mimeType,
    ext,
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === "Escape" && onClose?.();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    const type = useMemo(() => {
        const mt = String(mimeType || "").toLowerCase();
        const e = String(ext || "")
            .toLowerCase()
            .replace(/^\./, "");

        // ưu tiên mimeType
        if (mt.startsWith("image/")) return "image";
        if (mt.startsWith("video/")) return "video";
        if (mt.startsWith("audio/")) return "audio";

        // fallback theo ext
        const imgExt = new Set([
            "jpg",
            "jpeg",
            "png",
            "webp",
            "gif",
            "bmp",
            "svg",
        ]);
        const videoExt = new Set(["mp4", "webm", "mov", "m4v"]);
        const audioExt = new Set(["mp3", "wav", "m4a", "ogg", "aac"]);

        if (imgExt.has(e)) return "image";
        if (videoExt.has(e)) return "video";
        if (audioExt.has(e)) return "audio";

        return "unknown";
    }, [mimeType, ext]);

    const header = useMemo(() => {
        if (type === "video") return { icon: "📺", fallback: "Phát video" };
        if (type === "audio") return { icon: "🔊", fallback: "Phát âm thanh" };
        if (type === "image") return { icon: "🖼️", fallback: "Xem hình ảnh" };
        return { icon: "📄", fallback: "Xem nội dung" };
    }, [type]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            {/* overlay */}
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />

            {/* modal */}
            <div className="absolute left-1/2 top-1/2 w-[92%] max-w-5xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
                {/* header */}
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 truncate text-sm font-semibold">
                        {header.icon} {title || header.fallback}
                    </div>
                    <button
                        onClick={onClose}
                        className="shrink-0 rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                    >
                        Đóng
                    </button>
                </div>

                {/* body */}
                {type === "video" ? (
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
                ) : type === "audio" ? (
                    <audio
                        src={src}
                        controls
                        autoPlay
                        controlsList="nodownload noplaybackrate noremoteplayback"
                        disableRemotePlayback
                        className="w-full"
                    />
                ) : type === "image" ? (
                    <div className="flex max-h-[75vh] items-center justify-center overflow-hidden rounded-xl bg-zinc-950">
                        <img
                            src={src}
                            alt={title || "image"}
                            className="max-h-[75vh] w-auto max-w-full object-contain"
                            draggable={false}
                            onContextMenu={(e) => e.preventDefault()} // chặn menu chuột phải (không tuyệt đối)
                        />
                    </div>
                ) : (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                        Không hỗ trợ preview loại file này.
                        <div className="mt-2 break-all text-xs text-zinc-500">
                            {src}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
