import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, StatusBar, Dimensions } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const PaymentQRScreen = ({ route, navigation }) => {
  const { bookingData } = route.params;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Thanh toán VietQR</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.successIcon}>
          <LinearGradient colors={['#10B981', '#059669']} style={styles.iconCircle}>
            <Ionicons name="checkmark" size={40} color="#FFF" />
          </LinearGradient>
        </View>
        <Text style={styles.successTitle}>Đặt chỗ thành công!</Text>
        <Text style={styles.successSubtitle}>Vui lòng quét mã QR dưới đây để hoàn tất</Text>

        <View style={styles.qrCard}>
          <Image 
            source={{ uri: bookingData.payment.qrImageBase64 || 'https://api.vietqr.io/image/970415-0852522818-compact.jpg?amount=' + bookingData.payment.amount + '&addInfo=' + encodeURIComponent(bookingData.payment.transfer_content) }} 
            style={styles.qrImage} 
            resizeMode="contain"
          />
          <View style={styles.divider} />
          
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Số tiền</Text>
              <Text style={styles.infoValueHighlight}>
                {new Intl.NumberFormat('vi-VN').format(bookingData.payment.amount)}đ
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngân hàng</Text>
              <Text style={styles.infoValue}>{bookingData.payment.bank_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nội dung</Text>
              <Text style={styles.infoValue}>{bookingData.payment.transfer_content}</Text>
            </View>
          </View>
        </View>

        <View style={styles.warningCard}>
          <Ionicons name="alert-circle" size={24} color="#F59E0B" />
          <Text style={styles.warningText}>
            Lưu ý: Bạn có 15 phút để hoàn tất. Vui lòng ghi đúng nội dung để hệ thống tự động xác nhận.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() =>
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'MainTabs', params: { screen: 'HomeTab' } }],
              })
            )
          }
        >
          <LinearGradient colors={['#10B981', '#059669']} style={styles.btnGradient}>
            <Text style={styles.homeBtnText}>Quay về Trang chủ</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() =>
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'MainTabs', params: { screen: 'ProfileTab' } }],
              })
            )
          }
        >
          <Text style={styles.historyBtnText}>Xem lịch sử đơn đặt</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  headerGradient: { borderBottomLeftRadius: 35, borderBottomRightRadius: 35, paddingBottom: 25 },
  header: { paddingHorizontal: 20, paddingTop: 10, alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 25, alignItems: 'center', paddingBottom: 50 },
  successIcon: { marginBottom: 15 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF', marginBottom: 8 },
  successSubtitle: { fontSize: 14, color: '#94A3B8', marginBottom: 30, textAlign: 'center' },
  qrCard: { width: '100%', backgroundColor: '#FFF', borderRadius: 25, padding: 25, alignItems: 'center' },
  qrImage: { width: 220, height: 220 },
  divider: { width: '100%', height: 1, backgroundColor: '#E5E7EB', marginVertical: 20, borderStyle: 'dashed' },
  infoBox: { width: '100%' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  infoLabel: { fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 14, fontWeight: 'bold', color: '#111827', maxWidth: '60%', textAlign: 'right' },
  infoValueHighlight: { fontSize: 20, fontWeight: '900', color: '#10B981' },
  warningCard: { flexDirection: 'row', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 20, borderRadius: 20, marginTop: 25, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)' },
  warningText: { flex: 1, marginLeft: 12, fontSize: 13, color: '#F59E0B', lineHeight: 20 },
  homeBtn: { width: '100%', marginTop: 35, borderRadius: 18, overflow: 'hidden' },
  btnGradient: { paddingVertical: 18, alignItems: 'center' },
  homeBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  historyBtn: { marginTop: 20, padding: 10 },
  historyBtnText: { color: '#10B981', fontWeight: 'bold', fontSize: 15 }
});

export default PaymentQRScreen;
