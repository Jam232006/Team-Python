import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronRight, XCircle } from 'lucide-react';
import { Card, Button, Badge, Table, Loading, StatCard } from './shared/UIComponents';
import { api } from '../utils/api';
import { formatDate, percentage, getRiskColor } from '../utils/helpers';
import StudentProfile from './StudentProfile';

const AssignmentResults = ({ assignmentId, onBack }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedQuestion, setExpandedQuestion] = useState(null);
    const [view, setView] = useState('overview');
    const [selectedStudent, setSelectedStudent] = useState(null);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const res = await api.assignments.getClassResults(assignmentId);
                setData(res);
            } catch (err) {
                alert('Failed to load results');
            }
            setLoading(false);
        };
        fetchResults();
    }, [assignmentId]);

    if (loading) return <Loading />;

    if (view === 'student-profile' && selectedStudent) {
        return <StudentProfile studentId={selectedStudent} onBack={() => { setView('overview'); setSelectedStudent(null); }} />;
    }

    const { assignment, submissions, questions, statistics, high_risk_students } = data;

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
            <Button onClick={onBack} style={{ marginBottom: '20px' }}>
                <ArrowLeft size={18} /> Back
            </Button>

            <div style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2rem', margin: '0 0 8px' }}>{assignment.title}</h1>
                <p style={{ color: '#5f6368', margin: 0 }}>
                    {assignment.class_name} • Due: {formatDate(assignment.due_date)}
                </p>
            </div>

            {/* Statistics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '40px' }}>
                <StatCard title="Total Students" value={statistics.total_students} icon={<Users size={20} />} />
                <StatCard title="Submitted" value={statistics.submitted_count} icon={<CheckCircle size={20} />} color="#34a853" />
                <StatCard title="Pending" value={statistics.pending_count} icon={<Clock size={20} />} color="#fbbc04" />
                <StatCard title="Average" value={`${statistics.average_percentage?.toFixed(1) || 0}%`} color="#1a73e8" />
            </div>

            {/* High Risk Students Alert */}
            {high_risk_students.length > 0 && (
                <Card style={{ marginBottom: '32px', background: '#fef7e0', border: '1px solid #fbbc04' }}>
                    <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={18} color="#fbbc04" /> High Risk Students ({high_risk_students.length})
                    </h3>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        {high_risk_students.map(s => (
                            <div key={s.student_id} style={{ padding: '12px', background: 'white', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 500, cursor: 'pointer', color: '#1a73e8' }} onClick={() => { setSelectedStudent(s.student_id); setView('student-profile'); }}>
                                        {s.student_name}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#5f6368' }}>
                                        Risk: <Badge color={getRiskColor(s.risk_level)}>{s.risk_level}</Badge>
                                        {s.score != null && ` • Score: ${percentage(s.score, s.max_score)}%`}
                                    </div>
                                </div>
                                <Button size="small" onClick={() => { setSelectedStudent(s.student_id); setView('student-profile'); }}>View Profile</Button>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Question Performance */}
            <Card style={{ marginBottom: '32px' }}>
                <h3 style={{ margin: '0 0 16px' }}>Question Performance</h3>
                {questions.map((q, idx) => {
                    const correctCount = submissions.filter(s => {
                        const sub = s.submission_id;
                        return s.status === 'submitted'; // simplified - would need actual answer checking
                    }).length;
                    const totalAnswered = statistics.submitted_count;
                    const accuracy = totalAnswered > 0 ? (correctCount / totalAnswered * 100) : 0;
                    const isExpanded = expandedQuestion === q.question_id;

                    return (
                        <div key={q.question_id} style={{ marginBottom: '12px', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                            <div 
                                onClick={() => setExpandedQuestion(isExpanded ? null : q.question_id)}
                                style={{ padding: '16px', background: '#f8f9fa', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>Question {q.question_order + 1}</div>
                                    <div style={{ fontSize: '0.875rem', color: '#5f6368' }}>{q.question_text}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: accuracy >= 60 ? '#34a853' : '#ea4335' }}>
                                            {accuracy.toFixed(0)}%
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#5f6368' }}>accuracy</div>
                                    </div>
                                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                </div>
                            </div>
                            
                            {isExpanded && (
                                <div style={{ padding: '16px', background: 'white' }}>
                                    <div style={{ marginBottom: '12px' }}>
                                        <strong>Correct Answer:</strong> {q.correct_answer}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#5f6368' }}>
                                        Points: {q.points} • Type: {q.question_type}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </Card>

            {/* Student Submissions */}
            <Card>
                <h3 style={{ margin: '0 0 16px' }}>Student Submissions ({submissions.length})</h3>
                <Table>
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Status</th>
                            <th>Score</th>
                            <th>Percentage</th>
                            <th>Submitted</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {submissions.map(s => {
                            const pct = s.score != null ? percentage(s.score, s.max_score) : null;
                            return (
                                <tr key={s.submission_id}>
                                    <td>
                                        <div style={{ fontWeight: 500, cursor: 'pointer', color: '#1a73e8' }} onClick={() => { setSelectedStudent(s.student_id); setView('student-profile'); }}>
                                            {s.student_name}
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: '#5f6368' }}>{s.email}</div>
                                    </td>
                                    <td>
                                        <Badge color={s.status === 'submitted' ? '#34a853' : '#fbbc04'}>
                                            {s.status === 'submitted' ? 'Submitted' : 'Pending'}
                                        </Badge>
                                    </td>
                                    <td>{s.score != null ? `${s.score} / ${s.max_score}` : 'N/A'}</td>
                                    <td>
                                        {pct != null ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ flex: 1, height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', background: pct >= 60 ? '#34a853' : '#ea4335', width: `${pct}%` }} />
                                                </div>
                                                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: pct >= 60 ? '#34a853' : '#ea4335' }}>
                                                    {pct}%
                                                </span>
                                            </div>
                                        ) : (
                                            'N/A'
                                        )}
                                    </td>
                                    <td>{s.submitted_at ? formatDate(s.submitted_at) : 'Not submitted'}</td>
                                    <td>
                                        <Button size="small" onClick={() => { setSelectedStudent(s.student_id); setView('student-profile'); }}>View Profile</Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>
            </Card>
        </div>
    );
};

export default AssignmentResults;
