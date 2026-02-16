const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { calculateRisk } = require('../utils/riskEngine');

// Log manual activity
router.post('/log', async (req, res) => {
    const { user_id, activity_type, submission_date, due_date, status, response_time_days } = req.body;

    db.run(`INSERT INTO activity_logs (user_id, activity_type, submission_date, due_date, status, response_time_days)
          VALUES (?, ?, ?, ?, ?, ?)`,
        [user_id, activity_type, submission_date, due_date, status, response_time_days],
        async function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Trigger risk recalculation
            try {
                await calculateRisk(user_id);
                res.json({ message: 'Activity logged and risk updated', logId: this.lastID });
            } catch (calcErr) {
                res.status(500).json({ error: 'Activity logged but risk calculation failed', details: calcErr.message });
            }
        }
    );
});

// Get user activity
router.get('/:userId', (req, res) => {
    db.all(`SELECT * FROM activity_logs WHERE user_id = ? ORDER BY submission_date DESC`, [req.params.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

module.exports = router;
