import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

/**
 * Tự động lấy IP máy dev từ Metro bundler (Expo Go).
 * Ghi đè bằng app.json → expo.extra.apiUrl nếu cần.
 */
function resolveApiBaseUrl() {
  const extra = Constants.expoConfig?.extra ?? {};
  if (extra.apiUrl) return extra.apiUrl.replace(/\/$/, '');

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost') {
      return `http://${host}:5000/api`;
    }
  }

  // Android emulator
  if (Constants.platform?.android) {
    return 'http://10.0.2.2:5000/api';
  }

  return 'http://localhost:5000/api';
}

export const API_BASE_URL = resolveApiBaseUrl();
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.userMessage =
        'Không kết nối được server. Kiểm tra backend đang chạy (port 5000) và cùng mạng Wi‑Fi với điện thoại.';
    }
    return Promise.reject(error);
  }
);

export default api;
