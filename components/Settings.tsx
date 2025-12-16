import React, { useEffect, useState } from 'react';
import { Save, Loader2, Check, Building2, CreditCard } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { AppSettings, Tenant } from '../types';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Tenant State
  const [tenant, setTenant] = useState<Tenant | null>(null);

  // App Settings State
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

        // Fetch App Settings
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
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSuccess(false);

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

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving settings", err);
      alert("Failed to save settings");
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
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
                <p className="text-slate-500">Manage your organization profile and integrations.</p>
            </div>
            {success && (
                <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold animate-fade-in">
                    <Check size={16} /> Saved Successfully
                </div>
            )}
        </div>

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
                        className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
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
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
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
                        className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Webhook Secret</label>
                    <input 
                        type="password" 
                        value={settings.n8n_webhook_secret}
                        onChange={(e) => handleChange('n8n_webhook_secret', e.target.value)}
                        placeholder="••••••••••••••••"
                        className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
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
                        className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="https://xyz.supabase.co"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Service Key (Role Key)</label>
                    <input 
                        type="password" 
                        value={settings.supabase_key}
                        onChange={(e) => handleChange('supabase_key', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        placeholder="ey..."
                    />
                </div>
            </div>
        </div>

        <div className="flex justify-end sticky bottom-6">
            <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-slate-300 transition-all"
            >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {saving ? 'Saving...' : 'Save Configuration'}
            </button>
        </div>
    </div>
  );
};