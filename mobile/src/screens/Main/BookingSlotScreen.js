import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/axios';

const generateDays = (numDays) => {
  const days = [];
  const today = new Date();
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  for (let i = 0; i < numDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      dateStr: d.toISOString().split('T')[0],
      dayName: i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : dayNames[d.getDay()],
      dateNum: d.getDate(),
      month: d.getMonth() + 1
    });
  }
  return days;
};

const BookingSlotScreen = ({ route, navigation }) => {
  const { court, venue } = route.params;
  const [days] = useState(generateDays(14));
  const [selectedDate, setSelectedDate] = useState(days[0].dateStr);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => { fetchSlots(); }, [selectedDate]);

  const fetchSlots = async () => {
    setLoading(true);
    setSelectedSlot(null);
    try {
      const res = await api.get(`/courts/${court.id}/slots?date=${selectedDate}`);
      if (res.data.success) setSlots(res.data.data);
    } catch (e) {
      console.log(e);
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
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>{court.name}</Text>
              <Text style={styles.headerSubtitle}>{venue.name}</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
            {days.map((day, i) => {
              const active = selectedDate === day.dateStr;
              return (
                <TouchableOpacity 
                  key={i} 
                  style={[styles.dateCard, active && styles.dateCardActive]}
                  onPress={() => setSelectedDate(day.dateStr)}
                >
                  <Text style={[styles.dayText, active && styles.textActive]}>{day.dayName}</Text>
                  <Text style={[styles.dateText, active && styles.textActive]}>{day.dateNum}</Text>
                  {active && <View style={styles.activeDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Chọn khung giờ</Text>
          <View style={styles.legend}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#10B981' }]} /><Text style={styles.legendText}>Trống</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#334155' }]} /><Text style={styles.legendText}>Hết</Text></View>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 50 }} />
        ) : (
          <View style={styles.grid}>
            {slots.map((slot) => {
              const open = slot.status === 'open';
              const active = selectedSlot?.id === slot.id;
              return (
                <TouchableOpacity
                  key={slot.id}
                  disabled={!open}
                  style={[styles.slotCard, active && styles.slotCardActive, !open && styles.slotCardDisabled]}
                  onPress={() => setSelectedSlot(slot)}
                >
                  <Text style={[styles.slotTime, active && styles.textActive, !open && styles.textDisabled]}>
                    {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                  </Text>
                  <Text style={[styles.slotPrice, active && styles.textActive, !open && styles.textDisabled]}>
                    {new Intl.NumberFormat('vi-VN').format(slot.price_override || court.price_per_hour)}đ
                  </Text>
                  {active && <Ionicons name="checkmark-circle" size={16} color="#FFF" style={styles.checkIcon} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.totalLabel}>Giá tạm tính</Text>
          <Text style={styles.totalValue}>
            {selectedSlot ? new Intl.NumberFormat('vi-VN').format(selectedSlot.price_override || court.price_per_hour) + 'đ' : '0đ'}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.bookBtn, !selectedSlot && styles.bookBtnDisabled]}
          disabled={!selectedSlot}
          onPress={() => navigation.navigate('BookingConfirm', { slot: selectedSlot, court, venue })}
        >
          <Text style={styles.bookBtnText}>Tiếp tục</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
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
  headerInfo: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: '#94A3B8', fontSize: 13, marginTop: 2 },
  dateScroll: { marginTop: 25, paddingLeft: 20 },
  dateCard: { width: 65, height: 85, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  dateCardActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  dayText: { color: '#94A3B8', fontSize: 11, marginBottom: 6 },
  dateText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  textActive: { color: '#FFF' },
  activeDot: { position: 'absolute', bottom: 8, width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF' },
  scrollContent: { paddingHorizontal: 25, paddingTop: 30, paddingBottom: 120 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  legend: { flexDirection: 'row' },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginLeft: 15 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { color: '#64748B', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  slotCard: { width: '48%', backgroundColor: '#1E293B', borderRadius: 18, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', position: 'relative' },
  slotCardActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  slotCardDisabled: { opacity: 0.3 },
  slotTime: { color: '#FFF', fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  slotPrice: { color: '#10B981', fontSize: 13, fontWeight: '600' },
  textDisabled: { color: '#475569' },
  checkIcon: { position: 'absolute', top: 12, right: 12 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#1E293B', paddingHorizontal: 25, paddingVertical: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: 30, borderTopRightRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 20 },
  totalLabel: { color: '#94A3B8', fontSize: 12, marginBottom: 4 },
  totalValue: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  bookBtn: { backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 15, borderRadius: 18, shadowColor: '#10B981', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  bookBtnDisabled: { backgroundColor: '#334155', shadowOpacity: 0 },
  bookBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginRight: 10 }
});

export default BookingSlotScreen;
