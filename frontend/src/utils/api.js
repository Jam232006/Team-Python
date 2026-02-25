import axios from 'axios';

const API = 'http://localhost:5000/api';

// Generic API call with error handling
export const apiCall = async (method, endpoint, data = null) => {
    try {
        const config = { method, url: `${API}${endpoint}` };
        if (data) config.data = data;
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(`API Error [${method} ${endpoint}]:`, error);
        throw error;
    }
};

// Organized API methods matching component expectations
export const api = {
    // Risk
    risk: {
        get: (userId) => apiCall('get', `/risk/${userId}`),
        getStudents: (mentorId, sortBy, sortOrder) => 
            apiCall('get', `/risk/students?mentorId=${mentorId}&sort=${sortBy}&order=${sortOrder}`),
        recalculate: (userId) => apiCall('post', `/risk/recalculate/${userId}`),
        stats: () => apiCall('get', '/risk/stats/all')
    },
    
    // Activity
    activity: {
        get: (userId) => apiCall('get', `/activity/${userId}`),
        log: (userId, type, title, submittedAt, dueDate, status, delay) => 
            apiCall('post', '/activity/log', { user_id: userId, activity_type: type, activity_title: title, submitted_at: submittedAt, due_date: dueDate, submission_status: status, submission_delay: delay })
    },
    
    // Alerts
    alerts: {
        getForStudent: (userId) => apiCall('get', `/alerts/for/student/${userId}`),
        getForMentor: (userId) => apiCall('get', `/alerts/for/mentor/${userId}`),
        getForAdmin: () => apiCall('get', '/alerts/for/admin'),
        resolve: (alertId) => apiCall('patch', `/alerts/${alertId}/resolve`),
        create: (data) => apiCall('post', '/alerts/create', data)
    },
    
    // Invites
    invites: {
        getForStudent: (studentId) => apiCall('get', `/invites/student/${studentId}`),
        getForMentor: (mentorId) => apiCall('get', `/invites/mentor/${mentorId}`),
        send: (mentorId, classId, identifier) => 
            apiCall('post', '/invites/send', { mentor_id: mentorId, class_id: classId, identifier }),
        respond: async (inviteId, action, userId) => {
            const endpoint = action === 'accept' ? `/invites/${inviteId}/accept` : `/invites/${inviteId}/reject`;
            return apiCall('post', endpoint, { student_id: userId });
        }
    },
    
    // Assignments
    assignments: {
        getPending: (studentId) => apiCall('get', `/assignments/student/${studentId}/pending`),
        getCompleted: (studentId) => apiCall('get', `/assignments/student/${studentId}/completed`),
        getByMentor: (mentorId) => apiCall('get', `/assignments/mentor/${mentorId}`),
        getByClass: (classId) => apiCall('get', `/assignments/class/${classId}`),
        getDetails: (assignmentId) => apiCall('get', `/assignments/${assignmentId}/details`),
        getClassResults: (assignmentId) => apiCall('get', `/assignments/${assignmentId}/class-results`),
        getResult: (assignmentId, studentId) => apiCall('get', `/assignments/${assignmentId}/result/${studentId}`),
        getStudentProfile: (studentId) => apiCall('get', `/assignments/student/${studentId}/profile`),
        create: (data) => apiCall('post', '/assignments/create', data),
        submit: (assignmentId, studentId, answers) => 
            apiCall('post', `/assignments/${assignmentId}/submit`, { student_id: studentId, answers })
    },
    
    // Classes
    classes: {
        getByStudent: (studentId) => apiCall('get', `/classes/student/${studentId}`),
        getByMentor: (mentorId) => apiCall('get', `/classes/mentor/${mentorId}`),
        get: (classId) => apiCall('get', `/classes/${classId}`),
        getMembers: (classId) => apiCall('get', `/classes/${classId}/members`),
        getInvite: (classId) => apiCall('get', `/classes/${classId}/invite`),
        create: (mentorId, name, description) => 
            apiCall('post', '/classes', { mentor_id: mentorId, name, description }),
        join: (studentId, inviteCode) => 
            apiCall('post', '/classes/join', { student_id: studentId, invite_code: inviteCode }),
        addMember: (classId, studentId) => 
            apiCall('post', `/classes/${classId}/members`, { student_id: studentId }),
        removeMember: (classId, studentId) => 
            apiCall('delete', `/classes/${classId}/members/${studentId}`)
    },
    
    // Users
    users: {
        get: (userId) => apiCall('get', `/users/${userId}`),
        getAll: () => apiCall('get', '/users'),
        getStudentsByMentor: (mentorId) => apiCall('get', `/users/mentor/${mentorId}/students`)
    },
    
    // Auth
    auth: {
        login: (email, password) => apiCall('post', '/auth/login', { email, password }),
        register: (name, email, password, role) => 
            apiCall('post', '/auth/register', { name, email, password, role }),
        createUser: (data) => apiCall('post', '/auth/admin/create-user', data)
    }
};
