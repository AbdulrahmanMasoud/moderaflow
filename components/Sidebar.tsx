import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Facebook, Settings, Activity, Zap, LogOut, Command, ShoppingBag, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { user, signOut } = useAuth();
  const [orgName, setOrgName] = useState(user?.user_metadata?.org_name || 'Loading...');
  const [userRole, setUserRole] = useState<string>(user?.user_metadata?.role || 'user');

  // Computed property for UI
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (user) {
        const fetchTenantData = async () => {
            try {
                // Fetch both org_name and role from the Source of Truth (Database)
                // We use maybeSingle() to handle the case where the tenant record is missing without throwing an error
                const { data } = await supabase
                    .from('tenants')
                    .select('org_name, role')
                    .eq('id', user.id)
                    .maybeSingle();

                if (data) {
                    setOrgName(data.org_name);
                    // If DB has a role, use it. Otherwise fall back to metadata, then 'user'.
                    if (data.role) {
                        setUserRole(data.role);
                    }
                } else {
                    // Fallback for visual state if tenant is missing (AuthContext will heal this shortly)
                    setOrgName(user.user_metadata?.org_name || 'Personal');
                    // CRITICAL: If no tenant exists, force 'user' role to prevent ghost admins
                    setUserRole('user');
                }
            } catch (error) {
                console.error("Sidebar data fetch error:", error);
                setOrgName(user.user_metadata?.org_name || 'Personal');
            }
        };
        fetchTenantData();
    }
  }, [user]);

  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'catalog', label: 'Product Catalog', icon: ShoppingBag },
    { id: 'connect', label: 'Integrations', icon: Facebook },
    { id: 'simulation', label: 'Playground', icon: Zap },
    { id: 'logs', label: 'Events', icon: Activity },
  ];

  if (isAdmin) {
    menuItems.push({ id: 'users', label: 'User Management', icon: Users });
    menuItems.push({ id: 'settings', label: 'Settings', icon: Settings });
  }

  const handleLogout = async () => {
      await signOut();
  };

  return (
    <div className="w-64 bg-white h-screen fixed left-0 top-0 flex flex-col border-r border-slate-200 z-10 hidden md:flex">
      {/* Brand */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
            <Command size={18} />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            ModeraFlow
          </h1>
        </div>
        <p className="text-xs text-slate-500 pl-10 truncate" title={`Workspace: ${orgName}`}>Workspace: {orgName}</p>
        <span className={`ml-10 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
            {userRole}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-1">
        <p className="px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">Platform</p>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              currentPage === item.id
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <item.icon size={18} className={currentPage === item.id ? 'text-black' : 'text-slate-400'} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer / User Profile */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate" title={user?.email}>
                    {user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-slate-500 truncate" title={user?.email}>
                    {user?.email}
                </p>
            </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-slate-500 hover:text-red-600 text-sm transition-colors"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};