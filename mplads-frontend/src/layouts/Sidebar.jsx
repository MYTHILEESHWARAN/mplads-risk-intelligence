import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, AlertTriangle, ClipboardList,
  BarChart3, Map, FileSearch, ShieldCheck, Settings, X, ShieldAlert,
  Users, GitBranch, FileText, FlaskConical, AlertCircle
} from 'lucide-react';

const navItems = [
  { to: '/dashboard',          label: 'Dashboard',           icon: LayoutDashboard },
  { to: '/projects',           label: 'Projects',            icon: FolderOpen },
  { to: '/mp-directory',       label: 'MP Directory',        icon: Users },
  { to: '/fund-flow',          label: 'Fund Flow',           icon: GitBranch },
  { to: '/alerts',             label: 'Risk Alerts',         icon: AlertTriangle },
  { to: '/investigations',     label: 'Investigation Queue', icon: ClipboardList },
  { to: '/analytics',          label: 'Analytics',           icon: BarChart3 },
  { to: '/risk-map',           label: 'Risk Map',            icon: Map },
  { to: '/evidence',           label: 'Evidence Review',     icon: FileSearch },
  { to: '/compliance',         label: 'Compliance',          icon: ShieldCheck },
  { to: '/reports',            label: 'Reports',             icon: FileText },
  { to: '/data-quality',       label: 'Data Quality',        icon: AlertCircle },
  { to: '/model-transparency', label: 'Model Transparency',  icon: FlaskConical },
  { to: '/settings',           label: 'Settings',            icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-[#0f1c3f] flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:static lg:translate-x-0 lg:z-auto
        `}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-500 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="text-white text-sm font-bold leading-tight">MPLADS Risk</p>
              <p className="text-blue-300 text-[10px] leading-tight">Intelligence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-white/60 hover:text-white p-1"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" role="navigation">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-100/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-[10px] text-blue-200/40 leading-relaxed">
            AI-powered anomaly and risk detection for MPLADS.
          </p>
          <p className="text-[10px] text-blue-200/30 mt-1">v2.0 · SIH 2026 · AI Avengers</p>
        </div>
      </aside>
    </>
  );
}
