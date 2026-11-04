import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transfersService, batchesService, usersService } from '../../services';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageLoader } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { formatDate, formatNumber } from '../../utils/format';
import { Plus, ArrowLeftRight, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

export function TransfersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['transfers', page, statusFilter], queryFn: () => transfersService.list({ page, pageSize: 20, status: statusFilter || undefined }) });
  const { data: batches } = useQuery({ queryKey: ['batches-all'], queryFn: () => batchesService.list({ pageSize: 100 }) });
  const { data: users } = useQuery({ queryKey: ['users-all'], queryFn: () => usersService.list({ pageSize: 100 }) });

  const [form, setForm] = useState({ batchId: '', receiverId: '', quantity: 0, sourceLocation: '', destinationLocation: '', notes: '' });

  const createMutation = useMutation({ mutationFn: (d: any) => transfersService.create(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['transfers'] }); setShowCreate(false); toast.success('Transfer initiated'); }, onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed') });
  const receiveMutation = useMutation({ mutationFn: (id: string) => transfersService.receive(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['transfers'] }); toast.success('Batch received'); } });
  const rejectMutation = useMutation({ mutationFn: (id: string) => transfersService.reject(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['transfers'] }); toast.success('Transfer rejected'); } });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Transfers</h1><p className="text-gray-500">Track batch transfers across the supply chain</p></div>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> New Transfer</Button>
      </div>

      <Card>
        <div className="mb-4">
          <select className="px-3 py-2 border rounded-lg text-sm bg-white" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="initiated">Initiated</option><option value="dispatched">Dispatched</option>
            <option value="received">Received</option><option value="rejected">Rejected</option>
          </select>
        </div>

        {data?.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-gray-500">
                <th className="pb-3 font-medium">Batch</th><th className="pb-3 font-medium">From</th><th className="pb-3 font-medium">To</th><th className="pb-3 font-medium">Qty</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Date</th><th className="pb-3 font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {data.data.map((t: any) => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 font-medium text-green-700">{t.batch_number}</td>
                    <td className="py-3"><p>{t.sender_first_name} {t.sender_last_name}</p><p className="text-xs text-gray-500">{t.sender_role}</p></td>
                    <td className="py-3"><p>{t.receiver_first_name} {t.receiver_last_name}</p><p className="text-xs text-gray-500">{t.receiver_role}</p></td>
                    <td className="py-3">{formatNumber(t.quantity)}</td>
                    <td className="py-3"><Badge variant="status" value={t.status}>{t.status}</Badge></td>
                    <td className="py-3 text-gray-500">{formatDate(t.created_at)}</td>
                    <td className="py-3">
                      {['initiated', 'dispatched'].includes(t.status) && (
                        <div className="flex gap-1">
                          <button className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Accept" onClick={() => receiveMutation.mutate(t.id)}><Check className="w-4 h-4" /></button>
                          <button className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Reject" onClick={() => rejectMutation.mutate(t.id)}><X className="w-4 h-4" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState icon={ArrowLeftRight} title="No transfers" description="Initiate a batch transfer" actionLabel="New Transfer" onAction={() => setShowCreate(true)} />}
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Initiate Transfer">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
          <Select label="Batch" value={form.batchId} onChange={e => setForm({...form, batchId: e.target.value})} options={(batches?.data || []).map((b: any) => ({ value: b.id, label: `${b.batch_number} (${formatNumber(b.current_quantity)} available)` }))} />
          <Select label="Receiver" value={form.receiverId} onChange={e => setForm({...form, receiverId: e.target.value})} options={(users?.data || []).filter((u: any) => u.role !== 'platform_admin').map((u: any) => ({ value: u.id, label: `${u.first_name} ${u.last_name} (${u.role})` }))} />
          <Input label="Quantity" type="number" value={String(form.quantity)} onChange={e => setForm({...form, quantity: parseInt(e.target.value) || 0})} required />
          <Input label="Source Location" value={form.sourceLocation} onChange={e => setForm({...form, sourceLocation: e.target.value})} />
          <Input label="Destination Location" value={form.destinationLocation} onChange={e => setForm({...form, destinationLocation: e.target.value})} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Initiate Transfer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

