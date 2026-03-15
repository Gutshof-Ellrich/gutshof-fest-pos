import { useState } from 'react';
import { useAppStore, UserRole } from '@/store/useAppStore';
import LoginScreen from '@/components/LoginScreen';
import POSScreen from '@/components/pos/POSScreen';
import AdminScreen from '@/components/admin/AdminScreen';
import AdminPinDialog from '@/components/AdminPinDialog';

const Index = () => {
  const { currentRole, setRole, logout } = useAppStore();
  const [showPinDialog, setShowPinDialog] = useState(false);

  const handleLogin = (role: UserRole) => {
    if (role === 'admin') {
      setShowPinDialog(true);
    } else {
      setRole(role);
    }
  };

  const handleLogout = () => {
    logout();
  };

  // Show PIN dialog
  if (showPinDialog) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        <AdminPinDialog
          onSuccess={() => {
            setShowPinDialog(false);
            setRole('admin');
          }}
          onCancel={() => setShowPinDialog(false)}
        />
      </>
    );
  }

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
