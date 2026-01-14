import { request } from "./http";

export function listCoursesApi(token) {
    return request("/api/courses", { method: "GET", token });
}

export function createCourseApi(token, payload) {
    return request("/api/courses", { method: "POST", token, body: payload });
}

export function updateCourseApi(token, id, payload) {
    return request(`/api/courses/${id}`, {
        method: "PATCH",
        token,
        body: payload,
    });
}

export function deleteCourseApi(token, id) {
    return request(`/api/courses/${id}`, {
        method: "DELETE",
        token,
    });
}