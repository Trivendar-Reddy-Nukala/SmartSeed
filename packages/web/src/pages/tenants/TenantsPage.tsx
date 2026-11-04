import { useQuery } from '@tanstack/react-query';
import { tenantsService } from '../../services';
import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { formatDate } from '../../utils/format';
import { Building2 } from 'lucide-react';

export function TenantsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['tenants', page], queryFn: () => tenantsService.list({ page, pageSize: 20 }) });
  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Organizations</h1><p className="text-gray-500">Manage registered seed companies</p></div>
      <Card>
        {data?.data?.length ? (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-gray-500"><th className="pb-3 font-medium">Organization</th><th className="pb-3 font-medium">Plan</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Users</th><th className="pb-3 font-medium">Batches</th><th className="pb-3 font-medium">Created</th></tr></thead>
            <tbody>{data.data.map((t: any) => (
              <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50"><td className="py-3"><p className="font-medium">{t.name}</p><p className="text-xs text-gray-500">{t.slug}</p></td><td className="py-3"><Badge>{t.subscription_plan}</Badge></td><td className="py-3"><Badge variant="status" value={t.status}>{t.status}</Badge></td><td className="py-3">{t.user_count}</td><td className="py-3">{t.batch_count}</td><td className="py-3 text-gray-500">{formatDate(t.created_at)}</td></tr>
            ))}</tbody>
          </table>
        ) : <p className="text-sm text-gray-500">No organizations registered</p>}
      </Card>
    </div>
  );
}

