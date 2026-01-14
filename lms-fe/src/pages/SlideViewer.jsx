import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getMaterialEmbedApi } from "../api/materials";

export default function SlideViewer() {
    const { id } = useParams();
    const nav = useNavigate();
    const { token } = useAuth();

    const [url, setUrl] = useState("");
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setErr("");
            setLoading(true);
            try {
                const data = await getMaterialEmbedApi(token, id);
                setUrl(data.previewUrl || "");
            } catch (e) {
                setErr(e.message || "Không mở được slide");
            } finally {
                setLoading(false);
            }
        })();
    }, [id, token]);

    return (
        <div className="h-screen w-screen bg-black">
            <div className="flex items-center justify-between px-3 py-2 text-white">
                <button
                    onClick={() => nav(-1)}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
                >
                    ← Quay lại
                </button>
                <div className="text-sm text-white/80">Trình chiếu</div>
                <div className="w-[80px]" />
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
