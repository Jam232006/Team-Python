import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
    ArrowLeft, TrendingUp, CheckCircle, XCircle, Clock,
    Target, Award, BarChart3
} from 'lucide-react';

import { ensureArray } from '../utils/helpers';

const API = 'http://localhost:5000/api';

const StudentProfile = ({ studentId, onBack }) => {
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (studentId) {
            fetchProfileData();
        }
    }, [studentId]);

    const fetchProfileData = async () => {
        try {
            const response = await axios.get(`${API}/assignments/student/${studentId}/profile`);
            setProfileData(response.data);
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading profile...
            </div>
        );
    }

    if (!profileData) {
        return (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Profile not found
            </div>
        );
    }

    const { student, risk_history = [], assignments = [], overall_stats = {} } = profileData;

    // Prepare risk chart data
    const riskChartData = {
        labels: ensureArray(risk_history).map(r => new Date(r.recorded_at).toLocaleDateString()),
        datasets: [
            {
                label: 'Risk Score',
                data: ensureArray(risk_history).map(r => r.risk_score),
                borderColor: '#ff4444',
                backgroundColor: 'rgba(255, 68, 68, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 7
            }
        ]
    };

    const riskChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            title: {
                display: false
            },
            tooltip: {
                callbacks: {
                    afterLabel: (context) => {
                        const level = risk_history[context.dataIndex]?.risk_level;
                        return `Level: ${level}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Risk Score'
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Date'
                }
            }
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-main)', padding: '24px' }}>
            {/* Header */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <button
                    onClick={onBack}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'var(--primary)',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        marginBottom: '16px',
                        padding: '8px 0'
                    }}
                >
                    <ArrowLeft size={20} /> Back to Class
                </button>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: '1.5rem'
                    }}>
                        {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: '1.75rem', margin: '0 0 4px 0' }}>{student.name}</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>{student.email}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>
                            Current Risk
                        </p>
                        <span className={`badge badge-${(student.risk_level || 'low').toLowerCase()}`} style={{ fontSize: '1rem', padding: '8px 16px' }}>
                            {student.risk_level || 'Low'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '10px', background: 'var(--primary-light)', borderRadius: '12px' }}>
                            <Target size={24} color="var(--primary)" />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Average Score</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>{overall_stats.average_score}%</p>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '10px', background: 'var(--secondary-light)', borderRadius: '12px' }}>
                            <CheckCircle size={24} color="var(--secondary)" />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Submitted</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>{overall_stats.submitted}/{overall_stats.total_assignments}</p>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '10px', background: 'var(--warning-light)', borderRadius: '12px' }}>
                            <Clock size={24} color="var(--warning)" />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Pending</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>{overall_stats.pending}</p>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '10px', background: 'var(--accent-light)', borderRadius: '12px' }}>
                            <Award size={24} color="var(--accent)" />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Points</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>{overall_stats.total_points}/{overall_stats.max_points}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Risk Level Over Time Chart */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={20} color="var(--primary)" />
                    Risk Level Over Time
                </h3>
                <div style={{ height: '300px' }}>
                    <Line data={riskChartData} options={riskChartOptions} />
                </div>
            </div>

            {/* Assignment Details */}
            <div className="card">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={20} color="var(--primary)" />
                    Assignment Performance
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {assignments.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>
                            No assignments yet
                        </p>
                    ) : ensureArray(assignments).map(assignment => (
                        <div key={assignment.assignment_id} style={{
                            padding: '20px',
                            background: 'var(--bg-main)',
                            borderRadius: '12px',
                            border: '1px solid var(--border)'
                        }}>
                            {/* Assignment Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 4px 0' }}>
                                        {assignment.title}
                                    </h4>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                                        {assignment.description}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                                    {assignment.status === 'submitted' ? (
                                        <>
                                            <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 4px 0', color: assignment.score >= assignment.max_score * 0.7 ? 'var(--secondary)' : 'var(--accent)' }}>
                                                {assignment.score}/{assignment.max_score}
                                            </p>
                                            <span className={`badge badge-${assignment.stats.accuracy >= 70 ? 'low' : assignment.stats.accuracy >= 50 ? 'medium' : 'high'}`}>
                                                {assignment.stats.accuracy}% accuracy
                                            </span>
                                        </>
                                    ) : (
                                        <span className={`badge badge-${assignment.status === 'pending' ? 'medium' : 'high'}`}>
                                            {assignment.status}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Submission Info */}
                            {assignment.status === 'submitted' && (
                                <>
                                    <div style={{ display: 'flex', gap: '24px', padding: '12px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', margin: '12px 0' }}>
                                        <div>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>Submitted</p>
                                            <p style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>
                                                {new Date(assignment.submitted_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>Response Time</p>
                                            <p style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>
                                                {assignment.response_time_days} day{assignment.response_time_days !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>Questions</p>
                                            <p style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>
                                                <span style={{ color: 'var(--secondary)' }}>{assignment.stats.correct} correct</span>
                                                {' / '}
                                                <span style={{ color: 'var(--accent)' }}>{assignment.stats.incorrect} wrong</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Question Breakdown */}
                                    {assignment.questions && assignment.questions.length > 0 && (
                                        <div>
                                            <h5 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 12px 0', color: 'var(--text-secondary)' }}>
                                                Question Breakdown:
                                            </h5>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {ensureArray(assignment.questions).map((q, idx) => (
                                                    <div key={q.question_id} style={{
                                                        padding: '12px',
                                                        borderRadius: '8px',
                                                        background: q.is_correct ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                        border: `1px solid ${q.is_correct ? 'var(--secondary)' : 'var(--accent)'}`,
                                                        display: 'flex',
                                                        gap: '12px',
                                                        alignItems: 'start'
                                                    }}>
                                                        {q.is_correct ? (
                                                            <CheckCircle size={18} color="var(--secondary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                                        ) : (
                                                            <XCircle size={18} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                                        )}
                                                        <div style={{ flex: 1 }}>
                                                            <p style={{ fontSize: '0.85rem', fontWeight: 500, margin: '0 0 6px 0' }}>
                                                                Q{idx + 1}: {q.question_text}
                                                            </p>
                                                            <div style={{ fontSize: '0.8rem' }}>
                                                                <p style={{ margin: '0 0 4px 0', color: 'var(--text-secondary)' }}>
                                                                    <strong>Student Answer:</strong> {q.student_answer || 'No answer'}
                                                                </p>
                                                                {!q.is_correct && (
                                                                    <p style={{ margin: 0, color: 'var(--secondary)' }}>
                                                                        <strong>Correct Answer:</strong> {q.correct_answer}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                            <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>
                                                                {q.points_earned}/{q.points} pts
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StudentProfile;
