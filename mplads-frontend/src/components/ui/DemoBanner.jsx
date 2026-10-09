import { Database } from 'lucide-react';
import { isUsingDemoData } from '../../services/api';

export default function DemoBanner() {
  if (!isUsingDemoData()) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-50 border-b border-amber-200 px-4 py-1.5 flex items-center justify-center gap-2 text-xs text-amber-800 font-medium">
      <Database className="w-3.5 h-3.5" aria-hidden="true" />
      Demo Data — Backend not connected. Showing sample data for demonstration.
    </div>
  );
}
