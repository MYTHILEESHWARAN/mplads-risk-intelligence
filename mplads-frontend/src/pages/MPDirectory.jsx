import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import RiskScore from '../components/ui/RiskScore';
import { formatCurrency } from '../utils/formatters';

async function fetchMembers(params = {}) {
  try {
    const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const res = await fetch(`${BASE}/api/members?` + new URLSearchParams(params));
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    // Demo fallback — synthetic members
    return {
      members: [
        { member_code: 'SYN-MP-001', name: 'Rajendra Bhushan', house: 'Lok Sabha', party: 'INC', state: 'Uttar Pradesh', constituency_name: 'North District', total_released: 25000000, total_unspent: 3200000, utilisation_pct: 87.2, project_count: 12, avg_risk_score: 42, is_synthetic: true },
        { member_code: 'SYN-MP-002', name: 'Meera Devi Tomar', house: 'Lok Sabha', party: 'BJP', state: 'Bihar', constituency_name: 'South Rural', total_released: 20000000, total_unspent: 8100000, utilisation_pct: 59.5, project_count: 8, avg_risk_score: 67, is_synthetic: true },
        { member_code: 'SYN-MP-003', name: 'Suresh Kumar Pandey', house: 'Rajya Sabha', party: 'SP', state: 'Maharashtra', constituency_name: null, total_released: 15000000, total_unspent: 1200000, utilisation_pct: 92.0, project_count: 6, avg_risk_score: 28, is_synthetic: true },
        { member_code: 'SYN-MP-004', name: 'Anita Singh Rathore', house: 'Lok Sabha', party: 'TMC', state: 'West Bengal', constituency_name: 'East Urban', total_released: 22000000, total_unspent: 5500000, utilisation_pct: 75.0, project_count: 10, avg_risk_score: 55, is_synthetic: true },
        { member_code: 'SYN-MP-005', name: 'Vikram Narayan Das', house: 'Lok Sabha', party: 'BJD', state: 'Odisha', constituency_name: 'West Valley', total_released: 18000000, total_unspent: 900000, utilisation_pct: 95.0, project_count: 9, avg_risk_score: 19, is_synthetic: true },
      ],
      total: 5,
    };
  }
}

export default function MPDirectory() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [houseFilter, setHouseFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    fetchMembers({ search, house: houseFilter }).then((d) => {
      setMembers(d.members || []);
      setTotal(d.total || 0);
      setLoading(false);
    });
  }, [search, houseFilter]);

  const sc = "px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-5">
      <PageHeader
        title="MP Directory"
        subtitle={`Fund utilisation analytics for ${total} Members of Parliament — all data synthetic`}
        actions={
          <span className="px-2 py-1 text-[10px] font-bold bg-purple-50 border border-purple-200 text-purple-700 rounded-full">SYNTHETIC</span>
        }
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search MP name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select value={houseFilter} onChange={(e) => setHouseFilter(e.target.value)} className={sc}>
          <option value="">All Houses</option>
          <option>Lok Sabha</option>
          <option>Rajya Sabha</option>
          <option>Nominated</option>
        </select>
        <button onClick={() => { setSearch(''); setHouseFilter(''); }} className="text-xs text-gray-500 hover:text-gray-700 underline">Clear</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <LoadingState message="Loading MPs..." /> : members.length === 0 ? (
          <EmptyState title="No MPs found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="MP Directory">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Name', 'House', 'Party', 'State / Constituency', 'Released', 'Unspent', 'Utilisation %', 'Projects', 'Avg Risk', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {members.map((m) => (
                  <tr key={m.member_code} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                      <p className="text-[10px] font-mono text-purple-600">{m.member_code}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{m.house}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{m.party || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <p>{m.state}</p>
                      <p className="text-gray-400">{m.constituency_name || 'Rajya Sabha / Nominated'}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{formatCurrency(m.total_released)}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <span className={m.total_unspent > m.total_released * 0.3 ? 'text-orange-600 font-semibold' : 'text-gray-700'}>
                        {formatCurrency(m.total_unspent)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${m.utilisation_pct >= 80 ? 'bg-green-500' : m.utilisation_pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${m.utilisation_pct}%` }}
                          />
                        </div>
                        <span className="font-semibold">{m.utilisation_pct?.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{m.project_count}</td>
                    <td className="px-4 py-3">
                      {m.avg_risk_score != null
                        ? <RiskScore score={m.avg_risk_score} showBar={false} size="sm" />
                        : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/mp/${m.member_code}`)}
                        className="px-2.5 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        All MP names and fund figures are fictional synthetic data. No real person is represented.
        Frame as fund-utilisation analytics — not a judgement of any individual.
      </p>
    </div>
  );
}
