import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ipdService from '../../services/ipdService';

const BED_TYPES = ['STANDARD', 'ICU', 'CCU', 'PRIVATE', 'SEMI_PRIVATE', 'EMERGENCY', 'OTHER'];
const BED_STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'BLOCKED'];

function BedStatusBadge({ status }) {
  const map = {
    AVAILABLE: ['bg-emerald-50 text-emerald-700 border-emerald-200', 'Available'],
    OCCUPIED: ['bg-blue-50 text-blue-700 border-blue-200', 'Occupied'],
    RESERVED: ['bg-purple-50 text-purple-700 border-purple-200', 'Reserved'],
    MAINTENANCE: ['bg-amber-50 text-amber-700 border-amber-200', 'Maintenance'],
    BLOCKED: ['bg-rose-50 text-rose-700 border-rose-200', 'Blocked'],
  };
  const [cls, label] = map[status] || ['bg-slate-50 text-slate-600 border-slate-200', status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

export default function BedManagementPage() {
  const navigate = useNavigate();
  const [beds, setBeds] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterWard, setFilterWard] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState(null);

  const [createForm, setCreateForm] = useState({
    wardId: '',
    bedNumber: '',
    bedType: 'STANDARD',
    floor: '',
    notes: '',
  });

  const [statusForm, setStatusForm] = useState({
    status: 'AVAILABLE',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  const fetchBeds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (search) params.search = search;
      if (filterWard) params.wardId = filterWard;
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.bedType = filterType;
      const res = await ipdService.getBeds(params);
      setBeds(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch beds');
    } finally {
      setLoading(false);
    }
  }, [search, filterWard, filterStatus, filterType]);

  const fetchWards = useCallback(async () => {
    try {
      const res = await ipdService.getWards();
      setWards(res.data || []);
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    fetchBeds();
    fetchWards();
  }, [fetchBeds, fetchWards]);

  const openCreateModal = () => {
    setCreateForm({
      wardId: wards[0]?.id || '',
      bedNumber: '',
      bedType: 'STANDARD',
      floor: '',
      notes: '',
    });
    setModalError(null);
    setCreateModalOpen(true);
  };

  const openStatusModal = (bed) => {
    setSelectedBed(bed);
    setStatusForm({
      status: bed.status === 'OCCUPIED' ? 'OCCUPIED' : bed.status,
      notes: bed.notes || '',
    });
    setModalError(null);
    setStatusModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      await ipdService.createBed(createForm);
      setCreateModalOpen(false);
      fetchBeds();
    } catch (err) {
      setModalError(err?.response?.data?.message || 'Failed to create bed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      await ipdService.updateBedStatus(selectedBed.id, statusForm);
      setStatusModalOpen(false);
      fetchBeds();
    } catch (err) {
      setModalError(err?.response?.data?.message || 'Failed to update bed status');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/hospital-admin/ipd')}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium"
          >
            ← Back to IPD
          </button>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight mt-1">Bed Management</h1>
          <p className="text-sm text-slate-500 mt-1">Live bed census, status controls, and physical location mapping</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Bed
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchBeds} className="underline font-medium hover:text-rose-800">
            Retry
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <input
            type="text"
            placeholder="Search bed number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>
        <div>
          <select
            value={filterWard}
            onChange={(e) => setFilterWard(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="">All Wards</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.wardName} ({w.wardCode})
              </option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="">All Statuses</option>
            {BED_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="">All Bed Types</option>
            {BED_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Beds Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : beds.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No beds found matching the filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Bed #</th>
                  <th className="px-5 py-3.5">Ward</th>
                  <th className="px-5 py-3.5">Bed Type</th>
                  <th className="px-5 py-3.5">Floor</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Current Patient</th>
                  <th className="px-5 py-3.5">Admission #</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {beds.map((b) => {
                  const p = b.currentAdmission?.patient;
                  const isOccupied = b.status === 'OCCUPIED';
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-bold font-mono text-slate-800">{b.bedNumber}</td>
                      <td className="px-5 py-3.5 text-slate-800 font-medium">
                        {b.ward?.wardName || '—'}
                        <span className="text-xs text-slate-400 font-mono ml-1">({b.ward?.wardCode})</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {b.bedType}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{b.floor || b.ward?.floor || '—'}</td>
                      <td className="px-5 py-3.5">
                        <BedStatusBadge status={b.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        {isOccupied && p ? (
                          <div>
                            <span className="font-medium text-slate-800">
                              {p.firstName} {p.lastName}
                            </span>
                            <span className="text-xs text-slate-400 font-mono block">{p.uhid}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs">
                        {isOccupied && b.currentAdmission ? (
                          <button
                            onClick={() => navigate(`/hospital-admin/ipd/admissions/${b.currentAdmission.id}`)}
                            className="text-teal-600 hover:text-teal-700 underline font-medium"
                          >
                            {b.currentAdmission.admissionNumber}
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => openStatusModal(b)}
                          className="text-xs font-medium text-teal-600 hover:text-teal-700"
                        >
                          Change Status
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

      {/* Add Bed Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">Add New Bed</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-semibold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Target Ward <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={createForm.wardId}
                  onChange={(e) => setCreateForm({ ...createForm, wardId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="">Select Ward</option>
                  {wards.filter((w) => w.isActive).map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.wardName} ({w.wardCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Bed Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. B-101, B-102"
                    value={createForm.bedNumber}
                    onChange={(e) => setCreateForm({ ...createForm, bedNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Bed Type</label>
                  <select
                    value={createForm.bedType}
                    onChange={(e) => setCreateForm({ ...createForm, bedType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    {BED_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Floor (Optional)</label>
                <input
                  type="text"
                  placeholder="Defaults to ward floor"
                  value={createForm.floor}
                  onChange={(e) => setCreateForm({ ...createForm, floor: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows="2"
                  placeholder="Equipment notes, proximity to nursing station, etc."
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Bed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Bed Status Modal */}
      {statusModalOpen && selectedBed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Change Bed Status</h3>
                <p className="text-xs text-slate-400">
                  Bed <span className="font-mono font-bold text-slate-700">{selectedBed.bedNumber}</span> • {selectedBed.ward?.wardName}
                </p>
              </div>
              <button
                onClick={() => setStatusModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-semibold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {modalError}
              </div>
            )}

            {selectedBed.status === 'OCCUPIED' ? (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-1">
                  <p className="font-semibold">Bed is currently OCCUPIED</p>
                  <p>
                    Patient {selectedBed.currentAdmission?.patient?.firstName}{' '}
                    {selectedBed.currentAdmission?.patient?.lastName} is admitted in this bed.
                  </p>
                  <p className="text-slate-500">
                    To free or reassign this bed, please use the <strong>Bed Transfer</strong> or <strong>Discharge</strong> workflow.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStatusModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  {selectedBed.currentAdmission?.id && (
                    <button
                      type="button"
                      onClick={() => navigate(`/hospital-admin/ipd/admissions/${selectedBed.currentAdmission.id}`)}
                      className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors"
                    >
                      View Admission
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleStatusSubmit} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Target Status</label>
                  <select
                    value={statusForm.status}
                    onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="RESERVED">Reserved</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="BLOCKED">Blocked</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Reason / Notes</label>
                  <textarea
                    rows="2"
                    placeholder="Reason for maintenance or blocking..."
                    value={statusForm.notes}
                    onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStatusModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Updating...' : 'Save Status'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
