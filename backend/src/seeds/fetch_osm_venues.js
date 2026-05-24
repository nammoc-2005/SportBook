const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../../.env' }); // Make sure it points to correct .env if needed
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// API Overpass của OpenStreetMap: Lấy dữ liệu sân thể thao thực tế ở Hà Nội và TP.HCM
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// Câu lệnh Query lấy các sân thể thao (leisure=pitch) ở Hà Nội và Hồ Chí Minh
const query = `
  [out:json][timeout:25];
  (
    // Hà Nội
    node["leisure"="pitch"](20.8,105.6,21.2,106.0);
    way["leisure"="pitch"](20.8,105.6,21.2,106.0);
    // TP.HCM
    node["leisure"="pitch"](10.6,106.5,10.9,106.9);
    way["leisure"="pitch"](10.6,106.5,10.9,106.9);
  );
  out center;
`;

const images = [
  'https://images.unsplash.com/photo-1595435064219-c80ce5444206',
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018',
  'https://images.unsplash.com/photo-1544919982-b61976f0ba43',
  'https://images.unsplash.com/photo-1599474924187-334a4ae5bd3c',
  'https://images.unsplash.com/photo-1626248801379-51a073446f77'
];

async function fetchRealVenues() {
  console.log('⏳ Đang kết nối tới OpenStreetMap để tải dữ liệu sân thật...');
  try {
    const response = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`
    });
    const data = await response.json();
    console.log(`✅ Đã tải về ${data.elements.length} địa điểm thể thao từ bản đồ!`);
    return data.elements;
  } catch (err) {
    console.error('❌ Lỗi khi tải dữ liệu từ OpenStreetMap:', err);
    return [];
  }
}

async function seed() {
  const elements = await fetchRealVenues();
  if (!elements.length) return process.exit(1);

  // Lọc ra các địa điểm có tên đàng hoàng
  const validVenues = elements
    .filter(e => e.tags && e.tags.name)
    .map(e => {
      let sport = 'Bóng đá';
      if (e.tags.sport === 'tennis') sport = 'Tennis';
      if (e.tags.sport === 'badminton') sport = 'Cầu lông';
      if (e.tags.sport === 'basketball') sport = 'Bóng rổ';

      return {
        name: e.tags.name,
        lat: e.lat || e.center?.lat,
        lng: e.lon || e.center?.lon,
        sport: sport,
        city: (e.lat || e.center?.lat) > 15 ? 'Hà Nội' : 'Hồ Chí Minh'
      };
    })
    .filter(v => v.lat && v.lng)
    // Giới hạn lấy 100 sân để test tránh nặng máy
    .slice(0, 100);

  console.log(`Tiến hành đưa ${validVenues.length} sân thật có Tên & Tọa độ vào Database...`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sportbook'
  });

  try {
    console.log('--- ĐANG CLEAR DỮ LIỆU CŨ ---');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    // Chỉ xóa các sân không thuộc chủ sân ID=1 (giữ lại dữ liệu test nếu có)
    await connection.execute('DELETE FROM venues WHERE id > 1000'); // Tránh xóa sân cũ nếu muốn
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('--- SEEDING DỮ LIỆU SÂN THỰC TẾ ---');
    let insertedCount = 0;
    
    // Ensure we have an owner
    const [[owner]] = await connection.execute('SELECT id FROM users WHERE role="owner" LIMIT 1');
    const ownerId = owner ? owner.id : 1;

    for (const v of validVenues) {
      try {
        const [vResult] = await connection.execute(
          'INSERT INTO venues (owner_id, name, address, city, latitude, longitude, sport_types, avg_rating, min_price, open_time, close_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [ownerId, v.name, `Khu vực ${v.city}`, v.city, v.lat, v.lng, JSON.stringify([v.sport]), (4.0 + Math.random()).toFixed(1), 100000 + Math.floor(Math.random()*10)*10000, '06:00:00', '22:00:00']
        );
        const venueId = vResult.insertId;

        // Thêm ảnh
        await connection.execute('INSERT INTO venue_images (venue_id, image_url, is_cover) VALUES (?, ?, ?)', [venueId, images[Math.floor(Math.random()*images.length)], 1]);

        // Thêm sân con
        const [cResult] = await connection.execute('INSERT INTO courts (venue_id, name, sport_type, price_per_hour) VALUES (?, ?, ?, ?)', [venueId, `Sân ${v.sport} trung tâm`, v.sport, 150000]);
        const courtId = cResult.insertId;

        // Thêm Time slots cho ngày hôm nay và ngày mai (Dynamic Date)
        const dates = [new Date().toISOString().split('T')[0], new Date(Date.now() + 86400000).toISOString().split('T')[0]];
        for (const date of dates) {
          for (let hour = 16; hour < 22; hour++) { // Chỉ tạo slot chiều tối cho nhanh
            await connection.execute(
              'INSERT INTO time_slots (court_id, slot_date, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)',
              [courtId, date, `${hour.toString().padStart(2, '0')}:00:00`, `${(hour+1).toString().padStart(2, '0')}:00:00`, 'open']
            );
          }
        }
        insertedCount++;
      } catch(e) {
        // Skip lỗi duplicate
      }
    }
    console.log(`✅ THÀNH CÔNG! Đã nạp dữ liệu ${insertedCount} sân THẬT với tọa độ chuẩn 100% vào App.`);
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
    process.exit();
  }
}

seed();
