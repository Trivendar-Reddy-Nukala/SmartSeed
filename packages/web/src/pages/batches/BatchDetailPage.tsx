import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { batchesService, qrService, riskService } from '../../services';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Spinner';
import { formatDate, formatNumber, getRiskLevelColor } from '../../utils/format';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Clock, MapPin, ArrowRight, Download, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: batch, isLoading } = useQuery({ queryKey: ['batch', id], queryFn: () => batchesService.getById(id!) });
  const { data: timeline } = useQuery({ queryKey: ['batch-timeline', id], queryFn: () => batchesService.getTimeline(id!) });
  const { data: qrCodes } = useQuery({ queryKey: ['batch-qr', id], queryFn: () => qrService.listByBatch(id!) });
  const { data: riskData } = useQuery({ queryKey: ['batch-risk', id], queryFn: () => riskService.getBatchRisk(id!) });

  const assessMutation = useMutation({ mutationFn: () => riskService.assessBatch(id!), onSuccess: () => toast.success('Risk assessment completed') });
  const generateQrMutation = useMutation({ mutationFn: () => qrService.generate({ batchId: id!, count: 1 }), onSuccess: () => toast.success('QR code generated') });

  if (isLoading) return <PageLoader />;
  if (!batch) return <div>Batch not found</div>;

  const latestRisk = riskData?.riskHistory?.[0];
  const eventIcons: Record<string, any> = { manufactured: CheckCircle2, dispatched: ArrowRight, received: CheckCircle2, rejected: XCircle, investigation_opened: AlertTriangle };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{batch.batch_number}</h1>
          <p className="text-gray-500">{batch.product_name} — {batch.crop_type} / {batch.seed_variety}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => assessMutation.mutate()} loading={assessMutation.isPending}><RefreshCw className="w-4 h-4" /> Assess Risk</Button>
          <Button variant="outline" onClick={() => generateQrMutation.mutate()} loading={generateQrMutation.isPending}>Generate QR</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batch Info */}
        <Card title="Batch Information" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Status</span><div className="mt-1"><Badge variant="status" value={batch.status}>{batch.status.replace(/_/g, ' ')}</Badge></div></div>
            <div><span className="text-gray-500">Manufacturing Date</span><p className="mt-1 font-medium">{formatDate(batch.manufacturing_date)}</p></div>
            <div><span className="text-gray-500">Expiry Date</span><p className="mt-1 font-medium">{formatDate(batch.expiry_date)}</p></div>
            <div><span className="text-gray-500">Production Location</span><p className="mt-1 font-medium">{batch.production_location}</p></div>
            <div><span className="text-gray-500">Initial Quantity</span><p className="mt-1 font-medium">{formatNumber(batch.initial_quantity)} {batch.unit_of_measurement}</p></div>
            <div><span className="text-gray-500">Current Quantity</span><p className="mt-1 font-medium">{formatNumber(batch.current_quantity)} {batch.unit_of_measurement}</p></div>
          </div>
        </Card>

        {/* Risk Score */}
        <Card title="Risk Assessment">
          {latestRisk ? (
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-3xl font-bold ${getRiskLevelColor(latestRisk.risk_level)}`}>
                {latestRisk.score}
              </div>
              <p className="mt-3 text-sm font-medium capitalize">{latestRisk.risk_level} Risk</p>
              <p className="text-xs text-gray-500 mt-1">Assessed {formatDate(latestRisk.calculated_at)}</p>
            </div>
          ) : (
            <div className="text-center py-4">
              <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="mt-2 text-sm text-gray-500">No risk assessment yet</p>
              <Button size="sm" className="mt-3" onClick={() => assessMutation.mutate()}>Run Assessment</Button>
            </div>
          )}
        </Card>
      </div>

      {/* Supply Chain Timeline */}
      <Card title="Supply Chain Journey">
        {timeline?.length ? (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-6">
              {timeline.map((event: any, i: number) => {
                const Icon = eventIcons[event.event_type] || Clock;
                return (
                  <div key={event.id || i} className="relative flex gap-4 pl-10">
                    <div className="absolute left-2 w-5 h-5 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center">
                      <Icon className="w-3 h-3 text-green-700" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium capitalize">{event.event_type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-gray-500">{event.actor_first_name} {event.actor_last_name} ({event.actor_role || event.actor_user_role})</p>
                      {event.source_location && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{event.source_location}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(event.created_at)}</p>
                    </div>
                    {event.quantity && <span className="text-sm text-gray-600">{formatNumber(event.quantity)} units</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ) : <p className="text-sm text-gray-500">No supply chain events recorded yet</p>}
      </Card>

      {/* QR Codes */}
      <Card title="QR Codes" actions={<Button size="sm" variant="outline" onClick={() => generateQrMutation.mutate()}>Generate New</Button>}>
        {qrCodes?.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {qrCodes.slice(0, 8).map((qr: any) => (
              <div key={qr.id} className="border rounded-lg p-3 text-center">
                <QRCodeSVG value={`${window.location.origin}/verify/${qr.public_token}`} size={120} className="mx-auto" />
                <p className="text-xs text-gray-500 mt-2 truncate">{qr.public_token.substring(0, 16)}...</p>
                <p className="text-xs text-gray-400">Scans: {qr.scan_count}</p>
                <Badge variant="status" value={qr.status} className="mt-1">{qr.status}</Badge>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-500">No QR codes generated yet</p>}
      </Card>
    </div>
  );
}

