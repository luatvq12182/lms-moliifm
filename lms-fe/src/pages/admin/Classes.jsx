import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import {
    listClassesApi,
    createClassApi,
    updateClassApi,
    deleteClassApi,
} from "../../api/classes";
import { listCoursesApi } from "../../api/courses";
import { adminListUsersApi } from "../../api/users";

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

function StatusPill({ text }) {
    return (
        <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700">
            {text}
        </span>
    );
}

export default function Classes() {
    const { token, user } = useAuth();

    const [items, setItems] = useState([]); // classes
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");
    const [q, setQ] = useState("");

    // create class modal
    const [openCreate, setOpenCreate] = useState(false);
    const [cName, setCName] = useState("");
    const [cCourseId, setCCourseId] = useState("");
    const [teachers, setTeachers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [selectedTeacherIds, setSelectedTeacherIds] = useState([]);

    const [editClass, setEditClass] = useState(null);
    const [eName, setEName] = useState("");
    const [eCourseId, setECourseId] = useState("");
    const [eTeacherIds, setETeacherIds] = useState([]);

    async function onEdit(c) {
        setErr("");
        try {
            await ensureRefData();

            setEditClass(c);
            setEName(c.name || "");
            setECourseId(c.course?._id || "");
            setETeacherIds((c.teachers || []).map((t) => t._id));
        } catch (e) {
            setErr(e.message || "Không tải được danh sách khoá học/giảng viên");
        }
    }

    async function onSaveEdit(e) {
        e.preventDefault();
        await updateClassApi(token, editClass._id, {
            name: eName,
            courseId: eCourseId,
            teacherIds: eTeacherIds,
        });
        setEditClass(null);
        refresh();
    }

    async function onDelete(c) {
        if (!confirm(`Xoá lớp "${c.name}" ?`)) return;
        await deleteClassApi(token, c._id);
        refresh();
    }

    async function refresh() {
        setErr("");
        setLoading(true);
        try {
            const data = await listClassesApi(token);
            setItems(data.items || []);
        } catch (e) {
            setErr(e.message || "Load thất bại");
        } finally {
            setLoading(false);
        }
    }

    async function ensureRefData() {
        // courses
        if (courses.length === 0) {
            const c = await listCoursesApi(token);
            setCourses((c.items || []).map((x) => x.course));
        }

        // teachers (admin only)
        if (teachers.length === 0) {
            const u = await adminListUsersApi(token);
            const onlyTeachers = (u.users || []).filter(
                (x) => x.role === "teacher"
            );
            setTeachers(onlyTeachers);
        }
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => {
        const k = q.trim().toLowerCase();
        if (!k) return items;
        return items.filter((c) => {
            return (
                (c.name || "").toLowerCase().includes(k) ||
                (c.course?.name || "").toLowerCase().includes(k)
            );
        });
    }, [items, q]);

    async function openCreateModal() {
        setErr("");
        setOpenCreate(true);

        // load courses + teachers (admin only)
        try {
            const c = await listCoursesApi(token); // admin: all, teacher: filtered
            setCourses((c.items || []).map((x) => x.course));
            setCCourseId((c.items || [])[0]?.course?._id || "");

            const u = await adminListUsersApi(token);
            const onlyTeachers = (u.users || []).filter(
                (x) => x.role === "teacher"
            );
            setTeachers(onlyTeachers);
        } catch (e) {
            setErr(e.message || "Không tải được dữ liệu tạo lớp");
        }
    }

    function toggleTeacher(id) {
        setSelectedTeacherIds((prev) => {
            const s = new Set(prev);
            if (s.has(id)) s.delete(id);
            else s.add(id);
            return Array.from(s);
        });
    }

    async function onCreate(e) {
        e.preventDefault();
        setErr("");

        try {
            await createClassApi(token, {
                name: cName,
                courseId: cCourseId,
                teacherIds: selectedTeacherIds,
            });
            setOpenCreate(false);
            setCName("");
            setSelectedTeacherIds([]);
            await refresh();
        } catch (e2) {
            setErr(e2.message || "Tạo lớp thất bại");
        }
    }

    return (
        <div className="max-w-full">
            <div className="mb-4 flex flex-col gap-3">
                <div>
                    <div className="text-base font-semibold">Lớp học</div>
                    <div className="text-sm text-zinc-500">
                        {user?.role === "admin"
                            ? "Admin quản lý toàn bộ lớp học"
                            : "Teacher chỉ xem lớp được phân công"}
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Tìm theo tên lớp / khoá học..."
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 sm:w-[360px]"
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
                                onClick={openCreateModal}
                                className="flex-1 rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 sm:flex-none"
                            >
                                + Thêm lớp
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

            {/* mobile cards */}
            <div className="grid gap-3 md:hidden">
                {loading ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                        Đang tải...
                    </div>
                ) : (
                    filtered.map((c) => (
                        <div
                            key={c._id}
                            className="rounded-2xl border border-zinc-200 bg-white p-4 "
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold">
                                        {c.name}
                                    </div>
                                    <div className="mt-1 text-xs text-zinc-500">
                                        Khoá học:{" "}
                                        <span className="font-medium text-zinc-700">
                                            {c.course?.name || "-"}
                                        </span>
                                    </div>
                                </div>
                                <StatusPill
                                    text={
                                        c.isActive
                                            ? "Đang hoạt động"
                                            : "Tạm dừng"
                                    }
                                />
                            </div>

                            <div className="mt-3">
                                <div className="text-xs text-zinc-500">
                                    Giảng viên
                                </div>
                                <div className="mt-1 flex flex-wrap gap-2">
                                    {(c.teachers || []).length === 0 ? (
                                        <span className="text-xs text-zinc-500">
                                            Chưa gán
                                        </span>
                                    ) : (
                                        (c.teachers || []).map((t) => (
                                            <span
                                                key={t._id}
                                                className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-700"
                                            >
                                                {t.name}
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>

                            {user?.role === "admin" && (
                                <div className="mt-3 flex gap-2">
                                    <button
                                        onClick={() => onEdit(c)}
                                        className="flex-1 rounded-xl border px-3 py-2 text-xs"
                                    >
                                        Sửa
                                    </button>
                                    <button
                                        onClick={() => onDelete(c)}
                                        className="flex-1 rounded-xl bg-red-600 text-white px-3 py-2 text-xs"
                                    >
                                        Xoá
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* desktop table */}
            <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white  md:block">
                <div className="grid grid-cols-12 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-600">
                    <div className="col-span-2">Tên lớp</div>
                    <div className="col-span-3">Khoá học</div>
                    <div className="col-span-3">Giảng viên</div>
                    <div className="col-span-2">Trạng thái</div>
                    <div className="col-span-2">Hành động</div>
                </div>

                {loading ? (
                    <div className="px-4 py-4 text-sm">Đang tải...</div>
                ) : (
                    filtered.map((c) => (
                        <div
                            key={c._id}
                            className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm hover:bg-zinc-50"
                        >
                            <div className="col-span-2 min-w-0">
                                <div className="truncate font-medium">
                                    {c.name}
                                </div>
                            </div>
                            <div className="col-span-3 text-zinc-700">
                                {c.course?.name || "-"}
                            </div>
                            <div className="col-span-3">
                                <div className="flex flex-wrap gap-2">
                                    {(c.teachers || []).slice(0, 2).map((t) => (
                                        <span
                                            key={t._id}
                                            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700"
                                        >
                                            {t.name}
                                        </span>
                                    ))}
                                    {(c.teachers || []).length > 2 && (
                                        <span className="text-xs text-zinc-500">
                                            +{(c.teachers || []).length - 2}
                                        </span>
                                    )}
                                    {(c.teachers || []).length === 0 && (
                                        <span className="text-xs text-zinc-500">
                                            Chưa gán
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="col-span-2">
                                <StatusPill
                                    text={c.isActive ? "Hoạt động" : "Tạm dừng"}
                                />
                            </div>
                            <div className="col-span-2">
                                <button
                                    onClick={() => onEdit(c)}
                                    className="text-xs underline"
                                >
                                    Sửa
                                </button>
                                <button
                                    onClick={() => onDelete(c)}
                                    className="ml-2 text-xs text-red-600 underline"
                                >
                                    Xoá
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* create class modal */}
            <Modal
                open={openCreate}
                title="Thêm lớp học"
                onClose={() => setOpenCreate(false)}
            >
                <form onSubmit={onCreate} className="space-y-3">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Tên lớp
                        </label>
                        <input
                            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                            value={cName}
                            onChange={(e) => setCName(e.target.value)}
                            placeholder="VD: HSK 3 - Tối T2/T4"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Thuộc khoá học
                        </label>
                        <select
                            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                            value={cCourseId}
                            onChange={(e) => setCCourseId(e.target.value)}
                            required
                        >
                            {courses.map((c) => (
                                <option key={c._id} value={c._id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Giảng viên
                        </label>
                        <div className="max-h-[220px] overflow-y-auto rounded-xl border border-zinc-200 p-3">
                            {teachers.length === 0 ? (
                                <div className="text-sm text-zinc-500">
                                    Chưa có teacher
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {teachers.map((t) => (
                                        <label
                                            key={t._id}
                                            className="flex items-center gap-2 text-sm"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedTeacherIds.includes(
                                                    t._id
                                                )}
                                                onChange={() =>
                                                    toggleTeacher(t._id)
                                                }
                                            />
                                            <span className="font-medium">
                                                {t.name}
                                            </span>
                                            <span className="text-xs text-zinc-500">
                                                ({t.email})
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <button className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800">
                        Tạo lớp
                    </button>
                </form>
            </Modal>

            <Modal
                open={!!editClass}
                title="Sửa lớp học"
                onClose={() => setEditClass(null)}
            >
                <form onSubmit={onSaveEdit} className="space-y-4">
                    {/* Tên lớp */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Tên lớp
                        </label>
                        <input
                            value={eName}
                            onChange={(e) => setEName(e.target.value)}
                            placeholder="VD: HSK 3 - Tối T2/T4"
                            required
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                        />
                    </div>

                    {/* Chọn khoá học */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Thuộc khoá học
                        </label>
                        <select
                            value={eCourseId}
                            onChange={(e) => setECourseId(e.target.value)}
                            required
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                        >
                            {courses.map((c) => (
                                <option key={c._id} value={c._id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Gán giảng viên */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Phân công giảng viên
                        </label>

                        <div className="max-h-[220px] overflow-y-auto rounded-xl border border-zinc-200 p-3">
                            {teachers.length === 0 ? (
                                <div className="text-sm text-zinc-500">
                                    Chưa có giảng viên
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {teachers.map((t) => {
                                        const checked = eTeacherIds.includes(
                                            t._id
                                        );
                                        return (
                                            <label
                                                key={t._id}
                                                className="flex cursor-pointer items-center gap-2 text-sm"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => {
                                                        setETeacherIds(
                                                            (prev) => {
                                                                const set =
                                                                    new Set(
                                                                        prev
                                                                    );
                                                                if (
                                                                    set.has(
                                                                        t._id
                                                                    )
                                                                )
                                                                    set.delete(
                                                                        t._id
                                                                    );
                                                                else
                                                                    set.add(
                                                                        t._id
                                                                    );
                                                                return Array.from(
                                                                    set
                                                                );
                                                            }
                                                        );
                                                    }}
                                                />
                                                <span className="font-medium text-zinc-900">
                                                    {t.name}
                                                </span>
                                                <span className="text-xs text-zinc-500">
                                                    ({t.email})
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="mt-1 text-xs text-zinc-500">
                            Giảng viên chỉ xem lớp được phân công
                        </div>
                    </div>

                    {/* Action */}
                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setEditClass(null)}
                            className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm hover:bg-zinc-50"
                        >
                            Huỷ
                        </button>

                        <button
                            type="submit"
                            className="flex-1 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                        >
                            Lưu thay đổi
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
