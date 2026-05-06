import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';

const LoginScreen = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!phone || phone.length < 9) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại hợp lệ');
      return;
    }
    if (!password) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/login', { phone, password });
      if (res.data.success) {
        login(res.data.token, res.data.user);
      }
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>SportBook</Text>
          <Text style={styles.subtitle}>Đặt sân thể thao dễ dàng</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập số điện thoại"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            maxLength={11}
          />

          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập mật khẩu"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Đăng nhập</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.forgotBtn}
            onPress={() => navigation.navigate('PhoneInput')}
          >
            <Text style={styles.forgotText}>Chưa có tài khoản / Quên mật khẩu?</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { alignItems: 'center', marginTop: 60, marginBottom: 40 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#10B981' },
  subtitle: { fontSize: 16, color: '#6B7280', marginTop: 5 },
  form: { paddingHorizontal: 20 },
  label: { fontSize: 16, fontWeight: '500', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 15, fontSize: 16, marginBottom: 20 },
  button: { backgroundColor: '#10B981', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#A7F3D0' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  forgotBtn: { marginTop: 20, alignItems: 'center' },
  forgotText: { color: '#10B981', fontSize: 14, fontWeight: 'bold' }
});

export default LoginScreen;
