-- =============================================================================
-- TRACELEDGER – Tamper-Resistant Sample Lifecycle Tracking and Audit System
-- 06_demo_attacks_and_checks.sql: Demonstration Script for Viva / Lab Evaluation
-- =============================================================================

-- -----------------------------------------------------------------------------
-- DEMO STEP 1: Normal Sample Creation
-- Invokes register_sample() stored procedure. Inserts row into samples,
-- creates genesis ledger record with previous_hash = 64 zeros, and movements row.
-- -----------------------------------------------------------------------------
SELECT * FROM register_sample(
    'SMP-DEMO-9001',
    'Industrial Groundwater',
    'Viva demo groundwater sample for pesticide testing',
    'Aquifer Monitoring Borewell 12',
    2, -- Sarah (Field Tech)
    1, -- Collection Point 1
    'Registered during live DBMS viva demonstration'
);

-- Inspect the generated genesis ledger entry:
SELECT
    ledger_id, sample_id, previous_ledger_id, action_type,
    old_status, new_status, previous_hash, record_hash
FROM sample_audit_ledger
WHERE sample_id = (SELECT sample_id FROM samples WHERE sample_code = 'SMP-DEMO-9001');

-- -----------------------------------------------------------------------------
-- DEMO STEP 2: Normal Valid Movement Transition
-- REGISTERED -> COLLECTED (Allowed)
-- -----------------------------------------------------------------------------
SELECT * FROM record_sample_movement(
    'SMP-DEMO-9001',
    1, -- At Collection Point
    'COLLECTED',
    2, -- Performed by Field Tech
    'Collected into amber glass jar with Teflon liner'
);

-- Inspect the second block; notice previous_hash matches Block #1 record_hash:
SELECT
    ledger_id, sample_id, previous_ledger_id, old_status, new_status,
    SUBSTRING(previous_hash, 1, 16) || '...' AS prev_hash_preview,
    SUBSTRING(record_hash, 1, 16) || '...' AS rec_hash_preview
FROM sample_audit_ledger
WHERE sample_id = (SELECT sample_id FROM samples WHERE sample_code = 'SMP-DEMO-9001')
ORDER BY ledger_id ASC;

-- -----------------------------------------------------------------------------
-- DEMO STEP 3: Invalid Movement (State Transition Violation)
-- Attempting to jump directly from COLLECTED -> STORED or DISPOSED (Forbidden!)
-- Expected Result: Database raises EXCEPTION and rolls back!
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    PERFORM record_sample_movement(
        'SMP-DEMO-9001',
        5, -- Storage
        'STORED', -- Illegal transition directly from COLLECTED
        3,
        'Attempting illegal skip of transport and lab testing!'
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '>>> SUCCESSFUL VALIDATION: Database rejected invalid transition! Error: %', SQLERRM;
END $$;

-- -----------------------------------------------------------------------------
-- DEMO STEP 4: Attempted Ledger Tampering (Immutability Trigger Attack)
-- Attacker attempts to UPDATE or DELETE an existing audit record.
-- Expected Result: Database trigger prevent_ledger_modification() raises exception!
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    UPDATE sample_audit_ledger
    SET action_type = 'FAKED_ACTION_MALICIOUS'
    WHERE sample_id = (SELECT sample_id FROM samples WHERE sample_code = 'SMP-DEMO-9001')
    LIMIT 1;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '>>> SUCCESSFUL TRIGGER INTERCEPTION: Database blocked UPDATE on ledger! Error: %', SQLERRM;
END $$;

DO $$
BEGIN
    DELETE FROM sample_audit_ledger
    WHERE sample_id = (SELECT sample_id FROM samples WHERE sample_code = 'SMP-DEMO-9001')
    LIMIT 1;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '>>> SUCCESSFUL TRIGGER INTERCEPTION: Database blocked DELETE on ledger! Error: %', SQLERRM;
END $$;

-- -----------------------------------------------------------------------------
-- DEMO STEP 5: Cryptographic Chain Integrity Verification
-- Invoking verify_sample_chain() stored procedure to recalculate SHA-256 signatures.
-- -----------------------------------------------------------------------------
SELECT * FROM verify_sample_chain(
    (SELECT sample_id FROM samples WHERE sample_code = 'SMP-DEMO-9001')
);

-- Verify all sample chains in the system
SELECT
    s.sample_code,
    s.sample_type,
    v.total_records,
    v.chain_valid,
    v.broken_at_ledger_id,
    v.failure_reason
FROM samples s
CROSS JOIN LATERAL verify_sample_chain(s.sample_id) v
ORDER BY s.sample_id ASC;
