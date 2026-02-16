import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
    User,
    ShieldAlert,
    Search,
    ChevronRight
} from 'lucide-react';

const MentorDashboard = () => {
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/users/mentor/${user.id}/students`);
                setStudents(Array.isArray(res.data) ? res.data : []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        if (user?.id) fetchStudents();
    }, [user?.id]);

    const filteredStudents = Array.isArray(students) ? students.filter(s =>
        s && (s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    ) : [];

    if (loading) return <div style={{ color: 'var(--primary)', padding: '60px', fontFamily: 'monospace' }}>SCANNING SQUADRON NODES...</div>;

    return (
        <div className="content-area animate-reveal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '50px' }}>
                <div>
                    <h1 className="title-xl">Squadron Intel</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginTop: '10px' }}>
                        Supervising <span style={{ color: 'var(--text-pure)', fontWeight: 700 }}>{filteredStudents.length}</span> active behavioral nodes.
                    </p>
                </div>

                <div style={{ position: 'relative', width: '300px' }}>
                    <Search style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--text-muted)' }} size={18} />
                    <input
                        type="text"
                        className="hyper-input"
                        placeholder="SCAN IDENTITY..."
                        style={{ paddingLeft: '45px', fontSize: '0.9rem' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="obsidian-card" style={{ padding: '0' }}>
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
                                <th style={{ padding: '24px 30px', textAlign: 'right' }}>Management</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map((student, idx) => (
                                <tr key={student.user_id || idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                    <td style={{ padding: '24px 30px' }}>
                                        <div>
                                            <p style={{ fontWeight: 700 }}>{student.name}</p>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{student.email}</p>
                                        </div>
                                    </td>
                                    <td style={{ padding: '24px', fontFamily: 'var(--font-mono)' }}>{student.risk_score || 0}</td>
                                    <td style={{ padding: '24px' }}>
                                        <span className={`status-glow status-${student.risk_level || 'Low'}`}>
                                            {student.risk_level || 'Low'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '24px 30px', textAlign: 'right' }}>
                                        <button className="btn-hyper" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                                            INTEL <ChevronRight size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MentorDashboard;
