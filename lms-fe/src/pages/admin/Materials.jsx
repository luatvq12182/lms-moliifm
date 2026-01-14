import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { listClassesApi } from "../../api/classes";
import { listCoursesApi } from "../../api/courses";
import {
    listMaterialsApi,
    uploadMaterialApi,
    openMaterialFile,
    deleteMaterialApi,
} from "../../api/materials";

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

export default function Materials() {
    const { token, user } = useAuth();

    const [classes, setClasses] = useState([]);
    const [materials, setMaterials] = useState([]);

    const [courses, setCourses] = useState([]);
    const [uScope, setUScope] = useState("class");
    const [uCourseId, setUCourseId] = useState("");

    const [classId, setClassId] = useState("");
    const [q, setQ] = useState("");

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    // upload
    const [openUpload, setOpenUpload] = useState(false);
    const [uClassId, setUClassId] = useState("");
    const [uTitle, setUTitle] = useState("");
    const [uFile, setUFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    async function refreshMaterials(nextClassId = classId) {
        setErr("");
        setLoading(true);
        try {
            const m = await listMaterialsApi(
                token,
                nextClassId ? { classId: nextClassId } : {}
            );
            setMaterials(m.items || []);
        } catch (e) {
            setErr(e.message || "Load thất bại");
        } finally {
            setLoading(false);
        }
    }

    async function init() {
        setErr("");
        setLoading(true);
        try {
            const c = await listClassesApi(token); // teacher: chỉ lớp được gán
            const items = c.items || [];
            setClasses(items);

            const first = items[0]?._id || "";
            setClassId(first);
            setUClassId(first);

            const m = await listMaterialsApi(
                token,
                first ? { classId: first } : {}
            );
            setMaterials(m.items || []);

            // trong init() sau khi load classes:
            if (user?.role === "admin") {
                const c2 = await listCoursesApi(token);
                const arr = (c2.items || []).map((x) => x.course);
                setCourses(arr);
                setUCourseId(arr[0]?._id || "");
            }
        } catch (e) {
            setErr(e.message || "Load thất bại");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => {
        const k = q.trim().toLowerCase();
        if (!k) return materials;
        return materials.filter((m) => {
            const a = (m.title || "").toLowerCase();
            const b = (m.originalName || "").toLowerCase();
            return a.includes(k) || b.includes(k);
        });
    }, [materials, q]);

    async function onChangeClass(e) {
        const id = e.target.value;
        setClassId(id);
        await refreshMaterials(id);
    }

    async function onUpload(e) {
        e.preventDefault();
        if (!uClassId) return setErr("Bạn chưa chọn lớp");
        if (!uFile) return setErr("Bạn chưa chọn file");

        setErr("");
        setUploading(true);
        try {
            await uploadMaterialApi(token, {
                scope: uScope,
                courseId: uScope === "course" ? uCourseId : undefined,
                classId: uScope === "class" ? uClassId : undefined,
                title: uTitle,
                file: uFile,
            });
            setOpenUpload(false);
            setUTitle("");
            setUFile(null);
            // nếu đang lọc đúng class -> refresh
            if (uClassId === classId) await refreshMaterials(uClassId);
        } catch (e2) {
            setErr(e2.message || "Upload thất bại");
        } finally {
            setUploading(false);
        }
    }

    async function onOpen(m) {
        setErr("");
        try {
            await openMaterialFile(token, m._id);
        } catch (e) {
            setErr(e.message || "Không mở được file");
        }
    }

    async function onDelete(m) {
        if (user?.role !== "admin") return;
        if (!confirm(`Xoá tài liệu "${m.title}"?`)) return;

        setErr("");
        try {
            await deleteMaterialApi(token, m._id);
            await refreshMaterials(classId);
        } catch (e) {
            setErr(e.message || "Xoá thất bại");
        }
    }

    return (
        <div className="max-w-full">
            <div className="mb-4 flex flex-col gap-3">
                <div>
                    <div className="text-base font-semibold">
                        Tài liệu / Slide
                    </div>
                    <div className="text-sm text-zinc-500">
                        {user?.role === "admin"
                            ? "Quản lý tài liệu của tất cả lớp"
                            : "Chỉ xem tài liệu thuộc lớp bạn được phân công"}
                    </div>
                </div>

                <div className="grid gap-2 lg:grid-cols-4">
                    <select
                        value={classId}
                        onChange={onChangeClass}
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                    >
                        {classes.map((c) => (
                            <option key={c._id} value={c._id}>
                                {c.name} — {c.course?.name || ""}
                            </option>
                        ))}
                    </select>

                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Tìm theo tên file..."
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                    />

                    <button
                        onClick={() => refreshMaterials(classId)}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
                    >
                        Tải lại
                    </button>

                    {user?.role === "admin" && (
                        <button
                            onClick={() => setOpenUpload(true)}
                            className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                        >
                            + Upload
                        </button>
                    )}
                </div>
            </div>

            {err && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {err}
                </div>
            )}

            {/* list */}
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white ">
                <div className="grid grid-cols-12 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-600">
                    <div className="col-span-6">Tên</div>
                    <div className="col-span-2">Người upload</div>
                    <div className="col-span-3 text-right">Thao tác</div>
                    <div className="col-span-1 text-right">...</div>
                </div>

                {loading ? (
                    <div className="px-4 py-4 text-sm">Đang tải...</div>
                ) : filtered.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-zinc-500">
                        Chưa có tài liệu
                    </div>
                ) : (
                    filtered.map((m) => {
                        const icon = pickIcon(
                            m.originalName || m.title,
                            m.mimeType
                        );
                        return (
                            <div
                                key={m._id}
                                className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm hover:bg-zinc-50"
                            >
                                <div className="col-span-6 min-w-0">
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

                                <div className="col-span-2 min-w-0">
                                    <div className="truncate text-sm text-zinc-700">
                                        {m.uploader?.name || "-"}
                                    </div>
                                    <div className="truncate text-xs text-zinc-500">
                                        {m.course?.name || ""} •{" "}
                                        {m.class?.name || ""}
                                    </div>
                                </div>

                                <div className="col-span-3 text-right">
                                    <a
                                        href={`/viewer/${m._id}`}
                                        className="rounded-lg border border-zinc-200 px-3 py-1 text-xs hover:bg-white"
                                    >
                                        Trình chiếu
                                    </a>
                                </div>

                                <div className="col-span-1 text-right">
                                    {user?.role === "admin" ? (
                                        <button
                                            onClick={() => onDelete(m)}
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
                        );
                    })
                )}
            </div>

            {/* upload modal */}
            <Modal
                open={openUpload}
                title="Upload tài liệu"
                onClose={() => setOpenUpload(false)}
            >
                <form onSubmit={onUpload} className="space-y-3">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Phân quyền
                        </label>
                        <select
                            value={uScope}
                            onChange={(e) => setUScope(e.target.value)}
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                        >
                            <option value="public">
                                File công khai (mọi giảng viên xem được)
                            </option>
                            <option value="course">File thuộc khoá học</option>
                            <option value="class">File thuộc lớp</option>
                        </select>
                    </div>

                    {uScope === "course" && (
                        <div>
                            <label className="mb-1 block text-sm font-medium text-zinc-700">
                                Chọn khoá học
                            </label>
                            <select
                                value={uCourseId}
                                onChange={(e) => setUCourseId(e.target.value)}
                                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                                required
                            >
                                {courses.map((c) => (
                                    <option key={c._id} value={c._id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {uScope === "class" && (
                        <div>
                            <label className="mb-1 block text-sm font-medium text-zinc-700">
                                Chọn lớp
                            </label>
                            <select
                                value={uClassId}
                                onChange={(e) => setUClassId(e.target.value)}
                                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                                required
                            >
                                {classes.map((c) => (
                                    <option key={c._id} value={c._id}>
                                        {c.name} — {c.course?.name || ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

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
        </div>
    );
}
