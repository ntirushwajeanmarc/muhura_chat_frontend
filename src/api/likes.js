import axios from 'axios';
import { BACKEND_URL } from '../config';

export async function fetchUserProfile(userId) {
  const res = await axios.get(`${BACKEND_URL}/api/profile/user/${userId}`);
  return res.data;
}

export async function toggleProfileLike(userId) {
  const res = await axios.post(`${BACKEND_URL}/api/profile/user/${userId}/like`);
  return res.data;
}

export async function toggleMessageLike(messageId) {
  const res = await axios.post(`${BACKEND_URL}/api/messages/${messageId}/like`);
  return res.data;
}
