import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { getMeApi, updateMeApi } from "../api/users";

export default function Account() {
    const { token, user, login, logout } = useAuth();
    const [name, setName] = useState(user?.name || "");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const data = await getMeApi(token);
                setName(data.user?.name || "");
                // sync user vào context
                login({ token, user: data.user });
            } catch (e) {
                // token lỗi => logout
                logout();
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function onSave(e) {
        e.preventDefault();
        setMsg("");
        setErr("");
        setLoading(true);

        try {
            const payload = { name };
            if (password.trim()) payload.password = password.trim();

            const data = await updateMeApi(token, payload);
            login({ token, user: data.user });
            setPassword("");
            setMsg("Đã lưu thay đổi.");
        } catch (e) {
            setErr(e.message || "Lưu thất bại");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-900">
            <div className="mx-auto max-w-xl px-4 py-8">
                <div className="mb-5">
                    <div className="text-xl font-semibold">
                        Tài khoản của tôi
                    </div>
                    <div className="text-sm text-zinc-500">
                        Role:{" "}
                        <span className="font-medium text-zinc-700">
                            {user?.role}
                        </span>
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-6 ">
                    {msg && (
                        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                            {msg}
                        </div>
                    )}
                    {err && (
                        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {err}
                        </div>
                    )}

                    <form onSubmit={onSave} className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-zinc-700">
                                Họ tên
                            </label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-zinc-700">
                                Đổi mật khẩu
                            </label>
                            <input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="để trống nếu không đổi"
                                type="password"
                                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                            />
                        </div>

                        <button
                            disabled={loading}
                            className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                        >
                            {loading ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
