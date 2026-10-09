import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Calendar, Building2, User, RefreshCw,
  TrendingUp, BarChart3, Copy, ShieldOff, FileX, Clock,
  CheckCircle, AlertTriangle, AlertCircle, Info
} from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import RiskBadge from '../components/ui/RiskBadge';
import RiskScore from '../components/ui/RiskScore';
import LoadingState from '../components/ui/LoadingState';
import { fetchProject, fetchProjectRisk, fetchProjectDuplicates, analyzeProject, fetchProjectRuns } from '../services/api';
import { formatCurrency, formatDate, getRiskColor, getMismatchLabel } from '../utils/formatters';

const ICON_MAP = {
  'trending-up': TrendingUp,
  'bar-chart-2': BarChart3,
  copy: Copy,
  'file-x': FileX,
  'shield-off': ShieldOff,
  clock: Clock,
  'check-circle': CheckCircle,
};

const SEVERITY_ICON = {
  CRITICAL: <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />,
  HIGH: <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />,
  MEDIUM: <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />,
  LOW: <Info className="w-4 h-4 text-green-500 shrink-0" />,
};

function RiskCard({ title, score, reason, icon: Icon }) {
  const level = score <= 30 ? 'LOW' : score <= 60 ? 'MEDIUM' : score <= 80 ? 'HIGH' : 'CRITICAL';
  const c = getRiskColor(level);
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${c.text}`} aria-hidden="true" />
          <span className="text-xs font-semibold text-gray-700">{title}</span>
        </div>
        <RiskBadge level={level} />
      </div>
      <p className={`text-2xl font-bold ${c.text} mb-1`}>{score}<span className="text-sm font-normal text-gray-400">/100</span></p>
      <p className="text-xs text-gray-600 leading-relaxed">{reason}</p>
    </div>
  );
}

export default function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useOutletContext() || {};
  const [project, setProject] = useState(null);
  const [risk, setRisk] = useState(null);
  const [dupes, setDupes] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [p, r, d, runsRes] = await Promise.all([
          fetchProject(projectId),
          fetchProjectRisk(projectId),
          fetchProjectDuplicates(projectId),
          fetchProjectRuns(projectId),
        ]);
        setProject(p);
        setRisk(r);
        setDupes(d);
        setRuns(runsRes.runs || []);
      } catch {
        addToast?.('Failed to load project details', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const result = await analyzeProject(projectId);
      if (result?.success) {
        // Re-fetch updated risk scores from backend
        const updatedRisk = await fetchProjectRisk(projectId);
        setRisk(updatedRisk);
        // Also refresh the project itself (risk_level may have changed)
        const updatedProject = await fetchProject(projectId);
        setProject(updatedProject);
        addToast?.('Analysis complete. Risk scores updated.', 'success');
        window.dispatchEvent(new CustomEvent('dashboard:refresh'));
      } else {
        addToast?.('Analysis queued. Refresh to see updated scores.', 'info');
      }
    } catch {
      addToast?.('Analysis failed. Please try again.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <LoadingState message="Loading project details…" />;
  if (!project) return <div className="p-8 text-center text-gray-500">Project not found.</div>;

  const mismatch = (project.financial_progress || 0) - (project.physical_progress || 0);
  const mismatchInfo = getMismatchLabel(mismatch);

  const riskBreakdown = [
    { title: 'Financial Risk', score: risk?.financial_risk ?? project.financial_risk, icon: TrendingUp, reason: 'Based on expenditure vs estimated cost ratio.' },
    { title: 'Execution Risk', score: risk?.execution_risk ?? project.execution_risk, icon: BarChart3, reason: 'Based on financial vs physical progress mismatch.' },
    { title: 'Duplicate Risk', score: risk?.duplicate_risk ?? project.duplicate_risk, icon: Copy, reason: 'Based on semantic and geographical similarity.' },
    { title: 'Compliance Risk', score: risk?.compliance_risk ?? project.compliance_risk, icon: ShieldOff, reason: 'Based on documentation and timeline compliance.' },
    { title: 'Evidence Risk', score: risk?.evidence_risk ?? project.evidence_risk, icon: FileX, reason: 'Based on evidence completeness and consistency.' },
  ];

  const riskBarData = riskBreakdown.map((r) => ({ name: r.title.replace(' Risk', ''), score: r.score }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
          aria-label="Back to projects"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{project.project_name}</h1>
              <RiskBadge level={project.risk_level} />
              <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{project.project_id}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{project.district}, {project.state}</span>
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{project.mp_name}</span>
              <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{project.agency}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Expected: {formatDate(project.expected_completion_date)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} aria-hidden="true" />
              {analyzing ? 'Analysing…' : 'Re-analyse'}
            </button>
            <button
              onClick={() => navigate('/investigations')}
              className="px-3 py-1.5 text-sm font-medium border border-orange-300 text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
            >
              Investigate
            </button>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto" role="tablist">
        {[
          { id: 'overview',    label: 'Overview' },
          { id: 'risk_ledger', label: 'Risk Ledger' },
          { id: 'duplicates',  label: 'Duplicates' },
          { id: 'run_history', label: 'Run History' },
        ].map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: 'Sanctioned', value: formatCurrency(project.sanction_amount) },
              { label: 'Estimated Cost', value: formatCurrency(project.estimated_cost) },
              { label: 'Actual Expenditure', value: formatCurrency(project.actual_expenditure) },
              { label: 'Financial Progress', value: `${project.financial_progress}%`, color: 'text-blue-600' },
              { label: 'Physical Progress', value: `${project.physical_progress}%`, color: 'text-green-600' },
              { label: 'Progress Gap', value: `${mismatch > 0 ? '+' : ''}${mismatch}%`, color: mismatch > 20 ? 'text-red-600' : 'text-gray-700' },
              { label: 'Constituency', value: project.constituency },
              { label: 'Project Type', value: project.project_type },
            ].map(({ label, value, color = 'text-gray-900' }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                <p className={`text-sm font-bold ${color} leading-tight`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Risk Score + Mismatch */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Unified Risk Score</h2>
              <RiskScore score={risk?.unified_risk_score ?? project.risk_score} showBar size="lg" />
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                Composite score derived from Financial (25%), Execution (20%), Duplicate (15%), Compliance (15%), and Evidence (25%) risk sub-scores.
              </p>
              {project.risk_level !== 'LOW' && (
                <p className="mt-3 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                  ⚠ High-risk project recommended for investigation. AI is a decision-support tool — final determination rests with authorised officers.
                </p>
              )}
            </div>

            {/* Progress Mismatch */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Financial vs Physical Progress</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Financial Progress</span>
                    <span className="font-bold text-blue-600">{project.financial_progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="h-3 rounded-full bg-blue-500 transition-all" style={{ width: `${project.financial_progress}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Physical Progress</span>
                    <span className="font-bold text-green-600">{project.physical_progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="h-3 rounded-full bg-green-500 transition-all" style={{ width: `${project.physical_progress}%` }} />
                  </div>
                </div>
                <div className={`flex items-center justify-between rounded-lg px-4 py-2.5 border ${mismatch > 20 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                  <span className="text-xs text-gray-600 font-medium">Mismatch</span>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${mismatch > 20 ? 'text-red-600' : 'text-gray-700'}`}>{mismatch} pp</span>
                    <span className={`block text-xs font-semibold ${mismatchInfo.color}`}>{mismatchInfo.label}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Breakdown */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Risk Breakdown</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {riskBreakdown.map((r) => (
                <RiskCard key={r.title} {...r} />
              ))}
            </div>
          </div>

          {/* Risk Breakdown Bar Chart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Risk Score Comparison</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={riskBarData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`${v}/100`, 'Risk Score']} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}
                  fill="#3b82f6"
                  label={{ position: 'top', fontSize: 10, fill: '#6b7280' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Why Flagged */}
          {risk?.flagged_reasons?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-orange-500" aria-hidden="true" />
                <h2 className="text-base font-semibold text-gray-900">Why was this project flagged?</h2>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                The AI engine identified the following anomalies. These are indicators for review — not conclusions of wrongdoing.
              </p>
              <ul className="space-y-3">
                {risk.flagged_reasons.map((r, i) => {
                  const Icon = ICON_MAP[r.icon] || Info;
                  return (
                    <li key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                      r.severity === 'CRITICAL' ? 'bg-red-50 border-red-100' :
                      r.severity === 'HIGH' ? 'bg-orange-50 border-orange-100' :
                      r.severity === 'MEDIUM' ? 'bg-yellow-50 border-yellow-100' :
                      'bg-green-50 border-green-100'
                    }`}>
                      {SEVERITY_ICON[r.severity]}
                      <div>
                        <span className={`text-xs font-bold mr-2 ${
                          r.severity === 'CRITICAL' ? 'text-red-700' :
                          r.severity === 'HIGH' ? 'text-orange-700' :
                          r.severity === 'MEDIUM' ? 'text-yellow-700' :
                          'text-green-700'
                        }`}>[{r.severity}]</span>
                        <span className="text-xs text-gray-700">{r.text}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── RISK LEDGER TAB ── */}
      {activeTab === 'risk_ledger' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Risk Score Ledger</h2>
            <p className="text-xs text-gray-500 mb-4">
              Every contribution to the final score is shown here. The sum of Points Added equals the Final Score exactly.
              This is the Glass Box view — full transparency on how the score was derived.
            </p>
            {risk?.score_ledger ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {['Component', 'Raw Score /100', 'Weight', 'Points Added', 'Description'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {risk.score_ledger.map((row) => (
                        <tr key={row.component} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-xs font-semibold text-gray-800">{row.component}</td>
                          <td className="px-4 py-3 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${row.raw_score}%` }} />
                              </div>
                              <span className="text-gray-700 font-medium">{row.raw_score}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">{(row.weight * 100).toFixed(0)}%</td>
                          <td className="px-4 py-3 text-xs font-bold text-blue-700">{row.points_added}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title={row.description}>{row.description}</td>
                        </tr>
                      ))}
                      <tr className="bg-blue-50 border-t-2 border-blue-200">
                        <td className="px-4 py-3 text-xs font-bold text-blue-900" colSpan={3}>TOTAL (Final Score)</td>
                        <td className="px-4 py-3 text-sm font-bold text-blue-700">
                          {risk.score_ledger.reduce((s, r) => s + r.points_added, 0).toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-xs text-blue-700">= Unified Risk Score</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {risk.confidence != null && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-medium">Confidence:</span>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="h-2 rounded-full bg-green-500" style={{ width: `${risk.confidence}%` }} />
                    </div>
                    <span className="font-semibold text-gray-700">{risk.confidence}%</span>
                    <span className="text-gray-400">— based on input completeness and evidence quality</span>
                  </div>
                )}
                <p className="mt-3 text-[10px] text-gray-400 border-t border-gray-100 pt-2">
                  Weights: Financial 25% · Execution 20% · Duplicate 15% · Compliance 15% · Evidence 25%.
                  Configurable in Settings. AI is decision-support only — final determination by authorised officers.
                </p>
              </>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">Score ledger not available.</p>
                <p className="text-xs mt-1">Click Re-analyse to generate a full ledger for this project.</p>
              </div>
            )}
          </div>

          {/* Missing inputs notice */}
          {risk?.missing_inputs?.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-yellow-800 mb-1">Missing inputs — lower confidence</p>
              <p className="text-xs text-yellow-700">
                The following data points were unavailable and were excluded (not zero-filled):
                {' '}{risk.missing_inputs.join(', ')}.
                Missing inputs reduce confidence, not raise risk.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── DUPLICATES TAB ── */}
      {activeTab === 'duplicates' && (
        <div className="space-y-4">
          {dupes && dupes.matched_project ? (
            <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Copy className="w-5 h-5 text-orange-500" aria-hidden="true" />
                <h2 className="text-base font-semibold text-gray-900">Duplicate Detection Analysis</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {[
                  { label: 'Semantic Similarity', value: `${dupes.semantic_similarity}%`, high: dupes.semantic_similarity > 80 },
                  { label: 'Geographical Similarity', value: `${dupes.geographical_similarity}%`, high: dupes.geographical_similarity > 80 },
                  { label: 'Distance', value: dupes.distance_km ? `${dupes.distance_km} km` : '—', high: dupes.distance_km < 2 },
                  { label: 'Duplicate Risk', value: `${dupes.duplicate_risk}/100`, high: dupes.duplicate_risk > 70 },
                ].map(({ label, value, high }) => (
                  <div key={label} className={`rounded-lg p-3 border ${high ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                    <p className={`text-lg font-bold ${high ? 'text-orange-600' : 'text-gray-700'}`}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <p className="text-xs font-semibold text-gray-700 mb-2">Matched Project</p>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{dupes.matched_project.project_name}</p>
                    <p className="text-xs text-gray-500">{dupes.matched_project.project_id} · {dupes.matched_project.district} · {formatCurrency(dupes.matched_project.sanction_amount)}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/projects/${dupes.matched_project.project_id}`)}
                    className="px-3 py-1.5 text-xs font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Compare Projects
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
              <Copy className="w-8 h-8 text-gray-300 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm text-gray-500 font-medium">No duplicate projects detected</p>
              <p className="text-xs text-gray-400 mt-1">No semantically or geographically similar projects were found for this project.</p>
            </div>
          )}
        </div>
      )}

      {/* ── RUN HISTORY TAB ── */}
      {activeTab === 'run_history' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Analysis Run History</h2>
          {runs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No analysis runs yet. Click Re-analyse to create the first run record.
            </p>
          ) : (
            <div className="space-y-3">
              {runs.map((run, i) => (
                <div key={run.id} className={`rounded-lg border p-4 ${i === 0 ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-xs font-mono text-gray-500">Run #{run.id}</span>
                      {i === 0 && <span className="ml-2 px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded">LATEST</span>}
                      <p className="text-xs text-gray-500 mt-0.5">
                        {run.finished_at ? new Date(run.finished_at).toLocaleString() : '—'} · by {run.triggered_by}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{run.final_score?.toFixed(1)}<span className="text-xs font-normal text-gray-400">/100</span></p>
                      <p className="text-[10px] text-gray-400">Confidence: {run.confidence ?? '—'}%</p>
                    </div>
                  </div>
                  {run.component_scores && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      {Object.entries(run.component_scores).map(([k, v]) => (
                        <span key={k} className="text-[10px] text-gray-500">{k.replace('_risk', '')}: <strong>{v?.toFixed(0)}</strong></span>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">Input hash: {run.input_hash?.slice(0, 16)}…</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
