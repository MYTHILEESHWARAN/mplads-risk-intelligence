import { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, XCircle, RefreshCw, CheckCircle2, Clock, Info } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import LoadingState from '../components/ui/LoadingState';

async function fetchSelfCheck() {
  try {
    const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const res = await fetch(`${BASE_URL}/api/system/self-check`);
    if (!res.ok) throw new Error('Backend unavailable');
    return await res.json();
  } catch {
    return null;
  }
}

const STATUS_CONFIG = {
  VERIFIED: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'VERIFIED' },
  IMPLEMENTED_UNVERIFIED: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'IMPLEMENTED — unverified' },
  NOT_IMPLEMENTED: { icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', label: 'NOT IMPLEMENTED' },
  ERROR: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'ERROR' },
};

const MODULE_LABELS = {
  isolation_forest: 'Financial Anomaly (Isolation Forest)',
  xgboost_delay: 'Delay Prediction (XGBoost)',
  tfidf_duplicate: 'Duplicate Detection (TF-IDF)',
  sentence_transformers: 'Duplicate Detection (Sentence Transformers)',
  haversine_geo: 'Geographical Distance (Haversine)',
  compliance_rules: 'Compliance Rules Engine',
  unified_score: 'Unified Risk Score Formula',
  database: 'Database Connectivity',
};

function ModuleCard({ name, data }) {
  const cfg = STATUS_CONFIG[data.status] || STATUS_CONFIG.ERROR;
  const Icon = cfg.icon;
  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 shrink-0 ${cfg.color}`} aria-hidden="true" />
          <span className="text-sm font-semibold text-gray-800">{MODULE_LABELS[name] || name}</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.color} ${cfg.bg} whitespace-nowrap`}>
          {cfg.label}
        </span>
      </div>
      {data.note && <p className="text-xs text-gray-600 mb-2 leading-relaxed">{data.note}</p>}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {data.library && <span className="text-[10px] text-gray-500">Library: <strong>{data.library}</strong></span>}
        {data.latency_ms != null && <span className="text-[10px] text-gray-500">Latency: <strong>{data.latency_ms} ms</strong></span>}
        {data.probe_anomaly_score != null && <span className="text-[10px] text-gray-500">Anomaly score: <strong>{data.probe_anomaly_score}</strong></span>}
        {data.probe_compliance_score != null && <span className="text-[10px] text-gray-500">Compliance score: <strong>{data.probe_compliance_score}</strong></span>}
        {data.fixture_got != null && <span className="text-[10px] text-gray-500">Fixture: expected 25.0, got <strong>{data.fixture_got}</strong></span>}
        {data.probe_distance_km != null && <span className="text-[10px] text-gray-500">Probe dist: <strong>{data.probe_distance_km} km</strong></span>}
        {data.projects != null && <span className="text-[10px] text-gray-500">Projects in DB: <strong>{data.projects}</strong></span>}
        {data.error && <span className="text-[10px] text-red-600 col-span-2">Error: {data.error}</span>}
      </div>
    </div>
  );
}

export default function ModelTransparency() {
  const [check, setCheck] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await fetchSelfCheck();
    setCheck(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Model Transparency"
        subtitle="Runtime verification of every AI/ML module. Status is VERIFIED only if the probe passed right now."
        actions={
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Re-run checks
          </button>
        }
      />

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 text-xs text-blue-800 leading-relaxed flex items-start gap-2">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong>What this page shows:</strong> Each row is a real probe executed against the running system right now.
          VERIFIED means the probe passed. IMPLEMENTED — unverified means the code exists but the probe was not conclusive.
          NOT IMPLEMENTED means the feature is on the roadmap.
          <br />
          <strong>Disclaimer:</strong> Risk scores are indicators to support prioritisation of human review. They are not findings of wrongdoing.
        </div>
      </div>

      {loading ? (
        <LoadingState message="Running system self-check..." />
      ) : !check ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-red-700">Backend offline</p>
          <p className="text-xs text-red-600 mt-1">Cannot run self-check. Start the backend and click Re-run checks.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{check.verified_count}</p>
              <p className="text-xs text-gray-500 mt-1">Verified modules</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-gray-700">{check.total_modules}</p>
              <p className="text-xs text-gray-500 mt-1">Total modules probed</p>
            </div>
            <div className={`rounded-xl border shadow-sm p-4 text-center ${check.overall_status === 'HEALTHY' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <p className={`text-lg font-bold ${check.overall_status === 'HEALTHY' ? 'text-green-700' : 'text-yellow-700'}`}>{check.overall_status}</p>
              <p className="text-xs text-gray-500 mt-1">Checked at {new Date(check.checked_at).toLocaleTimeString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(check.modules).map(([name, data]) => (
              <ModuleCard key={name} name={name} data={data} />
            ))}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-xs text-gray-600">
            <p className="font-semibold mb-1">Data provenance</p>
            <p>All {check.modules.database?.projects ?? '?'} projects in this system are labeled <strong>SYNTHETIC</strong> — fictional data generated for demonstration. No real MP, constituency, or fund data is used unless officially imported.</p>
          </div>
        </>
      )}
    </div>
  );
}
