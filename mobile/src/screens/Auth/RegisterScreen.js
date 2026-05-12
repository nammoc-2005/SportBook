import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Keyboard, TouchableWithoutFeedback, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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
    if (!name || name.trim().length < 2) return Alert.alert('Lỗi', 'Vui lòng nhập tên');
    if (!password || password.length < 6) return Alert.alert('Lỗi', 'Mật khẩu từ 6 ký tự');

    setLoading(true);
    try {
      const res = await api.post('/auth/register', { 
        tempToken, name: name.trim(), email: email.trim(), password, role: 'user' 
      });
      if (res.data.success) login(res.data.token, res.data.user);
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.headerGradient}>
          <SafeAreaView>
            <View style={styles.header}>
               <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                  <Ionicons name="chevron-back" size={28} color="#FFF" />
               </TouchableOpacity>
               <Text style={styles.title}>Hoàn tất hồ sơ</Text>
               <Text style={styles.subtitle}>Số điện thoại: {phone}</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.form}>
          <View style={styles.inputBox}>
            <Text style={styles.label}>Họ và tên *</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: Nguyễn Văn A"
              placeholderTextColor="#64748B"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputBox}>
            <Text style={styles.label}>Email (Tùy chọn)</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: example@email.com"
              placeholderTextColor="#64748B"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputBox}>
            <Text style={styles.label}>Mật khẩu *</Text>
            <TextInput
              style={styles.input}
              placeholder="Tối thiểu 6 ký tự"
              placeholderTextColor="#64748B"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity style={styles.regBtn} onPress={handleRegister} disabled={loading}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.btnInner}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Hoàn tất đăng ký</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  headerGradient: { borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingBottom: 30 },
  header: { paddingHorizontal: 25, paddingTop: 10 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginBottom: 10 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#FFF' },
  subtitle: { fontSize: 14, color: '#94A3B8', marginTop: 5 },
  form: { padding: 30 },
  inputBox: { marginBottom: 20 },
  label: { color: '#94A3B8', fontSize: 13, marginBottom: 8, fontWeight: '600' },
  input: { backgroundColor: '#1E293B', height: 55, borderRadius: 15, paddingHorizontal: 20, color: '#FFF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  regBtn: { marginTop: 10, borderRadius: 15, overflow: 'hidden' },
  btnInner: { height: 55, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});

export default RegisterScreen;
