import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import billingService from '../../services/billingService';
import patientService from '../../services/patientService';

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
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
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
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

export default function BillingInvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);

  // Payment Collection Form State
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

  // Create Invoice Form State
  const [servicesCatalog, setServicesCatalog] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [unbilledData, setUnbilledData] = useState(null);
  const [unbilledLoading, setUnbilledLoading] = useState(false);

  const [newInvoiceItems, setNewInvoiceItems] = useState([
    {
      billingServiceId: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      discountAmount: 0,
      taxPercentage: 0,
      sourceType: 'OTHER',
      sourceId: null,
    },
  ]);
  const [invoiceLevelDiscount, setInvoiceLevelDiscount] = useState(0);
  const [invoiceStatus, setInvoiceStatus] = useState('ISSUED');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Fetch Invoices
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit: 15,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        paymentStatus: paymentStatusFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
      const res = await billingService.getInvoices(params);
      setInvoices(res.data.invoices || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, paymentStatusFilter, startDate, endDate]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Load masters on modal triggers
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

  const loadServicesCatalog = async () => {
    try {
      const res = await billingService.getServices({ isActive: true, limit: 100 });
      setServicesCatalog(res.data.services || []);
    } catch (err) {
      console.error('Failed to load services catalog', err);
    }
  };

  // Open Collect Payment Modal
  const openCollectModal = (inv) => {
    setSelectedInvoiceForPayment(inv);
    setPaymentForm({
      amount: String(inv.dueAmount || 0),
      paymentModeId: paymentModes[0]?.id || '',
      transactionReference: '',
      notes: '',
    });
    setPaymentError(null);
    setConfirmPaymentPrompt(false);
    loadPaymentModes();
    setIsCollectModalOpen(true);
  };

  // Submit Payment
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
      await billingService.collectPayment(selectedInvoiceForPayment.id, payload);
      setIsCollectModalOpen(false);
      setConfirmPaymentPrompt(false);
      fetchInvoices();
    } catch (err) {
      setPaymentError(err?.response?.data?.message || 'Payment collection failed');
      setConfirmPaymentPrompt(false);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Open Create Invoice Modal
  const openCreateModal = () => {
    setSelectedPatient(null);
    setPatientSearch('');
    setPatientResults([]);
    setUnbilledData(null);
    setNewInvoiceItems([
      {
        billingServiceId: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        discountAmount: 0,
        taxPercentage: 0,
        sourceType: 'OTHER',
        sourceId: null,
      },
    ]);
    setInvoiceLevelDiscount(0);
    setInvoiceStatus('ISSUED');
    setInvoiceNotes('');
    setCreateError(null);
    loadServicesCatalog();
    setIsCreateModalOpen(true);
  };

  // Patient Search Debounce
  useEffect(() => {
    if (!patientSearch || patientSearch.trim().length < 2) {
      setPatientResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await patientService.getPatients({ search: patientSearch.trim(), limit: 5 });
        setPatientResults(res.data.patients || []);
      } catch (err) {
        console.error('Patient search error', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  // When patient is selected, load unbilled items
  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    setPatientResults([]);
    setPatientSearch(`${patient.firstName} ${patient.lastName} (${patient.uhid})`);
    try {
      setUnbilledLoading(true);
      const res = await billingService.getUnbilledItemsForPatient(patient.id);
      setUnbilledData(res.data);
    } catch (err) {
      console.error('Failed to load unbilled items', err);
    } finally {
      setUnbilledLoading(false);
    }
  };

  // Add Item Row
  const handleAddItemRow = () => {
    setNewInvoiceItems((prev) => [
      ...prev,
      {
        billingServiceId: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        discountAmount: 0,
        taxPercentage: 0,
        sourceType: 'OTHER',
        sourceId: null,
      },
    ]);
  };

  // Remove Item Row
  const handleRemoveItemRow = (idx) => {
    setNewInvoiceItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Item Field Change
  const handleItemChange = (idx, field, val) => {
    setNewInvoiceItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };

      // If service selected, populate defaults
      if (field === 'billingServiceId' && val) {
        const srv = servicesCatalog.find((s) => s.id === val);
        if (srv) {
          copy[idx].description = srv.serviceName;
          copy[idx].unitPrice = Number(srv.defaultPrice || 0);
          copy[idx].taxPercentage = Number(srv.taxPercentage || 0);
        }
      }
      return copy;
    });
  };

  // Add Unbilled Item to Line Items
  const handleAddUnbilledItem = (type, item) => {
    if (type === 'APPOINTMENT') {
      setNewInvoiceItems((prev) => [
        ...prev.filter((i) => i.description || i.unitPrice > 0),
        {
          billingServiceId: '',
          description: `Doctor Consultation (${item.doctor?.name || 'Physician'})`,
          quantity: 1,
          unitPrice: Number(item.doctor?.consultationFee || 500),
          discountAmount: 0,
          taxPercentage: 0,
          sourceType: 'APPOINTMENT',
          sourceId: item.id,
        },
      ]);
    } else if (type === 'INVESTIGATION') {
      setNewInvoiceItems((prev) => [
        ...prev.filter((i) => i.description || i.unitPrice > 0),
        {
          billingServiceId: '',
          description: `Lab Test: ${item.investigation?.name || 'Investigation'}`,
          quantity: 1,
          unitPrice: Number(item.investigation?.defaultCharge || 0),
          discountAmount: 0,
          taxPercentage: 0,
          sourceType: 'INVESTIGATION',
          sourceId: item.id,
        },
      ]);
    } else if (type === 'PHARMACY') {
      const totalAmount = item.items?.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0) || 0;
      setNewInvoiceItems((prev) => [
        ...prev.filter((i) => i.description || i.unitPrice > 0),
        {
          billingServiceId: '',
          description: `Prescription Dispensing (${item.dispensingNumber})`,
          quantity: 1,
          unitPrice: totalAmount,
          discountAmount: 0,
          taxPercentage: 0,
          sourceType: 'PHARMACY',
          sourceId: item.id,
        },
      ]);
    }
  };

  // Live calculation preview
  const previewSubtotal = newInvoiceItems.reduce(
    (sum, it) => sum + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
    0
  );
  const previewItemDiscounts = newInvoiceItems.reduce((sum, it) => sum + (Number(it.discountAmount) || 0), 0);
  const previewTotalDiscount = previewItemDiscounts + (Number(invoiceLevelDiscount) || 0);
  const previewTax = newInvoiceItems.reduce((sum, it) => {
    const base = (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0);
    const disc = Number(it.discountAmount) || 0;
    const taxable = Math.max(0, base - disc);
    return sum + (taxable * (Number(it.taxPercentage) || 0)) / 100;
  }, 0);
  const previewGrandTotal = Math.max(0, previewSubtotal - previewTotalDiscount + previewTax);

  // Submit New Invoice
  const handleCreateInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setCreateError('Please select a patient');
      return;
    }
    if (newInvoiceItems.length === 0 || !newInvoiceItems[0].description) {
      setCreateError('Please add at least one item with description');
      return;
    }
    try {
      setCreateSubmitting(true);
      setCreateError(null);
      const payload = {
        patientId: selectedPatient.id,
        items: newInvoiceItems.map((it) => ({
          billingServiceId: it.billingServiceId || undefined,
          description: it.description,
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
          discountAmount: Number(it.discountAmount) || 0,
          taxPercentage: Number(it.taxPercentage) || 0,
          sourceType: it.sourceType || 'OTHER',
          sourceId: it.sourceId || undefined,
        })),
        discountAmount: Number(invoiceLevelDiscount) || 0,
        status: invoiceStatus,
        notes: invoiceNotes.trim() || undefined,
      };

      const res = await billingService.createInvoice(payload);
      setIsCreateModalOpen(false);
      fetchInvoices();
      navigate(`/hospital-admin/billing/invoices/${res.data.id}`);
    } catch (err) {
      setCreateError(err?.response?.data?.message || 'Failed to create invoice');
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/hospital-admin/billing')}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium transition"
            >
              &larr; Overview
            </button>
            <span className="text-slate-300">/</span>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Invoices</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Browse, search, generate invoices, and collect payments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Invoice
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="sm:col-span-2">
            <input
              type="text"
              placeholder="Search invoice #, patient, UHID, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="ISSUED">Issued</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <select
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">All Payment Statuses</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-1/2 px-2 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-xs text-slate-700"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-1/2 px-2 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-xs text-slate-700"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Outstanding</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800">
                        {inv.patient ? `${inv.patient.firstName} ${inv.patient.lastName}` : '—'}
                      </span>
                      <span className="block text-xs text-slate-400">
                        {inv.patient?.uhid} {inv.patient?.phone ? `• ${inv.patient.phone}` : ''}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">{fmtDate(inv.invoiceDate)}</td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-900">
                      {fmtCurrency(inv.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-emerald-600">
                      {fmtCurrency(inv.paidAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-amber-600">
                      {fmtCurrency(inv.dueAmount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <StatusBadge status={inv.status} />
                        <PaymentStatusBadge status={inv.paymentStatus} />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/hospital-admin/billing/invoices/${inv.id}`)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded border border-slate-200 transition"
                        >
                          View
                        </button>
                        {inv.status !== 'CANCELLED' && Number(inv.dueAmount) > 0 && (
                          <button
                            onClick={() => openCollectModal(inv)}
                            className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition"
                          >
                            Collect
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No invoices match your search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {invoices.length} of {total} invoice(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50 transition"
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Collect Payment Modal */}
      {isCollectModalOpen && selectedInvoiceForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Collect Payment</h3>
                <p className="text-xs text-slate-500">Invoice: {selectedInvoiceForPayment.invoiceNumber}</p>
              </div>
              <button
                onClick={() => setIsCollectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                &times;
              </button>
            </div>

            {/* Financial Summary Card */}
            <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Total</span>
                <span className="block text-sm font-bold text-slate-800">
                  {fmtCurrency(selectedInvoiceForPayment.totalAmount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Paid</span>
                <span className="block text-sm font-bold text-emerald-600">
                  {fmtCurrency(selectedInvoiceForPayment.paidAmount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Outstanding</span>
                <span className="block text-sm font-bold text-amber-600">
                  {fmtCurrency(selectedInvoiceForPayment.dueAmount)}
                </span>
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {paymentModes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Amount to Collect (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedInvoiceForPayment.dueAmount}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Transaction Reference (UPI ID, Cheque #, Card Ref)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI-REF-109283"
                  value={paymentForm.transactionReference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows="2"
                  placeholder="Optional collection notes..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                ></textarea>
              </div>
            </div>

            {confirmPaymentPrompt ? (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2">
                <p className="text-xs font-semibold text-amber-800">
                  Confirm collecting {fmtCurrency(paymentForm.amount)} from patient?
                </p>
                <p className="text-[11px] text-amber-700">
                  A verifiable receipt will be created immediately.
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
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCollectPaymentSubmit}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition"
                >
                  Collect {fmtCurrency(paymentForm.amount)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create New Invoice Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 border border-slate-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create New Invoice</h3>
                <p className="text-xs text-slate-500">Bill clinical services, investigations, or medicines.</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                &times;
              </button>
            </div>

            {createError && (
              <div className="my-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4 mt-4">
              {/* Patient Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Select Patient *</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search patient by name, UHID, or phone..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      if (selectedPatient) setSelectedPatient(null);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  {patientResults.length > 0 && !selectedPatient && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {patientResults.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectPatient(p)}
                          className="p-2.5 hover:bg-indigo-50/60 cursor-pointer text-sm"
                        >
                          <span className="font-semibold text-slate-900">
                            {p.firstName} {p.lastName}
                          </span>
                          <span className="block text-xs text-slate-400">
                            UHID: {p.uhid} • Phone: {p.phone || 'N/A'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Unbilled Clinical Items Assistant */}
              {selectedPatient && unbilledData && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Unbilled Clinical Records for {selectedPatient.firstName}
                    </span>
                    {unbilledLoading && <span className="text-xs text-slate-400">Loading...</span>}
                  </div>

                  {unbilledData.appointments?.length === 0 &&
                  unbilledData.investigationOrders?.length === 0 &&
                  unbilledData.dispensings?.length === 0 ? (
                    <p className="text-xs text-slate-400">No unbilled clinical activities pending.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {unbilledData.appointments?.map((apt) => (
                        <button
                          type="button"
                          key={apt.id}
                          onClick={() => handleAddUnbilledItem('APPOINTMENT', apt)}
                          className="px-2.5 py-1 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 rounded-md text-xs font-medium transition"
                        >
                          + Add Appointment ({fmtCurrency(apt.doctor?.consultationFee || 500)})
                        </button>
                      ))}

                      {unbilledData.investigationOrders?.map((inv) => (
                        <button
                          type="button"
                          key={inv.id}
                          onClick={() => handleAddUnbilledItem('INVESTIGATION', inv)}
                          className="px-2.5 py-1 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium transition"
                        >
                          + Add Lab: {inv.investigation?.name} ({fmtCurrency(inv.investigation?.defaultCharge)})
                        </button>
                      ))}

                      {unbilledData.dispensings?.map((disp) => (
                        <button
                          type="button"
                          key={disp.id}
                          onClick={() => handleAddUnbilledItem('PHARMACY', disp)}
                          className="px-2.5 py-1 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 rounded-md text-xs font-medium transition"
                        >
                          + Add Pharmacy ({disp.dispensingNumber})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-700">Invoice Items *</label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    + Add Item Row
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                  {newInvoiceItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50/80 border border-slate-200 rounded-lg grid grid-cols-12 gap-2 items-center text-xs"
                    >
                      <div className="col-span-4">
                        <select
                          value={item.billingServiceId}
                          onChange={(e) => handleItemChange(idx, 'billingServiceId', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-slate-800 text-xs mb-1"
                        >
                          <option value="">-- Catalog Service --</option>
                          {servicesCatalog.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.serviceName} ({fmtCurrency(s.defaultPrice)})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Description *"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-slate-800 text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-400">Qty</label>
                        <input
                          type="number"
                          min="0.01"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-slate-800 text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-400">Price (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-slate-800 text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-400">Disc (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.discountAmount}
                          onChange={(e) => handleItemChange(idx, 'discountAmount', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-slate-800 text-xs"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[10px] text-slate-400">Tax%</label>
                        <input
                          type="number"
                          step="1"
                          value={item.taxPercentage}
                          onChange={(e) => handleItemChange(idx, 'taxPercentage', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-slate-800 text-xs"
                        />
                      </div>
                      <div className="col-span-1 text-center pt-3">
                        {newInvoiceItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-rose-500 hover:text-rose-700 text-sm font-bold"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount & Totals Summary Preview */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-600">Invoice Discount (₹):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={invoiceLevelDiscount}
                      onChange={(e) => setInvoiceLevelDiscount(e.target.value)}
                      className="w-24 px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="invStatus"
                        value="ISSUED"
                        checked={invoiceStatus === 'ISSUED'}
                        onChange={() => setInvoiceStatus('ISSUED')}
                      />
                      <span>Issue Immediately</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="invStatus"
                        value="DRAFT"
                        checked={invoiceStatus === 'DRAFT'}
                        onChange={() => setInvoiceStatus('DRAFT')}
                      />
                      <span>Save as Draft</span>
                    </label>
                  </div>
                </div>

                <div className="text-right text-xs space-y-1">
                  <div className="text-slate-500">Subtotal: {fmtCurrency(previewSubtotal)}</div>
                  <div className="text-rose-600">Discounts: -{fmtCurrency(previewTotalDiscount)}</div>
                  <div className="text-slate-500">Tax: +{fmtCurrency(previewTax)}</div>
                  <div className="text-base font-bold text-slate-900 pt-1 border-t border-slate-200">
                    Grand Total: {fmtCurrency(previewGrandTotal)}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows="2"
                  placeholder="Optional billing remarks..."
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
                >
                  {createSubmitting ? 'Saving...' : invoiceStatus === 'ISSUED' ? 'Issue Invoice' : 'Save Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
