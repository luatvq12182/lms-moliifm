// components/UploadMaterialsModal.jsx
import React, { useMemo, useState } from "react";

function fmtKB(bytes = 0) {
    const b = Number(bytes) || 0;
    if (!b) return "";
    const kb = b / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
}

function statusBadge(st) {
    if (st === "uploading")
        return "bg-amber-100 text-amber-700 border-amber-200";
    if (st === "done")
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (st === "error") return "bg-red-100 text-red-700 border-red-200";
    return "bg-zinc-100 text-zinc-600 border-zinc-200";
}

function statusLabel(st) {
    if (st === "uploading") return "đang upload";
    if (st === "done") return "xong";
    if (st === "error") return "lỗi";
    return "chờ";
}

// ✅ UI select quyền (giữ y hệt của bạn, hoặc import từ file Materials nếu bạn đã tách)
function AccessEditor({
    teachers,
    visibility,
    setVisibility,
    allowIds,
    setAllowIds,
    absUrl,
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
        return u ? absUrl?.(u) || u : "";
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

// ✅ Modal wrapper (nếu bạn đã có Modal riêng thì import thay vì copy)
function Modal({ open, title, children, onClose }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="absolute left-1/2 top-1/2 w-[92%] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
                <div className="mb-3 flex items-center justify-between">
                    <div className="text-base font-semibold">{title}</div>
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                        type="button"
                    >
                        Đóng
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

/**
 * Props:
 * - open, onClose
 * - folderId, path
 * - isAdmin
 * - teachers, absUrl
 * - uploadOne({folderId, visibility, allowTeacherIds, file, title})
 * - onUploadedDone()  (optional) gọi refresh list
 */
export default function UploadMaterialsModal({
    open,
    onClose,
    folderId,
    path,
    isAdmin,
    teachers = [],
    absUrl,
    uploadOne,
    onUploadedDone,
}) {
    const [items, setItems] = useState([]); // [{file,title,status,message}]
    const [visibility, setVisibility] = useState("public");
    const [allowIds, setAllowIds] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [stopFlag, setStopFlag] = useState(false);

    const folderName = path?.length ? path[path.length - 1].name : "Folder gốc";

    const stats = useMemo(() => {
        const total = items.length;
        const done = items.filter((x) => x.status === "done").length;
        const err = items.filter((x) => x.status === "error").length;
        const uploadingCount = items.filter(
            (x) => x.status === "uploading"
        ).length;
        const pending = total - done - err - uploadingCount;
        const finished = done + err;
        const percent = total ? Math.round((finished / total) * 100) : 0;
        return { total, done, err, pending, uploadingCount, finished, percent };
    }, [items]);

    function resetAll() {
        setItems([]);
        setVisibility("public");
        setAllowIds([]);
        setUploading(false);
        setStopFlag(false);
    }

    function handleClose() {
        if (uploading) return; // đang chạy thì không cho đóng để tránh rối
        resetAll();
        onClose?.();
    }

    function onPickFiles(e) {
        const picked = Array.from(e.target.files || []);
        if (!picked.length) return;

        setItems((prev) => {
            const key = new Set(
                prev.map(
                    (x) =>
                        `${x.file?.name}_${x.file?.size}_${x.file?.lastModified}`
                )
            );
            const add = picked
                .filter((f) => {
                    const k = `${f.name}_${f.size}_${f.lastModified}`;
                    if (key.has(k)) return false;
                    key.add(k);
                    return true;
                })
                .map((file) => ({
                    file,
                    title: "",
                    status: "pending",
                    message: "",
                }));
            return [...prev, ...add];
        });

        e.target.value = "";
    }

    function removeRow(idx) {
        if (uploading) return;
        setItems((prev) => prev.filter((_, i) => i !== idx));
    }

    function clearDone() {
        if (uploading) return;
        setItems((prev) => prev.filter((x) => x.status !== "done"));
    }

    function markRow(idx, patch) {
        setItems((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], ...patch };
            return next;
        });
    }

    async function startUpload(e) {
        e.preventDefault();
        if (!items.length) return;
        if (typeof uploadOne !== "function") return;

        setUploading(true);
        setStopFlag(false);

        // reset status trước khi chạy
        setItems((prev) =>
            prev.map((x) => ({
                ...x,
                status: x.status === "done" ? "done" : "pending", // giữ done nếu bạn muốn
                message: "",
            }))
        );

        try {
            for (let i = 0; i < items.length; i++) {
                if (stopFlag) break;

                const row = items[i];
                // skip những row đã done (nếu bạn muốn)
                if (row.status === "done") continue;

                markRow(i, { status: "uploading", message: "" });

                try {
                    await uploadOne({
                        folderId: folderId || null,
                        visibility: folderId ? undefined : visibility,
                        allowTeacherIds: folderId
                            ? undefined
                            : visibility === "restricted"
                            ? allowIds
                            : [],
                        file: row.file,
                        title: row.title,
                    });
                    markRow(i, { status: "done", message: "" });
                } catch (err) {
                    markRow(i, {
                        status: "error",
                        message: err?.message || "Upload thất bại",
                    });
                }
            }

            await onUploadedDone?.();
        } finally {
            setUploading(false);
        }
    }

    return (
        <Modal open={open} title="Upload tài liệu" onClose={handleClose}>
            <form onSubmit={startUpload} className="space-y-3">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                    Upload vào:{" "}
                    <span className="font-semibold">{folderName}</span>
                    <div className="mt-1 text-xs text-zinc-500">
                        {folderId
                            ? "File sẽ kế thừa quyền truy cập từ folder chứa nó."
                            : "Folder gốc: bạn có thể chọn quyền cho file."}
                    </div>
                </div>

                {!folderId && isAdmin && (
                    <AccessEditor
                        teachers={teachers}
                        visibility={visibility}
                        setVisibility={setVisibility}
                        allowIds={allowIds}
                        setAllowIds={setAllowIds}
                        absUrl={absUrl}
                    />
                )}

                {/* progress tổng */}
                {items.length > 0 && (
                    <div className="rounded-xl border border-zinc-200 bg-white p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-zinc-800">
                                Tiến trình: {stats.finished}/{stats.total} (
                                {stats.percent}%)
                            </div>
                            <div className="text-xs text-zinc-600">
                                xong: <b>{stats.done}</b> • lỗi:{" "}
                                <b>{stats.err}</b> • chờ: <b>{stats.pending}</b>
                            </div>
                        </div>

                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                            <div
                                className="h-full bg-zinc-900"
                                style={{ width: `${stats.percent}%` }}
                            />
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                            <button
                                type="button"
                                disabled={uploading}
                                onClick={clearDone}
                                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-60"
                            >
                                Xoá khỏi list các file đã xong
                            </button>

                            {uploading && (
                                <button
                                    type="button"
                                    onClick={() => setStopFlag(true)}
                                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100"
                                >
                                    Dừng sau file hiện tại
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* picker */}
                <div className="rounded-xl border border-zinc-200 bg-white p-3">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-zinc-800">
                            Chọn nhiều file
                        </div>
                        <div className="text-xs text-zinc-500">
                            Đã chọn:{" "}
                            <span className="font-semibold">
                                {items.length}
                            </span>
                        </div>
                    </div>

                    <div className="mt-2">
                        <input
                            type="file"
                            multiple
                            onChange={onPickFiles}
                            disabled={uploading}
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm disabled:opacity-60"
                        />

                        <div className="mt-1 text-xs text-zinc-500">Upload tối đa 50 files, dung lượng mỗi file không quá 500MB.</div>
                    </div>
                </div>

                {/* table */}
                {items.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                        <div className="grid grid-cols-12 gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600">
                            <div className="col-span-4">Tên file</div>
                            <div className="col-span-5">
                                Tên hiển thị (tuỳ chọn)
                            </div>
                            <div className="col-span-2">Trạng thái</div>
                            <div className="col-span-1 text-right">Xoá</div>
                        </div>

                        <div className="max-h-[340px] overflow-auto">
                            {items.map((row, idx) => (
                                <div
                                    key={`${row.file?.name || "file"}-${idx}`}
                                    className="grid grid-cols-12 items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50"
                                >
                                    <div className="col-span-4 min-w-0">
                                        <div
                                            className="truncate font-medium"
                                            title={row.file?.name}
                                        >
                                            {row.file?.name}
                                        </div>
                                        <div className="truncate text-xs text-zinc-500">
                                            {fmtKB(row.file?.size)}
                                        </div>
                                    </div>

                                    <div className="col-span-5">
                                        <input
                                            value={row.title || ""}
                                            disabled={uploading}
                                            onChange={(e) =>
                                                markRow(idx, {
                                                    title: e.target.value,
                                                })
                                            }
                                            placeholder="VD: Bài 12 - HSK3"
                                            className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm disabled:opacity-60"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <span
                                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${statusBadge(
                                                row.status
                                            )}`}
                                            title={row.message || ""}
                                        >
                                            {statusLabel(row.status)}
                                            {row.status === "error"
                                                ? "⚠️"
                                                : row.status === "done"
                                                ? "✅"
                                                : ""}
                                        </span>
                                        {row.status === "error" &&
                                        row.message ? (
                                            <div
                                                className="mt-1 truncate text-xs text-red-600"
                                                title={row.message}
                                            >
                                                {row.message}
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="col-span-1 flex justify-end">
                                        <button
                                            type="button"
                                            disabled={uploading}
                                            onClick={() => removeRow(idx)}
                                            className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-60"
                                            title="Xoá file khỏi danh sách"
                                        >
                                            X
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* actions */}
                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={uploading || items.length === 0}
                        className="flex-1 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                    >
                        {uploading
                            ? "Đang upload..."
                            : items.length
                            ? `Upload ${items.length} file`
                            : "Chọn file"}
                    </button>

                    <button
                        type="button"
                        disabled={uploading}
                        onClick={handleClose}
                        className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm hover:bg-zinc-50 disabled:opacity-60"
                    >
                        Đóng
                    </button>
                </div>
            </form>
        </Modal>
    );
}
