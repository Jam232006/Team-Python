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
    createIndexes();
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
      score INTEGER DEFAULT NULL,
      max_score INTEGER DEFAULT 100,
      UNIQUE(assignment_id, student_id),
      FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id),
      FOREIGN KEY (student_id)    REFERENCES users(user_id)
    )`);

    // Invites — mentors invite students to join classes
    db.run(`CREATE TABLE IF NOT EXISTS invites (
      invite_id INTEGER PRIMARY KEY AUTOINCREMENT,
      mentor_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      student_email TEXT,
      student_username TEXT,
      invited_student_id INTEGER,
      status TEXT CHECK(status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      responded_at DATETIME,
      FOREIGN KEY (mentor_id) REFERENCES users(user_id),
      FOREIGN KEY (class_id) REFERENCES classes(class_id),
      FOREIGN KEY (invited_student_id) REFERENCES users(user_id)
    )`);

    // Submission Streaks — track consistency for risk calculation
    db.run(`CREATE TABLE IF NOT EXISTS submission_streaks (
      user_id INTEGER PRIMARY KEY,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_submission_date DATE,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    )`);

    // Assignment Questions — questions within assignments
    db.run(`CREATE TABLE IF NOT EXISTS assignment_questions (
      question_id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT CHECK(question_type IN ('numeric', 'text', 'multiple_choice')) NOT NULL,
      correct_answer TEXT NOT NULL,
      options TEXT,
      points INTEGER DEFAULT 1,
      question_order INTEGER DEFAULT 0,
      FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id)
    )`);

    // Student Answers — individual answers to questions
    db.run(`CREATE TABLE IF NOT EXISTS student_answers (
      answer_id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      student_answer TEXT,
      is_correct BOOLEAN DEFAULT 0,
      points_earned INTEGER DEFAULT 0,
      FOREIGN KEY (submission_id) REFERENCES assignment_submissions(submission_id),
      FOREIGN KEY (question_id) REFERENCES assignment_questions(question_id)
    )`);

    // Risk History — track risk score changes over time
    db.run(`CREATE TABLE IF NOT EXISTS risk_history (
      history_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      risk_score INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
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
    // assignment_submissions — add score tracking
    `ALTER TABLE assignment_submissions ADD COLUMN score INTEGER DEFAULT NULL`,
    `ALTER TABLE assignment_submissions ADD COLUMN max_score INTEGER DEFAULT 100`,
  ];
  migrations.forEach(sql => db.run(sql, [], () => {}));
}

// Create indexes for frequently queried columns to boost performance
function createIndexes() {
  db.serialize(() => {
    // Users table — email lookups during login
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_mentor_id ON users(mentor_id)`);
    
    // Activity logs — user and date-based queries
    db.run(`CREATE INDEX IF NOT EXISTS idx_activity_user_id ON activity_logs(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_activity_submission_date ON activity_logs(submission_date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_activity_status ON activity_logs(status)`);
    
    // Risk scores — user queries
    db.run(`CREATE INDEX IF NOT EXISTS idx_risk_user_id ON risk_scores(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_risk_level ON risk_scores(risk_level)`);
    
    // Alerts — recipient and status filtering
    db.run(`CREATE INDEX IF NOT EXISTS idx_alerts_recipient_id ON alerts(recipient_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved_status)`);
    
    // Classes — mentor lookups
    db.run(`CREATE INDEX IF NOT EXISTS idx_classes_mentor_id ON classes(mentor_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_classes_invite_code ON classes(invite_code)`);
    
    // Class members — class and user joins
    db.run(`CREATE INDEX IF NOT EXISTS idx_class_members_class_id ON class_members(class_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_class_members_student_id ON class_members(student_id)`);
    
    // Assignments — class and creator queries
    db.run(`CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_assignments_mentor_id ON assignments(mentor_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date)`);
    
    // Assignment submissions — assignment and user queries
    db.run(`CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON assignment_submissions(assignment_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON assignment_submissions(student_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON assignment_submissions(submitted_at)`);
    
    // Invites — status and user queries
    db.run(`CREATE INDEX IF NOT EXISTS idx_invites_invited_student_id ON invites(invited_student_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_invites_mentor_id ON invites(mentor_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status)`);
    
    // Assignment questions — assignment lookups
    db.run(`CREATE INDEX IF NOT EXISTS idx_questions_assignment_id ON assignment_questions(assignment_id)`);
    
    // Student answers — submission and question lookups
    db.run(`CREATE INDEX IF NOT EXISTS idx_answers_submission_id ON student_answers(submission_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_answers_question_id ON student_answers(question_id)`);
    
    // Risk history — user and time-based queries
    db.run(`CREATE INDEX IF NOT EXISTS idx_risk_history_user_id ON risk_history(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_risk_history_recorded_at ON risk_history(recorded_at)`);
    
    // Submission streaks — user lookups
    db.run(`CREATE INDEX IF NOT EXISTS idx_streaks_user_id ON submission_streaks(user_id)`);
  });
}

// Promisified database wrapper for cleaner async/await usage
const dbAsync = {
  // Execute a query that returns multiple rows
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  
  // Execute a query that returns a single row
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  
  // Execute an INSERT/UPDATE/DELETE query
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
};

module.exports = db;
module.exports.dbAsync = dbAsync;
