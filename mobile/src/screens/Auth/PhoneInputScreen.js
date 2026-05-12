import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Keyboard, TouchableWithoutFeedback, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';

const PhoneInputScreen = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    Keyboard.dismiss();
    if (!phone || phone.length < 9) return Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
    setLoading(true);
    try {
      const res = await api.post('/auth/send-otp', { phone });
      if (res.data.success) navigation.navigate('OTP', { phone });
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể gửi OTP');
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
              <Text style={styles.title}>Quên mật khẩu / Đăng ký</Text>
              <Text style={styles.subtitle}>Chúng tôi sẽ gửi mã OTP qua tin nhắn</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="phone-portrait-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nhập số điện thoại"
              placeholderTextColor="#64748B"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={11}
            />
          </View>
          <Text style={styles.hint}>* Nhập số điện thoại bất kỳ để nhận mã OTP test</Text>

          <TouchableOpacity style={styles.nextBtn} onPress={handleSendOTP} disabled={loading}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.btnInner}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Gửi mã OTP</Text>}
            </LinearGradient>
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
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 18, paddingHorizontal: 20, height: 60, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: '#FFF', fontSize: 15 },
  hint: { color: '#475569', fontSize: 12, marginTop: 15, marginBottom: 25 },
  nextBtn: { borderRadius: 18, overflow: 'hidden' },
  btnInner: { height: 60, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});

export default PhoneInputScreen;
