-- =============================================================================
-- TRACELEDGER – Tamper-Resistant Sample Lifecycle Tracking and Audit System
-- 04_views.sql: Relational Views for Sample Status, History & Audit Analytics
-- Demonstrating JOINs, GROUP BY, HAVING, Subqueries & Aggregations
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. VIEW: sample_current_status_view
-- Flattens sample metadata with current physical node and registering agent.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW sample_current_status_view AS
SELECT
    s.sample_id,
    s.sample_code,
    s.sample_type,
    s.description,
    s.source_name,
    s.current_status,
    s.current_node_id,
    n.node_code AS current_node_code,
    n.node_name AS current_node_name,
    n.node_type AS current_node_type,
    n.location AS current_node_location,
    s.registered_by AS registered_by_user_id,
    u.username AS registered_by_username,
    u.full_name AS registered_by_full_name,
    s.created_at,
    s.updated_at
FROM samples s
JOIN laboratory_nodes n ON s.current_node_id = n.node_id
JOIN users u ON s.registered_by = u.user_id;

-- -----------------------------------------------------------------------------
-- 2. VIEW: sample_history_view
-- Full chronological audit trail joining sender, receiver, and operator.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW sample_history_view AS
SELECT
    l.ledger_id,
    l.sample_id,
    s.sample_code,
    s.sample_type,
    l.previous_ledger_id,
    l.from_node_id,
    fn.node_code AS from_node_code,
    fn.node_name AS from_node_name,
    l.to_node_id,
    tn.node_code AS to_node_code,
    tn.node_name AS to_node_name,
    l.action_type,
    l.old_status,
    l.new_status,
    l.performed_by AS performed_by_user_id,
    u.username AS performed_by_username,
    u.full_name AS performed_by_name,
    u.role AS performed_by_role,
    l.event_timestamp,
    l.remarks,
    l.previous_hash,
    l.record_hash
FROM sample_audit_ledger l
JOIN samples s ON l.sample_id = s.sample_id
JOIN laboratory_nodes fn ON l.from_node_id = fn.node_id
JOIN laboratory_nodes tn ON l.to_node_id = tn.node_id
JOIN users u ON l.performed_by = u.user_id
ORDER BY l.ledger_id ASC;

-- -----------------------------------------------------------------------------
-- 3. VIEW: audit_summary_view
-- Analytical aggregation demonstrating GROUP BY, HAVING, Subqueries & Aggregation.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW audit_summary_view AS
SELECT
    s.sample_id,
    s.sample_code,
    s.sample_type,
    s.current_status,
    COUNT(l.ledger_id) AS total_ledger_records,
    MIN(l.event_timestamp) AS initial_event_time,
    MAX(l.event_timestamp) AS latest_event_time,
    -- Subquery to fetch the latest hash in the chain
    (
        SELECT sal.record_hash
        FROM sample_audit_ledger sal
        WHERE sal.sample_id = s.sample_id
        ORDER BY sal.ledger_id DESC
        LIMIT 1
    ) AS latest_record_hash
FROM samples s
LEFT JOIN sample_audit_ledger l ON s.sample_id = l.sample_id
GROUP BY s.sample_id, s.sample_code, s.sample_type, s.current_status
HAVING COUNT(l.ledger_id) > 0;

-- -----------------------------------------------------------------------------
-- 4. VIEW: node_activity_summary_view
-- Analyzes traffic across physical laboratory nodes.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW node_activity_summary_view AS
SELECT
    n.node_id,
    n.node_code,
    n.node_name,
    n.node_type,
    n.location,
    COUNT(DISTINCT s.sample_id) AS current_samples_held,
    COUNT(DISTINCT l_in.ledger_id) AS total_inbound_transfers,
    COUNT(DISTINCT l_out.ledger_id) AS total_outbound_transfers
FROM laboratory_nodes n
LEFT JOIN samples s ON n.node_id = s.current_node_id
LEFT JOIN sample_audit_ledger l_in ON n.node_id = l_in.to_node_id
LEFT JOIN sample_audit_ledger l_out ON n.node_id = l_out.from_node_id
GROUP BY n.node_id, n.node_code, n.node_name, n.node_type, n.location
ORDER BY n.node_id ASC;
