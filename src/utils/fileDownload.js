import axios from 'axios';
import { secureFileUrl } from './assetUrl';
import { imageMimeFromPath, isImagePath } from './imageAttachment';

const imageBlobCache = new Map();

export function clearImageCache(storedPath) {
  if (storedPath) imageBlobCache.delete(storedPath);
}

export function getAuthHeaders() {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function blobErrorMessage(blob) {
  try {
    const text = await blob.text();
    const parsed = JSON.parse(text);
    return parsed.error || 'File unavailable';
  } catch {
    return 'File unavailable';
  }
}

function normalizeImageBlob(blob, storedPath) {
  if (!isImagePath(storedPath)) return blob;
  const expectedType = imageMimeFromPath(storedPath);
  if (!blob.type || blob.type === 'application/octet-stream' || !blob.type.startsWith('image/')) {
    return new Blob([blob], { type: expectedType });
  }
  return blob;
}

/** Fetch a protected file as a Blob (throws on auth/404 errors). */
export async function fetchAuthenticatedBlob(storedPath, { download = false, skipCache = false } = {}) {
  if (!storedPath) throw new Error('Missing file path');

  const isCacheableImage = !download && (
    isImagePath(storedPath)
    || storedPath.startsWith('/avatars/user/')
    || storedPath.startsWith('/avatars/group/')
  );

  if (!skipCache && isCacheableImage && imageBlobCache.has(storedPath)) {
    return imageBlobCache.get(storedPath);
  }

  try {
    const res = await axios.get(secureFileUrl(storedPath, { download }), {
      responseType: 'blob',
      headers: getAuthHeaders(),
    });

    const type = res.data?.type || res.headers['content-type'] || '';
    if (type.includes('application/json') || type.includes('text/html')) {
      throw new Error(await blobErrorMessage(res.data));
    }

    let blob = res.data;
    if (isCacheableImage) {
      blob = normalizeImageBlob(blob, storedPath);
      imageBlobCache.set(storedPath, blob);
    }

    return blob;
  } catch (err) {
    if (err.response?.data instanceof Blob) {
      throw new Error(await blobErrorMessage(err.response.data));
    }
    throw err;
  }
}

/** Trigger a browser download for an authenticated file. */
export async function downloadAuthenticatedFile(storedPath, filename) {
  const blob = await fetchAuthenticatedBlob(storedPath, { download: true, skipCache: true });
  const safeName = filename || 'download';
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 2000);

  return safeName;
}
