import axios from 'axios';
import { BACKEND_URL } from '../config';

export async function uploadFile(roomId, file, { content = '', replyToId = null, onProgress } = {}) {
  const form = new FormData();
  form.append('file', file);
  if (content) form.append('content', content);
  if (replyToId) form.append('replyToId', replyToId);

  const res = await axios.post(`${BACKEND_URL}/api/rooms/${roomId}/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (!onProgress) return;
      const total = event.total || file.size || 0;
      const percent = total > 0
        ? Math.round((event.loaded * 100) / total)
        : Math.min(95, Math.round(event.loaded / 10000));
      onProgress(Math.min(percent, 99));
    },
  });
  return res.data.message;
}
