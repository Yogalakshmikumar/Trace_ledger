-- =============================================================================
-- TRACELEDGER – Tamper-Resistant Sample Lifecycle Tracking and Audit System
-- 02_functions.sql: Stored Functions, Procedures, Deterministic Hashing & Verification
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FUNCTION: validate_status_transition
-- Enforces strictly defined sample lifecycle state-machine.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_status_transition(
    p_current_status VARCHAR,
    p_new_status VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    -- Same status transition is disallowed
    IF p_current_status = p_new_status THEN
        RETURN FALSE;
    END IF;

    -- Enforce explicit valid transitions
    IF (p_current_status = 'REGISTERED' AND p_new_status = 'COLLECTED') THEN
        RETURN TRUE;
    ELSIF (p_current_status = 'COLLECTED' AND p_new_status = 'IN_TRANSIT') THEN
        RETURN TRUE;
    ELSIF (p_current_status = 'IN_TRANSIT' AND p_new_status = 'RECEIVED') THEN
        RETURN TRUE;
    ELSIF (p_current_status = 'RECEIVED' AND p_new_status IN ('UNDER_TESTING', 'STORED')) THEN
        RETURN TRUE;
    ELSIF (p_current_status = 'UNDER_TESTING' AND p_new_status = 'TEST_COMPLETED') THEN
        RETURN TRUE;
    ELSIF (p_current_status = 'TEST_COMPLETED' AND p_new_status = 'STORED') THEN
        RETURN TRUE;
    ELSIF (p_current_status = 'STORED' AND p_new_status = 'DISPOSED') THEN
        RETURN TRUE;
    ELSE
        -- Any other transition is illegal; DISPOSED is terminal
        RETURN FALSE;
    END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. FUNCTION: compute_ledger_hash
-- Deterministic SHA-256 calculation linking predecessor hash and payload.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION compute_ledger_hash(
    p_sample_id INTEGER,
    p_previous_ledger_id INTEGER,
    p_from_node_id INTEGER,
    p_to_node_id INTEGER,
    p_action_type VARCHAR,
    p_old_status VARCHAR,
    p_new_status VARCHAR,
    p_performed_by INTEGER,
    p_event_timestamp TIMESTAMP WITH TIME ZONE,
    p_remarks TEXT,
    p_previous_hash VARCHAR
)
RETURNS VARCHAR(64)
LANGUAGE plpgsql
AS $$
DECLARE
    v_payload TEXT;
    v_computed_hash VARCHAR(64);
BEGIN
    -- Construct a deterministic canonical payload string
    v_payload := CONCAT_WS('|',
        p_sample_id::TEXT,
        COALESCE(p_previous_ledger_id::TEXT, '0'),
        p_from_node_id::TEXT,
        p_to_node_id::TEXT,
        TRIM(p_action_type),
        COALESCE(TRIM(p_old_status), 'NONE'),
        TRIM(p_new_status),
        p_performed_by::TEXT,
        to_char(p_event_timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
        COALESCE(TRIM(p_remarks), ''),
        TRIM(p_previous_hash)
    );

    -- Compute SHA-256 digest in hexadecimal format
    v_computed_hash := encode(digest(v_payload, 'sha256'), 'hex');
    RETURN v_computed_hash;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. FUNCTION: register_sample
-- Atomically registers a sample, creates the genesis ledger block, and logs initial movement.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION register_sample(
    p_sample_code VARCHAR,
    p_sample_type VARCHAR,
    p_description TEXT,
    p_source_name VARCHAR,
    p_registered_by INTEGER,
    p_initial_node_id INTEGER,
    p_remarks TEXT DEFAULT 'Sample registered at collection point'
)
RETURNS TABLE (
    out_sample_id INTEGER,
    out_ledger_id INTEGER,
    out_record_hash VARCHAR(64)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_sample_id INTEGER;
    v_ledger_id INTEGER;
    v_now TIMESTAMP WITH TIME ZONE := CURRENT_TIMESTAMP;
    v_genesis_prev_hash VARCHAR(64) := '0000000000000000000000000000000000000000000000000000000000000000';
    v_hash VARCHAR(64);
BEGIN
    -- Check if sample code already exists
    IF EXISTS (SELECT 1 FROM samples WHERE sample_code = p_sample_code) THEN
        RAISE EXCEPTION 'Sample code "%" already exists in the system.', p_sample_code;
    END IF;

    -- Verify node exists
    IF NOT EXISTS (SELECT 1 FROM laboratory_nodes WHERE node_id = p_initial_node_id AND active = TRUE) THEN
        RAISE EXCEPTION 'Laboratory node ID % does not exist or is inactive.', p_initial_node_id;
    END IF;

    -- Verify user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_registered_by AND active = TRUE) THEN
        RAISE EXCEPTION 'User ID % does not exist or is inactive.', p_registered_by;
    END IF;

    -- Insert Sample Record
    INSERT INTO samples (
        sample_code,
        sample_type,
        description,
        source_name,
        registered_by,
        current_node_id,
        current_status,
        created_at,
        updated_at
    ) VALUES (
        p_sample_code,
        p_sample_type,
        p_description,
        p_source_name,
        p_registered_by,
        p_initial_node_id,
        'REGISTERED',
        v_now,
        v_now
    ) RETURNING sample_id INTO v_sample_id;

    -- Calculate Genesis Hash for Ledger Record #1
    v_hash := compute_ledger_hash(
        v_sample_id,
        NULL,
        p_initial_node_id,
        p_initial_node_id,
        'REGISTER_SAMPLE',
        NULL,
        'REGISTERED',
        p_registered_by,
        v_now,
        p_remarks,
        v_genesis_prev_hash
    );

    -- Insert Genesis Audit Ledger Record
    INSERT INTO sample_audit_ledger (
        sample_id,
        previous_ledger_id,
        from_node_id,
        to_node_id,
        action_type,
        old_status,
        new_status,
        performed_by,
        event_timestamp,
        remarks,
        previous_hash,
        record_hash
    ) VALUES (
        v_sample_id,
        NULL,
        p_initial_node_id,
        p_initial_node_id,
        'REGISTER_SAMPLE',
        NULL,
        'REGISTERED',
        p_registered_by,
        v_now,
        p_remarks,
        v_genesis_prev_hash,
        v_hash
    ) RETURNING ledger_id INTO v_ledger_id;

    -- Insert Initial Operational Movement Record
    INSERT INTO sample_movements (
        sample_id,
        from_node_id,
        to_node_id,
        old_status,
        new_status,
        performed_by,
        remarks,
        event_timestamp
    ) VALUES (
        v_sample_id,
        p_initial_node_id,
        p_initial_node_id,
        'REGISTERED',
        'REGISTERED',
        p_registered_by,
        p_remarks,
        v_now
    );

    RETURN QUERY SELECT v_sample_id, v_ledger_id, v_hash;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. FUNCTION: record_sample_movement
-- Atomically validates lifecycle, fetches predecessor block, calculates new hash,
-- appends to audit ledger, logs movement, and updates current sample state.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_sample_movement(
    p_sample_code VARCHAR,
    p_to_node_id INTEGER,
    p_new_status VARCHAR,
    p_performed_by INTEGER,
    p_remarks TEXT
)
RETURNS TABLE (
    out_movement_id INTEGER,
    out_ledger_id INTEGER,
    out_previous_hash VARCHAR(64),
    out_record_hash VARCHAR(64)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_sample_id INTEGER;
    v_current_node_id INTEGER;
    v_current_status VARCHAR(30);
    v_latest_ledger_id INTEGER;
    v_latest_record_hash VARCHAR(64);
    v_new_ledger_id INTEGER;
    v_new_movement_id INTEGER;
    v_action_type VARCHAR(50);
    v_new_hash VARCHAR(64);
    v_now TIMESTAMP WITH TIME ZONE := CURRENT_TIMESTAMP;
BEGIN
    -- 1. Lock the sample row for atomic update to avoid concurrent race conditions
    SELECT sample_id, current_node_id, current_status
    INTO v_sample_id, v_current_node_id, v_current_status
    FROM samples
    WHERE sample_code = p_sample_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sample with code "%" not found.', p_sample_code;
    END IF;

    -- 2. Verify destination node exists and is active
    IF NOT EXISTS (SELECT 1 FROM laboratory_nodes WHERE node_id = p_to_node_id AND active = TRUE) THEN
        RAISE EXCEPTION 'Destination node ID % is invalid or inactive.', p_to_node_id;
    END IF;

    -- 3. Verify actor exists and is active
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_performed_by AND active = TRUE) THEN
        RAISE EXCEPTION 'User ID % is invalid or inactive.', p_performed_by;
    END IF;

    -- 4. Validate lifecycle transition
    IF NOT validate_status_transition(v_current_status, p_new_status) THEN
        RAISE EXCEPTION 'Illegal lifecycle transition from "%" to "%" for sample "%".',
            v_current_status, p_new_status, p_sample_code;
    END IF;

    -- 5. Determine readable action type
    v_action_type := CASE
        WHEN p_new_status = 'COLLECTED' THEN 'SAMPLE_COLLECTED'
        WHEN p_new_status = 'IN_TRANSIT' THEN 'DISPATCH_TRANSIT'
        WHEN p_new_status = 'RECEIVED' THEN 'RECEIVE_AT_FACILITY'
        WHEN p_new_status = 'UNDER_TESTING' THEN 'COMMENCE_TESTING'
        WHEN p_new_status = 'TEST_COMPLETED' THEN 'COMPLETE_TESTING'
        WHEN p_new_status = 'STORED' THEN 'PLACE_IN_STORAGE'
        WHEN p_new_status = 'DISPOSED' THEN 'SAFE_DISPOSAL'
        ELSE 'STATUS_TRANSITION'
    END;

    -- 6. Retrieve the latest ledger record for this sample
    SELECT ledger_id, record_hash
    INTO v_latest_ledger_id, v_latest_record_hash
    FROM sample_audit_ledger
    WHERE sample_id = v_sample_id
    ORDER BY ledger_id DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Critical Integrity Error: No genesis ledger record found for sample ID %.', v_sample_id;
    END IF;

    -- 7. Compute deterministic SHA-256 hash chaining to previous record
    v_new_hash := compute_ledger_hash(
        v_sample_id,
        v_latest_ledger_id,
        v_current_node_id,
        p_to_node_id,
        v_action_type,
        v_current_status,
        p_new_status,
        p_performed_by,
        v_now,
        p_remarks,
        v_latest_record_hash
    );

    -- 8. Append to immutable audit ledger
    INSERT INTO sample_audit_ledger (
        sample_id,
        previous_ledger_id,
        from_node_id,
        to_node_id,
        action_type,
        old_status,
        new_status,
        performed_by,
        event_timestamp,
        remarks,
        previous_hash,
        record_hash
    ) VALUES (
        v_sample_id,
        v_latest_ledger_id,
        v_current_node_id,
        p_to_node_id,
        v_action_type,
        v_current_status,
        p_new_status,
        p_performed_by,
        v_now,
        p_remarks,
        v_latest_record_hash,
        v_new_hash
    ) RETURNING ledger_id INTO v_new_ledger_id;

    -- 9. Insert operational movement record
    INSERT INTO sample_movements (
        sample_id,
        from_node_id,
        to_node_id,
        old_status,
        new_status,
        performed_by,
        remarks,
        event_timestamp
    ) VALUES (
        v_sample_id,
        v_current_node_id,
        p_to_node_id,
        v_current_status,
        p_new_status,
        p_performed_by,
        p_remarks,
        v_now
    ) RETURNING movement_id INTO v_new_movement_id;

    -- 10. Update current sample state
    UPDATE samples
    SET current_status = p_new_status,
        current_node_id = p_to_node_id,
        updated_at = v_now
    WHERE sample_id = v_sample_id;

    RETURN QUERY SELECT v_new_movement_id, v_new_ledger_id, v_latest_record_hash, v_new_hash;
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. FUNCTION: verify_sample_chain
-- Performs end-to-end cryptographic verification on a sample's ledger records:
-- - Genesis record format (previous_ledger_id is NULL, previous_hash = 64 zeros)
-- - Consecutive predecessor pointer continuity (record N points to record N-1)
-- - Predecessor hash continuity (record N's previous_hash = record N-1's record_hash)
-- - Deterministic payload recalculation matches stored record_hash
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION verify_sample_chain(p_sample_id INTEGER)
RETURNS TABLE (
    sample_id INTEGER,
    total_records INTEGER,
    chain_valid BOOLEAN,
    broken_at_ledger_id INTEGER,
    failure_reason TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
    v_counter INTEGER := 0;
    v_prev_id INTEGER := NULL;
    v_prev_hash VARCHAR(64) := '0000000000000000000000000000000000000000000000000000000000000000';
    v_expected_hash VARCHAR(64);
BEGIN
    FOR r IN
        SELECT
            ledger_id,
            previous_ledger_id,
            from_node_id,
            to_node_id,
            action_type,
            old_status,
            new_status,
            performed_by,
            event_timestamp,
            remarks,
            previous_hash,
            record_hash
        FROM sample_audit_ledger
        WHERE sample_id = p_sample_id
        ORDER BY ledger_id ASC
    LOOP
        v_counter := v_counter + 1;

        -- Check Genesis Record (first entry)
        IF v_counter = 1 THEN
            IF r.previous_ledger_id IS NOT NULL THEN
                RETURN QUERY SELECT p_sample_id, v_counter, FALSE, r.ledger_id, 'Genesis ledger record must not have a previous_ledger_id.';
                RETURN;
            END IF;
            IF r.previous_hash <> v_prev_hash THEN
                RETURN QUERY SELECT p_sample_id, v_counter, FALSE, r.ledger_id, 'Genesis ledger record has invalid genesis previous_hash.';
                RETURN;
            END IF;
        ELSE
            -- Subsequent records must point to the immediate predecessor
            IF r.previous_ledger_id IS DISTINCT FROM v_prev_id THEN
                RETURN QUERY SELECT p_sample_id, v_counter, FALSE, r.ledger_id,
                    FORMAT('Predecessor ID mismatch: expected %s, found %s', v_prev_id, r.previous_ledger_id);
                RETURN;
            END IF;

            IF r.previous_hash <> v_prev_hash THEN
                RETURN QUERY SELECT p_sample_id, v_counter, FALSE, r.ledger_id,
                    FORMAT('Hash chain discontinuity: expected previous_hash %s, found %s', v_prev_hash, r.previous_hash);
                RETURN;
            END IF;
        END IF;

        -- Recalculate deterministic hash from record fields
        v_expected_hash := compute_ledger_hash(
            p_sample_id,
            r.previous_ledger_id,
            r.from_node_id,
            r.to_node_id,
            r.action_type,
            r.old_status,
            r.new_status,
            r.performed_by,
            r.event_timestamp,
            r.remarks,
            r.previous_hash
        );

        IF v_expected_hash <> r.record_hash THEN
            RETURN QUERY SELECT p_sample_id, v_counter, FALSE, r.ledger_id,
                FORMAT('Cryptographic signature tampered: expected SHA-256 %s, stored %s', v_expected_hash, r.record_hash);
            RETURN;
        END IF;

        -- Advance chain state
        v_prev_id := r.ledger_id;
        v_prev_hash := r.record_hash;
    END LOOP;

    IF v_counter = 0 THEN
        RETURN QUERY SELECT p_sample_id, 0, FALSE, NULL::INTEGER, 'No ledger records exist for sample.';
        RETURN;
    END IF;

    -- Chain is mathematically verified
    RETURN QUERY SELECT p_sample_id, v_counter, TRUE, NULL::INTEGER, 'Chain intact and fully verified against SHA-256 invariants.';
END;
$$;
