const API_BASE = import.meta.env.VITE_API_BASE || "";

/* =======================
 * Utils
 * ======================= */
async function parseJson(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data?.message || `HTTP ${res.status}`);
    }
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

function authHeader(token) {
    return {
        Authorization: `Bearer ${token}`,
    };
}

/* =======================
 * LIST / READ
 * ======================= */
export async function listMaterialsApi(token, params = {}) {
    const qs = new URLSearchParams(cleanParams(params)).toString();
    const res = await fetch(
        `${API_BASE}/api/materials${qs ? `?${qs}` : ""}`,
        { headers: authHeader(token) }
    );
    return parseJson(res);
}

export async function getMaterialEmbedApi(token, id) {
    const res = await fetch(
        `${API_BASE}/api/materials/${id}/embed`,
        { headers: authHeader(token) }
    );
    return parseJson(res);
}

/* =======================
 * CREATE — GOOGLE LINK
 * ======================= */
/**
 * Tạo 1 material từ link Google
 * BE: POST /api/materials/create-google
 *
 * payload:
 * {
 *   title,
 *   googleLink,
 *   folderId?,
 *   visibility?,
 *   allowTeacherIds?
 * }
 */
export async function createMaterialFromGoogleLinkApi(
    token,
    { title, sourceUrl, folderId }
) {
    const body = {
        title,
        sourceUrl,
        folderId,
    };

    const res = await fetch(`${API_BASE}/api/materials/upload/google`, {
        method: "POST",
        headers: {
            ...authHeader(token),
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    return parseJson(res);
}

/* =======================
 * UPLOAD — LOCAL FILE (1)
 * ======================= */
/**
 * Upload 1 file local (audio/video/image/pdf...)
 * BE: POST /api/materials/upload/local
 */
export async function uploadLocalMaterialApi(
    token,
    { title, file, folderId, visibility, allowTeacherIds }
) {
    const form = new FormData();

    if (title) form.append("title", title);
    if (folderId) form.append("folderId", folderId);
    if (visibility) form.append("visibility", visibility);

    if (Array.isArray(allowTeacherIds)) {
        allowTeacherIds.forEach((id) =>
            form.append("allowTeacherIds[]", id)
        );
    }

    form.append("file", file);

    const res = await fetch(`${API_BASE}/api/materials/upload/local`, {
        method: "POST",
        headers: authHeader(token),
        body: form,
    });

    return parseJson(res);
}

/* =======================
 * UPLOAD — LOCAL FILE (MANY)
 * ======================= */
/**
 * Upload nhiều file local
 * BE: POST /api/materials/upload/local-many
 *
 * titles: optional array theo thứ tự files
 */
export async function uploadManyLocalMaterialsApi(
    token,
    { folderId, files = [], titles = [], visibility, allowTeacherIds }
) {
    const form = new FormData();

    if (folderId) form.append("folderId", folderId);
    if (visibility) form.append("visibility", visibility);

    if (Array.isArray(allowTeacherIds)) {
        allowTeacherIds.forEach((id) =>
            form.append("allowTeacherIds[]", id)
        );
    }

    form.append("titles", JSON.stringify(titles || []));
    files.forEach((f) => form.append("files", f));

    const res = await fetch(
        `${API_BASE}/api/materials/upload/local-many`,
        {
            method: "POST",
            headers: authHeader(token),
            body: form,
        }
    );

    return parseJson(res);
}

/* =======================
 * UPDATE / DELETE
 * ======================= */
export async function patchMaterialApi(token, id, payload) {
    const res = await fetch(`${API_BASE}/api/materials/${id}`, {
        method: "PATCH",
        headers: {
            ...authHeader(token),
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    return parseJson(res);
}

export async function patchMaterialPermissionsApi(token, id, payload) {
    const res = await fetch(
        `${API_BASE}/api/materials/${id}/permissions`,
        {
            method: "PATCH",
            headers: {
                ...authHeader(token),
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        }
    );
    return parseJson(res);
}

export async function deleteMaterialApi(token, id) {
    const res = await fetch(`${API_BASE}/api/materials/${id}`, {
        method: "DELETE",
        headers: authHeader(token),
    });
    return parseJson(res);
}

/* =======================
 * DOWNLOAD / STREAM
 * ======================= */
export async function openMaterialFile(token, id) {
    const res = await fetch(
        `${API_BASE}/api/materials/${id}/file`,
        { headers: authHeader(token) }
    );

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || `HTTP ${res.status}`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Stream audio (mp3, m4a...)
 * dùng cho <audio src=...>
 */
export async function getAudioBlobUrl(token, id) {
    const res = await fetch(
        `${API_BASE}/api/materials/${id}/audio`,
        { headers: authHeader(token) }
    );

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || `HTTP ${res.status}`);
    }

    const blob = await res.blob();
    return URL.createObjectURL(blob);
}