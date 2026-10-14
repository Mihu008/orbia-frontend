import { useProject, FirmItem } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { Building2, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';

export const TopNavbar: React.FC = () => {
  const { activeFirm, firms, setActiveFirmId } = useProject();
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand logo & platform title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
          O
        </div>
        <div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            ORBIA ERP
          </span>
          <span className="text-[10px] uppercase tracking-wider text-blue-400 ml-2 font-mono px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/40">
            Enterprise
          </span>
        </div>
      </div>

      {/* Center: Multi-Firm Tenancy Selector */}
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-400 font-medium">Operating Firm:</span>
        <div className="relative">
          <select
            value={activeFirm?.id || ''}
            onChange={(e) => setActiveFirmId(e.target.value)}
            className="bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-sm font-semibold py-1.5 pl-3 pr-8 rounded-lg border border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer transition-colors"
          >
            {firms.map((firm: FirmItem) => (
              <option key={firm.id} value={firm.id} className="bg-slate-900 text-slate-100">
                {firm.firm_name} {firm.gstin ? `(${firm.gstin})` : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Right: User Profile & Actions */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="text-left hidden md:block">
            <div className="text-sm font-medium text-slate-200">{user?.username}</div>
            <div className="text-[11px] text-blue-400 font-mono">{user?.role}</div>
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign Out"
          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/40 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
