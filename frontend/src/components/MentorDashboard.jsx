import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { User, ShieldAlert, Search, ChevronRight, ChevronDown, Bell, UserPlus, Plus, Download } from 'lucide-react';
import { Card, Button, Badge, Input, Table, Loading, StatCard } from './shared/UIComponents';
import { api } from '../utils/api';
import { formatDate, percentage, getRiskColor, sortBy as sortHelper, filterBySearch } from '../utils/helpers';
import { exportStudentReport, exportAssignmentReport, exportClassReport, generateSummaryReport } from '../utils/export';
import AssignmentCreator from './AssignmentCreator';
import AssignmentResults from './AssignmentResults';
import ClassView from './ClassView';
import StudentProfile from './StudentProfile';

const MentorDashboard = () => {
    const [students, setStudents] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [classes, setClasses] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [studentLogs, setStudentLogs] = useState({});
    const [resolving, setResolving] = useState(null);
    const [showInvite, setShowInvite] = useState(false);
    const [inviteForm, setInviteForm] = useState({ class_id: '', identifier: '' });
    const [sortBy, setSortBy] = useState('score');
    const [sortOrder, setSortOrder] = useState('desc');
    const [view, setView] = useState('dashboard');
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showCreateClass, setShowCreateClass] = useState(false);
    const [classForm, setClassForm] = useState({ name: '', description: '' });
    const [creating, setCreating] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const { user } = useAuth();
    const toast = useToast();

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [sRes, aRes, cRes, asRes] = await Promise.all([
                    api.risk.getStudents(user.id, sortBy, sortOrder),
                    api.alerts.getForMentor(user.id),
                    api.classes.getByMentor(user.id),
                    api.assignments.getByMentor(user.id)
                ]);
                setStudents(sRes || []);
                setAlerts(aRes || []);
                setClasses(cRes || []);
                setAssignments(asRes || []);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        if (user?.id) fetchAll();
    }, [user?.id, sortBy, sortOrder]);

    const toggleDetails = async (studentId) => {
        if (expandedId === studentId) { setExpandedId(null); return; }
        setExpandedId(studentId);
        if (!studentLogs[studentId]) {
            const logs = await api.activity.get(studentId);
            setStudentLogs(prev => ({ ...prev, [studentId]: logs || [] }));
        }
    };

    const resolveAlert = async (alertId) => {
        setResolving(alertId);
        await api.alerts.resolve(alertId);
        setAlerts(prev => prev.filter(a => a.alert_id !== alertId));
        toast.success('Alert resolved successfully');
        setResolving(null);
    };

    const handleSendInvite = async (e) => {
        e.preventDefault();
        if (!inviteForm.class_id || !inviteForm.identifier) {
            toast.warning('Please fill all fields');
            return;
        }
        try {
            const res = await api.invites.send(user.id, inviteForm.class_id, inviteForm.identifier);
            toast.success(res.message || 'Invite sent successfully!');
            setInviteForm({ class_id: '', identifier: '' });
            setShowInvite(false);
        } catch (err) {
            toast.error(err.message || 'Failed to send invite');
        }
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();
        if (!classForm.name) {
            toast.warning('Class name is required');
            return;
        }
        setCreating(true);
        try {
            await api.classes.create(user.id, classForm.name, classForm.description);
            const cRes = await api.classes.getByMentor(user.id);
            setClasses(cRes || []);
            toast.success(`Class "${classForm.name}" created successfully!`);
            setClassForm({ name: '', description: '' });
            setShowCreateClass(false);
        } catch (err) {
            toast.error(err.message || 'Failed to create class');
        }
        setCreating(false);
    };

    const handleExport = (type) => {
        try {
            switch(type) {
                case 'students':
                    exportStudentReport(students);
                    toast.success('Student report exported!');
                    break;
                case 'assignments':
                    exportAssignmentReport(assignments);
                    toast.success('Assignment report exported!');
                    break;
                case 'classes':
                    exportClassReport(classes);
                    toast.success('Class report exported!');
                    break;
                case 'summary':
                    generateSummaryReport(students, classes, assignments, alerts);
                    toast.success('Summary report exported!');
                    break;
            }
            setShowExportMenu(false);
        } catch (err) {
            toast.error('Failed to export: ' + err.message);
        }
    };

    const viewStudent = (studentId) => {
        setSelectedStudent(studentId);
        setView('student-profile');
    };

    const filteredStudents = filterBySearch(students, searchTerm, ['name', 'email']);
    const openAlerts = alerts.filter(a => !a.resolved_status);
    const riskAlerts = openAlerts.filter(a => a.alert_type === 'risk_change');

    // View routing
    if (view === 'student-profile' && selectedStudent) {
        return <StudentProfile studentId={selectedStudent} onBack={() => { setView('dashboard'); setSelectedStudent(null); }} />;
    }
    if (view === 'create-assignment') {
        return <AssignmentCreator onBack={() => setView('dashboard')} />;
    }
    if (view === 'assignment-results' && selectedAssignment) {
        return <AssignmentResults assignmentId={selectedAssignment} onBack={() => { setView('dashboard'); setSelectedAssignment(null); }} />;
    }
    if (view === 'class-view' && selectedClass) {
        return <ClassView classId={selectedClass} onBack={() => { setView('dashboard'); setSelectedClass(null); }} userRole="mentor" userId={user.id} />;
    }

    if (loading) return <Loading />;

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.75rem', color: '#202124' }}>Mentor Dashboard</h2>
                    <p style={{ margin: '4px 0 0', color: '#5f6368' }}>Welcome, {user?.name}</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                    <Button onClick={() => setView('create-assignment')} icon={<Plus size={16} />}>Create Assignment</Button>
                    <Button onClick={() => setShowCreateClass(!showCreateClass)} variant="secondary">New Class</Button>
                    <Button onClick={() => setShowInvite(!showInvite)} variant="secondary" icon={<UserPlus size={16} />}>Invite Student</Button>
                    <div style={{ position: 'relative' }}>
                        <Button onClick={() => setShowExportMenu(!showExportMenu)} variant="secondary" icon={<Download size={16} />}>Export</Button>
                        {showExportMenu && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '8px',
                                background: 'white',
                                border: '1px solid #e0e0e0',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                zIndex: 1000,
                                minWidth: '200px'
                            }}>
                                <div style={{ padding: '8px' }}>
                                    <button onClick={() => handleExport('students')} style={{ width: '100%', padding: '10px 16px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', borderRadius: '6px', fontSize: '0.875rem' }} onMouseEnter={e => e.target.style.background = '#f8f9fa'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                                        📊 Student Risk Report
                                    </button>
                                    <button onClick={() => handleExport('assignments')} style={{ width: '100%', padding: '10px 16px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', borderRadius: '6px', fontSize: '0.875rem' }} onMouseEnter={e => e.target.style.background = '#f8f9fa'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                                        📝 Assignment Report
                                    </button>
                                    <button onClick={() => handleExport('classes')} style={{ width: '100%', padding: '10px 16px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', borderRadius: '6px', fontSize: '0.875rem' }} onMouseEnter={e => e.target.style.background = '#f8f9fa'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                                        🎓 Class Report
                                    </button>
                                    <button onClick={() => handleExport('summary')} style={{ width: '100%', padding: '10px 16px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', borderRadius: '6px', fontSize: '0.875rem', borderTop: '1px solid #e0e0e0', marginTop: '4px', paddingTop: '12px' }} onMouseEnter={e => e.target.style.background = '#f8f9fa'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                                        📈 Full Summary (JSON)
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Class Form */}
            {showCreateClass && (
                <Card style={{ marginBottom: '32px' }}>
                    <h3 style={{ marginBottom: '20px' }}>Create Class</h3>
                    <form onSubmit={handleCreateClass} style={{ display: 'grid', gap: '16px' }}>
                        <Input label="Class Name *" value={classForm.name} onChange={e => setClassForm({ ...classForm, name: e.target.value })} placeholder="e.g., Data Structures Spring 2026" required />
                        <div>
                            <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>Description</label>
                            <textarea className="input" placeholder="Enter class description..." rows={3} value={classForm.description} onChange={e => setClassForm({ ...classForm, description: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create Class'}</Button>
                            <Button variant="secondary" onClick={() => { setShowCreateClass(false); setClassForm({ name: '', description: '' }); }}>Cancel</Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Invite Form */}
            {showInvite && (
                <Card style={{ marginBottom: '32px' }}>
                    <h3 style={{ marginBottom: '20px' }}>Send Invitation</h3>
                    <form onSubmit={handleSendInvite} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '16px', alignItems: 'end' }}>
                        <div>
                            <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>Class</label>
                            <select className="input" value={inviteForm.class_id} onChange={e => setInviteForm({ ...inviteForm, class_id: e.target.value })} required>
                                <option value="">Select class...</option>
                                {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.name}</option>)}
                            </select>
                        </div>
                        <Input label="Student Email or Username" value={inviteForm.identifier} onChange={e => setInviteForm({ ...inviteForm, identifier: e.target.value })} placeholder="student@example.com" required />
                        <Button type="submit">Send</Button>
                    </form>
                </Card>
            )}

            {/* Classes Grid */}
            {classes.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '1.125rem', margin: '0 0 16px 0', color: '#202124' }}>Your Classes</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                        {classes.map(cls => (
                            <Card key={cls.class_id} onClick={() => { setSelectedClass(cls.class_id); setView('class-view'); }} style={{ cursor: 'pointer', minHeight: '150px' }}>
                                <h4 style={{ margin: '0 0 8px', color: '#1a73e8' }}>{cls.name}</h4>
                                <p style={{ fontSize: '0.875rem', color: '#5f6368', margin: '0 0 12px' }}>{cls.description || 'No description'}</p>
                                <div style={{ fontSize: '0.875rem', color: '#80868b' }}>
                                    {cls.student_count || 0} students • {cls.assignment_count || 0} assignments
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <StatCard title="Total Students" value={students.length} icon={<User size={20} />} />
                <StatCard title="High Risk" value={students.filter(s => s.risk_level === 'High').length} icon={<ShieldAlert size={20} />} color="#ea4335" />
                <StatCard title="Open Alerts" value={openAlerts.length} icon={<Bell size={20} />} color="#fbbc04" />
                <StatCard title="Active Classes" value={classes.length} color="#34a853" />
            </div>

            {/* Alerts Section */}
            {riskAlerts.length > 0 && (
                <Card style={{ marginBottom: '32px' }}>
                    <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Bell size={18} color="var(--primary)" /> Risk Alerts ({riskAlerts.length})
                    </h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {riskAlerts.slice(0, 5).map(a => (
                            <div key={a.alert_id} style={{ padding: '12px', background: '#fef7e0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>{a.message}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#5f6368' }}>{formatDate(a.sent_at)}</div>
                                </div>
                                <Button size="small" onClick={() => resolveAlert(a.alert_id)} disabled={resolving === a.alert_id}>
                                    {resolving === a.alert_id ? 'Resolving...' : 'Resolve'}
                                </Button>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Assignments */}
            {assignments.length > 0 && (
                <Card style={{ marginBottom: '32px' }}>
                    <h3 style={{ margin: '0 0 16px' }}>Recent Assignments</h3>
                    <Table>
                        <thead>
                            <tr>
                                <th>Assignment</th>
                                <th>Class</th>
                                <th>Due Date</th>
                                <th>Submitted</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {assignments.slice(0, 5).map(a => (
                                <tr key={a.assignment_id}>
                                    <td>{a.title}</td>
                                    <td>{a.class_name}</td>
                                    <td>{formatDate(a.due_date)}</td>
                                    <td>{a.submitted_count || 0}/{a.total_submissions || 0}</td>
                                    <td>
                                        <Button size="small" onClick={() => { setSelectedAssignment(a.assignment_id); setView('assignment-results'); }}>View Results</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card>
            )}

            {/* Students Table */}
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>Students ({filteredStudents.length})</h3>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <Input icon={<Search size={16} />} placeholder="Search students..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '250px' }} />
                        <select className="input" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 'auto' }}>
                            <option value="score">Risk Score</option>
                            <option value="name">Name</option>
                        </select>
                    </div>
                </div>

                <Table>
                    <thead>
                        <tr>
                            <th></th>
                            <th>Student</th>
                            <th>Risk Level</th>
                            <th>Risk Score</th>
                            <th>Activity</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map(s => (
                            <React.Fragment key={s.user_id}>
                                <tr>
                                    <td>
                                        <div onClick={() => toggleDetails(s.user_id)} style={{ cursor: 'pointer' }}>
                                            {expandedId === s.user_id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </div>
                                    </td>
                                    <td>
                                        <div onClick={() => viewStudent(s.user_id)} style={{ cursor: 'pointer', color: '#1a73e8', fontWeight: 500 }}>
                                            {s.name}
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: '#5f6368' }}>{s.email}</div>
                                    </td>
                                    <td><Badge color={getRiskColor(s.risk_level)}>{s.risk_level || 'Unknown'}</Badge></td>
                                    <td>{s.risk_score?.toFixed(2) || 'N/A'}</td>
                                    <td>{s.current_activity_score?.toFixed(1) || 'N/A'} / {s.baseline_activity_score?.toFixed(1) || 'N/A'}</td>
                                    <td><Button size="small" onClick={() => viewStudent(s.user_id)}>View Profile</Button></td>
                                </tr>
                                {expandedId === s.user_id && studentLogs[s.user_id] && (
                                    <tr>
                                        <td colSpan={6} style={{ background: '#f8f9fa', padding: '16px' }}>
                                            <h4 style={{ margin: '0 0 12px' }}>Recent Activity</h4>
                                            {studentLogs[s.user_id].length > 0 ? (
                                                <div style={{ display: 'grid', gap: '8px' }}>
                                                    {studentLogs[s.user_id].slice(0, 5).map(log => (
                                                        <div key={log.log_id} style={{ fontSize: '0.875rem', padding: '8px', background: 'white', borderRadius: '6px' }}>
                                                            <span style={{ fontWeight: 500 }}>{log.activity_type}:</span> {log.description} 
                                                            <span style={{ color: '#5f6368', marginLeft: '8px' }}>({formatDate(log.timestamp)})</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p style={{ margin: 0, color: '#5f6368' }}>No recent activity</p>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </Table>
            </Card>
        </div>
    );
};

export default MentorDashboard;
