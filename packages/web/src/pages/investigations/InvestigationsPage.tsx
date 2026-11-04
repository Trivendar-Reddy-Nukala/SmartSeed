import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { investigationsService } from '../../services';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate } from '../../utils/format';
import { Search, Eye } from 'lucide-react';

export function InvestigationsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['investigations', page, status], queryFn: () => investigationsService.list({ page, pageSize: 20, status: status || undefined }) });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Investigations</h1><p className="text-gray-500">Review and manage counterfeit investigations</p></div>
      <Card>
        <div className="mb-4">
          <select className="px-3 py-2 border rounded-lg text-sm bg-white" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="opened">Opened</option><option value="under_investigation">Under Investigation</option>
            <option value="confirmed_suspicious">Confirmed Suspicious</option><option value="resolved">Resolved</option>
            <option value="false_positive">False Positive</option>
          </select>
        </div>
        {data?.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-gray-500"><th className="pb-3 font-medium">Batch</th><th className="pb-3 font-medium">Risk</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Assigned</th><th className="pb-3 font-medium">Created</th><th className="pb-3 font-medium">Actions</th></tr></thead>
              <tbody>{data.data.map((inv: any) => (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/investigations/${inv.id}`)}>
                  <td className="py-3 font-medium text-green-700">{inv.batch_number}</td>
                  <td className="py-3"><Badge variant="risk" value={inv.risk_category}>{inv.risk_score}</Badge></td>
                  <td className="py-3"><Badge variant="status" value={inv.status}>{inv.status.replace(/_/g, ' ')}</Badge></td>
                  <td className="py-3">{inv.assignee_first_name ? `${inv.assignee_first_name} ${inv.assignee_last_name}` : '—'}</td>
                  <td className="py-3 text-gray-500">{formatDate(inv.created_at)}</td>
                  <td className="py-3"><button className="p-1.5 rounded hover:bg-gray-100"><Eye className="w-4 h-4" /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <EmptyState icon={Search} title="No investigations" description="Investigations are created when high-risk activity is detected" />}
      </Card>
    </div>
  );
}

