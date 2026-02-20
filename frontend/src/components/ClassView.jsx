import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
    ArrowLeft, Users, FileText, Copy, CheckCircle, 
    Calendar, BookOpen, Award, TrendingUp, Plus
} from 'lucide-react';
import AssignmentTaker from './AssignmentTaker';
import AssignmentCreator from './AssignmentCreator';
import StudentProfile from './StudentProfile';

const API = 'http://localhost:5000/api';

const ClassView = ({ classId, onBack, userRole = 'mentor', userId }) => {
    const [classData, setClassData] = useState(null);
    const [members, setMembers] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(userRole === 'student' ? 'assignments' : 'stream');
    const [inviteCode, setInviteCode] = useState('');
    const [copied, setCopied] = useState(false);
    const [view, setView] = useState('class'); // 'class', 'take-assignment', 'create-assignment', 'student-profile'
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                let classRes, membersRes, assignmentsRes, inviteRes;
                
                if (userRole === 'mentor') {
                    [classRes, membersRes, assignmentsRes, inviteRes] = await Promise.all([
                        axios.get(`${API}/classes/mentor/${userId}`).catch(() => ({ data: [] })),
                        axios.get(`${API}/classes/${classId}/members`).catch(() => ({ data: [] })),
                        axios.get(`${API}/assignments/class/${classId}`).catch(() => ({ data: [] })),
                        axios.get(`${API}/classes/${classId}/invite`).catch(() => ({ data: { invite_code: '' } }))
                    ]);
                    const classes = Array.isArray(classRes.data) ? classRes.data : [];
                    setClassData(classes.find(c => c.class_id === parseInt(classId)));
                    setMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
                    setInviteCode(inviteRes.data.invite_code || '');
                } else {
                    // Student view
                    [classRes, assignmentsRes] = await Promise.all([
                        axios.get(`${API}/classes/${classId}`).catch(() => ({ data: null })),
                        axios.get(`${API}/assignments/class/${classId}`).catch(() => ({ data: [] }))
                    ]);
                    setClassData(classRes.data);
                }
                
                setAssignments(Array.isArray(assignmentsRes.data) ? assignmentsRes.data : []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        if (classId && userId) fetchData();
    }, [classId, userRole, userId]);

    const copyInviteCode = () => {
        navigator.clipboard.writeText(inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>Loading...</div>;
    if (!classData) return <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>Class not found</div>;

    if (view === 'student-profile' && selectedStudent) {
        return <StudentProfile studentId={selectedStudent} onBack={() => { setView('class'); setSelectedStudent(null); }} />;
    }

    if (view === 'take-assignment' && selectedAssignment) {
        return <AssignmentTaker assignmentId={selectedAssignment} onBack={() => { setView('class'); setSelectedAssignment(null); }} />;
    }

    if (view === 'create-assignment') {
        return <AssignmentCreator onBack={() => setView('class')} preSelectedClassId={classId} />;
    }

    return (
        <div style={{ padding: '0', minHeight: '100vh', background: '#f8f9fa' }}>
            {/* Header Banner */}
            <div style={{
                background: 'linear-gradient(135deg, #1a73e8 0%, #4285f4 100%)',
                padding: '24px 40px',
                color: 'white',
                position: 'relative'
            }}>
                <button 
                    onClick={onBack} 
                    className="btn-secondary"
                    style={{ 
                        marginBottom: '16px',
                        background: 'rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: 'white'
                    }}
                >
                    <ArrowLeft size={18} /> Back to Dashboard
                </button>
                <h1 style={{ fontSize: '2.5rem', margin: '0 0 8px 0', fontWeight: 600 }}>{classData.name}</h1>
                <p style={{ fontSize: '1rem', margin: 0, opacity: 0.9 }}>{classData.description || 'No description'}</p>
            </div>

            {/* Navigation Tabs */}
            <div style={{ 
                background: 'white', 
                borderBottom: '1px solid #e8eaed',
                padding: '0 40px'
            }}>
                <div style={{ display: 'flex', gap: '32px' }}>
                    {userRole === 'mentor' && (
                        <>
                            {[
                                { id: 'stream', label: 'Stream', icon: <BookOpen size={18} /> },
                                { id: 'students', label: 'Students', icon: <Users size={18} /> },
                                { id: 'assignments', label: 'Assignments', icon: <FileText size={18} /> }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: '16px 0',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        color: activeTab === tab.id ? 'var(--primary)' : '#5f6368',
                                        fontWeight: activeTab === tab.id ? 600 : 500,
                                        fontSize: '0.938rem',
                                        borderBottom: activeTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </>
                    )}
                    {userRole === 'student' && (
                        <button
                            style={{
                                background: 'none',
                                border: 'none',
                                padding: '16px 0',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: 'var(--primary)',
                                fontWeight: 600,
                                fontSize: '0.938rem',
                                borderBottom: '3px solid var(--primary)'
                            }}
                        >
                            <FileText size={18} /> Assignments
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
                {activeTab === 'stream' && userRole === 'mentor' && (
                    <div>
                        {/* Invite Code Card */}
                        <div className="card" style={{ marginBottom: '24px', background: '#e8f0fe' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.125rem', margin: '0 0 8px 0', color: '#202124' }}>Class Code</h3>
                                    <p style={{ color: '#5f6368', fontSize: '0.875rem', margin: 0 }}>
                                        Share this code with students to join the class
                                    </p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ 
                                        fontSize: '1.5rem', 
                                        fontWeight: 700, 
                                        color: 'var(--primary)',
                                        fontFamily: 'monospace',
                                        letterSpacing: '2px'
                                    }}>
                                        {inviteCode}
                                    </span>
                                    <button 
                                        onClick={copyInviteCode}
                                        className="btn"
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        {copied ? <><CheckCircle size={16} /> Copied!</> : <><Copy size={16} /> Copy</>}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Class Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                            <div className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <p style={{ color: '#5f6368', fontSize: '0.875rem', margin: '0 0 8px 0' }}>Students</p>
                                        <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: '#202124' }}>{members.length}</h2>
                                    </div>
                                    <Users size={24} color="var(--primary)" />
                                </div>
                            </div>
                            <div className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <p style={{ color: '#5f6368', fontSize: '0.875rem', margin: '0 0 8px 0' }}>Assignments</p>
                                        <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: '#202124' }}>{assignments.length}</h2>
                                    </div>
                                    <FileText size={24} color="var(--secondary)" />
                                </div>
                            </div>
                            <div className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <p style={{ color: '#5f6368', fontSize: '0.875rem', margin: '0 0 8px 0' }}>Avg. Performance</p>
                                        <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: '#202124' }}>
                                            {members.length > 0 
                                                ? Math.round(members.reduce((sum, m) => sum + (100 - (m.risk_score || 0) * 10), 0) / members.length)
                                                : '--'}%
                                        </h2>
                                    </div>
                                    <TrendingUp size={24} color="var(--secondary)" />
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="card">
                            <h3 style={{ fontSize: '1.125rem', margin: '0 0 16px 0', color: '#202124' }}>Recent Activity</h3>
                            {assignments.length === 0 ? (
                                <p style={{ color: '#5f6368', fontSize: '0.875rem', textAlign: 'center', padding: '40px' }}>
                                    No assignments yet. Create one to get started!
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {assignments.slice(0, 3).map(assignment => (
                                        <div key={assignment.assignment_id} style={{
                                            padding: '16px',
                                            background: '#f8f9fa',
                                            borderRadius: '12px',
                                            border: '1px solid #e8eaed'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <h4 style={{ fontSize: '0.938rem', fontWeight: 600, margin: '0 0 4px 0', color: '#202124' }}>
                                                        {assignment.title}
                                                    </h4>
                                                    <p style={{ fontSize: '0.813rem', color: '#5f6368', margin: 0 }}>
                                                        Due: {new Date(assignment.due_date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <span className="badge badge-low">
                                                    {assignment.submitted_count || 0}/{assignment.total_students || 0} submitted
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'students' && userRole === 'mentor' && (
                    <div className="card" style={{ padding: '0' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed' }}>
                            <h3 style={{ fontSize: '1.125rem', margin: 0, color: '#202124' }}>
                                Students ({members.length})
                            </h3>
                        </div>
                        {members.length === 0 ? (
                            <div style={{ padding: '60px', textAlign: 'center' }}>
                                <Users size={48} color="#dadce0" style={{ marginBottom: '16px' }} />
                                <h4 style={{ color: '#5f6368', fontSize: '1rem', fontWeight: 500 }}>No students yet</h4>
                                <p style={{ color: '#5f6368', fontSize: '0.875rem' }}>
                                    Invite students using the class code: <strong>{inviteCode}</strong>
                                </p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: '#f8f9fa' }}>
                                        <tr>
                                            <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#5f6368' }}>Student</th>
                                            <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#5f6368' }}>Risk Level</th>
                                            <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#5f6368' }}>Risk Score</th>
                                            <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#5f6368' }}>Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {members.map(member => (
                                            <tr 
                                                key={member.user_id} 
                                                onClick={() => {
                                                    setSelectedStudent(member.user_id);
                                                    setView('student-profile');
                                                }}
                                                style={{ 
                                                    borderBottom: '1px solid #e8eaed',
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <td style={{ padding: '16px 24px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            borderRadius: '50%',
                                                            background: 'var(--primary)',
                                                            color: 'white',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 600,
                                                            fontSize: '1rem'
                                                        }}>
                                                            {member.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p style={{ fontWeight: 600, margin: 0, color: '#202124' }}>{member.name}</p>
                                                            <p style={{ fontSize: '0.875rem', color: '#5f6368', margin: '2px 0 0 0' }}>{member.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px 24px' }}>
                                                    <span className={`badge badge-${(member.risk_level || 'low').toLowerCase()}`}>
                                                        {member.risk_level || 'Low'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px 24px', fontWeight: 600, fontSize: '1.125rem', color: '#202124' }}>
                                                    {member.risk_score ?? 0}
                                                </td>
                                                <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#5f6368' }}>
                                                    {new Date(member.joined_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'assignments' || userRole === 'student' ? (
                    <div className="card">
                        <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.125rem', margin: 0, color: '#202124' }}>
                                Assignments ({assignments.length})
                            </h3>
                            {userRole === 'mentor' && (
                                <button 
                                    className="btn"
                                    onClick={() => setView('create-assignment')}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <Plus size={18} /> Create Assignment
                                </button>
                            )}
                        </div>
                        {assignments.length === 0 ? (
                            <div style={{ padding: '60px', textAlign: 'center' }}>
                                <FileText size={48} color="#dadce0" style={{ marginBottom: '16px' }} />
                                <h4 style={{ color: '#5f6368', fontSize: '1rem', fontWeight: 500 }}>No assignments yet</h4>
                                {userRole === 'mentor' ? (
                                    <button 
                                        className="btn"
                                        onClick={() => setView('create-assignment')}
                                        style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        <Plus size={18} /> Create First Assignment
                                    </button>
                                ) : (
                                    <p style={{ color: '#5f6368', fontSize: '0.875rem' }}>
                                        Your teacher hasn't created any assignments yet
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {assignments.map(assignment => {
                                    const now = new Date();
                                    const activeFrom = assignment.active_from ? new Date(assignment.active_from) : null;
                                    const activeUntil = assignment.active_until ? new Date(assignment.active_until) : null;
                                    const isActive = (!activeFrom || now >= activeFrom) && (!activeUntil || now <= activeUntil);
                                    
                                    // Students only see active assignments
                                    if (userRole === 'student' && !isActive) return null;
                                    
                                    return (
                                        <div 
                                            key={assignment.assignment_id} 
                                            onClick={() => {
                                                if (userRole === 'student') {
                                                    setSelectedAssignment(assignment.assignment_id);
                                                    setView('take-assignment');
                                                }
                                            }}
                                            style={{
                                                padding: '20px',
                                                background: '#f8f9fa',
                                                borderRadius: '12px',
                                                border: '1px solid #e8eaed',
                                                cursor: userRole === 'student' ? 'pointer' : 'default',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (userRole === 'student') {
                                                    e.currentTarget.style.background = '#e8f0fe';
                                                    e.currentTarget.style.borderColor = 'var(--primary)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (userRole === 'student') {
                                                    e.currentTarget.style.background = '#f8f9fa';
                                                    e.currentTarget.style.borderColor = '#e8eaed';
                                                }
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                                        <FileText size={20} color="var(--primary)" />
                                                        <h4 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, color: '#202124' }}>
                                                            {assignment.title}
                                                        </h4>
                                                        {!isActive && userRole === 'mentor' && (
                                                            <span className="badge" style={{ background: '#ea4335', color: 'white' }}>
                                                                Inactive
                                                            </span>
                                                        )}
                                                    </div>
                                                    {assignment.description && (
                                                        <p style={{ fontSize: '0.875rem', color: '#5f6368', margin: '0 0 12px 32px' }}>
                                                            {assignment.description}
                                                        </p>
                                                    )}
                                                    <div style={{ display: 'flex', gap: '24px', marginLeft: '32px', fontSize: '0.813rem', color: '#5f6368', flexWrap: 'wrap' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <Calendar size={14} /> Due: {new Date(assignment.due_date).toLocaleDateString()}
                                                        </span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <Award size={14} /> {assignment.total_points || 0} points
                                                        </span>
                                                        {activeFrom && (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                Opens: {activeFrom.toLocaleDateString()}
                                                            </span>
                                                        )}
                                                        {activeUntil && (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                Closes: {activeUntil.toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {userRole === 'mentor' && (
                                                    <div style={{ textAlign: 'center' }}>
                                                        <p style={{ fontSize: '0.75rem', color: '#5f6368', margin: '0 0 4px 0' }}>Submitted</p>
                                                        <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
                                                            {assignment.submitted_count || 0}/{assignment.total_students || 0}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default React.memo(ClassView);
