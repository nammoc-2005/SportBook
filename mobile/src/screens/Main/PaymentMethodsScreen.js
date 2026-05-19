import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const PaymentMethodsScreen = ({ navigation }) => {
  const [activeCard, setActiveCard] = useState('card1');
  const scaleAnim = new Animated.Value(1);

  const handlePressCard = (id) => {
    setActiveCard(id);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true })
    ]).start();
  };

  const cards = [
    { id: 'card1', type: 'VISA', number: '**** **** **** 4242', balance: '24,500,000 đ', gradient: ['#1E293B', '#0F172A'], border: '#3B82F6', icon: 'logo-visa' },
    { id: 'card2', type: 'MasterCard', number: '**** **** **** 8888', balance: '8,250,000 đ', gradient: ['#1E293B', '#0F172A'], border: '#F59E0B', icon: 'card-outline' }
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Phương thức thanh toán</Text>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="receipt-outline" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Tổng số dư khả dụng</Text>
          <Text style={styles.summaryAmount}>32,750,000 đ</Text>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={14} color="#10B981" />
            <Text style={styles.badgeText}>Được bảo mật an toàn 100%</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>THẺ & TÀI KHOẢN CỦA BẠN</Text>
        
        {cards.map((card) => {
          const isActive = activeCard === card.id;
          return (
            <TouchableOpacity 
              key={card.id} 
              activeOpacity={0.9} 
              onPress={() => handlePressCard(card.id)}
            >
              <Animated.View style={[styles.cardWrapper, isActive && { transform: [{ scale: scaleAnim }] }]}>
                <LinearGradient colors={isActive ? ['#2563EB', '#1D4ED8'] : card.gradient} style={[styles.cardGradient, isActive && styles.cardActiveBorder]}>
                  <View style={styles.cardHeader}>
                    <Ionicons name={card.icon} size={28} color="#FFF" />
                    <Ionicons name="radio-outline" size={24} color="rgba(255,255,255,0.5)" />
                  </View>
                  <Text style={styles.cardNumber}>{card.number}</Text>
                  <View style={styles.cardFooter}>
                    <View>
                      <Text style={styles.cardLabel}>Số dư</Text>
                      <Text style={styles.cardBalance}>{card.balance}</Text>
                    </View>
                    {isActive && (
                      <View style={styles.activeCheck}>
                        <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </Animated.View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.otherMethods}>
          <Text style={styles.sectionTitle}>PHƯƠNG THỨC KHÁC</Text>
          <TouchableOpacity style={styles.methodRow} activeOpacity={0.7}>
            <View style={styles.methodLeft}>
              <View style={[styles.methodIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="cash-outline" size={22} color="#10B981" />
              </View>
              <Text style={styles.methodText}>Thanh toán tại sân (Tiền mặt)</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#475569" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.methodRow} activeOpacity={0.7}>
            <View style={styles.methodLeft}>
              <View style={[styles.methodIcon, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
                <Ionicons name="wallet-outline" size={22} color="#EC4899" />
              </View>
              <Text style={styles.methodText}>Ví MoMo</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#475569" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addCardBtn} activeOpacity={0.8}>
          <LinearGradient colors={['rgba(59, 130, 246, 0.1)', 'rgba(37, 99, 235, 0.05)']} style={styles.addCardGradient}>
            <Ionicons name="add" size={24} color="#3B82F6" />
            <Text style={styles.addCardText}>Thêm thẻ ngân hàng mới</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20, paddingBottom: 40 },
  summaryBox: { alignItems: 'center', marginBottom: 35, marginTop: 10 },
  summaryTitle: { color: '#94A3B8', fontSize: 14, marginBottom: 5 },
  summaryAmount: { color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 12, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' },
  badgeText: { color: '#10B981', fontSize: 12, fontWeight: '600', marginLeft: 6 },
  sectionTitle: { color: '#475569', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 15, letterSpacing: 1.5, marginLeft: 5 },
  cardWrapper: { marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 },
  cardGradient: { borderRadius: 24, padding: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardActiveBorder: { borderColor: '#60A5FA', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardNumber: { color: '#FFF', fontSize: 22, letterSpacing: 3, fontWeight: '600', fontFamily: 'monospace', marginBottom: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 4 },
  cardBalance: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  activeCheck: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  otherMethods: { marginTop: 10, marginBottom: 25 },
  methodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1E293B', padding: 15, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  methodLeft: { flexDirection: 'row', alignItems: 'center' },
  methodIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  methodText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  addCardBtn: { width: '100%' },
  addCardGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)', borderStyle: 'dashed' },
  addCardText: { color: '#3B82F6', fontSize: 16, fontWeight: 'bold', marginLeft: 10 }
});

export default PaymentMethodsScreen;

