import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Tự động phát hiện địa chỉ IP máy tính đang chạy Expo (Không bao giờ cần sửa tay khi đổi mạng Wi-Fi!)
const getDevApiUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0]; // Cắt bỏ phần cổng :8081 để lấy IP máy tính
    return `http://${ip}:5000/api`;
  }
  return 'http://172.20.10.2:5000/api'; // IP dự phòng
};

const API_BASE_URL = getDevApiUrl();
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
