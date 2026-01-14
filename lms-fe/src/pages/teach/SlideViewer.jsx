import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:7474";

export default function SlideViewer() {
    const { id } = useParams();
    const { token } = useAuth();
    const [url, setUrl] = useState("");
    const [err, setErr] = useState("");

    useEffect(() => {
        (async () => {
            setErr("");
            const res = await fetch(`${API_BASE}/api/materials/${id}/embed`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) return setErr(data?.message || "Không mở được");
            setUrl(data.previewUrl);
        })();
    }, [id, token]);

    if (err) return <div className="p-4 text-red-600">{err}</div>;
    if (!url) return <div className="p-4">Đang tải...</div>;

    return (
        <div className="h-[calc(100vh-0px)] w-full bg-black">
            <iframe
                src={url}
                title="Slide"
                className="h-full w-full"
                allowFullScreen
            />
        </div>
    );
}
