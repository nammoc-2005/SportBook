import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';

const SecurityScreen = ({ navigation }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
    }
    if (newPassword.length < 6) {
      return Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự');
    }
    if (newPassword !== confirmPassword) {
      return Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      if (res.data.success) {
        Alert.alert('Thành công', 'Đổi mật khẩu thành công. Vui lòng ghi nhớ mật khẩu mới của bạn.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        navigation.goBack();
      }
    } catch (e) {
      const msg = e.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại';
      Alert.alert('Lỗi', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bảo mật</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Đổi mật khẩu</Text>
          <Text style={styles.sectionDesc}>Mật khẩu nên chứa ít nhất 6 ký tự bao gồm chữ và số để đảm bảo an toàn.</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mật khẩu hiện tại</Text>
            <View style={styles.inputBox}>
              <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" />
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Nhập mật khẩu hiện tại"
                placeholderTextColor="#64748B"
                secureTextEntry={!showCurrent}
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                <Ionicons name={showCurrent ? "eye-outline" : "eye-off-outline"} size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mật khẩu mới</Text>
            <View style={styles.inputBox}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#94A3B8" />
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Nhập mật khẩu mới"
                placeholderTextColor="#64748B"
                secureTextEntry={!showNew}
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                <Ionicons name={showNew ? "eye-outline" : "eye-off-outline"} size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
            <View style={styles.inputBox}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#94A3B8" />
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor="#64748B"
                secureTextEntry={!showNew}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Cập nhật mật khẩu</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 25 },
  sectionTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  sectionDesc: { color: '#94A3B8', fontSize: 14, marginBottom: 30, lineHeight: 22 },
  inputContainer: { marginBottom: 20 },
  label: { color: '#CBD5E1', fontSize: 14, fontWeight: '600', marginBottom: 10 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', height: 55, borderRadius: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  input: { flex: 1, marginLeft: 12, color: '#FFF', fontSize: 16 },
  footer: { padding: 25, paddingBottom: Platform.OS === 'ios' ? 10 : 25 },
  saveBtn: { backgroundColor: '#6366F1', height: 55, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});

export default SecurityScreen;
