-- =============================================================================
-- TRACELEDGER – Tamper-Resistant Sample Lifecycle Tracking and Audit System
-- 05_seed_data.sql: Realistic Seed Data with Verified SHA-256 Hash Chaining
-- =============================================================================

-- Clear existing data
TRUNCATE TABLE sample_movements, sample_audit_ledger, samples, laboratory_nodes, users RESTART IDENTITY CASCADE;

-- -----------------------------------------------------------------------------
-- 1. SEED USERS
-- Standard default password for all demo accounts: TraceLedger2026!
-- Hash generated using Werkzeug / pbkdf2:sha256 format
-- -----------------------------------------------------------------------------
INSERT INTO users (user_id, username, full_name, password_hash, role, active, created_at)
VALUES
(1, 'admin', 'Dr. Marcus Vance (System Admin)', 'scrypt:32768:8:1$7fM3DsqLpUq47Kx1$7dc55d3cf4c391219b1612e4310cfd4c82c3fcfcba34ba4c810a95ff0d1a6e7fcbe06e6bf1ff04d80ea4c185a034293f9cbe8b2e59dfd5970c6a51d5ea2434fa', 'ADMIN', TRUE, NOW() - INTERVAL '30 days'),
(2, 'tech_sarah', 'Sarah Jenkins (Field Technician)', 'scrypt:32768:8:1$7fM3DsqLpUq47Kx1$7dc55d3cf4c391219b1612e4310cfd4c82c3fcfcba34ba4c810a95ff0d1a6e7fcbe06e6bf1ff04d80ea4c185a034293f9cbe8b2e59dfd5970c6a51d5ea2434fa', 'FIELD_TECHNICIAN', TRUE, NOW() - INTERVAL '30 days'),
(3, 'analyst_raj', 'Rajesh Sharma (Senior Lab Analyst)', 'scrypt:32768:8:1$7fM3DsqLpUq47Kx1$7dc55d3cf4c391219b1612e4310cfd4c82c3fcfcba34ba4c810a95ff0d1a6e7fcbe06e6bf1ff04d80ea4c185a034293f9cbe8b2e59dfd5970c6a51d5ea2434fa', 'LAB_ANALYST', TRUE, NOW() - INTERVAL '30 days'),
(4, 'courier_dave', 'David Rodriguez (Logistics Courier)', 'scrypt:32768:8:1$7fM3DsqLpUq47Kx1$7dc55d3cf4c391219b1612e4310cfd4c82c3fcfcba34ba4c810a95ff0d1a6e7fcbe06e6bf1ff04d80ea4c185a034293f9cbe8b2e59dfd5970c6a51d5ea2434fa', 'TRANSPORTER', TRUE, NOW() - INTERVAL '30 days'),
(5, 'auditor_elena', 'Elena Rostova (Compliance Auditor)', 'scrypt:32768:8:1$7fM3DsqLpUq47Kx1$7dc55d3cf4c391219b1612e4310cfd4c82c3fcfcba34ba4c810a95ff0d1a6e7fcbe06e6bf1ff04d80ea4c185a034293f9cbe8b2e59dfd5970c6a51d5ea2434fa', 'AUDITOR', TRUE, NOW() - INTERVAL '30 days');

SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));

-- -----------------------------------------------------------------------------
-- 2. SEED LABORATORY NODES
-- Physical checkpoints representing the Chain of Custody
-- -----------------------------------------------------------------------------
INSERT INTO laboratory_nodes (node_id, node_code, node_name, node_type, location, active, created_at)
VALUES
(1, 'CP-01', 'District River Catchment Point', 'COLLECTION_POINT', 'Sector 4 Riverbank Intake Station', TRUE, NOW() - INTERVAL '60 days'),
(2, 'TH-01', 'Logistics Transit Depot Alpha', 'TRANSPORT_HUB', 'Terminal 2 Freight Corridor', TRUE, NOW() - INTERVAL '60 days'),
(3, 'ML-01', 'Central Environmental Analytical Lab', 'MAIN_LABORATORY', 'Apex Science Park Building C, Floor 2', TRUE, NOW() - INTERVAL '60 days'),
(4, 'TU-01', 'Chromatography & Mass Spectrometry Unit', 'TESTING_UNIT', 'Apex Science Park Testing Suite 4B', TRUE, NOW() - INTERVAL '60 days'),
(5, 'SS-01', 'Cryogenic Bio-Vault Alpha', 'SECURE_STORAGE', 'Sub-level -2 Cold Vault Room 10', TRUE, NOW() - INTERVAL '60 days'),
(6, 'DU-01', 'Controlled Biohazard Incineration Facility', 'DISPOSAL_UNIT', 'Industrial Containment Yard 7', TRUE, NOW() - INTERVAL '60 days');

SELECT setval('laboratory_nodes_node_id_seq', (SELECT MAX(node_id) FROM laboratory_nodes));

-- -----------------------------------------------------------------------------
-- 3. SEED SAMPLES AND LIFECYCLES USING REAL PL/pgSQL PROCEDURES
-- This guarantees every seed record has valid deterministic SHA-256 hash chains!
-- -----------------------------------------------------------------------------

-- SAMPLE 1: Full lifecycle completed to STORED
SELECT register_sample(
    'SMP-2026-0001',
    'Potable Water Specimen',
    'Municipal reservoir intake test for dissolved heavy metals and PFAS',
    'North River Reservoir Dam Gate 3',
    2, -- Sarah (Field Tech)
    1, -- Collection Point 1
    'Specimen bottled in sterile fluoropolymer container with temperature tag'
);

SELECT record_sample_movement('SMP-2026-0001', 1, 'COLLECTED', 2, 'Sample verified, sealed with tamper-evident band #TX-9901');
SELECT record_sample_movement('SMP-2026-0001', 2, 'IN_TRANSIT', 4, 'Transferred to insulated chilled courier box, dispatched via Courier Dave');
SELECT record_sample_movement('SMP-2026-0001', 3, 'RECEIVED', 3, 'Received at Central Lab reception; temperature logged at 3.8°C');
SELECT record_sample_movement('SMP-2026-0001', 4, 'UNDER_TESTING', 3, 'Aliquot prepared and loaded into Gas Chromatography rack');
SELECT record_sample_movement('SMP-2026-0001', 4, 'TEST_COMPLETED', 3, 'Spectrometry run completed; lead < 0.001 mg/L, meets EPA standards');
SELECT record_sample_movement('SMP-2026-0001', 5, 'STORED', 3, 'Archived in Cryogenic Vault Alpha rack B-12 for 180-day retention');

-- SAMPLE 2: Currently UNDER_TESTING
SELECT register_sample(
    'SMP-2026-0002',
    'Industrial Effluent Discharge',
    'Surveillance sample from chemical manufacturing outflow tributary',
    'Apex Chemical Industrial Outfall #9',
    2, -- Sarah
    1, -- Collection Point 1
    'Brownish tint noted; pH preliminary strip reading 5.4'
);

SELECT record_sample_movement('SMP-2026-0002', 1, 'COLLECTED', 2, 'Double-bagged in acid-resistant container');
SELECT record_sample_movement('SMP-2026-0002', 2, 'IN_TRANSIT', 4, 'Handed over to Transport Hub Alpha for express dispatch');
SELECT record_sample_movement('SMP-2026-0002', 3, 'RECEIVED', 3, 'Lab check-in confirmed; barcode verified');
SELECT record_sample_movement('SMP-2026-0002', 4, 'UNDER_TESTING', 3, 'Inductively Coupled Plasma testing initiated by Analyst Raj');

-- SAMPLE 3: Currently IN_TRANSIT
SELECT register_sample(
    'SMP-2026-0003',
    'Agricultural Soil Core',
    'Topsoil pesticide residue survey from organic certified farmland',
    'Green Valley Farm Plot 14',
    2, -- Sarah
    1, -- Collection Point 1
    'Core extracted at 30cm depth; ambient moisture preserved'
);

SELECT record_sample_movement('SMP-2026-0003', 1, 'COLLECTED', 2, 'Sealed in vacuum-packed nitrogen barrier pouch');
SELECT record_sample_movement('SMP-2026-0003', 2, 'IN_TRANSIT', 4, 'Loaded on refrigerated route vehicle VK-402');

-- SAMPLE 4: Just REGISTERED
SELECT register_sample(
    'SMP-2026-0004',
    'Airborne Particulate Filter',
    'HEPA intake monitor filter for urban particulate matter PM2.5 evaluation',
    'City Center Traffic Junction Station 1',
    2, -- Sarah
    1, -- Collection Point 1
    'Filter membrane sealed in antistatic Petri dish cassette'
);

-- SAMPLE 5: Full lifecycle to DISPOSED
SELECT register_sample(
    'SMP-2026-0005',
    'Bio-Clinical Serum Specimen',
    'Viral vector control sample post-study holding',
    'Metropolitan Medical Center Ward 6',
    2,
    1,
    'Biohazard Level 2 specimen tube with dual tamper seals'
);

SELECT record_sample_movement('SMP-2026-0005', 1, 'COLLECTED', 2, 'Placed in primary certified transport vial');
SELECT record_sample_movement('SMP-2026-0005', 2, 'IN_TRANSIT', 4, 'Logistics escort assigned');
SELECT record_sample_movement('SMP-2026-0005', 3, 'RECEIVED', 3, 'Intake at Biosafety cabinet 3');
SELECT record_sample_movement('SMP-2026-0005', 4, 'UNDER_TESTING', 3, 'ELISA titer quantitative assay run');
SELECT record_sample_movement('SMP-2026-0005', 4, 'TEST_COMPLETED', 3, 'Assay completed; zero infectious units detected');
SELECT record_sample_movement('SMP-2026-0005', 5, 'STORED', 3, 'Post-analysis quarantine holding');
SELECT record_sample_movement('SMP-2026-0005', 6, 'DISPOSED', 1, 'Autoclaved at 121°C and incinerated under biological manifest #DISP-882');
