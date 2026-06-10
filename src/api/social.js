import axios from 'axios';
import { BACKEND_URL } from '../config';

export async function fetchStarsFeed() {
  const res = await axios.get(`${BACKEND_URL}/api/social/stars/feed`);
  return res.data;
}

export async function fetchUserStars(userId) {
  const res = await axios.get(`${BACKEND_URL}/api/social/stars/user/${userId}`);
  return res.data;
}

export async function postStar({ content, image, backgroundColor }, onProgress) {
  const form = new FormData();
  if (content) form.append('content', content);
  if (image) form.append('image', image);
  if (backgroundColor) form.append('background_color', backgroundColor);
  const res = await axios.post(`${BACKEND_URL}/api/social/stars`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (!onProgress) return;
      const total = event.total || image?.size || 0;
      const percent = total > 0
        ? Math.round((event.loaded * 100) / total)
        : 50;
      onProgress(Math.min(percent, 99));
    },
  });
  return res.data;
}

export async function deleteStar(starId) {
  const res = await axios.delete(`${BACKEND_URL}/api/social/stars/${starId}`);
  return res.data;
}

export async function toggleFollow(userId) {
  const res = await axios.post(`${BACKEND_URL}/api/social/follow/${userId}`);
  return res.data;
}

export async function fetchFollowers(userId) {
  const res = await axios.get(`${BACKEND_URL}/api/social/followers/${userId}`);
  return res.data.users || [];
}

export async function fetchFollowing(userId) {
  const res = await axios.get(`${BACKEND_URL}/api/social/following/${userId}`);
  return res.data.users || [];
}
