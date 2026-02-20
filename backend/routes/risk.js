const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { calculateRisk } = require('../utils/riskEngine');

// get risk score for a user
router.get('/:userId', (req, res) => {
    db.get(`SELECT * FROM risk_scores WHERE user_id = ?`, [req.params.userId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || { message: 'No risk data found' });
    });
});

// get risk stats (for Admin dashboard)
router.get('/stats/all', (req, res) => {
    db.all(`SELECT risk_level, COUNT(*) as count FROM risk_scores GROUP BY risk_level`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// trigger risk recalculation for a user (Admin use or manual refresh)
router.post('/recalculate/:userId', async (req, res) => {
    try {
        const result = await calculateRisk(req.params.userId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// bulk recalculate all students (Admin / cron use)
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

// GET /api/risk/students?sort=score|level&order=asc|desc&mentorId=X
router.get('/students', (req, res) => {
    const { sort = 'score', order = 'desc', mentorId = null } = req.query;
    
    const validSorts = ['score', 'level', 'name'];
    const validOrders = ['asc', 'desc'];
    
    const sortField = validSorts.includes(sort) ? sort : 'score';
    const sortOrder = validOrders.includes(order) ? order.toUpperCase() : 'DESC';
    
    let orderClause = '';
    if (sortField === 'score') {
        orderClause = `r.risk_score ${sortOrder}`;
    } else if (sortField === 'level') {
        // Sort by risk level: High > Medium > Low
        orderClause = `CASE r.risk_level 
                        WHEN 'High' THEN 1 
                        WHEN 'Medium' THEN 2 
                        WHEN 'Low' THEN 3 
                        ELSE 4 
                       END ${sortOrder}`;
    } else if (sortField === 'name') {
        orderClause = `u.name ${sortOrder}`;
    }

    let whereClause = '';
    let params = [];
    
    if (mentorId) {
        whereClause = 'WHERE u.mentor_id = ?';
        params = [mentorId];
    }

    db.all(
        `SELECT u.user_id, u.name, u.email, 
                r.risk_score, r.risk_level, r.last_updated,
                r.baseline_activity_score, r.current_activity_score,
                s.current_streak, s.longest_streak
         FROM users u
         LEFT JOIN risk_scores r ON u.user_id = r.user_id
         LEFT JOIN submission_streaks s ON u.user_id = s.user_id
         ${whereClause}
         WHERE u.role = 'student'
         ORDER BY ${orderClause}, u.name ASC`,
        params,
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

module.exports = router;
