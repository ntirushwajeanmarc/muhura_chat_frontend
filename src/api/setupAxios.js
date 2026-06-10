import axios from 'axios';

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

let interceptorInstalled = false;

export function setupAxiosInterceptors() {
  if (interceptorInstalled) return;
  interceptorInstalled = true;

  const publicAuthPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
  ];

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const url = error.config?.url || '';
      const isPublicAuth = publicAuthPaths.some((path) => url.includes(path));
      if (error.response?.status === 401 && unauthorizedHandler && !isPublicAuth) {
        unauthorizedHandler();
      }
      return Promise.reject(error);
    }
  );
}
