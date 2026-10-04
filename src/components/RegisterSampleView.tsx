import React, { useState } from 'react';
import { LaboratoryNode, User } from '../types';
import { GENESIS_PREVIOUS_HASH } from '../crypto';
import { ShieldCheck, PlusCircle, ArrowLeft, Info } from 'lucide-react';

interface RegisterSampleViewProps {
  nodes: LaboratoryNode[];
  currentUser: User;
  onRegisterSubmit: (data: {
    sample_code: string;
    sample_type: string;
    source_name: string;
    description: string;
    initial_node_id: number;
    remarks: string;
  }) => Promise<boolean>;
  onCancel: () => void;
}

export const RegisterSampleView: React.FC<RegisterSampleViewProps> = ({
  nodes,
  currentUser,
  onRegisterSubmit,
  onCancel
}) => {
  const [sampleCode, setSampleCode] = useState('SMP-2026-0006');
  const [sampleType, setSampleType] = useState('Potable Water Specimen');
  const [sourceName, setSourceName] = useState('');
  const [description, setDescription] = useState('');
  const [initialNodeId, setInitialNodeId] = useState<number>(nodes[0]?.node_id || 1);
  const [remarks, setRemarks] = useState('Initial field specimen intake with tamper-evident seal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!sampleCode.trim() || !sampleType || !sourceName.trim() || !initialNodeId) {
      setErrorMessage('Please fill in all mandatory fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onRegisterSubmit({
        sample_code: sampleCode.trim().toUpperCase(),
        sample_type: sampleType,
        source_name: sourceName.trim(),
        description: description.trim(),
        initial_node_id: Number(initialNodeId),
        remarks: remarks.trim()
      });
      if (!success) {
        setErrorMessage(`Sample code "${sampleCode}" already exists in the database.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error executing register_sample() procedure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">New Specimen Registration</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Initializes the physical specimen and commits Genesis Block #1 to the append-only ledger
          </p>
        </div>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Registry</span>
        </button>
      </div>

      {/* Form Container */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Genesis Ledger Block Formation</h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">PL/pgSQL: register_sample()</span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sample Code */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Sample Identifier <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={sampleCode}
                onChange={(e) => setSampleCode(e.target.value.toUpperCase())}
                placeholder="e.g. SMP-2026-0006"
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500 focus:bg-white"
                required
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Must be globally unique (enforced by UNIQUE constraint).
              </span>
            </div>

            {/* Sample Type */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Specimen Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={sampleType}
                onChange={(e) => setSampleType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500 focus:bg-white"
                required
              >
                <option value="Potable Water Specimen">Potable Water Specimen</option>
                <option value="Industrial Effluent Discharge">Industrial Effluent Discharge</option>
                <option value="Agricultural Soil Core">Agricultural Soil Core</option>
                <option value="Airborne Particulate Filter">Airborne Particulate Filter</option>
                <option value="Bio-Clinical Serum Specimen">Bio-Clinical Serum Specimen</option>
                <option value="Groundwater Aquifer Sample">Groundwater Aquifer Sample</option>
                <option value="Petrochemical Residue">Petrochemical Residue</option>
              </select>
            </div>

            {/* Source Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Origin / Collection Site <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="e.g. Sector 4 River Intake Dam Gate 1"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500 focus:bg-white"
                required
              />
            </div>

            {/* Initial Intake Checkpoint Node */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Initial Intake Node <span className="text-rose-500">*</span>
              </label>
              <select
                value={initialNodeId}
                onChange={(e) => setInitialNodeId(Number(e.target.value))}
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

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Specimen Physical Packaging & Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 500mL sterile fluoropolymer amber container; temperature strip reads 4.2°C; dual serialized security zip tags attached."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          {/* Genesis Remarks */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Genesis Audit Remarks
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          {/* Genesis Cryptographic Invariant Explanation */}
          <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Genesis Invariant:</strong> Block #1 will be created with status <code className="bg-white px-1 py-0.5 border rounded">REGISTERED</code>, pointing to predecessor ID <code className="bg-white px-1 py-0.5 border rounded">NULL</code> and previous hash:
                <div className="font-mono text-[10px] text-slate-500 mt-1 break-all bg-white p-1 rounded border">
                  {GENESIS_PREVIOUS_HASH}
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
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
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Computing SHA-256...' : 'Commit Registration & Genesis Block'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
