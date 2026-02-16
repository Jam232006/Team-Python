const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'insight_shield.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to SQLite database.');
    createTables();
  }
});

function createTables() {
  db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'mentor', 'student')) NOT NULL,
      enrollment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      mentor_id INTEGER,
      FOREIGN KEY (mentor_id) REFERENCES users(user_id)
    )`);

    // Activity Logs Table
    db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
      log_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      activity_type TEXT CHECK(activity_type IN ('assignment', 'quiz', 'login')) NOT NULL,
      submission_date DATETIME,
      due_date DATETIME,
      status TEXT CHECK(status IN ('submitted', 'missed', 'pending')) DEFAULT 'pending',
      response_time_days INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    )`);

    // Risk Score Table
    db.run(`CREATE TABLE IF NOT EXISTS risk_scores (
      user_id INTEGER PRIMARY KEY,
      baseline_activity_score INTEGER DEFAULT 0,
      current_activity_score INTEGER DEFAULT 0,
      risk_score INTEGER DEFAULT 0,
      risk_level TEXT CHECK(risk_level IN ('Low', 'Medium', 'High')) DEFAULT 'Low',
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    )`);

    // Alerts Table
    db.run(`CREATE TABLE IF NOT EXISTS alerts (
      alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      risk_level TEXT,
      alert_message TEXT,
      alert_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_status BOOLEAN DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    )`);
  });
}

module.exports = db;
