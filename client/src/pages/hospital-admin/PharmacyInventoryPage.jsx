import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import pharmacyService from '../../services/pharmacyService';
import clinicalMasterService from '../../services/clinicalMasterService';

export default function PharmacyInventoryPage() {
  const [batches, setBatches] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [stockStatus, setStockStatus] = useState('');

  // Modals
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchTransactions, setBatchTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Stock-In Form State
  const [stockInForm, setStockInForm] = useState({
    medicineId: '',
    batchNumber: '',
    expiryDate: '',
    manufacturingDate: '',
    purchaseRate: '',
    sellingRate: '',
    quantity: '',
    reorderLevel: '10',
    storageLocation: '',
  });
  const [submittingStockIn, setSubmittingStockIn] = useState(false);
  const [formError, setFormError] = useState(null);

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await pharmacyService.getInventory({
        search: searchTerm || undefined,
        stockStatus: stockStatus || undefined,
      });
      if (res.data) {
        setBatches(res.data.batches || []);
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
      setError(err.response?.data?.message || 'Failed to load inventory records');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, stockStatus]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Load medicines catalog for stock-in dropdown
  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        const res = await clinicalMasterService.getMedicines({ status: 'ACTIVE', limit: 200 });
        const list = res.data?.medicines || res.data || [];
        setMedicines(list);
      } catch (err) {
        console.error('Failed to fetch medicines catalog:', err);
      }
    };
    fetchMedicines();
  }, []);

  const handleOpenStockIn = () => {
    setStockInForm({
      medicineId: medicines[0]?.id || '',
      batchNumber: '',
      expiryDate: '',
      manufacturingDate: '',
      purchaseRate: '',
      sellingRate: '',
      quantity: '',
      reorderLevel: '10',
      storageLocation: '',
    });
    setFormError(null);
    setShowStockInModal(true);
  };

  const handleSubmitStockIn = async (e) => {
    e.preventDefault();
    try {
      setSubmittingStockIn(true);
      setFormError(null);

      if (!stockInForm.medicineId) {
        setFormError('Please select a medicine');
        return;
      }
      if (!stockInForm.batchNumber?.trim()) {
        setFormError('Please provide a batch number');
        return;
      }
      if (!stockInForm.expiryDate) {
        setFormError('Please select an expiry date');
        return;
      }
      const qty = parseInt(stockInForm.quantity, 10);
      if (!qty || qty <= 0) {
        setFormError('Quantity must be greater than zero');
        return;
      }

      await pharmacyService.stockIn({
        ...stockInForm,
        quantity: qty,
        purchaseRate: stockInForm.purchaseRate ? parseFloat(stockInForm.purchaseRate) : null,
        sellingRate: stockInForm.sellingRate ? parseFloat(stockInForm.sellingRate) : null,
        reorderLevel: stockInForm.reorderLevel ? parseInt(stockInForm.reorderLevel, 10) : 10,
      });

      setShowStockInModal(false);
      await loadInventory();
    } catch (err) {
      console.error('Stock-in failed:', err);
      setFormError(err.response?.data?.message || 'Failed to record stock-in');
    } finally {
      setSubmittingStockIn(false);
    }
  };

  const handleViewBatchLedger = async (batch) => {
    setSelectedBatch(batch);
    setLoadingTransactions(true);
    try {
      const res = await pharmacyService.getBatchTransactions(batch.id);
      setBatchTransactions(res.data || []);
    } catch (err) {
      console.error('Failed to fetch batch transactions:', err);
      setBatchTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleToggleBlockStatus = async (batch) => {
    const targetStatus = batch.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    const confirmMsg =
      targetStatus === 'BLOCKED'
        ? `Are you sure you want to BLOCK batch "${batch.batchNumber}"? Blocked batches cannot be dispensed.`
        : `Unblock batch "${batch.batchNumber}" to resume dispensing?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await pharmacyService.updateBatchStatus(batch.id, targetStatus, `Manual ${targetStatus.toLowerCase()} by user`);
      await loadInventory();
      if (selectedBatch && selectedBatch.id === batch.id) {
        setSelectedBatch((prev) => ({ ...prev, status: targetStatus }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update batch status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link to="/hospital-admin/pharmacy" className="hover:text-teal-600 transition">
              Pharmacy
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-medium">Inventory & Batches</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Medicine Inventory & Batches</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track physical stock, monitor shelf-life expiry, and record stock-in receipts with ledger traceability.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenStockIn}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Stock In / Receive Batch
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadInventory} className="text-xs font-semibold underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-slate-50/50">
          <div className="flex-1 max-w-md relative">
            <input
              type="text"
              placeholder="Search by medicine, generic name, batch #, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={stockStatus}
              onChange={(e) => setStockStatus(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="">All Stock Levels</option>
              <option value="LOW_STOCK">Low Stock (≤ Reorder Level)</option>
              <option value="EXPIRING_SOON">Expiring Soon (Within 30 Days)</option>
              <option value="EXPIRED">Expired Batches</option>
              <option value="OUT_OF_STOCK">Out of Stock (0 Available)</option>
            </select>
          </div>
        </div>

        {/* Inventory List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <svg className="w-8 h-8 animate-spin mx-auto text-teal-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Loading inventory stock batches...
          </div>
        ) : batches.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-base font-medium text-slate-600">No inventory batches found</p>
            <p className="text-sm text-slate-400 mt-1">Use &quot;Stock In / Receive Batch&quot; to add physical stock to the pharmacy.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Medicine Details</th>
                  <th className="py-3 px-4">Batch #</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Available / Received</th>
                  <th className="py-3 px-4">Reorder Level</th>
                  <th className="py-3 px-4">Storage Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((batch) => {
                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{batch.medicine?.name}</div>
                        <div className="text-xs text-slate-400">
                          {batch.medicine?.strength || ''} {batch.medicine?.dosageForm ? `• ${batch.medicine.dosageForm}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                        {batch.batchNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className={batch.isExpired ? 'text-rose-600 font-semibold' : batch.isExpiringSoon ? 'text-amber-600 font-medium' : 'text-slate-700'}>
                          {new Date(batch.expiryDate).toLocaleDateString()}
                        </div>
                        {batch.isExpired ? (
                          <div className="text-xs text-rose-500">Expired</div>
                        ) : batch.isExpiringSoon ? (
                          <div className="text-xs text-amber-500">Expiring Soon</div>
                        ) : null}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`font-semibold ${batch.quantityAvailable === 0 ? 'text-slate-400' : batch.isLowStock ? 'text-amber-600' : 'text-emerald-700'}`}>
                          {batch.quantityAvailable}
                        </span>
                        <span className="text-slate-400 text-xs"> / {batch.quantityReceived}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {batch.reorderLevel}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {batch.storageLocation || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        {batch.status === 'BLOCKED' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                            Blocked
                          </span>
                        ) : batch.isExpired ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                            Expired
                          </span>
                        ) : batch.quantityAvailable === 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            Depleted
                          </span>
                        ) : batch.isLowStock ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleViewBatchLedger(batch)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition"
                        >
                          Ledger
                        </button>
                        <button
                          onClick={() => handleToggleBlockStatus(batch)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition ${
                            batch.status === 'BLOCKED'
                              ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                              : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                          }`}
                        >
                          {batch.status === 'BLOCKED' ? 'Unblock' : 'Block'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock-In Modal */}
      {showStockInModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-lg">Receive Stock / New Batch</h3>
              <button
                onClick={() => setShowStockInModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitStockIn} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                  {formError}
                </div>
              )}

              {/* Select Medicine */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Medicine *</label>
                <select
                  value={stockInForm.medicineId}
                  onChange={(e) => setStockInForm({ ...stockInForm, medicineId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  required
                >
                  <option value="">Select a medicine...</option>
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.strength ? `(${m.strength})` : ''} - {m.dosageForm || 'Unit'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch Number & Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. PCM-2026-A"
                    value={stockInForm.batchNumber}
                    onChange={(e) => setStockInForm({ ...stockInForm, batchNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    value={stockInForm.expiryDate}
                    onChange={(e) => setStockInForm({ ...stockInForm, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    required
                  />
                </div>
              </div>

              {/* Quantity & Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Received Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 500"
                    value={stockInForm.quantity}
                    onChange={(e) => setStockInForm({ ...stockInForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Storage Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Rack A-12, Bin 3"
                    value={stockInForm.storageLocation}
                    onChange={(e) => setStockInForm({ ...stockInForm, storageLocation: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Rates & Reorder Level */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={stockInForm.purchaseRate}
                    onChange={(e) => setStockInForm({ ...stockInForm, purchaseRate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={stockInForm.sellingRate}
                    onChange={(e) => setStockInForm({ ...stockInForm, sellingRate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    value={stockInForm.reorderLevel}
                    onChange={(e) => setStockInForm({ ...stockInForm, reorderLevel: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowStockInModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStockIn}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition shadow-sm disabled:opacity-50"
                >
                  {submittingStockIn ? 'Receiving...' : 'Confirm Stock-In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Ledger Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Batch Stock Ledger</h3>
                <p className="text-xs text-slate-500">
                  {selectedBatch.medicine?.name} • Batch #{selectedBatch.batchNumber}
                </p>
              </div>
              <button
                onClick={() => setSelectedBatch(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Batch Summary Header */}
              <div className="grid grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <div>
                  <div className="text-slate-400">Available Qty</div>
                  <div className="text-sm font-bold text-teal-700">{selectedBatch.quantityAvailable}</div>
                </div>
                <div>
                  <div className="text-slate-400">Received Qty</div>
                  <div className="text-sm font-bold text-slate-700">{selectedBatch.quantityReceived}</div>
                </div>
                <div>
                  <div className="text-slate-400">Expiry Date</div>
                  <div className="text-sm font-bold text-slate-700">
                    {new Date(selectedBatch.expiryDate).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Storage Location</div>
                  <div className="text-sm font-bold text-slate-700">{selectedBatch.storageLocation || 'N/A'}</div>
                </div>
              </div>

              {/* Ledger Entries */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Stock Transaction History
                </h4>
                {loadingTransactions ? (
                  <div className="p-8 text-center text-slate-400 text-sm">Loading transactions...</div>
                ) : batchTransactions.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">No transaction records found</div>
                ) : (
                  <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-lg">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 font-semibold text-slate-500 uppercase sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3">Quantity</th>
                          <th className="py-2 px-3">Reason / Ref</th>
                          <th className="py-2 px-3">Performed By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {batchTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 text-slate-500">
                              {new Date(tx.transactionDate).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 font-semibold">
                              {tx.transactionType === 'STOCK_IN' ? (
                                <span className="text-emerald-700">STOCK IN</span>
                              ) : tx.transactionType === 'DISPENSE' ? (
                                <span className="text-blue-700">DISPENSE</span>
                              ) : (
                                <span className="text-amber-700">{tx.transactionType}</span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-800">{tx.quantity}</td>
                            <td className="py-2 px-3 text-slate-500">{tx.reason || tx.referenceType || '—'}</td>
                            <td className="py-2 px-3 text-slate-600">{tx.performer?.name || 'Staff'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedBatch(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
