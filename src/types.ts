export type UserRole = 'ADMIN' | 'FIELD_TECHNICIAN' | 'LAB_ANALYST' | 'TRANSPORTER' | 'AUDITOR';

export type SampleStatus =
  | 'REGISTERED'
  | 'COLLECTED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'UNDER_TESTING'
  | 'TEST_COMPLETED'
  | 'STORED'
  | 'DISPOSED';

export type NodeType =
  | 'COLLECTION_POINT'
  | 'TRANSPORT_HUB'
  | 'MAIN_LABORATORY'
  | 'TESTING_UNIT'
  | 'SECURE_STORAGE'
  | 'DISPOSAL_UNIT';

export interface User {
  user_id: number;
  username: string;
  full_name: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export interface LaboratoryNode {
  node_id: number;
  node_code: string;
  node_name: string;
  node_type: NodeType;
  location: string;
  active: boolean;
  created_at: string;
}

export interface Sample {
  sample_id: number;
  sample_code: string;
  sample_type: string;
  description: string;
  source_name: string;
  registered_by: number;
  current_node_id: number;
  current_status: SampleStatus;
  created_at: string;
  updated_at: string;
}

export interface SampleMovement {
  movement_id: number;
  sample_id: number;
  from_node_id: number;
  to_node_id: number;
  old_status: SampleStatus;
  new_status: SampleStatus;
  performed_by: number;
  remarks: string;
  event_timestamp: string;
}

export interface AuditLedgerBlock {
  ledger_id: number;
  sample_id: number;
  previous_ledger_id: number | null;
  from_node_id: number;
  to_node_id: number;
  action_type: string;
  old_status: SampleStatus | null;
  new_status: SampleStatus;
  performed_by: number;
  event_timestamp: string;
  remarks: string;
  previous_hash: string;
  record_hash: string;
  is_tampered?: boolean;
}

export interface VerificationResult {
  sample_id: number;
  sample_code: string;
  sample_type: string;
  current_status: SampleStatus;
  total_records: number;
  chain_valid: boolean;
  broken_at_ledger_id: number | null;
  failure_reason: string;
}
