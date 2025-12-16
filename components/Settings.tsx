import React, { useEffect, useState } from 'react';
import { Save, Loader2, Building2, CreditCard, User, Lock, Settings as SettingsIcon } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { AppSettings, Tenant } from '../types';
import { useToast } from '../context/ToastContext';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'workspace'>('profile');
  
  // Tenant State
  const [tenant, setTenant] = useState<Tenant | null>(null);
  
  // Computed Admin Check
  const isAdmin = tenant?.role === 'admin';

  // Profile State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // App Settings State (Admin Only)
  const [settings, setSettings] = useState<AppSettings>({
    n8n_webhook_url: '',
    n8n_webhook_secret: '',
    supabase_url: '',
    supabase_key: '',
    facebook_app_id: ''
  });

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Tenant Details
        const { data: tenantData } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
        
        if (tenantData) setTenant(tenantData);

        // Fetch App Settings only if needed
        const { data: settingsData } = await supabase
          .from('app_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (settingsData) {
          setSettings({
            n8n_webhook_url: settingsData.n8n_webhook_url || '',
            n8n_webhook_secret: settingsData.n8n_webhook_secret || '',
            supabase_url: settingsData.supabase_url || '',
            supabase_key: settingsData.supabase_key || '',
            facebook_app_id: settingsData.facebook_app_id || ''
          });
        }
      } catch (err) {
        console.error("Error loading data", err);
        addToast("Error loading profile data", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
        if (password) {
            if (password !== confirmPassword) {
                throw new Error("Passwords do not match");
            }
            if (password.length < 6) {
                throw new Error("Password must be at least 6 characters");
            }
            const { error } = await supabase.auth.updateUser({ password: password });
            if (error) throw error;
            setPassword('');
            setConfirmPassword('');
            addToast("Password updated successfully", "success");
        } else {
            addToast("Profile info updated (Simulation)", "info");
        }
    } catch (err: any) {
        addToast(err.message, "error");
    } finally {
        setSaving(false);
    }
  };

  const handleSaveWorkspace = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // 1. Save App Settings
      const { error: settingsError } = await supabase
        .from('app_settings')
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString()
        });
      if (settingsError) throw settingsError;

      // 2. Save Tenant Details (if modified)
      if (tenant) {
          const { error: tenantError } = await supabase
            .from('tenants')
            .update({ org_name: tenant.org_name })
            .eq('id', user.id);
          if (tenantError) throw tenantError;
      }

      addToast("Workspace settings saved", "success");
    } catch (err: any) {
      console.error("Error saving settings", err);
      addToast(err.message || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: keyof AppSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
      return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
                <p className="text-slate-500">Manage your profile and organization preferences.</p>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6">
            <button 
                onClick={() => setActiveTab('profile')}
                className={`px-6 py-3 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'profile' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <User size={16} />
                My Profile
            </button>
            {isAdmin && (
                <button 
                    onClick={() => setActiveTab('workspace')}
                    className={`px-6 py-3 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'workspace' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Building2 size={16} />
                    Workspace & Integrations
                </button>
            )}
        </div>

        {activeTab === 'profile' && (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Personal Information</h3>
                    <div className="grid gap-6 max-w-lg">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                            <input 
                                type="email" 
                                disabled
                                value={user?.email || ''}
                                className="w-full border border-slate-200 bg-slate-50 rounded-lg px-4 py-2 text-slate-500 cursor-not-allowed"
                            />
                            <p className="text-xs text-slate-400 mt-1">Email cannot be changed via the dashboard.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Security</h3>
                    <div className="grid gap-6 max-w-lg">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input 
                                    type="password" 
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6">
                        <button 
                            onClick={handleUpdateProfile}
                            disabled={saving || !password}
                            className="bg-slate-900 hover:bg-black text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            Update Password
                        </button>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'workspace' && isAdmin && (
            <div className="space-y-6 animate-fade-in">
                {/* Tenant Profile */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Organization Profile</h3>
                            <p className="text-sm text-slate-500">Manage your tenant identity.</p>
                        </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name</label>
                            <input 
                                type="text" 
                                value={tenant?.org_name || ''}
                                onChange={(e) => setTenant(prev => prev ? ({ ...prev, org_name: e.target.value }) : null)}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Current Plan</label>
                            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-4 py-2 bg-slate-50 text-slate-500 cursor-not-allowed">
                                <CreditCard size={16} />
                                <span className="capitalize">{tenant?.plan || 'Free'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Facebook App Config */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Facebook Integration</h3>
                    <p className="text-sm text-slate-500 mb-6">Required for the frontend SDK to initialize connection dialogs.</p>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Facebook App ID</label>
                        <input 
                            type="text" 
                            placeholder="1234567890"
                            value={settings.facebook_app_id}
                            onChange={(e) => handleChange('facebook_app_id', e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-slate-900"
                        />
                        <p className="text-xs text-slate-400 mt-1">This ID will be automatically used in the Integrations page.</p>
                    </div>
                </div>

                {/* n8n Config */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">n8n Connection</h3>
                    <p className="text-sm text-slate-500 mb-6">Configure the webhook endpoints for your n8n instances.</p>
                    
                    <div className="grid gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Webhook URL (Incoming Messages)</label>
                            <input 
                                type="text" 
                                value={settings.n8n_webhook_url}
                                onChange={(e) => handleChange('n8n_webhook_url', e.target.value)}
                                placeholder="https://n8n.yourdomain.com/webhook/facebook-inbound"
                                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-slate-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Webhook Secret</label>
                            <input 
                                type="password" 
                                value={settings.n8n_webhook_secret}
                                onChange={(e) => handleChange('n8n_webhook_secret', e.target.value)}
                                placeholder="••••••••••••••••"
                                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-slate-900"
                            />
                        </div>
                    </div>
                </div>

                {/* Supabase Vector Config */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Supabase Vector Config</h3>
                    <p className="text-sm text-slate-500 mb-6">
                        Credentials for accessing your vector database. 
                        <span className="text-amber-600 block mt-1">Note: These are sensitive and should only be used if you are running n8n client-side or for catalog syncing.</span>
                    </p>
                    <div className="grid gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Project URL</label>
                            <input 
                                type="text" 
                                value={settings.supabase_url}
                                onChange={(e) => handleChange('supabase_url', e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900"
                                placeholder="https://xyz.supabase.co"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Service Key (Role Key)</label>
                            <input 
                                type="password" 
                                value={settings.supabase_key}
                                onChange={(e) => handleChange('supabase_key', e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-slate-900"
                                placeholder="ey..."
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end sticky bottom-6">
                    <button 
                        onClick={handleSaveWorkspace}
                        disabled={saving}
                        className="bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-slate-300 transition-all"
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};