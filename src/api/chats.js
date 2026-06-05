import axios from 'axios';
import { BACKEND_URL } from '../config';

export async function fetchChats() {
  const res = await axios.get(`${BACKEND_URL}/api/chats`);
  return res.data;
}

export async function searchUsers(query) {
  const res = await axios.get(`${BACKEND_URL}/api/users/search`, { params: { q: query } });
  return res.data;
}

export async function startDirectChat(userId) {
  const res = await axios.post(`${BACKEND_URL}/api/chats/direct`, { userId });
  return res.data;
}

export async function createGroupChat(name, memberIds) {
  const res = await axios.post(`${BACKEND_URL}/api/chats/groups`, { name, memberIds });
  return res.data;
}
