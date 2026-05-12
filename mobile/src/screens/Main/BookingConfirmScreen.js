import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
        navigation.replace('PaymentQR', { bookingData: res.data.data });
      }
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Đặt sân thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={28} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Xác nhận đặt chỗ</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin sân</Text>
          <View style={styles.card}>
            <View style={styles.venueRow}>
              <View style={styles.iconBox}><Ionicons name="location" size={20} color="#10B981" /></View>
              <View>
                <Text style={styles.venueName}>{venue.name}</Text>
                <Text style={styles.courtName}>{court.name} • {court.sport_type}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={styles.infoCol}>
                <Text style={styles.label}>Ngày chơi</Text>
                <Text style={styles.value}>{slot.slot_date}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.label}>Thời gian</Text>
                <Text style={styles.value}>{slot.start_time.slice(0,5)} - {slot.end_time.slice(0,5)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mã giảm giá</Text>
          <View style={styles.promoContainer}>
            <TextInput
              style={styles.promoInput}
              placeholder="Nhập mã ưu đãi..."
              placeholderTextColor="#64748B"
              value={promoCode}
              onChangeText={setPromoCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.applyBtn} onPress={handleVerifyPromo} disabled={verifyingPromo}>
              {verifyingPromo ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.applyText}>Áp dụng</Text>}
            </TouchableOpacity>
          </View>
          {promoData && (
            <Text style={styles.promoSuccess}>
              Giảm {promoData.discount_pct ? `${promoData.discount_pct}%` : `${new Intl.NumberFormat('vi-VN').format(promoData.discount_amt)}đ`}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ghi chú (Tùy chọn)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Ví dụ: Cần mượn thêm vợt, nước uống..."
            placeholderTextColor="#64748B"
            multiline
            numberOfLines={3}
            value={note}
            onChangeText={setNote}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chi tiết thanh toán</Text>
          <View style={styles.card}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Tạm tính</Text>
              <Text style={styles.paymentValue}>{new Intl.NumberFormat('vi-VN').format(basePrice)}đ</Text>
            </View>
            {discountAmt > 0 && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Giảm giá</Text>
                <Text style={styles.discountValue}>-{new Intl.NumberFormat('vi-VN').format(discountAmt)}đ</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.paymentRow}>
              <Text style={styles.totalLabel}>Tổng cộng</Text>
              <Text style={styles.totalValue}>{new Intl.NumberFormat('vi-VN').format(finalPrice)}đ</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Tổng thanh toán</Text>
          <Text style={styles.footerValue}>{new Intl.NumberFormat('vi-VN').format(finalPrice)}đ</Text>
        </View>
        <TouchableOpacity style={styles.payBtn} disabled={loading} onPress={handlePayment}>
          <LinearGradient colors={['#10B981', '#059669']} style={styles.payBtnInner}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.payBtnText}>Đặt sân ngay</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  headerGradient: { borderBottomLeftRadius: 35, borderBottomRightRadius: 35, paddingBottom: 25 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  scrollContent: { padding: 25, paddingBottom: 120 },
  section: { marginBottom: 25 },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  card: { backgroundColor: '#1E293B', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  venueRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 45, height: 45, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  venueName: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  courtName: { color: '#64748B', fontSize: 13, marginTop: 4 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 15 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoCol: { flex: 1 },
  label: { color: '#64748B', fontSize: 12, marginBottom: 6 },
  value: { color: '#CBD5E1', fontSize: 15, fontWeight: 'bold' },
  promoContainer: { flexDirection: 'row' },
  promoInput: { flex: 1, backgroundColor: '#1E293B', height: 55, borderRadius: 15, paddingHorizontal: 20, color: '#FFF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  applyBtn: { backgroundColor: '#10B981', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 15, marginLeft: 12 },
  applyText: { color: '#FFF', fontWeight: 'bold' },
  promoSuccess: { color: '#10B981', fontSize: 13, marginTop: 8, fontWeight: '600' },
  noteInput: { backgroundColor: '#1E293B', borderRadius: 15, padding: 15, color: '#FFF', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', textAlignVertical: 'top' },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  paymentLabel: { color: '#94A3B8', fontSize: 14 },
  paymentValue: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  discountValue: { color: '#EF4444', fontSize: 14, fontWeight: 'bold' },
  totalLabel: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  totalValue: { color: '#10B981', fontSize: 20, fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#1E293B', paddingHorizontal: 25, paddingVertical: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  footerLabel: { color: '#94A3B8', fontSize: 12, marginBottom: 4 },
  footerValue: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  payBtn: { borderRadius: 18, overflow: 'hidden' },
  payBtnInner: { paddingHorizontal: 30, paddingVertical: 15, alignItems: 'center' },
  payBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});

export default BookingConfirmScreen;
