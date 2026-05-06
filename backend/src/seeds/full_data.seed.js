const mysql = require('mysql2/promise');
require('dotenv').config();

const images = [
  'https://images.unsplash.com/photo-1595435064219-c80ce5444206',
  'https://images.unsplash.com/photo-1518605336324-522750080da1',
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018',
  'https://images.unsplash.com/photo-1544919982-b61976f0ba43',
  'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c',
  'https://images.unsplash.com/photo-1626248801379-51a073446f77',
  'https://images.unsplash.com/photo-1552667466-07770ae110d0'
];

const venueData = [
  { name: 'Sân Cầu Lông Dịch Vọng', lat: 21.0333, lng: 105.7950, sport: 'Cầu lông', address: 'Dịch Vọng, Cầu Giấy, Hà Nội' },
  { name: 'Sân Bóng Chùa Hà', lat: 21.0370, lng: 105.7970, sport: 'Bóng đá', address: 'Chùa Hà, Cầu Giấy, Hà Nội' },
  { name: 'Sân Tennis Yên Hòa', lat: 21.0220, lng: 105.7920, sport: 'Tennis', address: 'Yên Hòa, Cầu Giấy, Hà Nội' },
  { name: 'Pickleball Center', lat: 21.0310, lng: 105.7880, sport: 'Pickleball', address: 'Cầu Giấy, Hà Nội' },
  { name: 'Sân Bóng Hoàng Cầu', lat: 21.0180, lng: 105.8230, sport: 'Bóng đá', address: 'Đống Đa, Hà Nội' },
  { name: 'Sân Thống Nhất', lat: 10.7615, lng: 106.6611, sport: 'Bóng đá', address: 'Quận 10, TP. HCM' },
  { name: 'Phú Thọ Gymnasium', lat: 10.7712, lng: 106.6575, sport: 'Cầu lông', address: 'TP. HCM' },
  { name: 'Sân Tao Đàn', lat: 10.7745, lng: 106.6944, sport: 'Bóng đá', address: 'Quận 1, TP. HCM' },
  { name: 'Swin Pickleball Q7', lat: 10.7455, lng: 106.7022, sport: 'Pickleball', address: 'Quận 7, TP. HCM' },
  
  // Dense area for HN
  ...Array.from({ length: 25 }).map((_, i) => ({
    name: `Sân Thể Thao ${i + 1} Hà Nội`,
    lat: 21.02 + Math.random() * 0.05,
    lng: 105.78 + Math.random() * 0.08,
    sport: i % 3 === 0 ? 'Bóng đá' : i % 3 === 1 ? 'Cầu lông' : 'Pickleball',
    address: 'Hà Nội'
  })),

  // Dense area for HCM
  ...Array.from({ length: 25 }).map((_, i) => ({
    name: `Sân Thể Thao ${i + 1} HCM`,
    lat: 10.75 + Math.random() * 0.05,
    lng: 106.65 + Math.random() * 0.08,
    sport: i % 3 === 0 ? 'Bóng đá' : i % 3 === 1 ? 'Cầu lông' : 'Tennis',
    address: 'Hồ Chí Minh'
  }))
];

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('--- RESETTING DATABASE ---');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    await connection.execute('DELETE FROM venues');
    await connection.execute('DELETE FROM courts');
    await connection.execute('DELETE FROM time_slots');
    await connection.execute('DELETE FROM venue_images');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('--- SEEDING ---');
    
    for (const v of venueData) {
      const [vResult] = await connection.execute(
        'INSERT INTO venues (owner_id, name, address, city, latitude, longitude, sport_types, avg_rating, min_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [1, v.name, v.address, v.address.includes('HCM') ? 'Hồ Chí Minh' : 'Hà Nội', v.lat, v.lng, JSON.stringify([v.sport]), (4 + Math.random()).toFixed(1), 100000 + Math.floor(Math.random() * 200000)]
      );
      const venueId = vResult.insertId;

      // Seed Cover Image
      const randomImg = images[Math.floor(Math.random() * images.length)];
      await connection.execute(
        'INSERT INTO venue_images (venue_id, image_url, is_cover) VALUES (?, ?, ?)',
        [venueId, randomImg, 1]
      );

      const numCourts = 2 + Math.floor(Math.random() * 2);
      for (let i = 1; i <= numCourts; i++) {
        const [cResult] = await connection.execute(
          'INSERT INTO courts (venue_id, name, sport_type, price_per_hour) VALUES (?, ?, ?, ?)',
          [venueId, `${v.sport} Court ${i}`, v.sport, 120000 + (i * 20000)]
        );
        const courtId = cResult.insertId;

        const dates = [new Date().toISOString().split('T')[0], new Date(Date.now() + 86400000).toISOString().split('T')[0]];
        for (const date of dates) {
          for (let hour = 6; hour < 22; hour++) {
            await connection.execute(
              'INSERT INTO time_slots (court_id, slot_date, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)',
              [courtId, date, `${hour.toString().padStart(2, '0')}:00:00`, `${(hour+1).toString().padStart(2, '0')}:00:00`, 'open']
            );
          }
        }
      }
    }
    console.log(`✅ Seeded ${venueData.length} venues with images, courts, and slots.`);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await connection.end();
    process.exit();
  }
}

seed();
