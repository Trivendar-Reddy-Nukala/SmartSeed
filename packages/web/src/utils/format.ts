import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd MMM yyyy');
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd MMM yyyy, HH:mm');
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function getRiskLevelColor(level: string) {
  switch (level) {
    case 'low': return 'text-green-600 bg-green-100';
    case 'medium': return 'text-yellow-600 bg-yellow-100';
    case 'high': return 'text-orange-600 bg-orange-100';
    case 'critical': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'active': case 'received': case 'resolved': case 'in_inventory': return 'text-green-700 bg-green-100';
    case 'pending': case 'initiated': case 'created': return 'text-blue-700 bg-blue-100';
    case 'dispatched': case 'in_transit': case 'partially_dispatched': return 'text-yellow-700 bg-yellow-100';
    case 'rejected': case 'cancelled': case 'suspended': case 'expired': return 'text-red-700 bg-red-100';
    case 'under_investigation': return 'text-orange-700 bg-orange-100';
    default: return 'text-gray-700 bg-gray-100';
  }
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

