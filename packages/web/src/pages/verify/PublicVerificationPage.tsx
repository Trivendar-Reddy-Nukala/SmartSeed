import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { qrService } from '../../services';
import { PageLoader } from '../../components/ui/Spinner';
import { formatDate } from '../../utils/format';
import { CheckCircle2, AlertTriangle, XCircle, Shield, Leaf, MapPin, Calendar, Building2 } from 'lucide-react';

export function PublicVerificationPage() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ['verify', token],
    queryFn: () => qrService.verify(token!),
    enabled: !!token,
  });

  if (isLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center">
      <PageLoader />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <XCircle className="w-16 h-16 text-red-500 mx-auto" />
        <h1 className="text-xl font-bold mt-4">Invalid QR Code</h1>
        <p className="text-gray-500 mt-2">This QR code could not be verified</p>
      </div>
    </div>
  );

  const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    verified: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', label: 'Verified' },
    suspicious: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Caution' },
    warning: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Warning' },
    unverified: { icon: Shield, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Unverified' },
  };

  const status = statusConfig[data.verificationStatus] || statusConfig.unverified;
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-lg mx-auto p-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="p-2 bg-green-600 rounded-lg"><Leaf className="w-5 h-5 text-white" /></div>
            <span className="text-lg font-bold text-gray-900">SmartSeed</span>
          </div>
          <p className="text-sm text-gray-500">Product Verification</p>
        </div>

        {/* Status */}
        <div className={`${status.bg} rounded-2xl p-6 text-center mb-6`}>
          <StatusIcon className={`w-16 h-16 ${status.color} mx-auto`} />
          <h2 className={`text-2xl font-bold mt-3 ${status.color}`}>{status.label}</h2>
          {data.verificationStatus === 'verified' && <p className="text-sm text-green-700 mt-1">No known suspicious activity detected</p>}
          {data.verificationStatus === 'suspicious' && <p className="text-sm text-yellow-700 mt-1">Additional verification recommended</p>}
          {data.verificationStatus === 'warning' && <p className="text-sm text-red-700 mt-1">Avoid relying on this product until verified</p>}
        </div>

        {/* Warnings */}
        {data.warnings?.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            {data.warnings.map((w: string, i: number) => (
              <p key={i} className="text-sm text-red-700 flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />{w}</p>
            ))}
          </div>
        )}

        {/* Product Info */}
        {data.product && (
          <div className="bg-white rounded-xl shadow-sm border p-5 mb-4 space-y-3">
            <h3 className="font-semibold text-gray-900">Product Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Product</span><span className="font-medium">{data.product.productName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Brand</span><span className="font-medium">{data.product.brandName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Crop</span><span className="font-medium">{data.product.cropType} — {data.product.seedVariety}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Manufacturer</span><span className="font-medium">{data.product.manufacturerName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Batch No.</span><span className="font-medium">{data.product.batchNumber}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Mfg Date</span><span className="font-medium">{formatDate(data.product.manufacturingDate)}</span></div>
              <div className="flex justify-between">
                <span className="text-gray-500">Expiry Date</span>
                <span className={`font-medium ${data.product.isExpired ? 'text-red-600' : ''}`}>
                  {formatDate(data.product.expiryDate)} {data.product.isExpired && '(EXPIRED)'}
                </span>
              </div>
            </div>
            {data.product.certifications?.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Certifications</p>
                <div className="flex flex-wrap gap-1">{data.product.certifications.map((c: string, i: number) => <span key={i} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">{c}</span>)}</div>
              </div>
            )}
          </div>
        )}

        {/* Supply Chain Journey */}
        {data.journey?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-5 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Supply Chain Journey</h3>
            <div className="relative pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-green-200" />
              {data.journey.map((j: any, i: number) => (
                <div key={i} className="relative mb-4 last:mb-0">
                  <div className="absolute -left-4 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                  <p className="text-sm font-medium capitalize">{j.stage.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500">{j.actor} • {j.role}</p>
                  <p className="text-xs text-gray-400">{formatDate(j.date)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk */}
        <div className="bg-white rounded-xl shadow-sm border p-5 mb-4">
          <h3 className="font-semibold text-gray-900 mb-2">Risk Status</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Score:</span>
            <span className="text-lg font-bold">{data.riskScore || 0}/100</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${data.riskLevel === 'low' ? 'bg-green-100 text-green-700' : data.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' : data.riskLevel === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
              {data.riskLevel || 'low'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Total scans: {data.totalScans || 0}</p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">Powered by SmartSeed — Protecting farmers from counterfeit seeds</p>
      </div>
    </div>
  );
}

