const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:7474";

async function parseJson(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return data;
}

export async function getDashboardSummaryApi(token) {
    const res = await fetch(`${API_BASE}/api/dashboard/summary`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return parseJson(res);
}