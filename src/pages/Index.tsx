import { useState } from 'react';
import { useAppStore, UserRole } from '@/store/useAppStore';
import LoginScreen from '@/components/LoginScreen';
import POSScreen from '@/components/pos/POSScreen';
import AdminScreen from '@/components/admin/AdminScreen';

const Index = () => {
  const { currentRole, setRole, logout } = useAppStore();

  const handleLogin = (role: UserRole) => {
    setRole(role);
  };

  const handleLogout = () => {
    logout();
  };

  // No role selected - show login
  if (!currentRole) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Admin role
  if (currentRole === 'admin') {
    return <AdminScreen onLogout={handleLogout} />;
  }

  // Bar or Food role
  return <POSScreen role={currentRole} onLogout={handleLogout} />;
};

export default Index;
