import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import billingService from '../../services/billingService';

function fmtCurrency(amount) {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }) {
  const map = {
    DRAFT: ['bg-slate-100 text-slate-700 border-slate-200', 'Draft'],
    ISSUED: ['bg-blue-50 text-blue-700 border-blue-200', 'Issued'],
    CANCELLED: ['bg-rose-50 text-rose-700 border-rose-200', 'Cancelled'],
  };
  const [cls, label] = map[status] || ['bg-slate-50 text-slate-600 border-slate-200', status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {label}
    </span>
  );
}

function PaymentStatusBadge({ status }) {
  const map = {
    UNPAID: ['bg-rose-50 text-rose-700 border-rose-200', 'Unpaid'],
    PARTIALLY_PAID: ['bg-amber-50 text-amber-700 border-amber-200', 'Partially Paid'],
    PAID: ['bg-emerald-50 text-emerald-700 border-emerald-200', 'Paid'],
    REFUNDED: ['bg-purple-50 text-purple-700 border-purple-200', 'Refunded'],
    PARTIALLY_REFUNDED: ['bg-indigo-50 text-indigo-700 border-indigo-200', 'Partially Refunded'],
  };
  const [cls, label] = map[status] || ['bg-slate-50 text-slate-600 border-slate-200', status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {label}
    </span>
  );
}

export default function InvoiceDetailsPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Payment Collection State
  const [paymentModes, setPaymentModes] = useState([]);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentModeId: '',
    transactionReference: '',
    notes: '',
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [confirmPaymentPrompt, setConfirmPaymentPrompt] = useState(false);

  // Cancel State
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const fetchInvoice = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await billingService.getInvoiceById(invoiceId);
      setInvoice(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const loadPaymentModes = async () => {
    try {
      const res = await billingService.getPaymentModes();
      setPaymentModes(res.data || []);
      if (res.data?.length > 0 && !paymentForm.paymentModeId) {
        setPaymentForm((prev) => ({ ...prev, paymentModeId: res.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to load payment modes', err);
    }
  };

  const openCollectModal = () => {
    setPaymentForm({
      amount: String(invoice.dueAmount || 0),
      paymentModeId: paymentModes[0]?.id || '',
      transactionReference: '',
      notes: '',
    });
    setPaymentError(null);
    setConfirmPaymentPrompt(false);
    loadPaymentModes();
    setIsCollectModalOpen(true);
  };

  const handleCollectPaymentSubmit = async () => {
    if (!confirmPaymentPrompt) {
      setConfirmPaymentPrompt(true);
      return;
    }
    try {
      setPaymentSubmitting(true);
      setPaymentError(null);
      const payload = {
        amount: Number(paymentForm.amount),
        paymentModeId: paymentForm.paymentModeId || undefined,
        transactionReference: paymentForm.transactionReference.trim() || undefined,
        notes: paymentForm.notes.trim() || undefined,
      };
      await billingService.collectPayment(invoice.id, payload);
      setIsCollectModalOpen(false);
      setConfirmPaymentPrompt(false);
      fetchInvoice();
    } catch (err) {
      setPaymentError(err?.response?.data?.message || 'Payment collection failed');
      setConfirmPaymentPrompt(false);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleIssueInvoice = async () => {
    try {
      await billingService.issueInvoice(invoice.id);
      fetchInvoice();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to issue invoice');
    }
  };

  const handleCancelInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setCancelError('Cancellation reason is mandatory');
      return;
    }
    try {
      setCancelSubmitting(true);
      setCancelError(null);
      await billingService.cancelInvoice(invoice.id, { cancellationReason: cancelReason.trim() });
      setIsCancelModalOpen(false);
      fetchInvoice();
    } catch (err) {
      setCancelError(err?.response?.data?.message || 'Failed to cancel invoice');
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Loading invoice details...</div>;
  }

  if (error || !invoice) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
          {error || 'Invoice not found'}
        </div>
        <button
          onClick={() => navigate('/hospital-admin/billing/invoices')}
          className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium"
        >
          &larr; Back to Invoices
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar (hidden during print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/hospital-admin/billing/invoices')}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            &larr; Invoices
          </button>
          <span className="text-slate-300">/</span>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{invoice.invoiceNumber}</h1>
          <StatusBadge status={invoice.status} />
          <PaymentStatusBadge status={invoice.paymentStatus} />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>

          {invoice.status === 'DRAFT' && (
            <button
              onClick={handleIssueInvoice}
              className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
            >
              Issue Invoice
            </button>
          )}

          {invoice.status !== 'CANCELLED' && Number(invoice.dueAmount) > 0 && (
            <button
              onClick={openCollectModal}
              className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Collect Payment
            </button>
          )}

          {invoice.status !== 'CANCELLED' && Number(invoice.paidAmount) === 0 && (
            <button
              onClick={() => {
                setCancelReason('');
                setCancelError(null);
                setIsCancelModalOpen(true);
              }}
              className="px-3 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium shadow-xs transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Main Printable Invoice Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-8 print:border-none print:shadow-none print:p-0 space-y-6">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b border-slate-200 gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">HOSPITAL INVOICE</h2>
            <p className="text-xs text-slate-500 mt-0.5">Healthcare Management System</p>
          </div>
          <div className="text-left sm:text-right text-sm">
            <span className="font-mono font-bold text-slate-800 text-base">{invoice.invoiceNumber}</span>
            <span className="block text-xs text-slate-500">Date: {fmtDate(invoice.invoiceDate)}</span>
            <div className="mt-1 flex items-center sm:justify-end gap-1.5">
              <StatusBadge status={invoice.status} />
              <PaymentStatusBadge status={invoice.paymentStatus} />
            </div>
          </div>
        </div>

        {/* Patient & Clinical Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Patient Details</span>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              {invoice.patient ? `${invoice.patient.firstName} ${invoice.patient.lastName}` : '—'}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">UHID: {invoice.patient?.uhid}</p>
            {invoice.patient?.phone && <p className="text-xs text-slate-600">Phone: {invoice.patient.phone}</p>}
            {invoice.patient?.gender && (
              <p className="text-xs text-slate-600">Gender: {invoice.patient.gender}</p>
            )}
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Clinical Context</span>
            {invoice.encounter && (
              <p className="text-xs text-slate-700 mt-1">
                Encounter: <span className="font-medium">{invoice.encounter.encounterNumber}</span> (
                {invoice.encounter.encounterType})
              </p>
            )}
            {invoice.appointment && (
              <p className="text-xs text-slate-700 mt-0.5">
                Appointment: <span className="font-medium">{invoice.appointment.appointmentNumber}</span>
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">Billed By: {invoice.creator?.name || 'Staff'}</p>
          </div>
        </div>

        {/* Cancellation Notice if cancelled */}
        {invoice.status === 'CANCELLED' && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
            <span className="font-bold">INVOICE CANCELLED:</span> {invoice.cancellationReason || 'No reason specified'}
            <span className="block text-[10px] text-rose-600 mt-0.5">
              Cancelled on {fmtDate(invoice.cancelledAt)} by {invoice.canceller?.name || 'Staff'}
            </span>
          </div>
        )}

        {/* Items Table */}
        <div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Service / Description</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-right">Disc</th>
                <th className="py-2.5 px-3 text-right">Tax</th>
                <th className="py-2.5 px-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="py-3 px-3 text-xs text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-900">{item.description}</span>
                      {item.billingService && (
                        <span className="block text-[11px] text-slate-400">
                          Code: {item.billingService.serviceCode} ({item.billingService.category})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-xs font-mono">{Number(item.quantity)}</td>
                    <td className="py-3 px-3 text-right text-xs font-mono">{fmtCurrency(item.unitPrice)}</td>
                    <td className="py-3 px-3 text-right text-xs font-mono text-rose-600">
                      {Number(item.discountAmount) > 0 ? `-${fmtCurrency(item.discountAmount)}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-xs font-mono text-slate-500">
                      {Number(item.taxAmount) > 0 ? `${fmtCurrency(item.taxAmount)} (${Number(item.taxPercentage)}%)` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-900 font-mono">
                      {fmtCurrency(item.lineTotal)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-6 text-center text-slate-400">
                    No items in this invoice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Summary Card */}
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <div className="w-full sm:w-80 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-medium">{fmtCurrency(invoice.subtotal)}</span>
            </div>
            {Number(invoice.discountAmount) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Total Discounts:</span>
                <span className="font-mono font-medium">-{fmtCurrency(invoice.discountAmount)}</span>
              </div>
            )}
            {Number(invoice.taxAmount) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Taxes:</span>
                <span className="font-mono font-medium">+{fmtCurrency(invoice.taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Grand Total:</span>
              <span className="font-mono text-indigo-700">{fmtCurrency(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-emerald-600">
              <span>Amount Paid:</span>
              <span className="font-mono">{fmtCurrency(invoice.paidAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-amber-600 pt-1 border-t border-slate-100">
              <span>Balance Outstanding:</span>
              <span className="font-mono">{fmtCurrency(invoice.dueAmount)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
            <span className="font-bold text-slate-700">Notes:</span> {invoice.notes}
          </div>
        )}

        {/* Payment History Section */}
        <div className="pt-6 border-t border-slate-200 space-y-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Payments & Receipts History</h3>
          {invoice.payments && invoice.payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-2 px-3">Payment #</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Mode</th>
                    <th className="py-2 px-3">Reference</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                    <th className="py-2 px-3">Receipt</th>
                    <th className="py-2 px-3">Received By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {invoice.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{p.paymentNumber}</td>
                      <td className="py-2.5 px-3 text-slate-500">{fmtDate(p.paymentDate)}</td>
                      <td className="py-2.5 px-3 font-medium">{p.paymentMode?.name || 'Cash'}</td>
                      <td className="py-2.5 px-3 text-slate-500">{p.transactionReference || '—'}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600 font-mono">
                        {fmtCurrency(p.amount)}
                      </td>
                      <td className="py-2.5 px-3">
                        {p.receipt ? (
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(p.receipt)}
                            className="text-indigo-600 hover:underline font-semibold"
                          >
                            {p.receipt.receiptNumber}
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{p.receiver?.name || 'Staff'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-400">No payments collected for this invoice yet.</p>
          )}
        </div>
      </div>

      {/* Collect Payment Modal */}
      {isCollectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Collect Payment</h3>
                <p className="text-xs text-slate-500">Invoice: {invoice.invoiceNumber}</p>
              </div>
              <button
                onClick={() => setIsCollectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                &times;
              </button>
            </div>

            <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Total</span>
                <span className="block text-sm font-bold text-slate-800">{fmtCurrency(invoice.totalAmount)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Paid</span>
                <span className="block text-sm font-bold text-emerald-600">{fmtCurrency(invoice.paidAmount)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Outstanding</span>
                <span className="block text-sm font-bold text-amber-600">{fmtCurrency(invoice.dueAmount)}</span>
              </div>
            </div>

            {paymentError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                {paymentError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={paymentForm.paymentModeId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentModeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800"
                >
                  {paymentModes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Amount to Collect (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  max={invoice.dueAmount}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Transaction Reference</label>
                <input
                  type="text"
                  placeholder="e.g. UPI-REF-109283"
                  value={paymentForm.transactionReference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows="2"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800"
                ></textarea>
              </div>
            </div>

            {confirmPaymentPrompt ? (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2">
                <p className="text-xs font-semibold text-amber-800">
                  Collect {fmtCurrency(paymentForm.amount)} from patient?
                </p>
                <div className="flex justify-center gap-2 pt-1">
                  <button
                    disabled={paymentSubmitting}
                    onClick={() => setConfirmPaymentPrompt(false)}
                    className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded text-xs font-medium"
                  >
                    Back
                  </button>
                  <button
                    disabled={paymentSubmitting}
                    onClick={handleCollectPaymentSubmit}
                    className="px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold"
                  >
                    {paymentSubmitting ? 'Processing...' : 'Confirm & Collect'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCollectModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCollectPaymentSubmit}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
                >
                  Collect {fmtCurrency(paymentForm.amount)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancel Invoice Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Cancel Invoice</h3>
            <p className="text-xs text-slate-500 mb-4">
              Cancelling is an audited financial action. Cancellation reason is mandatory.
            </p>

            {cancelError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleCancelInvoiceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Reason for Cancellation *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Specify why this invoice is being voided..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={cancelSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium"
                >
                  {cancelSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 print:shadow-none print:border-none print:m-0">
            <div className="text-center pb-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">PAYMENT RECEIPT</h3>
              <p className="text-xs text-slate-500">{selectedReceipt.receiptNumber}</p>
            </div>

            <div className="my-4 space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="font-semibold">{fmtDate(selectedReceipt.receiptDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice #:</span>
                <span className="font-mono">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-medium">
                  {invoice.patient ? `${invoice.patient.firstName} ${invoice.patient.lastName}` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">UHID:</span>
                <span className="font-mono">{invoice.patient?.uhid}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100 text-sm font-bold text-emerald-700">
                <span>Amount Paid:</span>
                <span className="font-mono">{fmtCurrency(selectedReceipt.amount)}</span>
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-4 border-t border-slate-100 print:hidden">
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
              >
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
