const API_BASE = import.meta.env.VITE_API_BASE || "";

async function parseJson(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return data;
}

function cleanParams(params = {}) {
    const out = {};
    Object.entries(params || {}).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        const s = String(v);
        if (s === "" || s === "undefined" || s === "null") return;
        out[k] = s;
    });
    return out;
}

export async function listMaterialsApi(token, params = {}) {
    const qs = new URLSearchParams(cleanParams(params)).toString();
    const res = await fetch(`${API_BASE}/api/materials${qs ? `?${qs}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return parseJson(res);
}

export async function uploadMaterialApi(token, { title, file, folderId, visibility, allowTeacherIds }) {
    const form = new FormData();
    if (title) form.append("title", title);
    if (folderId) form.append("folderId", folderId);

    if (visibility) form.append("visibility", visibility); // optional (nếu BE cho override)
    if (Array.isArray(allowTeacherIds)) {
        allowTeacherIds.forEach((id) => form.append("allowTeacherIds[]", id));
    }

    form.append("file", file);

    const res = await fetch(`${API_BASE}/api/materials/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
    });
    return parseJson(res);
}

export async function uploadManyMaterialsApi(token, { folderId, files, titles }) {
    const form = new FormData();
    if (folderId) form.append("folderId", folderId);
    // titles gửi 1 cục json theo thứ tự file
    form.append("titles", JSON.stringify(titles || []));

    (files || []).forEach((f) => form.append("files", f));

    const res = await fetch(`${API_BASE}/api/materials/upload-many`, {
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

export async function patchMaterialPermissionsApi(token, id, payload) {
    const res = await fetch(`${API_BASE}/api/materials/${id}/permissions`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    return parseJson(res);
}

export async function getAudioBlobUrl(token, id) {
    const res = await fetch(`${API_BASE}/api/materials/${id}/audio`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || `HTTP ${res.status}`);
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
}
