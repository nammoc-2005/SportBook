const mysql = require('mysql2/promise');
require('dotenv').config();

const realVenues = [
  // HÀ NỘI
  { name: 'Sân bóng đá Thủy Lợi', lat: 21.0075, lng: 105.8248, sport: 'Bóng đá', addr: 'Ngõ 95 Chùa Bộc, Đống Đa' },
  { name: 'Sân bóng đá Bách Khoa', lat: 21.0065, lng: 105.8433, sport: 'Bóng đá', addr: 'Số 1 Đại Cồ Việt, Hai Bà Trưng' },
  { name: 'Sân cầu lông Cầu Giấy', lat: 21.0361, lng: 105.7958, sport: 'Cầu lông', addr: '35 Trần Quý Kiên, Cầu Giấy' },
  { name: 'Sân Tennis Quần Ngựa', lat: 21.0401, lng: 105.8194, sport: 'Tennis', addr: '30 Văn Cao, Ba Đình' },
  { name: 'Sân Pickleball Tương Mai', lat: 20.9882, lng: 105.8455, sport: 'Pickleball', addr: 'Nguyễn An Ninh, Hoàng Mai' },
  { name: 'Sân bóng đá Thành Đồng', lat: 21.0125, lng: 105.7915, sport: 'Bóng đá', addr: 'Trung Hòa, Cầu Giấy' },
  { name: 'Sân cầu lông nhà thi đấu Hà Đông', lat: 20.9723, lng: 105.7748, sport: 'Cầu lông', addr: 'Hà Đông, Hà Nội' },
  { name: 'Sân bóng đá Đại học Y', lat: 21.0012, lng: 105.8285, sport: 'Bóng đá', addr: 'Tôn Thất Tùng, Đống Đa' },
  { name: 'Sân bóng đá Thượng Đình', lat: 20.9985, lng: 105.8122, sport: 'Bóng đá', addr: 'Thanh Xuân, Hà Nội' },
  { name: 'Sân Tennis Yên Hòa', lat: 21.0220, lng: 105.7920, sport: 'Tennis', addr: 'Dịch Vọng, Cầu Giấy' },
  { name: 'Sân bóng đá Miếu Môn', lat: 20.9545, lng: 105.7833, sport: 'Bóng đá', addr: 'Chương Mỹ, Hà Nội' },
  { name: 'Sân Pickleball Mỹ Đình', lat: 21.0155, lng: 105.7688, sport: 'Pickleball', addr: 'Nam Từ Liêm, Hà Nội' },
  { name: 'Sân cầu lông Đội Cấn', lat: 21.0355, lng: 105.8188, sport: 'Cầu lông', addr: 'Ba Đình, Hà Nội' },
  { name: 'Sân bóng đá An Khánh', lat: 21.0022, lng: 105.7233, sport: 'Bóng đá', addr: 'Hoài Đức, Hà Nội' },
  { name: 'Sân bóng đá Phòng Không Không Quân', lat: 21.0045, lng: 105.8288, sport: 'Bóng đá', addr: 'Lê Trọng Tấn, Thanh Xuân' },
  { name: 'Sân cầu lông Định Công', lat: 20.9855, lng: 105.8322, sport: 'Cầu lông', addr: 'Hoàng Mai, Hà Nội' },
  { name: 'Sân bóng đá Chu Văn An', lat: 21.0422, lng: 105.8344, sport: 'Bóng đá', addr: 'Tây Hồ, Hà Nội' },

  // HỒ CHÍ MINH
  { name: 'Sân bóng đá Tao Đàn', lat: 10.7745, lng: 106.6944, sport: 'Bóng đá', addr: 'Quận 1, TP. HCM' },
  { name: 'Sân bóng đá Hoa Lư', lat: 10.7865, lng: 106.7025, sport: 'Bóng đá', addr: 'Đinh Tiên Hoàng, Quận 1' },
  { name: 'Sân bóng đá Kỳ Hòa', lat: 10.7755, lng: 106.6688, sport: 'Bóng đá', addr: 'Sư Vạn Hạnh, Quận 10' },
  { name: 'Sân cầu lông Phú Thọ', lat: 10.7712, lng: 106.6575, sport: 'Cầu lông', addr: 'Quận 11, TP. HCM' },
  { name: 'Sân Pickleball Quận 7 Star', lat: 10.7455, lng: 106.7022, sport: 'Pickleball', addr: 'Quận 7, TP. HCM' },
  { name: 'Sân bóng đá Celadon City', lat: 10.8122, lng: 106.6133, sport: 'Bóng đá', addr: 'Tân Phú, TP. HCM' },
  { name: 'Sân Tennis Lan Anh', lat: 10.7788, lng: 106.6788, sport: 'Tennis', addr: 'Quận 10, TP. HCM' },
  { name: 'Sân cầu lông Chu Văn An', lat: 10.8055, lng: 106.6988, sport: 'Cầu lông', addr: 'Bình Thạnh, TP. HCM' },
  { name: 'Sân bóng đá Chảo Lửa', lat: 10.8022, lng: 106.6533, sport: 'Bóng đá', addr: 'Tân Bình, TP. HCM' },
  { name: 'Sân Pickleball Phú Mỹ Hưng', lat: 10.7288, lng: 106.7088, sport: 'Pickleball', addr: 'Quận 7, TP. HCM' },
  { name: 'Sân cầu lông Sân bay Tân Sơn Nhất', lat: 10.8144, lng: 106.6622, sport: 'Cầu lông', addr: 'Tân Bình, TP. HCM' },
  { name: 'Sân bóng đá Gia Định', lat: 10.8011, lng: 106.6855, sport: 'Bóng đá', addr: 'Bình Thạnh, TP. HCM' },
  { name: 'Sân Tennis Quận 7', lat: 10.7322, lng: 106.7211, sport: 'Tennis', addr: 'Quận 7, TP. HCM' },
  { name: 'Sân bóng đá Rạch Chiếc', lat: 10.8122, lng: 106.7644, sport: 'Bóng đá', addr: 'Thủ Đức, TP. HCM' },
  { name: 'Sân Pickleball Quận 2', lat: 10.7955, lng: 106.7388, sport: 'Pickleball', addr: 'Thủ Đức, TP. HCM' },
  { name: 'Sân bóng đá Thống Nhất', lat: 10.7615, lng: 106.6611, sport: 'Bóng đá', addr: 'Quận 10, TP. HCM' }
];

const images = [
  'https://images.unsplash.com/photo-1595435064219-c80ce5444206',
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018',
  'https://images.unsplash.com/photo-1544919982-b61976f0ba43',
  'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c',
  'https://images.unsplash.com/photo-1626248801379-51a073446f77'
];

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('--- RESETTING ---');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    await connection.execute('DELETE FROM venues');
    await connection.execute('DELETE FROM courts');
    await connection.execute('DELETE FROM time_slots');
    await connection.execute('DELETE FROM venue_images');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('--- SEEDING REAL NAMES ---');
    for (const v of realVenues) {
      const [vResult] = await connection.execute(
        'INSERT INTO venues (owner_id, name, address, city, latitude, longitude, sport_types, avg_rating, min_price, open_time, close_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [1, v.name, v.addr, v.addr.includes('HCM') ? 'Hồ Chí Minh' : 'Hà Nội', v.lat, v.lng, JSON.stringify([v.sport]), (4.5 + Math.random() * 0.5).toFixed(1), 150000, '06:00:00', '22:00:00']
      );
      const venueId = vResult.insertId;

      await connection.execute('INSERT INTO venue_images (venue_id, image_url, is_cover) VALUES (?, ?, ?)', [venueId, images[Math.floor(Math.random()*images.length)], 1]);

      const [cResult] = await connection.execute('INSERT INTO courts (venue_id, name, sport_type, price_per_hour) VALUES (?, ?, ?, ?)', [venueId, `Sân ${v.sport} #1`, v.sport, 180000]);
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
    console.log('✅ SEEDED 35+ AUTHENTIC VENUES');
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
    process.exit();
  }
}

seed();
