import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/axios';

const formatMoney = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0));
const todayISO = () => new Date().toISOString().split('T')[0];
const addDaysISO = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const OwnerVenueDetailScreen = ({ route, navigation }) => {
  const { venue } = route.params;
  const [loading, setLoading] = useState(true);
  const [courts, setCourts] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const loadCourts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/courts/venue/${venue.id}`);
      if (res.data.success) {
        setCourts(res.data.data);
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể tải danh sách sân con');
    } finally {
      setLoading(false);
    }
  }, [venue.id]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadCourts);
    return unsubscribe;
  }, [navigation, loadCourts]);

  const generateSlots = async (courtId) => {
    setBusyId(`slots-${courtId}`);
    try {
      const startHour = Number((venue.open_time || '06:00:00').slice(0, 2));
      const endHour = Number((venue.close_time || '22:00:00').slice(0, 2));
      
      const res = await api.post(`/courts/${courtId}/slots/generate-range`, {
        start_date: todayISO(),
        end_date: addDaysISO(13),
        start_hour: startHour,
        end_hour: endHour,
      });
      
      if (res.data.success) {
        Alert.alert('Thành công', `Đã tạo lịch 14 ngày cho sân con.`);
      }
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Không tạo được lịch');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={26} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {venue.name}
            </Text>
            <View style={styles.backBtn} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#10B981" size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.venueInfoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color="#10B981" />
              <Text style={styles.infoText}>{venue.address}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time" size={20} color="#10B981" />
              <Text style={styles.infoText}>
                {venue.open_time?.slice(0, 5)} - {venue.close_time?.slice(0, 5)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call" size={20} color="#10B981" />
              <Text style={styles.infoText}>{venue.phone_contact || 'Chưa cập nhật'}</Text>
            </View>
            <View style={[styles.statusBadge, venue.is_active ? styles.statusActive : styles.statusInactive]}>
              <Text style={styles.statusText}>
                {venue.is_active ? 'Đang hoạt động' : 'Chờ duyệt'}
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Danh sách sân con</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => Alert.alert('Thông báo', 'Tính năng thêm sân đang phát triển')}>
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.addBtnText}>Thêm mới</Text>
            </TouchableOpacity>
          </View>

          {courts.map((court) => (
            <View key={court.id} style={styles.courtCard}>
              <View style={styles.courtHeader}>
                <View>
                  <Text style={styles.courtName}>{court.name}</Text>
                  <Text style={styles.courtType}>{court.sport_type} • {court.surface_type || 'Tiêu chuẩn'}</Text>
                </View>
                <View style={styles.priceTag}>
                  <Text style={styles.priceValue}>{formatMoney(court.price_per_hour)}đ</Text>
                  <Text style={styles.priceUnit}>/giờ</Text>
                </View>
              </View>
              
              <View style={styles.courtActions}>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.actionPrimary]} 
                  onPress={() => generateSlots(court.id)}
                  disabled={busyId === `slots-${court.id}`}
                >
                  {busyId === `slots-${court.id}` ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="calendar" size={16} color="#FFF" style={styles.actionIcon} />
                      <Text style={styles.actionPrimaryText}>Mở lịch 14 ngày</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.actionSecondary]} onPress={() => Alert.alert('Thông báo', 'Tính năng sửa đang phát triển')}>
                  <Ionicons name="pencil" size={16} color="#10B981" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {!courts.length && <Text style={styles.emptyText}>Chưa có sân con nào. Vui lòng thêm sân con để bắt đầu nhận khách.</Text>}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  headerGradient: { borderBottomLeftRadius: 35, borderBottomRightRadius: 35, paddingBottom: 25 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
  backBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 120 },
  venueInfoCard: { backgroundColor: '#1E293B', borderRadius: 18, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoText: { color: '#CBD5E1', fontSize: 14, marginLeft: 12, flex: 1 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 4 },
  statusActive: { backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  statusInactive: { backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#FFF' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  courtCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  courtHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  courtName: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  courtType: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
  priceTag: { alignItems: 'flex-end' },
  priceValue: { color: '#10B981', fontSize: 16, fontWeight: 'bold' },
  priceUnit: { color: '#64748B', fontSize: 11 },
  courtActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, flex: 1 },
  actionPrimary: { backgroundColor: '#10B981' },
  actionSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)', flex: 0.3 },
  actionPrimaryText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  actionIcon: { marginRight: 6 },
  emptyText: { color: '#64748B', textAlign: 'center', padding: 18, lineHeight: 22, fontStyle: 'italic' }
});

export default OwnerVenueDetailScreen;
