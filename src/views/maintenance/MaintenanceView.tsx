import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import {
  Wrench,
  Plus,
  CalendarCheck,
  Building2,
  Clock,
  ArrowRight,
  Package,
} from 'lucide-react';

interface MachineRef {
  id: string;
  machine_name: string;
  internal_code: string;
  current_reading: string | number;
  reading_unit: string;
}

interface WorkOrderPartItem {
  id: string;
  item: {
    id: string;
    name: string;
    brand?: string;
  };
  qty_used: string | number;
  unit_cost: string | number;
  total_cost: string | number;
}

interface WorkOrderItem {
  id: string;
  firm_id: string;
  wo_number: string;
  machine_id: string;
  maintenance_type: string;
  status: string;
  priority: string;
  issue_description: string;
  root_cause?: string;
  action_taken?: string;
  assigned_technician?: string;
  labor_hours: string | number;
  labor_cost: string | number;
  parts_cost: string | number;
  total_cost: string | number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  machine: MachineRef;
  parts: WorkOrderPartItem[];
}

interface PreventiveScheduleItem {
  id: string;
  firm_id: string;
  machine_id: string;
  schedule_name: string;
  frequency_type: string;
  frequency_value: string | number;
  last_performed_meter?: string | number;
  next_due_meter?: string | number;
  checklist_items?: string;
  is_active: boolean;
  machine: MachineRef;
}

interface RepairIndentItem {
  id: string;
  firm_id: string;
  indent_no: string;
  machine_id: string;
  component_name: string;
  breakdown_summary: string;
  external_workshop_name?: string;
  estimated_cost?: string | number;
  actual_cost?: string | number;
  gate_pass_no?: string;
  status: string;
  created_at: string;
  machine: {
    id: string;
    machine_name: string;
    internal_code: string;
  };
}

export const MaintenanceView: React.FC = () => {
  const { token } = useAuth();
  const { activeFirm } = useProject();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'workOrders' | 'schedules' | 'repairs'>('workOrders');

  // Modals state
  const [isWoModalOpen, setIsWoModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
  const [selectedWoForStatus, setSelectedWoForStatus] = useState<WorkOrderItem | null>(null);
  const [selectedWoForPart, setSelectedWoForPart] = useState<WorkOrderItem | null>(null);

  // WO Form
  const [woMachineId, setWoMachineId] = useState('');
  const [woType, setWoType] = useState('PREVENTIVE');
  const [woPriority, setWoPriority] = useState('MEDIUM');
  const [woIssueDesc, setWoIssueDesc] = useState('');
  const [woTechnician, setWoTechnician] = useState('');

  // Status Form
  const [nextStatus, setNextStatus] = useState('IN_PROGRESS');
  const [rootCause, setRootCause] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [laborHours, setLaborHours] = useState('0');
  const [laborCost, setLaborCost] = useState('0');

  // Add Part Form
  const [partItemId, setPartItemId] = useState('');
  const [partQty, setPartQty] = useState('');
  const [partUnitCost, setPartUnitCost] = useState('');

  // Schedule Form
  const [schedMachineId, setSchedMachineId] = useState('');
  const [schedName, setSchedName] = useState('');
  const [frequencyType, setFrequencyType] = useState('HOURS');
  const [frequencyValue, setFrequencyValue] = useState('250');

  // Repair Form
  const [repMachineId, setRepMachineId] = useState('');
  const [repComponent, setRepComponent] = useState('');
  const [repSummary, setRepSummary] = useState('');
  const [repWorkshop, setRepWorkshop] = useState('');
  const [repEstCost, setRepEstCost] = useState('');

  // Fetch Machines for dropdowns
  const { data: machines = [] } = useQuery<MachineRef[]>({
    queryKey: ['fleetMachines', activeFirm?.id],
    queryFn: async () => {
      const res = await fetch(`/api/fleet/machines?firmId=${activeFirm?.id || ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
  });

  // Fetch Items for spare parts dropdown
  const { data: catalogItems = [] } = useQuery<{ id: string; name: string; brand?: string }[]>({
    queryKey: ['catalogItems'],
    queryFn: async () => {
      const res = await fetch('/api/inventory/items', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
  });

  // Fetch Work Orders
  const { data: workOrders = [], isLoading: isWoLoading } = useQuery<WorkOrderItem[]>({
    queryKey: ['workOrders', activeFirm?.id],
    queryFn: async () => {
      const res = await fetch(`/api/maintenance/work-orders?firmId=${activeFirm?.id || ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
  });

  // Fetch Schedules
  const { data: schedules = [], isLoading: isSchedLoading } = useQuery<PreventiveScheduleItem[]>({
    queryKey: ['preventiveSchedules', activeFirm?.id],
    queryFn: async () => {
      const res = await fetch(`/api/maintenance/schedules?firmId=${activeFirm?.id || ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
  });

  // Fetch Repair Indents
  const { data: repairs = [], isLoading: isRepLoading } = useQuery<RepairIndentItem[]>({
    queryKey: ['repairIndents', activeFirm?.id],
    queryFn: async () => {
      const res = await fetch(`/api/maintenance/repairs?firmId=${activeFirm?.id || ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
  });

  // Create WO Mutation
  const createWoMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/maintenance/work-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create work order');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      setIsWoModalOpen(false);
      setWoIssueDesc('');
      setWoTechnician('');
    },
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const res = await fetch(`/api/maintenance/work-orders/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update work order');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      setSelectedWoForStatus(null);
    },
  });

  // Add Part Mutation
  const addPartMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const res = await fetch(`/api/maintenance/work-orders/${id}/parts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to add spare part');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      setSelectedWoForPart(null);
      setPartQty('');
      setPartUnitCost('');
    },
  });

  // Create Schedule Mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/maintenance/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create schedule');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preventiveSchedules'] });
      setIsScheduleModalOpen(false);
      setSchedName('');
    },
  });

  // Create Repair Mutation
  const createRepairMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/maintenance/repairs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create repair indent');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repairIndents'] });
      setIsRepairModalOpen(false);
      setRepComponent('');
      setRepSummary('');
    },
  });

  const handleCreateWo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFirm) return alert('Select an active firm');
    createWoMutation.mutate({
      firmId: activeFirm.id,
      machineId: woMachineId,
      maintenanceType: woType,
      priority: woPriority,
      issueDescription: woIssueDesc,
      assignedTechnician: woTechnician || undefined,
    });
  };

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWoForStatus) return;
    updateStatusMutation.mutate({
      id: selectedWoForStatus.id,
      payload: {
        status: nextStatus,
        rootCause: rootCause || undefined,
        actionTaken: actionTaken || undefined,
        laborHours: parseFloat(laborHours) || 0,
        laborCost: parseFloat(laborCost) || 0,
      },
    });
  };

  const handleAddPartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWoForPart) return;
    addPartMutation.mutate({
      id: selectedWoForPart.id,
      payload: {
        itemId: partItemId,
        qtyUsed: parseFloat(partQty),
        unitCost: parseFloat(partUnitCost),
      },
    });
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFirm) return alert('Select an active firm');
    createScheduleMutation.mutate({
      firmId: activeFirm.id,
      machineId: schedMachineId,
      scheduleName: schedName,
      frequencyType,
      frequencyValue: parseFloat(frequencyValue),
    });
  };

  const handleCreateRepair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFirm) return alert('Select an active firm');
    createRepairMutation.mutate({
      firmId: activeFirm.id,
      machineId: repMachineId,
      componentName: repComponent,
      breakdownSummary: repSummary,
      externalWorkshopName: repWorkshop || undefined,
      estimatedCost: repEstCost ? parseFloat(repEstCost) : undefined,
    });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Wrench className="w-7 h-7 text-amber-400" />
            Plant Maintenance & Workshop Repairs
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Work order lifecycle, preventive service schedules, spare parts consumption, and external workshop repair indents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'workOrders' && (
            <button
              onClick={() => {
                if (machines.length > 0) setWoMachineId(machines[0].id);
                setIsWoModalOpen(true);
              }}
              className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-600/20 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Work Order</span>
            </button>
          )}

          {activeTab === 'schedules' && (
            <button
              onClick={() => {
                if (machines.length > 0) setSchedMachineId(machines[0].id);
                setIsScheduleModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Preventive Schedule</span>
            </button>
          )}

          {activeTab === 'repairs' && (
            <button
              onClick={() => {
                if (machines.length > 0) setRepMachineId(machines[0].id);
                setIsRepairModalOpen(true);
              }}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Escalate to Workshop</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('workOrders')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 cursor-pointer transition-all ${
            activeTab === 'workOrders'
              ? 'border-amber-500 text-amber-400 bg-amber-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Work Orders ({workOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('schedules')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 cursor-pointer transition-all ${
            activeTab === 'schedules'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Preventive Schedules ({schedules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('repairs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 cursor-pointer transition-all ${
            activeTab === 'repairs'
              ? 'border-purple-500 text-purple-400 bg-purple-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Workshop Repair Indents ({repairs.length})</span>
        </button>
      </div>

      {/* Tab 1: Work Orders Table */}
      {activeTab === 'workOrders' && (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">WO # & Priority</th>
                  <th className="py-3 px-4">Machine & Type</th>
                  <th className="py-3 px-4">Issue Description</th>
                  <th className="py-3 px-4">Technician & Status</th>
                  <th className="py-3 px-4">Total Cost Roll-Up</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {isWoLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                      <div className="inline-block w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-2" />
                      <div>Loading Work Orders...</div>
                    </td>
                  </tr>
                ) : workOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                      <Wrench className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                      <p className="text-base font-medium text-slate-400">No active work orders</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Create preventive maintenance or breakdown repair work orders to track technician hours and spare parts.
                      </p>
                    </td>
                  </tr>
                ) : (
                  workOrders.map((wo) => (
                    <tr key={wo.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-slate-100 font-mono text-amber-400">{wo.wo_number}</div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          wo.priority === 'EMERGENCY' ? 'bg-red-950/80 text-red-400 border border-red-800' :
                          wo.priority === 'HIGH' ? 'bg-amber-950/80 text-amber-400 border border-amber-800' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {wo.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-300">
                        <div className="font-semibold text-slate-100">{wo.machine?.machine_name}</div>
                        <div className="text-[11px] text-emerald-400 font-mono">
                          Tag: {wo.machine?.internal_code} • {wo.maintenance_type}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-sans max-w-xs truncate text-slate-300">
                        {wo.issue_description}
                        {wo.parts && wo.parts.length > 0 && (
                          <div className="text-[10px] text-blue-400 font-mono mt-0.5">
                            {wo.parts.length} spare part(s) allocated
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                          wo.status === 'COMPLETED' || wo.status === 'CLOSED'
                            ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-400'
                            : wo.status === 'IN_PROGRESS'
                            ? 'bg-blue-950/60 border border-blue-800/60 text-blue-400'
                            : 'bg-amber-950/60 border border-amber-800/60 text-amber-400'
                        }`}>
                          {wo.status}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-sans">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{wo.assigned_technician || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                        <div>₹{Number(wo.total_cost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        <div className="text-[10px] text-slate-500 font-sans">
                          Labor: ₹{Number(wo.labor_cost)} | Parts: ₹{Number(wo.parts_cost)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedWoForPart(wo);
                              if (catalogItems.length > 0) setPartItemId(catalogItems[0].id);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs cursor-pointer flex items-center gap-1"
                          >
                            <Package className="w-3 h-3 text-blue-400" />
                            <span>Add Part</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedWoForStatus(wo);
                              setNextStatus(
                                wo.status === 'OPEN' ? 'IN_PROGRESS' :
                                wo.status === 'IN_PROGRESS' ? 'COMPLETED' : 'CLOSED'
                              );
                              setLaborHours(Number(wo.labor_hours).toString());
                              setLaborCost(Number(wo.labor_cost).toString());
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/60 text-amber-300 text-xs cursor-pointer flex items-center gap-1"
                          >
                            <ArrowRight className="w-3 h-3 text-amber-400" />
                            <span>Update Status</span>
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
      )}

      {/* Tab 2: Preventive Schedules */}
      {activeTab === 'schedules' && (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Machine & Tag</th>
                  <th className="py-3 px-4">Service Schedule Name</th>
                  <th className="py-3 px-4">Frequency</th>
                  <th className="py-3 px-4">Current Meter Reading</th>
                  <th className="py-3 px-4">Next Due Reading</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {isSchedLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                      <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                      <div>Loading Preventive Schedules...</div>
                    </td>
                  </tr>
                ) : schedules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                      <CalendarCheck className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                      <p className="text-base font-medium text-slate-400">No preventive service plans configured</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Add meter-based (250h, 500h, 1000h) or calendar-based maintenance schedules.
                      </p>
                    </td>
                  </tr>
                ) : (
                  schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-slate-100">{s.machine?.machine_name}</div>
                        <div className="text-[11px] text-emerald-400 font-mono">Tag: {s.machine?.internal_code}</div>
                      </td>
                      <td className="py-3.5 px-4 font-sans font-semibold text-slate-200">
                        {s.schedule_name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-blue-400 font-bold">Every {Number(s.frequency_value)} {s.frequency_type}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {Number(s.machine?.current_reading)} {s.machine?.reading_unit}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-amber-400">
                        {s.next_due_meter ? `${Number(s.next_due_meter)} ${s.machine?.reading_unit}` : 'Calendar Based'}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs">
                          {s.is_active ? 'ACTIVE' : 'PAUSED'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Workshop Repair Indents */}
      {activeTab === 'repairs' && (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Repair Indent # & Tag</th>
                  <th className="py-3 px-4">Component & Breakdown</th>
                  <th className="py-3 px-4">External Specialized Workshop</th>
                  <th className="py-3 px-4">Gate Pass #</th>
                  <th className="py-3 px-4">Est. Cost</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {isRepLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                      <div className="inline-block w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-2" />
                      <div>Loading Workshop Repairs...</div>
                    </td>
                  </tr>
                ) : repairs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-sans">
                      <Building2 className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                      <p className="text-base font-medium text-slate-400">No external workshop repairs logged</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Escalate major machine failures (engine rebuilding, hydraulic pumps) to specialized external workshops.
                      </p>
                    </td>
                  </tr>
                ) : (
                  repairs.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-purple-400 font-mono">{r.indent_no}</div>
                        <div className="text-[11px] text-emerald-400 font-mono">Tag: {r.machine?.internal_code}</div>
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-200">
                        <div className="font-bold text-slate-100">{r.component_name}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{r.breakdown_summary}</div>
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-300">
                        {r.external_workshop_name || 'Standard Workshop'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {r.gate_pass_no || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-100">
                        ₹{Number(r.estimated_cost || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded-md bg-purple-950/60 border border-purple-800/60 text-purple-400 text-xs font-semibold">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Work Order */}
      {isWoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-700/80 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-400" />
              Create Maintenance Work Order
            </h2>
            <p className="text-xs text-slate-400 mb-4 font-sans">
              Firm: <strong>{activeFirm?.firm_name}</strong>.
            </p>

            <form onSubmit={handleCreateWo} className="space-y-4 font-sans">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Select Equipment / Machine *
                </label>
                <select
                  required
                  value={woMachineId}
                  onChange={(e) => setWoMachineId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.machine_name} ({m.internal_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Maintenance Type
                  </label>
                  <select
                    value={woType}
                    onChange={(e) => setWoType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                  >
                    <option value="PREVENTIVE">Preventive Maintenance</option>
                    <option value="BREAKDOWN">Breakdown Repair</option>
                    <option value="OVERHAUL">Component Overhaul</option>
                    <option value="SCHEDULED">Scheduled Inspection</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={woPriority}
                    onChange={(e) => setWoPriority(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="EMERGENCY">Emergency (Site Halt)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Issue Description & Fault Symptoms *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Engine overheating after 2 hours of continuous excavation. High oil consumption observed."
                  value={woIssueDesc}
                  onChange={(e) => setWoIssueDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Assigned Maintenance Technician
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar (Lead Mechanic)"
                  value={woTechnician}
                  onChange={(e) => setWoTechnician(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsWoModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createWoMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {createWoMutation.isPending ? 'Generating...' : 'Create Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Work Order Status */}
      {selectedWoForStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700/80 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-amber-400" />
              Update Work Order Status
            </h2>
            <p className="text-xs text-slate-400 mb-4 font-sans">
              WO: <strong className="font-mono text-amber-400">{selectedWoForStatus.wo_number}</strong> ({selectedWoForStatus.machine?.machine_name}).
            </p>

            <form onSubmit={handleStatusSubmit} className="space-y-4 font-sans">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Lifecycle Status *
                </label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-semibold text-amber-400"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="PENDING_PARTS">PENDING_PARTS</option>
                  <option value="COMPLETED">COMPLETED (Ready for Testing)</option>
                  <option value="CLOSED">CLOSED (Restored to Fleet)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Labor Hours Logged
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={laborHours}
                    onChange={(e) => setLaborHours(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Labor Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="10"
                    value={laborCost}
                    onChange={(e) => setLaborCost(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Root Cause Diagnosis
                </label>
                <input
                  type="text"
                  placeholder="e.g. Clogged radiator fins and faulty thermostat"
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Action Taken / Resolution
                </label>
                <input
                  type="text"
                  placeholder="e.g. High-pressure radiator flushed; new thermostat valve installed"
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedWoForStatus(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateStatusMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {updateStatusMutation.isPending ? 'Updating...' : 'Save Lifecycle Transition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Spare Part */}
      {selectedWoForPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700/80 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" />
              Consume Spare Part from Store
            </h2>
            <p className="text-xs text-slate-400 mb-4 font-sans">
              WO: <strong className="font-mono text-amber-400">{selectedWoForPart.wo_number}</strong>.
            </p>

            <form onSubmit={handleAddPartSubmit} className="space-y-4 font-sans">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Spare Part / Inventory Item *
                </label>
                <select
                  required
                  value={partItemId}
                  onChange={(e) => setPartItemId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                >
                  {catalogItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} {item.brand ? `(${item.brand})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Quantity Used *
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    placeholder="e.g. 2"
                    value={partQty}
                    onChange={(e) => setPartQty(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-mono font-bold text-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Unit Cost (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 1450.00"
                    value={partUnitCost}
                    onChange={(e) => setPartUnitCost(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedWoForPart(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addPartMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {addPartMutation.isPending ? 'Allocating...' : 'Allocate Part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Preventive Schedule */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700/80 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-blue-400" />
              Configure Preventive Service Schedule
            </h2>
            <p className="text-xs text-slate-400 mb-4 font-sans">
              Firm: <strong>{activeFirm?.firm_name}</strong>.
            </p>

            <form onSubmit={handleCreateSchedule} className="space-y-4 font-sans">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Machine / Asset *
                </label>
                <select
                  required
                  value={schedMachineId}
                  onChange={(e) => setSchedMachineId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.machine_name} ({m.internal_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Schedule Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 250-Hour Engine Oil & Filter Service"
                  value={schedName}
                  onChange={(e) => setSchedName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Trigger Unit
                  </label>
                  <select
                    value={frequencyType}
                    onChange={(e) => setFrequencyType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                  >
                    <option value="HOURS">Operational Hours</option>
                    <option value="DAYS">Calendar Days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Frequency Value *
                  </label>
                  <input
                    type="number"
                    required
                    value={frequencyValue}
                    onChange={(e) => setFrequencyValue(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-mono font-bold text-blue-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createScheduleMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {createScheduleMutation.isPending ? 'Saving...' : 'Add Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Repair Indent */}
      {isRepairModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700/80 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" />
              Escalate to External Workshop
            </h2>
            <p className="text-xs text-slate-400 mb-4 font-sans">
              Firm: <strong>{activeFirm?.firm_name}</strong>.
            </p>

            <form onSubmit={handleCreateRepair} className="space-y-4 font-sans">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Machine / Asset *
                </label>
                <select
                  required
                  value={repMachineId}
                  onChange={(e) => setRepMachineId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.machine_name} ({m.internal_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Component / Sub-Assembly *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Hydraulic Pump / Swing Motor"
                  value={repComponent}
                  onChange={(e) => setRepComponent(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Breakdown Summary & Failure Diagnosis *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Internal cylinder piston scored; excessive oil leakage and loss of hydraulic pressure"
                  value={repSummary}
                  onChange={(e) => setRepSummary(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Specialized Workshop Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Precision Hydraulics Works"
                    value={repWorkshop}
                    onChange={(e) => setRepWorkshop(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Estimated Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="100"
                    placeholder="e.g. 45000"
                    value={repEstCost}
                    onChange={(e) => setRepEstCost(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-mono font-bold text-purple-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRepairModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRepairMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {createRepairMutation.isPending ? 'Generating...' : 'Dispatch to Workshop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
