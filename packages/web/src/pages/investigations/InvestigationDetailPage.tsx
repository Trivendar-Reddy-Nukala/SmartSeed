import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { investigationsService } from '../../services';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Spinner';
import { Select } from '../../components/ui/Select';
import { formatDate, getRiskLevelColor } from '../../utils/format';
import { FileText, Clock, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export function InvestigationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: inv, isLoading } = useQuery({ queryKey: ['investigation', id], queryFn: () => investigationsService.getById(id!) });
  const [newStatus, setNewStatus] = useState('');

  const statusMutation = useMutation({ mutationFn: (status: string) => investigationsService.updateStatus(id!, { status }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['investigation', id] }); toast.success('Status updated'); } });
  const reportMutation = useMutation({ mutationFn: () => investigationsService.generateReport(id!), onSuccess: (data) => toast.success('Report generated') });

  if (isLoading) return <PageLoader />;
  if (!inv) return <div>Investigation not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Investigation</h1>
          <p className="text-gray-500">Batch: {inv.batch_number} — {inv.product_name}</p>
        </div>
        <Button variant="outline" onClick={() => reportMutation.mutate()} loading={reportMutation.isPending}><FileText className="w-4 h-4" /> Generate AI Report</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Investigation Details" className="lg:col-span-2">
          <div className="space-y-4 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Status</span><Badge variant="status" value={inv.status}>{inv.status.replace(/_/g, ' ')}</Badge></div>
            <div className="flex justify-between"><span className="text-gray-500">Risk Score</span><span className={`font-bold text-lg ${getRiskLevelColor(inv.risk_category).split(' ')[0]}`}>{inv.risk_score}/100</span></div>
            <div><span className="text-gray-500">Suspicious Activity</span><p className="mt-1">{inv.main_suspicious_activity}</p></div>
            {inv.potential_explanation && <div><span className="text-gray-500">Potential Explanation</span><p className="mt-1">{inv.potential_explanation}</p></div>}
            {inv.resolution && <div><span className="text-gray-500">Resolution</span><p className="mt-1">{inv.resolution}</p></div>}
          </div>
        </Card>

        <Card title="Actions">
          <div className="space-y-4">
            <Select label="Update Status" value={newStatus} onChange={e => setNewStatus(e.target.value)} options={[
              { value: 'under_investigation', label: 'Under Investigation' },
              { value: 'additional_verification', label: 'Additional Verification' },
              { value: 'confirmed_suspicious', label: 'Confirmed Suspicious' },
              { value: 'false_positive', label: 'False Positive' },
              { value: 'escalated_manufacturer', label: 'Escalate to Manufacturer' },
              { value: 'escalated_authority', label: 'Escalate to Authority' },
              { value: 'resolved', label: 'Resolved' },
            ]} />
            <Button className="w-full" disabled={!newStatus} loading={statusMutation.isPending} onClick={() => statusMutation.mutate(newStatus)}>Update Status</Button>
          </div>
        </Card>
      </div>

      {/* Evidence */}
      {inv.supporting_evidence && (
        <Card title="Supporting Evidence">
          {(typeof inv.supporting_evidence === 'string' ? JSON.parse(inv.supporting_evidence) : inv.supporting_evidence).length > 0 ? (
            <div className="space-y-3">
              {(typeof inv.supporting_evidence === 'string' ? JSON.parse(inv.supporting_evidence) : inv.supporting_evidence).map((e: any, i: number) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium capitalize">{e.type?.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-gray-600 mt-1">{e.description}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-500">No evidence collected yet. Generate an AI report to analyze.</p>}
        </Card>
      )}
    </div>
  );
}

