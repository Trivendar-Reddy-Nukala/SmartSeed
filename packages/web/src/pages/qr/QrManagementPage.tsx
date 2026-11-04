import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { qrService, batchesService } from '../../services';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate, formatNumber } from '../../utils/format';
import { QrCode, Plus, Copy, Ban, Eye, Search, ExternalLink } from 'lucide-react';

export default function QrManagementPage() {
  const queryClient = useQueryClient();
  const [selectedBatch, setSelectedBatch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedQr, setSelectedQr] = useState<any>(null);
  const [generateForm, setGenerateForm] = useState({ batchId: '', quantity: 1 });

  const { data: batchesData } = useQuery({
    queryKey: ['batches-all'],
    queryFn: () => batchesService.list({ pageSize: 200 }),
  });
  const batches = batchesData?.data || [];

  const { data: qrCodes, isLoading } = useQuery({
    queryKey: ['qr-codes', selectedBatch],
    queryFn: () => qrService.listByBatch(selectedBatch),
    enabled: !!selectedBatch,
  });

  const { data: scanHistory } = useQuery({
    queryKey: ['qr-scans', selectedQr?.id],
    queryFn: () => qrService.getScanHistory(selectedQr.id),
    enabled: !!selectedQr?.id && showDetailModal,
  });

  const generateMutation = useMutation({
    mutationFn: (data: { batchId: string; quantity: number }) => qrService.generate(data),
    onSuccess: () => {
      toast.success('QR codes generated successfully');
      queryClient.invalidateQueries({ queryKey: ['qr-codes'] });
      setShowGenerateModal(false);
      setGenerateForm({ batchId: '', quantity: 1 });
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to generate QR codes'),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => qrService.revoke(id),
    onSuccess: () => {
      toast.success('QR code revoked');
      queryClient.invalidateQueries({ queryKey: ['qr-codes'] });
    },
    onError: () => toast.error('Failed to revoke QR code'),
  });

  const copyVerificationUrl = (token: string) => {
    const url = `${window.location.origin}/verify/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Verification URL copied to clipboard');
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'revoked': return 'danger';
      case 'expired': return 'warning';
      default: return 'default';
    }
  };

  const filteredQr = (qrCodes || []).filter((qr: any) => {
    if (statusFilter && qr.status !== statusFilter) return false;
    if (searchQuery && !qr.public_token?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">QR Code Management</h1>
          <p className="text-gray-500">Generate, track, and manage QR codes for seed batches</p>
        </div>
        <Button onClick={() => setShowGenerateModal(true)}>
          <Plus className="w-4 h-4 mr-2" /> Generate QR Codes
        </Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Select Batch"
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            options={[
              { value: '', label: 'Choose a batch...' },
              ...batches.map((b: any) => ({ value: b.id, label: `${b.batch_number} — ${b.product_name || 'N/A'}` })),
            ]}
          />
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'active', label: 'Active' },
              { value: 'revoked', label: 'Revoked' },
              { value: 'expired', label: 'Expired' },
            ]}
          />
          <Input
            label="Search Token"
            placeholder="Search by public token..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </Card>

      {!selectedBatch ? (
        <EmptyState
          icon={QrCode}
          title="Select a Batch"
          description="Choose a seed batch above to view and manage its QR codes."
        />
      ) : isLoading ? (
        <PageLoader />
      ) : filteredQr.length === 0 ? (
        <EmptyState
          icon={QrCode}
          title="No QR Codes"
          description="No QR codes found for this batch. Generate some using the button above."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Public Token</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Scans</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Last Scanned</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Created</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredQr.map((qr: any) => (
                  <tr key={qr.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{qr.public_token?.substring(0, 16)}...</code>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={statusVariant(qr.status)}>{qr.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{formatNumber(qr.scan_count || 0)}</td>
                    <td className="py-3 px-4 text-gray-500">{qr.last_scanned_at ? formatDate(qr.last_scanned_at) : '—'}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(qr.created_at)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setSelectedQr(qr); setShowDetailModal(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="View Details"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => copyVerificationUrl(qr.public_token)} className="p-1.5 text-gray-400 hover:text-green-600 rounded" title="Copy URL"><Copy className="w-4 h-4" /></button>
                        <a href={`/verify/${qr.public_token}`} target="_blank" rel="noreferrer" className="p-1.5 text-gray-400 hover:text-purple-600 rounded" title="Open"><ExternalLink className="w-4 h-4" /></a>
                        {qr.status === 'active' && (
                          <button onClick={() => { if (confirm('Revoke this QR code?')) revokeMutation.mutate(qr.id); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="Revoke"><Ban className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Generate Modal */}
      <Modal isOpen={showGenerateModal} onClose={() => setShowGenerateModal(false)} title="Generate QR Codes">
        <div className="space-y-4">
          <Select
            label="Batch"
            value={generateForm.batchId}
            onChange={(e) => setGenerateForm({ ...generateForm, batchId: e.target.value })}
            options={[{ value: '', label: 'Select a batch...' }, ...batches.map((b: any) => ({ value: b.id, label: b.batch_number }))]}
          />
          <Input label="Quantity" type="number" min={1} max={100} value={generateForm.quantity} onChange={(e) => setGenerateForm({ ...generateForm, quantity: parseInt(e.target.value) || 1 })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowGenerateModal(false)}>Cancel</Button>
            <Button onClick={() => generateMutation.mutate(generateForm)} isLoading={generateMutation.isPending} disabled={!generateForm.batchId || generateForm.quantity < 1}>Generate</Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => { setShowDetailModal(false); setSelectedQr(null); }} title="QR Code Details">
        {selectedQr && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Token</span><p className="font-mono text-xs mt-1 break-all">{selectedQr.public_token}</p></div>
              <div><span className="text-gray-500">Status</span><p className="mt-1"><Badge variant={statusVariant(selectedQr.status)}>{selectedQr.status}</Badge></p></div>
              <div><span className="text-gray-500">Total Scans</span><p className="mt-1 font-medium">{selectedQr.scan_count || 0}</p></div>
              <div><span className="text-gray-500">Created</span><p className="mt-1">{formatDate(selectedQr.created_at)}</p></div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Scan History</h4>
              {Array.isArray(scanHistory) && scanHistory.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {scanHistory.map((scan: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                      <span>{formatDate(scan.scanned_at)}</span>
                      <Badge variant={scan.scan_result === 'valid' ? 'success' : 'danger'}>{scan.scan_result}</Badge>
                      {scan.latitude && <span className="text-gray-400">{Number(scan.latitude).toFixed(2)}, {Number(scan.longitude).toFixed(2)}</span>}
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-gray-400">No scans recorded yet</p>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
