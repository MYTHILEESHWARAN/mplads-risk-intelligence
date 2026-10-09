import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { AlertTriangle, Bell, Filter } from 'lucide-react';
import RiskBadge from '../components/ui/RiskBadge';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import { fetchAlerts, markAlertReviewed } from '../services/api';
import { formatDate, getStatusColor, getAlertTypeLabel, getRiskColor } from '../utils/formatters';

const ALERT_TYPE_COLORS = {
  FINANCIAL_ANOMALY: 'bg-red-100 text-red-700',
  PROGRESS_MISMATCH: 'bg-orange-100 text-orange-700',
  POSSIBLE_DUPLICATE: 'bg-purple-100 text-purple-700',
  DELAY_WARNING: 'bg-yellow-100 text-yellow-700',
  COMPLIANCE_VIOLATION: 'bg-blue-100 text-blue-700',
  MISSING_EVIDENCE: 'bg-gray-100 text-gray-700',
};

export default function RiskAlerts() {
  const navigate = useNavigate();
  const { addToast } = useOutletContext() || {};
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ severity: '', status: '', type: '' });

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetchAlerts(filters);
      setAlerts(res.alerts);
      setLoading(false);
    }
    load();
  }, [filters]);

  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const selectClass = "px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  const handleMarkReviewed = async (alert) => {
    try {
      await markAlertReviewed(alert.alert_id);
      setAlerts((prev) => prev.map((a) =>
        a.id === alert.id ? { ...a, status: 'Under Review' } : a
      ));
      addToast?.(`Alert ${alert.alert_id} marked as Under Review.`, 'success');
    } catch {
      addToast?.('Failed to update alert status.', 'error');
    }
  };

  const counts = {
    total: alerts.length,
    new: alerts.filter((a) => a.status === 'New').length,
    critical: alerts.filter((a) => a.severity === 'CRITICAL').length,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Risk Alerts"
        subtitle="AI-generated anomaly and risk alerts requiring officer review"
        actions={
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-md">{counts.critical} Critical</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-md">{counts.new} New</span>
          </div>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-gray-400" aria-hidden="true" />
        <select aria-label="Filter by severity" value={filters.severity} onChange={(e) => setFilter('severity', e.target.value)} className={selectClass}>
          <option value="">All Severities</option>
          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select aria-label="Filter by status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={selectClass}>
          <option value="">All Statuses</option>
          {['New', 'Under Review', 'Resolved', 'Escalated'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select aria-label="Filter by type" value={filters.type} onChange={(e) => setFilter('type', e.target.value)} className={selectClass}>
          <option value="">All Types</option>
          {['FINANCIAL_ANOMALY', 'PROGRESS_MISMATCH', 'POSSIBLE_DUPLICATE', 'DELAY_WARNING', 'COMPLIANCE_VIOLATION', 'MISSING_EVIDENCE'].map((t) => (
            <option key={t} value={t}>{getAlertTypeLabel(t)}</option>
          ))}
        </select>
        <button onClick={() => setFilters({ severity: '', status: '', type: '' })} className="text-xs text-gray-500 hover:text-gray-700 underline">Clear</button>
      </div>

      {loading ? <LoadingState message="Loading alerts…" /> : alerts.length === 0 ? (
        <EmptyState title="No alerts found" description="Try clearing filters or check back later." />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const c = getRiskColor(alert.severity);
            return (
              <div key={alert.id} className={`bg-white rounded-xl border ${c.border} shadow-sm p-4 hover:shadow-md transition-shadow`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${c.bg} mt-0.5 shrink-0`}>
                      <AlertTriangle className={`w-4 h-4 ${c.text}`} aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <RiskBadge level={alert.severity} />
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ALERT_TYPE_COLORS[alert.alert_type] || 'bg-gray-100 text-gray-700'}`}>
                          {getAlertTypeLabel(alert.alert_type)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(alert.status)}`}>{alert.status}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{alert.project_name}</p>
                      <p className="text-xs font-mono text-blue-600 mt-0.5">{alert.project_id} · {alert.district}</p>
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed max-w-2xl">{alert.reason}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{alert.risk_score}<span className="text-xs font-normal text-gray-400">/100</span></p>
                      <p className="text-[10px] text-gray-400">Risk Score</p>
                    </div>
                    <p className="text-xs text-gray-400">{formatDate(alert.detected_date)}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/projects/${alert.project_id}`)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => navigate('/investigations')}
                        className="px-3 py-1.5 text-xs font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        Investigate
                      </button>
                      <button
                        onClick={() => handleMarkReviewed(alert)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Mark Reviewed
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
