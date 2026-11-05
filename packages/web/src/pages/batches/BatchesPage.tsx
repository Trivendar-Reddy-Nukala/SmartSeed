import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { batchesService, productsService } from '../../services';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageLoader } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { formatDate, formatNumber } from '../../utils/format';
import { Plus, Boxes, Search, Eye, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export function BatchesPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const productId = searchParams.get('productId') || '';
  const { data, isLoading } = useQuery({ queryKey: ['batches', page, search, statusFilter, productId], queryFn: () => batchesService.list({ page, pageSize: 20, search, status: statusFilter || undefined, productId: productId || undefined }) });
  const { data: products } = useQuery({ queryKey: ['products-list'], queryFn: () => productsService.list({ pageSize: 100 }) });

  const [form, setForm] = useState({ productId: '', batchNumber: '', manufacturingDate: '', expiryDate: '', productionLocation: '', manufacturingFacility: '', initialQuantity: 1000, unitOfMeasurement: 'packets' });

  const createMutation = useMutation({
    mutationFn: (data: any) => batchesService.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['batches'] }); setShowCreate(false); toast.success('Batch created successfully'); },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to create batch'),
  });

  if (isLoading) return <PageLoader />;

  const statuses = [
    { value: '', label: 'All Statuses' },
    { value: 'created', label: 'Created' }, { value: 'in_inventory', label: 'In Inventory' },
    { value: 'partially_dispatched', label: 'Partially Dispatched' }, { value: 'fully_dispatched', label: 'Fully Dispatched' },
    { value: 'expired', label: 'Expired' }, { value: 'under_investigation', label: 'Under Investigation' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Seed Batches</h1><p className="text-gray-500">Manage and track seed batches</p></div>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Create Batch</Button>
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" placeholder="Search batches..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="px-3 py-2 border rounded-lg text-sm bg-white" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {data?.data?.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-gray-500">
                  <th className="pb-3 font-medium">Batch #</th><th className="pb-3 font-medium">Product</th><th className="pb-3 font-medium">Mfg Date</th><th className="pb-3 font-medium">Expiry</th><th className="pb-3 font-medium">Quantity</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Risk</th><th className="pb-3 font-medium">Actions</th>
                </tr></thead>
                <tbody>
                  {data.data.map((b: any) => {
                    const risk = b.latest_risk ? (typeof b.latest_risk === 'string' ? JSON.parse(b.latest_risk) : b.latest_risk) : null;
                    return (
                      <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/batches/${b.id}`)}>
                        <td className="py-3 font-medium text-green-700">{b.batch_number}</td>
                        <td className="py-3"><p>{b.product_name}</p><p className="text-xs text-gray-500">{b.crop_type}</p></td>
                        <td className="py-3 text-gray-500">{formatDate(b.manufacturing_date)}</td>
                        <td className="py-3 text-gray-500">{formatDate(b.expiry_date)}</td>
                        <td className="py-3">
                          <div>
                            <span className="font-semibold text-gray-900">{formatNumber(b.my_quantity !== undefined ? b.my_quantity : b.current_quantity)} in hand</span>
                            <span className="text-xs text-gray-400 block">Batch total: {formatNumber(b.current_quantity)} / {formatNumber(b.initial_quantity)}</span>
                          </div>
                        </td>
                        <td className="py-3"><Badge variant="status" value={b.status}>{b.status.replace(/_/g, ' ')}</Badge></td>
                        <td className="py-3">{risk ? <Badge variant="risk" value={risk.risk_level}>{risk.score}</Badge> : <span className="text-gray-400">—</span>}</td>
                        <td className="py-3"><button className="p-1.5 rounded hover:bg-gray-100" onClick={e => { e.stopPropagation(); navigate(`/batches/${b.id}`); }}><Eye className="w-4 h-4" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {data.meta && data.meta.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">Page {data.meta.page} of {data.meta.totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        ) : <EmptyState icon={Boxes} title="No batches found" description="Create your first seed batch" actionLabel="Create Batch" onAction={() => setShowCreate(true)} />}
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Batch" size="lg">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
          <Select label="Product" value={form.productId} onChange={e => setForm({...form, productId: e.target.value})} options={(products?.data || []).map((p: any) => ({ value: p.id, label: `${p.name} (${p.seed_variety})` }))} />
          <Input label="Batch Number" value={form.batchNumber} onChange={e => setForm({...form, batchNumber: e.target.value})} placeholder="e.g., GG-BPT5204-2026-002" required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Manufacturing Date" type="date" value={form.manufacturingDate} onChange={e => setForm({...form, manufacturingDate: e.target.value})} required />
            <Input label="Expiry Date" type="date" value={form.expiryDate} onChange={e => setForm({...form, expiryDate: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Initial Quantity" type="number" value={String(form.initialQuantity)} onChange={e => setForm({...form, initialQuantity: parseInt(e.target.value) || 0})} required />
            <Input label="Unit" value={form.unitOfMeasurement} onChange={e => setForm({...form, unitOfMeasurement: e.target.value})} />
          </div>
          <Input label="Production Location" value={form.productionLocation} onChange={e => setForm({...form, productionLocation: e.target.value})} placeholder="e.g., Hyderabad, Telangana" required />
          <Input label="Manufacturing Facility" value={form.manufacturingFacility} onChange={e => setForm({...form, manufacturingFacility: e.target.value})} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Create Batch</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

