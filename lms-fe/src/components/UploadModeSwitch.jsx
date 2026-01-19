import React from "react";

export default function UploadModeSwitch({ mode, setMode }) {
    return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="text-sm font-semibold text-zinc-900">
                Chọn kiểu upload
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={() => setMode("local")}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                        mode === "local"
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                    }`}
                >
                    📁 Upload file (audio/video/ảnh...)
                </button>

                <button
                    type="button"
                    onClick={() => setMode("google")}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                        mode === "google"
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                    }`}
                >
                    📄 Nhập link Google (Slides/Docs/Sheets)
                </button>
            </div>
        </div>
    );
}
