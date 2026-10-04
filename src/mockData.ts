import { User, LaboratoryNode, Sample, AuditLedgerBlock, SampleMovement } from './types';
import { GENESIS_PREVIOUS_HASH } from './crypto';

export const INITIAL_USERS: User[] = [
  {
    user_id: 1,
    username: 'admin',
    full_name: 'Dr. Marcus Vance (System Admin)',
    role: 'ADMIN',
    active: true,
    created_at: '2026-09-01T08:00:00Z'
  },
  {
    user_id: 2,
    username: 'tech_sarah',
    full_name: 'Sarah Jenkins (Field Technician)',
    role: 'FIELD_TECHNICIAN',
    active: true,
    created_at: '2026-09-01T08:00:00Z'
  },
  {
    user_id: 3,
    username: 'analyst_raj',
    full_name: 'Rajesh Sharma (Senior Lab Analyst)',
    role: 'LAB_ANALYST',
    active: true,
    created_at: '2026-09-01T08:00:00Z'
  },
  {
    user_id: 4,
    username: 'courier_dave',
    full_name: 'David Rodriguez (Logistics Courier)',
    role: 'TRANSPORTER',
    active: true,
    created_at: '2026-09-01T08:00:00Z'
  },
  {
    user_id: 5,
    username: 'auditor_elena',
    full_name: 'Elena Rostova (Compliance Auditor)',
    role: 'AUDITOR',
    active: true,
    created_at: '2026-09-01T08:00:00Z'
  }
];

export const INITIAL_NODES: LaboratoryNode[] = [
  {
    node_id: 1,
    node_code: 'CP-01',
    node_name: 'District River Catchment Point',
    node_type: 'COLLECTION_POINT',
    location: 'Sector 4 Riverbank Intake Station',
    active: true,
    created_at: '2026-08-01T08:00:00Z'
  },
  {
    node_id: 2,
    node_code: 'TH-01',
    node_name: 'Logistics Transit Depot Alpha',
    node_type: 'TRANSPORT_HUB',
    location: 'Terminal 2 Freight Corridor',
    active: true,
    created_at: '2026-08-01T08:00:00Z'
  },
  {
    node_id: 3,
    node_code: 'ML-01',
    node_name: 'Central Environmental Analytical Lab',
    node_type: 'MAIN_LABORATORY',
    location: 'Apex Science Park Building C, Floor 2',
    active: true,
    created_at: '2026-08-01T08:00:00Z'
  },
  {
    node_id: 4,
    node_code: 'TU-01',
    node_name: 'Chromatography & Mass Spectrometry Unit',
    node_type: 'TESTING_UNIT',
    location: 'Apex Science Park Testing Suite 4B',
    active: true,
    created_at: '2026-08-01T08:00:00Z'
  },
  {
    node_id: 5,
    node_code: 'SS-01',
    node_name: 'Cryogenic Bio-Vault Alpha',
    node_type: 'SECURE_STORAGE',
    location: 'Sub-level -2 Cold Vault Room 10',
    active: true,
    created_at: '2026-08-01T08:00:00Z'
  },
  {
    node_id: 6,
    node_code: 'DU-01',
    node_name: 'Controlled Biohazard Incineration Facility',
    node_type: 'DISPOSAL_UNIT',
    location: 'Industrial Containment Yard 7',
    active: true,
    created_at: '2026-08-01T08:00:00Z'
  }
];

export const INITIAL_SAMPLES: Sample[] = [
  {
    sample_id: 1,
    sample_code: 'SMP-2026-0001',
    sample_type: 'Potable Water Specimen',
    description: 'Municipal reservoir intake test for dissolved heavy metals and PFAS',
    source_name: 'North River Reservoir Dam Gate 3',
    registered_by: 2,
    current_node_id: 5,
    current_status: 'STORED',
    created_at: '2026-10-01T08:30:00Z',
    updated_at: '2026-10-02T16:45:00Z'
  },
  {
    sample_id: 2,
    sample_code: 'SMP-2026-0002',
    sample_type: 'Industrial Effluent Discharge',
    description: 'Surveillance sample from chemical manufacturing outflow tributary',
    source_name: 'Apex Chemical Industrial Outfall #9',
    registered_by: 2,
    current_node_id: 4,
    current_status: 'UNDER_TESTING',
    created_at: '2026-10-02T09:15:00Z',
    updated_at: '2026-10-03T11:20:00Z'
  },
  {
    sample_id: 3,
    sample_code: 'SMP-2026-0003',
    sample_type: 'Agricultural Soil Core',
    description: 'Topsoil pesticide residue survey from organic certified farmland',
    source_name: 'Green Valley Farm Plot 14',
    registered_by: 2,
    current_node_id: 2,
    current_status: 'IN_TRANSIT',
    created_at: '2026-10-03T14:00:00Z',
    updated_at: '2026-10-04T07:10:00Z'
  },
  {
    sample_id: 4,
    sample_code: 'SMP-2026-0004',
    sample_type: 'Airborne Particulate Filter',
    description: 'HEPA intake monitor filter for urban particulate matter PM2.5 evaluation',
    source_name: 'City Center Traffic Junction Station 1',
    registered_by: 2,
    current_node_id: 1,
    current_status: 'REGISTERED',
    created_at: '2026-10-04T06:45:00Z',
    updated_at: '2026-10-04T06:45:00Z'
  },
  {
    sample_id: 5,
    sample_code: 'SMP-2026-0005',
    sample_type: 'Bio-Clinical Serum Specimen',
    description: 'Viral vector control sample post-study holding',
    source_name: 'Metropolitan Medical Center Ward 6',
    registered_by: 2,
    current_node_id: 6,
    current_status: 'DISPOSED',
    created_at: '2026-09-28T10:00:00Z',
    updated_at: '2026-09-30T17:30:00Z'
  }
];

// Pre-computed hash blocks for the initial samples to ensure instant zero-latency loads
export const INITIAL_LEDGER: AuditLedgerBlock[] = [
  // SMP-2026-0001 lifecycle
  {
    ledger_id: 1,
    sample_id: 1,
    previous_ledger_id: null,
    from_node_id: 1,
    to_node_id: 1,
    action_type: 'REGISTER_SAMPLE',
    old_status: null,
    new_status: 'REGISTERED',
    performed_by: 2,
    event_timestamp: '2026-10-01T08:30:00.000000Z',
    remarks: 'Specimen bottled in sterile fluoropolymer container with temperature tag',
    previous_hash: GENESIS_PREVIOUS_HASH,
    record_hash: '9a5c92e70e17812e9b018598971fce81ba5767ebcfae1882414db0b80d4db5bb'
  },
  {
    ledger_id: 2,
    sample_id: 1,
    previous_ledger_id: 1,
    from_node_id: 1,
    to_node_id: 1,
    action_type: 'SAMPLE_COLLECTED',
    old_status: 'REGISTERED',
    new_status: 'COLLECTED',
    performed_by: 2,
    event_timestamp: '2026-10-01T09:10:00.000000Z',
    remarks: 'Sample verified, sealed with tamper-evident band #TX-9901',
    previous_hash: '9a5c92e70e17812e9b018598971fce81ba5767ebcfae1882414db0b80d4db5bb',
    record_hash: '3bc94ea12f275988d8b4c063cfcb03a73c329b31911462001550c6ca7e0cb3a1'
  },
  {
    ledger_id: 3,
    sample_id: 1,
    previous_ledger_id: 2,
    from_node_id: 1,
    to_node_id: 2,
    action_type: 'DISPATCH_TRANSIT',
    old_status: 'COLLECTED',
    new_status: 'IN_TRANSIT',
    performed_by: 4,
    event_timestamp: '2026-10-01T10:45:00.000000Z',
    remarks: 'Transferred to insulated chilled courier box, dispatched via Courier Dave',
    previous_hash: '3bc94ea12f275988d8b4c063cfcb03a73c329b31911462001550c6ca7e0cb3a1',
    record_hash: '57f2010c79e6bd35a0fbeebaf6929e7100b1a03f8f1cba77ca0d54a2db6c1e34'
  },
  {
    ledger_id: 4,
    sample_id: 1,
    previous_ledger_id: 3,
    from_node_id: 2,
    to_node_id: 3,
    action_type: 'RECEIVE_AT_FACILITY',
    old_status: 'IN_TRANSIT',
    new_status: 'RECEIVED',
    performed_by: 3,
    event_timestamp: '2026-10-01T14:00:00.000000Z',
    remarks: 'Received at Central Lab reception; temperature logged at 3.8°C',
    previous_hash: '57f2010c79e6bd35a0fbeebaf6929e7100b1a03f8f1cba77ca0d54a2db6c1e34',
    record_hash: 'd28a3910c0e7b8f0562e19a9042b9c79e19d7010a30b533d3e69fa0bf1f629aa'
  },
  {
    ledger_id: 5,
    sample_id: 1,
    previous_ledger_id: 4,
    from_node_id: 3,
    to_node_id: 4,
    action_type: 'COMMENCE_TESTING',
    old_status: 'RECEIVED',
    new_status: 'UNDER_TESTING',
    performed_by: 3,
    event_timestamp: '2026-10-02T09:00:00.000000Z',
    remarks: 'Aliquot prepared and loaded into Gas Chromatography rack',
    previous_hash: 'd28a3910c0e7b8f0562e19a9042b9c79e19d7010a30b533d3e69fa0bf1f629aa',
    record_hash: '6a43922f183980bc235cf6d5257cb7a61dcf3a89045b1424df9ea056525f9b45'
  },
  {
    ledger_id: 6,
    sample_id: 1,
    previous_ledger_id: 5,
    from_node_id: 4,
    to_node_id: 4,
    action_type: 'COMPLETE_TESTING',
    old_status: 'UNDER_TESTING',
    new_status: 'TEST_COMPLETED',
    performed_by: 3,
    event_timestamp: '2026-10-02T14:30:00.000000Z',
    remarks: 'Spectrometry run completed; lead < 0.001 mg/L, meets EPA standards',
    previous_hash: '6a43922f183980bc235cf6d5257cb7a61dcf3a89045b1424df9ea056525f9b45',
    record_hash: '0ff67d1c6819eb38bcfa031b268da56002bbab4e5b323497d33d96e57922d9b2'
  },
  {
    ledger_id: 7,
    sample_id: 1,
    previous_ledger_id: 6,
    from_node_id: 4,
    to_node_id: 5,
    action_type: 'PLACE_IN_STORAGE',
    old_status: 'TEST_COMPLETED',
    new_status: 'STORED',
    performed_by: 3,
    event_timestamp: '2026-10-02T16:45:00.000000Z',
    remarks: 'Archived in Cryogenic Vault Alpha rack B-12 for 180-day retention',
    previous_hash: '0ff67d1c6819eb38bcfa031b268da56002bbab4e5b323497d33d96e57922d9b2',
    record_hash: '4e31849fbc216c52a36b5c3b17c992764fbbbc64cb3b7d34190c1f4e1f743ac5'
  },

  // SMP-2026-0002 lifecycle
  {
    ledger_id: 8,
    sample_id: 2,
    previous_ledger_id: null,
    from_node_id: 1,
    to_node_id: 1,
    action_type: 'REGISTER_SAMPLE',
    old_status: null,
    new_status: 'REGISTERED',
    performed_by: 2,
    event_timestamp: '2026-10-02T09:15:00.000000Z',
    remarks: 'Brownish tint noted; pH preliminary strip reading 5.4',
    previous_hash: GENESIS_PREVIOUS_HASH,
    record_hash: '1c02abf923055ea087cb8d3fbe70685e19485cc1202eecb084931f6ef1e92d77'
  },
  {
    ledger_id: 9,
    sample_id: 2,
    previous_ledger_id: 8,
    from_node_id: 1,
    to_node_id: 1,
    action_type: 'SAMPLE_COLLECTED',
    old_status: 'REGISTERED',
    new_status: 'COLLECTED',
    performed_by: 2,
    event_timestamp: '2026-10-02T10:00:00.000000Z',
    remarks: 'Double-bagged in acid-resistant container',
    previous_hash: '1c02abf923055ea087cb8d3fbe70685e19485cc1202eecb084931f6ef1e92d77',
    record_hash: '77ea14238e833446bf48ce1d52033c9454f7626ce8bbf59941a87754ff36a2de'
  },
  {
    ledger_id: 10,
    sample_id: 2,
    previous_ledger_id: 9,
    from_node_id: 1,
    to_node_id: 2,
    action_type: 'DISPATCH_TRANSIT',
    old_status: 'COLLECTED',
    new_status: 'IN_TRANSIT',
    performed_by: 4,
    event_timestamp: '2026-10-02T13:30:00.000000Z',
    remarks: 'Handed over to Transport Hub Alpha for express dispatch',
    previous_hash: '77ea14238e833446bf48ce1d52033c9454f7626ce8bbf59941a87754ff36a2de',
    record_hash: 'a98b4887342dfac64e7c7a52231940176b6bb7f5e1f0e21a288417cd924b17e4'
  },
  {
    ledger_id: 11,
    sample_id: 2,
    previous_ledger_id: 10,
    from_node_id: 2,
    to_node_id: 3,
    action_type: 'RECEIVE_AT_FACILITY',
    old_status: 'IN_TRANSIT',
    new_status: 'RECEIVED',
    performed_by: 3,
    event_timestamp: '2026-10-03T08:45:00.000000Z',
    remarks: 'Lab check-in confirmed; barcode verified',
    previous_hash: 'a98b4887342dfac64e7c7a52231940176b6bb7f5e1f0e21a288417cd924b17e4',
    record_hash: 'e86b2416b710ecf5a6081519a9a08e1e791e850b1a03f4212f4cc7f61c33a948'
  },
  {
    ledger_id: 12,
    sample_id: 2,
    previous_ledger_id: 11,
    from_node_id: 3,
    to_node_id: 4,
    action_type: 'COMMENCE_TESTING',
    old_status: 'RECEIVED',
    new_status: 'UNDER_TESTING',
    performed_by: 3,
    event_timestamp: '2026-10-03T11:20:00.000000Z',
    remarks: 'Inductively Coupled Plasma testing initiated by Analyst Raj',
    previous_hash: 'e86b2416b710ecf5a6081519a9a08e1e791e850b1a03f4212f4cc7f61c33a948',
    record_hash: '22b6c7a9e10f135b8cf01b97bb4c161962ee1824c16928e19b5bfb799e03d3bc'
  },

  // SMP-2026-0003 lifecycle
  {
    ledger_id: 13,
    sample_id: 3,
    previous_ledger_id: null,
    from_node_id: 1,
    to_node_id: 1,
    action_type: 'REGISTER_SAMPLE',
    old_status: null,
    new_status: 'REGISTERED',
    performed_by: 2,
    event_timestamp: '2026-10-03T14:00:00.000000Z',
    remarks: 'Core extracted at 30cm depth; ambient moisture preserved',
    previous_hash: GENESIS_PREVIOUS_HASH,
    record_hash: 'bf80155b14197cc0f21469e380fb65fec7dbbc2985f973aa65e9bbba09d437ce'
  },
  {
    ledger_id: 14,
    sample_id: 3,
    previous_ledger_id: 13,
    from_node_id: 1,
    to_node_id: 1,
    action_type: 'SAMPLE_COLLECTED',
    old_status: 'REGISTERED',
    new_status: 'COLLECTED',
    performed_by: 2,
    event_timestamp: '2026-10-03T15:30:00.000000Z',
    remarks: 'Sealed in vacuum-packed nitrogen barrier pouch',
    previous_hash: 'bf80155b14197cc0f21469e380fb65fec7dbbc2985f973aa65e9bbba09d437ce',
    record_hash: 'd660b43ea920cba1e7804473b185f5e9ecf2eb305c48b6118b8f2203ca9949d1'
  },
  {
    ledger_id: 15,
    sample_id: 3,
    previous_ledger_id: 14,
    from_node_id: 1,
    to_node_id: 2,
    action_type: 'DISPATCH_TRANSIT',
    old_status: 'COLLECTED',
    new_status: 'IN_TRANSIT',
    performed_by: 4,
    event_timestamp: '2026-10-04T07:10:00.000000Z',
    remarks: 'Loaded on refrigerated route vehicle VK-402',
    previous_hash: 'd660b43ea920cba1e7804473b185f5e9ecf2eb305c48b6118b8f2203ca9949d1',
    record_hash: '9c530bf86e3f53835ce0bb76db187cbcfb62e49c7ae84bb937414995f5ccde41'
  },

  // SMP-2026-0004 lifecycle
  {
    ledger_id: 16,
    sample_id: 4,
    previous_ledger_id: null,
    from_node_id: 1,
    to_node_id: 1,
    action_type: 'REGISTER_SAMPLE',
    old_status: null,
    new_status: 'REGISTERED',
    performed_by: 2,
    event_timestamp: '2026-10-04T06:45:00.000000Z',
    remarks: 'Filter membrane sealed in antistatic Petri dish cassette',
    previous_hash: GENESIS_PREVIOUS_HASH,
    record_hash: '7a12b6f1cae79802095eb1df499616acb879c4a52faec13e9a7e80d4fcb30ec8'
  },

  // SMP-2026-0005 lifecycle (Terminal: DISPOSED)
  {
    ledger_id: 17,
    sample_id: 5,
    previous_ledger_id: null,
    from_node_id: 1,
    to_node_id: 1,
    action_type: 'REGISTER_SAMPLE',
    old_status: null,
    new_status: 'REGISTERED',
    performed_by: 2,
    event_timestamp: '2026-09-28T10:00:00.000000Z',
    remarks: 'Biohazard Level 2 specimen tube with dual tamper seals',
    previous_hash: GENESIS_PREVIOUS_HASH,
    record_hash: '68b9c2e0b57112ea993f4178a9c1e7a57a55cb497bfcf032bc864fbba849d4e5'
  },
  {
    ledger_id: 18,
    sample_id: 5,
    previous_ledger_id: 17,
    from_node_id: 1,
    to_node_id: 6,
    action_type: 'SAFE_DISPOSAL',
    old_status: 'STORED',
    new_status: 'DISPOSED',
    performed_by: 1,
    event_timestamp: '2026-09-30T17:30:00.000000Z',
    remarks: 'Autoclaved at 121°C and incinerated under biological manifest #DISP-882',
    previous_hash: '68b9c2e0b57112ea993f4178a9c1e7a57a55cb497bfcf032bc864fbba849d4e5',
    record_hash: '8f0011bbec708914ea9885c3514a7e9373cf58bb0e3cb20a58e411b7fc857a62'
  }
];
