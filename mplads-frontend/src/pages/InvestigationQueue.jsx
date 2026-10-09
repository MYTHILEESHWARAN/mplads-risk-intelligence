import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ClipboardList, CheckCircle2, ArrowRight } from 'lucide-react';
import RiskBadge from '../components/ui/RiskBadge';
import RiskScore from '../components/ui/RiskScore';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import {
  fetchInvestigations,
  assignInvestigation,
  updateInvestigationStatus,
  addInvestigationNote,
} from '../services/api';
import { formatDate, getStatusColor } from '../utils/formatters';

const WORKFLOW = [
  { label: 'AI Flag', desc: 'Anomaly detected by AI engine' },
  { label: 'Officer Review', desc: 'Assigned to investigating officer' },
  { label: 'Evidence Verification', desc: 'On-site and document verification' },
  { label: 'Decision', desc: 'Officer decision based on findings' },
  { label: 'Resolution', desc: 'Case resolved or escalated' },
];

const STATUS_STEP = { New: 0, Assigned: 1, 'Under Review': 1, 'Evidence Verification': 2, Resolved: 4, Escalated: 4 };

export default function InvestigationQueue() {
  const navigate = useNavigate();
  const { addToast } = useOutletContext() || {};
  const [investigations, setInvestigations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { type, inv }
  const [actionInput, setActionInput] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetchInvestigations();
      setInvestigations(res.investigations);
      setLoading(false);
    }
    load();
  }, []);

  const handleAssign = async () => {
    if (!actionInput.trim()) return;
    await assignInvestigation(modal.inv.project_id, actionInput);
    setInvestigations((prev) =>
      prev.map((i) => i.id === modal.inv.id ? { ...i, assigned_officer: actionInput, status: 'Assigned' } : i)
    );
    addToast?.(`Officer assigned to ${modal.inv.project_id}`, 'success');
    setModal(null); setActionInput('');
  };

  const handleStatus = async (inv, newStatus) => {
    await updateInvestigationStatus(inv.project_id, newStatus, '');
    setInvestigations((prev) => prev.map((i) => i.id === inv.id ? { ...i, status: newStatus } : i));
    addToast?.(`Status updated to ${newStatus}`, 'success');
  };

  const handleNote = async () => {
    if (!actionInput.trim()) return;
    await addInvestigationNote(modal.inv.project_id, actionInput);
    addToast?.(`Note added to ${modal.inv.project_id}`, 'success');
    setModal(null); setActionInput('');
  };

  const priorityColor = (p) => p === 1 ? 'bg-red-100 text-red-700' : p === 2 ? 'bg-orange-100 text-orange-700' : p === 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700';

  if (loading) return <LoadingState message="Loading investigation queue…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investigation Queue"
        subtitle="Priority-ordered queue of projects recommended for investigation by the AI risk engine"
      />

      {/* Disclaimer */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 text-xs text-blue-800 leading-relaxed">
        <strong>Important:</strong> The AI system recommends projects for investigation based on detected anomalies. 
        All final decisions — including any determination of irregularity — rest solely with authorised human officers.
      </div>

      {/* Workflow */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Investigation Workflow</h2>
        <div className="flex items-start gap-0 overflow-x-auto pb-2">
          {WORKFLOW.map((step, i) => (
            <div key={step.label} className="flex items-center">
              <div className="flex flex-col items-center min-w-[100px]">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold mb-1">{i + 1}</div>
                <p className="text-xs font-semibold text-gray-700 text-center">{step.label}</p>
                <p className="text-[10px] text-gray-400 text-center leading-tight mt-0.5">{step.desc}</p>
              </div>
              {i < WORKFLOW.length - 1 && (
                <ArrowRight className="w-4 h-4 text-gray-300 mx-1 shrink-0 mt-[-20px]" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Queue */}
      {investigations.length === 0 ? (
        <EmptyState title="No investigations in queue" description="No projects are currently flagged for investigation." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Investigation queue">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Priority', 'Project', 'Risk Score', 'Risk Factors', 'Assigned Officer', 'Status', 'Last Updated', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {investigations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${priorityColor(inv.priority)}`}>P{inv.priority}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-gray-900">{inv.project_name}</p>
                      <p className="text-[10px] font-mono text-blue-600">{inv.project_id} · {inv.district}</p>
                    </td>
                    <td className="px-4 py-3">
                      <RiskScore score={inv.risk_score} showBar={false} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {inv.risk_factors.map((f) => (
                          <span key={f} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">{f}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {inv.assigned_officer === 'Unassigned' ? (
                        <span className="text-gray-400 italic">Unassigned</span>
                      ) : inv.assigned_officer}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(inv.status)}`}>{inv.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(inv.last_updated)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          onClick={() => navigate(`/projects/${inv.project_id}`)}
                          className="px-2 py-1 text-xs font-medium text-blue-700 border border-blue-200 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                        >
                          View
                        </button>
                        {inv.assigned_officer === 'Unassigned' && (
                          <button
                            onClick={() => { setModal({ type: 'assign', inv }); setActionInput(''); }}
                            className="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            Assign
                          </button>
                        )}
                        <button
                          onClick={() => { setModal({ type: 'note', inv }); setActionInput(''); }}
                          className="px-2 py-1 text-xs font-medium text-gray-600 border border-gray-200 bg-white rounded hover:bg-gray-50 transition-colors"
                        >
                          Note
                        </button>
                        {inv.status !== 'Resolved' && inv.status !== 'Escalated' && (
                          <>
                            <button
                              onClick={() => handleStatus(inv, 'Resolved')}
                              className="px-2 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => handleStatus(inv, 'Escalated')}
                              className="px-2 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                              Escalate
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      <Modal open={modal?.type === 'assign'} onClose={() => setModal(null)} title="Assign Investigation Officer" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Assign an officer to investigate <strong>{modal?.inv?.project_name}</strong>.</p>
          <div>
            <label htmlFor="officer" className="block text-xs font-medium text-gray-700 mb-1.5">Officer Name / ID</label>
            <input
              id="officer"
              type="text"
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              placeholder="e.g. Sh. Ramesh Kumar IAS"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleAssign} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">Assign Officer</button>
          </div>
        </div>
      </Modal>

      {/* Note Modal */}
      <Modal open={modal?.type === 'note'} onClose={() => setModal(null)} title="Add Investigation Note" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Add a note to <strong>{modal?.inv?.project_name}</strong>.</p>
          <div>
            <label htmlFor="note-input" className="block text-xs font-medium text-gray-700 mb-1.5">Note</label>
            <textarea
              id="note-input"
              rows={3}
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              placeholder="Enter observation, evidence request, or update..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleNote} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Note</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
