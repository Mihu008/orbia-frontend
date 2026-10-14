import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import {
  FolderTree,
  Plus,
  Search,
  Tag,
  FileSpreadsheet,
  AlertCircle,
  UploadCloud,
  CheckCircle2,
} from 'lucide-react';
import { uploadFileDirectToStorage } from '../../utils/storageClient';

interface MasterItem {
  id: string;
  name: string;
  brand?: string;
  hsn_code?: string;
  drawing_no?: string;
  specifications?: string;
  group_head: {
    id: string;
    name: string;
  };
  uom: {
    id: string;
    name: string;
    code: string;
  };
}

interface LookupOption {
  id: string;
  name: string;
  code?: string;
}

export const MasterCatalogView: React.FC = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Item Form State
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [groupHeadId, setGroupHeadId] = useState('');
  const [uomId, setUomId] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [drawingNo, setDrawingNo] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Fetch Items
  const { data: items = [], isLoading } = useQuery<MasterItem[]>({
    queryKey: ['items', searchTerm, selectedGroup],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedGroup) params.append('groupHeadId', selectedGroup);

      const res = await fetch(`/api/inventory/items?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
  });

  // Fetch UOMs
  const { data: uoms = [] } = useQuery<LookupOption[]>({
    queryKey: ['uoms'],
    queryFn: async () => {
      const res = await fetch('/api/inventory/masters/uoms', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
  });

  // Fetch Group Heads
  const { data: groupHeads = [] } = useQuery<LookupOption[]>({
    queryKey: ['groupHeads'],
    queryFn: async () => {
      const res = await fetch('/api/inventory/masters/group-heads', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
  });

  // Create Item Mutation
  const createItemMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/inventory/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create item');
      }
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setName('');
    setBrand('');
    setGroupHeadId('');
    setUomId('');
    setHsnCode('');
    setDrawingNo('');
    setSpecifications('');
    setUploadStatus(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('Uploading directly to Cloudflare R2...');
    try {
      const { key } = await uploadFileDirectToStorage(file, 'drawings', token);
      setDrawingNo(key);
      setUploadStatus(`Direct upload successful: ${file.name}`);
    } catch (err: unknown) {
      setUploadStatus(`Upload failed: ${err instanceof Error ? err.message : 'Error'}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createItemMutation.mutate({
      name,
      brand: brand || undefined,
      groupHeadId,
      uomId,
      hsnCode: hsnCode || undefined,
      drawingNo: drawingNo || undefined,
      specifications: specifications || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FolderTree className="w-7 h-7 text-blue-500" />
            Master Catalog & Item Registry
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Universal SKU definitions, group classification, UOM standards, and drawing attachments.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Item</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search items by name, brand, or HSN code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        <div>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
          >
            <option value="">All Material Groups</option>
            {groupHeads.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Item Name & Brand</th>
                <th className="py-3 px-4">Group Classification</th>
                <th className="py-3 px-4">Unit of Measure (UOM)</th>
                <th className="py-3 px-4">HSN Code</th>
                <th className="py-3 px-4">Direct Attachment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <div>Loading Item Catalog...</div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 font-sans">
                    <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                    <p className="text-base font-medium text-slate-400">No items found</p>
                    <p className="text-xs text-slate-500 mt-1">Register items to begin tracking warehouse stock</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-sans font-semibold text-slate-100">
                      <div>{item.name}</div>
                      {item.brand && (
                        <span className="text-[11px] text-slate-400 font-mono">Brand: {item.brand}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded-md bg-blue-950/60 border border-blue-800/40 text-blue-400 text-xs">
                        {item.group_head.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.uom.name} ({item.uom.code})
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {item.hsn_code || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.drawing_no ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>R2 Stored</span>
                        </span>
                      ) : (
                        <span className="text-slate-600">None</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-700/80 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-400" />
              Register Item in Catalog
            </h2>

            {createItemMutation.isError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createItemMutation.error?.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Portland Pozzolana Cement"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Group Head *
                  </label>
                  <select
                    required
                    value={groupHeadId}
                    onChange={(e) => setGroupHeadId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                  >
                    <option value="">Select Category</option>
                    {groupHeads.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Unit of Measure *
                  </label>
                  <select
                    required
                    value={uomId}
                    onChange={(e) => setUomId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                  >
                    <option value="">Select UOM</option>
                    {uoms.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UltraTech, Tata Steel"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    HSN Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 252329"
                    value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              {/* Direct S3 Upload for Specs / Drawing */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Technical Drawing / Spec (Direct to Cloudflare R2)
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium py-2 px-3 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors">
                    <UploadCloud className="w-4 h-4 text-blue-400" />
                    <span>Upload File Directly</span>
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                  </label>
                  {uploadStatus && (
                    <span className="text-[11px] font-mono text-slate-400 truncate max-w-xs">
                      {uploadStatus}
                    </span>
                  )}
                </div>
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
                  disabled={createItemMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {createItemMutation.isPending ? 'Registering...' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
