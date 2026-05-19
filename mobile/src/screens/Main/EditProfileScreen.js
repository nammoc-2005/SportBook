import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';

const EditProfileScreen = ({ navigation }) => {
  const { userInfo, updateUser } = useContext(AuthContext);
  const [name, setName] = useState(userInfo?.name || '');
  const [email, setEmail] = useState(userInfo?.email || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Lỗi', 'Họ tên không được để trống');
    
    setLoading(true);
    try {
      const res = await api.put('/auth/profile', { name, email });
      if (res.data.success) {
        updateUser({ ...userInfo, name, email });
        Alert.alert('Thành công', 'Cập nhật thông tin thành công');
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin');
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
        <Text style={styles.headerTitle}>Thông tin cá nhân</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Họ và tên</Text>
            <View style={styles.inputBox}>
              <Ionicons name="person-outline" size={20} color="#94A3B8" />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Nhập họ và tên"
                placeholderTextColor="#64748B"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email liên hệ</Text>
            <View style={styles.inputBox}>
              <Ionicons name="mail-outline" size={20} color="#94A3B8" />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Nhập địa chỉ email"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
            <Text style={styles.infoText}>Số điện thoại và username không thể thay đổi để đảm bảo tính bảo mật.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Lưu thay đổi</Text>}
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
  inputContainer: { marginBottom: 25 },
  label: { color: '#CBD5E1', fontSize: 14, fontWeight: '600', marginBottom: 10 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', height: 55, borderRadius: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  input: { flex: 1, marginLeft: 12, color: '#FFF', fontSize: 16 },
  infoBox: { flexDirection: 'row', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: 15, borderRadius: 12, marginTop: 10 },
  infoText: { color: '#93C5FD', fontSize: 13, marginLeft: 10, flex: 1, lineHeight: 20 },
  footer: { padding: 25, paddingBottom: Platform.OS === 'ios' ? 10 : 25 },
  saveBtn: { backgroundColor: '#10B981', height: 55, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});

export default EditProfileScreen;
