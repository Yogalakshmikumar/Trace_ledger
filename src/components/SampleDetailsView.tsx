import React, { useState } from 'react';
import { Sample, AuditLedgerBlock, LaboratoryNode, User } from '../types';
import {
  ArrowLeft,
  ArrowLeftRight,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Clock,
  Link,
  MapPin,
  User as UserIcon,
  Tag
} from 'lucide-react';

interface SampleDetailsViewProps {
  sample: Sample;
  history: AuditLedgerBlock[];
  nodes: LaboratoryNode[];
  users: User[];
  currentUser: User;
  onMoveClick: (code: string) => void;
  onBack: () => void;
}

export const SampleDetailsView: React.FC<SampleDetailsViewProps> = ({
  sample,
  history,
  nodes,
  users,
  currentUser,
  onMoveClick,
  onBack
}) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const nodeMap = new Map(nodes.map(n => [n.node_id, n]));
  const userMap = new Map(users.map(u => [u.user_id, u.full_name]));

  const currentNode = nodeMap.get(sample.current_node_id);
  const intakeUser = userMap.get(sample.registered_by);

  const copyToClipboard = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1500);
  };

  const STAGES = [
    'REGISTERED',
    'COLLECTED',
    'IN_TRANSIT',
    'RECEIVED',
    'UNDER_TESTING',
    'TEST_COMPLETED',
    'STORED',
    'DISPOSED'
  ];

  const stageIndices: Record<string, number> = {
    REGISTERED: 1,
    COLLECTED: 2,
    IN_TRANSIT: 3,
    RECEIVED: 4,
    UNDER_TESTING: 5,
    TEST_COMPLETED: 6,
    STORED: 7,
    DISPOSED: 8
  };

  const currentIdx = stageIndices[sample.current_status] || 1;

  // Verify chain continuity
  let isChainValid = true;
  let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
  for (let i = 0; i < history.length; i++) {
    const block = history[i];
    if (i === 0) {
      if (block.previous_hash !== previousHash || block.previous_ledger_id !== null) {
        isChainValid = false;
        break;
      }
    } else {
      if (block.previous_hash !== previousHash || block.previous_ledger_id !== history[i - 1].ledger_id) {
        isChainValid = false;
        break;
      }
    }
    previousHash = block.record_hash;
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono text-slate-900">{sample.sample_code}</h1>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                sample.current_status === 'STORED' ? 'bg-green-50 text-green-700 border-green-200' :
                sample.current_status === 'UNDER_TESTING' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                sample.current_status === 'IN_TRANSIT' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                sample.current_status === 'DISPOSED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                {sample.current_status}
              </span>
              {isChainValid ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Chain Verified</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-medium">
                  <ShieldAlert className="w-3 h-3" />
                  <span>Chain Tampered</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {sample.sample_type} · Origin: {sample.source_name}
            </p>
          </div>
        </div>

        {['ADMIN', 'FIELD_TECHNICIAN', 'TRANSPORTER', 'LAB_ANALYST'].includes(currentUser.role) && sample.current_status !== 'DISPOSED' && (
          <button
            onClick={() => onMoveClick(sample.sample_code)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Transition / Move Specimen</span>
          </button>
        )}
      </div>

      {/* Specimen Invariants Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
          Specimen Custody Parameters
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] uppercase font-semibold">Specimen Code</span>
            <span className="font-mono font-bold text-slate-900 mt-0.5 block">{sample.sample_code}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase font-semibold">Specimen Category</span>
            <span className="font-medium text-slate-800 mt-0.5 block">{sample.sample_type}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase font-semibold">Origin Site</span>
            <span className="font-medium text-slate-800 mt-0.5 block">{sample.source_name}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase font-semibold">Current Checkpoint</span>
            <span className="font-medium text-slate-800 mt-0.5 block">{currentNode?.node_name}</span>
            <span className="text-[10px] text-slate-400">{currentNode?.location}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase font-semibold">Intake Agent</span>
            <span className="font-medium text-slate-800 mt-0.5 block">{intakeUser}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase font-semibold">Registration Date</span>
            <span className="font-mono text-slate-600 mt-0.5 block tabular-nums">
              {sample.created_at.slice(0, 19).replace('T', ' ')} UTC
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase font-semibold">Last Transition</span>
            <span className="font-mono text-slate-600 mt-0.5 block tabular-nums">
              {sample.updated_at.slice(0, 19).replace('T', ' ')} UTC
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase font-semibold">Total Ledger Blocks</span>
            <span className="font-mono font-bold text-blue-600 mt-0.5 block">{history.length} append-only blocks</span>
          </div>
        </div>

        {sample.description && (
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
            <span className="text-slate-400 block text-[11px] uppercase font-semibold mb-0.5">Physical Packaging & Notes:</span>
            <p className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200">
              {sample.description}
            </p>
          </div>
        )}
      </div>

      {/* Visual Lifecycle Progression Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
          Lifecycle Progression Status
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {STAGES.map((st, i) => {
            const stepNum = i + 1;
            const isCompleted = stepNum < currentIdx;
            const isCurrent = stepNum === currentIdx;
            return (
              <div
                key={st}
                className={`p-2.5 rounded border text-center transition-all ${
                  isCurrent
                    ? 'bg-blue-600 text-white border-blue-700 shadow-sm font-bold'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}
              >
                <div className="text-[10px] font-mono tracking-tight opacity-75">STEP 0{stepNum}</div>
                <div className="text-[11px] font-mono mt-0.5 leading-tight">{st}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cryptographic Hash-Chained Audit Timeline */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="bg-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Cryptographic Audit Ledger Chain</h2>
            <span className="text-[11px] text-slate-400">
              Sequential SHA-256 hash chaining. Protected by PL/pgSQL immutability trigger.
            </span>
          </div>
          <span className="font-mono text-xs text-blue-300 font-bold">
            {history.length} Verified Block{history.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="p-5 space-y-4">
          {history.map((block, idx) => {
            const fromNode = nodeMap.get(block.from_node_id);
            const toNode = nodeMap.get(block.to_node_id);
            const actor = userMap.get(block.performed_by);

            return (
              <div
                key={block.ledger_id}
                className={`border rounded-lg p-4 transition-colors ${
                  block.is_tampered
                    ? 'bg-rose-50 border-rose-300'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Block Title Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-900 text-white rounded font-mono text-xs font-bold">
                      Block #{block.ledger_id}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{block.action_type}</span>
                    {block.previous_ledger_id ? (
                      <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                        <Link className="w-3 h-3 text-slate-400" />
                        Linked to Block #{block.previous_ledger_id}
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold">
                        GENESIS BLOCK
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 tabular-nums">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{block.event_timestamp.replace('T', ' ').slice(0, 19)} UTC</span>
                  </div>
                </div>

                {/* Transition & Custody Data */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mb-3">
                  <div>
                    <span className="text-slate-400 block text-[11px] uppercase font-semibold">Lifecycle State</span>
                    <div className="flex items-center gap-1.5 mt-1 font-mono">
                      <span className="text-slate-500">{block.old_status || 'GENESIS'}</span>
                      <span className="text-slate-400">→</span>
                      <span className="font-bold text-slate-900">{block.new_status}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px] uppercase font-semibold">Location Handover</span>
                    <div className="text-slate-800 font-medium mt-1">
                      {fromNode?.node_name} → {toNode?.node_name}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px] uppercase font-semibold">Custody Operator</span>
                    <div className="text-slate-800 font-medium mt-1">
                      {actor || `User ID ${block.performed_by}`}
                    </div>
                  </div>
                </div>

                {block.remarks && (
                  <div className="text-xs bg-slate-50 border border-slate-200 rounded p-2 mb-3 text-slate-700">
                    <strong className="text-slate-900 font-semibold">Remarks:</strong> {block.remarks}
                  </div>
                )}

                {/* Cryptographic Hashes */}
                <div className="bg-slate-50 rounded border border-slate-200 p-2.5 text-[11px] font-mono space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Previous Hash (Predecessor Invariant):</span>
                    <div className="flex items-center gap-1 text-slate-600">
                      <span className="truncate max-w-xs sm:max-w-md">{block.previous_hash}</span>
                      <button
                        onClick={() => copyToClipboard(block.previous_hash)}
                        className="text-slate-400 hover:text-slate-700"
                        title="Copy Previous Hash"
                      >
                        {copiedHash === block.previous_hash ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1 border-t border-slate-200/60">
                    <span className="text-slate-400 uppercase text-[10px] font-bold">Record Hash (SHA-256 Signature):</span>
                    <div className="flex items-center gap-1 text-blue-700 font-semibold">
                      <span className="truncate max-w-xs sm:max-w-md">{block.record_hash}</span>
                      <button
                        onClick={() => copyToClipboard(block.record_hash)}
                        className="text-blue-500 hover:text-blue-800"
                        title="Copy Record Hash"
                      >
                        {copiedHash === block.record_hash ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
