import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Command, Mail, Lock, Loader2, ArrowRight, Building2 } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        if (!orgName.trim()) {
            throw new Error("Organization name is required.");
        }
        // Metadata is passed here so the Postgres Trigger can read it and create the Tenant record.
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
                org_name: orgName,
                role: 'user' // Default to 'user', only manually set admins can access Admin Panel
            }
          }
        });
        if (error) throw error;
        
        if (data.session) {
           // Auto-login successful
        } else {
           setMessage('Check your email for the confirmation link.');
        }

      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-white shadow-lg">
                <Command size={24} />
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {isSignUp ? 'Create an account' : 'Welcome back'}
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              {isSignUp 
                ? 'Register your Tenant Organization.' 
                : 'Enter your credentials to access your dashboard.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            
            {isSignUp && (
                <div className="animate-fade-in">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 ml-1">Organization Name</label>
                <div className="relative">
                    <Building2 className="absolute left-4 top-3 text-slate-400" size={18} />
                    <input
                    type="text"
                    required={isSignUp}
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-11 pr-4 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Acme Corp"
                    />
                </div>
                </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-11 pr-4 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-11 pr-4 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}

            {message && (
              <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-100">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-black text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 text-center">
          <button
            onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setMessage(null);
            }}
            className="text-sm text-slate-600 hover:text-blue-600 font-medium transition-colors"
          >
            {isSignUp 
              ? 'Already have an account? Sign in' 
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
};