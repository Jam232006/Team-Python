const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { createAlert } = require('../utils/alertService');

// POST /api/invites/send
// Body: { mentor_id, class_id, identifier } where identifier is email or username
router.post('/send', async (req, res) => {
    const { mentor_id, class_id, identifier } = req.body;
    
    if (!mentor_id || !class_id || !identifier) {
        return res.status(400).json({ error: 'mentor_id, class_id, and identifier (email or username) are required.' });
    }

    // Check if class exists and belongs to mentor
    db.get(
        `SELECT c.*, u.name AS mentor_name 
         FROM classes c 
         JOIN users u ON c.mentor_id = u.user_id
         WHERE c.class_id = ? AND c.mentor_id = ?`,
        [class_id, mentor_id],
        async (err, classInfo) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!classInfo) return res.status(404).json({ error: 'Class not found or unauthorized.' });

            // Look up student by email or username (name field)
            const isEmail = identifier.includes('@');
            const lookupField = isEmail ? 'email' : 'name';
            
            db.get(
                `SELECT user_id, name, email, role FROM users WHERE ${lookupField} = ? AND role = 'student'`,
                [identifier],
                async (err2, student) => {
                    if (err2) return res.status(500).json({ error: err2.message });
                    
                    if (!student) {
                        // Student not found - store pending invite with their identifier
                        db.run(
                            `INSERT INTO invites (mentor_id, class_id, ${isEmail ? 'student_email' : 'student_username'}, status)
                             VALUES (?, ?, ?, 'pending')`,
                            [mentor_id, class_id, identifier],
                            function (err3) {
                                if (err3) return res.status(500).json({ error: err3.message });
                                return res.json({ 
                                    message: `Invite sent to ${identifier}. They will be notified when they sign up.`,
                                    invite_id: this.lastID,
                                    pending: true
                                });
                            }
                        );
                    } else {
                        // Student exists - check if already in class
                        db.get(
                            `SELECT * FROM class_members WHERE class_id = ? AND student_id = ?`,
                            [class_id, student.user_id],
                            async (err3, membership) => {
                                if (membership) {
                                    return res.status(400).json({ error: 'Student is already a member of this class.' });
                                }

                                // Check for existing pending invite
                                db.get(
                                    `SELECT * FROM invites WHERE class_id = ? AND invited_student_id = ? AND status = 'pending'`,
                                    [class_id, student.user_id],
                                    async (err4, existingInvite) => {
                                        if (existingInvite) {
                                            return res.status(400).json({ error: 'An invite is already pending for this student.' });
                                        }

                                        // Create invite
                                        db.run(
                                            `INSERT INTO invites (mentor_id, class_id, invited_student_id, student_email, student_username, status)
                                             VALUES (?, ?, ?, ?, ?, 'pending')`,
                                            [mentor_id, class_id, student.user_id, student.email, student.name],
                                            async function (err5) {
                                                if (err5) return res.status(500).json({ error: err5.message });
                                                
                                                const inviteId = this.lastID;

                                                // Create notification alert for the student
                                                await createAlert({
                                                    subjectUserId: mentor_id,
                                                    recipientId: student.user_id,
                                                    recipientRole: 'student',
                                                    alertType: 'class_invite',
                                                    message: `${classInfo.mentor_name} has invited you to join the class "${classInfo.name}". Check your invites to accept or decline.`
                                                }).catch(console.error);

                                                res.json({
                                                    message: `Invite sent to ${student.name} (${student.email})`,
                                                    invite_id: inviteId,
                                                    student_id: student.user_id
                                                });
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    }
                }
            );
        }
    );
});

// GET /api/invites/student/:studentId
router.get('/student/:studentId', (req, res) => {
    db.all(
        `SELECT i.*, 
                c.name AS class_name, 
                c.description AS class_description,
                u.name AS mentor_name,
                u.email AS mentor_email
         FROM invites i
         JOIN classes c ON i.class_id = c.class_id
         JOIN users u ON i.mentor_id = u.user_id
         WHERE i.invited_student_id = ? AND i.status = 'pending'
         ORDER BY i.created_at DESC`,
        [req.params.studentId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// GET /api/invites/mentor/:mentorId
router.get('/mentor/:mentorId', (req, res) => {
    db.all(
        `SELECT i.*, 
                c.name AS class_name,
                u.name AS student_name,
                u.email AS student_email
         FROM invites i
         JOIN classes c ON i.class_id = c.class_id
         LEFT JOIN users u ON i.invited_student_id = u.user_id
         WHERE i.mentor_id = ?
         ORDER BY i.created_at DESC`,
        [req.params.mentorId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// POST /api/invites/:inviteId/accept
// Body: { student_id }
router.post('/:inviteId/accept', async (req, res) => {
    const { student_id } = req.body;
    const { inviteId } = req.params;

    if (!student_id) {
        return res.status(400).json({ error: 'student_id is required.' });
    }

    db.get(`SELECT * FROM invites WHERE invite_id = ? AND invited_student_id = ?`, [inviteId, student_id], async (err, invite) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!invite) return res.status(404).json({ error: 'Invite not found or unauthorized.' });
        if (invite.status !== 'pending') return res.status(400).json({ error: 'Invite has already been responded to.' });

        // Add student to class
        db.run(
            `INSERT OR IGNORE INTO class_members (class_id, student_id) VALUES (?, ?)`,
            [invite.class_id, student_id],
            async function (err2) {
                if (err2) return res.status(500).json({ error: err2.message });

                // Update invite status
                db.run(
                    `UPDATE invites SET status = 'accepted', responded_at = CURRENT_TIMESTAMP WHERE invite_id = ?`,
                    [inviteId],
                    async (err3) => {
                        if (err3) return res.status(500).json({ error: err3.message });

                        // Get class and student info for notification
                        db.get(
                            `SELECT c.name AS class_name, c.mentor_id, u.name AS student_name
                             FROM classes c, users u
                             WHERE c.class_id = ? AND u.user_id = ?`,
                            [invite.class_id, student_id],
                            async (err4, info) => {
                                if (info) {
                                    // Notify mentor
                                    await createAlert({
                                        subjectUserId: student_id,
                                        recipientId: info.mentor_id,
                                        recipientRole: 'mentor',
                                        alertType: 'invite_accepted',
                                        message: `${info.student_name} has accepted your invitation to join "${info.class_name}".`
                                    }).catch(console.error);
                                }

                                res.json({ message: 'Invite accepted. You have joined the class.' });
                            }
                        );
                    }
                );
            }
        );
    });
});

// POST /api/invites/:inviteId/reject
// Body: { student_id }
router.post('/:inviteId/reject', async (req, res) => {
    const { student_id } = req.body;
    const { inviteId } = req.params;

    if (!student_id) {
        return res.status(400).json({ error: 'student_id is required.' });
    }

    db.get(`SELECT * FROM invites WHERE invite_id = ? AND invited_student_id = ?`, [inviteId, student_id], async (err, invite) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!invite) return res.status(404).json({ error: 'Invite not found or unauthorized.' });
        if (invite.status !== 'pending') return res.status(400).json({ error: 'Invite has already been responded to.' });

        db.run(
            `UPDATE invites SET status = 'rejected', responded_at = CURRENT_TIMESTAMP WHERE invite_id = ?`,
            [inviteId],
            async (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });

                // Get class and student info for notification
                db.get(
                    `SELECT c.name AS class_name, c.mentor_id, u.name AS student_name
                     FROM classes c, users u
                     WHERE c.class_id = ? AND u.user_id = ?`,
                    [invite.class_id, student_id],
                    async (err3, info) => {
                        if (info) {
                            // Notify mentor
                            await createAlert({
                                subjectUserId: student_id,
                                recipientId: info.mentor_id,
                                recipientRole: 'mentor',
                                alertType: 'invite_rejected',
                                message: `${info.student_name} has declined your invitation to join "${info.class_name}".`
                            }).catch(console.error);
                        }

                        res.json({ message: 'Invite rejected.' });
                    }
                );
            }
        );
    });
});

module.exports = router;
