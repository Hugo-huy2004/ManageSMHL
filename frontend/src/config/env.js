const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

const normalizeApiBaseUrl = (value) => {
    const fallback = '/api';
    if (!value || typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    return trimmed === '/' ? '' : trimTrailingSlash(trimmed);
};

const normalizeWsUrl = (value) => {
    if (!value || typeof value !== 'string') return '';
    return trimTrailingSlash(value.trim());
};

const deriveSameOriginWsUrl = () => {
    if (typeof window === 'undefined') return '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
};

export const env = {
    apiBaseUrl: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
    wsUrl: normalizeWsUrl(import.meta.env.VITE_WS_URL) || deriveSameOriginWsUrl()
};
