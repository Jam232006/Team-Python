import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
    Plus, BookOpen, CheckCircle, AlertTriangle, Clock,
    Bell, Mail, UserCheck, UserX, FileText, TrendingUp, Activity, X, FolderOpen
} from 'lucide-react';
import AssignmentTaker from './AssignmentTaker';
import ClassView from './ClassView';

const API = 'http://localhost:5000/api';

const StudentDashboard = () => {
    const [risk, setRisk] = useState(null);
    const [activities, setActivities] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [invites, setInvites] = useState([]);
    const [classes, setClasses] = useState([]);
    const [pendingAssignments, setPendingAssignments] = useState([]);
    const [completedAssignments, setCompletedAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user, logout } = useAuth();
    const [showAdd, setShowAdd] = useState(false);
    const [newAct, setNewAct] = useState({ type: 'assignment', title: '', dueDate: '', status: 'submitted', delay: 0 });
    const [resolving, setResolving] = useState(null);
    const [respondingInvite, setRespondingInvite] = useState(null);
    const [view, setView] = useState('dashboard');
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);

    const fetchData = async () => {
        try {
            const [rRes, aRes, alRes, invRes, pendRes, compRes, classRes] = await Promise.all([
                axios.get(`${API}/risk/${user.id}`).catch(() => ({ data: {} })),
                axios.get(`${API}/activity/${user.id}`).catch(() => ({ data: [] })),
                axios.get(`${API}/alerts/for/student/${user.id}`).catch(() => ({ data: [] })),
                axios.get(`${API}/invites/student/${user.id}`).catch(() => ({ data: [] })),
                axios.get(`${API}/assignments/student/${user.id}/pending`).catch(() => ({ data: [] })),
                axios.get(`${API}/assignments/student/${user.id}/completed`).catch(() => ({ data: [] })),
                axios.get(`${API}/classes/student/${user.id}`).catch(() => ({ data: [] }))
            ]);
            setRisk(rRes.data || {});
            setActivities(Array.isArray(aRes.data) ? aRes.data : []);
            setAlerts(Array.isArray(alRes.data) ? alRes.data : []);
            setInvites(Array.isArray(invRes.data) ? invRes.data : []);
            setPendingAssignments(Array.isArray(pendRes.data) ? pendRes.data : []);
            setCompletedAssignments(Array.isArray(compRes.data) ? compRes.data : []);
            setClasses(Array.isArray(classRes.data) ? classRes.data : []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id) fetchData();
    }, [user?.id]);

    const handleAddActivity = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API}/activity/log`, {
                user_id: user.id,
                activity_type: newAct.type,
                title: newAct.title || undefined,
                submission_date: new Date().toISOString(),
                due_date: newAct.dueDate || undefined,
                status: newAct.status,
                response_time_days: parseInt(newAct.delay) || 0
            });
            setShowAdd(false);
            setNewAct({ type: 'assignment', title: '', dueDate: '', status: 'submitted', delay: 0 });
            fetchData();
        } catch (err) {
            alert('Failed to add activity');
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

    const handleInviteResponse = async (inviteId, action) => {
        setRespondingInvite(inviteId);
        try {
            await axios.post(`${API}/invites/${inviteId}/${action}`, {
                student_id: user.id
            });
            setInvites(prev => prev.filter(i => i.invite_id !== inviteId));
            alert(`Invite ${action}ed successfully!`);
            fetchData();
        } catch (e) {
            alert(e.response?.data?.error || `Failed to ${action} invite`);
        }
        setRespondingInvite(null);
    };

    if (loading) return (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading your dashboard...
        </div>
    );

    if (view === 'class-view' && selectedClass) {
        return <ClassView classId={selectedClass} onBack={() => { setView('dashboard'); setSelectedClass(null); }} userRole="student" userId={user.id} />;
    } if (view === 'take-assignment' && selectedAssignment) {
        return <AssignmentTaker assignmentId={selectedAssignment} onBack={() => { setView('dashboard'); setSelectedAssignment(null); fetchData(); }} />;
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
            {/* Header */}
            <header style={{
                background: 'white',
                borderBottom: '1px solid var(--border-light)',
                padding: '16px 32px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>My Dashboard</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Welcome back, {user?.name}
                        {invites.length > 0 && (
                            <span style={{ marginLeft: '12px', color: 'var(--primary)', fontWeight: 600 }}>
                                • {invites.length} new invite{invites.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button onClick={() => setShowAdd(!showAdd)} className="btn">
                        <Plus size={18} /> Add Activity
                    </button>
                    <button onClick={logout} className="btn-secondary">
                        Sign Out
                    </button>
                </div>
            </header>

            <div className="content">
                {/* Stats Overview */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '10px', background: 'var(--primary-light)', borderRadius: '12px' }}>
                                <TrendingUp size={20} color="var(--primary)" />
                            </div>
                            <div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Risk Level</p>
                                <span className={`badge badge-${risk?.risk_level?.toLowerCase()}`}>
                                    {risk?.risk_level || 'Low'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '10px', background: 'var(--warning-light)', borderRadius: '12px' }}>
                                <Clock size={20} color="var(--warning)" />
                            </div>
                            <div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Pending</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>{pendingAssignments.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '10px', background: 'var(--secondary-light)', borderRadius: '12px' }}>
                                <CheckCircle size={20} color="var(--secondary)" />
                            </div>
                            <div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Completed</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>{completedAssignments.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '10px', background: 'var(--primary-light)', borderRadius: '12px' }}>
                                <Activity size={20} color="var(--primary)" />
                            </div>
                            <div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Activities</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>{activities.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add Activity Form */}
                {showAdd && (
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '1.1rem' }}>Log New Activity</h3>
                            <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={20} color="var(--text-muted)" />
                            </button>
                        </div>
                        <form onSubmit={handleAddActivity}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Title</label>
                                    <input type="text" className="input" placeholder="Assignment name"
                                        value={newAct.title} onChange={e => setNewAct({ ...newAct, title: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Type</label>
                                    <select className="input" value={newAct.type} onChange={e => setNewAct({ ...newAct, type: e.target.value })}>
                                        <option value="assignment">Assignment</option>
                                        <option value="quiz">Quiz</option>
                                        <option value="login">Login</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Due Date</label>
                                    <input type="date" className="input" value={newAct.dueDate} onChange={e => setNewAct({ ...newAct, dueDate: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Status</label>
                                    <select className="input" value={newAct.status} onChange={e => setNewAct({ ...newAct, status: e.target.value })}>
                                        <option value="submitted">Submitted</option>
                                        <option value="pending">Pending</option>
                                        <option value="missed">Missed</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Days Late</label>
                                    <input type="number" className="input" min="0" value={newAct.delay}
                                        onChange={e => setNewAct({ ...newAct, delay: e.target.value })} />
                                </div>
                            </div>
                            <button type="submit" className="btn">Log Activity</button>
                        </form>
                    </div>
                )}

                {/* Invites */}
                {invites.length > 0 && (
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <Mail size={20} color="var(--primary)" />
                            <h3 style={{ fontSize: '1.1rem' }}>Class Invitations</h3>
                            <span className="badge" style={{ background: 'var(--primary)', color: 'white' }}>{invites.length}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {invites.map(invite => (
                                <div key={invite.invite_id} style={{
                                    padding: '16px',
                                    borderRadius: '12px',
                                    background: 'var(--primary-light)',
                                    border: '1px solid var(--primary)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                            {invite.class_name}
                                        </p>
                                        <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>{invite.class_name}</p>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                            From {invite.mentor_name} ({invite.mentor_email})
                                        </p>
                                        {invite.class_description && (
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px', fontStyle: 'italic' }}>
                                                {invite.class_description}
                                            </p>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                                        <button
                                            onClick={() => handleInviteResponse(invite.invite_id, 'accept')}
                                            disabled={respondingInvite === invite.invite_id}
                                            className="btn"
                                            style={{ padding: '10px 16px', fontSize: '0.9rem' }}
                                        >
                                            <UserCheck size={16} /> Accept
                                        </button>
                                        <button
                                            onClick={() => handleInviteResponse(invite.invite_id, 'reject')}
                                            disabled={respondingInvite === invite.invite_id}
                                            className="btn-secondary"
                                            style={{ padding: '10px 16px', fontSize: '0.9rem', color: 'var(--accent)', borderColor: 'var(--accent)' }}
                                        >
                                            <UserX size={16} /> Decline
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Classes */}
                {classes.length > 0 && (
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <FolderOpen size={20} color="var(--primary)" />
                            <h3 style={{ fontSize: '1.1rem' }}>My Classes</h3>
                            <span className="badge badge-low">{classes.length}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                            {classes.map(cls => (
                                <div 
                                    key={cls.class_id} 
                                    onClick={() => {
                                        setSelectedClass(cls.class_id);
                                        setView('class-view');
                                    }}
                                    style={{
                                        padding: '20px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #1a73e8 0%, #4285f4 100%)',
                                        color: 'white',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(26, 115, 232, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                                    }}
                                >
                                    <p style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '8px' }}>{cls.name}</p>
                                    {cls.description && (
                                        <p style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '12px' }}>
                                            {cls.description.length > 60 ? cls.description.substring(0, 60) + '...' : cls.description}
                                        </p>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.813rem', opacity: 0.9 }}>
                                        <span>{cls.mentor_name}</span>
                                        <span>{cls.member_count} students</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pending Assignments */}
                {pendingAssignments.length > 0 && (
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <FileText size={20} color="var(--warning)" />
                            <h3 style={{ fontSize: '1.1rem' }}>Pending Assignments</h3>
                            <span className="badge badge-medium">{pendingAssignments.length}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {pendingAssignments.map(assignment => {
                                const dueDate = new Date(assignment.due_date);
                                const now = new Date();
                                const isOverdue = now > dueDate;
                                const hoursTill = Math.max(0, Math.floor((dueDate - now) / (1000 * 60 * 60)));

                                return (
                                    <div key={assignment.assignment_id} style={{
                                        padding: '16px',
                                        borderRadius: '12px',
                                        background: isOverdue ? 'var(--accent-light)' : 'var(--bg-main)',
                                        border: `1px solid ${isOverdue ? 'var(--accent)' : 'var(--border)'}`,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                {assignment.class_name}
                                            </p>
                                            <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>{assignment.title}</p>
                                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '0.85rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isOverdue ? 'var(--accent)' : 'var(--text-secondary)' }}>
                                                    <Clock size={14} />
                                                    {isOverdue ? (
                                                        <span style={{ fontWeight: 600 }}>Overdue</span>
                                                    ) : (
                                                        <span>Due in {hoursTill}h</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedAssignment(assignment.assignment_id);
                                                setView('take-assignment');
                                            }}
                                            className="btn"
                                            style={{
                                                marginLeft: '16px',
                                                background: isOverdue ? 'var(--accent)' : 'var(--primary)',
                                                color: 'white'
                                            }}
                                        >
                                            {isOverdue ? 'Submit Late' : 'Start'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Alerts */}
                {alerts.length > 0 && (
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <Bell size={20} color="var(--accent)" />
                            <h3 style={{ fontSize: '1.1rem' }}>Alerts</h3>
                            <span className="badge badge-high">{alerts.filter(a => !a.resolved_status).length}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {alerts.map(alert => (
                                <div key={alert.alert_id} style={{
                                    padding: '14px 16px',
                                    borderRadius: '12px',
                                    background: alert.resolved_status ? 'var(--bg-main)' : 'var(--accent-light)',
                                    border: `1px solid ${alert.resolved_status ? 'var(--border)' : 'var(--accent)'}`,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    opacity: alert.resolved_status ? 0.6 : 1
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                                            {alert.alert_type || 'Alert'}
                                        </p>
                                        <p style={{ fontSize: '0.95rem', marginBottom: '4px' }}>{alert.alert_message}</p>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {new Date(alert.alert_date).toLocaleString()}
                                        </p>
                                    </div>
                                    {!alert.resolved_status && (
                                        <button
                                            onClick={() => resolveAlert(alert.alert_id)}
                                            disabled={resolving === alert.alert_id}
                                            className="btn-secondary"
                                            style={{ marginLeft: '16px', fontSize: '0.85rem', padding: '8px 16px' }}
                                        >
                                            Dismiss
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Activities */}
                <div className="card">
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Recent Activities</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {activities.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No activities yet.</p>
                        ) : activities.slice(0, 10).map((act, i) => (
                            <div key={i} style={{
                                padding: '14px 16px',
                                background: 'var(--bg-main)',
                                borderRadius: '12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ padding: '8px', background: 'var(--primary-light)', borderRadius: '10px' }}>
                                        {act.activity_type === 'assignment' ? <BookOpen size={16} color="var(--primary)" /> : <Activity size={16} color="var(--primary)" />}
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>{act.title || act.activity_type}</p>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {new Date(act.submission_date).toLocaleDateString()}
                                            {act.due_date && ` • Due ${new Date(act.due_date).toLocaleDateString()}`}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span className={`badge badge-${act.status === 'submitted' ? 'low' : act.status === 'pending' ? 'medium' : 'high'}`}>
                                        {act.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(StudentDashboard);
