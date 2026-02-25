import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, BookOpen, CheckCircle, AlertTriangle, Clock, Bell, UserCheck, UserX, Activity } from 'lucide-react';
import { Card, Button, Badge, Table, Loading, StatCard } from './shared/UIComponents';
import { api } from '../utils/api';
import { formatDate, percentage, getRiskColor } from '../utils/helpers';
import AssignmentTaker from './AssignmentTaker';
import ClassView from './ClassView';

const StudentDashboard = () => {
    const [risk, setRisk] = useState(null);
    const [activities, setActivities] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [invites, setInvites] = useState([]);
    const [classes, setClasses] = useState([]);
    const [pendingAssignments, setPendingAssignments] = useState([]);
    const [completedAssignments, setCompletedAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
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
                api.risk.get(user.id),
                api.activity.get(user.id),
                api.alerts.getForStudent(user.id),
                api.invites.getForStudent(user.id),
                api.assignments.getPending(user.id),
                api.assignments.getCompleted(user.id),
                api.classes.getByStudent(user.id)
            ]);
            setRisk(rRes || {});
            setActivities(aRes || []);
            setAlerts(alRes || []);
            setInvites(invRes || []);
            setPendingAssignments(pendRes || []);
            setCompletedAssignments(compRes || []);
            setClasses(classRes || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (user?.id) fetchData();
    }, [user?.id]);

    const handleAddActivity = async (e) => {
        e.preventDefault();
        try {
            await api.activity.log(user.id, newAct.type, newAct.title, new Date().toISOString(), newAct.dueDate, newAct.status, parseInt(newAct.delay) || 0);
            setShowAdd(false);
            setNewAct({ type: 'assignment', title: '', dueDate: '', status: 'submitted', delay: 0 });
            fetchData();
        } catch (err) {
            alert('Failed to add activity');
        }
    };

    const resolveAlert = async (alertId) => {
        setResolving(alertId);
        await api.alerts.resolve(alertId);
        setAlerts(prev => prev.filter(a => a.alert_id !== alertId));
        setResolving(null);
    };

    const handleInviteResponse = async (inviteId, action) => {
        setRespondingInvite(inviteId);
        try {
            await api.invites.respond(inviteId, action, user.id);
            setInvites(prev => prev.filter(i => i.invite_id !== inviteId));
            alert(`Invite ${action}ed!`);
            fetchData();
        } catch (e) {
            alert(e.message || `Failed to ${action} invite`);
        }
        setRespondingInvite(null);
    };

    // View routing
    if (view === 'assignment-taker' && selectedAssignment) {
        return <AssignmentTaker assignmentId={selectedAssignment} onBack={() => { setView('dashboard'); setSelectedAssignment(null); fetchData(); }} />;
    }
    if (view === 'class-view' && selectedClass) {
        return <ClassView classId={selectedClass} onBack={() => { setView('dashboard'); setSelectedClass(null); }} userRole="student" userId={user.id} />;
    }

    if (loading) return <Loading />;

    const openAlerts = alerts.filter(a => !a.resolved_status);
    const riskLevel = risk?.risk_level || 'Unknown';
    const riskColor = getRiskColor(riskLevel);

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ margin: 0, fontSize: '1.75rem', color: '#202124' }}>Student Dashboard</h2>
                <p style={{ margin: '4px 0 0', color: '#5f6368' }}>Welcome, {user?.name}</p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <StatCard title="Risk Level" value={riskLevel} icon={<AlertTriangle size={20} />} color={riskColor} />
                <StatCard title="Risk Score" value={risk?.risk_score?.toFixed(2) || 'N/A'} icon={<Activity size={20} />} color={riskColor} />
                <StatCard title="Pending Assignments" value={pendingAssignments.length} icon={<Clock size={20} />} color="#fbbc04" />
                <StatCard title="Completed" value={completedAssignments.length} icon={<CheckCircle size={20} />} color="#34a853" />
                <StatCard title="Open Alerts" value={openAlerts.length} icon={<Bell size={20} />} color="#ea4335" />
            </div>

            {/* Invites */}
            {invites.length > 0 && (
                <Card style={{ marginBottom: '32px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                    <h3 style={{ margin: '0 0 16px', color: 'white' }}>Class Invitations ({invites.length})</h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {invites.map(inv => (
                            <div key={inv.invite_id} style={{ padding: '16px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{inv.class_name}</div>
                                    <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>From: {inv.mentor_name}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <Button size="small" onClick={() => handleInviteResponse(inv.invite_id, 'accept')} disabled={respondingInvite === inv.invite_id} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid white' }}>
                                        <UserCheck size={16} /> Accept
                                    </Button>
                                    <Button size="small" onClick={() => handleInviteResponse(inv.invite_id, 'reject')} disabled={respondingInvite === inv.invite_id} variant="secondary" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)' }}>
                                        <UserX size={16} /> Decline
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Alerts */}
            {openAlerts.length > 0 && (
                <Card style={{ marginBottom: '32px' }}>
                    <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Bell size={18} color="#fbbc04" /> Alerts ({openAlerts.length})
                    </h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {openAlerts.slice(0, 5).map(a => (
                            <div key={a.alert_id} style={{ padding: '12px', background: '#fef7e0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>{a.message}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#5f6368' }}>{formatDate(a.sent_at)}</div>
                                </div>
                                <Button size="small" onClick={() => resolveAlert(a.alert_id)} disabled={resolving === a.alert_id}>
                                    {resolving === a.alert_id ? 'Resolving...' : 'Dismiss'}
                                </Button>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Classes */}
            {classes.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '1.125rem', margin: '0 0 16px 0', color: '#202124' }}>My Classes</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                        {classes.map(cls => (
                            <Card key={cls.class_id} onClick={() => { setSelectedClass(cls.class_id); setView('class-view'); }} style={{ cursor: 'pointer' }}>
                                <h4 style={{ margin: '0 0 8px', color: '#1a73e8' }}>{cls.name}</h4>
                                <p style={{ fontSize: '0.875rem', color: '#5f6368', margin: '0 0 12px' }}>{cls.description || 'No description'}</p>
                                <div style={{ fontSize: '0.875rem', color: '#80868b' }}>Mentor: {cls.mentor_name}</div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Pending Assignments */}
            <Card style={{ marginBottom: '32px' }}>
                <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={18} color="#fbbc04" /> Pending Assignments ({pendingAssignments.length})
                </h3>
                {pendingAssignments.length > 0 ? (
                    <Table>
                        <thead>
                            <tr>
                                <th>Assignment</th>
                                <th>Due Date</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingAssignments.map(a => (
                                <tr key={a.assignment_id}>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{a.title}</div>
                                        <div style={{ fontSize: '0.875rem', color: '#5f6368' }}>{a.description}</div>
                                    </td>
                                    <td>{formatDate(a.due_date)}</td>
                                    <td><Badge color="#fbbc04">Pending</Badge></td>
                                    <td>
                                        <Button size="small" onClick={() => { setSelectedAssignment(a.assignment_id); setView('assignment-taker'); }}>
                                            <BookOpen size={16} /> Start
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                ) : (
                    <p style={{ margin: 0, color: '#5f6368', textAlign: 'center', padding: '20px' }}>No pending assignments</p>
                )}
            </Card>

            {/* Completed Assignments */}
            <Card style={{ marginBottom: '32px' }}>
                <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} color="#34a853" /> Completed Assignments ({completedAssignments.length})
                </h3>
                {completedAssignments.length > 0 ? (
                    <Table>
                        <thead>
                            <tr>
                                <th>Assignment</th>
                                <th>Submitted</th>
                                <th>Score</th>
                                <th>Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {completedAssignments.map(a => (
                                <tr key={a.assignment_id}>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{a.title}</div>
                                        <div style={{ fontSize: '0.875rem', color: '#5f6368' }}>{a.description}</div>
                                    </td>
                                    <td>{formatDate(a.submitted_at)}</td>
                                    <td>{a.score} / {a.max_score}</td>
                                    <td>
                                        <Badge color={percentage(a.score, a.max_score) >= 60 ? '#34a853' : '#ea4335'}>
                                            {percentage(a.score, a.max_score)}%
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                ) : (
                    <p style={{ margin: 0, color: '#5f6368', textAlign: 'center', padding: '20px' }}>No completed assignments</p>
                )}
            </Card>

            {/* Recent Activity */}
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>Recent Activity</h3>
                    <Button size="small" onClick={() => setShowAdd(!showAdd)} icon={<Plus size={16} />}>Log Activity</Button>
                </div>

                {showAdd && (
                    <form onSubmit={handleAddActivity} style={{ marginBottom: '20px', padding: '16px', background: '#f8f9fa', borderRadius: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                        <select className="input" value={newAct.type} onChange={e => setNewAct({ ...newAct, type: e.target.value })}>
                            <option value="assignment">Assignment</option>
                            <option value="quiz">Quiz</option>
                            <option value="test">Test</option>
                            <option value="project">Project</option>
                        </select>
                        <input className="input" placeholder="Title" value={newAct.title} onChange={e => setNewAct({ ...newAct, title: e.target.value })} />
                        <input type="date" className="input" value={newAct.dueDate} onChange={e => setNewAct({ ...newAct, dueDate: e.target.value })} />
                        <input type="number" className="input" placeholder="Delay (days)" value={newAct.delay} onChange={e => setNewAct({ ...newAct, delay: e.target.value })} />
                        <Button type="submit">Add</Button>
                    </form>
                )}

                {activities.length > 0 ? (
                    <div style={{ display: 'grid', gap: '8px' }}>
                        {activities.slice(0, 10).map(act => (
                            <div key={act.log_id} style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 500 }}>{act.activity_type}: {act.title || act.description}</div>
                                    <div style={{ fontSize: '0.875rem', color: '#5f6368' }}>{formatDate(act.timestamp)}</div>
                                </div>
                                <Badge color={act.status === 'submitted' ? '#34a853' : '#fbbc04'}>{act.status}</Badge>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ margin: 0, color: '#5f6368', textAlign: 'center', padding: '20px' }}>No activity logged yet</p>
                )}
            </Card>
        </div>
    );
};

export default StudentDashboard;
