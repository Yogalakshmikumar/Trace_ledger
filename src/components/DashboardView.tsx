import React from 'react';
import { Sample, AuditLedgerBlock, LaboratoryNode, User } from '../types';
import {
  Layers,
  Receipt,
  Truck,
  FlaskConical,
  Flag,
  CheckCircle2,
  Archive,
  Trash2,
  ArrowRight,
  ShieldCheck,
  PlusCircle,
  ArrowLeftRight,
  Search
} from 'lucide-react';

interface DashboardViewProps {
  samples: Sample[];
  ledger: AuditLedgerBlock[];
  nodes: LaboratoryNode[];
  users: User[];
  onSelectSample: (sampleCode: string) => void;
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  samples,
  ledger,
  nodes,
  users,
  onSelectSample,
  onNavigate
}) => {
  const nodeMap = new Map(nodes.map(n => [n.node_id, n.node_name]));
  const userMap = new Map(users.map(u => [u.user_id, u.full_name]));

  const totalSamples = samples.length;
  const totalLedger = ledger.length;
  const registeredCount = samples.filter(s => s.current_status === 'REGISTERED').length;
  const inTransitCount = samples.filter(s => s.current_status === 'IN_TRANSIT').length;
  const testingCount = samples.filter(s => s.current_status === 'UNDER_TESTING').length;
  const completedCount = samples.filter(s => s.current_status === 'TEST_COMPLETED').length;
  const storedCount = samples.filter(s => s.current_status === 'STORED').length;
  const disposedCount = samples.filter(s => s.current_status === 'DISPOSED').length;

  const recentSamples = [...samples].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)).slice(0, 5);
  const recentEvents = [...ledger].sort((a, b) => b.ledger_id - a.ledger_id).slice(0, 6);

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
    <div className="space-y-6">
      {/* Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Operational Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Physical specimen lifecycle states, checkpoint transfers & append-only audit trail
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('register')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Register Specimen</span>
          </button>
          <button
            onClick={() => onNavigate('move')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-md text-xs font-semibold transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Move Specimen</span>
          </button>
          <button
            onClick={() => onNavigate('integrity')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-md text-xs font-semibold transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verify Integrity</span>
          </button>
        </div>
      </div>

      {/* 8 Stats Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Specimens</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2 tabular-nums">{totalSamples}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Tracked in registry</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Audit Records</span>
            <Receipt className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2 tabular-nums">{totalLedger}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Append-only blocks</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">In Transit</span>
            <Truck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2 tabular-nums">{inTransitCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Active courier routes</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Under Testing</span>
            <FlaskConical className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2 tabular-nums">{testingCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Analytical batch runs</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Registered</span>
            <Flag className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">{registeredCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Awaiting collection</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Test Completed</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">{completedCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Awaiting vault deposit</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Stored in Vault</span>
            <Archive className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">{storedCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Secure retention vault</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Disposed</span>
            <Trash2 className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">{disposedCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Safe terminal disposal</div>
        </div>
      </div>

      {/* Quick Navigation Hub */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Quick Navigation:</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate('register')}
            className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            + Register Sample
          </button>
          <button
            onClick={() => onNavigate('move')}
            className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Move Sample
          </button>
          <button
            onClick={() => onNavigate('samples')}
            className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Track Sample
          </button>
          <button
            onClick={() => onNavigate('ledger')}
            className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Audit Ledger
          </button>
          <button
            onClick={() => onNavigate('integrity')}
            className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded font-medium text-blue-700 hover:bg-blue-50 transition-colors"
          >
            Verify Integrity
          </button>
        </div>
      </div>

      {/* Two Column Grid: Recent Samples & Recent Ledger Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Specimens */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Specimen Activity</h2>
              <span className="text-[11px] text-slate-500">Live Chain of Custody tracking</span>
            </div>
            <button
              onClick={() => onNavigate('samples')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              View All →
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentSamples.map(s => (
              <div key={s.sample_id} className="p-3 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectSample(s.sample_code)}
                      className="font-mono font-bold text-xs text-slate-900 hover:text-blue-600 transition-colors text-left"
                    >
                      {s.sample_code}
                    </button>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${getStatusBadge(s.current_status)}`}>
                      {s.current_status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 truncate mt-0.5">{s.sample_type}</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    At: {nodeMap.get(s.current_node_id)} · Origin: {s.source_name}
                  </div>
                </div>
                <button
                  onClick={() => onSelectSample(s.sample_code)}
                  className="px-2 py-1 text-xs border border-slate-200 hover:bg-slate-100 text-slate-700 rounded transition-colors shrink-0"
                >
                  Details
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Cryptographic Ledger Feed */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Cryptographic Ledger Feed</h2>
              <span className="text-[11px] text-slate-500">Append-only SHA-256 chained events</span>
            </div>
            <button
              onClick={() => onNavigate('ledger')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              Full Ledger →
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentEvents.map(ev => {
              const sampleObj = samples.find(s => s.sample_id === ev.sample_id);
              return (
                <div key={ev.ledger_id} className="p-3 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 text-xs font-semibold">#{ev.ledger_id}</span>
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {sampleObj ? sampleObj.sample_code : `SMP-${ev.sample_id}`}
                      </span>
                      <span className="text-xs font-medium text-slate-700 truncate">
                        {ev.action_type}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {nodeMap.get(ev.from_node_id)} → {nodeMap.get(ev.to_node_id)} · Operator: {userMap.get(ev.performed_by)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      {ev.record_hash.slice(0, 10)}...
                    </span>
                    <div className="text-[10px] font-mono text-slate-400 mt-1 tabular-nums">
                      {ev.event_timestamp.slice(11, 19)} UTC
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
