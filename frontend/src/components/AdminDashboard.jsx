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

import { ensureArray } from '../utils/helpers';

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
            setAlerts(prev => ensureArray(prev).filter(a => a.alert_id !== alertId));
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
                setMentors(ensureArray(allUsers).filter(u => u.role === 'mentor'));
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
            setMentors(ensureArray(allUsers).filter(u => u.role === 'mentor'));
        } catch (err) {
            setCreateError(err.response?.data?.error || 'Provisioning failed.');
        } finally {
            setCreating(false);
        }
    };

    const getCount = (level) => {
        if (!Array.isArray(stats)) return 0;
        const item = ensureArray(stats).find(s => s && s.risk_level === level);
        return item ? item.count : 0;
    };

    if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>Loading...</div>;

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
                <h1 style={{ fontSize: '2rem', margin: '0 0 8px 0', color: '#202124' }}>Admin Dashboard</h1>
                <p style={{ color: '#5f6368', fontSize: '1rem', margin: 0 }}>
                    {users.length} total user{users.length !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: '#5f6368', fontWeight: 500, fontSize: '0.875rem', marginBottom: '8px' }}>Total Users</p>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, margin: 0, color: '#202124' }}>{users.length}</h2>
                        </div>
                        <Users size={28} color="var(--primary)" />
                    </div>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: '#5f6368', fontWeight: 500, fontSize: '0.875rem', marginBottom: '8px' }}>High Risk</p>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, margin: 0, color: 'var(--accent)' }}>{getCount('High')}</h2>
                        </div>
                        <ShieldAlert size={28} color="var(--accent)" />
                    </div>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: '#5f6368', fontWeight: 500, fontSize: '0.875rem', marginBottom: '8px' }}>Health Score</p>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, margin: 0, color: 'var(--secondary)' }}>
                                {users.length > 0 ? Math.round(((users.length - getCount('High')) / users.length) * 100) : 100}%
                            </h2>
                        </div>
                        <Activity size={28} color="var(--secondary)" />
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
                <div className="card">
                    <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed' }}>
                        <h3 style={{ fontSize: '1.125rem', margin: 0, color: '#202124' }}>Alerts</h3>
                    </div>
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {(!alerts || alerts.length === 0) ? (
                            <p style={{ color: '#5f6368', fontSize: '0.875rem', margin: 0 }}>No alerts</p>
                        ) : ensureArray(alerts).map((alert, idx) => {
                            const getAlertColor = (type) => {
                                if (type === 'risk_change') return 'var(--accent)';
                                if (type === 'assignment_date_passed') return 'var(--warning)';
                                if (type === 'invite_accepted') return 'var(--secondary)';
                                return 'var(--primary)';
                            };
                            
                            return (
                                <div key={alert.alert_id || idx} style={{
                                    padding: '16px 20px',
                                    background: '#f8f9fa',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    border: '1px solid #e8eaed'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                                        <ShieldAlert color={getAlertColor(alert.alert_type)} size={20} style={{ flexShrink: 0 }} />
                                        <div>
                                            <h4 style={{ fontWeight: 600, fontSize: '0.875rem', margin: '0 0 4px 0', color: '#202124' }}>
                                                {alert.student_name || 'Unknown'}
                                            </h4>
                                            <p style={{ color: '#5f6368', fontSize: '0.813rem', margin: '0 0 4px 0' }}>
                                                {alert.alert_message}
                                            </p>
                                            {alert.mentor_name && (
                                                <p style={{ color: '#5f6368', fontSize: '0.75rem', margin: 0 }}>
                                                    Mentor: {alert.mentor_name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                                        <span className={`badge badge-${(alert.risk_level || 'low').toLowerCase()}`}>
                                            {alert.alert_category || alert.risk_level || 'Alert'}
                                        </span>
                                        <button
                                            onClick={() => resolveAlert(alert.alert_id)}
                                            disabled={resolving === alert.alert_id}
                                            className="btn-secondary"
                                            style={{ padding: '6px 14px', fontSize: '0.875rem' }}
                                        >
                                            {resolving === alert.alert_id ? '...' : 'Resolve'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="card">
                    <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed' }}>
                        <h3 style={{ fontSize: '1.125rem', margin: 0, color: '#202124' }}>Risk Distribution</h3>
                    </div>
                    <div style={{ padding: '24px', height: '240px' }}>
                        <Bar
                            data={{
                                labels: ['Low', 'Medium', 'High'],
                                datasets: [{
                                    data: [getCount('Low'), getCount('Medium'), getCount('High')],
                                    backgroundColor: ['var(--secondary)', 'var(--warning)', 'var(--accent)'],
                                    borderRadius: 8
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: { 
                                    y: { ticks: { color: '#5f6368' }, grid: { color: '#e8eaed' } }, 
                                    x: { ticks: { color: '#5f6368' }, grid: { display: false } } 
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Create User Form */}
            <div className="card">
                <div style={{ padding: '24px', borderBottom: '1px solid #e8eaed', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: '1.125rem', margin: '0 0 6px 0', color: '#202124' }}>Create New User</h3>
                        <p style={{ color: '#5f6368', fontSize: '0.875rem', margin: 0 }}>
                            Create accounts for administrators, mentors, or students.
                        </p>
                    </div>
                    <button
                        onClick={() => { setShowCreateUser(!showCreateUser); setCreateError(''); setCreateSuccess(''); }}
                        className={showCreateUser ? 'btn-secondary' : 'btn'}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        {showCreateUser ? <><X size={16} /> Cancel</> : <><UserPlus size={16} /> New User</>}
                    </button>
                </div>

                {showCreateUser && (
                    <form onSubmit={handleCreateUser} style={{ padding: '24px' }}>
                        {createError && (
                            <div style={{ background: '#fce8e6', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '0.875rem', fontWeight: 500 }}>
                                {createError}
                            </div>
                        )}
                        {createSuccess && (
                            <div style={{ background: '#e6f4ea', color: 'var(--secondary)', border: '1px solid var(--secondary)', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <CheckCircle size={16} /> {createSuccess}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>Full Name</label>
                                <input
                                    className="input"
                                    type="text"
                                    placeholder="John Doe"
                                    value={newUser.name}
                                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>Email</label>
                                <input
                                    className="input"
                                    type="email"
                                    placeholder="john@example.com"
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>Password</label>
                                <input
                                    className="input"
                                    type="password"
                                    placeholder="••••••••"
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>Role</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {[
                                        { value: 'student', icon: <BookOpen size={14} />, label: 'Student' },
                                        { value: 'mentor', icon: <Users size={14} />, label: 'Mentor' },
                                        { value: 'admin', icon: <Shield size={14} />, label: 'Admin' }
                                    ].map(tier => (
                                        <button
                                            key={tier.value}
                                            type="button"
                                            onClick={() => setNewUser({ ...newUser, role: tier.value, mentor_id: '' })}
                                            style={{
                                                flex: 1,
                                                padding: '10px 6px',
                                                borderRadius: '10px',
                                                border: `2px solid ${newUser.role === tier.value ? 'var(--primary)' : '#e8eaed'}`,
                                                background: newUser.role === tier.value ? '#e8f0fe' : 'white',
                                                color: newUser.role === tier.value ? 'var(--primary)' : '#5f6368',
                                                cursor: 'pointer',
                                                fontWeight: 600,
                                                fontSize: '0.813rem',
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
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontSize: '0.875rem', color: '#5f6368', display: 'block', marginBottom: '6px' }}>Assign Mentor (Optional)</label>
                                <select
                                    className="input"
                                    value={newUser.mentor_id}
                                    onChange={e => setNewUser({ ...newUser, mentor_id: e.target.value })}
                                >
                                    <option value="">No mentor assigned</option>
                                    {ensureArray(mentors).map(m => (
                                        <option key={m.user_id} value={m.user_id}>{m.name} ({m.email})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={creating}
                            className="btn"
                            style={{ width: '100%', height: '48px', opacity: creating ? 0.7 : 1 }}
                        >
                            {creating ? 'Creating...' : <><UserPlus size={18} /> Create User</>}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default React.memo(AdminDashboard);
