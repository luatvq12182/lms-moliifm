const API_BASE = import.meta.env.VITE_API_BASE || "";

export async function request(path, { method = "GET", token, body } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
        const message = data?.message || `HTTP ${res.status}`;
        throw new Error(message);
    }
    return data;
}