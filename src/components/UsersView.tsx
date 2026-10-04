import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { UserPlus, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

interface UsersViewProps {
  users: User[];
  currentUser: User;
  onCreateUser: (data: { username: string; full_name: string; role: UserRole }) => boolean;
  onToggleUserStatus: (userId: number) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  currentUser,
  onCreateUser,
  onToggleUserStatus
}) => {
  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('LAB_ANALYST');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!username.trim() || !fullName.trim()) {
      setErrorMsg('All fields are required.');
      return;
    }
    const success = onCreateUser({
      username: username.trim().toLowerCase(),
      full_name: fullName.trim(),
      role
    });
    if (success) {
      setShowModal(false);
      setUsername('');
      setFullName('');
    } else {
      setErrorMsg('Username already exists in the system.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Access Control & Role Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            PostgreSQL authenticated operators and role assignments (RBAC)
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Provision Operator</span>
        </button>
      </div>

      {/* Security Invariant Notice */}
      <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-900">Principle of Least Privilege:</strong> Administrators can manage user accounts and assign roles, but cannot modify historical ledger records or bypass the database immutability triggers.
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">Registered Operators</span>
          <span className="text-xs font-mono text-slate-400">Total: {users.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Operator Username</th>
                <th className="py-2.5 px-4">Full Name</th>
                <th className="py-2.5 px-4">Role Assignment</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Created Date</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.user_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">@{u.username}</td>
                  <td className="py-3 px-4 text-slate-800 font-medium">{u.full_name}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-semibold border ${
                      u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      u.role === 'FIELD_TECHNICIAN' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                      u.role === 'LAB_ANALYST' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      u.role === 'TRANSPORTER' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-slate-100 text-slate-700 border-slate-300'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {u.active ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-rose-600">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Deactivated</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500 tabular-nums">
                    {u.created_at.slice(0, 10)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {u.user_id === currentUser.user_id ? (
                      <span className="text-[11px] text-slate-400 font-medium">Current User</span>
                    ) : (
                      <button
                        onClick={() => onToggleUserStatus(u.user_id)}
                        className={`px-2 py-1 rounded text-xs font-medium border ${
                          u.active
                            ? 'text-rose-700 border-rose-300 hover:bg-rose-50'
                            : 'text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                        }`}
                      >
                        {u.active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Provision Operator */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Provision New Operator</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-3.5">
              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. analyst_maya"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:outline-none focus:border-blue-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Full Name & Title
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Maya Lin"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Role Assignment
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:outline-none focus:border-blue-500"
                >
                  <option value="ADMIN">ADMIN (Full operational & audit privilege)</option>
                  <option value="FIELD_TECHNICIAN">FIELD_TECHNICIAN (Registration & collection)</option>
                  <option value="TRANSPORTER">TRANSPORTER (Logistics custody transfers)</option>
                  <option value="LAB_ANALYST">LAB_ANALYST (Laboratory analysis & testing)</option>
                  <option value="AUDITOR">AUDITOR (Read-only cryptographic verification)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
