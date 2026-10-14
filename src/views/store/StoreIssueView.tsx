import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import {
  ArrowUpFromLine,
  Plus,
  RotateCcw,
  User,
  HardHat,
  Cpu,
  FileCheck,
  AlertCircle,
} from 'lucide-react';

interface IssueItem {
  id: string;
  item_id: string;
  issued_qty: string | number;
  returned_qty: string | number;
  unit_cost: string | number;
  remarks?: string;
  item: {
    id: string;
    name: string;
    brand?: string;
    uom: {
      code: string;
    };
  };
}

interface IssueVoucher {
  id: string;
  firm_id: string;
  issue_no: string;
  issued_to_type: 'SUBCONTRACTOR' | 'SITE_ENGINEER' | 'EQUIPMENT';
  issued_to_name: string;
  site_location?: string;
  machine_code?: string;
  status: 'ISSUED' | 'RETURNED' | 'PARTIALLY_RETURNED';
  created_at: string;
  firm: {
    id: string;
    firm_name: string;
  };
  created_by: {
    username: string;
  };
  items: IssueItem[];
}

interface InventoryStockItem {
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

export const StoreIssueView: React.FC = () => {
  const { token } = useAuth();
  const { activeFirm } = useProject();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [returnVoucher, setReturnVoucher] = useState<IssueVoucher | null>(null);

  // New Issue form state
  const [issuedToType, setIssuedToType] = useState<'SUBCONTRACTOR' | 'SITE_ENGINEER' | 'EQUIPMENT'>('SUBCONTRACTOR');
  const [issuedToName, setIssuedToName] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [machineCode, setMachineCode] = useState('');
  const [lineItems, setLineItems] = useState<Array<{ itemId: string; issuedQty: number; remarks: string }>>([
    { itemId: '', issuedQty: 0, remarks: '' },
  ]);

  // Return form state
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [returnNotes, setReturnNotes] = useState('');

  // Fetch Issue Vouchers
  const { data: issues = [], isLoading } = useQuery<IssueVoucher[]>({
    queryKey: ['storeIssues', activeFirm?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFirm?.id) params.append('firmId', activeFirm.id);

      const res = await fetch(`/api/store/issues?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
  });

  // Fetch available stock in active firm
  const { data: availableStock = [] } = useQuery<InventoryStockItem[]>({
    queryKey: ['availableStockForIssue', activeFirm?.id],
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

  // Create Issue Mutation
  const createIssueMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/store/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create issue voucher');
      }
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storeIssues'] });
      queryClient.invalidateQueries({ queryKey: ['stockLedger'] });
      queryClient.invalidateQueries({ queryKey: ['stockValuation'] });
      setIsCreateModalOpen(false);
      resetCreateForm();
    },
  });

  // Return Issue Mutation
  const returnMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/store/issues/return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to process issue return');
      }
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storeIssues'] });
      queryClient.invalidateQueries({ queryKey: ['stockLedger'] });
      queryClient.invalidateQueries({ queryKey: ['stockValuation'] });
      setReturnVoucher(null);
    },
  });

  const resetCreateForm = () => {
    setIssuedToName('');
    setSiteLocation('');
    setMachineCode('');
    setLineItems([{ itemId: '', issuedQty: 0, remarks: '' }]);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFirm) {
      alert('Please select an active operating firm first');
      return;
    }

    createIssueMutation.mutate({
      firmId: activeFirm.id,
      issuedToType,
      issuedToName,
      siteLocation: siteLocation || undefined,
      machineCode: machineCode || undefined,
      items: lineItems.filter((i) => i.itemId && i.issuedQty > 0),
    });
  };

  const startReturn = (voucher: IssueVoucher) => {
    setReturnVoucher(voucher);
    const initialMap: Record<string, number> = {};
    for (const item of voucher.items) {
      initialMap[item.id] = 0;
    }
    setReturnQtys(initialMap);
    setReturnNotes('');
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnVoucher) return;

    const payloadItems = Object.entries(returnQtys)
      .filter(([_, qty]) => qty > 0)
      .map(([issueItemId, returnQty]) => ({
        issueItemId,
        returnQty,
        remarks: returnNotes || undefined,
      }));

    if (payloadItems.length === 0) {
      alert('Please enter return quantity greater than 0 for at least one item');
      return;
    }

    returnMutation.mutate({
      issueId: returnVoucher.id,
      items: payloadItems,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ArrowUpFromLine className="w-7 h-7 text-indigo-400" />
            Material Store Issue & Return Register
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Material outward vouchers, atomic warehouse stock decrements, and site restock returns.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Issue Voucher</span>
        </button>
      </div>

      {/* Issues Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Voucher No</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Site / Machine</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Issued Materials</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                    <div className="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <div>Loading Issue Vouchers...</div>
                  </td>
                </tr>
              ) : issues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                    <FileCheck className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                    <p className="text-base font-medium text-slate-400">No material issues found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Issue stock out of warehouse for site engineers, contractors, or plant machinery.
                    </p>
                  </td>
                </tr>
              ) : (
                issues.map((voucher) => (
                  <tr key={voucher.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-sans font-bold text-slate-100">
                      <div>{voucher.issue_no}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        By: {voucher.created_by.username}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-semibold text-slate-200">{voucher.issued_to_name}</div>
                      <div className="text-[11px] text-indigo-400 font-mono flex items-center gap-1">
                        {voucher.issued_to_type === 'SUBCONTRACTOR' && <HardHat className="w-3 h-3" />}
                        {voucher.issued_to_type === 'SITE_ENGINEER' && <User className="w-3 h-3" />}
                        {voucher.issued_to_type === 'EQUIPMENT' && <Cpu className="w-3 h-3" />}
                        <span>{voucher.issued_to_type}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-sans text-slate-400">
                      <div>{voucher.site_location || '—'}</div>
                      {voucher.machine_code && (
                        <span className="text-[11px] text-slate-500 font-mono">Machine: {voucher.machine_code}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      {voucher.status === 'ISSUED' && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-950/60 border border-blue-800/60 text-blue-400 text-xs">
                          Active Issue
                        </span>
                      )}
                      {voucher.status === 'PARTIALLY_RETURNED' && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-800/60 text-amber-400 text-xs">
                          Partially Returned
                        </span>
                      )}
                      {voucher.status === 'RETURNED' && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs">
                          Fully Restocked
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <div className="space-y-1">
                        {voucher.items.map((i) => (
                          <div key={i.id} className="text-xs">
                            <span className="text-slate-200 font-medium">{i.item.name}:</span>{' '}
                            <span className="font-mono text-indigo-400">
                              {Number(i.issued_qty)} {i.item.uom.code}
                            </span>
                            {Number(i.returned_qty) > 0 && (
                              <span className="text-[11px] text-emerald-400 ml-1.5 font-mono">
                                (Ret: {Number(i.returned_qty)})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-sans">
                      {voucher.status !== 'RETURNED' && (
                        <button
                          onClick={() => startReturn(voucher)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs transition-colors cursor-pointer flex items-center gap-1.5 ml-auto"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                          <span>Return Material</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Issue Voucher Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-xl p-6 rounded-2xl border border-slate-700/80 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <ArrowUpFromLine className="w-5 h-5 text-indigo-400" />
              Issue Material Out of Warehouse
            </h2>
            <p className="text-xs text-slate-400 mb-4 font-sans">
              Warehouse: <strong>{activeFirm?.firm_name}</strong>. Stock will be atomically decremented upon submission.
            </p>

            {createIssueMutation.isError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 font-sans">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createIssueMutation.error?.message}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Recipient Type *
                  </label>
                  <select
                    value={issuedToType}
                    onChange={(e) => setIssuedToType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                  >
                    <option value="SUBCONTRACTOR">Subcontractor</option>
                    <option value="SITE_ENGINEER">Site Engineer</option>
                    <option value="EQUIPMENT">Equipment / Machinery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Recipient Name / Party *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Skyline Infra Works"
                    value={issuedToName}
                    onChange={(e) => setIssuedToName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Site Location / Area of Use
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tunnel Portal North, Pier 4"
                    value={siteLocation}
                    onChange={(e) => setSiteLocation(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Machine Tag (If applicable)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EX-01 (CAT 320D)"
                    value={machineCode}
                    onChange={(e) => setMachineCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Materials to Issue
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setLineItems([...lineItems, { itemId: '', issuedQty: 0, remarks: '' }])
                    }
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {lineItems.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <div className="col-span-7">
                        <select
                          required
                          value={row.itemId}
                          onChange={(e) => {
                            const copy = [...lineItems];
                            copy[idx].itemId = e.target.value;
                            setLineItems(copy);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2 text-xs text-slate-100"
                        >
                          <option value="">Select Stocked Item</option>
                          {availableStock.map((inv) => (
                            <option key={inv.item_id} value={inv.item_id}>
                              {inv.item.name} ({inv.item.uom.code}) - Avail: {Number(inv.qty)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-5">
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="Issue Qty"
                          min="0.01"
                          value={row.issuedQty || ''}
                          onChange={(e) => {
                            const copy = [...lineItems];
                            copy[idx].issuedQty = parseFloat(e.target.value) || 0;
                            setLineItems(copy);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2 text-xs text-slate-100 font-mono font-bold"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createIssueMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {createIssueMutation.isPending ? 'Decreasing Stock...' : 'Confirm Material Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Material Modal */}
      {returnVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-700/80 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-blue-400" />
              Restock Material Return to Warehouse
            </h2>
            <p className="text-xs text-slate-400 mb-4 font-sans">
              Return unused goods from voucher <strong>{returnVoucher.issue_no}</strong> ({returnVoucher.issued_to_name}).
            </p>

            <form onSubmit={handleReturnSubmit} className="space-y-4 font-sans">
              <div className="space-y-3">
                {returnVoucher.items.map((item) => {
                  const maxReturnable = Number(item.issued_qty) - Number(item.returned_qty);
                  return (
                    <div key={item.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">{item.item.name}</span>
                        <span className="font-mono text-slate-400">
                          Issued: {Number(item.issued_qty)} (Remaining Returnable: {maxReturnable} {item.item.uom.code})
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Return Quantity
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={maxReturnable}
                          value={returnQtys[item.id] ?? 0}
                          onChange={(e) => {
                            setReturnQtys({
                              ...returnQtys,
                              [item.id]: parseFloat(e.target.value) || 0,
                            });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2 text-xs text-emerald-400 font-mono font-bold"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Return Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Unused surplus returned from Pier 4 casting"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReturnVoucher(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={returnMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {returnMutation.isPending ? 'Restocking...' : 'Process Material Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
