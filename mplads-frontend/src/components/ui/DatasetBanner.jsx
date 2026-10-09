/**
 * DatasetBanner — always visible strip below the topbar.
 * Shows the current dataset provenance clearly.
 * NEVER silent about demo/offline mode.
 */
import { WifiOff, CheckCircle2 } from 'lucide-react';
import { isUsingDemoData } from '../../services/api';

export default function DatasetBanner({ projectCount }) {
  const isDemo = isUsingDemoData();

  if (!isDemo) {
    return (
      <div className="bg-green-50 border-b border-green-200 px-4 py-1 flex items-center gap-2 text-xs text-green-800">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>
          <strong>Live data</strong> — Connected to backend.
          {projectCount != null && ` ${projectCount} projects loaded.`}
        </span>
      </div>
    );
  }

  return (
    <div
      className="bg-amber-50 border-b border-amber-300 px-4 py-1.5 flex items-center gap-2 text-xs text-amber-900"
      role="status"
      aria-label="Offline demo mode active"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>
        <strong>Offline / Demo mode</strong> — Backend not connected.
        Showing <strong>synthetic demo data</strong> ({projectCount ?? 22} fictional projects).
        Risk scores are pre-assigned, not computed.
        <a href="/settings" className="ml-1 underline hover:text-amber-700">Configure backend URL</a>
      </span>
    </div>
  );
}
