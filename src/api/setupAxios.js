import axios from 'axios';

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

let interceptorInstalled = false;

export function setupAxiosInterceptors() {
  if (interceptorInstalled) return;
  interceptorInstalled = true;

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 && unauthorizedHandler) {
        unauthorizedHandler();
      }
      return Promise.reject(error);
    }
  );
}
