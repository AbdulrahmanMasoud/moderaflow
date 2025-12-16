import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
          ensureTenantRecord(session.user);
      }
      setLoading(false);
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
          ensureTenantRecord(session.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Self-Healing: Ensure a tenant record exists for the user
  const ensureTenantRecord = async (currentUser: User) => {
      try {
          const { data, error } = await supabase
            .from('tenants')
            .select('id')
            .eq('id', currentUser.id)
            .maybeSingle();
          
          // If no tenant record found (orphaned user), create one
          if (!data && !error) {
              console.log("Healing: Restoring missing tenant record for user...");
              const orgName = currentUser.user_metadata?.org_name || 'My Organization';
              
              // 1. Restore Database Record
              const { error: insertError } = await supabase.from('tenants').insert({
                  id: currentUser.id,
                  email: currentUser.email,
                  org_name: orgName,
                  role: 'user', // Force 'user' role for safety
                  plan: 'Free'
              });

              if (!insertError) {
                  // 2. Sync Metadata to match DB (Remove false admin flags if any)
                  await supabase.auth.updateUser({
                      data: { role: 'user' }
                  });
                  console.log("Healing complete: Tenant restored and role synced to 'user'.");
              }
          }
      } catch (err) {
          console.error("Error ensuring tenant record:", err);
      }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    session,
    user,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};