import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';

const BookingConfirmScreen = ({ route, navigation }) => {
  const { slot, court, venue } = route.params;
  const [promoCode, setPromoCode] = useState('');
  const [promoData, setPromoData] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyingPromo, setVerifyingPromo] = useState(false);

  const basePrice = slot.price_override || court.price_per_hour;
  const discountAmt = promoData 
    ? (promoData.discount_pct ? (basePrice * promoData.discount_pct / 100) : promoData.discount_amt)
    : 0;
  const finalPrice = Math.max(0, basePrice - discountAmt);

  const handleVerifyPromo = async () => {
    if (!promoCode) return;
    setVerifyingPromo(true);
    try {
      const res = await api.get(`/promotions/${promoCode.toUpperCase()}/validate?venue_id=${venue.id}`);
      if (res.data.success) {
        setPromoData(res.data.promo);
        Alert.alert('Thành công', 'Áp dụng mã giảm giá thành công!');
      }
    } catch (error) {
      setPromoData(null);
      Alert.alert('Lỗi', error.response?.data?.message || 'Mã giảm giá không hợp lệ');
    } finally {
      setVerifyingPromo(false);
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      const res = await api.post('/bookings', {
        slot_id: slot.id,
        promo_code: promoData ? promoData.code : null,
        note: note || null
      });

      if (res.data.success) {
        // Navigate to QR Payment screen
        navigation.replace('PaymentQR', { bookingData: res.data.data });
      }
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Đặt sân thất bại');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr) => timeStr.slice(0, 5);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận đặt sân</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin sân</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="location" size={20} color="#10B981" />
              <Text style={styles.venueName}>{venue.name}</Text>
            </View>
            <Text style={styles.courtName}>{court.name} ({court.sport_type})</Text>
            
            <View style={styles.divider} />
            
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Ngày chơi:</Text>
              <Text style={styles.value}>{slot.slot_date}</Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Thời gian:</Text>
              <Text style={styles.value}>{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mã giảm giá</Text>
          <View style={styles.promoContainer}>
            <TextInput
              style={styles.promoInput}
              placeholder="Nhập mã (VD: WELCOME20)"
              value={promoCode}
              onChangeText={setPromoCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity 
              style={styles.applyBtn} 
              onPress={handleVerifyPromo}
              disabled={verifyingPromo}
            >
              {verifyingPromo ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.applyText}>Áp dụng</Text>}
            </TouchableOpacity>
          </View>
          {promoData && (
            <Text style={styles.promoSuccess}>Đã áp dụng mã: giảm {promoData.discount_pct ? `${promoData.discount_pct}%` : `${new Intl.NumberFormat('vi-VN').format(promoData.discount_amt)}đ`}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ghi chú cho chủ sân</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Ví dụ: Cần mượn thêm bóng..."
            multiline
            numberOfLines={3}
            value={note}
            onChangeText={setNote}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thanh toán</Text>
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Tạm tính:</Text>
              <Text style={styles.label}>{new Intl.NumberFormat('vi-VN').format(basePrice)}đ</Text>
            </View>
            {discountAmt > 0 && (
              <View style={styles.rowBetween}>
                <Text style={styles.label}>Giảm giá:</Text>
                <Text style={styles.discount}>-{new Intl.NumberFormat('vi-VN').format(discountAmt)}đ</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.rowBetween}>
              <Text style={styles.totalLabel}>Tổng cộng:</Text>
              <Text style={styles.totalValue}>{new Intl.NumberFormat('vi-VN').format(finalPrice)}đ</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.priceInfo}>
          <Text style={styles.totalLabel}>Tổng thanh toán</Text>
          <Text style={styles.totalValue}>{new Intl.NumberFormat('vi-VN').format(finalPrice)}đ</Text>
        </View>
        <TouchableOpacity 
          style={styles.continueBtn}
          disabled={loading}
          onPress={handlePayment}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.continueText}>Thanh toán ngay</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: '#111827' },
  
  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginBottom: 10 },
  
  card: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  venueName: { marginLeft: 8, fontSize: 16, fontWeight: 'bold', color: '#111827' },
  courtName: { marginLeft: 28, fontSize: 14, color: '#4B5563', marginBottom: 10 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  label: { fontSize: 14, color: '#6B7280' },
  value: { fontSize: 14, fontWeight: '600', color: '#111827' },
  
  promoContainer: { flexDirection: 'row' },
  promoInput: { flex: 1, backgroundColor: '#FFF', height: 48, borderRadius: 8, paddingHorizontal: 15, borderWidth: 1, borderColor: '#D1D5DB' },
  applyBtn: { backgroundColor: '#10B981', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 8, marginLeft: 10 },
  applyText: { color: '#FFF', fontWeight: 'bold' },
  promoSuccess: { color: '#10B981', fontSize: 12, marginTop: 5, fontWeight: '500' },
  
  noteInput: { backgroundColor: '#FFF', borderRadius: 8, padding: 15, borderWidth: 1, borderColor: '#D1D5DB', textAlignVertical: 'top' },
  
  discount: { fontSize: 14, color: '#EF4444', fontWeight: '600' },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#10B981' },
  
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  priceInfo: { flex: 1 },
  continueBtn: { backgroundColor: '#10B981', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 8, minWidth: 150, alignItems: 'center' },
  continueText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});

export default BookingConfirmScreen;
