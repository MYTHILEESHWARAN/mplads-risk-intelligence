// ============================================================
// Formatting utilities
// ============================================================

export function formatCurrency(amount) {
  if (amount == null) return '—';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function getRiskColor(level) {
  switch (level) {
    case 'LOW': return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500', badge: 'bg-green-100 text-green-800' };
    case 'MEDIUM': return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-800' };
    case 'HIGH': return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-800' };
    case 'CRITICAL': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', badge: 'bg-red-100 text-red-800' };
    default: return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-700' };
  }
}

export function getRiskFromScore(score) {
  if (score <= 30) return 'LOW';
  if (score <= 60) return 'MEDIUM';
  if (score <= 80) return 'HIGH';
  return 'CRITICAL';
}

export function getSeverityColor(severity) {
  return getRiskColor(severity);
}

export function getStatusColor(status) {
  switch (status) {
    case 'Completed': return 'bg-green-100 text-green-800';
    case 'In Progress': return 'bg-blue-100 text-blue-800';
    case 'Delayed': return 'bg-red-100 text-red-800';
    case 'Not Started': return 'bg-gray-100 text-gray-700';
    case 'New': return 'bg-blue-100 text-blue-800';
    case 'Under Review': return 'bg-yellow-100 text-yellow-800';
    case 'Resolved': return 'bg-green-100 text-green-800';
    case 'Escalated': return 'bg-red-100 text-red-800';
    case 'Assigned': return 'bg-purple-100 text-purple-800';
    case 'Evidence Verification': return 'bg-orange-100 text-orange-800';
    case 'Verified': return 'bg-green-100 text-green-800';
    case 'Pending': return 'bg-yellow-100 text-yellow-800';
    case 'Missing': return 'bg-red-100 text-red-800';
    case 'Mismatch': return 'bg-orange-100 text-orange-800';
    case 'Passed': return 'bg-green-100 text-green-800';
    case 'Failed': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-700';
  }
}

export function getAlertTypeLabel(type) {
  const map = {
    FINANCIAL_ANOMALY: 'Financial Anomaly',
    PROGRESS_MISMATCH: 'Progress Mismatch',
    POSSIBLE_DUPLICATE: 'Possible Duplicate',
    DELAY_WARNING: 'Delay Warning',
    COMPLIANCE_VIOLATION: 'Compliance Violation',
    MISSING_EVIDENCE: 'Missing Evidence',
    COMPLIANCE_RISK: 'Compliance Risk',
  };
  return map[type] || type;
}

export function getMismatchLabel(mismatch) {
  if (mismatch <= 10) return { label: 'NORMAL', color: 'text-green-600' };
  if (mismatch <= 30) return { label: 'MEDIUM MISMATCH', color: 'text-yellow-600' };
  if (mismatch <= 50) return { label: 'HIGH MISMATCH', color: 'text-orange-600' };
  return { label: 'CRITICAL MISMATCH', color: 'text-red-600' };
}
