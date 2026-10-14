import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  ClipboardList,
  FolderTree,
  BarChart3,
  FileSpreadsheet,
  Cpu,
  Wrench,
  ClipboardCheck,
} from 'lucide-react';

interface SidebarProps {
  collapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const navItems = [
    { name: 'Stock Ledger', path: '/inventory', icon: Boxes },
    { name: 'Store In (Intake)', path: '/store/intake', icon: ArrowDownToLine },
    { name: 'Store Issue (Out)', path: '/store/issue', icon: ArrowUpFromLine },
    { name: 'Procurement (Bids & POs)', path: '/procurement', icon: FileSpreadsheet },
    { name: 'Equipment & Fleet', path: '/fleet', icon: Cpu },
    { name: 'Plant Maintenance', path: '/maintenance', icon: Wrench },
    { name: 'Operations & HR', path: '/operations', icon: ClipboardCheck },
    { name: 'Stock Transfers', path: '/inventory/transfers', icon: ArrowLeftRight },
    { name: 'Master Catalog', path: '/inventory/masters', icon: FolderTree },
    { name: 'Stock Audits', path: '/inventory/audits', icon: ClipboardList },
    { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2 font-mono">
            Inventory & Store MVP
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="p-4 border-t border-slate-800/60">
        <div className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-500">Storage Engine:</span>
            <span className="text-emerald-400 font-semibold">Cloudflare R2</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Database:</span>
            <span className="text-blue-400 font-semibold">Supabase PG</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
