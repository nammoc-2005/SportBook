import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';

const ProfileScreen = ({ navigation }) => {
  const { userInfo, logout, updateUser } = useContext(AuthContext);
  const [uploading, setUploading] = useState(false);

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Hẹn gặp lại bạn sớm nhé!", [
      { text: "Ở lại", style: "cancel" },
      { text: "Đăng xuất", style: "destructive", onPress: () => logout() }
    ]);
  };

  const handlePickAvatar = () => {
    Alert.alert('Ảnh đại diện', 'Hãy làm mới bản thân!', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Chụp ảnh', onPress: openCamera },
      { text: 'Thư viện', onPress: openGallery }
    ]);
  };

  const openCamera = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) return Alert.alert('Lỗi', 'Cần quyền Camera');
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1,1], quality: 0.5 });
    if (!result.canceled) uploadAvatar(result.assets[0]);
  };

  const openGallery = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return Alert.alert('Lỗi', 'Cần quyền Thư viện');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1,1], quality: 0.5 });
    if (!result.canceled) uploadAvatar(result.assets[0]);
  };

  const uploadAvatar = async (asset) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', { uri: asset.uri, name: 'avt.jpg', type: 'image/jpeg' });
      const res = await api.post('/auth/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) {
        updateUser({ ...userInfo, avatar: res.data.avatar_url });
        Alert.alert('Thành công', 'Avatar đã được cập nhật');
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể tải ảnh');
    } finally {
      setUploading(false);
    }
  };

  const avatarUrl = userInfo?.avatar?.includes('http') 
    ? userInfo.avatar 
    : userInfo?.avatar 
      ? `http://192.168.1.107:5000${userInfo.avatar}`
      : 'https://ui-avatars.com/api/?name=' + (userInfo?.name || 'User') + '&background=10B981&color=fff';

  const ActionCard = ({ icon, label, color, onPress }) => (
    <TouchableOpacity style={styles.actionCard} activeOpacity={0.8} onPress={onPress}>
      <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']} style={styles.actionInner}>
        <Ionicons name={icon} size={26} color={color} />
        <Text style={styles.actionLabel}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const MenuRow = ({ icon, label, onPress, color = '#94A3B8' }) => (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuLeft}>
        <View style={styles.menuIconBox}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.menuText}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#334155" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.topHeader}>
          <SafeAreaView edges={['top']}>
            <View style={styles.profileSection}>
              <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.9}>
                <Image source={{ uri: avatarUrl }} style={styles.largeAvatar} />
                <View style={styles.avatarGlow} />
                <View style={styles.editBadge}>
                   <Ionicons name="camera" size={12} color="#FFF" />
                </View>
              </TouchableOpacity>
              <Text style={styles.userName}>{userInfo?.name || 'Vận động viên'}</Text>
              <View style={styles.rankBadge}>
                <Ionicons name="flash" size={12} color="#10B981" />
                <Text style={styles.rankText}>Hạng Bạch Kim</Text>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.gridContainer}>
          <ActionCard icon="receipt" label="Giao dịch" color="#10B981" onPress={() => navigation.navigate('BookingHistory')} />
          <ActionCard icon="heart" label="Yêu thích" color="#F43F5E" onPress={() => navigation.navigate('Favorites')} />
          <ActionCard icon="notifications" label="Thông báo" color="#3B82F6" onPress={() => navigation.navigate('Notifications')} />
          <ActionCard icon="gift" label="Quà tặng" color="#F59E0B" />
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Quản lý tài khoản</Text>
          <View style={styles.menuBox}>
            {['owner', 'admin'].includes(userInfo?.role) && (
              <MenuRow
                icon="business-outline"
                label="Quản lý sân của tôi"
                color="#10B981"
                onPress={() => navigation.navigate('OwnerDashboard')}
              />
            )}
            <MenuRow 
              icon="person-outline" 
              label="Thông tin cá nhân" 
              color="#10B981" 
              onPress={() => navigation.navigate('EditProfile')}
            />
            {!userInfo?.phone_verified && (
              <MenuRow
                icon="phone-portrait-outline"
                label="Xác thực số điện thoại"
                color="#10B981"
                onPress={() => navigation.navigate('VerifyPhone')}
              />
            )}
            {userInfo?.email && !userInfo?.email_verified && (
              <MenuRow
                icon="mail-outline"
                label="Xác thực email"
                color="#3B82F6"
                onPress={() => navigation.navigate('VerifyEmail')}
              />
            )}
            <MenuRow 
              icon="card-outline" 
              label="Phương thức thanh toán" 
              color="#3B82F6" 
              onPress={() => navigation.navigate('PaymentMethods')}
            />
            <MenuRow 
              icon="shield-outline" 
              label="Bảo mật & Quyền riêng tư" 
              color="#6366F1" 
              onPress={() => navigation.navigate('Security')}
            />
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Cài đặt hệ thống</Text>
          <View style={styles.menuBox}>
            <MenuRow 
              icon="settings-outline" 
              label="Tùy chọn & Cài đặt" 
              onPress={() => navigation.navigate('Settings')}
            />
            <MenuRow icon="help-circle-outline" label="Trung tâm trợ giúp" />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LinearGradient colors={['#EF4444', '#991B1B']} style={styles.logoutGradient}>
            <Text style={styles.logoutText}>Đăng xuất tài khoản</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  topHeader: { paddingBottom: 40, borderBottomLeftRadius: 50, borderBottomRightRadius: 50 },
  profileSection: { alignItems: 'center', marginTop: 20 },
  largeAvatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#10B981' },
  avatarGlow: { position: 'absolute', width: 110, height: 110, borderRadius: 55, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)', top: -5 },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#10B981', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#0F172A' },
  userName: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: 15 },
  rankBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' },
  rankText: { color: '#10B981', fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginTop: -30, justifyContent: 'space-between' },
  actionCard: { width: '48%', marginBottom: 15 },
  actionInner: { paddingVertical: 20, alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: '#1E293B' },
  actionLabel: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold', marginTop: 10 },
  menuSection: { marginTop: 30, paddingHorizontal: 25 },
  sectionTitle: { color: '#475569', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 15, letterSpacing: 1 },
  menuBox: { backgroundColor: '#1E293B', borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' },
  menuText: { color: '#CBD5E1', fontSize: 15, fontWeight: '500', marginLeft: 15 },
  logoutBtn: { marginHorizontal: 25, marginTop: 40 },
  logoutGradient: { paddingVertical: 18, borderRadius: 20, alignItems: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 },
  logoutText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});

export default ProfileScreen;
