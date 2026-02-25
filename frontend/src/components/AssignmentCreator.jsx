import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Card, Button, Input } from './shared/UIComponents';
import { api } from '../utils/api';

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
            api.classes.getByMentor(user.id).then(res => setClasses(res || [])).catch(console.error);
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

    const removeQuestion = (index) => setQuestions(questions.filter((_, i) => i !== index));

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
            return alert('Please fill class, title, and due date');
        }
        if (questions.some(q => !q.question_text || !q.correct_answer)) {
            return alert('All questions must have text and correct answer');
        }

        setPublishing(true);
        try {
            await api.assignments.create({
                mentor_id: user.id,
                ...formData,
                questions: questions.map(q => ({
                    ...q,
                    options: q.question_type === 'multiple_choice' ? q.options.filter(o => o.trim()) : null
                }))
            });
            alert('Assignment published!');
            onBack();
        } catch (err) {
            alert(err.message || 'Failed to publish');
        }
        setPublishing(false);
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>
            <Button onClick={onBack} style={{ marginBottom: '20px' }}>
                <ArrowLeft size={18} /> Back
            </Button>

            <h1 style={{ fontSize: '2rem', margin: '0 0 24px' }}>Create Assignment</h1>

            <form onSubmit={handlePublish}>
                <Card style={{ marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 16px' }}>Assignment Details</h3>
                    <div style={{ display: 'grid', gap: '16px' }}>
                        <div>
                            <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>Class *</label>
                            <select 
                                className="input"
                                value={formData.class_id}
                                onChange={e => setFormData({ ...formData, class_id: e.target.value })}
                                required
                                disabled={!!preSelectedClassId}
                            >
                                <option value="">Select a class...</option>
                                {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.name}</option>)}
                            </select>
                        </div>
                        <Input 
                            label="Title *" 
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Arrays and Linked Lists Quiz"
                            required
                        />
                        <div>
                            <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>Description</label>
                            <textarea
                                className="input"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Enter assignment description..."
                                rows={3}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>Due Date *</label>
                                <input
                                    type="datetime-local"
                                    className="input"
                                    value={formData.due_date}
                                    onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>Active From</label>
                                <input
                                    type="datetime-local"
                                    className="input"
                                    value={formData.active_from}
                                    onChange={e => setFormData({ ...formData, active_from: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>Active Until</label>
                                <input
                                    type="datetime-local"
                                    className="input"
                                    value={formData.active_until}
                                    onChange={e => setFormData({ ...formData, active_until: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Questions */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0 }}>Questions ({questions.length})</h3>
                        <Button type="button" onClick={addQuestion} icon={<Plus size={16} />}>Add Question</Button>
                    </div>

                    {questions.map((q, qIdx) => (
                        <Card key={qIdx} style={{ marginBottom: '16px', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h4 style={{ margin: 0 }}>Question {qIdx + 1}</h4>
                                {questions.length > 1 && (
                                    <Button type="button" size="small" variant="secondary" onClick={() => removeQuestion(qIdx)} icon={<Trash2 size={14} />}>
                                        Remove
                                    </Button>
                                )}
                            </div>

                            <div style={{ display: 'grid', gap: '16px' }}>
                                <div>
                                    <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>Question Text *</label>
                                    <textarea
                                        className="input"
                                        value={q.question_text}
                                        onChange={e => updateQuestion(qIdx, 'question_text', e.target.value)}
                                        placeholder="Enter the question..."
                                        rows={2}
                                        required
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>Question Type</label>
                                        <select
                                            className="input"
                                            value={q.question_type}
                                            onChange={e => updateQuestion(qIdx, 'question_type', e.target.value)}
                                        >
                                            <option value="multiple_choice">Multiple Choice</option>
                                            <option value="text">Text</option>
                                            <option value="numeric">Numeric</option>
                                        </select>
                                    </div>
                                    <Input
                                        label="Correct Answer *"
                                        value={q.correct_answer}
                                        onChange={e => updateQuestion(qIdx, 'correct_answer', e.target.value)}
                                        placeholder="Answer"
                                        required
                                    />
                                    <Input
                                        label="Points"
                                        type="number"
                                        value={q.points}
                                        onChange={e => updateQuestion(qIdx, 'points', parseInt(e.target.value) || 1)}
                                        min="1"
                                    />
                                </div>

                                {q.question_type === 'multiple_choice' && (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <label style={{ fontSize: '0.875rem', color: '#5f6368' }}>Options</label>
                                            <Button type="button" size="small" onClick={() => addOption(qIdx)} icon={<Plus size={14} />}>Add</Button>
                                        </div>
                                        <div style={{ display: 'grid', gap: '8px' }}>
                                            {q.options.map((opt, optIdx) => (
                                                <div key={optIdx} style={{ display: 'flex', gap: '8px' }}>
                                                    <input
                                                        className="input"
                                                        value={opt}
                                                        onChange={e => updateOption(qIdx, optIdx, e.target.value)}
                                                        placeholder={`Option ${optIdx + 1}`}
                                                    />
                                                    {q.options.length > 2 && (
                                                        <Button type="button" size="small" variant="secondary" onClick={() => removeOption(qIdx, optIdx)} icon={<Trash2 size={14} />} />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <Button type="button" variant="secondary" onClick={onBack}>Cancel</Button>
                    <Button type="submit" disabled={publishing}>
                        {publishing ? 'Publishing...' : 'Publish Assignment'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default AssignmentCreator;
