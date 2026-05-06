import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Dimensions, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/axios';

const { width, height } = Dimensions.get('window');

const MapScreen = ({ navigation }) => {
  const [venues, setVenues] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        const region = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
        setUserLocation(region);
        fetchVenues(region);
      } else {
        const defaultRegion = { latitude: 21.0285, longitude: 105.8048, latitudeDelta: 0.1, longitudeDelta: 0.1 };
        fetchVenues(defaultRegion);
      }
    })();
  }, []);

  const fetchVenues = async (region) => {
    setLoading(true);
    try {
      // In a real app, we would send the lat/lng/delta to filter by bounds
      // For now, we fetch a larger set to simulate "filling the map"
      const res = await api.get('/venues?limit=100');
      if (res.data.success) {
        setVenues(res.data.data);
      }
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  };

  const onRegionChangeComplete = (region) => {
    // Optionally fetch more data here if the user moves far enough
  };

  const getSportIcon = (typesStr) => {
    try {
      if (!typesStr) return 'tennisball';
      let types = typesStr;
      if (typeof typesStr === 'string' && typesStr.startsWith('[')) {
        types = JSON.parse(typesStr);
      }
      if (Array.isArray(types)) {
        if (types.includes('Bóng đá')) return 'football';
        if (types.includes('Cầu lông')) return 'fitness';
        if (types.includes('Pickleball')) return 'tennisball';
      }
      if (typeof types === 'string') {
        if (types.includes('Bóng đá')) return 'football';
        if (types.includes('Cầu lông')) return 'fitness';
      }
      return 'football';
    } catch (e) {
      return 'football';
    }
  };

  const darkMapStyle = [
    { "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#94a3b8" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#0f172a" }] },
    { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#334155" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#334155" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0f172a" }] }
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <MapView
        ref={mapRef}
        style={styles.map}
        customMapStyle={darkMapStyle}
        initialRegion={userLocation || {
          latitude: 21.0285,
          longitude: 105.8048,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation={true}
      >
        {venues.map((venue) => {
          if (!venue.latitude || !venue.longitude) return null;
          return (
            <Marker
              key={venue.id}
              coordinate={{
                latitude: parseFloat(venue.latitude),
                longitude: parseFloat(venue.longitude),
              }}
              onPress={() => navigation.navigate('VenueDetail', { venueId: venue.id })}
            >
              <View style={styles.customMarker}>
                <LinearGradient colors={['#10B981', '#059669']} style={styles.markerInner}>
                  <Ionicons name={getSportIcon(venue.sport_types)} size={14} color="#FFF" />
                </LinearGradient>
                <View style={styles.markerArrow} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      <SafeAreaView style={styles.overlay} edges={['top']}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#94A3B8" />
          <TextInput 
            style={styles.searchInput}
            placeholder="Tìm sân thật xung quanh bạn..."
            placeholderTextColor="#64748B"
          />
          {loading ? (
             <ActivityIndicator size="small" color="#10B981" />
          ) : (
            <TouchableOpacity style={styles.syncBtn} onPress={() => fetchVenues(userLocation)}>
              <Ionicons name="sync" size={20} color="#10B981" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {['Gần tôi', 'Sân bóng đá', 'Sân cầu lông', 'Pickleball'].map((label, i) => (
            <TouchableOpacity key={i} style={styles.chip}>
              <Text style={styles.chipText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      <View style={styles.fabContainer}>
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => {
            if (userLocation && mapRef.current) {
              mapRef.current.animateToRegion(userLocation, 1000);
            }
          }}
        >
          <Ionicons name="navigate" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  map: { width, height },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', height: 55, borderRadius: 18, paddingHorizontal: 15, marginTop: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 10 },
  searchInput: { flex: 1, marginLeft: 12, color: '#FFF', fontSize: 15 },
  syncBtn: { padding: 5 },
  chipsScroll: { marginTop: 15 },
  chip: { backgroundColor: 'rgba(30, 41, 59, 0.9)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  chipText: { color: '#CBD5E1', fontSize: 13, fontWeight: '600' },
  customMarker: { alignItems: 'center' },
  markerInner: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
  markerArrow: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#10B981', marginTop: -2 },
  fabContainer: { position: 'absolute', bottom: 100, right: 20 },
  fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 }
});

export default MapScreen;
