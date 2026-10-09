import { useState, useEffect } from 'react';
import { FileImage, FileText, CheckCircle, XCircle, Clock, AlertTriangle, Eye } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { fetchEvidence } from '../services/api';
import { formatDate, getStatusColor } from '../utils/formatters';

const TYPE_ICON = {
  'Project Photo': FileImage,
  'Completion Certificate': FileText,
  'Payment Record': FileText,
  'Work Order': FileText,
  'Supporting Document': FileText,
};

const STATUS_ICON = {
  Verified: <CheckCircle className="w-4 h-4 text-green-500" />,
  Missing: <XCircle className="w-4 h-4 text-red-500" />,
  Pending: <Clock className="w-4 h-4 text-yellow-500" />,
  Mismatch: <AlertTriangle className="w-4 h-4 text-orange-500" />,
};

export default function EvidenceReview() {
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', project_id: '' });
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetchEvidence(filters);
      setEvidence(res.evidence);
      setLoading(false);
    }
    load();
  }, [filters]);

  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  const summary = {
    total: evidence.length,
    verified: evidence.filter((e) => e.verification_status === 'Verified').length,
    missing: evidence.filter((e) => e.verification_status === 'Missing').length,
    mismatch: evidence.filter((e) => e.verification_status === 'Mismatch').length,
    pending: evidence.filter((e) => e.verification_status === 'Pending').length,
  };

  const selectClass = "px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Evidence Review"
        subtitle="Verify and review project documentation submitted by implementing agencies"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: summary.total, color: 'text-gray-900', bg: 'bg-white' },
          { label: 'Verified', value: summary.verified, color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Pending', value: summary.pending, color: 'text-yellow-700', bg: 'bg-yellow-50' },
          { label: 'Mismatch', value: summary.mismatch, color: 'text-orange-700', bg: 'bg-orange-50' },
          { label: 'Missing', value: summary.missing, color: 'text-red-700', bg: 'bg-red-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl border border-gray-100 shadow-sm p-4`}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <select aria-label="Filter by status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={selectClass}>
          <option value="">All Statuses</option>
          {['Verified', 'Pending', 'Missing', 'Mismatch'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select aria-label="Filter by project" value={filters.project_id} onChange={(e) => setFilter('project_id', e.target.value)} className={selectClass}>
          <option value="">All Projects</option>
          {[...new Set(evidence.map((e) => e.project_id))].map((pid) => (
            <option key={pid} value={pid}>{pid}</option>
          ))}
        </select>
        <button onClick={() => setFilters({ status: '', project_id: '' })} className="text-xs text-gray-500 hover:text-gray-700 underline">Clear</button>
      </div>

      {/* Evidence Cards */}
      {loading ? <LoadingState message="Loading evidence records…" /> : evidence.length === 0 ? (
        <EmptyState title="No evidence records found" description="No evidence documents match the selected filters." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {evidence.map((ev) => {
            const Icon = TYPE_ICON[ev.evidence_type] || FileText;
            const riskBg = ev.risk_status === 'CRITICAL' ? 'border-red-200 bg-red-50' : ev.risk_status === 'HIGH' ? 'border-orange-200 bg-orange-50' : 'border-gray-100 bg-white';
            return (
              <div key={ev.id} className={`rounded-xl border shadow-sm p-4 space-y-3 ${riskBg}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                      <Icon className="w-4 h-4 text-blue-600" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{ev.evidence_type}</p>
                      <p className="text-xs text-blue-600 font-mono">{ev.project_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" aria-label={`Status: ${ev.verification_status}`}>
                    {STATUS_ICON[ev.verification_status]}
                  </div>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed truncate" title={ev.project_name}>{ev.project_name}</p>

                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(ev.verification_status)}`}>
                    {ev.verification_status}
                  </span>
                  {ev.upload_date && (
                    <span className="text-[10px] text-gray-400">{formatDate(ev.upload_date)}</span>
                  )}
                </div>

                {ev.notes && (
                  <p className="text-[10px] text-gray-500 leading-relaxed border-t border-gray-100 pt-2">{ev.notes}</p>
                )}

                <button
                  onClick={() => setPreview(ev)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                  Preview Details
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title="Evidence Record Details" size="sm">
        {preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Project ID', value: preview.project_id },
                { label: 'Evidence Type', value: preview.evidence_type },
                { label: 'Verification Status', value: preview.verification_status },
                { label: 'Risk Status', value: preview.risk_status },
                { label: 'Upload Date', value: preview.upload_date ? formatDate(preview.upload_date) : 'Not uploaded' },
                { label: 'File Name', value: preview.file_name || 'No file' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                  <p className="text-xs font-semibold text-gray-800">{value}</p>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-xs text-gray-700 leading-relaxed">{preview.notes || 'No additional notes.'}</p>
            </div>
            {!preview.file_name && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                <XCircle className="w-3.5 h-3.5 shrink-0" />
                No file uploaded for this evidence item.
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setPreview(null)}
                className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
