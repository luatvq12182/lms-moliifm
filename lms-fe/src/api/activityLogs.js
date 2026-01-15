import { request } from "./http";

export function listActivityLogsApi(token, params = {}) {
    const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();

    return request(`/api/activity-logs${qs ? `?${qs}` : ""}`, {
        method: "GET",
        token,
    });
}