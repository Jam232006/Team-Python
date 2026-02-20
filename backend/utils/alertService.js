const db = require('../db/database');

const createAlert = ({ subjectUserId, recipientId = null, recipientRole, alertType, message, riskLevel = null }) => {
    return new Promise((resolve) => {
        // NULL-safe comparison: use IS instead of = so NULL IS NULL works correctly
        db.get(
            `SELECT alert_id FROM alerts
             WHERE user_id = ?
               AND recipient_id IS ?
               AND recipient_role = ?
               AND alert_type = ?
               AND resolved_status = 0
             LIMIT 1`,
            [subjectUserId, recipientId, recipientRole, alertType],
            (err, existing) => {
                if (!err && existing) {
                    return resolve({ skipped: true, alert_id: existing.alert_id });
                }

                db.run(
                    `INSERT INTO alerts
                        (user_id, recipient_id, recipient_role, alert_type, risk_level, alert_message)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [subjectUserId, recipientId, recipientRole, alertType, riskLevel, message],
                    function (err2) {
                        if (err2) return resolve({ error: err2.message });
                        resolve({ alert_id: this.lastID });
                    }
                );
            }
        );
    });
};

/**
 * Called whenever an assignment or quiz is logged for a student.
 * Creates up to three alerts: one for the student, one for their mentor, and one broadcast to all admins.
 *
 * @param {Object} opts
 * @param {number}  opts.studentId
 * @param {string}  opts.studentName
 * @param {number}  opts.mentorId      – null if student has no mentor
 * @param {string}  opts.mentorName
 * @param {string}  opts.activityType  – 'assignment' | 'quiz'
 * @param {string}  opts.title         – human-readable name of the work item
 * @param {string}  opts.dueDate       – ISO date string or null
 * @param {string}  opts.status        – 'submitted' | 'pending' | 'missed'
 */
const onAssignmentLogged = async ({
    studentId, studentName,
    mentorId, mentorName,
    activityType, title, dueDate, status
}) => {
    const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
    const typeLabel  = activityType.charAt(0).toUpperCase() + activityType.slice(1);
    const now        = new Date();
    const isPast     = dueDate ? new Date(dueDate) < now : false;
    const isOverdue  = isPast || status === 'missed';
    const mName      = mentorName || 'Unknown Mentor';

    if (status === 'submitted') {
        await createAlert({
            subjectUserId: studentId,
            recipientId:   studentId,
            recipientRole: 'student',
            alertType:     'assignment_submitted',
            message:       `Your ${typeLabel} "${title}" has been submitted successfully.`
        });
    } else if (status === 'pending' && !isPast) {
        await createAlert({
            subjectUserId: studentId,
            recipientId:   studentId,
            recipientRole: 'student',
            alertType:     'assignment_reminder',
            message:       `Reminder: Your ${typeLabel} "${title}" is due on ${dueDateStr}.`
        });
    }

    if (isOverdue) {
        db.run(
            `UPDATE alerts SET resolved_status = 1
             WHERE user_id = ? AND recipient_id = ? AND alert_type = 'assignment_reminder' AND resolved_status = 0`,
            [studentId, studentId]
        );
        await createAlert({
            subjectUserId: studentId,
            recipientId:   studentId,
            recipientRole: 'student',
            alertType:     'assignment_overdue',
            message:       `The submission window for your ${typeLabel} "${title}" has now closed.`
        });
    }

    if (mentorId) {
        if (!isOverdue && status === 'pending') {
            await createAlert({
                subjectUserId: studentId,
                recipientId:   mentorId,
                recipientRole: 'mentor',
                alertType:     'assignment_due',
                message:       `Upcoming: ${typeLabel} "${title}" for student ${studentName} is due on ${dueDateStr}.`
            });
        }

        if (isOverdue) {
            db.run(
                `UPDATE alerts SET resolved_status = 1
                 WHERE user_id = ? AND recipient_id = ? AND alert_type = 'assignment_due' AND resolved_status = 0`,
                [studentId, mentorId]
            );
            await createAlert({
                subjectUserId: studentId,
                recipientId:   mentorId,
                recipientRole: 'mentor',
                alertType:     'assignment_date_passed',
                message:       `Submission date has passed for ${typeLabel} "${title}" — student: ${studentName}.`
            });
        }
    }

    if (!isOverdue) {
        await createAlert({
            subjectUserId: studentId,
            recipientId:   null,
            recipientRole: 'admin',
            alertType:     'assignment_assigned',
            message:       `${typeLabel} "${title}" assigned to student ${studentName} by mentor ${mName}. Due: ${dueDateStr}.`
        });
    } else {
        await createAlert({
            subjectUserId: studentId,
            recipientId:   null,
            recipientRole: 'admin',
            alertType:     'assignment_date_passed',
            message:       `Submission date has passed for ${typeLabel} "${title}" — student ${studentName}, mentor ${mName}.`
        });
    }
};

/**
 * Called by the risk engine after each recalculation.
 * Creates mentor and admin risk alerts; student risk alert handled
 * inline within the engine itself.
 *
 * @param {Object} opts
 * @param {number}  opts.studentId
 * @param {string}  opts.studentName
 * @param {number}  opts.mentorId
 * @param {number}  opts.score
 * @param {string}  opts.riskLevel – 'Low' | 'Medium' | 'High'
 */
const onRiskLevelChange = async ({ studentId, studentName, mentorId, score, riskLevel }) => {
    const label = riskLevel === 'High' ? 'CRITICAL' : riskLevel === 'Medium' ? 'ATTENTION' : 'CLEAR';

    // ── MENTOR: alert on every recalculation (dedup prevents spam) ────────────
    if (mentorId) {
        await createAlert({
            subjectUserId: studentId,
            recipientId:   mentorId,
            recipientRole: 'mentor',
            alertType:     'risk_change',
            riskLevel,
            message:       `[${label}] Student ${studentName} — risk level: ${riskLevel} (score: ${score}).`
        });
    }

    if (riskLevel === 'High') {
        await createAlert({
            subjectUserId: studentId,
            recipientId:   null,
            recipientRole: 'admin',
            alertType:     'risk_alert',
            riskLevel:     'High',
            message:       `Risk alert — student ${studentName} is CRITICAL (score: ${score}). Mentor intervention required.`
        });
    }
};

/**
 * Auto-resolves all open risk-related alerts for a student when risk drops.
 * Covers: risk_change (mentor), risk_alert (admin), and legacy High alerts.
 */
const resolveRiskAlerts = (studentId) => {
    return new Promise((resolve) => {
        db.run(
            `UPDATE alerts SET resolved_status = 1
             WHERE user_id = ? AND alert_type IN ('risk_change', 'risk_alert') AND resolved_status = 0`,
            [studentId],
            () => resolve()
        );
    });
};

module.exports = { createAlert, onAssignmentLogged, onRiskLevelChange, resolveRiskAlerts };
