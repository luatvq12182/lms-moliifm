import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import {
    adminListUsersApi,
    adminCreateUserApi,
    adminUpdateUserApi,
    adminUploadUserAvatarApi,
} from "../../api/users";
import { absUrl } from "../../utils/url";

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

function Avatar({ url, name, size = 36 }) {
    const initials = (name || "?")
        .trim()
        .split(/\s+/)
        .slice(-2)
        .map((s) => s[0]?.toUpperCase())
        .join("");

    return (
        <div
            className="shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100"
            style={{ width: size, height: size }}
            title={name || ""}
        >
            {url ? (
                <img
                    src={url}
                    alt="avatar"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                        e.currentTarget.style.display = "none";
                    }}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-700">
                    {initials || "?"}
                </div>
            )}
        </div>
    );
}

export default function Teachers() {
    const { token, user, logout } = useAuth();

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");
    const [q, setQ] = useState("");
    const [users, setUsers] = useState([]);

    const [openCreate, setOpenCreate] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [editUser, setEditUser] = useState(null);

    // form create
    const [cName, setCName] = useState("");
    const [cEmail, setCEmail] = useState("");
    const [cPass, setCPass] = useState("");
    const [cRole, setCRole] = useState("teacher");
    const [cAvatarFile, setCAvatarFile] = useState(null);
    const [cAvatarPreview, setCAvatarPreview] = useState("");

    // form edit
    const [eName, setEName] = useState("");
    const [ePass, setEPass] = useState("");
    const [eRole, setERole] = useState("teacher");
    const [eActive, setEActive] = useState(true);
    const [eAvatarFile, setEAvatarFile] = useState(null);
    const [eAvatarPreview, setEAvatarPreview] = useState("");

    function clearCreateAvatar() {
        if (cAvatarPreview) URL.revokeObjectURL(cAvatarPreview);
        setCAvatarFile(null);
        setCAvatarPreview("");
    }

    function clearEditAvatar() {
        if (eAvatarPreview) URL.revokeObjectURL(eAvatarPreview);
        setEAvatarFile(null);
        setEAvatarPreview("");
    }

    async function refresh() {
        setErr("");
        setLoading(true);
        try {
            const data = await adminListUsersApi(token);
            setUsers(data.users || []);
        } catch (e) {
            setErr(e.message || "Load thất bại");
            if ((e.message || "").toLowerCase().includes("token")) logout();
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => {
        const keyword = q.trim().toLowerCase();
        return users
            .filter((u) => u.role === "teacher")
            .filter((u) => {
                if (!keyword) return true;
                return (
                    (u.name || "").toLowerCase().includes(keyword) ||
                    (u.email || "").toLowerCase().includes(keyword)
                );
            });
    }, [users, q]);

    function openEditModal(u) {
        setEditUser(u);
        setEName(u.name || "");
        setEPass("");
        setERole(u.role || "teacher");
        setEActive(Boolean(u.isActive));
        clearEditAvatar();
        setOpenEdit(true);
    }

    async function onCreate(e) {
        e.preventDefault();
        setErr("");

        try {
            const created = await adminCreateUserApi(token, {
                name: cName,
                email: cEmail,
                password: cPass,
                role: cRole,
            });

            // ✅ upload avatar (nếu có)
            if (cAvatarFile && created?._id) {
                await adminUploadUserAvatarApi(token, created._id, cAvatarFile);
            }

            setOpenCreate(false);
            setCName("");
            setCEmail("");
            setCPass("");
            setCRole("teacher");
            clearCreateAvatar();
            await refresh();
        } catch (e2) {
            setErr(e2.message || "Tạo tài khoản thất bại");
        }
    }

    async function onUpdate(e) {
        e.preventDefault();
        if (!editUser?._id) return;

        setErr("");

        try {
            const payload = { name: eName, isActive: eActive, role: eRole };
            if (ePass.trim()) payload.password = ePass.trim();

            await adminUpdateUserApi(token, editUser._id, payload);

            // ✅ upload avatar (nếu có)
            if (eAvatarFile) {
                await adminUploadUserAvatarApi(
                    token,
                    editUser._id,
                    eAvatarFile
                );
            }

            setOpenEdit(false);
            setEditUser(null);
            clearEditAvatar();
            await refresh();
        } catch (e2) {
            setErr(e2.message || "Cập nhật thất bại");
        }
    }

    function onPickCreateAvatar(file) {
        setErr("");
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setErr("Avatar phải là ảnh (JPG/PNG/WEBP).");
            return;
        }
        if (file.size > 3 * 1024 * 1024) {
            setErr("Avatar tối đa 3MB.");
            return;
        }
        clearCreateAvatar();
        setCAvatarFile(file);
        setCAvatarPreview(URL.createObjectURL(file));
    }

    function onPickEditAvatar(file) {
        setErr("");
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setErr("Avatar phải là ảnh (JPG/PNG/WEBP).");
            return;
        }
        if (file.size > 3 * 1024 * 1024) {
            setErr("Avatar tối đa 3MB.");
            return;
        }
        clearEditAvatar();
        setEAvatarFile(file);
        setEAvatarPreview(URL.createObjectURL(file));
    }

    if (user?.role !== "admin") {
        return (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <div className="text-sm font-semibold">
                    Khu vực dành cho quản trị viên.
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-4 flex flex-col gap-3">
                <div>
                    <div className="text-base font-semibold">Giảng viên</div>
                    <div className="text-sm text-zinc-500">
                        Admin tạo/sửa/khóa tài khoản giảng viên
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Tìm theo tên hoặc email..."
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 sm:w-[320px]"
                    />
                    <div className="flex gap-2 sm:ml-auto">
                        <button
                            onClick={refresh}
                            className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50 sm:flex-none"
                        >
                            Tải lại
                        </button>
                        <button
                            onClick={() => setOpenCreate(true)}
                            className="flex-1 rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 sm:flex-none"
                        >
                            + Thêm giảng viên
                        </button>
                    </div>
                </div>
            </div>

            {err && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {err}
                </div>
            )}

            {/* mobile card list */}
            <div className="grid gap-3 md:hidden">
                {loading ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                        Đang tải...
                    </div>
                ) : (
                    filtered.map((u) => (
                        <div
                            key={u._id}
                            className="rounded-2xl border border-zinc-200 bg-white p-4"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <Avatar
                                        url={absUrl(u.avatarUrl)}
                                        name={u.name}
                                        size={40}
                                    />
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-semibold">
                                            {u.name}
                                        </div>
                                        <div className="mt-1 text-xs text-zinc-500">
                                            {u.email}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => openEditModal(u)}
                                    className="shrink-0 rounded-xl border border-zinc-200 px-3 py-2 text-xs hover:bg-zinc-50"
                                >
                                    Sửa
                                </button>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                                <div className="text-xs text-zinc-500">
                                    Trạng thái:{" "}
                                    <span className="font-medium text-zinc-700">
                                        {u.isActive ? "Hoạt động" : "Tạm khóa"}
                                    </span>
                                </div>
                                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700">
                                    {u.role}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* desktop table */}
            <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white md:block">
                <div className="grid grid-cols-12 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-600">
                    <div className="col-span-4">Tên</div>
                    <div className="col-span-4">Email</div>
                    <div className="col-span-2">Trạng thái</div>
                    <div className="col-span-2 text-right">Thao tác</div>
                </div>

                <div className="h-[calc(100vh-280px)] overflow-auto">
                    {loading ? (
                        <div className="px-4 py-4 text-sm">Đang tải...</div>
                    ) : (
                        filtered.map((u) => (
                            <div
                                key={u._id}
                                className="grid grid-cols-12 items-center px-4 py-3 text-sm hover:bg-zinc-50"
                            >
                                <div className="col-span-4 flex items-center gap-3 font-medium">
                                    <Avatar
                                        url={absUrl(u.avatarUrl)}
                                        name={u.name}
                                        size={34}
                                    />
                                    <span className="truncate">{u.name}</span>
                                </div>
                                <div className="col-span-4 truncate text-zinc-700">
                                    {u.email}
                                </div>
                                <div className="col-span-2">
                                    <span
                                        className={`rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700 border ${
                                            u.isActive
                                                ? "border-green-600"
                                                : "border-red-600"
                                        }`}
                                    >
                                        {u.isActive ? "Hoạt động" : "Tạm khóa"}
                                    </span>
                                </div>
                                <div className="col-span-2 text-right">
                                    <button
                                        onClick={() => openEditModal(u)}
                                        className="rounded-lg border border-zinc-200 px-3 py-1 text-xs hover:bg-white"
                                    >
                                        Sửa
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* create modal */}
            <Modal
                open={openCreate}
                title="Thêm giảng viên"
                onClose={() => setOpenCreate(false)}
            >
                <form onSubmit={onCreate} className="space-y-3">
                    {/* avatar */}
                    <div className="flex items-center gap-3">
                        <Avatar
                            url={cAvatarPreview || ""}
                            name={cName}
                            size={48}
                        />
                        <div className="min-w-0">
                            <div className="text-sm font-medium text-zinc-700">
                                Ảnh đại diện
                            </div>
                            <div className="mt-1 flex flex-wrap gap-2">
                                <label className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs hover:bg-zinc-50">
                                    Chọn ảnh
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="hidden"
                                        onChange={(e) =>
                                            onPickCreateAvatar(
                                                e.target.files?.[0]
                                            )
                                        }
                                    />
                                </label>
                                {cAvatarFile && (
                                    <button
                                        type="button"
                                        onClick={clearCreateAvatar}
                                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs hover:bg-zinc-50"
                                    >
                                        Bỏ ảnh
                                    </button>
                                )}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">
                                JPG/PNG/WEBP, tối đa 3MB
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Họ tên
                        </label>
                        <input
                            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                            value={cName}
                            onChange={(e) => setCName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Email
                        </label>
                        <input
                            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                            value={cEmail}
                            onChange={(e) => setCEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Mật khẩu
                        </label>
                        <input
                            type="password"
                            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                            value={cPass}
                            onChange={(e) => setCPass(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Vai trò
                        </label>
                        <select
                            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                            value={cRole}
                            onChange={(e) => setCRole(e.target.value)}
                        >
                            <option value="teacher">Giảng viên</option>
                            <option value="admin">Quản trị viên</option>
                        </select>
                    </div>

                    <button className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800">
                        Tạo tài khoản
                    </button>
                </form>
            </Modal>

            {/* edit modal */}
            <Modal
                open={openEdit}
                title="Sửa tài khoản"
                onClose={() => setOpenEdit(false)}
            >
                <form onSubmit={onUpdate} className="space-y-3">
                    {/* avatar */}
                    <div className="flex items-center gap-3">
                        <Avatar
                            url={
                                eAvatarPreview ||
                                absUrl(editUser?.avatarUrl) ||
                                ""
                            }
                            name={eName}
                            size={48}
                        />
                        <div className="min-w-0">
                            <div className="text-sm font-medium text-zinc-700">
                                Ảnh đại diện
                            </div>
                            <div className="mt-1 flex flex-wrap gap-2">
                                <label className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs hover:bg-zinc-50">
                                    Chọn ảnh mới
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="hidden"
                                        onChange={(e) =>
                                            onPickEditAvatar(
                                                e.target.files?.[0]
                                            )
                                        }
                                    />
                                </label>
                                {eAvatarFile && (
                                    <button
                                        type="button"
                                        onClick={clearEditAvatar}
                                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs hover:bg-zinc-50"
                                    >
                                        Bỏ ảnh mới
                                    </button>
                                )}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">
                                JPG/PNG/WEBP, tối đa 3MB
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Họ tên
                        </label>
                        <input
                            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                            value={eName}
                            onChange={(e) => setEName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Đổi mật khẩu
                        </label>
                        <input
                            type="password"
                            placeholder="để trống nếu không đổi"
                            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                            value={ePass}
                            onChange={(e) => setEPass(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-zinc-700">
                                Vai trò
                            </label>
                            <select
                                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                                value={eRole}
                                onChange={(e) => setERole(e.target.value)}
                            >
                                <option value="teacher">Giảng viên</option>
                                <option value="admin">Quản trị viên</option>
                            </select>
                        </div>

                        <div className="flex items-end gap-2">
                            <input
                                id="active"
                                type="checkbox"
                                checked={eActive}
                                onChange={(e) => setEActive(e.target.checked)}
                            />
                            <label
                                htmlFor="active"
                                className="text-sm text-zinc-700"
                            >
                                Hoạt động
                            </label>
                        </div>
                    </div>

                    <button className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800">
                        Lưu
                    </button>
                </form>
            </Modal>
        </div>
    );
}
