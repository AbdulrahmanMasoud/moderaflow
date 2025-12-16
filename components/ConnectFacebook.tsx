import React, { useState, useEffect } from 'react';
import { Facebook, CheckCircle, AlertCircle, RefreshCw, Loader2, Globe, ShieldCheck, WifiOff, PenTool, Lock, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { FacebookPage } from '../types';

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

export const ConnectFacebook: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [appId, setAppId] = useState(''); 
  const [connectedPage, setConnectedPage] = useState<{ page_name: string; page_id: string; created_at: string } | null>(null);
  const [availablePages, setAvailablePages] = useState<FacebookPage[]>([]);
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New state for manual fallback
  const [manualMode, setManualMode] = useState(false);
  const [manualConfig, setManualConfig] = useState({ name: '', id: '', token: '' });

  // Check if we are in a secure context (HTTPS or localhost)
  const isSecureContext = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // 1. Check for existing connection on mount
  useEffect(() => {
    if (!user) return;

    const fetchConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('connected_pages')
          .select('page_name, page_id, created_at')
          .eq('user_id', user.id)
          .maybeSingle(); // Use maybeSingle to avoid error on 0 rows

        if (error) throw error;
        if (data) {
          setConnectedPage(data);
        }
      } catch (err: any) {
        console.error("Supabase fetch error:", err);
        // Don't show UI error for network issues on load, just log it. 
        // Unless it's a critical auth failure.
        if (err.message === 'Failed to fetch') {
             console.warn("Network error connecting to Supabase. Check your connection or ad-blockers.");
        }
      }
    };

    fetchConnection();
  }, [user]);

  // 2. Initialize Facebook SDK
  const initFacebook = (submittedAppId: string) => {
    if (!isSecureContext) {
        setError("Facebook Login requires HTTPS. Switching to manual input mode recommended.");
        return;
    }
    
    if (window.FB) {
        setSdkLoaded(true);
        return;
    }

    window.fbAsyncInit = function() {
      window.FB.init({
        appId      : submittedAppId,
        cookie     : true,
        xfbml      : true,
        version    : 'v19.0'
      });
      setSdkLoaded(true);
    };

    // Load SDK script
    (function(d, s, id){
       var js, fjs = d.getElementsByTagName(s)[0];
       if (d.getElementById(id)) {return;}
       js = d.createElement(s); js.id = id;
       // @ts-ignore
       js.src = "https://connect.facebook.net/en_US/sdk.js";
       // @ts-ignore
       fjs.parentNode.insertBefore(js, fjs);
     }(document, 'script', 'facebook-jssdk'));
  };

  const handleAppIdSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(appId) initFacebook(appId);
  };

  // 3. Login Flow
  const handleConnect = () => {
    setError(null);
    setLoading(true);

    if (!isSecureContext) {
        setLoading(false);
        setError("Facebook Login is blocked on non-HTTPS connections. Please use Manual Configuration.");
        setManualMode(true);
        return;
    }

    if (!window.FB) {
        setError("Facebook SDK not loaded. Please check your internet connection or App ID.");
        setLoading(false);
        return;
    }

    window.FB.login((response: any) => {
      if (response.authResponse) {
        fetchPages();
      } else {
        setLoading(false);
        setError("User cancelled login or did not fully authorize.");
      }
    }, {
        // Request permissions for Pages and Messaging
        scope: 'pages_show_list,pages_read_engagement,pages_manage_metadata,pages_messaging'
    });
  };

  // 4. Fetch User's Pages
  const fetchPages = () => {
    window.FB.api('/me/accounts', (response: any) => {
      setLoading(false);
      if (response && !response.error) {
        setAvailablePages(response.data);
        setShowPageSelector(true);
      } else {
        setError(response.error?.message || "Failed to fetch pages.");
      }
    });
  };

  // 5. Save Selected Page to Supabase
  const handleSelectPage = async (page: FacebookPage) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    
    try {
        // Upsert the connection
        const { error } = await supabase
            .from('connected_pages')
            .upsert({
                user_id: user.id,
                page_id: page.id,
                page_name: page.name,
                access_token: page.access_token, 
                created_at: new Date().toISOString()
            }, { onConflict: 'user_id, page_id' }); 

        if (error) throw error;

        setConnectedPage({
            page_name: page.name,
            page_id: page.id,
            created_at: new Date().toISOString()
        });
        setShowPageSelector(false);
        setManualMode(false);
    } catch (err: any) {
        console.error("Supabase Save Error:", err);
        setError(err.message || "Failed to save connection to database.");
    } finally {
        setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!manualConfig.id || !manualConfig.token || !manualConfig.name) {
          setError("All fields are required.");
          return;
      }
      
      const page: FacebookPage = {
          id: manualConfig.id,
          name: manualConfig.name,
          access_token: manualConfig.token
      };

      await handleSelectPage(page);
  };

  const handleDisconnect = async () => {
    if (!user) return;
    if(confirm("Are you sure? This will stop the n8n workflow from receiving messages.")) {
        setLoading(true);
        try {
            await supabase.from('connected_pages').delete().eq('user_id', user.id);
            setConnectedPage(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }
  };

  // Initialize SDK component
  if (!sdkLoaded && !connectedPage && !manualMode) {
      return (
        <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-xl shadow-sm border border-slate-200 text-center animate-fade-in">
            <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                    <Facebook size={32} />
                </div>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Configure Facebook App</h2>
            <p className="text-slate-500 mb-6">Enter your Facebook App ID to initialize the connection SDK.</p>
            
            {!isSecureContext && (
                <div className="mb-6 p-4 bg-yellow-50 text-yellow-800 text-sm rounded-lg flex items-start gap-3 text-left border border-yellow-200">
                    <AlertTriangle className="flex-shrink-0 mt-0.5" size={16} />
                    <div>
                        <span className="font-bold">HTTP Connection Detected:</span> Facebook Login requires HTTPS. 
                        Please enable SSL or use Manual Configuration mode.
                    </div>
                </div>
            )}

            <form onSubmit={handleAppIdSubmit} className="max-w-xs mx-auto space-y-4">
                <input 
                    type="text" 
                    placeholder="App ID (e.g. 123456789)"
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 text-center focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:bg-slate-100"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    required
                    disabled={!isSecureContext}
                />
                <button 
                    type="submit" 
                    className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!isSecureContext}
                >
                    Initialize SDK
                </button>
            </form>
            
            <div className="mt-8 pt-6 border-t border-slate-100">
                <button 
                    onClick={() => setManualMode(true)}
                    className="text-slate-500 hover:text-slate-800 text-sm font-medium flex items-center gap-2 mx-auto"
                >
                    <PenTool size={14} />
                    Enter Credentials Manually
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900">Connect Channels</h2>
        <p className="text-slate-500 mt-2">Link your social accounts to start the moderation workflow.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
        <div className="bg-[#1877F2] p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <Facebook size={32} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Facebook Messenger</h3>
              <p className="text-blue-100 text-sm">Page Integration</p>
            </div>
          </div>
          {connectedPage && (
            <span className="bg-green-400/20 text-white px-3 py-1 rounded-full text-xs font-bold border border-white/20">
              ACTIVE
            </span>
          )}
        </div>

        <div className="p-8">
          {error && (
              <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 flex items-center gap-3">
                  <AlertCircle size={20} />
                  {error}
              </div>
          )}

          {!connectedPage ? (
            manualMode ? (
                <div className="max-w-lg mx-auto animate-fade-in">
                     <div className="mb-6 text-center">
                        <h3 className="text-lg font-bold text-slate-900">Manual Configuration</h3>
                        <p className="text-sm text-slate-500">Enter your Page Access Token directly.</p>
                     </div>
                     <form onSubmit={handleManualSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Page Name</label>
                            <input 
                                type="text"
                                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="My Business Page"
                                value={manualConfig.name}
                                onChange={(e) => setManualConfig({...manualConfig, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Page ID</label>
                            <input 
                                type="text"
                                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="1234567890"
                                value={manualConfig.id}
                                onChange={(e) => setManualConfig({...manualConfig, id: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Page Access Token</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input 
                                    type="password"
                                    className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                    placeholder="EAA..."
                                    value={manualConfig.token}
                                    onChange={(e) => setManualConfig({...manualConfig, token: e.target.value})}
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                                Get this from the <a href="https://developers.facebook.com/tools/explorer/" target="_blank" className="text-blue-600 hover:underline">Graph API Explorer</a> or App Settings.
                            </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                             <button 
                                type="button"
                                onClick={() => setManualMode(false)}
                                className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 className="animate-spin" size={16} />}
                                Save Connection
                            </button>
                        </div>
                     </form>
                </div>
            ) : (
                !showPageSelector ? (
                    <div className="text-center space-y-6">
                    <div className="bg-slate-50 rounded-lg p-6 max-w-lg mx-auto border border-slate-100">
                        <p className="text-slate-600 mb-4">
                        Grant permission to access your Facebook Page messages. This allows our n8n workflow to read incoming messages and perform RAG against your Supabase vector store.
                        </p>
                        <ul className="text-left text-sm text-slate-500 space-y-2 mb-6 ml-8">
                        <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500"/> Read user messages</li>
                        <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500"/> Send automated replies</li>
                        <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500"/> Manage comment moderation</li>
                        </ul>
                    </div>
                    
                    <button
                        onClick={handleConnect}
                        disabled={loading}
                        className="bg-[#1877F2] hover:bg-[#166fe5] text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2 mx-auto disabled:opacity-70 disabled:grayscale"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Facebook size={20} />}
                        {loading ? 'Connecting...' : 'Connect Facebook Page'}
                    </button>

                    <div className="pt-4">
                        <button 
                            onClick={() => setManualMode(true)}
                            className="text-xs text-slate-400 hover:text-blue-600 underline"
                        >
                            I have a Page Access Token manually
                        </button>
                    </div>
                    </div>
                ) : (
                    <div className="animate-fade-in">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 text-center">Select a Page to Connect</h3>
                        <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2">
                            {availablePages.map((page) => (
                                <div key={page.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 group-hover:bg-blue-200 group-hover:text-blue-700">
                                            <Globe size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-slate-900">{page.name}</p>
                                            <p className="text-xs text-slate-500">Category: {page.category || 'Business'}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleSelectPage(page)}
                                        disabled={loading}
                                        className="bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-md hover:bg-black disabled:opacity-50"
                                    >
                                        {loading ? 'Saving...' : 'Connect'}
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button 
                            onClick={() => setShowPageSelector(false)}
                            className="mt-4 text-sm text-slate-500 hover:text-slate-800 underline"
                        >
                            Back
                        </button>
                    </div>
                )
            )
          ) : (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between p-6 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                       <ShieldCheck size={24} />
                   </div>
                   <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Connected Page</p>
                    <p className="text-xl font-bold text-slate-900">{connectedPage.page_name}</p>
                    <p className="text-xs text-slate-400 font-mono">ID: {connectedPage.page_id}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-xs text-slate-500 mb-1">Connected On</p>
                   <p className="text-sm font-medium text-slate-700">{new Date(connectedPage.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-bold text-yellow-800">Workflow Configuration Required</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Now that your page is connected, update your n8n workflow credentials using the stored Page Access Token. 
                      Ensure your n8n webhook URL is set in the <a href="#/settings" className="underline font-bold">Settings</a> tab.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                 <button 
                    onClick={handleDisconnect}
                    className="text-red-600 hover:text-red-700 text-sm font-medium px-4 py-2 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                 >
                   <RefreshCw size={14} />
                   Disconnect Page
                 </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};