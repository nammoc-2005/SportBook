const db = require('./src/config/db');

// Arrays for generating random data
const hnPrefixes = ['Sân bóng', 'CLB Cầu lông', 'Trung tâm Thể thao', 'Sân Tennis', 'Tổ hợp Thể thao', 'Pickleball', 'Sân Bóng rổ'];
const hnDistricts = ['Cầu Giấy', 'Đống Đa', 'Thanh Xuân', 'Hoàng Mai', 'Hai Bà Trưng', 'Ba Đình', 'Hoàn Kiếm', 'Tây Hồ', 'Hà Đông', 'Nam Từ Liêm', 'Bắc Từ Liêm', 'Long Biên'];
const hcmPrefixes = ['Sân bóng đá', 'Sân cầu lông', 'Sân Tennis', 'Pickleball', 'Sân bóng rổ', 'Khu thể thao'];
const hcmDistricts = ['Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 7', 'Quận 10', 'Quận 12', 'Tân Bình', 'Bình Thạnh', 'Phú Nhuận', 'Gò Vấp', 'Thủ Đức'];

const sportTypes = ['Bóng đá', 'Cầu lông', 'Tennis', 'Pickleball', 'Bóng rổ'];
const sportImages = {
  'Bóng đá': 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1000&auto=format&fit=crop',
  'Cầu lông': 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=1000&auto=format&fit=crop',
  'Tennis': 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=1000&auto=format&fit=crop',
  'Pickleball': 'https://images.unsplash.com/photo-1707997380962-aab7ebceb532?q=80&w=1000&auto=format&fit=crop',
  'Bóng rổ': 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1000&auto=format&fit=crop',
};

const randomInRange = (min, max) => Math.random() * (max - min) + min;

const generateHanoiCoords = () => {
  // Center roughly around Hanoi: 21.0285, 105.8542
  return {
    lat: randomInRange(20.9700, 21.0700),
    lng: randomInRange(105.7500, 105.8800)
  };
};

const generateHCMCoords = () => {
  // Center roughly around HCM: 10.7626, 106.6601
  return {
    lat: randomInRange(10.7200, 10.8200),
    lng: randomInRange(106.6000, 106.7500)
  };
};

async function seedData() {
  try {
    console.log('Bắt đầu tạo dữ liệu 100 sân mẫu...');
    
    // Get a random owner or fallback to 1
    const [users] = await db.promise.query("SELECT id FROM users WHERE role = 'owner' LIMIT 1");
    const ownerId = users.length > 0 ? users[0].id : 1;

    let venuesCount = 0;
    
    // Generate 50 Hanoi venues
    for (let i = 0; i < 50; i++) {
      const sport = sportTypes[Math.floor(Math.random() * sportTypes.length)];
      const prefix = hnPrefixes[Math.floor(Math.random() * hnPrefixes.length)];
      const district = hnDistricts[Math.floor(Math.random() * hnDistricts.length)];
      const name = `${prefix} ${sport} ${district} ${i+1}`;
      const address = `Số ${Math.floor(Math.random() * 200) + 1} Đường ABC, ${district}, Hà Nội`;
      const coords = generateHanoiCoords();
      
      const venueId = await insertVenue(ownerId, name, address, coords.lat, coords.lng, sport);
      await insertCourtsAndImages(venueId, sport);
      venuesCount++;
    }

    // Generate 50 HCM venues
    for (let i = 0; i < 50; i++) {
      const sport = sportTypes[Math.floor(Math.random() * sportTypes.length)];
      const prefix = hcmPrefixes[Math.floor(Math.random() * hcmPrefixes.length)];
      const district = hcmDistricts[Math.floor(Math.random() * hcmDistricts.length)];
      const name = `${prefix} ${sport} ${district} ${i+1}`;
      const address = `Số ${Math.floor(Math.random() * 200) + 1} Nguyễn Văn A, ${district}, Hồ Chí Minh`;
      const coords = generateHCMCoords();
      
      const venueId = await insertVenue(ownerId, name, address, coords.lat, coords.lng, sport);
      await insertCourtsAndImages(venueId, sport);
      venuesCount++;
    }

    console.log(`✅ Đã tạo thành công ${venuesCount} cụm sân và các sân con tương ứng!`);
    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi tạo dữ liệu:', err);
    process.exit(1);
  }
}

async function insertVenue(ownerId, name, address, lat, lng, sport) {
  const [result] = await db.promise.query(`
    INSERT INTO venues 
    (owner_id, name, address, latitude, longitude, description, sport_types, open_time, close_time, phone_contact, is_active, avg_rating, total_reviews)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `, [
    ownerId, name, address, lat, lng, 
    `Sân ${sport} tiêu chuẩn chất lượng cao, trang bị đầy đủ đèn chiếu sáng và dịch vụ nước uống.`,
    JSON.stringify([sport]),
    '06:00:00', '22:00:00',
    `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
    (Math.random() * (5.0 - 4.0) + 4.0).toFixed(1), // random rating 4.0 - 5.0
    Math.floor(Math.random() * 100) + 5 // random reviews 5 - 105
  ]);
  
  return result.insertId;
}

async function insertCourtsAndImages(venueId, sport) {
  // Insert 1 cover image
  const imgUrl = sportImages[sport] || sportImages['Bóng đá'];
  await db.promise.query(`
    INSERT INTO venue_images (venue_id, image_url, is_cover, sort_order)
    VALUES (?, ?, 1, 0)
  `, [venueId, imgUrl]);

  // Insert 2 to 6 courts
  const numCourts = Math.floor(Math.random() * 5) + 2;
  const basePrice = (Math.floor(Math.random() * 10) + 5) * 10000; // 50k to 150k
  
  for (let i = 1; i <= numCourts; i++) {
    await db.promise.query(`
      INSERT INTO courts (venue_id, name, sport_type, price_per_hour, surface_type, status)
      VALUES (?, ?, ?, ?, ?, 'available')
    `, [
      venueId,
      `Sân ${sport} số ${i}`,
      sport,
      basePrice,
      'Tiêu chuẩn'
    ]);
  }
}

seedData();
