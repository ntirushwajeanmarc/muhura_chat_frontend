const PRODUCTION_API = 'https://www.rwandablogs.blog';

/** Bare rwandablogs.blog 307-redirects; browsers block that on CORS preflight. */
function normalizeApiUrl(url) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'rwandablogs.blog') {
      parsed.hostname = 'www.rwandablogs.blog';
    }
    return parsed.origin;
  } catch {
    return url;
  }
}

const rawBackend =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.PROD ? PRODUCTION_API : 'http://localhost:4000');

const rawSocket =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.PROD ? PRODUCTION_API : rawBackend);

export const BACKEND_URL = normalizeApiUrl(rawBackend);
export const SOCKET_URL = normalizeApiUrl(rawSocket);
