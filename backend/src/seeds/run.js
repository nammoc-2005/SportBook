require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const db = require('../config/db');
const venues = require('./venues.seed');
const moment = require('moment');

async function runSeed() {
  console.log('🌱 Bắt đầu seed dữ liệu SportBook...\n');

  try {
    // 1. Create admin user
    console.log('👤 Tạo tài khoản admin...');
    await query(`INSERT IGNORE INTO users (phone, name, email, role, is_verified) VALUES (?, ?, ?, 'admin', 1)`,
      ['0900000000', 'Admin SportBook', 'admin@sportbook.vn']);

    // 2. Create sample owners
    console.log('👤 Tạo tài khoản chủ sân...');
    const ownerPhones = ['0901111111', '0902222222', '0903333333', '0904444444', '0905555555'];
    const ownerNames = ['Nguyễn Văn An', 'Trần Thị Bình', 'Lê Văn Cường', 'Phạm Thị Dung', 'Hoàng Văn Em'];

    for (let i = 0; i < ownerPhones.length; i++) {
      await query(`INSERT IGNORE INTO users (phone, name, role, is_verified) VALUES (?, ?, 'owner', 1)`,
        [ownerPhones[i], ownerNames[i]]);
      const [users] = await queryArr(`SELECT id FROM users WHERE phone = ?`, [ownerPhones[i]]);
      if (users.length) {
        await query(`INSERT IGNORE INTO court_owners (user_id, business_name, status) VALUES (?, ?, 'approved')`,
          [users[0].id, `${ownerNames[i]} Sport`]);
      }
    }

    // 3. Create sample users
    console.log('👤 Tạo tài khoản người dùng mẫu...');
    const userPhones = ['0911111111', '0922222222', '0933333333'];
    const userNames = ['Khách hàng A', 'Khách hàng B', 'Khách hàng C'];
    for (let i = 0; i < userPhones.length; i++) {
      await query(`INSERT IGNORE INTO users (phone, name, role, is_verified) VALUES (?, ?, 'user', 1)`,
        [userPhones[i], userNames[i]]);
    }

    // 4. Get court_owner IDs (venues.owner_id references court_owners.id)
    const [ownerRows] = await queryArr(`SELECT co.id FROM court_owners co LIMIT 5`);
    const ownerIds = ownerRows.map(r => r.id);

    // 5. Seed venues
    console.log('🏟️  Seed 15 sân thể thao...');
    for (let i = 0; i < venues.length; i++) {
      const v = venues[i];
      const ownerId = ownerIds[i % ownerIds.length];

      const openTime = v.operating_hours.open + ':00';
      const closeTime = v.operating_hours.close + ':00';

      // Insert venue
      const [result] = await queryArr(
        `INSERT INTO venues (owner_id, name, address, latitude, longitude, description, sport_types, open_time, close_time, phone_contact, is_active, avg_rating, total_reviews) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0)`,
        [ownerId, v.name, v.address, v.latitude, v.longitude, v.description,
          JSON.stringify(v.sport_types), openTime, closeTime, v.phone]
      );
      const venueId = result.insertId;
      console.log(`  ✅ ${v.name} (ID: ${venueId})`);

      // Insert images
      for (let j = 0; j < v.images.length; j++) {
        await query(`INSERT INTO venue_images (venue_id, image_url, is_cover, sort_order) VALUES (?, ?, ?, ?)`,
          [venueId, v.images[j], j === 0 ? 1 : 0, j]);
      }

      // Insert courts + generate slots (next 30 days)
      for (const court of v.courts) {
        const [courtResult] = await queryArr(
          `INSERT INTO courts (venue_id, name, sport_type, price_per_hour, status) VALUES (?, ?, ?, ?, 'available')`,
          [venueId, court.name, court.sport_type, court.price_per_hour]
        );
        const courtId = courtResult.insertId;

        // Generate slots for next 30 days
        const slots = [];
        const openH = parseInt(v.operating_hours.open.split(':')[0]);
        const closeH = parseInt(v.operating_hours.close.split(':')[0]);

        for (let d = 0; d < 30; d++) {
          const dateStr = moment().add(d, 'days').format('YYYY-MM-DD');
          for (let h = openH; h < closeH; h++) {
            const startTime = `${String(h).padStart(2,'0')}:00:00`;
            const endTime = `${String(h + 1).padStart(2,'0')}:00:00`;
            slots.push([courtId, dateStr, startTime, endTime, 'open', court.price_per_hour]);
          }
        }

        if (slots.length > 0) {
          for (let b = 0; b < slots.length; b += 200) {
            const batch = slots.slice(b, b + 200);
            await query(`INSERT IGNORE INTO time_slots (court_id, slot_date, start_time, end_time, status, price_override) VALUES ?`, [batch]);
          }
        }
      }

      // Add sample reviews
      const [userRows] = await queryArr(`SELECT id FROM users WHERE role = 'user' LIMIT 3`);
      const sampleReviews = [
        { rating: 5, comment: 'Sân rất đẹp, sạch sẽ, nhân viên thân thiện. Sẽ quay lại!' },
        { rating: 4, comment: 'Chất lượng tốt, giá hợp lý. Chỗ đậu xe rộng rãi.' },
        { rating: 5, comment: 'Tuyệt vời! Mặt sân tốt, đèn sáng, phục vụ chuyên nghiệp.' }
      ];
      let totalRating = 0;
      let reviewCount = 0;
      for (let r = 0; r < Math.min(userRows.length, sampleReviews.length); r++) {
        try {
          await query(`INSERT INTO reviews (user_id, venue_id, rating, comment) VALUES (?, ?, ?, ?)`,
            [userRows[r].id, venueId, sampleReviews[r].rating, sampleReviews[r].comment]);
          totalRating += sampleReviews[r].rating;
          reviewCount++;
        } catch {}
      }
      if (reviewCount > 0) {
        await query(`UPDATE venues SET avg_rating = ?, total_reviews = ? WHERE id = ?`,
          [(totalRating / reviewCount).toFixed(1), reviewCount, venueId]);
      }
    }

    // 6. Add sample promotions
    console.log('🎟️  Tạo mã giảm giá mẫu...');
    await query(`INSERT IGNORE INTO promotions (code, discount_pct, discount_amt, usage_limit, is_active) VALUES
      ('WELCOME20', 20, NULL, 1000, 1),
      ('SPORTBOOK50K', NULL, 50000, 500, 1),
      ('NEWUSER', 15, NULL, 200, 1)`).catch(err => console.log('Promotion insert:', err.message));

    console.log('\n✅ Seed dữ liệu hoàn thành!');
    const [counts] = await queryArr(`SELECT
      (SELECT COUNT(*) FROM users) as users,
      (SELECT COUNT(*) FROM venues) as venues,
      (SELECT COUNT(*) FROM courts) as courts,
      (SELECT COUNT(*) FROM time_slots) as slots,
      (SELECT COUNT(*) FROM reviews) as reviews`);
    console.log(`  👤 Users: ${counts[0].users}`);
    console.log(`  🏟️  Venues: ${counts[0].venues}`);
    console.log(`  🎾 Courts: ${counts[0].courts}`);
    console.log(`  🕐 Time Slots: ${counts[0].slots}`);
    console.log(`  ⭐ Reviews: ${counts[0].reviews}`);
    console.log('\n🔑 Tài khoản test:');
    console.log('  Admin: 0900000000 (OTP: 123456)');
    console.log('  Owner: 0901111111 (OTP: 123456)');
    console.log('  User:  0911111111 (OTP: 123456)');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed thất bại:', err.message);
    console.error(err);
    process.exit(1);
  }
}

function query(sql, params) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err); else resolve(result);
    });
  });
}

function queryArr(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err); else resolve([result]);
    });
  });
}

runSeed();
