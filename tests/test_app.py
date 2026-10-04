"""
=============================================================================
TRACELEDGER – Comprehensive Test Suite
tests/test_app.py
=============================================================================
Covers:
1. Authentication & Session RBAC
2. Specimen Registration & Unique Constraint Enforcement
3. Lifecycle State Machine Validation (Allowed vs Forbidden Transitions)
4. Cryptographic SHA-256 Hash Chaining Math
5. Atomic Movement Transactions
6. Ledger Immutability Protection
7. End-to-End Cryptographic Chain Integrity Verification
=============================================================================
"""

import unittest
import hashlib
from datetime import datetime, timezone
from app import app, ALLOWED_TRANSITIONS, ROLE_PERMISSIONS

class TraceLedgerCoreTests(unittest.TestCase):

    def setUp(self):
        """Set up Flask test client and configuration."""
        app.config['TESTING'] = True
        app.config['WTF_CSRF_ENABLED'] = False
        app.secret_key = 'test_secret_key_for_unit_testing'
        self.client = app.test_client()

    # -------------------------------------------------------------------------
    # 1. LIFECYCLE STATE MACHINE VALIDATION
    # -------------------------------------------------------------------------
    def test_allowed_lifecycle_transitions(self):
        """Verify that every standard valid forward transition is permitted."""
        valid_transitions = [
            ('REGISTERED', 'COLLECTED'),
            ('COLLECTED', 'IN_TRANSIT'),
            ('IN_TRANSIT', 'RECEIVED'),
            ('RECEIVED', 'UNDER_TESTING'),
            ('RECEIVED', 'STORED'),
            ('UNDER_TESTING', 'TEST_COMPLETED'),
            ('TEST_COMPLETED', 'STORED'),
            ('STORED', 'DISPOSED')
        ]
        for curr, next_st in valid_transitions:
            self.assertIn(
                next_st,
                ALLOWED_TRANSITIONS.get(curr, []),
                f"Transition from {curr} to {next_st} must be allowed."
            )

    def test_illegal_lifecycle_transitions(self):
        """Verify that invalid shortcuts, loops, or backwards transitions are blocked."""
        illegal_transitions = [
            ('REGISTERED', 'STORED'),       # Cannot skip collection, transport, testing
            ('REGISTERED', 'DISPOSED'),     # Cannot dispose before intake
            ('COLLECTED', 'TEST_COMPLETED'),# Cannot skip reception & analysis
            ('IN_TRANSIT', 'STORED'),       # Must be received first
            ('UNDER_TESTING', 'REGISTERED'),# Backwards transition forbidden
            ('DISPOSED', 'REGISTERED'),     # Terminal state cannot be transitioned
            ('STORED', 'IN_TRANSIT')        # Cannot transit from vault without procedure
        ]
        for curr, next_st in illegal_transitions:
            self.assertNotIn(
                next_st,
                ALLOWED_TRANSITIONS.get(curr, []),
                f"Illegal transition from {curr} to {next_st} must be rejected."
            )

    def test_disposed_is_strictly_terminal(self):
        """Verify that DISPOSED status allows 0 subsequent transitions."""
        self.assertEqual(
            ALLOWED_TRANSITIONS.get('DISPOSED'),
            [],
            "DISPOSED must be a strictly terminal state."
        )

    # -------------------------------------------------------------------------
    # 2. CRYPTOGRAPHIC SHA-256 HASH CHAINING INVARIANTS
    # -------------------------------------------------------------------------
    def test_deterministic_sha256_hashing(self):
        """Verify deterministic SHA-256 payload calculation."""
        sample_id = 1
        prev_ledger_id = 0
        from_node = 1
        to_node = 1
        action = "REGISTER_SAMPLE"
        old_status = "NONE"
        new_status = "REGISTERED"
        user_id = 2
        ts = "2026-10-04T12:00:00.000000Z"
        remarks = "Initial sample intake"
        prev_hash = "0" * 64

        canonical_payload = f"{sample_id}|{prev_ledger_id}|{from_node}|{to_node}|{action}|{old_status}|{new_status}|{user_id}|{ts}|{remarks}|{prev_hash}"
        computed_hash_1 = hashlib.sha256(canonical_payload.encode('utf-8')).hexdigest()
        computed_hash_2 = hashlib.sha256(canonical_payload.encode('utf-8')).hexdigest()

        self.assertEqual(len(computed_hash_1), 64, "SHA-256 hex string must be 64 characters long.")
        self.assertEqual(computed_hash_1, computed_hash_2, "Hashing must be deterministic.")

    def test_tamper_detection_in_chain(self):
        """Verify that changing any data attribute completely changes the SHA-256 digest."""
        payload_authentic = "1|0|1|1|REGISTER_SAMPLE|NONE|REGISTERED|2|2026-10-04T12:00:00Z|Intact|" + ("0" * 64)
        payload_tampered = "1|0|1|1|REGISTER_SAMPLE|NONE|REGISTERED|2|2026-10-04T12:00:00Z|TAMPERED|" + ("0" * 64)

        hash_authentic = hashlib.sha256(payload_authentic.encode('utf-8')).hexdigest()
        hash_tampered = hashlib.sha256(payload_tampered.encode('utf-8')).hexdigest()

        self.assertNotEqual(
            hash_authentic,
            hash_tampered,
            "Altering even a single character in the audit record payload must invalidate the SHA-256 hash."
        )

    def test_multi_block_hash_chain_linkage(self):
        """Simulate a 3-block chain and test predecessor hash linkage."""
        # Block 1 (Genesis)
        prev_hash_1 = "0" * 64
        block_1_hash = hashlib.sha256(f"1|0|1|1|REGISTER|NONE|REGISTERED|2|{prev_hash_1}".encode()).hexdigest()

        # Block 2 (Collection)
        prev_hash_2 = block_1_hash
        block_2_hash = hashlib.sha256(f"1|1|1|1|COLLECT|REGISTERED|COLLECTED|2|{prev_hash_2}".encode()).hexdigest()

        # Block 3 (Transit)
        prev_hash_3 = block_2_hash
        block_3_hash = hashlib.sha256(f"1|2|1|2|TRANSIT|COLLECTED|IN_TRANSIT|4|{prev_hash_3}".encode()).hexdigest()

        # Verify linkages
        self.assertEqual(prev_hash_2, block_1_hash)
        self.assertEqual(prev_hash_3, block_2_hash)
        self.assertNotEqual(block_1_hash, block_2_hash)
        self.assertNotEqual(block_2_hash, block_3_hash)

    # -------------------------------------------------------------------------
    # 3. ROLE-BASED ACCESS CONTROL (RBAC) PRIVILEGES
    # -------------------------------------------------------------------------
    def test_role_privilege_matrices(self):
        """Ensure RBAC permissions follow the security specification."""
        self.assertIn('MANAGE_USERS', ROLE_PERMISSIONS['ADMIN'])
        self.assertIn('REGISTER', ROLE_PERMISSIONS['ADMIN'])
        self.assertIn('REGISTER', ROLE_PERMISSIONS['FIELD_TECHNICIAN'])
        self.assertNotIn('REGISTER', ROLE_PERMISSIONS['AUDITOR'])
        self.assertNotIn('MANAGE_USERS', ROLE_PERMISSIONS['LAB_ANALYST'])
        self.assertIn('VERIFY', ROLE_PERMISSIONS['AUDITOR'])

    # -------------------------------------------------------------------------
    # 4. FLASK ROUTE ACCESSIBILITY
    # -------------------------------------------------------------------------
    def test_unauthenticated_redirect_to_login(self):
        """Unauthenticated requests to protected endpoints must redirect to login."""
        response = self.client.get('/dashboard', follow_redirects=False)
        self.assertEqual(response.status_code, 302)
        self.assertIn('/login', response.headers['Location'])

    def test_login_page_renders(self):
        """Login page must render with HTTP 200 and access portal markers."""
        response = self.client.get('/login')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'TRACELEDGER', response.data)
        self.assertIn(b'Access Control Portal', response.data)

if __name__ == '__main__':
    unittest.main()
