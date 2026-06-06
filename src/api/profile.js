import axios from 'axios';
import { BACKEND_URL } from '../config';

export async function fetchProfile() {
  const res = await axios.get(`${BACKEND_URL}/api/profile/me`);
  return res.data;
}

export async function updateProfile(data) {
  const res = await axios.patch(`${BACKEND_URL}/api/profile`, data);
  return res.data;
}


export async function uploadAvatar(file, onProgress) {
  const form = new FormData();
  form.append('photo', file);
  const res = await axios.post(`${BACKEND_URL}/api/profile/avatar`, form, {
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

export async function removeAvatar() {
  const res = await axios.delete(`${BACKEND_URL}/api/profile/avatar`);
  return res.data;
}

export const AVATAR_COLORS = [
  '#25d366', '#6366f1', '#ec4899', '#14b8a6', '#f59e0b',
  '#10b981', '#3b82f6', '#8b5cf6', '#ef4444',
];

export const CHAT_WALLPAPERS = ['default', 'dark', 'teal', 'midnight', 'warm', 'custom'];

export async function uploadWallpaper(file, onProgress) {
  const form = new FormData();
  form.append('photo', file);
  const res = await axios.post(`${BACKEND_URL}/api/profile/wallpaper`, form, {
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
