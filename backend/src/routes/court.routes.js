const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticate = require('../middlewares/auth');
const requireRole = require('../middlewares/role');
const moment = require('moment');

// GET /api/courts/:courtId/slots?date=YYYY-MM-DD
router.get('/:courtId/slots', (req, res) => {
  const { date } = req.query;
  const targetDate = date || moment().format('YYYY-MM-DD');
  db.query(`
    SELECT ts.*, b.booking_code, b.status as booking_status
    FROM time_slots ts
    LEFT JOIN bookings b ON b.slot_id = ts.id AND b.status NOT IN ('cancelled')
    WHERE ts.court_id = ? AND ts.slot_date = ? ORDER BY ts.start_time ASC`,
    [req.params.courtId, targetDate], (err, results) => {
      if (err) return res.status(500).json({ success: false, message: 'DB error' });
      res.json({ success: true, data: results, date: targetDate });
    }
  );
});

// GET /api/courts/venue/:venueId
router.get('/venue/:venueId', (req, res) => {
  db.query('SELECT * FROM courts WHERE venue_id = ? ORDER BY sport_type, name', [req.params.venueId], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    res.json({ success: true, data: results });
  });
});

// GET /api/courts/:id
router.get('/:id', (req, res) => {
  db.query('SELECT c.*, v.name as venue_name, v.address, v.open_time, v.close_time FROM courts c JOIN venues v ON v.id = c.venue_id WHERE c.id = ?',
    [req.params.id], (err, results) => {
    if (err || !results.length) return res.status(404).json({ success: false, message: 'Không tìm thấy sân con' });
    res.json({ success: true, data: results[0] });
  });
});

// POST /api/courts
router.post('/', authenticate, requireRole('owner', 'admin'), (req, res) => {
  const { venue_id, name, sport_type, price_per_hour, surface_type } = req.body;
  if (!venue_id || !name || !sport_type || !price_per_hour) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin' });
  }
  db.query('SELECT owner_id FROM venues WHERE id = ?', [venue_id], (err, results) => {
    if (!results.length) return res.status(404).json({ success: false, message: 'Sân không tồn tại' });
    if (results[0].owner_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Không có quyền' });

    db.query('INSERT INTO courts (venue_id, name, sport_type, price_per_hour, surface_type, status) VALUES (?, ?, ?, ?, ?, "available")',
      [venue_id, name, sport_type, price_per_hour, surface_type || null],
      (err2, result) => {
        if (err2) return res.status(500).json({ success: false, message: 'Tạo thất bại', error: err2.message });
        res.status(201).json({ success: true, message: 'Tạo sân con thành công', courtId: result.insertId });
      }
    );
  });
});

// PUT /api/courts/:id
router.put('/:id', authenticate, requireRole('owner', 'admin'), (req, res) => {
  const { name, price_per_hour, surface_type, status } = req.body;
  db.query('UPDATE courts SET name=?, price_per_hour=?, surface_type=?, status=? WHERE id=?',
    [name, price_per_hour, surface_type, status, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: 'Cập nhật thất bại' });
      res.json({ success: true, message: 'Cập nhật thành công' });
    }
  );
});

// POST /api/courts/:courtId/slots/generate - Tạo slots 1 ngày
router.post('/:courtId/slots/generate', authenticate, requireRole('owner', 'admin'), (req, res) => {
  const { courtId } = req.params;
  const { date, start_hour = 6, end_hour = 22 } = req.body;
  if (!date) return res.status(400).json({ success: false, message: 'Cần cung cấp ngày' });

  db.query('SELECT c.*, v.owner_id FROM courts c JOIN venues v ON v.id = c.venue_id WHERE c.id = ?', [courtId], (err, results) => {
    if (!results.length) return res.status(404).json({ success: false, message: 'Không tìm thấy sân' });
    if (results[0].owner_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Không có quyền' });

    const slots = [];
    for (let h = parseInt(start_hour); h < parseInt(end_hour); h++) {
      const start = `${String(h).padStart(2,'0')}:00:00`;
      const end = `${String(h+1).padStart(2,'0')}:00:00`;
      slots.push([courtId, date, start, end, 'open', null]);
    }

    db.query("DELETE FROM time_slots WHERE court_id = ? AND slot_date = ? AND status = 'open'", [courtId, date], () => {
      db.query('INSERT INTO time_slots (court_id, slot_date, start_time, end_time, status, price_override) VALUES ?',
        [slots], (err2, result) => {
          if (err2) return res.status(500).json({ success: false, message: 'Tạo slot thất bại' });
          res.json({ success: true, message: `Đã tạo ${slots.length} slot cho ngày ${date}`, count: slots.length });
        }
      );
    });
  });
});

// POST /api/courts/:courtId/slots/generate-range
router.post('/:courtId/slots/generate-range', authenticate, requireRole('owner', 'admin'), (req, res) => {
  const { courtId } = req.params;
  const { start_date, end_date, start_hour = 6, end_hour = 22 } = req.body;
  const start = moment(start_date);
  const end = moment(end_date);
  if (!start.isValid() || !end.isValid() || start.isAfter(end)) {
    return res.status(400).json({ success: false, message: 'Ngày không hợp lệ' });
  }

  db.query('SELECT c.*, v.owner_id FROM courts c JOIN venues v ON v.id = c.venue_id WHERE c.id = ?', [courtId], (ownerErr, ownerRows) => {
    if (ownerErr) return res.status(500).json({ success: false, message: 'DB error' });
    if (!ownerRows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy sân' });
    if (ownerRows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Không có quyền' });
    }

    const slots = [];
    const current = start.clone();
    while (current.isSameOrBefore(end)) {
      const dateStr = current.format('YYYY-MM-DD');
      for (let h = parseInt(start_hour); h < parseInt(end_hour); h++) {
        slots.push([courtId, dateStr, `${String(h).padStart(2,'0')}:00:00`, `${String(h+1).padStart(2,'0')}:00:00`, 'open', null]);
      }
      current.add(1, 'day');
    }

    db.query("DELETE FROM time_slots WHERE court_id = ? AND slot_date BETWEEN ? AND ? AND status = 'open'",
      [courtId, start_date, end_date], (deleteErr) => {
      if (deleteErr) return res.status(500).json({ success: false, message: 'Không thể làm mới slot trống' });

      db.query('INSERT INTO time_slots (court_id, slot_date, start_time, end_time, status, price_override) VALUES ?',
        [slots], (err, result) => {
          if (err) return res.status(500).json({ success: false, message: 'Tạo slot thất bại' });
          res.json({ success: true, message: `Đã tạo ${result.affectedRows} slot từ ${start_date} đến ${end_date}`, count: result.affectedRows });
        }
      );
    });
  });
});

// PUT /api/courts/:courtId/slots/:slotId/close - Đóng slot (owner)
router.put('/:courtId/slots/:slotId/close', authenticate, requireRole('owner', 'admin'), (req, res) => {
  db.query("UPDATE time_slots SET status = 'closed' WHERE id = ? AND court_id = ? AND status = 'open'",
    [req.params.slotId, req.params.courtId], (err, result) => {
      if (err) return res.status(500).json({ success: false, message: 'Lỗi' });
      res.json({ success: true, message: 'Đã đóng slot' });
    }
  );
});

module.exports = router;
