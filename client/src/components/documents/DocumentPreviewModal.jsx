import React, { useState, useEffect, useCallback } from 'react';
import { getDocument } from '../../services/documentService';
import DocumentHeader from './DocumentHeader';
import DocumentFooter from './DocumentFooter';

export default function DocumentPreviewModal({ isOpen, onClose, documentType, entityId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDoc = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getDocument(documentType, entityId);
      setData(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [documentType, entityId]);

  useEffect(() => {
    if (isOpen && documentType && entityId) {
      fetchDoc();
    } else {
      setData(null);
      setError(null);
    }
  }, [isOpen, documentType, entityId, fetchDoc]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Modal Top Action Bar (hidden when printed) */}
        <div className="print:hidden px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-semibold text-sm">
              Document Preview: {data?.title || documentType}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={loading || !data}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Document
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition p-1"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content / Printable Area */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 printable-document">
          {loading && (
            <div className="py-20 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Preparing document...
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl text-center">
              {error}
            </div>
          )}

          {data && !loading && (
            <div>
              {/* Document Header */}
              <DocumentHeader
                branding={data.branding}
                title={data.title}
                documentNumber={
                  data.meta?.prescriptionNumber ||
                  data.meta?.invoiceNumber ||
                  data.meta?.receiptNumber ||
                  data.meta?.orderNumber ||
                  data.meta?.appointmentNumber ||
                  data.meta?.admissionNumber ||
                  data.meta?.courseNumber
                }
                documentDate={data.meta?.date || data.meta?.invoiceDate || data.meta?.receiptDate || data.meta?.appointmentDate || data.meta?.orderedAt || data.meta?.startDate}
              />

              {/* Patient Bar */}
              {data.patient && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-xs grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-slate-400 block">Patient Name</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {data.patient.firstName} {data.patient.lastName || ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">UHID</span>
                    <span className="font-mono font-semibold text-slate-800">{data.patient.uhid}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Age / Gender</span>
                    <span className="text-slate-700">{data.patient.gender || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Phone</span>
                    <span className="text-slate-700">{data.patient.phone || 'N/A'}</span>
                  </div>
                </div>
              )}

              {/* Document Specific Content Sections */}

              {/* 1. PRESCRIPTION */}
              {data.documentType === 'PRESCRIPTION' && (
                <div className="space-y-6">
                  {data.doctor && (
                    <div className="text-xs text-slate-600 border-b border-slate-100 pb-3">
                      <strong>Prescribing Doctor:</strong> {data.doctor.name} ({data.doctor.specialization || 'Consultant'})
                      {data.doctor.licenseNumber && <span> &bull; Reg: {data.doctor.licenseNumber}</span>}
                    </div>
                  )}

                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Medicine Name</th>
                        <th className="p-2.5">Dosage</th>
                        <th className="p-2.5">Frequency</th>
                        <th className="p-2.5">Duration</th>
                        <th className="p-2.5">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 font-semibold text-slate-800">{item.medicineName}</td>
                          <td className="p-2.5">{item.dosage || '-'}</td>
                          <td className="p-2.5">{item.frequency || '-'}</td>
                          <td className="p-2.5">{item.durationDays ? `${item.durationDays} days` : '-'}</td>
                          <td className="p-2.5 text-slate-500">{item.instructions || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {data.meta?.notes && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                      <strong>Doctor Notes:</strong> {data.meta.notes}
                    </div>
                  )}
                </div>
              )}

              {/* 2. LAB REPORT */}
              {data.documentType === 'LAB_REPORT' && (
                <div className="space-y-6">
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Investigation / Test</th>
                        <th className="p-2.5">Observed Value</th>
                        <th className="p-2.5">Reference Range</th>
                        <th className="p-2.5">Flag / Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.results?.map((res, idx) => (
                        <tr key={idx} className={res.abnormalFlag === 'CRITICAL' ? 'bg-rose-50' : ''}>
                          <td className="p-2.5 font-semibold text-slate-800">{res.testName}</td>
                          <td className="p-2.5 font-bold font-mono">
                            {res.resultValue} {res.resultUnit}
                          </td>
                          <td className="p-2.5 text-slate-500 font-mono">{res.referenceRange || 'Normal Range'}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              res.abnormalFlag === 'CRITICAL'
                                ? 'bg-rose-600 text-white'
                                : res.abnormalFlag === 'ABNORMAL'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {res.abnormalFlag || 'NORMAL'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 3. INVOICE */}
              {data.documentType === 'INVOICE' && (
                <div className="space-y-6">
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Service Description</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Unit Price</th>
                        <th className="p-2.5 text-right">Discount</th>
                        <th className="p-2.5 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-semibold text-slate-800">{item.description}</td>
                          <td className="p-2.5 text-center">{item.quantity}</td>
                          <td className="p-2.5 text-right font-mono">₹{Number(item.unitPrice).toFixed(2)}</td>
                          <td className="p-2.5 text-right font-mono text-slate-400">₹{Number(item.discountAmount || 0).toFixed(2)}</td>
                          <td className="p-2.5 text-right font-bold font-mono">₹{Number(item.lineTotal).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Financial Totals */}
                  <div className="flex justify-end">
                    <div className="w-72 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Subtotal:</span>
                        <span className="font-mono font-medium">₹{data.financials?.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Discount:</span>
                        <span className="font-mono text-emerald-600">-₹{data.financials?.discountAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Tax:</span>
                        <span className="font-mono">₹{data.financials?.taxAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-900 border-t border-slate-300 pt-1 text-sm">
                        <span>Total Billed:</span>
                        <span className="font-mono">₹{data.financials?.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-semibold">
                        <span>Amount Paid:</span>
                        <span className="font-mono">₹{data.financials?.paidAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-rose-700 font-bold border-t border-slate-200 pt-1">
                        <span>Outstanding Due:</span>
                        <span className="font-mono">₹{data.financials?.dueAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. RECEIPT */}
              {data.documentType === 'RECEIPT' && (
                <div className="space-y-6">
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Payment Amount Received:</span>
                      <span className="text-2xl font-black text-emerald-600 font-mono">
                        ₹{data.paymentDetails?.amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-200">
                      <div>
                        <span className="text-slate-400 block">Payment Mode:</span>
                        <span className="font-semibold text-slate-800">{data.paymentDetails?.paymentMode}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Transaction Reference:</span>
                        <span className="font-mono text-slate-700">{data.paymentDetails?.transactionReference}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Invoice Total:</span>
                        <span className="font-mono text-slate-700">₹{data.paymentDetails?.invoiceTotal.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Remaining Due:</span>
                        <span className="font-mono text-slate-700">₹{data.paymentDetails?.remainingDue.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. APPOINTMENT SLIP */}
              {data.documentType === 'APPOINTMENT_SLIP' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-400 block">Consulting Doctor</span>
                      <span className="font-bold text-slate-900 text-sm block mt-0.5">{data.doctor?.name}</span>
                      <span className="text-slate-500">{data.doctor?.specialization || 'General'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Department</span>
                      <span className="font-semibold text-slate-800 block mt-0.5">{data.department?.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Scheduled Time</span>
                      <span className="font-bold text-blue-700 font-mono text-sm block mt-0.5">
                        {data.meta?.startTime || '09:00'} - {data.meta?.endTime || '09:30'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Consultation Fee</span>
                      <span className="font-mono font-semibold text-slate-800 block mt-0.5">
                        ₹{Number(data.meta?.consultationFee || 0).toFixed(2)} ({data.meta?.paymentStatus || 'PENDING'})
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. DISCHARGE SUMMARY */}
              {data.documentType === 'DISCHARGE_SUMMARY' && (
                <div className="space-y-6 text-xs">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 block">Ward & Bed</span>
                      <span className="font-semibold text-slate-800">{data.meta?.wardName} / Bed {data.meta?.bedNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Admitting Doctor</span>
                      <span className="font-semibold text-slate-800">{data.doctor?.name}</span>
                    </div>
                  </div>

                  {data.clinicalDetails?.finalDiagnosis && (
                    <div>
                      <h3 className="font-bold text-slate-900 uppercase text-xs mb-1">Final Diagnosis</h3>
                      <p className="p-3 bg-white border border-slate-200 rounded-lg text-slate-700">
                        {data.clinicalDetails.finalDiagnosis}
                      </p>
                    </div>
                  )}

                  {data.clinicalDetails?.hospitalCourse && (
                    <div>
                      <h3 className="font-bold text-slate-900 uppercase text-xs mb-1">Hospital Course & Clinical Summary</h3>
                      <p className="p-3 bg-white border border-slate-200 rounded-lg text-slate-700 whitespace-pre-wrap">
                        {data.clinicalDetails.hospitalCourse}
                      </p>
                    </div>
                  )}

                  {data.medications?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-slate-900 uppercase text-xs mb-1">Discharge Medications</h3>
                      <table className="w-full text-left border border-slate-200">
                        <thead className="bg-slate-100 font-bold">
                          <tr>
                            <th className="p-2">Medicine</th>
                            <th className="p-2">Dosage</th>
                            <th className="p-2">Frequency</th>
                            <th className="p-2">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.medications.map((m, idx) => (
                            <tr key={idx}>
                              <td className="p-2 font-semibold">{m.medicineName}</td>
                              <td className="p-2">{m.dosage || '-'}</td>
                              <td className="p-2">{m.frequency || '-'}</td>
                              <td className="p-2">{m.durationDays ? `${m.durationDays} days` : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 7. EECP SUMMARY */}
              {data.documentType === 'EECP_SUMMARY' && (
                <div className="space-y-6 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 block">Treatment Package</span>
                      <span className="font-bold text-slate-800">{data.meta?.packageName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Total Planned Sessions</span>
                      <span className="font-mono font-bold text-slate-800">{data.meta?.plannedSessions}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Sessions Completed</span>
                      <span className="font-mono font-bold text-emerald-600">{data.meta?.completedSessions}</span>
                    </div>
                  </div>

                  {data.meta?.treatmentPlan && (
                    <div>
                      <h3 className="font-bold text-slate-900 uppercase text-xs mb-1">Treatment Plan</h3>
                      <p className="p-3 bg-white border border-slate-200 rounded-lg text-slate-700">
                        {data.meta.treatmentPlan}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Document Footer */}
              <DocumentFooter
                branding={data.branding}
                generatedAt={data.generatedAt}
                doctorName={data.doctor?.name}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
