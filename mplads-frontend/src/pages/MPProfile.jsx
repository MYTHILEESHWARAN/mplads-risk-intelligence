import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, IndianRupee, FolderOpen, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import PageHeader from '../components/ui/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import RiskBadge from '../components/ui/RiskBadge';
import { formatCurrency } from '../utils/formatters';

const PIE_COLORS = ['#3b82f6','#22c55e','#f97316','#ef4444','#8b5cf6','#eab308','#06b6d4','#ec4899','#84cc16','#f59e0b'];

async function fetchMember(code) {
  try {
    const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const res = await fetch(`${BASE}/api/members/${code}`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return {
      member: { member_code: code, name: 'Rajendra Bhushan', house: 'Lok Sabha', party: 'INC', state: 'Uttar Pradesh', constituency_name: 'North District', is_synthetic: true },
      fund_ledger: [
        { financial_year: '2019-20', entitlement: 5000000, amount_released: 4800000, unspent_closing: 400000, utilisation_pct: 91.7 },
        { financial_year: '2020-21', entitlement: 5000000, amount_released: 4200000, unspent_closing: 600000, utilisation_pct: 85.7 },
        { financial_year: '2021-22', entitlement: 5000000, amount_released: 5000000, unspent_closing: 200000, utilisation_pct: 96.0 },
        { financial_year: '2022-23', entitlement: 5000000, amount_released: 5000000, unspent_closing: 300000, utilisation_pct: 94.0 },
        { financial_year: '2023-24', entitlement: 5000000, amount_released: 5000000, unspent_closing: 1700000, utilisation_pct: 66.0 },
      ],
      projects: [
        { project_id: 'MPL-1001', project_name: 'Rural Road Connectivity', district: 'Varanasi', status: 'In Progress', sanction_amount: 2500000, actual_expenditure: 2175000, physical_progress: 82, risk_score: 21, risk_level: 'LOW' },
        { project_id: 'MPL-1012', project_name: 'Rural Road Bypass Link', district: 'Lucknow', status: 'Delayed', sanction_amount: 2800000, actual_expenditure: 1200000, physical_progress: 20, risk_score: 65, risk_level: 'HIGH' },
      ],
      provenance: 'SYNTHETIC',
    };
  }
}

export default function MPProfile() {
  const { memberCode } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchMember(memberCode).then((d) => { setData(d); setLoading(false); });
  }, [memberCode]);

  if (loading) return <LoadingState message="Loading MP profile..." />;
  if (!data) return <div className="p-8 text-center text-gray-500">Member not found.</div>;

  const { member, fund_ledger, projects } = data;

  const categoryData = projects.reduce((acc, p) => {
    acc[p.project_type || 'Other'] = (acc[p.project_type || 'Other'] || 0) + 1;
    return acc;
  }, {});
  const pieParts = Object.entries(categoryData).map(([name, value]) => ({ name, value }));

  const totalReleased = fund_ledger.reduce((s, f) => s + f.amount_released, 0);
  const totalUnspent = fund_ledger.reduce((s, f) => s + f.unspent_closing, 0);
  const avgUtil = fund_ledger.reduce((s, f) => s + f.utilisation_pct, 0) / fund_ledger.length;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/mp-directory')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to MP Directory
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{member.name}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 border border-purple-200 text-purple-700">SYNTHETIC</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{member.house} · {member.party} · {member.state}</p>
            {member.constituency_name && <p className="text-xs text-gray-400">{member.constituency_name}</p>}
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'Total Released', value: formatCurrency(totalReleased) },
              { label: 'Total Unspent', value: formatCurrency(totalUnspent) },
              { label: 'Avg Utilisation', value: `${avgUtil.toFixed(1)}%` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fund ledger chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Fund Utilisation by Financial Year</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={fund_ledger}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="financial_year" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => formatCurrency(v)} />
            <Bar dataKey="amount_released" fill="#3b82f6" name="Released" radius={[3,3,0,0]} />
            <Bar dataKey="unspent_closing" fill="#f97316" name="Unspent" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Projects table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Projects ({projects.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {['Project ID','Name','District','Status','Sanctioned','Expenditure','Progress %','Risk'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projects.map((p) => (
                <tr key={p.project_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/projects/${p.project_id}`)}>
                  <td className="px-4 py-3 text-xs font-mono text-blue-600">{p.project_id}</td>
                  <td className="px-4 py-3 text-xs text-gray-800 max-w-[150px] truncate">{p.project_name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{p.district}</td>
                  <td className="px-4 py-3 text-xs"><span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">{p.status}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-700">{formatCurrency(p.sanction_amount)}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{formatCurrency(p.actual_expenditure)}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{p.physical_progress}%</td>
                  <td className="px-4 py-3">{p.risk_level ? <RiskBadge level={p.risk_level} /> : <span className="text-xs text-gray-400">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-400 text-center">All data is fictional (SYNTHETIC). Fund-utilisation analytics only — not a judgement of the individual.</p>
    </div>
  );
}
