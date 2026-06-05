import axios from 'axios';
import { BACKEND_URL } from '../config';

export async function uploadFile(roomId, file, { content = '', replyToId = null } = {}) {
  const form = new FormData();
  form.append('file', file);
  if (content) form.append('content', content);
  if (replyToId) form.append('replyToId', replyToId);

  const res = await axios.post(`${BACKEND_URL}/api/rooms/${roomId}/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.message;
}
