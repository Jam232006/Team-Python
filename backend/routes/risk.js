const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { calculateRisk } = require('../utils/riskEngine');

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

// Manually trigger risk recalculation for a user
// Returns full breakdown: { score, riskLevel, breakdown: { metric1, metric2, metric3 } }
router.post('/recalculate/:userId', async (req, res) => {
    try {
        const result = await calculateRisk(req.params.userId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Bulk recalculate all students (Admin / cron use)
router.post('/recalculate/all/students', async (req, res) => {
    db.all(`SELECT user_id FROM users WHERE role = 'student'`, [], async (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const results = [];
        for (const row of rows) {
            try {
                const r = await calculateRisk(row.user_id);
                results.push({ userId: row.user_id, ...r });
            } catch (e) {
                results.push({ userId: row.user_id, error: e.message });
            }
        }
        res.json({ recalculated: results.length, results });
    });
});

module.exports = router;
