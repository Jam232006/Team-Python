const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Get alerts for a user (or mentor's students)
router.get('/:userId', (req, res) => {
    db.all(`SELECT * FROM alerts WHERE user_id = ? ORDER BY alert_date DESC`, [req.params.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Resolve an alert
router.patch('/:alertId/resolve', (req, res) => {
    db.run(`UPDATE alerts SET resolved_status = 1 WHERE alert_id = ?`, [req.params.alertId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Alert resolved' });
    });
});

// Get all alerts (Admin)
router.get('/all/active', (req, res) => {
    db.all(`SELECT a.*, u.name as user_name FROM alerts a JOIN users u ON a.user_id = u.user_id WHERE a.resolved_status = 0`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

module.exports = router;
