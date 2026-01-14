import { request } from "./http";

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