import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { batchesService, productsService } from '../../services';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Stats } from '../../components/ui/Stats';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate, formatNumber } from '../../utils/format';
import { Package, Boxes, AlertTriangle, Archive } from 'lucide-react';

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: productsData } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productsService.list({ pageSize: 500 }),
  });

  const { data: batchesData, isLoading } = useQuery({
    queryKey: ['batches-inventory', statusFilter, sortField, sortOrder],
    queryFn: () => batchesService.list({ pageSize: 500, sortBy: sortField, sortOrder }),
  });

  const allBatches: any[] = batchesData?.data || [];
  const products: any[] = productsData?.data || [];

  const filteredBatches = allBatches.filter((b: any) => {
    if (statusFilter && b.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return b.batch_number?.toLowerCase().includes(q) || b.product_name?.toLowerCase().includes(q);
    }
    return true;
  });

  const totalUnits = allBatches.reduce((acc: number, b: any) => acc + (b.current_quantity || 0), 0);
  const lowStockBatches = allBatches.filter((b: any) => {
    const ratio = b.initial_quantity > 0 ? b.current_quantity / b.initial_quantity : 1;
    return ratio < 0.1 && ratio > 0 && b.status !== 'expired';
  });

  const getStockLevel = (batch: any) => {
    if (batch.status === 'expired' || new Date(batch.expiry_date) < new Date()) return 'expired';
    const ratio = batch.initial_quantity > 0 ? batch.current_quantity / batch.initial_quantity : 0;
    if (ratio > 0.5) return 'high';
    if (ratio > 0.1) return 'medium';
    return 'low';
  };

  const stockRowClass = (level: string) => {
    switch (level) {
      case 'high': return 'border-l-4 border-l-green-400';
      case 'medium': return 'border-l-4 border-l-yellow-400';
      case 'low': return 'border-l-4 border-l-red-400';
      case 'expired': return 'border-l-4 border-l-gray-300 bg-gray-50 opacity-75';
      default: return '';
    }
  };

  const stockBadge = (level: string) => {
    switch (level) {
      case 'high': return <Badge variant="success">In Stock</Badge>;
      case 'medium': return <Badge variant="warning">Low</Badge>;
      case 'low': return <Badge variant="danger">Critical</Badge>;
      case 'expired': return <Badge variant="default">Expired</Badge>;
      default: return null;
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('asc'); }
  };

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <th className="text-left py-3 px-4 font-medium text-gray-600 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort(field)}>
      <span className="inline-flex items-center gap-1">{children}{sortField === field && <span className="text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>}</span>
    </th>
  );

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Inventory</h1><p className="text-gray-500">Track seed batch inventory across the supply chain</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stats label="Total Products" value={formatNumber(products.length)} icon={Package} />
        <Stats label="Total Batches" value={formatNumber(allBatches.length)} icon={Boxes} />
        <Stats label="Units in Stock" value={formatNumber(totalUnits)} icon={Archive} />
        <Stats label="Low Stock Alerts" value={formatNumber(lowStockBatches.length)} icon={AlertTriangle} />
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Search" placeholder="Search by batch or product..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            options={[{ value: '', label: 'All statuses' }, { value: 'created', label: 'Created' }, { value: 'in_inventory', label: 'In Inventory' }, { value: 'partially_dispatched', label: 'Partially Dispatched' }, { value: 'fully_dispatched', label: 'Fully Dispatched' }, { value: 'expired', label: 'Expired' }, { value: 'recalled', label: 'Recalled' }]}
          />
          <div className="flex items-end">
            <button className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50" onClick={() => { setSearchQuery(''); setStatusFilter(''); }}>Clear Filters</button>
          </div>
        </div>
      </Card>

      {filteredBatches.length === 0 ? (
        <EmptyState icon={Boxes} title="No Inventory Data" description="No batches match your current filters." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <SortHeader field="product_name">Product</SortHeader>
                  <SortHeader field="batch_number">Batch #</SortHeader>
                  <SortHeader field="initial_quantity">Initial Qty</SortHeader>
                  <SortHeader field="current_quantity">Current Qty</SortHeader>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Transferred</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Stock Level</th>
                  <SortHeader field="status">Status</SortHeader>
                  <SortHeader field="expiry_date">Expiry Date</SortHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBatches.map((batch: any) => {
                  const level = getStockLevel(batch);
                  const transferred = (batch.initial_quantity || 0) - (batch.current_quantity || 0);
                  const pct = batch.initial_quantity > 0 ? Math.round((batch.current_quantity / batch.initial_quantity) * 100) : 0;
                  const isExpired = new Date(batch.expiry_date) < new Date();
                  return (
                    <tr key={batch.id} className={`hover:bg-gray-50 transition-colors ${stockRowClass(level)}`}>
                      <td className="py-3 px-4 font-medium">{batch.product_name || '—'}</td>
                      <td className="py-3 px-4"><code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{batch.batch_number}</code></td>
                      <td className="py-3 px-4 text-right">{formatNumber(batch.initial_quantity)}</td>
                      <td className="py-3 px-4 text-right"><span className="font-medium">{formatNumber(batch.current_quantity)}</span><span className="text-gray-400 text-xs ml-1">({pct}%)</span></td>
                      <td className="py-3 px-4 text-right text-gray-500">{formatNumber(transferred)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${level === 'high' ? 'bg-green-500' : level === 'medium' ? 'bg-yellow-500' : level === 'low' ? 'bg-red-500' : 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                          </div>
                          {stockBadge(level)}
                        </div>
                      </td>
                      <td className="py-3 px-4"><Badge variant={batch.status === 'recalled' ? 'danger' : batch.status === 'expired' ? 'warning' : 'default'}>{batch.status?.replace(/_/g, ' ')}</Badge></td>
                      <td className={`py-3 px-4 ${isExpired ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{formatDate(batch.expiry_date)}{isExpired && <span className="text-xs ml-1">(expired)</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
