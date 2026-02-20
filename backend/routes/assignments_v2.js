const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { createAlert } = require('../utils/alertService');
const { updateStreak, calculateRisk } = require('../utils/riskEngine');

// POST /api/assignments/create
// body: { mentor_id, class_id, title, description?, due_date, active_from?, active_until?, questions: [{...}] }
router.post('/create', async (req, res) => {
    const { mentor_id, class_id, title, description = '', due_date, active_from, active_until, questions = [] } = req.body;
    
    if (!mentor_id || !class_id || !title || !due_date) {
        return res.status(400).json({ error: 'mentor_id, class_id, title, and due_date are required.' });
    }

    if (!questions.length) {
        return res.status(400).json({ error: 'At least one question is required.' });
    }

    try {
        // 1. Create assignment
        const assignmentId = await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO assignments (mentor_id, class_id, title, description, due_date, active_from, active_until, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
                [mentor_id, class_id, title, description, due_date, active_from || null, active_until || null],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });

        // 2. Add questions
        const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            await new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO assignment_questions 
                     (assignment_id, question_text, question_type, correct_answer, options, points, question_order)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        assignmentId,
                        q.question_text,
                        q.question_type,
                        q.correct_answer,
                        q.options ? JSON.stringify(q.options) : null,
                        q.points || 1,
                        i
                    ],
                    (err) => err ? reject(err) : resolve()
                );
            });
        }

        // 3. Get students in class
        const students = await new Promise((resolve, reject) => {
            db.all(
                `SELECT cm.student_id, u.name AS student_name, u.email
                 FROM class_members cm
                 JOIN users u ON cm.student_id = u.user_id
                 WHERE cm.class_id = ?`,
                [class_id],
                (err, rows) => err ? reject(err) : resolve(rows)
            );
        });

        // 4. Create submission placeholders for each student
        for (const student of students) {
            await new Promise((resolve) => {
                db.run(
                    `INSERT OR IGNORE INTO assignment_submissions 
                     (assignment_id, student_id, status, max_score) 
                     VALUES (?, ?, 'pending', ?)`,
                    [assignmentId, student.student_id, totalPoints],
                    resolve
                );
            });

            // Send alert to student
            await createAlert({
                subjectUserId: mentor_id,
                recipientId: student.student_id,
                recipientRole: 'student',
                alertType: 'assignment_assigned',
                message: `New assignment published: "${title}". Due ${new Date(due_date).toLocaleString()}`
            }).catch(console.error);
        }

        res.json({
            message: `Assignment "${title}" created and published to ${students.length} student(s).`,
            assignment_id: assignmentId,
            total_points: totalPoints,
            questions: questions.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Get assignment details with questions (for students) ──────────────────────
// GET /api/assignments/:assignmentId/details
router.get('/:assignmentId/details', (req, res) => {
    db.get(
        `SELECT a.*, c.name AS class_name 
         FROM assignments a
         LEFT JOIN classes c ON a.class_id = c.class_id
         WHERE a.assignment_id = ?`,
        [req.params.assignmentId],
        (err, assignment) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!assignment) return res.status(404).json({ error: 'Assignment not found.' });

            db.all(
                `SELECT question_id, question_text, question_type, options, points, question_order
                 FROM assignment_questions
                 WHERE assignment_id = ?
                 ORDER BY question_order`,
                [req.params.assignmentId],
                (err2, questions) => {
                    if (err2) return res.status(500).json({ error: err2.message });
                    
                    // Parse JSON options
                    questions.forEach(q => {
                        if (q.options) {
                            try {
                                q.options = JSON.parse(q.options);
                            } catch (e) {
                                q.options = [];
                            }
                        }
                    });

                    res.json({
                        ...assignment,
                        questions
                    });
                }
            );
        }
    );
});

// ── Submit assignment answers (student) ───────────────────────────────────────
// POST /api/assignments/:assignmentId/submit
// Body: { student_id, answers: [{question_id, answer}] }
router.post('/:assignmentId/submit', async (req, res) => {
    const { student_id, answers = [] } = req.body;
    const { assignmentId } = req.params;

    if (!student_id || !answers.length) {
        return res.status(400).json({ error: 'student_id and answers are required.' });
    }

    try {
        // Get submission record
        const submission = await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM assignment_submissions 
                 WHERE assignment_id = ? AND student_id = ?`,
                [assignmentId, student_id],
                (err, row) => err ? reject(err) : resolve(row)
            );
        });

        if (!submission) {
            return res.status(404).json({ error: 'Submission not found.' });
        }

        if (submission.status === 'submitted') {
            return res.status(400).json({ error: 'Assignment already submitted.' });
        }

        // Get all questions with correct answers
        const questions = await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM assignment_questions WHERE assignment_id = ?`,
                [assignmentId],
                (err, rows) => err ? reject(err) : resolve(rows)
            );
        });

        // crosscheck against correct answers
        let totalScore = 0;
        const gradedAnswers = [];

        for (const answer of answers) {
            const question = questions.find(q => q.question_id === answer.question_id);
            if (!question) continue;

            let isCorrect = false;
            const studentAnswer = String(answer.answer || '').trim();
            const correctAnswer = String(question.correct_answer || '').trim();

            // grading logic based on question type
            if (question.question_type === 'numeric') {
                const studentNum = parseFloat(studentAnswer);
                const correctNum = parseFloat(correctAnswer);
                isCorrect = !isNaN(studentNum) && !isNaN(correctNum) && 
                           Math.abs(studentNum - correctNum) < 0.001;
            } else if (question.question_type === 'text') {
                // Case-insensitive comparison for text
                isCorrect = studentAnswer.toLowerCase() === correctAnswer.toLowerCase();
            } else if (question.question_type === 'multiple_choice') {
                isCorrect = studentAnswer === correctAnswer;
            }

            const pointsEarned = isCorrect ? question.points : 0;
            totalScore += pointsEarned;

            // store answer
            await new Promise((resolve) => {
                db.run(
                    `INSERT INTO student_answers 
                     (submission_id, question_id, student_answer, is_correct, points_earned)
                     VALUES (?, ?, ?, ?, ?)`,
                    [submission.submission_id, question.question_id, studentAnswer, isCorrect ? 1 : 0, pointsEarned],
                    resolve
                );
            });

            gradedAnswers.push({
                question_id: question.question_id,
                is_correct: isCorrect,
                points_earned: pointsEarned
            });
        }

        // calculate response time
        const now = new Date();
        const dueDate = new Date(submission.due_date || now);
        const submittedAt = new Date(submission.submitted_at || now);
        const responseDays = Math.max(0, Math.ceil((submittedAt - dueDate) / (1000 * 60 * 60 * 24)));

        // update submission
        await new Promise((resolve, reject) => {
            db.run(
                `UPDATE assignment_submissions
                 SET status = 'submitted', 
                     submitted_at = CURRENT_TIMESTAMP,
                     score = ?,
                     response_time_days = ?
                 WHERE submission_id = ?`,
                [totalScore, responseDays, submission.submission_id],
                (err) => err ? reject(err) : resolve()
            );
        });

        // Update activity log
        await new Promise((resolve) => {
            db.run(
                `UPDATE activity_logs
                 SET status = 'submitted', 
                     submission_date = CURRENT_TIMESTAMP,
                     response_time_days = ?
                 WHERE user_id = ? AND activity_type = 'assignment' 
                   AND status = 'pending'
                 ORDER BY log_id DESC LIMIT 1`,
                [responseDays, student_id],
                resolve
            );
        });

        // Update streak
        try {
            await updateStreak(student_id, now.toISOString());
        } catch (e) {
            console.error('Streak update error:', e);
        }

        // Recalculate risk
        try {
            await calculateRisk(student_id);
        } catch (e) {
            console.error('Risk calculation error:', e);
        }

        res.json({
            message: 'Assignment submitted successfully!',
            score: totalScore,
            max_score: submission.max_score,
            percentage: Math.round((totalScore / submission.max_score) * 100),
            graded_answers: gradedAnswers
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/assignments/:assignmentId/result/:studentId
router.get('/:assignmentId/result/:studentId', (req, res) => {
    const { assignmentId, studentId } = req.params;

    db.get(
        `SELECT sub.*, a.title, a.description, a.due_date
         FROM assignment_submissions sub
         JOIN assignments a ON sub.assignment_id = a.assignment_id
         WHERE sub.assignment_id = ? AND sub.student_id = ?`,
        [assignmentId, studentId],
        (err, submission) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!submission) return res.status(404).json({ error: 'Submission not found.' });

            if (submission.status !== 'submitted') {
                return res.json({ message: 'Assignment not yet submitted.', submission });
            }

            // Get answers with questions
            db.all(
                `SELECT sa.*, aq.question_text, aq.question_type, aq.correct_answer, aq.points, aq.options
                 FROM student_answers sa
                 JOIN assignment_questions aq ON sa.question_id = aq.question_id
                 WHERE sa.submission_id = ?
                 ORDER BY aq.question_order`,
                [submission.submission_id],
                (err2, answers) => {
                    if (err2) return res.status(500).json({ error: err2.message });

                    // Parse options
                    answers.forEach(a => {
                        if (a.options) {
                            try {
                                a.options = JSON.parse(a.options);
                            } catch (e) {
                                a.options = [];
                            }
                        }
                    });

                    res.json({
                        submission,
                        answers,
                        percentage: submission.max_score > 0 
                            ? Math.round((submission.score / submission.max_score) * 100) 
                            : 0
                    });
                }
            );
        }
    );
});

// ── Get class results for an assignment (mentor view) ─────────────────────────
// GET /api/assignments/:assignmentId/class-results
router.get('/:assignmentId/class-results', async (req, res) => {
    const { assignmentId } = req.params;

    try {
        const assignment = await new Promise((resolve, reject) => {
            db.get(
                `SELECT a.*, c.name AS class_name 
                 FROM assignments a
                 LEFT JOIN classes c ON a.class_id = c.class_id
                 WHERE a.assignment_id = ?`,
                [assignmentId],
                (err, row) => err ? reject(err) : resolve(row)
            );
        });

        if (!assignment) {
            return res.status(404).json({ error: 'Assignment not found.' });
        }

        const submissions = await new Promise((resolve, reject) => {
            db.all(
                `SELECT sub.*, u.name AS student_name, u.email, r.risk_level, r.risk_score
                 FROM assignment_submissions sub
                 JOIN users u ON sub.student_id = u.user_id
                 LEFT JOIN risk_scores r ON u.user_id = r.user_id
                 WHERE sub.assignment_id = ?
                 ORDER BY sub.score DESC`,
                [assignmentId],
                (err, rows) => err ? reject(err) : resolve(rows)
            );
        });

        // Get all questions for this assignment
        const questions = await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM assignment_questions 
                 WHERE assignment_id = ? 
                 ORDER BY question_order`,
                [assignmentId],
                (err, rows) => err ? reject(err) : resolve(rows)
            );
        });

        // For each question, get all students' answers
        for (const question of questions) {
            const answers = await new Promise((resolve, reject) => {
                db.all(
                    `SELECT sa.*, sub.student_id, u.name AS student_name
                     FROM student_answers sa
                     JOIN assignment_submissions sub ON sa.submission_id = sub.submission_id
                     JOIN users u ON sub.student_id = u.user_id
                     WHERE sa.question_id = ?`,
                    [question.question_id],
                    (err, rows) => err ? reject(err) : resolve(rows)
                );
            });
            question.student_answers = answers;
        }

        // Calculate statistics
        const submitted = submissions.filter(s => s.status === 'submitted');
        const avgScore = submitted.length > 0
            ? submitted.reduce((sum, s) => sum + (s.score || 0), 0) / submitted.length
            : 0;
        
        const avgPercentage = submitted.length > 0 && assignment.max_score > 0
            ? (avgScore / submitted[0].max_score) * 100
            : 0;

        // Risk analysis
        const highRiskStudents = submissions.filter(s => 
            s.risk_level === 'High' || 
            (s.status === 'submitted' && s.max_score > 0 && (s.score / s.max_score) < 0.5)
        );

        res.json({
            assignment,
            submissions,
            questions,
            statistics: {
                total_students: submissions.length,
                submitted_count: submitted.length,
                pending_count: submissions.filter(s => s.status === 'pending').length,
                average_score: Math.round(avgScore * 100) / 100,
                average_percentage: Math.round(avgPercentage * 100) / 100,
                high_risk_count: highRiskStudents.length
            },
            high_risk_students: highRiskStudents
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Get student's pending assignments ─────────────────────────────────────────
// GET /api/assignments/student/:studentId/pending
router.get('/student/:studentId/pending', (req, res) => {
    db.all(
        `SELECT a.assignment_id, a.title, a.description, a.due_date, 
                c.name AS class_name, sub.status, sub.max_score
         FROM assignment_submissions sub
         JOIN assignments a ON sub.assignment_id = a.assignment_id
         LEFT JOIN classes c ON a.class_id = c.class_id
         WHERE sub.student_id = ? AND sub.status = 'pending' AND a.status = 'active'
         ORDER BY a.due_date ASC`,
        [req.params.studentId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// GET /api/assignments/student/:studentId/completed
router.get('/student/:studentId/completed', (req, res) => {
    db.all(
        `SELECT a.assignment_id, a.title, a.description, a.due_date,
                c.name AS class_name, sub.status, sub.score, sub.max_score, sub.submitted_at
         FROM assignment_submissions sub
         JOIN assignments a ON sub.assignment_id = a.assignment_id
         LEFT JOIN classes c ON a.class_id = c.class_id
         WHERE sub.student_id = ? AND sub.status = 'submitted'
         ORDER BY sub.submitted_at DESC`,
        [req.params.studentId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// GET /api/assignments-v2/mentor/:mentorId
router.get('/mentor/:mentorId', (req, res) => {
    db.all(
        `SELECT a.*, 
                c.name AS class_name,
                COUNT(s.student_id)                                           AS total_students,
                SUM(CASE WHEN sub.status = 'submitted' THEN 1 ELSE 0 END)    AS submitted_count,
                SUM(CASE WHEN sub.status = 'missed'    THEN 1 ELSE 0 END)    AS missed_count,
                SUM(CASE WHEN sub.status = 'pending'   THEN 1 ELSE 0 END)    AS pending_count
         FROM assignments a
         LEFT JOIN classes c           ON a.class_id = c.class_id
         LEFT JOIN class_members s     ON a.class_id = s.class_id
         LEFT JOIN assignment_submissions sub ON a.assignment_id = sub.assignment_id AND sub.student_id = s.student_id
         WHERE a.mentor_id = ?
         GROUP BY a.assignment_id
         ORDER BY a.created_at DESC`,
        [req.params.mentorId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// ── Get assignments for a specific class ──────────────────────────────────────
// GET /api/assignments-v2/class/:classId
router.get('/class/:classId', (req, res) => {
    db.all(
        `SELECT a.*,
                (SELECT COALESCE(SUM(points), 0) FROM assignment_questions WHERE assignment_id = a.assignment_id) AS total_points,
                SUM(CASE WHEN sub.status = 'submitted' THEN 1 ELSE 0 END) AS submitted_count,
                SUM(CASE WHEN sub.status = 'missed'    THEN 1 ELSE 0 END) AS missed_count,
                SUM(CASE WHEN sub.status = 'pending'   THEN 1 ELSE 0 END) AS pending_count,
                COUNT(sub.submission_id)                                   AS total_students
         FROM assignments a
         LEFT JOIN assignment_submissions sub ON a.assignment_id = sub.assignment_id
         WHERE a.class_id = ?
         GROUP BY a.assignment_id
         ORDER BY a.created_at DESC`,
        [req.params.classId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// GET /api/assignments/student/:studentId/profile
// Detailed profile for a student including risk history, assignment breakdown, etc.
router.get('/student/:studentId/profile', async (req, res) => {
    const { studentId } = req.params;
    
    try {
        // 1. Get student basic info
        const studentInfo = await new Promise((resolve, reject) => {
            db.get(
                `SELECT u.user_id, u.name, u.email, 
                        rs.risk_score, rs.risk_level, rs.baseline_activity_score, rs.current_activity_score
                 FROM users u
                 LEFT JOIN risk_scores rs ON u.user_id = rs.user_id
                 WHERE u.user_id = ?`,
                [studentId],
                (err, row) => err ? reject(err) : resolve(row)
            );
        });

        if (!studentInfo) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // 2. Get risk history for graphing
        const riskHistory = await new Promise((resolve, reject) => {
            db.all(
                `SELECT risk_score, risk_level, recorded_at 
                 FROM risk_history 
                 WHERE user_id = ? 
                 ORDER BY recorded_at ASC`,
                [studentId],
                (err, rows) => err ? reject(err) : resolve(rows)
            );
        });

        // 3. Get all assignment submissions with detailed question breakdown
        const assignments = await new Promise((resolve, reject) => {
            db.all(
                `SELECT 
                    a.assignment_id,
                    a.title,
                    a.description,
                    a.due_date,
                    sub.submission_id,
                    sub.status,
                    sub.submitted_at,
                    sub.score,
                    sub.max_score,
                    sub.response_time_days
                 FROM assignments a
                 LEFT JOIN assignment_submissions sub ON a.assignment_id = sub.assignment_id AND sub.student_id = ?
                 ORDER BY a.due_date DESC`,
                [studentId],
                (err, rows) => err ? reject(err) : resolve(rows)
            );
        });

        // 4. For each submitted assignment, get question breakdown
        for (const assignment of assignments) {
            if (assignment.submission_id) {
                const questionDetails = await new Promise((resolve, reject) => {
                    db.all(
                        `SELECT 
                            q.question_id,
                            q.question_text,
                            q.correct_answer,
                            q.points,
                            sa.student_answer,
                            sa.is_correct,
                            sa.points_earned
                         FROM assignment_questions q
                         LEFT JOIN student_answers sa ON q.question_id = sa.question_id AND sa.submission_id = ?
                         WHERE q.assignment_id = ?
                         ORDER BY q.question_order`,
                        [assignment.submission_id, assignment.assignment_id],
                        (err, rows) => err ? reject(err) : resolve(rows)
                    );
                });
                assignment.questions = questionDetails;
                
                // Calculate stats
                const totalQuestions = questionDetails.length;
                const correctAnswers = questionDetails.filter(q => q.is_correct).length;
                const incorrectAnswers = totalQuestions - correctAnswers;
                
                assignment.stats = {
                    total_questions: totalQuestions,
                    correct: correctAnswers,
                    incorrect: incorrectAnswers,
                    accuracy: totalQuestions > 0 ? (correctAnswers / totalQuestions * 100).toFixed(1) : 0
                };
            }
        }

        // 5. Get overall statistics
        const overallStats = {
            total_assignments: assignments.length,
            submitted: assignments.filter(a => a.status === 'submitted').length,
            pending: assignments.filter(a => a.status === 'pending').length,
            missed: assignments.filter(a => a.status === 'missed').length,
            average_score: 0,
            total_points: 0,
            max_points: 0
        };

        const submittedAssignments = assignments.filter(a => a.score !== null);
        if (submittedAssignments.length > 0) {
            overallStats.total_points = submittedAssignments.reduce((sum, a) => sum + (a.score || 0), 0);
            overallStats.max_points = submittedAssignments.reduce((sum, a) => sum + (a.max_score || 0), 0);
            overallStats.average_score = overallStats.max_points > 0 
                ? (overallStats.total_points / overallStats.max_points * 100).toFixed(1)
                : 0;
        }

        res.json({
            student: studentInfo,
            risk_history: riskHistory,
            assignments: assignments,
            overall_stats: overallStats
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
