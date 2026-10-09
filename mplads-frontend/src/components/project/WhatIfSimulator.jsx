/**
 * What-if Simulator — lets officers see how changes affect the risk score.
 * Calls POST /api/projects/{id}/simulate (no persistence).
 */
import { useState } from 'react';
import { Sliders, RefreshCw, AlertTriangle } from 'lucide-react';
import { simulateProject } from '../../services/api';
import RiskScore from '../ui/RiskScore';

export default function WhatIfSimulator({ projectId, project }) {
  const [values, setValues] = useState({
    financial_progress:  project?.financial_progress  ?? 50,
    physical_progress:   project?.physical_progress   ?? 50,
    actual_expenditure:  project?.actual_expenditure  ?? 0,
    estimated_cost:      project?.estimated_cost      ?? 1,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res = await simulateProject(projectId, values);
      setResult(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => setValues((prev) => ({ ...prev, [k]: parseFloat(v) || 0 }));

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sliders className="w-5 h-5 text-blue-500" aria-hidden="true" />
        <h3 className="text-base font-semibold text-gray-900">What-if Simulator</h3>
      </div>
      <p className="text-xs text-gray-500">
        Adjust values below to see how the risk score would change. <strong>No data is saved.</strong>
        This is a decision-support tool — results are hypothetical only.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { key: 'financial_progress',  label: 'Financial Progress (%)', min: 0,  max: 100, step: 1 },
          { key: 'physical_progress',   label: 'Physical Progress (%)',  min: 0,  max: 100, step: 1 },
          { key: 'actual_expenditure',  label: 'Actual Expenditure (₹)', min: 0,  max: 100000000, step: 100000 },
          { key: 'estimated_cost',      label: 'Estimated Cost (₹)',     min: 100000, max: 100000000, step: 100000 },
        ].map(({ key, label, min, max, step }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-700">{label}</label>
              <span className="text-xs font-bold text-blue-600">
                {key.includes('expenditure') || key.includes('cost')
                  ? `₹${(values[key] / 100000).toFixed(1)}L`
                  : `${values[key]}%`}
              </span>
            </div>
            <input
              type="range"
              min={min} max={max} step={step}
              value={values[key]}
              onChange={(e) => set(key, e.target.value)}
              className="w-full"
              aria-label={label}
              aria-valuenow={values[key]}
              aria-valuemin={min}
              aria-valuemax={max}
            />
          </div>
        ))}
      </div>

      <button
        onClick={run}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Simulating…' : 'Run Simulation'}
      </button>

      {result && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 font-medium">Hypothetical result — {result.note}</p>
          </div>
          <RiskScore score={result.hypothetical_risk_score} showBar size="md" />
          {result.component_scores && (
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(result.component_scores).map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-gray-400 uppercase">{k.replace('_risk', '')}</p>
                  <p className="text-sm font-bold text-gray-800">{typeof v === 'number' ? v.toFixed(0) : '—'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
