import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, StatusBar, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api, { API_ORIGIN } from '../../api/axios';

const BookingHistoryScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => { fetchBookings(); });
    return unsubscribe;
  }, [navigation]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bookings/my');
      if (res.data.success) setBookings(res.data.data);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  };

  const handleReview = async () => {
    if (!selectedBooking) return;
    setSubmitting(true);
    try {
      const res = await api.post('/reviews', {
        venue_id: selectedBooking.venue_id,
        booking_id: selectedBooking.id,
        rating,
        comment
      });
      if (res.data.success) {
        Alert.alert('Thành công', 'Cảm ơn bạn đã đánh giá!');
        setReviewModal(false);
        fetchBookings();
      }
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Gửi đánh giá thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending': return { label: 'Chờ thanh toán', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' };
      case 'confirmed': return { label: 'Đã xác nhận', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' };
      case 'completed': return { label: 'Hoàn thành', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' };
      case 'cancelled': return { label: 'Đã hủy', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' };
      default: return { label: 'Không rõ', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.1)' };
    }
  };

  const renderBookingCard = ({ item }) => {
    const status = getStatusInfo(item.status);
    const coverUrl = item.venue_image?.startsWith('http')
      ? item.venue_image
      : item.venue_image
        ? `${API_ORIGIN}${item.venue_image}`
        : 'https://images.unsplash.com/photo-1595435064219-c80ce5444206?q=80&w=200';

    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => {
          if (item.status === 'pending') {
            navigation.navigate('PaymentQR', { 
              bookingData: { 
                bookingId: item.id,
                bookingCode: item.booking_code,
                payment: { 
                  amount: item.total_price, 
                  description: 'DAT SAN ' + item.booking_code,
                  qrImageBase64: '' 
                } 
              } 
            });
          }
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.codeBox}>
            <Text style={styles.bookingCode}>#{item.booking_code}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Image source={{ uri: coverUrl }} style={styles.venueImage} />
          <View style={styles.infoCol}>
            <Text style={styles.venueName} numberOfLines={1}>{item.venue_name}</Text>
            <Text style={styles.courtName}>{item.court_name}</Text>
            <View style={styles.timeRow}>
              <Ionicons name="calendar-outline" size={14} color="#64748B" />
              <Text style={styles.timeText}>{item.slot_date}</Text>
              <Ionicons name="time-outline" size={14} color="#64748B" style={{ marginLeft: 12 }} />
              <Text style={styles.timeText}>{item.start_time.slice(0,5)} - {item.end_time.slice(0,5)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.totalLabel}>Tổng tiền</Text>
          <Text style={styles.totalValue}>{new Intl.NumberFormat('vi-VN').format(item.total_price)}đ</Text>
        </View>
        
        {item.status === 'pending' && (
          <LinearGradient colors={['rgba(16, 185, 129, 0.1)', 'transparent']} style={styles.actionPrompt}>
             <Text style={styles.actionText}>Chạm để thanh toán ngay</Text>
             <Ionicons name="arrow-forward" size={16} color="#10B981" />
          </LinearGradient>
        )}

        {item.status === 'completed' && !item.is_reviewed && (
          <TouchableOpacity 
            style={styles.reviewBtn} 
            onPress={() => {
              setSelectedBooking(item);
              setReviewModal(true);
            }}
          >
            <Text style={styles.reviewBtnText}>Viết đánh giá</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Lịch sử đặt chỗ</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#10B981" /></View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={item => item.id.toString()}
          renderItem={renderBookingCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={80} color="#1E293B" />
              <Text style={styles.emptyText}>Bạn chưa có đơn đặt chỗ nào</Text>
              <TouchableOpacity style={styles.bookBtn} onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })}>
                <LinearGradient colors={['#10B981', '#059669']} style={styles.bookBtnInner}>
                   <Text style={styles.bookBtnText}>Khám phá ngay</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <Modal visible={reviewModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Đánh giá trải nghiệm</Text>
            <Text style={styles.modalVenue}>{selectedBooking?.venue_name}</Text>
            
            <View style={styles.ratingRow}>
              {[1,2,3,4,5].map(s => (
                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                  <Ionicons name={s <= rating ? "star" : "star-outline"} size={36} color="#FBBF24" />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Chia sẻ cảm nhận của bạn về sân..."
              placeholderTextColor="#64748B"
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setReviewModal(false)}>
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleReview} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Gửi đánh giá</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  headerGradient: { borderBottomLeftRadius: 35, borderBottomRightRadius: 35, paddingBottom: 25 },
  header: { paddingHorizontal: 20, paddingTop: 10, alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 25, paddingBottom: 100 },
  card: { backgroundColor: '#1E293B', borderRadius: 25, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  codeBox: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  bookingCode: { color: '#CBD5E1', fontSize: 12, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  cardBody: { flexDirection: 'row', padding: 18 },
  venueImage: { width: 70, height: 70, borderRadius: 15, backgroundColor: '#0F172A' },
  infoCol: { flex: 1, marginLeft: 15 },
  venueName: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  courtName: { color: '#94A3B8', fontSize: 13, marginBottom: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  timeText: { color: '#64748B', fontSize: 12, marginLeft: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, backgroundColor: 'rgba(255,255,255,0.01)' },
  totalLabel: { color: '#64748B', fontSize: 13 },
  totalValue: { color: '#10B981', fontSize: 18, fontWeight: 'bold' },
  actionPrompt: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12 },
  actionText: { color: '#10B981', fontSize: 13, fontWeight: 'bold', marginRight: 8 },
  reviewBtn: { backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)' },
  reviewBtnText: { color: '#10B981', fontWeight: 'bold', fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1E293B', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 30 },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  modalVenue: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 25 },
  ratingRow: { flexDirection: 'row', justifyContent: 'center', gap: 15, marginBottom: 25 },
  modalInput: { backgroundColor: '#0F172A', borderRadius: 20, padding: 20, color: '#FFF', height: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 25 },
  modalButtons: { flexDirection: 'row', gap: 15 },
  cancelBtn: { flex: 1, paddingVertical: 15, alignItems: 'center', borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)' },
  cancelText: { color: '#94A3B8', fontWeight: 'bold' },
  submitBtn: { flex: 2, paddingVertical: 15, alignItems: 'center', borderRadius: 15, backgroundColor: '#10B981' },
  submitText: { color: '#FFF', fontWeight: 'bold' },

  empty: { flex: 1, alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#475569', fontSize: 16, marginTop: 20, marginBottom: 30 },
  bookBtn: { borderRadius: 15, overflow: 'hidden' },
  bookBtnInner: { paddingHorizontal: 30, paddingVertical: 12 },
  bookBtnText: { color: '#FFF', fontWeight: 'bold' }
});

export default BookingHistoryScreen;
