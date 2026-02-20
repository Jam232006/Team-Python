import React from 'react';

export const Card = ({ children, className = '', onClick, style }) => (
    <div className={`card ${className}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', ...style }}>
        {children}
    </div>
);

export const Button = ({ children, onClick, variant = 'primary', disabled, style }) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className={variant === 'secondary' ? 'btn-secondary' : 'btn'}
        style={style}
    >
        {children}
    </button>
);

export const Badge = ({ children, type = 'low' }) => (
    <span className={`badge badge-${type.toLowerCase()}`}>{children}</span>
);

export const Input = ({ value, onChange, placeholder, type = 'text', style }) => (
    <input
        type={type}
        className="input"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={style}
    />
);

export const Table = ({ headers, children }) => (
    <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8f9fa' }}>
                <tr>
                    {headers.map((h, i) => (
                        <th key={i} style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#5f6368' }}>
                            {h}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>{children}</tbody>
        </table>
    </div>
);

export const Loading = ({ message = 'Loading...' }) => (
    <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>{message}</div>
);

export const StatCard = ({ icon: Icon, label, value, color }) => (
    <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <p style={{ color: '#5f6368', fontSize: '0.875rem', margin: '0 0 8px 0' }}>{label}</p>
                <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: '#202124' }}>{value}</h2>
            </div>
            <Icon size={24} color={color || 'var(--primary)'} />
        </div>
    </Card>
);
