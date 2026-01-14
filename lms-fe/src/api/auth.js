import { request } from "./http";

export function loginApi({ email, password }) {
    return request("/api/auth/login", {
        method: "POST",
        body: { email, password },
    });
}

export function getMeApi(token) {
    return request("/api/users/me", {
        method: "GET",
        token,
    });
}