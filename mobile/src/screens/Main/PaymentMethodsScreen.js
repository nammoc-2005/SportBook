import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const PaymentMethodsScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thanh toán</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.emptyContainer}>
          <Ionicons name="card-outline" size={80} color="#334155" />
          <Text style={styles.emptyTitle}>Chưa có thẻ nào</Text>
          <Text style={styles.emptyDesc}>Thêm thẻ tín dụng hoặc thẻ ghi nợ để thanh toán tiện lợi hơn cho các lần đặt sân sau.</Text>
        </View>

        <TouchableOpacity style={styles.addCardBtn}>
          <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.addCardGradient}>
            <Ionicons name="add-circle-outline" size={20} color="#FFF" />
            <Text style={styles.addCardText}>Thêm phương thức thanh toán</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 25, flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginBottom: 40 },
  emptyTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  emptyDesc: { color: '#94A3B8', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  addCardBtn: { width: '100%', marginTop: 20 },
  addCardGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  addCardText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 10 }
});

export default PaymentMethodsScreen;
