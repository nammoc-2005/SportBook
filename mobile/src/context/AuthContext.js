import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  const login = async (token, user) => {
    setIsLoading(true);
    setUserToken(token);
    setUserInfo(user);
    await AsyncStorage.setItem('userToken', token);
    await AsyncStorage.setItem('userInfo', JSON.stringify(user));
    setIsLoading(false);
  };

  const logout = async () => {
    setIsLoading(true);
    setUserToken(null);
    setUserInfo(null);
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userInfo');
    setIsLoading(false);
  };

  const checkLoggedIn = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const user = await AsyncStorage.getItem('userInfo');
      if (token && user) {
        setUserToken(token);
        setUserInfo(JSON.parse(user));
        // Verify token with backend
        try {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUserInfo(res.data.user);
            await AsyncStorage.setItem('userInfo', JSON.stringify(res.data.user));
          }
        } catch (e) {
          if (e.response?.status === 401) {
            await logout();
          }
        }
      }
    } catch (e) {
      console.log('Check auth error', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkLoggedIn();
  }, []);

  const updateUser = async (user) => {
    setUserInfo(user);
    await AsyncStorage.setItem('userInfo', JSON.stringify(user));
  };

  return (
    <AuthContext.Provider value={{ login, logout, updateUser, isLoading, userToken, userInfo }}>
      {children}
    </AuthContext.Provider>
  );
};
