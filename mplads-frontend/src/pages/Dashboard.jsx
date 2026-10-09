import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  FolderOpen, Activity, AlertTriangle, Bell,
  IndianRupee, TrendingUp, ArrowRight, RefreshCw
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts';
import StatCard from '../components/ui/StatCard';
import RiskBadge from '../components/ui/RiskBadge';
import RiskScore from '../components/ui/RiskScore';
import ChartCard from '../components/ui/ChartCard';
import LoadingState from '../components/ui/LoadingState';
import PageHeader from '../components/ui/PageHeader';
import { fetchDashboard } from '../services/api';
import { formatCurrency, getStatusColor } from '../utils/formatters';

const RISK_COLORS = { LOW: '#22c55e', MEDIUM: '#eab308', HIGH: '#f97316', CRITICAL: '#ef4444' };
const PIE_COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444'];

// ── Count-up animation hook ──────────────────────────────────────
function useCountUp(target, duration = 800) {
  const [value, setValue] = React.useState(0);
  React.useEffect(() => {
    if (target == null || isNaN(target)) return;
    const start = Date.now();
    const startVal = 0;
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(startVal + (target - startVal) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

function CustomTooltip({ active, payload }) {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
        <p className="font-semibold text-gray-800">{payload[0].name}</p>
        {payload.map((p) => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.name}: {typeof p.value === 'number' && p.value > 10000 ? formatCurrency(p.value) : `${p.value}%`}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { addToast } = useOutletContext() || {};
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const d = await fetchDashboard();
      setData(d);
    } catch {
      addToast?.('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch whenever the user navigates to the dashboard (useLocation changes)
  // This ensures counts are fresh after creating projects on the Projects page.
  useEffect(() => { load(); }, [location.pathname]);

  // Also respond to a global 'dashboard:refresh' custom event fired by other pages
  useEffect(() => {
    const handler = () => load();
    window.addEventListener('dashboard:refresh', handler);
    return () => window.removeEventListener('dashboard:refresh', handler);
  }, []);

  // ── Count-up animated values ───────────────────────────────────
  const animTotalProjects  = useCountUp(data?.total_projects);
  const animActiveProjects = useCountUp(data?.active_projects);
  const animHighRisk       = useCountUp(data?.high_risk_projects);
  const animCriticalAlerts = useCountUp(data?.critical_alerts);

  if (loading) return <LoadingState message="Loading dashboard…" />;
  if (!data) return null;

  const riskPieData = Object.entries(data.risk_distribution).map(([name, value]) => ({ name, value }));
  const progressData = data.financial_vs_physical || [];

  return (
    <div className="space-y-6">
      {/* Dataset provenance chip */}
      {data && (
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 border border-purple-200 text-purple-700">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" aria-hidden="true" />
            Dataset: Synthetic demo · {data.total_projects} projects · All data fictional
          </span>
          <span className="text-xs text-gray-400 hidden sm:block">
            AI recommends, humans decide — scores are risk indicators, not findings of wrongdoing
          </span>
        </div>
      )}

      <PageHeader
        title="Command Dashboard"
        subtitle="Real-time overview of MPLADS project risk and compliance"
        actions={
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
            aria-label="Refresh dashboard"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Projects"
          value={animTotalProjects}
          icon={FolderOpen}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          description="across all constituencies"
        />
        <StatCard
          title="Active Projects"
          value={animActiveProjects}
          icon={Activity}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
          description="currently in progress"
        />
        <StatCard
          title="High Risk Projects"
          value={animHighRisk}
          icon={AlertTriangle}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
          accent="border-orange-400"
          description="require attention"
        />
        <StatCard
          title="Critical Alerts"
          value={animCriticalAlerts}
          icon={Bell}
          iconColor="text-red-600"
          iconBg="bg-red-50"
          accent="border-red-400"
          description="pending review"
        />
        <StatCard
          title="Total Sanctioned"
          value={formatCurrency(data.total_sanctioned_amount)}
          icon={IndianRupee}
          iconColor="text-green-600"
          iconBg="bg-green-50"
          description="total allocation"
        />
        <StatCard
          title="Total Expenditure"
          value={formatCurrency(data.total_expenditure)}
          icon={TrendingUp}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
          description={`${Math.round((data.total_expenditure / data.total_sanctioned_amount) * 100)}% of sanctioned`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Pie */}
        <ChartCard title="Risk Distribution" subtitle="Projects by risk level">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={riskPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {riskPieData.map((entry, i) => (
                    <Cell key={entry.name} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val, name) => [val, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 shrink-0">
              {riskPieData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} aria-hidden="true" />
                  <span className="text-xs text-gray-600 w-16">{entry.name}</span>
                  <span className="text-xs font-bold text-gray-900">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        {/* Alert Trends */}
        <ChartCard title="Monthly Alert Trends" subtitle="Alerts generated per month">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.monthly_alert_trends} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="alerts" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Alerts" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Financial vs Physical Progress */}
      <ChartCard
        title="Financial vs Physical Progress"
        subtitle="Gap between financial expenditure and actual physical completion — wider gap = higher risk"
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={progressData} barGap={2} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
            <Tooltip formatter={(val) => `${val}%`} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="financial" fill="#3b82f6" name="Financial Progress %" radius={[3, 3, 0, 0]} />
            <Bar dataKey="physical" fill="#22c55e" name="Physical Progress %" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Top High-Risk Projects Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Top High-Risk Projects</h3>
            <p className="text-xs text-gray-500 mt-0.5">Projects flagged by AI risk engine — recommended for review</p>
          </div>
          <button
            onClick={() => navigate('/projects?sort=risk_desc')}
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="High-risk projects">
            <thead>
              <tr className="bg-gray-50">
                {['Project ID', 'Project Name', 'District', 'Sanctioned', 'Expenditure', 'Physical %', 'Risk Score', 'Risk Level', 'Confidence', 'Primary Reason', 'Action'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.top_risk_projects.slice(0, 8).map((p) => (
                <tr key={p.project_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-blue-600 whitespace-nowrap">{p.project_id}</td>
                  <td className="px-4 py-3 text-xs text-gray-800 max-w-[180px] truncate" title={p.project_name}>{p.project_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{p.district}</td>
                  <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{formatCurrency(p.sanction_amount)}</td>
                  <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{formatCurrency(p.actual_expenditure)}</td>
                  <td className="px-4 py-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 bg-gray-200 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${p.physical_progress}%` }} />
                      </div>
                      <span className="text-gray-700">{p.physical_progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <RiskScore score={p.risk_score} showBar={false} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge level={p.risk_level} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {p.confidence != null ? `${p.confidence}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate" title={p.primary_reason}>{p.primary_reason}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/projects/${p.project_id}`)}
                      className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Investigate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
