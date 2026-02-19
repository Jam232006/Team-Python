const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const crypto  = require('crypto');

// Generate a unique, readable 6-char invite code
const genInviteCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();

// ── Create a class ────────────────────────────────────────────────────────────
// POST /api/classes
// Body: { mentor_id, name, description? }
router.post('/', (req, res) => {
    const { mentor_id, name, description = '' } = req.body;
    if (!mentor_id || !name) return res.status(400).json({ error: 'mentor_id and name are required.' });

    const tryInsert = (attempts = 0) => {
        if (attempts > 5) return res.status(500).json({ error: 'Could not generate a unique invite code.' });
        const code = genInviteCode();
        db.run(
            `INSERT INTO classes (mentor_id, name, description, invite_code) VALUES (?, ?, ?, ?)`,
            [mentor_id, name, description, code],
            function (err) {
                if (err && err.message.includes('UNIQUE')) return tryInsert(attempts + 1);
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Class created.', class_id: this.lastID, invite_code: code });
            }
        );
    };
    tryInsert();
});

// ── Get all classes for a mentor ──────────────────────────────────────────────
// GET /api/classes/mentor/:mentorId
router.get('/mentor/:mentorId', (req, res) => {
    db.all(
        `SELECT c.*,
                COUNT(cm.student_id) AS member_count
         FROM classes c
         LEFT JOIN class_members cm ON c.class_id = cm.class_id
         WHERE c.mentor_id = ?
         GROUP BY c.class_id
         ORDER BY c.created_at DESC`,
        [req.params.mentorId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// ── Get members of a class ────────────────────────────────────────────────────
// GET /api/classes/:classId/members
router.get('/:classId/members', (req, res) => {
    db.all(
        `SELECT u.user_id, u.name, u.email, r.risk_level, r.risk_score, cm.joined_at
         FROM class_members cm
         JOIN users u ON cm.student_id = u.user_id
         LEFT JOIN risk_scores r ON u.user_id = r.user_id
         WHERE cm.class_id = ?
         ORDER BY u.name`,
        [req.params.classId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// ── Get invite code for a class (mentor can share this) ───────────────────────
// GET /api/classes/:classId/invite
router.get('/:classId/invite', (req, res) => {
    db.get(`SELECT invite_code, name FROM classes WHERE class_id = ?`, [req.params.classId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Class not found.' });
        res.json({ invite_code: row.invite_code, class_name: row.name });
    });
});

// ── Regenerate invite code ────────────────────────────────────────────────────
// POST /api/classes/:classId/invite/regenerate
router.post('/:classId/invite/regenerate', (req, res) => {
    const tryUpdate = (attempts = 0) => {
        if (attempts > 5) return res.status(500).json({ error: 'Could not generate a unique invite code.' });
        const code = genInviteCode();
        db.run(`UPDATE classes SET invite_code = ? WHERE class_id = ?`, [code, req.params.classId], function (err) {
            if (err && err.message.includes('UNIQUE')) return tryUpdate(attempts + 1);
            if (err) return res.status(500).json({ error: err.message });
            res.json({ invite_code: code });
        });
    };
    tryUpdate();
});

// ── Student joins a class via invite code ─────────────────────────────────────
// POST /api/classes/join
// Body: { student_id, invite_code }
router.post('/join', (req, res) => {
    const { student_id, invite_code } = req.body;
    if (!student_id || !invite_code) return res.status(400).json({ error: 'student_id and invite_code are required.' });

    db.get(`SELECT class_id, name, mentor_id FROM classes WHERE invite_code = ?`, [invite_code.toUpperCase().trim()], (err, cls) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!cls) return res.status(404).json({ error: 'Invalid invite code. No class found.' });

        db.run(
            `INSERT OR IGNORE INTO class_members (class_id, student_id) VALUES (?, ?)`,
            [cls.class_id, student_id],
            function (err2) {
                if (err2) return res.status(500).json({ error: err2.message });

                // Also set mentor_id on the student record if not already set
                db.run(
                    `UPDATE users SET mentor_id = ? WHERE user_id = ? AND mentor_id IS NULL`,
                    [cls.mentor_id, student_id]
                );

                const alreadyMember = this.changes === 0;
                res.json({
                    message: alreadyMember ? 'Already a member of this class.' : `Joined "${cls.name}" successfully.`,
                    class_id: cls.class_id,
                    class_name: cls.name
                });
            }
        );
    });
});

// ── Mentor manually adds a student to a class ─────────────────────────────────
// POST /api/classes/:classId/members
// Body: { student_id }
router.post('/:classId/members', (req, res) => {
    const { student_id } = req.body;
    if (!student_id) return res.status(400).json({ error: 'student_id is required.' });

    // Verify class exists and get mentor_id
    db.get(`SELECT mentor_id FROM classes WHERE class_id = ?`, [req.params.classId], (err, cls) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!cls) return res.status(404).json({ error: 'Class not found.' });

        db.run(
            `INSERT OR IGNORE INTO class_members (class_id, student_id) VALUES (?, ?)`,
            [req.params.classId, student_id],
            function (err2) {
                if (err2) return res.status(500).json({ error: err2.message });
                // Set mentor link
                db.run(`UPDATE users SET mentor_id = ? WHERE user_id = ? AND mentor_id IS NULL`, [cls.mentor_id, student_id]);
                res.json({ message: this.changes > 0 ? 'Student added to class.' : 'Student already in class.' });
            }
        );
    });
});

// ── Remove a student from a class ────────────────────────────────────────────
// DELETE /api/classes/:classId/members/:studentId
router.delete('/:classId/members/:studentId', (req, res) => {
    db.run(
        `DELETE FROM class_members WHERE class_id = ? AND student_id = ?`,
        [req.params.classId, req.params.studentId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Membership not found.' });
            res.json({ message: 'Student removed from class.' });
        }
    );
});

// ── Get single class detail ───────────────────────────────────────────────────
router.get('/:classId', (req, res) => {
    db.get(`SELECT * FROM classes WHERE class_id = ?`, [req.params.classId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Class not found.' });
        res.json(row);
    });
});

module.exports = router;
