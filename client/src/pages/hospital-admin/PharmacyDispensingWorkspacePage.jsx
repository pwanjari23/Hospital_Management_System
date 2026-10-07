import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import pharmacyService from '../../services/pharmacyService';

export default function PharmacyDispensingWorkspacePage() {
  const { prescriptionId } = useParams();

  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form State: allocations keyed by prescriptionItemId -> array of { batchId, quantity }
  const [allocations, setAllocations] = useState({});
  const [dispensingNotes, setDispensingNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const loadPrescription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await pharmacyService.getPrescriptionForDispensing(prescriptionId);
      if (res.data) {
        setPrescription(res.data);

        // Pre-fill default allocations from FEFO suggestions
        const initialAllocations = {};
        for (const item of res.data.items || []) {
          if (item.remainingQuantity > 0 && item.fefoAllocation?.allocations) {
            initialAllocations[item.id] = item.fefoAllocation.allocations.map((alloc) => ({
              batchId: alloc.batchId,
              batchNumber: alloc.batchNumber,
              expiryDate: alloc.expiryDate,
              available: alloc.quantityAvailable,
              location: alloc.storageLocation,
              quantity: alloc.allocatedQuantity, // Pre-filled with suggested FEFO quantity
            }));
          } else {
            initialAllocations[item.id] = [];
          }
        }
        setAllocations(initialAllocations);
      }
    } catch (err) {
      console.error('Failed to load prescription for dispensing:', err);
      setError(err.response?.data?.message || 'Failed to load prescription details');
    } finally {
      setLoading(false);
    }
  }, [prescriptionId]);

  useEffect(() => {
    loadPrescription();
  }, [loadPrescription]);

  // Update allocation quantity for a specific item and batch
  const handleQuantityChange = (prescriptionItemId, batchId, value) => {
    const val = value === '' ? '' : parseInt(value, 10);
    setAllocations((prev) => {
      const itemAllocs = prev[prescriptionItemId] || [];
      const updated = itemAllocs.map((a) => {
        if (a.batchId === batchId) {
          return { ...a, quantity: isNaN(val) ? 0 : val };
        }
        return a;
      });
      return { ...prev, [prescriptionItemId]: updated };
    });
  };

  // Compute total dispensing summary
  const getDispensingSummary = () => {
    if (!prescription?.items) return { totalUnits: 0, itemsCount: 0, willBeFullyDispensed: false };

    let totalUnits = 0;
    let itemsCount = 0;
    let allCompleted = true;

    for (const item of prescription.items) {
      const itemAllocs = allocations[item.id] || [];
      const itemUnits = itemAllocs.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0);

      if (itemUnits > 0) {
        totalUnits += itemUnits;
        itemsCount++;
      }

      const totalAfterThis = item.dispensedQuantity + itemUnits;
      if (totalAfterThis < item.prescribedQuantity) {
        allCompleted = false;
      }
    }

    return {
      totalUnits,
      itemsCount,
      willBeFullyDispensed: allCompleted && totalUnits > 0,
    };
  };

  const handleConfirmDispense = async () => {
    try {
      setSubmitting(true);
      setSubmitError(null);

      // Build payload
      const itemsPayload = [];
      for (const item of prescription.items || []) {
        const itemAllocs = allocations[item.id] || [];
        const activeAllocs = itemAllocs
          .filter((a) => Number(a.quantity) > 0)
          .map((a) => ({
            batchId: a.batchId,
            quantity: Number(a.quantity),
          }));

        if (activeAllocs.length > 0) {
          itemsPayload.push({
            prescriptionItemId: item.id,
            medicineId: item.medicineId,
            batchAllocations: activeAllocs,
          });
        }
      }

      if (itemsPayload.length === 0) {
        setSubmitError('No medication quantities allocated for dispensing');
        setSubmitting(false);
        return;
      }

      const res = await pharmacyService.dispensePrescription(prescriptionId, {
        items: itemsPayload,
        notes: dispensingNotes?.trim() || null,
      });

      setShowConfirmModal(false);
      setSuccessMessage(
        `Dispensing successfully recorded #${res.data?.dispensingNumber || ''}! Stock has been deducted from inventory.`
      );
      await loadPrescription();
    } catch (err) {
      console.error('Dispensing failed:', err);
      setSubmitError(err.response?.data?.message || 'Failed to dispense prescription');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400">
        <svg className="w-8 h-8 animate-spin mx-auto text-teal-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Loading prescription workspace...
      </div>
    );
  }

  if (error || !prescription) {
    return (
      <div className="p-8 bg-white rounded-xl border border-slate-200 text-center max-w-lg mx-auto my-12">
        <div className="text-rose-500 font-semibold mb-2">Error Loading Prescription</div>
        <p className="text-sm text-slate-600 mb-4">{error || 'Prescription not found'}</p>
        <Link
          to="/hospital-admin/pharmacy"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition"
        >
          Return to Queue
        </Link>
      </div>
    );
  }

  const patient = prescription.patient;
  const summary = getDispensingSummary();
  const isFullyDispensedAlready = prescription.dispensingStatus === 'FULLY_DISPENSED';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link to="/hospital-admin/pharmacy" className="hover:text-teal-600 transition">
            Pharmacy Queue
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold font-mono">{prescription.prescriptionNumber}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/hospital-admin/pharmacy"
            className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            ← Back to Queue
          </Link>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 font-bold hover:opacity-80">
            ×
          </button>
        </div>
      )}

      {/* Patient Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-bold text-xl shrink-0">
              {patient?.firstName?.[0] || 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-800">
                  {patient?.firstName} {patient?.lastName || ''}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                  {patient?.gender || 'N/A'} • {patient?.dateOfBirth ? `${new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} yrs` : ''}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span>UHID: <strong className="text-slate-600">{patient?.uhid || 'N/A'}</strong></span>
                {patient?.phone && <span>Phone: <strong className="text-slate-600">{patient.phone}</strong></span>}
                {patient?.bloodGroup && <span>Blood Group: <strong className="text-slate-600">{patient.bloodGroup}</strong></span>}
              </div>
            </div>
          </div>

          {/* Doctor & Encounter Pill */}
          <div className="text-left md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
            <div className="text-xs text-slate-400">Prescribing Doctor</div>
            <div className="text-sm font-semibold text-slate-800">{prescription.doctor?.name || 'Assigned Doctor'}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Encounter: <span className="font-mono text-slate-700">{prescription.encounter?.encounterNumber || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Allergy Warning if applicable */}
        {patient?.allergies && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <strong>Known Patient Allergies:</strong> {patient.allergies}
            </div>
          </div>
        )}
      </div>

      {/* Prescription Medication Items & FEFO Allocations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Prescribed Medications & Batch Allocation (FEFO)</h3>
          <span className="text-xs text-slate-500">
            Batches are prioritized by earliest expiry date to minimize shelf obsolescence.
          </span>
        </div>

        {prescription.items?.map((item, idx) => {
          const itemAllocs = allocations[item.id] || [];
          const currentlyAllocated = itemAllocs.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0);
          const hasAvailableBatches = item.fefoAllocation?.allocations?.length > 0;

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 transition-shadow hover:shadow-sm"
            >
              {/* Item Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-base flex items-center gap-2">
                      {item.medicineName}
                      <span className="text-xs font-normal text-slate-500">
                        ({item.medicine?.strength || ''} {item.medicine?.dosageForm || ''})
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      <span>Dosage: <strong>{item.dosage}</strong></span>
                      <span>Freq: <strong>{item.frequency}</strong></span>
                      <span>Route: <strong>{item.route}</strong></span>
                      {item.durationValue && (
                        <span>Duration: <strong>{item.durationValue} {item.durationUnit}</strong></span>
                      )}
                      {item.foodInstruction && (
                        <span>Instructions: <strong>{item.foodInstruction}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quantities Status */}
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-xs text-slate-400">Prescribed</div>
                    <div className="text-base font-bold text-slate-800">{item.prescribedQuantity}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Dispensed</div>
                    <div className="text-base font-bold text-slate-600">{item.dispensedQuantity}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Remaining</div>
                    <div className={`text-base font-bold ${item.remainingQuantity === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {item.remainingQuantity}
                    </div>
                  </div>
                </div>
              </div>

              {/* Batch Allocation Table */}
              <div className="mt-4">
                {item.remainingQuantity === 0 ? (
                  <div className="p-3 bg-emerald-50 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    This medication item has already been fully dispensed.
                  </div>
                ) : !hasAvailableBatches ? (
                  <div className="p-3 bg-rose-50 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                    <svg className="w-4 h-4 text-rose-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>
                      <strong>Out of Stock:</strong> No active non-expired batches available in pharmacy inventory for this medication.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                      <span>Available Batches (Earliest Expiry First)</span>
                      <span>
                        Allocating: <strong className={currentlyAllocated > item.remainingQuantity ? 'text-rose-600' : 'text-teal-700'}>{currentlyAllocated}</strong> / {item.remainingQuantity}
                      </span>
                    </div>

                    <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 font-semibold text-slate-500 uppercase">
                          <tr>
                            <th className="py-2.5 px-3">Batch Number</th>
                            <th className="py-2.5 px-3">Expiry Date</th>
                            <th className="py-2.5 px-3">Available Stock</th>
                            <th className="py-2.5 px-3">Location</th>
                            <th className="py-2.5 px-3 w-32 text-right">Qty to Dispense</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {itemAllocs.map((alloc) => (
                            <tr key={alloc.batchId} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                                {alloc.batchNumber}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700">
                                {new Date(alloc.expiryDate).toLocaleDateString()}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-800">
                                {alloc.available}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500">
                                {alloc.location || '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  max={Math.min(alloc.available, item.remainingQuantity)}
                                  value={alloc.quantity}
                                  onChange={(e) => handleQuantityChange(item.id, alloc.batchId, e.target.value)}
                                  className="w-20 px-2 py-1 text-right text-xs bg-white border border-slate-200 rounded font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pharmacist Dispensing Action Box */}
      {!isFullyDispensedAlready && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <h3 className="font-bold text-slate-800 text-lg">Dispensing Confirmation</h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pharmacist Dispensing Notes (Optional)
            </label>
            <textarea
              rows="2"
              placeholder="e.g. Advised patient on meal timing; patient took partial 15-day course."
              value={dispensingNotes}
              onChange={(e) => setDispensingNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <div>
              <div className="text-xs text-slate-500">Summary</div>
              <div className="text-sm font-semibold text-slate-800">
                Dispensing <strong>{summary.totalUnits}</strong> units across <strong>{summary.itemsCount}</strong> medication(s).
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Outcome status:{' '}
                <strong className={summary.willBeFullyDispensed ? 'text-emerald-700' : 'text-blue-700'}>
                  {summary.willBeFullyDispensed ? 'Fully Dispensed' : 'Partially Dispensed'}
                </strong>
              </div>
            </div>

            <button
              type="button"
              disabled={summary.totalUnits === 0 || submitting}
              onClick={() => setShowConfirmModal(true)}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition shadow-sm disabled:opacity-40"
            >
              Confirm & Dispense Medicines
            </button>
          </div>
        </div>
      )}

      {/* Previous Dispensings History for this Prescription */}
      {prescription.dispensings?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <h3 className="font-bold text-slate-800 text-base">Past Dispensing History for this Prescription</h3>
          <div className="divide-y divide-slate-100">
            {prescription.dispensings.map((d) => (
              <div key={d.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono font-bold text-slate-800">{d.dispensingNumber}</span>
                  <span className="text-slate-400 ml-2">
                    {new Date(d.dispensedAt || d.createdAt).toLocaleString()}
                  </span>
                  <div className="text-slate-500 mt-0.5">
                    Dispensed by: {d.pharmacist?.name || 'Staff'} {d.notes ? `• "${d.notes}"` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    {d.status}
                  </span>
                  <div className="text-slate-400 mt-1">
                    {d.items?.length || 0} item allocations
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Confirm Pharmacy Dispensing</h3>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to finalize dispensing <strong>{summary.totalUnits}</strong> units?
              This will deduct inventory stock from the selected batches and record immutable ledger transactions.
            </p>

            {submitError && (
              <div className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {submitError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDispense}
                disabled={submitting}
                className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Deducting Stock...' : 'Yes, Dispense Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
