import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import {
  ArrowDownToLine,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  FileText,
  UploadCloud,
  ExternalLink,
} from 'lucide-react';
import { uploadFileDirectToStorage, getStorageDownloadUrl } from '../../utils/storageClient';

interface StoreInItem {
  id: string;
  item_id: string;
  received_qty: string | number;
  accepted_qty: string | number;
  rejected_qty: string | number;
  unit_rate: string | number;
  rejection_reason?: string;
  item: {
    id: string;
    name: string;
    brand?: string;
    uom: {
      code: string;
    };
  };
}

interface StoreInReceipt {
  id: string;
  firm_id: string;
  receipt_no: string;
  challan_no: string;
  challan_date: string;
  vendor_name: string;
  vehicle_no?: string;
  driver_contact?: string;
  s3_challan_url?: string;
  status: 'PENDING_INSPECTION' | 'ACCEPTED' | 'REJECTED';
  created_at: string;
  firm: {
    id: string;
    firm_name: string;
  };
  received_by: {
    username: string;
  };
  inspected_by?: {
    username: string;
  };
  items: StoreInItem[];
}

interface CatalogItem {
  id: string;
  name: string;
  brand?: string;
  uom: {
    code: string;
  };
}

export const StoreInView: React.FC = () => {
  const { token } = useAuth();
  const { activeFirm } = useProject();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [inspectReceipt, setInspectReceipt] = useState<StoreInReceipt | null>(null);

  // New Store In Form State
  const [challanNo, setChallanNo] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverContact, setDriverContact] = useState('');
  const [s3ChallanKey, setS3ChallanKey] = useState('');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Line items state
  const [receivedItems, setReceivedItems] = useState<
    Array<{ itemId: string; receivedQty: number; unitRate: number }>
  >([{ itemId: '', receivedQty: 0, unitRate: 0 }]);

  // Inspection form state
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [inspectedQtys, setInspectedQtys] = useState<
    Record<string, { accepted: number; rejected: number; reason: string }>
  >({});

  // Fetch Store In receipts
  const { data: receipts = [], isLoading } = useQuery<StoreInReceipt[]>({
    queryKey: ['storeInReceipts', activeFirm?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFirm?.id) params.append('firmId', activeFirm.id);

      const res = await fetch(`/api/store/receipts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
  });

  // Fetch Items for selection dropdown
  const { data: catalogItems = [] } = useQuery<CatalogItem[]>({
    queryKey: ['itemsList'],
    queryFn: async () => {
      const res = await fetch('/api/inventory/items', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
  });

  // Create Receipt Mutation
  const createReceiptMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/store/receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create Store In');
      }
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storeInReceipts'] });
      setIsCreateModalOpen(false);
      resetCreateForm();
    },
  });

  // Inspection Mutation
  const inspectMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: { inspectionNotes: string; items: unknown[] };
    }) => {
      const res = await fetch(`/api/store/receipts/${id}/inspect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Inspection submission failed');
      }
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storeInReceipts'] });
      queryClient.invalidateQueries({ queryKey: ['stockLedger'] });
      queryClient.invalidateQueries({ queryKey: ['stockValuation'] });
      setInspectReceipt(null);
    },
  });

  const resetCreateForm = () => {
    setChallanNo('');
    setVendorName('');
    setVehicleNo('');
    setDriverContact('');
    setS3ChallanKey('');
    setUploadStatus(null);
    setReceivedItems([{ itemId: '', receivedQty: 0, unitRate: 0 }]);
  };

  const handleChallanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('Uploading delivery challan to Cloudflare R2...');
    try {
      const { key } = await uploadFileDirectToStorage(file, 'challans', token);
      setS3ChallanKey(key);
      setUploadStatus(`Challan uploaded: ${file.name}`);
    } catch (err: unknown) {
      setUploadStatus(`Upload failed: ${err instanceof Error ? err.message : 'Error'}`);
    }
  };

  const handleOpenChallan = async (key: string) => {
    try {
      const url = await getStorageDownloadUrl(key, false, undefined, token);
      window.open(url, '_blank');
    } catch (err) {
      alert('Failed to generate preview URL');
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFirm) {
      alert('Please select an active operating firm first');
      return;
    }

    createReceiptMutation.mutate({
      firmId: activeFirm.id,
      challanNo,
      vendorName,
      vehicleNo: vehicleNo || undefined,
      driverContact: driverContact || undefined,
      s3ChallanUrl: s3ChallanKey || undefined,
      items: receivedItems.filter((i) => i.itemId && i.receivedQty > 0),
    });
  };

  const startInspection = (receipt: StoreInReceipt) => {
    setInspectReceipt(receipt);
    setInspectionNotes('');
    const initialMap: Record<string, { accepted: number; rejected: number; reason: string }> = {};
    for (const item of receipt.items) {
      initialMap[item.id] = {
        accepted: Number(item.received_qty),
        rejected: 0,
        reason: '',
      };
    }
    setInspectedQtys(initialMap);
  };

  const handleInspectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectReceipt) return;

    const itemsPayload = Object.entries(inspectedQtys).map(([storeInItemId, val]) => ({
      storeInItemId,
      acceptedQty: val.accepted,
      rejectedQty: val.rejected,
      rejectionReason: val.reason || undefined,
    }));

    inspectMutation.mutate({
      id: inspectReceipt.id,
      payload: {
        inspectionNotes,
        items: itemsPayload,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ArrowDownToLine className="w-7 h-7 text-blue-500" />
            Store In (Intake & Inspection Pipeline)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gate delivery verification, challan upload to Cloudflare R2, and HOD quality inspection.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Record Gate Intake</span>
        </button>
      </div>

      {/* Receipts Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Receipt & Challan No</th>
                <th className="py-3 px-4">Vendor & Vehicle</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Received Items</th>
                <th className="py-3 px-4">Challan Document</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                    <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <div>Loading Store Receipts...</div>
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                    <FileText className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                    <p className="text-base font-medium text-slate-400">No Store In receipts found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Record gate delivery challans when materials arrive at the warehouse.
                    </p>
                  </td>
                </tr>
              ) : (
                receipts.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-bold text-slate-100">{rec.receipt_no}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Challan: {rec.challan_no}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-medium text-slate-200">{rec.vendor_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Truck className="w-3 h-3 text-slate-500" />
                        <span>{rec.vehicle_no || 'No vehicle'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {rec.status === 'PENDING_INSPECTION' && (
                        <span className="px-2.5 py-1 rounded-md bg-amber-950/60 border border-amber-800/60 text-amber-400 text-xs font-sans flex items-center gap-1.5 w-max">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending QC</span>
                        </span>
                      )}
                      {rec.status === 'ACCEPTED' && (
                        <span className="px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-sans flex items-center gap-1.5 w-max">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Accepted into Stock</span>
                        </span>
                      )}
                      {rec.status === 'REJECTED' && (
                        <span className="px-2.5 py-1 rounded-md bg-rose-950/60 border border-rose-800/60 text-rose-400 text-xs font-sans flex items-center gap-1.5 w-max">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Rejected</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <div className="space-y-1">
                        {rec.items.map((i) => (
                          <div key={i.id} className="text-xs">
                            <span className="text-slate-200 font-medium">{i.item.name}:</span>{' '}
                            <span className="font-mono text-blue-400">
                              {Number(i.received_qty)} {i.item.uom.code}
                            </span>{' '}
                            @ ₹{Number(i.unit_rate)}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {rec.s3_challan_url ? (
                        <button
                          onClick={() => handleOpenChallan(rec.s3_challan_url!)}
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-sans cursor-pointer underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Challan</span>
                        </button>
                      ) : (
                        <span className="text-slate-600 font-sans">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {rec.status === 'PENDING_INSPECTION' && (
                        <button
                          onClick={() => startInspection(rec)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold font-sans transition-colors cursor-pointer"
                        >
                          HOD QC Approval
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

      {/* Record Gate Intake Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-xl p-6 rounded-2xl border border-slate-700/80 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5 text-blue-400" />
              Material Gate Intake (Store In)
            </h2>
            <p className="text-xs text-slate-400 mb-4 font-sans">
              Record physical goods arrival for <strong>{activeFirm?.firm_name}</strong>.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4 font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Vendor / Supplier *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UltraTech Cement Ltd"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Delivery Challan No *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DC-2026-998"
                    value={challanNo}
                    onChange={(e) => setChallanNo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MH-12-RN-4500"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Driver Contact
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={driverContact}
                    onChange={(e) => setDriverContact(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              {/* Upload Challan File directly to Cloudflare R2 */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Upload Challan Scan / Photo (Cloudflare R2 Direct)
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium py-2 px-3 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors">
                    <UploadCloud className="w-4 h-4 text-blue-400" />
                    <span>Upload Challan</span>
                    <input type="file" accept="image/*,application/pdf" onChange={handleChallanUpload} className="hidden" />
                  </label>
                  {uploadStatus && (
                    <span className="text-[11px] font-mono text-slate-400 truncate max-w-xs">
                      {uploadStatus}
                    </span>
                  )}
                </div>
              </div>

              {/* Items Section */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Received Material Items
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setReceivedItems([...receivedItems, { itemId: '', receivedQty: 0, unitRate: 0 }])
                    }
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {receivedItems.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <div className="col-span-6">
                        <select
                          required
                          value={row.itemId}
                          onChange={(e) => {
                            const copy = [...receivedItems];
                            copy[idx].itemId = e.target.value;
                            setReceivedItems(copy);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2 text-xs text-slate-100"
                        >
                          <option value="">Select Item</option>
                          {catalogItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.uom.code}) {item.brand ? `- ${item.brand}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="Qty"
                          min="0.01"
                          value={row.receivedQty || ''}
                          onChange={(e) => {
                            const copy = [...receivedItems];
                            copy[idx].receivedQty = parseFloat(e.target.value) || 0;
                            setReceivedItems(copy);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2 text-xs text-slate-100 font-mono"
                        />
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="Rate (₹)"
                          min="0"
                          value={row.unitRate || ''}
                          onChange={(e) => {
                            const copy = [...receivedItems];
                            copy[idx].unitRate = parseFloat(e.target.value) || 0;
                            setReceivedItems(copy);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2 text-xs text-slate-100 font-mono"
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
                  disabled={createReceiptMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {createReceiptMutation.isPending ? 'Submitting...' : 'Submit Gate Intake'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HOD QC Inspection Modal */}
      {inspectReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-xl p-6 rounded-2xl border border-slate-700/80 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              HOD Quality Check & Inventory Approval
            </h2>
            <p className="text-xs text-slate-400 mb-4 font-sans">
              Verify receipt <strong>{inspectReceipt.receipt_no}</strong> (Challan: {inspectReceipt.challan_no}).
              Accepted items will increment warehouse stock and recalculate weighted moving average price.
            </p>

            <form onSubmit={handleInspectionSubmit} className="space-y-4 font-sans">
              <div className="space-y-3">
                {inspectReceipt.items.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{item.item.name}</span>
                      <span className="font-mono text-slate-400">
                        Received: {Number(item.received_qty)} {item.item.uom.code}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Accepted Quantity
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          min="0"
                          max={Number(item.received_qty)}
                          value={inspectedQtys[item.id]?.accepted ?? Number(item.received_qty)}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setInspectedQtys({
                              ...inspectedQtys,
                              [item.id]: {
                                ...inspectedQtys[item.id],
                                accepted: val,
                                rejected: Number(item.received_qty) - val,
                              },
                            });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2 text-xs text-emerald-400 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Damaged / Rejected Qty
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={inspectedQtys[item.id]?.rejected ?? 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setInspectedQtys({
                              ...inspectedQtys,
                              [item.id]: {
                                ...inspectedQtys[item.id],
                                rejected: val,
                                accepted: Number(item.received_qty) - val,
                              },
                            });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2 text-xs text-rose-400 font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Inspection Notes & QC Findings
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Material inspected at gate; lab test passed; batch certified"
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setInspectReceipt(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inspectMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {inspectMutation.isPending ? 'Processing Approval...' : 'Approve & Update Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
