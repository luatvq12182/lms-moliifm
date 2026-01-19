import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getMaterialEmbedApi } from "../api/materials";

function toSlidesMinimalEmbed(u = "") {
    if (!u) return "";

    // trường hợp BE trả fileId luôn
    if (/^[a-zA-Z0-9_-]{10,}$/.test(u)) {
        return `https://docs.google.com/presentation/d/${u}/embed?start=false&loop=false&delayms=3000&rm=minimal`;
    }

    // nếu là link docs.google.com/presentation/...
    if (u.includes("docs.google.com/presentation")) {
        const m = u.match(/\/presentation\/d\/([^/]+)/);
        const id = m?.[1];
        if (id) {
            return `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false&delayms=3000&rm=minimal`;
        }
    }

    return u;
}

function buildSlideHash(objectId) {
    if (!objectId) return "";
    // Google Slides hash format
    return `#slide=id.${objectId}`;
}

export default function SlideViewer() {
    const { id } = useParams();
    const { token } = useAuth();

    const [baseUrl, setBaseUrl] = useState(""); // embed base (no hash)
    const [slideData, setSlideData] = useState([]); // [{index, objectId, thumbnailUrl}]
    const [activeObjectId, setActiveObjectId] = useState(""); // "p5"
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(true);

    const containerRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // sidebar
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // trick: force iframe re-mount when changing slide (more reliable)
    const [iframeKey, setIframeKey] = useState(0);

    useEffect(() => {
        (async () => {
            setErr("");
            setLoading(true);
            try {
                const data = await getMaterialEmbedApi(token, id);

                const raw = data.previewUrl || "";
                const embed = toSlidesMinimalEmbed(raw);

                // remove existing hash (just in case)
                const cleanEmbed = embed.split("#")[0];

                setBaseUrl(cleanEmbed);

                const arr = Array.isArray(data.slideData) ? data.slideData : [];
                setSlideData(arr);

                // mặc định chọn slide đầu tiên nếu có
                const first = arr?.[0]?.objectId || "";
                setActiveObjectId(first);
            } catch (e) {
                setErr(e.message || "Không mở được slide");
            } finally {
                setLoading(false);
            }
        })();
    }, [id, token]);

    const iframeSrc = useMemo(() => {
        if (!baseUrl) return "";
        if (!activeObjectId) return baseUrl;
        return `${baseUrl}${buildSlideHash(activeObjectId)}`;
    }, [baseUrl, activeObjectId]);

    const toggleFullscreen = () => {
        const el = containerRef.current;
        if (!el) return;

        if (!document.fullscreenElement) {
            el.requestFullscreen?.();
            setIsFullscreen(true);

            if (sidebarOpen) {
                setSidebarOpen(false);
            }
        } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);

            if (!sidebarOpen) {
                setSidebarOpen(true);
            }
        }
    };

    useEffect(() => {
        const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", onFsChange);
        return () =>
            document.removeEventListener("fullscreenchange", onFsChange);
    }, []);

    function onPickSlide(s) {
        if (!s?.objectId) return;
        setActiveObjectId(s.objectId);

        // force reload iframe so Google receives the new hash reliably
        setIframeKey((k) => k + 1);
    }

    return (
        <div ref={containerRef} className="h-screen w-screen bg-black">
            {/* top bar */}
            <div className="flex items-center justify-between px-3 py-2 text-white">
                {/* <div className="flex items-center gap-2">
                    <button
                        onClick={() => setSidebarOpen((v) => !v)}
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
                        title="Ẩn/hiện danh sách trang"
                    >
                        {sidebarOpen ? "☰ Ẩn trang" : "☰ Hiện trang"}
                    </button>
                </div> */}

                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleFullscreen}
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
                        title="Toàn màn hình"
                    >
                        {isFullscreen ? "⤢ Thu nhỏ" : "⛶ Toàn màn hình"}
                    </button>
                </div>
            </div>

            {/* content */}
            <div className="h-[calc(100vh-48px)] w-full">
                {loading ? (
                    <div className="grid h-full place-items-center text-white/80">
                        Đang tải...
                    </div>
                ) : err ? (
                    <div className="grid h-full place-items-center px-4 text-center text-red-200">
                        {err}
                    </div>
                ) : (
                    <div className="flex h-full w-full">
                        {/* sidebar */}
                        {sidebarOpen && (
                            <aside className="h-full w-[260px] shrink-0 border-r border-white/10 bg-zinc-950">
                                <div className="flex items-center justify-between px-3 py-2">
                                    <div className="text-xs font-semibold text-white/70">
                                        Trang ({slideData.length})
                                    </div>
                                </div>

                                <div className="h-[calc(100%-40px)] overflow-auto px-2 pb-3">
                                    <div className="space-y-2">
                                        {slideData.map((s) => {
                                            const active =
                                                String(s.objectId) ===
                                                String(activeObjectId);
                                            return (
                                                <button
                                                    key={s.objectId}
                                                    onClick={() =>
                                                        onPickSlide(s)
                                                    }
                                                    className={`group w-full rounded-xl p-2 text-left ${
                                                        active
                                                            ? "bg-white/10 ring-1 ring-white/20"
                                                            : "hover:bg-white/5"
                                                    }`}
                                                    title={`Slide ${s.index}`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <div className="mt-1 w-6 shrink-0 text-xs font-semibold text-white/60">
                                                            {s.index}
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
                                                                <img
                                                                    src={
                                                                        s.thumbnailUrl
                                                                    }
                                                                    alt={`slide ${s.index}`}
                                                                    className="block w-full"
                                                                    loading="lazy"
                                                                    draggable={
                                                                        false
                                                                    }
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </aside>
                        )}

                        {/* iframe */}
                        <div className="h-full flex-1">
                            <iframe
                                key={iframeKey}
                                src={iframeSrc}
                                title="Slide"
                                className="h-full w-full"
                                allowFullScreen
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
