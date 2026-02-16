import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Users,
    AlertCircle,
    Activity,
    TrendingUp,
    ShieldAlert
} from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, registerables } from 'chart.js';

ChartJS.register(...registerables);

const AdminDashboard = () => {
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [uRes, sRes, aRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/users').catch(() => ({ data: [] })),
                    axios.get('http://localhost:5000/api/risk/stats/all').catch(() => ({ data: [] })),
                    axios.get('http://localhost:5000/api/alerts/all/active').catch(() => ({ data: [] }))
                ]);
                setUsers(Array.isArray(uRes.data) ? uRes.data : []);
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
                                    <ShieldAlert color={alert.risk_level === 'High' ? 'var(--accent)' : '#ffaa00'} size={24} />
                                    <div>
                                        <h4 style={{ fontWeight: 700 }}>{alert.user_name || 'Unknown Entity'}</h4>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{alert.alert_message}</p>
                                    </div>
                                </div>
                                <span className={`status-glow status-${alert.risk_level || 'Low'}`}>{alert.risk_level}</span>
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
        </div>
    );
};

export default AdminDashboard;
