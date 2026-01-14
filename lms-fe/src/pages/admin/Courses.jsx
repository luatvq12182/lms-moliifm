import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import {
    listCoursesApi,
    createCourseApi,
    updateCourseApi,
    deleteCourseApi,
} from "../../api/courses";

function Modal({ open, title, children, onClose }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="absolute left-1/2 top-1/2 w-[92%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
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

function CourseCard({ item, user, onEdit, onDelete }) {
    const course = item.course;
    const classes = item.classes || [];

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 ">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                        {course.name}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                        {classes.length} lớp
                    </div>
                </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                {classes.length === 0 ? (
                    <span className="text-xs text-zinc-500">Chưa có lớp</span>
                ) : (
                    classes.slice(0, 6).map((c) => (
                        <span
                            key={c._id}
                            className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-700"
                            title={c.name}
                        >
                            {c.name}
                        </span>
                    ))
                )}
                {classes.length > 6 && (
                    <span className="text-xs text-zinc-500">
                        +{classes.length - 6} lớp
                    </span>
                )}
            </div>

            {user?.role === "admin" && (
                <div className="mt-3 flex gap-2">
                    <button
                        onClick={() => onEdit(course)}
                        className="flex-1 rounded-xl border px-3 py-2 text-xs"
                    >
                        Sửa
                    </button>
                    <button
                        onClick={() => onDelete(course)}
                        className="flex-1 rounded-xl bg-red-600 text-white px-3 py-2 text-xs"
                    >
                        Xoá
                    </button>
                </div>
            )}
        </div>
    );
}

export default function Courses() {
    const { token, user } = useAuth();

    const [items, setItems] = useState([]); // [{course, classes}]
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");
    const [q, setQ] = useState("");

    const [openCreate, setOpenCreate] = useState(false);
    const [cName, setCName] = useState("");

    const [editCourse, setEditCourse] = useState(null);
    const [editName, setEditName] = useState("");

    function onEdit(course) {
        setEditCourse(course);
        setEditName(course.name);
    }

    async function onSaveEdit(e) {
        e.preventDefault();
        await updateCourseApi(token, editCourse._id, { name: editName });
        setEditCourse(null);
        refresh();
    }

    async function onDelete(course) {
        if (!confirm(`Xoá khoá học "${course.name}" ?`)) return;
        await deleteCourseApi(token, course._id);
        refresh();
    }

    async function refresh() {
        setErr("");
        setLoading(true);
        try {
            const data = await listCoursesApi(token);
            setItems(data.items || []);
        } catch (e) {
            setErr(e.message || "Load thất bại");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => {
        const k = q.trim().toLowerCase();
        if (!k) return items;
        return items.filter((it) => {
            const n = (it.course?.name || "").toLowerCase();
            return n.includes(k);
        });
    }, [items, q]);

    async function onCreate(e) {
        e.preventDefault();
        setErr("");
        try {
            await createCourseApi(token, { name: cName });
            setOpenCreate(false);
            setCName("");
            await refresh();
        } catch (e2) {
            setErr(e2.message || "Tạo khoá học thất bại");
        }
    }

    return (
        <div>
            <div className="mb-4 flex flex-col gap-3">
                <div>
                    <div className="text-base font-semibold">Khoá học</div>
                    <div className="text-sm text-zinc-500">
                        Mỗi khoá học hiển thị các lớp thuộc khoá học đó
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Tìm khoá học..."
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 sm:w-[320px]"
                    />

                    <div className="flex gap-2 sm:ml-auto">
                        <button
                            onClick={refresh}
                            className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50 sm:flex-none"
                        >
                            Tải lại
                        </button>

                        {user?.role === "admin" && (
                            <button
                                onClick={() => setOpenCreate(true)}
                                className="flex-1 rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 sm:flex-none"
                            >
                                + Thêm khoá học
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {err && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {err}
                </div>
            )}

            {loading ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                    Đang tải...
                </div>
            ) : (
                <>
                    {/* mobile: cards */}
                    <div className="grid gap-3 md:hidden">
                        {filtered.map((it) => (
                            <CourseCard
                                key={it.course._id}
                                item={it}
                                user={user}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>

                    {/* md+: table */}
                    <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white  md:block">
                        <div className="grid grid-cols-12 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-600">
                            <div className="col-span-4">Khoá học</div>
                            <div className="col-span-6">Lớp thuộc khoá học</div>
                            <div className="col-span-2">Hành động</div>
                        </div>

                        {filtered.map((it) => (
                            <div
                                key={it.course._id}
                                className="grid grid-cols-12 gap-3 px-4 py-3 text-sm hover:bg-zinc-50"
                            >
                                <div className="col-span-4">
                                    <div className="font-medium">
                                        {it.course.name}
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        {(it.classes || []).length} lớp
                                    </div>
                                </div>
                                <div className="col-span-6">
                                    <div className="flex flex-wrap gap-2">
                                        {(it.classes || []).length === 0 ? (
                                            <span className="text-xs text-zinc-500">
                                                Chưa có lớp
                                            </span>
                                        ) : (
                                            (it.classes || []).map((c) => (
                                                <span
                                                    key={c._id}
                                                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700"
                                                    title={c.name}
                                                >
                                                    {c.name}
                                                </span>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <button
                                        onClick={() => onEdit(it.course)}
                                        className="text-xs underline"
                                    >
                                        Sửa
                                    </button>
                                    <button
                                        onClick={() => onDelete(it.course)}
                                        className="ml-2 text-xs text-red-600 underline"
                                    >
                                        Xoá
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <Modal
                open={openCreate}
                title="Thêm khoá học"
                onClose={() => setOpenCreate(false)}
            >
                <form onSubmit={onCreate} className="space-y-3">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Tên khoá học
                        </label>
                        <input
                            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                            value={cName}
                            onChange={(e) => setCName(e.target.value)}
                            placeholder="VD: HSK 3"
                        />
                    </div>

                    <button className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800">
                        Tạo khoá học
                    </button>
                </form>
            </Modal>

            <Modal
                open={!!editCourse}
                title="Sửa khoá học"
                onClose={() => setEditCourse(null)}
            >
                <form onSubmit={onSaveEdit} className="space-y-3">
                    <input
                        className="w-full rounded-xl border px-3 py-2"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                    />
                    <button className="w-full rounded-xl bg-black text-white py-2">
                        Lưu
                    </button>
                </form>
            </Modal>
        </div>
    );
}
