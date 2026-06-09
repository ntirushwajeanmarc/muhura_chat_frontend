import axios from 'axios';
import { BACKEND_URL } from '../config';

export async function searchGifs(query, { limit = 20 } = {}) {
  const res = await axios.get(`${BACKEND_URL}/api/gifs/search`, {
    params: { q: query || undefined, limit },
  });
  return res.data.gifs || [];
}

export async function sendGif(roomId, gifUrl, { title, replyToId } = {}) {
  const res = await axios.post(`${BACKEND_URL}/api/gifs/send`, {
    roomId,
    gifUrl,
    title,
    replyToId,
  });
  return res.data.message;
}
