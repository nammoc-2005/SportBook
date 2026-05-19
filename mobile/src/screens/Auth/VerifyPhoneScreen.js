import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';

const VerifyPhoneScreen = ({ navigation }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const { userInfo, checkLoggedIn } = useContext(AuthContext);
  const inputRefs = useRef([]);

  useEffect(() => {
    sendOTP();
  }, []);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const sendOTP = async () => {
    setSending(true);
    try {
      await api.post('/auth/send-otp', { phone: userInfo.phone });
      setCountdown(60);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể gửi mã xác nhận');
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length < 6) return Alert.alert('Lỗi', 'Vui lòng nhập đủ 6 số');

    setLoading(true);
    try {
      const res = await api.post('/auth/verify-phone-otp', { phone: userInfo.phone, otp: otpCode });
      if (res.data.success) {
        Alert.alert('Thành công', 'Đã xác thực Số điện thoại!');
        await checkLoggedIn(); // Update userInfo context -> AppNavigator will re-evaluate stack
      }
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Xác thực thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) inputRefs.current[index + 1].focus();
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Xác thực SĐT</Text>
          <Text style={styles.subtitle}>
            Chúng tôi đã gửi mã xác thực tới số điện thoại{'\n'}
            <Text style={{ fontWeight: 'bold', color: '#F8FAFC' }}>{userInfo?.phone}</Text>
          </Text>
        </View>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={el => (inputRefs.current[index] = el)}
              style={[styles.otpInput, digit && styles.otpInputActive]}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={t => handleChange(t, index)}
              onKeyPress={e => handleKeyPress(e, index)}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify} disabled={loading}>
          <LinearGradient colors={['#10B981', '#059669']} style={styles.verifyBtnInner}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.verifyBtnText}>Xác thực</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Chưa nhận được mã? </Text>
          <TouchableOpacity onPress={sendOTP} disabled={countdown > 0 || sending}>
            <Text style={[styles.resendLink, (countdown > 0 || sending) && styles.resendLinkDisabled]}>
              {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại ngay'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 24, justifyContent: 'center' },
  header: { marginBottom: 40, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#94A3B8', textAlign: 'center', lineHeight: 24 },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  otpInput: { width: 50, height: 60, backgroundColor: '#1E293B', borderRadius: 12, borderWidth: 2, borderColor: '#334155', color: '#F8FAFC', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  otpInputActive: { borderColor: '#10B981' },
  verifyBtn: { borderRadius: 12, overflow: 'hidden', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  verifyBtnInner: { height: 56, justifyContent: 'center', alignItems: 'center' },
  verifyBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  resendContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  resendText: { color: '#94A3B8', fontSize: 16 },
  resendLink: { color: '#10B981', fontSize: 16, fontWeight: 'bold' },
  resendLinkDisabled: { color: '#475569' }
});

export default VerifyPhoneScreen;
