import React from 'react';
import { User, UserRole } from '../types';
import {
  ShieldCheck,
  LayoutDashboard,
  Box,
  PlusCircle,
  ArrowLeftRight,
  Receipt,
  ShieldAlert,
  Users,
  UserCheck
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User;
  onSwitchUser: (userRole: UserRole) => void;
  allUsers: User[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onSwitchUser,
  allUsers
}) => {
  return (
    <aside className="w-64 bg-[#0F172A] text-slate-100 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold tracking-wider text-sm text-white">TRACELEDGER</div>
            <div className="text-[10px] text-slate-400 font-mono tracking-tight">DBMS AUDIT SYSTEM</div>
          </div>
        </div>
      </div>

      {/* User Card & Role Switcher */}
      <div className="p-3 mx-3 mt-3 bg-slate-800/50 border border-slate-700/60 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
            {currentUser.full_name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-semibold text-slate-200 truncate">{currentUser.full_name}</div>
            <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-medium mt-0.5 ${
              currentUser.role === 'ADMIN' ? 'bg-purple-900/60 text-purple-200 border border-purple-700' :
              currentUser.role === 'FIELD_TECHNICIAN' ? 'bg-sky-900/60 text-sky-200 border border-sky-700' :
              currentUser.role === 'LAB_ANALYST' ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-700' :
              currentUser.role === 'TRANSPORTER' ? 'bg-amber-900/60 text-amber-200 border border-amber-700' :
              'bg-slate-700 text-slate-200 border border-slate-600'
            }`}>
              {currentUser.role}
            </span>
          </div>
        </div>

        {/* Role Quick Selector for Testing */}
        <div className="pt-2 border-t border-slate-700/50">
          <label className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1 mb-1">
            <UserCheck className="w-3 h-3 text-slate-400" />
            Switch Active Actor (RBAC):
          </label>
          <select
            className="w-full bg-slate-900 text-slate-200 text-xs rounded border border-slate-700 p-1 font-mono focus:outline-none focus:border-blue-500"
            value={currentUser.role}
            onChange={(e) => onSwitchUser(e.target.value as UserRole)}
          >
            {allUsers.map((u) => (
              <option key={u.user_id} value={u.role}>
                {u.role} ({u.username})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        <div className="px-3 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Core Operations
        </div>

        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
            currentTab === 'dashboard'
              ? 'bg-blue-600 text-white font-semibold'
              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setCurrentTab('samples')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
            currentTab === 'samples' || currentTab === 'sample_details'
              ? 'bg-blue-600 text-white font-semibold'
              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <Box className="w-4 h-4 shrink-0" />
          <span>Specimen Registry</span>
        </button>

        {['ADMIN', 'FIELD_TECHNICIAN'].includes(currentUser.role) && (
          <button
            onClick={() => setCurrentTab('register')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
              currentTab === 'register'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>Register Specimen</span>
          </button>
        )}

        {['ADMIN', 'FIELD_TECHNICIAN', 'TRANSPORTER', 'LAB_ANALYST'].includes(currentUser.role) && (
          <button
            onClick={() => setCurrentTab('move')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
              currentTab === 'move'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4 shrink-0" />
            <span>Record Movement</span>
          </button>
        )}

        <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Cryptographic Audit
        </div>

        <button
          onClick={() => setCurrentTab('ledger')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
            currentTab === 'ledger'
              ? 'bg-blue-600 text-white font-semibold'
              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4 shrink-0" />
          <span>Audit Ledger</span>
        </button>

        <button
          onClick={() => setCurrentTab('integrity')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
            currentTab === 'integrity'
              ? 'bg-blue-600 text-white font-semibold'
              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Integrity Verifier</span>
        </button>

        {currentUser.role === 'ADMIN' && (
          <>
            <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Administration
            </div>
            <button
              onClick={() => setCurrentTab('users')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
                currentTab === 'users'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>User Management</span>
            </button>
          </>
        )}
      </nav>
    </aside>
  );
};
