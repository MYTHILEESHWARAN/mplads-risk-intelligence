import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Plus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import RiskBadge from '../components/ui/RiskBadge';
import RiskScore from '../components/ui/RiskScore';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import Modal from '../components/ui/Modal';
import { fetchProjects, createProject } from '../services/api';
import { formatCurrency, getStatusColor } from '../utils/formatters';
import { DEMO_PROJECTS } from '../data/mockData';

const DISTRICTS = [...new Set(DEMO_PROJECTS.map((p) => p.district))].sort();
const STATES    = [...new Set(DEMO_PROJECTS.map((p) => p.state))].sort();
const AGENCIES  = [...new Set(DEMO_PROJECTS.map((p) => p.agency))].sort();

const PROJECT_TYPES = [
  'Road Construction','Water Supply','Healthcare','Education','Infrastructure',
  'Flood Management','Electrification','Irrigation','Government Building',
  'Bridge','Agriculture','Renewable Energy','Sanitation','Sports','Other',
];

const EMPTY_FORM = {
  project_id:'',project_name:'',state:'',district:'',agency:'',
  project_type:'',mp_name:'',constituency:'',
  sanction_amount:'',estimated_cost:'',actual_expenditure:'',
  financial_progress:'',physical_progress:'',
  expected_completion_date:'',status:'In Progress',
};

function FormField({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-0.5 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />{error}
        </p>
      )}
    </div>
  );
}

function validateForm(f) {
  const e = {};
  if (!f.project_id.trim()) e.project_id = 'Project ID is required.';
  else if (!/^[A-Za-z0-9\-_]+$/.test(f.project_id)) e.project_id = 'Only letters, numbers, hyphens, underscores.';
  if (!f.project_name.trim()) e.project_name = 'Project name is required.';
  if (!f.state.trim()) e.state = 'State is required.';
  if (!f.district.trim()) e.district = 'District is required.';
  if (!f.agency.trim()) e.agency = 'Implementing agency is required.';
  if (!f.project_type) e.project_type = 'Project type is required.';
  const san = parseFloat(f.sanction_amount);
  if (!f.sanction_amount) e.sanction_amount = 'Sanctioned amount is required.';
  else if (isNaN(san) || san < 0) e.sanction_amount = 'Must be a non-negative number.';
  const est = parseFloat(f.estimated_cost);
  if (!f.estimated_cost) e.estimated_cost = 'Estimated cost is required.';
  else if (isNaN(est) || est < 0) e.estimated_cost = 'Must be a non-negative number.';
  if (f.actual_expenditure !== '') {
    const exp = parseFloat(f.actual_expenditure);
    if (isNaN(exp) || exp < 0) e.actual_expenditure = 'Must be a non-negative number.';
  }
  if (f.financial_progress !== '') {
    const fp = parseFloat(f.financial_progress);
    if (isNaN(fp) || fp < 0 || fp > 100) e.financial_progress = 'Must be 0-100.';
  }
  if (f.physical_progress !== '') {
    const pp = parseFloat(f.physical_progress);
    if (isNaN(pp) || pp < 0 || pp > 100) e.physical_progress = 'Must be 0-100.';
  }
  return e;
}

export default function Projects() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState(null);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    district:'',state:'',risk_level:'',status:'',agency:'',
    sort: searchParams.get('sort') || 'risk_desc',
    page:1,limit:10,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchProjects(filters);
      setProjects(res.projects);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key, value) =>
    setFilters((f) => ({ ...f, [key]: value, page:1 }));

  const clearFilters = () =>
    setFilters({search:'',district:'',state:'',risk_level:'',status:'',agency:'',sort:'risk_desc',page:1,limit:10});

  const handleField = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => { const n = {...e}; delete n[k]; return n; });
  };

  const handleOpenModal = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setSubmitMsg(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateForm(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const payload = {
        project_id:           form.project_id.trim().toUpperCase(),
        project_name:         form.project_name.trim(),
        mp_name:              form.mp_name.trim() || 'Not specified',
        constituency:         form.constituency.trim() || 'Not specified',
        district:             form.district.trim(),
        state:                form.state.trim(),
        project_type:         form.project_type,
        agency:               form.agency.trim(),
        sanction_amount:      parseFloat(form.sanction_amount),
        estimated_cost:       parseFloat(form.estimated_cost),
        actual_expenditure:   form.actual_expenditure  !== '' ? parseFloat(form.actual_expenditure)  : 0,
        financial_progress:   form.financial_progress  !== '' ? parseFloat(form.financial_progress)  : 0,
        physical_progress:    form.physical_progress   !== '' ? parseFloat(form.physical_progress)   : 0,
        expected_completion_date: form.expected_completion_date || null,
        status:               form.status,
      };
      await createProject(payload);
      setSubmitMsg({ type:'success', text:`Project ${payload.project_id} created. Open the project and click Re-analyse to generate risk scores.` });
      window.dispatchEvent(new CustomEvent('dashboard:refresh'));
      await load();
      setTimeout(() => setModalOpen(false), 2200);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'object' ? detail?.message : (detail || 'Failed to save. Please try again.');
      if (err?.response?.status === 409) {
        setErrors({ project_id: msg });
        setSubmitMsg({ type:'error', text: msg });
      } else {
        setSubmitMsg({ type:'error', text: msg });
      }
    } finally { setSubmitting(false); }
  };

  const ic = (field) =>
    `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`;
  const sc = "px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Projects"
        subtitle={`${total} project${total !== 1 ? 's' : ''} found`}
        actions={
          <button onClick={handleOpenModal}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
            aria-label="Add new project">
            <Plus className="w-4 h-4" aria-hidden="true" />Add Project
          </button>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
            <input type="search" placeholder="Search project name, ID, MP..." value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search projects" />
          </div>
          <select aria-label="Filter by district" value={filters.district} onChange={(e) => setFilter('district', e.target.value)} className={sc}>
            <option value="">All Districts</option>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}
          </select>
          <select aria-label="Filter by state" value={filters.state} onChange={(e) => setFilter('state', e.target.value)} className={sc}>
            <option value="">All States</option>{STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select aria-label="Filter by risk level" value={filters.risk_level} onChange={(e) => setFilter('risk_level', e.target.value)} className={sc}>
            <option value="">All Risk Levels</option>{['LOW','MEDIUM','HIGH','CRITICAL'].map((r) => <option key={r}>{r}</option>)}
          </select>
          <select aria-label="Filter by status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={sc}>
            <option value="">All Statuses</option>{['In Progress','Completed','Delayed','Not Started'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <div className="flex gap-2">
            <select aria-label="Sort order" value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)} className={`${sc} flex-1`}>
              <option value="risk_desc">Highest Risk</option>
              <option value="risk_asc">Lowest Risk</option>
              <option value="amount_desc">Highest Amount</option>
            </select>
            <button onClick={clearFilters} className="px-2.5 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap" aria-label="Clear all filters">Clear</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <LoadingState message="Loading projects..." /> : projects.length === 0 ? (
          <EmptyState title="No projects found" description="Try adjusting filters, or add the first project using the button above." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Projects list">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Project ID','Project Name','MP','Constituency','District','Type','Sanctioned','Expenditure','Progress','Risk Score','Status','Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {projects.map((p) => (
                  <tr key={p.project_id} className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/projects/${p.project_id}`)}
                    tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/projects/${p.project_id}`)}
                    aria-label={`View project ${p.project_name}`}>
                    <td className="px-4 py-3 text-xs font-mono text-blue-600">{p.project_id}</td>
                    <td className="px-4 py-3 text-xs text-gray-800 max-w-[160px]"><span className="block truncate" title={p.project_name}>{p.project_name}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[120px]"><span className="block truncate" title={p.mp_name}>{p.mp_name}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{p.constituency}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{p.district}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{p.project_type}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{formatCurrency(p.sanction_amount)}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{formatCurrency(p.actual_expenditure)}</td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex flex-col gap-1 min-w-[80px]">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400 w-3">F</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5"><div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${p.financial_progress ?? 0}%` }} /></div>
                          <span className="text-[10px] text-gray-500">{p.financial_progress ?? 0}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400 w-3">P</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5"><div className="h-1.5 rounded-full bg-green-500" style={{ width: `${p.physical_progress ?? 0}%` }} /></div>
                          <span className="text-[10px] text-gray-500">{p.physical_progress ?? 0}%</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.risk_score != null
                        ? <RiskScore score={p.risk_score} showBar={false} size="sm" />
                        : <span className="text-[10px] text-gray-400 italic">Pending</span>}
                    </td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(p.status)}`}>{p.status}</span></td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => navigate(`/projects/${p.project_id}`)} className="px-2.5 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Page {filters.page} of {totalPages} - {total} projects</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))} disabled={filters.page === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((pg) => (
                <button key={pg} onClick={() => setFilters((f) => ({ ...f, page: pg }))} className={`w-7 h-7 text-xs rounded-lg transition-colors ${filters.page === pg ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`} aria-label={`Page ${pg}`} aria-current={filters.page === pg ? 'page' : undefined}>{pg}</button>
              ))}
              <button onClick={() => setFilters((f) => ({ ...f, page: Math.min(totalPages, f.page + 1) }))} disabled={filters.page === totalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Add Project Modal */}
      <Modal open={modalOpen} onClose={() => !submitting && setModalOpen(false)} title="Add New Project" size="lg">
        <form onSubmit={handleSubmit} noValidate>
          {submitMsg && (
            <div className={`mb-4 flex items-start gap-2 px-4 py-3 rounded-lg text-sm border ${submitMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`} role="alert">
              {submitMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{submitMsg.text}</span>
            </div>
          )}
          <div className="space-y-5">
            {/* Identity */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Project Identity</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Project ID" required error={errors.project_id}>
                  <input type="text" value={form.project_id} onChange={(e) => handleField('project_id', e.target.value.toUpperCase())} placeholder="e.g. MPL-2025-001" className={ic('project_id')} aria-required="true" />
                </FormField>
                <FormField label="Project Name" required error={errors.project_name}>
                  <input type="text" value={form.project_name} onChange={(e) => handleField('project_name', e.target.value)} placeholder="e.g. Rural Road Construction Phase 2" className={ic('project_name')} aria-required="true" />
                </FormField>
                <FormField label="Project Type" required error={errors.project_type}>
                  <select value={form.project_type} onChange={(e) => handleField('project_type', e.target.value)} className={ic('project_type')} aria-required="true">
                    <option value="">Select type...</option>
                    {PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </FormField>
                <FormField label="Status">
                  <select value={form.status} onChange={(e) => handleField('status', e.target.value)} className={ic('status')}>
                    {['In Progress','Not Started','Completed','Delayed'].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </FormField>
              </div>
            </div>
            {/* Location */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Location</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="State" required error={errors.state}>
                  <input type="text" value={form.state} onChange={(e) => handleField('state', e.target.value)} placeholder="e.g. Uttar Pradesh" className={ic('state')} aria-required="true" list="dl-states" />
                  <datalist id="dl-states">{STATES.map((s) => <option key={s} value={s} />)}</datalist>
                </FormField>
                <FormField label="District" required error={errors.district}>
                  <input type="text" value={form.district} onChange={(e) => handleField('district', e.target.value)} placeholder="e.g. Varanasi" className={ic('district')} aria-required="true" list="dl-districts" />
                  <datalist id="dl-districts">{DISTRICTS.map((d) => <option key={d} value={d} />)}</datalist>
                </FormField>
                <FormField label="Implementing Agency" required error={errors.agency}>
                  <input type="text" value={form.agency} onChange={(e) => handleField('agency', e.target.value)} placeholder="e.g. PWD Uttar Pradesh" className={ic('agency')} aria-required="true" list="dl-agencies" />
                  <datalist id="dl-agencies">{AGENCIES.map((a) => <option key={a} value={a} />)}</datalist>
                </FormField>
              </div>
            </div>
            {/* MP Details */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">MP Details <span className="font-normal normal-case text-gray-400">(optional)</span></p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="MP Name"><input type="text" value={form.mp_name} onChange={(e) => handleField('mp_name', e.target.value)} placeholder="e.g. Sh. Rajesh Kumar Sharma" className={ic('mp_name')} /></FormField>
                <FormField label="Constituency"><input type="text" value={form.constituency} onChange={(e) => handleField('constituency', e.target.value)} placeholder="e.g. Varanasi North" className={ic('constituency')} /></FormField>
              </div>
            </div>
            {/* Financials */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Financials (Rs.)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Sanctioned Amount" required error={errors.sanction_amount}><input type="number" min="0" step="1000" value={form.sanction_amount} onChange={(e) => handleField('sanction_amount', e.target.value)} placeholder="e.g. 2500000" className={ic('sanction_amount')} aria-required="true" /></FormField>
                <FormField label="Estimated Cost" required error={errors.estimated_cost}><input type="number" min="0" step="1000" value={form.estimated_cost} onChange={(e) => handleField('estimated_cost', e.target.value)} placeholder="e.g. 2500000" className={ic('estimated_cost')} aria-required="true" /></FormField>
                <FormField label="Actual Expenditure" error={errors.actual_expenditure}><input type="number" min="0" step="1000" value={form.actual_expenditure} onChange={(e) => handleField('actual_expenditure', e.target.value)} placeholder="e.g. 1200000" className={ic('actual_expenditure')} /></FormField>
              </div>
            </div>
            {/* Progress */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Progress</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Financial Progress (%)" error={errors.financial_progress}><input type="number" min="0" max="100" step="0.1" value={form.financial_progress} onChange={(e) => handleField('financial_progress', e.target.value)} placeholder="0-100" className={ic('financial_progress')} /></FormField>
                <FormField label="Physical Progress (%)" error={errors.physical_progress}><input type="number" min="0" max="100" step="0.1" value={form.physical_progress} onChange={(e) => handleField('physical_progress', e.target.value)} placeholder="0-100" className={ic('physical_progress')} /></FormField>
                <FormField label="Expected Completion Date"><input type="date" value={form.expected_completion_date} onChange={(e) => handleField('expected_completion_date', e.target.value)} className={ic('expected_completion_date')} /></FormField>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <strong>Note:</strong> Risk scores are not assigned on creation. Open the project after saving and click <strong>Re-analyse</strong> to run the AI risk engine.
          </div>
          <div className="mt-4 flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => !submitting && setModalOpen(false)} disabled={submitting} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={submitting} className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 shadow-sm">
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
              {submitting ? 'Saving...' : 'Save Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
