-- =============================================================================
-- TRACELEDGER – Tamper-Resistant Sample Lifecycle Tracking and Audit System
-- 01_schema.sql: Core Relational Database Schema with Constraints and Indexes
-- =============================================================================

-- Enable pgcrypto extension for cryptographic hashing utilities
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables in reverse dependency order if rebuilding
DROP TABLE IF EXISTS sample_audit_ledger CASCADE;
DROP TABLE IF EXISTS sample_movements CASCADE;
DROP TABLE IF EXISTS samples CASCADE;
DROP TABLE IF EXISTS laboratory_nodes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE
-- Stores authenticated actors and their role-based privileges.
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_user_role CHECK (
        role IN ('ADMIN', 'FIELD_TECHNICIAN', 'LAB_ANALYST', 'TRANSPORTER', 'AUDITOR')
    )
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- -----------------------------------------------------------------------------
-- 2. LABORATORY_NODES TABLE
-- Represents physical checkpoints, labs, vehicles, and vaults in the chain of custody.
-- -----------------------------------------------------------------------------
CREATE TABLE laboratory_nodes (
    node_id SERIAL PRIMARY KEY,
    node_code VARCHAR(20) UNIQUE NOT NULL,
    node_name VARCHAR(100) NOT NULL,
    node_type VARCHAR(50) NOT NULL,
    location VARCHAR(150) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_node_type CHECK (
        node_type IN ('COLLECTION_POINT', 'TRANSPORT_HUB', 'MAIN_LABORATORY', 'TESTING_UNIT', 'SECURE_STORAGE', 'DISPOSAL_UNIT')
    )
);

CREATE INDEX idx_nodes_code ON laboratory_nodes(node_code);

-- -----------------------------------------------------------------------------
-- 3. SAMPLES TABLE
-- Represents physical specimens tracked across their entire lifecycle.
-- -----------------------------------------------------------------------------
CREATE TABLE samples (
    sample_id SERIAL PRIMARY KEY,
    sample_code VARCHAR(30) UNIQUE NOT NULL,
    sample_type VARCHAR(50) NOT NULL,
    description TEXT,
    source_name VARCHAR(120) NOT NULL,
    registered_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    current_node_id INTEGER NOT NULL REFERENCES laboratory_nodes(node_id) ON DELETE RESTRICT,
    current_status VARCHAR(30) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_sample_status CHECK (
        current_status IN (
            'REGISTERED',
            'COLLECTED',
            'IN_TRANSIT',
            'RECEIVED',
            'UNDER_TESTING',
            'TEST_COMPLETED',
            'STORED',
            'DISPOSED'
        )
    )
);

CREATE INDEX idx_samples_code ON samples(sample_code);
CREATE INDEX idx_samples_status ON samples(current_status);
CREATE INDEX idx_samples_current_node ON samples(current_node_id);

-- -----------------------------------------------------------------------------
-- 4. SAMPLE_MOVEMENTS TABLE
-- Operational movement log recording transitions between physical checkpoints.
-- -----------------------------------------------------------------------------
CREATE TABLE sample_movements (
    movement_id SERIAL PRIMARY KEY,
    sample_id INTEGER NOT NULL REFERENCES samples(sample_id) ON DELETE RESTRICT,
    from_node_id INTEGER NOT NULL REFERENCES laboratory_nodes(node_id) ON DELETE RESTRICT,
    to_node_id INTEGER NOT NULL REFERENCES laboratory_nodes(node_id) ON DELETE RESTRICT,
    old_status VARCHAR(30) NOT NULL,
    new_status VARCHAR(30) NOT NULL,
    performed_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    remarks TEXT,
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_movement_statuses CHECK (
        old_status IN ('REGISTERED', 'COLLECTED', 'IN_TRANSIT', 'RECEIVED', 'UNDER_TESTING', 'TEST_COMPLETED', 'STORED', 'DISPOSED') AND
        new_status IN ('REGISTERED', 'COLLECTED', 'IN_TRANSIT', 'RECEIVED', 'UNDER_TESTING', 'TEST_COMPLETED', 'STORED', 'DISPOSED')
    )
);

CREATE INDEX idx_movements_sample_id ON sample_movements(sample_id);
CREATE INDEX idx_movements_timestamp ON sample_movements(event_timestamp);

-- -----------------------------------------------------------------------------
-- 5. SAMPLE_AUDIT_LEDGER TABLE (THE CORE TAMPER-RESISTANT DATASET)
-- Append-only cryptographic hash chain recording every state alteration.
-- Strictly protected against UPDATE and DELETE by database triggers.
-- -----------------------------------------------------------------------------
CREATE TABLE sample_audit_ledger (
    ledger_id SERIAL PRIMARY KEY,
    sample_id INTEGER NOT NULL REFERENCES samples(sample_id) ON DELETE RESTRICT,
    previous_ledger_id INTEGER REFERENCES sample_audit_ledger(ledger_id) ON DELETE RESTRICT,
    from_node_id INTEGER NOT NULL REFERENCES laboratory_nodes(node_id) ON DELETE RESTRICT,
    to_node_id INTEGER NOT NULL REFERENCES laboratory_nodes(node_id) ON DELETE RESTRICT,
    action_type VARCHAR(50) NOT NULL,
    old_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    performed_by INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT,
    previous_hash VARCHAR(64) NOT NULL,
    record_hash VARCHAR(64) NOT NULL,
    CONSTRAINT chk_ledger_hash_lengths CHECK (
        LENGTH(previous_hash) = 64 AND
        LENGTH(record_hash) = 64
    ),
    CONSTRAINT chk_ledger_new_status CHECK (
        new_status IN ('REGISTERED', 'COLLECTED', 'IN_TRANSIT', 'RECEIVED', 'UNDER_TESTING', 'TEST_COMPLETED', 'STORED', 'DISPOSED')
    )
);

CREATE INDEX idx_ledger_sample_id ON sample_audit_ledger(sample_id);
CREATE INDEX idx_ledger_prev_id ON sample_audit_ledger(previous_ledger_id);
CREATE INDEX idx_ledger_hashes ON sample_audit_ledger(previous_hash, record_hash);
CREATE INDEX idx_ledger_timestamp ON sample_audit_ledger(event_timestamp);
