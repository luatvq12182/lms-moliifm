import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { getDashboardSummaryApi } from "../../api/dashboard";

function Card({ title, value, hint }) {
    return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="text-sm text-zinc-500">{title}</div>
            <div className="mt-1 text-3xl font-semibold tracking-tight">
                {value}
            </div>
            {hint ? (
                <div className="mt-1 text-xs text-zinc-500">{hint}</div>
            ) : null}
        </div>
    );
}

function Badge({ scope }) {
    const text =
        scope === "public"
            ? "Công khai"
            : scope === "course"
            ? "Theo khoá"
            : "Theo lớp";
    return (
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-700">
            {text}
        </span>
    );
}

function formatTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
    });
}

export default function Overview() {
    const { token, user } = useAuth();
    const isAdmin = user?.role === "admin";

    const [data, setData] = useState(null);
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(true);

    async function load() {
        setErr("");
        setLoading(true);
        try {
            const res = await getDashboardSummaryApi(token);
            setData(res);
        } catch (e) {
            setErr(e.message || "Không tải được dữ liệu");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []); // eslint-disable-line

    const counters = data?.counters || {};

    const cards = useMemo(() => {
        if (!data) return [];
        if (isAdmin) {
            return [
                {
                    title: "Khoá học",
                    value: counters.courses ?? 0,
                    hint: "đang quản lý",
                },
                {
                    title: "Lớp học",
                    value: counters.classes ?? 0,
                    hint: "tổng số",
                },
                {
                    title: "Giảng viên",
                    value: counters.teachers ?? 0,
                    hint: "đã tạo",
                },
                {
                    title: "Tài liệu/Slide",
                    value: counters.materials ?? 0,
                    hint: "đã upload",
                },
            ];
        }
        return [
            {
                title: "Lớp của tôi",
                value: counters.myClasses ?? 0,
                hint: "được phân công",
            },
            {
                title: "Tài liệu xem được",
                value: counters.materials ?? 0,
                hint: "theo phân quyền",
            },
        ];
    }, [data, isAdmin, counters]);

    return (
        <div className="space-y-5">
            {/* header */}
            <div className="flex flex-col gap-1">
                <div className="text-lg font-semibold">Tổng quan</div>
                <div className="text-sm text-zinc-500">
                    {isAdmin
                        ? "Quản trị hệ thống"
                        : "Bảng điều khiển giảng viên"}
                </div>
            </div>

            {err && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {err}
                </div>
            )}

            {/* cards */}
            <div
                className={`grid gap-3 ${
                    isAdmin ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-2"
                }`}
            >
                {loading
                    ? Array.from({ length: isAdmin ? 4 : 2 }).map((_, i) => (
                          <div
                              key={i}
                              className="h-[102px] animate-pulse rounded-2xl border border-zinc-200 bg-white"
                          />
                      ))
                    : cards.map((c) => (
                          <Card
                              key={c.title}
                              title={c.title}
                              value={c.value}
                              hint={c.hint}
                          />
                      ))}
            </div>

            {/* sections */}
            <div className="grid gap-4 lg:grid-cols-12">
                {/* left */}
                <div className="lg:col-span-6">
                    <div className="rounded-2xl border border-zinc-200 bg-white">
                        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                            <div className="text-sm font-semibold">
                                {isAdmin ? "Lớp học gần đây" : "Lớp của tôi"}
                            </div>
                            <Link
                                to="/admin/classes"
                                className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
                            >
                                Xem tất cả
                            </Link>
                        </div>

                        <div className="divide-y divide-zinc-100">
                            {loading ? (
                                <div className="p-4 text-sm text-zinc-500">
                                    Đang tải...
                                </div>
                            ) : (isAdmin
                                  ? data?.recentClasses || []
                                  : data?.myClasses || []
                              ).length === 0 ? (
                                <div className="p-4 text-sm text-zinc-500">
                                    Chưa có lớp
                                </div>
                            ) : (
                                (isAdmin
                                    ? data?.recentClasses
                                    : data?.myClasses
                                ).map((c) => (
                                    <div key={c._id} className="px-4 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-medium">
                                                    {c.name}
                                                </div>
                                                <div className="mt-0.5 text-xs text-zinc-500">
                                                    {c.course?.name
                                                        ? `Khoá: ${c.course.name}`
                                                        : "Chưa gán khoá"}
                                                    {isAdmin
                                                        ? ` • GV: ${
                                                              c.teachers || 0
                                                          }`
                                                        : ""}
                                                    {c.updatedAt
                                                        ? ` • cập nhật: ${formatTime(
                                                              c.updatedAt
                                                          )}`
                                                        : ""}
                                                </div>
                                            </div>

                                            <Link
                                                to="/admin/classes"
                                                className="shrink-0 rounded-lg border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50"
                                            >
                                                Quản lý
                                            </Link>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* right */}
                <div className="lg:col-span-6">
                    <div className="rounded-2xl border border-zinc-200 bg-white">
                        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                            <div className="text-sm font-semibold">
                                Tài liệu mới
                            </div>
                            <Link
                                to="/admin/materials"
                                className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
                            >
                                Quản lý
                            </Link>
                        </div>

                        <div className="divide-y divide-zinc-100">
                            {loading ? (
                                <div className="p-4 text-sm text-zinc-500">
                                    Đang tải...
                                </div>
                            ) : (data?.recentMaterials || []).length === 0 ? (
                                <div className="p-4 text-sm text-zinc-500">
                                    Chưa có tài liệu
                                </div>
                            ) : (
                                data.recentMaterials.map((m) => (
                                    <div key={m._id} className="px-4 py-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="truncate text-sm font-medium">
                                                        {m.title}
                                                    </div>
                                                    <Badge scope={m.scope} />
                                                </div>

                                                <div className="mt-0.5 text-xs text-zinc-500">
                                                    {m.course?.name
                                                        ? `Khoá: ${m.course.name}`
                                                        : ""}
                                                    {m.class?.name
                                                        ? ` • Lớp: ${m.class.name}`
                                                        : ""}
                                                    {m.uploader?.name
                                                        ? ` • Upload: ${m.uploader.name}`
                                                        : ""}
                                                    {m.createdAt
                                                        ? ` • ${formatTime(
                                                              m.createdAt
                                                          )}`
                                                        : ""}
                                                </div>
                                            </div>

                                            <a
                                                href={`/viewer/${m._id}`}
                                                className="shrink-0 rounded-lg border border-zinc-200 px-3 py-1 text-xs hover:bg-zinc-50"
                                            >
                                                Trình chiếu
                                            </a>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="border-t border-zinc-200 px-4 py-3">
                            <button
                                onClick={load}
                                className="w-full rounded-xl bg-zinc-900 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                            >
                                Tải lại dữ liệu
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* quick actions */}
            {isAdmin && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="text-sm font-semibold">Thao tác nhanh</div>
                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                        <Link
                            to="/admin/courses"
                            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm hover:bg-zinc-50"
                        >
                            + Tạo / quản lý khoá học
                            <div className="mt-1 text-xs text-zinc-500">
                                Tạo khoá và xem danh sách lớp
                            </div>
                        </Link>

                        <Link
                            to="/admin/classes"
                            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm hover:bg-zinc-50"
                        >
                            + Tạo / phân công lớp
                            <div className="mt-1 text-xs text-zinc-500">
                                Phân công giảng viên theo lớp
                            </div>
                        </Link>

                        <Link
                            to="/admin/materials"
                            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm hover:bg-zinc-50"
                        >
                            Upload tài liệu / slide
                            <div className="mt-1 text-xs text-zinc-500">
                                Phân quyền public / khoá / lớp
                            </div>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
