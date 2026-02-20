const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { calculateRisk } = require('../utils/riskEngine');
const { onAssignmentLogged } = require('../utils/alertService');

// log activity for a student.
// Body: { user_id, activity_type, title, submission_date, due_date, status, response_time_days }
router.post('/log', (req, res) => {
    const { user_id, activity_type, title, submission_date, due_date, status, response_time_days } = req.body;
    const itemTitle = (title && title.trim()) ? title.trim() : `${activity_type} — ${submission_date || 'N/A'}`;

    db.run(
        `INSERT INTO activity_logs (user_id, activity_type, title, submission_date, due_date, status, response_time_days)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [user_id, activity_type, itemTitle, submission_date, due_date, status, response_time_days],
        function (insertErr) {
            if (insertErr) return res.status(500).json({ error: insertErr.message });
            const logId = this.lastID;

            res.json({ message: 'Activity logged', logId });
            calculateRisk(user_id).catch(e => console.error('[RiskEngine]', e.message));
            if (activity_type === 'assignment' || activity_type === 'quiz') {
                db.get(
                    `SELECT u.name AS student_name, u.mentor_id,
                             m.name AS mentor_name
                     FROM users u
                     LEFT JOIN users m ON u.mentor_id = m.user_id
                     WHERE u.user_id = ?`,
                    [user_id],
                    async (lookupErr, row) => {
                        if (lookupErr || !row) return;
                        await onAssignmentLogged({
                            studentId:   user_id,
                            studentName: row.student_name,
                            mentorId:    row.mentor_id || null,
                            mentorName:  row.mentor_name || null,
                            activityType: activity_type,
                            title:       itemTitle,
                            dueDate:     due_date || null,
                            status:      status
                        });
                    }
                );
            }
        }
    );
});

// get activity logs for a user
router.get('/:userId', (req, res) => {
    db.all(
        `SELECT * FROM activity_logs WHERE user_id = ? ORDER BY submission_date DESC`,
        [req.params.userId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

module.exports = router;
