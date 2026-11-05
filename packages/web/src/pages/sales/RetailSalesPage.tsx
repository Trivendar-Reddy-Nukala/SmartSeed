import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesService } from '../../services';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Stats } from '../../components/ui/Stats';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate, formatNumber } from '../../utils/format';
import {
  ShoppingCart, Plus, Search, ShieldCheck, UserCheck, Receipt,
  Package, IndianRupee, Users, CheckCircle2, AlertCircle, Printer
} from 'lucide-react';
import toast from 'react-hot-toast';

export function RetailSalesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    batchId: '',
    farmerName: '',
    farmerPassbookNumber: '',
    farmerPhone: '',
    farmerVillage: '',
    quantity: 1,
    unitPrice: 450,
    paymentMethod: 'cash',
    notes: '',
  });

  // Fetch sales records
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales', page, search],
    queryFn: () => salesService.list({ page, pageSize: 20, search }),
  });

  // Fetch batches available in current retailer's inventory
  const { data: availableBatches = [] } = useQuery({
    queryKey: ['available-batches'],
    queryFn: salesService.getAvailableBatches,
  });

  const selectedBatchInfo = availableBatches.find((b: any) => b.batch_id === form.batchId);

  const createSaleMutation = useMutation({
    mutationFn: (saleInput: typeof form) => salesService.create(saleInput),
    onSuccess: (newSale) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['available-batches'] });
      queryClient.invalidateQueries({ queryKey: ['batches-inventory'] });
      toast.success(`Sale recorded successfully! Receipt #${newSale.receipt_number}`);
      setShowSaleModal(false);
      setSelectedReceipt(newSale);
      setForm({
        batchId: '',
        farmerName: '',
        farmerPassbookNumber: '',
        farmerPhone: '',
        farmerVillage: '',
        quantity: 1,
        unitPrice: 450,
        paymentMethod: 'cash',
        notes: '',
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to record sale');
    },
  });

  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.batchId) {
      toast.error('Please select a seed batch from your available stock');
      return;
    }
    if (!form.farmerName || !form.farmerPassbookNumber) {
      toast.error('Farmer name and passbook number are mandatory for verification');
      return;
    }
    if (form.quantity < 1) {
      toast.error('Quantity must be at least 1 packet');
      return;
    }
    if (selectedBatchInfo && form.quantity > selectedBatchInfo.available_stock) {
      toast.error(`Cannot sell more than available stock (${selectedBatchInfo.available_stock} packets)`);
      return;
    }
    createSaleMutation.mutate(form);
  };

  const sales = salesData?.data || [];
  const totalQuantitySold = sales.reduce((acc: number, s: any) => acc + (s.quantity || 0), 0);
  const totalRevenue = sales.reduce((acc: number, s: any) => acc + Number(s.total_price || 0), 0);
  const uniqueFarmers = new Set(sales.map((s: any) => s.farmer_passbook_number)).size;

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Farmer Sales & Distribution</h1>
          <p className="text-gray-500">
            Verify farmer passbooks and record certified seed sales directly at the retail point of sale
          </p>
        </div>
        <Button onClick={() => setShowSaleModal(true)}>
          <Plus className="w-4 h-4 mr-2" /> Record Sale to Farmer
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stats label="Packets Sold" value={formatNumber(totalQuantitySold)} icon={Package} />
        <Stats label="Total Revenue" value={`₹${formatNumber(totalRevenue)}`} icon={IndianRupee} />
        <Stats label="Farmers Served" value={formatNumber(uniqueFarmers)} icon={Users} />
        <Stats label="In-Stock Batches" value={formatNumber(availableBatches.length)} icon={ShoppingCart} />
      </div>

      {/* Search & Sales Table */}
      <Card>
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm bg-white"
            placeholder="Search by farmer name, passbook number, receipt #, or batch #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {sales.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 font-medium">Receipt #</th>
                  <th className="pb-3 font-medium">Farmer Details & Passbook</th>
                  <th className="pb-3 font-medium">Product & Batch</th>
                  <th className="pb-3 font-medium">Quantity</th>
                  <th className="pb-3 font-medium">Price</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale: any) => (
                  <tr key={sale.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 font-mono text-xs font-semibold text-gray-700">
                      {sale.receipt_number}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5 font-medium text-gray-900">
                        <UserCheck className="w-4 h-4 text-green-600" />
                        <span>{sale.farmer_name}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Passbook: <span className="font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{sale.farmer_passbook_number}</span>
                      </div>
                      {sale.farmer_village && (
                        <div className="text-xs text-gray-400">{sale.farmer_village}</div>
                      )}
                    </td>
                    <td className="py-3">
                      <p className="font-medium text-gray-900">{sale.product_name}</p>
                      <p className="text-xs text-gray-500">Batch: {sale.batch_number}</p>
                    </td>
                    <td className="py-3 font-semibold text-gray-800">
                      {sale.quantity} packets
                    </td>
                    <td className="py-3">
                      <div className="font-semibold text-gray-900">₹{Number(sale.total_price).toFixed(2)}</div>
                      <div className="text-xs text-gray-400">₹{sale.unit_price} / packet</div>
                    </td>
                    <td className="py-3 text-xs text-gray-500">
                      {formatDate(sale.created_at)}
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReceipt(sale)}
                      >
                        <Receipt className="w-3.5 h-3.5 mr-1" /> Bill
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={ShoppingCart}
            title="No Sales Recorded Yet"
            description="Record your first verified seed sale to a farmer using their passbook number."
            actionLabel="Record Sale"
            onAction={() => setShowSaleModal(true)}
          />
        )}
      </Card>

      {/* Record Sale Modal */}
      <Modal open={showSaleModal} onClose={() => setShowSaleModal(false)} title="Record Farmer Seed Sale" size="lg">
        <form onSubmit={handleSubmitSale} className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-lg text-xs flex items-start gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Government Certified Farmer Verification</p>
              <p className="mt-0.5 text-emerald-800">
                To prevent black-market hoardings and counterfeit seed diversion, enter the farmer&apos;s state Pattadar Passbook Number or PM-KISAN / Rythu Bharosa ID.
              </p>
            </div>
          </div>

          {/* 1. Batch Selection */}
          <div>
            <Select
              label="Select Seed Batch from Retail Stock *"
              value={form.batchId}
              onChange={(e) => setForm({ ...form, batchId: e.target.value })}
              options={availableBatches.map((b: any) => ({
                value: b.batch_id,
                label: `${b.product_name} | Batch: ${b.batch_number} (${b.available_stock} packets in stock)`,
              }))}
            />
            {selectedBatchInfo && (
              <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg flex justify-between">
                <span>Crop: <strong>{selectedBatchInfo.crop_type} ({selectedBatchInfo.seed_variety})</strong></span>
                <span>Available Stock: <strong className="text-green-700">{selectedBatchInfo.available_stock} packets</strong></span>
              </div>
            )}
            {!availableBatches.length && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                No batches currently available in your retail stock. First receive a shipment under Transfers.
              </p>
            )}
          </div>

          {/* 2. Farmer Authentication Details */}
          <div className="border-t pt-3">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-green-600" /> Farmer Identification
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Farmer Full Name *"
                placeholder="e.g. Venkat Rao"
                value={form.farmerName}
                onChange={(e) => setForm({ ...form, farmerName: e.target.value })}
                required
              />
              <Input
                label="Farmer Passbook Number (ID) *"
                placeholder="e.g. TS/PB-2026-90412"
                value={form.farmerPassbookNumber}
                onChange={(e) => setForm({ ...form, farmerPassbookNumber: e.target.value.toUpperCase() })}
                helperText="Pattadar Passbook No / Rythu Bharosa / PM-KISAN ID"
                required
              />
              <Input
                label="Contact Phone"
                placeholder="+91-9876543210"
                value={form.farmerPhone}
                onChange={(e) => setForm({ ...form, farmerPhone: e.target.value })}
              />
              <Input
                label="Village / Mandal / District"
                placeholder="e.g. Warangal Rural"
                value={form.farmerVillage}
                onChange={(e) => setForm({ ...form, farmerVillage: e.target.value })}
              />
            </div>
          </div>

          {/* 3. Quantity & Pricing */}
          <div className="border-t pt-3">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <IndianRupee className="w-4 h-4 text-green-600" /> Quantity & Billing
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                label="Quantity (Packets) *"
                type="number"
                min={1}
                max={selectedBatchInfo?.available_stock || 9999}
                value={String(form.quantity)}
                onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                required
              />
              <Input
                label="Unit Price (₹ per packet) *"
                type="number"
                min={1}
                step="0.5"
                value={String(form.unitPrice)}
                onChange={(e) => setForm({ ...form, unitPrice: parseFloat(e.target.value) || 0 })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Bill Amount</label>
                <div className="px-3 py-2 border rounded-lg bg-gray-50 text-base font-bold text-gray-900">
                  ₹{(form.quantity * form.unitPrice).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <Select
                label="Payment Method"
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                options={[
                  { value: 'cash', label: 'Cash Payment' },
                  { value: 'upi', label: 'UPI / QR Code Transfer' },
                  { value: 'card', label: 'Debit / Credit Card' },
                  { value: 'bank_transfer', label: 'Direct Bank Transfer / DBT' },
                ]}
              />
              <Input
                label="Notes / Receipt Remarks (optional)"
                placeholder="Field season Kharif 2026..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" type="button" onClick={() => setShowSaleModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createSaleMutation.isPending}>
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Confirm & Issue Sale Receipt
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bill / Receipt Modal */}
      {selectedReceipt && (
        <Modal open={!!selectedReceipt} onClose={() => setSelectedReceipt(null)} title="Farmer Seed Sale Receipt" size="md">
          <div className="space-y-4 text-sm">
            <div className="border border-green-200 bg-green-50/50 p-4 rounded-xl">
              <div className="flex justify-between items-start pb-3 border-b border-green-200">
                <div>
                  <h3 className="font-bold text-base text-green-900">SmartSeed Certified Retail Invoice</h3>
                  <p className="text-xs text-green-700">Blockchain-Secured Supply Chain Traceability</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-gray-800 bg-white px-2 py-1 border rounded">
                    {selectedReceipt.receipt_number}
                  </span>
                  <p className="text-[11px] text-gray-500 mt-1">{formatDate(selectedReceipt.created_at)}</p>
                </div>
              </div>

              {/* Farmer Info */}
              <div className="py-3 border-b border-green-100">
                <p className="text-xs uppercase font-semibold text-gray-500">Beneficiary Farmer</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="font-semibold text-gray-900">{selectedReceipt.farmer_name}</span>
                  <Badge variant="success">Authenticated</Badge>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Passbook Number: <span className="font-mono font-medium">{selectedReceipt.farmer_passbook_number}</span>
                </div>
                {selectedReceipt.farmer_village && (
                  <div className="text-xs text-gray-500">Location: {selectedReceipt.farmer_village}</div>
                )}
              </div>

              {/* Product Info */}
              <div className="py-3 border-b border-green-100">
                <p className="text-xs uppercase font-semibold text-gray-500">Seed Product Details</p>
                <p className="font-semibold text-gray-900 mt-1">{selectedReceipt.product_name}</p>
                <p className="text-xs text-gray-600">Batch Number: <span className="font-mono">{selectedReceipt.batch_number}</span></p>
                <div className="flex justify-between items-center mt-2 text-xs">
                  <span>Quantity: <strong>{selectedReceipt.quantity} packets</strong></span>
                  <span>Unit Price: <strong>₹{selectedReceipt.unit_price}</strong></span>
                </div>
              </div>

              {/* Total */}
              <div className="pt-3 flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500">Payment: <span className="capitalize font-medium text-gray-700">{selectedReceipt.payment_method}</span></p>
                  {selectedReceipt.blockchain_tx_id && (
                    <p className="text-[10px] text-gray-400 font-mono truncate max-w-[200px]">
                      Tx: {selectedReceipt.blockchain_tx_id}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Grand Total</p>
                  <p className="text-xl font-bold text-green-700">₹{Number(selectedReceipt.total_price).toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-1.5" /> Print Receipt
              </Button>
              <Button onClick={() => setSelectedReceipt(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
export default RetailSalesPage;

