import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const PaymentQRScreen = ({ route, navigation }) => {
  const { bookingData } = route.params;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thanh toán VietQR</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={60} color="#10B981" />
        </View>
        <Text style={styles.successTitle}>Đặt sân thành công!</Text>
        <Text style={styles.successSubtitle}>Vui lòng quét mã QR dưới đây để thanh toán</Text>

        <View style={styles.qrCard}>
          <Image 
            source={{ uri: bookingData.payment.qrImageBase64 }} 
            style={styles.qrImage} 
            resizeMode="contain"
          />
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Số tiền:</Text>
            <Text style={styles.infoValueHighlight}>
              {new Intl.NumberFormat('vi-VN').format(bookingData.payment.amount)}đ
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ngân hàng:</Text>
            <Text style={styles.infoValue}>{bookingData.payment.bank_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Số TK:</Text>
            <Text style={styles.infoValue}>{bookingData.payment.bank_account}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nội dung:</Text>
            <Text style={styles.infoValue}>{bookingData.payment.transfer_content}</Text>
          </View>
        </View>

        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={20} color="#D97706" />
          <Text style={styles.warningText}>
            Lưu ý: Bạn có 15 phút để hoàn tất thanh toán. Vui lòng ghi chính xác nội dung chuyển khoản để hệ thống tự động xác nhận.
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
          <Text style={styles.homeBtnText}>Quay về Trang chủ</Text>
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
          <Text style={styles.historyBtnText}>Xem lịch sử đặt sân</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { padding: 15, alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  
  scrollContent: { padding: 20, alignItems: 'center' },
  successIcon: { marginTop: 10, marginBottom: 10 },
  successTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 5 },
  successSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 30, textAlign: 'center' },
  
  qrCard: { width: '100%', backgroundColor: '#FFF', borderRadius: 16, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  qrImage: { width: 250, height: 250 },
  divider: { width: '100%', height: 1, backgroundColor: '#E5E7EB', marginVertical: 20, borderStyle: 'dashed' },
  
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 10 },
  infoLabel: { fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  infoValueHighlight: { fontSize: 18, fontWeight: 'bold', color: '#10B981' },
  
  warningContainer: { flexDirection: 'row', backgroundColor: '#FEF3C7', padding: 15, borderRadius: 8, marginTop: 20, alignItems: 'flex-start' },
  warningText: { flex: 1, marginLeft: 10, fontSize: 13, color: '#D97706', lineHeight: 20 },
  
  homeBtn: { width: '100%', backgroundColor: '#10B981', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 30 },
  homeBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  
  historyBtn: { width: '100%', backgroundColor: 'transparent', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  historyBtnText: { color: '#10B981', fontWeight: '600', fontSize: 16 }
});

export default PaymentQRScreen;
