import { useState } from 'react';
import { Download, FileText, AlertTriangle, ClipboardList, LayoutDashboard, Loader2, CheckCircle2, FileJson, FileSpreadsheet } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const DISCLAIMER = 'Risk indicators support prioritization of human review and are not findings of wrongdoing.';

const REPORT_TYPES = [
  {
    id: 'projects',
    title: 'Project Risk Register',
    description: 'All projects with unified risk scores, component scores, status, and expenditure. The most comprehensive report for officer review.',
    icon: FileText,
    endpoint: '/api/reports/projects',
    formats: ['csv', 'json'],
    filters: [
      { key: 'risk_level', label: 'Risk Level', type: 'select', options: ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
      { key: 'state', label: 'State', type: 'text', placeholder: 'e.g. Uttar Pradesh' },
      { key: 'district', label: 'District', type: 'text', placeholder: 'e.g. Varanasi' },
      { key: 'status', label: 'Status', type: 'select', options: ['', 'In Progress', 'Delayed', 'Completed', 'Not Started'] },
    ],
  },
  {
    id: 'alerts',
    title: 'Risk Alerts Report',
    description: 'AI-generated alerts filtered by severity. Includes alert type, reason, project, and current status.',
    icon: AlertTriangle,
    endpoint: '/api/reports/alerts',
    formats: ['csv', 'json'],
    filters: [
      { key: 'severity', label: 'Severity', type: 'select', options: ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
    ],
  },
  {
    id: 'investigations',
    title: 'Investigation Queue',
    description: 'All investigations with priority, assigned officer, and timeline. Suitable for ministry-level review.',
    icon: ClipboardList,
    endpoint: '/api/reports/investigations',
    formats: ['csv', 'json'],
    filters: [],
  },
  {
    id: 'dashboard-summary',
    title: 'Portfolio Summary',
    description: 'High-level summary: total projects, risk distribution, expenditure totals, and critical alerts. Good for executive briefings.',
    icon: LayoutDashboard,
    endpoint: '/api/reports/dashboard-summary',
    formats: ['json'],
    filters: [],
  },
];

const FORMAT_ICON = { csv: FileSpreadsheet, json: FileJson };

function ReportCard({ report }) {
  const Icon = report.icon;
  const [format, setFormat] = useState(report.formats[0]);
  const [filters, setFilters] = useState({});
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleDownload = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const params = new URLSearchParams({ format });
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await fetch(`${BASE}${report.endpoint}?${params}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}. Is the backend running?`);
      const blob = await res.blob();
      const cd = res.headers.get('content-disposition') || '';
      const filename = cd.match(/filename="(.+)"/)?.[1] || `${report.id}_${Date.now()}.${format}`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      setStatus('success');
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Download failed. Start the backend server first.');
      setTimeout(() => setStatus(null), 6000);
    }
  };

  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-blue-50 rounded-lg shrink-0">
          <Icon className="w-5 h-5 text-blue-600" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">{report.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{report.description}</p>
        </div>
      </div>

      {report.filters.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          {report.filters.map((f) => (
            <div key={f.key}>
              <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wide">{f.label}</label>
              {f.type === 'select' ? (
                <select
                  value={filters[f.key] || ''}
                  onChange={(e) => setFilter(f.key, e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={f.label}
                >
                  {f.options.map((o) => <option key={o} value={o}>{o || `All ${f.label}s`}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder={f.placeholder}
                  value={filters[f.key] || ''}
                  onChange={(e) => setFilter(f.key, e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={f.label}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1 border-t border-gray-50 mt-auto">
        <div className="flex gap-1">
          {report.formats.map((f) => {
            const FI = FORMAT_ICON[f] || FileText;
            return (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  format === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                aria-pressed={format === f}
              >
                <FI className="w-3 h-3" />
                {f.toUpperCase()}
              </button>
            );
          })}
        </div>
        <button
          onClick={handleDownload}
          disabled={status === 'loading'}
          className="ml-auto flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
          aria-label={`Download ${report.title} as ${format.toUpperCase()}`}
        >
          {status === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {status === 'success' && <CheckCircle2 className="w-3.5 h-3.5" />}
          {status !== 'loading' && status !== 'success' && <Download className="w-3.5 h-3.5" />}
          {status === 'loading' ? 'Generating…' : status === 'success' ? 'Downloaded!' : `Download ${format.toUpperCase()}`}
        </button>
      </div>

      {status === 'error' && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          {errorMsg}
        </p>
      )}
    </div>
  );
}

export default function ReportsCenter() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports Center"
        subtitle="Download project risk data, alerts, and investigation records as CSV or JSON"
      />

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-xs text-amber-900 leading-relaxed">
        <strong>Disclaimer:</strong> &ldquo;{DISCLAIMER}&rdquo;{' '}
        All reports include a data provenance tag. Current dataset: <strong>SYNTHETIC</strong> (fictional demo data).
        PDF and Excel export will be added in a future phase.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {REPORT_TYPES.map((r) => <ReportCard key={r.id} report={r} />)}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Reports require the backend to be running at {BASE}. In demo mode without the backend, downloads will fail with a clear error.
      </p>
    </div>
  );
}
