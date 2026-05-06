import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FeaturedScreen = () => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sự kiện Nổi bật</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.bannerCard} activeOpacity={0.9}>
          <Image source={{ uri: 'https://via.placeholder.com/600x300/10B981/FFFFFF?text=PICKLEBALL+QUẬN+7' }} style={styles.bannerImage} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.bannerCard} activeOpacity={0.9}>
          <Image source={{ uri: 'https://via.placeholder.com/600x300/EF4444/FFFFFF?text=PICKLEBALL+HÀ+NỘI' }} style={styles.bannerImage} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.bannerCard} activeOpacity={0.9}>
          <Image source={{ uri: 'https://via.placeholder.com/600x300/F59E0B/FFFFFF?text=NĂM+MỚI+SÂN+MỚI' }} style={styles.bannerImage} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { padding: 15, alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  content: { padding: 15 },
  bannerCard: { width: '100%', height: 180, borderRadius: 16, overflow: 'hidden', marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  bannerImage: { width: '100%', height: '100%' }
});

export default FeaturedScreen;
