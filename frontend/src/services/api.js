import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (data) => API.post('/auth/login', data);
export const register = (data) => API.post('/auth/register', data);
export const getMe = () => API.get('/auth/me');
export const updateProfile = (data) => API.put('/auth/update-profile', data);
export const changePassword = (data) => API.put('/auth/change-password', data);
export const forgotPassword = (data) => API.post('/auth/forgot-password', data);
export const resetPassword = (token, data) => API.put(`/auth/reset-password/${token}`, data);

// Users
export const getUsers = (params) => API.get('/users', { params });
export const createUser = (data) => API.post('/users', data);
export const updateUser = (id, data) => API.put(`/users/${id}`, data);
export const deleteUser = (id) => API.delete(`/users/${id}`);
export const toggleUserStatus = (id) => API.patch(`/users/${id}/toggle-status`);
export const getSupervisors = () => API.get('/users/supervisors');

// Subjects
export const getSubjects = (params) => API.get('/subjects', { params });
export const getSubjectById = (id) => API.get(`/subjects/${id}`);
export const createSubject = (data) => API.post('/subjects', data);
export const updateSubject = (id, data) => API.put(`/subjects/${id}`, data);
export const validateSubject = (id, data) => API.patch(`/subjects/${id}/validate`, data);
export const deleteSubject = (id) => API.delete(`/subjects/${id}`);
export const getMySubjects = () => API.get('/subjects/my-subjects');

// Applications
export const applyToSubject = (subjectId, data) => API.post(`/applications/subject/${subjectId}`, data);
export const getApplications = (params) => API.get('/applications', { params });
export const updateApplication = (id, data) => API.put(`/applications/${id}`, data);
export const deleteApplication = (id) => API.delete(`/applications/${id}`);

// Projects
export const getProjects = (params) => API.get('/projects', { params });
export const getProjectById = (id) => API.get(`/projects/${id}`);
export const updateProject = (id, data) => API.put(`/projects/${id}`, data);

// Milestones
export const getMilestones = (projectId) => API.get(`/milestones/project/${projectId}`);
export const createMilestone = (projectId, data) => API.post(`/milestones/project/${projectId}`, data);
export const updateMilestone = (id, data) => API.put(`/milestones/${id}`, data);
export const deleteMilestone = (id) => API.delete(`/milestones/${id}`);

// Deliverables
export const getDeliverables = (projectId) => API.get(`/deliverables/project/${projectId}`);
export const uploadDeliverable = (projectId, formData) => API.post(`/deliverables/project/${projectId}`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteDeliverable = (id) => API.delete(`/deliverables/${id}`);

// Evaluations
export const getEvaluation = (projectId) => API.get(`/evaluations/project/${projectId}`);
export const createOrUpdateEvaluation = (projectId, data) => API.post(`/evaluations/project/${projectId}`, data);

// Notifications
export const getNotifications = () => API.get('/notifications');
export const markAsRead = (id) => API.patch(`/notifications/${id}/read`);
export const markAllAsRead = () => API.patch('/notifications/mark-all-read');
export const deleteNotification = (id) => API.delete(`/notifications/${id}`);

// Dashboard
export const getAdminDashboard = () => API.get('/dashboard/admin');
export const getSupervisorDashboard = () => API.get('/dashboard/supervisor');
export const getStudentDashboard = () => API.get('/dashboard/student');

export default API;

// Messages
export const getMessages = (projectId) => API.get(`/messages/${projectId}`);
export const sendMessage = (projectId, data) => API.post(`/messages/${projectId}`, data);
export const sendFile = (projectId, formData) => API.post(`/messages/${projectId}/upload`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const getUnreadCounts = () => API.get('/messages/unread-counts');

// Groups
export const getMyGroup        = ()       => API.get('/groups/my');
export const getMyInvitations  = ()       => API.get('/groups/invitations');
export const createGroup       = (data)   => API.post('/groups', data);
export const inviteMember      = (data)   => API.post('/groups/invite', data);
export const respondInvitation = (id, d)  => API.post(`/groups/${id}/respond`, d);
export const leaveGroup        = ()       => API.delete('/groups/leave');
export const deleteGroup       = ()       => API.delete('/groups');
export const removeMember      = (userId) => API.delete(`/groups/members/${userId}`);
export const getAllGroups       = ()       => API.get('/groups');
