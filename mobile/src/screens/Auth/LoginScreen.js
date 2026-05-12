import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Keyboard, TouchableWithoutFeedback, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';

const LoginScreen = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!phone || phone.length < 9) return Alert.alert('Lỗi', 'Số điện thoại không hợp lệ');
    if (!password) return Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu');

    setLoading(true);
    try {
      const res = await api.post('/auth/login', { phone, password });
      if (res.data.success) login(res.data.token, res.data.user);
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.topGradient}>
          <SafeAreaView>
            <View style={styles.header}>
              <View style={styles.logoBox}>
                <Ionicons name="football" size={40} color="#FFF" />
              </View>
              <Text style={styles.title}>SportBook</Text>
              <Text style={styles.subtitle}>Đột phá trải nghiệm đặt sân</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="phone-portrait-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Số điện thoại"
              placeholderTextColor="#64748B"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Mật khẩu"
              placeholderTextColor="#64748B"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.loginBtnInner}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.loginBtnText}>Đăng nhập</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('PhoneInput')}>
            <Text style={styles.secondaryBtnText}>Chưa có tài khoản? <Text style={{ color: '#10B981' }}>Đăng ký ngay</Text></Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  topGradient: { height: '40%', borderBottomLeftRadius: 60, borderBottomRightRadius: 60, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center' },
  logoBox: { width: 80, height: 80, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '900', color: '#FFF' },
  subtitle: { fontSize: 14, color: '#94A3B8', marginTop: 8 },
  form: { paddingHorizontal: 30, marginTop: -40 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 18, marginBottom: 15, paddingHorizontal: 20, height: 60, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: '#FFF', fontSize: 15 },
  loginBtn: { marginTop: 20, borderRadius: 18, overflow: 'hidden', shadowColor: '#10B981', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 },
  loginBtnInner: { height: 60, justifyContent: 'center', alignItems: 'center' },
  loginBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  secondaryBtn: { marginTop: 25, alignItems: 'center' },
  secondaryBtnText: { color: '#94A3B8', fontSize: 14 }
});

export default LoginScreen;
