import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Auth APIs
export const authAPI = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (email, password, full_name) => api.post('/auth/register', { email, password, full_name }),
    getMe: () => api.get('/auth/me')
};

// Agent APIs
export const agentAPI = {
    getAll: () => api.get('/agents'),
    getById: (id) => api.get(`/agents/${id}`),
    create: (data) => api.post('/agents', data),
    update: (id, data) => api.put(`/agents/${id}`, data),
    delete: (id) => api.delete(`/agents/${id}`)
};

export const welcomeEmailAPI = {
    getConfig: () => api.get('/welcome-emails/config'),
    updateConfig: (data) => api.put('/welcome-emails/config', data),
    getLogs: (params) => api.get('/welcome-emails/logs', { params }),
    getStats: () => api.get('/welcome-emails/stats'),
    testEmail: (email) => api.post('/welcome-emails/test', { email }),
    runNow: () => api.post('/welcome-emails/run-now'),
    getSchedulerStatus: () => api.get('/welcome-emails/scheduler-status')
};

// Client APIs
export const clientAPI = {
    getAll: () => api.get('/clients'),
    getById: (id) => api.get(`/clients/${id}`),
    create: (data) => api.post('/clients', data),
    update: (id, data) => api.put(`/clients/${id}`, data),
    delete: (id) => api.delete(`/clients/${id}`)
};

// Assignment APIs
export const assignmentAPI = {
    getAll: () => api.get('/assignments'),
    getById: (id) => api.get(`/assignments/${id}`),
    create: (data) => api.post('/assignments', data),
    update: (id, data) => api.put(`/assignments/${id}`, data),
    delete: (id) => api.delete(`/assignments/${id}`)
};

// Message APIs
export const messageAPI = {
    getByAssignment: (assignmentId) => api.get(`/messages/assignment/${assignmentId}`),
    send: (data) => api.post('/messages/send', data),

    // ✅ ADD THESE NEW ENDPOINTS
    getPendingReplies: () => api.get('/messages/pending-replies'),
    getReplyStatus: (assignmentId) => api.get(`/messages/reply-status/${assignmentId}`)
};

// Test Connection APIs
export const testConnectionAPI = {
    testFull: (data) => api.post('/test-connection/full', data),
    testSMTP: (data) => api.post('/test-connection/smtp', data),
    testIMAP: (data) => api.post('/test-connection/imap', data)
};

export const paymentGatewayAPI = {
    getCredentials: () => api.get('/payment-gateway/credentials'),
    saveCredentials: (data) => api.post('/payment-gateway/credentials', data),
    testCredentials: () => api.post('/payment-gateway/test-credentials'),
    getSchedule: () => api.get('/payment-gateway/schedule'),
    updateSchedule: (data) => api.post('/payment-gateway/schedule', data),
    runManualCheck: (filterType = 'all') => api.post('/payment-gateway/check-now', { filterType }), // ✅ UPDATED
    getLogs: () => api.get('/payment-gateway/logs'),
    getTransactions: (params) => api.get('/payment-gateway/transactions', { params }),
    getDashboardSummary: () => api.get('/payment-gateway/dashboard')
};

export const merchantAPI = {
    // Accounts
    getAllAccounts: () => api.get('/merchants/accounts'),
    addAccount: (data) => api.post('/merchants/accounts', data),
    testCredentials: (data) => api.post('/merchants/accounts/test', data),  // ✅ ADD THIS

    updateAccount: (id, data) => api.put(`/merchants/accounts/${id}`, data),
    deleteAccount: (id) => api.delete(`/merchants/accounts/${id}`),

    // Conversations
    getAllConversations: (params) => api.get('/merchants/conversations', { params }),
    markAsReplied: (id) => api.post(`/merchants/conversations/${id}/mark-replied`),
    snoozeReminder: (id, hours) => api.post(`/merchants/conversations/${id}/snooze`, { hours }),

    // Dashboard
    getDashboard: () => api.get('/merchants/dashboard')
};

export default api;