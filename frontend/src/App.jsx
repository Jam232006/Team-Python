import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import MentorDashboard from './components/MentorDashboard';
import StudentDashboard from './components/StudentDashboard';
import { LogOut, ShieldCheck, AlertTriangle } from 'lucide-react';

function App() {
    const { user, logout, loading } = useAuth();
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const handleError = (error) => {
            console.error('App Runtime Error:', error);
            setHasError(true);
            setErrorMessage(error.message || 'Unknown Runtime Error');
        };

        window.addEventListener('error', handleError);
        return () => window.removeEventListener('error', handleError);
    }, []);

    if (hasError) {
        return (
            <div style={{ padding: '40px', background: '#020408', color: '#ff0055', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={64} style={{ marginBottom: '20px' }} />
                <h1 style={{ marginBottom: '10px' }}>SYSTEM CRITICAL ERROR</h1>
                <p style={{ fontFamily: 'monospace', background: 'rgba(255,0,85,0.1)', padding: '20px', borderRadius: '10px' }}>{errorMessage}</p>
                <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px', background: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>REBOOT SYSTEM</button>
            </div>
        );
    }

    if (loading) return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#020408',
            color: '#00ff9f',
            fontFamily: 'JetBrains Mono'
        }}>
            INITIALIZING SHIELD_OS...
        </div>
    );

    if (!user) {
        return <Login />;
    }

    const renderDashboard = () => {
        try {
            switch (user.role) {
                case 'admin': return <AdminDashboard />;
                case 'mentor': return <MentorDashboard />;
                case 'student': return <StudentDashboard />;
                default: return <div style={{ color: 'white', padding: '40px' }}>SYSTEM ERROR: UNAUTHORIZED ROLE ({user.role})</div>;
            }
        } catch (e) {
            setHasError(true);
            setErrorMessage(e.message);
            return null;
        }
    };

    return (
        <ToastProvider>
            <div className="shield-root">
                <header className="obsidian-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'linear-gradient(135deg, #6e00ff, #00ff9f)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <ShieldCheck color="white" size={24} />
                        </div>
                        <h1 className="title-xl" style={{ fontSize: '1.5rem', letterSpacing: '0.05em' }}>InsightShield</h1>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-pure)' }}>{user?.name?.toUpperCase() || 'USER'}</p>
                            <p style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.1em' }}>{(user?.role || 'null').toUpperCase()} LEVEL ACCESS</p>
                        </div>
                        <button
                            onClick={logout}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '10px',
                                borderRadius: '12px',
                                transition: 'all 0.3s'
                            }}
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </header>

                <main>
                    {renderDashboard()}
                </main>
            </div>
        </ToastProvider>
    );
}

export default App;
