const db = require('./db/database');
const bcrypt = require('bcryptjs');

async function seed() {
    const hashedPassword = await bcrypt.hash('password123', 10);

    db.serialize(() => {
        // Clear existing data
        db.run("DELETE FROM users");
        db.run("DELETE FROM activity_logs");
        db.run("DELETE FROM risk_scores");
        db.run("DELETE FROM alerts");

        // Insert Admin
        db.run(`INSERT INTO users (name, email, password, role) VALUES ('Admin User', 'admin@insight.com', ?, 'admin')`, [hashedPassword]);

        // Insert Mentor
        db.run(`INSERT INTO users (name, email, password, role) VALUES ('Mentor Sarah', 'sarah@insight.com', ?, 'mentor')`, [hashedPassword], function () {
            const mentorId = this.lastID;

            // Insert Students for this Mentor
            const students = [
                ['John Doe', 'john@student.com', 'Low'],
                ['Jane Smith', 'jane@student.com', 'Medium'],
                ['Bob Wilson', 'bob@student.com', 'High']
            ];

            students.forEach(([name, email, initialRisk]) => {
                db.run(`INSERT INTO users (name, email, password, role, mentor_id) VALUES (?, ?, ?, 'student', ?)`,
                    [name, email, hashedPassword, mentorId], function () {
                        const studentId = this.lastID;

                        // Seed Activity for John (Low Risk)
                        if (name === 'John Doe') {
                            db.run(`INSERT INTO activity_logs (user_id, activity_type, submission_date, status, response_time_days) VALUES (?, 'login', date('now'), 'submitted', 0)`, [studentId]);
                            db.run(`INSERT INTO activity_logs (user_id, activity_type, submission_date, status, response_time_days) VALUES (?, 'assignment', date('now', '-1 day'), 'submitted', 0)`, [studentId]);
                            db.run(`INSERT INTO risk_scores (user_id, baseline_activity_score, current_activity_score, risk_score, risk_level) VALUES (?, 10, 10, 0, 'Low')`, [studentId]);
                        }

                        // Seed Activity for Jane (Medium Risk)
                        if (name === 'Jane Smith') {
                            db.run(`INSERT INTO activity_logs (user_id, activity_type, submission_date, status, response_time_days) VALUES (?, 'login', date('now', '-4 days'), 'submitted', 0)`, [studentId]);
                            db.run(`INSERT INTO activity_logs (user_id, activity_type, submission_date, status, response_time_days) VALUES (?, 'assignment', date('now', '-2 days'), 'submitted', 2)`, [studentId]);
                            db.run(`INSERT INTO risk_scores (user_id, baseline_activity_score, current_activity_score, risk_score, risk_level) VALUES (?, 10, 5, 5, 'Medium')`, [studentId]);
                        }

                        // Seed Activity for Bob (High Risk)
                        if (name === 'Bob Wilson') {
                            db.run(`INSERT INTO activity_logs (user_id, activity_type, submission_date, status, response_time_days) VALUES (?, 'assignment', date('now', '-15 days'), 'missed', 15)`, [studentId]);
                            db.run(`INSERT INTO risk_scores (user_id, baseline_activity_score, current_activity_score, risk_score, risk_level) VALUES (?, 10, 0, 9, 'High')`, [studentId]);
                            db.run(`INSERT INTO alerts (user_id, risk_level, alert_message) VALUES (?, 'High', 'Critical inactivity detected for Bob Wilson.')`, [studentId]);
                        }
                    });
            });
        });

        console.log("Database seeded successfully.");
    });
}

seed();
