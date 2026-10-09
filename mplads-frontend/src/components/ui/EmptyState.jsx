import { SearchX } from 'lucide-react';

export default function EmptyState({ title = 'No data found', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 gap-3 text-center">
      <div className="p-4 bg-gray-100 rounded-full">
        <SearchX className="w-8 h-8 text-gray-400" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-gray-700">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
