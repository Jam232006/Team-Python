import React, { useEffect, useState } from 'react';
import { ArrowLeft, Users, FileText, Copy, CheckCircle, Plus } from 'lucide-react';
import { Card, Button, Badge, Table, Loading } from './shared/UIComponents';
import { api } from '../utils/api';
import { formatDate, percentage } from '../utils/helpers';
import AssignmentTaker from './AssignmentTaker';
import AssignmentCreator from './AssignmentCreator';
import StudentProfile from './StudentProfile';

const ClassView = ({ classId, onBack, userRole = 'mentor', userId }) => {
    const [classData, setClassData] = useState(null);
    const [members, setMembers] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(userRole === 'student' ? 'assignments' : 'stream');
    const [inviteCode, setInviteCode] = useState('');
    const [copied, setCopied] = useState(false);
    const [view, setView] = useState('class');
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                let classRes, membersRes, assignmentsRes, inviteRes;
                
                if (userRole === 'mentor') {
                    [classRes, membersRes, assignmentsRes, inviteRes] = await Promise.all([
                        api.classes.getByMentor(userId),
                        api.classes.getMembers(classId),
                        api.assignments.getByClass(classId),
                        api.classes.getInviteCode(classId)
                    ]);
                    setClassData((classRes || []).find(c => c.class_id === parseInt(classId)));
                    setMembers(membersRes || []);
                    setInviteCode(inviteRes?.invite_code || '');
                } else {
                    [classRes, assignmentsRes] = await Promise.all([
                        api.classes.get(classId),
                        api.assignments.getByClass(classId)
                    ]);
                    setClassData(classRes);
                }
                
                setAssignments(assignmentsRes || []);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        if (classId && userId) fetchData();
    }, [classId, userRole, userId]);

    const copyInviteCode = () => {
        navigator.clipboard.writeText(inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return <Loading />;
    if (!classData) return <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>Class not found</div>;

    // View routing
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
        <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
            {/* Header Banner */}
            <div style={{ background: 'linear-gradient(135deg, #1a73e8 0%, #4285f4 100%)', padding: '24px 40px', color: 'white' }}>
                <Button onClick={onBack} style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }}>
                    <ArrowLeft size={18} /> Back
                </Button>
                <h1 style={{ margin: '0 0 8px', fontSize: '2rem' }}>{classData.name}</h1>
                <p style={{ margin: 0, opacity: 0.9 }}>{classData.description || 'No description'}</p>
                {userRole === 'mentor' && (
                    <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '8px' }}>
                            <span>Invite Code: <strong>{inviteCode || 'N/A'}</strong></span>
                            <Button size="small" onClick={copyInviteCode} style={{ background: 'rgba(255,255,255,0.3)', padding: '4px 8px' }}>
                                {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div style={{ background: 'white', borderBottom: '1px solid #e0e0e0' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 40px', display: 'flex', gap: '32px' }}>
                    <button onClick={() => setActiveTab('stream')} style={{ padding: '16px 0', border: 'none', background: 'none', cursor: 'pointer', color: activeTab === 'stream' ? '#1a73e8' : '#5f6368', fontWeight: 500, borderBottom: activeTab === 'stream' ? '3px solid #1a73e8' : 'none' }}>Stream</button>
                    <button onClick={() => setActiveTab('assignments')} style={{ padding: '16px 0', border: 'none', background: 'none', cursor: 'pointer', color: activeTab === 'assignments' ? '#1a73e8' : '#5f6368', fontWeight: 500, borderBottom: activeTab === 'assignments' ? '3px solid #1a73e8' : 'none' }}>Assignments</button>
                    {userRole === 'mentor' && (
                        <button onClick={() => setActiveTab('members')} style={{ padding: '16px 0', border: 'none', background: 'none', cursor: 'pointer', color: activeTab === 'members' ? '#1a73e8' : '#5f6368', fontWeight: 500, borderBottom: activeTab === 'members' ? '3px solid #1a73e8' : 'none' }}>Members</button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 40px' }}>
                {/* Stream Tab */}
                {activeTab === 'stream' && (
                    <div>
                        {userRole === 'mentor' && (
                            <div style={{ marginBottom: '24px' }}>
                                <Button onClick={() => setView('create-assignment')} icon={<Plus size={16} />}>Create Assignment</Button>
                            </div>
                        )}
                        <Card>
                            <h3 style={{ margin: '0 0 16px' }}>Class Overview</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <Users size={20} color="#1a73e8" />
                                        <span style={{ fontSize: '0.875rem', color: '#5f6368' }}>Members</span>
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{members.length}</div>
                                </div>
                                <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <FileText size={20} color="#34a853" />
                                        <span style={{ fontSize: '0.875rem', color: '#5f6368' }}>Assignments</span>
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{assignments.length}</div>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Assignments Tab */}
                {activeTab === 'assignments' && (
                    <Card>
                        <h3 style={{ margin: '0 0 16px' }}>Assignments ({assignments.length})</h3>
                        {assignments.length > 0 ? (
                            <Table>
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Due Date</th>
                                        {userRole === 'mentor' && <th>Submitted</th>}
                                        <th>Status</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assignments.map(a => (
                                        <tr key={a.assignment_id}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{a.title}</div>
                                                <div style={{ fontSize: '0.875rem', color: '#5f6368' }}>{a.description}</div>
                                            </td>
                                            <td>{formatDate(a.due_date)}</td>
                                            {userRole === 'mentor' && <td>{a.submitted_count || 0}/{a.total_submissions || 0}</td>}
                                            <td><Badge color={a.status === 'active' ? '#34a853' : '#ea4335'}>{a.status}</Badge></td>
                                            <td>
                                                {userRole === 'student' ? (
                                                    <Button size="small" onClick={() => { setSelectedAssignment(a.assignment_id); setView('take-assignment'); }}>Start</Button>
                                                ) : (
                                                    <Button size="small" onClick={() => { setSelectedAssignment(a.assignment_id); setView('assignment-results'); }}>View</Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        ) : (
                            <p style={{ margin: 0, color: '#5f6368', textAlign: 'center', padding: '20px' }}>No assignments yet</p>
                        )}
                    </Card>
                )}

                {/* Members Tab (Mentor only) */}
                {activeTab === 'members' && userRole === 'mentor' && (
                    <Card>
                        <h3 style={{ margin: '0 0 16px' }}>Members ({members.length})</h3>
                        {members.length > 0 ? (
                            <Table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Joined</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.map(m => (
                                        <tr key={m.student_id}>
                                            <td style={{ fontWeight: 500, cursor: 'pointer', color: '#1a73e8' }} onClick={() => { setSelectedStudent(m.student_id); setView('student-profile'); }}>
                                                {m.student_name}
                                            </td>
                                            <td>{m.email}</td>
                                            <td>{formatDate(m.joined_at)}</td>
                                            <td>
                                                <Button size="small" onClick={() => { setSelectedStudent(m.student_id); setView('student-profile'); }}>View Profile</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        ) : (
                            <p style={{ margin: 0, color: '#5f6368', textAlign: 'center', padding: '20px' }}>No members yet</p>
                        )}
                    </Card>
                )}
            </div>
        </div>
    );
};

export default ClassView;
