/**
 * RiskMap v2 — India choropleth + project markers
 * No paid API. SVG-based with state ellipses for choropleth.
 * Keyboard accessible. Table fallback view.
 * Phase 7 of MPLADS Risk Intelligence upgrade.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, List, ZoomIn, ZoomOut, Crosshair, Layers, AlertTriangle } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import RiskBadge from '../components/ui/RiskBadge';
import { fetchRiskMap } from '../services/api';

const INDIA = { minLat: 6.4, maxLat: 37.6, minLng: 68.7, maxLng: 97.4 };
const W = 700, H = 560, PAD = 30;

function toXY(lat, lng) {
  const x = PAD + ((lng - INDIA.minLng) / (INDIA.maxLng - INDIA.minLng)) * (W - PAD * 2);
  const y = PAD + ((INDIA.maxLat - lat) / (INDIA.maxLat - INDIA.minLat)) * (H - PAD * 2);
  return { x, y };
}

const RISK_COLORS = { LOW: '#22c55e', MEDIUM: '#eab308', HIGH: '#f97316', CRITICAL: '#ef4444' };

const STATE_CENTERS = {
  'Uttar Pradesh':    { lat: 26.8, lng: 80.9 },
  'Bihar':            { lat: 25.4, lng: 85.1 },
  'Maharashtra':      { lat: 19.7, lng: 75.7 },
  'Tamil Nadu':       { lat: 10.8, lng: 78.7 },
  'West Bengal':      { lat: 22.9, lng: 87.8 },
  'Madhya Pradesh':   { lat: 23.5, lng: 77.5 },
  'Rajasthan':        { lat: 27.0, lng: 74.2 },
  'Gujarat':          { lat: 22.3, lng: 71.2 },
  'Karnataka':        { lat: 15.3, lng: 75.7 },
  'Andhra Pradesh':   { lat: 15.9, lng: 79.7 },
  'Telangana':        { lat: 17.4, lng: 78.5 },
  'Odisha':           { lat: 20.9, lng: 84.2 },
  'Punjab':           { lat: 31.1, lng: 75.3 },
  'Haryana':          { lat: 29.1, lng: 76.1 },
  'Chhattisgarh':     { lat: 21.3, lng: 81.7 },
  'Uttarakhand':      { lat: 30.3, lng: 78.5 },
  'Himachal Pradesh': { lat: 31.7, lng: 77.1 },
  'Jharkhand':        { lat: 23.6, lng: 85.3 },
  'Assam':            { lat: 26.2, lng: 92.9 },
  'Kerala':           { lat: 10.5, lng: 76.2 },
  'Chandigarh':       { lat: 30.7, lng: 76.8 },
};

function getStateColor(stateName, allProjects, metric) {
  const sp = allProjects.filter((p) => {
    const lat = parseFloat(p.latitude);
    const lng = parseFloat(p.longitude);
    const c = STATE_CENTERS[stateName];
    if (!c) return false;
    return Math.abs(lat - c.lat) < 3 && Math.abs(lng - c.lng) < 3;
  });
  if (sp.length === 0) return '#e2e8f0';
  if (metric === 'count') {
    const crit = sp.filter((p) => p.risk_level === 'CRITICAL').length;
    const high = sp.filter((p) => p.risk_level === 'HIGH').length;
    if (crit > 1) return '#fca5a5';
    if (crit > 0 || high > 2) return '#fed7aa';
    if (high > 0) return '#fef08a';
    return '#bbf7d0';
  }
  const avg = sp.reduce((s, p) => s + (p.risk_score || 0), 0) / sp.length;
  if (avg > 75) return '#fca5a5';
  if (avg > 55) return '#fed7aa';
  if (avg > 30) return '#fef08a';
  return '#bbf7d0';
}

const LEGEND = [
  { level: 'LOW',      color: RISK_COLORS.LOW },
  { level: 'MEDIUM',   color: RISK_COLORS.MEDIUM },
  { level: 'HIGH',     color: RISK_COLORS.HIGH },
  { level: 'CRITICAL', color: RISK_COLORS.CRITICAL },
];

export default function RiskMap() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filterLevel, setFilterLevel] = useState('');
  const [zoom, setZoom] = useState(1);
  const [metric, setMetric] = useState('avg_risk');
  const [viewMode, setViewMode] = useState('map');
  const [selectedState, setSelectedState] = useState(null);
  const [showChoropleth, setShowChoropleth] = useState(true);

  useEffect(() => {
    fetchRiskMap().then((res) => {
      setProjects(res.projects || []);
      setLoading(false);
    });
  }, []);

  const filtered = projects.filter((p) => !filterLevel || p.risk_level === filterLevel);

  const stateFiltered = selectedState
    ? filtered.filter((p) => {
        const c = STATE_CENTERS[selectedState];
        if (!c || !p.latitude || !p.longitude) return false;
        return Math.abs(p.latitude - c.lat) < 3 && Math.abs(p.longitude - c.lng) < 3;
      })
    : filtered;

  if (loading) return <LoadingState message="Loading risk map…" />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Geographic Risk Map v2"
        subtitle="Spatial distribution of MPLADS project risk · Click state to zoom · No paid API"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setViewMode(v => v === 'map' ? 'table' : 'map')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              aria-label={viewMode === 'map' ? 'Switch to table view' : 'Switch to map view'}
            >
              {viewMode === 'map' ? <List className="w-4 h-4" /> : <Map className="w-4 h-4" />}
              {viewMode === 'map' ? 'Table view' : 'Map view'}
            </button>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Filter by risk level"
            >
              <option value="">All Risk Levels</option>
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((r) => <option key={r}>{r}</option>)}
            </select>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Choropleth metric"
            >
              <option value="avg_risk">Colour: Avg Risk</option>
              <option value="count">Colour: High-risk Count</option>
            </select>
          </div>
        }
      />

      {/* Table view — screen reader friendly, also selectable by user */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Project risk locations">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Project ID', 'Name', 'District', 'Lat', 'Lng', 'Risk Score', 'Level', 'Primary Reason'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...stateFiltered]
                  .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
                  .map((p) => (
                    <tr
                      key={p.project_id}
                      className="hover:bg-blue-50/20 cursor-pointer"
                      onClick={() => navigate(`/projects/${p.project_id}`)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && navigate(`/projects/${p.project_id}`)}
                    >
                      <td className="px-4 py-3 text-xs font-mono text-blue-600">{p.project_id}</td>
                      <td className="px-4 py-3 text-xs text-gray-800 max-w-[180px] truncate">{p.project_name}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{p.district}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{p.latitude?.toFixed(3)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{p.longitude?.toFixed(3)}</td>
                      <td className="px-4 py-3 text-xs font-bold">{p.risk_score ?? '—'}</td>
                      <td className="px-4 py-3"><RiskBadge level={p.risk_level || 'LOW'} /></td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{p.primary_reason || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewMode === 'map' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Map panel */}
          <div className="xl:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-medium">{stateFiltered.length} projects</span>
                {selectedState && (
                  <span>
                    · <button onClick={() => setSelectedState(null)} className="text-blue-600 hover:underline">{selectedState} ×</button>
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setZoom(z => Math.min(3, z + 0.4))} className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50" aria-label="Zoom in"><ZoomIn className="w-3.5 h-3.5" /></button>
                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.4))} className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50" aria-label="Zoom out"><ZoomOut className="w-3.5 h-3.5" /></button>
                <button onClick={() => { setZoom(1); setSelectedState(null); }} className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50" aria-label="Reset view"><Crosshair className="w-3.5 h-3.5" /></button>
                <button
                  onClick={() => setShowChoropleth(v => !v)}
                  className={`p-1.5 border rounded-lg transition-colors ${showChoropleth ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}
                  aria-label="Toggle choropleth layer"
                  aria-pressed={showChoropleth}
                >
                  <Layers className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden bg-gradient-to-br from-sky-100 to-slate-200" style={{ height: 420 }}>
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-full"
                role="img"
                aria-label="India map showing MPLADS project risk distribution"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center',
                  transition: 'transform 0.3s ease',
                }}
              >
                {/* Ocean */}
                <rect x={0} y={0} width={W} height={H} fill="#bfdbfe" rx={8} />

                {/* Grid lines */}
                {[...Array(7)].map((_, i) => (
                  <line key={`h${i}`} x1={0} y1={(i + 1) * (H / 8)} x2={W} y2={(i + 1) * (H / 8)} stroke="#93c5fd" strokeWidth={0.4} strokeDasharray="4,6" />
                ))}
                {[...Array(7)].map((_, i) => (
                  <line key={`v${i}`} x1={(i + 1) * (W / 8)} y1={0} x2={(i + 1) * (W / 8)} y2={H} stroke="#93c5fd" strokeWidth={0.4} strokeDasharray="4,6" />
                ))}

                {/* State choropleth ellipses */}
                {showChoropleth && Object.entries(STATE_CENTERS).map(([name, { lat, lng }]) => {
                  const { x, y } = toXY(lat, lng);
                  const fill = getStateColor(name, projects, metric);
                  const isSelected = selectedState === name;
                  const hasProjects = projects.some((p) => {
                    const c = STATE_CENTERS[name];
                    return c && p.latitude && p.longitude &&
                      Math.abs(p.latitude - c.lat) < 3 && Math.abs(p.longitude - c.lng) < 3;
                  });
                  return (
                    <g key={name}>
                      <ellipse
                        cx={x} cy={y} rx={26} ry={18}
                        fill={fill}
                        stroke={isSelected ? '#1d4ed8' : hasProjects ? '#64748b' : '#cbd5e1'}
                        strokeWidth={isSelected ? 2.5 : 1}
                        opacity={0.82}
                        className={hasProjects ? 'cursor-pointer' : ''}
                        onClick={() => hasProjects && setSelectedState(isSelected ? null : name)}
                        role={hasProjects ? 'button' : undefined}
                        aria-label={hasProjects ? `${name} — click to filter` : name}
                        tabIndex={hasProjects ? 0 : undefined}
                        onKeyDown={(e) => hasProjects && e.key === 'Enter' && setSelectedState(isSelected ? null : name)}
                      />
                      <text x={x} y={y + 4} textAnchor="middle" fontSize="7.5" fill="#1e293b" fontWeight="600" pointerEvents="none">
                        {name.substring(0, 6)}
                      </text>
                    </g>
                  );
                })}

                {/* Project markers */}
                {stateFiltered
                  .filter((p) => p.latitude && p.longitude)
                  .map((p) => {
                    const { x, y } = toXY(parseFloat(p.latitude), parseFloat(p.longitude));
                    const color = RISK_COLORS[p.risk_level] || '#94a3b8';
                    const isSelected = selected?.project_id === p.project_id;
                    const r = p.risk_level === 'CRITICAL' ? 8 : p.risk_level === 'HIGH' ? 6 : 5;
                    return (
                      <g
                        key={p.project_id}
                        onClick={() => setSelected(p)}
                        className="cursor-pointer"
                        role="button"
                        aria-label={`${p.project_id}: ${p.risk_level} risk`}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setSelected(p)}
                      >
                        {/* Pulsing ring for CRITICAL */}
                        {p.risk_level === 'CRITICAL' && (
                          <circle cx={x} cy={y} r={r + 4} fill="none" stroke={color} strokeWidth={1.5} opacity={0.35}>
                            <animate attributeName="r" values={`${r + 4};${r + 9};${r + 4}`} dur="2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.35;0;0.35" dur="2s" repeatCount="indefinite" />
                          </circle>
                        )}
                        {isSelected && <circle cx={x} cy={y} r={r + 5} fill={color} opacity={0.2} />}
                        <circle cx={x} cy={y} r={r} fill={color} stroke="white" strokeWidth={1.5} />
                      </g>
                    );
                  })}
              </svg>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-3 px-1">
              {LEGEND.map(({ level, color }) => (
                <button
                  key={level}
                  onClick={() => setFilterLevel(filterLevel === level ? '' : level)}
                  aria-pressed={filterLevel === level}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-opacity ${filterLevel && filterLevel !== level ? 'opacity-40' : 'opacity-100'}`}
                >
                  <span className="w-3 h-3 rounded-full border-2 border-white shadow" style={{ background: color }} aria-hidden="true" />
                  {level}
                </button>
              ))}
              <span className="text-xs text-gray-400 ml-auto hidden sm:block">
                Click state to filter · Click marker for details
              </span>
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-3">
            {selected ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900 leading-tight">{selected.project_name}</p>
                    <p className="text-xs font-mono text-blue-600 mt-0.5">{selected.project_id}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-sm ml-2" aria-label="Close panel">✕</button>
                </div>
                <p className="text-xs text-gray-500">{selected.district}</p>
                <RiskBadge level={selected.risk_level || 'LOW'} />
                <div>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Risk Score</span>
                    <span className="font-bold">{selected.risk_score ?? '—'}/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${selected.risk_score ?? 0}%`, background: RISK_COLORS[selected.risk_level] || '#94a3b8' }}
                    />
                  </div>
                </div>
                {selected.primary_reason && (
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Primary reason</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{selected.primary_reason}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/projects/${selected.project_id}`)}
                    className="flex-1 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Project
                  </button>
                  <button
                    onClick={() => navigate('/investigations')}
                    className="px-3 py-2 text-sm font-medium border border-orange-300 text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    Investigate
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
                <Map className="w-8 h-8 text-gray-300 mx-auto mb-2" aria-hidden="true" />
                <p className="text-sm text-gray-500">Click a marker to view details</p>
                <p className="text-xs text-gray-400 mt-1">Click a state ellipse to filter by state</p>
              </div>
            )}

            {/* Project list sorted by risk */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">
                  {selectedState ? `${selectedState}` : 'All projects'} by risk
                </p>
                <span className="text-xs text-gray-400">{stateFiltered.length}</span>
              </div>
              <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto" role="list">
                {[...stateFiltered]
                  .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
                  .slice(0, 25)
                  .map((p) => (
                    <li key={p.project_id}>
                      <button
                        onClick={() => setSelected(p)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: RISK_COLORS[p.risk_level] || '#94a3b8' }}
                          aria-hidden="true"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{p.project_name}</p>
                          <p className="text-[10px] text-gray-400">{p.project_id} · {p.district}</p>
                        </div>
                        <span className="text-xs font-bold text-gray-600 shrink-0">{p.risk_score ?? '—'}</span>
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
