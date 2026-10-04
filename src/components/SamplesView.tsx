import React, { useState, useMemo } from 'react';
import { Sample, LaboratoryNode, User } from '../types';
import { Search, Filter, PlusCircle, ArrowLeftRight, Eye } from 'lucide-react';

interface SamplesViewProps {
  samples: Sample[];
  nodes: LaboratoryNode[];
  users: User[];
  currentUser: User;
  onSelectSample: (code: string) => void;
  onMoveSample: (code: string) => void;
  onRegisterClick: () => void;
}

export const SamplesView: React.FC<SamplesViewProps> = ({
  samples,
  nodes,
  users,
  currentUser,
  onSelectSample,
  onMoveSample,
  onRegisterClick
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.node_id, n])), [nodes]);
  const userMap = useMemo(() => new Map(users.map(u => [u.user_id, u.full_name])), [users]);

  const distinctTypes = useMemo(() => {
    return Array.from(new Set(samples.map(s => s.sample_type))).sort();
  }, [samples]);

  const filteredSamples = useMemo(() => {
    return samples.filter(s => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        s.sample_code.toLowerCase().includes(q) ||
        s.source_name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.sample_type.toLowerCase().includes(q);

      const matchesStatus = !statusFilter || s.current_status === statusFilter;
      const matchesType = !typeFilter || s.sample_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [samples, searchQuery, statusFilter, typeFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REGISTERED':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'COLLECTED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'IN_TRANSIT':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'RECEIVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'UNDER_TESTING':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'TEST_COMPLETED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'STORED':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'DISPOSED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-5">
      {/* Title & Register Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Specimen Registry</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Physical specimens currently governed by the tamper-resistant audit ledger
          </p>
        </div>
        {['ADMIN', 'FIELD_TECHNICIAN'].includes(currentUser.role) && (
          <button
            onClick={onRegisterClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Register New Specimen</span>
          </button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code (e.g. SMP-2026-0001), source, description..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value="">All Statuses</option>
              <option value="REGISTERED">REGISTERED</option>
              <option value="COLLECTED">COLLECTED</option>
              <option value="IN_TRANSIT">IN_TRANSIT</option>
              <option value="RECEIVED">RECEIVED</option>
              <option value="UNDER_TESTING">UNDER_TESTING</option>
              <option value="TEST_COMPLETED">TEST_COMPLETED</option>
              <option value="STORED">STORED</option>
              <option value="DISPOSED">DISPOSED</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value="">All Categories</option>
              {distinctTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Samples Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">Tracked Specimens</span>
          <span className="text-xs font-mono text-slate-400">Total: {filteredSamples.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-4">Sample Code</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Origin / Source</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Current Checkpoint</th>
                <th className="py-2.5 px-4">Intake Agent</th>
                <th className="py-2.5 px-4">Last Updated</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSamples.map(s => {
                const node = nodeMap.get(s.current_node_id);
                const userName = userMap.get(s.registered_by) || 'Unknown';
                return (
                  <tr key={s.sample_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <button
                        onClick={() => onSelectSample(s.sample_code)}
                        className="hover:text-blue-600 hover:underline"
                      >
                        {s.sample_code}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{s.sample_type}</td>
                    <td className="py-3 px-4">
                      <div className="text-slate-900 font-medium">{s.source_name}</div>
                      {s.description && (
                        <div className="text-slate-400 text-[11px] truncate max-w-xs">{s.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(s.current_status)}`}>
                        {s.current_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{node ? node.node_name : 'Unknown'}</div>
                      <div className="text-[11px] text-slate-400">{node ? node.location : ''}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{userName}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 tabular-nums">
                      {s.updated_at.slice(0, 16).replace('T', ' ')}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => onSelectSample(s.sample_code)}
                          className="px-2 py-1 text-slate-700 hover:bg-slate-100 border border-slate-300 rounded text-xs font-medium inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                        {['ADMIN', 'FIELD_TECHNICIAN', 'TRANSPORTER', 'LAB_ANALYST'].includes(currentUser.role) && s.current_status !== 'DISPOSED' && (
                          <button
                            onClick={() => onMoveSample(s.sample_code)}
                            className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium inline-flex items-center gap-1"
                          >
                            <ArrowLeftRight className="w-3 h-3" />
                            <span>Move</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredSamples.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    No physical specimens match the current filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
