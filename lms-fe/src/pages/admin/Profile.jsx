import React, { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { uploadMyAvatarApi } from "../../api/users";
import { absUrl } from "../../utils/url";

function AvatarCircle({ url, name }) {
    const letter = String(name || "A")
        .trim()
        .slice(0, 1)
        .toUpperCase();
    return (
        <div className="h-20 w-20 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            {url ? (
                <img
                    src={url}
                    alt="avatar"
                    className="h-full w-full object-cover"
                />
            ) : (
                <div className="grid h-full w-full place-items-center text-2xl font-semibold text-zinc-700">
                    {letter}
                </div>
            )}
        </div>
    );
}

export default function Profile() {
    const { token, user, updateUser } = useAuth(); // ✅ cần setUser
    const [err, setErr] = useState("");
    const [ok, setOk] = useState("");
    const [uploading, setUploading] = useState(false);

    const [preview, setPreview] = useState("");

    const displayName = useMemo(() => user?.name || "User", [user?.name]);

    function pickPreview(file) {
        if (preview) URL.revokeObjectURL(preview);
        setPreview(file ? URL.createObjectURL(file) : "");
    }

    async function onPick(e) {
        setErr("");
        setOk("");
        const f = e.target.files?.[0];
        if (!f) return;

        if (!f.type.startsWith("image/")) {
            setErr("Avatar phải là ảnh (JPG/PNG/WEBP).");
            return;
        }
        if (f.size > 3 * 1024 * 1024) {
            setErr("Avatar tối đa 3MB.");
            return;
        }

        pickPreview(f);

        try {
            setUploading(true);
            const data = await uploadMyAvatarApi(token, f); // { avatarUrl }
            updateUser?.({ ...user, avatarUrl: data.avatarUrl }); // ✅ cập nhật UI ngay
            setOk("Đã cập nhật ảnh đại diện.");
        } catch (e2) {
            setErr(e2.message || "Upload thất bại");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    }

    return (
        <div className="max-w-2xl">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <div className="flex items-start gap-4">
                    <AvatarCircle
                        url={preview || absUrl(user?.avatarUrl)}
                        name={displayName}
                    />

                    <div className="min-w-0 flex-1">
                        <div className="text-base font-semibold text-zinc-900">
                            Hồ sơ của tôi
                        </div>
                        <div className="mt-1 text-sm text-zinc-600">
                            {user?.email}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <label className="cursor-pointer rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
                                {uploading ? "Đang tải..." : "Đổi ảnh đại diện"}
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={onPick}
                                    disabled={uploading}
                                />
                            </label>

                            {preview && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (preview)
                                            URL.revokeObjectURL(preview);
                                        setPreview("");
                                    }}
                                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
                                >
                                    Bỏ preview
                                </button>
                            )}
                        </div>

                        <div className="mt-2 text-xs text-zinc-500">
                            JPG/PNG/WEBP, tối đa 3MB
                        </div>
                    </div>
                </div>

                {err && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {err}
                    </div>
                )}
                {ok && (
                    <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                        {ok}
                    </div>
                )}
            </div>
        </div>
    );
}
