const db = require('../db/database');
const { createAlert, onRiskLevelChange, resolveRiskAlerts } = require('./alertService');

/**
 * InsightShield Risk Engine v2
 *
 * Metric 1 — Submission Integrity (per assignment/quiz entry)
 *   status = 'missed'                          → +3
 *   status = 'submitted', 1–2 days late        → +1
 *   status = 'submitted', > 2 days late        → +2  (more severe late)
 *   status = 'submitted', on-time (0 days)     →  0
 *
 * Metric 2 — Activity Deviation (rolling 4-week window vs prior 4-week window)
 *   Drop ≥ 40 %  → +3 | Drop ≥ 25 % → +2 | Drop ≥ 10 % → +1
 *   Falls back to stored baseline when < 8 weeks of history.
 *
 * Metric 3 — Temporal Inactivity (days since last recorded activity)
 *   ≥ 14 days → +4 | ≥ 7 days → +2 | ≥ 3 days → +1
 *
 * Classification:  0–3 = Low | 4–6 = Medium | 7+ = High
 *
 * Alert management:
 *   High   → create alert only if no unresolved High alert already exists.
 *   Non-High → auto-resolve any open High alerts (risk has improved).
 */
const calculateRisk = (userId) => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.all(
                `SELECT * FROM activity_logs WHERE user_id = ? ORDER BY submission_date DESC`,
                [userId],
                (err, logs) => {
                    if (err) return reject(err);

                    const now = new Date();

                    // ── Metric 1: Submission Integrity ──────────────────────
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
                            // days === 0 → on-time, no penalty
                        }
                    });

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

                            const totalScore = metric1 + metric2 + metric3;

                            let riskLevel = 'Low';
                            if (totalScore >= 7)      riskLevel = 'High';
                            else if (totalScore >= 4) riskLevel = 'Medium';

                            // ── Persist risk score (preserve existing baseline) ──
                            // Use COALESCE so baseline_activity_score is only written on first insert.
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
                                                // Student: self-directed CRITICAL alert
                                                await createAlert({
                                                    subjectUserId: userId,
                                                    recipientId:   userId,
                                                    recipientRole: 'student',
                                                    alertType:     'risk_change',
                                                    riskLevel:     'High',
                                                    message:       `CRITICAL: Your behavioral risk score has reached ${totalScore}. Please engage with your mentor immediately.`
                                                });
                                                // Mentor + Admin alerts
                                                await onRiskLevelChange({ studentId: userId, studentName, mentorId, score: totalScore, riskLevel });
                                            } else {
                                                // Risk has dropped — auto-resolve all open risk alerts for this student
                                                await resolveRiskAlerts(userId);
                                            }

                                            resolve({ score: totalScore, riskLevel, breakdown: { metric1, metric2, metric3 } });
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

module.exports = { calculateRisk };
