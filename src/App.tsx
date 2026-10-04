/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, LaboratoryNode, Sample, AuditLedgerBlock, UserRole, SampleStatus } from './types';
import { INITIAL_USERS, INITIAL_NODES, INITIAL_SAMPLES, INITIAL_LEDGER } from './mockData';
import { computeLedgerHash, GENESIS_PREVIOUS_HASH } from './crypto';
import { Sidebar } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { DashboardView } from './components/DashboardView';
import { SamplesView } from './components/SamplesView';
import { SampleDetailsView } from './components/SampleDetailsView';
import { RegisterSampleView } from './components/RegisterSampleView';
import { MoveSampleView } from './components/MoveSampleView';
import { AuditLedgerView } from './components/AuditLedgerView';
import { IntegrityView } from './components/IntegrityView';
import { UsersView } from './components/UsersView';

export default function App() {
  // Load persistent state or fallback to initial database seeds
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('traceledger_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [nodes] = useState<LaboratoryNode[]>(INITIAL_NODES);

  const [samples, setSamples] = useState<Sample[]>(() => {
    const saved = localStorage.getItem('traceledger_samples');
    return saved ? JSON.parse(saved) : INITIAL_SAMPLES;
  });

  const [ledger, setLedger] = useState<AuditLedgerBlock[]>(() => {
    const saved = localStorage.getItem('traceledger_ledger');
    return saved ? JSON.parse(saved) : INITIAL_LEDGER;
  });

  const [currentUser, setCurrentUser] = useState<User>(() => users[0] || INITIAL_USERS[0]);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedSampleCode, setSelectedSampleCode] = useState<string>('SMP-2026-0001');
  const [notification, setNotification] = useState<{ type: 'success' | 'danger' | 'info'; message: string } | null>(null);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('traceledger_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('traceledger_samples', JSON.stringify(samples));
  }, [samples]);

  useEffect(() => {
    localStorage.setItem('traceledger_ledger', JSON.stringify(ledger));
  }, [ledger]);

  const showNotification = (message: string, type: 'success' | 'danger' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSwitchUserRole = (role: UserRole) => {
    const targetUser = users.find(u => u.role === role);
    if (targetUser) {
      setCurrentUser(targetUser);
      showNotification(`Switched active operator context to ${targetUser.full_name} (${role})`, 'info');
    }
  };

  const handleSelectSample = (sampleCode: string) => {
    setSelectedSampleCode(sampleCode);
    setCurrentTab('sample_details');
  };

  const handleMoveInitiate = (sampleCode: string) => {
    setSelectedSampleCode(sampleCode);
    setCurrentTab('move');
  };

  // Register Sample Procedure (Atomic Execution)
  const handleRegisterSubmit = async (data: {
    sample_code: string;
    sample_type: string;
    source_name: string;
    description: string;
    initial_node_id: number;
    remarks: string;
  }): Promise<boolean> => {
    // 1. Check uniqueness
    if (samples.some(s => s.sample_code.toUpperCase() === data.sample_code.toUpperCase())) {
      return false;
    }

    const newSampleId = samples.length > 0 ? Math.max(...samples.map(s => s.sample_id)) + 1 : 1;
    const newLedgerId = ledger.length > 0 ? Math.max(...ledger.map(l => l.ledger_id)) + 1 : 1;
    const nowIso = new Date().toISOString();

    // 2. Compute Genesis Hash for Block #1
    const genesisHash = await computeLedgerHash({
      sample_id: newSampleId,
      previous_ledger_id: null,
      from_node_id: data.initial_node_id,
      to_node_id: data.initial_node_id,
      action_type: 'REGISTER_SAMPLE',
      old_status: null,
      new_status: 'REGISTERED',
      performed_by: currentUser.user_id,
      event_timestamp: nowIso,
      remarks: data.remarks || 'Initial field intake',
      previous_hash: GENESIS_PREVIOUS_HASH
    });

    const newSample: Sample = {
      sample_id: newSampleId,
      sample_code: data.sample_code,
      sample_type: data.sample_type,
      description: data.description,
      source_name: data.source_name,
      registered_by: currentUser.user_id,
      current_node_id: data.initial_node_id,
      current_status: 'REGISTERED',
      created_at: nowIso,
      updated_at: nowIso
    };

    const genesisBlock: AuditLedgerBlock = {
      ledger_id: newLedgerId,
      sample_id: newSampleId,
      previous_ledger_id: null,
      from_node_id: data.initial_node_id,
      to_node_id: data.initial_node_id,
      action_type: 'REGISTER_SAMPLE',
      old_status: null,
      new_status: 'REGISTERED',
      performed_by: currentUser.user_id,
      event_timestamp: nowIso,
      remarks: data.remarks || 'Initial field intake',
      previous_hash: GENESIS_PREVIOUS_HASH,
      record_hash: genesisHash
    };

    setSamples(prev => [newSample, ...prev]);
    setLedger(prev => [...prev, genesisBlock]);
    setSelectedSampleCode(data.sample_code);
    setCurrentTab('sample_details');
    showNotification(`Specimen ${data.sample_code} registered! Genesis Block #${newLedgerId} created with SHA-256 signature ${genesisHash.slice(0, 12)}...`, 'success');
    return true;
  };

  // Movement Procedure (Atomic Execution & Hash Chaining)
  const handleMoveSubmit = async (data: {
    sample_code: string;
    new_status: SampleStatus;
    to_node_id: number;
    remarks: string;
  }): Promise<boolean> => {
    const targetSample = samples.find(s => s.sample_code === data.sample_code);
    if (!targetSample) return false;

    // Find latest ledger record for this sample
    const sampleBlocks = ledger
      .filter(l => l.sample_id === targetSample.sample_id)
      .sort((a, b) => b.ledger_id - a.ledger_id);

    const latestBlock = sampleBlocks[0];
    if (!latestBlock) return false;

    const newLedgerId = ledger.length > 0 ? Math.max(...ledger.map(l => l.ledger_id)) + 1 : 1;
    const nowIso = new Date().toISOString();

    const actionType =
      data.new_status === 'COLLECTED' ? 'SAMPLE_COLLECTED' :
      data.new_status === 'IN_TRANSIT' ? 'DISPATCH_TRANSIT' :
      data.new_status === 'RECEIVED' ? 'RECEIVE_AT_FACILITY' :
      data.new_status === 'UNDER_TESTING' ? 'COMMENCE_TESTING' :
      data.new_status === 'TEST_COMPLETED' ? 'COMPLETE_TESTING' :
      data.new_status === 'STORED' ? 'PLACE_IN_STORAGE' :
      data.new_status === 'DISPOSED' ? 'SAFE_DISPOSAL' : 'STATUS_TRANSITION';

    // Compute deterministic SHA-256 chaining to latestBlock.record_hash
    const newHash = await computeLedgerHash({
      sample_id: targetSample.sample_id,
      previous_ledger_id: latestBlock.ledger_id,
      from_node_id: targetSample.current_node_id,
      to_node_id: data.to_node_id,
      action_type: actionType,
      old_status: targetSample.current_status,
      new_status: data.new_status,
      performed_by: currentUser.user_id,
      event_timestamp: nowIso,
      remarks: data.remarks,
      previous_hash: latestBlock.record_hash
    });

    const newBlock: AuditLedgerBlock = {
      ledger_id: newLedgerId,
      sample_id: targetSample.sample_id,
      previous_ledger_id: latestBlock.ledger_id,
      from_node_id: targetSample.current_node_id,
      to_node_id: data.to_node_id,
      action_type: actionType,
      old_status: targetSample.current_status,
      new_status: data.new_status,
      performed_by: currentUser.user_id,
      event_timestamp: nowIso,
      remarks: data.remarks,
      previous_hash: latestBlock.record_hash,
      record_hash: newHash
    };

    // Atomically update sample and append ledger record
    setSamples(prev => prev.map(s => s.sample_id === targetSample.sample_id ? {
      ...s,
      current_status: data.new_status,
      current_node_id: data.to_node_id,
      updated_at: nowIso
    } : s));

    setLedger(prev => [...prev, newBlock]);
    setSelectedSampleCode(data.sample_code);
    setCurrentTab('sample_details');
    showNotification(`Custody transfer recorded! Ledger Block #${newLedgerId} chained successfully (${targetSample.current_status} → ${data.new_status}).`, 'success');
    return true;
  };

  // Tamper Simulation: secretly alters a record's remarks without updating the hash to demonstrate SHA-256 tamper detection
  const handleTamperBlock = (ledgerId: number) => {
    setLedger(prev => prev.map(b => b.ledger_id === ledgerId ? {
      ...b,
      remarks: 'TAMPERED: Custody temperature altered to falsify lab records without recomputing signature',
      is_tampered: true
    } : b));
    showNotification(`Simulated Malicious Tampering: Modified payload of Block #${ledgerId}. Verifier will now detect the discrepancy!`, 'danger');
  };

  const handleRestoreLedger = () => {
    localStorage.removeItem('traceledger_ledger');
    localStorage.removeItem('traceledger_samples');
    setLedger(INITIAL_LEDGER);
    setSamples(INITIAL_SAMPLES);
    showNotification('Audit Ledger restored to clean verified state.', 'info');
  };

  const handleCreateUser = (data: { username: string; full_name: string; role: UserRole }): boolean => {
    if (users.some(u => u.username.toLowerCase() === data.username.toLowerCase())) {
      return false;
    }
    const newUser: User = {
      user_id: users.length > 0 ? Math.max(...users.map(u => u.user_id)) + 1 : 1,
      username: data.username,
      full_name: data.full_name,
      role: data.role,
      active: true,
      created_at: new Date().toISOString()
    };
    setUsers(prev => [...prev, newUser]);
    showNotification(`Operator @${data.username} provisioned as ${data.role}.`, 'success');
    return true;
  };

  const handleToggleUserStatus = (userId: number) => {
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, active: !u.active } : u));
    showNotification('Operator status updated.', 'info');
  };

  const activeSample = samples.find(s => s.sample_code === selectedSampleCode) || samples[0];
  const activeSampleHistory = activeSample
    ? ledger.filter(l => l.sample_id === activeSample.sample_id).sort((a, b) => a.ledger_id - b.ledger_id)
    : [];

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUserRole}
        allUsers={users}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <TopNavbar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          currentUser={currentUser}
        />

        {/* Global Notification Banner */}
        {notification && (
          <div
            className={`px-6 py-2.5 text-xs font-medium flex items-center justify-between shadow-sm transition-all ${
              notification.type === 'success' ? 'bg-emerald-600 text-white' :
              notification.type === 'danger' ? 'bg-rose-600 text-white font-bold' :
              'bg-blue-600 text-white'
            }`}
          >
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="text-white/80 hover:text-white font-bold text-xs ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content Scroll View */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'dashboard' && (
              <DashboardView
                samples={samples}
                ledger={ledger}
                nodes={nodes}
                users={users}
                onSelectSample={handleSelectSample}
                onNavigate={setCurrentTab}
              />
            )}

            {currentTab === 'samples' && (
              <SamplesView
                samples={samples}
                nodes={nodes}
                users={users}
                currentUser={currentUser}
                onSelectSample={handleSelectSample}
                onMoveSample={handleMoveInitiate}
                onRegisterClick={() => setCurrentTab('register')}
              />
            )}

            {currentTab === 'sample_details' && activeSample && (
              <SampleDetailsView
                sample={activeSample}
                history={activeSampleHistory}
                nodes={nodes}
                users={users}
                currentUser={currentUser}
                onMoveClick={handleMoveInitiate}
                onBack={() => setCurrentTab('samples')}
              />
            )}

            {currentTab === 'register' && (
              <RegisterSampleView
                nodes={nodes}
                currentUser={currentUser}
                onRegisterSubmit={handleRegisterSubmit}
                onCancel={() => setCurrentTab('samples')}
              />
            )}

            {currentTab === 'move' && (
              <MoveSampleView
                samples={samples.filter(s => s.current_status !== 'DISPOSED')}
                nodes={nodes}
                currentUser={currentUser}
                preselectedCode={selectedSampleCode}
                onMoveSubmit={handleMoveSubmit}
                onCancel={() => setCurrentTab('samples')}
              />
            )}

            {currentTab === 'ledger' && (
              <AuditLedgerView
                ledger={ledger}
                samples={samples}
                nodes={nodes}
                users={users}
                onSelectSample={handleSelectSample}
              />
            )}

            {currentTab === 'integrity' && (
              <IntegrityView
                samples={samples}
                ledger={ledger}
                onTamperBlock={handleTamperBlock}
                onRestoreLedger={handleRestoreLedger}
                onSelectSample={handleSelectSample}
              />
            )}

            {currentTab === 'users' && (
              <UsersView
                users={users}
                currentUser={currentUser}
                onCreateUser={handleCreateUser}
                onToggleUserStatus={handleToggleUserStatus}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
