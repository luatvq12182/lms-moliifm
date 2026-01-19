import React, { useMemo, useState } from "react";
import { absUrl } from "../../../utils/url";

export default function AccessEditor({
    teachers,
    visibility,
    setVisibility,
    allowIds,
    setAllowIds,
}) {
    const isRestricted = visibility === "restricted";
    const [kw, setKw] = useState("");

    const filtered = useMemo(() => {
        const k = kw.trim().toLowerCase();
        if (!k) return teachers;
        return teachers.filter((t) => {
            const name = String(t.name || "").toLowerCase();
            const email = String(t.email || "").toLowerCase();
            return name.includes(k) || email.includes(k);
        });
    }, [teachers, kw]);

    function toggle(id) {
        setAllowIds((prev) => {
            const s = new Set(prev);
            if (s.has(id)) s.delete(id);
            else s.add(id);
            return Array.from(s);
        });
    }

    function getAvatarUrl(t) {
        const u = t.avatarUrl || t.avatar || t.avatarPath || "";
        return u ? absUrl(u) : "";
    }

    function letterOf(t) {
        return (
            String(t.name || t.email || "A")
                .trim()
                .slice(0, 1)
                .toUpperCase() || "A"
        );
    }

    return (
        <div className="space-y-3">
            <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Quyền truy cập
                </label>
                <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                    <option value="public">Công khai (mọi giảng viên)</option>
                    <option value="restricted">Giới hạn theo giảng viên</option>
                </select>
            </div>

            {isRestricted && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <div className="mb-2 text-xs font-semibold text-zinc-600">
                        Chọn giảng viên được phép xem
                    </div>

                    <div className="mb-2">
                        <input
                            value={kw}
                            onChange={(e) => setKw(e.target.value)}
                            placeholder="Tìm theo tên hoặc email..."
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                        />
                        <div className="mt-1 text-xs text-zinc-500">
                            {filtered.length}/{teachers.length} kết quả
                        </div>
                    </div>

                    {teachers.length === 0 ? (
                        <div className="text-sm text-zinc-500">
                            Chưa có giảng viên.
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-sm text-zinc-500">
                            Không tìm thấy giảng viên phù hợp.
                        </div>
                    ) : (
                        <div className="max-h-[300px] overflow-auto space-y-1">
                            {filtered.map((t) => {
                                const avatar = getAvatarUrl(t);
                                const checked = allowIds.includes(t._id);
                                return (
                                    <label
                                        key={t._id}
                                        className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm hover:bg-zinc-50"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggle(t._id)}
                                        />

                                        <div className="h-9 w-9 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                                            {avatar ? (
                                                <img
                                                    src={avatar}
                                                    alt="avatar"
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="grid h-full w-full place-items-center text-sm font-semibold text-zinc-700">
                                                    {letterOf(t)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="truncate font-medium text-zinc-900">
                                                {t.name || "—"}
                                            </div>
                                            <div className="truncate text-xs text-zinc-500">
                                                {t.email}
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-2 text-xs text-zinc-500">
                        * Những người không được chọn sẽ không nhìn thấy
                        folder/file này.
                    </div>
                </div>
            )}
        </div>
    );
}
