import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import {
  ArrowLeftRight,
  Plus,
  Truck,
  CheckCircle,
  ArrowRight,
  AlertCircle,
  Boxes,
} from 'lucide-react';

interface TransferRecord {
  id: string;
  transfer_no: string;
  from_firm_id: string;
  to_firm_id: string;
  item_id: string;
  transfer_qty: string | number;
  status: 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  dispatch_notes?: string;
  receive_notes?: string;
  dispatched_at?: string;
  received_at?: string;
  created_at: string;
  from_firm: {
    id: string;
    firm_name: string;
  };
  to_firm: {
    id: string;
    firm_name: string;
  };
  item?: {
    name: string;
    brand?: string;
    uom: {
      code: string;
    };
  };
}

interface StockItem {
  id: string;
  item_id: string;
  qty: string | number;
  item: {
    id: string;
    name: string;
    brand?: string;
    uom: {
      code: string;
    };
  };
}

export const StockTransfersView: React.FC = () => {
  const { token } = useAuth();
  const { activeFirm, firms } = useProject();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toFirmId, setToFirmId] = useState('');
  const [itemId, setItemId] = useState('');
  const [transferQty, setTransferQty] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');

  // Fetch Transfers
  const { data: transfers = [], isLoading } = useQuery<TransferRecord[]>({
    queryKey: ['stockTransfers', activeFirm?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFirm?.id) params.append('firmId', activeFirm.id);

      const res = await fetch(`/api/inventory/transfers?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
  });

  // Fetch available stock for active firm
  const { data: stockItems = [] } = useQuery<StockItem[]>({
    queryKey: ['availableStockForTransfer', activeFirm?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFirm?.id) params.append('firmId', activeFirm.id);

      const res = await fetch(`/api/inventory/stock?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token && !!activeFirm?.id,
  });

  // Dispatch Transfer Mutation
  const dispatchMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/inventory/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch transfer');
      }
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockTransfers'] });
      queryClient.invalidateQueries({ queryKey: ['stockLedger'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  // Receive Transfer Mutation
  const receiveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await fetch(`/api/inventory/transfers/${id}/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receiveNotes: notes }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to receive transfer');
      }
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockTransfers'] });
      queryClient.invalidateQueries({ queryKey: ['stockLedger'] });
      queryClient.invalidateQueries({ queryKey: ['stockValuation'] });
    },
  });

  const resetForm = () => {
    setToFirmId('');
    setItemId('');
    setTransferQty('');
    setDispatchNotes('');
  };

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFirm) {
      alert('Please select an active operating firm');
      return;
    }

    dispatchMutation.mutate({
      fromFirmId: activeFirm.id,
      toFirmId,
      itemId,
      transferQty: parseFloat(transferQty),
      dispatchNotes: dispatchNotes || undefined,
    });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ArrowLeftRight className="w-7 h-7 text-cyan-400" />
            Inter-Firm & Inter-Warehouse Stock Transfers
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Inter-entity inventory relocations, in-transit custody tracking, and destination receiving.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-600/20 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Dispatch Stock Transfer</span>
        </button>
      </div>

      {/* Transfers Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Transfer Voucher</th>
                <th className="py-3 px-4">Entity Flow (From ➔ To)</th>
                <th className="py-3 px-4">Item & Quantity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Dispatch Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                    <div className="inline-block w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <div>Loading Stock Transfers...</div>
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                    <Boxes className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                    <p className="text-base font-medium text-slate-400">No stock transfers found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Dispatch materials between operating firms to rebalance warehouse inventory.
                    </p>
                  </td>
                </tr>
              ) : (
                transfers.map((trf) => {
                  const isRecipient = activeFirm?.id === trf.to_firm_id;
                  return (
                    <tr key={trf.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-100 font-sans">
                        {trf.transfer_no}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-slate-300 font-medium">{trf.from_firm.firm_name}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-slate-100 font-bold">{trf.to_firm.firm_name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-semibold text-slate-100">{trf.item?.name || 'Material Item'}</div>
                        <div className="text-[11px] font-mono text-cyan-400">
                          {Number(trf.transfer_qty)} {trf.item?.uom.code}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {trf.status === 'IN_TRANSIT' && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-800/60 text-amber-400 text-xs font-sans flex items-center gap-1 w-max">
                            <Truck className="w-3.5 h-3.5" />
                            <span>In Transit</span>
                          </span>
                        )}
                        {trf.status === 'COMPLETED' && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-sans flex items-center gap-1 w-max">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Received</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-sans">
                        {trf.dispatch_notes || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-sans">
                        {trf.status === 'IN_TRANSIT' && isRecipient && (
                          <button
                            onClick={() => receiveMutation.mutate({ id: trf.id })}
                            disabled={receiveMutation.isPending}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Receive Stock
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatch Transfer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700/80 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
              Dispatch Stock to Another Firm
            </h2>
            <p className="text-xs text-slate-400 mb-4 font-sans">
              Source: <strong>{activeFirm?.firm_name}</strong>. Stock will be decremented upon dispatch.
            </p>

            {dispatchMutation.isError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{dispatchMutation.error?.message}</span>
              </div>
            )}

            <form onSubmit={handleDispatchSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Destination Operating Firm *
                </label>
                <select
                  required
                  value={toFirmId}
                  onChange={(e) => setToFirmId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
                >
                  <option value="">Select Target Firm</option>
                  {firms
                    .filter((f) => f.id !== activeFirm?.id)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.firm_name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Item to Relocate *
                </label>
                <select
                  required
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
                >
                  <option value="">Select Item from Warehouse</option>
                  {stockItems.map((s) => (
                    <option key={s.item_id} value={s.item_id}>
                      {s.item.name} ({s.item.uom.code}) - Avail: {Number(s.qty)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Transfer Quantity *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  placeholder="e.g. 50"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Dispatch Notes / Vehicle
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dispatched via site truck MH-12-RN-4500"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispatchMutation.isPending}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {dispatchMutation.isPending ? 'Dispatching...' : 'Dispatch Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
