import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../context/ProjectContext';
import {
  ClipboardCheck,
  CheckSquare,
  FileText,
  Wallet,
  Users,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
} from 'lucide-react';

interface ChecklistTemplateItem {
  id: string;
  firm_id: string;
  title: string;
  category: string;
  frequency: string;
  items_json: string;
  is_active: boolean;
}

interface ChecklistExecutionItem {
  id: string;
  firm_id: string;
  template_id: string;
  performed_by: string;
  status: string;
  performed_at: string;
  template?: {
    title: string;
  };
}

interface TaskItem {
  id: string;
  firm_id: string;
  title: string;
  description?: string;
  assigned_to: string;
  assigned_by: string;
  due_date: string;
  priority: string;
  status: string;
  supervisor_signoff?: string;
}

interface DocumentItem {
  id: string;
  firm_id: string;
  title: string;
  document_type: string;
  document_no: string;
  issuing_authority?: string;
  expiry_date?: string;
  status: string;
}

interface PettyCashItem {
  id: string;
  firm_id: string;
  voucher_no: string;
  voucher_date: string;
  transaction_type: string;
  category: string;
  amount: string | number;
  balance_after: string | number;
  payee_name: string;
  approved_by?: string;
}

interface EmployeeItem {
  id: string;
  firm_id: string;
  emp_code: string;
  full_name: string;
  department: string;
  designation: string;
}

interface AttendanceItem {
  id: string;
  employee_id: string;
  punch_date: string;
  punch_type: string;
  punch_mode: string;
  status: string;
  employee?: {
    full_name: string;
    emp_code: string;
  };
}

export const OperationsView: React.FC = () => {
  const { token } = useAuth();
  const { activeFirm } = useProject();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'checklists' | 'tasks' | 'documents' | 'pettyCash' | 'hr'>('checklists');

  // Modals
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isPettyModalOpen, setIsPettyModalOpen] = useState(false);
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);

  // Forms
  const [chkTitle, setChkTitle] = useState('');
  const [chkCategory, setChkCategory] = useState('SAFETY_AUDIT');
  const [chkFrequency, setChkFrequency] = useState('DAILY');

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');

  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('STATUTORY');
  const [docNo, setDocNo] = useState('');
  const [docExpiry, setDocExpiry] = useState('');

  const [pcType, setPcType] = useState('CREDIT_TOPUP');
  const [pcCategory, setPcCategory] = useState('SITE_EMERGENCY');
  const [pcAmount, setPcAmount] = useState('');
  const [pcPayee, setPcPayee] = useState('');

  const [empCode, setEmpCode] = useState('');
  const [empName, setEmpName] = useState('');
  const [empDept, setEmpDept] = useState('Engineering');
  const [empDesig, setEmpDesig] = useState('Site Engineer');

  // Queries
  const { data: templates = [], isLoading: isTplLoading } = useQuery<ChecklistTemplateItem[]>({
    queryKey: ['checklistTemplates', activeFirm?.id],
    queryFn: async () => {
      const res = await fetch(`/api/operations/checklists/templates?firmId=${activeFirm?.id || ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
  });

  const { data: executions = [] } = useQuery<ChecklistExecutionItem[]>({
    queryKey: ['checklistExecutions', activeFirm?.id],
    queryFn: async () => {
      const res = await fetch(`/api/operations/checklists/executions?firmId=${activeFirm?.id || ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
  });

  const { data: tasks = [], isLoading: isTaskLoading } = useQuery<TaskItem[]>({
    queryKey: ['tasks', activeFirm?.id],
    queryFn: async () => {
      const res = await fetch(`/api/operations/tasks?firmId=${activeFirm?.id || ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
  });

  const { data: documents = [], isLoading: isDocLoading } = useQuery<DocumentItem[]>({
    queryKey: ['documents', activeFirm?.id],
    queryFn: async () => {
      const res = await fetch(`/api/operations/documents?firmId=${activeFirm?.id || ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
  });

  const { data: pettyCashList = [], isLoading: isPettyLoading } = useQuery<PettyCashItem[]>({
    queryKey: ['pettyCash', activeFirm?.id],
    queryFn: async () => {
      const res = await fetch(`/api/operations/petty-cash?firmId=${activeFirm?.id || ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
  });

  const { data: employees = [], isLoading: isEmpLoading } = useQuery<EmployeeItem[]>({
    queryKey: ['employees', activeFirm?.id],
    queryFn: async () => {
      const res = await fetch(`/api/operations/employees?firmId=${activeFirm?.id || ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
  });

  const { data: attendance = [] } = useQuery<AttendanceItem[]>({
    queryKey: ['attendance', activeFirm?.id],
    queryFn: async () => {
      const res = await fetch(`/api/operations/attendance?firmId=${activeFirm?.id || ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.success ? data.data : [];
    },
    enabled: !!token,
  });

  // Mutations
  const createTplMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/operations/checklists/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create template');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplates'] });
      setIsChecklistModalOpen(false);
      setChkTitle('');
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/operations/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create task');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsTaskModalOpen(false);
      setTaskTitle('');
      setTaskAssignee('');
    },
  });

  const createDocMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/operations/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to register document');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setIsDocModalOpen(false);
      setDocTitle('');
      setDocNo('');
    },
  });

  const createPettyMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/operations/petty-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to record transaction');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pettyCash'] });
      setIsPettyModalOpen(false);
      setPcAmount('');
      setPcPayee('');
    },
    onError: (err: Error) => {
      alert(err.message);
    },
  });

  const createEmpMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/operations/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to register employee');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsEmpModalOpen(false);
      setEmpCode('');
      setEmpName('');
    },
  });

  const punchAttendanceMutation = useMutation({
    mutationFn: async (empId: string) => {
      const res = await fetch('/api/operations/attendance/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          firmId: activeFirm?.id,
          employeeId: empId,
          punchType: 'IN',
          punchMode: 'KIOSK_FACE',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to punch attendance');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      alert('Attendance punch recorded successfully!');
    },
  });

  const currentPettyBalance = pettyCashList.length > 0 ? Number(pettyCashList[0].balance_after) : 0;

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ClipboardCheck className="w-7 h-7 text-indigo-400" />
            Checklists, Delegation, Documents & Supporting Operations
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Operational safety audits, task delegations, corporate statutory registers, petty cash ledger, and HR attendance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'checklists' && (
            <button
              onClick={() => setIsChecklistModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Checklist Template</span>
            </button>
          )}

          {activeTab === 'tasks' && (
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Delegate Task</span>
            </button>
          )}

          {activeTab === 'documents' && (
            <button
              onClick={() => setIsDocModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Register Document</span>
            </button>
          )}

          {activeTab === 'pettyCash' && (
            <button
              onClick={() => setIsPettyModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-600/20 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Voucher Entry</span>
            </button>
          )}

          {activeTab === 'hr' && (
            <button
              onClick={() => setIsEmpModalOpen(true)}
              className="bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-teal-600/20 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('checklists')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 cursor-pointer transition-all ${
            activeTab === 'checklists'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>Operational Checklists ({templates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 cursor-pointer transition-all ${
            activeTab === 'tasks'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Task Delegation ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 cursor-pointer transition-all ${
            activeTab === 'documents'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Corporate Documents ({documents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pettyCash')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 cursor-pointer transition-all ${
            activeTab === 'pettyCash'
              ? 'border-amber-500 text-amber-400 bg-amber-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Petty Cash Accounting</span>
        </button>

        <button
          onClick={() => setActiveTab('hr')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 cursor-pointer transition-all ${
            activeTab === 'hr'
              ? 'border-teal-500 text-teal-400 bg-teal-500/10 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>HR & Attendance ({employees.length})</span>
        </button>
      </div>

      {/* Tab 1: Checklists */}
      {activeTab === 'checklists' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isTplLoading ? (
              <div className="col-span-3 text-center py-8 text-slate-500">Loading Checklist Templates...</div>
            ) : templates.length === 0 ? (
              <div className="col-span-3 text-center py-8 text-slate-500 font-sans">
                <ClipboardCheck className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p>No checklist templates configured</p>
              </div>
            ) : (
              templates.map((tpl) => (
                <div key={tpl.id} className="glass-panel p-5 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800 text-indigo-400 font-mono">
                      {tpl.category}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">{tpl.frequency}</span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{tpl.title}</h3>
                  <div className="text-xs text-slate-400 mb-4">
                    Active digital inspection format with GPS and photo upload.
                  </div>
                  <button
                    onClick={() => alert(`Starting inspection audit: ${tpl.title}`)}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Conduct Inspection
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
            <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-800 text-xs font-bold text-slate-300 uppercase tracking-wider">
              Recent Inspection Executions
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/40 text-xs uppercase text-slate-500 font-mono">
                  <tr>
                    <th className="py-2.5 px-4">Audit Template</th>
                    <th className="py-2.5 px-4">Inspector</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {executions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500 font-sans">
                        No inspection executions recorded yet
                      </td>
                    </tr>
                  ) : (
                    executions.map((e) => (
                      <tr key={e.id}>
                        <td className="py-2.5 px-4 text-slate-200 font-sans">{e.template?.title || 'Safety Check'}</td>
                        <td className="py-2.5 px-4 text-slate-400">{e.performed_by}</td>
                        <td className="py-2.5 px-4">
                          <span className="text-emerald-400 font-bold">{e.status}</span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">{new Date(e.performed_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Task Delegation */}
      {activeTab === 'tasks' && (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Task & Priority</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {isTaskLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">Loading Tasks...</td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">No tasks delegated</td>
                  </tr>
                ) : (
                  tasks.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-slate-100">{t.title}</div>
                        <span className="text-[10px] font-bold text-amber-400 font-mono">{t.priority}</span>
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-300">{t.assigned_to}</td>
                      <td className="py-3.5 px-4 flex items-center gap-1.5 text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{new Date(t.due_date).toLocaleDateString()}</span>
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          t.status === 'COMPLETED' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-sans">
                        {t.status !== 'COMPLETED' && (
                          <button
                            onClick={() => alert(`Marking task ${t.title} as completed`)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-400 text-xs cursor-pointer"
                          >
                            Sign-Off
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
      )}

      {/* Tab 3: Corporate Documents */}
      {activeTab === 'documents' && (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Document Title & Type</th>
                  <th className="py-3 px-4">Registration #</th>
                  <th className="py-3 px-4">Authority</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {isDocLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">Loading Documents...</td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">No statutory documents registered</td>
                  </tr>
                ) : (
                  documents.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-slate-100">{d.title}</div>
                        <span className="text-[10px] text-emerald-400 font-mono">{d.document_type}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-200">{d.document_no}</td>
                      <td className="py-3.5 px-4 font-sans text-slate-400">{d.issuing_authority || 'Statutory Authority'}</td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {d.expiry_date ? new Date(d.expiry_date).toLocaleDateString() : 'Perpetual'}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded text-xs bg-emerald-950/60 border border-emerald-800 text-emerald-400">
                          {d.status}
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

      {/* Tab 4: Petty Cash Accounting */}
      {activeTab === 'pettyCash' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-slate-900/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-xs uppercase font-bold text-slate-500 tracking-wider font-mono">Running Double-Entry Cash Balance</div>
              <div className="text-3xl font-extrabold text-amber-400 mt-1 font-mono">
                ₹{currentPettyBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Firm: <strong>{activeFirm?.firm_name}</strong>. Site emergency cash and local purchases.
              </p>
            </div>
            <button
              onClick={() => setIsPettyModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-600/20 cursor-pointer self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Record Cash Voucher</span>
            </button>
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Voucher # & Date</th>
                    <th className="py-3 px-4">Type & Category</th>
                    <th className="py-3 px-4">Payee / Approver</th>
                    <th className="py-3 px-4">Amount (₹)</th>
                    <th className="py-3 px-4 text-right">Balance After (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {isPettyLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">Loading Petty Cash...</td>
                    </tr>
                  ) : pettyCashList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">No petty cash vouchers recorded</td>
                    </tr>
                  ) : (
                    pettyCashList.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-100">{p.voucher_no}</div>
                          <div className="text-[10px] text-slate-500">{new Date(p.voucher_date).toLocaleDateString()}</div>
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                            p.transaction_type === 'CREDIT_TOPUP'
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                              : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                          }`}>
                            {p.transaction_type === 'CREDIT_TOPUP' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {p.transaction_type === 'CREDIT_TOPUP' ? 'CREDIT TOP-UP' : 'EXPENSE'}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">{p.category}</div>
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-300">
                          <div>{p.payee_name}</div>
                          <div className="text-[10px] text-slate-500">Appr: {p.approved_by || 'Supervisor'}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-100">
                          ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-amber-400">
                          ₹{Number(p.balance_after).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: HR & Attendance */}
      {activeTab === 'hr' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Employee Directory */}
          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
            <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-800 text-xs font-bold text-slate-300 uppercase tracking-wider flex justify-between items-center">
              <span>Employee Directory</span>
              <button
                onClick={() => setIsEmpModalOpen(true)}
                className="text-teal-400 hover:text-teal-300 text-xs font-semibold cursor-pointer flex items-center gap-1 font-sans"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>
            <div className="divide-y divide-slate-800/60">
              {isEmpLoading ? (
                <div className="p-4 text-center text-slate-500">Loading Employees...</div>
              ) : employees.length === 0 ? (
                <div className="p-6 text-center text-slate-500">No employees registered</div>
              ) : (
                employees.map((e) => (
                  <div key={e.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30">
                    <div>
                      <div className="font-bold text-slate-100">{e.full_name}</div>
                      <div className="text-xs text-teal-400 font-mono">{e.emp_code} • {e.designation}</div>
                    </div>
                    <button
                      onClick={() => punchAttendanceMutation.mutate(e.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-teal-950/60 hover:bg-teal-900/60 border border-teal-800/60 text-teal-300 text-xs cursor-pointer font-sans"
                    >
                      Face Punch In
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Attendance Log */}
          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800/80">
            <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-800 text-xs font-bold text-slate-300 uppercase tracking-wider">
              Today's Kiosk & Geo Punches
            </div>
            <div className="divide-y divide-slate-800/60">
              {attendance.length === 0 ? (
                <div className="p-6 text-center text-slate-500">No attendance punches recorded today</div>
              ) : (
                attendance.map((a) => (
                  <div key={a.id} className="p-3.5 flex items-center justify-between hover:bg-slate-800/30 font-mono text-xs">
                    <div>
                      <div className="font-bold text-slate-200 font-sans">{a.employee?.full_name}</div>
                      <div className="text-slate-500">{a.punch_mode} • {a.status}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400 font-bold">
                      {a.punch_type} PUNCH
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Checklist Template */}
      {isChecklistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700/80 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-3">Create Checklist Template</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createTplMutation.mutate({
                  firmId: activeFirm?.id,
                  title: chkTitle,
                  category: chkCategory,
                  frequency: chkFrequency,
                  itemsJson: JSON.stringify([
                    { task: 'Inspect engine oil level and coolant', required: true },
                    { task: 'Check hydraulic hose integrity and leaks', required: true },
                    { task: 'Confirm fire extinguisher pressure tag', required: true },
                  ]),
                });
              }}
              className="space-y-4 font-sans"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pre-Shift Mobile Crane Inspection"
                  value={chkTitle}
                  onChange={(e) => setChkTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={chkCategory}
                    onChange={(e) => setChkCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                  >
                    <option value="EQUIPMENT_PRE_SHIFT">Equipment Pre-Shift</option>
                    <option value="SAFETY_AUDIT">Safety Audit</option>
                    <option value="SITE_INSPECTION">Site Inspection</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Frequency</label>
                  <select
                    value={chkFrequency}
                    onChange={(e) => setChkFrequency(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="SHIFT_BASED">Shift Based</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsChecklistModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTplMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-4 py-2 rounded-xl cursor-pointer"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Task Delegation */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700/80 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-3">Delegate Operational Task</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createTaskMutation.mutate({
                  firmId: activeFirm?.id,
                  title: taskTitle,
                  description: taskDesc,
                  assignedTo: taskAssignee,
                  dueDate: taskDueDate,
                  priority: taskPriority,
                });
              }}
              className="space-y-4 font-sans"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Concrete slump test for Pier 3 footing"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Action Plan</label>
                <textarea
                  rows={2}
                  placeholder="Detailed specifications or location coordinates"
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned To *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikas Sharma"
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Due Date *</label>
                <input
                  type="date"
                  required
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2 rounded-xl cursor-pointer"
                >
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Document Register */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700/80 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-3">Register Statutory Document</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createDocMutation.mutate({
                  firmId: activeFirm?.id,
                  title: docTitle,
                  documentType: docType,
                  documentNo: docNo,
                  expiryDate: docExpiry || undefined,
                });
              }}
              className="space-y-4 font-sans"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. State Environmental Clearance Certificate"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                  >
                    <option value="STATUTORY">Statutory</option>
                    <option value="ENVIRONMENTAL">Environmental</option>
                    <option value="CLEARANCE">Clearance</option>
                    <option value="VEHICLE_RC">Vehicle RC</option>
                    <option value="INSURANCE">Insurance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Registration # *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. REG-2026-99"
                    value={docNo}
                    onChange={(e) => setDocNo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={docExpiry}
                  onChange={(e) => setDocExpiry(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDocMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-4 py-2 rounded-xl cursor-pointer"
                >
                  Register Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Petty Cash Voucher */}
      {isPettyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700/80 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-3">Record Petty Cash Voucher</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createPettyMutation.mutate({
                  firmId: activeFirm?.id,
                  transactionType: pcType,
                  category: pcCategory,
                  amount: parseFloat(pcAmount),
                  payeeName: pcPayee,
                });
              }}
              className="space-y-4 font-sans"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Voucher Type</label>
                  <select
                    value={pcType}
                    onChange={(e) => setPcType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-bold"
                  >
                    <option value="CREDIT_TOPUP">Credit Top-Up</option>
                    <option value="DEBIT_EXPENSE">Debit Expense</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Expense Category</label>
                  <select
                    value={pcCategory}
                    onChange={(e) => setPcCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                  >
                    <option value="SITE_EMERGENCY">Site Emergency</option>
                    <option value="DIESEL_LOCAL">Local Diesel Top-up</option>
                    <option value="CONSUMABLES">Consumables & Hardware</option>
                    <option value="TRANSPORT">Transit & Auto Freight</option>
                    <option value="MISC">Misc</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    required
                    placeholder="e.g. 5000"
                    value={pcAmount}
                    onChange={(e) => setPcAmount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-mono font-bold text-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Payee / Recipient *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suresh (Electrician)"
                    value={pcPayee}
                    onChange={(e) => setPcPayee(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPettyModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPettyMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm px-4 py-2 rounded-xl cursor-pointer"
                >
                  Post Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Employee */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700/80 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-3">Register Employee</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createEmpMutation.mutate({
                  firmId: activeFirm?.id,
                  empCode,
                  fullName: empName,
                  department: empDept,
                  designation: empDesig,
                });
              }}
              className="space-y-4 font-sans"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Employee ID / Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP-101"
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100 font-mono text-teal-400 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sunil Verma"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                  <input
                    type="text"
                    value={empDept}
                    onChange={(e) => setEmpDept(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Designation</label>
                  <input
                    type="text"
                    value={empDesig}
                    onChange={(e) => setEmpDesig(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEmpModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEmpMutation.isPending}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm px-4 py-2 rounded-xl cursor-pointer"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
