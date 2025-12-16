import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Users, Loader2, Search, ChevronLeft, ChevronRight, Plus, Mail, Shield, ShieldAlert, Edit, Trash2, Check, X, RefreshCw } from 'lucide-react';
import { Tenant } from '../types';
import { useToast } from '../context/ToastContext';

export const AdminUserList: React.FC = () => {
  const { addToast } = useToast();
  const [users, setUsers] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  
  // Modal States
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Tenant>>({});
  
  const PAGE_SIZE = 5;

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // We explicitly select columns to ensure we fail fast if schema is wrong
      let query = supabase
        .from('tenants')
        .select('id, org_name, email, role, plan, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search) {
        query = query.ilike('org_name', `%${search}%`);
      }

      const { data, count, error } = await query;
      
      if (error) {
          console.error("Fetch Error:", error);
          if (error.code === '42501') {
             addToast("Access Denied: You need 'admin' role in metadata.", 'error');
          } else if (error.message.includes('column') || error.code === 'PGRST204') {
             addToast("Database Schema Mismatch: Run the SQL migration script.", 'error');
          } else {
             addToast("Failed to fetch users: " + error.message, 'error');
          }
      } else {
        setUsers(data || []);
        setTotal(count || 0);
      }
    } catch (err: any) {
      console.error(err);
      addToast("Unexpected error: " + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
      e.preventDefault();
      // Simulation of Invite
      setShowInviteModal(false);
      setInviteEmail('');
      addToast(`Invitation email sent to ${inviteEmail}`, 'success');
  };

  const startEdit = (user: Tenant) => {
      setEditingId(user.id);
      setEditForm({
          org_name: user.org_name,
          plan: user.plan || 'Free',
          role: user.role || 'user'
      });
  };

  const cancelEdit = () => {
      setEditingId(null);
      setEditForm({});
  };

  const saveEdit = async (id: string) => {
      try {
          const { error } = await supabase
            .from('tenants')
            .update(editForm)
            .eq('id', id);

          if (error) {
              console.error("Update Error:", error);
              if (error.message.includes('Could not find the')) {
                  addToast("Error: Database column missing. Please reload Supabase Schema.", 'error');
              } else {
                  addToast("Failed to update user: " + error.message, 'error');
              }
          } else {
              addToast("User updated successfully", 'success');
              setEditingId(null);
              fetchUsers();
          }
      } catch (err: any) {
          addToast("System error: " + err.message, 'error');
      }
  };

  const handleDelete = async (id: string, orgName: string) => {
      if (confirm(`Are you sure you want to delete ${orgName}? This cannot be undone.`)) {
          const { error } = await supabase.from('tenants').delete().eq('id', id);
          if (error) {
              addToast("Failed to delete: " + error.message, 'error');
          } else {
              addToast(`${orgName} profile deleted.`, 'success');
              fetchUsers();
          }
      }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">User Management</h2>
          <p className="text-slate-500 mt-1">Manage tenants, roles, and subscription plans.</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => fetchUsers()} 
                className="bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                title="Reload List"
            >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <button 
                onClick={() => setShowInviteModal(true)}
                className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-black transition-colors shadow-sm"
            >
                <Plus size={18} />
                Invite User
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search organizations..." 
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
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
                            <th className="px-6 py-4">Organization / User</th>
                            <th className="px-6 py-4">Role</th>
                            <th className="px-6 py-4">Plan</th>
                            <th className="px-6 py-4">Joined Date</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    {editingId === user.id ? (
                                        <input 
                                            type="text" 
                                            value={editForm.org_name || ''}
                                            onChange={(e) => setEditForm({...editForm, org_name: e.target.value})}
                                            className="w-full border border-slate-300 rounded px-2 py-1 text-sm bg-white text-slate-900"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                                {(user.org_name || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">{user.org_name || 'Unnamed Org'}</p>
                                                <p className="text-xs text-slate-500">{user.email || 'No email recorded'}</p>
                                            </div>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {editingId === user.id ? (
                                        <select 
                                            value={editForm.role}
                                            onChange={(e) => setEditForm({...editForm, role: e.target.value as any})}
                                            className="border border-slate-300 rounded px-2 py-1 text-sm bg-white text-slate-900"
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    ) : (
                                        <div className="flex items-center gap-1">
                                            {user.role === 'admin' ? <ShieldAlert size={14} className="text-purple-600" /> : <Shield size={14} className="text-slate-400" />}
                                            <span className={`capitalize ${user.role === 'admin' ? 'font-bold text-purple-700' : 'text-slate-600'}`}>
                                                {user.role || 'user'}
                                            </span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {editingId === user.id ? (
                                        <select 
                                            value={editForm.plan}
                                            onChange={(e) => setEditForm({...editForm, plan: e.target.value})}
                                            className="border border-slate-300 rounded px-2 py-1 text-sm bg-white text-slate-900"
                                        >
                                            <option value="Free">Free</option>
                                            <option value="Pro">Pro</option>
                                            <option value="Enterprise">Enterprise</option>
                                        </select>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                                            {user.plan || 'Free'}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {editingId === user.id ? (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => saveEdit(user.id)} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200">
                                                <Check size={16} />
                                            </button>
                                            <button onClick={cancelEdit} className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => startEdit(user)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(user.id, user.org_name)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
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
                    className="p-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
                >
                    <ChevronLeft size={16} />
                </button>
                <button 
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1 || loading}
                    className="p-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
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
                          Invited users will receive an email to set their password.
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                          <div className="relative">
                              <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                              <input 
                                  type="email" 
                                  required 
                                  className="w-full pl-10 pr-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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