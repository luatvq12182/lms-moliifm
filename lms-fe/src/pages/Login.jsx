import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginApi } from "../api/auth";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function onSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const data = await loginApi({ email, password });
            // BE trả: { token, user }
            login({ token: data.token, user: data.user });

            // admin vào /admin, teacher vào /account
            if (data.user?.role === "admin")
                navigate("/admin/profile", { replace: true });
            else navigate("/account", { replace: true });
        } catch (err) {
            setError(err.message || "Đăng nhập thất bại");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-900">
            <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
                <div className="w-full">
                    {/* header */}
                    <div className="mb-6 text-center">
                        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
                            Đăng nhập
                        </h1>
                    </div>

                    {/* card */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 ">
                        {error && (
                            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <form onSubmit={onSubmit} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-zinc-700">
                                    Email
                                </label>
                                <input
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    type="email"
                                    placeholder="teacher@trungtam.com"
                                    autoComplete="email"
                                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-zinc-700">
                                    Mật khẩu
                                </label>
                                <input
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    type="password"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                                />
                            </div>

                            <button
                                disabled={loading}
                                className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                            >
                                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                            </button>
                        </form>
                    </div>

                    {/* footer */}
                    <div className="mt-6 text-center text-xs text-zinc-500">
                        © {new Date().getFullYear()} MOLLI FM
                    </div>
                </div>
            </div>
        </div>
    );
}
