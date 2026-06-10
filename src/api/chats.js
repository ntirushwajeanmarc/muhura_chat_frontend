import axios from 'axios';
import { BACKEND_URL } from '../config';

export async function fetchChats() {
  const res = await axios.get(`${BACKEND_URL}/api/chats`);
  return res.data;
}

export async function fetchUnreadCounts() {
  const res = await axios.get(`${BACKEND_URL}/api/chats/unread-counts`);
  return res.data.counts || {};
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

export async function fetchGroupMembers(roomId) {
  const res = await axios.get(`${BACKEND_URL}/api/chats/groups/${roomId}/members`);
  return res.data;
}

export async function addGroupMembers(roomId, memberIds) {
  const res = await axios.post(`${BACKEND_URL}/api/chats/groups/${roomId}/members`, { memberIds });
  return res.data;
}

export async function uploadGroupAvatar(roomId, file, onProgress) {
  const form = new FormData();
  form.append('photo', file);
  const res = await axios.post(`${BACKEND_URL}/api/chats/groups/${roomId}/avatar`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (!onProgress) return;
      const total = event.total || file.size || 0;
      const percent = total > 0
        ? Math.round((event.loaded * 100) / total)
        : Math.min(95, Math.round(event.loaded / 5000));
      onProgress(Math.min(percent, 99));
    },
  });
  return res.data;
}

export async function searchChannels(query) {
  const res = await axios.get(`${BACKEND_URL}/api/rooms/search`, { params: { q: query } });
  return res.data;
}

export async function joinChannel(roomId) {
  const res = await axios.post(`${BACKEND_URL}/api/rooms/${roomId}/join`);
  return res.data;
}

export async function createChannel({ name, description }) {
  const res = await axios.post(`${BACKEND_URL}/api/rooms`, { name, description });
  return res.data;
}

export async function discoverChannels() {
  const res = await axios.get(`${BACKEND_URL}/api/rooms/discover`);
  return res.data;
}
