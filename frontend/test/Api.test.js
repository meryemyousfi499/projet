import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import API, {
  login, register, getMe, updateProfile, changePassword,
  getSubjects, getSubjectById, createSubject, updateSubject, deleteSubject, getMySubjects, validateSubject,
  applyToSubject, getApplications, updateApplication, deleteApplication,
  getProjects, getProjectById, updateProject,
  getMilestones, createMilestone, updateMilestone, deleteMilestone,
  getDeliverables, uploadDeliverable, deleteDeliverable,
  getEvaluation, createOrUpdateEvaluation,
  getNotifications, markAsRead, markAllAsRead, deleteNotification,
  getAdminDashboard, getSupervisorDashboard, getStudentDashboard,
  getMessages, sendMessage, sendFile, getUnreadCounts,
  getMyGroup, getMyInvitations, createGroup, inviteMember, respondInvitation,
  leaveGroup, deleteGroup, removeMember, getAllGroups,
} from '../src/services/api';

const mock = new MockAdapter(API);

beforeEach(() => {
  mock.reset();
  localStorage.clear();
});

// ─── Auth ────────────────────────────────────────────────────────────────────

describe('Auth endpoints', () => {
  test('login() posts credentials', async () => {
    mock.onPost('/auth/login').reply(200, { token: 'abc' });
    const res = await login({ email: 'a@b.com', password: '123' });
    expect(res.data).toEqual({ token: 'abc' });
  });

  test('register() posts user data', async () => {
    mock.onPost('/auth/register').reply(201, { data: { _id: '1' } });
    const res = await register({ nom: 'A', prenom: 'B', email: 'a@b.com', password: '123' });
    expect(res.status).toBe(201);
  });

  test('getMe() calls GET /auth/me', async () => {
    mock.onGet('/auth/me').reply(200, { data: { _id: '1' } });
    const res = await getMe();
    expect(res.data.data._id).toBe('1');
  });

  test('updateProfile() calls PUT /auth/update-profile', async () => {
    mock.onPut('/auth/update-profile').reply(200, { data: { nom: 'Durand' } });
    const res = await updateProfile({ nom: 'Durand' });
    expect(res.data.data.nom).toBe('Durand');
  });

  test('changePassword() calls PUT /auth/change-password', async () => {
    mock.onPut('/auth/change-password').reply(200, { message: 'ok' });
    const res = await changePassword({ currentPassword: 'old', newPassword: 'new' });
    expect(res.data.message).toBe('ok');
  });
});

// ─── Request interceptor attaches token ──────────────────────────────────────

describe('Request interceptor', () => {
  test('adds Authorization header when token in localStorage', async () => {
    localStorage.setItem('token', 'my-token');
    let capturedHeaders;
    mock.onGet('/auth/me').reply((config) => {
      capturedHeaders = config.headers;
      return [200, {}];
    });
    await getMe();
    expect(capturedHeaders.Authorization).toBe('Bearer my-token');
  });

  test('does not add Authorization header when no token', async () => {
    let capturedHeaders;
    mock.onGet('/auth/me').reply((config) => {
      capturedHeaders = config.headers;
      return [200, {}];
    });
    await getMe();
    expect(capturedHeaders.Authorization).toBeUndefined();
  });
});

// ─── 401 interceptor ─────────────────────────────────────────────────────────

describe('Response interceptor (401)', () => {
  test('clears storage and redirects on 401', async () => {
    localStorage.setItem('token', 'old');
    localStorage.setItem('user', '{}');
    delete window.location;
    window.location = { href: '' };
    mock.onGet('/auth/me').reply(401);
    await getMe().catch(() => {});
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(window.location.href).toBe('/login');
  });
});

// ─── Subjects ────────────────────────────────────────────────────────────────

describe('Subjects endpoints', () => {
  test('getSubjects() passes params', async () => {
    mock.onGet('/subjects').reply(200, { data: [] });
    const res = await getSubjects({ statut: 'validé' });
    expect(res.data.data).toEqual([]);
  });

  test('getSubjectById() calls GET /subjects/:id', async () => {
    mock.onGet('/subjects/42').reply(200, { data: { _id: '42' } });
    const res = await getSubjectById('42');
    expect(res.data.data._id).toBe('42');
  });

  test('createSubject() posts data', async () => {
    mock.onPost('/subjects').reply(201, { data: { _id: 'new' } });
    const res = await createSubject({ titre: 'Test' });
    expect(res.data.data._id).toBe('new');
  });

  test('updateSubject() calls PUT /subjects/:id', async () => {
    mock.onPut('/subjects/42').reply(200, { data: { titre: 'Updated' } });
    const res = await updateSubject('42', { titre: 'Updated' });
    expect(res.data.data.titre).toBe('Updated');
  });

  test('deleteSubject() calls DELETE /subjects/:id', async () => {
    mock.onDelete('/subjects/42').reply(200);
    const res = await deleteSubject('42');
    expect(res.status).toBe(200);
  });

  test('getMySubjects() calls GET /subjects/my-subjects', async () => {
    mock.onGet('/subjects/my-subjects').reply(200, { data: [] });
    const res = await getMySubjects();
    expect(res.data.data).toEqual([]);
  });

  test('validateSubject() calls PATCH /subjects/:id/validate', async () => {
    mock.onPatch('/subjects/42/validate').reply(200, { data: { statut: 'validé' } });
    const res = await validateSubject('42', { statut: 'validé' });
    expect(res.data.data.statut).toBe('validé');
  });
});

// ─── Applications ─────────────────────────────────────────────────────────────

describe('Applications endpoints', () => {
  test('applyToSubject() posts to /applications/subject/:id', async () => {
    mock.onPost('/applications/subject/s1').reply(201, { data: { _id: 'app1' } });
    const res = await applyToSubject('s1', { motivation: 'Je veux...' });
    expect(res.data.data._id).toBe('app1');
  });

  test('getApplications() calls GET /applications with params', async () => {
    mock.onGet('/applications').reply(200, { data: [] });
    const res = await getApplications({ statut: 'en attente' });
    expect(res.data.data).toEqual([]);
  });

  test('updateApplication() calls PUT /applications/:id', async () => {
    mock.onPut('/applications/a1').reply(200, { data: { statut: 'accepté' } });
    const res = await updateApplication('a1', { statut: 'accepté' });
    expect(res.data.data.statut).toBe('accepté');
  });

  test('deleteApplication() calls DELETE /applications/:id', async () => {
    mock.onDelete('/applications/a1').reply(200);
    const res = await deleteApplication('a1');
    expect(res.status).toBe(200);
  });
});

// ─── Projects ────────────────────────────────────────────────────────────────

describe('Projects endpoints', () => {
  test('getProjects() calls GET /projects', async () => {
    mock.onGet('/projects').reply(200, { data: [{ _id: 'p1' }] });
    const res = await getProjects();
    expect(res.data.data).toHaveLength(1);
  });

  test('getProjectById() calls GET /projects/:id', async () => {
    mock.onGet('/projects/p1').reply(200, { data: { _id: 'p1' } });
    const res = await getProjectById('p1');
    expect(res.data.data._id).toBe('p1');
  });

  test('updateProject() calls PUT /projects/:id', async () => {
    mock.onPut('/projects/p1').reply(200, { data: { progression: 50 } });
    const res = await updateProject('p1', { progression: 50 });
    expect(res.data.data.progression).toBe(50);
  });
});

// ─── Milestones ───────────────────────────────────────────────────────────────

describe('Milestones endpoints', () => {
  test('getMilestones() calls GET /milestones/project/:id', async () => {
    mock.onGet('/milestones/project/p1').reply(200, { data: [] });
    const res = await getMilestones('p1');
    expect(res.data.data).toEqual([]);
  });

  test('createMilestone() posts to /milestones/project/:id', async () => {
    mock.onPost('/milestones/project/p1').reply(201, { data: { _id: 'm1' } });
    const res = await createMilestone('p1', { titre: 'M1' });
    expect(res.data.data._id).toBe('m1');
  });

  test('updateMilestone() calls PUT /milestones/:id', async () => {
    mock.onPut('/milestones/m1').reply(200, { data: { titre: 'Updated' } });
    const res = await updateMilestone('m1', { titre: 'Updated' });
    expect(res.data.data.titre).toBe('Updated');
  });

  test('deleteMilestone() calls DELETE /milestones/:id', async () => {
    mock.onDelete('/milestones/m1').reply(200);
    const res = await deleteMilestone('m1');
    expect(res.status).toBe(200);
  });
});

// ─── Deliverables ─────────────────────────────────────────────────────────────

describe('Deliverables endpoints', () => {
  test('getDeliverables() calls GET /deliverables/project/:id', async () => {
    mock.onGet('/deliverables/project/p1').reply(200, { data: [] });
    const res = await getDeliverables('p1');
    expect(res.data.data).toEqual([]);
  });

  test('uploadDeliverable() posts multipart to /deliverables/project/:id', async () => {
    mock.onPost('/deliverables/project/p1').reply(201, { data: { _id: 'd1' } });
    const formData = new FormData();
    const res = await uploadDeliverable('p1', formData);
    expect(res.data.data._id).toBe('d1');
  });

  test('deleteDeliverable() calls DELETE /deliverables/:id', async () => {
    mock.onDelete('/deliverables/d1').reply(200);
    const res = await deleteDeliverable('d1');
    expect(res.status).toBe(200);
  });
});

// ─── Evaluations ──────────────────────────────────────────────────────────────

describe('Evaluations endpoints', () => {
  test('getEvaluation() calls GET /evaluations/project/:id', async () => {
    mock.onGet('/evaluations/project/p1').reply(200, { data: { noteFinale: 15 } });
    const res = await getEvaluation('p1');
    expect(res.data.data.noteFinale).toBe(15);
  });

  test('createOrUpdateEvaluation() posts to /evaluations/project/:id', async () => {
    mock.onPost('/evaluations/project/p1').reply(200, { data: { noteFinale: 18 } });
    const res = await createOrUpdateEvaluation('p1', { noteFinale: 18 });
    expect(res.data.data.noteFinale).toBe(18);
  });
});

// ─── Notifications ────────────────────────────────────────────────────────────

describe('Notifications endpoints', () => {
  test('getNotifications() calls GET /notifications', async () => {
    mock.onGet('/notifications').reply(200, { data: [] });
    const res = await getNotifications();
    expect(res.data.data).toEqual([]);
  });

  test('markAsRead() calls PATCH /notifications/:id/read', async () => {
    mock.onPatch('/notifications/n1/read').reply(200);
    const res = await markAsRead('n1');
    expect(res.status).toBe(200);
  });

  test('markAllAsRead() calls PATCH /notifications/mark-all-read', async () => {
    mock.onPatch('/notifications/mark-all-read').reply(200);
    const res = await markAllAsRead();
    expect(res.status).toBe(200);
  });

  test('deleteNotification() calls DELETE /notifications/:id', async () => {
    mock.onDelete('/notifications/n1').reply(200);
    const res = await deleteNotification('n1');
    expect(res.status).toBe(200);
  });
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

describe('Dashboard endpoints', () => {
  test('getAdminDashboard() calls GET /dashboard/admin', async () => {
    mock.onGet('/dashboard/admin').reply(200, { data: {} });
    const res = await getAdminDashboard();
    expect(res.status).toBe(200);
  });

  test('getSupervisorDashboard() calls GET /dashboard/supervisor', async () => {
    mock.onGet('/dashboard/supervisor').reply(200, { data: {} });
    const res = await getSupervisorDashboard();
    expect(res.status).toBe(200);
  });

  test('getStudentDashboard() calls GET /dashboard/student', async () => {
    mock.onGet('/dashboard/student').reply(200, { data: {} });
    const res = await getStudentDashboard();
    expect(res.status).toBe(200);
  });
});

// ─── Messages ─────────────────────────────────────────────────────────────────

describe('Messages endpoints', () => {
  test('getMessages() calls GET /messages/:projectId', async () => {
    mock.onGet('/messages/p1').reply(200, { data: [] });
    const res = await getMessages('p1');
    expect(res.data.data).toEqual([]);
  });

  test('sendMessage() posts to /messages/:projectId', async () => {
    mock.onPost('/messages/p1').reply(201, { data: { _id: 'msg1', content: 'hello' } });
    const res = await sendMessage('p1', { content: 'hello' });
    expect(res.data.data.content).toBe('hello');
  });

  test('sendFile() posts multipart to /messages/:projectId/upload', async () => {
    mock.onPost('/messages/p1/upload').reply(201, { data: { _id: 'msg2' } });
    const formData = new FormData();
    const res = await sendFile('p1', formData);
    expect(res.data.data._id).toBe('msg2');
  });

  test('getUnreadCounts() calls GET /messages/unread-counts', async () => {
    mock.onGet('/messages/unread-counts').reply(200, { data: {} });
    const res = await getUnreadCounts();
    expect(res.status).toBe(200);
  });
});

// ─── Groups ───────────────────────────────────────────────────────────────────

describe('Groups endpoints', () => {
  test('getMyGroup() calls GET /groups/my', async () => {
    mock.onGet('/groups/my').reply(200, { data: { nom: 'Alpha' } });
    const res = await getMyGroup();
    expect(res.data.data.nom).toBe('Alpha');
  });

  test('getMyInvitations() calls GET /groups/invitations', async () => {
    mock.onGet('/groups/invitations').reply(200, { data: [] });
    const res = await getMyInvitations();
    expect(res.data.data).toEqual([]);
  });

  test('createGroup() posts to /groups', async () => {
    mock.onPost('/groups').reply(201, { data: { _id: 'g1', nom: 'Beta' } });
    const res = await createGroup({ nom: 'Beta' });
    expect(res.data.data.nom).toBe('Beta');
  });

  test('inviteMember() posts to /groups/invite', async () => {
    mock.onPost('/groups/invite').reply(200);
    const res = await inviteMember({ userId: 'u1' });
    expect(res.status).toBe(200);
  });

  test('respondInvitation() posts to /groups/:id/respond', async () => {
    mock.onPost('/groups/g1/respond').reply(200);
    const res = await respondInvitation('g1', { accepted: true });
    expect(res.status).toBe(200);
  });

  test('leaveGroup() calls DELETE /groups/leave', async () => {
    mock.onDelete('/groups/leave').reply(200);
    const res = await leaveGroup();
    expect(res.status).toBe(200);
  });

  test('deleteGroup() calls DELETE /groups', async () => {
    mock.onDelete('/groups').reply(200);
    const res = await deleteGroup();
    expect(res.status).toBe(200);
  });

  test('removeMember() calls DELETE /groups/members/:userId', async () => {
    mock.onDelete('/groups/members/u1').reply(200);
    const res = await removeMember('u1');
    expect(res.status).toBe(200);
  });

  test('getAllGroups() calls GET /groups', async () => {
    mock.onGet('/groups').reply(200, { data: [] });
    const res = await getAllGroups();
    expect(res.data.data).toEqual([]);
  });
});
