import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Users,
    AlertCircle,
    Activity,
    TrendingUp,
    ShieldAlert,
    UserPlus,
    X,
    CheckCircle,
    Lock,
    BookOpen,
    Shield
} from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, registerables } from 'chart.js';

ChartJS.register(...registerables);

const AdminDashboard = () => {
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [mentors, setMentors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [resolving, setResolving] = useState(null);

    const resolveAlert = async (alertId) => {
        setResolving(alertId);
        try {
            await axios.patch(`http://localhost:5000/api/alerts/${alertId}/resolve`);
            setAlerts(prev => prev.filter(a => a.alert_id !== alertId));
        } catch (e) { console.error(e); }
        setResolving(null);
    };

    // Create-user form state
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'student', mentor_id: '' });
    const [createError, setCreateError] = useState('');
    const [createSuccess, setCreateSuccess] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [uRes, sRes, aRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/users').catch(() => ({ data: [] })),
                    axios.get('http://localhost:5000/api/risk/stats/all').catch(() => ({ data: [] })),
                    axios.get('http://localhost:5000/api/alerts/for/admin').catch(() => ({ data: [] }))
                ]);
                const allUsers = Array.isArray(uRes.data) ? uRes.data : [];
                setUsers(allUsers);
                setMentors(allUsers.filter(u => u.role === 'mentor'));
                setStats(Array.isArray(sRes.data) ? sRes.data : []);
                setAlerts(Array.isArray(aRes.data) ? aRes.data : []);
            } catch (e) {
                console.error('Fetch error:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreateError('');
        setCreateSuccess('');
        setCreating(true);
        try {
            const token = localStorage.getItem('token');
            const payload = { ...newUser };
            if (newUser.role !== 'student') delete payload.mentor_id;
            const res = await axios.post('http://localhost:5000/api/auth/admin/create-user', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCreateSuccess(res.data.message);
            setNewUser({ name: '', email: '', password: '', role: 'student', mentor_id: '' });
            // Refresh user list
            const uRes = await axios.get('http://localhost:5000/api/users').catch(() => ({ data: [] }));
            const allUsers = Array.isArray(uRes.data) ? uRes.data : [];
            setUsers(allUsers);
            setMentors(allUsers.filter(u => u.role === 'mentor'));
        } catch (err) {
            setCreateError(err.response?.data?.error || 'Provisioning failed.');
        } finally {
            setCreating(false);
        }
    };

    const getCount = (level) => {
        if (!Array.isArray(stats)) return 0;
        const item = stats.find(s => s && s.risk_level === level);
        return item ? item.count : 0;
    };

    if (loading) return <div style={{ color: 'var(--primary)', padding: '60px', fontFamily: 'monospace' }}>ACCESSING NETWORK DATA...</div>;

    return (
        <div className="content-area animate-reveal">
            <div style={{ marginBottom: '50px' }}>
                <h1 className="title-xl">Network Intelligence</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginTop: '10px' }}>
                    Monitoring <span style={{ color: 'var(--text-pure)', fontWeight: 700 }}>{users.length}</span> entities across the behavior grid.
                </p>
            </div>

            <div className="bento-grid" style={{ marginBottom: '40px' }}>
                <div className="obsidian-card" style={{ gridColumn: 'span 4', padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '10px' }}>IDENTIFIED VECTORS</p>
                            <h2 style={{ fontSize: '3rem', fontWeight: 900 }}>{users.length}</h2>
                        </div>
                        <Users size={32} color="var(--primary)" />
                    </div>
                </div>

                <div className="obsidian-card" style={{ gridColumn: 'span 4', padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '10px' }}>CRITICAL RISK</p>
                            <h2 style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--accent)' }}>{getCount('High')}</h2>
                        </div>
                        <ShieldAlert size={32} color="var(--accent)" />
                    </div>
                </div>

                <div className="obsidian-card" style={{ gridColumn: 'span 4', padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '10px' }}>STABILITY INDEX</p>
                            <h2 style={{ fontSize: '3rem', fontWeight: 900, color: '#ffaa00' }}>
                                {users.length > 0 ? Math.round(((users.length - getCount('High')) / users.length) * 100) : 100}%
                            </h2>
                        </div>
                        <Activity size={32} color="#ffaa00" />
                    </div>
                </div>
            </div>

            <div className="bento-grid">
                <div className="obsidian-card" style={{ gridColumn: 'span 8', padding: '40px' }}>
                    <h3 style={{ marginBottom: '30px' }}>Active Behavioral Alerts</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {(!alerts || alerts.length === 0) ? (
                            <p style={{ color: 'var(--text-muted)' }}>No active critical alerts detected.</p>
                        ) : alerts.map((alert, idx) => (
                            <div key={alert.alert_id || idx} style={{
                                padding: '24px',
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                border: '1px solid rgba(255,255,255,0.03)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <ShieldAlert color={alert.risk_level === 'High' ? 'var(--accent)' : alert.alert_type === 'assignment_date_passed' ? '#ffaa00' : 'var(--primary)'} size={24} />
                                    <div>
                                        <h4 style={{ fontWeight: 700 }}>{alert.student_name || 'Unknown Entity'}</h4>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>{alert.alert_message}</p>
                                        {alert.mentor_name && (
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px', letterSpacing: '0.05em' }}>
                                                MENTOR: {alert.mentor_name.toUpperCase()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                                    <span className={`status-glow status-${alert.risk_level || 'Low'}`}>
                                        {alert.alert_category || alert.risk_level || 'Alert'}
                                    </span>
                                    <button
                                        onClick={() => resolveAlert(alert.alert_id)}
                                        disabled={resolving === alert.alert_id}
                                        style={{
                                            background: 'rgba(0,255,159,0.08)', border: '1px solid var(--primary)',
                                            color: 'var(--primary)', padding: '6px 14px', borderRadius: '8px',
                                            cursor: 'pointer', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.08em'
                                        }}
                                    >
                                        {resolving === alert.alert_id ? '...' : 'RESOLVE'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="obsidian-card" style={{ gridColumn: 'span 4', padding: '40px' }}>
                    <h3>Risk Distribution</h3>
                    <div style={{ height: '240px', marginTop: '30px' }}>
                        <Bar
                            data={{
                                labels: ['Low', 'Medium', 'High'],
                                datasets: [{
                                    data: [getCount('Low'), getCount('Medium'), getCount('High')],
                                    backgroundColor: ['#00ff9f', '#ffaa00', '#ff0055'],
                                    borderRadius: 8
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: { y: { ticks: { color: '#8b949e' } }, x: { ticks: { color: '#8b949e' } } }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* ── Provision New User ───────────────────────────── */}
            <div style={{ marginTop: '40px' }}>
                <div className="obsidian-card" style={{ padding: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                        <div>
                            <h3 style={{ marginBottom: '6px' }}>Provision New Account</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Create accounts for any access tier — Admin Terminal, Mentor Console, or Student Terminal.
                            </p>
                        </div>
                        <button
                            onClick={() => { setShowCreateUser(!showCreateUser); setCreateError(''); setCreateSuccess(''); }}
                            style={{
                                background: showCreateUser ? 'rgba(255,0,85,0.1)' : 'rgba(0,255,159,0.1)',
                                border: `1px solid ${showCreateUser ? 'var(--accent)' : 'var(--primary)'}`,
                                color: showCreateUser ? 'var(--accent)' : 'var(--primary)',
                                padding: '12px 24px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                letterSpacing: '0.08em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {showCreateUser ? <><X size={16} /> CANCEL</> : <><UserPlus size={16} /> NEW ACCOUNT</>}
                        </button>
                    </div>

                    {showCreateUser && (
                        <form onSubmit={handleCreateUser}>
                            {createError && (
                                <div style={{ background: 'rgba(255,0,85,0.1)', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '14px 18px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.85rem', fontWeight: 700 }}>
                                    {createError}
                                </div>
                            )}
                            {createSuccess && (
                                <div style={{ background: 'rgba(0,255,159,0.1)', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '14px 18px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <CheckCircle size={16} /> {createSuccess}
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <input
                                    className="hyper-input"
                                    type="text"
                                    placeholder="FULL NAME"
                                    value={newUser.name}
                                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                    required
                                />
                                <input
                                    className="hyper-input"
                                    type="email"
                                    placeholder="EMAIL ADDRESS"
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    required
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                                <input
                                    className="hyper-input"
                                    type="password"
                                    placeholder="INITIAL PASSWORD"
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    required
                                />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '10px' }}>ACCESS TIER</p>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {[
                                            { value: 'student', icon: <BookOpen size={14} />, label: 'STUDENT' },
                                            { value: 'mentor', icon: <Users size={14} />, label: 'MENTOR' },
                                            { value: 'admin', icon: <Shield size={14} />, label: 'ADMIN' }
                                        ].map(tier => (
                                            <button
                                                key={tier.value}
                                                type="button"
                                                onClick={() => setNewUser({ ...newUser, role: tier.value, mentor_id: '' })}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px 6px',
                                                    borderRadius: '10px',
                                                    border: `2px solid ${newUser.role === tier.value ? 'var(--primary)' : 'var(--glass-border)'}`,
                                                    background: newUser.role === tier.value ? 'rgba(0,255,159,0.08)' : 'rgba(255,255,255,0.02)',
                                                    color: newUser.role === tier.value ? 'var(--primary)' : 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    fontWeight: 700,
                                                    fontSize: '0.7rem',
                                                    letterSpacing: '0.06em',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                {tier.icon} {tier.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {newUser.role === 'student' && (
                                <div style={{ marginBottom: '24px' }}>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '10px' }}>ASSIGN MENTOR (OPTIONAL)</p>
                                    <select
                                        value={newUser.mentor_id}
                                        onChange={e => setNewUser({ ...newUser, mentor_id: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '16px 20px',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '14px',
                                            color: newUser.mentor_id ? 'white' : 'var(--text-muted)',
                                            fontSize: '0.9rem',
                                            fontWeight: 600,
                                            outline: 'none',
                                            appearance: 'none'
                                        }}
                                    >
                                        <option value="">— No mentor assigned —</option>
                                        {mentors.map(m => (
                                            <option key={m.user_id} value={m.user_id}>{m.name} ({m.email})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={creating}
                                className="btn-hyper"
                                style={{ width: '100%', height: '56px', opacity: creating ? 0.7 : 1 }}
                            >
                                {creating ? 'PROVISIONING...' : <><UserPlus size={18} /> PROVISION ACCOUNT</>}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
