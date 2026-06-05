import { BACKEND_URL } from '../config';

/** Authenticated file fetch URL (path stored in DB, e.g. /uploads/abc.jpg) */
export function secureFileUrl(storedPath, { download = false } = {}) {
  if (!storedPath) return '';
  const base = `${BACKEND_URL}/api/files?path=${encodeURIComponent(storedPath)}`;
  return download ? `${base}&download=1` : base;
}
