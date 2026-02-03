import { request } from "./http";

/* =======================
 * LIST / READ
 * ======================= */
export function listMaterialsApi(token, params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/materials${qs ? `?${qs}` : ""}`, { token });
}

export function getMaterialEmbedApi(token, id) {
    return request(`/api/materials/${id}/embed`, { token });
}

export function getMaterialThumbnailApi(token, mat_id, thumb_id, index) {
    return request(`/api/materials/${mat_id}/thumbnail/${thumb_id}/${index}`, { token });
}

/* =======================
 * CREATE — GOOGLE LINK
 * ======================= */
export function createMaterialFromGoogleLinkApi(
    token,
    { title, sourceUrl, folderId }
) {
    return request("/api/materials/upload/google", {
        method: "POST",
        token,
        body: { title, sourceUrl, folderId },
    });
}

/* =======================
 * UPLOAD — LOCAL FILE (1)
 * ======================= */
export function uploadLocalMaterialApi(
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

    return request("/api/materials/upload/local", {
        method: "POST",
        token,
        body: form,
    });
}

/* =======================
 * UPLOAD — LOCAL FILE (MANY)
 * ======================= */
export function uploadManyLocalMaterialsApi(
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

    return request("/api/materials/upload/local-many", {
        method: "POST",
        token,
        body: form,
    });
}

/* =======================
 * UPDATE / DELETE
 * ======================= */
export function patchMaterialApi(token, id, payload) {
    return request(`/api/materials/${id}`, {
        method: "PATCH",
        token,
        body: payload,
    });
}

export function patchMaterialPermissionsApi(token, id, payload) {
    return request(`/api/materials/${id}/permissions`, {
        method: "PATCH",
        token,
        body: payload,
    });
}

export function deleteMaterialApi(token, id) {
    return request(`/api/materials/${id}`, {
        method: "DELETE",
        token,
    });
}

/* =======================
 * DOWNLOAD / STREAM
 * ======================= */
export async function openMaterialFile(token, id) {
    const blob = await request(`/api/materials/${id}/file`, {
        token,
        headers: {}, // để browser tự xử lý blob
    });

    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
}

export async function getAudioBlobUrl(token, id) {
    const blob = await request(`/api/materials/${id}/audio`, {
        token,
        headers: {},
    });
    return URL.createObjectURL(blob);
}
