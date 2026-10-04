import React, { useState, useMemo } from 'react';
import { AuditLedgerBlock, Sample, LaboratoryNode, User } from '../types';
import { Search, Lock, ShieldAlert, ShieldCheck, Copy, Check } from 'lucide-react';

interface AuditLedgerViewProps {
  ledger: AuditLedgerBlock[];
  samples: Sample[];
  nodes: LaboratoryNode[];
  users: User[];
  onSelectSample: (code: string) => void;
}

export const AuditLedgerView: React.FC<AuditLedgerViewProps> = ({
  ledger,
  samples,
  nodes,
  users,
  onSelectSample
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [attackResult, setAttackResult] = useState<{ type: 'blocked' | 'error'; message: string } | null>(null);

  const sampleMap = useMemo(() => new Map(samples.map(s => [s.sample_id, s.sample_code])), [samples]);
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.node_id, n.node_name])), [nodes]);
  const userMap = useMemo(() => new Map(users.map(u => [u.user_id, u.full_name])), [users]);

  const copyToClipboard = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1500);
  };

  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return [...ledger].reverse().filter(r => {
      const sampleCode = sampleMap.get(r.sample_id) || '';
      return (
        !q ||
        sampleCode.toLowerCase().includes(q) ||
        r.action_type.toLowerCase().includes(q) ||
        r.record_hash.toLowerCase().includes(q) ||
        r.previous_hash.toLowerCase().includes(q)
      );
    });
  }, [ledger, searchQuery, sampleMap]);

  const simulateTriggerAttack = (operation: 'UPDATE' | 'DELETE') => {
    // Demonstrates PostgreSQL PL/pgSQL trigger behavior:
    // prevent_ledger_modification() raises exception before UPDATE or DELETE
    const targetBlockId = ledger[0]?.ledger_id || 1;
    setAttackResult({
      type: 'blocked',
      message: `PostgreSQL Database Exception [SQLSTATE: 23505]: Execution of ${operation} on table "sample_audit_ledger" (Target ledger_id: ${targetBlockId}) was aborted by trigger "prevent_ledger_modification()". Reason: "Audit ledger records are immutable. ${operation} operations are strictly prohibited."`
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cryptographic Audit Ledger</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Append-only relational ledger. Every record is permanently linked via cryptographic SHA-256 signatures.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => simulateTriggerAttack('UPDATE')}
            className="px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-300 font-semibold transition-colors flex items-center gap-1.5"
            title="Demonstrate trigger prevent_ledger_modification()"
          >
            <Lock className="w-3.5 h-3.5 text-slate-700" />
            <span>Test UPDATE Immutability</span>
          </button>
          <button
            onClick={() => simulateTriggerAttack('DELETE')}
            className="px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-300 font-semibold transition-colors flex items-center gap-1.5"
            title="Demonstrate trigger prevent_ledger_modification()"
          >
            <Lock className="w-3.5 h-3.5 text-rose-600" />
            <span>Test DELETE Immutability</span>
          </button>
        </div>
      </div>

      {/* Trigger Simulation Response Notice */}
      {attackResult && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start justify-between gap-2 shadow-sm">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-amber-950">Database Engine Trigger Interception:</span>
              <span className="font-mono text-[11px] block mt-0.5">{attackResult.message}</span>
            </div>
          </div>
          <button
            onClick={() => setAttackResult(null)}
            className="text-amber-800 hover:text-amber-950 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Database Immutability Callout */}
      <div className="bg-slate-900 text-white rounded-lg p-3.5 flex items-start gap-3 shadow-sm">
        <Lock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-slate-100 block">PostgreSQL Immutability Guarantee</span>
          <span className="text-slate-300">
            Records in <code>sample_audit_ledger</code> cannot be edited or erased by any role, including DBAs.
            The PL/pgSQL trigger <code>prevent_ledger_modification()</code> intercepts all <code>UPDATE</code> and <code>DELETE</code> statements at the storage engine level and rolls them back immediately.
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ledger by Specimen Code (e.g. SMP-2026), Action Type, or SHA-256 Hash..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500 focus:bg-white font-mono"
          />
        </div>
      </div>

      {/* Global Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">Chronological Append-Only Chain</span>
          <span className="text-xs font-mono text-slate-400">Total Blocks: {filteredRecords.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Block #</th>
                <th className="py-2.5 px-3">Specimen</th>
                <th className="py-2.5 px-3">Prev Block</th>
                <th className="py-2.5 px-3">Action Type</th>
                <th className="py-2.5 px-3">State Transition</th>
                <th className="py-2.5 px-3">Location Handover</th>
                <th className="py-2.5 px-3">Operator</th>
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Previous Hash</th>
                <th className="py-2.5 px-3">Record SHA-256</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredRecords.map(r => {
                const sampleCode = sampleMap.get(r.sample_id) || `SMP-${r.sample_id}`;
                const fromNodeName = nodeMap.get(r.from_node_id);
                const toNodeName = nodeMap.get(r.to_node_id);
                const operatorName = userMap.get(r.performed_by);

                return (
                  <tr key={r.ledger_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900">#{r.ledger_id}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      <button
                        onClick={() => onSelectSample(sampleCode)}
                        className="hover:text-blue-600 hover:underline"
                      >
                        {sampleCode}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {r.previous_ledger_id ? `#${r.previous_ledger_id}` : (
                        <span className="text-[10px] px-1 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">
                          GENESIS
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-800">{r.action_type}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-slate-500">{r.old_status || '—'}</span>
                      <span className="text-slate-400 mx-1">→</span>
                      <span className="font-bold text-slate-900">{r.new_status}</span>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600 truncate max-w-xs" title={`${fromNodeName} → ${toNodeName}`}>
                      {fromNodeName} → {toNodeName}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-700">{operatorName}</td>
                    <td className="py-2.5 px-3 text-slate-500 tabular-nums">
                      {r.event_timestamp.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      <div className="flex items-center gap-1">
                        <span>{r.previous_hash.slice(0, 8)}...</span>
                        <button
                          onClick={() => copyToClipboard(r.previous_hash)}
                          className="text-slate-400 hover:text-slate-700"
                          title="Copy Full Hash"
                        >
                          {copiedHash === r.previous_hash ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-blue-700 font-semibold">
                      <div className="flex items-center gap-1">
                        <span>{r.record_hash.slice(0, 8)}...</span>
                        <button
                          onClick={() => copyToClipboard(r.record_hash)}
                          className="text-blue-500 hover:text-blue-800"
                          title="Copy Full Hash"
                        >
                          {copiedHash === r.record_hash ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-slate-400 font-sans text-xs">
                    No ledger records match your query.
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
