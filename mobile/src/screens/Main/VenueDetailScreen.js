import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Dimensions, Linking, Platform, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/axios';

const { width } = Dimensions.get('window');

const VenueDetailScreen = ({ route, navigation }) => {
  const { venueId } = route.params;
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchVenueDetail(); }, [venueId]);

  const fetchVenueDetail = async () => {
    try {
      const res = await api.get(`/venues/${venueId}`);
      if (res.data.success) setVenue(res.data.data);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  };

  const openGoogleMaps = () => {
    if (!venue) return;
    
    Alert.alert(
      "Mở Bản đồ",
      `Bạn có muốn xem chỉ đường đến ${venue.name} trên Google Maps không?`,
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Mở", 
          onPress: () => {
            const url = Platform.OS === 'ios' 
              ? `comgooglemaps://?q=${venue.latitude},${venue.longitude}`
              : `geo:${venue.latitude},${venue.longitude}?q=${venue.latitude},${venue.longitude}(${encodeURIComponent(venue.name)})`;
            Linking.openURL(url).catch(() => {
              Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`);
            });
          }
        }
      ]
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#10B981" /></View>;
  if (!venue) return <View style={styles.center}><Text style={{color:'#FFF'}}>Không tìm thấy sân</Text></View>;

  const coverImg = venue.images?.[0]?.image_url?.replace('localhost', '192.168.1.107') 
    || 'https://images.unsplash.com/photo-1595435064219-c80ce5444206?q=80&w=1000&auto=format&fit=crop';

  const formatTime = (time) => (time ? time.slice(0, 5) : '06:00');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.imageHeader}>
          <Image source={{ uri: coverImg }} style={styles.mainImage} />
          <LinearGradient colors={['rgba(15,23,42,0.6)', 'transparent']} style={styles.topOverlay} />
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.mainInfo}>
            <Text style={styles.venueName}>{venue.name}</Text>
            <View style={styles.row}>
              <Ionicons name="star" size={16} color="#FBBF24" />
              <Text style={styles.ratingText}>{venue.avg_rating || '5.0'}</Text>
              <Text style={styles.reviewText}>• {venue.total_reviews || 0} Đánh giá</Text>
            </View>
          </View>

          <View style={styles.cardInfo}>
            <View style={styles.infoItem}>
              <View style={styles.iconBox}><Ionicons name="location" size={20} color="#10B981" /></View>
              <Text style={styles.infoText}>{venue.address}</Text>
            </View>
            <View style={styles.infoItem}>
              <View style={styles.iconBox}><Ionicons name="time" size={20} color="#10B981" /></View>
              <Text style={styles.infoText}>{formatTime(venue.open_time)} - {formatTime(venue.close_time)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mô tả</Text>
            <Text style={styles.description}>{venue.description || 'Sân thể thao chất lượng cao với đầy đủ tiện ích hiện đại, thảm tiêu chuẩn thi đấu.'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chọn Sân</Text>
            {venue.courts?.map(court => (
              <TouchableOpacity 
                key={court.id} 
                style={styles.courtCard}
                onPress={() => navigation.navigate('BookingSlot', { court, venue })}
              >
                <View style={styles.courtInfo}>
                  <Text style={styles.courtName}>{court.name}</Text>
                  <Text style={styles.courtType}>{court.sport_type} • Tiêu chuẩn</Text>
                </View>
                <View style={styles.priceTag}>
                  <Text style={styles.priceValue}>{new Intl.NumberFormat('vi-VN').format(court.price_per_hour)}đ</Text>
                  <Text style={styles.priceUnit}>/giờ</Text>
                </View>
              </TouchableOpacity>
            ))}
            {(!venue.courts || venue.courts.length === 0) && (
              <Text style={styles.emptyText}>Hiện chưa có sân nào khả dụng để đặt trực tuyến.</Text>
            )}
          </View>

          {venue.latitude && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vị trí trên bản đồ</Text>
              <View style={styles.mapBox}>
                <MapView
                  style={styles.map}
                  pointerEvents="none"
                  initialRegion={{
                    latitude: parseFloat(venue.latitude),
                    longitude: parseFloat(venue.longitude),
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                >
                  <Marker coordinate={{ latitude: parseFloat(venue.latitude), longitude: parseFloat(venue.longitude) }} />
                </MapView>
                <TouchableOpacity style={styles.mapBtn} onPress={openGoogleMaps}>
                   <LinearGradient colors={['#10B981', '#059669']} style={styles.mapBtnInner}>
                      <Ionicons name="navigate" size={16} color="#FFF" />
                      <Text style={styles.mapBtnText}>Chỉ đường</Text>
                   </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  imageHeader: { height: 300, position: 'relative' },
  mainImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },
  backBtn: { position: 'absolute', top: 50, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center' },
  content: { padding: 25, marginTop: -30, backgroundColor: '#0F172A', borderTopLeftRadius: 35, borderTopRightRadius: 35 },
  venueName: { fontSize: 26, fontWeight: 'bold', color: '#FFF', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  ratingText: { color: '#FBBF24', fontSize: 16, fontWeight: 'bold', marginLeft: 6 },
  reviewText: { color: '#64748B', fontSize: 14, marginLeft: 8 },
  cardInfo: { backgroundColor: '#1E293B', borderRadius: 25, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoText: { color: '#CBD5E1', fontSize: 14, flex: 1 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 15 },
  description: { color: '#94A3B8', fontSize: 14, lineHeight: 22 },
  courtCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', padding: 20, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  courtName: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  courtType: { color: '#64748B', fontSize: 13, marginTop: 4 },
  priceTag: { alignItems: 'flex-end' },
  priceValue: { color: '#10B981', fontSize: 18, fontWeight: 'bold' },
  priceUnit: { color: '#64748B', fontSize: 11 },
  emptyText: { color: '#475569', fontStyle: 'italic' },
  mapBox: { height: 200, borderRadius: 25, overflow: 'hidden', position: 'relative' },
  map: { width: '100%', height: '100%' },
  mapBtn: { position: 'absolute', bottom: 15, right: 15 },
  mapBtnInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 15 },
  mapBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13, marginLeft: 6 }
});

export default VenueDetailScreen;
