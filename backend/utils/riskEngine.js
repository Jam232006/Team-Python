const db = require('../db/database');
const { createAlert, onRiskLevelChange, resolveRiskAlerts } = require('./alertService');

/**
 * Update submission streak for a user
 * Tracks consecutive submissions to reward consistency
 */
const updateStreak = (userId, submissionDate) => {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT * FROM submission_streaks WHERE user_id = ?`,
            [userId],
            (err, row) => {
                if (err) return reject(err);

                const subDate = new Date(submissionDate);
                subDate.setHours(0, 0, 0, 0); // normalize to date only

                if (!row) {
                    // First submission ever
                    db.run(
                        `INSERT INTO submission_streaks (user_id, current_streak, longest_streak, last_submission_date)
                         VALUES (?, 1, 1, ?)`,
                        [userId, subDate.toISOString().split('T')[0]],
                        (err2) => err2 ? reject(err2) : resolve(1)
                    );
                } else {
                    const lastDate = new Date(row.last_submission_date);
                    lastDate.setHours(0, 0, 0, 0);
                    
                    const diffDays = Math.floor((subDate - lastDate) / (1000 * 60 * 60 * 24));

                    let newStreak = row.current_streak;
                    
                    if (diffDays === 0) {
                        // Same day - no change
                        return resolve(row.current_streak);
                    } else if (diffDays <= 3) {
                        // Within 3 days - continue streak
                        newStreak = row.current_streak + 1;
                    } else {
                        // Streak broken - reset
                        newStreak = 1;
                    }

                    const longestStreak = Math.max(row.longest_streak, newStreak);

                    db.run(
                        `UPDATE submission_streaks 
                         SET current_streak = ?, longest_streak = ?, last_submission_date = ?
                         WHERE user_id = ?`,
                        [newStreak, longestStreak, subDate.toISOString().split('T')[0], userId],
                        (err2) => err2 ? reject(err2) : resolve(newStreak)
                    );
                }
            }
        );
    });
};

/**
 * Get current streak for a user
 */
const getStreak = (userId) => {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT current_streak FROM submission_streaks WHERE user_id = ?`,
            [userId],
            (err, row) => {
                if (err) return reject(err);
                resolve(row ? row.current_streak : 0);
            }
        );
    });
};



const calculateRisk = (userId) => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.all(
                `SELECT * FROM activity_logs WHERE user_id = ? ORDER BY submission_date DESC`,
                [userId],
                async (err, logs) => {
                    if (err) return reject(err);

                    const now = new Date();

                    // Metric 1: Submission Integrity
                    let metric1 = 0;
                    logs.forEach(log => {
                        if (log.activity_type !== 'assignment' && log.activity_type !== 'quiz') return;

                        if (log.status === 'missed') {
                            metric1 += 3;
                        } else if (log.status === 'submitted') {
                            const days = log.response_time_days || 0;
                            if (days > 2) {
                                metric1 += 2; // severely late but submitted
                            } else if (days >= 1) {
                                metric1 += 1; // 1–2 days late
                            }
                            // days == 0 → on-time, no penalty
                        }
                    });

                    // Metric 3: Temporal Inactivity
                    let metric3 = 0;
                    const lastActivity = logs.length > 0
                        ? new Date(logs[0].submission_date)
                        : null;

                    if (lastActivity) {
                        const diffDays = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));
                        if (diffDays >= 14)     metric3 = 4;
                        else if (diffDays >= 7) metric3 = 2;
                        else if (diffDays >= 3) metric3 = 1;
                    } else {
                        metric3 = 4;
                    }

                    // fetch assignment submissions with scores
                    const scoreResult = await new Promise((res, rej) => {
                        db.all(
                            `SELECT score, max_score FROM assignment_submissions 
                             WHERE student_id = ? AND status = 'submitted' AND score IS NOT NULL`,
                            [userId],
                            (err, rows) => err ? rej(err) : res(rows)
                        );
                    }).catch(() => []);

                    let metric4 = 0;
                    scoreResult.forEach(sub => {
                        const marksLost = (sub.max_score || 100) - (sub.score || 0);
                        if (marksLost > 0) {
                            metric4 += marksLost * 0.01;
                        }
                    });

                    // Metric 5: Consistency Bonus 
                    const currentStreak = await getStreak(userId).catch(() => 0);
                    let metric5 = 0; // This is a bonus (negative risk)
                    if (currentStreak >= 10) {
                        metric5 = -2;
                    } else if (currentStreak >= 5) {
                        metric5 = -1;
                    }

                    // Metric 2: Activity Deviation 
                    const msPerDay = 1000 * 60 * 60 * 24;
                    const cutoff28  = new Date(now - 28 * msPerDay);
                    const cutoff56  = new Date(now - 56 * msPerDay);

                    const currentCount = logs.filter(l =>
                        new Date(l.submission_date) > cutoff28
                    ).length;

                    const priorCount = logs.filter(l => {
                        const d = new Date(l.submission_date);
                        return d > cutoff56 && d <= cutoff28;
                    }).length;

                    db.get(
                        `SELECT baseline_activity_score FROM risk_scores WHERE user_id = ?`,
                        [userId],
                        (err2, row) => {
                            if (err2) return reject(err2);

                            const baseline = priorCount > 0
                                ? priorCount
                                : (row ? row.baseline_activity_score : currentCount || 10);

                            let metric2 = 0;
                            if (baseline > 0) {
                                const dropPct = ((baseline - currentCount) / baseline) * 100;
                                if (dropPct >= 40)      metric2 = 3;
                                else if (dropPct >= 25) metric2 = 2;
                                else if (dropPct >= 10) metric2 = 1;
                            }

                            // Calculate Total Score with All Metrics
                            const totalScore = Math.max(0, metric1 + metric2 + metric3 + metric4 + metric5);

                            let riskLevel = 'Low';
                            if (totalScore >= 7)      riskLevel = 'High';
                            else if (totalScore >= 4) riskLevel = 'Medium';

                            // ── Persist risk score (preserve existing baseline) 
                            db.run(
                                `INSERT INTO risk_scores
                                    (user_id, baseline_activity_score, current_activity_score, risk_score, risk_level, last_updated)
                                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                                 ON CONFLICT(user_id) DO UPDATE SET
                                    current_activity_score = excluded.current_activity_score,
                                    risk_score             = excluded.risk_score,
                                    risk_level             = excluded.risk_level,
                                    last_updated           = CURRENT_TIMESTAMP`,
                                [userId, baseline, currentCount, totalScore, riskLevel],
                                function (err3) {
                                    if (err3) return reject(err3);

                                    // ── Alert management via alertService ───────
                                    // Look up student name + mentor to pass full context to alertService
                                    db.get(
                                        `SELECT u.name AS student_name, u.mentor_id
                                         FROM users u WHERE u.user_id = ?`,
                                        [userId],
                                        async (err4, studentRow) => {
                                            const studentName = studentRow ? studentRow.student_name : `User #${userId}`;
                                            const mentorId    = studentRow ? studentRow.mentor_id    : null;

                                            if (riskLevel === 'High') {
                                                await createAlert({
                                                    subjectUserId: userId,
                                                    recipientId:   userId,
                                                    recipientRole: 'student',
                                                    alertType:     'risk_change',
                                                    riskLevel:     'High',
                                                    message:       `CRITICAL: Your behavioral risk score has reached ${totalScore}. Please engage with your mentor immediately.`
                                                });
                                                await onRiskLevelChange({ studentId: userId, studentName, mentorId, score: totalScore, riskLevel });
                                            } else {
                                                await resolveRiskAlerts(userId);
                                            }

                                            resolve({ 
                                                score: totalScore, 
                                                riskLevel, 
                                                breakdown: { 
                                                    metric1, 
                                                    metric2, 
                                                    metric3, 
                                                    metric4_score_penalty: metric4, 
                                                    metric5_consistency_bonus: metric5,
                                                    current_streak: currentStreak
                                                } 
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        });
    });
};

module.exports = { calculateRisk, updateStreak, getStreak };
