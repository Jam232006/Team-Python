const bcrypt = require('bcryptjs');
const db = require('./db/database');
const { run } = require('./utils/dbHelpers');
const { students, assignments, answerSets } = require('./data/seedData');
const questions = require('./data/questions');
const { calculateRisk, updateStreak } = require('./utils/riskEngine');

// Clear all tables
const clearAll = () => Promise.all([
    'users', 'activity_logs', 'risk_scores', 'risk_history', 'alerts',
    'classes', 'class_members', 'assignments', 'assignment_questions',
    'assignment_submissions', 'student_answers', 'invites', 'submission_streaks'
].map(t => run(`DELETE FROM ${t}`)));

// Create users and return IDs 
const createUsers = async (hash) => {
    await run(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
        ['Admin User', 'admin@insight.com', hash, 'admin']);
    
    const mentor = await run(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
        ['Sarah Johnson', 'sarah@insight.com', hash, 'mentor']);
    
    const studentIds = {};
    for (const s of students) {
        const result = await run(`INSERT INTO users (name, email, password, role, mentor_id) VALUES (?, ?, ?, ?, ?)`,
            [s.name, s.email, hash, 'student', mentor.id]);
        studentIds[s.name] = result.id;
    }
    
    return { mentorId: mentor.id, studentIds };
};

// Create class and add members
const createClass = async (mentorId, studentIds) => {
    const cls = await run(`INSERT INTO classes (mentor_id, name, description, invite_code) VALUES (?, ?, ?, ?)`,
        [mentorId, 'DS 2025', 'Data Structures Course 2025', 'DS2025']);
    
    for (const id of Object.values(studentIds)) {
        await run(`INSERT INTO class_members (class_id, student_id) VALUES (?, ?)`, [cls.id, id]);
    }
    
    return cls.id;
};

// Create assignment with questions
const createAssignment = async (mentorId, classId, assignment, questionSet) => {
    const asgn = await run(`INSERT INTO assignments (mentor_id, class_id, title, description, due_date, status, created_at) 
        VALUES (?, ?, ?, ?, datetime('now', '${assignment.dueOffset}'), 'active', datetime('now', '${assignment.createdOffset}'))`,
        [mentorId, classId, assignment.title, assignment.desc]);
    
    for (let i = 0; i < questionSet.length; i++) {
        const q = questionSet[i];
        await run(`INSERT INTO assignment_questions (assignment_id, question_text, question_type, correct_answer, options, points, question_order)
            VALUES (?, ?, 'multiple_choice', ?, ?, 10, ?)`,
            [asgn.id, q.text, q.correct, JSON.stringify(q.options), i]);
    }
    
    return asgn.id;
};

// Create submission for student
const createSubmission = async (assignmentId, studentId, profile, questionSet, title) => {
    if (!profile) {
        // Missed submission
        await run(`INSERT INTO assignment_submissions (assignment_id, student_id, status, score, max_score) 
            VALUES (?, ?, 'pending', 0, 100)`, [assignmentId, studentId]);
        await run(`INSERT INTO activity_logs (user_id, activity_type, submission_date, status, response_time_days, title)
            VALUES (?, 'assignment', datetime('now', '-10 days'), 'missed', 10, ?)`, [studentId, title]);
        return;
    }
    
    const { answers, daysAgo, responseTime } = profile;
    const sub = await run(`INSERT INTO assignment_submissions (assignment_id, student_id, status, submitted_at, score, max_score, response_time_days)
        VALUES (?, ?, 'submitted', datetime('now', '-${daysAgo} days'), 0, 100, ?)`,
        [assignmentId, studentId, responseTime]);
    
    let totalScore = 0;
    for (let i = 0; i < answers.length; i++) {
        const isCorrect = answers[i] === questionSet[i].correct ? 1 : 0;
        totalScore += isCorrect * 10;
        
        await run(`INSERT INTO student_answers (submission_id, question_id, student_answer, is_correct, points_earned)
            VALUES (?, (SELECT question_id FROM assignment_questions WHERE assignment_id = ? AND question_order = ?), ?, ?, ?)`,
            [sub.id, assignmentId, i, answers[i], isCorrect, isCorrect * 10]);
    }
    
    await run(`UPDATE assignment_submissions SET score = ? WHERE submission_id = ?`, [totalScore, sub.id]);
    await run(`INSERT INTO activity_logs (user_id, activity_type, submission_date, status, response_time_days, title)
        VALUES (?, 'assignment', datetime('now', '-${daysAgo} days'), 'submitted', ?, ?)`,
        [studentId, responseTime, title]);
};

// Calculate all risk scores 
const calculateRisks = async (studentIds) => {
    console.log('\n📊 Calculating risks...');
    const results = [];
    
    for (const [name, id] of Object.entries(studentIds)) {
        // Update streaks
        const subs = await new Promise((resolve, reject) => {
            db.all(`SELECT DISTINCT submitted_at FROM assignment_submissions 
                WHERE student_id = ? AND status = 'submitted' ORDER BY submitted_at ASC`,
                [id], (err, rows) => err ? reject(err) : resolve(rows));
        });
        
        for (const sub of subs) await updateStreak(id, new Date(sub.submitted_at));
        
        // Calculate risk
        const risk = await calculateRisk(id);
        results.push({ name, ...risk });
        
        await run(`INSERT INTO risk_history (user_id, risk_score, risk_level, recorded_at)
            VALUES (?, ?, ?, datetime('now'))`, [id, risk.score, risk.riskLevel]);
    }
    
    console.log('\n✅Database seeded!');
    console.log('👨‍🏫 Mentor: sarah@insight.com | 👨‍🎓 Students: kartik/daksh/vansh/mital@insight.com | 🔑 password123');
    console.log('\n📊 Risk Analytics:');
    results.sort((a, b) => b.score - a.score).forEach(r => {
        const streak = r.breakdown.current_streak >= 3 ? ` 🔥${r.breakdown.current_streak}` : '';
        console.log(`   ${r.name}: ${r.riskLevel} (${r.score})${streak}`);
    });
};

// Main seed function
async function seed() {
    try {
        await new Promise(resolve => setTimeout(resolve, 500));
        const hash = await bcrypt.hash('password123', 10);
        
        await clearAll();
        const { mentorId, studentIds } = await createUsers(hash);
        const classId = await createClass(mentorId, studentIds);
        
        for (let i = 0; i < assignments.length; i++) {
            const key = `assignment${i + 1}`;
            const assignId = await createAssignment(mentorId, classId, assignments[i], questions[key]);
            
            for (const [name, id] of Object.entries(studentIds)) {
                await createSubmission(assignId, id, answerSets[key][name], questions[key], assignments[i].title);
            }
        }
        
        await calculateRisks(studentIds);
        setTimeout(() => process.exit(0), 1000);
    } catch (err) {
        console.error('Seed error:', err);
        process.exit(1);
    }
}

seed();
