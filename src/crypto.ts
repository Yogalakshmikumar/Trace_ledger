/**
 * SHA-256 Cryptographic Hash Utility for TraceLedger
 * Matches the canonical payload and hashing implemented in database/02_functions.sql:
 * compute_ledger_hash()
 */

export async function sha256Hex(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const GENESIS_PREVIOUS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export async function computeLedgerHash(params: {
  sample_id: number;
  previous_ledger_id: number | null;
  from_node_id: number;
  to_node_id: number;
  action_type: string;
  old_status: string | null;
  new_status: string;
  performed_by: number;
  event_timestamp: string;
  remarks: string;
  previous_hash: string;
}): Promise<string> {
  const canonicalPayload = [
    params.sample_id.toString(),
    params.previous_ledger_id ? params.previous_ledger_id.toString() : '0',
    params.from_node_id.toString(),
    params.to_node_id.toString(),
    params.action_type.trim(),
    (params.old_status || 'NONE').trim(),
    params.new_status.trim(),
    params.performed_by.toString(),
    params.event_timestamp.trim(),
    (params.remarks || '').trim(),
    params.previous_hash.trim()
  ].join('|');

  return await sha256Hex(canonicalPayload);
}
