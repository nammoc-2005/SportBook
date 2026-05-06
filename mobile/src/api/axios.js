import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sử dụng IP mạng LAN thay vì localhost vì localhost của điện thoại khác với máy tính
const API_URL = 'http://192.168.1.107:5000/api'; 

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
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

export default api;
