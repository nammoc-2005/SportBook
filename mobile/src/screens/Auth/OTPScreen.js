import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Keyboard, TouchableWithoutFeedback, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';

const OTPScreen = ({ route, navigation }) => {
  const { phone } = route.params;
  const [otp, setOtp] = useState('123456');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const handleVerifyOTP = async () => {
    Keyboard.dismiss();
    if (!otp || otp.length < 6) return Alert.alert('Lỗi', 'Vui lòng nhập mã OTP 6 số');
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { phone, otp });
      if (res.data.success) {
        if (res.data.isNewUser) {
          navigation.navigate('Register', { phone, tempToken: res.data.tempToken });
        } else {
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
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.topGradient}>
          <SafeAreaView>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={28} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.header}>
              <Text style={styles.title}>Xác thực mã OTP</Text>
              <Text style={styles.subtitle}>Mã 6 số đã được gửi tới số {phone}</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.form}>
          <TextInput
            style={styles.otpInput}
            placeholder="000000"
            placeholderTextColor="rgba(255,255,255,0.1)"
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
            maxLength={6}
            textAlign="center"
          />

          <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyOTP} disabled={loading}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.btnInner}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Xác nhận mã</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resendBtn}>
            <Text style={styles.resendText}>Chưa nhận được mã? <Text style={{ color: '#10B981' }}>Gửi lại</Text></Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  topGradient: { borderBottomLeftRadius: 50, borderBottomRightRadius: 50, paddingBottom: 40 },
  backBtn: { padding: 20 },
  header: { alignItems: 'center', marginTop: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  subtitle: { fontSize: 14, color: '#94A3B8', marginTop: 8 },
  form: { padding: 30 },
  otpInput: { backgroundColor: '#1E293B', height: 80, borderRadius: 20, fontSize: 36, fontWeight: 'bold', color: '#FFF', letterSpacing: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 30 },
  verifyBtn: { borderRadius: 18, overflow: 'hidden' },
  btnInner: { height: 60, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  resendBtn: { marginTop: 25, alignItems: 'center' },
  resendText: { color: '#475569', fontSize: 14 }
});

export default OTPScreen;
