import { request } from "./http";

export function listClassesApi(token) {
    return request("/api/classes", { method: "GET", token });
}

export function createClassApi(token, payload) {
    return request("/api/classes", { method: "POST", token, body: payload });
}

export function updateClassApi(token, id, payload) {
    return request(`/api/classes/${id}`, {
        method: "PATCH",
        token,
        body: payload,
    });
}

export function deleteClassApi(token, id) {
    return request(`/api/classes/${id}`, {
        method: "DELETE",
        token,
    });
}