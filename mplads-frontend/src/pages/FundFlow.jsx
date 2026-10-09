import { useState, useEffect } from 'react';
import { GitBranch, RefreshCw } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import { formatCurrency } from '../utils/formatters';

// Simple visual Sankey-style representation using horizontal bars
// No D3 dependency — pure SVG-based proportional flow

async function fetchFundFlow(fy) {
  try {
    const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const res = await fetch(`${BASE}/api/funds/flow?${fy ? 'financial_year=' + fy : ''}`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return {
      nodes: [
        { id: 0, name: 'Central Government', type: 'source' },
        { id: 1, name: 'Sh. Rajendra Bhushan', type: 'mp' },
        { id: 2, name: 'Meera Devi Tomar', type: 'mp' },
        { id: 3, name: 'PWD', type: 'agency' },
        { id: 4, name: 'Jal Nigam', type: 'agency' },
        { id: 5, name: 'Projects (12)', type: 'project' },
      ],
      links: [
        { source: 0, target: 1, value: 25000000 },
        { source: 0, target: 2, value: 20000000 },
        { source: 1, target: 3, value: 14000000 },
        { source: 1, target: 4, value: 11000000 },
        { source: 2, target: 3, value: 8000000 },
        { source: 3, target: 5, value: 18000000 },
        { source: 4, target: 5, value: 9000000 },
      ],
      financial_year: fy || 'all',
      provenance: 'SYNTHETIC',
    };
  }
}

const FY_OPTIONS = ['', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24'];
const TYPE_COLORS = { source: '#1e3a8a', mp: '#7c3aed', agency: '#0891b2', project: '#059669' };

export default function FundFlow() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fy, setFy] = useState('');

  const load = async () => {
    setLoading(true);
    const d = await fetchFundFlow(fy);
    setData(d);
    setLoading(false);
  };

  useEffect(() => { load(); }, [fy]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fund Flow"
        subtitle="Sankey-style view of fund flow from Central Government to MPs, agencies, and projects"
        actions={
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 text-[10px] font-bold bg-purple-50 border border-purple-200 text-purple-700 rounded-full">SYNTHETIC</span>
            <select value={fy} onChange={(e) => setFy(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {FY_OPTIONS.map((f) => <option key={f} value={f}>{f || 'All Years'}</option>)}
            </select>
            <button onClick={load} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"><RefreshCw className="w-3.5 h-3.5" />Refresh</button>
          </div>
        }
      />

      {loading ? <LoadingState message="Building fund flow..." /> : !data ? null : (
        <>
          {/* Flow summary table — clear and readable */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {['source', 'mp', 'agency'].map((nodeType) => {
              const nodes = data.nodes.filter((n) => n.type === nodeType);
              const total = data.links
                .filter((l) => nodes.some((n) => n.id === l.source))
                .reduce((s, l) => s + l.value, 0);
              return (
                <div key={nodeType} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-3 h-3 rounded-full" style={{ background: TYPE_COLORS[nodeType] }} />
                    <span className="text-xs font-semibold text-gray-700 capitalize">{nodeType === 'mp' ? 'MPs' : nodeType === 'agency' ? 'Agencies' : 'Source'}</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(total)}</p>
                  <p className="text-xs text-gray-500">{nodes.length} node{nodes.length !== 1 ? 's' : ''}</p>
                  <ul className="mt-2 space-y-1">
                    {nodes.slice(0, 5).map((n) => {
                      const outflow = data.links.filter((l) => l.source === n.id).reduce((s, l) => s + l.value, 0);
                      return (
                        <li key={n.id} className="flex justify-between text-xs text-gray-600">
                          <span className="truncate max-w-[140px]">{n.name}</span>
                          <span className="font-medium text-gray-800 shrink-0 ml-2">{formatCurrency(outflow)}</span>
                        </li>
                      );
                    })}
                    {nodes.length > 5 && <li className="text-[10px] text-gray-400">+{nodes.length - 5} more</li>}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Visual flow — proportional bars */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Flow Visualisation</h3>
            <div className="space-y-2">
              {data.links.slice(0, 20).map((link, i) => {
                const srcNode = data.nodes.find((n) => n.id === link.source);
                const tgtNode = data.nodes.find((n) => n.id === link.target);
                const maxVal = Math.max(...data.links.map((l) => l.value));
                const pct = (link.value / maxVal) * 100;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-32 truncate text-right">{srcNode?.name}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 relative overflow-hidden">
                      <div
                        className="h-4 rounded-full flex items-center px-2"
                        style={{ width: `${Math.max(pct, 5)}%`, background: TYPE_COLORS[tgtNode?.type] || '#6b7280' }}
                      >
                        <span className="text-[10px] text-white font-medium truncate">{formatCurrency(link.value)}</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 w-28 truncate">{tgtNode?.name}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 mt-4">All fund figures are synthetic. Provenance: {data.provenance}</p>
          </div>
        </>
      )}
    </div>
  );
}
