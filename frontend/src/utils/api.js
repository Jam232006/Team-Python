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

// Specific API methods
export const api = {
    // Auth
    login: (credentials) => apiCall('post', '/auth/login', credentials),
    
    // Users
    getUser: (id) => apiCall('get', `/users/${id}`),
    
    // Classes
    getClassesByMentor: (mentorId) => apiCall('get', `/classes/mentor/${mentorId}`),
    getClassMembers: (classId) => apiCall('get', `/classes/${classId}/members`),
    getClassInvite: (classId) => apiCall('get', `/classes/${classId}/invite`),
    createClass: (data) => apiCall('post', '/classes', data),
    
    // Assignments
    getClassAssignments: (classId) => apiCall('get', `/assignments/class/${classId}`),
    getAssignmentResults: (assignmentId) => apiCall('get', `/assignments/${assignmentId}/class-results`),
    getMentorAssignments: (mentorId) => apiCall('get', `/assignments/mentor/${mentorId}`),
    getStudentProfile: (studentId) => apiCall('get', `/assignments/student/${studentId}/profile`),
    submitAssignment: (data) => apiCall('post', '/assignments/submit', data),
    
    // Risk
    getStudentsByMentor: (mentorId, sort, order) =>
        apiCall('get', `/risk/students?mentorId=${mentorId}&sort=${sort}&order=${order}`),
    
    // Alerts
    getAlertsForMentor: (mentorId) => apiCall('get', `/alerts/for/mentor/${mentorId}`),
    resolveAlert: (alertId) => apiCall('patch', `/alerts/${alertId}/resolve`),
    
    // Activity
    getActivity: (userId) => apiCall('get', `/activity/${userId}`),
    
    // Invites
    sendInvite: (data) => apiCall('post', '/invites/send', data)
};
