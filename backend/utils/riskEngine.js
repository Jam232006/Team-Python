const db = require('../db/database');

const calculateRisk = async (userId) => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // 1. Get recent activity for Metric 1 and 3
            db.all(`SELECT * FROM activity_logs WHERE user_id = ? ORDER BY submission_date DESC`, [userId], (err, logs) => {
                if (err) return reject(err);

                let score = 0;

                // Metric 1: Submission Delay
                logs.forEach(log => {
                    if (log.activity_type === 'assignment' || log.activity_type === 'quiz') {
                        if (log.status === 'missed') {
                            score += 3;
                        } else if (log.response_time_days > 2) {
                            // Not explicitly defined in prompt what happens after 2 days, but 1-2 days is 1 point.
                            // I'll assume > 2 is also at least 1, maybe more? User said "1-2 days late -> 1 point". 
                            // I'll stick to 1 point if > 0.
                            score += 1;
                        } else if (log.response_time_days > 0) {
                            score += 1;
                        }
                    }
                });

                // Metric 3: Inactivity
                const lastActivity = logs.length > 0 ? new Date(logs[0].submission_date) : new Date();
                const now = new Date();
                const diffDays = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));

                if (diffDays >= 14) score += 4;
                else if (diffDays >= 7) score += 2;
                else if (diffDays >= 3) score += 1;

                // Metric 2: Activity Drop (This requires historical data)
                // For simplicity in this engine, we'll fetch weekly averages.
                // Let's assume we have a way to get baseline. 
                // For the sake of the rule-based engine:
                db.get(`SELECT baseline_activity_score FROM risk_scores WHERE user_id = ?`, [userId], (err, row) => {
                    if (err) return reject(err);
                    const baseline = row ? row.baseline_activity_score : 10; // default baseline
                    const currentActivityCount = logs.filter(l => {
                        const d = new Date(l.submission_date);
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return d > weekAgo;
                    }).length;

                    const dropPercent = baseline > 0 ? ((baseline - currentActivityCount) / baseline) * 100 : 0;

                    if (dropPercent >= 40) score += 3;
                    else if (dropPercent >= 25) score += 2;
                    else if (dropPercent >= 10) score += 1;

                    let riskLevel = 'Low';
                    if (score >= 7) riskLevel = 'High';
                    else if (score >= 4) riskLevel = 'Medium';

                    // Update risk_scores table
                    db.run(`INSERT OR REPLACE INTO risk_scores (user_id, current_activity_score, risk_score, risk_level, last_updated)
                  VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                        [userId, currentActivityCount, score, riskLevel], function (err) {
                            if (err) return reject(err);

                            // Generate Alert if High
                            if (riskLevel === 'High') {
                                db.run(`INSERT INTO alerts (user_id, risk_level, alert_message)
                        VALUES (?, 'High', 'High risk detected due to behavioral deviation.')`, [userId]);
                            }
                            resolve({ score, riskLevel });
                        });
                });
            });
        });
    });
};

module.exports = { calculateRisk };
