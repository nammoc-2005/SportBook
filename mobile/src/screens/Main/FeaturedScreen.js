import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const FeaturedScreen = () => {
  const events = [
    { title: 'Giải vô địch Pickleball Q7', date: '15/05/2026', img: 'https://images.unsplash.com/photo-1626248801379-51a073446f77' },
    { title: 'Siêu Cup Bóng đá Phủi HN', date: '22/05/2026', img: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018' },
    { title: 'Giao lưu Cầu lông Open 2026', date: '30/05/2026', img: 'https://images.unsplash.com/photo-1622279457486-62dcc4a4bd13' }
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.headerGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Sự kiện Nổi bật</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {events.map((event, i) => (
          <TouchableOpacity key={i} style={styles.eventCard} activeOpacity={0.9}>
            <Image source={{ uri: event.img }} style={styles.eventImage} />
            <LinearGradient colors={['transparent', 'rgba(15, 23, 42, 0.9)']} style={styles.overlay} />
            <View style={styles.eventInfo}>
              <View style={styles.dateBadge}>
                <Ionicons name="calendar" size={12} color="#10B981" />
                <Text style={styles.dateText}>{event.date}</Text>
              </View>
              <Text style={styles.eventTitle}>{event.title}</Text>
            </View>
          </TouchableOpacity>
        ))}
        
        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  headerGradient: { borderBottomLeftRadius: 35, borderBottomRightRadius: 35, paddingBottom: 25 },
  header: { paddingHorizontal: 20, paddingTop: 10, alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 25 },
  eventCard: { width: '100%', height: 220, borderRadius: 30, overflow: 'hidden', marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  eventImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' },
  eventInfo: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  dateBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 10 },
  dateText: { color: '#10B981', fontSize: 11, fontWeight: 'bold', marginLeft: 6 },
  eventTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  bottomSpace: { height: 100 }
});

export default FeaturedScreen;
