// Export utilities for generating reports
import { ensureArray } from './helpers';

export const exportToCSV = (data, filename = 'export.csv') => {
    const validData = ensureArray(data);
    if (validData.length === 0) {
        alert('No data to export');
        return;
    }

    const headers = Object.keys(validData[0]);
    const csvContent = [
        headers.join(','),
        ...validData.map(row => headers.map(header => {
            const value = row[header];
            // Handle values with commas or newlines
            if (typeof value === 'string' && (value.includes(',') || value.includes('\n'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(','))
    ].join('\n');

    downloadFile(csvContent, filename, 'text/csv');
};

export const exportStudentReport = (students) => {
    const data = ensureArray(students).map(s => ({
        Name: s.name,
        Email: s.email,
        'Risk Level': s.risk_level || 'Unknown',
        'Risk Score': s.risk_score?.toFixed(2) || 'N/A',
        'Current Activity': s.current_activity_score?.toFixed(1) || 'N/A',
        'Baseline Activity': s.baseline_activity_score?.toFixed(1) || 'N/A'
    }));
    exportToCSV(data, `student-risk-report-${new Date().toISOString().split('T')[0]}.csv`);
};

export const exportAssignmentReport = (assignments) => {
    const data = ensureArray(assignments).map(a => ({
        Title: a.title,
        Class: a.class_name || 'N/A',
        'Due Date': new Date(a.due_date).toLocaleDateString(),
        'Total Submissions': a.total_submissions || 0,
        'Submitted Count': a.submitted_count || 0,
        'Completion Rate': a.total_submissions ? 
            `${((a.submitted_count / a.total_submissions) * 100).toFixed(1)}%` : '0%'
    }));
    exportToCSV(data, `assignment-report-${new Date().toISOString().split('T')[0]}.csv`);
};

export const exportClassReport = (classes) => {
    const data = ensureArray(classes).map(c => ({
        'Class Name': c.name,
        Description: c.description || 'No description',
        'Student Count': c.student_count || 0,
        'Assignment Count': c.assignment_count || 0,
        Created: new Date(c.created_at).toLocaleDateString()
    }));
    exportToCSV(data, `class-report-${new Date().toISOString().split('T')[0]}.csv`);
};

const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const exportJSON = (data, filename = 'export.json') => {
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, filename, 'application/json');
};

export const generateSummaryReport = (students, classes, assignments, alerts) => {
    const safeStudents = ensureArray(students);
    const safeClasses = ensureArray(classes);
    const safeAssignments = ensureArray(assignments);
    const safeAlerts = ensureArray(alerts);
    
    const report = {
        generated_at: new Date().toISOString(),
        summary: {
            total_students: safeStudents.length,
            high_risk_students: safeStudents.filter(s => s.risk_level === 'High').length,
            medium_risk_students: safeStudents.filter(s => s.risk_level === 'Medium').length,
            low_risk_students: safeStudents.filter(s => s.risk_level === 'Low').length,
            total_classes: safeClasses.length,
            total_assignments: safeAssignments.length,
            pending_alerts: safeAlerts.filter(a => !a.resolved_status).length
        },
        students: safeStudents.map(s => ({
            name: s.name,
            email: s.email,
            risk_level: s.risk_level,
            risk_score: s.risk_score
        })),
        risk_distribution: {
            high: safeStudents.filter(s => s.risk_level === 'High').length,
            medium: safeStudents.filter(s => s.risk_level === 'Medium').length,
            low: safeStudents.filter(s => s.risk_level === 'Low').length
        }
    };
    
    exportJSON(report, `insightshield-summary-${new Date().toISOString().split('T')[0]}.json`);
};
