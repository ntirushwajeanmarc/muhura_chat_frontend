// Use the canonical www host — bare rwandablogs.blog redirects and breaks CORS preflight.
export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || BACKEND_URL;
