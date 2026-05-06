import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';

const OTPScreen = ({ route, navigation }) => {
  const { phone } = route.params;
  const [otp, setOtp] = useState('123456'); // Default demo OTP
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const handleVerifyOTP = async () => {
    Keyboard.dismiss();
    if (!otp || otp.length < 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã OTP 6 số');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { phone, otp });
      if (res.data.success) {
        if (res.data.isNewUser) {
          // Navigate to registration
          navigation.navigate('Register', { phone, tempToken: res.data.tempToken });
        } else {
          // Navigate to reset password
          navigation.navigate('ResetPassword', { tempToken: res.data.tempToken });
        }
      }
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Xác thực OTP thất bại');
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
          <Text style={styles.title}>Xác thực OTP</Text>
          <Text style={styles.subtitle}>Mã OTP đã được gửi đến số {phone}</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Nhập mã OTP (123456)"
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
            maxLength={6}
            textAlign="center"
          />

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleVerifyOTP}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Xác nhận</Text>
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
  title: { fontSize: 28, fontWeight: 'bold', color: '#1F2937' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 5 },
  form: { paddingHorizontal: 20 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 15, fontSize: 24, letterSpacing: 5, marginBottom: 20, fontWeight: 'bold', color: '#1F2937' },
  button: { backgroundColor: '#10B981', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#A7F3D0' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});

export default OTPScreen;
