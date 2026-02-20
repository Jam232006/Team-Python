const express = require('express');
const router = express.Router();
const db = require('../db/database');

// IMPORTANT: specific paths must come before wildcard /:userId. express matches routes in order.

// get all unresolved Admin alerts — alias kept for backward compatibility
router.get('/all/active', (req, res) => {
    db.all(
        `SELECT a.*,
                u.name AS student_name,
                m.name AS mentor_name
         FROM alerts a
         LEFT JOIN users u ON a.user_id = u.user_id
         LEFT JOIN users m ON u.mentor_id = m.user_id
         WHERE a.recipient_role = 'admin' AND a.resolved_status = 0
         ORDER BY a.alert_date DESC`,
        [],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// get all alerts (resolved + unresolved) for Admin overview
router.get('/all/history', (req, res) => {
    db.all(
        `SELECT a.*, u.name AS user_name
         FROM alerts a
         JOIN users u ON a.user_id = u.user_id
         ORDER BY a.alert_date DESC`,
        [],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});


// STUDENT: their own alerts (submitted confirmations, reminders, overdue, risk)
router.get('/for/student/:userId', (req, res) => {
    db.all(
        `SELECT *,
                CASE alert_type
                    WHEN 'assignment_submitted' THEN 'Submission'
                    WHEN 'assignment_reminder'  THEN 'Reminder'
                    WHEN 'assignment_overdue'   THEN 'Overdue'
                    WHEN 'risk_change'          THEN 'Risk'
                    ELSE 'General'
                END AS alert_category
         FROM alerts
         WHERE recipient_id = ? AND recipient_role = 'student'
         ORDER BY resolved_status ASC, alert_date DESC`,
        [req.params.userId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// MENTOR: alerts for their student squad (upcoming, overdue, risk changes)
router.get('/for/mentor/:userId', (req, res) => {
    db.all(
        `SELECT a.*,
                u.name AS student_name,
                CASE a.alert_type
                    WHEN 'assignment_due'         THEN 'Assignment Due'
                    WHEN 'assignment_date_passed' THEN 'Overdue'
                    WHEN 'risk_change'            THEN 'Risk Alert'
                    ELSE 'General'
                END AS alert_category
         FROM alerts a
         LEFT JOIN users u ON a.user_id = u.user_id
         WHERE a.recipient_id = ? AND a.recipient_role = 'mentor'
         ORDER BY a.resolved_status ASC, a.alert_date DESC`,
        [req.params.userId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// ADMIN: broadcast alerts (assignment assigned, dates passed, risk alerts)
router.get('/for/admin', (req, res) => {
    db.all(
        `SELECT a.*,
                u.name  AS student_name,
                m.name  AS mentor_name,
                CASE a.alert_type
                    WHEN 'assignment_assigned'    THEN 'Assignment Created'
                    WHEN 'assignment_date_passed' THEN 'Deadline Passed'
                    WHEN 'risk_alert'             THEN 'Risk Critical'
                    ELSE 'General'
                END AS alert_category
         FROM alerts a
         LEFT JOIN users u ON a.user_id = u.user_id
         LEFT JOIN users m ON u.mentor_id = m.user_id
         WHERE a.recipient_role = 'admin'
         ORDER BY a.resolved_status ASC, a.alert_date DESC`,
        [],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Manual alert creation with full dedup using recipient_id + recipient_role + alert_type
router.post('/create', (req, res) => {
    const { user_id, recipient_id = null, recipient_role = 'admin', alert_type = 'general', risk_level = null, alert_message } = req.body;
    if (!user_id || !alert_message) {
        return res.status(400).json({ error: 'user_id and alert_message are required.' });
    }

    db.get(
        `SELECT alert_id FROM alerts
         WHERE user_id = ? AND recipient_id IS ? AND recipient_role = ? AND alert_type = ? AND resolved_status = 0
         LIMIT 1`,
        [user_id, recipient_id, recipient_role, alert_type],
        (err, existing) => {
            if (err) return res.status(500).json({ error: err.message });
            if (existing) {
                return res.json({ message: 'Open alert already exists — no duplicate created.', alert_id: existing.alert_id });
            }

            db.run(
                `INSERT INTO alerts (user_id, recipient_id, recipient_role, alert_type, risk_level, alert_message)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [user_id, recipient_id, recipient_role, alert_type, risk_level, alert_message],
                function (err2) {
                    if (err2) return res.status(500).json({ error: err2.message });
                    res.json({ message: 'Alert created.', alert_id: this.lastID });
                }
            );
        }
    );
});

// resolve a single alert
router.patch('/:alertId/resolve', (req, res) => {
    db.run(
        `UPDATE alerts SET resolved_status = 1 WHERE alert_id = ?`,
        [req.params.alertId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Alert not found.' });
            res.json({ message: 'Alert resolved.' });
        }
    );
});

// resolve all open alerts for a user
router.patch('/user/:userId/resolve-all', (req, res) => {
    db.run(
        `UPDATE alerts SET resolved_status = 1 WHERE user_id = ? AND resolved_status = 0`,
        [req.params.userId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: `${this.changes} alert(s) resolved.` });
        }
    );
});

// get all alerts for a specific user
router.get('/:userId', (req, res) => {
    db.all(
        `SELECT * FROM alerts WHERE user_id = ? ORDER BY alert_date DESC`,
        [req.params.userId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

module.exports = router;
