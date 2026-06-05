import axios from 'axios';
import { secureFileUrl } from './assetUrl';

async function blobErrorMessage(blob) {
  try {
    const text = await blob.text();
    const parsed = JSON.parse(text);
    return parsed.error || 'File unavailable';
  } catch {
    return 'File unavailable';
  }
}

/** Fetch a protected file as a Blob (throws on auth/404 errors). */
export async function fetchAuthenticatedBlob(storedPath, { download = false } = {}) {
  if (!storedPath) throw new Error('Missing file path');

  try {
    const res = await axios.get(secureFileUrl(storedPath, { download }), {
      responseType: 'blob',
    });

    const type = res.data?.type || res.headers['content-type'] || '';
    if (type.includes('application/json')) {
      throw new Error(await blobErrorMessage(res.data));
    }

    return res.data;
  } catch (err) {
    if (err.response?.data instanceof Blob) {
      throw new Error(await blobErrorMessage(err.response.data));
    }
    throw err;
  }
}

/** Trigger a browser download for an authenticated file. */
export async function downloadAuthenticatedFile(storedPath, filename) {
  const blob = await fetchAuthenticatedBlob(storedPath, { download: true });
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
