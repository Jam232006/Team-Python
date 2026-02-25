const db = require('../db/database');

// Promisified database query wrapper
const query = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
        err ? reject(err) : resolve({ id: this.lastID, changes: this.changes });
    });
});

// Batch insert helper
const batchInsert = (table, columns, values) => {
    const placeholders = columns.map(() => '?').join(',');
    const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;
    return Promise.all(values.map(v => run(sql, v)));
};

// Clear all tables
const clearTables = async () => {
    const tables = [
        'users', 'activity_logs', 'risk_scores', 'risk_history', 'alerts',
        'classes', 'class_members', 'assignments', 'assignment_questions',
        'assignment_submissions', 'student_answers', 'invites', 'submission_streaks'
    ];
    await Promise.all(tables.map(t => run(`DELETE FROM ${t}`)));
};

module.exports = { query, get, run, batchInsert, clearTables };
