/**
 * ProvenanceChip — shows the data source of a number or record.
 * Every number shown in the UI should carry one of these chips.
 * This is the core trust layer component.
 */
import { Info } from 'lucide-react';

const PROVENANCE_CONFIG = {
  SYNTHETIC: {
    label: 'Synthetic',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    tooltip: 'This data is synthetically generated for demonstration. Not real project data.',
  },
  OFFICIAL_IMPORT: {
    label: 'Official',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    tooltip: 'Imported from official MPLADS portal data.',
  },
  USER_ENTERED: {
    label: 'User entered',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    tooltip: 'Data entered manually by an officer.',
  },
  CALCULATED: {
    label: 'Calculated',
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
    tooltip: 'Derived from other fields by a formula.',
  },
  MODEL_OUTPUT: {
    label: 'AI output',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    tooltip: 'Produced by an ML model. See Model Transparency page for details.',
  },
};

export default function ProvenanceChip({ type = 'SYNTHETIC', timestamp, runId, size = 'sm' }) {
  const cfg = PROVENANCE_CONFIG[type] || PROVENANCE_CONFIG.SYNTHETIC;
  const tip = [
    cfg.tooltip,
    timestamp ? `As of: ${timestamp}` : null,
    runId ? `Run ID: ${runId}` : null,
  ].filter(Boolean).join(' · ');

  if (size === 'xs') {
    return (
      <span
        title={tip}
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border} cursor-help`}
        aria-label={`Data source: ${cfg.label}`}
      >
        {cfg.label}
      </span>
    );
  }

  return (
    <span
      title={tip}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border} cursor-help`}
      aria-label={`Data source: ${cfg.label}`}
    >
      <Info className="w-2.5 h-2.5" aria-hidden="true" />
      {cfg.label}
    </span>
  );
}
