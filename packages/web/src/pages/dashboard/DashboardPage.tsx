import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/auth.store';
import { analyticsService } from '../../services';
import { Stats } from '../../components/ui/Stats';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { formatDate, formatNumber } from '../../utils/format';
import { Package, Boxes, ArrowLeftRight, AlertTriangle, Users, Building2 } from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({ queryKey: ['analytics', 'overview'], queryFn: analyticsService.getOverview });

  if (isLoading) return <PageLoader />;
  const stats = data?.stats || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.firstName}!</h1>
        <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening with your seed supply chain</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {user?.role === 'platform_admin' && <Stats label="Organizations" value={formatNumber(stats.tenants || 0)} icon={Building2} />}
        <Stats label="Products" value={formatNumber(stats.products || 0)} icon={Package} />
        <Stats label="Batches" value={formatNumber(stats.batches || 0)} icon={Boxes} />
        <Stats label="Transfers" value={formatNumber(stats.transfers || 0)} icon={ArrowLeftRight} />
        <Stats label="Active Alerts" value={formatNumber(stats.activeAlerts || 0)} icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Batches">
          {data?.recentBatches?.length ? (
            <div className="space-y-3">
              {data.recentBatches.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{b.batch_number}</p>
                    <p className="text-xs text-gray-500">{b.product_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="status" value={b.status}>{b.status.replace(/_/g, ' ')}</Badge>
                    <span className="text-xs text-gray-400">{formatDate(b.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-500">No batches yet</p>}
        </Card>

        <Card title="Recent Transfers">
          {data?.recentTransfers?.length ? (
            <div className="space-y-3">
              {data.recentTransfers.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">Batch: {t.batch_number}</p>
                    <p className="text-xs text-gray-500">Qty: {formatNumber(t.quantity)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="status" value={t.status}>{t.status}</Badge>
                    <span className="text-xs text-gray-400">{formatDate(t.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-500">No transfers yet</p>}
        </Card>
      </div>
    </div>
  );
}

