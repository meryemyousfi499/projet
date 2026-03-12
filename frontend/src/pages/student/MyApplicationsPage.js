import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers } from 'react-icons/fi';

export default function MyApplicationsPage() {
  const navigate = useNavigate();
  // Redirect to group page since applications are managed there now
  useEffect(() => { navigate('/group', { replace: true }); }, []);
  return <div className="loading-spinner"><div className="spinner"></div><p style={{marginTop:8,color:'#6b7280'}}>Redirection...</p></div>;
}
