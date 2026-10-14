import React from 'react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import {
  Boxes,
  ArrowDownToLine,
  AlertTriangle,
  Building,
  TrendingUp,
} from 'lucide-react';

export const InventoryDashboard: React.FC = () => {
  const { activeFirm } = useProject();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-blue-500" />
            Inventory & Store Operations Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time stock ledger, moving average cost valuation, and warehouse intake control.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-blue-950/60 border border-blue-800/60 flex items-center gap-2 text-xs font-mono text-blue-300">
            <Building className="w-3.5 h-3.5 text-blue-400" />
            <span>Active Firm: <strong>{activeFirm?.firm_name || 'All Permitted Firms'}</strong></span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Items Managed</span>
            <Boxes className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">0</div>
          <div className="text-xs text-slate-500 mt-1">Across all group heads</div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Stock Valuation</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">₹ 0.00</div>
          <div className="text-xs text-slate-500 mt-1">Perpetual MAC valuation</div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Inspections</span>
            <ArrowDownToLine className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">0</div>
          <div className="text-xs text-slate-500 mt-1">Awaiting HOD QC sign-off</div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Low Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">0</div>
          <div className="text-xs text-slate-500 mt-1">Qty below safety buffer</div>
        </div>
      </div>

      {/* Overview Status Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
        <h2 className="text-lg font-bold text-white mb-3">Enterprise Environment Status</h2>
        <div className="space-y-2 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Database Backend: <strong>Supabase Managed PostgreSQL</strong> (Pooler port 6543)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Direct S3 Storage: <strong>Cloudflare R2</strong> (Zero egress charges)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>Authenticated Session: <strong>{user?.username}</strong> ({user?.role})</span>
          </div>
        </div>
      </div>
    </div>
  );
};
