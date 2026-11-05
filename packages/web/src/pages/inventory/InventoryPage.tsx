import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { inventoryService } from '../../services';
import { useAuthStore } from '../../stores/auth.store';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Stats } from '../../components/ui/Stats';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate, formatNumber } from '../../utils/format';
import { Package, Boxes, Archive, MapPin, Building2, User, Layers } from 'lucide-react';

export default function InventoryPage() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [scope, setScope] = useState<'my' | 'network'>(
    user?.role === 'manufacturer' || user?.role === 'platform_admin' ? 'my' : 'my'
  );

  const canViewNetwork = user?.role === 'manufacturer' || user?.role === 'platform_admin';

  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory', scope, searchQuery],
    queryFn: () => inventoryService.list({ scope, search: searchQuery, pageSize: 200 }),
  });

  const { data: summary } = useQuery({
    queryKey: ['inventory-summary'],
    queryFn: inventoryService.getSummary,
  });

  const items: any[] = inventoryData?.data || [];
  const totalUnits = items.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0);

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-gray-500">
            {user?.role === 'retailer' && 'Manage your retail shop stock available for farmer sales'}
            {user?.role === 'distributor' && 'Manage seed packets in your distribution warehouse'}
            {user?.role === 'manufacturer' && 'Track manufactured stock and downstream distribution inventory'}
            {user?.role === 'platform_admin' && 'System-wide inventory across all supply chain tiers'}
          </p>
        </div>

        {canViewNetwork && (
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setScope('my')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                scope === 'my'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Factory Stock
            </button>
            <button
              onClick={() => setScope('network')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                scope === 'network'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Network Stock (Distributors & Retailers)
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stats
          label={scope === 'my' ? 'Your In-Stock Units' : 'Network Units'}
          value={formatNumber(scope === 'my' ? (summary?.myUnitsInStock ?? totalUnits) : (summary?.networkUnitsInStock ?? totalUnits))}
          icon={Archive}
        />
        <Stats
          label="Batches in Stock"
          value={formatNumber(items.length)}
          icon={Boxes}
        />
        <Stats
          label="Seed Varieties"
          value={formatNumber(new Set(items.map((i) => i.product_name)).size)}
          icon={Package}
        />
        {canViewNetwork && (
          <Stats
            label="Total Network Inventory"
            value={formatNumber(summary?.networkUnitsInStock || 0)}
            icon={Layers}
          />
        )}
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              label="Search Inventory"
              placeholder="Search by batch #, product, crop variety, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {searchQuery && (
            <div className="flex items-end">
              <button
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                onClick={() => setSearchQuery('')}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </Card>

      {items.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No Inventory Found"
          description={
            scope === 'my'
              ? 'You do not have any seed batches in your stock right now. Accept an incoming transfer to receive inventory.'
              : 'No inventory recorded across the network.'
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="py-3 px-4 font-medium">Product / Variety</th>
                  <th className="py-3 px-4 font-medium">Batch Number</th>
                  {scope === 'network' && <th className="py-3 px-4 font-medium">Current Holder</th>}
                  <th className="py-3 px-4 font-medium">Location</th>
                  <th className="py-3 px-4 text-right font-medium">Available Quantity</th>
                  <th className="py-3 px-4 font-medium">Expiry Date</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item: any) => {
                  const isExpired = new Date(item.expiry_date) < new Date();
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{item.product_name}</p>
                        <p className="text-xs text-gray-500">{item.crop_type} • {item.seed_variety}</p>
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-xs font-mono bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200">
                          {item.batch_number}
                        </code>
                      </td>
                      {scope === 'network' && (
                        <td className="py-3 px-4">
                          <p className="text-gray-900 flex items-center gap-1 font-medium">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            {item.holder_first_name} {item.holder_last_name}
                          </p>
                          <span className="text-xs text-gray-500 capitalize">{item.holder_role}</span>
                        </td>
                      )}
                      <td className="py-3 px-4 text-gray-600">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          {item.location || 'Local Storage'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-gray-900 text-base">
                          {formatNumber(item.quantity)}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">
                          {item.unit_of_measurement || 'packets'}
                        </span>
                      </td>
                      <td className={`py-3 px-4 ${isExpired ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {formatDate(item.expiry_date)}
                        {isExpired && <span className="text-xs ml-1 text-red-500 font-bold">(Expired)</span>}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            item.quantity > 50 ? 'success' : item.quantity > 0 ? 'warning' : 'danger'
                          }
                        >
                          {item.quantity > 50 ? 'In Stock' : item.quantity > 0 ? 'Low Stock' : 'Depleted'}
                        </Badge>
                      </td>
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
