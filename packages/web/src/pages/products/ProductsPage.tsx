import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { productsService } from '../../services';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageLoader } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { formatDate } from '../../utils/format';
import { Plus, Package, Search, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function ProductsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', brandName: '', cropType: '', seedVariety: '', description: '', category: '' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['products', page, search], queryFn: () => productsService.list({ page, pageSize: 20, search }) });
  const createMutation = useMutation({
    mutationFn: (data: any) => productsService.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); setShowCreate(false); toast.success('Product created'); setForm({ name: '', brandName: '', cropType: '', seedVariety: '', description: '', category: '' }); },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); toast.success('Product deleted'); },
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Products</h1><p className="text-gray-500">Manage seed products</p></div>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Add Product</Button>
      </div>

      <Card>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" placeholder="Search products..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        {data?.data?.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-gray-500">
                  <th className="pb-3 font-medium">Product</th><th className="pb-3 font-medium">Crop Type</th><th className="pb-3 font-medium">Variety</th><th className="pb-3 font-medium">Batches</th><th className="pb-3 font-medium">Created</th><th className="pb-3 font-medium">Actions</th>
                </tr></thead>
                <tbody>
                  {data.data.map((p: any) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3"><p className="font-medium">{p.name}</p><p className="text-xs text-gray-500">{p.brand_name}</p></td>
                      <td className="py-3">{p.crop_type}</td>
                      <td className="py-3">{p.seed_variety}</td>
                      <td className="py-3"><Badge variant="default">{p.batch_count || 0}</Badge></td>
                      <td className="py-3 text-gray-500">{formatDate(p.created_at)}</td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <button className="p-1.5 rounded hover:bg-gray-100" onClick={() => navigate(`/batches?productId=${p.id}`)}><Package className="w-4 h-4" /></button>
                          <button className="p-1.5 rounded hover:bg-red-50 text-red-600" onClick={() => { if(confirm('Delete this product?')) deleteMutation.mutate(p.id); }}><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.meta && data.meta.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">Page {data.meta.page} of {data.meta.totalPages} ({data.meta.totalCount} total)</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        ) : <EmptyState icon={Package} title="No products yet" description="Create your first seed product to get started" actionLabel="Add Product" onAction={() => setShowCreate(true)} />}
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Product">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
          <Input label="Product Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          <Input label="Brand Name" value={form.brandName} onChange={e => setForm({...form, brandName: e.target.value})} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Crop Type" value={form.cropType} onChange={e => setForm({...form, cropType: e.target.value})} placeholder="e.g., Paddy" required />
            <Input label="Seed Variety" value={form.seedVariety} onChange={e => setForm({...form, seedVariety: e.target.value})} placeholder="e.g., BPT-5204" required />
          </div>
          <Input label="Category" value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g., Certified Seeds" />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Create Product</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

