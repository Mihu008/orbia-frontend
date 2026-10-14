import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import {
  Boxes,
  TrendingUp,
  AlertTriangle,
  Search,
  Filter,
  Building,
  RotateCcw,
} from 'lucide-react';

interface InventoryItem {
  id: string;
  firm_id: string;
  item_id: string;
  qty: string | number;
  avg_price: string | number;
  total_price: string | number;
  min_qty: string | number;
  updated_at: string;
  firm: {
    id: string;
    firm_name: string;
  };
  item: {
    id: string;
    name: string;
    brand?: string;
    hsn_code?: string;
    group_head: {
      name: string;
    };
    uom: {
      name: string;
      code: string;
    };
  };
}

interface ValuationSummary {
  totalItems: number;
  totalValuation: number;
  lowStockAlertsCount: number;
}

export const StockLedgerView: React.FC = () => {
  const { token } = useAuth();
  const { activeFirm } = useProject();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [adjustModalItem, setAdjustModalItem] = useState<InventoryItem | null>(null);
  const [physicalCount, setPhysicalCount] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Fetch Stock Ledger
  const { data: stockItems = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ['stockLedger', activeFirm?.id, searchTerm, lowStockFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFirm?.id) params.append('firmId', activeFirm.id);
      if (searchTerm) params.append('search', searchTerm);
      if (lowStockFilter) params.append('lowStockOnly', 'true');

      const res = await fetch(`/api/inventory/stock?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
  });

  // Fetch Valuation Summary
  const { data: valuation } = useQuery<ValuationSummary>({
    queryKey: ['stockValuation', activeFirm?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFirm?.id) params.append('firmId', activeFirm.id);

      const res = await fetch(`/api/inventory/stock/valuation?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success
        ? data.data
        : { totalItems: 0, totalValuation: 0, lowStockAlertsCount: 0 };
    },
    enabled: !!token,
  });

  // Stock Adjustment Mutation
  const adjustMutation = useMutation({
    mutationFn: async (payload: {
      firmId: string;
      itemId: string;
      physicalQty: number;
      reason: string;
    }) => {
      const res = await fetch('/api/inventory/stock/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to adjust stock');
      }
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockLedger'] });
      queryClient.invalidateQueries({ queryKey: ['stockValuation'] });
      setAdjustModalItem(null);
      setPhysicalCount('');
      setAdjustReason('');
    },
  });

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalItem) return;

    adjustMutation.mutate({
      firmId: adjustModalItem.firm_id,
      itemId: adjustModalItem.item_id,
      physicalQty: parseFloat(physicalCount),
      reason: adjustReason,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-blue-500" />
            Multi-Firm Real-Time Stock Ledger
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Live warehouse inventory balances, perpetual weighted moving average cost (MAC), and audit adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-950/60 border border-blue-800/60 text-xs font-mono text-blue-300">
          <Building className="w-3.5 h-3.5 text-blue-400" />
          <span>Active Firm: <strong>{activeFirm?.firm_name || 'All Accessible Firms'}</strong></span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Inventory SKUs</span>
            <Boxes className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{valuation?.totalItems ?? 0}</div>
          <div className="text-xs text-slate-500 mt-1">Items stocked across warehouses</div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Stock Valuation</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            ₹ {(valuation?.totalValuation ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">Perpetual MAC valuation</div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Reorder Alerts</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">
            {valuation?.lowStockAlertsCount ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Items below min_qty safety buffer</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search warehouse stock by item name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setLowStockFilter(!lowStockFilter)}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-colors cursor-pointer ${
              lowStockFilter
                ? 'bg-rose-950/60 text-rose-300 border-rose-800/80'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Show Low Stock Only</span>
          </button>
        </div>
      </div>

      {/* Stock Ledger Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Operating Firm</th>
                <th className="py-3 px-4">Item & Specification</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4">Avg Rate (MAC)</th>
                <th className="py-3 px-4">Stock Valuation</th>
                <th className="py-3 px-4">Safety Buffer</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <div>Loading Real-Time Stock Ledger...</div>
                  </td>
                </tr>
              ) : stockItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                    <Boxes className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                    <p className="text-base font-medium text-slate-400">No stock records found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Material receipts processed through Store In will automatically update this ledger.
                    </p>
                  </td>
                </tr>
              ) : (
                stockItems.map((inv) => {
                  const isLow = Number(inv.qty) <= Number(inv.min_qty);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-sans text-slate-300">
                        {inv.firm.firm_name}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-semibold text-slate-100">{inv.item.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {inv.item.group_head.name} {inv.item.brand ? `• ${inv.item.brand}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold">
                        <span className={isLow ? 'text-rose-400 flex items-center gap-1.5' : 'text-slate-100'}>
                          {isLow && <AlertTriangle className="w-3.5 h-3.5" />}
                          {Number(inv.qty).toLocaleString()} {inv.item.uom.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        ₹ {Number(inv.avg_price).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-400 font-semibold">
                        ₹ {Number(inv.total_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {Number(inv.min_qty).toLocaleString()} {inv.item.uom.code}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setAdjustModalItem(inv);
                            setPhysicalCount(Number(inv.qty).toString());
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-sans transition-colors cursor-pointer"
                        >
                          Audit Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {adjustModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700/80 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-blue-400" />
              Stock Audit Adjustment
            </h2>
            <p className="text-xs text-slate-400 mb-4 font-sans">
              Adjust physical count for <strong>{adjustModalItem.item.name}</strong> ({adjustModalItem.firm.firm_name}).
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Actual Physical Quantity ({adjustModalItem.item.uom.code})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={physicalCount}
                  onChange={(e) => setPhysicalCount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Discrepancy / Audit Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Physical inventory count verified during annual store audit"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdjustModalItem(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {adjustMutation.isPending ? 'Adjusting...' : 'Record Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
