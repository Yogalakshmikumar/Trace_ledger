import React, { useState, useEffect } from 'react';
import { Sample, LaboratoryNode, User, SampleStatus } from '../types';
import { ArrowLeftRight, ArrowLeft, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';

interface MoveSampleViewProps {
  samples: Sample[];
  nodes: LaboratoryNode[];
  currentUser: User;
  preselectedCode?: string;
  onMoveSubmit: (data: {
    sample_code: string;
    new_status: SampleStatus;
    to_node_id: number;
    remarks: string;
  }) => Promise<boolean>;
  onCancel: () => void;
}

const ALLOWED_TRANSITIONS: Record<SampleStatus, SampleStatus[]> = {
  REGISTERED: ['COLLECTED'],
  COLLECTED: ['IN_TRANSIT'],
  IN_TRANSIT: ['RECEIVED'],
  RECEIVED: ['UNDER_TESTING', 'STORED'],
  UNDER_TESTING: ['TEST_COMPLETED'],
  TEST_COMPLETED: ['STORED'],
  STORED: ['DISPOSED'],
  DISPOSED: []
};

export const MoveSampleView: React.FC<MoveSampleViewProps> = ({
  samples,
  nodes,
  currentUser,
  preselectedCode = '',
  onMoveSubmit,
  onCancel
}) => {
  const [selectedCode, setSelectedCode] = useState(preselectedCode || (samples[0]?.sample_code || ''));
  const [newStatus, setNewStatus] = useState<SampleStatus | ''>('');
  const [toNodeId, setToNodeId] = useState<number>(nodes[0]?.node_id || 1);
  const [remarks, setRemarks] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeSample = samples.find(s => s.sample_code === selectedCode);
  const currentStatus = activeSample?.current_status;
  const allowedNextStatuses = currentStatus ? ALLOWED_TRANSITIONS[currentStatus] || [] : [];

  useEffect(() => {
    if (allowedNextStatuses.length > 0) {
      setNewStatus(allowedNextStatuses[0]);
    } else {
      setNewStatus('');
    }
  }, [selectedCode, currentStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!selectedCode || !newStatus || !toNodeId) {
      setErrorMessage('Please select a valid specimen, target status, and destination checkpoint.');
      return;
    }

    if (currentStatus && !ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus as SampleStatus)) {
      setErrorMessage(`Illegal lifecycle transition: Cannot transition from ${currentStatus} to ${newStatus}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onMoveSubmit({
        sample_code: selectedCode,
        new_status: newStatus as SampleStatus,
        to_node_id: Number(toNodeId),
        remarks: remarks.trim() || `Transferred to ${newStatus}`
      });
      if (!success) {
        setErrorMessage('Failed to record movement. Please verify inputs.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error executing record_sample_movement() procedure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Record Specimen Movement</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Executes atomic PL/pgSQL procedure: validates state transition, links previous hash & commits to ledger
          </p>
        </div>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
      </div>

      {/* Main Movement Card */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Chain of Custody Handover</h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">PL/pgSQL: record_sample_movement()</span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Choose Specimen */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Select Specimen <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500 focus:bg-white"
                required
              >
                {samples.map(s => (
                  <option key={s.sample_id} value={s.sample_code}>
                    {s.sample_code} ({s.current_status}) — {s.sample_type}
                  </option>
                ))}
              </select>
            </div>

            {/* Current Status Display */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Current Status (Read-Only)
              </label>
              <div className="px-3 py-2 text-xs font-mono font-semibold bg-slate-100 border border-slate-300 rounded-md text-slate-800 flex items-center justify-between">
                <span>{currentStatus || 'None'}</span>
                <span className="text-[11px] font-sans text-slate-500">
                  {allowedNextStatuses.length > 0 ? `${allowedNextStatuses.length} transition(s) available` : 'Terminal State'}
                </span>
              </div>
            </div>

            {/* Target Status Dropdown */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                New Target Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as SampleStatus)}
                disabled={allowedNextStatuses.length === 0}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500 focus:bg-white disabled:bg-slate-100 disabled:text-slate-400"
                required
              >
                {allowedNextStatuses.length === 0 ? (
                  <option value="">No transitions permitted (Terminal DISPOSED)</option>
                ) : (
                  allowedNextStatuses.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))
                )}
              </select>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Filtered dynamically by PostgreSQL state machine logic.
              </span>
            </div>

            {/* Destination Checkpoint Node */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Destination Checkpoint <span className="text-rose-500">*</span>
              </label>
              <select
                value={toNodeId}
                onChange={(e) => setToNodeId(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500 focus:bg-white"
                required
              >
                {nodes.map(n => (
                  <option key={n.node_id} value={n.node_id}>
                    {n.node_code} — {n.node_name} ({n.location})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Custody Handover Remarks & Log <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Courier Dave transferred specimen to Central Lab Reception; temperature verified at 3.8°C; seals verified intact."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500 focus:bg-white"
              required
            />
          </div>

          {/* State Machine Visualizer */}
          <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs">
            <span className="font-semibold text-slate-700 block mb-2">Enforced Lifecycle Sequence:</span>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
              <span className={`px-2 py-0.5 rounded border ${currentStatus === 'REGISTERED' ? 'bg-blue-600 text-white font-bold' : 'bg-white text-slate-600'}`}>REGISTERED</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className={`px-2 py-0.5 rounded border ${currentStatus === 'COLLECTED' ? 'bg-blue-600 text-white font-bold' : 'bg-white text-slate-600'}`}>COLLECTED</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className={`px-2 py-0.5 rounded border ${currentStatus === 'IN_TRANSIT' ? 'bg-blue-600 text-white font-bold' : 'bg-white text-slate-600'}`}>IN_TRANSIT</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className={`px-2 py-0.5 rounded border ${currentStatus === 'RECEIVED' ? 'bg-blue-600 text-white font-bold' : 'bg-white text-slate-600'}`}>RECEIVED</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className={`px-2 py-0.5 rounded border ${currentStatus === 'UNDER_TESTING' ? 'bg-blue-600 text-white font-bold' : 'bg-white text-slate-600'}`}>UNDER_TESTING</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className={`px-2 py-0.5 rounded border ${currentStatus === 'TEST_COMPLETED' ? 'bg-blue-600 text-white font-bold' : 'bg-white text-slate-600'}`}>TEST_COMPLETED</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className={`px-2 py-0.5 rounded border ${currentStatus === 'STORED' ? 'bg-blue-600 text-white font-bold' : 'bg-white text-slate-600'}`}>STORED</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className={`px-2 py-0.5 rounded border ${currentStatus === 'DISPOSED' ? 'bg-rose-600 text-white font-bold' : 'bg-white text-rose-600'}`}>DISPOSED</span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || allowedNextStatuses.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-md text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Computing SHA-256...' : 'Commit Movement & Link Block'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
