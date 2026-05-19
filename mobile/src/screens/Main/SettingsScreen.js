import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const SettingsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [location, setLocation] = useState(true);

  const SettingRow = ({ icon, label, hasSwitch, switchValue, onSwitchChange, color = "#94A3B8", valueText }) => (
    <TouchableOpacity style={styles.settingRow} activeOpacity={hasSwitch ? 1 : 0.7}>
      <View style={styles.leftSide}>
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <View style={styles.rightSide}>
        {valueText && <Text style={styles.valueText}>{valueText}</Text>}
        {hasSwitch ? (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: '#334155', true: '#10B981' }}
            thumbColor="#FFF"
            ios_backgroundColor="#334155"
          />
        ) : (
          <Ionicons name="chevron-forward" size={18} color="#475569" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tùy chọn & Cài đặt</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <View style={styles.proBanner}>
          <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.proGradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
            <View style={styles.proContent}>
              <View>
                <Text style={styles.proTitle}>SportBook Premium</Text>
                <Text style={styles.proDesc}>Mở khóa mọi giới hạn đặt sân</Text>
              </View>
              <TouchableOpacity style={styles.proBtn}>
                <Text style={styles.proBtnText}>Nâng cấp</Text>
              </TouchableOpacity>
            </View>
            <Ionicons name="star" size={60} color="rgba(255,255,255,0.1)" style={styles.proIconBg} />
          </LinearGradient>
        </View>

        <Text style={styles.sectionTitle}>HỆ THỐNG</Text>
        <View style={styles.menuBox}>
          <SettingRow icon="notifications" color="#3B82F6" label="Thông báo đẩy" hasSwitch switchValue={notifications} onSwitchChange={setNotifications} />
          <SettingRow icon="moon" color="#8B5CF6" label="Giao diện tối (Dark Mode)" hasSwitch switchValue={darkMode} onSwitchChange={setDarkMode} />
          <SettingRow icon="location" color="#EF4444" label="Dịch vụ định vị" hasSwitch switchValue={location} onSwitchChange={setLocation} />
          <SettingRow icon="language" color="#10B981" label="Ngôn ngữ" valueText="Tiếng Việt" />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 25 }]}>HỖ TRỢ & THÔNG TIN</Text>
        <View style={styles.menuBox}>
          <SettingRow icon="help-buoy" color="#F59E0B" label="Trung tâm trợ giúp" />
          <SettingRow icon="chatbubble-ellipses" color="#06B6D4" label="Liên hệ CSKH" />
          <SettingRow icon="document-text" color="#64748B" label="Điều khoản dịch vụ" />
          <SettingRow icon="shield-checkmark" color="#10B981" label="Chính sách bảo mật" />
          <SettingRow icon="information-circle" color="#94A3B8" label="Phiên bản ứng dụng" valueText="v1.0.0" />
        </View>

        <TouchableOpacity style={styles.deleteBtn} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
          <Text style={styles.deleteText}>Xóa tài khoản vĩnh viễn</Text>
        </TouchableOpacity>
        
        <Text style={styles.footerText}>Made with ❤️ by SportBook Team</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20, paddingBottom: 40 },
  
  proBanner: { marginBottom: 30, borderRadius: 24, overflow: 'hidden', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12 },
  proGradient: { padding: 20, paddingVertical: 25, position: 'relative' },
  proContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 },
  proTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  proDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  proBtn: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  proBtnText: { color: '#6D28D9', fontWeight: 'bold', fontSize: 13 },
  proIconBg: { position: 'absolute', right: -10, bottom: -10, transform: [{ rotate: '15deg' }], zIndex: 1 },

  sectionTitle: { color: '#64748B', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1.5, marginLeft: 5 },
  menuBox: { backgroundColor: '#1E293B', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.02)' },
  leftSide: { flexDirection: 'row', alignItems: 'center' },
  rightSide: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  settingLabel: { color: '#E2E8F0', fontSize: 15, fontWeight: '500', marginLeft: 15 },
  valueText: { color: '#94A3B8', fontSize: 14, marginRight: 10 },
  
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 40, padding: 15 },
  deleteText: { color: '#EF4444', fontSize: 15, fontWeight: '600', marginLeft: 8 },
  footerText: { color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 20, marginBottom: 20 }
});

export default SettingsScreen;

