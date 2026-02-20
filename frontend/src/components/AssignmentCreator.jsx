import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
    Plus, Trash2, Save, Send, ListOrdered, 
    Type, Hash, CheckSquare, ArrowLeft, Settings 
} from 'lucide-react';

const API = 'http://localhost:5000/api';

const AssignmentCreator = ({ onBack, preSelectedClassId }) => {
    const { user } = useAuth();
    const [classes, setClasses] = useState([]);
    const [formData, setFormData] = useState({
        class_id: preSelectedClassId || '',
        title: '',
        description: '',
        due_date: '',
        active_from: '',
        active_until: ''
    });
    const [questions, setQuestions] = useState([{
        question_text: '',
        question_type: 'multiple_choice',
        correct_answer: '',
        options: ['', '', '', ''],
        points: 1
    }]);
    const [publishing, setPublishing] = useState(false);

    useEffect(() => {
        if (user?.id) {
            axios.get(`${API}/classes/mentor/${user.id}`)
                .then(res => setClasses(res.data))
                .catch(console.error);
        }
        if (preSelectedClassId) {
            setFormData(prev => ({ ...prev, class_id: preSelectedClassId }));
        }
    }, [user?.id, preSelectedClassId]);

    const addQuestion = () => {
        setQuestions([...questions, {
            question_text: '',
            question_type: 'multiple_choice',
            correct_answer: '',
            options: ['', '', '', ''],
            points: 1
        }]);
    };

    const removeQuestion = (index) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const updateQuestion = (index, field, value) => {
        const updated = [...questions];
        updated[index][field] = value;
        setQuestions(updated);
    };

    const updateOption = (qIndex, optIndex, value) => {
        const updated = [...questions];
        updated[qIndex].options[optIndex] = value;
        setQuestions(updated);
    };

    const addOption = (qIndex) => {
        const updated = [...questions];
        updated[qIndex].options.push('');
        setQuestions(updated);
    };

    const removeOption = (qIndex, optIndex) => {
        const updated = [...questions];
        updated[qIndex].options = updated[qIndex].options.filter((_, i) => i !== optIndex);
        setQuestions(updated);
    };

    const handlePublish = async (e) => {
        e.preventDefault();
        
        if (!formData.class_id || !formData.title || !formData.due_date) {
            alert('Please fill in all required fields');
            return;
        }

        if (questions.length === 0) {
            alert('Please add at least one question');
            return;
        }

        // Validate questions
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.question_text.trim()) {
                alert(`Question ${i + 1} text is required`);
                return;
            }
            if (!q.correct_answer.trim()) {
                alert(`Question ${i + 1} correct answer is required`);
                return;
            }
            if (q.question_type === 'multiple_choice' && q.options.filter(o => o.trim()).length < 2) {
                alert(`Question ${i + 1} needs at least 2 options`);
                return;
            }
        }

        setPublishing(true);
        try {
            const res = await axios.post(`${API}/assignments/create`, {
                mentor_id: user.id,
                ...formData,
                questions: questions.map(q => ({
                    ...q,
                    options: q.question_type === 'multiple_choice' 
                        ? q.options.filter(o => o.trim()) 
                        : null
                }))
            });
            alert(res.data.message);
            if (onBack) onBack();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to publish assignment');
        }
        setPublishing(false);
    };

    const totalPoints = questions.reduce((sum, q) => sum + (parseInt(q.points) || 1), 0);

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px' }}>
                <button onClick={onBack} className="btn-secondary" style={{ marginBottom: '20px' }}>
                    <ArrowLeft size={18} /> Back
                </button>
                <h1 style={{ fontSize: '2rem', margin: '0 0 8px 0', color: '#202124' }}>Create Assignment</h1>
                <p style={{ color: '#5f6368', fontSize: '1rem', margin: 0 }}>
                    Build an auto-graded assignment with multiple question types
                </p>
            </div>

            <form onSubmit={handlePublish}>
                {/* Assignment Details */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#202124', fontSize: '1.125rem' }}>
                        <ListOrdered size={18} color="var(--primary)" /> Assignment Details
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>
                                Class *
                            </label>
                            <select 
                                className="input"
                                value={formData.class_id}
                                onChange={e => setFormData({...formData, class_id: e.target.value})}
                                required
                            >
                                <option value="">Choose Class...</option>
                                {classes.map(c => (
                                    <option key={c.class_id} value={c.class_id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>
                                Title *
                            </label>
                            <input 
                                type="text"
                                className="input"
                                placeholder="e.g., Week 5 Quiz - Data Structures"
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                required
                            />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>
                                Description
                            </label>
                            <textarea 
                                className="input"
                                placeholder="Instructions, notes, or additional context..."
                                rows={3}
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>
                                Due Date & Time *
                            </label>
                            <input 
                                type="datetime-local"
                                className="input"
                                value={formData.due_date}
                                onChange={e => setFormData({...formData, due_date: e.target.value})}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>
                                Total Points
                            </label>
                            <input 
                                type="text"
                                className="input"
                                value={totalPoints}
                                disabled
                                style={{ background: '#f8f9fa', color: 'var(--primary)', fontWeight: 600 }}
                            />
                        </div>
                    </div>
                </div>

                {/* Time Configuration */}
                <div className="card" style={{ marginBottom: '24px', background: '#e8f0fe', border: '2px solid var(--primary)' }}>
                    <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: '#202124', fontSize: '1.125rem' }}>
                        <Settings size={18} color="var(--primary)" /> Time Configuration
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: '#5f6368', marginBottom: '20px' }}>
                        Set when students can access and submit this assignment. Leave blank for no restrictions.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                        <div>
                            <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>
                                Available From
                            </label>
                            <input 
                                type="datetime-local"
                                className="input"
                                value={formData.active_from}
                                onChange={e => setFormData({...formData, active_from: e.target.value})}
                                style={{ background: 'white' }}
                            />
                            <p style={{ fontSize: '0.75rem', color: '#5f6368', marginTop: '4px' }}>
                                Students can't see assignment before this time
                            </p>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>
                                Available Until
                            </label>
                            <input 
                                type="datetime-local"
                                className="input"
                                value={formData.active_until}
                                onChange={e => setFormData({...formData, active_until: e.target.value})}
                                style={{ background: 'white' }}
                            />
                            <p style={{ fontSize: '0.75rem', color: '#5f6368', marginTop: '4px' }}>
                                Students can't submit after this time
                            </p>
                        </div>
                    </div>
                </div>

                {/* Questions */}
                {questions.map((q, qIndex) => (
                    <div key={qIndex} className="card" style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '1.125rem', margin: 0, color: '#202124' }}>Question {qIndex + 1}</h3>
                            {questions.length > 1 && (
                                <button 
                                    type="button"
                                    onClick={() => removeQuestion(qIndex)}
                                    className="btn-secondary"
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: '0.875rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Trash2 size={14} /> Remove
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'grid', gap: '20px' }}>
                            <div>
                                <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>
                                    Question *
                                </label>
                                <textarea 
                                    className="input"
                                    placeholder="Enter your question..."
                                    rows={2}
                                    value={q.question_text}
                                    onChange={e => updateQuestion(qIndex, 'question_text', e.target.value)}
                                    required
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>
                                        Type *
                                    </label>
                                    <select 
                                        className="input"
                                        value={q.question_type}
                                        onChange={e => updateQuestion(qIndex, 'question_type', e.target.value)}
                                    >
                                        <option value="multiple_choice">Multiple Choice</option>
                                        <option value="text">Text Answer</option>
                                        <option value="numeric">Numeric Answer</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>
                                        Points *
                                    </label>
                                    <input 
                                        type="number"
                                        className="input"
                                        min="1"
                                        value={q.points}
                                        onChange={e => updateQuestion(qIndex, 'points', e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {q.question_type === 'multiple_choice' ? (
                                <div>
                                    <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '12px' }}>
                                        Options (Click option to set as correct answer)
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {q.options.map((opt, optIndex) => (
                                            <div key={optIndex} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                <input 
                                                    type="radio"
                                                    name={`correct-${qIndex}`}
                                                    checked={q.correct_answer === opt}
                                                    onChange={() => updateQuestion(qIndex, 'correct_answer', opt)}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                                <input 
                                                    type="text"
                                                    className="input"
                                                    placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                                    value={opt}
                                                    onChange={e => updateOption(qIndex, optIndex, e.target.value)}
                                                    style={{ flex: 1 }}
                                                />
                                                {q.options.length > 2 && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => removeOption(qIndex, optIndex)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: '1px solid var(--glass-border)',
                                                            color: 'var(--text-muted)',
                                                            padding: '8px',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button 
                                            type="button"
                                            onClick={() => addOption(qIndex)}
                                            style={{
                                                background: 'rgba(0,255,159,0.05)',
                                                border: '1px dashed var(--primary)',
                                                color: 'var(--primary)',
                                                padding: '10px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                                fontWeight: 600
                                            }}
                                        >
                                            + Add Option
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>
                                        Correct Answer *
                                    </label>
                                    <input 
                                        type={q.question_type === 'numeric' ? 'number' : 'text'}
                                        step={q.question_type === 'numeric' ? 'any' : undefined}
                                        className="input"
                                        placeholder={q.question_type === 'numeric' ? 'e.g., 42' : 'Enter the correct answer'}
                                        value={q.correct_answer}
                                        onChange={e => updateQuestion(qIndex, 'correct_answer', e.target.value)}
                                        required
                                    />
                                    {q.question_type === 'text' && (
                                        <p style={{ fontSize: '0.875rem', color: '#5f6368', marginTop: '6px' }}>
                                            Note: Text answers are case-insensitive
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                    <button 
                        type="button"
                        onClick={addQuestion}
                        className="btn-secondary"
                        style={{ flex: 1 }}
                    >
                        <Plus size={18} /> Add Question
                    </button>
                    <button 
                        type="submit"
                        className="btn"
                        disabled={publishing}
                        style={{ flex: 1 }}
                    >
                        <Send size={18} /> {publishing ? 'Publishing...' : 'Publish Assignment'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default React.memo(AssignmentCreator);
