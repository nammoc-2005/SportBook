// Seed data: 15 sân thể thao thật tại Việt Nam
const venues = [
  // TP. HỒ CHÍ MINH
  {
    name: 'Sân Tennis Phú Thọ',
    address: '1 Lữ Gia, Phường 15, Quận 11, TP.HCM',
    latitude: 10.7644, longitude: 106.6553,
    description: 'Sân tennis chuẩn quốc tế nằm ngay trung tâm TP.HCM với mặt sân đá xanh thoáng mát. Có 6 sân tennis tiêu chuẩn, đèn LED chiếu sáng ban đêm, khu nghỉ ngơi có điều hòa.',
    sport_types: ['Tennis'],
    operating_hours: { open: '06:00', close: '22:00', days: ['T2','T3','T4','T5','T6','T7','CN'] },
    amenities: ['Đèn chiếu sáng', 'Phòng thay đồ', 'Căng tin', 'Gửi xe'],
    phone: '028 3865 1234',
    courts: [
      { name: 'Sân A1', sport_type: 'Tennis', price_per_hour: 120000 },
      { name: 'Sân A2', sport_type: 'Tennis', price_per_hour: 120000 },
      { name: 'Sân B1 (VIP)', sport_type: 'Tennis', price_per_hour: 180000 }
    ],
    images: [
      'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800',
      'https://images.unsplash.com/photo-1542144582-1ba00456b5e3?w=800'
    ]
  },
  {
    name: 'Sân Cầu Lông Tân Bình Sport',
    address: '135 Hoàng Hoa Thám, Phường 13, Quận Tân Bình, TP.HCM',
    latitude: 10.8033, longitude: 106.6495,
    description: 'Tổ hợp thể thao lớn nhất Tân Bình với 12 sân cầu lông đạt tiêu chuẩn thi đấu. Sàn gỗ chuyên dụng, lưới cầu lông BWF, ánh sáng đạt chuẩn 500 lux.',
    sport_types: ['Cầu lông'],
    operating_hours: { open: '05:30', close: '23:00', days: ['T2','T3','T4','T5','T6','T7','CN'] },
    amenities: ['Sàn gỗ chuyên dụng', 'Phòng VIP', 'Cho thuê vợt', 'WiFi', 'Camera an ninh'],
    phone: '028 3815 9999',
    courts: [
      { name: 'Sân số 1', sport_type: 'Cầu lông', price_per_hour: 80000 },
      { name: 'Sân số 2', sport_type: 'Cầu lông', price_per_hour: 80000 },
      { name: 'Sân số 3', sport_type: 'Cầu lông', price_per_hour: 80000 },
      { name: 'Sân VIP', sport_type: 'Cầu lông', price_per_hour: 150000 }
    ],
    images: [
      'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800',
      'https://images.unsplash.com/photo-1599391398918-bca55b2b91a9?w=800'
    ]
  },
  {
    name: 'Pickleball Arena Thủ Đức',
    address: 'KDC Vạn Phúc, Hiệp Bình Phước, TP. Thủ Đức, TP.HCM',
    latitude: 10.8394, longitude: 106.7341,
    description: 'Khu vui chơi Pickleball hiện đại nhất TP.HCM với 8 sân outdoor, sàn nhựa chuyên dụng chống trơn trượt. Phù hợp cho mọi lứa tuổi. Có huấn luyện viên riêng theo yêu cầu.',
    sport_types: ['Pickleball'],
    operating_hours: { open: '06:00', close: '22:00', days: ['T2','T3','T4','T5','T6','T7','CN'] },
    amenities: ['Sân outdoor', 'Cho thuê vợt Pickleball', 'HLV riêng', 'Bãi đậu xe rộng', 'Khu vực chờ có mái che'],
    phone: '028 7777 8888',
    courts: [
      { name: 'Court 1', sport_type: 'Pickleball', price_per_hour: 100000 },
      { name: 'Court 2', sport_type: 'Pickleball', price_per_hour: 100000 },
      { name: 'Court 3', sport_type: 'Pickleball', price_per_hour: 100000 },
      { name: 'Court Pro', sport_type: 'Pickleball', price_per_hour: 150000 }
    ],
    images: [
      'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800',
      'https://images.unsplash.com/photo-1575537302964-96cd47c06b1b?w=800'
    ]
  },
  {
    name: 'Sân Bóng Đá Mini Hóc Môn',
    address: '22 Đường Nguyễn Ảnh Thủ, Trung Mỹ Tây, Quận 12, TP.HCM',
    latitude: 10.8631, longitude: 106.6256,
    description: 'Cụm sân bóng đá mini cỏ nhân tạo Hóc Môn với 5 sân 5v5 và 2 sân 7v7. Cỏ nhân tạo thế hệ mới, hệ thống tưới nước tự động, đèn LED công suất cao.',
    sport_types: ['Bóng đá'],
    operating_hours: { open: '06:00', close: '23:30', days: ['T2','T3','T4','T5','T6','T7','CN'] },
    amenities: ['Cỏ nhân tạo', 'Phòng thay đồ', 'Tủ đồ cá nhân', 'Căng tin', 'Camera an ninh'],
    phone: '028 3891 5566',
    courts: [
      { name: 'Sân 5v5 số 1', sport_type: 'Bóng đá', price_per_hour: 200000 },
      { name: 'Sân 5v5 số 2', sport_type: 'Bóng đá', price_per_hour: 200000 },
      { name: 'Sân 7v7', sport_type: 'Bóng đá', price_per_hour: 350000 }
    ],
    images: [
      'https://images.unsplash.com/photo-1551958219-acbc630e2914?w=800',
      'https://images.unsplash.com/photo-1520075861083-4a83d00c3bc2?w=800'
    ]
  },
  {
    name: 'Sân Bóng Rổ BSS Arena Q7',
    address: '32 Nguyễn Thị Thập, Tân Phú, Quận 7, TP.HCM',
    latitude: 10.7280, longitude: 106.7014,
    description: 'Sân bóng rổ indoor đạt chuẩn NBA với sàn gỗ maple, hệ thống điều hòa trung tâm, màn hình LED điểm số. Thích hợp thi đấu và luyện tập chuyên nghiệp.',
    sport_types: ['Bóng rổ'],
    operating_hours: { open: '07:00', close: '22:00', days: ['T2','T3','T4','T5','T6','T7','CN'] },
    amenities: ['Sàn gỗ maple', 'Điều hòa', 'Phòng thay đồ VIP', 'Cửa hàng phụ kiện', 'Chụp ảnh kỷ niệm'],
    phone: '028 5413 9988',
    courts: [
      { name: 'Full court', sport_type: 'Bóng rổ', price_per_hour: 400000 },
      { name: 'Half court A', sport_type: 'Bóng rổ', price_per_hour: 200000 },
      { name: 'Half court B', sport_type: 'Bóng rổ', price_per_hour: 200000 }
    ],
    images: [
      'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
      'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=800'
    ]
  },
  {
    name: 'Sân Tennis Riverside Bình Thạnh',
    address: '15 Xô Viết Nghệ Tĩnh, Phường 17, Bình Thạnh, TP.HCM',
    latitude: 10.8116, longitude: 106.7125,
    description: 'Sân tennis cao cấp view sông Sài Gòn, mặt sân clay đỏ chuẩn Roland Garros. Có hồ bơi, spa và nhà hàng ngay trong khuôn viên.',
    sport_types: ['Tennis'],
    operating_hours: { open: '06:00', close: '21:00', days: ['T2','T3','T4','T5','T6','T7','CN'] },
    amenities: ['View sông', 'Sân clay', 'Hồ bơi', 'Spa', 'Nhà hàng', 'Câu lạc bộ thành viên'],
    phone: '028 3512 4444',
    courts: [
      { name: 'Clay Court 1', sport_type: 'Tennis', price_per_hour: 250000 },
      { name: 'Clay Court 2', sport_type: 'Tennis', price_per_hour: 250000 },
      { name: 'Hard Court VIP', sport_type: 'Tennis', price_per_hour: 350000 }
    ],
    images: [
      'https://images.unsplash.com/photo-1573670931226-e0eb4c9a8ad8?w=800',
      'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800'
    ]
  },
  {
    name: 'Cầu Lông Đức Thành Sport',
    address: '456 Lê Văn Việt, Tăng Nhơn Phú A, TP. Thủ Đức, TP.HCM',
    latitude: 10.8504, longitude: 106.7867,
    description: 'Trung tâm cầu lông lớn TP. Thủ Đức với 20 sân đạt chuẩn. Tổ chức giải thi đấu thường xuyên, có CLB cầu lông cuối tuần, lớp học cho trẻ em.',
    sport_types: ['Cầu lông'],
    operating_hours: { open: '05:00', close: '23:30', days: ['T2','T3','T4','T5','T6','T7','CN'] },
    amenities: ['20 sân', 'Lớp học', 'Cho thuê vợt', 'Căng tin', 'WiFi', 'Gửi xe'],
    phone: '028 3896 7777',
    courts: [
      { name: 'Sân thường 1', sport_type: 'Cầu lông', price_per_hour: 60000 },
      { name: 'Sân thường 2', sport_type: 'Cầu lông', price_per_hour: 60000 },
      { name: 'Sân có AC', sport_type: 'Cầu lông', price_per_hour: 120000 }
    ],
    images: [
      'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800'
    ]
  },
  {
    name: 'Sân Padel & Pickleball Landmark 81',
    address: 'Vinhomes Central Park, 208 Nguyễn Hữu Cảnh, Bình Thạnh, TP.HCM',
    latitude: 10.7944, longitude: 106.7215,
    description: 'Sân Padel và Pickleball đẳng cấp quốc tế tại tòa nhà Landmark 81. Thiết kế sang trọng, view thành phố tuyệt đẹp từ tầng cao. Phục vụ cộng đồng expatriate và doanh nhân.',
    sport_types: ['Padel', 'Pickleball'],
    operating_hours: { open: '06:00', close: '22:00', days: ['T2','T3','T4','T5','T6','T7','CN'] },
    amenities: ['View tầng cao', 'Locker room 5*', 'Dịch vụ towel', 'Nước uống complimentary', 'Phòng nghỉ VIP'],
    phone: '028 7109 9988',
    courts: [
      { name: 'Padel Court 1', sport_type: 'Padel', price_per_hour: 500000 },
      { name: 'Padel Court 2', sport_type: 'Padel', price_per_hour: 500000 },
      { name: 'Pickleball Court', sport_type: 'Pickleball', price_per_hour: 300000 }
    ],
    images: [
      'https://images.unsplash.com/photo-1607962837359-5e7e89f86776?w=800',
      'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800'
    ]
  },

  // HÀ NỘI
  {
    name: 'Sân Tennis Yết Kiêu Hà Nội',
    address: '18 Yết Kiêu, Hoàn Kiếm, Hà Nội',
    latitude: 21.0245, longitude: 105.8412,
    description: 'Sân tennis lâu đời nhất Hà Nội, nằm ngay trung tâm Hoàn Kiếm. 4 sân bê tông, đèn chiếu sáng đạt chuẩn, là nơi luyện tập của nhiều vận động viên chuyên nghiệp.',
    sport_types: ['Tennis'],
    operating_hours: { open: '06:00', close: '21:00', days: ['T2','T3','T4','T5','T6','T7','CN'] },
    amenities: ['Đèn chiếu sáng', 'Cho thuê vợt', 'Phòng thay đồ', 'Bán cầu'],
    phone: '024 3942 1234',
    courts: [
      { name: 'Sân số 1', sport_type: 'Tennis', price_per_hour: 100000 },
      { name: 'Sân số 2', sport_type: 'Tennis', price_per_hour: 100000 },
      { name: 'Sân số 3', sport_type: 'Tennis', price_per_hour: 100000 },
    ],
    images: [
      'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800'
    ]
  },
  {
    name: 'Sân Cầu Lông Bắc Từ Liêm',
    address: '15 Phú Diễn, Bắc Từ Liêm, Hà Nội',
    latitude: 21.0698, longitude: 105.7704,
    description: 'Trung tâm cầu lông hiện đại tại Bắc Từ Liêm với 16 sân, tất cả sử dụng sàn gỗ PVC chuyên dụng. Không gian rộng rãi, thoáng mát, phù hợp cả gia đình và câu lạc bộ.',
    sport_types: ['Cầu lông'],
    operating_hours: { open: '05:30', close: '23:00', days: ['T2','T3','T4','T5','T6','T7','CN'] },
    amenities: ['16 sân', 'Sàn PVC', 'Điều hòa', 'Căng tin', 'Cho thuê vợt'],
    phone: '024 3758 9012',
    courts: [
      { name: 'Sân A1', sport_type: 'Cầu lông', price_per_hour: 70000 },
      { name: 'Sân A2', sport_type: 'Cầu lông', price_per_hour: 70000 },
      { name: 'Sân VIP (AC)', sport_type: 'Cầu lông', price_per_hour: 130000 }
    ],
    images: [
      'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800'
    ]
  },
  {
    name: 'Sân Pickleball Tây Hồ',
    address: 'Khu đô thị Tây Hồ Tây, Phường Xuân Tảo, Bắc Từ Liêm, Hà Nội',
    latitude: 21.0731, longitude: 105.7869,
    description: 'Khu phức hợp Pickleball mới nhất Hà Nội với 6 sân outdoor view hồ Tây. Cộng đồng Pickleball sôi nổi, tổ chức giải hàng tuần, có HLV giảng dạy cho người mới.',
    sport_types: ['Pickleball'],
    operating_hours: { open: '06:00', close: '21:30', days: ['T2','T3','T4','T5','T6','T7','CN'] },
    amenities: ['View hồ Tây', 'Sân outdoor', 'HLV giảng dạy', 'Cho thuê vợt', 'Cafe'],
    phone: '024 6273 8899',
    courts: [
      { name: 'Court Lake View 1', sport_type: 'Pickleball', price_per_hour: 120000 },
      { name: 'Court Lake View 2', sport_type: 'Pickleball', price_per_hour: 120000 },
      { name: 'Court Pro', sport_type: 'Pickleball', price_per_hour: 180000 }
    ],
    images: [
      'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800'
    ]
  },
  {
    name: 'Sân Bóng Đá Mỹ Đình',
    address: 'Khu liên hợp thể thao Mỹ Đình, Nam Từ Liêm, Hà Nội',
    latitude: 21.0210, longitude: 105.7651,
    description: 'Tổ hợp bóng đá mini chuẩn FIFA tại Mỹ Đình. 8 sân với cỏ nhân tạo 3G chất lượng cao, hệ thống đèn LED công suất lớn, sân khán đài cho khán giả theo dõi.',
    sport_types: ['Bóng đá'],
    operating_hours: { open: '06:00', close: '23:00', days: ['T2','T3','T4','T5','T6','T7','CN'] },
    amenities: ['Cỏ 3G', 'Phòng thay đồ', 'Căng tin', 'Bãi đậu xe lớn', 'Khán đài'],
    phone: '024 3768 5566',
    courts: [
      { name: 'Sân 5v5 A', sport_type: 'Bóng đá', price_per_hour: 250000 },
      { name: 'Sân 5v5 B', sport_type: 'Bóng đá', price_per_hour: 250000 },
      { name: 'Sân 7v7', sport_type: 'Bóng đá', price_per_hour: 400000 },
      { name: 'Sân 11v11', sport_type: 'Bóng đá', price_per_hour: 800000 }
    ],
    images: [
      'https://images.unsplash.com/photo-1551958219-acbc630e2914?w=800'
    ]
  },
  {
    name: 'Tennis Court Ciputra',
    address: 'Khu đô thị Nam Thăng Long Ciputra, Tây Hồ, Hà Nội',
    latitude: 21.0777, longitude: 105.8042,
    description: 'Sân tennis đẳng cấp resort trong khu đô thị Ciputra, mặt sân phủ hạt cao su tổng hợp. Chỉ dành cho thành viên và khách mời, không gian riêng tư, yên tĩnh.',
    sport_types: ['Tennis'],
    operating_hours: { open: '07:00', close: '20:00', days: ['T2','T3','T4','T5','T6','T7','CN'] },
    amenities: ['Khu riêng tư', 'Hồ bơi kề sân', 'Phòng thay đồ cao cấp', 'Dịch vụ string racket'],
    phone: '024 3758 2288',
    courts: [
      { name: 'Court A (Outdoor)', sport_type: 'Tennis', price_per_hour: 200000 },
      { name: 'Court B (Outdoor)', sport_type: 'Tennis', price_per_hour: 200000 },
      { name: 'Indoor Court', sport_type: 'Tennis', price_per_hour: 350000 }
    ],
    images: [
      'https://images.unsplash.com/photo-1542144582-1ba00456b5e3?w=800'
    ]
  },
  {
    name: 'Sân Bóng Rổ Cầu Giấy',
    address: '86 Trần Thái Tông, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    latitude: 21.0328, longitude: 105.7956,
    description: 'Sân bóng rổ indoor hiện đại nhất Hà Nội với 2 full court và 4 half court. Sàn parquet chuyên nghiệp, đèn LED 1000 lux, camera HD 360 độ. Thường xuyên tổ chức giải 3x3.',
    sport_types: ['Bóng rổ'],
    operating_hours: { open: '07:00', close: '22:00', days: ['T2','T3','T4','T5','T6','T7','CN'] },
    amenities: ['Sàn parquet', 'Điều hòa trung tâm', 'Màn hình tính điểm', 'Cho thuê giày', 'Stream trực tiếp'],
    phone: '024 3795 6677',
    courts: [
      { name: 'Full Court 1', sport_type: 'Bóng rổ', price_per_hour: 350000 },
      { name: 'Full Court 2', sport_type: 'Bóng rổ', price_per_hour: 350000 },
      { name: 'Half Court A', sport_type: 'Bóng rổ', price_per_hour: 180000 }
    ],
    images: [
      'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800'
    ]
  },
  {
    name: 'Sân Đa Năng Hoàng Mai',
    address: '5 Đền Lừ, Hoàng Văn Thụ, Hoàng Mai, Hà Nội',
    latitude: 20.9919, longitude: 105.8603,
    description: 'Trung tâm thể thao đa năng Hoàng Mai phục vụ cầu lông, bóng bàn, và thể dục. Giá tốt, gần khu dân cư đông đúc. Phù hợp cho cả gia đình và nhóm bạn.',
    sport_types: ['Cầu lông', 'Bóng bàn'],
    operating_hours: { open: '05:30', close: '23:00', days: ['T2','T3','T4','T5','T6','T7','CN'] },
    amenities: ['Đa năng', 'Giá thân thiện', 'Cho thuê thiết bị', 'Bãi xe rộng'],
    phone: '024 3632 4455',
    courts: [
      { name: 'Cầu lông 1', sport_type: 'Cầu lông', price_per_hour: 55000 },
      { name: 'Cầu lông 2', sport_type: 'Cầu lông', price_per_hour: 55000 },
      { name: 'Bóng bàn 1', sport_type: 'Bóng bàn', price_per_hour: 40000 }
    ],
    images: [
      'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800'
    ]
  }
];

module.exports = venues;
