import { request } from "./http";

const API_BASE = import.meta.env.VITE_API_BASE || "";

async function parseJson(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return data;
}

export async function uploadMyAvatarApi(token, file) {
    const fd = new FormData();
    fd.append("avatar", file);

    const res = await fetch(`${API_BASE}/api/users/me/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
    });
    return parseJson(res);
}

export async function adminUploadUserAvatarApi(token, userId, file) {
    const fd = new FormData();
    fd.append("avatar", file);

    const res = await fetch(`${API_BASE}/api/users/${userId}/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
    });
    return parseJson(res);
}

export function getMeApi(token) {
    return request("/api/users/me", { method: "GET", token });
}

export function updateMeApi(token, payload) {
    return request("/api/users/me", { method: "PATCH", token, body: payload });
}

// admin
export function adminListUsersApi(token) {
    return request("/api/users", { method: "GET", token });
}

export function adminCreateUserApi(token, payload) {
    return request("/api/users", { method: "POST", token, body: payload });
}

export function adminUpdateUserApi(token, id, payload) {
    return request(`/api/users/${id}`, { method: "PATCH", token, body: payload });
}