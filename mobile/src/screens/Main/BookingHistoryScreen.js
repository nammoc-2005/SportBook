import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';

const BookingHistoryScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Add listener to refresh when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchBookings();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings/my');
      if (res.data.success) {
        setBookings(res.data.data);
      }
    } catch (error) {
      console.log('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return { color: '#D97706', bg: '#FEF3C7', label: 'Chờ duyệt' };
      case 'confirmed': return { color: '#2563EB', bg: '#DBEAFE', label: 'Đã xác nhận' };
      case 'completed': return { color: '#10B981', bg: '#D1FAE5', label: 'Hoàn thành' };
      case 'cancelled': return { color: '#EF4444', bg: '#FEE2E2', label: 'Đã hủy' };
      default: return { color: '#6B7280', bg: '#F3F4F6', label: 'Không rõ' };
    }
  };

  const formatTime = (time) => time ? time.slice(0, 5) : '';

  const renderBookingCard = ({ item }) => {
    const statusInfo = getStatusColor(item.status);
    const coverUrl = item.venue_image 
      ? item.venue_image.replace('localhost', '192.168.1.107') 
      : 'https://via.placeholder.com/100?text=Sân';

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => {
          if (item.status === 'pending') {
            navigation.navigate('PaymentQR', { 
              bookingData: { 
                payment: { 
                  amount: item.total_price, 
                  bank_name: 'Vietinbank', // Should ideally come from API, fallback for demo
                  bank_account: '0852522818',
                  transfer_content: 'DAT SAN ' + item.booking_code,
                  qrImageBase64: '' // Handled inside or refetch
                } 
              } 
            });
          }
        }}
        disabled={item.status !== 'pending'}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.bookingCode}>#{item.booking_code}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Image source={{ uri: coverUrl }} style={styles.venueImage} />
          <View style={styles.bookingInfo}>
            <Text style={styles.venueName} numberOfLines={1}>{item.venue_name}</Text>
            <Text style={styles.courtName}>{item.court_name} ({item.sport_type})</Text>
            <View style={styles.timeRow}>
              <Ionicons name="calendar-outline" size={14} color="#6B7280" />
              <Text style={styles.timeText}>{item.slot_date}</Text>
            </View>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={14} color="#6B7280" />
              <Text style={styles.timeText}>{formatTime(item.start_time)} - {formatTime(item.end_time)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.totalLabel}>Tổng tiền:</Text>
          <Text style={styles.totalValue}>{new Intl.NumberFormat('vi-VN').format(item.total_price)}đ</Text>
        </View>

        {item.status === 'pending' && (
          <View style={styles.actionRow}>
            <Text style={styles.actionText}>Chạm để xem lại mã QR thanh toán</Text>
            <Ionicons name="chevron-forward" size={16} color="#10B981" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch sử đặt sân</Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={item => item.id.toString()}
          renderItem={renderBookingCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={60} color="#D1D5DB" />
              <Text style={styles.emptyText}>Bạn chưa có đơn đặt sân nào.</Text>
              <TouchableOpacity style={styles.bookNowBtn} onPress={() => navigation.navigate('HomeTab')}>
                <Text style={styles.bookNowText}>Đặt sân ngay</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { padding: 15, alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 15, paddingBottom: 30 },
  
  card: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 15, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  bookingCode: { fontSize: 14, fontWeight: 'bold', color: '#374151' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  
  cardBody: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  venueImage: { width: 70, height: 70, borderRadius: 8, backgroundColor: '#E5E7EB' },
  bookingInfo: { flex: 1, marginLeft: 15 },
  venueName: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 2 },
  courtName: { fontSize: 13, color: '#4B5563', marginBottom: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  timeText: { fontSize: 13, color: '#6B7280', marginLeft: 6 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#FAFAFA' },
  totalLabel: { fontSize: 14, color: '#4B5563' },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: '#10B981' },
  
  actionRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, backgroundColor: '#ECFDF5' },
  actionText: { fontSize: 13, color: '#10B981', fontWeight: '500', marginRight: 5 },
  
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#6B7280', fontSize: 16, marginTop: 15, marginBottom: 20 },
  bookNowBtn: { backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  bookNowText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 }
});

export default BookingHistoryScreen;
