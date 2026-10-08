import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import laboratoryService from '../../services/laboratoryService';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function age(dob) {
  if (!dob) return '—';
  return `${new Date().getFullYear() - new Date(dob).getFullYear()}y`;
}

function Badge({ label, className }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${className}`}>
      {label}
    </span>
  );
}

function SectionCard({ title, icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
        <span className="text-slate-500">{icon}</span>
        <h2 className="text-sm font-semibold text-slate-700 tracking-tight">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const ABNORMAL_FLAGS = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'ABNORMAL_HIGH', label: 'Abnormal High' },
  { value: 'ABNORMAL_LOW', label: 'Abnormal Low' },
  { value: 'CRITICAL', label: 'Critical' },
];

const RESULT_TYPES = [
  { value: 'QUANTITATIVE', label: 'Quantitative (numeric)' },
  { value: 'QUALITATIVE', label: 'Qualitative (text)' },
  { value: 'NARRATIVE', label: 'Narrative report' },
];

const SAMPLE_STATUSES = [
  { value: 'COLLECTED', label: 'Collected' },
  { value: 'RECEIVED', label: 'Received at Lab' },
  { value: 'PROCESSING', label: 'Under Processing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REJECTED', label: 'Rejected' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-sections
// ─────────────────────────────────────────────────────────────────────────────
function PatientContextPanel({ order }) {
  if (!order) return null;
  const patient = order.patient;
  const patientName = patient ? `${patient.firstName} ${patient.lastName || ''}`.trim() : 'Unknown';
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <div className="text-xs text-slate-500 font-medium mb-0.5">Patient</div>
        <div className="font-semibold text-slate-800">{patientName}</div>
        <div className="text-xs text-slate-500 mt-0.5">
          UHID: {patient?.uhid || '—'} • {patient?.gender || '—'} {age(patient?.dateOfBirth)}
        </div>
        {patient?.allergies && (
          <div className="mt-1 text-xs text-rose-600 font-medium">⚠ Allergies: {patient.allergies}</div>
        )}
      </div>
      <div>
        <div className="text-xs text-slate-500 font-medium mb-0.5">Investigation</div>
        <div className="font-semibold text-slate-800">
          {order.investigationName || order.investigation?.name || '—'}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">
          Code: {order.investigation?.code || '—'} • {order.investigation?.category || '—'}
        </div>
      </div>
      <div>
        <div className="text-xs text-slate-500 font-medium mb-0.5">Ordered By</div>
        <div className="font-medium text-slate-700">{order.doctor?.name || '—'}</div>
        <div className="text-xs text-slate-500">{order.doctor?.specialization || ''}</div>
      </div>
      <div>
        <div className="text-xs text-slate-500 font-medium mb-0.5">Encounter</div>
        <div className="font-medium text-slate-700">{order.encounter?.encounterNumber || '—'}</div>
        <div className="text-xs text-slate-500">Ordered: {fmtDate(order.orderedAt)}</div>
      </div>
      {order.clinicalIndication && (
        <div className="col-span-full">
          <div className="text-xs text-slate-500 font-medium mb-0.5">Clinical Indication</div>
          <div className="text-sm text-slate-700 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
            {order.clinicalIndication}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sample Section
// ─────────────────────────────────────────────────────────────────────────────
function SampleSection({ order, onRefresh }) {
  const [mode, setMode] = useState('view'); // 'view' | 'collect' | 'update'
  const [sampleData, setSampleData] = useState({ sampleType: 'Blood', status: 'COLLECTED', notes: '' });
  const [updateData, setUpdateData] = useState({ status: '', rejectionReason: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const samples = order?.samples || [];
  const latestSample = samples[0];

  const handleCollect = async () => {
    try {
      setLoading(true);
      setMsg(null);
      await laboratoryService.createOrCollectSample(order.id, sampleData);
      setMsg({ type: 'success', text: 'Sample collected successfully.' });
      setMode('view');
      onRefresh();
    } catch (err) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to collect sample' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);
      setMsg(null);
      await laboratoryService.updateSampleStatus(latestSample.id, updateData);
      setMsg({ type: 'success', text: 'Sample status updated.' });
      setMode('view');
      onRefresh();
    } catch (err) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to update sample' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`p-3 rounded-lg text-sm font-medium ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
          {msg.text}
        </div>
      )}

      {/* Existing samples list */}
      {samples.length > 0 ? (
        <div className="space-y-2">
          {samples.map((s) => (
            <div key={s.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-800">{s.sampleNumber}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Type: {s.sampleType} • Collected: {fmt(s.collectedAt)} by {s.collector?.name || '—'}
                </div>
                {s.receivedAt && <div className="text-xs text-slate-500">Received: {fmt(s.receivedAt)}</div>}
                {s.rejectionReason && <div className="text-xs text-rose-600 mt-0.5">Rejection: {s.rejectionReason}</div>}
                {s.notes && <div className="text-xs text-slate-400 mt-0.5">Notes: {s.notes}</div>}
              </div>
              <div className="shrink-0">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  s.status === 'COLLECTED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  s.status === 'RECEIVED' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                  s.status === 'PROCESSING' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                  s.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  s.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                  'bg-amber-50 text-amber-700 border-amber-200'
                }`}>{s.status.replace('_', ' ')}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 italic">No sample recorded yet.</p>
      )}

      {/* Actions */}
      {mode === 'view' && (
        <div className="flex gap-2">
          {!latestSample && (
            <button
              id="lab-collect-sample-btn"
              onClick={() => setMode('collect')}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition"
            >
              + Collect Sample
            </button>
          )}
          {latestSample && latestSample.status !== 'COMPLETED' && latestSample.status !== 'REJECTED' && (
            <button
              id="lab-update-sample-btn"
              onClick={() => { setUpdateData({ status: latestSample.status, rejectionReason: '', notes: latestSample.notes || '' }); setMode('update'); }}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              Update Sample Status
            </button>
          )}
        </div>
      )}

      {mode === 'collect' && (
        <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700">Collect Sample</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Sample Type</label>
              <input
                value={sampleData.sampleType}
                onChange={(e) => setSampleData((d) => ({ ...d, sampleType: e.target.value }))}
                placeholder="e.g. Blood, Urine, Serum"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Initial Status</label>
              <select
                value={sampleData.status}
                onChange={(e) => setSampleData((d) => ({ ...d, status: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              >
                <option value="COLLECTED">Collected</option>
                <option value="PENDING_COLLECTION">Pending Collection</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Notes (optional)</label>
            <textarea
              value={sampleData.notes}
              onChange={(e) => setSampleData((d) => ({ ...d, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              id="lab-collect-sample-submit-btn"
              onClick={handleCollect}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition"
            >
              {loading ? 'Saving…' : 'Confirm Collection'}
            </button>
            <button onClick={() => { setMode('view'); setMsg(null); }} className="px-4 py-2 text-sm text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50 transition">Cancel</button>
          </div>
        </div>
      )}

      {mode === 'update' && latestSample && (
        <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700">Update Sample Status</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">New Status</label>
              <select
                value={updateData.status}
                onChange={(e) => setUpdateData((d) => ({ ...d, status: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              >
                {SAMPLE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            {updateData.status === 'REJECTED' && (
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Rejection Reason *</label>
                <input
                  value={updateData.rejectionReason}
                  onChange={(e) => setUpdateData((d) => ({ ...d, rejectionReason: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                />
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Notes (optional)</label>
            <textarea
              value={updateData.notes}
              onChange={(e) => setUpdateData((d) => ({ ...d, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              id="lab-update-sample-submit-btn"
              onClick={handleUpdate}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition"
            >
              {loading ? 'Saving…' : 'Update Status'}
            </button>
            <button onClick={() => { setMode('view'); setMsg(null); }} className="px-4 py-2 text-sm text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50 transition">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Result Section
// ─────────────────────────────────────────────────────────────────────────────
function ResultSection({ order, onRefresh }) {
  const result = order?.result;
  const samples = order?.samples || [];
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    sampleId: '',
    resultType: 'QUANTITATIVE',
    resultValue: '',
    resultUnit: '',
    referenceRange: '',
    abnormalFlag: 'NORMAL',
    interpretation: '',
    observations: '',
    technicianNotes: '',
    submitForVerification: false,
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (result) {
      setForm({
        sampleId: result.sampleId || '',
        resultType: result.resultType || 'QUANTITATIVE',
        resultValue: result.resultValue || '',
        resultUnit: result.resultUnit || '',
        referenceRange: result.referenceRange || '',
        abnormalFlag: result.abnormalFlag || 'NORMAL',
        interpretation: result.interpretation || '',
        observations: result.observations || '',
        technicianNotes: result.technicianNotes || '',
        submitForVerification: false,
      });
    }
  }, [result]);

  const handleSave = async (submitForVerification = false) => {
    try {
      setLoading(true);
      setMsg(null);
      await laboratoryService.saveResult(order.id, { ...form, submitForVerification });
      setMsg({ type: 'success', text: submitForVerification ? 'Result submitted for verification.' : 'Result saved as draft.' });
      setEditMode(false);
      onRefresh();
    } catch (err) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to save result' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!result) return;
    try {
      setLoading(true);
      setMsg(null);
      await laboratoryService.verifyResult(result.id);
      setMsg({ type: 'success', text: 'Result verified successfully.' });
      onRefresh();
    } catch (err) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to verify result' });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!result) return;
    if (!window.confirm('Finalizing locks this result as an immutable clinical document. Continue?')) return;
    try {
      setLoading(true);
      setMsg(null);
      await laboratoryService.finalizeResult(result.id);
      setMsg({ type: 'success', text: 'Result finalized and published to clinical record.' });
      onRefresh();
    } catch (err) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to finalize result' });
    } finally {
      setLoading(false);
    }
  };

  const isFinalized = result?.status === 'FINALIZED';
  const canVerify = result?.status === 'RESULT_ENTERED';
  const canFinalize = result?.status === 'VERIFIED' || result?.status === 'RESULT_ENTERED';

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`p-3 rounded-lg text-sm font-medium ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
          {msg.text}
        </div>
      )}

      {/* Finalized Result View */}
      {isFinalized && result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge label="✓ FINALIZED" className="bg-emerald-50 text-emerald-700 border-emerald-200" />
            <span className="text-xs text-slate-500">Result #: {result.resultNumber}</span>
            {result.abnormalFlag && result.abnormalFlag !== 'NORMAL' && (
              <Badge
                label={result.abnormalFlag === 'CRITICAL' ? '⚠ CRITICAL' : result.abnormalFlag.replace('_', ' ')}
                className={result.abnormalFlag === 'CRITICAL' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-amber-100 text-amber-700 border-amber-300'}
              />
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <div className="text-xs text-slate-500 font-medium">Result</div>
              <div className="text-xl font-bold text-slate-800 mt-0.5">
                {result.resultValue || '—'} <span className="text-sm font-normal text-slate-500">{result.resultUnit || ''}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Reference Range</div>
              <div className="text-sm text-slate-700 mt-0.5">{result.referenceRange || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Result Type</div>
              <div className="text-sm text-slate-700 mt-0.5">{result.resultType || '—'}</div>
            </div>
          </div>
          {result.interpretation && (
            <div>
              <div className="text-xs text-slate-500 font-medium mb-1">Interpretation</div>
              <div className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100 whitespace-pre-wrap">{result.interpretation}</div>
            </div>
          )}
          {result.observations && (
            <div>
              <div className="text-xs text-slate-500 font-medium mb-1">Observations</div>
              <div className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100 whitespace-pre-wrap">{result.observations}</div>
            </div>
          )}
          <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1">
            <span>Entered by: <strong>{result.technician?.name || '—'}</strong></span>
            <span>Verified by: <strong>{result.verifier?.name || '—'}</strong></span>
            <span>Finalized by: <strong>{result.finalizer?.name || '—'}</strong> on {fmt(result.finalizedAt)}</span>
          </div>
        </div>
      )}

      {/* In-progress result view */}
      {!isFinalized && result && !editMode && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              label={result.status === 'IN_PROGRESS' ? 'Draft' : result.status === 'RESULT_ENTERED' ? 'Awaiting Verification' : result.status}
              className="bg-amber-50 text-amber-700 border-amber-200"
            />
            <span className="text-xs text-slate-500">Result #: {result.resultNumber}</span>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div><span className="text-xs text-slate-500 block">Result Value</span> <strong>{result.resultValue || '—'} {result.resultUnit || ''}</strong></div>
              <div><span className="text-xs text-slate-500 block">Reference Range</span> {result.referenceRange || '—'}</div>
              <div><span className="text-xs text-slate-500 block">Flag</span> {result.abnormalFlag || '—'}</div>
            </div>
            {result.interpretation && <div className="mt-2 text-xs text-slate-500">Interpretation: {result.interpretation}</div>}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button id="lab-edit-result-btn" onClick={() => setEditMode(true)} className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition">
              Edit Result
            </button>
            {canVerify && (
              <button
                id="lab-verify-result-btn"
                onClick={handleVerify}
                disabled={loading}
                className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {loading ? 'Verifying…' : '✓ Verify Result'}
              </button>
            )}
            {canFinalize && (
              <button
                id="lab-finalize-result-btn"
                onClick={handleFinalize}
                disabled={loading}
                className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                {loading ? 'Finalizing…' : '✓ Finalize Result'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* No result yet */}
      {!result && !editMode && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 italic">No result entered yet for this investigation order.</p>
          <button
            id="lab-enter-result-btn"
            onClick={() => setEditMode(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition"
          >
            + Enter Result
          </button>
        </div>
      )}

      {/* Result Entry Form */}
      {editMode && (
        <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700">{result ? 'Edit Result' : 'Enter Result'}</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Result Type</label>
              <select
                value={form.resultType}
                onChange={(e) => setForm((f) => ({ ...f, resultType: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              >
                {RESULT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Link Sample</label>
              <select
                value={form.sampleId}
                onChange={(e) => setForm((f) => ({ ...f, sampleId: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              >
                <option value="">— No sample linked —</option>
                {samples.map((s) => (
                  <option key={s.id} value={s.id}>{s.sampleNumber} ({s.sampleType})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Result Value *</label>
              <input
                id="lab-result-value-input"
                value={form.resultValue}
                onChange={(e) => setForm((f) => ({ ...f, resultValue: e.target.value }))}
                placeholder="e.g. 5.4 or Positive"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Unit</label>
              <input
                value={form.resultUnit}
                onChange={(e) => setForm((f) => ({ ...f, resultUnit: e.target.value }))}
                placeholder="e.g. mg/dL, mmol/L"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Reference Range</label>
              <input
                value={form.referenceRange}
                onChange={(e) => setForm((f) => ({ ...f, referenceRange: e.target.value }))}
                placeholder="e.g. 4.0–6.0"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Abnormal Flag</label>
              <select
                id="lab-abnormal-flag-select"
                value={form.abnormalFlag}
                onChange={(e) => setForm((f) => ({ ...f, abnormalFlag: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              >
                {ABNORMAL_FLAGS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Interpretation</label>
            <textarea
              value={form.interpretation}
              onChange={(e) => setForm((f) => ({ ...f, interpretation: e.target.value }))}
              rows={3}
              placeholder="Clinical interpretation of results..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Observations / Report</label>
            <textarea
              value={form.observations}
              onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
              rows={3}
              placeholder="Detailed observations or narrative report..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Technician Notes (internal)</label>
            <textarea
              value={form.technicianNotes}
              onChange={(e) => setForm((f) => ({ ...f, technicianNotes: e.target.value }))}
              rows={2}
              placeholder="Internal lab notes (not visible to doctor)"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              id="lab-save-draft-btn"
              onClick={() => handleSave(false)}
              disabled={loading || !form.resultValue.trim()}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition"
            >
              {loading ? 'Saving…' : 'Save Draft'}
            </button>
            <button
              id="lab-submit-verify-btn"
              onClick={() => handleSave(true)}
              disabled={loading || !form.resultValue.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition"
            >
              {loading ? 'Submitting…' : 'Submit for Verification'}
            </button>
            {canVerify && !editMode && (
              <button
                id="lab-verify-btn"
                onClick={handleVerify}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                Verify
              </button>
            )}
            <button
              onClick={() => { setEditMode(false); setMsg(null); }}
              className="px-4 py-2 text-sm text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function LaboratoryResultWorkspacePage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await laboratoryService.getOrderDetails(orderId);
      setOrder(res?.data);
    } catch (err) {
      console.error('Failed to load order:', err);
      setError(err?.response?.data?.message || 'Failed to load investigation order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center text-slate-400">
          <svg className="w-8 h-8 animate-spin mx-auto text-violet-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Loading investigation workspace…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
        <strong>Error:</strong> {error}
        <button
          onClick={() => navigate('/hospital-admin/laboratory')}
          className="ml-4 text-xs font-semibold underline hover:no-underline"
        >
          ← Back to Lab Queue
        </button>
      </div>
    );
  }

  if (!order) return null;

  const orderStatusBadge = order.priority === 'URGENT'
    ? <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">URGENT</span>
    : <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">Routine</span>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/hospital-admin/laboratory')}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
            aria-label="Back to lab queue"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">
                {order.investigationName || order.investigation?.name || 'Investigation'}
              </h1>
              {orderStatusBadge}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Order #{order.orderNumber} •{' '}
              {order.patient ? `${order.patient.firstName} ${order.patient.lastName || ''}`.trim() : 'Unknown Patient'}{' '}
              ({order.patient?.uhid || '—'})
            </p>
          </div>
        </div>
        <button
          onClick={loadOrder}
          title="Refresh workspace"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-xs"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Order Context */}
      <SectionCard
        title="Patient & Order Details"
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
      >
        <PatientContextPanel order={order} />
      </SectionCard>

      {/* Sample Management */}
      <SectionCard
        title="Sample Management"
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
      >
        <SampleSection order={order} onRefresh={loadOrder} />
      </SectionCard>

      {/* Result Entry */}
      <SectionCard
        title="Investigation Result"
        icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
      >
        <ResultSection order={order} onRefresh={loadOrder} />
      </SectionCard>
    </div>
  );
}
