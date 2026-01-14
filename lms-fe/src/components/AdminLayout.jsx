import React, { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const nav = [
    { to: "/admin", label: "Tổng quan" },
    { to: "/admin/courses", label: "Khoá học" },
    { to: "/admin/classes", label: "Lớp học" },
    { to: "/admin/teachers", label: "Giảng viên" },
    { to: "/admin/materials", label: "Tài liệu / Slide" },
];

function cls(...a) {
    return a.filter(Boolean).join(" ");
}

function SidebarContent({ collapsed, onNavigate }) {
    const { user, logout } = useAuth();

    return (
        <div className="flex h-full flex-col">
            <div className="shrink-0">
                <div className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-900 text-white">
                            中
                        </div>
                        {!collapsed && (
                            <div>
                                <div className="text-sm font-semibold leading-tight">
                                    MOLII FM
                                </div>
                                <div className="text-xs text-zinc-500">
                                    Trung tâm tiếng Trung
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 pb-4">
                {nav.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === "/admin"}
                        onClick={() => onNavigate?.()}
                        className={({ isActive }) =>
                            cls(
                                "mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
                                "hover:bg-zinc-50",
                                isActive
                                    ? "bg-zinc-900 text-white hover:bg-zinc-900"
                                    : "text-zinc-700"
                            )
                        }
                    >
                        <span className="h-2 w-2 rounded-full bg-zinc-300" />
                        <span className={collapsed ? "hidden" : "block"}>
                            {item.label}
                        </span>
                    </NavLink>
                ))}
            </nav>

            <div className="shrink-0 border-t border-zinc-200 bg-white p-4 sticky bottom-0">
                <div className={collapsed ? "hidden" : "block"}>
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                        <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white border border-zinc-200 text-zinc-700">
                                {String(user?.name || "A")
                                    .trim()
                                    .slice(0, 1)
                                    .toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-zinc-900">
                                    {user?.name || "Admin"}
                                </div>
                                <div className="truncate text-xs text-zinc-500">
                                    {user?.email || "admin@trungtam.com"}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={logout}
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                        >
                            <span aria-hidden>⎋</span>
                            Đăng xuất
                        </button>
                    </div>
                </div>

                {/* collapsed mode: chỉ show icon */}
                <div className={collapsed ? "block" : "hidden"}>
                    <button
                        onClick={logout}
                        className="grid w-full place-items-center rounded-xl border border-zinc-200 bg-white px-3 py-3 text-zinc-700 hover:bg-zinc-50"
                        title="Đăng xuất"
                        aria-label="Đăng xuất"
                    >
                        ⎋
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AdminLayout() {
    const [collapsed, setCollapsed] = useState(false); // desktop collapse
    const [mobileOpen, setMobileOpen] = useState(false); // mobile drawer
    const location = useLocation();

    const title = useMemo(() => {
        const item = nav.find((x) => location.pathname === x.to);
        if (item) return item.label;
        if (location.pathname.startsWith("/admin/courses")) return "Khoá học";
        if (location.pathname.startsWith("/admin/classes")) return "Lớp học";
        if (location.pathname.startsWith("/admin/teachers"))
            return "Giảng viên";
        if (location.pathname.startsWith("/admin/materials"))
            return "Tài liệu / Slide";
        return "Bảng điều khiển";
    }, [location.pathname]);

    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-900">
            <div className="flex min-h-screen">
                {/* desktop sidebar */}
                <aside
                    className={cls(
                        "hidden h-screen overflow-hidden border-r border-zinc-200 bg-white md:block",
                        collapsed ? "w-[76px]" : "w-[260px]"
                    )}
                >
                    <div className="flex items-center justify-between px-4 pt-4">
                        <div className="text-xs text-zinc-500">
                            {collapsed ? "" : "Điều hướng"}
                        </div>
                        <button
                            onClick={() => setCollapsed((v) => !v)}
                            className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                            title="Thu gọn"
                        >
                            {collapsed ? "»" : "«"}
                        </button>
                    </div>

                    <SidebarContent collapsed={collapsed} />
                </aside>

                {/* mobile drawer */}
                {mobileOpen && (
                    <div className="fixed inset-0 z-40 md:hidden">
                        <div
                            className="absolute inset-0 bg-black/40"
                            onClick={() => setMobileOpen(false)}
                        />
                        <div className="absolute left-0 top-0 h-screen w-[84%] max-w-[320px] overflow-hidden border-r border-zinc-200 bg-white shadow-xl">
                            <div className="flex items-center justify-between px-4 py-4">
                                <div className="text-sm font-semibold">
                                    Menu
                                </div>
                                <button
                                    onClick={() => setMobileOpen(false)}
                                    className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600"
                                >
                                    Đóng
                                </button>
                            </div>
                            <SidebarContent
                                collapsed={false}
                                onNavigate={() => setMobileOpen(false)}
                            />
                        </div>
                    </div>
                )}

                {/* main */}
                <main className="flex-1">
                    {/* topbar */}
                    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur">
                        <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
                            <div className="flex items-center gap-3">
                                {/* hamburger mobile */}
                                <button
                                    onClick={() => setMobileOpen(true)}
                                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50 md:hidden"
                                    aria-label="Open menu"
                                >
                                    ☰
                                </button>

                                <div>
                                    <div className="text-base font-semibold md:text-lg">
                                        {title}
                                    </div>
                                    <div className="hidden text-xs text-zinc-500 md:block">
                                        Quản trị hệ thống
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* content */}
                    <div className="px-4 py-4 md:px-6 md:py-6">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
