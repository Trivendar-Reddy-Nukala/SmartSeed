import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { analyticsService } from '../../services';
import { Stats } from '../../components/ui/Stats';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Spinner';
import { formatDate, formatNumber } from '../../utils/format';
import {
  Package,
  Boxes,
  ArrowLeftRight,
  AlertTriangle,
  Building2,
  Archive,
  ShoppingCart,
  IndianRupee,
  Truck,
  PlusCircle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: analyticsService.getOverview,
  });

  if (isLoading) return <PageLoader />;
  const stats = data?.stats || {};
  const isFreshTenant = (stats.products === 0 && stats.batches === 0 && user?.role === 'manufacturer');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-gray-500 mt-1">
            {user?.role === 'retailer' && 'Retail Point-of-Sale & Store Inventory Dashboard'}
            {user?.role === 'distributor' && 'Regional Distribution Hub & Warehouse Tracking'}
            {user?.role === 'manufacturer' && 'Seed Production, Quality Control & Supply Chain Network'}
            {user?.role === 'platform_admin' && 'SmartSeed Global Platform Overview'}
          </p>
        </div>

        {user?.role === 'retailer' && (
          <Link to="/sales">
            <Button className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Sell to Farmers (POS)
            </Button>
          </Link>
        )}
        {(user?.role === 'manufacturer' || user?.role === 'distributor') && (
          <Link to="/transfers">
            <Button className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4" /> New Transfer
            </Button>
          </Link>
        )}
      </div>

      {/* Fresh Tenant Quick Start Guide if zero records */}
      {isFreshTenant && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-green-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" /> Organization Activated!
              </h3>
              <p className="text-sm text-green-700 mt-1">
                To start tracking seed batches on the blockchain, add your seed varieties and create your first manufacturing batch.
              </p>
            </div>
            <div className="flex gap-2">
              <Link to="/products">
                <Button size="sm" className="bg-green-700 hover:bg-green-800">
                  <PlusCircle className="w-4 h-4 mr-1.5" /> Add Product
                </Button>
              </Link>
              <Link to="/batches">
                <Button size="sm" variant="outline" className="border-green-600 text-green-800 hover:bg-green-100">
                  <Boxes className="w-4 h-4 mr-1.5" /> Create Batch
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Role-Specific Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {user?.role === 'platform_admin' && (
          <>
            <Stats label="Organizations" value={formatNumber(stats.tenants || 0)} icon={Building2} />
            <Stats label="Registered Products" value={formatNumber(stats.products || 0)} icon={Package} />
            <Stats label="Batches Manufactured" value={formatNumber(stats.batches || 0)} icon={Boxes} />
            <Stats label="Supply Chain Transfers" value={formatNumber(stats.transfers || 0)} icon={ArrowLeftRight} />
          </>
        )}

        {user?.role === 'manufacturer' && (
          <>
            <Stats label="Factory Stock in Hand" value={formatNumber(stats.myUnitsInStock || 0)} icon={Archive} />
            <Stats label="Seed Varieties" value={formatNumber(stats.products || 0)} icon={Package} />
            <Stats label="Batches Produced" value={formatNumber(stats.batches || 0)} icon={Boxes} />
            <Stats label="Transfers Dispatched" value={formatNumber(stats.transfers || 0)} icon={Truck} />
          </>
        )}

        {user?.role === 'distributor' && (
          <>
            <Stats label="Warehouse Stock in Hand" value={formatNumber(stats.myUnitsInStock || 0)} icon={Archive} />
            <Stats label="Shipments Received" value={formatNumber(stats.myIncomingTransfers || 0)} icon={Truck} />
            <Stats label="Dispatched to Retailers" value={formatNumber(stats.myOutgoingTransfers || 0)} icon={ArrowLeftRight} />
            <Stats label="Active Seed Varieties" value={formatNumber(stats.products || 0)} icon={Package} />
          </>
        )}

        {user?.role === 'retailer' && (
          <>
            <Stats label="Shop Stock in Hand" value={formatNumber(stats.myUnitsInStock || 0)} icon={Archive} />
            <Stats label="Sales to Farmers" value={formatNumber(stats.totalSalesCount || 0)} icon={ShoppingCart} />
            <Stats label="Packets Sold" value={formatNumber(stats.totalSalesUnits || 0)} icon={Package} />
            <Stats label="Total Revenue" value={`₹${formatNumber(stats.totalSalesRevenue || 0)}`} icon={IndianRupee} />
          </>
        )}
      </div>

      {/* Recent Batches and Transfers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Recent Seed Batches"
          actions={
            <Link to="/batches" className="text-xs text-green-700 hover:text-green-800 font-medium inline-flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {data?.recentBatches?.length ? (
            <div className="space-y-3">
              {data.recentBatches.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{b.batch_number}</p>
                    <p className="text-xs text-gray-500">{b.product_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="status" value={b.status}>{b.status.replace(/_/g, ' ')}</Badge>
                    <span className="text-xs text-gray-400">{formatDate(b.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-3 text-center">No batches recorded yet</p>
          )}
        </Card>

        <Card
          title="Recent Supply Chain Transfers"
          actions={
            <Link to="/transfers" className="text-xs text-green-700 hover:text-green-800 font-medium inline-flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {data?.recentTransfers?.length ? (
            <div className="space-y-3">
              {data.recentTransfers.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Batch: {t.batch_number}</p>
                    <p className="text-xs text-gray-500">Qty: {formatNumber(t.quantity)} packets</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="status" value={t.status}>{t.status}</Badge>
                    <span className="text-xs text-gray-400">{formatDate(t.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-3 text-center">No transfers recorded yet</p>
          )}
        </Card>
      </div>
    </div>
  );
}
