const express = require('express');
const router = express.Router();
const db = require('../db/database');

// get all users (Admin only)
router.get('/', (req, res) => {
    db.all(`SELECT user_id, name, email, role, enrollment_date FROM users`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// get students for a mentor
router.get('/mentor/:mentorId/students', (req, res) => {
    db.all(`SELECT u.user_id, u.name, u.email, r.risk_level, r.risk_score 
            FROM users u 
            LEFT JOIN risk_scores r ON u.user_id = r.user_id
            WHERE u.mentor_id = ? AND u.role = 'student'`, [req.params.mentorId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

module.exports = router;
