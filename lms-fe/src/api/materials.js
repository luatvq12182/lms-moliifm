const API_BASE = import.meta.env.VITE_API_BASE || "";

async function parseJson(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return data;
}

export async function listMaterialsApi(token, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/api/materials${qs ? `?${qs}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return parseJson(res);
}

export async function uploadMaterialApi(token, { scope, courseId, classId, title, file }) {
    const form = new FormData();
    form.append("scope", scope || "class");
    if (courseId) form.append("courseId", courseId);
    if (classId) form.append("classId", classId);
    if (title) form.append("title", title);
    form.append("file", file);

    const res = await fetch(`${API_BASE}/api/materials/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
    });
    return parseJson(res);
}

export async function patchMaterialApi(token, id, payload) {
    const res = await fetch(`${API_BASE}/api/materials/${id}`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    return parseJson(res);
}

export async function deleteMaterialApi(token, id) {
    const res = await fetch(`${API_BASE}/api/materials/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });
    return parseJson(res);
}

export async function openMaterialFile(token, id) {
    // <a href> không gửi Authorization => phải fetch blob
    const res = await fetch(`${API_BASE}/api/materials/${id}/file`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || `HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
}

export async function getMaterialEmbedApi(token, id) {
    const res = await fetch(`${API_BASE}/api/materials/${id}/embed`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return parseJson(res);
}