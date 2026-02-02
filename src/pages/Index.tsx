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

  // Bar, Food, or Combined role
  if (currentRole === 'bar' || currentRole === 'food' || currentRole === 'combined') {
    return <POSScreen role={currentRole} onLogout={handleLogout} />;
  }

  // Fallback
  return <LoginScreen onLogin={handleLogin} />;
};

export default Index;
