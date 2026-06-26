import React, { useState, useEffect } from 'react';
import { leaveAPI, employeeAPI, regionalHolidayAPI, BASE_URL } from '../../services/api';
import {
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  AlertCircle,
  Home,
  Heart,
  Flag,
  XCircle,
  Eye,
  Pencil,
  Trash
} from 'lucide-react';
import Modal from '../../components/Modals/Modal';
import Notification from '../../components/Notifications/Notification';

  // Leave types as per policy
  const allLeaveTypes = [
    { value: 'CL', label: 'Casual Leave (CL)' },
    { value: 'SL', label: 'Sick Leave (SL)' },
    { value: 'PL', label: 'Privilege Leave (PL)' },
    { value: 'REGIONAL_HOLIDAY', label: 'Regional Holiday' },
  ];

  const LeaveApplications = () => {
    // State for leave form
    const [leaveData, setLeaveData] = useState({
      leaveType: 'PL',
      startDate: '',
      endDate: '',
      dayType: 'Full Day',
     
      bereavementRelation: '',
      regionalHolidayName: '',
      supportingDocuments: null
    });
    const [fieldErrors, setFieldErrors] = useState({});

    const [allowedLeaveTypes, setAllowedLeaveTypes] = useState(allLeaveTypes);

  const [totalLeaveDays, setTotalLeaveDays] = useState(0);
  const [leaveBalance, setLeaveBalance] = useState({
    CL: 6,
    SL: 6,
    PL: 15,
    BEREAVEMENT: 2
  });
  const [apiUsedLeaves, setApiUsedLeaves] = useState(null);

  // Leave history state
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [editingLeaveId, setEditingLeaveId] = useState(null);
  const [viewLeave, setViewLeave] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: 'success', isVisible: false });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, leaveId: null });
  const [submitModal, setSubmitModal] = useState({ isOpen: false, leave: null });
  const [warningModal, setWarningModal] = useState({ isOpen: false, message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [regionalHolidays, setRegionalHolidays] = useState([]);
  const [leaveSplit, setLeaveSplit] = useState(null);
  const [loadingSplit, setLoadingSplit] = useState(false);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type, isVisible: true });
  };

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isVisible: false }));
  };

  const fetchMyLeaves = async () => {
    try {
      const res = await leaveAPI.myLeaves();
      const items = Array.isArray(res.data) ? res.data : [];
      const mapped = items.map(l => ({
        id: l._id,
        leaveType: l.leaveType,
        leaveTypeName: l.leaveType === 'REGIONAL_HOLIDAY'
          ? `${allLeaveTypes.find(t => t.value === 'REGIONAL_HOLIDAY')?.label || 'Regional Holiday'}${l.regionalHolidayName ? ` - ${l.regionalHolidayName}` : ''}`
          : (allLeaveTypes.find(t => t.value === l.leaveType)?.label || l.leaveType),
        startDate: l.startDate,
        endDate: l.endDate,
        dayType: l.dayType,
        totalDays: l.totalDays,
        clUsed: l.clUsed || 0,
        slUsed: l.slUsed || 0,
        plUsed: l.plUsed || 0,
        negativePL: l.negativePL || 0,
        lopDays: l.lopDays || 0,
        status: l.status,
        appliedDate: l.appliedDate,
       
        bereavementRelation: l.bereavementRelation || '',
        regionalHolidayName: l.regionalHolidayName || '',
        documentUrl: l.documentUrl || ''
      }));
      setLeaveHistory(mapped);
    } catch { }
  };

  useEffect(() => {
    fetchMyLeaves();
    const timer = setInterval(fetchMyLeaves, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchSplit = async () => {
      if (totalLeaveDays > 0 && ['CL', 'SL', 'PL'].includes(leaveData.leaveType)) {
        setLoadingSplit(true);
        try {
          const res = await leaveAPI.getPreviewSplit(totalLeaveDays);
          setLeaveSplit(res.data);
        } catch {
          setLeaveSplit(null);
        } finally {
          setLoadingSplit(false);
        }
      } else {
        setLeaveSplit(null);
      }
    };
    fetchSplit();
  }, [totalLeaveDays, leaveData.leaveType]);

  useEffect(() => {
    const loadRegionalHolidays = async () => {
      try {
        const res = await regionalHolidayAPI.list();
        const items = Array.isArray(res.data) ? res.data : [];
        const mapped = items
          .map((h) => ({
            id: String(h?.id || h?._id || ''),
            name: String(h?.name || '').trim(),
            dateISO: String(h?.dateISO || '').trim()
          }))
          .filter((h) => h.id && h.name && h.dateISO);
        setRegionalHolidays(mapped);
      } catch {
        setRegionalHolidays([]);
      }
    };
    loadRegionalHolidays();
  }, []);

  useEffect(() => {
    const monthsBetween = (dateString) => {
      if (!dateString) return 0;
      const start = new Date(dateString);
      if (isNaN(start.getTime())) return 0;
      const now = new Date();
      const years = now.getFullYear() - start.getFullYear();
      const months = now.getMonth() - start.getMonth();
      const total = years * 12 + months;
      return Math.max(0, total);
    };
    const calculateLeaveBalances = (employee) => {
      const { designation, monthsOfService } = employee;
      let casual = 0, sick = 0, privilege = 0;
      const isTrainee = String(designation || '').toLowerCase().includes('trainee');
      const traineeMonths = Math.min(monthsOfService, 12);
      if (isTrainee) {
        privilege = traineeMonths * 1;
        casual = 0;
        sick = 0;
      } else {
        const firstSix = Math.min(monthsOfService, 6);
        const afterSix = Math.max(monthsOfService - 6, 0);
        const plNonCarry = (firstSix * 1);
        const plCarry = afterSix * 1.25;
        privilege = plNonCarry + plCarry;
        casual = afterSix * 0.5;
        sick = afterSix * 0.5;
      }
      return {
        CL: casual,
        SL: sick,
        PL: privilege
      };
    };
    const loadBalanceForMe = async () => {
      const applyVisibilityRules = (designation, monthsOfService) => {
        const isTrainee = String(designation || '').toLowerCase().includes('trainee');
        let showCLSL = false;
        
        if (isTrainee) {
          if (monthsOfService >= 12) showCLSL = true;
        } else {
          if (monthsOfService >= 6) showCLSL = true;
        }
        
        const filtered = allLeaveTypes.filter(t => {
          if (t.value === 'CL' || t.value === 'SL') return showCLSL;
          return true;
        });
        setAllowedLeaveTypes(filtered);
        
        // If current selected leave type is now hidden, reset to something valid or PL if available
        setLeaveData(prev => {
           if (!filtered.find(t => t.value === prev.leaveType)) {
             return { ...prev, leaveType: filtered[0]?.value || '' };
           }
           return prev;
        });
      };

      try {
        // Try dedicated endpoint for current user's balance
        const myRes = await leaveAPI.myBalance();
        const data = myRes?.data || {};
        if (data && data.balances) {
          applyVisibilityRules(data.position || data.designation, data.monthsOfService || 0);
          setLeaveBalance({
            CL: data.balances.casual?.allocated || 0,
            SL: data.balances.sick?.allocated || 0,
            PL: data.balances.privilege?.allocated || 0,
            BEREAVEMENT: 2
          });
          setApiUsedLeaves({
            CL: data.balances.casual?.used || 0,
            SL: data.balances.sick?.used || 0,
            PL: data.balances.privilege?.used || 0
          });
          return;
        }
        // Fallback to generic balance list when accessible
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        const empId = user.employeeId || user.employeeCode || user.empId || '';
        const res = await leaveAPI.getBalance(empId ? { employeeId: empId } : undefined);
        const items = Array.isArray(res.data) ? res.data : [];
        const mine = items.find(e => String(e.employeeId || '').toLowerCase() === String(empId || '').toLowerCase())
          || items.find(e => String(e.email || '').toLowerCase() === String(user.email || '').toLowerCase())
          || items.find(e => String(e.name || '').toLowerCase() === String(user.name || '').toLowerCase());
        if (mine && mine.balances) {
          applyVisibilityRules(mine.position || mine.designation, mine.monthsOfService || 0);
          setLeaveBalance({
            CL: mine.balances.casual?.allocated || 0,
            SL: mine.balances.sick?.allocated || 0,
            PL: mine.balances.privilege?.allocated || 0,
            BEREAVEMENT: 2
          });
          setApiUsedLeaves({
            CL: mine.balances.casual?.used || 0,
            SL: mine.balances.sick?.used || 0,
            PL: mine.balances.privilege?.used || 0
          });
          return;
        }
        throw new Error('No balance found');
      } catch {
        try {
          const [empRes, myLeavesRes] = await Promise.all([
            employeeAPI.getMyProfile().catch(() => null),
            leaveAPI.myLeaves().catch(() => ({ data: [] }))
          ]);
          const emp = empRes?.data || {};
          const doj = emp.dateOfJoining || emp.dateofjoin || emp.hireDate || emp.createdAt || '';
          const m = monthsBetween(doj);
          const d = emp.designation || emp.position || emp.role || '';
          
          applyVisibilityRules(d, m);

          const alloc = calculateLeaveBalances({ designation: d, monthsOfService: m });
          const myApproved = Array.isArray(myLeavesRes?.data) ? myLeavesRes.data.filter(l => l.status === 'Approved') : [];
          const used = myApproved.reduce((acc, l) => {
            const t = l.leaveType;
            const days = Number(l.totalDays || 0);
            if (t === 'CL') acc.CL += days;
            else if (t === 'SL') acc.SL += days;
            else if (t === 'PL') acc.PL += days;
            return acc;
          }, { CL: 0, SL: 0, PL: 0 });
          setLeaveBalance({
            CL: Number(alloc.CL || 0),
            SL: Number(alloc.SL || 0),
            PL: Number(alloc.PL || 0),
            BEREAVEMENT: 2
          });
          setApiUsedLeaves(used);
        } catch { }
      }
    };
    loadBalanceForMe();
  }, []);

  // Leave types definition moved to top

  const bereavementRelations = [
    'Spouse', 'Parent', 'Child', 'Sibling', 'Grandparent', 'In-Laws'
  ];

  const dayTypes = ['Full Day', 'Half Day'];

  // Calculate date limits for date selection
  const today = new Date();
  const firstDayPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastDayCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const formatDateForInput = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const minDateLimit = formatDateForInput(firstDayPrevMonth);
  const maxDateLimit = formatDateForInput(lastDayCurrentMonth);

  // Calculate total working days excluding weekends
  const calculateWorkingDays = (start, end, dayType) => {
    if (!start || !end) return 0;

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (startDate > endDate) return 0;

    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      count++;
      current.setDate(current.getDate() + 1);
    }

    // Adjust for half day
    if (dayType === 'Half Day' && count === 1) {
      return 0.5;
    }

    return count;
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;

    if (type === 'file') {
      setLeaveData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      if (name === 'startDate' && leaveData.dayType === 'Half Day') {
        setLeaveData(prev => ({ ...prev, startDate: value, endDate: value }));
      } else {
        setLeaveData(prev => ({ ...prev, [name]: value }));
      }
    }
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }

    // Recalculate days when dates or day type changes
    if (name === 'startDate' || name === 'endDate' || name === 'dayType') {
      setTimeout(() => {
        let currentStartDate = name === 'startDate' ? value : leaveData.startDate;
        let currentEndDate = name === 'endDate' ? value : leaveData.endDate;
        let currentDayType = name === 'dayType' ? value : leaveData.dayType;

        if (name === 'startDate' && leaveData.dayType === 'Half Day') {
          currentEndDate = value;
        }

        const days = calculateWorkingDays(
          currentStartDate,
          currentEndDate,
          currentDayType
        );
        setTotalLeaveDays(days);
      }, 0);
    }
  };

  // Handle day type change
  const handleDayTypeChange = (type) => {
    let newEndDate = leaveData.endDate;
    if (type === 'Half Day' && leaveData.startDate) {
      newEndDate = leaveData.startDate;
    }
    
    setLeaveData(prev => ({ ...prev, dayType: type, endDate: newEndDate }));
    if (fieldErrors.dayType || fieldErrors.endDate) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next.dayType;
        delete next.endDate;
        return next;
      });
    }

    if (leaveData.startDate && newEndDate) {
      const days = calculateWorkingDays(leaveData.startDate, newEndDate, type);
      setTotalLeaveDays(days);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
 
    // Validation
    const errors = {};
    if (!leaveData.startDate) errors.startDate = true;
    if (leaveData.dayType !== 'Half Day' && !leaveData.endDate) errors.endDate = true;
    if (!leaveData.leaveType) errors.leaveType = true;
    if (leaveData.leaveType === 'BEREAVEMENT' && !leaveData.bereavementRelation) {
      errors.bereavementRelation = true;
    }
    if (leaveData.leaveType === 'REGIONAL_HOLIDAY' && !leaveData.regionalHolidayName) {
      errors.regionalHolidayName = true;
    }
    if (leaveData.leaveType === 'SL' && totalLeaveDays > 5 && !leaveData.supportingDocuments) {
      errors.supportingDocuments = true;
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showNotification('Please fill in all required fields', 'error');
      setSubmitting(false);
      return;
    }

    setFieldErrors({});

    // Check leave balance
    // Rule: CL, SL, BEREAVEMENT cannot go negative.
    // PL can go negative (or just isn't blocked).
    if (['CL', 'SL', 'BEREAVEMENT'].includes(leaveData.leaveType)) {
      const available = getAvailableBalance(leaveData.leaveType);
      if (totalLeaveDays > available) {
        setWarningModal({
          isOpen: true,
          message: 'You do not have sufficient leave balance for this leave type. Please apply leave under Privilege Leave (PL).'
        });
        setSubmitting(false);
        return;
      }
    }

    const effectiveStartDate = leaveData.startDate;
    const effectiveEndDate =
      leaveData.dayType === 'Half Day'
        ? (leaveData.startDate || leaveData.endDate)
        : leaveData.endDate;
 
    const newStart = new Date(effectiveStartDate);
    const newEnd = new Date(effectiveEndDate);
    const newIsHalfDay = leaveData.dayType === 'Half Day';

    if (leaveData.leaveType === 'REGIONAL_HOLIDAY') {
      const newYear = newStart instanceof Date && !isNaN(newStart.getTime()) ? newStart.getFullYear() : null;
      const hasAlreadyApplied = leaveHistory.some(leave => {
        if (leave.status !== 'Approved' && leave.status !== 'Pending') return false;
        if (editingLeaveId && leave.id === editingLeaveId) return false;
        if (leave.leaveType !== 'REGIONAL_HOLIDAY') return false;
        const existingStart = new Date(leave.startDate);
        if (isNaN(existingStart.getTime()) || newYear === null) return false;
        return existingStart.getFullYear() === newYear;
      });

      if (hasAlreadyApplied) {
        setWarningModal({
          isOpen: true,
          message: 'You have already applied for a regional holiday this year.'
        });
        setSubmitting(false);
        return;
      }
    }

    if (newIsHalfDay) {
      if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
        setSubmitting(false);
        return;
      }

      const targetDate = new Date(
        newStart.getFullYear(),
        newStart.getMonth(),
        newStart.getDate()
      );

      let halfDayTotal = 0;
      let hasFullDayConflict = false;

      leaveHistory.forEach(leave => {
        // Only consider active leaves (Pending/Approved) for overlap check
        if (leave.status !== 'Approved' && leave.status !== 'Pending') return;
        if (editingLeaveId && leave.id === editingLeaveId) return;

        const existingStart = new Date(leave.startDate);
        const existingEnd = new Date(leave.endDate);

        if (
          isNaN(existingStart.getTime()) ||
          isNaN(existingEnd.getTime())
        ) {
          return;
        }

        const existingStartDay = new Date(
          existingStart.getFullYear(),
          existingStart.getMonth(),
          existingStart.getDate()
        );
        const existingEndDay = new Date(
          existingEnd.getFullYear(),
          existingEnd.getMonth(),
          existingEnd.getDate()
        );

        const coversTarget =
          targetDate >= existingStartDay && targetDate <= existingEndDay;

        if (!coversTarget) return;

        if (leave.dayType === 'Half Day' && existingStartDay.getTime() === existingEndDay.getTime()) {
          halfDayTotal += Number(leave.totalDays || 0);
        } else {
          hasFullDayConflict = true;
        }
      });

      if (hasFullDayConflict || halfDayTotal >= 1) {
        setWarningModal({
          isOpen: true,
          message: 'You have already taken leave on this date.'
        });
        setSubmitting(false);
        return;
      }
    } else {
      const hasOverlappingLeave = leaveHistory.some(leave => {
        // Only consider active leaves (Pending/Approved) for overlap check
        if (leave.status !== 'Approved' && leave.status !== 'Pending') return false;
        if (editingLeaveId && leave.id === editingLeaveId) return false;
        const existingStart = new Date(leave.startDate);
        const existingEnd = new Date(leave.endDate);
        if (
          isNaN(existingStart.getTime()) ||
          isNaN(existingEnd.getTime()) ||
          isNaN(newStart.getTime()) ||
          isNaN(newEnd.getTime())
        ) {
          return false;
        }
        return newStart <= existingEnd && newEnd >= existingStart;
      });

      if (hasOverlappingLeave) {
        setWarningModal({
          isOpen: true,
          message: 'You have already taken leave on this date.'
        });
        setSubmitting(false);
        return;
      }
    }

    // Create or update leave application
    const leaveTypeName =
      leaveData.leaveType === 'REGIONAL_HOLIDAY'
        ? `${allLeaveTypes.find(type => type.value === 'REGIONAL_HOLIDAY')?.label || 'Regional Holiday'}${leaveData.regionalHolidayName ? ` - ${leaveData.regionalHolidayName}` : ''}`
        : (allLeaveTypes.find(type => type.value === leaveData.leaveType)?.label || leaveData.leaveType);

    const formData = new FormData();
    formData.append('leaveType', leaveData.leaveType);
    formData.append('startDate', effectiveStartDate);
    formData.append('endDate', effectiveEndDate);
    formData.append('dayType', leaveData.dayType);
    formData.append('totalDays', totalLeaveDays);
    formData.append('bereavementRelation', leaveData.bereavementRelation || '');
    formData.append('regionalHolidayName', leaveData.regionalHolidayName || '');
    
    if (leaveData.supportingDocuments) {
      formData.append('supportingDocuments', leaveData.supportingDocuments);
    }

    try {
      if (editingLeaveId) {
        const res = await leaveAPI.update(editingLeaveId, formData);
        const l = res.data;
        setLeaveHistory(prev => prev.map(x => x.id === editingLeaveId ? {
          id: l._id,
          leaveType: l.leaveType,
          leaveTypeName: leaveTypeName,
          startDate: l.startDate,
          endDate: l.endDate,
          dayType: l.dayType,
          totalDays: l.totalDays,
          clUsed: l.clUsed || 0,
          slUsed: l.slUsed || 0,
          plUsed: l.plUsed || 0,
          negativePL: l.negativePL || 0,
          lopDays: l.lopDays || 0,
          remainingBalance: l.remainingBalance,
          status: l.status,
          appliedDate: l.appliedDate,
           
          regionalHolidayName: l.regionalHolidayName || '',
          documentUrl: l.documentUrl || ''
        } : x));
        setEditingLeaveId(null);
      } else {
        const res = await leaveAPI.apply(formData);
        const l = res.data;
        const newLeave = {
          id: l._id,
          leaveType: l.leaveType,
          leaveTypeName: leaveTypeName,
          startDate: l.startDate,
          endDate: l.endDate,
          dayType: l.dayType,
          totalDays: l.totalDays,
          clUsed: l.clUsed || 0,
          slUsed: l.slUsed || 0,
          plUsed: l.plUsed || 0,
          negativePL: l.negativePL || 0,
          lopDays: l.lopDays || 0,
          remainingBalance: l.remainingBalance,
          status: l.status,
          appliedDate: l.appliedDate,
           
          regionalHolidayName: l.regionalHolidayName || '',
          documentUrl: l.documentUrl || ''
        };
        setLeaveHistory(prev => [newLeave, ...prev]);
        setSubmitModal({ isOpen: true, leave: newLeave });
      }
    } catch { }

    // Reset form
    setLeaveData({
      leaveType: 'PL',
      startDate: '',
      endDate: '',
      dayType: 'Full Day',
    
      bereavementRelation: '',
      regionalHolidayName: '',
      supportingDocuments: null
    });
    setFieldErrors({});
    setTotalLeaveDays(0);
    setIsEditModalOpen(false);
    setSubmitting(false);

    showNotification(editingLeaveId ? 'Leave application updated successfully.' : 'Leave application submitted successfully! Awaiting approval.', 'success');
  };

  const handleEdit = (leave) => {
    if (leave.status !== 'Pending') {
      showNotification('Only Pending applications can be edited.', 'error');
      return;
    }
    setEditingLeaveId(leave.id);
    setLeaveData({
      leaveType: leave.leaveType,
      startDate: new Date(leave.startDate).toISOString().slice(0, 10),
      endDate: new Date(leave.endDate).toISOString().slice(0, 10),
      dayType: leave.dayType || 'Full Day',
     
      bereavementRelation: leave.leaveType === 'BEREAVEMENT' ? (leave.bereavementRelation || '') : '',
      regionalHolidayName: leave.leaveType === 'REGIONAL_HOLIDAY' ? (leave.regionalHolidayName || '') : '',
      supportingDocuments: null
    });
    setTotalLeaveDays(leave.totalDays || 0);
    setIsEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setEditingLeaveId(null);
    setLeaveData({
      leaveType: 'PL',
      startDate: '',
      endDate: '',
      dayType: 'Full Day',
    
      bereavementRelation: '',
      regionalHolidayName: '',
      supportingDocuments: null
    });
    setTotalLeaveDays(0);
  };

  const handleDelete = (leave) => {
    if (leave.status !== 'Pending') {
      showNotification('Only Pending applications can be deleted.', 'error');
      return;
    }
    setDeleteModal({ isOpen: true, leaveId: leave.id });
  };

  const confirmDelete = async () => {
    if (!deleteModal.leaveId) return;
    try {
      await leaveAPI.remove(deleteModal.leaveId);
      setLeaveHistory(prev => prev.filter(x => x.id !== deleteModal.leaveId));
      showNotification('Leave application deleted.', 'success');
    } catch (e) {
      showNotification('Failed to delete leave application.', 'error');
    }
    setDeleteModal({ isOpen: false, leaveId: null });
  };

  const handleView = (leave) => setViewLeave(leave);

  const handleViewCertificate = async (leave) => {
    try {
      const documentUrl = leave?.documentUrl ? String(leave.documentUrl) : '';
      if (!documentUrl) return;
      if (documentUrl.startsWith('/uploads/')) {
        window.open(`${BASE_URL}${documentUrl}`, '_blank');
        return;
      }
      const response = await leaveAPI.downloadDocument(documentUrl);
      const contentType = response?.headers?.['content-type'] || 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
    } catch (e) {
      showNotification('Unable to open certificate.', 'error');
    }
  };

  // Get leave type icon
  const getLeaveTypeIcon = (type) => {
    switch (type) {
      case 'CL': return <Home className="w-5 h-5" />;
      case 'SL': return <AlertCircle className="w-5 h-5" />;
      case 'PL': return <Calendar className="w-5 h-5" />;
      case 'BEREAVEMENT': return <Heart className="w-5 h-5" />;
      case 'REGIONAL_HOLIDAY': return <Flag className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  // Get status badge style
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'Pending':
        return <Clock className="w-4 h-4" />;
      case 'Rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  // Calculate leave summary
  const calculateLeaveSummary = () => {
    // If we have API-provided used counts, use them to ensure consistency with backend/balance view
    if (apiUsedLeaves) {
      // Calculate Bereavement locally as API might not track it fully in standard balances
      const localBereavement = leaveHistory.reduce((sum, leave) => {
        if (leave.leaveType === 'BEREAVEMENT' && leave.status === 'Approved') {
          return sum + (leave.totalDays || 0);
        }
        return sum;
      }, 0);

      return {
        ...apiUsedLeaves,
        BEREAVEMENT: localBereavement
      };
    }

    const used = {
      CL: 0,
      SL: 0,
      PL: 0,
      BEREAVEMENT: 0
    };

    leaveHistory.forEach(leave => {
      if (leave.status === 'Approved') {
        if (leave.clUsed !== undefined || leave.slUsed !== undefined || leave.plUsed !== undefined) {
          used.CL += Number(leave.clUsed || 0);
          used.SL += Number(leave.slUsed || 0);
          used.PL += Number(leave.plUsed || 0) + Number(leave.negativePL || 0);
          if (leave.leaveType === 'BEREAVEMENT') used.BEREAVEMENT += Number(leave.totalDays || 0);
        } else if (['CL', 'SL', 'PL', 'BEREAVEMENT'].includes(leave.leaveType)) {
          used[leave.leaveType] += Number(leave.totalDays || 0);
        }
      }
    });

    return used;
  };

  const usedLeaves = calculateLeaveSummary();
  const calculatePendingSummary = () => {
    const pending = {
      CL: 0,
      SL: 0,
      PL: 0,
      BEREAVEMENT: 0
    };
    leaveHistory.forEach(leave => {
      if (leave.status === 'Pending') {
        if (leave.clUsed !== undefined || leave.slUsed !== undefined || leave.plUsed !== undefined) {
          pending.CL += Number(leave.clUsed || 0);
          pending.SL += Number(leave.slUsed || 0);
          pending.PL += Number(leave.plUsed || 0) + Number(leave.negativePL || 0);
          if (leave.leaveType === 'BEREAVEMENT') pending.BEREAVEMENT += Number(leave.totalDays || 0);
        } else if (['CL', 'SL', 'PL', 'BEREAVEMENT'].includes(leave.leaveType)) {
          pending[leave.leaveType] += Number(leave.totalDays || 0);
        }
      }
    });
    return pending;
  };
  const pendingLeaves = calculatePendingSummary();
  const getAvailableBalance = (type) => {
    const base = Number(leaveBalance[type] || 0);
    const pending = Number(pendingLeaves[type] || 0);
    const used = Number(usedLeaves[type] || 0);
    const val = base - pending - used;
    if (type === 'CL' || type === 'SL') return Math.max(0, val);
    return val;
  };

  const isRegionalHoliday = leaveData.leaveType === 'REGIONAL_HOLIDAY';
  const selectedRegionalHolidayValue = isRegionalHoliday && leaveData.regionalHolidayName && leaveData.startDate
    ? `${leaveData.regionalHolidayName}||${leaveData.startDate}`
    : '';

  const selectedHolidayYear = (() => {
    const d = isRegionalHoliday && leaveData.startDate ? new Date(leaveData.startDate) : new Date();
    return d instanceof Date && !isNaN(d.getTime()) ? d.getFullYear() : new Date().getFullYear();
  })();

  const hasApprovedRegionalHolidayThisYear = leaveHistory.some(leave => {
    if (leave.leaveType !== 'REGIONAL_HOLIDAY') return false;
    if (leave.status !== 'Approved') return false;
    const sd = new Date(leave.startDate);
    if (isNaN(sd.getTime())) return false;
    return sd.getFullYear() === selectedHolidayYear;
  });

  const hasPendingOrApprovedRegionalHolidayThisYear = leaveHistory.some(leave => {
    if (leave.leaveType !== 'REGIONAL_HOLIDAY') return false;
    if (leave.status !== 'Approved' && leave.status !== 'Pending') return false;
    const sd = new Date(leave.startDate);
    if (isNaN(sd.getTime())) return false;
    return sd.getFullYear() === selectedHolidayYear;
  });
  const handleRegionalHolidaySelection = (e) => {
    const value = String(e.target.value || '');
    if (!value) {
      setLeaveData(prev => ({
        ...prev,
        regionalHolidayName: '',
        startDate: '',
        endDate: '',
        dayType: 'Full Day'
      }));
      setTotalLeaveDays(0);
      return;
    }
    const parts = value.split('||');
    const name = String(parts[0] || '').trim();
    const dateISO = String(parts[1] || '').trim();
    setLeaveData(prev => ({
      ...prev,
      regionalHolidayName: name,
      startDate: dateISO,
      endDate: dateISO,
      dayType: 'Full Day'
    }));
    if (fieldErrors.regionalHolidayName || fieldErrors.startDate || fieldErrors.endDate || fieldErrors.dayType) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next.regionalHolidayName;
        delete next.startDate;
        delete next.endDate;
        delete next.dayType;
        return next;
      });
    }
    setTotalLeaveDays(1);
  };

  const leaveFormContent = (
    <form noValidate onSubmit={handleSubmit} className="space-y-6">
      {/* Leave Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Leave Type *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {allowedLeaveTypes.map(type => (
            <button
              key={type.value}
              type="button"
              onClick={() => {
                const blocked = type.value === 'REGIONAL_HOLIDAY' && hasApprovedRegionalHolidayThisYear;
                if (blocked) return;
                setLeaveData(prev => ({
                  ...prev,
                  leaveType: type.value,
                  bereavementRelation: type.value === 'BEREAVEMENT' ? prev.bereavementRelation : '',
                  regionalHolidayName: type.value === 'REGIONAL_HOLIDAY' ? '' : '',
                  startDate: type.value === 'REGIONAL_HOLIDAY' ? '' : prev.startDate,
                  endDate: type.value === 'REGIONAL_HOLIDAY' ? '' : prev.endDate,
                  dayType: type.value === 'REGIONAL_HOLIDAY' ? 'Full Day' : prev.dayType
                }));
              }}
              disabled={type.value === 'REGIONAL_HOLIDAY' && hasApprovedRegionalHolidayThisYear}
              className={`p-4 rounded-lg border-2 transition flex items-center justify-center gap-3 ${leaveData.leaveType === type.value
                ? 'border-[#262760] bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'} ${type.value === 'REGIONAL_HOLIDAY' && hasApprovedRegionalHolidayThisYear ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`p-2 rounded ${leaveData.leaveType === type.value ? 'bg-blue-100' : 'bg-gray-100'}`}>
                {getLeaveTypeIcon(type.value)}
              </div>

              <div className="font-medium text-gray-900">{type.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Bereavement Relation (if bereavement leave selected) */}
      {leaveData.leaveType === 'BEREAVEMENT' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Relationship with Deceased *
          </label>
          <select
            name="bereavementRelation"
            value={leaveData.bereavementRelation}
            onChange={handleInputChange}
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 outline-none transition ${fieldErrors.bereavementRelation ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-[#262760] focus:border-[#262760]'}`}
          >
            <option value="">Select Relationship</option>
            {bereavementRelations.map(relation => (
              <option key={relation} value={relation}>{relation}</option>
            ))}
          </select>
        </div>
      )}

      {leaveData.leaveType === 'REGIONAL_HOLIDAY' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            REGIONAL HOLIDAY *
          </label>
          <select
            value={selectedRegionalHolidayValue}
            onChange={handleRegionalHolidaySelection}
            disabled={hasApprovedRegionalHolidayThisYear}
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 outline-none transition ${fieldErrors.regionalHolidayName ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-[#262760] focus:border-[#262760]'} ${hasApprovedRegionalHolidayThisYear ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          >
            <option value="">Select Holiday</option>
            {regionalHolidays.map(h => (
              <option key={h.id} value={`${h.name}||${h.dateISO}`}>{`${h.name} (${h.dateISO})`}</option>
            ))}
          </select>
          {hasApprovedRegionalHolidayThisYear && (
            <div className="mt-2 text-sm text-gray-500">
              You already have an approved regional holiday for this year.
            </div>
          )}
        </div>
      )}

      {/* Dates Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Start Date */}
      <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date *
          </label>
          <input
            type="date"
            name="startDate"
            value={leaveData.startDate}
            min={minDateLimit}
            max={maxDateLimit}
            onKeyDown={(e) => e.preventDefault()}
            onPaste={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            onChange={handleInputChange}
            disabled={isRegionalHoliday}
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 outline-none transition ${fieldErrors.startDate ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-[#262760] focus:border-[#262760]'} ${isRegionalHoliday ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>

        {/* Day Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Day Type
          </label>
          <div className="flex gap-2">
            {dayTypes.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  if (isRegionalHoliday) return;
                  handleDayTypeChange(type);
                }}
                disabled={isRegionalHoliday}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition ${leaveData.dayType === type
                  ? 'bg-[#262760] text-white'
                  : `bg-gray-100 text-gray-700 ${isRegionalHoliday ? '' : 'hover:bg-gray-200'}`}`}
              >

                {type}
              </button>
            ))}
          </div>
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date *
          </label>
          <input
            type="date"
            name="endDate"
            value={leaveData.endDate}
            min={leaveData.startDate || minDateLimit}
            max={maxDateLimit}
            onKeyDown={(e) => e.preventDefault()}
            onPaste={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            onChange={handleInputChange}
            disabled={leaveData.dayType === 'Half Day' || isRegionalHoliday}
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 outline-none transition ${fieldErrors.endDate ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} ${leaveData.dayType === 'Half Day' || isRegionalHoliday ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>
      </div>

  

      {/* Supporting Documents (for sick leave) */}
      {leaveData.leaveType === 'SL' && totalLeaveDays > 5 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Medical Certificate * (Required for sick leave exceeding 5 days)
          </label>
          <input
            type="file"
            name="supportingDocuments"
            onChange={handleInputChange}
            accept=".pdf,.jpg,.jpeg,.png"
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 outline-none transition ${fieldErrors.supportingDocuments ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-[#262760] focus:border-[#262760]'}`}
          />
          <p className="text-xs text-gray-500 mt-1">
            Upload medical certificate (PDF, JPG, PNG)
          </p>
        </div>
      )}

      {/* Leave Split Preview */}
      {leaveSplit && totalLeaveDays > 0 && (
        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 space-y-2 mb-6">
          <h4 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Leave Deduction Breakdown
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-xs">
            {leaveSplit.clUsed > 0 && (
              <div className="flex justify-between">
                <span className="text-indigo-700">Casual Leave:</span>
                <span className="font-bold text-indigo-900">{leaveSplit.clUsed} days</span>
              </div>
            )}
            {leaveSplit.slUsed > 0 && (
              <div className="flex justify-between">
                <span className="text-indigo-700">Sick Leave:</span>
                <span className="font-bold text-indigo-900">{leaveSplit.slUsed} days</span>
              </div>
            )}
            {leaveSplit.plUsed > 0 && (
              <div className="flex justify-between">
                <span className="text-indigo-700">Privilege Leave:</span>
                <span className="font-bold text-indigo-900">{leaveSplit.plUsed} days</span>
              </div>
            )}
            {leaveSplit.negativePL > 0 && (
              <div className="flex justify-between">
                <span className="text-red-700">Negative PL:</span>
                <span className="font-bold text-red-900">{leaveSplit.negativePL} days</span>
              </div>
            )}
            {leaveSplit.lopDays > 0 && (
              <div className="flex justify-between">
                <span className="text-orange-700">Loss of Pay (LOP):</span>
                <span className="font-bold text-orange-900">{leaveSplit.lopDays} days</span>
              </div>
            )}
            
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting}
        className={`w-full text-white font-medium py-3 rounded-lg transition duration-200 ${submitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-[#262760] hover:bg-[#1e2050]'}`}
      >
        {submitting ? (editingLeaveId ? 'Updating...' : 'Submitting...') : (editingLeaveId ? 'Update Leave Application' : 'Submit Leave Application')}
      </button>

    </form>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="w-full mx-auto px-0">
        {/* Header */}
        {/* <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Employee Leave Application</h1>

        </div> */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Leave request form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#262760]" />
                Submit Leave Request
              </h2>


              {leaveFormContent}
            </div>

            {/* Leave History */}
            <div className="mt-6 bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Leave History</h2>
                
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#262760]">
                    <tr>
                      <th className="py-3 px-6 text-left text-xs font-medium text-white uppercase tracking-wider">Leave Type</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-white uppercase tracking-wider">Dates</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-white uppercase tracking-wider">Days</th>
                      <th className="py-3 px-6 text-left text-xs font-medium text-white uppercase tracking-wider">Actions</th>

                      <th className="py-3 px-6 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {leaveHistory.map(leave => (
                      <tr key={leave.id} className="hover:bg-gray-50 transition">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded ${getStatusBadge(leave.status)}`}>
                              {getLeaveTypeIcon(leave.leaveType)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{leave.leaveTypeName}</div>
                              <div className="text-sm text-gray-500">{leave.dayType}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-gray-900">
                            {new Date(leave.startDate).toLocaleDateString('en-GB')}
                          </div>
                          <div className="text-sm text-gray-500">
                            to {new Date(leave.endDate).toLocaleDateString('en-GB')}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-[#262760]">
                            {leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}
                          </span>

                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => handleView(leave)}
                              className="text-[#262760] hover:text-[#1e2050]"
                              title="View"
                            >
                              <Eye className="w-5 h-5" />
                            </button>

                            <button
                              onClick={() => handleEdit(leave)}
                              disabled={leave.status !== 'Pending'}
                              className={`hover:text-green-700 ${leave.status === 'Pending' ? 'text-green-600' : 'text-gray-300 cursor-not-allowed'}`}
                              title="Edit"
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(leave)}
                              disabled={leave.status !== 'Pending'}
                              className={`hover:text-red-700 ${leave.status === 'Pending' ? 'text-red-600' : 'text-gray-300 cursor-not-allowed'}`}
                              title="Delete"
                            >
                              <Trash className="w-5 h-5" />
                            </button>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex items-center">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(leave.status)}`}>
                              {getStatusIcon(leave.status)}
                              {leave.status}
                            </span>
                            {leave.documentUrl && (
                              <div className="mt-2">
                                <button
                                  type="button"
                                  onClick={() => handleViewCertificate(leave)}
                                  className="text-xs text-[#262760] font-semibold underline flex items-center gap-1"
                                >
                                  <span>📄</span> View Certificate
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {leaveHistory.length === 0 && (
                      <tr>
                        <td colSpan="5" className="py-12 text-center">
                          <div className="text-gray-500">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="text-lg">No leave history found</p>
                            <p className="text-sm mt-1">Submit your first leave application</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {viewLeave && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                    <div className="p-6 border-b">
                      <h3 className="text-lg font-semibold text-gray-800">Leave Application</h3>
                    </div>
                    <div className="p-6 space-y-2 text-sm">
                      <div><span className="font-medium text-gray-700">Type:</span> {viewLeave.leaveTypeName}</div>
                      <div><span className="font-medium text-gray-700">Dates:</span> {new Date(viewLeave.startDate).toLocaleDateString('en-GB')} to {new Date(viewLeave.endDate).toLocaleDateString('en-GB')}</div>
                      <div><span className="font-medium text-gray-700">Day Type:</span> {viewLeave.dayType}</div>
                      <div><span className="font-medium text-gray-700">Days:</span> {viewLeave.totalDays}</div>
                      <div><span className="font-medium text-gray-700">Status:</span> {viewLeave.status}</div>
                      {viewLeave.leaveType === 'BEREAVEMENT' && (
                        <div><span className="font-medium text-gray-700">Relation:</span> {viewLeave.bereavementRelation || '—'}</div>
                      )}
                      {viewLeave.leaveType === 'REGIONAL_HOLIDAY' && (
                        <div><span className="font-medium text-gray-700">Holiday:</span> {viewLeave.regionalHolidayName || '—'}</div>
                      )}
                      
                      {(viewLeave.clUsed > 0 || viewLeave.slUsed > 0 || viewLeave.plUsed > 0 || viewLeave.negativePL > 0 || viewLeave.lopDays > 0) && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="font-medium text-gray-800 mb-2">Deduction Breakdown:</div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {viewLeave.clUsed > 0 && <div>CL: {viewLeave.clUsed} days</div>}
                            {viewLeave.slUsed > 0 && <div>SL: {viewLeave.slUsed} days</div>}
                            {viewLeave.plUsed > 0 && <div>PL: {viewLeave.plUsed} days</div>}
                            {viewLeave.negativePL > 0 && <div className="text-red-600 font-medium">Negative PL: {viewLeave.negativePL} days</div>}
                            {viewLeave.lopDays > 0 && <div className="text-orange-600 font-medium">LOP: {viewLeave.lopDays} days</div>}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-4 border-t flex justify-end">
                      <button
                        onClick={() => setViewLeave(null)}
                        className="px-4 py-2 border rounded hover:bg-gray-50"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right column - Leave Summary */}
          <div className="lg:col-span-1">
            {/* Leave Balance Summary */}
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Leave Summary</h2>

              {/* Leave Balance Cards */}
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-900">Casual Leave (CL)</h3>
                    <Home className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-green-600">{getAvailableBalance('CL')} days</div>
                  <div className="text-l text-gray-500 mt-2">Used: {usedLeaves.CL} days</div>
                </div>

                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-900">Sick Leave (SL)</h3>
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="text-3xl font-bold text-red-600">{getAvailableBalance('SL')} days</div>
                  <div className="text-l text-gray-500 mt-2">Used: {usedLeaves.SL} days</div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-[#262760]">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-900">Privilege Leave (PL)</h3>
                    <Calendar className="w-5 h-5 text-[#262760]" />
                  </div>
                  <div className="text-3xl font-bold text-[#262760]">{getAvailableBalance('PL')} days</div>
                  <div className="text-l text-gray-500 mt-2">Used: {usedLeaves.PL} days</div>
                </div>


                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-900">Bereavement Leave</h3>
                    <Heart className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-3xl font-bold text-purple-600">{getAvailableBalance('BEREAVEMENT')} days</div>
                  <div className="text-sm text-gray-600 mt-1">Paid leave for immediate family</div>
                  <div className="text-l text-gray-500 mt-2">Used: {usedLeaves.BEREAVEMENT} days</div>
                </div>
              </div>
            </div>


          </div>
        </div>
      </div>
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseModal}
        title="Edit Leave Application"
      >
        {leaveFormContent}
      </Modal>

      <Modal
        isOpen={warningModal.isOpen}
        onClose={() => setWarningModal({ isOpen: false, message: '' })}
        title="Balance Check"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700 font-medium">
            {warningModal.message}
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setWarningModal({ isOpen: false, message: '' })}
              className="px-4 py-2 text-white bg-[#262760] hover:bg-[#1e2050] rounded-lg transition"
            >
              OK
            </button>

          </div>
        </div>
      </Modal>

      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, leaveId: null })}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this leave application? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteModal({ isOpen: false, leaveId: null })}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
      
      <Modal
        isOpen={submitModal.isOpen}
        onClose={() => setSubmitModal({ isOpen: false, leave: null })}
        title="Leave Submitted"
        size="sm"
      >
        <div className="space-y-4">
          <div className="text-gray-700">
            <div className="font-semibold text-gray-900 mb-1">Your leave request has been submitted.</div>
            <div className="text-sm">
              <div>Type: {submitModal.leave?.leaveTypeName || submitModal.leave?.leaveType}</div>
              <div>Period: {new Date(submitModal.leave?.startDate).toLocaleDateString()} to {new Date(submitModal.leave?.endDate).toLocaleDateString()}</div>
              <div>Total Days: {submitModal.leave?.totalDays}</div>
              <div>Status: {submitModal.leave?.status}</div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setSubmitModal({ isOpen: false, leave: null })}
              className="px-4 py-2 text-white bg-[#262760] hover:bg-[#1e2050] rounded-lg transition"
            >
              OK
            </button>

          </div>
        </div>
      </Modal>

      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={closeNotification}
      />
    </div>
  );
};

export default LeaveApplications;
