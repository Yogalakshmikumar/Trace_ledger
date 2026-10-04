"""
=============================================================================
TRACELEDGER – Tamper-Resistant Sample Lifecycle Tracking and Audit System
Flask Backend Application
=============================================================================
Demonstrating:
- Relational DBMS schema with integrity constraints
- Cryptographic SHA-256 hash chaining on append-only audit ledgers
- Database triggers enforcing ledger record immutability
- PL/pgSQL stored procedures for atomic transactions
- Role-Based Access Control (RBAC)
=============================================================================
"""

import os
import functools
import hashlib
from datetime import datetime, timezone
from flask import (
    Flask, render_template, request, redirect,
    url_for, flash, session, jsonify, g
)
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "traceledger_super_secret_session_key_2026")

# Database Configuration
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
DB_NAME = os.getenv("POSTGRES_DB", "traceledger_db")

# Import psycopg2 with safe fallback handling
try:
    import psycopg2
    from psycopg2 import pool
    from psycopg2.extras import RealDictCursor
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False
    RealDictCursor = None

# Connection pool holder
db_pool = None

def init_db_pool():
    global db_pool
    if not PSYCOPG2_AVAILABLE:
        print("[WARNING] psycopg2 is not installed. Database operations will require installing psycopg2-binary.")
        return None
    try:
        db_pool = psycopg2.pool.SimpleConnectionPool(
            minconn=1,
            maxconn=10,
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            dbname=DB_NAME
        )
        print(f"[INFO] PostgreSQL Connection Pool established to {DB_NAME}@{DB_HOST}:{DB_PORT}")
        return db_pool
    except Exception as e:
        print(f"[ERROR] Failed to establish PostgreSQL pool: {e}")
        return None

def get_db_connection():
    """Fetches a connection from the pool or opens a new one."""
    if not PSYCOPG2_AVAILABLE:
        raise RuntimeError("psycopg2 is not installed. Run: pip install -r requirements.txt")

    global db_pool
    if db_pool is None:
        init_db_pool()

    if db_pool:
        conn = db_pool.getconn()
        return conn
    else:
        # Fallback to direct connection if pool failed
        return psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            dbname=DB_NAME
        )

def release_db_connection(conn):
    """Safely releases a connection back to the pool."""
    global db_pool
    if db_pool and conn:
        try:
            db_pool.putconn(conn)
        except Exception:
            conn.close()
    elif conn:
        conn.close()

# -----------------------------------------------------------------------------
# LIFECYCLE STATE MACHINE DEFINITIONS
# -----------------------------------------------------------------------------
ALLOWED_TRANSITIONS = {
    'REGISTERED': ['COLLECTED'],
    'COLLECTED': ['IN_TRANSIT'],
    'IN_TRANSIT': ['RECEIVED'],
    'RECEIVED': ['UNDER_TESTING', 'STORED'],
    'UNDER_TESTING': ['TEST_COMPLETED'],
    'TEST_COMPLETED': ['STORED'],
    'STORED': ['DISPOSED'],
    'DISPOSED': [] # Terminal state
}

ROLE_PERMISSIONS = {
    'ADMIN': ['REGISTER', 'MOVE', 'VIEW', 'AUDIT', 'MANAGE_USERS', 'VERIFY'],
    'FIELD_TECHNICIAN': ['REGISTER', 'MOVE', 'VIEW'],
    'TRANSPORTER': ['MOVE', 'VIEW'],
    'LAB_ANALYST': ['MOVE', 'VIEW'],
    'AUDITOR': ['VIEW', 'AUDIT', 'VERIFY']
}

# -----------------------------------------------------------------------------
# AUTHENTICATION & ACCESS CONTROL DECORATORS
# -----------------------------------------------------------------------------
def login_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('login', next=request.path))
        return view(**kwargs)
    return wrapped_view

def role_required(allowed_roles):
    def decorator(view):
        @functools.wraps(view)
        def wrapped_view(**kwargs):
            if 'user_id' not in session:
                flash('Authentication required.', 'warning')
                return redirect(url_for('login'))
            user_role = session.get('role')
            if user_role not in allowed_roles:
                flash(f'Access denied: {user_role} is not authorized for this operation.', 'danger')
                return redirect(url_for('dashboard'))
            return view(**kwargs)
        return wrapped_view
    return decorator

# -----------------------------------------------------------------------------
# CONTEXT PROCESSOR (Injects user & app info into all Jinja templates)
# -----------------------------------------------------------------------------
@app.context_processor
def inject_globals():
    return {
        'current_user': {
            'user_id': session.get('user_id'),
            'username': session.get('username'),
            'full_name': session.get('full_name'),
            'role': session.get('role')
        } if 'user_id' in session else None,
        'app_name': 'TRACELEDGER',
        'app_subtitle': 'Tamper-Resistant Sample Lifecycle Tracking & Audit System',
        'current_year': datetime.now().year
    }

# -----------------------------------------------------------------------------
# ROUTES: AUTHENTICATION
# -----------------------------------------------------------------------------
@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')

        if not username or not password:
            flash('Please provide both username and password.', 'warning')
            return render_template('login.html')

        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT user_id, username, full_name, password_hash, role, active FROM users WHERE username = %s;",
                    (username,)
                )
                user = cur.fetchone()

                if user and user['active'] and check_password_hash(user['password_hash'], password):
                    session.clear()
                    session['user_id'] = user['user_id']
                    session['username'] = user['username']
                    session['full_name'] = user['full_name']
                    session['role'] = user['role']

                    flash(f'Welcome back, {user["full_name"]} ({user["role"]}).', 'success')
                    next_url = request.args.get('next') or url_for('dashboard')
                    return redirect(next_url)
                elif user and not user['active']:
                    flash('Your account has been deactivated. Please contact an administrator.', 'danger')
                else:
                    flash('Invalid username or password.', 'danger')
        except Exception as e:
            flash(f'Database connection error: {str(e)}', 'danger')
        finally:
            if conn:
                release_db_connection(conn)

    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('You have been securely logged out.', 'info')
    return redirect(url_for('login'))

# -----------------------------------------------------------------------------
# ROUTES: DASHBOARD
# -----------------------------------------------------------------------------
@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    conn = None
    stats = {
        'total_samples': 0,
        'registered': 0,
        'in_transit': 0,
        'under_testing': 0,
        'test_completed': 0,
        'stored': 0,
        'disposed': 0,
        'total_ledger_records': 0
    }
    recent_samples = []
    recent_events = []
    integrity_status = {'verified': True, 'checked_samples': 0}

    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 1. Status Aggregates via GROUP BY
            cur.execute("""
                SELECT current_status, COUNT(*) as count
                FROM samples
                GROUP BY current_status;
            """)
            for row in cur.fetchall():
                status_key = row['current_status'].lower()
                if status_key in stats:
                    stats[status_key] = row['count']
                stats['total_samples'] += row['count']

            # 2. Total Ledger Records
            cur.execute("SELECT COUNT(*) as count FROM sample_audit_ledger;")
            ledger_count = cur.fetchone()
            if ledger_count:
                stats['total_ledger_records'] = ledger_count['count']

            # 3. Recent Samples
            cur.execute("""
                SELECT s.sample_code, s.sample_type, s.source_name, s.current_status,
                       n.node_name, s.updated_at
                FROM samples s
                JOIN laboratory_nodes n ON s.current_node_id = n.node_id
                ORDER BY s.updated_at DESC
                LIMIT 5;
            """)
            recent_samples = cur.fetchall()

            # 4. Recent Audit Ledger Events (Immutable Trail)
            cur.execute("""
                SELECT l.ledger_id, s.sample_code, l.action_type, l.new_status,
                       fn.node_name as from_node, tn.node_name as to_node,
                       u.full_name as performed_by, l.event_timestamp,
                       SUBSTRING(l.record_hash, 1, 12) as short_hash
                FROM sample_audit_ledger l
                JOIN samples s ON l.sample_id = s.sample_id
                JOIN laboratory_nodes fn ON l.from_node_id = fn.node_id
                JOIN laboratory_nodes tn ON l.to_node_id = tn.node_id
                JOIN users u ON l.performed_by = u.user_id
                ORDER BY l.ledger_id DESC
                LIMIT 6;
            """)
            recent_events = cur.fetchall()

            # 5. Quick Integrity Status check
            cur.execute("SELECT COUNT(DISTINCT sample_id) as count FROM samples;")
            integrity_status['checked_samples'] = cur.fetchone()['count']

    except Exception as e:
        flash(f'Notice: Database query error ({str(e)}). Please verify PostgreSQL setup.', 'danger')
    finally:
        if conn:
            release_db_connection(conn)

    return render_template(
        'dashboard.html',
        stats=stats,
        recent_samples=recent_samples,
        recent_events=recent_events,
        integrity_status=integrity_status
    )

# -----------------------------------------------------------------------------
# ROUTES: SAMPLE MANAGEMENT & SEARCH
# -----------------------------------------------------------------------------
@app.route('/samples')
@login_required
def samples():
    search_query = request.args.get('q', '').strip()
    status_filter = request.args.get('status', '').strip()
    type_filter = request.args.get('type', '').strip()

    conn = None
    samples_list = []
    distinct_types = []

    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Fetch distinct sample types for filter dropdown
            cur.execute("SELECT DISTINCT sample_type FROM samples ORDER BY sample_type;")
            distinct_types = [r['sample_type'] for r in cur.fetchall()]

            # Build parameterized SQL query using sample_current_status_view
            sql = "SELECT * FROM sample_current_status_view WHERE 1=1"
            params = []

            if search_query:
                sql += " AND (sample_code ILIKE %s OR source_name ILIKE %s OR description ILIKE %s)"
                pattern = f"%{search_query}%"
                params.extend([pattern, pattern, pattern])

            if status_filter:
                sql += " AND current_status = %s"
                params.append(status_filter)

            if type_filter:
                sql += " AND sample_type = %s"
                params.append(type_filter)

            sql += " ORDER BY sample_id DESC;"

            cur.execute(sql, params)
            samples_list = cur.fetchall()

    except Exception as e:
        flash(f'Error retrieving samples: {str(e)}', 'danger')
    finally:
        if conn:
            release_db_connection(conn)

    return render_template(
        'samples.html',
        samples=samples_list,
        distinct_types=distinct_types,
        search_query=search_query,
        status_filter=status_filter,
        type_filter=type_filter
    )

# -----------------------------------------------------------------------------
# ROUTES: REGISTER SAMPLE (ADMIN & FIELD_TECHNICIAN)
# -----------------------------------------------------------------------------
@app.route('/samples/register', methods=['GET', 'POST'])
@login_required
@role_required(['ADMIN', 'FIELD_TECHNICIAN'])
def register_sample():
    conn = None
    nodes = []

    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT node_id, node_code, node_name, node_type, location FROM laboratory_nodes WHERE active = TRUE ORDER BY node_id;")
            nodes = cur.fetchall()

            if request.method == 'POST':
                sample_code = request.form.get('sample_code', '').strip().upper()
                sample_type = request.form.get('sample_type', '').strip()
                source_name = request.form.get('source_name', '').strip()
                description = request.form.get('description', '').strip()
                initial_node_id = request.form.get('initial_node_id')
                remarks = request.form.get('remarks', 'Initial registration at collection point').strip()

                if not sample_code or not sample_type or not source_name or not initial_node_id:
                    flash('All required fields must be completed.', 'warning')
                    return render_template('register_sample.html', nodes=nodes)

                # Execute PL/pgSQL function register_sample() inside an atomic transaction
                try:
                    cur.execute("""
                        SELECT out_sample_id, out_ledger_id, out_record_hash
                        FROM register_sample(%s, %s, %s, %s, %s, %s, %s);
                    """, (
                        sample_code,
                        sample_type,
                        description,
                        source_name,
                        session['user_id'],
                        int(initial_node_id),
                        remarks
                    ))
                    result = cur.fetchone()
                    conn.commit()

                    flash(f'Sample {sample_code} successfully registered! Genesis ledger block created with SHA-256: {result["out_record_hash"][:16]}...', 'success')
                    return redirect(url_for('sample_details', sample_code=sample_code))

                except psycopg2.Error as pg_err:
                    conn.rollback()
                    # Check for unique constraint violation
                    if "already exists" in str(pg_err) or "unique" in str(pg_err).lower():
                        flash(f'Registration rejected: Sample code "{sample_code}" already exists in the system.', 'danger')
                    else:
                        flash(f'Database error during registration: {pg_err.pgerror or str(pg_err)}', 'danger')

    except Exception as e:
        flash(f'Database error: {str(e)}', 'danger')
    finally:
        if conn:
            release_db_connection(conn)

    return render_template('register_sample.html', nodes=nodes)

# -----------------------------------------------------------------------------
# ROUTES: SAMPLE DETAILS & AUDIT TIMELINE
# -----------------------------------------------------------------------------
@app.route('/samples/<sample_code>')
@login_required
def sample_details(sample_code):
    conn = None
    sample = None
    history = []
    verification = None

    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 1. Fetch Sample Current Metadata
            cur.execute("""
                SELECT * FROM sample_current_status_view
                WHERE sample_code = %s;
            """, (sample_code,))
            sample = cur.fetchone()

            if not sample:
                flash(f'Sample with code "{sample_code}" not found.', 'danger')
                return redirect(url_for('samples'))

            # 2. Fetch Complete Audit Trail via sample_history_view
            cur.execute("""
                SELECT * FROM sample_history_view
                WHERE sample_code = %s
                ORDER BY ledger_id ASC;
            """, (sample_code,))
            history = cur.fetchall()

            # 3. Perform Cryptographic Chain Verification using verify_sample_chain()
            cur.execute("""
                SELECT * FROM verify_sample_chain(%s);
            """, (sample['sample_id'],))
            verification = cur.fetchone()

    except Exception as e:
        flash(f'Error loading sample details: {str(e)}', 'danger')
    finally:
        if conn:
            release_db_connection(conn)

    return render_template(
        'sample_details.html',
        sample=sample,
        history=history,
        verification=verification
    )

# -----------------------------------------------------------------------------
# ROUTES: MOVE SAMPLE (ADMIN, FIELD_TECH, TRANSPORTER, LAB_ANALYST)
# -----------------------------------------------------------------------------
@app.route('/samples/move', methods=['GET', 'POST'])
@login_required
@role_required(['ADMIN', 'FIELD_TECHNICIAN', 'TRANSPORTER', 'LAB_ANALYST'])
def move_sample():
    preselected_code = request.args.get('code', '')
    conn = None
    samples_list = []
    nodes = []

    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Fetch non-disposed samples
            cur.execute("""
                SELECT sample_id, sample_code, sample_type, current_status, current_node_id
                FROM samples
                WHERE current_status <> 'DISPOSED'
                ORDER BY sample_code ASC;
            """)
            samples_list = cur.fetchall()

            # Fetch active nodes
            cur.execute("""
                SELECT node_id, node_code, node_name, node_type, location
                FROM laboratory_nodes
                WHERE active = TRUE
                ORDER BY node_id ASC;
            """)
            nodes = cur.fetchall()

            if request.method == 'POST':
                sample_code = request.form.get('sample_code', '').strip().upper()
                new_status = request.form.get('new_status', '').strip()
                to_node_id = request.form.get('to_node_id')
                remarks = request.form.get('remarks', '').strip()

                if not sample_code or not new_status or not to_node_id:
                    flash('All movement parameters must be specified.', 'warning')
                    return render_template('move_sample.html', samples=samples_list, nodes=nodes, preselected=preselected_code, transitions=ALLOWED_TRANSITIONS)

                # Fetch current sample status to validate against role & lifecycle
                cur.execute("SELECT sample_id, current_status, current_node_id FROM samples WHERE sample_code = %s;", (sample_code,))
                current_sample = cur.fetchone()

                if not current_sample:
                    flash(f'Sample "{sample_code}" does not exist.', 'danger')
                    return render_template('move_sample.html', samples=samples_list, nodes=nodes, preselected=preselected_code, transitions=ALLOWED_TRANSITIONS)

                curr_status = current_sample['current_status']

                # Strict Lifecycle Check
                if new_status not in ALLOWED_TRANSITIONS.get(curr_status, []):
                    flash(f'Illegal transition: Cannot move sample from status "{curr_status}" to "{new_status}".', 'danger')
                    return render_template('move_sample.html', samples=samples_list, nodes=nodes, preselected=sample_code, transitions=ALLOWED_TRANSITIONS)

                # Atomic execution of PL/pgSQL function record_sample_movement()
                try:
                    cur.execute("""
                        SELECT out_movement_id, out_ledger_id, out_previous_hash, out_record_hash
                        FROM record_sample_movement(%s, %s, %s, %s, %s);
                    """, (
                        sample_code,
                        int(to_node_id),
                        new_status,
                        session['user_id'],
                        remarks or f"Transition to {new_status}"
                    ))
                    res = cur.fetchone()
                    conn.commit()

                    # Fetch node names for user-friendly flash message
                    cur.execute("SELECT node_name FROM laboratory_nodes WHERE node_id = %s;", (current_sample['current_node_id'],))
                    from_node_name = cur.fetchone()['node_name']
                    cur.execute("SELECT node_name FROM laboratory_nodes WHERE node_id = %s;", (int(to_node_id),))
                    to_node_name = cur.fetchone()['node_name']

                    flash(f'Sample {sample_code} successfully moved from "{from_node_name}" to "{to_node_name}" ({curr_status} → {new_status}). Ledger Block #{res["out_ledger_id"]} generated!', 'success')
                    return redirect(url_for('sample_details', sample_code=sample_code))

                except psycopg2.Error as pg_err:
                    conn.rollback()
                    flash(f'Movement transaction failed: {pg_err.pgerror or str(pg_err)}', 'danger')

    except Exception as e:
        flash(f'Database error: {str(e)}', 'danger')
    finally:
        if conn:
            release_db_connection(conn)

    return render_template(
        'move_sample.html',
        samples=samples_list,
        nodes=nodes,
        preselected=preselected_code,
        transitions=ALLOWED_TRANSITIONS
    )

# -----------------------------------------------------------------------------
# ROUTES: GLOBAL AUDIT LEDGER (TAMPER-RESISTANT APPEND-ONLY LOG)
# -----------------------------------------------------------------------------
@app.route('/audit-ledger')
@login_required
def audit_ledger():
    conn = None
    ledger_records = []
    search_query = request.args.get('q', '').strip()

    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            sql = """
                SELECT l.ledger_id, l.sample_id, s.sample_code, l.previous_ledger_id,
                       l.action_type, l.old_status, l.new_status,
                       fn.node_name as from_node, tn.node_name as to_node,
                       u.username, u.full_name as performed_by, u.role,
                       l.event_timestamp, l.remarks,
                       l.previous_hash, l.record_hash
                FROM sample_audit_ledger l
                JOIN samples s ON l.sample_id = s.sample_id
                JOIN laboratory_nodes fn ON l.from_node_id = fn.node_id
                JOIN laboratory_nodes tn ON l.to_node_id = tn.node_id
                JOIN users u ON l.performed_by = u.user_id
            """
            params = []
            if search_query:
                sql += " WHERE s.sample_code ILIKE %s OR l.action_type ILIKE %s OR l.record_hash ILIKE %s"
                pattern = f"%{search_query}%"
                params.extend([pattern, pattern, pattern])

            sql += " ORDER BY l.ledger_id DESC;"

            cur.execute(sql, params)
            ledger_records = cur.fetchall()

    except Exception as e:
        flash(f'Error fetching ledger: {str(e)}', 'danger')
    finally:
        if conn:
            release_db_connection(conn)

    return render_template(
        'audit_ledger.html',
        records=ledger_records,
        search_query=search_query
    )

# -----------------------------------------------------------------------------
# ROUTES: INTEGRITY VERIFICATION (CRYPTOGRAPHIC HASH-CHAIN VERIFIER)
# -----------------------------------------------------------------------------
@app.route('/integrity')
@login_required
def integrity():
    conn = None
    verification_results = []
    total_samples = 0
    total_ledger_records = 0
    valid_chains = 0
    broken_chains = 0

    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 1. Total Ledger Records
            cur.execute("SELECT COUNT(*) as count FROM sample_audit_ledger;")
            total_ledger_records = cur.fetchone()['count']

            # 2. Verify all samples using verify_sample_chain()
            cur.execute("""
                SELECT
                    s.sample_id,
                    s.sample_code,
                    s.sample_type,
                    s.current_status,
                    v.total_records,
                    v.chain_valid,
                    v.broken_at_ledger_id,
                    v.failure_reason
                FROM samples s
                CROSS JOIN LATERAL verify_sample_chain(s.sample_id) v
                ORDER BY s.sample_id ASC;
            """)
            verification_results = cur.fetchall()

            total_samples = len(verification_results)
            for res in verification_results:
                if res['chain_valid']:
                    valid_chains += 1
                else:
                    broken_chains += 1

    except Exception as e:
        flash(f'Verification engine error: {str(e)}', 'danger')
    finally:
        if conn:
            release_db_connection(conn)

    is_all_valid = (broken_chains == 0 and total_samples > 0)

    return render_template(
        'integrity.html',
        results=verification_results,
        total_samples=total_samples,
        total_ledger_records=total_ledger_records,
        valid_chains=valid_chains,
        broken_chains=broken_chains,
        is_all_valid=is_all_valid
    )

# -----------------------------------------------------------------------------
# ROUTES: USER MANAGEMENT (ADMIN ONLY)
# -----------------------------------------------------------------------------
@app.route('/users', methods=['GET', 'POST'])
@login_required
@role_required(['ADMIN'])
def users():
    conn = None
    users_list = []

    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if request.method == 'POST':
                action = request.form.get('action')

                if action == 'create':
                    new_username = request.form.get('username', '').strip().lower()
                    new_fullname = request.form.get('full_name', '').strip()
                    new_password = request.form.get('password', '')
                    new_role = request.form.get('role', '')

                    if not new_username or not new_fullname or not new_password or not new_role:
                        flash('All user fields are required.', 'warning')
                    else:
                        pwd_hash = generate_password_hash(new_password)
                        try:
                            cur.execute("""
                                INSERT INTO users (username, full_name, password_hash, role, active)
                                VALUES (%s, %s, %s, %s, TRUE);
                            """, (new_username, new_fullname, pwd_hash, new_role))
                            conn.commit()
                            flash(f'User "{new_username}" ({new_role}) successfully created.', 'success')
                        except psycopg2.Error as pg_err:
                            conn.rollback()
                            flash(f'User creation failed: Username may already exist.', 'danger')

                elif action == 'toggle_status':
                    target_user_id = request.form.get('user_id')
                    current_status = request.form.get('current_status') == 'True'
                    new_status = not current_status

                    if int(target_user_id) == session['user_id']:
                        flash('You cannot deactivate your own administrative account.', 'warning')
                    else:
                        cur.execute("""
                            UPDATE users SET active = %s WHERE user_id = %s;
                        """, (new_status, int(target_user_id)))
                        conn.commit()
                        flash(f'User status updated to {"Active" if new_status else "Inactive"}.', 'info')

            # Fetch all users
            cur.execute("""
                SELECT user_id, username, full_name, role, active, created_at
                FROM users
                ORDER BY user_id ASC;
            """)
            users_list = cur.fetchall()

    except Exception as e:
        flash(f'Database error in user management: {str(e)}', 'danger')
    finally:
        if conn:
            release_db_connection(conn)

    return render_template('users.html', users=users_list)

# -----------------------------------------------------------------------------
# JSON API ENDPOINTS (For AJAX interactions)
# -----------------------------------------------------------------------------
@app.route('/api/allowed-transitions/<sample_code>')
@login_required
def api_allowed_transitions(sample_code):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT current_status FROM samples WHERE sample_code = %s;", (sample_code,))
            row = cur.fetchone()
            if not row:
                return jsonify({'error': 'Sample not found'}), 404
            status = row['current_status']
            allowed = ALLOWED_TRANSITIONS.get(status, [])
            return jsonify({
                'sample_code': sample_code,
                'current_status': status,
                'allowed_next_statuses': allowed
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if conn:
            release_db_connection(conn)

# -----------------------------------------------------------------------------
# APPLICATION ENTRY POINT
# -----------------------------------------------------------------------------
if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', '1') == '1'
    print(f"Starting TraceLedger Flask server on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=debug)
