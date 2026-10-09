import { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import { fetchCompliance } from '../services/api';

function ScoreRing({ score }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" aria-label={`Compliance score: ${score}/100`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="10"
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="48" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#1e293b">{score}</text>
      <text x="50" y="62" textAnchor="middle" fontSize="10" fill="#94a3b8">/100</text>
    </svg>
  );
}

const STATUS_ICON = {
  Passed: <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />,
  Failed: <XCircle className="w-4 h-4 text-red-500 shrink-0" />,
  Pending: <Clock className="w-4 h-4 text-yellow-500 shrink-0" />,
};

const STATUS_ROW = {
  Passed: 'bg-green-50 border-green-100',
  Failed: 'bg-red-50 border-red-100',
  Pending: 'bg-yellow-50 border-yellow-100',
};

const SEVERITY_COLOR = {
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

function ComplianceCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  const passed = item.checks.filter((c) => c.status === 'Passed').length;
  const total = item.checks.length;
  const failed = item.checks.filter((c) => c.status === 'Failed').length;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-4">
          <ScoreRing score={item.compliance_score} />
          <div className="text-left">
            <h3 className="text-sm font-bold text-gray-900">{item.project_name}</h3>
            <p className="text-xs font-mono text-blue-600 mt-0.5">{item.project_id}</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs">
              <span className="text-green-600 font-medium">{passed} Passed</span>
              <span className="text-red-600 font-medium">{failed} Failed</span>
              <span className="text-gray-400">{total - passed - failed} Pending</span>
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-2">
          {item.checks.map((check, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${STATUS_ROW[check.status] || 'bg-gray-50 border-gray-100'}`}>
              {STATUS_ICON[check.status] || <Clock className="w-4 h-4 text-gray-400 shrink-0" />}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-semibold text-gray-800">{check.rule}</p>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${SEVERITY_COLOR[check.severity] || 'bg-gray-100 text-gray-600'}`}>
                    {check.severity}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{check.reason}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                check.status === 'Passed' ? 'bg-green-100 text-green-700' :
                check.status === 'Failed' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>{check.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Compliance() {
  const [compliance, setCompliance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetchCompliance();
      setCompliance(res.compliance);
      setLoading(false);
    }
    load();
  }, []);

  const avg = compliance.length ? Math.round(compliance.reduce((s, c) => s + c.compliance_score, 0) / compliance.length) : 0;
  const highRisk = compliance.filter((c) => c.compliance_score < 50).length;

  if (loading) return <LoadingState message="Loading compliance data…" />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Compliance Monitoring"
        subtitle="Rule-based compliance checks for MPLADS project documentation and timelines"
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center">
          <p className="text-xs text-gray-500 mb-2">Average Compliance Score</p>
          <ScoreRing score={avg} />
          <p className="text-xs text-gray-500 mt-2">{compliance.length} projects evaluated</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col justify-center">
          <p className="text-xs text-gray-500 mb-1">Low Compliance</p>
          <p className="text-3xl font-bold text-red-600">{highRisk}</p>
          <p className="text-xs text-gray-500 mt-1">projects with score below 50</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-700 mb-3">Score Distribution</p>
          {[
            { label: '75–100 (Good)', count: compliance.filter((c) => c.compliance_score >= 75).length, color: 'bg-green-500' },
            { label: '50–74 (Moderate)', count: compliance.filter((c) => c.compliance_score >= 50 && c.compliance_score < 75).length, color: 'bg-yellow-500' },
            { label: '0–49 (Poor)', count: compliance.filter((c) => c.compliance_score < 50).length, color: 'bg-red-500' },
          ].map(({ label, count, color }) => (
            <div key={label} className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${color}`} aria-hidden="true" />
              <span className="text-xs text-gray-600 flex-1">{label}</span>
              <span className="text-xs font-bold text-gray-900">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance Cards */}
      {compliance.length === 0 ? (
        <EmptyState title="No compliance data available" />
      ) : (
        <div className="space-y-4">
          {compliance.map((item) => <ComplianceCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
