import React, { useCallback, useEffect, useState } from 'react';
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

const statusMeta = {
  pending: { label: 'Chờ thanh toán', color: '#F59E0B' },
  confirmed: { label: 'Đã xác nhận', color: '#3B82F6' },
  completed: { label: 'Hoàn thành', color: '#10B981' },
  cancelled: { label: 'Đã hủy', color: '#EF4444' },
};

const OwnerDashboardScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [venueRes, bookingRes] = await Promise.all([
        api.get('/venues/owner/my'),
        api.get('/bookings/owner/all?limit=50'),
      ]);
      if (venueRes.data.success) setVenues(venueRes.data.data);
      if (bookingRes.data.success) setBookings(bookingRes.data.data);
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Không tải được dữ liệu chủ sân');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation, loadData]);

  const updateBooking = async (bookingId, action) => {
    setBusyId(`${action}-${bookingId}`);
    try {
      const res = await api.put(`/bookings/${bookingId}/${action}`);
      if (res.data.success) {
        Alert.alert('Thành công', res.data.message);
        loadData();
      }
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Không cập nhật được đơn');
    } finally {
      setBusyId(null);
    }
  };

  const generateSlots = async (venue) => {
    setBusyId(`slots-${venue.id}`);
    try {
      const courtsRes = await api.get(`/courts/venue/${venue.id}`);
      const courts = courtsRes.data.data || [];
      if (!courts.length) {
        Alert.alert('Chưa có sân con', 'Hãy tạo sân con trước khi mở lịch đặt.');
        return;
      }

      const startHour = Number((venue.open_time || '06:00:00').slice(0, 2));
      const endHour = Number((venue.close_time || '22:00:00').slice(0, 2));
      await Promise.all(courts.map((court) =>
        api.post(`/courts/${court.id}/slots/generate-range`, {
          start_date: todayISO(),
          end_date: addDaysISO(13),
          start_hour: startHour,
          end_hour: endHour,
        })
      ));
      Alert.alert('Đã mở lịch', `Đã tạo lịch 14 ngày cho ${courts.length} sân con.`);
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Không tạo được lịch');
    } finally {
      setBusyId(null);
    }
  };

  const stats = {
    venueCount: venues.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    revenue: bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + Number(b.total_price || 0), 0),
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
            <Text style={styles.headerTitle}>Quản lý chủ sân</Text>
            <TouchableOpacity style={styles.backBtn} onPress={loadData}>
              <Ionicons name="refresh" size={22} color="#10B981" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#10B981" size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.statsGrid}>
            <StatCard icon="business" label="Cụm sân" value={stats.venueCount} />
            <StatCard icon="timer" label="Chờ xử lý" value={stats.pending} />
            <StatCard icon="checkmark-circle" label="Đã xác nhận" value={stats.confirmed} />
            <StatCard icon="cash" label="Doanh thu" value={`${formatMoney(stats.revenue)}đ`} wide />
          </View>

          <SectionTitle title="Sân của tôi" />
          {venues.map((venue) => (
            <TouchableOpacity key={venue.id} style={styles.card} onPress={() => navigation.navigate('OwnerVenueDetail', { venue })}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{venue.name}</Text>
                  <Text style={styles.cardSub} numberOfLines={1}>{venue.address}</Text>
                  <Text style={styles.cardSub}>{venue.court_count || 0} sân con · {venue.is_active ? 'Đang hoạt động' : 'Chờ duyệt'}</Text>
                </View>
                <TouchableOpacity style={styles.smallBtn} onPress={() => generateSlots(venue)} disabled={busyId === `slots-${venue.id}`}>
                  {busyId === `slots-${venue.id}` ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.smallBtnText}>Mở lịch</Text>}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
          {!venues.length && <EmptyText text="Bạn chưa có sân nào. Tạo sân qua API hoặc web admin để bắt đầu." />}

          <SectionTitle title="Đơn đặt gần đây" />
          {bookings.map((booking) => {
            const meta = statusMeta[booking.status] || { label: booking.status, color: '#94A3B8' };
            return (
              <View key={booking.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>#{booking.booking_code} · {booking.court_name}</Text>
                    <Text style={styles.cardSub}>{booking.user_name} · {booking.user_phone || 'Chưa có SĐT'}</Text>
                    <Text style={styles.cardSub}>{booking.slot_date} · {booking.start_time?.slice(0,5)} - {booking.end_time?.slice(0,5)}</Text>
                  </View>
                  <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                </View>
                <View style={styles.bookingFooter}>
                  <Text style={styles.money}>{formatMoney(booking.total_price)}đ</Text>
                  <View style={styles.actions}>
                    {booking.status === 'pending' && (
                      <TouchableOpacity style={styles.actionBtn} onPress={() => updateBooking(booking.id, 'confirm')} disabled={busyId === `confirm-${booking.id}`}>
                        <Text style={styles.actionText}>Xác nhận</Text>
                      </TouchableOpacity>
                    )}
                    {booking.status === 'confirmed' && (
                      <TouchableOpacity style={styles.actionBtn} onPress={() => updateBooking(booking.id, 'complete')} disabled={busyId === `complete-${booking.id}`}>
                        <Text style={styles.actionText}>Hoàn thành</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
          {!bookings.length && <EmptyText text="Chưa có đơn đặt nào." />}
        </ScrollView>
      )}
    </View>
  );
};

const StatCard = ({ icon, label, value, wide }) => (
  <View style={[styles.statCard, wide && styles.statWide]}>
    <Ionicons name={icon} size={22} color="#10B981" />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const SectionTitle = ({ title }) => <Text style={styles.sectionTitle}>{title}</Text>;
const EmptyText = ({ text }) => <Text style={styles.emptyText}>{text}</Text>;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  headerGradient: { borderBottomLeftRadius: 35, borderBottomRightRadius: 35, paddingBottom: 25 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
  backBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 120 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { width: '48%', backgroundColor: '#1E293B', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  statWide: { width: '100%' },
  statValue: { color: '#FFF', fontSize: 22, fontWeight: '900', marginTop: 10 },
  statLabel: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginTop: 22, marginBottom: 14 },
  card: { backgroundColor: '#1E293B', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardTitle: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  cardSub: { color: '#94A3B8', fontSize: 12, marginTop: 5 },
  smallBtn: { backgroundColor: '#10B981', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, minWidth: 76, alignItems: 'center' },
  smallBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  statusText: { fontSize: 12, fontWeight: '800', textAlign: 'right' },
  bookingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  money: { color: '#10B981', fontSize: 16, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { backgroundColor: 'rgba(16,185,129,0.14)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  actionText: { color: '#10B981', fontSize: 12, fontWeight: '800' },
  emptyText: { color: '#64748B', textAlign: 'center', padding: 18, lineHeight: 20 },
});

export default OwnerDashboardScreen;
