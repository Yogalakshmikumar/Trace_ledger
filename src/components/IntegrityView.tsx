import React, { useState, useEffect } from 'react';
import { Sample, AuditLedgerBlock, VerificationResult } from '../types';
import { computeLedgerHash, GENESIS_PREVIOUS_HASH } from '../crypto';
import {
  ShieldCheck,
  ShieldAlert,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  Bug,
  Undo2
} from 'lucide-react';

interface IntegrityViewProps {
  samples: Sample[];
  ledger: AuditLedgerBlock[];
  onTamperBlock: (ledgerId: number) => void;
  onRestoreLedger: () => void;
  onSelectSample: (code: string) => void;
}

export const IntegrityView: React.FC<IntegrityViewProps> = ({
  samples,
  ledger,
  onTamperBlock,
  onRestoreLedger,
  onSelectSample
}) => {
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);

  // Run the cryptographic verification engine matching PL/pgSQL verify_sample_chain()
  const runVerification = async () => {
    setIsVerifying(true);
    const newResults: VerificationResult[] = [];

    for (const sample of samples) {
      const sampleBlocks = ledger
        .filter(b => b.sample_id === sample.sample_id)
        .sort((a, b) => a.ledger_id - b.ledger_id);

      if (sampleBlocks.length === 0) {
        newResults.push({
          sample_id: sample.sample_id,
          sample_code: sample.sample_code,
          sample_type: sample.sample_type,
          current_status: sample.current_status,
          total_records: 0,
          chain_valid: false,
          broken_at_ledger_id: null,
          failure_reason: 'No audit records exist for this specimen.'
        });
        continue;
      }

      let chainValid = true;
      let brokenAt: number | null = null;
      let failureReason = 'Chain intact and fully verified against SHA-256 invariants.';
      let prevId: number | null = null;
      let prevHash = GENESIS_PREVIOUS_HASH;

      for (let i = 0; i < sampleBlocks.length; i++) {
        const block = sampleBlocks[i];

        // 1. Genesis record validation
        if (i === 0) {
          if (block.previous_ledger_id !== null) {
            chainValid = false;
            brokenAt = block.ledger_id;
            failureReason = 'Genesis ledger record must not have a previous_ledger_id.';
            break;
          }
          if (block.previous_hash !== GENESIS_PREVIOUS_HASH) {
            chainValid = false;
            brokenAt = block.ledger_id;
            failureReason = 'Genesis ledger record has invalid genesis previous_hash.';
            break;
          }
        } else {
          // 2. Predecessor ID continuity
          if (block.previous_ledger_id !== prevId) {
            chainValid = false;
            brokenAt = block.ledger_id;
            failureReason = `Predecessor ID mismatch: expected #${prevId}, found #${block.previous_ledger_id}`;
            break;
          }

          // 3. Hash continuity
          if (block.previous_hash !== prevHash) {
            chainValid = false;
            brokenAt = block.ledger_id;
            failureReason = `Hash chain discontinuity: expected ${prevHash.slice(0, 12)}..., found ${block.previous_hash.slice(0, 12)}...`;
            break;
          }
        }

        // 4. Deterministic hash recalculation
        const computedHash = await computeLedgerHash({
          sample_id: block.sample_id,
          previous_ledger_id: block.previous_ledger_id,
          from_node_id: block.from_node_id,
          to_node_id: block.to_node_id,
          action_type: block.action_type,
          old_status: block.old_status,
          new_status: block.new_status,
          performed_by: block.performed_by,
          event_timestamp: block.event_timestamp,
          remarks: block.remarks,
          previous_hash: block.previous_hash
        });

        if (computedHash !== block.record_hash) {
          chainValid = false;
          brokenAt = block.ledger_id;
          failureReason = `Cryptographic signature mismatch: recalculated SHA-256 (${computedHash.slice(0, 10)}...) does not match stored digest (${block.record_hash.slice(0, 10)}...). Payload has been altered!`;
          break;
        }

        prevId = block.ledger_id;
        prevHash = block.record_hash;
      }

      newResults.push({
        sample_id: sample.sample_id,
        sample_code: sample.sample_code,
        sample_type: sample.sample_type,
        current_status: sample.current_status,
        total_records: sampleBlocks.length,
        chain_valid: chainValid,
        broken_at_ledger_id: brokenAt,
        failure_reason: failureReason
      });
    }

    setResults(newResults);
    setIsVerifying(false);
  };

  useEffect(() => {
    runVerification();
  }, [samples, ledger]);

  const totalSamples = results.length;
  const totalLedgerRecords = ledger.length;
  const validChains = results.filter(r => r.chain_valid).length;
  const brokenChains = results.filter(r => !r.chain_valid).length;
  const isAllValid = brokenChains === 0 && totalSamples > 0;

  const handleSimulateTamper = () => {
    // Pick first block of SMP-2026-0001 to tamper
    const targetBlock = ledger.find(b => b.sample_id === 1 && b.ledger_id === 2);
    if (targetBlock) {
      onTamperBlock(targetBlock.ledger_id);
    } else if (ledger.length > 0) {
      onTamperBlock(ledger[0].ledger_id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Chain Integrity Verification</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Recalculates deterministic SHA-256 signatures across all append-only records to detect data alteration
          </p>
        </div>
        <div className="flex items-center gap-2">
          {brokenChains > 0 ? (
            <button
              onClick={onRestoreLedger}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Restore Ledger Integrity</span>
            </button>
          ) : (
            <button
              onClick={handleSimulateTamper}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-md text-xs font-semibold transition-colors"
              title="Demonstrates SHA-256 tamper detection"
            >
              <Bug className="w-3.5 h-3.5 text-rose-600" />
              <span>Simulate Malicious Tampering</span>
            </button>
          )}

          <button
            onClick={runVerification}
            disabled={isVerifying}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Verifying...' : 'Re-Run Verification'}</span>
          </button>
        </div>
      </div>

      {/* Main Status Hero Indicator */}
      <div
        className={`p-6 rounded-lg border text-center transition-all ${
          isAllValid
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : 'bg-rose-50 border-rose-300 text-rose-950'
        }`}
      >
        <div className="flex justify-center mb-2">
          {isAllValid ? (
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-7 h-7" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 animate-pulse">
              <ShieldAlert className="w-7 h-7" />
            </div>
          )}
        </div>
        <h2 className={`text-2xl font-black tracking-tight ${isAllValid ? 'text-emerald-700' : 'text-rose-700'}`}>
          {isAllValid ? '✓ LEDGER INTEGRITY VERIFIED' : '⚠ INTEGRITY VIOLATION DETECTED'}
        </h2>
        <p className="text-xs text-slate-600 max-w-xl mx-auto mt-1">
          {isAllValid
            ? 'All sequential SHA-256 signatures, predecessor pointer continuities, and payload invariants are mathematically intact and unaltered.'
            : 'A cryptographic hash mismatch or predecessor pointer discontinuity was discovered! The audit chain has been compromised.'}
        </p>
      </div>

      {/* Verification Metrics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
          <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Samples Audited</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">{totalSamples}</div>
          <span className="text-[10px] text-slate-400">Unique specimens</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
          <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Ledger Blocks Checked</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">{totalLedgerRecords}</div>
          <span className="text-[10px] text-slate-400">Total SHA-256 blocks</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
          <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Valid Chains</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1 tabular-nums">{validChains}</div>
          <span className="text-[10px] text-slate-400">100% verified</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
          <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Broken Chains</span>
          <div className={`text-2xl font-bold font-mono mt-1 tabular-nums ${brokenChains > 0 ? 'text-rose-600 font-extrabold' : 'text-slate-400'}`}>
            {brokenChains}
          </div>
          <span className="text-[10px] text-slate-400">Tampered / inconsistent</span>
        </div>
      </div>

      {/* Cryptographic Rules Enforced */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
          Verification Invariants Enforced by <code>verify_sample_chain()</code>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900">1. Genesis Invariant:</strong> Block #1 of each sample must have <code>previous_ledger_id = NULL</code> and <code>previous_hash = 64 zero bytes</code>.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900">2. Pointer Continuity:</strong> Block $N$ ($N &gt; 1$) must strictly point to block $N-1$'s <code>ledger_id</code> with zero missing indices.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900">3. Hash Continuity:</strong> Block $N$'s <code>previous_hash</code> must strictly equal the stored <code>record_hash</code> of block $N-1$.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900">4. Signature Determinism:</strong> The SHA-256 digest re-computed on canonical payload fields must equal the stored <code>record_hash</code>.
            </div>
          </div>
        </div>
      </div>

      {/* Specimen Chain Verification Matrix */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">Specimen Chain Verification Matrix</span>
          <span className="text-xs font-mono text-slate-400">Total: {results.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Specimen Code</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Blocks</th>
                <th className="py-2.5 px-4">Verification Result</th>
                <th className="py-2.5 px-4">Anomaly Block</th>
                <th className="py-2.5 px-4">Diagnostic Details</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map(r => (
                <tr
                  key={r.sample_id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    !r.chain_valid ? 'bg-rose-50/60' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    <button
                      onClick={() => onSelectSample(r.sample_code)}
                      className="hover:text-blue-600 hover:underline"
                    >
                      {r.sample_code}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-slate-700">{r.sample_type}</td>
                  <td className="py-3 px-4 font-mono font-medium">{r.current_status}</td>
                  <td className="py-3 px-4 font-mono tabular-nums">{r.total_records}</td>
                  <td className="py-3 px-4">
                    {r.chain_valid ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>INTACT</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-800 animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        <span>TAMPERED</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {r.broken_at_ledger_id ? (
                      <span className="text-rose-700 font-bold">Block #{r.broken_at_ledger_id}</span>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px] max-w-sm truncate" title={r.failure_reason}>
                    {r.failure_reason}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onSelectSample(r.sample_code)}
                      className="px-2 py-1 text-slate-700 hover:bg-slate-100 border border-slate-300 rounded text-xs font-medium"
                    >
                      Timeline
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
