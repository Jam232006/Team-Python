const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { onAssignmentLogged } = require('../utils/alertService');

// ── Create and issue an assignment to a class ─────────────────────────────────
// POST /api/assignments
// Body: { mentor_id, class_id, title, description?, due_date? }
// Creates the assignment, then fans out a pending submission row + activity log
// row + alert for every student currently in the class.
router.post('/', (req, res) => {
    const { mentor_id, class_id, title, description = '', due_date } = req.body;
    if (!mentor_id || !class_id || !title) {
        return res.status(400).json({ error: 'mentor_id, class_id, and title are required.' });
    }

    // 1. Insert the assignment record
    db.run(
        `INSERT INTO assignments (mentor_id, class_id, title, description, due_date) VALUES (?, ?, ?, ?, ?)`,
        [mentor_id, class_id, title, description, due_date || null],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            const assignmentId = this.lastID;

            // 2. Fetch mentor name + all students in the class
            db.get(`SELECT u.name AS mentor_name FROM users u WHERE u.user_id = ?`, [mentor_id], (mErr, mentorRow) => {
                const mentorName = mentorRow ? mentorRow.mentor_name : 'Unknown Mentor';

                db.all(
                    `SELECT cm.student_id, u.name AS student_name
                     FROM class_members cm
                     JOIN users u ON cm.student_id = u.user_id
                     WHERE cm.class_id = ?`,
                    [class_id],
                    async (err2, students) => {
                        if (err2) return res.status(500).json({ error: err2.message });
                        if (!students.length) {
                            return res.json({ message: 'Assignment created. No students in class yet.', assignment_id: assignmentId });
                        }

                        // 3. For each student: insert submission placeholder + activity log + alerts
                        let issued = 0;
                        for (const { student_id, student_name } of students) {
                            // Submission tracking row
                            await new Promise(resolve => db.run(
                                `INSERT OR IGNORE INTO assignment_submissions (assignment_id, student_id, status) VALUES (?, ?, 'pending')`,
                                [assignmentId, student_id], resolve
                            ));

                            // Activity log entry so the risk engine sees it
                            await new Promise(resolve => db.run(
                                `INSERT INTO activity_logs (user_id, activity_type, title, submission_date, due_date, status, response_time_days)
                                 VALUES (?, 'assignment', ?, CURRENT_TIMESTAMP, ?, 'pending', 0)`,
                                [student_id, title, due_date || null], resolve
                            ));

                            // Alerts (student reminder + mentor + admin)
                            await onAssignmentLogged({
                                studentId:    student_id,
                                studentName:  student_name,
                                mentorId:     mentor_id,
                                mentorName:   mentorName,
                                activityType: 'assignment',
                                title,
                                dueDate:      due_date || null,
                                status:       'pending'
                            }).catch(() => {});

                            issued++;
                        }

                        res.json({
                            message: `Assignment "${title}" issued to ${issued} student(s).`,
                            assignment_id: assignmentId,
                            issued_to: issued
                        });
                    }
                );
            });
        }
    );
});

// ── Get all assignments created by a mentor ───────────────────────────────────
// GET /api/assignments/mentor/:mentorId
router.get('/mentor/:mentorId', (req, res) => {
    db.all(
        `SELECT a.*,
                c.name AS class_name,
                COUNT(s.student_id)                                           AS total_students,
                SUM(CASE WHEN sub.status = 'submitted' THEN 1 ELSE 0 END)    AS submitted_count,
                SUM(CASE WHEN sub.status = 'missed'    THEN 1 ELSE 0 END)    AS missed_count,
                SUM(CASE WHEN sub.status = 'pending'   THEN 1 ELSE 0 END)    AS pending_count
         FROM assignments a
         LEFT JOIN classes c           ON a.class_id = c.class_id
         LEFT JOIN class_members s     ON a.class_id = s.class_id
         LEFT JOIN assignment_submissions sub ON a.assignment_id = sub.assignment_id AND sub.student_id = s.student_id
         WHERE a.mentor_id = ?
         GROUP BY a.assignment_id
         ORDER BY a.created_at DESC`,
        [req.params.mentorId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// ── Get assignments for a specific class ──────────────────────────────────────
// GET /api/assignments/class/:classId
router.get('/class/:classId', (req, res) => {
    db.all(
        `SELECT a.*,
                SUM(CASE WHEN sub.status = 'submitted' THEN 1 ELSE 0 END) AS submitted_count,
                SUM(CASE WHEN sub.status = 'missed'    THEN 1 ELSE 0 END) AS missed_count,
                SUM(CASE WHEN sub.status = 'pending'   THEN 1 ELSE 0 END) AS pending_count,
                COUNT(sub.submission_id)                                   AS total_students
         FROM assignments a
         LEFT JOIN assignment_submissions sub ON a.assignment_id = sub.assignment_id
         WHERE a.class_id = ?
         GROUP BY a.assignment_id
         ORDER BY a.created_at DESC`,
        [req.params.classId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// ── Get assignments for a student (all their pending/submitted work) ───────────
// GET /api/assignments/student/:studentId
router.get('/student/:studentId', (req, res) => {
    db.all(
        `SELECT a.assignment_id, a.title, a.description, a.due_date, a.status AS assignment_status,
                c.name AS class_name,
                u.name AS mentor_name,
                sub.status AS submission_status,
                sub.submitted_at,
                sub.response_time_days
         FROM assignment_submissions sub
         JOIN assignments a ON sub.assignment_id = a.assignment_id
         LEFT JOIN classes c ON a.class_id = c.class_id
         LEFT JOIN users u   ON a.mentor_id = u.user_id
         WHERE sub.student_id = ?
         ORDER BY a.due_date ASC, a.created_at DESC`,
        [req.params.studentId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// ── Get submission detail for an assignment (per-student breakdown) ───────────
// GET /api/assignments/:assignmentId/submissions
router.get('/:assignmentId/submissions', (req, res) => {
    db.all(
        `SELECT sub.*, u.name AS student_name, u.email AS student_email, r.risk_level
         FROM assignment_submissions sub
         JOIN users u ON sub.student_id = u.user_id
         LEFT JOIN risk_scores r ON u.user_id = r.user_id
         WHERE sub.assignment_id = ?
         ORDER BY sub.status, u.name`,
        [req.params.assignmentId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// ── Student submits an assignment ─────────────────────────────────────────────
// PATCH /api/assignments/:assignmentId/submit
// Body: { student_id, response_time_days? }
router.patch('/:assignmentId/submit', (req, res) => {
    const { student_id, response_time_days = 0 } = req.body;
    if (!student_id) return res.status(400).json({ error: 'student_id is required.' });

    const now = new Date().toISOString();

    db.run(
        `UPDATE assignment_submissions
         SET status = 'submitted', submitted_at = ?, response_time_days = ?
         WHERE assignment_id = ? AND student_id = ? AND status = 'pending'`,
        [now, response_time_days, req.params.assignmentId, student_id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(400).json({ error: 'Submission not found or already submitted.' });

            // Also update the corresponding activity_log entry
            db.run(
                `UPDATE activity_logs
                 SET status = 'submitted', submission_date = ?, response_time_days = ?
                 WHERE user_id = ? AND activity_type = 'assignment' AND status = 'pending'
                 ORDER BY log_id DESC LIMIT 1`,
                [now, response_time_days, student_id]
            );

            res.json({ message: 'Assignment submitted successfully.' });
        }
    );
});

// ── Mentor closes an assignment (marks all pending as missed) ─────────────────
// PATCH /api/assignments/:assignmentId/close
router.patch('/:assignmentId/close', (req, res) => {
    db.serialize(() => {
        db.run(`UPDATE assignments SET status = 'closed' WHERE assignment_id = ?`, [req.params.assignmentId]);
        db.run(
            `UPDATE assignment_submissions SET status = 'missed'
             WHERE assignment_id = ? AND status = 'pending'`,
            [req.params.assignmentId],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: `Assignment closed. ${this.changes} pending submission(s) marked missed.` });
            }
        );
    });
});

module.exports = router;
