import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
    Plus, BookOpen, CheckCircle, AlertTriangle,
    Zap, Layers, Bell, ShieldAlert
} from 'lucide-react';
import { Line } from 'react-chartjs-2';

const API  = 'http://localhost:5000/api';
const alertColor = (type) => {
    if (type === 'risk_change')           return 'var(--accent)';
    if (type === 'assignment_overdue')    return '#ffaa00';
    return 'var(--primary)';
};

const StudentDashboard = () => {
    const [risk, setRisk]             = useState(null);
    const [activities, setActivities] = useState([]);
    const [alerts, setAlerts]         = useState([]);
    const [loading, setLoading]       = useState(true);
    const { user } = useAuth();
    const [showAdd, setShowAdd]       = useState(false);
    const [newAct, setNewAct]         = useState({ type: 'assignment', title: '', dueDate: '', status: 'submitted', delay: 0 });
    const [resolving, setResolving]   = useState(null);

    const fetchData = async () => {
        try {
            const [rRes, aRes, alRes] = await Promise.all([
                axios.get(`${API}/risk/${user.id}`).catch(() => ({ data: {} })),
                axios.get(`${API}/activity/${user.id}`).catch(() => ({ data: [] })),
                axios.get(`${API}/alerts/for/student/${user.id}`).catch(() => ({ data: [] }))
            ]);
            setRisk(rRes.data || {});
            setActivities(Array.isArray(aRes.data) ? aRes.data : []);
            setAlerts(Array.isArray(alRes.data) ? alRes.data : []);
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
                user_id:           user.id,
                activity_type:     newAct.type,
                title:             newAct.title || undefined,
                submission_date:   new Date().toISOString(),
                due_date:          newAct.dueDate || undefined,
                status:            newAct.status,
                response_time_days: parseInt(newAct.delay) || 0
            });
            setShowAdd(false);
            setNewAct({ type: 'assignment', title: '', dueDate: '', status: 'submitted', delay: 0 });
            fetchData();
        } catch (err) {
            alert('Transmission failed');
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

    const trendData = {
        labels: Array.isArray(activities) ? activities.slice(-7).map(a => new Date(a.submission_date).toLocaleDateString()) : [],
        datasets: [{
            label: 'Performance',
            data: Array.isArray(activities) ? activities.slice(-7).map(a => a.status === 'submitted' ? (10 - a.response_time_days) : 0) : [],
            borderColor: '#00ff9f',
            backgroundColor: 'rgba(0, 255, 159, 0.1)',
            fill: true,
            tension: 0.4
        }]
    };

    if (loading) return <div style={{ color: 'var(--primary)', padding: '60px', fontFamily: 'monospace' }}>INITIALIZING PERSONAL TERMINAL...</div>;

    return (
        <div className="content-area animate-reveal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px' }}>
                <div>
                    <h1 className="title-xl">Personal Terminal</h1>
                    <p style={{ color: 'var(--text-muted)' }}>ENTITY: {user?.email?.split('@')[0].toUpperCase()}</p>
                </div>
                <button onClick={() => setShowAdd(!showAdd)} className="btn-hyper">
                    <Plus size={20} /> INITIALIZE ACTIVITY
                </button>
            </div>

            {showAdd && (
                <div className="obsidian-card" style={{ padding: '32px', marginBottom: '40px', border: '1px solid var(--primary)' }}>
                    <h3 style={{ marginBottom: '24px' }}><Zap size={18} color="var(--primary)" /> LOG NEW BEHAVIORAL DATA</h3>
                    <form style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }} onSubmit={handleAddActivity}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TITLE</label>
                            <input type="text" className="hyper-input" placeholder="Assignment name..."
                                value={newAct.title} onChange={e => setNewAct({ ...newAct, title: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TYPE</label>
                            <select className="hyper-input" value={newAct.type} onChange={e => setNewAct({ ...newAct, type: e.target.value })}>
                                <option value="assignment">ASSIGNMENT</option>
                                <option value="quiz">QUIZ</option>
                                <option value="login">LOGIN</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>DUE DATE</label>
                            <input type="date" className="hyper-input"
                                value={newAct.dueDate} onChange={e => setNewAct({ ...newAct, dueDate: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>STATUS</label>
                            <select className="hyper-input" value={newAct.status} onChange={e => setNewAct({ ...newAct, status: e.target.value })}>
                                <option value="submitted">SUBMITTED</option>
                                <option value="pending">PENDING</option>
                                <option value="missed">MISSED</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>DAYS LATE</label>
                            <input type="number" className="hyper-input" min="0" value={newAct.delay}
                                onChange={e => setNewAct({ ...newAct, delay: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button type="submit" className="btn-hyper" style={{ width: '100%' }}>LOG EVENT</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bento-grid" style={{ marginBottom: '40px' }}>
                <div className="obsidian-card" style={{ gridColumn: 'span 4', padding: '32px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>RISK VECTOR</p>
                    <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span className={`status-glow status-${risk?.risk_level || 'Low'}`}>{risk?.risk_level || 'CLEAR'}</span>
                        <span style={{ fontSize: '2rem', fontWeight: 900 }}>{risk?.risk_score || 0}</span>
                    </div>
                </div>
                <div className="obsidian-card" style={{ gridColumn: 'span 8', padding: '32px' }}>
                    <div style={{ height: '120px' }}>
                        <Line data={trendData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }} />
                    </div>
                </div>
            </div>

            <div className="obsidian-card" style={{ padding: '40px' }}>
                <h3 style={{ marginBottom: '30px' }}>Activity Log</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activities.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>NO EVENTS DETECTED.</p> : activities.slice(0, 10).map((act, i) => (
                        <div key={i} style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                {act.activity_type === 'assignment' ? <BookOpen size={18} color="var(--primary)" /> : <Layers size={18} color="var(--primary)" />}
                                <div>
                                    <h4 style={{ fontSize: '0.9rem' }}>{act.title || act.activity_type?.toUpperCase()}</h4>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {new Date(act.submission_date).toLocaleDateString()}
                                        {act.due_date ? ` · Due ${new Date(act.due_date).toLocaleDateString()}` : ''}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{act.status?.toUpperCase()}</span>
                                {act.status === 'submitted' ? <CheckCircle size={18} color="var(--primary)" /> : <AlertTriangle size={18} color="var(--accent)" />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Alerts Panel ── */}
            <div className="obsidian-card" style={{ padding: '0', marginTop: '40px' }}>
                <div style={{ padding: '30px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Bell size={20} color={alerts.filter(a => !a.resolved_status).length > 0 ? 'var(--accent)' : 'var(--text-muted)'} />
                    <h3 style={{ fontSize: '1.1rem' }}>My Alerts</h3>
                    {alerts.filter(a => !a.resolved_status).length > 0 && (
                        <span style={{
                            background: 'var(--accent)', color: 'white',
                            borderRadius: '999px', padding: '2px 8px',
                            fontSize: '0.7rem', fontWeight: 800
                        }}>{alerts.filter(a => !a.resolved_status).length}</span>
                    )}
                </div>
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {alerts.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No alerts. All clear.</p>
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
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '4px' }}>
                                        {(alert.alert_category || alert.alert_type || 'ALERT').toUpperCase()}
                                    </p>
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
                                    {resolving === alert.alert_id ? '...' : 'DISMISS'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
