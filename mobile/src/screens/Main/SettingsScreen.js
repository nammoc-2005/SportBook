import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const SettingsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const SettingRow = ({ icon, label, hasSwitch, switchValue, onSwitchChange }) => (
    <View style={styles.settingRow}>
      <View style={styles.leftSide}>
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={20} color="#94A3B8" />
        </View>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      {hasSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: '#334155', true: '#10B981' }}
          thumbColor="#FFF"
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#334155" />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt hệ thống</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Tùy chọn ứng dụng</Text>
        <View style={styles.menuBox}>
          <SettingRow icon="notifications-outline" label="Thông báo đẩy" hasSwitch switchValue={notifications} onSwitchChange={setNotifications} />
          <SettingRow icon="moon-outline" label="Giao diện tối (Dark Mode)" hasSwitch switchValue={darkMode} onSwitchChange={setDarkMode} />
          <SettingRow icon="language-outline" label="Ngôn ngữ" />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Hỗ trợ & Thông tin</Text>
        <View style={styles.menuBox}>
          <SettingRow icon="help-circle-outline" label="Trung tâm trợ giúp" />
          <SettingRow icon="chatbubbles-outline" label="Liên hệ hỗ trợ" />
          <SettingRow icon="document-text-outline" label="Điều khoản dịch vụ" />
          <SettingRow icon="shield-checkmark-outline" label="Chính sách bảo mật" />
          <SettingRow icon="information-circle-outline" label="Về SportBook (Phiên bản 1.0.0)" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 25 },
  sectionTitle: { color: '#475569', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 15, letterSpacing: 1 },
  menuBox: { backgroundColor: '#1E293B', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.02)' },
  leftSide: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' },
  settingLabel: { color: '#CBD5E1', fontSize: 15, fontWeight: '500', marginLeft: 15 },
});

export default SettingsScreen;
