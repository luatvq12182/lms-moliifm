import { request } from "./http";

export function getDashboardSummaryApi(token) {
    return request("/api/dashboard/summary", { token });
}
