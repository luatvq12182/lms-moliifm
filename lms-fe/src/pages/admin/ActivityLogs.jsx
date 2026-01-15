import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { listActivityLogsApi } from "../../api/activityLogs";

function fmtTime(iso) {
    try {
        return new Date(iso).toLocaleString("vi-VN");
    } catch {
        return iso || "";
    }
}

function Badge({ children }) {
    return (
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700">
            {children}
        </span>
    );
}

export default function ActivityLogs() {
    const { token, user } = useAuth();

    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    // filters
    const [q, setQ] = useState("");
    const [action, setAction] = useState(""); // "" | LOGIN | MATERIAL_VIEW
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");

    // paging
    const [page, setPage] = useState(1);
    const limit = 30;

    const totalPages = useMemo(() => {
        return Math.max(1, Math.ceil((total || 0) / limit));
    }, [total]);

    async function refresh(nextPage = page) {
        setErr("");
        setLoading(true);
        try {
            const data = await listActivityLogsApi(token, {
                page: nextPage,
                limit,
                action: action || undefined,
                q: q.trim() || undefined,
                from: from || undefined,
                to: to || undefined,
            });
            setItems(data.items || []);
            setTotal(data.total || 0);
            setPage(data.page || nextPage);
        } catch (e) {
            setErr(e.message || "Load thất bại");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (user?.role === "admin") refresh(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        <div className="max-w-full">
            <div className="mb-4">
                <div className="text-base font-semibold">Nhật ký hoạt động</div>
                <div className="text-sm text-zinc-500">
                    Theo dõi đăng nhập và truy cập tài liệu của giảng viên.
                </div>
            </div>

            <div className="mb-3 grid gap-2 lg:grid-cols-6">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Tìm theo email, IP, tên tài liệu..."
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm lg:col-span-2"
                />

                <select
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                    <option value="">Tất cả hành động</option>
                    <option value="LOGIN">Đăng nhập</option>
                    <option value="MATERIAL_VIEW">Xem tài liệu</option>
                </select>

                <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                />
                <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                />

                <div className="flex gap-2 lg:justify-end">
                    <button
                        onClick={() => refresh(1)}
                        className="w-full rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                    >
                        Lọc
                    </button>
                    <button
                        onClick={() => {
                            setQ("");
                            setAction("");
                            setFrom("");
                            setTo("");
                            refresh(1);
                        }}
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {err && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {err}
                </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                <div className="grid grid-cols-12 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-600">
                    <div className="col-span-3">Thời gian</div>
                    <div className="col-span-3">Giảng viên</div>
                    <div className="col-span-2">Hành động</div>
                    <div className="col-span-2">IP</div>
                    <div className="col-span-2 text-right">Chi tiết</div>
                </div>

                {loading ? (
                    <div className="px-4 py-4 text-sm">Đang tải...</div>
                ) : items.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-zinc-500">
                        Chưa có log
                    </div>
                ) : (
                    items.map((x) => (
                        <div
                            key={x._id}
                            className="grid grid-cols-12 items-center gap-2 px-4 py-3 text-sm hover:bg-zinc-50"
                        >
                            <div className="col-span-3 text-zinc-700">
                                {fmtTime(x.createdAt)}
                            </div>

                            <div className="col-span-3 min-w-0">
                                <div className="truncate font-medium">
                                    {x.userId?.name || "-"}
                                </div>
                                <div className="truncate text-xs text-zinc-500">
                                    {x.userEmail || x.userId?.email || "-"}
                                </div>
                            </div>

                            <div className="col-span-2">
                                <Badge>
                                    {x.action === "MATERIAL_VIEW"
                                        ? "XEM TÀI LIỆU"
                                        : x.action}
                                </Badge>
                            </div>

                            <div className="col-span-2">
                                <div className="text-zinc-700">
                                    {x.ip || "-"}
                                </div>
                                <div className="truncate text-xs text-zinc-500">
                                    {x.ua?.browser
                                        ? `${x.ua.browser}${
                                              x.ua.version
                                                  ? ` ${x.ua.version}`
                                                  : ""
                                          }`
                                        : ""}
                                </div>
                            </div>

                            <div className="col-span-2 text-right">
                                {x.action === "MATERIAL_VIEW" ? (
                                    <div className="text-xs text-zinc-600">
                                        <div className="truncate">
                                            {x.materialId?.title ||
                                                x.meta?.title ||
                                                "Tài liệu"}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="truncate text-xs text-zinc-500"></div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* pagination */}
            <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-zinc-500">
                    Tổng:{" "}
                    <span className="font-medium text-zinc-700">{total}</span>{" "}
                    log
                </div>

                <div className="flex items-center gap-2">
                    <button
                        disabled={page <= 1 || loading}
                        onClick={() => refresh(page - 1)}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                    >
                        ← Trước
                    </button>
                    <div className="text-sm text-zinc-700">
                        {page}/{totalPages}
                    </div>
                    <button
                        disabled={page >= totalPages || loading}
                        onClick={() => refresh(page + 1)}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                    >
                        Sau →
                    </button>
                </div>
            </div>
        </div>
    );
}
