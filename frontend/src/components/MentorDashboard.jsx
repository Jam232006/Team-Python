import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
    User, ShieldAlert, Search, ChevronRight, ChevronDown,
    Bell, CheckCircle, BookOpen, Layers, AlertTriangle, UserPlus, Mail, FileText, Plus, FolderPlus
} from 'lucide-react';
import AssignmentCreator from './AssignmentCreator';
import AssignmentResults from './AssignmentResults';
import ClassView from './ClassView';
import StudentProfile from './StudentProfile';

const API = 'http://localhost:5000/api';

const MentorDashboard = () => {
    const [students, setStudents]       = useState([]);
    const [alerts, setAlerts]           = useState([]);
    const [classes, setClasses]         = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [searchTerm, setSearchTerm]   = useState('');
    const [loading, setLoading]         = useState(true);
    const [expandedId, setExpandedId]   = useState(null);
    const [studentLogs, setStudentLogs] = useState({});
    const [resolving, setResolving]     = useState(null);
    const [showInvite, setShowInvite]   = useState(false);
    const [inviteForm, setInviteForm]   = useState({ class_id: '', identifier: '' });
    const [sortBy, setSortBy]           = useState('score');
    const [sortOrder, setSortOrder]     = useState('desc');
    const [view, setView]               = useState('dashboard');
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showCreateClass, setShowCreateClass] = useState(false);
    const [classForm, setClassForm]     = useState({ name: '', description: '' });
    const [creating, setCreating]       = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [sRes, aRes, cRes, asRes] = await Promise.all([
                    axios.get(`${API}/risk/students?mentorId=${user.id}&sort=${sortBy}&order=${sortOrder}`).catch(() => ({ data: [] })),
                    axios.get(`${API}/alerts/for/mentor/${user.id}`).catch(() => ({ data: [] })),
                    axios.get(`${API}/classes/mentor/${user.id}`).catch(() => ({ data: [] })),
                    axios.get(`${API}/assignments/mentor/${user.id}`).catch(() => ({ data: [] }))
                ]);
                setStudents(Array.isArray(sRes.data) ? sRes.data : []);
                setAlerts(Array.isArray(aRes.data) ? aRes.data : []);
                setClasses(Array.isArray(cRes.data) ? cRes.data : []);
                setAssignments(Array.isArray(asRes.data) ? asRes.data : []);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        if (user?.id) fetchAll();
    }, [user?.id, sortBy, sortOrder]);

    const toggleDetails = async (studentId) => {
        if (expandedId === studentId) { setExpandedId(null); return; }
        setExpandedId(studentId);
        if (!studentLogs[studentId]) {
            try {
                const res = await axios.get(`${API}/activity/${studentId}`);
                setStudentLogs(prev => ({ ...prev, [studentId]: Array.isArray(res.data) ? res.data : [] }));
            } catch {
                setStudentLogs(prev => ({ ...prev, [studentId]: [] }));
            }
        }
    };

    const resolveAlert = async (alertId) => {
        setResolving(alertId);
        try {
            await axios.patch(`${API}/alerts/${alertId}/resolve`);
            setAlerts(prev => prev.filter(a => a.alert_id !== alertId));
        } catch (e) { console.error(e); }
        setResolving(null);
    };

    const handleSendInvite = async (e) => {
        e.preventDefault();
        if (!inviteForm.class_id || !inviteForm.identifier) {
            alert('Please fill all fields');
            return;
        }
        try {
            const res = await axios.post(`${API}/invites/send`, {
                mentor_id: user.id,
                class_id: inviteForm.class_id,
                identifier: inviteForm.identifier
            });
            alert(res.data.message);
            setInviteForm({ class_id: '', identifier: '' });
            setShowInvite(false);
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to send invite');
        }
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();
        if (!classForm.name) {
            alert('Class name is required');
            return;
        }
        setCreating(true);
        try {
            const res = await axios.post(`${API}/classes`, {
                mentor_id: user.id,
                name: classForm.name,
                description: classForm.description
            });
            alert(`Class created! Invite code: ${res.data.invite_code}`);
            // Refresh classes list
            const cRes = await axios.get(`${API}/classes/mentor/${user.id}`);
            setClasses(Array.isArray(cRes.data) ? cRes.data : []);
            setClassForm({ name: '', description: '' });
            setShowCreateClass(false);
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to create class');
        }
        setCreating(false);
    };

    const filteredStudents = students.filter(s =>
        s?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const openAlerts  = alerts.filter(a => !a.resolved_status);
    const riskAlerts  = openAlerts.filter(a => a.alert_type === 'risk_change');

    if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>Loading...</div>;

    if (view === 'student-profile' && selectedStudent) {
        return <StudentProfile studentId={selectedStudent} onBack={() => { setView('dashboard'); setSelectedStudent(null); }} />;
    }

    if (view === 'create-assignment') {
        return <AssignmentCreator onBack={() => setView('dashboard')} />;
    }

    if (view === 'view-results' && selectedAssignment) {
        return <AssignmentResults assignmentId={selectedAssignment} onBack={() => { setView('dashboard'); setSelectedAssignment(null); }} />;
    }

    if (view === 'class-view' && selectedClass) {
        return <ClassView classId={selectedClass} onBack={() => { setView('dashboard'); setSelectedClass(null); }} userRole="mentor" userId={user.id} />;
    }

    return (
        <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ 
                background: 'white', 
                padding: '32px', 
                borderRadius: '16px', 
                marginBottom: '32px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}>
                <div style={{ marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '2rem', margin: '0 0 8px 0', color: '#202124' }}>Mentor Dashboard</h1>
                    <p style={{ color: '#5f6368', fontSize: '1rem', margin: 0 }}>
                        {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
                        {riskAlerts.length > 0 && (
                            <span style={{ marginLeft: '12px', color: 'var(--accent)', fontWeight: 600 }}>
                                · {riskAlerts.length} alert{riskAlerts.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => setView('create-assignment')} className="btn">
                        <Plus size={18} /> Create Assignment
                    </button>
                    <button onClick={() => setShowCreateClass(!showCreateClass)} className="btn">
                        <FolderPlus size={18} /> Create Class
                    </button>
                    <button onClick={() => setShowInvite(!showInvite)} className="btn">
                        <UserPlus size={18} /> Invite Student
                    </button>
                    <div style={{ position: 'relative', flex: '1', minWidth: '250px', maxWidth: '400px' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '12px', color: '#5f6368' }} size={18} />
                        <input 
                            type="text" 
                            className="input" 
                            placeholder="Search students..."
                            style={{ paddingLeft: '40px', width: '100%' }}
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                        />
                    </div>
                </div>
            </div>

            {/* Create Class Form */}
            {showCreateClass && (
                <div className="card" style={{ marginBottom: '32px' }}>
                    <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#202124' }}>
                        <FolderPlus size={18} color="var(--primary)" /> Create New Class
                    </h3>
                    <form onSubmit={handleCreateClass} style={{ display: 'grid', gap: '16px' }}>
                        <div>
                            <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>Class Name *</label>
                            <input 
                                type="text"
                                className="input" 
                                placeholder="e.g., Data Structures Spring 2026"
                                value={classForm.name} 
                                onChange={e => setClassForm({ ...classForm, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>Description</label>
                            <textarea 
                                className="input" 
                                placeholder="Enter class description..."
                                rows={3}
                                value={classForm.description}
                                onChange={e => setClassForm({ ...classForm, description: e.target.value })}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" className="btn" disabled={creating}>
                                {creating ? 'Creating...' : 'Create Class'}
                            </button>
                            <button type="button" className="btn-secondary" onClick={() => { setShowCreateClass(false); setClassForm({ name: '', description: '' }); }}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Invite Form */}
            {showInvite && (
                <div className="card" style={{ marginBottom: '32px' }}>
                    <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#202124' }}>
                        <Mail size={18} color="var(--primary)" /> Send Invitation
                    </h3>
                    <form onSubmit={handleSendInvite} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '16px', alignItems: 'end' }}>
                        <div>
                            <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>Class</label>
                            <select 
                                className="input" 
                                value={inviteForm.class_id} 
                                onChange={e => setInviteForm({ ...inviteForm, class_id: e.target.value })}
                                required
                            >
                                <option value="">Select class...</option>
                                {classes.map(c => (
                                    <option key={c.class_id} value={c.class_id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>
                                Student Email or Username
                            </label>
                            <input 
                                type="text" 
                                className="input" 
                                placeholder="student@example.com"
                                value={inviteForm.identifier}
                                onChange={e => setInviteForm({ ...inviteForm, identifier: e.target.value })}
                                required
                            />
                        </div>
                        <button type="submit" className="btn">Send</button>
                    </form>
                </div>
            )}

            {/* Classes Grid */}
            {classes.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '1.125rem', margin: '0 0 16px 0', color: '#202124' }}>Your Classes</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                        {classes.map(cls => (
                            <div 
                                key={cls.class_id}
                                onClick={() => { setSelectedClass(cls.class_id); setView('class-view'); }}
                                className="card"
                                style={{ 
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    minHeight: '200px',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'}
                                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'}
                            >
                                <div style={{
                                    background: 'linear-gradient(135deg, #1a73e8 0%, #4285f4 100%)',
                                    height: '80px',
                                    marginBottom: '16px',
                                    borderRadius: '12px 12px 0 0',
                                    margin: '-24px -24px 16px -24px',
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    padding: '16px 24px',
                                    color: 'white'
                                }}>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>{cls.name}</h3>
                                </div>
                                <div style={{ padding: '0 0 16px 0' }}>
                                    <p style={{ color: '#5f6368', fontSize: '0.875rem', marginBottom: '12px' }}>
                                        {cls.description || 'No description'}
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#5f6368', fontSize: '0.813rem' }}>
                                        <span>{cls.member_count || 0} student{cls.member_count !== 1 ? 's' : ''}</span>
                                        <span style={{ 
                                            background: '#e8f0fe', 
                                            color: 'var(--primary)', 
                                            padding: '4px 12px', 
                                            borderRadius: '12px',
                                            fontWeight: 600,
                                            fontSize: '0.75rem'
                                        }}>
                                            {cls.invite_code}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Student Table */}
            <div className="card" style={{ padding: '0', marginBottom: '32px' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.125rem', margin: 0, color: '#202124' }}>Students</h3>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.875rem', color: '#5f6368' }}>Sort by:</label>
                        <select 
                            className="input" 
                            style={{ width: '140px', padding: '8px 12px' }}
                            value={sortBy} 
                            onChange={e => setSortBy(e.target.value)}
                        >
                            <option value="score">Risk Score</option>
                            <option value="level">Risk Level</option>
                            <option value="name">Name</option>
                        </select>
                        <select 
                            className="input" 
                            style={{ width: '100px', padding: '8px 12px' }}
                            value={sortOrder} 
                            onChange={e => setSortOrder(e.target.value)}
                        >
                            <option value="desc">High to Low</option>
                            <option value="asc">Low to High</option>
                        </select>
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f8f9fa' }}>
                            <tr>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#5f6368' }}>Student</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#5f6368' }}>Risk Score</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#5f6368' }}>Status</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#5f6368' }}>Streak</th>
                                <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: '#5f6368' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map(student => (
                                <React.Fragment key={student.user_id}>
                                    <tr style={{ borderBottom: expandedId === student.user_id ? 'none' : '1px solid #e8eaed' }}>
                                        <td 
                                            onClick={() => { setSelectedStudent(student.user_id); setView('student-profile'); }}
                                            style={{ 
                                                padding: '16px 24px', 
                                                cursor: 'pointer',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <User size={16} color="#5f6368" />
                                                <div>
                                                    <p style={{ 
                                                        fontWeight: 600, 
                                                        margin: 0, 
                                                        color: 'var(--primary)',
                                                        textDecoration: 'none'
                                                    }}>{student.name}</p>
                                                    <p style={{ fontSize: '0.875rem', color: '#5f6368', margin: '2px 0 0 0' }}>{student.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 24px', fontWeight: 600, fontSize: '1.125rem', color: '#202124' }}>
                                            {student.risk_score ?? 0}
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <span className={`badge badge-${(student.risk_level || 'Low').toLowerCase()}`}>
                                                {student.risk_level || 'Low'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <span style={{ 
                                                fontWeight: 600, 
                                                color: (student.current_streak || 0) >= 5 ? 'var(--primary)' : '#5f6368'
                                            }}>
                                                {student.current_streak || 0} 🔥
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                            <button 
                                                className="btn-secondary" 
                                                style={{ padding: '6px 14px', fontSize: '0.875rem' }}
                                                onClick={() => toggleDetails(student.user_id)}
                                            >
                                                Details {expandedId === student.user_id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            </button>
                                        </td>
                                    </tr>

                                    {expandedId === student.user_id && (
                                        <tr>
                                            <td colSpan={5} style={{
                                                padding: '0 24px 16px',
                                                background: '#f8f9fa',
                                                borderBottom: '1px solid #e8eaed'
                                            }}>
                                                <div style={{ paddingTop: '16px' }}>
                                                    <p style={{ fontSize: '0.875rem', color: '#5f6368', fontWeight: 600, marginBottom: '12px' }}>
                                                        Recent Activity — {student.name}
                                                    </p>
                                                    {!studentLogs[student.user_id] ? (
                                                        <p style={{ color: '#5f6368', fontSize: '0.875rem' }}>Loading...</p>
                                                    ) : studentLogs[student.user_id].length === 0 ? (
                                                        <p style={{ color: '#5f6368', fontSize: '0.875rem' }}>No activity recorded.</p>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            {studentLogs[student.user_id].slice(0, 5).map((log, i) => (
                                                                <div key={i} style={{
                                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                    padding: '12px 16px', background: 'white',
                                                                    borderRadius: '12px', border: '1px solid #e8eaed'
                                                                }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                        {log.activity_type === 'assignment'
                                                                            ? <BookOpen size={14} color="var(--primary)" />
                                                                            : <Layers size={14} color="var(--primary)" />}
                                                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#202124' }}>
                                                                            {log.title || log.activity_type}
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                                                        <span style={{ fontSize: '0.875rem', color: '#5f6368' }}>
                                                                            {new Date(log.submission_date).toLocaleDateString()}
                                                                        </span>
                                                                        {log.status === 'submitted'
                                                                            ? <CheckCircle size={14} color="var(--secondary)" />
                                                                            : <AlertTriangle size={14} color="var(--accent)" />}
                                                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#202124' }}>
                                                                            {log.status}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Assignments */}
            {assignments.length > 0 && (
                <div className="card" style={{ marginBottom: '32px' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <FileText size={20} color="var(--primary)" />
                        <h3 style={{ fontSize: '1.125rem', margin: 0, color: '#202124' }}>Recent Assignments</h3>
                    </div>
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {assignments.slice(0, 5).map(assignment => (
                            <div key={assignment.assignment_id} style={{
                                padding: '16px 20px', 
                                borderRadius: '12px',
                                background: '#f8f9fa',
                                border: '1px solid #e8eaed',
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '0.938rem', fontWeight: 600, marginBottom: '6px', color: '#202124' }}>
                                        {assignment.title}
                                    </p>
                                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.875rem', color: '#5f6368' }}>
                                        <span>{assignment.class_name}</span>
                                        <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ fontSize: '0.75rem', color: '#5f6368', margin: '0 0 4px 0' }}>Submitted</p>
                                        <p style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--primary)', margin: 0 }}>
                                            {assignment.submitted_count || 0}/{assignment.total_students || 0}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => { setSelectedAssignment(assignment.assignment_id); setView('view-results'); }}
                                        className="btn-secondary" 
                                        style={{ padding: '8px 16px', fontSize: '0.875rem' }}
                                    >
                                        View Results
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Alerts */}
            <div className="card">
                <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Bell size={20} color={openAlerts.length > 0 ? 'var(--accent)' : '#5f6368'} />
                    <h3 style={{ fontSize: '1.125rem', margin: 0, color: '#202124' }}>Alerts</h3>
                    {openAlerts.length > 0 && (
                        <span style={{
                            background: 'var(--accent)', 
                            color: 'white',
                            borderRadius: '999px', 
                            padding: '2px 10px',
                            fontSize: '0.75rem', 
                            fontWeight: 600
                        }}>{openAlerts.length}</span>
                    )}
                </div>
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {alerts.length === 0 ? (
                        <p style={{ color: '#5f6368', fontSize: '0.875rem', margin: 0 }}>No alerts</p>
                    ) : alerts.map(alert => {
                        const getAlertColor = (type) => {
                            if (type === 'risk_change') return 'var(--accent)';
                            if (type === 'assignment_date_passed') return 'var(--warning)';
                            if (type === 'invite_accepted') return 'var(--secondary)';
                            return 'var(--primary)';
                        };
                        
                        return (
                            <div key={alert.alert_id} style={{
                                padding: '16px 20px', 
                                borderRadius: '12px',
                                background: alert.resolved_status ? '#f8f9fa' : 'white',
                                border: `1px solid ${alert.resolved_status ? '#e8eaed' : getAlertColor(alert.alert_type) + '33'}`,
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                opacity: alert.resolved_status ? 0.6 : 1
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                                    <ShieldAlert size={18} color={getAlertColor(alert.alert_type)} style={{ flexShrink: 0 }} />
                                    <div>
                                        {alert.student_name && (
                                            <p style={{ fontSize: '0.75rem', color: '#5f6368', fontWeight: 600, margin: '0 0 4px 0' }}>
                                                {alert.student_name} · {alert.alert_category || 'Alert'}
                                            </p>
                                        )}
                                        <p style={{ fontSize: '0.875rem', fontWeight: 500, margin: '0 0 4px 0', color: '#202124' }}>
                                            {alert.alert_message}
                                        </p>
                                        <p style={{ fontSize: '0.75rem', color: '#5f6368', margin: 0 }}>
                                            {new Date(alert.alert_date).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                {!alert.resolved_status && (
                                    <button 
                                        onClick={() => resolveAlert(alert.alert_id)} 
                                        disabled={resolving === alert.alert_id}
                                        className="btn-secondary"
                                        style={{ padding: '6px 14px', fontSize: '0.875rem', flexShrink: 0, marginLeft: '16px' }}
                                    >
                                        {resolving === alert.alert_id ? '...' : 'Resolve'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default React.memo(MentorDashboard);
