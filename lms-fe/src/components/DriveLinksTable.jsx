import React, { useMemo, useRef, useState } from "react";

function statusBadge(st) {
    if (st === "uploading")
        return "bg-amber-100 text-amber-700 border-amber-200";
    if (st === "done")
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (st === "error") return "bg-red-100 text-red-700 border-red-200";
    return "bg-zinc-100 text-zinc-600 border-zinc-200";
}
function statusLabel(st) {
    if (st === "uploading") return "đang tạo";
    if (st === "done") return "xong";
    if (st === "error") return "lỗi";
    return "chờ";
}

function makeRow() {
    return {
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        title: "",
        link: "",
        status: "pending",
        message: "",
    };
}

export default function DriveLinksTable({
    folderName,
    folderId,
    isAdmin,
    accessEditorNode,
    createOneFromGoogleLink, // async ({folderId, title, googleLink, visibility, allowTeacherIds})
    visibility,
    allowIds,
    onUploadedDone,
}) {
    const [rows, setRows] = useState(() => Array.from({ length: 5 }, makeRow));
    const [uploading, setUploading] = useState(false);
    const stopRef = useRef(false);

    const stats = useMemo(() => {
        const total = rows.length;
        const done = rows.filter((x) => x.status === "done").length;
        const err = rows.filter((x) => x.status === "error").length;
        const uploadingCount = rows.filter(
            (x) => x.status === "uploading"
        ).length;
        const pending = total - done - err - uploadingCount;
        const finished = done + err;
        const percent = total ? Math.round((finished / total) * 100) : 0;
        return { total, done, err, pending, uploadingCount, finished, percent };
    }, [rows]);

    function patchRow(id, patch) {
        setRows((prev) =>
            prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
        );
    }

    function addRows(n = 1) {
        if (uploading) return;
        setRows((prev) => [...prev, ...Array.from({ length: n }, makeRow)]);
    }

    function removeRow(id) {
        if (uploading) return;
        setRows((prev) => prev.filter((r) => r.id !== id));
    }

    function removeEmptyRows() {
        if (uploading) return;
        setRows((prev) =>
            prev.filter((r) => (r.title || "").trim() || (r.link || "").trim())
        );
    }

    async function startCreate(e) {
        e.preventDefault();
        if (!rows.length) return;
        if (typeof createOneFromGoogleLink !== "function") return;

        setUploading(true);
        stopRef.current = false;

        // reset status (giữ done nếu bạn muốn)
        setRows((prev) =>
            prev.map((r) => ({
                ...r,
                status: r.status === "done" ? "done" : "pending",
                message: "",
            }))
        );

        try {
            for (const r of rows) {
                if (stopRef.current) break;
                if (r.status === "done") continue;

                const title = (r.title || "").trim();
                const link = (r.link || "").trim();
                if (!title || !link) {
                    patchRow(r.id, {
                        status: "error",
                        message: "Thiếu tên hiển thị hoặc link",
                    });
                    continue;
                }

                patchRow(r.id, { status: "uploading", message: "" });

                try {
                    await createOneFromGoogleLink({
                        folderId: folderId || null,
                        title,
                        googleLink: link,
                        visibility: folderId ? undefined : visibility,
                        allowTeacherIds: folderId
                            ? undefined
                            : visibility === "restricted"
                            ? allowIds
                            : [],
                    });

                    patchRow(r.id, { status: "done", message: "" });
                } catch (err) {
                    patchRow(r.id, {
                        status: "error",
                        message: err?.message || "Tạo thất bại",
                    });
                }
            }

            await onUploadedDone?.();
        } finally {
            setUploading(false);
        }
    }

    return (
        <form onSubmit={startCreate} className="space-y-3">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                Tạo từ link Google vào:{" "}
                <span className="font-semibold">{folderName}</span>
                <div className="mt-1 text-xs text-zinc-500">
                    {folderId
                        ? "Tài liệu sẽ kế thừa quyền truy cập từ folder chứa nó."
                        : "Folder gốc: bạn có thể chọn quyền cho tài liệu."}
                </div>
            </div>

            {!folderId && isAdmin ? accessEditorNode : null}

            {/* progress */}
            {rows.length > 0 && (
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

                    <div className="mt-2 flex flex-wrap gap-2">
                        <button
                            type="button"
                            disabled={uploading}
                            onClick={() => addRows(1)}
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-60"
                        >
                            + Thêm 1 dòng
                        </button>
                        <button
                            type="button"
                            disabled={uploading}
                            onClick={() => addRows(5)}
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-60"
                        >
                            +5 dòng
                        </button>
                        <button
                            type="button"
                            disabled={uploading}
                            onClick={() => addRows(10)}
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-60"
                        >
                            +10 dòng
                        </button>

                        <button
                            type="button"
                            disabled={uploading}
                            onClick={removeEmptyRows}
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-60"
                        >
                            Xoá dòng rỗng
                        </button>

                        {uploading && (
                            <button
                                type="button"
                                onClick={() => (stopRef.current = true)}
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100"
                            >
                                Dừng sau dòng hiện tại
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* table */}
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <div className="grid grid-cols-12 gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600">
                    <div className="col-span-4">Tên hiển thị</div>
                    <div className="col-span-6">Link Google</div>
                    <div className="col-span-1">Trạng thái</div>
                    <div className="col-span-1 text-right">Xoá</div>
                </div>

                <div className="max-h-[45vh] overflow-auto">
                    {rows.map((r) => (
                        <div
                            key={r.id}
                            className="grid grid-cols-12 items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50"
                        >
                            <div className="col-span-4">
                                <input
                                    value={r.title}
                                    disabled={uploading}
                                    onChange={(e) =>
                                        patchRow(r.id, {
                                            title: e.target.value,
                                        })
                                    }
                                    placeholder="VD: Bài 12 - HSK3"
                                    className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm disabled:opacity-60"
                                />
                            </div>

                            <div className="col-span-6">
                                <input
                                    value={r.link}
                                    disabled={uploading}
                                    onChange={(e) =>
                                        patchRow(r.id, { link: e.target.value })
                                    }
                                    placeholder="https://docs.google.com/..."
                                    className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm disabled:opacity-60"
                                />
                                {r.status === "error" && r.message ? (
                                    <div
                                        className="mt-1 truncate text-xs text-red-600"
                                        title={r.message}
                                    >
                                        {r.message}
                                    </div>
                                ) : null}
                            </div>

                            <div className="col-span-1">
                                <span
                                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${statusBadge(
                                        r.status
                                    )}`}
                                    title={r.message || ""}
                                >
                                    {statusLabel(r.status)}
                                </span>
                            </div>

                            <div className="col-span-1 flex justify-end">
                                <button
                                    type="button"
                                    disabled={uploading}
                                    onClick={() => removeRow(r.id)}
                                    className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-60"
                                    title="Xoá dòng"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* submit */}
            <button
                type="submit"
                disabled={uploading || rows.length === 0}
                className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
                {uploading ? "Đang tạo..." : `Tạo ${rows.length} tài liệu`}
            </button>
        </form>
    );
}
