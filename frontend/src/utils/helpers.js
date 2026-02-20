// Format date consistently
export const formatDate = (date) => new Date(date).toLocaleDateString();
export const formatDateTime = (date) => new Date(date).toLocaleString();

// Calculate percentage
export const percentage = (part, whole) => whole > 0 ? Math.round((part / whole) * 100) : 0;

// Get risk color
export const getRiskColor = (level) => {
    const colors = { high: 'var(--accent)', medium: '#ffaa00', low: 'var(--secondary)' };
    return colors[level?.toLowerCase()] || colors.low;
};

// Get alert color
export const getAlertColor = (type) => {
    const colors = {
        risk_change: 'var(--accent)',
        assignment_date_passed: '#ffaa00',
        invite_accepted: 'var(--secondary)'
    };
    return colors[type] || 'var(--primary)';
};

// Truncate text
export const truncate = (text, length = 50) =>
    text?.length > length ? text.substring(0, length) + '...' : text;

// Sort array by key
export const sortBy = (arr, key, order = 'asc') => 
    [...arr].sort((a, b) => {
        const valA = a[key] || 0;
        const valB = b[key] || 0;
        return order === 'asc' ? valA - valB : valB - valA;
    });

// Filter by search term
export const filterBySearch = (items, searchTerm, keys) =>
    items.filter(item =>
        keys.some(key =>
            item[key]?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );
