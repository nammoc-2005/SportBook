-- ============================================================
-- SportBook: Migration thêm hỗ trợ Google Sign-In
-- Chạy file này trong phpMyAdmin hoặc MySQL CLI
-- ============================================================

-- 1. Thêm cột google_id (lưu Google Account ID)
ALTER TABLE users 
  ADD COLUMN google_id VARCHAR(255) NULL DEFAULT NULL 
  AFTER email;

-- 2. Thêm cột auth_provider (phone/google/both)
ALTER TABLE users 
  ADD COLUMN auth_provider ENUM('phone','google','both') NOT NULL DEFAULT 'phone' 
  AFTER google_id;

-- 3. Thêm unique index cho google_id (một Google account = một user)
ALTER TABLE users 
  ADD UNIQUE INDEX idx_google_id (google_id);

-- 4. Cho phép phone là NULL (user đăng nhập bằng Google không có số điện thoại)
ALTER TABLE users 
  MODIFY COLUMN phone VARCHAR(20) NULL DEFAULT NULL;

-- 5. Xác nhận thay đổi
DESCRIBE users;
