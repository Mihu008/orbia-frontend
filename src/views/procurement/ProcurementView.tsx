import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import {
  FileText,
  Plus,
  FileSpreadsheet,
  Users,
} from 'lucide-react';

interface IndentItem {
  id: string;
  item_id: string;
  required_qty: string | number;
  estimated_rate?: string | number;
  remarks?: string;
  item: {
    name: string;
    brand?: string;
    uom: {
      code: string;
    };
  };
}

interface IndentRecord {
  id: string;
  firm_id: string;
  indent_no: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'SUBMITTED' | 'VERIFIED' | 'BIDDING' | 'TECH_APPROVED' | 'MANAGEMENT_APPROVED' | 'PO_CREATED' | 'REJECTED';
  required_by?: string;
  purpose?: string;
  vendor1_name?: string;
  vendor1_price?: string | number;
  vendor2_name?: string;
  vendor2_price?: string | number;
  vendor3_name?: string;
  vendor3_price?: string | number;
  selected_vendor?: string;
  created_at: string;
  items: IndentItem[];
  po?: {
    po_number: string;
  };
}

interface CatalogItem {
  id: string;
  name: string;
  uom: {
    code: string;
  };
}

export const ProcurementView: React.FC = () => {
  const { token } = useAuth();
  const { activeFirm } = useProject();
  const queryClient = useQueryClient();

  const [isIndentModalOpen, setIsIndentModalOpen] = useState(false);
  const [biddingIndent, setBiddingIndent] = useState<IndentRecord | null>(null);

  // New Indent form
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [purpose, setPurpose] = useState('');
  const [requiredBy, setRequiredBy] = useState('');
  const [lineItems, setLineItems] = useState<Array<{ itemId: string; requiredQty: number; estimatedRate: number }>>([
    { itemId: '', requiredQty: 0, estimatedRate: 0 },
  ]);

  // Bidding form
  const [v1Name, setV1Name] = useState('');
  const [v1Price, setV1Price] = useState('');
  const [v2Name, setV2Name] = useState('');
  const [v2Price, setV2Price] = useState('');
  const [v3Name, setV3Name] = useState('');
  const [v3Price, setV3Price] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');

  // Fetch Indents
  const { data: indents = [], isLoading } = useQuery<IndentRecord[]>({
    queryKey: ['indents', activeFirm?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFirm?.id) params.append('firmId', activeFirm.id);

      const res = await fetch(`/api/procurement/indents?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
  });

  // Fetch catalog items for dropdown
  const { data: catalogItems = [] } = useQuery<CatalogItem[]>({
    queryKey: ['catalogItemsForIndent'],
    queryFn: async () => {
      const res = await fetch('/api/inventory/items', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
  });

  // Create Indent Mutation
  const createIndentMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/procurement/indents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create requisition indent');
      }
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indents'] });
      setIsIndentModalOpen(false);
      resetIndentForm();
    },
  });

  // Submit 3-Party Bids Mutation
  const submitBidsMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const res = await fetch(`/api/procurement/indents/${id}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record bids');
      }
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indents'] });
      setBiddingIndent(null);
    },
  });

  // Approval Mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: 'TECH_APPROVAL' | 'MANAGEMENT_APPROVAL' }) => {
      const res = await fetch(`/api/procurement/indents/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stage }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Approval failed');
      }
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indents'] });
    },
  });

  const resetIndentForm = () => {
    setPurpose('');
    setRequiredBy('');
    setLineItems([{ itemId: '', requiredQty: 0, estimatedRate: 0 }]);
  };

  const handleCreateIndent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFirm) {
      alert('Please select an operating firm');
      return;
    }

    createIndentMutation.mutate({
      firmId: activeFirm.id,
      priority,
      purpose: purpose || undefined,
      requiredBy: requiredBy || undefined,
      items: lineItems.filter((i) => i.itemId && i.requiredQty > 0),
    });
  };

  const startBidding = (indent: IndentRecord) => {
    setBiddingIndent(indent);
    setV1Name(indent.vendor1_name || '');
    setV1Price(indent.vendor1_price?.toString() || '');
    setV2Name(indent.vendor2_name || '');
    setV2Price(indent.vendor2_price?.toString() || '');
    setV3Name(indent.vendor3_name || '');
    setV3Price(indent.vendor3_price?.toString() || '');
    setSelectedVendor(indent.selected_vendor || '');
  };

  const handleBidsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!biddingIndent) return;

    submitBidsMutation.mutate({
      id: biddingIndent.id,
      payload: {
        vendor1Name: v1Name,
        vendor1Price: parseFloat(v1Price),
        vendor2Name: v2Name,
        vendor2Price: parseFloat(v2Price),
        vendor3Name: v3Name,
        vendor3Price: parseFloat(v3Price),
        selectedVendor,
      },
    });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-amber-400" />
            7-Stage Procurement & Purchase Pipeline
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Requisition Indents, 3-Party rate bidding, multi-level approvals, and sequential PO creation.
          </p>
        </div>

        <button
          onClick={() => setIsIndentModalOpen(true)}
          className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-600/20 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Indent</span>
        </button>
      </div>

      {/* Indents Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Indent Number</th>
                <th className="py-3 px-4">Priority & Purpose</th>
                <th className="py-3 px-4">Pipeline Status</th>
                <th className="py-3 px-4">Line Items</th>
                <th className="py-3 px-4">3-Party Bidding Matrix</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                    <div className="inline-block w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <div>Loading Requisition Pipeline...</div>
                  </td>
                </tr>
              ) : indents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                    <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                    <p className="text-base font-medium text-slate-400">No purchase indents found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Create an indent requisition to begin the 3-party quotation and PO generation workflow.
                    </p>
                  </td>
                </tr>
              ) : (
                indents.map((indent) => (
                  <tr key={indent.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-sans font-bold text-slate-100">
                      <div>{indent.indent_no}</div>
                      {indent.po && (
                        <div className="text-[11px] text-emerald-400 font-mono">
                          PO: {indent.po.po_number}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            indent.priority === 'CRITICAL'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : indent.priority === 'HIGH'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {indent.priority}
                        </span>
                        <span className="text-xs text-slate-300 truncate max-w-xs">
                          {indent.purpose || 'General material requisition'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-200 text-xs">
                        {indent.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <div className="space-y-1">
                        {indent.items.map((i) => (
                          <div key={i.id} className="text-xs">
                            <span className="text-slate-200 font-medium">{i.item.name}:</span>{' '}
                            <span className="font-mono text-amber-400">
                              {Number(i.required_qty)} {i.item.uom.code}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      {indent.vendor1_name ? (
                        <div className="text-[11px] space-y-0.5 font-mono">
                          <div>1. {indent.vendor1_name}: ₹{Number(indent.vendor1_price)}</div>
                          <div>2. {indent.vendor2_name}: ₹{Number(indent.vendor2_price)}</div>
                          <div>3. {indent.vendor3_name}: ₹{Number(indent.vendor3_price)}</div>
                          <div className="text-emerald-400 font-bold">Selected: {indent.selected_vendor}</div>
                        </div>
                      ) : (
                        <span className="text-slate-600">Pending Quotes</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-2">
                        {indent.status === 'SUBMITTED' && (
                          <button
                            onClick={() => startBidding(indent)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer"
                          >
                            Enter 3-Party Bids
                          </button>
                        )}
                        {indent.status === 'BIDDING' && (
                          <button
                            onClick={() => approveMutation.mutate({ id: indent.id, stage: 'TECH_APPROVAL' })}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                          >
                            Tech Approve
                          </button>
                        )}
                        {indent.status === 'TECH_APPROVED' && (
                          <button
                            onClick={() => approveMutation.mutate({ id: indent.id, stage: 'MANAGEMENT_APPROVAL' })}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                          >
                            Rate Sign-off
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Indent Modal */}
      {isIndentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-xl p-6 rounded-2xl border border-slate-700/80 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" />
              Create Purchase Indent Requisition
            </h2>
            <p className="text-xs text-slate-400 mb-4 font-sans">
              Requisitioning for: <strong>{activeFirm?.firm_name}</strong>.
            </p>

            <form onSubmit={handleCreateIndent} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Priority Level *
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Required By Date
                  </label>
                  <input
                    type="date"
                    value={requiredBy}
                    onChange={(e) => setRequiredBy(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Requisition Purpose / Site Requirement
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Required for Pier 3 footing casting"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              {/* Items Section */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Requisition Line Items
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setLineItems([...lineItems, { itemId: '', requiredQty: 0, estimatedRate: 0 }])
                    }
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {lineItems.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <div className="col-span-8">
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
                          <option value="">Select Item</option>
                          {catalogItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.uom.code})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-4">
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="Required Qty"
                          min="0.01"
                          value={row.requiredQty || ''}
                          onChange={(e) => {
                            const copy = [...lineItems];
                            copy[idx].requiredQty = parseFloat(e.target.value) || 0;
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
                  onClick={() => setIsIndentModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createIndentMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {createIndentMutation.isPending ? 'Submitting...' : 'Submit Indent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3-Party Bidding Modal */}
      {biddingIndent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-700/80 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              Record 3-Party Comparative Bids
            </h2>
            <p className="text-xs text-slate-400 mb-4 font-sans">
              Indent: <strong>{biddingIndent.indent_no}</strong>.
            </p>

            <form onSubmit={handleBidsSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Vendor 1 Name"
                  value={v1Name}
                  onChange={(e) => setV1Name(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                />
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Quoted Rate (₹)"
                  value={v1Price}
                  onChange={(e) => setV1Price(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Vendor 2 Name"
                  value={v2Name}
                  onChange={(e) => setV2Name(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                />
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Quoted Rate (₹)"
                  value={v2Price}
                  onChange={(e) => setV2Price(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Vendor 3 Name"
                  value={v3Name}
                  onChange={(e) => setV3Name(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                />
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Quoted Rate (₹)"
                  value={v3Price}
                  onChange={(e) => setV3Price(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Selected Winning Vendor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UltraTech Cement"
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-bold text-amber-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setBiddingIndent(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitBidsMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {submitBidsMutation.isPending ? 'Saving...' : 'Submit Bids Matrix'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
