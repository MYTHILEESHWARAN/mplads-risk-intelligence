// ============================================================
// MPLADS Risk Intelligence — API Service Layer
// Falls back to demo data if backend is unavailable.
// ============================================================

import axios from 'axios';
import {
  DEMO_PROJECTS,
  DEMO_ALERTS,
  DEMO_INVESTIGATIONS,
  DEMO_EVIDENCE,
  DEMO_COMPLIANCE,
  DEMO_DASHBOARD,
  DEMO_ANALYTICS,
  RISK_MAP_DATA,
} from '../data/mockData';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

// Intercept auth token
apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('mplads_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---- helpers ----
let usingDemoData = false;

export const isUsingDemoData = () => usingDemoData;

function setDemo(val) {
  usingDemoData = val;
}

async function safeGet(path, fallback) {
  try {
    const res = await apiClient.get(path);
    setDemo(false);
    return res.data;
  } catch {
    setDemo(true);
    return fallback;
  }
}

async function safePost(path, body, fallback) {
  try {
    const res = await apiClient.post(path, body);
    setDemo(false);
    return res.data;
  } catch {
    setDemo(true);
    return fallback;
  }
}

// ---- sleep for simulated latency in demo ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ============================================================
// AUTH (demo only — real auth would use JWT endpoints)
// ============================================================
export async function loginDemo(role) {
  await sleep(600);
  const tokens = {
    'MP / Constituency': { name: 'Sh. Rajesh Kumar Sharma', role: 'MP / Constituency', id: 'MP-001' },
    'District Officer': { name: 'Smt. Priya Sharma IAS', role: 'District Officer', id: 'DO-042' },
    'State Nodal Officer': { name: 'Sh. Vijay Kumar IAS', role: 'State Nodal Officer', id: 'SNO-07' },
    'Ministry Officer': { name: 'Sh. Arun Tiwari', role: 'Ministry Officer', id: 'MIN-003' },
  };
  const user = tokens[role] || tokens['District Officer'];
  sessionStorage.setItem('mplads_user', JSON.stringify(user));
  sessionStorage.setItem('mplads_token', 'demo_token_' + Date.now());
  return user;
}

export function getStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem('mplads_user'));
  } catch {
    return null;
  }
}

export function logout() {
  sessionStorage.removeItem('mplads_user');
  sessionStorage.removeItem('mplads_token');
}

// ============================================================
// DASHBOARD
// ============================================================
export async function fetchDashboard() {
  const live = await safeGet('/api/dashboard', null);
  if (live) return live;
  await sleep(400);
  // Demo fallback: compute all counts from the live DEMO_PROJECTS array so newly
  // created projects are reflected immediately without a backend.
  const projects = DEMO_PROJECTS;
  const riskDist = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  projects.forEach((p) => {
    const level = p.risk_level || 'LOW';
    riskDist[level] = (riskDist[level] || 0) + 1;
  });
  return {
    total_projects:        projects.length,
    active_projects:       projects.filter((p) => p.status === 'In Progress').length,
    high_risk_projects:    projects.filter((p) => ['HIGH', 'CRITICAL'].includes(p.risk_level)).length,
    critical_alerts:       DEMO_DASHBOARD.critical_alerts,
    total_sanctioned_amount: projects.reduce((s, p) => s + (p.sanction_amount || 0), 0),
    total_expenditure:     projects.reduce((s, p) => s + (p.actual_expenditure || 0), 0),
    risk_distribution:     riskDist,
    monthly_alert_trends:  DEMO_DASHBOARD.monthly_alert_trends,
    top_risk_projects:     [...projects]
      .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
      .slice(0, 8),
    financial_vs_physical: projects.slice(0, 10).map((p) => ({
      name: p.project_id,
      financial: p.financial_progress || 0,
      physical:  p.physical_progress  || 0,
    })),
  };
}

// ============================================================
// PROJECTS
// ============================================================
export async function fetchProjects(params = {}) {
  const live = await safeGet('/api/projects?' + new URLSearchParams(params).toString(), null);
  if (live) return live;
  await sleep(350);
  let list = [...DEMO_PROJECTS];
  if (params.search) {
    const q = params.search.toLowerCase();
    list = list.filter(
      (p) =>
        p.project_name.toLowerCase().includes(q) ||
        p.project_id.toLowerCase().includes(q) ||
        p.mp_name.toLowerCase().includes(q)
    );
  }
  if (params.district) list = list.filter((p) => p.district === params.district);
  if (params.state) list = list.filter((p) => p.state === params.state);
  if (params.risk_level) list = list.filter((p) => p.risk_level === params.risk_level);
  if (params.status) list = list.filter((p) => p.status === params.status);
  if (params.agency) list = list.filter((p) => p.agency === params.agency);
  if (params.sort === 'risk_desc') list.sort((a, b) => b.risk_score - a.risk_score);
  if (params.sort === 'risk_asc') list.sort((a, b) => a.risk_score - b.risk_score);
  if (params.sort === 'amount_desc') list.sort((a, b) => b.sanction_amount - a.sanction_amount);
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 10;
  const start = (page - 1) * limit;
  return {
    projects: list.slice(start, start + limit),
    total: list.length,
    page,
    limit,
    total_pages: Math.ceil(list.length / limit),
  };
}

export async function createProject(data) {
  // Try live backend first � on 409 (duplicate ID) re-throw so the form can show the error.
  try {
    const res = await apiClient.post('/api/projects', data);
    setDemo(false);
    return res.data;
  } catch (err) {
    // If backend is unreachable, simulate demo save
    if (!err.response) {
      setDemo(true);
      await sleep(600);
      const demoProject = {
        ...data,
        id: Date.now(),
        risk_score: null,
        risk_level: null,
        analysis_status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      // Push into demo data so the list shows it in this session
      DEMO_PROJECTS.unshift(demoProject);
      return { success: true, message: 'Project saved in demo mode. Risk analysis pending.', project: demoProject };
    }
    // Backend returned an error (e.g. 409 duplicate) � surface it
    throw err;
  }
}
export async function fetchProject(projectId) {
  const live = await safeGet(`/api/projects/${projectId}`, null);
  if (live) return live;
  await sleep(300);
  const p = DEMO_PROJECTS.find((x) => x.project_id === projectId);
  if (!p) throw new Error('Project not found');
  return p;
}

export async function fetchProjectRisk(projectId) {
  const live = await safeGet(`/api/projects/${projectId}/risk`, null);
  if (live) return live;
  await sleep(300);
  const p = DEMO_PROJECTS.find((x) => x.project_id === projectId);
  if (!p) throw new Error('Project not found');
  return {
    financial_risk: p.financial_risk,
    execution_risk: p.execution_risk,
    duplicate_risk: p.duplicate_risk,
    compliance_risk: p.compliance_risk,
    evidence_risk: p.evidence_risk,
    unified_risk_score: p.risk_score,
    risk_level: p.risk_level,
    flagged_reasons: generateFlaggedReasons(p),
    mismatch: p.financial_progress - p.physical_progress,
    mismatch_level: getMismatchLevel(p.financial_progress - p.physical_progress),
  };
}

export async function fetchProjectDuplicates(projectId) {
  const live = await safeGet(`/api/projects/${projectId}/duplicates`, null);
  if (live) return live;
  await sleep(300);
  const duplicatePairs = {
    'MPL-1003': {
      semantic_similarity: 92,
      geographical_similarity: 96,
      distance_km: 0.7,
      matched_project: DEMO_PROJECTS.find((x) => x.project_id === 'MPL-1004'),
      duplicate_risk: 92,
    },
    'MPL-1004': {
      semantic_similarity: 92,
      geographical_similarity: 96,
      distance_km: 0.7,
      matched_project: DEMO_PROJECTS.find((x) => x.project_id === 'MPL-1003'),
      duplicate_risk: 92,
    },
  };
  return duplicatePairs[projectId] || { semantic_similarity: 0, geographical_similarity: 0, distance_km: null, matched_project: null, duplicate_risk: 0 };
}

export async function analyzeProject(projectId) {
  return await safePost(`/api/projects/${projectId}/analyze`, {}, { success: true, message: 'Analysis queued (demo mode)' });
}

export async function fetchProjectRuns(projectId) {
  return await safeGet(`/api/projects/${projectId}/runs`, { runs: [], total: 0 });
}

// ============================================================
// ALERTS
// ============================================================
export async function fetchAlerts(params = {}) {
  const live = await safeGet('/api/alerts?' + new URLSearchParams(params).toString(), null);
  if (live) return live;
  await sleep(300);
  let list = [...DEMO_ALERTS];
  if (params.severity) list = list.filter((a) => a.severity === params.severity);
  if (params.status) list = list.filter((a) => a.status === params.status);
  if (params.type) list = list.filter((a) => a.alert_type === params.type);
  return { alerts: list, total: list.length };
}

export async function markAlertReviewed(alertId) {
  try {
    const res = await apiClient.patch(`/api/alerts/${alertId}/status`, { status: 'Under Review' });
    setDemo(false);
    return res.data;
  } catch (err) {
    if (!err.response) {
      setDemo(true);
      return { success: true, message: 'Status updated (demo mode)' };
    }
    throw err;
  }
}

// ============================================================
// INVESTIGATIONS
// ============================================================
export async function fetchInvestigations(params = {}) {
  const live = await safeGet('/api/investigations?' + new URLSearchParams(params).toString(), null);
  if (live) return live;
  await sleep(300);
  return { investigations: DEMO_INVESTIGATIONS, total: DEMO_INVESTIGATIONS.length };
}

export async function assignInvestigation(projectId, officerName) {
  return await safePost(
    `/api/investigations/${projectId}/assign`,
    { officer_name: officerName },
    { success: true, message: 'Officer assigned (demo mode)' }
  );
}

export async function updateInvestigationStatus(projectId, status, notes) {
  return await safePost(
    `/api/investigations/${projectId}/status`,
    { status, notes },
    { success: true, message: 'Status updated (demo mode)' }
  );
}

export async function addInvestigationNote(projectId, note, actor = 'Officer') {
  return await safePost(
    `/api/investigations/${projectId}/note`,
    { note, actor },
    { success: true, message: 'Note added (demo mode)' }
  );
}

// ============================================================
// ANALYTICS
// ============================================================
export async function fetchAnalytics(params = {}) {
  const live = await safeGet('/api/analytics?' + new URLSearchParams(params).toString(), null);
  if (live) return live;
  await sleep(400);
  return DEMO_ANALYTICS;
}

// ============================================================
// RISK MAP
// ============================================================
export async function fetchRiskMap() {
  const live = await safeGet('/api/risk-map', null);
  if (live) return live;
  await sleep(300);
  return { projects: RISK_MAP_DATA };
}

// ============================================================
// EVIDENCE
// ============================================================
export async function fetchEvidence(params = {}) {
  const live = await safeGet('/api/evidence?' + new URLSearchParams(params).toString(), null);
  if (live) return live;
  await sleep(300);
  let list = [...DEMO_EVIDENCE];
  if (params.project_id) list = list.filter((e) => e.project_id === params.project_id);
  if (params.status) list = list.filter((e) => e.verification_status === params.status);
  return { evidence: list, total: list.length };
}

export async function fetchProjectEvidence(projectId) {
  return fetchEvidence({ project_id: projectId });
}

// ============================================================
// COMPLIANCE
// ============================================================
export async function fetchCompliance(params = {}) {
  const live = await safeGet('/api/compliance?' + new URLSearchParams(params).toString(), null);
  if (live) return live;
  await sleep(300);
  let list = [...DEMO_COMPLIANCE];
  if (params.project_id) list = list.filter((c) => c.project_id === params.project_id);
  return { compliance: list, total: list.length };
}

export async function fetchProjectCompliance(projectId) {
  return fetchCompliance({ project_id: projectId });
}

// ============================================================
// SETTINGS
// ============================================================
export async function fetchSettings() {
  return await safeGet('/api/settings', null);
}

export async function saveSettings(data) {
  try {
    const res = await apiClient.put('/api/settings', data);
    setDemo(false);
    return res.data;
  } catch (err) {
    if (!err.response) {
      setDemo(true);
      return { success: true, message: 'Settings saved (demo mode — not persisted to backend)' };
    }
    throw err;
  }
}

// ============================================================
// HEALTH CHECK
// ============================================================
export async function checkHealth() {
  try {
    const res = await apiClient.get('/api/health', { timeout: 3000 });
    return { online: true, data: res.data };
  } catch {
    return { online: false };
  }
}

// ============================================================
// UTILITY HELPERS
// ============================================================
function getMismatchLevel(mismatch) {
  if (mismatch <= 10) return 'LOW';
  if (mismatch <= 30) return 'MEDIUM';
  if (mismatch <= 50) return 'HIGH';
  return 'CRITICAL';
}

function generateFlaggedReasons(p) {
  const reasons = [];
  const mismatch = p.financial_progress - p.physical_progress;
  const expenditureRatio = p.actual_expenditure / p.estimated_cost;

  if (expenditureRatio > 1.3)
    reasons.push({ icon: 'trending-up', severity: 'CRITICAL', text: `Actual expenditure is ${Math.round((expenditureRatio - 1) * 100)}% above the estimated cost for comparable projects.` });
  else if (expenditureRatio > 1.1)
    reasons.push({ icon: 'trending-up', severity: 'HIGH', text: `Actual expenditure is ${Math.round((expenditureRatio - 1) * 100)}% above the estimated cost.` });

  if (mismatch > 40)
    reasons.push({ icon: 'bar-chart-2', severity: 'CRITICAL', text: `Financial progress is ${mismatch} percentage points ahead of physical progress — a significant mismatch.` });
  else if (mismatch > 20)
    reasons.push({ icon: 'bar-chart-2', severity: 'HIGH', text: `Financial progress is ${mismatch} percentage points ahead of physical progress.` });
  else if (mismatch > 10)
    reasons.push({ icon: 'bar-chart-2', severity: 'MEDIUM', text: `Financial progress is ${mismatch} percentage points ahead of physical progress.` });

  if (p.duplicate_risk > 70)
    reasons.push({ icon: 'copy', severity: 'HIGH', text: 'A semantically and geographically similar project was detected nearby. Possible duplicate expenditure.' });

  if (p.evidence_risk > 70)
    reasons.push({ icon: 'file-x', severity: 'HIGH', text: 'Required supporting evidence is incomplete or inconsistent with reported progress.' });

  if (p.compliance_risk > 60)
    reasons.push({ icon: 'shield-off', severity: 'MEDIUM', text: 'Multiple compliance checks have failed — missing documents and outdated progress updates.' });

  if (p.status === 'Delayed')
    reasons.push({ icon: 'clock', severity: 'MEDIUM', text: 'Project is significantly behind the expected completion schedule.' });

  if (reasons.length === 0)
    reasons.push({ icon: 'check-circle', severity: 'LOW', text: 'No major anomalies detected. Project appears within normal parameters.' });

  return reasons;
}

// ============================================================
// WHAT-IF SIMULATION
// ============================================================
export async function simulateProject(projectId, overrides) {
  try {
    const res = await apiClient.post(`/api/projects/${projectId}/simulate`, overrides);
    setDemo(false);
    return res.data;
  } catch (err) {
    if (!err.response) {
      setDemo(true);
      // Demo fallback: compute a rough simulation client-side
      const { financial_progress = 0, physical_progress = 0, actual_expenditure = 0, estimated_cost = 1 } = overrides;
      const mismatch = financial_progress - physical_progress;
      const execRisk = mismatch <= 10 ? 10 : mismatch <= 30 ? 40 : mismatch <= 50 ? 70 : 88;
      const finRisk = actual_expenditure / estimated_cost > 1.3 ? 85 : actual_expenditure / estimated_cost > 1.1 ? 55 : 20;
      const score = finRisk * 0.25 + execRisk * 0.20 + 15 * 0.15 + 30 * 0.15 + 40 * 0.25;
      return {
        success: true, simulation: true,
        note: 'Demo simulation — backend not connected.',
        hypothetical_risk_score: Math.round(Math.min(100, score)),
        hypothetical_risk_level: score > 80 ? 'CRITICAL' : score > 60 ? 'HIGH' : score > 30 ? 'MEDIUM' : 'LOW',
        component_scores: { financial_risk: finRisk, execution_risk: execRisk, duplicate_risk: 15, compliance_risk: 30, evidence_risk: 40 },
      };
    }
    throw err;
  }
}

export { generateFlaggedReasons };
