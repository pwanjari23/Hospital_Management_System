import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import billingService from '../../services/billingService';
import departmentService from '../../services/departmentService';

function fmtCurrency(amount) {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BillingServicesPage() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [form, setForm] = useState({
    serviceCode: '',
    serviceName: '',
    category: 'CONSULTATION',
    departmentId: '',
    defaultPrice: '',
    taxPercentage: '0',
    description: '',
    isActive: true,
  });
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        search: search.trim() || undefined,
        category: categoryFilter || undefined,
        isActive: statusFilter !== '' ? statusFilter : undefined,
        limit: 100,
      };
      const res = await billingService.getServices(params);
      setServices(res.data.services || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load billing services');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter]);

  const loadDepartments = async () => {
    try {
      const res = await departmentService.getDepartments();
      setDepartments(res.data.departments || res.data || []);
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    loadDepartments();
  }, []);

  const openAddModal = () => {
    setEditingService(null);
    setForm({
      serviceCode: '',
      serviceName: '',
      category: 'CONSULTATION',
      departmentId: '',
      defaultPrice: '',
      taxPercentage: '0',
      description: '',
      isActive: true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (service) => {
    setEditingService(service);
    setForm({
      serviceCode: service.serviceCode,
      serviceName: service.serviceName,
      category: service.category || 'OTHER',
      departmentId: service.departmentId || '',
      defaultPrice: String(service.defaultPrice || 0),
      taxPercentage: String(service.taxPercentage || 0),
      description: service.description || '',
      isActive: Boolean(service.isActive),
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.serviceCode.trim() || !form.serviceName.trim()) {
      setFormError('Service code and service name are required');
      return;
    }
    try {
      setSubmitting(true);
      setFormError(null);
      const payload = {
        serviceCode: form.serviceCode.trim().toUpperCase(),
        serviceName: form.serviceName.trim(),
        category: form.category,
        departmentId: form.departmentId || undefined,
        defaultPrice: Number(form.defaultPrice) || 0,
        taxPercentage: Number(form.taxPercentage) || 0,
        description: form.description ? form.description.trim() : undefined,
        isActive: form.isActive,
      };

      if (editingService) {
        await billingService.updateService(editingService.id, payload);
      } else {
        await billingService.createService(payload);
      }

      setIsModalOpen(false);
      fetchServices();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to save billing service');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/hospital-admin/billing')}
              className="text-slate-400 hover:text-slate-600 transition"
            >
              &larr; Overview
            </button>
            <span className="text-slate-300">/</span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Billable Services Catalog</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Configure hospital charge masters, consultation rates, and procedure pricing.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-xs flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Billable Service
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex-1 w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Search code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="CONSULTATION">Consultation</option>
            <option value="INVESTIGATION">Investigation</option>
            <option value="EECP">EECP</option>
            <option value="PROCEDURE">Procedure</option>
            <option value="PHARMACY">Pharmacy</option>
            <option value="REGISTRATION">Registration</option>
            <option value="OTHER">Other</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/60 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="py-3 px-4">Service Code</th>
                <th className="py-3 px-4">Service Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-right">Default Price</th>
                <th className="py-3 px-4 text-right">Tax %</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    Loading services...
                  </td>
                </tr>
              ) : services.length > 0 ? (
                services.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{s.serviceCode}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-900">{s.serviceName}</span>
                      {s.description && (
                        <span className="block text-xs text-slate-400 truncate max-w-xs">{s.description}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {s.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">{s.department?.name || '—'}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                      {fmtCurrency(s.defaultPrice)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-xs font-mono text-slate-500">
                      {Number(s.taxPercentage)}%
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          s.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => openEditModal(s)}
                        className="px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded transition"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No billable services configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingService ? 'Edit Billable Service' : 'Add Billable Service'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                &times;
              </button>
            </div>

            {formError && (
              <div className="my-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 mt-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Service Code *</label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingService)}
                    placeholder="e.g. CARD-ECHO"
                    value={form.serviceCode}
                    onChange={(e) => setForm({ ...form, serviceCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="CONSULTATION">Consultation</option>
                    <option value="INVESTIGATION">Investigation</option>
                    <option value="EECP">EECP</option>
                    <option value="PROCEDURE">Procedure</option>
                    <option value="PHARMACY">Pharmacy</option>
                    <option value="REGISTRATION">Registration</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2D Echocardiography"
                  value={form.serviceName}
                  onChange={(e) => setForm({ ...form, serviceName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Default Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="1500"
                    value={form.defaultPrice}
                    onChange={(e) => setForm({ ...form, defaultPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tax (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={form.taxPercentage}
                    onChange={(e) => setForm({ ...form, taxPercentage: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                  <select
                    value={form.departmentId}
                    onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">None</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows="2"
                  placeholder="Optional clinical notes or package inclusions..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                ></textarea>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Service is active and available for billing
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                >
                  {submitting ? 'Saving...' : editingService ? 'Update Service' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
