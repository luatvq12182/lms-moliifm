import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import {
    listMaterialsApi,
    deleteMaterialApi,
    patchMaterialPermissionsApi,
    patchMaterialApi,
    uploadLocalMaterialApi,
    createMaterialFromGoogleLinkApi,
} from "../../api/materials";
import {
    listFoldersApi,
    getFolderPathApi,
    createFolderApi,
    updateFolderApi,
    deleteFolderApi,
} from "../../api/folders";
import { adminListUsersApi } from "../../api/users"; // ✅ dùng để lấy list teacher cho admin
import { absUrl } from "../../utils/url";
import UploadMaterialsModal from "../../components/UploadMaterialsModal.jsx";
import MediaPlayerModal from "../../components/MediaPlayerModal.jsx";

function pickIcon(name = "", mime = "") {
    const n = (name || "").toLowerCase();
    const isPpt = n.endsWith(".ppt") || n.endsWith(".pptx");
    const isDoc = n.endsWith(".doc") || n.endsWith(".docx");
    const isPdf = n.endsWith(".pdf");
    const isXls = n.endsWith(".xls") || n.endsWith(".xlsx");
    const isAudio =
        n.endsWith(".mp3") || n.endsWith(".wav") || n.endsWith(".m4a");
    const isVideo =
        (mime || "").startsWith("video/") ||
        [".mp4"].some((x) => n.endsWith(x));

    if (isPpt) return { label: "P", cls: "bg-amber-400" };
    if (isAudio) return { label: "♫", cls: "bg-purple-500" };
    if (isVideo) return { label: "🎬", cls: "bg-fuchsia-500" };
    if (isDoc) return { label: "W", cls: "bg-blue-500" };
    if (isPdf) return { label: "PDF", cls: "bg-red-500" };
    if (isXls) return { label: "X", cls: "bg-emerald-500" };
    if ((mime || "").startsWith("image/"))
        return { label: "IMG", cls: "bg-zinc-500" };
    return { label: "📄", cls: "bg-zinc-400" };
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

// ✅ UI select quyền
function AccessEditor({
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
        // tuỳ BE bạn trả field nào: avatarUrl | avatar | avatarPath...
        const u = t.avatarUrl || t.avatar || t.avatarPath || "";
        return u ? absUrl(u) : "";
    }

    function letterOf(t) {
        const x = String(t.name || t.email || "A")
            .trim()
            .slice(0, 1)
            .toUpperCase();
        return x || "A";
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
                <aside style={{
                    marginTop: '10px',
                    padding: '12px 16px',
                    background: '#fff3cd',
                    borderLeft: '4px solid #f59e0b',
                    borderRadius: '6px',
                    fontSize: '13px',      
                    fontStyle: 'italic'              
                }} class="note">
                    <strong>Lưu ý:</strong> Khi bạn cập nhật quyền truy cập của thư mục này, hệ thống sẽ tự động áp dụng quyền tương tự cho tất cả thư mục con bên trong.
                </aside>
            </div>

            {isRestricted && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <div className="mb-2 text-xs font-semibold text-zinc-600">
                        Chọn giảng viên được phép xem
                    </div>

                    {/* ✅ search */}
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

                                        {/* ✅ avatar */}
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

export default function Materials() {
    const { token, user } = useAuth();

    // drive state
    const [folderId, setFolderId] = useState(""); // "" = root
    const [path, setPath] = useState([]);
    const [folders, setFolders] = useState([]);
    const [materials, setMaterials] = useState([]);

    // teachers (admin only)
    const [teachers, setTeachers] = useState([]);

    // search
    const [q, setQ] = useState("");
    const [emTitle, setEMTitle] = useState("");

    // upload
    const [openUpload, setOpenUpload] = useState(false);

    // create folder
    const [openCreateFolder, setOpenCreateFolder] = useState(false);
    const [fName, setFName] = useState("");
    const [fVisibility, setFVisibility] = useState("public");
    const [fAllowIds, setFAllowIds] = useState([]);

    // edit folder
    const [openEditFolder, setOpenEditFolder] = useState(false);
    const [editFolder, setEditFolder] = useState(null);
    const [efName, setEFName] = useState("");
    const [efVisibility, setEFVisibility] = useState("public");
    const [efAllowIds, setEFAllowIds] = useState([]);

    // edit material permissions
    const [openEditMaterial, setOpenEditMaterial] = useState(false);
    const [editMaterial, setEditMaterial] = useState(null);
    const [emVisibility, setEMVisibility] = useState("public");
    const [emAllowIds, setEMAllowIds] = useState([]);

    const [openAudio, setOpenAudio] = useState(false);
    const [audioSrc, setAudioSrc] = useState("");
    const [audioTitle, setAudioTitle] = useState("");

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    const [sortBy, setSortBy] = useState("time_desc");
    const [audioMime, setAudioMime] = useState("");
    const [audioExt, setAudioExt] = useState("");

    async function openAudioPlayer(m) {
        // setAudioTitle(m.title || m.originalName);

        // setAudioSrc("");
        // setOpenAudio(true);

        // try {
        //     const blobUrl = await getAudioBlobUrl(token, m._id);
        //     setAudioSrc(blobUrl);
        // } catch (e) {
        //     setErr(e.message || "Không phát được audio");
        //     setOpenAudio(false);
        // }

        setAudioTitle(m.title || m.originalName);
        setAudioSrc(absUrl(m.storagePath)); // mp3/mp4 local
        setAudioMime(m.mimeType || "");
        setAudioExt(m.ext || "");
        setOpenAudio(true);
    }

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
                folderId: nextFolderId || "", // root = ""
                q: nextQ.trim() ? nextQ.trim() : undefined,
            });
            setMaterials(m.items || []);
        } catch (e) {
            setErr(e.message || "Load thất bại");
        } finally {
            setLoading(false);
        }
    }

    async function init() {
        setLoading(true);
        setErr("");
        try {
            // load teachers for admin to assign permissions
            if (user?.role === "admin") {
                const u = await adminListUsersApi(token);
                const arr = (u.users || []).filter(
                    (x) => x.role === "teacher" && x.isActive
                );
                setTeachers(arr);
            }

            setFolderId("");
            await refreshDrive("", "");
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

    const viewMaterials = useMemo(() => {
        const k = q.trim().toLowerCase();

        let arr = Array.isArray(materials) ? [...materials] : [];

        // filter
        if (k) {
            arr = arr.filter((m) => {
                const a = (m.title || "").toLowerCase();
                const b = (m.originalName || "").toLowerCase();
                return a.includes(k) || b.includes(k);
            });
        }

        // sort
        const byName = (x) =>
            (x?.title || x?.originalName || "").trim().toLowerCase();
        const byTime = (x) => new Date(x?.createdAt || 0).getTime() || 0;

        arr.sort((a, b) => {
            if (sortBy === "name_asc")
                return byName(a).localeCompare(byName(b), "vi");
            if (sortBy === "name_desc")
                return byName(b).localeCompare(byName(a), "vi");
            if (sortBy === "time_asc") return byTime(a) - byTime(b);
            return byTime(b) - byTime(a); // time_desc default
        });

        return arr;
    }, [materials, q, sortBy]);

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
                // ✅ quyền folder
                visibility: fVisibility,
                allowTeacherIds: fVisibility === "restricted" ? fAllowIds : [],
            });

            setOpenCreateFolder(false);
            setFName("");
            setFVisibility("public");
            setFAllowIds([]);
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
        setEFVisibility(f?.visibility || "public");
        setEFAllowIds(
            Array.isArray(f?.allowTeacherIds)
                ? f.allowTeacherIds.map(String)
                : []
        );
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
                visibility: efVisibility,
                allowTeacherIds:
                    efVisibility === "restricted" ? efAllowIds : [],
            });

            setOpenEditFolder(false);
            setEditFolder(null);
            setEFName("");
            setEFVisibility("public");
            setEFAllowIds([]);
            await refreshDrive(folderId, q);
        } catch (e2) {
            setErr(e2.message || "Cập nhật folder thất bại");
        }
    }

    function openEditMaterialModal(m) {
        setEditMaterial(m);
        setEMTitle(m?.title || ""); // ✅ thêm dòng này
        setEMVisibility(m?.visibility || "public");
        setEMAllowIds(
            Array.isArray(m?.allowTeacherIds)
                ? m.allowTeacherIds.map(String)
                : []
        );
        setOpenEditMaterial(true);
    }

    async function onSaveMaterial(e) {
        e.preventDefault();
        if (!editMaterial?._id) return;

        const newTitle = (emTitle || "").trim();
        if (!newTitle) return setErr("Bạn chưa nhập tên tài liệu");

        setErr("");
        try {
            // 1) update title nếu có thay đổi
            if (newTitle !== (editMaterial.title || "").trim()) {
                await patchMaterialApi(token, editMaterial._id, {
                    title: newTitle,
                });
            }

            // 2) update permissions
            await patchMaterialPermissionsApi(token, editMaterial._id, {
                visibility: emVisibility,
                allowTeacherIds:
                    emVisibility === "restricted" ? emAllowIds : [],
            });

            setOpenEditMaterial(false);
            setEditMaterial(null);
            setEMTitle("");
            setEMVisibility("public");
            setEMAllowIds([]);

            await refreshDrive(folderId, q);
        } catch (e2) {
            setErr(e2.message || "Cập nhật tài liệu thất bại");
        }
    }

    function badgeVisibility(v) {
        if (v === "restricted") return "Giới hạn";
        return "Công khai";
    }

    function fmtTime(iso) {
        if (!iso) return "—";
        const d = new Date(iso);
        return d.toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    }

    async function uploadOneLocal({
        folderId,
        visibility,
        allowTeacherIds,
        file,
        title,
    }) {
        await uploadLocalMaterialApi(token, {
            title,
            file,
            folderId,
            visibility,
            allowTeacherIds,
        });
    }

    async function createOneFromLink(payload) {
        await createMaterialFromGoogleLinkApi(token, {
            title: payload.title,
            sourceUrl: payload.googleLink,
            folderId: payload.folderId || null,
        });
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
                            ? "Admin quản lý folder/file và phân quyền theo giảng viên."
                            : "Bạn chỉ nhìn thấy folder/file được cấp quyền."}
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <DriveCrumb
                        path={path}
                        onGoRoot={onGoRoot}
                        onGo={onGoCrumb}
                    />

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm sm:w-[220px]"
                            title="Sắp xếp"
                        >
                            <option value="time_desc">Mới upload → Cũ</option>
                            <option value="time_asc">Cũ → Mới upload</option>
                            <option value="name_asc">Tên A → Z</option>
                            <option value="name_desc">Tên Z → A</option>
                        </select>

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
                    <div className="col-span-5">Tên</div>
                    <div className="col-span-2">Ngày tạo</div>
                    <div className="col-span-2">Quyền</div>
                    <div className="col-span-3 text-right">Thao tác</div>
                </div>
                <div className="h-[calc(100vh-280px)] overflow-auto">
                    {loading ? (
                        <div className="px-4 py-4 text-sm">Đang tải...</div>
                    ) : folders.length === 0 && viewMaterials.length === 0 ? (
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
                                    <div className="col-span-5 min-w-0">
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

                                    <div className="col-span-2 min-w-0">
                                        <span className="text-gray-600 text-xs">
                                            {fmtTime(f.createdAt)}
                                        </span>
                                    </div>

                                    <div className="col-span-2">
                                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700">
                                            {badgeVisibility(f.visibility)}
                                        </span>
                                    </div>

                                    <div className="col-span-3 text-right">
                                        {user?.role === "admin" ? (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() =>
                                                        openEditFolderModal(f)
                                                    }
                                                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs hover:bg-zinc-50"
                                                    title="Sửa folder + phân quyền"
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
                                            <span className="text-xs text-zinc-400" />
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* materials */}
                            {viewMaterials.map((m) => {
                                const icon = pickIcon(
                                    m.originalName || m.title,
                                    m.mimeType
                                );

                                return (
                                    <div
                                        key={m._id}
                                        className="grid grid-cols-12 items-center gap-3 px-4 py-3 text-sm hover:bg-zinc-50"
                                    >
                                        <div className="col-span-5 min-w-0">
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
                                                        {fmtSize(m.size)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-span-2 min-w-0">
                                            <span className="text-gray-600 text-xs">
                                                {fmtTime(m.createdAt)}
                                            </span>
                                        </div>

                                        <div className="col-span-2">
                                            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700">
                                                {badgeVisibility(m.visibility)}
                                            </span>
                                        </div>

                                        <div className="col-span-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                {[
                                                    "audio/mpeg",
                                                    "audio/wav",
                                                    "audio/mp4",
                                                    "video/mp4",
                                                    "image/jpeg",
                                                    "image/jpg",
                                                    "image/png",
                                                    "image/webp",
                                                ].includes(m.mimeType) ? (
                                                    <span
                                                        onClick={() =>
                                                            openAudioPlayer(m)
                                                        }
                                                        className="rounded-lg border border-zinc-200 px-3 py-1 text-xs hover:bg-white cursor-pointer"
                                                    >
                                                        Xem
                                                    </span>
                                                ) : (
                                                    <a
                                                        target="_blank"
                                                        href={`/viewer/${m._id}`}
                                                        className="rounded-lg border border-zinc-200 px-3 py-1 text-xs hover:bg-white"
                                                    >
                                                        Xem
                                                    </a>
                                                )}

                                                {user?.role === "admin" && (
                                                    <>
                                                        <button
                                                            onClick={() =>
                                                                openEditMaterialModal(
                                                                    m
                                                                )
                                                            }
                                                            className="rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs hover:bg-zinc-50"
                                                            title="Sửa phân quyền tài liệu"
                                                        >
                                                            Sửa
                                                        </button>

                                                        <button
                                                            onClick={() =>
                                                                onDeleteMaterial(
                                                                    m
                                                                )
                                                            }
                                                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700 hover:bg-red-100"
                                                            title="Xoá"
                                                        >
                                                            Xoá
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            </div>

            <UploadMaterialsModal
                open={openUpload}
                onClose={() => setOpenUpload(false)}
                folderId={folderId}
                path={path}
                isAdmin={user?.role === "admin"}
                teachers={teachers}
                absUrl={absUrl}
                uploadOneLocal={uploadOneLocal}
                createOneFromGoogleLink={createOneFromLink}
                onUploadedDone={onRefresh}
            />

            <MediaPlayerModal
                open={openAudio}
                onClose={() => setOpenAudio(false)}
                title={audioTitle}
                src={audioSrc}
                mimeType={audioMime}
                ext={audioExt}
            />

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
                        <div className="mt-1 text-xs text-zinc-500">
                            Folder con có thể kế thừa quyền truy cập folder cha
                        </div>
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

                    {user?.role === "admin" && (
                        <AccessEditor
                            teachers={teachers}
                            visibility={fVisibility}
                            setVisibility={setFVisibility}
                            allowIds={fAllowIds}
                            setAllowIds={setFAllowIds}
                        />
                    )}

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

                    {user?.role === "admin" && (
                        <AccessEditor
                            teachers={teachers}
                            visibility={efVisibility}
                            setVisibility={setEFVisibility}
                            allowIds={efAllowIds}
                            setAllowIds={setEFAllowIds}
                        />
                    )}

                    <button className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800">
                        Lưu
                    </button>
                </form>
            </Modal>

            {/* edit material permission modal */}
            <Modal
                open={openEditMaterial}
                title="Phân quyền tài liệu"
                onClose={() => {
                    setOpenEditMaterial(false);
                    setEditMaterial(null);
                }}
            >
                <form onSubmit={onSaveMaterial} className="space-y-3">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700">
                            Tên tài liệu
                        </label>
                        <input
                            value={emTitle}
                            onChange={(e) => setEMTitle(e.target.value)}
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                            placeholder="Nhập tên hiển thị..."
                            required
                        />
                        <div className="mt-1 text-xs text-zinc-500">
                            Tên gốc file: {editMaterial?.originalName || "—"}
                        </div>
                    </div>

                    {user?.role === "admin" && (
                        <AccessEditor
                            teachers={teachers}
                            visibility={emVisibility}
                            setVisibility={setEMVisibility}
                            allowIds={emAllowIds}
                            setAllowIds={setEMAllowIds}
                        />
                    )}

                    <button className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800">
                        Lưu quyền
                    </button>
                </form>
            </Modal>
        </div>
    );
}
