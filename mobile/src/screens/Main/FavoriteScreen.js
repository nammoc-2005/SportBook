import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api, { API_ORIGIN } from '../../api/axios';

const FavoriteScreen = ({ navigation }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => { fetchFavorites(); });
    return unsubscribe;
  }, [navigation]);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const res = await api.get('/favorites');
      if (res.data.success) setFavorites(res.data.data);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  };

  const renderCard = ({ item }) => {
    const coverUrl = item.cover_image?.startsWith('http')
      ? item.cover_image
      : item.cover_image
        ? `${API_ORIGIN}${item.cover_image}`
        : 'https://images.unsplash.com/photo-1595435064219-c80ce5444206?q=80&w=400';

    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('VenueDetail', { venueId: item.id })}
      >
        <Image source={{ uri: coverUrl }} style={styles.cardImg} />
        <LinearGradient colors={['transparent', 'rgba(15,23,42,0.9)']} style={styles.overlay} />
        <View style={styles.cardInfo}>
          <Text style={styles.venueName}>{item.name}</Text>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={12} color="#94A3B8" />
            <Text style={styles.addr} numberOfLines={1}>{item.address}</Text>
          </View>
        </View>
        <View style={styles.favBadge}>
          <Ionicons name="heart" size={16} color="#F43F5E" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={28} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Sân yêu thích</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#10B981" /></View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={item => item.id.toString()}
          renderItem={renderCard}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="heart-dislike-outline" size={80} color="#1E293B" />
              <Text style={styles.emptyText}>Chưa có sân nào trong danh sách yêu thích</Text>
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
  listContent: { padding: 20 },
  columnWrapper: { justifyContent: 'space-between' },
  card: { width: '48%', height: 200, borderRadius: 25, overflow: 'hidden', marginBottom: 20, backgroundColor: '#1E293B' },
  cardImg: { width: '100%', height: '100%' },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' },
  cardInfo: { position: 'absolute', bottom: 15, left: 15, right: 15 },
  venueName: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  addr: { color: '#94A3B8', fontSize: 11, flex: 1, marginLeft: 4 },
  favBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.1)', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#475569', fontSize: 15, marginTop: 20, textAlign: 'center', paddingHorizontal: 40 }
});

export default FavoriteScreen;
