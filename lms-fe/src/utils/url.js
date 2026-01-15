export function absUrl(pathOrUrl) {
    if (!pathOrUrl) return "";
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl; // đã là absolute

    const base =
        (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "") ||
        window.location.origin;

    if (pathOrUrl.startsWith("/")) return `${base}${pathOrUrl}`;
    return `${base}/${pathOrUrl}`;
}