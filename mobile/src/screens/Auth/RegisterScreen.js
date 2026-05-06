import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';

const RegisterScreen = ({ route, navigation }) => {
  const { phone, tempToken } = route.params;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const handleRegister = async () => {
    Keyboard.dismiss();
    if (!name || name.trim().length < 2) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên của bạn');
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register', { 
        tempToken, 
        name: name.trim(), 
        email: email.trim(),
        password,
        role: 'user' // Default to user, owners can be managed from admin panel
      });
      
      if (res.data.success) {
        login(res.data.token, res.data.user);
      }
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Hoàn tất đăng ký</Text>
          <Text style={styles.subtitle}>Cập nhật thông tin cho số {phone}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Họ và tên *</Text>
          <TextInput
            style={styles.input}
            placeholder="VD: Nguyễn Văn A"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Email (Tùy chọn)</Text>
          <TextInput
            style={styles.input}
            placeholder="VD: email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Mật khẩu *</Text>
          <TextInput
            style={styles.input}
            placeholder="Tạo mật khẩu cho tài khoản"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Đăng ký ngay</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { alignItems: 'center', marginTop: 40, marginBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1F2937' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 5 },
  form: { paddingHorizontal: 20 },
  label: { fontSize: 16, fontWeight: '500', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 15, fontSize: 16, marginBottom: 20 },
  button: { backgroundColor: '#10B981', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonDisabled: { backgroundColor: '#A7F3D0' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});

export default RegisterScreen;
