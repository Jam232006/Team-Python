const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

// middleware to check for admin role
const requireAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') return res.status(403).json({ error: 'Admin Terminal access required' });
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// registration (open to all, but role must be valid)
router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;

    const allowedRoles = ['student', 'mentor', 'admin'];
    if (!allowedRoles.includes(role)) {
        return res.status(403).json({
            error: 'Invalid role. Allowed roles: admin, mentor, student'
        });
    }

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
        [name, email, hashedPassword, role],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint')) {
                    return res.status(400).json({ error: 'An account with this email already exists.' });
                }
                return res.status(400).json({ error: err.message });
            }
            // set initial risk level for students (might be changed later to modify according to past, but forrr now runs every reload)
            if (role === 'student') {
                db.run(`INSERT INTO risk_scores (user_id, baseline_activity_score, current_activity_score, risk_score, risk_level) VALUES (?, 10, 10, 0, 'Low')`,
                    [this.lastID]);
            }

            res.json({ message: 'Account created successfully. You may now log in.', userId: this.lastID });
        }
    );
});

// admin - provision new accounts (admin only)
router.post('/admin/create-user', requireAdmin, async (req, res) => {
    const { name, email, password, role, mentor_id } = req.body;

    const validRoles = ['admin', 'mentor', 'student'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be admin, mentor, or student.' });
    }

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // mentor_id only applies to students
    const assignedMentorId = (role === 'student' && mentor_id) ? mentor_id : null;

    db.run(`INSERT INTO users (name, email, password, role, mentor_id) VALUES (?, ?, ?, ?, ?)`,
        [name, email, hashedPassword, role, assignedMentorId],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint')) {
                    return res.status(400).json({ error: 'An account with this email already exists.' });
                }
                return res.status(400).json({ error: err.message });
            }

            // set initial risk level for students (might be changed later to modify according to past, but for now runs every reload)
            if (role === 'student') {
                db.run(`INSERT INTO risk_scores (user_id, baseline_activity_score, current_activity_score, risk_score, risk_level) VALUES (?, 10, 10, 0, 'Low')`,
                    [this.lastID]);
            }

            res.json({ message: `${role.charAt(0).toUpperCase() + role.slice(1)} account provisioned successfully.`, userId: this.lastID });
        }
    );
});

// login (fuck you OAuth, JWT is superior)
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user.user_id, name: user.name, role: user.role } });
    });
});

module.exports = router;
