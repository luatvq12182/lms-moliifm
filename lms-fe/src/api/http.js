const API_BASE = import.meta.env.VITE_API_BASE || "";

export function forceLogout() {
    localStorage.removeItem("lms_token");
    localStorage.removeItem("lms_user");

    // tránh redirect loop
    if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
    }
}

export async function request(
    path,
    { method = "GET", token, body, headers: extraHeaders } = {}
) {
    const headers = {
        ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...extraHeaders,
    };

    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body
            ? body instanceof FormData
                ? body
                : JSON.stringify(body)
            : undefined,
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await res.json().catch(() => ({})) : await res.text();

    // 🔥 GLOBAL AUTH HANDLER
    if (res.status === 401) {
        const message = data?.message;

        if (
            message === "TOKEN_EXPIRED" ||
            message === "INVALID_TOKEN" ||
            !token // fallback
        ) {
            forceLogout();
        }
    }

    if (!res.ok) {
        const err = new Error(data?.message || `HTTP ${res.status}`);
        err.status = res.status;
        throw err;
    }

    return data;
}
