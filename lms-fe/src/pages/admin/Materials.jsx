import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import {
    listMaterialsApi,
    uploadMaterialApi,
    deleteMaterialApi,
} from "../../api/materials";
import {
    listFoldersApi,
    getFolderPathApi,
    createFolderApi,
    updateFolderApi,
    deleteFolderApi,
} from "../../api/folders";

function pickIcon(name = "", mime = "") {
    const n = (name || "").toLowerCase();
    const isPpt = n.endsWith(".ppt") || n.endsWith(".pptx");
    const isDoc = n.endsWith(".doc") || n.endsWith(".docx");
    const isPdf = n.endsWith(".pdf");
    const isXls = n.endsWith(".xls") || n.endsWith(".xlsx");

    if (isPpt) return { label: "P", cls: "bg-amber-400" };
    if (isDoc) return { label: "W", cls: "bg-blue-500" };
    if (isPdf) return { label: "PDF", cls: "bg-red-500" };
    if (isXls) return { label: "X", cls: "bg-emerald-500" };
    if ((mime || "").startsWith("image/"))
        return { label: "IMG", cls: "bg-zinc-500" };
    return { label: "F", cls: "bg-zinc-400" };
}

function fmtSize(bytes = 0) {
    const b = Number(bytes) || 0;
    if (b < 1024) return `${b} B`;
    const kb = b / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(1)} GB`;
}

function Modal({ open, title, children, onClose }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="absolute left-1/2 top-1/2 w-[92%] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
                <div className="mb-3 flex items-center justify-between">
                    <div className="text-base font-semibold">{title}</div>
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                    >
                        Đóng
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

function DriveCrumb({ path, onGoRoot, onGo }) {
    return (
        <div className="flex flex-wrap items-center gap-1 text-sm">
            <button
                onClick={onGoRoot}
                className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs hover:bg-zinc-50"
                title="Về Root"
            >
                🏠
            </button>

            {path.length > 0 && <span className="text-zinc-400">/</span>}

            {path.map((p, idx) => (
                <React.Fragment key={p._id}>
                    <button
                        onClick={() => onGo(p._id)}
                        className="max-w-[180px] truncate rounded-lg px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                        title={p.name}
                    >
                        {p.name}
                    </button>
                    {idx !== path.length - 1 && (
                        <span className="text-zinc-400">/</span>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

export default function Materials() {
    const { token, user } = useAuth();

    // drive state
    const [folderId, setFolderId] = useState(""); // "" = root
    const [path, setPath] = useState([]);
    const [folders, setFolders] = useState([]);
    const [materials, setMaterials] = useState([]);

    // search
    const [q, setQ] = useState("");

    // upload
    const [openUpload, setOpenUpload] = useState(false);
    const [uTitle, setUTitle] = useState("");
    const [uFile, setUFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    // create folder
    const [openCreateFolder, setOpenCreateFolder] = useState(false);
    const [fName, setFName] = useState("");

    // edit folder
    const [openEditFolder, setOpenEditFolder] = useState(false);
    const [editFolder, setEditFolder] = useState(null);
    const [efName, setEFName] = useState("");

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    async function refreshDrive(nextFolderId = folderId, nextQ = q) {
        setErr("");
        setLoading(true);
        try {
            const [fo, pa] = await Promise.all([
                listFoldersApi(token, { parentId: nextFolderId }),
                nextFolderId
                    ? getFolderPathApi(token, nextFolderId)
                    : Promise.resolve({ path: [] }),
            ]);

            setFolders(fo.folders || []);
            setPath(pa.path || []);

            const m = await listMaterialsApi(token, {
                folderId: nextFolderId || "", // "" => root
                q: nextQ.trim() ? nextQ.trim() : undefined,
            });
            setMaterials(m.items || []);
        } catch (e) {
            setErr(e.message || "Load thất bại");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        setFolderId("");
        refreshDrive("", "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredMaterials = useMemo(() => {
        const k = q.trim().toLowerCase();
        if (!k) return materials;
        return materials.filter((m) => {
            const a = (m.title || "").toLowerCase();
            const b = (m.originalName || "").toLowerCase();
            return a.includes(k) || b.includes(k);
        });
    }, [materials, q]);

    async function onEnterFolder(id) {
        setFolderId(id);
        await refreshDrive(id, q);
    }

    async function onGoRoot() {
        setFolderId("");
        await refreshDrive("", q);
    }

    async function onGoCrumb(id) {
        setFolderId(id);
        await refreshDrive(id, q);
    }

    async function onRefresh() {
        await refreshDrive(folderId, q);
    }

    async function onUpload(e) {
        e.preventDefault();
        if (!uFile) return setErr("Bạn chưa chọn file");

        setErr("");
        setUploading(true);
        try {
            await uploadMaterialApi(token, {
                title: uTitle,
                file: uFile,
                folderId: folderId || null, // root => null
            });

            setOpenUpload(false);
            setUTitle("");
            setUFile(null);

            await refreshDrive(folderId, q);
        } catch (e2) {
            setErr(e2.message || "Upload thất bại");
        } finally {
            setUploading(false);
        }
    }

    async function onDeleteMaterial(m) {
        if (user?.role !== "admin") return;
        if (!confirm(`Xoá tài liệu "${m.title}"?`)) return;

        setErr("");
        try {
            await deleteMaterialApi(token, m._id);
            await refreshDrive(folderId, q);
        } catch (e) {
            setErr(e.message || "Xoá thất bại");
        }
    }

    async function onCreateFolder(e) {
        e.preventDefault();
        if (!fName.trim()) return setErr("Bạn chưa nhập tên folder");

        setErr("");
        try {
            await createFolderApi(token, {
                name: fName.trim(),
                parentId: folderId || null,
            });

            setOpenCreateFolder(false);
            setFName("");
            await refreshDrive(folderId, q);
        } catch (e2) {
            setErr(e2.message || "Tạo folder thất bại");
        }
    }

    async function onDeleteFolder(f) {
        if (user?.role !== "admin") return;
        if (
            !confirm(
                `Xoá folder "${f.name}"? (sẽ xoá cả folder con + tài liệu bên trong)`
            )
        )
            return;

        setErr("");
        try {
            await deleteFolderApi(token, f._id);
            await refreshDrive(folderId, q);
        } catch (e) {
            setErr(e.message || "Xoá folder thất bại");
        }
    }

    function openEditFolderModal(f) {
        setEditFolder(f);
        setEFName(f?.name || "");
        setOpenEditFolder(true);
    }

    async function onSaveFolder(e) {
        e.preventDefault();
        if (!editFolder?._id) return;
        if (!efName.trim()) return setErr("Bạn chưa nhập tên folder");

        setErr("");
        try {
            await updateFolderApi(token, editFolder._id, {
                name: efName.trim(),
            });
            setOpenEditFolder(false);
            setEditFolder(null);
            setEFName("");
            await refreshDrive(folderId, q);
        } catch (e2) {
            setErr(e2.message || "Cập nhật folder thất bại");
        }
    }

    return (
        <div className="max-w-full">
            <div className="mb-4 flex flex-col gap-3">
                <div>
                    <div className="text-base font-semibold">
                        Tài liệu / Slide
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <DriveCrumb
                        path={path}
                        onGoRoot={onGoRoot}
                        onGo={onGoCrumb}
                    />

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Tìm theo tên file..."
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm sm:w-[320px]"
                        />

                        <button
                            onClick={onRefresh}
                            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
                        >
                            Tải lại
                        </button>

                        {user?.role === "admin" && (
                            <>
                                <button
                                    onClick={() => setOpenCreateFolder(true)}
                                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
                                >
                                    + Tạo folder
                                </button>
                                <button
                                    onClick={() => setOpenUpload(true)}
                                    className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                                >
                                    + Upload
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {err && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {err}
                </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                <div className="grid grid-cols-12 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-600">
                    <div className="col-span-7">Tên</div>
                    <div className="col-span-2">Loại</div>
                    <div className="col-span-3 text-right">Thao tác</div>
                </div>

                {loading ? (
                    <div className="px-4 py-4 text-sm">Đang tải...</div>
                ) : folders.length === 0 && filteredMaterials.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-zinc-500">
                        Thư mục trống
                    </div>
                ) : (
                    <>
                        {/* folders */}
                        {folders.map((f) => (
                            <div
                                key={f._id}
                                className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm hover:bg-zinc-50"
                            >
                                <div className="col-span-7 min-w-0">
                                    <button
                                        onClick={() => onEnterFolder(f._id)}
                                        className="flex w-full items-center gap-3 text-left"
                                        title={f.name}
                                    >
                                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-100 text-zinc-700">
                                            📁
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate font-medium">
                                                {f.name}
                                            </div>
                                        </div>
                                    </button>
                                </div>

                                <div className="col-span-2 text-xs text-zinc-600">
                                    Folder
                                </div>

                                <div className="col-span-3 text-right">
                                    {user?.role === "admin" ? (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() =>
                                                    openEditFolderModal(f)
                                                }
                                                className="rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs hover:bg-zinc-50"
                                                title="Sửa tên folder"
                                            >
                                                Sửa
                                            </button>

                                            <button
                                                onClick={() =>
                                                    onDeleteFolder(f)
                                                }
                                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700 hover:bg-red-100"
                                                title="Xoá folder"
                                            >
                                                Xoá
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-zinc-400">
                                            {" "}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* materials */}
                        {filteredMaterials.map((m) => {
                            const icon = pickIcon(
                                m.originalName || m.title,
                                m.mimeType
                            );
                            return (
                                <div
                                    key={m._id}
                                    className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm hover:bg-zinc-50"
                                >
                                    <div className="col-span-7 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-bold text-white ${icon.cls}`}
                                            >
                                                {icon.label}
                                            </div>

                                            <div className="min-w-0">
                                                <div className="truncate font-medium">
                                                    {m.title}
                                                </div>
                                                <div className="truncate text-xs text-zinc-500">
                                                    {m.originalName} •{" "}
                                                    {fmtSize(m.size)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-span-2 text-xs text-zinc-600">
                                        File
                                    </div>

                                    <div className="col-span-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <a
                                                href={`/viewer/${m._id}`}
                                                className="rounded-lg border border-zinc-200 px-3 py-1 text-xs hover:bg-white"
                                            >
                                                Xem
                                            </a>
                                            {user?.role === "admin" ? (
                                                <button
                                                    onClick={() =>
                                                        onDeleteMaterial(m)
                                                    }
                                                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700 hover:bg-red-100"
                                                    title="Xoá"
                                                >
                                                    Xoá
                                                </button>
                                            ) : (
                                                <span className="text-xs text-zinc-400">
                                                    {" "}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>

            {/* upload modal */}
            <Modal
                open={openUpload}
                title="Upload tài liệu"
                onClose={() => setOpenUpload(false)}
            >
                <form onSubmit={onUpload} className="space-y-3">
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                        Upload vào:{" "}
                        <span className="font-semibold">
                            {path.length ? path[path.length - 1].name : "Root"}
                        </span>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Tên hiển thị (tuỳ chọn)
                        </label>
                        <input
                            value={uTitle}
                            onChange={(e) => setUTitle(e.target.value)}
                            placeholder="VD: Bài 12 - HSK3"
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">
                            File
                        </label>
                        <input
                            type="file"
                            onChange={(e) =>
                                setUFile(e.target.files?.[0] || null)
                            }
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                            required
                        />
                    </div>

                    <button
                        disabled={uploading}
                        className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                    >
                        {uploading ? "Đang upload..." : "Upload"}
                    </button>
                </form>
            </Modal>

            {/* create folder modal */}
            <Modal
                open={openCreateFolder}
                title="Tạo folder"
                onClose={() => setOpenCreateFolder(false)}
            >
                <form onSubmit={onCreateFolder} className="space-y-3">
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                        Tạo trong:{" "}
                        <span className="font-semibold">
                            {path.length
                                ? path[path.length - 1].name
                                : "Folder gốc"}
                        </span>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Tên folder
                        </label>
                        <input
                            value={fName}
                            onChange={(e) => setFName(e.target.value)}
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                            placeholder="VD: HSK 3 - Bài 1-10"
                        />
                    </div>

                    <button className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800">
                        Tạo folder
                    </button>
                </form>
            </Modal>

            {/* edit folder modal */}
            <Modal
                open={openEditFolder}
                title="Sửa folder"
                onClose={() => {
                    setOpenEditFolder(false);
                    setEditFolder(null);
                }}
            >
                <form onSubmit={onSaveFolder} className="space-y-3">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Tên folder
                        </label>
                        <input
                            value={efName}
                            onChange={(e) => setEFName(e.target.value)}
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                            placeholder="Nhập tên mới..."
                        />
                    </div>

                    <button className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800">
                        Lưu
                    </button>
                </form>
            </Modal>
        </div>
    );
}
