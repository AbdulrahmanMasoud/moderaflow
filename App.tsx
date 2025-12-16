import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ConnectFacebook } from './components/ConnectFacebook';
import { Settings } from './components/Settings';
import { AIChatSimulator } from './components/AIChatSimulator';
import { Catalog } from './components/Catalog';
import { AdminUserList } from './components/AdminUserList';
import { AuthPage } from './components/AuthPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AuthProvider>
    </ToastProvider>
  );
};

const AppRoutes: React.FC = () => {
    const { session, loading } = useAuth();
    const [activePage, setActivePage] = useState('dashboard');

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
        );
    }

    return (
        <Routes>
            <Route path="/auth" element={!session ? <AuthPage /> : <Navigate to="/dashboard" replace />} />
            
            <Route path="/*" element={
                session ? (
                   <MainLayout activePage={activePage} setActivePage={setActivePage} />
                ) : (
                    <Navigate to="/auth" replace />
                )
            } />
        </Routes>
    );
}

const MainLayout: React.FC<{ activePage: string, setActivePage: (p: string) => void }> = ({ activePage, setActivePage }) => {
    
    // We handle custom navigation logic to keep sidebar state in sync with routes
    const NavigateHandler = (page: string) => {
        setActivePage(page);
        window.location.hash = `/${page}`;
    };

    // Sync active page with hash on mount/update (basic implementation)
    React.useEffect(() => {
        const hash = window.location.hash.replace('#/', '').split('/')[0];
        if (hash && hash !== activePage && hash !== 'auth') {
            setActivePage(hash);
        }
    }, []);

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">
        <Sidebar currentPage={activePage} onNavigate={NavigateHandler} />
        
        <main className="flex-1 md:ml-64 p-8 overflow-y-auto h-screen">
            <header className="flex justify-between items-center mb-8 md:hidden">
                <h1 className="text-xl font-bold text-indigo-600">ModeraFlow</h1>
            </header>

            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="/users" element={<AdminUserList />} />
                <Route path="/connect" element={<ConnectFacebook />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/simulation" element={<AIChatSimulator />} />
                <Route path="/logs" element={<div className="p-10 text-center text-slate-400">Activity Logs Placeholder</div>} />
            </Routes>
        </main>
        </div>
    );
}

export default App;