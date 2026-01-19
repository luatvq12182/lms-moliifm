import React, { useMemo, useRef, useState } from "react";

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

export default function LocalFilesTable({
    folderName,
    folderId,
    isAdmin,
    accessEditorNode,
    uploadOneLocal, // async ({folderId, file, title, visibility, allowTeacherIds})
    visibility,
    allowIds,
    onUploadedDone,
}) {
    const [items, setItems] = useState([]); // [{file,title,status,message}]
    const [uploading, setUploading] = useState(false);
    const stopRef = useRef(false);

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

    function markRow(idx, patch) {
        setItems((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], ...patch };
            return next;
        });
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

    async function startUpload(e) {
        e.preventDefault();
        if (!items.length) return;
        if (typeof uploadOneLocal !== "function") return;

        setUploading(true);
        stopRef.current = false;

        setItems((prev) =>
            prev.map((x) => ({
                ...x,
                status: x.status === "done" ? "done" : "pending",
                message: "",
            }))
        );

        try {
            for (let i = 0; i < items.length; i++) {
                if (stopRef.current) break;
                const row = items[i];
                if (row.status === "done") continue;

                markRow(i, { status: "uploading", message: "" });

                try {
                    await uploadOneLocal({
                        folderId: folderId || null,
                        file: row.file,
                        title: row.title,
                        visibility: folderId ? undefined : visibility,
                        allowTeacherIds: folderId
                            ? undefined
                            : visibility === "restricted"
                            ? allowIds
                            : [],
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
        <form onSubmit={startUpload} className="space-y-3">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                Upload file vào:{" "}
                <span className="font-semibold">{folderName}</span>
                <div className="mt-1 text-xs text-zinc-500">
                    {folderId
                        ? "File sẽ kế thừa quyền truy cập từ folder chứa nó."
                        : "Folder gốc: bạn có thể chọn quyền cho file."}
                </div>
            </div>

            {!folderId && isAdmin ? accessEditorNode : null}

            {items.length > 0 && (
                <div className="rounded-xl border border-zinc-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-zinc-800">
                            Tiến trình: {stats.finished}/{stats.total} (
                            {stats.percent}%)
                        </div>
                        <div className="text-xs text-zinc-600">
                            xong: <b>{stats.done}</b> • lỗi: <b>{stats.err}</b>{" "}
                            • chờ: <b>{stats.pending}</b>
                        </div>
                    </div>

                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                        <div
                            className="h-full bg-zinc-900"
                            style={{ width: `${stats.percent}%` }}
                        />
                    </div>

                    {uploading && (
                        <div className="mt-2">
                            <button
                                type="button"
                                onClick={() => (stopRef.current = true)}
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100"
                            >
                                Dừng sau file hiện tại
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="rounded-xl border border-zinc-200 bg-white p-3">
                <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-zinc-800">
                        Chọn nhiều file
                    </div>
                    <div className="text-xs text-zinc-500">
                        Đã chọn:{" "}
                        <span className="font-semibold">{items.length}</span>
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
                    <div className="mt-1 text-xs text-zinc-500">
                        Upload nhiều file, hệ thống sẽ chạy tuần tự để tránh
                        nghẽn.
                    </div>
                </div>
            </div>

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

                    <div className="max-h-[45vh] overflow-auto">
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
                                        className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm disabled:opacity-60"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <span
                                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${statusBadge(
                                            row.status
                                        )}`}
                                        title={row.message || ""}
                                    >
                                        {statusLabel(row.status)}
                                    </span>
                                    {row.status === "error" && row.message ? (
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
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <button
                type="submit"
                disabled={uploading || items.length === 0}
                className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
                {uploading ? "Đang upload..." : `Upload ${items.length} file`}
            </button>
        </form>
    );
}
