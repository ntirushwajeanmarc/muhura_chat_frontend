import axios from 'axios';
import { BACKEND_URL } from '../config';

export async function fetchRoomMessages(roomId, { before, limit = 50 } = {}) {
  const params = { limit };
  if (before) params.before = before;
  const res = await axios.get(`${BACKEND_URL}/api/rooms/${roomId}/messages`, { params });
  return res.data;
}

export async function searchRoomMessages(roomId, query, { limit = 30 } = {}) {
  const res = await axios.get(`${BACKEND_URL}/api/rooms/${roomId}/messages/search`, {
    params: { q: query, limit },
  });
  return res.data;
}

export async function fetchMessageContext(roomId, messageId) {
  const res = await axios.get(`${BACKEND_URL}/api/rooms/${roomId}/messages/context/${messageId}`);
  return res.data;
}
