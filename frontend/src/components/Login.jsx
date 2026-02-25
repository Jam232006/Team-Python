import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Users, BookOpen, Shield } from 'lucide-react';
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
                setSuccess('Account created successfully! You can now log in.');
                setIsRegistering(false);
            } catch (err) {
                setError(err.response?.data?.error || 'Registration failed');
            }
        } else {
            try {
                await login(email, password);
            } catch (err) {
                setError(err.error || 'Invalid email or password');
            }
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            padding: '24px',
            background: 'var(--bg-main)'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '480px',
                background: 'white',
                borderRadius: '16px',
                padding: '48px',
                border: '1px solid var(--border-light)',
                boxShadow: '0 1px 3px 0 rgba(60, 64, 67, .1), 0 4px 8px 3px rgba(60, 64, 67, .06)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'var(--primary)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px'
                    }}>
                        <Shield size={32} color="white" />
                    </div>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '8px', fontWeight: 600 }}>InsightShield</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        {isRegistering ? 'Create your account' : 'Sign in to continue'}
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: 'var(--accent-light)',
                        color: 'var(--accent)',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        fontSize: '0.9rem',
                        border: '1px solid var(--accent)'
                    }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={{
                        background: 'var(--secondary-light)',
                        color: 'var(--secondary)',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        fontSize: '0.9rem',
                        border: '1px solid var(--secondary)'
                    }}>
                        {success}
                    </div>
                )}

                <form onSubmit={handleAuth}>
                    {isRegistering && (
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                                Name
                            </label>
                            <input
                                className="input"
                                type="text"
                                placeholder="Enter your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                            Email
                        </label>
                        <input
                            className="input"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="input"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <div
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ 
                                    position: 'absolute', 
                                    right: '12px', 
                                    top: '50%', 
                                    transform: 'translateY(-50%)',
                                    cursor: 'pointer', 
                                    color: 'var(--text-muted)' 
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </div>
                        </div>
                    </div>

                    {isRegistering && (
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '12px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                                Account Type
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {[
                                    {
                                        value: 'admin',
                                        icon: <Shield size={18} />,
                                        label: 'Administrator',
                                        desc: 'Manage all users and platform settings'
                                    },
                                    {
                                        value: 'mentor',
                                        icon: <Users size={18} />,
                                        label: 'Mentor',
                                        desc: 'Oversee students and create assignments'
                                    },
                                    {
                                        value: 'student',
                                        icon: <BookOpen size={18} />,
                                        label: 'Student',
                                        desc: 'Track your learning and assignments'
                                    }
                                ].map(tier => (
                                    <div
                                        key={tier.value}
                                        onClick={() => setRole(tier.value)}
                                        style={{
                                            padding: '14px 16px',
                                            borderRadius: '12px',
                                            border: `2px solid ${role === tier.value ? 'var(--primary)' : 'var(--border)'}`,
                                            background: role === tier.value ? 'var(--primary-light)' : 'white',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div style={{ color: role === tier.value ? 'var(--primary)' : 'var(--text-muted)' }}>
                                            {tier.icon}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ 
                                                fontWeight: 600, 
                                                fontSize: '0.95rem', 
                                                color: role === tier.value ? 'var(--primary)' : 'var(--text-primary)', 
                                                marginBottom: '2px' 
                                            }}>
                                                {tier.label}
                                            </p>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{tier.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button type="submit" className="btn" style={{ width: '100%', padding: '14px', fontSize: '1rem' }}>
                        {isRegistering ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                    <button
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setError('');
                            setSuccess('');
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 500
                        }}
                    >
                        {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default React.memo(Login);
