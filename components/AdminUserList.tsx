import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Users, Loader2, Search, ChevronLeft, ChevronRight, Plus, Mail, Shield, ShieldAlert, User } from 'lucide-react';

interface TenantUser {
  id: string;
  org_name: string;
  email?: string; // Optional depending on DB schema
  created_at: string;
  plan?: string;
}

export const AdminUserList: React.FC = () => {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  
  const PAGE_SIZE = 5;

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Note: This requires RLS policy "Admins can view all tenants"
      let query = supabase
        .from('tenants')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search) {
        query = query.ilike('org_name', `%${search}%`);
      }

      const { data, count, error } = await query;
      
      if (error) {
          console.error("Error fetching users:", error.message);
          // Fallback if RLS blocks query
          if (error.code === '42501') {
              alert("Access Denied. You must be an Admin to view this list.");
          }
      } else {
        setUsers(data || []);
        setTotal(count || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = (e: React.FormEvent) => {
      e.preventDefault();
      // In a real app with Service Role, we would call supabase.auth.admin.inviteUserByEmail(inviteEmail)
      // Here we simulate the process
      alert(`Invitation logic would trigger here for ${inviteEmail}.\n\n(Note: Creating auth users requires backend functions in a secure production environment)`);
      setShowInviteModal(false);
      setInviteEmail('');
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">User Management</h2>
          <p className="text-slate-500 mt-1">Manage tenants and platform access.</p>
        </div>
        <button 
            onClick={() => setShowInviteModal(true)}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-black transition-colors"
        >
            <Plus size={18} />
            Invite User
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search organizations..." 
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                />
            </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[300px]">
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <Loader2 className="animate-spin mb-2" size={32} />
                    Loading users...
                </div>
            ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <Users size={48} className="mb-2 opacity-50" />
                    <p>No users found matching your criteria.</p>
                </div>
            ) : (
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 uppercase text-xs tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Organization / Tenant</th>
                            <th className="px-6 py-4">User ID</th>
                            <th className="px-6 py-4">Plan</th>
                            <th className="px-6 py-4">Joined Date</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                            {user.org_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">{user.org_name}</p>
                                            <p className="text-xs text-slate-500">{user.email || 'No email recorded'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                    {user.id}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                                        {user.plan || 'Free'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-blue-600 hover:text-blue-800 text-xs font-bold">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>

        {/* Pagination */}
        <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-between items-center">
            <span className="text-sm text-slate-500">
                Showing <span className="font-medium">{users.length > 0 ? page * PAGE_SIZE + 1 : 0}</span> to <span className="font-medium">{Math.min((page + 1) * PAGE_SIZE, total)}</span> of <span className="font-medium">{total}</span> users
            </span>
            <div className="flex gap-2">
                <button 
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0 || loading}
                    className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronLeft size={16} />
                </button>
                <button 
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1 || loading}
                    className="p-2 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-slate-900">Invite New User</h3>
                      <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600">
                          <Plus className="rotate-45" size={24} />
                      </button>
                  </div>
                  <form onSubmit={handleInvite} className="p-6 space-y-4">
                      <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm mb-4">
                          Invited users will receive an email to set their password. They will be added as a default "User" role.
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                          <div className="relative">
                              <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                              <input 
                                  type="email" 
                                  required 
                                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                  placeholder="user@example.com"
                                  value={inviteEmail}
                                  onChange={(e) => setInviteEmail(e.target.value)}
                              />
                          </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                          <button 
                             type="button" 
                             onClick={() => setShowInviteModal(false)}
                             className="flex-1 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
                          >
                              Cancel
                          </button>
                          <button 
                             type="submit" 
                             className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-black"
                          >
                              Send Invitation
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};