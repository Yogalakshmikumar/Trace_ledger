import React from 'react';
import { ShieldCheck, ArrowLeftRight } from 'lucide-react';
import { User } from '../types';

interface TopNavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser
}) => {
  const getBreadcrumbTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return 'Operational Dashboard';
      case 'samples':
        return 'Specimen Registry';
      case 'sample_details':
        return 'Specimen Audit Trail';
      case 'register':
        return 'Intake Registration';
      case 'move':
        return 'Custody Transfer';
      case 'ledger':
        return 'Append-Only Ledger';
      case 'integrity':
        return 'Cryptographic Integrity';
      case 'users':
        return 'Access Control Directory';
      default:
        return 'Overview';
    }
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      {/* Zone 1: Breadcrumb */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500 font-medium">TraceLedger</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-semibold">{getBreadcrumbTitle(currentTab)}</span>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`hover:text-slate-900 transition-colors ${currentTab === 'dashboard' ? 'text-blue-600 font-semibold' : ''}`}
        >
          Overview
        </button>
        <button
          onClick={() => setCurrentTab('samples')}
          className={`hover:text-slate-900 transition-colors ${currentTab === 'samples' ? 'text-blue-600 font-semibold' : ''}`}
        >
          Registry
        </button>
        <button
          onClick={() => setCurrentTab('ledger')}
          className={`hover:text-slate-900 transition-colors ${currentTab === 'ledger' ? 'text-blue-600 font-semibold' : ''}`}
        >
          Audit Ledger
        </button>
        <button
          onClick={() => setCurrentTab('integrity')}
          className={`hover:text-slate-900 transition-colors ${currentTab === 'integrity' ? 'text-blue-600 font-semibold' : ''}`}
        >
          Integrity Verifier
        </button>
      </nav>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2.5">
        {['ADMIN', 'FIELD_TECHNICIAN', 'TRANSPORTER', 'LAB_ANALYST'].includes(currentUser.role) && (
          <button
            onClick={() => setCurrentTab('move')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Move</span>
          </button>
        )}
        <button
          onClick={() => setCurrentTab('integrity')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Verify Integrity</span>
        </button>
      </div>
    </header>
  );
};
