import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
    User, ShieldAlert, Search, ChevronRight, ChevronDown,
    Bell, CheckCircle, BookOpen, Layers, AlertTriangle
} from 'lucide-react';

const API = 'http://localhost:5000/api';
const alertColor = (type) => {
    if (type === 'risk_change')            return 'var(--accent)';
    if (type === 'assignment_date_passed') return '#ffaa00';
    return 'var(--primary)';
};

const MentorDashboard = () => {
    const [students, setStudents]       = useState([]);
    const [alerts, setAlerts]           = useState([]);
    const [searchTerm, setSearchTerm]   = useState('');
    const [loading, setLoading]         = useState(true);
    const [expandedId, setExpandedId]   = useState(null);
    const [studentLogs, setStudentLogs] = useState({});
    const [resolving, setResolving]     = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [sRes, aRes] = await Promise.all([
                    axios.get(`${API}/users/mentor/${user.id}/students`).catch(() => ({ data: [] })),
                    axios.get(`${API}/alerts/for/mentor/${user.id}`).catch(() => ({ data: [] }))
                ]);
                setStudents(Array.isArray(sRes.data) ? sRes.data : []);
                setAlerts(Array.isArray(aRes.data) ? aRes.data : []);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        if (user?.id) fetchAll();
    }, [user?.id]);

    const toggleIntel = async (studentId) => {
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

    const filteredStudents = students.filter(s =>
        s?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const openAlerts  = alerts.filter(a => !a.resolved_status);
    const riskAlerts  = openAlerts.filter(a => a.alert_type === 'risk_change');

    if (loading) return <div style={{ color: 'var(--primary)', padding: '60px', fontFamily: 'monospace' }}>SCANNING SQUADRON NODES...</div>;

    return (
        <div className="content-area animate-reveal">
            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '50px' }}>
                <div>
                    <h1 className="title-xl">Squadron Intel</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginTop: '10px' }}>
                        Supervising <span style={{ color: 'var(--text-pure)', fontWeight: 700 }}>{filteredStudents.length}</span> nodes
                        {riskAlerts.length > 0 && (
                            <span style={{ marginLeft: '16px', color: 'var(--accent)', fontWeight: 700 }}>
                                · {riskAlerts.length} RISK ALERT{riskAlerts.length > 1 ? 'S' : ''}
                            </span>
                        )}
                    </p>
                </div>
                <div style={{ position: 'relative', width: '300px' }}>
                    <Search style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--text-muted)' }} size={18} />
                    <input type="text" className="hyper-input" placeholder="SCAN IDENTITY..."
                        style={{ paddingLeft: '45px', fontSize: '0.9rem' }}
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            {/* ── Student Table ── */}
            <div className="obsidian-card" style={{ padding: '0', marginBottom: '40px' }}>
                <div style={{ padding: '30px', borderBottom: '1px solid var(--glass-border)' }}>
                    <h3 style={{ fontSize: '1.1rem' }}>Node Risk Assessment</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
                                <th style={{ padding: '24px 30px' }}>Entity</th>
                                <th style={{ padding: '24px' }}>Score</th>
                                <th style={{ padding: '24px' }}>Status</th>
                                <th style={{ padding: '24px 30px', textAlign: 'right' }}>Intel</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map(student => (
                                <React.Fragment key={student.user_id}>
                                    <tr style={{ borderBottom: expandedId === student.user_id ? 'none' : '1px solid var(--glass-border)' }}>
                                        <td style={{ padding: '24px 30px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <User size={16} color="var(--text-muted)" />
                                                <div>
                                                    <p style={{ fontWeight: 700 }}>{student.name}</p>
                                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{student.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '24px', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem' }}>
                                            {student.risk_score ?? 0}
                                        </td>
                                        <td style={{ padding: '24px' }}>
                                            <span className={`status-glow status-${student.risk_level || 'Low'}`}>
                                                {student.risk_level || 'Low'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '24px 30px', textAlign: 'right' }}>
                                            <button className="btn-hyper" style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                                                onClick={() => toggleIntel(student.user_id)}>
                                                INTEL {expandedId === student.user_id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            </button>
                                        </td>
                                    </tr>

                                    {expandedId === student.user_id && (
                                        <tr>
                                            <td colSpan={4} style={{
                                                padding: '0 30px 24px',
                                                background: 'rgba(0,255,159,0.02)',
                                                borderBottom: '1px solid var(--glass-border)'
                                            }}>
                                                <div style={{ paddingTop: '16px' }}>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '14px' }}>
                                                        RECENT ACTIVITY — {student.name.toUpperCase()}
                                                    </p>
                                                    {!studentLogs[student.user_id] ? (
                                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading...</p>
                                                    ) : studentLogs[student.user_id].length === 0 ? (
                                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No activity recorded.</p>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            {studentLogs[student.user_id].slice(0, 5).map((log, i) => (
                                                                <div key={i} style={{
                                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                    padding: '10px 16px', background: 'rgba(255,255,255,0.02)',
                                                                    borderRadius: '10px', border: '1px solid var(--glass-border)'
                                                                }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                        {log.activity_type === 'assignment'
                                                                            ? <BookOpen size={14} color="var(--primary)" />
                                                                            : <Layers size={14} color="var(--primary)" />}
                                                                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                                                            {log.title || log.activity_type?.toUpperCase()}
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                            {new Date(log.submission_date).toLocaleDateString()}
                                                                        </span>
                                                                        {log.status === 'submitted'
                                                                            ? <CheckCircle size={14} color="var(--primary)" />
                                                                            : <AlertTriangle size={14} color="var(--accent)" />}
                                                                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                                                                            {log.status?.toUpperCase()}
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

            {/* ── Alerts Panel ── */}
            <div className="obsidian-card" style={{ padding: '0' }}>
                <div style={{ padding: '30px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Bell size={20} color={openAlerts.length > 0 ? 'var(--accent)' : 'var(--text-muted)'} />
                    <h3 style={{ fontSize: '1.1rem' }}>Squadron Alerts</h3>
                    {openAlerts.length > 0 && (
                        <span style={{
                            background: 'var(--accent)', color: 'white',
                            borderRadius: '999px', padding: '2px 8px',
                            fontSize: '0.7rem', fontWeight: 800
                        }}>{openAlerts.length}</span>
                    )}
                </div>
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {alerts.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No alerts for your squadron.</p>
                    ) : alerts.map(alert => (
                        <div key={alert.alert_id} style={{
                            padding: '18px 24px', borderRadius: '14px',
                            background: alert.resolved_status ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${alert.resolved_status ? 'var(--glass-border)' : alertColor(alert.alert_type) + '44'}`,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            opacity: alert.resolved_status ? 0.5 : 1
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <ShieldAlert size={18} color={alertColor(alert.alert_type)} style={{ flexShrink: 0 }} />
                                <div>
                                    {alert.student_name && (
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '4px' }}>
                                            {alert.student_name.toUpperCase()} · {(alert.alert_category || 'ALERT').toUpperCase()}
                                        </p>
                                    )}
                                    <p style={{ fontSize: '0.88rem', fontWeight: 600 }}>{alert.alert_message}</p>
                                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        {new Date(alert.alert_date).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            {!alert.resolved_status && (
                                <button onClick={() => resolveAlert(alert.alert_id)} disabled={resolving === alert.alert_id}
                                    style={{
                                        background: 'rgba(0,255,159,0.08)', border: '1px solid var(--primary)',
                                        color: 'var(--primary)', padding: '6px 14px', borderRadius: '8px',
                                        cursor: 'pointer', fontWeight: 700, fontSize: '0.7rem',
                                        letterSpacing: '0.08em', flexShrink: 0, marginLeft: '16px'
                                    }}>
                                    {resolving === alert.alert_id ? '...' : 'RESOLVE'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MentorDashboard;
