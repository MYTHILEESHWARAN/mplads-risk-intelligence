import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter
} from 'recharts';
import ChartCard from '../components/ui/ChartCard';
import LoadingState from '../components/ui/LoadingState';
import PageHeader from '../components/ui/PageHeader';
import { fetchAnalytics } from '../services/api';

const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444'];

function formatLakh(val) {
  return `₹${(val / 100000).toFixed(0)}L`;
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('6m');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const d = await fetchAnalytics({ range: dateRange });
      setData(d);
      setLoading(false);
    }
    load();
  }, [dateRange]);

  if (loading) return <LoadingState message="Loading analytics…" />;
  if (!data) return null;

  const agencyRiskData = data.agency_risk.sort((a, b) => b.risk_score - a.risk_score);
  const riskDistData = data.risk_distribution
    ? Object.entries(data.risk_distribution).map(([name, value]) => ({ name, value }))
    : [{ name: 'LOW', value: 12 }, { name: 'MEDIUM', value: 3 }, { name: 'HIGH', value: 4 }, { name: 'CRITICAL', value: 3 }];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="In-depth risk and performance analytics across MPLADS projects"
        actions={
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {['3m', '6m', '1y'].map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${dateRange === r ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                aria-pressed={dateRange === r}
              >
                {r}
              </button>
            ))}
          </div>
        }
      />

      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* District Risk */}
        <ChartCard title="District-wise Risk Distribution" subtitle="High-risk projects per district">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.district_risk} barSize={18} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="district" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="high_risk" fill="#ef4444" name="High Risk" radius={[0, 3, 3, 0]} />
              <Bar dataKey="medium_risk" fill="#f97316" name="Medium Risk" radius={[0, 3, 3, 0]} />
              <Bar dataKey="low_risk" fill="#22c55e" name="Low Risk" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Agency Risk */}
        <ChartCard title="Agency-wise Risk Score" subtitle="Average risk score per implementing agency">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={agencyRiskData} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="agency" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={50} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [`${v}/100`, 'Risk Score']} />
              <Bar dataKey="risk_score" radius={[4, 4, 0, 0]} name="Risk Score">
                {agencyRiskData.map((entry, i) => (
                  <Cell key={i} fill={entry.risk_score > 80 ? '#ef4444' : entry.risk_score > 60 ? '#f97316' : entry.risk_score > 30 ? '#eab308' : '#22c55e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Expenditure */}
        <ChartCard title="Monthly Expenditure" subtitle="Planned vs Actual expenditure (₹ Lakhs)">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.monthly_expenditure}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatLakh} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [formatLakh(v)]} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="planned" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Planned" />
              <Line type="monotone" dataKey="actual" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Actual" strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Progress Mismatch Scatter */}
        <ChartCard title="Financial vs Physical Progress" subtitle="Each bar pair shows gap — wider = higher execution risk">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.progress_comparison} barGap={1} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="financial" fill="#3b82f6" name="Financial %" radius={[3, 3, 0, 0]} />
              <Bar dataKey="physical" fill="#22c55e" name="Physical %" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Duplicate Trends */}
        <ChartCard title="Duplicate Detection Trends" subtitle="Possible duplicates flagged per month">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.duplicate_trends} barSize={30}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="detected" fill="#a855f7" name="Duplicates Detected" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Risk Distribution Pie */}
        <ChartCard title="Overall Risk Distribution" subtitle="Portfolio-level risk breakdown">
          <div className="flex items-center justify-center gap-8">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={riskDistData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                  {riskDistData.map((c, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {riskDistData.map(({ name, value }, i) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i] }} aria-hidden="true" />
                  <span className="text-xs text-gray-600 w-16">{name}</span>
                  <span className="text-xs font-bold text-gray-900">{value} projects</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
