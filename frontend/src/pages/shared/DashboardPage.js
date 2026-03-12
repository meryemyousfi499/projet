import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAdminDashboard, getSupervisorDashboard, getStudentDashboard } from '../../services/api';
import AdminDashboard from '../admin/AdminDashboard';
import SupervisorDashboard from '../supervisor/SupervisorDashboard';
import StudentDashboard from '../student/StudentDashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        let res;
        if (user.role === 'ROLE_ADMIN') res = await getAdminDashboard();
        else if (user.role === 'ROLE_SUPERVISOR') res = await getSupervisorDashboard();
        else res = await getStudentDashboard();
        setData(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchDashboard();
  }, [user]);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div><span>Chargement...</span></div>;

  if (user.role === 'ROLE_ADMIN') return <AdminDashboard data={data} />;
  if (user.role === 'ROLE_SUPERVISOR') return <SupervisorDashboard data={data} />;
  return <StudentDashboard data={data} />;
}
