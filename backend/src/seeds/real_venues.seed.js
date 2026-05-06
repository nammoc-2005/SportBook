const mysql = require('mysql2/promise');
require('dotenv').config();

const venues = [
  { name: 'Sân vận động Mỹ Đình', address: 'Nam Từ Liêm, Hà Nội', lat: 21.0205, lng: 105.7639, sport: 'Bóng đá', rating: 4.8 },
  { name: 'Nhà thi đấu Cầu Giấy', address: '35 Trần Quý Kiên, Hà Nội', lat: 21.0361, lng: 105.7958, sport: 'Cầu lông', rating: 4.6 },
  { name: 'Sân bóng Thủy Lợi', address: 'Đống Đa, Hà Nội', lat: 21.0075, lng: 105.8248, sport: 'Bóng đá', rating: 4.4 },
  { name: 'Quần Ngựa Sports Complex', address: 'Ba Đình, Hà Nội', lat: 21.0401, lng: 105.8194, sport: 'Tennis', rating: 4.7 },
  { name: 'Sân vận động Thống Nhất', address: 'Quận 10, TP. HCM', lat: 10.7615, lng: 106.6611, sport: 'Bóng đá', rating: 4.7 },
  { name: 'Nhà thi đấu Phú Thọ', address: 'Quận 11, TP. HCM', lat: 10.7712, lng: 106.6575, sport: 'Cầu lông', rating: 4.5 },
  { name: 'Sân bóng Tao Đàn', address: 'Quận 1, TP. HCM', lat: 10.7745, lng: 106.6944, sport: 'Bóng đá', rating: 4.8 },
  { name: 'Swin Pickleball Quận 7', address: 'Quận 7, TP. HCM', lat: 10.7455, lng: 106.7022, sport: 'Pickleball', rating: 4.9 },
  { name: 'Nhà thi đấu Hà Đông', address: 'Hà Đông, Hà Nội', lat: 20.9723, lng: 105.7748, sport: 'Cầu lông', rating: 4.3 },
  { name: 'Sân Pickleball Bách Khoa', address: 'Hai Bà Trưng, Hà Nội', lat: 21.0065, lng: 105.8433, sport: 'Pickleball', rating: 4.5 }
];

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('Ensuring columns exist...');
    try {
      await connection.execute('ALTER TABLE venues ADD COLUMN IF NOT EXISTS city VARCHAR(100)');
      await connection.execute('ALTER TABLE venues ADD COLUMN IF NOT EXISTS min_price INT DEFAULT 100000');
    } catch (e) {
       // Table might already have them or IF NOT EXISTS not supported
    }

    console.log('Clearing old data...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    await connection.execute('DELETE FROM venues');
    await connection.execute('DELETE FROM courts');
    await connection.execute('DELETE FROM time_slots');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Seeding real venues...');
    for (const v of venues) {
      await connection.execute(
        'INSERT INTO venues (owner_id, name, address, city, latitude, longitude, sport_types, avg_rating, min_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [1, v.name, v.address, v.address.includes('HCM') ? 'Hồ Chí Minh' : 'Hà Nội', v.lat, v.lng, JSON.stringify([v.sport]), v.rating, 150000]
      );
    }
    console.log('Seeding complete!');
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await connection.end();
  }
}

seed();
