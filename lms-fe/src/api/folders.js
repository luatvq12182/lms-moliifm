// src/api/folders.js
import { request } from "./http";

export function listFoldersApi(token, params = {}) {
    const { parentId, q } = params;

    const sp = new URLSearchParams();
    // root: parentId = "" (hoặc undefined) => server hiểu parentId null
    if (parentId !== undefined) sp.set("parentId", parentId || "");
    if (q) sp.set("q", q);

    const qs = sp.toString();
    return request(`/api/folders${qs ? `?${qs}` : ""}`, { method: "GET", token });
}

export function getFolderPathApi(token, id) {
    return request(`/api/folders/${id}/path`, { method: "GET", token });
}

export function createFolderApi(token, payload) {
    return request("/api/folders", { method: "POST", token, body: payload });
}

export function updateFolderApi(token, id, payload) {
    return request(`/api/folders/${id}`, {
        method: "PATCH",
        token,
        body: payload,
    });
}

export function deleteFolderApi(token, id) {
    return request(`/api/folders/${id}`, {
        method: "DELETE",
        token,
    });
}