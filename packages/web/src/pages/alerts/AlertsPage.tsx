import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { riskService } from '../../services';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Stats } from '../../components/ui/Stats';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate, formatNumber } from '../../utils/format';
import { AlertTriangle, ShieldAlert, ShieldCheck, Bell, CheckCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [severityFilter, setSeverityFilter] = useState('');
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  // Fetch risk dashboard which includes alerts
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['risk-dashboard'],
    queryFn: riskService.getDashboard,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const alerts: any[] = dashboard?.recentAlerts || [];
  const overview = dashboard?.overview || {};

  // Filter alerts
  const filteredAlerts = alerts.filter((a: any) => {
    if (severityFilter && a.severity !== severityFilter) return false;
    return true;
  });

  // Count by severity
  const criticalCount = alerts.filter((a: any) => a.severity === 'critical').length;
  const highCount = alerts.filter((a: any) => a.severity === 'high').length;
  const warningCount = alerts.filter((a: any) => a.severity === 'warning').length;
  const infoCount = alerts.filter((a: any) => a.severity === 'info').length;

  const severityConfig: Record<string, { bg: string; text: string; border: string; icon: string; badgeVariant: string }> = {
    critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'text-red-600', badgeVariant: 'danger' },
    high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: 'text-orange-600', badgeVariant: 'warning' },
    warning: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: 'text-yellow-600', badgeVariant: 'warning' },
    info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'text-blue-600', badgeVariant: 'default' },
  };

  const getSeverityConfig = (severity: string) => severityConfig[severity] || severityConfig.info;

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alerts</h1>
          <p className="text-gray-500">Monitor and manage supply chain alerts</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Auto-refreshing every 30s
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stats label="Total Alerts" value={formatNumber(alerts.length)} icon={Bell} />
        <Stats label="Critical" value={formatNumber(criticalCount)} icon={ShieldAlert} />
        <Stats label="High" value={formatNumber(highCount)} icon={AlertTriangle} />
        <Stats label="Resolved" value={formatNumber(overview.resolvedAlerts || 0)} icon={CheckCircle} />
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            options={[
              { value: '', label: 'All severities' },
              { value: 'critical', label: `Critical (${criticalCount})` },
              { value: 'high', label: `High (${highCount})` },
              { value: 'warning', label: `Warning (${warningCount})` },
              { value: 'info', label: `Info (${infoCount})` },
            ]}
          />
        </div>
      </Card>

      {/* Alert List */}
      {filteredAlerts.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No Alerts"
          description="No alerts match your current filters. The system is running smoothly."
        />
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert: any) => {
            const config = getSeverityConfig(alert.severity);
            const isExpanded = expandedAlert === alert.id;

            return (
              <div
                key={alert.id}
                className={`border rounded-lg overflow-hidden transition-all ${config.border} ${isExpanded ? config.bg : 'bg-white hover:bg-gray-50'}`}
              >
                {/* Alert Header */}
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer"
                  onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                >
                  <div className={`p-2 rounded-lg ${config.bg} flex-shrink-0`}>
                    <AlertTriangle className={`w-5 h-5 ${config.icon}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={config.badgeVariant as any}>{alert.severity}</Badge>
                      <span className="text-xs text-gray-400">{alert.alert_type?.replace(/_/g, ' ')}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">{alert.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{alert.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>Batch: {alert.batch_number || alert.batch_id?.substring(0, 8)}</span>
                      {alert.risk_score != null && <span>Risk Score: <span className="font-medium text-gray-600">{alert.risk_score}</span></span>}
                      <span>{formatDate(alert.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {alert.risk_score != null && (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        alert.risk_score >= 80 ? 'bg-red-500' : alert.risk_score >= 60 ? 'bg-orange-500' : alert.risk_score >= 30 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}>
                        {alert.risk_score}
                      </div>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className={`px-4 pb-4 pt-0 border-t ${config.border}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Alert Details</h4>
                        <p className="text-sm text-gray-700">{alert.description}</p>
                        {alert.alert_type && (
                          <p className="text-xs text-gray-500 mt-2">Type: <span className="font-medium">{alert.alert_type.replace(/_/g, ' ')}</span></p>
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Risk Assessment</h4>
                        <div className="space-y-1 text-sm">
                          <p>Risk Score: <span className="font-bold">{alert.risk_score ?? '—'}</span> / 100</p>
                          <p>Severity: <span className="font-medium capitalize">{alert.severity}</span></p>
                          {alert.investigation_id && <p>Investigation: <span className="font-mono text-xs">{alert.investigation_id.substring(0, 8)}...</span></p>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      {alert.investigation_id ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); navigate(`/investigations/${alert.investigation_id}`); }}
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1" /> View Investigation
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); navigate('/investigations'); }}
                        >
                          Open Investigation
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
