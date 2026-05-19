import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Keyboard, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';

const OTP_LENGTH = 6;
const RESEND_TIMEOUT = 60; // seconds

// ─────────────────────────────────────────────────────────────────────────────
const OTPScreen = ({ route, navigation }) => {
  const { phone, purpose = 'login', registerData } = route.params;
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_TIMEOUT);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);
  const timerRef = useRef(null);
  const { login } = useContext(AuthContext);

  // ─── Countdown timer ────────────────────────────────────────────────────
  useEffect(() => {
    startCountdown();
    return () => clearInterval(timerRef.current);
  }, []);

  const startCountdown = () => {
    setCountdown(RESEND_TIMEOUT);
    setCanResend(false);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ─── OTP Input handlers ─────────────────────────────────────────────────
  const handleDigitChange = (text, index) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    // Auto-focus next
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (digit && index === OTP_LENGTH - 1) {
      const allFilled = newDigits.every((d) => d !== '');
      if (allFilled) {
        Keyboard.dismiss();
        setTimeout(() => handleVerifyOTP(newDigits.join('')), 200);
      }
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    // Handle paste on first box - fill all digits
    const text = e.nativeEvent.text || '';
    const digits = text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH).split('');
    if (digits.length > 1) {
      const newDigits = [...Array(OTP_LENGTH).fill('')];
      digits.forEach((d, i) => { newDigits[i] = d; });
      setOtpDigits(newDigits);
      const lastIndex = Math.min(digits.length - 1, OTP_LENGTH - 1);
      inputRefs.current[lastIndex]?.focus();
    }
  };

  // ─── Verify OTP ─────────────────────────────────────────────────────────
  const handleVerifyOTP = async (otpOverride) => {
    const otp = otpOverride || otpDigits.join('');
    Keyboard.dismiss();
    if (otp.length < OTP_LENGTH) return Alert.alert('Lỗi', 'Vui lòng nhập đủ mã OTP 6 số');

    setLoading(true);
    try {
      const body = { phone, otp, purpose };
      if (purpose === 'register' && registerData) {
        Object.assign(body, registerData);
      }
      const res = await api.post('/auth/verify-otp', body);
      if (res.data.success) {
        if (res.data.token && res.data.user) {
          login(res.data.token, res.data.user);
          return;
        }
        if (res.data.isNewUser) {
          navigation.navigate('Register', { phone, tempToken: res.data.tempToken, fromOtp: true });
          return;
        }
        if (purpose === 'reset' && res.data.tempToken) {
          navigation.navigate('ResetPassword', { tempToken: res.data.tempToken });
        }
      }
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || error.userMessage || 'Xác thực OTP thất bại');
      // Clear OTP on error
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // ─── Resend OTP ─────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (!canResend) return;
    setResendLoading(true);
    try {
      await api.post('/auth/send-otp', { phone });
      setOtpDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      startCountdown();
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Gửi lại OTP thất bại');
    } finally {
      setResendLoading(false);
    }
  };

  // ─── Computed ───────────────────────────────────────────────────────────
  const filledCount = otpDigits.filter((d) => d !== '').length;
  const maskedPhone = phone.replace(/(\d{4})(\d+)(\d{2})/, '$1 **** $3');

  // ─── UI ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.header}>
        <SafeAreaView>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            {/* Animated icon */}
            <View style={styles.iconCircle}>
              <Ionicons name="chatbubble-ellipses" size={36} color="#10B981" />
            </View>
            <Text style={styles.title}>Nhập mã OTP</Text>
            <Text style={styles.subtitle}>
              Mã 6 số đã được gửi đến
            </Text>
            <Text style={styles.phoneText}>{maskedPhone}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* OTP Boxes */}
      <View style={styles.otpSection}>
        <View style={styles.otpRow}>
          {Array(OTP_LENGTH).fill(0).map((_, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                styles.otpBox,
                otpDigits[index] ? styles.otpBoxFilled : null,
              ]}
              value={otpDigits[index]}
              onChangeText={(text) => handleDigitChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              onChange={index === 0 ? handlePaste : undefined}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectionColor="#10B981"
              caretHidden
            />
          ))}
        </View>

        {/* Progress dots */}
        <View style={styles.progressRow}>
          {Array(OTP_LENGTH).fill(0).map((_, i) => (
            <View
              key={i}
              style={[styles.progressDot, i < filledCount && styles.progressDotFilled]}
            />
          ))}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.verifyBtn, filledCount < OTP_LENGTH && styles.verifyBtnDisabled]}
          onPress={() => handleVerifyOTP()}
          disabled={loading || filledCount < OTP_LENGTH}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={filledCount === OTP_LENGTH ? ['#10B981', '#059669'] : ['#1E293B', '#1E293B']}
            style={styles.verifyBtnInner}
          >
            {loading
              ? <ActivityIndicator color="#FFF" />
              : (
                <View style={styles.verifyBtnContent}>
                  <Text style={styles.verifyBtnText}>Xác nhận mã</Text>
                  {filledCount === OTP_LENGTH && (
                    <Ionicons name="checkmark-circle" size={20} color="rgba(255,255,255,0.8)" style={{ marginLeft: 8 }} />
                  )}
                </View>
              )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Resend section */}
        <View style={styles.resendSection}>
          {canResend ? (
            <TouchableOpacity onPress={handleResend} disabled={resendLoading}>
              <Text style={styles.resendActiveText}>
                {resendLoading ? 'Đang gửi...' : '🔄  Gửi lại mã OTP'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.countdownRow}>
              <Ionicons name="time-outline" size={16} color="#475569" style={{ marginRight: 6 }} />
              <Text style={styles.countdownText}>
                Gửi lại sau{' '}
                <Text style={styles.countdownNumber}>{countdown}s</Text>
              </Text>
            </View>
          )}
        </View>

        {/* Demo hint */}
        <View style={styles.demoHint}>
          <Ionicons name="information-circle-outline" size={14} color="#334155" style={{ marginRight: 6 }} />
          <Text style={styles.demoHintText}>Demo mode: Dùng mã 123456</Text>
        </View>
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    paddingBottom: 40,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  backBtn: {
    padding: 20,
    paddingBottom: 0,
  },
  headerContent: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(16,185,129,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  phoneText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 1,
  },

  // OTP section
  otpSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 36,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  otpBox: {
    width: 48,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16,185,129,0.08)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E293B',
  },
  progressDotFilled: {
    backgroundColor: '#10B981',
  },
  verifyBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 20,
  },
  verifyBtnDisabled: {
    opacity: 0.6,
  },
  verifyBtnInner: {
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifyBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Resend
  resendSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resendActiveText: {
    color: '#10B981',
    fontSize: 15,
    fontWeight: '700',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdownText: {
    color: '#475569',
    fontSize: 14,
  },
  countdownNumber: {
    color: '#64748B',
    fontWeight: '700',
  },

  // Demo hint
  demoHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(51,65,85,0.3)',
    borderRadius: 12,
    alignSelf: 'center',
  },
  demoHintText: {
    color: '#334155',
    fontSize: 12,
  },
});

export default OTPScreen;
