import React, { useState, useContext, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, Keyboard, TouchableWithoutFeedback, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';

// ✅ Thêm 2 dòng này
const GOOGLE_WEB_CLIENT_ID = '822184364234-t2rr0bkq77i75dl7886m438rfuhpi6p6.apps.googleusercontent.com';;
const GOOGLE_IOS_CLIENT_ID = '822184364234-o1dn5crh1bsvv2mnv8l3kt80dqi154k0.apps.googleusercontent.com';;

WebBrowser.maybeCompleteAuthSession();

function getExpoGoogleRedirectUri() {
  return AuthSession.makeRedirectUri({
    scheme: 'sportbook',
    path: 'auth',
  });
}

const LoginScreen = ({ navigation }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const redirectUri = getExpoGoogleRedirectUri();
  const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: { prompt: 'select_account' },
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === 'success' && response.params?.code) {
      exchangeGoogleCode(response.params.code);
    } else if (response?.type === 'error') {
      setGoogleLoading(false);
      Alert.alert(
        'Lỗi Google',
        `${response.error?.message || 'Đăng nhập thất bại'}\n\nThêm vào Google Console (Web client) → Authorized redirect URIs:\n${redirectUri}`
      );
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      setGoogleLoading(false);
    }
  }, [response]);

  const exchangeGoogleCode = async (code) => {
    try {
      const res = await api.post('/auth/google', {
        code,
        codeVerifier: request?.codeVerifier,
        redirectUri,
      });
      if (res.data.success) login(res.data.token, res.data.user);
      else Alert.alert('Lỗi', res.data.message || 'Đăng nhập Google thất bại');
    } catch (e) {
      const detail = e.response?.data?.detail || e.response?.data?.message;
      Alert.alert(
        'Lỗi Google',
        `${detail || e.userMessage || 'Không thể xác thực'}\n\nBackend đang chạy? Redirect URI:\n${redirectUri}`
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!request) {
      Alert.alert('Lỗi', 'Google Sign-In chưa sẵn sàng, thử lại sau vài giây.');
      return;
    }
    setGoogleLoading(true);
    try {
      await promptAsync({ preferEphemeralSession: true, showInRecents: false });
    } catch (e) {
      setGoogleLoading(false);
      Alert.alert('Lỗi', e.message || 'Không thể mở trình duyệt đăng nhập');
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const res = await api.post('/auth/apple', {
        appleId: credential.user,
        email: credential.email,
        name: credential.fullName,
        identityToken: credential.identityToken,
      });
      if (res.data.success) login(res.data.token, res.data.user);
    } catch (e) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Lỗi', e.response?.data?.message || 'Đăng nhập bằng Apple thất bại');
      }
    }
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    const username = identifier.trim();
    if (!username) return Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại, email hoặc tài khoản');
    if (!password) return Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu');

    setLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      if (res.data.success) login(res.data.token, res.data.user);
    } catch (error) {
      Alert.alert(
        'Lỗi đăng nhập',
        error.response?.data?.message || error.userMessage || 'Đăng nhập thất bại'
      );
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
              <Text style={styles.subtitle}>Đặt sân thể thao — nhanh như Alobo</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="SĐT / Email / Tài khoản"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
              keyboardType="email-address"
              value={identifier}
              onChangeText={setIdentifier}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Mật khẩu"
              placeholderTextColor="#64748B"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={12}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => navigation.navigate('PhoneInput', { purpose: 'reset' })}
          >
            <Text style={styles.forgotText}>Quên mật khẩu?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading || googleLoading}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.loginBtnInner}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.loginBtnText}>Đăng nhập</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.phoneBtn}
            onPress={() => navigation.navigate('PhoneInput', { purpose: 'login' })}
            disabled={loading || googleLoading}
          >
            <Ionicons name="phone-portrait-outline" size={22} color="#10B981" style={{ marginRight: 10 }} />
            <Text style={styles.phoneBtnText}>Đăng nhập bằng số điện thoại (OTP)</Text>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Hoặc</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignIn} disabled={loading || googleLoading}>
            <View style={styles.googleBtnInner}>
              {googleLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={24} color="#FFF" style={{ marginRight: 10 }} />
                  <Text style={styles.googleBtnText}>Tiếp tục với Google</Text>
                </>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.googleBtn, { marginTop: 10, backgroundColor: '#000' }]}
            onPress={handleAppleSignIn}
            disabled={loading || googleLoading}
          >
            <View style={[styles.googleBtnInner, { backgroundColor: '#000' }]}>
              <Ionicons name="logo-apple" size={24} color="#FFF" style={{ marginRight: 10 }} />
              <Text style={styles.googleBtnText}>Tiếp tục với Apple</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.secondaryBtnText}>
              Chưa có tài khoản? <Text style={{ color: '#10B981' }}>Đăng ký ngay</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  topGradient: { height: '38%', borderBottomLeftRadius: 60, borderBottomRightRadius: 60, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center' },
  logoBox: { width: 80, height: 80, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '900', color: '#FFF' },
  subtitle: { fontSize: 14, color: '#94A3B8', marginTop: 8 },
  form: { paddingHorizontal: 30, marginTop: -40 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 18, marginBottom: 15, paddingHorizontal: 20, height: 60, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: '#FFF', fontSize: 15 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 8 },
  forgotText: { color: '#10B981', fontSize: 13, fontWeight: '600' },
  loginBtn: { marginTop: 8, borderRadius: 18, overflow: 'hidden', shadowColor: '#10B981', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 },
  loginBtnInner: { height: 60, justifyContent: 'center', alignItems: 'center' },
  loginBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  phoneBtn: { marginTop: 14, height: 56, borderRadius: 18, borderWidth: 1.5, borderColor: '#10B981', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.08)' },
  phoneBtnText: { color: '#10B981', fontSize: 15, fontWeight: '700' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 15 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { color: '#94A3B8', paddingHorizontal: 15, fontSize: 14 },
  googleBtn: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#1E293B' },
  googleBtnInner: { height: 56, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  googleBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  secondaryBtn: { marginTop: 28, alignItems: 'center' },
  secondaryBtnText: { color: '#94A3B8', fontSize: 14 },
});

export default LoginScreen;