import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
    Clock, AlertCircle, CheckCircle, Send, ArrowLeft,
    BookOpen, Award
} from 'lucide-react';

import { ensureArray } from '../utils/helpers';

const API = 'http://localhost:5000/api';

const AssignmentTaker = ({ assignmentId, onBack }) => {
    const { user } = useAuth();
    const [assignment, setAssignment] = useState(null);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        const fetchAssignment = async () => {
            try {
                const [detailsRes, resultRes] = await Promise.all([
                    axios.get(`${API}/assignments/${assignmentId}/details`),
                    axios.get(`${API}/assignments/${assignmentId}/result/${user.id}`).catch(() => null)
                ]);
                
                setAssignment(detailsRes.data);
                
                if (resultRes && resultRes.data.submission?.status === 'submitted') {
                    setResult(resultRes.data);
                }
            } catch (err) {
                alert('Failed to load assignment');
            }
            setLoading(false);
        };

        if (user?.id) fetchAssignment();
    }, [assignmentId, user?.id]);

    const handleAnswerChange = (questionId, value) => {
        setAnswers({
            ...answers,
            [questionId]: value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (Object.keys(answers).length < assignment.questions.length) {
            if (!window.confirm('You haven\'t answered all questions. Submit anyway?')) {
                return;
            }
        }

        setSubmitting(true);
        try {
            const answerArray = ensureArray(assignment?.questions).map(q => ({
                question_id: q.question_id,
                answer: answers[q.question_id] || ''
            }));

            const res = await axios.post(`${API}/assignments/${assignmentId}/submit`, {
                student_id: user.id,
                answers: answerArray
            });

            setResult({
                submission: {
                    score: res.data.score,
                    max_score: res.data.max_score,
                    status: 'submitted'
                },
                percentage: res.data.percentage,
                answers: res.data.graded_answers
            });

            alert(`Assignment submitted! Score: ${res.data.score}/${res.data.max_score} (${res.data.percentage}%)`);
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to submit assignment');
        }
        setSubmitting(false);
    };

    if (loading) {
        return <div style={{ color: 'var(--primary)', padding: '60px', fontFamily: 'monospace' }}>LOADING ASSIGNMENT...</div>;
    }

    if (result) {
        return (
            <div className="content-area animate-reveal">
                <button onClick={onBack} className="btn" style={{ marginBottom: '20px', padding: '10px 16px' }}>
                    <ArrowLeft size={18} /> BACK TO ASSIGNMENTS
                </button>

                <div className="card" style={{ padding: '40px', textAlign: 'center', marginBottom: '30px' }}>
                    <Award size={60} color="var(--primary)" style={{ marginBottom: '20px' }} />
                    <h1 className="title-xl" style={{ marginBottom: '10px' }}>Assignment Completed!</h1>
                    <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '40px' }}>
                        <div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>YOUR SCORE</p>
                            <p style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary)' }}>
                                {result.submission.score}/{result.submission.max_score}
                            </p>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>PERCENTAGE</p>
                            <p style={{ fontSize: '2.5rem', fontWeight: 900, color: result.percentage >= 70 ? 'var(--primary)' : '#ffaa00' }}>
                                {result.percentage}%
                            </p>
                        </div>
                    </div>
                </div>

                {result.answers && result.answers.length > 0 && (
                    <div className="card" style={{ padding: '32px' }}>
                        <h3 style={{ marginBottom: '24px' }}>Question Review</h3>
                        {ensureArray(result?.answers).map((a, i) => (
                            <div key={i} style={{
                                padding: '20px',
                                marginBottom: '16px',
                                background: a.is_correct ? 'rgba(0,255,159,0.03)' : 'rgba(255,107,107,0.03)',
                                border: `1px solid ${a.is_correct ? 'var(--primary)' : '#ff6b6b'}`,
                                borderRadius: '12px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                            QUESTION {i + 1}
                                        </p>
                                        <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>{a.question_text}</p>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        background: a.is_correct ? 'rgba(0,255,159,0.1)' : 'rgba(255,107,107,0.1)',
                                        color: a.is_correct ? 'var(--primary)' : '#ff6b6b',
                                        fontSize: '0.75rem',
                                        fontWeight: 700
                                    }}>
                                        {a.is_correct ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                        {a.points_earned}/{a.points} pts
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    <p><strong>Your Answer:</strong> {a.student_answer}</p>
                                    {!a.is_correct && (
                                        <p style={{ marginTop: '6px', color: a.is_correct ? 'var(--primary)' : '#ffaa00' }}>
                                            <strong>Correct Answer:</strong> {a.correct_answer}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    const now = new Date();
    const dueDate = new Date(assignment.due_date);
    const isOverdue = now > dueDate;
    const timeRemaining = dueDate - now;
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

    return (
        <div className="content-area animate-reveal">
            <button onClick={onBack} className="btn" style={{ marginBottom: '20px', padding: '10px 16px' }}>
                <ArrowLeft size={18} /> BACK TO ASSIGNMENTS
            </button>

            <div className="card" style={{ padding: '32px', marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            {assignment.class_name?.toUpperCase()}
                        </p>
                        <h1 className="title-xl" style={{ marginBottom: '12px' }}>{assignment.title}</h1>
                        {assignment.description && (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{assignment.description}</p>
                        )}
                    </div>
                    <div style={{
                        padding: '16px 20px',
                        background: isOverdue ? 'rgba(255,107,107,0.1)' : 'rgba(0,255,159,0.05)',
                        border: `1px solid ${isOverdue ? '#ff6b6b' : 'var(--primary)'}`,
                        borderRadius: '12px',
                        textAlign: 'center',
                        minWidth: '180px'
                    }}>
                        <Clock size={20} color={isOverdue ? '#ff6b6b' : 'var(--primary)'} style={{ marginBottom: '8px' }} />
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                            {isOverdue ? 'OVERDUE' : 'TIME REMAINING'}
                        </p>
                        {!isOverdue && (
                            <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
                                {hoursRemaining}h {minutesRemaining}m
                            </p>
                        )}
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Due: {dueDate.toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {ensureArray(assignment?.questions).map((q, qIndex) => (
                    <div key={q.question_id} className="card" style={{ padding: '32px', marginBottom: '20px' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '12px' }}>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                                    QUESTION {qIndex + 1} OF {assignment.questions.length}
                                </p>
                                <span style={{
                                    padding: '4px 10px',
                                    background: 'rgba(0,255,159,0.1)',
                                    color: 'var(--primary)',
                                    borderRadius: '6px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700
                                }}>
                                    {q.points} {q.points === 1 ? 'PT' : 'PTS'}
                                </span>
                            </div>
                            <p style={{ fontSize: '1.05rem', fontWeight: 600, lineHeight: 1.6 }}>
                                {q.question_text}
                            </p>
                        </div>

                        {q.question_type === 'multiple_choice' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {ensureArray(q?.options).map((opt, optIndex) => (
                                    <label key={optIndex} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '16px 20px',
                                        background: answers[q.question_id] === opt 
                                            ? 'rgba(0,255,159,0.08)' 
                                            : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${answers[q.question_id] === opt 
                                            ? 'var(--primary)' 
                                            : 'var(--glass-border)'}`,
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}>
                                        <input 
                                            type="radio"
                                            name={`question-${q.question_id}`}
                                            value={opt}
                                            checked={answers[q.question_id] === opt}
                                            onChange={(e) => handleAnswerChange(q.question_id, e.target.value)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <span style={{ fontSize: '0.9rem' }}>{opt}</span>
                                    </label>
                                ))}
                            </div>
                        ) : q.question_type === 'numeric' ? (
                            <input 
                                type="number"
                                step="any"
                                className="input"
                                placeholder="Enter your answer"
                                value={answers[q.question_id] || ''}
                                onChange={(e) => handleAnswerChange(q.question_id, e.target.value)}
                                style={{ fontSize: '1rem' }}
                            />
                        ) : (
                            <input 
                                type="text"
                                className="input"
                                placeholder="Enter your answer"
                                value={answers[q.question_id] || ''}
                                onChange={(e) => handleAnswerChange(q.question_id, e.target.value)}
                                style={{ fontSize: '1rem' }}
                            />
                        )}
                    </div>
                ))}

                <div className="card" style={{ 
                    padding: '32px', 
                    background: 'rgba(0,255,159,0.03)',
                    border: '1px solid var(--primary)' 
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                Questions Answered: {Object.keys(answers).length} / {assignment.questions.length}
                            </p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Make sure to review your answers before submitting
                            </p>
                        </div>
                        <button 
                            type="submit"
                            className="btn"
                            disabled={submitting}
                            style={{ 
                                background: 'var(--primary)', 
                                color: 'black',
                                border: 'none',
                                padding: '14px 28px',
                                fontSize: '1rem'
                            }}
                        >
                            <Send size={18} /> {submitting ? 'SUBMITTING...' : 'SUBMIT ASSIGNMENT'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default React.memo(AssignmentTaker);
