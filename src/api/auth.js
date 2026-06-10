import axios from 'axios';
import { BACKEND_URL } from '../config';

export async function requestPasswordReset(email) {
  const res = await axios.post(
    `${BACKEND_URL}/api/auth/forgot-password`,
    { email: String(email || '').trim().toLowerCase() },
    { timeout: 20_000 }
  );
  return res.data;
}

export async function verifyResetToken(token) {
  const res = await axios.get(`${BACKEND_URL}/api/auth/reset-password/verify`, {
    params: { token },
  });
  return res.data;
}

export async function resetPassword(token, password) {
  const res = await axios.post(`${BACKEND_URL}/api/auth/reset-password`, { token, password });
  return res.data;
}
