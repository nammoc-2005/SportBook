import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api/axios';

const PhoneInputScreen = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    Keyboard.dismiss();
    if (!phone || phone.length < 9) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại hợp lệ');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/send-otp', { phone });
      if (res.data.success) {
        navigation.navigate('OTP', { phone });
      }
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể gửi OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Quay lại</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Quên mật khẩu / Đăng ký</Text>
          <Text style={styles.subtitle}>Nhập số điện thoại để nhận mã OTP</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập số điện thoại của bạn"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            maxLength={11}
          />
          <Text style={styles.hint}>* Để test, nhập số điện thoại chưa từng đăng ký hoặc đã có tài khoản (VD: 0911111111)</Text>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleSendOTP}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Tiếp tục</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  backButton: { padding: 20 },
  backText: { fontSize: 16, color: '#10B981', fontWeight: '500' },
  header: { alignItems: 'center', marginTop: 20, marginBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 5 },
  form: { paddingHorizontal: 20 },
  label: { fontSize: 16, fontWeight: '500', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 15, fontSize: 16, marginBottom: 10 },
  hint: { fontSize: 12, color: '#6B7280', marginBottom: 20 },
  button: { backgroundColor: '#10B981', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#A7F3D0' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});

export default PhoneInputScreen;
