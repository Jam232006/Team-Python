const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { query, get, run } = require('../utils/dbHelpers');
const { createAlert } = require('../utils/alertService');
const { updateStreak, calculateRisk } = require('../utils/riskEngine');
const {
    getAssignmentDetails,
    getSubmission,
    getStudentAnswers,
    getClassResults,
    createSubmission,
    getStudentProfile
} = require('../utils/assignmentHelpers');

// Create assignment
router.post('/create', async (req, res) => {
    const { mentor_id, class_id, title, description = '', due_date, active_from, active_until, questions = [] } = req.body;
    
    if (!mentor_id || !class_id || !title || !due_date || !questions.length) {
        return res.status(400).json({ error: 'mentor_id, class_id, title, due_date, and questions required' });
    }

    try {
        const result = await run(
            `INSERT INTO assignments (mentor_id, class_id, title, description, due_date, active_from, active_until, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
            [mentor_id, class_id, title, description, due_date, active_from || null, active_until || null]
        );

        const assignmentId = result.id;
        const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

        // Insert questions
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            await run(
                `INSERT INTO assignment_questions 
                 (assignment_id, question_text, question_type, correct_answer, options, points, question_order)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [assignmentId, q.question_text, q.question_type, q.correct_answer, 
                 q.options ? JSON.stringify(q.options) : null, q.points || 1, i]
            );
        }

        // Create submissions for students
        const students = await query(
            `SELECT cm.student_id, u.name AS student_name
             FROM class_members cm
             JOIN users u ON cm.student_id = u.user_id
             WHERE cm.class_id = ?`,
            [class_id]
        );

        for (const student of students) {
            await run(
                `INSERT OR IGNORE INTO assignment_submissions 
                 (assignment_id, student_id, status, max_score) 
                 VALUES (?, ?, 'pending', ?)`,
                [assignmentId, student.student_id, totalPoints]
            );

            await createAlert({
                subjectUserId: mentor_id,
                recipientId: student.student_id,
                recipientRole: 'student',
                alertType: 'assignment_assigned',
                message: `New assignment: "${title}". Due ${new Date(due_date).toLocaleString()}`
            }).catch(console.error);
        }

        res.json({
            message: `Assignment created, published to ${students.length} students`,
            assignment_id: assignmentId,
            total_points: totalPoints,
            questions: questions.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get assignment details
router.get('/:assignmentId/details', async (req, res) => {
    try {
        const assignment = await getAssignmentDetails(req.params.assignmentId);
        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
        
        assignment.questions.forEach(q => {
            if (q.options) {
                try { q.options = JSON.parse(q.options); }
                catch (e) { q.options = []; }
            }
        });
        
        res.json(assignment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Submit assignment
router.post('/:assignmentId/submit', async (req, res) => {
    const { student_id, answers = [] } = req.body;
    const { assignmentId } = req.params;

    if (!student_id || !answers.length) {
        return res.status(400).json({ error: 'student_id and answers required' });
    }

    try {
        const submission = await getSubmission(assignmentId, student_id);
        if (!submission) return res.status(404).json({ error: 'Submission not found' });
        if (submission.status === 'submitted') {
            return res.status(400).json({ error: 'Already submitted' });
        }

        const questions = await query(
            `SELECT * FROM assignment_questions WHERE assignment_id = ?`,
            [assignmentId]
        );

        let totalScore = 0;
        const gradedAnswers = [];

        for (const answer of answers) {
            const question = questions.find(q => q.question_id === answer.question_id);
            if (!question) continue;

            const studentAns = String(answer.answer || '').trim();
            const correctAns = String(question.correct_answer || '').trim();
            let isCorrect = false;

            if (question.question_type === 'numeric') {
                const studentNum = parseFloat(studentAns);
                const correctNum = parseFloat(correctAns);
                isCorrect = !isNaN(studentNum) && !isNaN(correctNum) && Math.abs(studentNum - correctNum) < 0.01;
            } else {
                isCorrect = studentAns.toLowerCase() === correctAns.toLowerCase();
            }

            const points = isCorrect ? question.points : 0;
            totalScore += points;

            await run(
                `INSERT INTO student_answers (submission_id, question_id, student_answer, is_correct, points_earned)
                 VALUES (?, ?, ?, ?, ?)`,
                [submission.submission_id, answer.question_id, studentAns, isCorrect ? 1 : 0, points]
            );

            gradedAnswers.push({
                question_id: answer.question_id,
                student_answer: studentAns,
                correct_answer: correctAns,
                is_correct: isCorrect,
                points_earned: points
            });
        }

        const assignment = await get(`SELECT * FROM assignments WHERE assignment_id = ?`, [assignmentId]);
        const responseTimeDays = assignment ? 
            Math.floor((Date.now() - new Date(assignment.active_from || assignment.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;

        await run(
            `UPDATE assignment_submissions 
             SET status = 'submitted', submitted_at = datetime('now'), score = ?, response_time_days = ?
             WHERE submission_id = ?`,
            [totalScore, responseTimeDays, submission.submission_id]
        );

        await updateStreak(student_id);
        await calculateRisk(student_id);

        res.json({
            message: 'Assignment submitted',
            score: totalScore,
            max_score: submission.max_score,
            percentage: ((totalScore / submission.max_score) * 100).toFixed(2),
            graded_answers: gradedAnswers
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get student result
router.get('/:assignmentId/result/:studentId', async (req, res) => {
    try {
        const submission = await getSubmission(req.params.assignmentId, req.params.studentId);
        if (!submission) return res.status(404).json({ error: 'Submission not found' });

        const answers = await getStudentAnswers(submission.submission_id);
        const assignment = await get(`SELECT * FROM assignments WHERE assignment_id = ?`, [req.params.assignmentId]);

        res.json({
            assignment: { title: assignment?.title, description: assignment?.description },
            submission,
            answers
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get class results
router.get('/:assignmentId/class-results', async (req, res) => {
    try {
        const results = await getClassResults(req.params.assignmentId);
        if (!results) return res.status(404).json({ error: 'Assignment not found' });
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get pending assignments for student
router.get('/student/:studentId/pending', async (req, res) => {
    try {
        const assignments = await query(
            `SELECT a.*, sub.status, sub.submitted_at
             FROM assignments a
             JOIN assignment_submissions sub ON a.assignment_id = sub.assignment_id
             WHERE sub.student_id = ? AND sub.status = 'pending'
             ORDER BY a.due_date ASC`,
            [req.params.studentId]
        );
        res.json(assignments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get completed assignments for student
router.get('/student/:studentId/completed', async (req, res) => {
    try {
        const assignments = await query(
            `SELECT a.*, sub.status, sub.submitted_at, sub.score, sub.max_score
             FROM assignments a
             JOIN assignment_submissions sub ON a.assignment_id = sub.assignment_id
             WHERE sub.student_id = ? AND sub.status = 'submitted'
             ORDER BY sub.submitted_at DESC`,
            [req.params.studentId]
        );
        res.json(assignments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get assignments by mentor
router.get('/mentor/:mentorId', async (req, res) => {
    try {
        const assignments = await query(
            `SELECT a.*, c.name AS class_name,
                    COUNT(DISTINCT sub.submission_id) AS total_submissions,
                    SUM(CASE WHEN sub.status = 'submitted' THEN 1 ELSE 0 END) AS submitted_count
             FROM assignments a
             LEFT JOIN classes c ON a.class_id = c.class_id
             LEFT JOIN assignment_submissions sub ON a.assignment_id = sub.assignment_id
             WHERE a.mentor_id = ?
             GROUP BY a.assignment_id
             ORDER BY a.created_at DESC`,
            [req.params.mentorId]
        );
        res.json(assignments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get assignments by class
router.get('/class/:classId', async (req, res) => {
    try {
        const assignments = await query(
            `SELECT a.*,
                    COUNT(DISTINCT sub.submission_id) AS total_submissions,
                    SUM(CASE WHEN sub.status = 'submitted' THEN 1 ELSE 0 END) AS submitted_count
             FROM assignments a
             LEFT JOIN assignment_submissions sub ON a.assignment_id = sub.assignment_id
             WHERE a.class_id = ?
             GROUP BY a.assignment_id
             ORDER BY a.created_at DESC`,
            [req.params.classId]
        );
        res.json(assignments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get student profile
router.get('/student/:studentId/profile', async (req, res) => {
    try {
        const profile = await getStudentProfile(req.params.studentId);
        if (!profile) return res.status(404).json({ error: 'Student not found' });
        res.json(profile);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
