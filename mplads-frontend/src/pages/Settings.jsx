import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Settings as SettingsIcon, Bell, Shield, Database, Sliders, Save, CheckCircle } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { getStoredUser, fetchSettings, saveSettings } from '../services/api';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 bg-gray-50">
        <Icon className="w-4 h-4 text-blue-600" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  );
}

function Toggle({ label, desc, value, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5 ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export default function Settings() {
  const user = getStoredUser();
  const { addToast } = useOutletContext() || {};
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    alertEmail: true,
    alertSMS: false,
    criticalOnly: false,
    autoAnalysis: true,
    weeklyReport: true,
    riskThreshold: 60,
    duplicateThreshold: 80,
    mismatchThreshold: 30,
    apiUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
    financialWeight: 25,
    executionWeight: 20,
    duplicateWeight: 15,
    complianceWeight: 15,
    evidenceWeight: 25,
  });

  const set = (k, v) => setSettings((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    fetchSettings().then((data) => {
      if (data) {
        setSettings((s) => ({
          ...s,
          alertEmail: data.alert_email ?? s.alertEmail,
          alertSMS: data.alert_sms ?? s.alertSMS,
          criticalOnly: data.critical_alerts_only ?? s.criticalOnly,
          weeklyReport: data.weekly_report ?? s.weeklyReport,
          autoAnalysis: data.auto_analysis ?? s.autoAnalysis,
          riskThreshold: data.risk_threshold_alert ?? s.riskThreshold,
          duplicateThreshold: data.duplicate_semantic_threshold ?? s.duplicateThreshold,
          mismatchThreshold: data.mismatch_high_threshold ?? s.mismatchThreshold,
          financialWeight: Math.round((data.weight_financial ?? 0.25) * 100),
          executionWeight: Math.round((data.weight_execution ?? 0.20) * 100),
          duplicateWeight: Math.round((data.weight_duplicate ?? 0.15) * 100),
          complianceWeight: Math.round((data.weight_compliance ?? 0.15) * 100),
          evidenceWeight: Math.round((data.weight_evidence ?? 0.25) * 100),
        }));
      }
    });
  }, []);

  const handleSave = async () => {
    const total = settings.financialWeight + settings.executionWeight +
      settings.duplicateWeight + settings.complianceWeight + settings.evidenceWeight;
    if (Math.abs(total - 100) > 1) {
      addToast?.(`Weights must sum to 100%. Current total: ${total}%`, 'error');
      return;
    }
    try {
      const result = await saveSettings({
        weight_financial: settings.financialWeight / 100,
        weight_execution: settings.executionWeight / 100,
        weight_duplicate: settings.duplicateWeight / 100,
        weight_compliance: settings.complianceWeight / 100,
        weight_evidence: settings.evidenceWeight / 100,
        risk_threshold_alert: settings.riskThreshold,
        duplicate_semantic_threshold: settings.duplicateThreshold,
        mismatch_high_threshold: settings.mismatchThreshold,
        alert_email: settings.alertEmail,
        alert_sms: settings.alertSMS,
        critical_alerts_only: settings.criticalOnly,
        weekly_report: settings.weeklyReport,
        auto_analysis: settings.autoAnalysis,
      });
      if (result?.success) {
        setSaved(true);
        addToast?.(result.message || 'Settings saved.', 'success');
        setTimeout(() => setSaved(false), 2500);
      } else {
        addToast?.(result?.message || 'Failed to save settings.', 'error');
      }
    } catch {
      addToast?.('Failed to save settings. Backend may be offline.', 'error');
      setSaved(true); // still show visual feedback
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const inputClass = "px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader
        title="Settings"
        subtitle="Configure risk thresholds, notifications, and system preferences"
        actions={
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        }
      />

      {/* Profile */}
      <Section title="User Profile" icon={Shield}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Name</label>
            <input type="text" defaultValue={user?.name} className={inputClass} aria-label="User name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Role</label>
            <input type="text" defaultValue={user?.role} className={inputClass} readOnly aria-label="User role" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Officer ID</label>
            <input type="text" defaultValue={user?.id} className={inputClass} readOnly aria-label="Officer ID" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
            <input type="email" defaultValue="officer@mplads.gov.in" className={inputClass} aria-label="Email address" />
          </div>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" icon={Bell}>
        <Toggle label="Email Alerts" desc="Receive critical risk alerts via email" value={settings.alertEmail} onChange={(v) => set('alertEmail', v)} />
        <Toggle label="SMS Alerts" desc="Receive urgent alerts via SMS" value={settings.alertSMS} onChange={(v) => set('alertSMS', v)} />
        <Toggle label="Critical Alerts Only" desc="Only notify for CRITICAL severity alerts" value={settings.criticalOnly} onChange={(v) => set('criticalOnly', v)} />
        <Toggle label="Weekly Summary Report" desc="Receive a weekly risk summary report" value={settings.weeklyReport} onChange={(v) => set('weeklyReport', v)} />
      </Section>

      {/* Risk Thresholds */}
      <Section title="Risk Thresholds" icon={Sliders}>
        <p className="text-xs text-gray-500">Adjust thresholds that trigger alerts and flags. Changes take effect on the next analysis run.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Risk Score Alert Threshold', key: 'riskThreshold', min: 0, max: 100, unit: '/100' },
            { label: 'Duplicate Detection Threshold', key: 'duplicateThreshold', min: 50, max: 100, unit: '%' },
            { label: 'Progress Mismatch Threshold', key: 'mismatchThreshold', min: 5, max: 60, unit: 'pp' },
          ].map(({ label, key, min, max, unit }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={settings[key]}
                  onChange={(e) => set(key, Number(e.target.value))}
                  className="flex-1"
                  aria-label={label}
                  aria-valuenow={settings[key]}
                  aria-valuemin={min}
                  aria-valuemax={max}
                />
                <span className="text-sm font-bold text-blue-700 w-14 text-right">{settings[key]}{unit}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Risk Score Weights */}
      <Section title="Risk Score Weights" icon={Sliders}>
        <p className="text-xs text-gray-500 mb-2">Weights must sum to 100%. Current total: {settings.financialWeight + settings.executionWeight + settings.duplicateWeight + settings.complianceWeight + settings.evidenceWeight}%</p>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {[
            { label: 'Financial', key: 'financialWeight' },
            { label: 'Execution', key: 'executionWeight' },
            { label: 'Duplicate', key: 'duplicateWeight' },
            { label: 'Compliance', key: 'complianceWeight' },
            { label: 'Evidence', key: 'evidenceWeight' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={settings[key]}
                  onChange={(e) => set(key, Number(e.target.value))}
                  className="w-16 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                  aria-label={`${label} weight`}
                />
                <span className="text-xs text-gray-500">%</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* API & System */}
      <Section title="API & System" icon={Database}>
        <Toggle label="Automatic Re-analysis" desc="Automatically re-analyse projects when new data is available" value={settings.autoAnalysis} onChange={(v) => set('autoAnalysis', v)} />
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Backend API URL</label>
          <input
            type="url"
            value={settings.apiUrl}
            onChange={(e) => set('apiUrl', e.target.value)}
            className={inputClass}
            aria-label="Backend API URL"
          />
          <p className="text-xs text-gray-400 mt-1">Configure via VITE_API_BASE_URL environment variable.</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
          <strong>Demo Mode:</strong> The frontend is currently using mock data. Connect a live FastAPI backend and set the API URL above to use real data.
        </div>
      </Section>
    </div>
  );
}
