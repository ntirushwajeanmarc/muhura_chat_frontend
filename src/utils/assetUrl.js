import { BACKEND_URL } from '../config';

/** Authenticated file fetch URL (path stored in DB, e.g. /uploads/abc.jpg) */
export function secureFileUrl(storedPath) {
  if (!storedPath) return '';
  return `${BACKEND_URL}/api/files?path=${encodeURIComponent(storedPath)}`;
}
