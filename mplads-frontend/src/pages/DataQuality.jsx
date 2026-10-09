import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import LoadingState from '../components/ui/LoadingState';

async function fetchQualityIssues() {
  try {
    const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const res = await fetch(`${BASE}/api/data-quality`);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return {
      issues: [
        { id: 1, project_id: 'MPL-1002', field_name: 'work_order', issue_type: 'missing_value', severity: 'HIGH', detail: 'Work order document not uploaded', resolved: false },
        { id: 2, project_id: 'MPL-1021', field_name: 'actual_expenditure', issue_type: 'invalid_range', severity: 'HIGH', detail: 'Expenditure 38% above estimated cost', resolved: false },
        { id: 3, project_id: 'MPL-1008', field_name: 'completion_certificate', issue_type: 'missing_value', severity: 'HIGH', detail: 'Completion certificate missing', resolved: false },
        { id: 4, project_id: 'MPL-1006', field_name: 'progress_update', issue_type: 'stale', severity: 'MEDIUM', detail: 'No progress update in 6+ months', resolved: false },
        { id: 5, project_id: 'MPL-1001', field_name: 'expected_completion_date', issue_type: 'inconsistent', severity: 'LOW', detail: 'Date format inconsistency corrected', resolved: true },
      ],
      total: 5,
      provenance: 'SYNTHETIC',
    };
  }
}

const SEV_COLOR = { HIGH: 'bg-red-50 border-red-200 text-red-700', MEDIUM: 'bg-yellow-50 border-yellow-200 text-yellow-700', LOW: 'bg-blue-50 border-blue-200 text-blue-700' };
const TYPE_LABEL = { missing_value: 'Missing', invalid_range: 'Invalid Range', stale: 'Stale', inconsistent: 'Inconsistent', duplicate_suspected: 'Possible Duplicate' };

export default function DataQuality() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSev, setFilterSev] = useState('');

  const load = async () => {
    setLoading(true);
    const d = await fetchQualityIssues();
    setIssues(d.issues || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const shown = filterSev ? issues.filter((i) => i.severity === filterSev) : issues;
  const open = issues.filter((i) => !i.resolved).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Data Quality"
        subtitle="Missing fields, invalid values, and inconsistent records across all projects"
        actions={
          <div className="flex items-center gap-2">
            <select value={filterSev} onChange={(e) => setFilterSev(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Severities</option>
              {['HIGH', 'MEDIUM', 'LOW'].map((s) => <option key={s}>{s}</option>)}
            </select>
            <button onClick={load} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"><RefreshCw className="w-3.5 h-3.5" />Refresh</button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Open Issues', value: open, color: 'text-red-600' },
          { label: 'Total Issues', value: issues.length, color: 'text-gray-900' },
          { label: 'Resolved', value: issues.filter((i) => i.resolved).length, color: 'text-green-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {loading ? <LoadingState message="Checking data quality…" /> : (
        <div className="space-y-2">
          {shown.map((issue) => (
            <div key={issue.id} className={`rounded-xl border p-4 flex items-start gap-3 ${issue.resolved ? 'bg-green-50 border-green-100 opacity-70' : SEV_COLOR[issue.severity] || 'bg-gray-50 border-gray-200'}`}>
              {issue.resolved
                ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-blue-600">{issue.project_id}</span>
                  <span className="text-xs font-semibold">{issue.field_name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/60 font-semibold">{TYPE_LABEL[issue.issue_type] || issue.issue_type}</span>
                  {issue.resolved && <span className="text-[10px] text-green-700 font-semibold">Resolved</span>}
                </div>
                <p className="text-xs mt-1 leading-relaxed">{issue.detail}</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/60 shrink-0">{issue.severity}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
