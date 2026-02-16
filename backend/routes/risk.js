const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Get risk score for a user
router.get('/:userId', (req, res) => {
    db.get(`SELECT * FROM risk_scores WHERE user_id = ?`, [req.params.userId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || { message: 'No risk data found' });
    });
});

// Get risk stats (for Admin dashboard)
router.get('/stats/all', (req, res) => {
    db.all(`SELECT risk_level, COUNT(*) as count FROM risk_scores GROUP BY risk_level`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

module.exports = router;
