import React, { useState, useEffect } from 'react';
import { isAdminAuthenticated } from '../data/store.js';
import AuthGate from './AuthGate.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import './admin.css';

export default function AdminPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(isAdminAuthenticated());

  useEffect(() => {
    // Check initial authentication
    setIsAuthenticated(isAdminAuthenticated());

    // Listen to auth events
    const handleAuthChange = (e) => {
      if (e.detail?.type === 'auth') {
        setIsAuthenticated(isAdminAuthenticated());
      }
    };

    window.addEventListener('portfolio:data-changed', handleAuthChange);
    return () => {
      window.removeEventListener('portfolio:data-changed', handleAuthChange);
    };
  }, []);

  if (!isAuthenticated) {
    return <AuthGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return <AdminDashboard onLogout={() => setIsAuthenticated(false)} />;
}
