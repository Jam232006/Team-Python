require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
const authRoutes       = require('./routes/auth');
const userRoutes       = require('./routes/users');
const activityRoutes   = require('./routes/activity');
const riskRoutes       = require('./routes/risk');
const alertRoutes      = require('./routes/alerts');
const classRoutes      = require('./routes/classes');
const assignmentRoutes = require('./routes/assignments_v2');
const inviteRoutes     = require('./routes/invites');

app.use('/api/auth',        authRoutes);
app.use('/api/users',       userRoutes);
app.use('/api/activity',    activityRoutes);
app.use('/api/risk',        riskRoutes);
app.use('/api/alerts',      alertRoutes);
app.use('/api/classes',     classRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/invites',     inviteRoutes);

app.get('/', (req, res) => {
    res.send('InsightShield API is running...');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
