import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    ArrowLeft, Users, CheckCircle, Clock, AlertTriangle,
    TrendingDown, Award, BarChart3, XCircle, ChevronDown, ChevronRight
} from 'lucide-react';
import StudentProfile from './StudentProfile';

const API = 'http://localhost:5000/api';

const AssignmentResults = ({ assignmentId, onBack }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedQuestion, setExpandedQuestion] = useState(null);
    const [view, setView] = useState('overview'); // 'overview' or 'student-profile'
    const [selectedStudent, setSelectedStudent] = useState(null);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const res = await axios.get(`${API}/assignments/${assignmentId}/class-results`);
                setData(res.data);
            } catch (err) {
                alert('Failed to load results');
            }
            setLoading(false);
        };

        fetchResults();
    }, [assignmentId]);

    if (loading) {
        return <div style={{ color: 'var(--primary)', padding: '60px', fontFamily: 'monospace' }}>ANALYZING RESULTS...</div>;
    }

    if (view === 'student-profile' && selectedStudent) {
        return <StudentProfile 
            studentId={selectedStudent} 
            onBack={() => { 
                setView('overview'); 
                setSelectedStudent(null); 
            }} 
        />;
    }

    const { assignment, submissions, questions, statistics, high_risk_students } = data;

    return (
        <div className="content-area animate-reveal">
            <button onClick={onBack} className="btn" style={{ marginBottom: '20px', padding: '10px 16px' }}>
                <ArrowLeft size={18} /> BACK
            </button>

            <div style={{ marginBottom: '40px' }}>
                <h1 className="title-xl">{assignment.title}</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>
                    {assignment.class_name} • Due: {new Date(assignment.due_date).toLocaleString()}
                </p>
            </div>

            {/* Statistics Grid */}
            <div className="bento-grid" style={{ marginBottom: '40px' }}>
                <div className="card" style={{ gridColumn: 'span 3', padding: '32px' }}>
                    <Users size={24} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px' }}>TOTAL STUDENTS</p>
                    <p style={{ fontSize: '2.5rem', fontWeight: 900 }}>{statistics.total_students}</p>
                </div>

                <div className="card" style={{ gridColumn: 'span 3', padding: '32px' }}>
                    <CheckCircle size={24} color="var(--primary)" style={{ marginBottom: '12px' }} />
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px' }}>SUBMITTED</p>
                    <p style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary)' }}>{statistics.submitted_count}</p>
                </div>

                <div className="card" style={{ gridColumn: 'span 3', padding: '32px' }}>
                    <Clock size={24} color="#ffaa00" style={{ marginBottom: '12px' }} />
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px' }}>PENDING</p>
                    <p style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffaa00' }}>{statistics.pending_count}</p>
                </div>

                <div className="card" style={{ gridColumn: 'span 3', padding: '32px' }}>
                    <Award size={24} color="var(--primary)" style={{ marginBottom: '12px' }} />
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px' }}>AVG SCORE</p>
                    <p style={{ fontSize: '2.5rem', fontWeight: 900 }}>
                        {statistics.average_percentage.toFixed(1)}%
                    </p>
                </div>
            </div>

            {/* Risk Analysis */}
            {high_risk_students.length > 0 && (
                <div className="card" style={{ 
                    padding: '32px', 
                    marginBottom: '40px',
                    border: '1px solid var(--accent)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <AlertTriangle size={24} color="var(--accent)" />
                        <div>
                            <h3 style={{ fontSize: '1.2rem' }}>Risk Alert</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                {high_risk_students.length} student{high_risk_students.length !== 1 ? 's' : ''} requiring attention
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {high_risk_students.map(student => (
                            <div 
                                key={student.student_id} 
                                onClick={() => {
                                    setSelectedStudent(student.student_id);
                                    setView('student-profile');
                                }}
                                style={{
                                    padding: '16px 20px',
                                    background: 'rgba(255,107,107,0.05)',
                                    border: '1px solid rgba(255,107,107,0.3)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,107,107,0.1)';
                                    e.currentTarget.style.borderColor = 'var(--accent)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,107,107,0.05)';
                                    e.currentTarget.style.borderColor = 'rgba(255,107,107,0.3)';
                                }}
                            >
                                <div>
                                    <p style={{ fontWeight: 700, marginBottom: '4px' }}>{student.student_name}</p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {student.email}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                    {student.status === 'submitted' ? (
                                        <>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Score</p>
                                                <p style={{ 
                                                    fontSize: '1.2rem', 
                                                    fontWeight: 700,
                                                    color: student.score / student.max_score < 0.5 ? '#ff6b6b' : '#ffaa00'
                                                }}>
                                                    {student.score}/{student.max_score}
                                                </p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Risk Level</p>
                                                <span className={`status-glow status-${student.risk_level || 'Medium'}`}>
                                                    {student.risk_level || 'Medium'}
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{
                                            padding: '6px 12px',
                                            background: 'rgba(255,170,0,0.1)',
                                            borderRadius: '8px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            color: '#ffaa00'
                                        }}>
                                            NOT SUBMITTED
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Student Submissions Table */}
            <div className="card" style={{ padding: '0' }}>
                <div style={{ padding: '30px', borderBottom: '1px solid var(--glass-border)' }}>
                    <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <BarChart3 size={20} /> Detailed Results
                    </h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ 
                                color: 'var(--text-muted)', 
                                textTransform: 'uppercase', 
                                fontSize: '0.75rem', 
                                letterSpacing: '0.1em' 
                            }}>
                                <th style={{ padding: '24px 30px' }}>Student</th>
                                <th style={{ padding: '24px' }}>Status</th>
                                <th style={{ padding: '24px' }}>Score</th>
                                <th style={{ padding: '24px' }}>Percentage</th>
                                <th style={{ padding: '24px' }}>Risk Level</th>
                                <th style={{ padding: '24px 30px' }}>Submitted</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.map(sub => {
                                const percentage = sub.max_score > 0 
                                    ? Math.round((sub.score / sub.max_score) * 100) 
                                    : 0;
                                
                                return (
                                    <tr 
                                        key={sub.submission_id} 
                                        onClick={() => {
                                            setSelectedStudent(sub.student_id);
                                            setView('student-profile');
                                        }}
                                        style={{ 
                                            borderBottom: '1px solid var(--glass-border)',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(26, 115, 232, 0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <td style={{ padding: '24px 30px' }}>
                                            <div>
                                                <p style={{ fontWeight: 700 }}>{sub.student_name}</p>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {sub.email}
                                                </p>
                                            </div>
                                        </td>
                                        <td style={{ padding: '24px' }}>
                                            {sub.status === 'submitted' ? (
                                                <span style={{
                                                    padding: '6px 12px',
                                                    background: 'rgba(0,255,159,0.1)',
                                                    color: 'var(--primary)',
                                                    borderRadius: '8px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700
                                                }}>
                                                    <CheckCircle size={12} style={{ marginRight: '4px', display: 'inline' }} />
                                                    SUBMITTED
                                                </span>
                                            ) : (
                                                <span style={{
                                                    padding: '6px 12px',
                                                    background: 'rgba(255,170,0,0.1)',
                                                    color: '#ffaa00',
                                                    borderRadius: '8px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700
                                                }}>
                                                    <Clock size={12} style={{ marginRight: '4px', display: 'inline' }} />
                                                    PENDING
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ 
                                            padding: '24px', 
                                            fontFamily: 'var(--font-mono)', 
                                            fontWeight: 700, 
                                            fontSize: '1rem' 
                                        }}>
                                            {sub.status === 'submitted' ? `${sub.score}/${sub.max_score}` : '—'}
                                        </td>
                                        <td style={{ padding: '24px' }}>
                                            {sub.status === 'submitted' ? (
                                                <span style={{
                                                    fontSize: '1rem',
                                                    fontWeight: 700,
                                                    color: percentage >= 70 
                                                        ? 'var(--primary)' 
                                                        : percentage >= 50 
                                                            ? '#ffaa00' 
                                                            : '#ff6b6b'
                                                }}>
                                                    {percentage}%
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td style={{ padding: '24px' }}>
                                            <span className={`status-glow status-${sub.risk_level || 'Low'}`}>
                                                {sub.risk_level || 'Low'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '24px 30px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {sub.submitted_at 
                                                ? new Date(sub.submitted_at).toLocaleString() 
                                                : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Question-by-Question Analysis */}
            {questions && questions.length > 0 && (
                <div className="card" style={{ padding: '0', marginTop: '40px' }}>
                    <div style={{ padding: '30px', borderBottom: '1px solid var(--glass-border)' }}>
                        <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <BarChart3 size={20} /> Question Analysis
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                            Click on any question to see detailed student responses
                        </p>
                    </div>
                    <div style={{ padding: '24px' }}>
                        {questions.map((question, idx) => {
                            const isExpanded = expandedQuestion === question.question_id;
                            const correctCount = question.student_answers?.filter(a => a.is_correct).length || 0;
                            const totalCount = question.student_answers?.length || 0;
                            const correctPercentage = totalCount > 0 ? (correctCount / totalCount * 100).toFixed(1) : 0;
                            
                            return (
                                <div key={question.question_id} style={{ marginBottom: '16px' }}>
                                    <div 
                                        onClick={() => setExpandedQuestion(isExpanded ? null : question.question_id)}
                                        style={{
                                            padding: '20px',
                                            background: 'var(--bg-main)',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--primary)';
                                            e.currentTarget.style.background = '#f8f9fa';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--border)';
                                            e.currentTarget.style.background = 'var(--bg-main)';
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                            <div style={{ flex: 1, display: 'flex', gap: '12px', alignItems: 'start' }}>
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '50%',
                                                    background: 'var(--primary)',
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 700,
                                                    fontSize: '0.9rem',
                                                    flexShrink: 0
                                                }}>
                                                    {idx + 1}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>
                                                        {question.question_text}
                                                    </p>
                                                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
                                                        <span style={{ color: 'var(--text-secondary)' }}>
                                                            <strong>Correct Answer:</strong> {question.correct_answer}
                                                        </span>
                                                        <span style={{ color: 'var(--text-secondary)' }}>
                                                            <strong>Points:</strong> {question.points}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: '16px' }}>
                                                <div style={{ textAlign: 'right' }}>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                                        Accuracy
                                                    </p>
                                                    <p style={{ 
                                                        fontSize: '1.5rem', 
                                                        fontWeight: 700,
                                                        color: correctPercentage >= 70 ? 'var(--secondary)' : correctPercentage >= 50 ? '#ffaa00' : 'var(--accent)'
                                                    }}>
                                                        {correctPercentage}%
                                                    </p>
                                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                        {correctCount}/{totalCount} correct
                                                    </p>
                                                </div>
                                                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded: Show all student answers */}
                                    {isExpanded && question.student_answers && (
                                        <div style={{ 
                                            marginTop: '8px', 
                                            padding: '20px', 
                                            background: 'var(--bg-main)',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border)'
                                        }}>
                                            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-secondary)' }}>
                                                Student Responses
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {question.student_answers.map(answer => (
                                                    <div 
                                                        key={answer.answer_id}
                                                        onClick={() => {
                                                            setSelectedStudent(answer.student_id);
                                                            setView('student-profile');
                                                        }}
                                                        style={{
                                                            padding: '12px 16px',
                                                            borderRadius: '8px',
                                                            background: answer.is_correct ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                            border: `1px solid ${answer.is_correct ? 'var(--secondary)' : 'var(--accent)'}`,
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.transform = 'translateX(4px)';
                                                            e.currentTarget.style.background = answer.is_correct ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.transform = 'translateX(0)';
                                                            e.currentTarget.style.background = answer.is_correct ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            {answer.is_correct ? (
                                                                <CheckCircle size={20} color="var(--secondary)" />
                                                            ) : (
                                                                <XCircle size={20} color="var(--accent)" />
                                                            )}
                                                            <div>
                                                                <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>
                                                                    {answer.student_name}
                                                                </p>
                                                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                                    Answer: <strong>{answer.student_answer || 'No answer'}</strong>
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                                                                {answer.points_earned}/{question.points} pts
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(AssignmentResults);
