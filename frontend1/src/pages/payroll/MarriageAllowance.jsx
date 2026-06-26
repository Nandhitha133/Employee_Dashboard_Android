import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, Download, Filter, X, Calendar, User, Building2, Briefcase, MapPin, FileText, Upload, CreditCard } from 'lucide-react';
import { employeeAPI, marriageAllowanceAPI, BASE_URL } from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import useNotification from '../../hooks/useNotification';
import Notification from '../../components/Notifications/Notification';
import Modal from '../../components/Modals/Modal';
import { AlertTriangle } from 'lucide-react';

const MarriageAllowance = () => {
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const [employees, setEmployees] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '', division: '', location: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const user = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('user')) || {};
    } catch {
      return {};
    }
  }, []);

  const [form, setForm] = useState({
    employeeId: '',
    employeeName: '',
    division: '',
    designation: '',
    location: '',
    dateOfJoining: '',
    marriageDate: '',
    spouseName: '',
    certificateFile: null,
    invitationFile: null,
    allowanceType: 'Marriage Allowance',
    allowanceAmount: 5000,
    requestDate: new Date().toISOString().slice(0, 10),
    requestedBy: user?.name || user?.username || '',
    managerStatus: 'Pending',
    hrStatus: 'Pending',
    remarks: '',
    paymentStatus: 'Pending',
    paymentDate: '',
    paymentMode: ''
  });

  useEffect(() => {
    fetchEmployees();
    fetchClaims();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await employeeAPI.getAllEmployees();
      setEmployees(res.data || []);
    } catch (e) {}
  };

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const res = await marriageAllowanceAPI.list({});
      const data = res.data?.data || [];
      setClaims(data);
    } catch (e) {
      showError('Failed to load marriage allowance records');
    } finally {
      setLoading(false);
    }
  };

  const divisionOptions = useMemo(() => (
    Array.from(new Set(employees.map(e => e.division).filter(Boolean)))
  ), [employees]);

  const locationOptions = useMemo(() => (
    Array.from(new Set(employees.map(e => (e.location || e.branch)).filter(Boolean)))
  ), [employees]);

  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      const idA = (a.employeeId || a.displayId || a._id || '').toString();
      const idB = (b.employeeId || b.displayId || b._id || '').toString();
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [employees]);

  const filteredClaims = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return claims.filter(item => {
      const matchesSearch = !search || [
        item.employeeId, item.employeeName
      ].some(v => (v || '').toLowerCase().includes(search));
      const matchesDivision = !filters.division || filters.division === '' || filters.division === 'All' || item.division === filters.division;
      const matchesLocation = !filters.location || filters.location === '' || filters.location === 'All' || item.location === filters.location;
      return matchesSearch && matchesDivision && matchesLocation;
    }).sort((a, b) => {
      const idA = (a.employeeId || '').toString();
      const idB = (b.employeeId || '').toString();
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [claims, filters]);

  const hasExistingClaim = useMemo(() => {
    if (!form.employeeId) return false;
    return claims.some(c => c.employeeId === form.employeeId && (!editingId || c._id !== editingId));
  }, [claims, form.employeeId, editingId]);

  const onEmployeeChange = async (employeeId) => {
    setForm(prev => ({ ...prev, employeeId }));
    const emp = employees.find(e => e.employeeId === employeeId || e.displayId === employeeId || e._id === employeeId);
    if (emp) {
      setForm(prev => ({
        ...prev,
        employeeId: emp.employeeId || emp.displayId || emp._id,
        employeeName: emp.name || emp.employeename || '',
        division: emp.division || '',
        designation: emp.designation || emp.position || '',
        location: emp.location || emp.address || emp.currentAddress || '',
        dateOfJoining: emp.dateOfJoining ? new Date(emp.dateOfJoining).toISOString().slice(0, 10) : ''
      }));
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      employeeId: '',
      employeeName: '',
      division: '',
      designation: '',
      location: '',
      dateOfJoining: '',
      marriageDate: '',
      spouseName: '',
      certificateFile: null,
      invitationFile: null,
      allowanceType: 'Marriage Allowance',
      allowanceAmount: 5000,
      requestDate: new Date().toISOString().slice(0, 10),
      requestedBy: user?.name || user?.username || '',
      managerStatus: 'Pending',
      hrStatus: 'Pending',
      remarks: '',
      paymentStatus: 'Pending',
      paymentDate: '',
      paymentMode: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeId) {
      showError('Select Employee');
      return;
    }
    if (!form.marriageDate) {
      showError('Enter Marriage Date');
      return;
    }
    if (hasExistingClaim) {
      showError('Only one claim allowed per employee');
      return;
    }
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'certificateFile' || k === 'invitationFile') return;
        if (v !== null && v !== undefined) fd.append(k, v);
      });
      if (form.certificateFile) fd.append('certificate', form.certificateFile);
      if (form.invitationFile) fd.append('invitation', form.invitationFile);
      if (editingId) {
        await marriageAllowanceAPI.update(editingId, fd);
        showSuccess('Updated successfully');
      } else {
        await marriageAllowanceAPI.create(fd);
        showSuccess('Saved successfully');
      }
      setShowForm(false);
      resetForm();
      fetchClaims();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save');
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setShowForm(true);
    setForm(prev => ({
      ...prev,
      employeeId: item.employeeId,
      employeeName: item.employeeName || '',
      division: item.division || '',
      designation: item.designation || '',
      location: item.location || '',
      dateOfJoining: item.dateOfJoining ? String(item.dateOfJoining).slice(0, 10) : '',
      marriageDate: item.marriageDate ? String(item.marriageDate).slice(0, 10) : '',
      spouseName: item.spouseName || '',
      allowanceType: item.allowanceType || 'Marriage Allowance',
      allowanceAmount: item.allowanceAmount ?? 5000,
      requestDate: item.requestDate ? String(item.requestDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
      requestedBy: item.requestedBy || (user?.name || user?.username || ''),
      managerStatus: item.managerStatus || 'Pending',
      hrStatus: item.hrStatus || 'Pending',
      remarks: item.remarks || '',
      paymentStatus: item.paymentStatus || 'Pending',
      paymentDate: item.paymentDate ? String(item.paymentDate).slice(0, 10) : '',
      paymentMode: item.paymentMode || ''
    }));
  };

  const handleDelete = (item) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await marriageAllowanceAPI.delete(itemToDelete._id);
      showSuccess('Deleted successfully');
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      fetchClaims();
    } catch (e) {
      showError('Delete failed');
    }
  };

  const exportExcel = () => {
    const rows = filteredClaims.map((c, idx) => ({
      SNo: idx + 1,
      EmployeeID: c.employeeId,
      EmployeeName: c.employeeName,
      Division: c.division,
      Location: c.location,
      MarriageDate: c.marriageDate ? new Date(c.marriageDate).toLocaleDateString() : '',
      PaymentStatus: c.paymentStatus,
      ManagerStatus: c.managerStatus,
      HRStatus: c.hrStatus
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MarriageAllowance');
    XLSX.writeFile(wb, 'Marriage_Allowance.xlsx');
  };

  const exportPDF = async () => {
    const doc = new jsPDF();
    const head = [['S.no', 'Employee ID', 'Name', 'Division', 'Location', 'Marriage Date', 'Payment Status']];
    const body = filteredClaims.map((c, idx) => [
      idx + 1,
      c.employeeId,
      c.employeeName,
      c.division || '',
      c.location || '',
      c.marriageDate ? new Date(c.marriageDate).toLocaleDateString() : '',
      c.paymentStatus || ''
    ]);
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(14);
    try {
      const res = await fetch('/images/steel-logo.png');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const img = await new Promise((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = reject;
          i.src = url;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = '#262760';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const tinted = canvas.toDataURL('image/png');
        doc.addImage(tinted, 'PNG', 10, 8, 24, 12);
        URL.revokeObjectURL(url);
      }
    } catch {}
    doc.text('Marriage Allowance', pageWidth / 2, 15, { align: 'center' });
    autoTable(doc, { head, body, startY: 24, styles: { fontSize: 9 } });
    doc.save('Marriage_Allowance.pdf');
  };

  const renderForm = () => (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#262760] to-indigo-700 text-white p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">New Marriage Allowance</h3>
          <button onClick={()=>{ setShowForm(false); resetForm(); }} className="rounded-lg border border-white/30 px-3 py-1 hover:bg-white hover:text-[#262760] transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="rounded-2xl border border-gray-200 shadow-sm">
            <div className="px-6 pt-6 flex items-center gap-2 text-[#262760] font-semibold">
              <User className="h-5 w-5" /> Employee Details
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                <select
                  className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#262760] transition"
                  value={form.employeeId}
                  onChange={(e) => onEmployeeChange(e.target.value)}
                >
                  <option value="">Select Employee</option>
                  {sortedEmployees.map(emp => (
                    <option key={emp._id} value={emp.employeeId || emp.displayId || emp._id}>
                      {(emp.employeeId || emp.displayId || emp._id) + ' - ' + (emp.name || '')}
                    </option>
                  ))}
                </select>
                {hasExistingClaim && <div className="text-red-600 text-sm mt-1">Claim already exists for this employee</div>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Employee Name</label>
                <input className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 bg-gray-50" value={form.employeeName} readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Division</label>
                <input className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 bg-gray-50" value={form.division} readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Designation</label>
                <input className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 bg-gray-50" value={form.designation} readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Joining</label>
                <input className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 bg-gray-50" value={form.dateOfJoining} readOnly />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 shadow-sm">
            <div className="px-6 pt-6 flex items-center gap-2 text-[#262760] font-semibold">
              <Calendar className="h-5 w-5" /> Marriage Details
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Marriage Date</label>
                <input type="date" className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#262760] transition" value={form.marriageDate} onChange={(e)=>setForm(prev=>({...prev, marriageDate:e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Spouse Name</label>
                <input type="text" className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#262760] transition" value={form.spouseName} onChange={(e)=>setForm(prev=>({...prev, spouseName:e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Marriage Certificate</label>
                <input type="file" accept="image/*,application/pdf" className="mt-1 w-full border border-dashed rounded-xl p-2.5" onChange={(e)=>setForm(prev=>({...prev, certificateFile:e.target.files[0]}))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Marriage Invitation (Optional)</label>
                <input type="file" accept="image/*,application/pdf" className="mt-1 w-full border border-dashed rounded-xl p-2.5" onChange={(e)=>setForm(prev=>({...prev, invitationFile:e.target.files[0]}))} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 shadow-sm">
            <div className="px-6 pt-6 flex items-center gap-2 text-[#262760] font-semibold">
              <CreditCard className="h-5 w-5" /> Allowance Details
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Allowance Type</label>
                <input className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 bg-gray-50" value={form.allowanceType} readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Allowance Amount</label>
                <input className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 bg-gray-50" value={form.allowanceAmount} readOnly />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 shadow-sm">
            <div className="px-6 pt-6 flex items-center gap-2 text-[#262760] font-semibold">
              <CreditCard className="h-5 w-5" /> Payment Details
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Status</label>
                <select className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#262760] transition" value={form.paymentStatus} onChange={(e)=>setForm(prev=>({...prev, paymentStatus:e.target.value}))}>
                  <option>Pending</option>
                  <option>Paid</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Date</label>
                <input type="date" className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#262760] transition" value={form.paymentDate} onChange={(e)=>setForm(prev=>({...prev, paymentDate:e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Mode</label>
                <select className="mt-1 w-full border border-gray-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#262760] transition" value={form.paymentMode} onChange={(e)=>setForm(prev=>({...prev, paymentMode:e.target.value}))}>
                  <option value="">Select</option>
                  <option>Salary Credit</option>
                  <option>Bank Transfer</option>
                  <option>Cash</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={()=>{ setShowForm(false); resetForm(); }} className="px-4 py-2 rounded-lg border">
              Cancel
            </button>
            <button type="submit" className="bg-[#262760] text-white px-4 py-2 rounded-lg shadow hover:opacity-90 flex items-center gap-2">
              <Plus className="h-4 w-4" /> {editingId ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderList = () => (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button onClick={()=>setShowFilters(prev=>!prev)} className="border px-3 py-2 rounded-lg flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filters
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>{ setShowForm(true); resetForm(); }} className="bg-[#262760] text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Allowance
          </button>
          <button onClick={exportPDF} className="border px-3 py-2 rounded-lg flex items-center gap-2">
            <Download className="h-4 w-4" /> PDF
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              className="pl-9 w-full border rounded-lg p-2"
              placeholder="Search by name or ID"
              value={filters.search}
              onChange={(e)=>setFilters(prev=>({...prev, search:e.target.value}))}
            />
          </div>
          <div>
            <select className="w-full border rounded-lg p-2" value={filters.division} onChange={(e)=>setFilters(prev=>({...prev, division:e.target.value}))}>
              <option value="">All Divisions</option>
              {divisionOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <select className="w-full border rounded-lg p-2" value={filters.location} onChange={(e)=>setFilters(prev=>({...prev, location:e.target.value}))}>
              <option value="">All Locations</option>
              {locationOptions.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left bg-[#262760] text-white">
              <th className="p-3">S.no</th>
              <th className="p-3">Employee ID</th>
              <th className="p-3">Employee Name</th>
              <th className="p-3">Division</th>
              <th className="p-3">Location</th>
              <th className="p-3">Marriage Date</th>
              <th className="p-3">Payment Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClaims.map((c, idx) => (
              <tr key={c._id} className="border-t">
                <td className="p-3">{idx + 1}</td>
                <td className="p-3">{c.employeeId}</td>
                <td className="p-3">{c.employeeName}</td>
                <td className="p-3">{c.division}</td>
                <td className="p-3">{c.location}</td>
                <td className="p-3">{c.marriageDate ? new Date(c.marriageDate).toLocaleDateString() : ''}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded ${c.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {c.paymentStatus}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <button className="border px-2 py-1 rounded" onClick={()=>setViewingItem(c)} title="View"><Eye className="h-4 w-4" /></button>
                    <button className="border px-2 py-1 rounded" onClick={()=>handleEdit(c)} title="Edit"><Edit2 className="h-4 w-4" /></button>
                    <button className="border px-2 py-1 rounded" onClick={()=>handleDelete(c)} title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredClaims.length === 0 && !loading && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={8}>No records</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderViewModal = () => {
    if (!viewingItem) return null;
    const certUrl = viewingItem.certificatePath ? `${BASE_URL}${viewingItem.certificatePath}` : null;
    const invUrl = viewingItem.invitationPath ? `${BASE_URL}${viewingItem.invitationPath}` : null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="bg-gradient-to-r from-[#262760] to-indigo-700 text-white p-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Marriage Allowance</h3>
            <button className="rounded-lg border border-white/30 px-3 py-1 hover:bg-white hover:text-[#262760] transition" onClick={()=>setViewingItem(null)}>Close</button>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
              <div>
                <div className="text-sm text-gray-500">Employee</div>
                <div className="font-semibold text-gray-900">{viewingItem.employeeName} ({viewingItem.employeeId})</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Division</div>
                <div className="font-semibold text-gray-900">{viewingItem.division}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Designation</div>
                <div className="font-semibold text-gray-900">{viewingItem.designation}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Joining Date</div>
                <div className="font-semibold text-gray-900">{viewingItem.dateOfJoining ? new Date(viewingItem.dateOfJoining).toLocaleDateString() : ''}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Marriage Date</div>
                <div className="font-semibold text-gray-900">{viewingItem.marriageDate ? new Date(viewingItem.marriageDate).toLocaleDateString() : ''}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Spouse Name</div>
                <div className="font-semibold text-gray-900">{viewingItem.spouseName}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-teal-50/50 rounded-xl p-4 border border-teal-100">
              <div>
                <div className="text-sm text-gray-500">Allowance Type</div>
                <div className="font-semibold text-gray-900">{viewingItem.allowanceType || 'Marriage Allowance'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Allowance Amount</div>
                <div className="font-semibold text-gray-900">{viewingItem.allowanceAmount ?? 5000}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/50 rounded-xl p-4 border border-blue-100">
              <div>
                <div className="text-sm text-gray-500">Payment Status</div>
                <span className={`inline-block px-3 py-1 rounded-full font-semibold ${viewingItem.paymentStatus==='Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{viewingItem.paymentStatus}</span>
              </div>
              <div>
                <div className="text-sm text-gray-500">Payment Mode</div>
                <div className="font-semibold text-gray-900">{viewingItem.paymentMode}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Payment Date</div>
                <div className="font-semibold text-gray-900">{viewingItem.paymentDate ? new Date(viewingItem.paymentDate).toLocaleDateString() : ''}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-purple-50/50 rounded-xl p-4 border border-purple-100">
              <div>
                <div className="text-sm text-gray-500 mb-1">Certificate</div>
                {certUrl ? (
                  certUrl.toLowerCase().endsWith('.pdf') ? (
                    <a className="text-indigo-600 underline" href={certUrl} target="_blank" rel="noreferrer">Open PDF</a>
                  ) : (
                    <img src={certUrl} alt="Certificate" className="rounded-lg border border-indigo-200 max-h-64" />
                  )
                ) : <div className="text-gray-500">No document</div>}
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Invitation</div>
                {invUrl ? (
                  invUrl.toLowerCase().endsWith('.pdf') ? (
                    <a className="text-indigo-600 underline" href={invUrl} target="_blank" rel="noreferrer">Open PDF</a>
                  ) : (
                    <img src={invUrl} alt="Invitation" className="rounded-lg border border-indigo-200 max-h-64" />
                  )
                ) : <div className="text-gray-500">No document</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6">
      
      {showForm ? renderForm() : renderList()}
      {renderViewModal()}
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-red-600">
            <AlertTriangle className="w-10 h-10" />
            <p className="text-sm font-medium">
              Are you sure you want to delete the marriage allowance record for <span className="font-bold">{itemToDelete?.employeeName}</span>? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />
    </div>
  );
};

export default MarriageAllowance;
