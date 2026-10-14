import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import {
  Cpu,
  Plus,
  Fuel,
  QrCode,
  Gauge,
  Activity,
  FileSpreadsheet,
} from 'lucide-react';

interface MachineItem {
  id: string;
  firm_id: string;
  machine_name: string;
  internal_code: string;
  serial_no?: string;
  make?: string;
  model?: string;
  category?: string;
  ownership_type: string;
  reading_unit: string;
  current_reading: string | number;
  status: string;
  site_location?: string;
  assigned_operator?: string;
  fitness_expiry?: string;
  insurance_expiry?: string;
}

export const FleetView: React.FC = () => {
  const { token } = useAuth();
  const { activeFirm } = useProject();
  const queryClient = useQueryClient();

  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [selectedMachineForUsage, setSelectedMachineForUsage] = useState<MachineItem | null>(null);
  const [selectedMachineForFuel, setSelectedMachineForFuel] = useState<MachineItem | null>(null);
  const [selectedQrMachine, setSelectedQrMachine] = useState<MachineItem | null>(null);

  // Machine form
  const [machineName, setMachineName] = useState('');
  const [internalCode, setInternalCode] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [category, setCategory] = useState('EXCAVATOR');
  const [ownershipType, setOwnershipType] = useState('OWNED');
  const [siteLocation, setSiteLocation] = useState('');
  const [assignedOperator, setAssignedOperator] = useState('');

  // Usage Log form
  const [startReading, setStartReading] = useState('');
  const [stopReading, setStopReading] = useState('');
  const [workDesc, setWorkDesc] = useState('');

  // Fuel Log form
  const [liters, setLiters] = useState('');
  const [ratePerLiter, setRatePerLiter] = useState('92.50');
  const [readingAtFuel, setReadingAtFuel] = useState('');
  const [bowserSlip, setBowserSlip] = useState('');

  // Fetch Machines
  const { data: machines = [], isLoading } = useQuery<MachineItem[]>({
    queryKey: ['fleetMachines', activeFirm?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFirm?.id) params.append('firmId', activeFirm.id);

      const res = await fetch(`/api/fleet/machines?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
  });

  // Create Machine Mutation
  const createMachineMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/fleet/machines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to register machine');
      }
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleetMachines'] });
      setIsMachineModalOpen(false);
      resetMachineForm();
    },
  });

  // Log Usage Mutation
  const logUsageMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/fleet/usage-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record usage log');
      }
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleetMachines'] });
      setSelectedMachineForUsage(null);
    },
  });

  // Log Diesel Mutation
  const logDieselMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/fleet/diesel-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record diesel dispensing');
      }
      return data.data;
    },
    onSuccess: () => {
      setSelectedMachineForFuel(null);
    },
  });

  const resetMachineForm = () => {
    setMachineName('');
    setInternalCode('');
    setSerialNo('');
    setMake('');
    setModel('');
    setSiteLocation('');
    setAssignedOperator('');
  };

  const handleCreateMachine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFirm) {
      alert('Please select an operating firm');
      return;
    }

    createMachineMutation.mutate({
      firmId: activeFirm.id,
      machineName,
      internalCode,
      serialNo: serialNo || undefined,
      make: make || undefined,
      model: model || undefined,
      category,
      ownershipType,
      siteLocation: siteLocation || undefined,
      assignedOperator: assignedOperator || undefined,
    });
  };

  const handleUsageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachineForUsage) return;

    logUsageMutation.mutate({
      machineId: selectedMachineForUsage.id,
      startReading: parseFloat(startReading),
      stopReading: parseFloat(stopReading),
      workDescription: workDesc || undefined,
    });
  };

  const handleFuelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachineForFuel) return;

    logDieselMutation.mutate({
      machineId: selectedMachineForFuel.id,
      liters: parseFloat(liters),
      ratePerLiter: parseFloat(ratePerLiter),
      readingAtFuel: parseFloat(readingAtFuel),
      bowserSlipNo: bowserSlip || undefined,
    });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Cpu className="w-7 h-7 text-emerald-400" />
            Heavy Plant, Equipment & Fleet Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Excavators, batching plants, mobile QR dossiers, meter usage logs, and diesel fuel tracking.
          </p>
        </div>

        <button
          onClick={() => setIsMachineModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Register Equipment</span>
        </button>
      </div>

      {/* Machines Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Asset Tag & Machine</th>
                <th className="py-3 px-4">Make / Model / Class</th>
                <th className="py-3 px-4">Current Meter Reading</th>
                <th className="py-3 px-4">Status & Location</th>
                <th className="py-3 px-4">Mobile QR Dossier</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                    <div className="inline-block w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <div>Loading Heavy Equipment Fleet...</div>
                  </td>
                </tr>
              ) : machines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                    <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                    <p className="text-base font-medium text-slate-400">No machinery registered</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Register excavators, cranes, or generators to track meter hours and fuel consumption.
                    </p>
                  </td>
                </tr>
              ) : (
                machines.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-bold text-slate-100">{m.machine_name}</div>
                      <div className="text-[11px] text-emerald-400 font-mono">Tag: {m.internal_code}</div>
                    </td>
                    <td className="py-3.5 px-4 font-sans text-slate-300">
                      <div>{m.make || 'Standard'} {m.model || ''}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{m.category} • {m.ownership_type}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-100 flex items-center gap-1.5 font-mono">
                        <Gauge className="w-3.5 h-3.5 text-blue-400" />
                        <span>{Number(m.current_reading)} {m.reading_unit}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs">
                        {m.status}
                      </span>
                      <div className="text-[11px] text-slate-400 mt-0.5">{m.site_location || 'Main Site'}</div>
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <button
                        onClick={() => setSelectedQrMachine(m)}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>View Public Dossier</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedMachineForUsage(m);
                            setStartReading(Number(m.current_reading).toString());
                            setStopReading(Number(m.current_reading).toString());
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs cursor-pointer flex items-center gap-1"
                        >
                          <Activity className="w-3 h-3 text-blue-400" />
                          <span>Log Hours</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMachineForFuel(m);
                            setReadingAtFuel(Number(m.current_reading).toString());
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/60 text-amber-300 text-xs cursor-pointer flex items-center gap-1"
                        >
                          <Fuel className="w-3 h-3 text-amber-400" />
                          <span>Fuel Dispense</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Machine Modal */}
      {isMachineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-700/80 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-400" />
              Register Heavy Equipment
            </h2>
            <p className="text-xs text-slate-400 mb-4 font-sans">
              Operating Firm: <strong>{activeFirm?.firm_name}</strong>.
            </p>

            <form onSubmit={handleCreateMachine} className="space-y-4 font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Machine Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CAT 320D Excavator"
                    value={machineName}
                    onChange={(e) => setMachineName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Internal Asset Tag / Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EX-01"
                    value={internalCode}
                    onChange={(e) => setInternalCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-mono font-bold text-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Make / Manufacturer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Caterpillar"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 320D"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                  >
                    <option value="EXCAVATOR">Excavator</option>
                    <option value="CRANE">Mobile Crane</option>
                    <option value="BATCHING_PLANT">Concrete Batching Plant</option>
                    <option value="DG_SET">Diesel Generator (DG Set)</option>
                    <option value="TRANSIT_MIXER">Transit Mixer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Ownership
                  </label>
                  <select
                    value={ownershipType}
                    onChange={(e) => setOwnershipType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                  >
                    <option value="OWNED">Company Owned</option>
                    <option value="RENTED">Hired / Rented</option>
                    <option value="LEASED">Leased</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMachineModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMachineMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {createMachineMutation.isPending ? 'Saving...' : 'Register Equipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Hours Modal */}
      {selectedMachineForUsage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700/80 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Daily Operational Hours Log
            </h2>
            <p className="text-xs text-slate-400 mb-4 font-sans">
              Machine: <strong>{selectedMachineForUsage.machine_name}</strong> ({selectedMachineForUsage.internal_code}).
            </p>

            <form onSubmit={handleUsageSubmit} className="space-y-4 font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Start Meter Reading
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={startReading}
                    onChange={(e) => setStartReading(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Stop Meter Reading
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={stopReading}
                    onChange={(e) => setStopReading(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-mono font-bold text-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Work Activity Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Earth excavation for Pier 4 foundation"
                  value={workDesc}
                  onChange={(e) => setWorkDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedMachineForUsage(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logUsageMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {logUsageMutation.isPending ? 'Logging...' : 'Save Logbook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fuel Modal */}
      {selectedMachineForFuel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700/80 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Fuel className="w-5 h-5 text-amber-400" />
              Diesel Fuel Dispensing Slip
            </h2>
            <p className="text-xs text-slate-400 mb-4 font-sans">
              Fueling: <strong>{selectedMachineForFuel.machine_name}</strong>.
            </p>

            <form onSubmit={handleFuelSubmit} className="space-y-4 font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Liters Dispensed *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="e.g. 150"
                    value={liters}
                    onChange={(e) => setLiters(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-mono font-bold text-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Meter Reading at Fuel
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={readingAtFuel}
                    onChange={(e) => setReadingAtFuel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Rate / Liter (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={ratePerLiter}
                    onChange={(e) => setRatePerLiter(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Bowser Slip No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SLIP-2026-904"
                    value={bowserSlip}
                    onChange={(e) => setBowserSlip(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedMachineForFuel(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logDieselMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {logDieselMutation.isPending ? 'Saving...' : 'Record Dispensing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Public QR Dossier Preview Modal */}
      {selectedQrMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-sm p-6 rounded-2xl border border-slate-700/80 shadow-2xl text-center font-sans">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center mx-auto mb-3 text-blue-400">
              <QrCode className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">
              Public Asset QR Dossier
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Scannable mobile sticker for field inspectors and operators.
            </p>

            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-left text-xs font-mono space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Asset Tag:</span>
                <span className="text-emerald-400 font-bold">{selectedQrMachine.internal_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Machine:</span>
                <span className="text-slate-200">{selectedQrMachine.machine_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Meter:</span>
                <span className="text-blue-400">{Number(selectedQrMachine.current_reading)} {selectedQrMachine.reading_unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="text-emerald-400 font-bold">{selectedQrMachine.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Public URL:</span>
                <span className="text-slate-400 truncate">/api/public/assets/{selectedQrMachine.internal_code}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedQrMachine(null)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Close Dossier
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
