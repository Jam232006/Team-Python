const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'insight_shield.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to SQLite database.');
    createTables();
    runMigrations();
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
      recipient_id INTEGER,
      recipient_role TEXT CHECK(recipient_role IN ('student', 'mentor', 'admin')) DEFAULT 'admin',
      alert_type TEXT DEFAULT 'general',
      risk_level TEXT,
      alert_message TEXT,
      alert_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_status BOOLEAN DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(user_id),
      FOREIGN KEY (recipient_id) REFERENCES users(user_id)
    )`);

    // Classes Table — a mentor can create multiple named groups
    db.run(`CREATE TABLE IF NOT EXISTS classes (
      class_id INTEGER PRIMARY KEY AUTOINCREMENT,
      mentor_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      invite_code TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mentor_id) REFERENCES users(user_id)
    )`);

    // Class Members — which students belong to which class
    db.run(`CREATE TABLE IF NOT EXISTS class_members (
      member_id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(class_id, student_id),
      FOREIGN KEY (class_id) REFERENCES classes(class_id),
      FOREIGN KEY (student_id) REFERENCES users(user_id)
    )`);

    // Assignments — created by a mentor, optionally tied to a class
    db.run(`CREATE TABLE IF NOT EXISTS assignments (
      assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      mentor_id INTEGER NOT NULL,
      class_id INTEGER,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      due_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT CHECK(status IN ('active', 'closed')) DEFAULT 'active',
      FOREIGN KEY (mentor_id) REFERENCES users(user_id),
      FOREIGN KEY (class_id)  REFERENCES classes(class_id)
    )`);

    // Assignment Submissions — one row per student per assignment
    db.run(`CREATE TABLE IF NOT EXISTS assignment_submissions (
      submission_id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      status TEXT CHECK(status IN ('pending', 'submitted', 'missed')) DEFAULT 'pending',
      submitted_at DATETIME,
      response_time_days INTEGER,
      UNIQUE(assignment_id, student_id),
      FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id),
      FOREIGN KEY (student_id)    REFERENCES users(user_id)
    )`);
  });
}

// Non-destructive migrations — safely adds new columns to existing databases.
// SQLite does not support IF NOT EXISTS on ALTER TABLE ADD COLUMN,
// so errors (column already exists) are intentionally swallowed.
function runMigrations() {
  const migrations = [
    // alerts — role-based targeting columns
    `ALTER TABLE alerts ADD COLUMN recipient_id INTEGER`,
    `ALTER TABLE alerts ADD COLUMN recipient_role TEXT DEFAULT 'admin'`,
    `ALTER TABLE alerts ADD COLUMN alert_type TEXT DEFAULT 'general'`,
    // activity_logs — human-readable assignment title
    `ALTER TABLE activity_logs ADD COLUMN title TEXT DEFAULT 'Untitled'`,
  ];
  migrations.forEach(sql => db.run(sql, [], () => {}));
}

module.exports = db;
