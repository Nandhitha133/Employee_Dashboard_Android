import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Calendar, RefreshCw, Users, MapPin } from 'lucide-react';
import { employeeAPI, attendanceAPI, officeHolidayAPI } from '../../services/api';

const getPreviousFinancialYearLabel = () => {
  const now = new Date();
  const currentStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const prevStartYear = currentStartYear - 1;
  const prevEndYear = String(prevStartYear + 1).slice(2);
  return `${prevStartYear}-${prevEndYear}`;
};

const getCurrentFinancialYearLabel = () => {
  const now = new Date();
  // Appraisals for FY 2025-26 are typically submitted in April 2026.
  // We consider the financial year to switch for appraisal purposes in May.
  const currentStartYear = now.getMonth() >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  const currentEndYear = String(currentStartYear + 1).slice(2);
  return `${currentStartYear}-${currentEndYear}`;
};

const FINANCIAL_YEARS = [getPreviousFinancialYearLabel(), getCurrentFinancialYearLabel()];

const getFinancialYearRange = (financialYear) => {
  const parts = String(financialYear || '').split('-');
  const startYear = parseInt(parts[0], 10) || new Date().getFullYear();
  const start = new Date(startYear, 3, 1);
  const end = new Date(startYear + 1, 2, 31, 23, 59, 59, 999);
  return { start, end };
};

const parseDateOnly = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const raw = String(value || '').trim();
  if (!raw) return null;

  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]);
    const d = Number(ymd[3]);
    const dt = new Date(y, m - 1, d);
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  }

  const dmy = raw.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
  if (dmy) {
    const d = Number(dmy[1]);
    const m = Number(dmy[2]);
    const y = Number(dmy[3]);
    const dt = new Date(y, m - 1, d);
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  }

  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return null;
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
};

const formatDateDDMMYYYY = (dateValue) => {
  const d = parseDateOnly(dateValue);
  if (!d) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const getWorkingDaysBetween = (start, end) => {
  let count = 0;
  const current = new Date(start.getTime());
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

const getTotalDaysBetween = (start, end) => {
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
};

const FINANCIAL_YEAR_STORAGE_KEY = 'attendanceSummary.financialYear';

const AttendanceSummary = () => {
  const [financialYear, setFinancialYear] = useState(() => {
    if (typeof window === 'undefined') return getPreviousFinancialYearLabel();
    return window.localStorage.getItem(FINANCIAL_YEAR_STORAGE_KEY) || getPreviousFinancialYearLabel();
  });

  const [employees, setEmployees] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [officeHolidays, setOfficeHolidays] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    division: 'all',
    designation: 'all',
    location: 'all',
  });

  const [refreshToken, setRefreshToken] = useState(0);
  const [rowOverrides, setRowOverrides] = useState({});
  const [savingMap, setSavingMap] = useState({});
  const [editMap, setEditMap] = useState({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(FINANCIAL_YEAR_STORAGE_KEY, financialYear);
  }, [financialYear]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { start, end } = getFinancialYearRange(financialYear);
        const startDate = start.toISOString().slice(0, 10);
        const endDate = end.toISOString().slice(0, 10);

        const summaryParams =
          financialYear === '2025-26'
            ? { financialYear }
            : { startDate, endDate, financialYear };

        const [empRes, summaryRes, officeHolidayRes] = await Promise.all([
          employeeAPI.getAllEmployees(),
          attendanceAPI.getSummary(summaryParams),
          officeHolidayAPI.list(),
        ]);

        const empData = Array.isArray(empRes.data) ? empRes.data : [];
        const summaryData = Array.isArray(summaryRes.data?.summary)
          ? summaryRes.data.summary
          : [];
        const officeHolidayData = Array.isArray(officeHolidayRes.data) ? officeHolidayRes.data : [];
        const mappedOfficeHolidays = officeHolidayData
          .map((h) => ({
            id: String(h?.id || h?._id || ''),
            name: String(h?.name || '').trim(),
            dateISO: String(h?.dateISO || h?.date || '').trim(),
          }))
          .filter((h) => h.dateISO);

        setEmployees(empData);
        setAttendanceSummary(summaryData);
        setOfficeHolidays(mappedOfficeHolidays);
      } catch (error) {
        setEmployees([]);
        setAttendanceSummary([]);
        setOfficeHolidays([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [financialYear, refreshToken]);

  const divisionOptions = useMemo(() => {
    const set = new Set();
    employees.forEach((e) => {
      if (e.division) set.add(e.division);
    });
    return Array.from(set).sort();
  }, [employees]);

  const locationOptions = useMemo(() => {
    const set = new Set();
    employees.forEach((e) => {
      if (e.location || e.branch) set.add(e.location || e.branch);
    });
    return Array.from(set).sort();
  }, [employees]);

  const designationOptions = useMemo(() => {
    const set = new Set();
    employees.forEach((e) => {
      const des = (e.designation || e.role || '').trim();
      if (des) set.add(des);
    });
    return Array.from(set).sort();
  }, [employees]);

  const { workingDaysYear, workingDaysYearStats, officeHolidaysYear, rows } = useMemo(() => {
    const range = getFinancialYearRange(financialYear);
    const today = parseDateOnly(new Date());
    const rangeEnd = parseDateOnly(range.end);
    const calcEnd = today && today < range.start ? null : rangeEnd;

    const formatYMD = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const holidayDateMap = new Map();
    officeHolidays.forEach((h) => {
      const dt = parseDateOnly(h?.dateISO || h?.date || null);
      if (!dt) return;
      const key = formatYMD(dt);
      if (!holidayDateMap.has(key)) holidayDateMap.set(key, dt);
    });
    const holidayDates = Array.from(holidayDateMap.values()).sort((a, b) => a.getTime() - b.getTime());

    const countOfficeHolidaysBetween = (start, end) => {
      if (!start || !end) return 0;
      const startTime = start.getTime();
      const endTime = end.getTime();
      let count = 0;
      holidayDates.forEach((d) => {
        const t = d.getTime();
        if (t < startTime || t > endTime) return;
        const day = d.getDay();
        if (day === 0 || day === 6) return;
        count += 1;
      });
      return count;
    };

    const weekdayWorkingYear = calcEnd ? getWorkingDaysBetween(range.start, calcEnd) : 0;
    const fyOfficeHolidayCount = calcEnd ? countOfficeHolidaysBetween(range.start, calcEnd) : 0;
    const netWorkingYear = Math.max(0, weekdayWorkingYear - fyOfficeHolidayCount);
    const statsWorkingYear = financialYear === '2025-26' ? weekdayWorkingYear : netWorkingYear;

    const attendanceMap = {};
    attendanceSummary.forEach((item) => {
      const rawId = item.employeeId || item.employeeCode || '';
      const key = String(rawId || '').toLowerCase();
      if (!key) return;

      if (financialYear === '2025-26') {
        attendanceMap[key] = {
          yearlyPresent: Number(item.yearlyPresent || 0),
          yearlyAbsent: Number(item.yearlyAbsent || 0),
          regionalHoliday: Number(item.regionalHoliday ?? item.regionalHolidays ?? 0),
          hasManual: true,
        };
        return;
      }

      const present = Number(item.inCount || 0);
      if (!attendanceMap[key]) {
        attendanceMap[key] = { yearlyPresent: 0, hasManual: false };
      }
      attendanceMap[key].yearlyPresent += present;
    });

    const computedRows = employees
      .map((emp) => {
        const rawEmpId = emp.employeeId || emp.empId || emp.id || '';
        const empId = rawEmpId ? String(rawEmpId) : '';
        if (!empId) {
          return null;
        }
        const key = empId.toLowerCase();
        const attInfo = attendanceMap[key] || { yearlyPresent: 0, hasManual: false };

        const dojValue =
          emp.dateOfJoining || emp.dateofjoin || emp.hireDate || emp.createdAt || null;
        const dojDate = parseDateOnly(dojValue);
        const startDate =
          dojDate && dojDate > range.start ? new Date(dojDate.getTime()) : new Date(range.start.getTime());

        let dojWorkingDays = null;
        let spanOfficeHolidays = 0;
        if (dojDate) {
          if (!calcEnd) {
            dojWorkingDays = 0;
          } else if (dojDate > calcEnd) {
            dojWorkingDays = 0;
          } else {
            const rawWorking = getWorkingDaysBetween(startDate, calcEnd);
            spanOfficeHolidays = countOfficeHolidaysBetween(startDate, calcEnd);
            dojWorkingDays = Math.max(0, rawWorking - spanOfficeHolidays);
          }
        }

        const effectiveWorkingDays =
          typeof dojWorkingDays === 'number' ? dojWorkingDays : netWorkingYear;

        const totalDaysSpan =
          calcEnd && startDate <= calcEnd ? getTotalDaysBetween(startDate, calcEnd) : 0;
        if (!spanOfficeHolidays && calcEnd && startDate <= calcEnd) {
          spanOfficeHolidays = countOfficeHolidaysBetween(startDate, calcEnd);
        }

        let basePresent = 0;
        let baseAbsent = 0;
        let baseRegionalHoliday = 0;
        let yearlyPct = 0;

        if (financialYear === '2025-26') {
          if (attInfo.hasManual) {
            const storedRegional = Math.max(0, Number(attInfo.regionalHoliday || 0));
            baseRegionalHoliday = Math.min(effectiveWorkingDays, storedRegional);
            const denomWorkingDays = Math.max(0, effectiveWorkingDays - baseRegionalHoliday);

            const storedAbsent = Math.max(0, Number(attInfo.yearlyAbsent || 0));
            baseAbsent = Math.min(denomWorkingDays, storedAbsent);
            basePresent = Math.max(0, denomWorkingDays - baseAbsent);
            yearlyPct =
              denomWorkingDays > 0
                ? Math.max(0, Math.min(100, (basePresent / denomWorkingDays) * 100))
                : 0;
          } else {
            basePresent = 0;
            baseAbsent = 0;
            baseRegionalHoliday = 0;
            yearlyPct = 0;
          }

          return {
            empId,
            name: emp.name || emp.employeeName || '',
            division: emp.division || '',
            location: emp.location || emp.branch || '',
            dojDisplay: dojDate ? formatDateDDMMYYYY(dojDate) : '-',
            dojWorkingDays,
            totalDaysSpan,
            officeHoliday: spanOfficeHolidays,
            regionalHoliday: baseRegionalHoliday,
            yearlyPresent: basePresent,
            yearlyAbsent: baseAbsent,
            yearlyPct,
            hasManualRecord: !!attInfo.hasManual,
          };
        }

        basePresent = Math.max(0, Math.min(effectiveWorkingDays, attInfo.yearlyPresent));
        baseAbsent = Math.max(0, effectiveWorkingDays - basePresent);
        yearlyPct =
          effectiveWorkingDays > 0
            ? Math.max(0, Math.min(100, (basePresent / effectiveWorkingDays) * 100))
            : 0;

        return {
          empId,
          name: emp.name || emp.employeeName || '',
          division: emp.division || '',
          location: emp.location || emp.branch || '',
          dojDisplay: dojDate ? formatDateDDMMYYYY(dojDate) : '-',
          dojWorkingDays,
          totalDaysSpan,
          officeHoliday: spanOfficeHolidays,
          regionalHoliday: 0,
          yearlyPresent: basePresent,
          yearlyAbsent: baseAbsent,
          yearlyPct,
          hasManualRecord: !!attInfo.hasManual,
        };
      })
      .filter(Boolean);

    return {
      workingDaysYear: netWorkingYear,
      workingDaysYearStats: statsWorkingYear,
      officeHolidaysYear: fyOfficeHolidayCount,
      rows: computedRows,
    };
  }, [employees, attendanceSummary, financialYear, officeHolidays]);

  const filteredRows = useMemo(() => {
    const adjustedRows = rows.map((row) => {
      const override = rowOverrides[row.empId];

      const effectiveWorkingDays =
        typeof row.dojWorkingDays === 'number' ? row.dojWorkingDays : workingDaysYear;

      let present = row.yearlyPresent;
      let absent = row.yearlyAbsent;
      let regionalHoliday = row.regionalHoliday || 0;

      if (financialYear === '2025-26') {
        const hasOverride =
          override &&
          (typeof override.yearlyAbsent === 'number' || typeof override.regionalHoliday === 'number');

        if (!row.hasManualRecord && !hasOverride) {
          return {
            ...row,
            regionalHoliday: 0,
            yearlyPresent: 0,
            yearlyAbsent: 0,
            yearlyPct: 0,
          };
        }

        const rawRegional =
          override && typeof override.regionalHoliday === 'number'
            ? override.regionalHoliday
            : row.hasManualRecord
            ? row.regionalHoliday
            : 0;
        const clampedRegional = Math.max(0, Math.min(effectiveWorkingDays, Number(rawRegional || 0)));
        regionalHoliday = clampedRegional;

        const denomWorkingDays = Math.max(0, effectiveWorkingDays - clampedRegional);

        const rawAbsent =
          override && typeof override.yearlyAbsent === 'number'
            ? override.yearlyAbsent
            : row.hasManualRecord
            ? row.yearlyAbsent
            : 0;
        const clampedAbsent = Math.max(0, Math.min(denomWorkingDays, Number(rawAbsent || 0)));
        absent = clampedAbsent;
        present = denomWorkingDays > 0 ? Math.max(0, denomWorkingDays - clampedAbsent) : 0;

        const pct =
          denomWorkingDays > 0
            ? Math.max(0, Math.min(100, (present / denomWorkingDays) * 100))
            : 0;

        return {
          ...row,
          regionalHoliday,
          yearlyPresent: present,
          yearlyAbsent: absent,
          yearlyPct: pct,
        };
      }

      const pct =
        effectiveWorkingDays > 0
          ? Math.max(0, Math.min(100, (present / effectiveWorkingDays) * 100))
          : 0;

      return {
        ...row,
        yearlyPresent: present,
        yearlyAbsent: absent,
        yearlyPct: pct,
      };
    });

    return adjustedRows
      .filter((row) => {
        const search = filters.search.trim().toLowerCase();
        if (search) {
          const combined = `${row.empId} ${row.name}`.toLowerCase();
          if (!combined.includes(search)) return false;
        }
        if (filters.division !== 'all' && (row.division || '').trim() !== filters.division) {
          return false;
        }
        if (filters.designation !== 'all' && (employees.find(e => String(e.employeeId || e.empId) === String(row.empId))?.designation || '').trim() !== filters.designation) {
          return false;
        }
        if (filters.location !== 'all' && (row.location || '').trim() !== filters.location) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const idA = String(a.empId).toLowerCase();
        const idB = String(b.empId).toLowerCase();
        if (idA < idB) return -1;
        if (idA > idB) return 1;
        return 0;
      });
  }, [rows, filters, rowOverrides, workingDaysYear, financialYear]);

  const handleDaysChange = (empId, field, value) => {
    if (financialYear !== '2025-26') {
      return;
    }
    const numeric = Number(value);
    const row = rows.find((r) => r.empId === empId);
    const effectiveWorkingDays =
      row && typeof row.dojWorkingDays === 'number' ? row.dojWorkingDays : workingDaysYear;
    
    setRowOverrides((prev) => {
      const current = prev[empId] || {};
      const nextOverride = { ...current, [field]: numeric };

      // Determine effective values for capping
      const targetRegional = typeof nextOverride.regionalHoliday === 'number' 
        ? nextOverride.regionalHoliday 
        : (row?.regionalHoliday || 0);
      
      const clampedRegional = Math.max(0, Math.min(effectiveWorkingDays, targetRegional));
      const remainingForAbsent = effectiveWorkingDays - clampedRegional;

      const targetAbsent = typeof nextOverride.yearlyAbsent === 'number'
        ? nextOverride.yearlyAbsent
        : (row?.yearlyAbsent || 0);

      const clampedAbsent = Math.max(0, Math.min(remainingForAbsent, targetAbsent));

      return {
        ...prev,
        [empId]: {
          ...nextOverride,
          regionalHoliday: field === 'regionalHoliday' ? clampedRegional : (current.regionalHoliday ?? row?.regionalHoliday ?? 0),
          yearlyAbsent: field === 'yearlyAbsent' ? clampedAbsent : (current.yearlyAbsent ?? row?.yearlyAbsent ?? 0),
        },
      };
    });
  };

  const handleRefresh = () => {
    setRefreshToken((x) => x + 1);
  };

  const handleEditRow = (empId) => {
    if (financialYear !== '2025-26') return;
    setEditMap((prev) => ({ ...prev, [empId]: true }));
  };

  const handleCancelEdit = (empId) => {
    setEditMap((prev) => ({ ...prev, [empId]: false }));
    setRowOverrides((prev) => {
      const next = { ...prev };
      delete next[empId];
      return next;
    });
  };

  const handleSaveRow = async (row) => {
    if (financialYear !== '2025-26') return;
    const empId = row.empId;
    if (!empId) return;

    setSavingMap((prev) => ({ ...prev, [empId]: true }));
    try {
      await attendanceAPI.saveYearSummary(empId, {
        financialYear,
        yearlyPresent: row.yearlyPresent,
        yearlyAbsent: row.yearlyAbsent,
        officeHoliday: row.officeHoliday,
        regionalHoliday: row.regionalHoliday,
        yearlyPct: row.yearlyPct,
      });
      setRowOverrides((prev) => {
        const next = { ...prev };
        delete next[empId];
        return next;
      });
      setRefreshToken((x) => x + 1);
    } catch (error) {
      console.error('Failed to save year summary', error);
      window.alert('Failed to save year summary');
    } finally {
      setSavingMap((prev) => ({ ...prev, [empId]: false }));
      setEditMap((prev) => ({ ...prev, [empId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8 font-sans p-8">
      <div className="w-full mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div className="flex items-end gap-4">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Employee Name / ID
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Users className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#262760] focus:border-[#262760] text-sm"
                  placeholder="Search by name or ID"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4 justify-end w-full md:w-auto">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-500 mr-2" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-600">Financial Year</span>
                <select
                  value={financialYear}
                  onChange={(e) => setFinancialYear(e.target.value)}
                  className="mt-1 rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] text-sm font-medium text-[#262760] py-1 pl-3 pr-8 cursor-pointer bg-white"
                >
                  {FINANCIAL_YEARS.map((fy) => (
                    <option key={fy} value={fy}>
                      {fy}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="w-full md:w-44">
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center">
                Division
              </label>
              <select
                value={filters.division}
                onChange={(e) => setFilters(prev => ({ ...prev, division: e.target.value }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] text-sm"
              >
                <option value="all">All Divisions</option>
                {divisionOptions.map((division) => (
                  <option key={division} value={division}>
                    {division}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full md:w-44">
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center">
                Designation
              </label>
              <select
                value={filters.designation}
                onChange={(e) => setFilters(prev => ({ ...prev, designation: e.target.value }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] text-sm"
              >
                <option value="all">All Designations</option>
                {designationOptions.map((des) => (
                  <option key={des} value={des}>
                    {des}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full md:w-44">
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center">
                Location
              </label>
              <select
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] text-sm"
              >
                <option value="all">All Locations</option>
                {locationOptions.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl shadow-sm border border-indigo-100 bg-indigo-50 p-4 text-indigo-900">
            <div className="text-[11px] font-semibold uppercase mb-1">
              Working Days ({financialYear})
            </div>
            <div className="text-2xl font-bold">{workingDaysYearStats}</div>
            <div className="text-sm mt-1 text-indigo-800/80">
              {financialYear === '2025-26'
                ? 'Weekdays including office holidays.'
                : 'Weekdays minus office holidays.'}
            </div>
          </div>
          <div className="rounded-xl shadow-sm border border-amber-100 bg-amber-50 p-4 text-amber-900">
            <div className="text-[11px] font-semibold uppercase mb-1">
              Office Holidays ({financialYear})
            </div>
            <div className="text-2xl font-bold">{officeHolidaysYear}</div>
            <div className="text-sm mt-1 text-amber-800/80">
              Saved office holidays (weekdays only).
            </div>
          </div>
          <div className="rounded-xl shadow-sm border border-emerald-100 bg-emerald-50 p-4 text-emerald-900">
            <div className="text-[11px] font-semibold uppercase mb-1">
              Employees
            </div>
            <div className="text-2xl font-bold">{filteredRows.length}</div>
            <div className="text-sm mt-1 text-emerald-800/80">
              Matching current filters.
            </div>
          </div>
        </div>

        <div className="bg-white shadow border-b border-gray-200 sm:rounded-lg overflow-auto max-h-[75vh]">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading attendance summary...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#262760] sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                    S.No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Employee ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Employee Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Date of Joining
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                    DOJ Based Working Days
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                    REgional holidays
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                    Present Days (Year)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                    Absent Days (Year)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">
                    Yearly Attendance %
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-6 py-8 text-center text-sm text-gray-500"
                    >
                      No records found for current filters.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => {
                    const yearlyStatus =
                      row.yearlyPct >= 95
                        ? { label: 'Excellent', className: 'bg-green-100 text-green-800' }
                        : row.yearlyPct >= 80
                        ? { label: 'Good', className: 'bg-blue-100 text-blue-800' }
                        : row.yearlyPct >= 70
                        ? { label: 'Average', className: 'bg-yellow-100 text-yellow-800' }
                        : { label: 'Poor', className: 'bg-red-100 text-red-800' };

                    return (
                      <tr key={row.empId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {row.empId}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {row.name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {row.dojDisplay}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          {typeof row.dojWorkingDays === 'number' ? row.dojWorkingDays : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          <input
                            type="number"
                            min="0"
                            value={(row.hasManualRecord || editMap[row.empId]) ? (row.regionalHoliday || 0) : ''}
                            onChange={(e) =>
                              handleDaysChange(row.empId, 'regionalHoliday', e.target.value)
                            }
                            disabled={financialYear !== '2025-26' || !editMap[row.empId]}
                            className={`w-20 px-2 py-1 border border-gray-300 rounded-md text-sm text-right ${
                              financialYear !== '2025-26' || !editMap[row.empId]
                                ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                                : ''
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          {(row.hasManualRecord || editMap[row.empId] || financialYear !== '2025-26') ? row.yearlyPresent : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          <input
                            type="number"
                            min="0"
                            value={(row.hasManualRecord || editMap[row.empId]) ? (row.yearlyAbsent || 0) : ''}
                            onChange={(e) =>
                              handleDaysChange(row.empId, 'yearlyAbsent', e.target.value)
                            }
                            disabled={financialYear !== '2025-26' || !editMap[row.empId]}
                            className={`w-20 px-2 py-1 border border-gray-300 rounded-md text-sm text-right ${
                              financialYear !== '2025-26' || !editMap[row.empId]
                                ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                                : ''
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          {(row.hasManualRecord || editMap[row.empId] || financialYear !== '2025-26') ? `${row.yearlyPct.toFixed(1)}%` : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                          {(row.hasManualRecord || editMap[row.empId] || financialYear !== '2025-26') ? (
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${yearlyStatus.className}`}
                            >
                              {yearlyStatus.label}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
                          {financialYear === '2025-26' ? (
                            editMap[row.empId] ? (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleSaveRow(row)}
                                  disabled={!!savingMap[row.empId]}
                                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-white bg-[#262760] hover:bg-[#1e2050] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {savingMap[row.empId] ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={() => handleCancelEdit(row.empId)}
                                  disabled={!!savingMap[row.empId]}
                                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEditRow(row.empId)}
                                className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-[#262760] border border-[#262760] hover:bg-[#262760] hover:text-white"
                              >
                                Edit
                              </button>
                            )
                          ) : (
                            <span className="text-xs text-gray-400">Auto</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceSummary;

