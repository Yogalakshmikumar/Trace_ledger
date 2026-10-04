-- =============================================================================
-- TRACELEDGER – Tamper-Resistant Sample Lifecycle Tracking and Audit System
-- 03_triggers.sql: Database Immutability Triggers & Auto-Timestamp Triggers
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TRIGGER FUNCTION: prevent_ledger_modification
-- Enforces true database-level append-only immutability.
-- Prevents any UPDATE or DELETE operation on sample_audit_ledger.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_ledger_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        RAISE EXCEPTION 'Audit ledger records are immutable. UPDATE operations are strictly prohibited on sample_audit_ledger (Attempted on ledger_id: %).',
            OLD.ledger_id
            USING ERRCODE = '23505'; -- integrity violation
    ELSIF (TG_OP = 'DELETE') THEN
        RAISE EXCEPTION 'Audit ledger records are immutable. DELETE operations are strictly prohibited on sample_audit_ledger (Attempted on ledger_id: %).',
            OLD.ledger_id
            USING ERRCODE = '23505'; -- integrity violation
    END IF;
    RETURN NULL;
END;
$$;

-- Drop trigger if already exists
DROP TRIGGER IF EXISTS trg_prevent_ledger_modification ON sample_audit_ledger;

-- Bind Trigger to sample_audit_ledger
CREATE TRIGGER trg_prevent_ledger_modification
BEFORE UPDATE OR DELETE ON sample_audit_ledger
FOR EACH ROW
EXECUTE FUNCTION prevent_ledger_modification();

-- -----------------------------------------------------------------------------
-- 2. TRIGGER FUNCTION: update_sample_timestamp
-- Automatically updates updated_at timestamp upon state modification.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_sample_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_sample_timestamp ON samples;

CREATE TRIGGER trg_update_sample_timestamp
BEFORE UPDATE ON samples
FOR EACH ROW
EXECUTE FUNCTION update_sample_timestamp();
