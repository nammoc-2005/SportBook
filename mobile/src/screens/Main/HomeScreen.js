import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  ActivityIndicator, TextInput, ScrollView, Dimensions, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import api, { API_ORIGIN } from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const CATEGORIES = ['Tất cả', 'Cầu lông', 'Bóng đá', 'Pickleball', 'Tennis', 'Bóng rổ', 'Padel'];
const AREAS = ['Gần tôi', 'Hà Nội', 'Hồ Chí Minh'];

const HomeScreen = ({ navigation }) => {
  const { userInfo } = useContext(AuthContext);
  const [nearbyVenues, setNearbyVenues] = useState([]);
  const [allVenues, setAllVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [activeArea, setActiveArea] = useState('Gần tôi');
  const [userLocation, setUserLocation] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [initialLoad, setInitialLoad] = useState(true);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng,';
    if (h < 18) return 'Chào buổi chiều,';
    return 'Chào buổi tối,';
  };

  const fetchNearby = async (loc) => {
    try {
      let query = '/venues?limit=10&sort=nearest';
      if (loc) {
        query += `&lat=${loc.latitude}&lng=${loc.longitude}`;
      }
      const res = await api.get(query);
      if (res.data.success) setNearbyVenues(res.data.data.slice(0, 5));
    } catch (e) { console.log('fetchNearby error:', e); }
  };

  const fetchVenues = async (loc, category, area, search) => {
    setLoading(true);
    try {
      let query = '/venues?limit=30';
      if (category && category !== 'Tất cả') query += `&sport_type=${encodeURIComponent(category)}`;
      if (area === 'Hà Nội') query += '&city=Hà Nội';
      if (area === 'Hồ Chí Minh') query += '&city=Hồ Chí Minh';
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (loc) {
        query += `&lat=${loc.latitude}&lng=${loc.longitude}`;
        if (area === 'Gần tôi') query += '&sort=nearest';
      }
      const res = await api.get(query);
      if (res.data.success) setAllVenues(res.data.data);
    } catch (e) { console.log('fetchVenues error:', e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    // 1. Fetch immediately with default state to show UI fast
    fetchVenues(null, activeCategory, activeArea, searchText);
    fetchNearby(null);

    // 2. Try getting location in background
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          // Use getLastKnownPositionAsync for instant response, if null fallback to getCurrentPositionAsync
          let location = await Location.getLastKnownPositionAsync({});
          if (!location) {
             location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          }
          if (location) {
            setUserLocation(location.coords);
          }
          
          // Request high accuracy in background so the map's blue dot becomes precise later
          let accurateLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
          if (accurateLocation) {
            setUserLocation(accurateLocation.coords);
          }
        }
      } catch (e) {
        console.log('Location error:', e);
      }
    })();
  }, []);

  useEffect(() => {
    if (initialLoad) {
      setInitialLoad(false);
      return;
    }
    const timer = setTimeout(() => {
      fetchVenues(userLocation, activeCategory, activeArea, searchText);
      fetchNearby(userLocation);
    }, 500); // Debounce search
    return () => clearTimeout(timer);
  }, [userLocation, activeCategory, activeArea, searchText]);

  // Parse sport_types array -> lấy loại đầu tiên
  const getSportLabel = (item) => {
    const types = item.sport_types;
    if (Array.isArray(types) && types.length > 0) return types[0];
    if (typeof types === 'string' && types.startsWith('[')) {
      try {
        const parsed = JSON.parse(types);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      } catch {}
    }
    return item.sport_type || 'Thể thao';
  };

  // Tính khoảng cách (km) theo công thức Haversine
  const calcDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDistance = (item) => {
    if (!userLocation) return null;
    const d = calcDistance(
      userLocation.latitude, userLocation.longitude,
      parseFloat(item.latitude), parseFloat(item.longitude)
    );
    if (d === null) return null;
    return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
  };

  const getImageUrl = (item) =>
    item.cover_image?.startsWith('http')
      ? item.cover_image
      : item.cover_image
        ? `${API_ORIGIN}${item.cover_image}`
      : 'https://images.unsplash.com/photo-1551958219-acbc630e2914?q=80&w=800&auto=format&fit=crop';

  const formatPrice = (price) =>
    new Intl.NumberFormat('vi-VN').format(price || 0);

  /* ─── Nearby card (horizontal) ─── */
  const NearbyCard = ({ item }) => {
    const distance = formatDistance(item);
    const sport = getSportLabel(item);
    return (
      <TouchableOpacity
        style={styles.nearbyCard}
        onPress={() => navigation.navigate('VenueDetail', { venueId: item.id })}
        activeOpacity={0.88}
      >
        <Image source={{ uri: getImageUrl(item) }} style={styles.nearbyImage} />
        <LinearGradient
          colors={['transparent', 'rgba(15,23,42,0.95)']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.nearbyBadge}>
          <Text style={styles.nearbyBadgeText}>{sport}</Text>
        </View>
        {distance && (
          <View style={styles.distanceBadge}>
            <Ionicons name="navigate" size={10} color="#10B981" />
            <Text style={styles.distanceText}>{distance}</Text>
          </View>
        )}
        <View style={styles.nearbyInfo}>
          <Text style={styles.nearbyName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.nearbyMeta}>
            <Ionicons name="location-outline" size={11} color="#94A3B8" />
            <Text style={styles.nearbyAddr} numberOfLines={1}>{item.address}</Text>
          </View>
          <View style={styles.nearbyFooter}>
            <View style={styles.nearbyRating}>
              <Ionicons name="star" size={11} color="#FBBF24" />
              <Text style={styles.nearbyRatingText}>{item.avg_rating || '4.8'}</Text>
            </View>
            <Text style={styles.nearbyPrice}>{formatPrice(item.min_price)}đ/h</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /* ─── Main venue card (vertical) ─── */
  const VenueCard = ({ item }) => {
    const distance = formatDistance(item);
    const sport = getSportLabel(item);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('VenueDetail', { venueId: item.id })}
        activeOpacity={0.9}
      >
        <Image source={{ uri: getImageUrl(item) }} style={styles.cardImage} />
        <LinearGradient
          colors={['transparent', 'rgba(15,23,42,0.97)']}
          style={styles.cardOverlay}
        />
        <View style={styles.sportBadge}>
          <Text style={styles.sportBadgeText}>{sport}</Text>
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardHeader}>
            <Text style={styles.venueName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#FBBF24" />
              <Text style={styles.ratingText}>{item.avg_rating || '4.8'}</Text>
            </View>
          </View>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={13} color="#64748B" />
            <Text style={styles.venueAddress} numberOfLines={1}>{item.address}</Text>
            {distance && (
              <View style={styles.cardDistanceBadge}>
                <Ionicons name="navigate" size={10} color="#10B981" />
                <Text style={styles.cardDistanceText}>{distance}</Text>
              </View>
            )}
          </View>
          <View style={styles.cardFooter}>
            <View style={styles.priceTag}>
              <Text style={styles.priceValue}>{formatPrice(item.min_price)}đ</Text>
              <Text style={styles.priceUnit}>/giờ</Text>
            </View>
            <TouchableOpacity
              style={styles.btnAction}
              onPress={() => navigation.navigate('VenueDetail', { venueId: item.id })}
            >
              <Text style={styles.btnActionText}>Đặt ngay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredVenues = allVenues;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />

      {/* ─── Header ─── */}
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.welcomeText}>{getGreeting()}</Text>
              <Text style={styles.userName} numberOfLines={1}>
                {userInfo?.name || 'Vận động viên'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.headerIcon} 
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={24} color="#FFF" />
              <View style={styles.badge} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileBtn}
              onPress={() => navigation.navigate('ProfileTab')}
            >
              <Image
                source={{
                  uri: userInfo?.avatar?.includes('http')
                    ? userInfo.avatar
                    : userInfo?.avatar
                      ? `${API_ORIGIN}${userInfo.avatar}`
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo?.name || 'U')}&background=10B981&color=fff`
                }}
                style={styles.avatar}
              />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Bạn muốn chơi ở đâu hôm nay?"
              placeholderTextColor="#64748B"
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={18} color="#475569" />
              </TouchableOpacity>
            )}
            <View style={styles.divider} />
            <TouchableOpacity>
              <Ionicons name="options-outline" size={20} color="#10B981" />
            </TouchableOpacity>
          </View>

          {/* Sport categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.catScroll}
            contentContainerStyle={styles.catContent}
          >
            {CATEGORIES.map((cat, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.catItem, activeCategory === cat && styles.catItemActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.catText, activeCategory === cat && styles.catTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Area filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.areaScroll}
            contentContainerStyle={styles.areaContent}
          >
            {AREAS.map((area, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.areaChip, activeArea === area && styles.areaChipActive]}
                onPress={() => setActiveArea(area)}
              >
                {area === 'Gần tôi' && (
                  <Ionicons
                    name="navigate"
                    size={12}
                    color={activeArea === area ? '#FFF' : '#94A3B8'}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text style={[styles.areaText, activeArea === area && styles.areaTextActive]}>
                  {area}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      <FlatList
        data={filteredVenues}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => <VenueCard item={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.loadingText}>Đang tải sân...</Text>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="search-outline" size={48} color="#334155" />
              <Text style={styles.emptyText}>Không tìm thấy sân phù hợp</Text>
            </View>
          )
        }
        ListHeaderComponent={
          <View>
            {/* ─── Gần tôi Section ─── */}
            {nearbyVenues.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="navigate-circle" size={22} color="#10B981" />
                    <Text style={styles.sectionTitle}>Sân gần bạn</Text>
                  </View>
                  <TouchableOpacity onPress={() => setActiveArea('Gần tôi')}>
                    <Text style={styles.viewAll}>Xem tất cả</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 10 }}
                >
                  {nearbyVenues.map(venue => (
                    <NearbyCard key={venue.id} item={venue} />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ─── All Venues Section ─── */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="grid" size={20} color="#10B981" />
                <Text style={styles.sectionTitle}>
                  {activeCategory === 'Tất cả' ? 'Tất cả sân' : `Sân ${activeCategory}`}
                </Text>
              </View>
              <Text style={styles.countText}>{filteredVenues.length} sân</Text>
            </View>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },

  /* Header */
  header: {
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginTop: 12,
    marginBottom: 18,
  },
  welcomeText: { color: '#64748B', fontSize: 13, fontWeight: '500' },
  userName: { color: '#F1F5F9', fontSize: 20, fontWeight: '800', marginTop: 2 },
  profileBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: '#10B981',
    overflow: 'hidden',
  },
  headerIcon: { width: 46, height: 46, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 23, marginRight: 12 },
  badge: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#1E293B' },
  avatar: { width: '100%', height: '100%' },

  /* Search */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 22,
    paddingHorizontal: 14,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  searchInput: { flex: 1, color: '#F1F5F9', fontSize: 14 },
  divider: { width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.1)' },

  /* Categories */
  catScroll: { marginTop: 18 },
  catContent: { paddingHorizontal: 22, gap: 10 },
  catItem: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  catItemActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  catText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  catTextActive: { color: '#FFF' },

  /* Area chips */
  areaScroll: { marginTop: 12, marginBottom: 4 },
  areaContent: { paddingHorizontal: 22, gap: 10 },
  areaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  areaChipActive: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderColor: '#10B981',
  },
  areaText: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  areaTextActive: { color: '#10B981' },

  /* List */
  listContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 120 },

  /* Section */
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: '#F1F5F9', fontSize: 18, fontWeight: '800' },
  viewAll: { color: '#10B981', fontSize: 13, fontWeight: '700' },
  countText: { color: '#475569', fontSize: 13 },

  /* Nearby card */
  nearbyCard: {
    width: 200,
    height: 250,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 14,
    backgroundColor: '#1E293B',
  },
  nearbyImage: { width: '100%', height: '100%', position: 'absolute' },
  nearbyBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nearbyBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  nearbyInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
  },
  nearbyName: { color: '#FFF', fontSize: 14, fontWeight: '800', marginBottom: 5 },
  nearbyMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  nearbyAddr: { color: '#94A3B8', fontSize: 11, flex: 1 },
  nearbyFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nearbyRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  nearbyRatingText: { color: '#FBBF24', fontSize: 12, fontWeight: '700' },
  nearbyPrice: { color: '#10B981', fontSize: 12, fontWeight: '700' },

  /* Main card */
  card: {
    height: 280,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#1E293B',
  },
  cardImage: { width: '100%', height: '100%' },
  cardOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '65%',
  },
  sportBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  sportBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  venueName: { color: '#FFF', fontSize: 18, fontWeight: '800', flex: 1 },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  ratingText: { color: '#FBBF24', fontSize: 12, fontWeight: '700' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  venueAddress: { color: '#94A3B8', fontSize: 13, flex: 1 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceTag: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  priceValue: { color: '#10B981', fontSize: 20, fontWeight: '800' },
  priceUnit: { color: '#64748B', fontSize: 12 },
  btnAction: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnActionText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  /* Distance badges */
  distanceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  distanceText: { color: '#10B981', fontSize: 11, fontWeight: '700' },
  cardDistanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
  },
  cardDistanceText: { color: '#10B981', fontSize: 11, fontWeight: '700' },

  /* States */
  loadingBox: { alignItems: 'center', paddingTop: 60, gap: 12 },
  loadingText: { color: '#475569', fontSize: 14 },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: '#475569', fontSize: 15 },
});

export default HomeScreen;
