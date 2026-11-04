import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../../services';
import { Card } from '../../components/ui/Card';
import { Stats } from '../../components/ui/Stats';
import { PageLoader } from '../../components/ui/Spinner';
import { formatNumber } from '../../utils/format';
import { ArrowLeftRight, ScanLine, ShieldAlert, Search, TrendingUp, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#16a34a', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const RISK_COLORS = { low: '#16a34a', medium: '#ca8a04', high: '#ea580c', critical: '#dc2626' };

type DateRange = '7d' | '30d' | '90d';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: analyticsService.getOverview,
  });

  const { data: supplyChain, isLoading: loadingSC } = useQuery({
    queryKey: ['analytics-supply-chain'],
    queryFn: analyticsService.getSupplyChain,
  });

  const { data: riskData, isLoading: loadingRisk } = useQuery({
    queryKey: ['analytics-risk'],
    queryFn: analyticsService.getRisk,
  });

  const isLoading = loadingOverview || loadingSC || loadingRisk;
  if (isLoading) return <PageLoader />;

  const ov = overview || {};
  const sc = supplyChain || {};
  const rd = riskData || {};

  // Process data for charts
  const transferTrend = (sc.transferTrend || sc.transfer_trend || []).map((d: any) => ({
    date: d.date?.substring(5, 10) || d.date,
    count: parseInt(d.count || d.total || 0),
  }));

  const riskDistribution = (rd.distribution || rd.riskDistribution || []).map((r: any) => ({
    name: r.risk_level || r.name,
    value: parseInt(r.count || r.value || 0),
  }));

  const topProducts = (sc.topProducts || sc.top_products || []).slice(0, 6).map((p: any) => ({
    name: p.name?.length > 20 ? p.name.substring(0, 20) + '...' : p.name,
    quantity: parseInt(p.total_quantity || p.quantity || 0),
  }));

  const roleActivity = (sc.roleActivity || sc.role_activity || []).map((r: any) => ({
    role: r.role?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    transfers: parseInt(r.transfers || r.count || 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-gray-500">Supply chain performance and insights</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['7d', '30d', '90d'] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${dateRange === range ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stats label="Total Transfers" value={formatNumber(ov.totalTransfers || ov.total_transfers || 0)} icon={ArrowLeftRight} />
        <Stats label="Total Scans" value={formatNumber(ov.totalScans || ov.total_scans || 0)} icon={ScanLine} />
        <Stats label="Avg Risk Score" value={Math.round(ov.avgRiskScore || ov.avg_risk_score || 0).toString()} icon={ShieldAlert} />
        <Stats label="Active Investigations" value={formatNumber(ov.activeInvestigations || ov.active_investigations || 0)} icon={Search} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Transfers Over Time">
          {transferTrend.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={transferTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-8 text-center">No transfer data available</p>
          )}
        </Card>

        <Card title="Risk Distribution">
          {riskDistribution.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {riskDistribution.map((entry: any) => (
                      <Cell key={entry.name} fill={(RISK_COLORS as any)[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-8 text-center">No risk data available</p>
          )}
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Top Products by Volume">
          {topProducts.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={130} />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-8 text-center">No product data available</p>
          )}
        </Card>

        <Card title="Activity by Role">
          {roleActivity.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roleActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="role" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="transfers" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-8 text-center">No activity data available</p>
          )}
        </Card>
      </div>

      {/* Quick Insights */}
      <Card title="Quick Insights">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Supply Chain Health</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{ov.supplyChainHealth || ov.supply_chain_health || 'Good'}</p>
            <p className="text-xs text-green-600 mt-1">{formatNumber(ov.completedTransfers || ov.completed_transfers || 0)} successful transfers</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Products Tracked</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{formatNumber(ov.totalProducts || ov.total_products || 0)}</p>
            <p className="text-xs text-blue-600 mt-1">{formatNumber(ov.totalBatches || ov.total_batches || 0)} active batches</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <ScanLine className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Verification Rate</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{ov.verificationRate || ov.verification_rate || '—'}%</p>
            <p className="text-xs text-purple-600 mt-1">of scans returned verified</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
