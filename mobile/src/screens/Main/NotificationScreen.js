import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/axios';

const NotificationScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      if (res.data.success) setNotifications(res.data.data);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (e) { console.log(e); }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.notiCard, item.is_read ? styles.notiRead : styles.notiUnread]}
      onPress={() => markAsRead(item.id)}
      activeOpacity={0.8}
    >
      <View style={[styles.iconBox, { backgroundColor: item.is_read ? 'rgba(148, 163, 184, 0.1)' : 'rgba(16, 185, 129, 0.1)' }]}>
        <Ionicons 
          name={item.type === 'booking' ? 'calendar' : 'notifications'} 
          size={20} 
          color={item.is_read ? '#94A3B8' : '#10B981'} 
        />
      </View>
      <View style={styles.notiContent}>
        <Text style={[styles.notiTitle, { color: item.is_read ? '#94A3B8' : '#FFF' }]}>{item.title}</Text>
        <Text style={styles.notiMsg} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.notiTime}>{new Date(item.created_at).toLocaleString('vi-VN')}</Text>
      </View>
      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={28} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Thông báo</Text>
            <TouchableOpacity onPress={fetchNotifications}>
              <Ionicons name="refresh" size={24} color="#10B981" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#10B981" /></View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={80} color="#1E293B" />
              <Text style={styles.emptyText}>Bạn chưa có thông báo nào</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  headerGradient: { borderBottomLeftRadius: 35, borderBottomRightRadius: 35, paddingBottom: 25 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 25 },
  notiCard: { flexDirection: 'row', padding: 18, borderRadius: 22, marginBottom: 15, borderWidth: 1, alignItems: 'center', position: 'relative' },
  notiUnread: { backgroundColor: '#1E293B', borderColor: 'rgba(16, 185, 129, 0.2)' },
  notiRead: { backgroundColor: 'rgba(30, 41, 59, 0.5)', borderColor: 'transparent' },
  iconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  notiContent: { flex: 1 },
  notiTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  notiMsg: { color: '#64748B', fontSize: 13, lineHeight: 18 },
  notiTime: { color: '#475569', fontSize: 11, marginTop: 6 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', position: 'absolute', top: 18, right: 18 },
  empty: { flex: 1, alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#475569', fontSize: 16, marginTop: 20 }
});

export default NotificationScreen;
