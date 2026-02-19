import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, Terminal, Cpu, ArrowRight, Zap, Users, BookOpen, Lock } from 'lucide-react';
import axios from 'axios';

const Login = () => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { login } = useAuth();

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (isRegistering) {
            try {
                await axios.post('http://localhost:5000/api/auth/register', { name, email, password, role });
                setSuccess('IDENTITY CREATED. INITIALIZE LOGIN.');
                setIsRegistering(false);
            } catch (err) {
                setError(err.response?.data?.error || 'PROTOCOL ERROR');
            }
        } else {
            try {
                await login(email, password);
            } catch (err) {
                setError(err.error || 'ACCESS DENIED');
            }
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            padding: '24px',
            background: 'var(--bg-black)',
            position: 'relative'
        }}>
            {/* Background Accent Deco */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(110, 0, 255, 0.1) 0%, transparent 70%)',
                zIndex: 0
            }}></div>

            <div className="obsidian-card animate-reveal" style={{
                width: '100%',
                maxWidth: '500px',
                padding: '60px',
                zIndex: 1
            }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{
                        width: '72px',
                        height: '72px',
                        background: 'linear-gradient(135deg, var(--secondary), var(--primary))',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 24px',
                        boxShadow: '0 0 30px rgba(110, 0, 255, 0.3)'
                    }}>
                        <Shield size={36} color="white" />
                    </div>
                    <h1 className="title-xl" style={{ fontSize: '2.8rem' }}>InsightShield</h1>
                    <div style={{
                        marginTop: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        color: 'var(--text-muted)',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        letterSpacing: '0.1em'
                    }}>
                        <Terminal size={14} /> {isRegistering ? 'NEW ENTITY REGISTRATION' : 'SYSTEM v2.0 READY'}
                    </div>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(255, 0, 85, 0.1)',
                        color: 'var(--accent)',
                        padding: '16px',
                        borderRadius: '12px',
                        marginBottom: '24px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        border: '1px solid var(--accent)',
                        textAlign: 'center',
                        textTransform: 'uppercase'
                    }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={{
                        background: 'rgba(0, 255, 159, 0.1)',
                        color: 'var(--primary)',
                        padding: '16px',
                        borderRadius: '12px',
                        marginBottom: '24px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        border: '1px solid var(--primary)',
                        textAlign: 'center',
                        textTransform: 'uppercase'
                    }}>
                        {success}
                    </div>
                )}

                <form onSubmit={handleAuth}>
                    {isRegistering && (
                        <div style={{ marginBottom: '20px' }}>
                            <input
                                className="hyper-input"
                                type="text"
                                placeholder="IDENTIFIER NAME"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <div style={{ marginBottom: '20px' }}>
                        <input
                            className="hyper-input"
                            type="email"
                            placeholder="ENCRYPTED EMAIL"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '24px', position: 'relative' }}>
                        <input
                            className="hyper-input"
                            type={showPassword ? "text" : "password"}
                            placeholder="SECURITY ACCESS KEY"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <div
                            onClick={() => setShowPassword(!showPassword)}
                            style={{ position: 'absolute', right: '20px', top: '18px', cursor: 'pointer', color: 'var(--text-muted)' }}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </div>
                    </div>

                    {isRegistering && (
                        <div style={{ marginBottom: '32px' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.12em', marginBottom: '14px' }}>
                                SELECT ACCESS TIER
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[
                                    {
                                        value: 'student',
                                        icon: <BookOpen size={20} />,
                                        label: 'TIER 3 — STUDENT TERMINAL',
                                        desc: 'Log activity, track assignments & monitor your performance trajectory.'
                                    },
                                    {
                                        value: 'mentor',
                                        icon: <Users size={20} />,
                                        label: 'TIER 2 — MENTOR CONSOLE',
                                        desc: 'Oversee your assigned student squad and receive behavioral risk alerts.'
                                    }
                                ].map(tier => (
                                    <div
                                        key={tier.value}
                                        onClick={() => setRole(tier.value)}
                                        style={{
                                            padding: '18px 20px',
                                            borderRadius: '16px',
                                            border: `2px solid ${role === tier.value ? 'var(--primary)' : 'var(--glass-border)'}`,
                                            background: role === tier.value ? 'rgba(0, 255, 159, 0.06)' : 'rgba(255,255,255,0.02)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '16px',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div style={{ color: role === tier.value ? 'var(--primary)' : 'var(--text-muted)', marginTop: '2px', flexShrink: 0 }}>
                                            {tier.icon}
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.08em', color: role === tier.value ? 'var(--primary)' : 'var(--text-pure)', marginBottom: '4px' }}>
                                                {tier.label}
                                            </p>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{tier.desc}</p>
                                        </div>
                                    </div>
                                ))}
                                <div style={{
                                    padding: '16px 20px',
                                    borderRadius: '16px',
                                    border: '1px dashed rgba(255,0,85,0.3)',
                                    background: 'rgba(255,0,85,0.03)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px',
                                    opacity: 0.7
                                }}>
                                    <Lock size={18} color="var(--accent)" style={{ flexShrink: 0 }} />
                                    <div>
                                        <p style={{ fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: '2px' }}>
                                            TIER 1 — ADMIN TERMINAL
                                        </p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            Restricted. Admin accounts are provisioned exclusively by an existing administrator.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <button type="submit" className="btn-hyper" style={{ width: '100%', height: '64px' }}>
                        {isRegistering ? (
                            <>INITIALIZE REGISTRY <Cpu size={20} /></>
                        ) : (
                            <>ESTABLISH CONNECTION <ArrowRight size={20} /></>
                        )}
                    </button>
                </form>

                <div style={{ marginTop: '40px', textAlign: 'center' }}>
                    <button
                        onClick={() => setIsRegistering(!isRegistering)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            width: '100%'
                        }}
                    >
                        <Zap size={14} color="var(--primary)" />
                        {isRegistering ? 'ALREADY REGISTERED? AUTHENTICATE' : 'NEW ENTITY? INITIALIZE NEW KEY'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
