import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ipdService from '../../services/ipdService';
import departmentService from '../../services/departmentService';

const WARD_TYPES = ['GENERAL', 'SEMI_PRIVATE', 'PRIVATE', 'ICU', 'CCU', 'HDU', 'EMERGENCY', 'OTHER'];
const GENDER_POLICIES = ['ANY', 'MALE', 'FEMALE'];

export default function WardManagementPage() {
  const navigate = useNavigate();
  const [wards, setWards] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWard, setEditingWard] = useState(null);
  const [formData, setFormData] = useState({
    wardCode: '',
    wardName: '',
    wardType: 'GENERAL',
    floor: '',
    departmentId: '',
    genderPolicy: 'ANY',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchWards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (search) params.search = search;
      if (filterType) params.wardType = filterType;
      const res = await ipdService.getWards(params);
      setWards(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch wards');
    } finally {
      setLoading(false);
    }
  }, [search, filterType]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await departmentService.getDepartments();
      setDepartments(res.data || []);
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    fetchWards();
    fetchDepartments();
  }, [fetchWards, fetchDepartments]);

  const openCreateModal = () => {
    setEditingWard(null);
    setFormData({
      wardCode: '',
      wardName: '',
      wardType: 'GENERAL',
      floor: '',
      departmentId: '',
      genderPolicy: 'ANY',
      description: '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (w) => {
    setEditingWard(w);
    setFormData({
      wardCode: w.wardCode,
      wardName: w.wardName,
      wardType: w.wardType,
      floor: w.floor || '',
      departmentId: w.departmentId || '',
      genderPolicy: w.genderPolicy || 'ANY',
      description: w.description || '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (editingWard) {
        await ipdService.updateWard(editingWard.id, formData);
      } else {
        await ipdService.createWard(formData);
      }
      setModalOpen(false);
      fetchWards();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to save ward');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (w) => {
    const action = w.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${w.wardName}?`)) return;
    try {
      await ipdService.updateWard(w.id, { isActive: !w.isActive });
      fetchWards();
    } catch (err) {
      alert(err?.response?.data?.message || `Failed to ${action} ward`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/hospital-admin/ipd')}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium"
            >
              ← Back to IPD
            </button>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight mt-1">Ward Management</h1>
          <p className="text-sm text-slate-500 mt-1">Configure hospital wards, capacities, and gender policies</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Ward
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchWards} className="underline font-medium hover:text-rose-800">
            Retry
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by code, ward name, or floor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="">All Ward Types</option>
            {WARD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Wards Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : wards.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No wards found matching the filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Ward Code</th>
                  <th className="px-5 py-3.5">Ward Name</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Floor</th>
                  <th className="px-5 py-3.5">Gender Policy</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5 text-center">Beds</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wards.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-medium text-slate-800">{w.wardCode}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">
                      <div>{w.wardName}</div>
                      {w.description && <div className="text-xs text-slate-400 font-normal">{w.description}</div>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {w.wardType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{w.floor || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-slate-600 font-medium capitalize">
                        {w.genderPolicy?.toLowerCase() || 'any'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{w.department?.name || '—'}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                        <span className="text-blue-600 font-bold">{w.occupiedBeds}</span> / {w.totalBeds}
                      </span>
                      {w.totalBeds > 0 && (
                        <div className="text-[10px] text-slate-400">({w.occupancyRate}% full)</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          w.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {w.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(w)}
                        className="text-xs font-medium text-teal-600 hover:text-teal-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(w)}
                        className={`text-xs font-medium ${
                          w.isActive ? 'text-rose-600 hover:text-rose-700' : 'text-emerald-600 hover:text-emerald-700'
                        }`}
                      >
                        {w.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ward Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">
                {editingWard ? 'Edit Ward' : 'Configure New Ward'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-semibold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Ward Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GW-01, ICU-01"
                    value={formData.wardCode}
                    onChange={(e) => setFormData({ ...formData, wardCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Ward Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.wardType}
                    onChange={(e) => setFormData({ ...formData, wardType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    {WARD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Ward Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. General Male Ward, Cardiac ICU"
                  value={formData.wardName}
                  onChange={(e) => setFormData({ ...formData, wardName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Floor</label>
                  <input
                    type="text"
                    placeholder="e.g. 1st Floor, Wing B"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Gender Policy</label>
                  <select
                    value={formData.genderPolicy}
                    onChange={(e) => setFormData({ ...formData, genderPolicy: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    {GENDER_POLICIES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Department (Optional)</label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="">None / General</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows="2"
                  placeholder="Notes or clinical guidelines for this ward..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingWard ? 'Update Ward' : 'Create Ward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
