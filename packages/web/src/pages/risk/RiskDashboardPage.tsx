import { useQuery } from '@tanstack/react-query';
import { riskService } from '../../services';
import { Stats } from '../../components/ui/Stats';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { formatDate, formatNumber, getRiskLevelColor } from '../../utils/format';
import { ShieldAlert, AlertTriangle, Search, Shield, ShieldCheck } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const RISK_COLORS = { low: '#16a34a', medium: '#ca8a04', high: '#ea580c', critical: '#dc2626' };

export function RiskDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['risk-dashboard'], queryFn: riskService.getDashboard });

  if (isLoading) return <PageLoader />;
  const o = data?.overview || {};

  const pieData = (data?.riskDistribution || []).map((r: any) => ({ name: r.risk_level, value: parseInt(r.count) }));
  const trendData = (data?.anomalyTrend || []).map((d: any) => ({ date: d.date?.substring(5, 10), count: parseInt(d.count) }));

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Risk Management</h1><p className="text-gray-500">Monitor counterfeit risk and anomalies</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stats label="Total Batches" value={formatNumber(o.totalBatches || 0)} icon={Shield} />
        <Stats label="High Risk Batches" value={formatNumber(o.highRiskBatches || 0)} icon={ShieldAlert} />
        <Stats label="Critical Alerts" value={formatNumber(o.criticalAlerts || 0)} icon={AlertTriangle} />
        <Stats label="Pending Investigations" value={formatNumber(o.pendingInvestigations || 0)} icon={Search} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Risk Distribution">
          {pieData.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((entry: any) => <Cell key={entry.name} fill={(RISK_COLORS as any)[entry.name] || '#94a3b8'} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-gray-500 py-8 text-center">No risk data available</p>}
        </Card>

        <Card title="Anomaly Trend (30 Days)">
          {trendData.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-gray-500 py-8 text-center">No anomaly data yet</p>}
        </Card>
      </div>

      <Card title="Recent Alerts">
        {data?.recentAlerts?.length ? (
          <div className="space-y-3">
            {data.recentAlerts.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                <div className={`p-2 rounded-lg ${a.severity === 'critical' ? 'bg-red-100' : 'bg-orange-100'}`}>
                  <AlertTriangle className={`w-4 h-4 ${a.severity === 'critical' ? 'text-red-600' : 'text-orange-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(a.created_at)}</p>
                </div>
                <Badge variant="risk" value={a.severity}>{a.severity}</Badge>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-500">No recent alerts</p>}
      </Card>
    </div>
  );
}

