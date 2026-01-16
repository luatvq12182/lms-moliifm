import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getMaterialEmbedApi } from "../api/materials";

function toSlidesMinimalEmbed(u = "") {
    if (!u) return "";

    // trường hợp BE trả fileId luôn (nếu sau này bạn đổi API)
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

    // fallback: giữ nguyên
    return u;
}

export default function SlideViewer() {
    const { id } = useParams();
    const nav = useNavigate();
    const { token } = useAuth();

    const [url, setUrl] = useState("");
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(true);

    const containerRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        (async () => {
            setErr("");
            setLoading(true);
            try {
                const data = await getMaterialEmbedApi(token, id);
                const raw = data.previewUrl || "";
                setUrl(toSlidesMinimalEmbed(raw));
            } catch (e) {
                setErr(e.message || "Không mở được slide");
            } finally {
                setLoading(false);
            }
        })();
    }, [id, token]);

    const toggleFullscreen = () => {
        const el = containerRef.current;
        if (!el) return;

        if (!document.fullscreenElement) {
            el.requestFullscreen?.();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        const onFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener("fullscreenchange", onFsChange);
        return () =>
            document.removeEventListener("fullscreenchange", onFsChange);
    }, []);

    return (
        <div ref={containerRef} className="h-screen w-screen bg-black">
            <div className="flex items-center justify-between px-3 py-2 text-white">
                <button
                    onClick={() => nav(-1)}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
                >
                    ← Quay lại
                </button>
                <div className="text-sm text-white/80">Trình chiếu</div>

                <button
                    onClick={toggleFullscreen}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
                    title="Toàn màn hình"
                >
                    {isFullscreen ? "⤢ Thu nhỏ" : "⛶ Toàn màn hình"}
                </button>
            </div>

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
                    <iframe
                        src={url}
                        title="Slide"
                        className="h-full w-full"
                        allowFullScreen
                    />
                )}
            </div>
        </div>
    );
}
