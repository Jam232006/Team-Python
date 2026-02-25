const db = require('../db/database');
const { get, query, run } = require('../utils/dbHelpers');

// Get assignment details with questions
exports.getAssignmentDetails = async (assignmentId) => {
    const assignment = await get(
        `SELECT * FROM assignments WHERE assignment_id = ?`,
        [assignmentId]
    );
    
    if (!assignment) return null;
    
    const questions = await query(
        `SELECT * FROM assignment_questions 
         WHERE assignment_id = ? 
         ORDER BY question_order`,
        [assignmentId]
    );
    
    return { ...assignment, questions };
};

// Get student submission
exports.getSubmission = (assignmentId, studentId) => get(
    `SELECT * FROM assignment_submissions 
     WHERE assignment_id = ? AND student_id = ?`,
    [assignmentId, studentId]
);

// Get student answers for submission
exports.getStudentAnswers = (submissionId) => query(
    `SELECT sa.*, aq.question_text, aq.correct_answer, aq.options, aq.points
     FROM student_answers sa
     JOIN assignment_questions aq ON sa.question_id = aq.question_id
     WHERE sa.submission_id = ?
     ORDER BY aq.question_order`,
    [submissionId]
);

// Get class results for assignment
exports.getClassResults = async (assignmentId) => {
    const assignment = await get(
        `SELECT a.*, c.name as class_name
         FROM assignments a
         JOIN classes c ON a.class_id = c.class_id
         WHERE a.assignment_id = ?`,
        [assignmentId]
    );
    
    if (!assignment) return null;
    
    const [submissions, questions, highRisk] = await Promise.all([
        query(`SELECT sub.*, u.name as student_name, u.email
               FROM assignment_submissions sub
               JOIN users u ON sub.student_id = u.user_id
               WHERE sub.assignment_id = ?`, [assignmentId]),
        
        query(`SELECT * FROM assignment_questions 
               WHERE assignment_id = ? 
               ORDER BY question_order`, [assignmentId]),
        
        query(`SELECT u.user_id as student_id, u.name as student_name, u.email, 
                      rs.risk_score, rs.risk_level, sub.status, sub.score, sub.max_score
               FROM users u
               LEFT JOIN risk_scores rs ON u.user_id = rs.user_id
               LEFT JOIN assignment_submissions sub ON u.user_id = sub.student_id AND sub.assignment_id = ?
               JOIN class_members cm ON u.user_id = cm.student_id
               WHERE cm.class_id = ? AND (rs.risk_level = 'High' OR (sub.status = 'submitted' AND sub.score < sub.max_score * 0.6))`,
            [assignmentId, assignment.class_id])
    ]);
    
    const stats = {
        total_students: submissions.length,
        submitted_count: submissions.filter(s => s.status === 'submitted').length,
        pending_count: submissions.filter(s => s.status === 'pending').length,
        average_percentage: 0
    };
    
    const submitted = submissions.filter(s => s.score != null);
    if (submitted.length > 0) {
        stats.average_percentage = submitted.reduce((sum, s) => sum + (s.score / s.max_score * 100), 0) / submitted.length;
    }
    
    return { assignment, submissions, questions, statistics: stats, high_risk_students: highRisk };
};

// Create submission record
exports.createSubmission = async (assignmentId, studentId, answers) => {
    const assignment = await exports.getAssignmentDetails(assignmentId);
    if (!assignment) throw new Error('Assignment not found');
    
    const sub = await run(
        `INSERT INTO assignment_submissions (assignment_id, student_id, status, submitted_at, score, max_score)
         VALUES (?, ?, 'submitted', datetime('now'), 0, ?)`,
        [assignmentId, studentId, assignment.questions.length * 10]
    );
    
    let totalScore = 0;
    for (const qId in answers) {
        const question = assignment.questions.find(q => q.question_id == qId);
        if (!question) continue;
        
        const answer = answers[qId];
        const isCorrect = answer === question.correct_answer ? 1 : 0;
        const points = isCorrect * question.points;
        totalScore += points;
        
        await run(
            `INSERT INTO student_answers (submission_id, question_id, student_answer, is_correct, points_earned)
             VALUES (?, ?, ?, ?, ?)`,
            [sub.id, qId, answer, isCorrect, points]
        );
    }
    
    await run(`UPDATE assignment_submissions SET score = ? WHERE submission_id = ?`,
        [totalScore, sub.id]);
    
    return { submissionId: sub.id, score: totalScore };
};

// Get student profile data
exports.getStudentProfile = async (studentId) => {
    const student = await get(
        `SELECT u.user_id, u.name, u.email, 
                rs.risk_score, rs.risk_level, rs.baseline_activity_score, rs.current_activity_score
         FROM users u
         LEFT JOIN risk_scores rs ON u.user_id = rs.user_id
         WHERE u.user_id = ?`,
        [studentId]
    );
    
    if (!student) return null;
    
    const [riskHistory, assignments] = await Promise.all([
        query(`SELECT risk_score, risk_level, recorded_at 
               FROM risk_history 
               WHERE user_id = ? 
               ORDER BY recorded_at ASC`, [studentId]),
        
        query(`SELECT a.assignment_id, a.title, a.description, a.due_date,
                      sub.submission_id, sub.status, sub.submitted_at, sub.score, sub.max_score, sub.response_time_days
               FROM assignments a
               LEFT JOIN assignment_submissions sub ON a.assignment_id = sub.assignment_id AND sub.student_id = ?
               ORDER BY a.due_date DESC`, [studentId])
    ]);
    
    // Get question details for each submitted assignment
    for (const asgn of assignments) {
        if (asgn.submission_id) {
            const questions = await query(
                `SELECT q.question_id, q.question_text, q.correct_answer, q.points,
                        sa.student_answer, sa.is_correct, sa.points_earned
                 FROM assignment_questions q
                 LEFT JOIN student_answers sa ON q.question_id = sa.question_id AND sa.submission_id = ?
                 WHERE q.assignment_id = ?
                 ORDER BY q.question_order`,
                [asgn.submission_id, asgn.assignment_id]
            );
            
            asgn.questions = questions;
            const total = questions.length;
            const correct = questions.filter(q => q.is_correct).length;
            asgn.stats = {
                total_questions: total,
                correct,
                incorrect: total - correct,
                accuracy: total > 0 ? (correct / total * 100).toFixed(1) : 0
            };
        }
    }
    
    const overallStats = {
        total_assignments: assignments.length,
        submitted: assignments.filter(a => a.status === 'submitted').length,
        pending: assignments.filter(a => a.status === 'pending').length,
        average_score: 0,
        total_points: 0,
        max_points: 0
    };
    
    const submitted = assignments.filter(a => a.score != null);
    if (submitted.length > 0) {
        overallStats.total_points = submitted.reduce((sum, a) => sum + (a.score || 0), 0);
        overallStats.max_points = submitted.reduce((sum, a) => sum + (a.max_score || 0), 0);
        overallStats.average_score = (overallStats.total_points / overallStats.max_points * 100).toFixed(1);
    }
    
    return { student, risk_history: riskHistory, assignments, overall_stats: overallStats };
};
