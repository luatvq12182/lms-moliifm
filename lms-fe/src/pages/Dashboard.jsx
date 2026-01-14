import React from "react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Dashboard() {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
            <div className="mx-auto max-w-5xl px-4 py-10">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold">LMS Dashboard</h1>
                    <button
                        onClick={logout}
                        className="rounded-lg bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
                    >
                        Đăng xuất
                    </button>
                </div>

                <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                    <p className="text-sm text-zinc-300">Xin chào,</p>
                    <p className="mt-1 text-lg font-medium">
                        {user?.name || "Giảng viên"}
                    </p>
                    <p className="mt-2 text-sm text-zinc-400">
                        (Trang này là placeholder để test auth + routing)
                    </p>
                </div>
            </div>
        </div>
    );
}
