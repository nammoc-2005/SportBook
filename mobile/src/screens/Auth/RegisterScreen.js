import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Keyboard, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';

const RegisterScreen = ({ navigation, route }) => {
  const fromOtp = route.params?.fromOtp;
  const tempToken = route.params?.tempToken;
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(route.params?.phone || '');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const handleRegister = async () => {
    Keyboard.dismiss();
    if (!name) return Alert.alert('Lỗi', 'Vui lòng nhập họ tên');
    if (fromOtp && !tempToken) return Alert.alert('Lỗi', 'Phiên OTP hết hạn. Vui lòng thử lại.');
    if (!fromOtp && (!username || !password || !phone)) {
      return Alert.alert('Lỗi', 'Vui lòng nhập username, mật khẩu và số điện thoại');
    }

    setLoading(true);
    try {
      if (fromOtp) {
        const res = await api.post('/auth/register-phone', {
          tempToken,
          name,
          password: password || undefined,
          email: email || undefined,
        });
        if (res.data.success) login(res.data.token, res.data.user);
        return;
      }

      // Đăng ký chuẩn: gửi OTP SĐT trước (giống Alobo)
      const normalizedPhone = phone.trim().replace(/\s/g, '');
      const res = await api.post('/auth/send-otp', { phone: normalizedPhone });
      if (res.data.success) {
        const demoHint = res.data.demoOtp
          ? `\n\n(Mã demo: ${res.data.demoOtp})`
          : '\n\n(Demo: dùng mã 123456)';
        Alert.alert('Đã gửi OTP', `Kiểm tra SMS hoặc log server backend.${demoHint}`, [
          {
            text: 'Nhập mã',
            onPress: () =>
              navigation.navigate('OTP', {
                phone: normalizedPhone,
                purpose: 'register',
                registerData: { username, name, password, email: email || undefined },
              }),
          },
        ]);
      }
    } catch (error) {
      Alert.alert('Lỗi đăng ký', error.response?.data?.message || error.userMessage || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Tạo tài khoản</Text>
            <Text style={styles.subtitle}>
              {fromOtp ? `Hoàn tất đăng ký cho ${phone}` : 'Điền thông tin để tham gia SportBook'}
            </Text>
          </View>

          <View style={styles.form}>
            {!fromOtp && (
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Tài khoản (Username)"
                  placeholderTextColor="#64748B"
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="text-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Họ và tên"
                placeholderTextColor="#64748B"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {!fromOtp && (
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
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={fromOtp ? 'Mật khẩu (tùy chọn)' : 'Mật khẩu'}
                placeholderTextColor="#64748B"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={loading}>
              <LinearGradient colors={['#10B981', '#059669']} style={styles.registerBtnInner}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.registerBtnText}>Đăng ký</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scrollContent: { padding: 24, paddingBottom: 50 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  header: { marginBottom: 30 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#94A3B8' },
  form: { gap: 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 16, height: 56 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: '#F8FAFC', fontSize: 16 },
  registerBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 10, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  registerBtnInner: { height: 56, justifyContent: 'center', alignItems: 'center' },
  registerBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});

export default RegisterScreen;
