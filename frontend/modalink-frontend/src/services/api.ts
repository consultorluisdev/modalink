import axios from "axios";

const devApiHost = ["localhost", "::1"].includes(window.location.hostname)
  ? "127.0.0.1"
  : window.location.hostname;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${String(import.meta.env.VITE_API_URL).replace(/\/$/, "")}/api`
    : import.meta.env.DEV
      ? `http://${devApiHost}:5020/api`
      : "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
