import React, { useState, useEffect, useCallback } from "react";
import { timesheetAPI, allocationAPI, employeeAPI, officeHolidayAPI, specialPermissionAPI } from "../../services/api";
import { ChevronLeft, ChevronRight, Calendar, Plus, Trash2, Save, Send, ChevronUp, ChevronDown } from "lucide-react";

const Timesheet = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [timesheetRows, setTimesheetRows] = useState([]);
  const [officeHolidayByISO, setOfficeHolidayByISO] = useState({});
  const [totals, setTotals] = useState({
    daily: [0, 0, 0, 0, 0, 0, 0],
    weekly: 0,
  });
  const [onPremisesTime, setOnPremisesTime] = useState({
    daily: [0, 0, 0, 0, 0, 0, 0],
    weekly: 0,
    prevSunday: 0,
  });
  const [loading, setLoading] = useState(false);
  const [permissionCounts, setPermissionCounts] = useState({});
  const [monthlyPermissionCount, setMonthlyPermissionCount] = useState(0);
  const [monthlyBasePermissionCount, setMonthlyBasePermissionCount] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLeaveAutoDraft, setIsLeaveAutoDraft] = useState(false);
  const [projects, setProjects] = useState([]);
  const [showNavigationDialog, setShowNavigationDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [shiftType, setShiftType] = useState("");
  const [dailyShiftTypes, setDailyShiftTypes] = useState(["", "", "", "", "", "", ""]);
  const [cellInputs, setCellInputs] = useState({});
  const [rejectionReason, setRejectionReason] = useState("");
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorTitle, setErrorTitle] = useState("Validation Error");
  const [showSpecialModal, setShowSpecialModal] = useState(false);
  const [spDate, setSpDate] = useState(null);
  const [spReason, setSpReason] = useState("");
  const [spFile, setSpFile] = useState(null);
  const [spCalculation, setSpCalculation] = useState({ required: 0, onPremises: 0, balance: 0, shift: "", allowed: true, message: "" });
  const [mySpecials, setMySpecials] = useState([]);
  
  // Debug log to verify state initialization
  useEffect(() => {
    console.log("Timesheet component mounted. mySpecials state:", mySpecials);
  }, [mySpecials]);

  const showError = (message, title = "Validation Error") => {
    setErrorMessage(message);
    setErrorTitle(title);
    setShowErrorDialog(true);
  };

  const toISODateOnly = (d) => {
    if (!d) return "";
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    return utc.toISOString().slice(0, 10);
  };

  const isOfficeHoliday = (date) => {
    const iso = toISODateOnly(date);
    return Boolean(iso && officeHolidayByISO && officeHolidayByISO[iso]);
  };

  const getOfficeHolidayName = (date) => {
    const iso = toISODateOnly(date);
    return (iso && officeHolidayByISO && officeHolidayByISO[iso]) ? String(officeHolidayByISO[iso]) : "";
  };

  const shiftTypes = [
    "First Shift",
    "Second Shift",
    "General Shift"
  ];

  const tasks = [
    "Development",
    "Testing",
    "Implementation",
    "Maintenance Support",
    "Modeling",
    "Editing",
    "Backdrafting",
    "Checking",
    "Estimation Work",
    "Documentation",
    "Other's",
    "Non Product(Training)",
    "Project Discussion",
    "Idle",
    "Meeting",
    "RFI’s",
    "Study",
    "On Duty",
    "Project Management",
    "Hiring",
    "Office Administration",
    "HR Activities",
    "Accounts",
    "Break Time",
    "Training"

  ];

  
  const leaveTypes = [
    "Permission"
  ];

  // ✅ Count leave rows
  const getLeaveRowCount = () => {
    return timesheetRows.filter(row => row.type === "leave").length;
  };

  // ✅ Check if add leave button should be disabled
  const isAddLeaveDisabled = () => {
    const hasPermission = timesheetRows.some(row => row.task === "Permission" && row.type !== "special");
    // Allow up to 4 leave rows, but only 1 Permission row
    return getLeaveRowCount() >= 4 || isSubmitted || isLeaveAutoDraft || hasPermission;
  };

  // ✅ Load existing week data from backend AND attendance data
  useEffect(() => {
    const loadWeekData = async () => {
      try {
        setLoading(true);
        const wd = getWeekDates();
        const normalizeToUTCDateOnly = (d) => {
          const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
          return utc.toISOString();
        };

        const weekStartStr = normalizeToUTCDateOnly(wd[0]);
        const weekEndStr = normalizeToUTCDateOnly(wd[6]);

        // Calculate previous Sunday for attendance fetch (needed for >12h rule)
        const prevSunday = new Date(wd[0]);
        prevSunday.setDate(prevSunday.getDate() - 1);
        const attendanceStartStr = normalizeToUTCDateOnly(prevSunday);

        // Run all requests in parallel to avoid race conditions
        const [timesheetRes, attendanceRes, specialRes, officeHolidayRes] = await Promise.allSettled([
          timesheetAPI.getTimesheet({
            weekStart: weekStartStr,
            weekEnd: weekEndStr,
            _t: Date.now() // Prevent caching
          }),
          timesheetAPI.getAttendanceData({
            startDate: attendanceStartStr, // Fetch from prev Sunday
            endDate: weekEndStr,
            _t: Date.now()
          }),
          specialPermissionAPI.my({
             weekStart: weekStartStr,
             weekEnd: weekEndStr,
             _t: Date.now()
          }),
          officeHolidayAPI.list()
        ]);

        if (specialRes.status === "fulfilled" && specialRes.value) {
            setMySpecials(Array.isArray(specialRes.value.data?.data) ? specialRes.value.data.data : []);
        } else {
            setMySpecials([]);
        }

        let officeMap = {};
        if (officeHolidayRes.status === "fulfilled" && officeHolidayRes.value) {
          const items = Array.isArray(officeHolidayRes.value.data) ? officeHolidayRes.value.data : [];
          officeMap = items.reduce((acc, h) => {
            const iso = String(h?.dateISO || "").trim();
            const name = String(h?.name || "").trim();
            if (iso && name) acc[iso] = name;
            return acc;
          }, {});
          setOfficeHolidayByISO(officeMap);
        } else {
          setOfficeHolidayByISO({});
        }

        // --- Process Timesheet Data ---
        let sheet = {};
        let rows = [];
        let loadedShiftType = "";
        let loadedDailyShiftTypes = ["", "", "", "", "", "", ""];

        if (timesheetRes.status === "fulfilled" && timesheetRes.value) {
          const res = timesheetRes.value;
          sheet = (res?.data && res.data.data) ? res.data.data : res.data;

          rows = (sheet.entries || []).map((e) => ({
            id: Date.now() + Math.random(),
            project: e.project || "",
            projectCode: e.projectCode || "",
            task: e.task || "",
            hours: Array.isArray(e.hours) ? e.hours : [0, 0, 0, 0, 0, 0, 0],
            type: e.type || (e.project === "Leave" ? "leave" : "project"),
            shiftType: e.shiftType || "",
            locked: e.locked || false,
            lockedDays: e.lockedDays || [false, false, false, false, false, false, false],
          }));

          loadedShiftType = sheet.shiftType || "";
          if (Array.isArray(sheet.dailyShiftTypes) && sheet.dailyShiftTypes.length === 7) {
            loadedDailyShiftTypes = sheet.dailyShiftTypes;
          } else {
            loadedDailyShiftTypes = [
              loadedShiftType ? loadedShiftType : "",
              loadedShiftType ? loadedShiftType : "",
              loadedShiftType ? loadedShiftType : "",
              loadedShiftType ? loadedShiftType : "",
              loadedShiftType ? loadedShiftType : "",
              loadedShiftType ? loadedShiftType : "",
              loadedShiftType ? loadedShiftType : "",
            ];
          }

          setShiftType(loadedShiftType);
          setDailyShiftTypes(loadedDailyShiftTypes);
          setRejectionReason(sheet.rejectionReason || "");

          setIsSubmitted(
            (sheet.status || "").toLowerCase() === "submitted" ||
            (sheet.status || "").toLowerCase() === "approved"
          );
          const hasApprovedLeaveEntry = rows.some(r => (r.project || "") === "Leave" && (r.task || "").startsWith("Leave Approved"));
          // Disable auto-draft lock so users can edit timesheet even with approved leave
          setIsLeaveAutoDraft(false);
        }

        // --- Process Attendance Data ---
        let attendanceOnPremises = null;
        if (attendanceRes.status === "fulfilled" && attendanceRes.value) {
          const attRes = attendanceRes.value;
          const attendanceData = Array.isArray(attRes.data?.records) ? attRes.data.records : [];

          if (attendanceData.length > 0) {
            const weekKeys = wd.map((d) => {
              const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
              return utc.toISOString().split("T")[0];
            });

            const dailyOnPremises = [0, 0, 0, 0, 0, 0, 0];
            let weeklyOnPremises = 0;
            let prevSundayHours = 0;

            // Normalize prevSunday to YYYY-MM-DD for comparison
            const prevSundayKey = new Date(Date.UTC(prevSunday.getFullYear(), prevSunday.getMonth(), prevSunday.getDate())).toISOString().split("T")[0];

            attendanceData.forEach((record) => {
              try {
                const key = new Date(record.date).toISOString().split("T")[0];
                
                // Check for prev Sunday
                if (key === prevSundayKey) {
                   prevSundayHours += computeRecordDurationHours(record) || 0;
                }

                const idx = weekKeys.indexOf(key);
                if (idx !== -1) {
                  const hours = computeRecordDurationHours(record) || 0;
                  if (hours > 0) {
                    dailyOnPremises[idx] += hours;
                    weeklyOnPremises += hours;
                  }
                }
              } catch (_) { }
            });

            const preciseDaily = dailyOnPremises.map((h) => Math.max(0, Number(h) || 0));
            const preciseWeekly = preciseDaily.reduce((sum, h) => sum + h, 0);
            const precisePrevSunday = Math.max(0, Number(prevSundayHours) || 0);

            const hasAnyHours = preciseDaily.some((h) => h > 0) || preciseWeekly > 0 || precisePrevSunday > 0;

            if (hasAnyHours) {
              attendanceOnPremises = {
                daily: preciseDaily,
                weekly: preciseWeekly,
                prevSunday: precisePrevSunday
              };
            }
          }
        }

        // --- Determine Final On-Premises Time ---
        // Priority: 1. Fresh Attendance Data, 2. Saved Timesheet Data, 3. Default Zeros
        if (attendanceOnPremises) {
          setOnPremisesTime(attendanceOnPremises);
        } else if (Array.isArray(sheet.onPremisesTime?.daily)) {
          setOnPremisesTime({
            daily: (sheet.onPremisesTime.daily || []).map((n) => Number(n) || 0),
            weekly: Number(sheet.onPremisesTime.weekly) || 0,
            prevSunday: Number(sheet.onPremisesTime?.prevSunday) || 0
          });
        } else {
          setOnPremisesTime({
            daily: [0, 0, 0, 0, 0, 0, 0],
            weekly: 0,
            prevSunday: 0
          });
        }

        // --- Prepare Special Permission Rows ---
        const specialRows = [];
        if (specialRes.status === "fulfilled" && specialRes.value) {
            const specials = Array.isArray(specialRes.value.data?.data) ? specialRes.value.data.data : [];
            const approvedSpecials = specials.filter(s => s.status === 'APPROVED');
            
            // Filter to keep only the latest approved permission per day
            const uniqueApprovedSpecials = approvedSpecials.filter((sp, index, self) => 
                index === self.findIndex((t) => (
                    new Date(t.date).toDateString() === new Date(sp.date).toDateString()
                ))
            );
            
            uniqueApprovedSpecials.forEach(sp => {
                const spDate = new Date(sp.date);
                const spDateStr = spDate.toDateString();
                const dayIndex = wd.findIndex(d => d.toDateString() === spDateStr);
                
                if (dayIndex !== -1) {
                    const taskName = (sp.fromTime && sp.toTime) 
                      ? `Permission (${sp.fromTime} - ${sp.toTime})` 
                      : 'Permission';
                    
                    const hours = [0, 0, 0, 0, 0, 0, 0];
                    hours[dayIndex] = Number(sp.totalHours) || 0;

                    specialRows.push({
                        id: `sp-${sp._id || Date.now()}-${dayIndex}`,
                        project: 'Special Permission',
                        projectCode: 'SP',
                        task: taskName,
                        type: 'special',
                        shiftType: '',
                        hours: hours,
                        locked: true,
                        lockedDays: [false, false, false, false, false, false, false].map((_, i) => i === dayIndex)
                    });
                }
            });
        }

        // --- Set Timesheet Rows ---
        if (rows.length === 0) {
          const weekDates = getWeekDates(currentWeek);
          const holidayHours = weekDates.map((date) => (officeMap[toISODateOnly(date)] ? 9.5 : 0));
          const hasHoliday = holidayHours.some(h => h > 0);

          const initialRows = [];

          if (hasHoliday) {
            initialRows.push({
              id: Date.now() + Math.random(),
              project: "Office Holiday",
              task: "Office Holiday",
              hours: holidayHours,
              type: "project",
              shiftType: "",
              locked: true // Lock this row to prevent editing
            });
          }

          initialRows.push({
            id: Date.now() + Math.random() + 1,
            project: "",
            task: "",
            hours: [0, 0, 0, 0, 0, 0, 0],
            type: "project",
            shiftType: ""
          });

          // Append special permissions
          initialRows.push(...specialRows);

          setTimesheetRows(initialRows);
          setOriginalData(JSON.stringify(initialRows));
          setHasUnsavedChanges(false);
        } else {
          // Check if we need to add holiday row for existing timesheet
          const weekDates = getWeekDates(currentWeek);
          const holidayHours = weekDates.map((date) => (officeMap[toISODateOnly(date)] ? 9.5 : 0));
          const hasHoliday = holidayHours.some(h => h > 0);
          const hasHolidayRow = rows.some(r => r.project === "Office Holiday" || r.task === "Office Holiday");

          if (hasHoliday && !hasHolidayRow) {
            rows.unshift({
              id: Date.now() + Math.random(),
              project: "Office Holiday",
              task: "Office Holiday",
              hours: holidayHours,
              type: "project",
              shiftType: "",
              locked: true
            });
          }

          // Filter out old special permissions and add new ones
          rows = rows.filter(r => r.type !== 'special' && r.project !== 'Special Permission');
          rows.push(...specialRows);

          setTimesheetRows(rows);
          setOriginalData(JSON.stringify(rows));
          setHasUnsavedChanges(false);
        }

      } catch (err) {
        console.error("❌ Error loading week data:", err);
        // Don't load draft from session automatically - start fresh
        if (timesheetRows.length === 0) addProjectRow();
      } finally {
        updateMonthlyPermissionCount();
        setLoading(false);
      }
    };
    loadWeekData();
  }, [currentWeek]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const weekStart = params.get('weekStart');
      if (weekStart) {
        const d = new Date(weekStart);
        if (!isNaN(d.getTime())) setCurrentWeek(d);
      }
    } catch (_) { }
  }, []);

  const parseDurationHours = (input) => {
    if (input === null || input === undefined) return 0;
    if (typeof input === "number") {
      if (input > 100000) return input / 3600000;
      if (input > 1000) return input / 3600;
      if (input > 24) return input / 60;
      return input;
    }
    if (typeof input === "string") {
      const parts = input.split(":").map((n) => parseFloat(n) || 0);
      if (parts.length >= 2) {
        const h = parts[0];
        const m = parts[1];
        const s = parts[2] || 0;
        return h + m / 60 + s / 3600;
      }
      const num = parseFloat(input);
      if (!isNaN(num)) return num;
    }
    return 0;
  };

  const formatHoursHHMM = (hours) => {
    const totalMinutes = Math.round((Number(hours) || 0) * 60);
    const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const mm = String(totalMinutes % 60).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const parseHHMMToHours = (str) => {
    if (typeof str !== "string") return Number(str) || 0;
    const s = str.trim();
    if (!s) return 0;
    if (s.includes(":")) {
      const parts = s.split(":");
      let h = Math.max(0, parseInt(parts[0], 10) || 0);
      let mRaw = parseInt(parts[1], 10);
      let m = Math.max(0, isNaN(mRaw) ? 0 : mRaw);
      if (m >= 60) {
        h += Math.floor(m / 60);
        m = m % 60;
      }
      const step = 5;
      m = Math.round(m / step) * step;
      if (m === 60) {
        h += 1;
        m = 0;
      }
      return h + m / 60;
    }
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
  };

  const normalizeHHMMInput = (val) => {
    if (typeof val !== "string") return "";

    // If it has a colon, try to respect it
    if (val.includes(':')) {
      const parts = val.split(':');
      let h = parseInt(parts[0] || '0', 10);
      let m = parseInt(parts[1] || '0', 10);

      if (isNaN(h)) h = 0;
      if (isNaN(m)) m = 0;

      // Cap minutes at 59
      if (m > 59) m = 59;

      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      return `${hh}:${mm}`;
    }

    const digits = val.replace(/\D/g, "");
    if (!digits) return "";

    // If 3 digits, assume HMM (e.g. 930 -> 09:30)
    if (digits.length === 3) {
      const h = digits.slice(0, 1);
      const m = digits.slice(1, 3);
      let mVal = parseInt(m, 10);
      if (mVal > 59) mVal = 59;
      return `0${h}:${String(mVal).padStart(2, '0')}`;
    }

    const h = digits.slice(0, 2);
    const mRaw = digits.slice(2, 4);
    if (mRaw.length === 0) return h;
    let m = parseInt(mRaw, 10);
    if (isNaN(m)) m = 0;
    if (m > 59) m = 59;
    const mm = String(m).padStart(2, "0");
    return `${h}:${mm}`;
  };

  const calculateSpecialPermission = (dateStr) => {
    if (!dateStr) {
      setSpCalculation({ required: 0, onPremises: 0, balance: 0, shift: "", allowed: true, message: "" });
      return;
    }
    
    // Find index in current week
    // Ensure we match local date parts
    const d = new Date(dateStr);
    // If dateStr is YYYY-MM-DD, new Date() might treat as UTC.
    // We want to match with weekDates which are local.
    // Let's rely on date string comparison or careful extraction
    
    // dateStr comes from input type="date" value or ISO split, which is YYYY-MM-DD
    // If we use new Date("2026-02-23"), it is UTC 00:00.
    // If we use d.getDate(), it converts to local.
    // So if local is +5:30, it is 5:30 AM. Date is 23. Correct.
    // If local is -5:00, it is Feb 22 19:00. Date is 22. WRONG.
    
    // To be safe, parse YYYY-MM-DD manually
    const [y, m, day] = dateStr.split('-').map(Number);
    // Create local date for comparison
    const targetDate = new Date(y, m - 1, day);

    const dayIndex = weekDates.findIndex(wd => 
      wd.getDate() === targetDate.getDate() && 
      wd.getMonth() === targetDate.getMonth() && 
      wd.getFullYear() === targetDate.getFullYear()
    );

    if (dayIndex === -1) {
      setSpCalculation({ required: 0, onPremises: 0, balance: 0, shift: "", allowed: true, message: "" });
      return;
    }

    const shift = dailyShiftTypes?.[dayIndex] || shiftType || "";
    const onPremises = Number(onPremisesTime?.daily?.[dayIndex] || 0);
    const required = getSpecialPermissionRequiredHours(shift);
    
    let balance = 0;
    let allowed = true;
    let message = "";

    if (required > 0) {
      if (onPremises >= required) {
        allowed = false;
        message = "Minimum shift hours already completed. No special permission required.";
        balance = 0;
      } else {
        // Convert to minutes for precise calculation
        const reqMins = Math.round(required * 60);
        const opMins = Math.round(onPremises * 60);
        const balMins = Math.max(0, reqMins - opMins);
        balance = balMins / 60;
      }
    } else {
      // If no shift or unknown shift, maybe allow? or logic undefined.
      // Assuming allow if no shift defined, or maybe not. 
      // User prompt implies logic depends on shift.
      // If no shift, required is 0. If onPremises >= 0, allowed = false?
      // Let's assume if shift is missing, we can't calculate shortage, so maybe open?
      // But user says "System detects Employee shift type".
      // If balance is 0, allowed is false.
      if (onPremises > 0) {
          allowed = false;
          message = "No shift detected or 0 required hours.";
      }
    }

    setSpCalculation({
      required,
      onPremises,
      balance,
      shift,
      allowed,
      message
    });

    // Auto-set time if allowed and balance > 0
    if (allowed && balance > 0) {
      // Default fromTime could be end of on-premises? Hard to know when they left.
      // We'll leave fromTime/toTime empty or maybe set duration?
      // The user says "Auto Fill... Balance Hours: 0:40... Allow request only for the balance hours"
      // We can't easily auto-set From/To without knowing WHEN. 
      // But we can validate the duration.
    }
  };

  useEffect(() => {
    if (showSpecialModal && spDate) {
        // Format to YYYY-MM-DD local
        const y = spDate.getFullYear();
        const m = String(spDate.getMonth() + 1).padStart(2, '0');
        const d = String(spDate.getDate()).padStart(2, '0');
        calculateSpecialPermission(`${y}-${m}-${d}`);
    }
  }, [showSpecialModal, spDate, dailyShiftTypes, onPremisesTime]);

  const parseTime = (t) => {
    if (!t) return null;
    try {
      const d = new Date(t);
      if (!isNaN(d.getTime())) return d;
    } catch (_) { }
    return null;
  };

  const sumIntervalsToHours = (intervals) => {
    if (!Array.isArray(intervals)) return 0;
    let totalMs = 0;
    for (const it of intervals) {
      const start = parseTime(it.in || it.start || it.punchIn || it.begin || it.from);
      const end = parseTime(it.out || it.end || it.punchOut || it.finish || it.to);
      if (start && end && end > start) {
        totalMs += end.getTime() - start.getTime();
      }
    }
    return totalMs / 3600000;
  };

  const computeRecordDurationHours = (record) => {
    const candidate = record.workDuration ?? record.workDurationSeconds ?? record.workDurationMs ?? record.workDurationMillis ?? record.duration ?? record.hours;
    const direct = parseDurationHours(candidate);
    if (direct && direct > 0) return direct;
    if (Array.isArray(record.intervals)) return sumIntervalsToHours(record.intervals);
    if (Array.isArray(record.sessions)) return sumIntervalsToHours(record.sessions);
    if (Array.isArray(record.punches)) return sumIntervalsToHours(record.punches);
    if (Array.isArray(record.logs)) return sumIntervalsToHours(record.logs);
    if (record.punchIn && record.punchOut) return sumIntervalsToHours([{ in: record.punchIn, out: record.punchOut }]);
    return 0;
  };



  // Track if data has been modified for navigation warning
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalData, setOriginalData] = useState(null);

  // Set original data when loading from backend
  useEffect(() => {
    if (timesheetRows.length > 0 && !originalData && !isSubmitted) {
      setOriginalData(JSON.stringify(timesheetRows));
    }
  }, [timesheetRows, originalData, isSubmitted]);

  // Check for unsaved changes
  useEffect(() => {
    if (originalData && timesheetRows.length > 0) {
      const currentData = JSON.stringify(timesheetRows);
      setHasUnsavedChanges(currentData !== originalData);
    }
  }, [timesheetRows, originalData]);

  // Update monthly permission count when timesheet rows change
  useEffect(() => {
    updateMonthlyPermissionCount();
  }, [timesheetRows, currentWeek]);

  // Load allocated projects for the logged-in employee
  const loadAllocatedProjects = useCallback(async () => {
    try {
      const [meResult, allocResult] = await Promise.allSettled([
        employeeAPI.getMyProfile(),
        allocationAPI.getAllAllocations()
      ]);
      const me = meResult.status === 'fulfilled' ? meResult.value?.data || {} : {};
      const allocations = allocResult.status === 'fulfilled' && Array.isArray(allocResult.value?.data)
        ? allocResult.value.data
        : [];
      const weekDates = getWeekDates();
      const weekStart = new Date(weekDates[0]);
      const weekEnd = new Date(weekDates[6]);
      weekEnd.setHours(23, 59, 59, 999);
      const inSelectedWeek = (alloc) => {
        try {
          if (!alloc.startDate || !alloc.endDate) return true;
          const parseDate = (dateStr) => {
            if (!dateStr) return null;
            const parts = String(dateStr).split("T")[0].split("-");
            if (parts.length !== 3) return new Date(dateStr);
            return new Date(parts[0], parts[1] - 1, parts[2]);
          };
          const sd = parseDate(alloc.startDate);
          const ed = parseDate(alloc.endDate);
          if (!sd || !ed || isNaN(sd.getTime()) || isNaN(ed.getTime())) return true;
          if (sd > ed) return true;
          const ws = new Date(weekStart);
          ws.setHours(0, 0, 0, 0);
          const we = new Date(weekEnd);
          we.setHours(23, 59, 59, 999);
          return sd <= we && ed >= ws;
        } catch (_) {
          return true;
        }
      };
      const normalizeId = (id) => String(id || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      const userSession = JSON.parse(sessionStorage.getItem("user") || "{}");
      const empId = normalizeId(me.employeeId || userSession.employeeId);
      const empMongoId = String(me._id || "").trim();
      const empName = String(me.name || userSession.name || "").trim().toLowerCase();
      const mineByMatch = allocations.filter(a => {
        const code = normalizeId(a.employeeCode);
        const eid = String(a.employeeId || "").trim();
        const ename = String(a.employeeName || "").trim().toLowerCase();
        const matchesEmployee =
          (code && empId && code === empId) ||
          (eid && empMongoId && eid === empMongoId) ||
          (ename && empName && ename === empName);
        const statusVal = String(a.status || "").trim().toLowerCase();
        const statusAllowed = statusVal === "active";
        return matchesEmployee && statusAllowed;
      });
      const mineWeek = mineByMatch.filter(inSelectedWeek);
      const mine = mineWeek.length ? mineWeek : mineByMatch;
      const unique = [];
      const seen = new Set();
      for (const a of mine) {
        const key = `${a.projectName}|${a.projectCode}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push({ name: a.projectName, code: a.projectCode });
        }
      }
      setProjects(unique);
    } catch (error) {
      setProjects([]);
    }
  }, [currentWeek]);

  useEffect(() => {
    loadAllocatedProjects();
  }, [loadAllocatedProjects]);

  useEffect(() => {
    const handler = () => { loadAllocatedProjects(); };
    window.addEventListener('project-allocations-updated', handler);
    return () => {
      window.removeEventListener('project-allocations-updated', handler);
    };
  }, [loadAllocatedProjects]);

  // ✅ Save draft to sessionStorage
  const saveDraftToSession = () => {
    try {
      const weekKey = `timesheet_draft_${getWeekKey()}`;
      const draftData = {
        rows: timesheetRows,
        weekStart: weekDates[0].toISOString(),
        weekEnd: weekDates[6].toISOString(),
        savedAt: new Date().toISOString(),
        shiftType: shiftType,
        dailyShiftTypes: dailyShiftTypes
      };
      sessionStorage.setItem(weekKey, JSON.stringify(draftData));
      console.log("💾 Draft saved to sessionStorage");
      // Update original data after saving
      setOriginalData(JSON.stringify(timesheetRows));
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("❌ Error saving draft to sessionStorage:", error);
    }
  };

  // ✅ Load draft from sessionStorage
  const loadDraftFromSession = () => {
    try {
      const weekKey = `timesheet_draft_${getWeekKey()}`;
      const savedDraft = sessionStorage.getItem(weekKey);

      if (savedDraft) {
        const draftData = JSON.parse(savedDraft);
        setTimesheetRows(draftData.rows || []);
        setShiftType(draftData.shiftType || "General Shift");
        setDailyShiftTypes(
          Array.isArray(draftData.dailyShiftTypes) && draftData.dailyShiftTypes.length === 7
            ? draftData.dailyShiftTypes
            : [
              draftData.shiftType || "General Shift",
              draftData.shiftType || "General Shift",
              draftData.shiftType || "General Shift",
              draftData.shiftType || "General Shift",
              draftData.shiftType || "General Shift",
              draftData.shiftType || "General Shift",
              draftData.shiftType || "General Shift",
            ]
        );
        console.log("📂 Draft loaded from sessionStorage");

        // Show confirmation message
        if (draftData.rows && draftData.rows.length > 0) {
          const savedTime = new Date(draftData.savedAt).toLocaleTimeString();
          showError(`📂 Draft data loaded from your current session (saved at ${savedTime})`, "Info");
        }
      }
    } catch (error) {
      console.error("❌ Error loading draft from sessionStorage:", error);
    }
  };

  // ✅ Get unique key for current week
  const getWeekKey = () => {
    const weekDates = getWeekDates();
    return `${weekDates[0].toISOString().split('T')[0]}_${weekDates[6].toISOString().split('T')[0]}`;
  };

  // ✅ Clear draft from sessionStorage
  const clearDraftFromSession = () => {
    try {
      const weekKey = `timesheet_draft_${getWeekKey()}`;
      sessionStorage.removeItem(weekKey);
      console.log("🗑️ Draft cleared from sessionStorage");
    } catch (error) {
      console.error("❌ Error clearing draft from sessionStorage:", error);
    }
  };

  const updateMonthlyPermissionCount = useCallback(() => {
    const currentMonth = currentWeek.getMonth();
    const currentYear = currentWeek.getFullYear();

    let count = 0;
    const newPermissionCounts = {};

    const getPermissionCountForHours = (h) => {
      const val = Number(h) || 0;
      if (val >= 2) return 2;
      if (val >= 1) return 1;
      return 0;
    };

    const weekDates = getWeekDates();

    timesheetRows.forEach((row) => {
      // Check for any Permission task (generic or dynamic) but EXCLUDE Special Permission rows
      if (row.task && (row.task === "Permission" || row.task.toLowerCase().includes("permission")) && row.type !== 'special' && row.project !== 'Special Permission') {
        row.hours.forEach((hours, dayIndex) => {
          // Use weekDates to determine the exact date of this column
          const date = weekDates[dayIndex];

          if (date && date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
            const dateKey = date.toDateString();
            const c = getPermissionCountForHours(hours);
            if (c > 0) {
              newPermissionCounts[dateKey] = (newPermissionCounts[dateKey] || 0) + c;
              count += c;
            }
          }
        });
      }
    });

    setPermissionCounts(newPermissionCounts);
    setMonthlyPermissionCount(monthlyBasePermissionCount + count);
  }, [currentWeek, timesheetRows, monthlyBasePermissionCount]);

  // Update permission count whenever relevant data changes
  useEffect(() => {
    updateMonthlyPermissionCount();
  }, [updateMonthlyPermissionCount]);

  useEffect(() => {
    const loadMonthlyBasePermissionCount = async () => {
      try {
        const currentMonth = currentWeek.getMonth();
        const currentYear = currentWeek.getFullYear();

        // Normalize current week start date for exclusion
        const weekDates = getWeekDates();
        // Construct ISO string for the first day of the week (Monday)
        const weekStartStr = new Date(Date.UTC(weekDates[0].getFullYear(), weekDates[0].getMonth(), weekDates[0].getDate())).toISOString();

        const res = await timesheetAPI.getPermissionUsage({
          month: currentMonth,
          year: currentYear,
          excludeWeekStart: weekStartStr
        });

        if (res.data && res.data.success) {
          setMonthlyBasePermissionCount(res.data.count);
        } else {
          setMonthlyBasePermissionCount(0);
        }
      } catch (e) {
        console.error("Error loading permission usage:", e);
        setMonthlyBasePermissionCount(0);
      }
    };
    loadMonthlyBasePermissionCount();
  }, [currentWeek]);

  const addProjectRow = () => {
    setTimesheetRows((prev) => {
      // Calculate locked days based on existing approved leaves
      const lockedDays = [false, false, false, false, false, false, false];
      for (let i = 0; i < 7; i++) {
        const totalLeaveHours = prev.reduce((sum, row) => {
          if (row.type === 'leave' && (row.task || '').startsWith('Leave Approved')) {
            return sum + (Number(row.hours[i]) || 0);
          }
          return sum;
        }, 0);
        if (totalLeaveHours >= 8) {
          lockedDays[i] = true;
        }
      }

      const newRow = {
        id: Date.now() + Math.random(),
        project: "",
        task: "",
        hours: [0, 0, 0, 0, 0, 0, 0],
        type: "project",
        shiftType: "",
        lockedDays: lockedDays
      };
      return [...prev, newRow];
    });
  };

  const addLeaveRow = () => {
    if (isAddLeaveDisabled()) {
      showError("Maximum 4 leave rows allowed per timesheet.");
      return;
    }

    const newRow = {
      id: Date.now() + Math.random(),
      project: "Leave",
      task: "Permission",
      hours: [0, 0, 0, 0, 0, 0, 0],
      type: "leave",
      shiftType: ""
    };
    setTimesheetRows((prev) => [...prev, newRow]);
  };

  const deleteRow = (id) => {
    if (timesheetRows.length <= 1) {
      showError("At least one row must remain.");
      return;
    }
    setTimesheetRows((prev) => prev.filter((row) => row.id !== id));
  };

  const updateRow = (id, field, value) => {
    setTimesheetRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const updatedRow = { ...row, [field]: value };

          // Reset hours when task type changes
          if (field === "task") {
            updatedRow.hours = [0, 0, 0, 0, 0, 0, 0];
          }

          // Auto-update project code when project name is selected
          if (field === "project") {
            const p = projects.find((proj) => proj.name === value);
            updatedRow.projectCode = p ? p.code : "";
          }

          return updatedRow;
        }
        return row;
      })
    );
  };

  const updateHours = (id, dayIndex, value) => {
    const row = timesheetRows.find(r => r.id === id);
    if (!row) return;

    if (!isShiftSelectedForDay(dayIndex)) {
      return;
    }

    // Block editing other entries on a day with Full Day Leave/Office Holiday/Leave Approved (Full Day)
    const isFullDayMarked = timesheetRows.some(
      (r) =>
        (r.task === "Full Day Leave" || r.task === "Office Holiday" || (r.task === "Leave Approved" && Number(r.hours?.[dayIndex] || 0) >= 9)) &&
        (Number(r.hours?.[dayIndex] || 0) > 0)
    );
    if (
      isFullDayMarked &&
      row.task !== "Full Day Leave" &&
      row.task !== "Office Holiday" &&
      row.task !== "Leave Approved"
    ) {
      showError("Leave/Holiday applied on this day; other entries are blocked.");
      return;
    }

    // Normalize string inputs to HH:MM before parsing
    if (typeof value === "string") {
      value = normalizeHHMMInput(value);
    }

    // Handle empty string for proper deletion
    if (value === "" || value === null || value === undefined) {
      setTimesheetRows((prev) =>
        prev.map((r) => {
          if (r.id === id) {
            const newHours = [...r.hours];
            newHours[dayIndex] = 0;
            return { ...r, hours: newHours };
          }
          return r;
        })
      );
      return;
    }

    let numValue = parseHHMMToHours(value);

    // Calculate current daily totals
    // All rows (used for 24h hard cap)
    const currentDailyAllTotal = timesheetRows.reduce((total, r) => {
      if (r.id === id) return total; // Skip current row
      return total + (r.hours[dayIndex] || 0);
    }, 0);
    // Project-only rows (used for on-premises enforcement)
    const currentDailyProjectTotal = timesheetRows.reduce((total, r) => {
      if (r.id === id) return total; // Skip current row
      if (r.type !== "project") return total;
      return total + (r.hours[dayIndex] || 0);
    }, 0);

    // Calculate break hours for the day
    const currentBreakHours = computeBreakForDay(dayIndex);

    // Check if adding new value would exceed 24 hours (including break hours)
    const newWorkTotalAll = currentDailyAllTotal + numValue;
    const newTotalWithBreakAll = newWorkTotalAll + currentBreakHours;

    if (newTotalWithBreakAll > 24) {
      const currentTotal = currentDailyAllTotal.toFixed(1);
      showError(`Daily total cannot exceed 24 hours.\n\nCurrent: ${currentTotal}h\nAfter update: ${newTotalWithBreakAll.toFixed(1)}h\n\nPlease reduce hours to stay within 24 hours limit.`);
      return; // Don't update if it would exceed 24 hours
    }

    // Warning when approaching 24 hours (within 2 hours)
    if (newTotalWithBreakAll >= 22 && newTotalWithBreakAll <= 24) {
      const remainingHours = (24 - newTotalWithBreakAll).toFixed(1);
      showError(`⚠️ Warning: You are approaching the 24-hour daily limit.\n\nAfter this update: ${newTotalWithBreakAll.toFixed(1)}h (only ${remainingHours}h remaining)`, "Warning");
    }

    // Handle leave types
    if (row.task === "Office Holiday" || row.task === "Full Day Leave") {
      // For Full Day Leave and Office Holiday
      if (numValue > 0 && numValue < 9.5) {
        numValue = 9.5; // Jump to 9.5 when increasing from 0
      } else if (numValue === 0) {
        numValue = 0; // Allow setting to 0
      }
      // If user enters any value manually, validate it
      if (numValue > 0 && numValue !== 9.5) {
        numValue = 9.5; // Force to 9.5 for positive values
      }
    } else if (row.task === "Half Day Leave") {
      // For Half Day Leave
      if (numValue > 0 && numValue < 4.75) {
        numValue = 4.75; // Jump to 4.75 when increasing from 0
      } else if (numValue === 0) {
        numValue = 0; // Allow setting to 0
      }
      // If user enters any value manually, validate it
      if (numValue > 0 && numValue !== 4.75) {
        numValue = 4.75; // Force to 4.75 for positive values
      }
    } else if (row.task === "Permission") {
      // Allow specific duration input, but validate max limits
      if (numValue <= 0) {
        numValue = 0;
      } else if (numValue < 1) {
        showError("Minimum duration for a single permission is 1 hour.");
        return;
      } else if (numValue > 2) {
        showError("Maximum duration for a single permission is 2 hours.");
        return;
      } else if (numValue !== 1 && numValue !== 2) {
        showError("Permission duration must be whole hours (1 or 2). Fractional hours are not allowed.");
        return;
      }

      const getPermissionCountForHours = (h) => {
        const val = Number(h) || 0;
        if (val >= 2) return 2;
        if (val >= 1) return 1;
        return 0;
      };

      const computeMonthlyPermissionCountWithOverride = (overrideRowId, overrideDayIndex, overrideHours) => {
        const currentMonth = currentWeek.getMonth();
        const currentYear = currentWeek.getFullYear();
        let count = monthlyBasePermissionCount;

        const weekDates = getWeekDates();

        timesheetRows.forEach((r) => {
          // Only count standard Permission task, exclude Special Permission rows
          if (r.task !== "Permission" || r.type === 'special' || r.project === 'Special Permission') return;
          r.hours.forEach((h, idx) => {
            const date = weekDates[idx];
            if (date && date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
              const hours = (r.id === overrideRowId && idx === overrideDayIndex) ? overrideHours : h;
              const c = getPermissionCountForHours(hours);
              count += c;
            }
          });
        });
        return count;
      };

      if (numValue > 0) {
        const prospectiveCount = computeMonthlyPermissionCountWithOverride(id, dayIndex, numValue);
        if (prospectiveCount > 3) {
          showError(`Monthly permission limit (3 counts) exceeded! You have used ${prospectiveCount} counts.`);
          return;
        }
      }
    } else {
      numValue = Math.max(0, numValue);
    }

    // Break after update depends on whether there is any project work on that day
    const hasWorkAfterUpdate = timesheetRows.some(
      (r) => r.type === "project" && r.task !== "Office Holiday" && ((r.id === id ? numValue : (r.hours?.[dayIndex] || 0)) > 0)
    );

    // Check if there is approved leave (use current state + current row update if applicable)
    // Note: If we are editing the "Leave Approved" row itself, we should use numValue
    const hasApprovedLeave = timesheetRows.some(
      (r) => (r.task || "").startsWith("Leave Approved") && (r.id === id ? numValue : Number(r.hours?.[dayIndex] || 0)) > 0
    );

    // Break time is disabled/removed per requirement
    const breakAfterUpdate = 0;

    // Shift-based caps removed in favor of on-premises enforcement
    // Enforce on-premises cap: project work + auto break must not exceed on-premises time
    // WE RELAX THIS CHECK if there is a Half Day Leave / Leave Approved (Partial), 
    // to allow entering project hours even if biometric data is missing/short.
    const hasPartialLeave = timesheetRows.some(
      (r) => (r.task === "Half Day Leave" || ((r.task || "").startsWith("Leave Approved") && Number(r.hours?.[dayIndex] || 0) < 9)) &&
        Number(r.hours?.[dayIndex] || 0) > 0
    );

    if (row.type === "project") {
      const opHours = Number(onPremisesTime?.daily?.[dayIndex] || 0);
      if (opHours > 0) {
        const remainingAllowed = Math.max(0, opHours - breakAfterUpdate - currentDailyProjectTotal);
        if (numValue > remainingAllowed) {
          numValue = remainingAllowed;
        }
      } else if (!hasPartialLeave) {
        numValue = 0;
      }
    }

    // Double-check after task-specific validation (including break hours)
    const finalWorkTotal = currentDailyAllTotal + numValue;
    const finalTotalWithBreak = finalWorkTotal + breakAfterUpdate;

    // Shift-based caps removed

    if (finalTotalWithBreak > 24) {
      const currentTotal = currentDailyAllTotal.toFixed(1);
      showError(`Daily total cannot exceed 24 hours.\n\nCurrent: ${currentTotal}h\nAfter update: ${finalTotalWithBreak.toFixed(1)}h\n\nPlease reduce hours to stay within 24 hours limit.`);
      return;
    }

    setTimesheetRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const newHours = [...r.hours];

          const rounded = Math.round(numValue * 100) / 100;
          newHours[dayIndex] = rounded;
          return { ...r, hours: newHours };
        }
        return r;
      })
    );
  };

  // Check if permission is allowed for a specific day, excluding current row
  const isPermissionAllowed = (dayIndex, excludeRowId = null) => {
    const hasExistingPermission = timesheetRows.some(row =>
      row.task === "Permission" && row.hours[dayIndex] > 0 && row.id !== excludeRowId
    );
    return !hasExistingPermission;
  };

  const hasFullDayLeave = (dayIndex) => {
    return timesheetRows.some(row =>
      (row.task === 'Full Day Leave' || row.task === 'Office Holiday' || ((row.task || "").startsWith('Leave Approved') && Number(row.hours[dayIndex] || 0) >= 9)) &&
      Number(row.hours[dayIndex] || 0) > 0
    );
  };

  useEffect(() => {
    const daysCount = 7;
    let updated = false;
    const nextRows = timesheetRows.map(r => ({ ...r, hours: [...r.hours] }));
    for (let d = 0; d < daysCount; d++) {
      const hasFull = nextRows.some(
        (r) => (r.task === 'Full Day Leave' || r.task === 'Office Holiday' || ((r.task || "").startsWith('Leave Approved') && Number(r.hours?.[d] || 0) >= 9)) && (Number(r.hours?.[d] || 0) > 0)
      );
      if (!hasFull) continue;
      nextRows.forEach((r) => {
        if (r.task === 'Full Day Leave' || r.task === 'Office Holiday' || (r.task || "").startsWith('Leave Approved')) return;
        if ((r.hours?.[d] || 0) > 0) {
          r.hours[d] = 0;
          updated = true;
        }
      });
    }
    if (updated) {
      setTimesheetRows(nextRows);
    }
  }, [timesheetRows]);

  // ✅ Check if there's at least some data entered
  const hasSomeData = () => {
    return timesheetRows.some(row =>
      row.project ||
      row.task ||
      row.hours.some(hours => hours > 0)
    );
  };

  // ✅ Calculate totals dynamically
  useEffect(() => {
    calculateTotals();
  }, [timesheetRows]);

  const calculateTotals = () => {
    const dailyTotals = [0, 0, 0, 0, 0, 0, 0];
    let weeklyTotal = 0;

    timesheetRows.forEach((row) => {
      row.hours.forEach((hours, index) => {
        const h = Number(hours) || 0;
        dailyTotals[index] += h;
        weeklyTotal += h;
      });
    });

    setTotals({
      daily: dailyTotals,
      weekly: weeklyTotal,
    });
  };

  // ✅ Week calculation helpers (anchor to local Monday of currentWeek)
  const getWeekDates = () => {
    const base = new Date(currentWeek);
    const day = base.getDay(); // 0 (Sun) .. 6 (Sat)
    const diffToMonday = (day + 6) % 7; // days to go back to Monday
    const monday = new Date(base);
    monday.setDate(base.getDate() - diffToMonday);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };
  const getWeekMonday = (date) => {
    const base = new Date(date);
    const day = base.getDay();
    const diff = (day + 6) % 7;
    const monday = new Date(base);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(base.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };
  const canNavigateNextWeek = () => {
    const next = new Date(currentWeek);
    next.setDate(next.getDate() + 7);
    const nextMonday = getWeekMonday(next).getTime();
    const todayMonday = getWeekMonday(new Date()).getTime();
    return nextMonday <= todayMonday;
  };

  const previousWeek = () => {
    handleNavigation(() => {
      const newWeek = new Date(currentWeek);
      newWeek.setDate(newWeek.getDate() - 7);
      setCurrentWeek(newWeek);
      setTimesheetRows([]);
      setIsSubmitted(false); // Reset submission status when changing weeks
      setRejectionReason("");
      setOriginalData(null); // Reset original data for new week
    });
  };

  const nextWeek = () => {
    if (!canNavigateNextWeek()) return;
    handleNavigation(() => {
      const newWeek = new Date(currentWeek);
      newWeek.setDate(newWeek.getDate() + 7);
      setCurrentWeek(newWeek);
      setTimesheetRows([]);
      setIsSubmitted(false); // Reset submission status when changing weeks
      setRejectionReason("");
      setOriginalData(null); // Reset original data for new week
    });
  };

  const goToCurrentWeek = () => {
    handleNavigation(() => {
      setCurrentWeek(new Date());
      setTimesheetRows([]);
      setIsSubmitted(false); // Reset submission status when changing weeks
      setRejectionReason("");
      setOriginalData(null); // Reset original data for new week
    });
  };

  // ✅ Save as draft - Allow saving with partial data
  const saveAsDraft = async () => {
    if (!hasSomeData()) {
      showError("Please enter at least some data (project, task, or hours) before saving as draft.");
      return;
    }

    // Drafts are saved to backend only

    const normalizeToUTCDateOnly = (d) => {
      const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      return utc.toISOString();
    };

    const sanitizedEntries = timesheetRows.map((row) => ({
      project: row.project || "Unnamed Project",
      projectCode:
        row.type === "leave"
          ? ""
          : (projects.find((p) => p.name === row.project)?.code || ""),
      task: row.task || "Unnamed Task",
      type: row.type,
      locked: row.locked,
      hours: (row.hours || []).map((h) => {
        const n = Number(h);
        return Number.isFinite(n) ? n : 0;
      }),
    }));

    const payload = {
      weekStartDate: normalizeToUTCDateOnly(weekDates[0]),
      weekEndDate: normalizeToUTCDateOnly(weekDates[6]),
      entries: sanitizedEntries,
      totalHours: Number((totals.weekly + computeWeeklyBreak()).toFixed(1)) || 0,
      status: "Draft",
      shiftType: shiftType,
      dailyShiftTypes: dailyShiftTypes,
      onPremisesTime: {
        daily: (onPremisesTime?.daily || []).map((n) => Number(n) || 0),
        weekly: Number(onPremisesTime?.weekly) || 0
      }
    };

    try {
      setLoading(true);

      const response = await timesheetAPI.saveTimesheet(payload);
      console.log("✅ Timesheet saved as draft:", response.data);

      // Draft persisted to backend

      // Update original data to mark as saved
      setOriginalData(JSON.stringify(timesheetRows));
      setHasUnsavedChanges(false);

      // Notify history page to refresh
      try { window.dispatchEvent(new Event('refreshTimesheetHistory')); } catch (_) { }

      showError("✅ Timesheet saved as draft successfully!", "Success");
    } catch (error) {
      console.error("❌ Error saving timesheet as draft:", error);
      showError(
        error.response?.data?.message ||
        "Failed to save timesheet as draft. Please try again.",
        "Error"
      );
    } finally {
      setLoading(false);
    }
  };

  // ✅ Submit timesheet to backend
  const submitTimesheet = async () => {
    if (!allDaysSatisfied) {
      showError("Minimum hours not met for one or more days. Please ensure all working days meet the shift requirements.");
      return;
    }

    const invalidRows = timesheetRows.filter(
      (row) => !row.project || (row.type === "project" && !row.task)
    );
    if (invalidRows.length > 0) {
      showError("Please fill all required fields for all rows.");
      return;
    }

    if (totals.weekly === 0) {
      showError("Please enter hours for at least one day.");
      return;
    }

    // ✅ Check for missing shifts (Mon-Fri)
    if (missingShiftDays.length > 0) {
      showError(
        `Please select a shift for the following days (Mon–Fri):\n` +
        `${missingShiftDays.join(", ")}.\n\n` +
        `A shift must be selected for every working day unless a Full Day Leave or Holiday is applied.`
      );
      return;
    }

    // ✅ Day-wise Minimum Hours Validation (DISABLED)
    // for (let i = 0; i < 7; i++) {
    //   // Skip validation for days with Full Day Leave, Office Holiday, or Approved Leave
    //   if (hasFullDayLeave(i) || hasAnyApprovedLeave(i)) continue;

    //   const shift = dailyShiftTypes?.[i] || shiftType || "";
    //   // If no shift selected (e.g., weekend without work), skip validation
    //   // Note: missingShiftDays already ensures Mon-Fri have shifts if not on leave
    //   if (!shift || shift === "Select Shift") continue;

    //   const totalWithBreak = totals.daily[i] + computeBreakForDay(i);
    //   const currentMinutes = Math.round(totalWithBreak * 60);

    //   let minMinutes = 0;
    //   let minHoursText = "";

    //   // Determine minimum minutes based on shift (with 5 min grace period)
    //   // First/Second Shift: 8h 30m required -> 8h 25m threshold
    //   // General Shift: 9h 30m required -> 9h 25m threshold

    //   // Determine previous day's on-premises hours
    //   let prevDayHours = 0;
    //   if (i === 0) {
    //     prevDayHours = onPremisesTime.prevSunday || 0;
    //   } else {
    //     prevDayHours = onPremisesTime.daily?.[i - 1] || 0;
    //   }

    //   if (prevDayHours > 14) {
    //     // Reduced minimums if previous day > 14 hours
    //     if (shift.startsWith("First Shift") || shift.startsWith("Second Shift")) {
    //        minMinutes = 7 * 60; // 7 hours
    //        minHoursText = "7:00";
    //     } else if (shift.startsWith("General Shift")) {
    //        minMinutes = 8 * 60; // 8 hours
    //        minHoursText = "8:00";
    //     } else {
    //        continue;
    //     }
    //   } else {
    //     // Standard minimums
    //     if (shift.startsWith("First Shift") || shift.startsWith("Second Shift")) {
    //       minMinutes = (8 * 60) + 25; // 505 minutes
    //       minHoursText = "8:25";
    //     } else if (shift.startsWith("General Shift")) {
    //       minMinutes = (9 * 60) + 25; // 565 minutes
    //       minHoursText = "9:25";
    //     } else {
    //       continue;
    //     }
    //   }

    //   if (currentMinutes < minMinutes) {
    //     showError(
    //       `Day-wise minimum hours not met for ${days[i]} (${shift}).\n\n` +
    //       `Required minimum (with grace): ${minHoursText}\n` +
    //       `Recorded (Work + Break): ${formatHoursHHMM(totalWithBreak)}\n\n` +
    //       `Please ensure each working day meets the shift requirement.`
    //     );
    //     return;
    //   }
    // }

    if (monthlyPermissionCount > 3) {
      showError(`Monthly permission limit exceeded! Current count: ${monthlyPermissionCount}/3`);
      return;
    }

    for (let i = 0; i < 7; i++) {
      const op = Number(onPremisesTime?.daily?.[i] || 0);
      const hasProjectHours = timesheetRows.some(
        (row) => row.type === "project" && row.task !== "Office Holiday" && ((row.hours?.[i] || 0) > 0)
      );

      let workTotal = 0;
      timesheetRows.forEach((row) => {
        workTotal += Number(row.hours?.[i] || 0);
      });
      const breakHours = computeBreakForDay(i);
      const totalWithBreak = workTotal + breakHours;

      const opMinutes = Math.round(op * 60);
      const totalMinutes = Math.round(totalWithBreak * 60);

      // Calculate permission minutes for the day
      const permissionHours = timesheetRows
        .filter(r => (r.task && (r.task === "Permission" || r.task.toLowerCase().includes("permission"))) || r.type === 'special')
        .reduce((sum, r) => sum + (Number(r.hours?.[i]) || 0), 0);
      const permissionMinutes = Math.round(permissionHours * 60);

      // Calculate other leave minutes (excluding permission) to add to on-premises time for validation
      const otherLeaveHours = timesheetRows
        .filter(r => (r.type === 'leave' || r.project === 'Leave' || r.task === 'Office Holiday' || r.project === 'Office Holiday') && 
                     !(r.task && (r.task === "Permission" || r.task.toLowerCase().includes("permission"))) && 
                     r.type !== 'special')
        .reduce((sum, r) => sum + (Number(r.hours?.[i]) || 0), 0);
      const otherLeaveMinutes = Math.round(otherLeaveHours * 60);
      
      const adjustedOpMinutes = opMinutes + permissionMinutes + otherLeaveMinutes;
      
      // Check for mismatch > 2 minutes
      // Only check if on-premises time is present. If op is 0, we'll hit the "Project hours not allowed" check below.
      if (opMinutes > 0 && Math.abs(adjustedOpMinutes - totalMinutes) > 2) {
        showError(
          `Time Mismatch for ${days[i]}:\n` +
          `On-Premises (${formatHoursHHMM(op)}) + Permission (${formatHoursHHMM(permissionHours)}) + Leave (${formatHoursHHMM(otherLeaveHours)}): ${formatHoursHHMM(op + permissionHours + otherLeaveHours)}\n` +
          `Total Hours (Work + Break): ${formatHoursHHMM(totalWithBreak)}\n\n` +
          `These values must match within 2 minutes.`
        );
        return;
      }

      if (op <= 0 && hasProjectHours) {
        showError(`Project hours not allowed for ${days[i]} without on-premises time. Please record attendance or remove project hours.`);
        return;
      }
    }



    const normalizeToUTCDateOnly = (d) => {
      const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      return utc.toISOString();
    };

    const sanitizedEntries = timesheetRows.map((row) => ({
      project: row.project,
      projectCode:
        row.type === "leave"
          ? ""
          : (projects.find((p) => p.name === row.project)?.code || ""),
      task: row.task,
      type: row.type,
      locked: row.locked,
      hours: (row.hours || []).map((h) => {
        const n = Number(h);
        return Number.isFinite(n) ? n : 0;
      }),
    }));

    const user = JSON.parse(sessionStorage.getItem("user") || "{}");

    const payload = {
      weekStartDate: normalizeToUTCDateOnly(weekDates[0]),
      weekEndDate: normalizeToUTCDateOnly(weekDates[6]),
      entries: sanitizedEntries,
      totalHours: Number((totals.weekly + computeWeeklyBreak()).toFixed(1)) || 0,
      status: "Submitted",
      shiftType: shiftType,
      dailyShiftTypes: dailyShiftTypes,
      employeeId: user.employeeId || "",
      employeeName: user.name || "",
      onPremisesTime: {
        daily: (onPremisesTime?.daily || []).map((n) => Number(n) || 0),
        weekly: Number(onPremisesTime?.weekly) || 0
      }
    };

    try {
      setLoading(true);
      const response = await timesheetAPI.saveTimesheet(payload);
      console.log("✅ Timesheet submitted:", response.data);

      // Submission persisted to backend

      // Set submitted status to prevent auto-saving
      setIsSubmitted(true);

      // Notify history page to refresh
      try { window.dispatchEvent(new Event('refreshTimesheetHistory')); } catch (_) { }

      showError("✅ Timesheet submitted successfully!", "Success");
    } catch (error) {
      console.error("❌ Error submitting timesheet:", error);
      showError(
        error.response?.data?.message ||
        "Failed to submit timesheet. Please try again.",
        "Error"
      );
    } finally {
      setLoading(false);
    }
  };

  const weekDates = getWeekDates();
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getShiftMinHours = (shift) => {
    if (!shift) return 0;
    const s = String(shift);
    if (s.startsWith("General Shift")) return 9.5;
    if (s.startsWith("First Shift") || s.startsWith("Second Shift") || s.startsWith("Secend Shift")) return 8.5;
    return 0;
  };

  const getSpecialPermissionRequiredHours = (shift) => {
    if (!shift) return 0;
    const s = String(shift).toLowerCase();
    // First Shift: 7:15
    if (s.startsWith("first shift")) return 7 + 15/60;
    // Second Shift: 7:15
    if (s.startsWith("second shift") || s.startsWith("secend shift")) return 7 + 15/60;
    // General Shift: 8:00
    if (s.startsWith("general shift")) return 8 + 0/60;
    return 0;
  };

  const getShiftMaxHours = (shift) => {
    if (!shift) return 24;
    const s = String(shift);
    if (s.startsWith("General Shift")) return 9.5;
    if (s.startsWith("First Shift") || s.startsWith("Second Shift") || s.startsWith("Secend Shift")) return 8.5;
    return 24;
  };

  const isShiftSelectedForDay = (idx) => {
    const s = dailyShiftTypes?.[idx];
    return !!s && s !== "Select Shift";
  };

  const dailyWorkTotals = (() => {
    const totals = [0, 0, 0, 0, 0, 0, 0];
    timesheetRows.forEach((row) => {
      if (row.type === "project") {
        row.hours.forEach((h, idx) => {
          const n = Number(h) || 0;
          totals[idx] += n;
        });
      }
      if (row.type === "leave") {
        row.hours.forEach((h, idx) => {
          const n = Number(h) || 0;
          totals[idx] += n;
        });
      }
      if (row.type === "special") {
        row.hours.forEach((h, idx) => {
          const n = Number(h) || 0;
          totals[idx] += n;
        });
      }
    });
    return totals;
  })();

  const shiftMinimumsSatisfied = dailyShiftTypes.every((shift, idx) => {
    if (!shift || shift === "Select Shift") return true;
    if (hasFullDayLeave(idx)) return true;
    const required = getShiftMinHours(shift);
    return dailyWorkTotals[idx] >= required;
  });

  // ========== WORK + BREAK LOGIC FUNCTIONS ==========

  const getShiftBreakHours = (shift) => {
    if (!shift) return 0;
    const s = String(shift);
    if (s.startsWith("First Shift")) return 65 / 60;
    if (s.startsWith("Second Shift")) return 60 / 60;
    if (s.startsWith("General Shift")) return 75 / 60;
    return 0;
  };

  const computeBreakForDay = (dayIndex) => {
    // Break time is disabled/removed per requirement
    return 0;
  };

  // Calculate weekly break total
  const computeWeeklyBreak = () => {
    let sum = 0;
    for (let i = 0; i < 7; i++) sum += computeBreakForDay(i);
    return sum;
  };

  const hasAnyApprovedLeave = (dayIndex) => {
    return timesheetRows.some(
      (row) => (row.task || "").startsWith("Leave Approved") && Number(row.hours?.[dayIndex] || 0) > 0
    );
  };

  const getWeeklyRequiredShiftHours = () => {
    let required = 0;
    // Iterate all 7 days (Mon-Sun)
    for (let i = 0; i < 7; i++) {
      const shift = dailyShiftTypes?.[i] || shiftType || "";
      // Skip if no shift is selected
      if (!shift || shift === "Select Shift") continue;
      // Skip full day leave/holiday OR any approved leave
      if (hasFullDayLeave(i) || hasAnyApprovedLeave(i)) continue;

      // For Mon-Fri (0-4), shift is mandatory (checked by getMissingShiftDays)
      // For Sat-Sun (5-6), if shift is selected, it adds to required hours
      required += getShiftMinHours(shift);
    }
    return required;
  };

  const getMissingShiftDays = () => {
    const missing = [];
    for (let i = 0; i < 5; i++) {
      if (hasFullDayLeave(i) || hasAnyApprovedLeave(i)) continue;
      const shift = dailyShiftTypes?.[i] || shiftType || "";
      if (!shift || shift === "Select Shift") {
        missing.push(days[i]);
      }
    }
    return missing;
  };

  const missingShiftDays = getMissingShiftDays();

  const allDaysSatisfied = (() => {
    if (missingShiftDays.length > 0) return false;
    for (let i = 0; i < 7; i++) {
      if (hasFullDayLeave(i) || hasAnyApprovedLeave(i)) continue;
      const shift = dailyShiftTypes?.[i] || shiftType || "";
      if (!shift || shift === "Select Shift") continue;

      const totalWithBreak = totals.daily[i] + computeBreakForDay(i);
      const currentMinutes = Math.round(totalWithBreak * 60);

      // Determine minimum minutes based on shift
      // First/Second Shift: 7h 15m (435m)
      // General Shift: 8h (480m)
      let minMinutes = 0;
      if (shift.startsWith("First Shift") || shift.startsWith("Second Shift")) {
        minMinutes = (7 * 60) + 15; // 435
      } else if (shift.startsWith("General Shift")) {
        minMinutes = 8 * 60; // 480
      }

      if (minMinutes > 0 && currentMinutes < minMinutes) return false;

      // Calculate permission minutes for the day
      const permissionHours = timesheetRows
        .filter(r => (r.task && (r.task === "Permission" || r.task.toLowerCase().includes("permission"))) || r.type === 'special')
        .reduce((sum, r) => sum + (Number(r.hours?.[i]) || 0), 0);
      const permissionMinutes = Math.round(permissionHours * 60);

      // Calculate other leave minutes (excluding permission) to add to on-premises time for validation
      const otherLeaveHours = timesheetRows
        .filter(r => (r.type === 'leave' || r.project === 'Leave' || r.task === 'Office Holiday' || r.project === 'Office Holiday') && 
                     !(r.task && (r.task === "Permission" || r.task.toLowerCase().includes("permission"))) && 
                     r.type !== 'special')
        .reduce((sum, r) => sum + (Number(r.hours?.[i]) || 0), 0);
      const otherLeaveMinutes = Math.round(otherLeaveHours * 60);
      
      // Check if On-Premises Time matches Total Hours (Work + Break) within 2 mins cushion
      const onPremisesHours = onPremisesTime.daily?.[i] || 0;
      const onPremisesMinutes = Math.round(onPremisesHours * 60);
      
      // If permission/leave exists, add it to on-premises time for validation (since permission is time away)
      const adjustedOnPremisesMinutes = onPremisesMinutes + permissionMinutes + otherLeaveMinutes;

      if ((onPremisesMinutes > 0 || currentMinutes > 0) && Math.abs(adjustedOnPremisesMinutes - currentMinutes) > 2) {
        return false;
      }
    }
    return true;
  })();

  const updateDailyShift = (index, value) => {
    setDailyShiftTypes((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const saveDailyShiftTypesToSession = () => { };

  useEffect(() => {
    saveDailyShiftTypesToSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyShiftTypes, shiftType, currentWeek]);

  // Get daily total with break (formatted in HH:MM)
  const getDailyTotalWithBreak = (dayIndex) => {
    const workTotal = totals.daily[dayIndex] || 0;
    const breakTotal = computeBreakForDay(dayIndex);
    const totalHours = workTotal + breakTotal;
    return formatHoursHHMM(totalHours);
  };

  // Get weekly total with break (formatted in HH:MM)
  const getWeeklyTotalWithBreak = () => {
    const workTotal = totals.weekly || 0;
    const breakTotal = computeWeeklyBreak();
    const totalHours = workTotal + breakTotal;
    return formatHoursHHMM(totalHours);
  };

  // Get current daily total with break (numeric value for calculations)
  const getCurrentDailyTotalWithBreak = (dayIndex) => {
    const workTotal = totals.daily[dayIndex] || 0;
    const breakTotal = computeBreakForDay(dayIndex);
    return workTotal + breakTotal;
  };

  // Get CSS class for daily total warning
  const getDailyTotalWarningClass = (dayIndex) => {
    const totalWithBreak = getCurrentDailyTotalWithBreak(dayIndex);
    if (totalWithBreak >= 24) return "bg-red-100 text-red-800 font-bold";
    if (totalWithBreak >= 20) return "bg-yellow-100 text-yellow-800 font-bold";

    // Check minimum hours
    if (!hasFullDayLeave(dayIndex) && !hasAnyApprovedLeave(dayIndex)) {
      const shift = dailyShiftTypes?.[dayIndex] || shiftType || "";
      if (shift && shift !== "Select Shift") {
        
        // Determine minimum minutes based on shift
        // First/Second Shift: 7h 15m (435m)
        // General Shift: 8h (480m)
        let minMinutes = 0;
        if (shift.startsWith("First Shift") || shift.startsWith("Second Shift")) {
          minMinutes = (7 * 60) + 15; // 435
        } else if (shift.startsWith("General Shift")) {
          minMinutes = 8 * 60; // 480
        }

        if (minMinutes > 0 && Math.round(totalWithBreak * 60) < minMinutes) {
          return "bg-red-50 text-red-600 font-bold";
        }

        // Check if On-Premises Time matches Total Hours (Work + Break) within 2 mins cushion
        const currentMinutes = Math.round(totalWithBreak * 60);
        const onPremisesHours = onPremisesTime.daily?.[dayIndex] || 0;
        const onPremisesMinutes = Math.round(onPremisesHours * 60);

        // Calculate permission minutes
        const permissionHoursRow = timesheetRows
          .filter(r => r.task === "Permission")
          .reduce((sum, r) => sum + (Number(r.hours?.[dayIndex]) || 0), 0);
        
        let specialPermissionHours = 0;
        if (mySpecials && mySpecials.length > 0) {
             const currentDate = weekDates[dayIndex];
             const approvedSpecials = mySpecials.filter(sp => 
                sp.status === 'APPROVED' && 
                new Date(sp.date).toDateString() === currentDate.toDateString()
             );
             // Use only the latest approved permission for calculation
             const latestApproved = approvedSpecials.length > 0 ? [approvedSpecials[0]] : [];
             specialPermissionHours = latestApproved.reduce((sum, sp) => sum + (Number(sp.totalHours) || 0), 0);
        }
        
        const permissionMinutes = Math.round((permissionHoursRow + specialPermissionHours) * 60);

        // Calculate other leave minutes (excluding permission) to add to on-premises time for validation
        const otherLeaveHours = timesheetRows
          .filter(r => (r.type === 'leave' || r.project === 'Leave' || r.task === 'Office Holiday' || r.project === 'Office Holiday') && r.task !== 'Permission')
          .reduce((sum, r) => sum + (Number(r.hours?.[dayIndex]) || 0), 0);
        const otherLeaveMinutes = Math.round(otherLeaveHours * 60);

        const adjustedOnPremisesMinutes = onPremisesMinutes + permissionMinutes + otherLeaveMinutes;

        if ((onPremisesMinutes > 0 || currentMinutes > 0) && Math.abs(adjustedOnPremisesMinutes - currentMinutes) > 2) {
          return "bg-red-50 text-red-600 font-bold";
        }
      }
    }

    return "text-blue-700 font-bold";
  };

  // Navigation confirmation functions
  const handleNavigation = (navigationFunction) => {
    if (hasUnsavedChanges && !isSubmitted) {
      setPendingNavigation(() => navigationFunction);
      setShowNavigationDialog(true);
    } else {
      navigationFunction();
    }
  };

  const confirmSaveAndNavigate = () => {
    saveDraftToSession();
    setShowNavigationDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const cancelNavigation = () => {
    setShowNavigationDialog(false);
    setPendingNavigation(null);
  };

  const discardAndNavigate = () => {
    setShowNavigationDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  // Format week range with month names
  const formatWeekRange = () => {
    const startMonth = weekDates[0].toLocaleDateString("en-US", { month: "short" });
    const endMonth = weekDates[6].toLocaleDateString("en-US", { month: "short" });
    const startDay = weekDates[0].getDate();
    const endDay = weekDates[6].getDate();

    // Helper to get ISO week number
    const getISOWeek = (d) => {
      const date = new Date(d.valueOf());
      date.setHours(0, 0, 0, 0);
      // Thursday in current week decides the year.
      date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
      // January 4 is always in week 1.
      const week1 = new Date(date.getFullYear(), 0, 4);
      // Adjust to Thursday in week 1 and count number of weeks from date to week1.
      return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    };

    const weekNumber = getISOWeek(weekDates[0]);

    return `${startMonth} ${startDay} - ${endMonth} ${endDay} (Week ${weekNumber})`;
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Week Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full md:w-auto">
            <div className="flex items-center gap-2 justify-center w-full sm:w-auto">
              <button
                onClick={previousWeek}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>

              <div className="text-lg font-semibold text-gray-800">
                {currentWeek.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric"
                })}
              </div>

              <button
                onClick={nextWeek}
                disabled={!canNavigateNextWeek()}
                className={`p-1 rounded transition-colors ${!canNavigateNextWeek() ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"}`}
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Week:</span>
              <span className="text-sm text-gray-800 font-semibold">
                {formatWeekRange()}
              </span>
            </div>
          </div>

          <button
            onClick={goToCurrentWeek}
            className="px-4 py-2 bg-[#262760] text-white rounded text-sm font-medium hover:bg-[#1e2050] transition-colors flex items-center justify-center gap-2 w-full md:w-auto"
          >

            <Calendar className="w-4 h-4" />
            CURRENT WEEK
          </button>
        </div>
      </div>

      {/* Rejection Alert */}
      {rejectionReason && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Timesheet Rejected
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  Reason: {rejectionReason}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timesheet Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Header with action buttons */}
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Week Entry
          </h2>

          <div className="flex flex-wrap justify-center gap-3 w-full md:w-auto">
            <button
              onClick={addProjectRow}
              disabled={isLeaveAutoDraft || isSubmitted}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${isLeaveAutoDraft || isSubmitted ? "bg-gray-400 cursor-not-allowed text-white" : "bg-[#262760] hover:bg-[#1e2050] text-white"}`}
              title={isSubmitted ? "Timesheet already submitted" : "Add Project Row"}
            >
              <Plus className="w-4 h-4" />
              ADD PROJECT
            </button>

            <button
              onClick={addLeaveRow}
              disabled={isAddLeaveDisabled()}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${isAddLeaveDisabled()
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#262760] hover:bg-[#1e2050] text-white"
                }`}
              title={isAddLeaveDisabled() ? "Cannot add leave row (Limit reached or Permission active)" : "Add Leave Row"}
            >
              <Plus className="w-4 h-4" />
              ADD PERMISSION
            </button>


            <button
              onClick={() => {
                const today = new Date();
                const inWeek = weekDates.some(d => d.toDateString() === today.toDateString());
                const initialDate = inWeek ? today : weekDates[0];
                setSpDate(initialDate);
                // Format to YYYY-MM-DD local
                const y = initialDate.getFullYear();
                const m = String(initialDate.getMonth() + 1).padStart(2, '0');
                const d = String(initialDate.getDate()).padStart(2, '0');
                const dateStr = `${y}-${m}-${d}`;
                
                calculateSpecialPermission(dateStr);
                setSpReason("");
                setSpFile(null);
                setShowSpecialModal(true);
              }}
              disabled={isSubmitted}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${isSubmitted ? "bg-gray-400 cursor-not-allowed text-white" : "bg-[#262760] hover:bg-[#1e2050] text-white"}`}
              title={isSubmitted ? "Timesheet already submitted" : "Request Special Permission"}
            >
              <Plus className="w-4 h-4" />
              ADD SPECIAL PERMISSION
            </button>


            <button
              onClick={saveAsDraft}
              disabled={loading || !hasSomeData() || isSubmitted || isLeaveAutoDraft}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${loading || !hasSomeData() || isSubmitted || isLeaveAutoDraft
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#262760] hover:bg-[#1e2050] text-white"
                }`}
            >
              <Save className="w-4 h-4" />
              SAVE DRAFT
            </button>

          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-max w-full border-collapse table-fixed">
            <thead className="bg-[#262760] text-white">
              <tr>
                <th className="p-3 text-left text-sm font-semibold border border-gray-600 w-12">
                  S.no
                </th>
                <th className="p-3 text-left text-sm font-semibold border border-gray-600 min-w-60">
                  Project Name
                </th>
                <th className="p-3 text-left text-sm font-semibold border border-gray-600 min-w-48">
                  Task / Leave Type
                </th>
                {days.map((day, index) => (
                  <th
                    key={day}
                    className={`p-3 text-center text-sm font-semibold border border-gray-600 w-32 ${isOfficeHoliday(weekDates[index]) ? 'bg-green-700 text-white' : ''}`}
                  >
                    <div>{day}</div>
                    <div className={`${isOfficeHoliday(weekDates[index]) ? 'text-green-100' : 'text-violet-100'} text-xs font-normal`}>
                      {weekDates[index].toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="mt-2">
                      {isOfficeHoliday(weekDates[index]) ? (
                        <div className="text-xs font-bold text-white break-words whitespace-normal px-1">
                          {getOfficeHolidayName(weekDates[index])}
                        </div>
                      ) : (
                        <select
                          value={dailyShiftTypes[index]}
                          onChange={(e) => updateDailyShift(index, e.target.value)}
                          className="w-full p-2 border border-gray-500 bg-[#1e2050] text-white rounded text-xs focus:outline-none focus:ring-2 focus:ring-violet-400"
                          disabled={isSubmitted || isLeaveAutoDraft}
                        >
                          <option value="">Select Shift</option>
                          {shiftTypes.map((shift) => (
                            <option key={shift} value={shift}>
                              {shift}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </th>
                ))}
                <th className="p-3 text-center text-sm font-semibold border border-gray-600 w-24">
                  Total
                </th>
                <th className="p-3 text-center text-sm font-semibold border border-gray-600 w-20">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {timesheetRows.map((row, index) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="p-3 text-gray-900 text-center border border-gray-200">
                    {index + 1}
                  </td>

                  {/* Project Name Column */}
                  <td className="p-2 border border-gray-200">
                    {row.type === "leave" ? (
                      <div className="w-full p-2 text-blue-800 rounded text-sm font-semibold text-center">
                        Leave
                      </div>
                    ) : row.type === "special" ? (
                      <div className="w-full p-2 text-purple-800 rounded text-sm font-semibold text-center bg-purple-100">
                        Special Permission
                      </div>
                    ) : row.project === "Office Holiday" ? (
                      <div className="w-full p-2 text-green-800 rounded text-sm font-semibold text-center">
                        Office Holiday
                      </div>
                    ) : (
                      <select
                        value={row.project}
                        onChange={(e) => updateRow(row.id, "project", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isSubmitted || isLeaveAutoDraft || row.locked}
                      >
                        <option value="">Select Project</option>
                        {projects.map((p) => (
                          <option key={p.code || p.name} value={p.name}>
                            {p.code ? `${p.name} (${p.code})` : p.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>

                  <td className="p-2 border border-gray-200">
                    {row.task === "Office Holiday" || row.task === "Permission" || row.type === "special" ? (
                      <div className={`w-full p-2 ${row.task === "Office Holiday" ? "text-green-800" : row.type === "special" ? "text-purple-800 bg-purple-100" : "text-blue-800"} rounded text-sm font-semibold text-center`}>
                        {row.task}
                      </div>
                    ) : (
                      <select
                        value={row.task}
                        onChange={(e) => updateRow(row.id, "task", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isSubmitted || isLeaveAutoDraft || row.locked}
                      >
                        <option value="">Select {row.type === "leave" ? "Leave Type" : "Task"}</option>
                        {(row.type === "leave" ? leaveTypes : tasks).map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                        {row.task.startsWith("Leave Approved") && (
                          <option value={row.task}>{row.task}</option>
                        )}
                      </select>
                    )}
                  </td>

                  {row.hours.map((hours, dayIndex) => (
                    <td key={dayIndex} className={`p-2 text-center border border-gray-200 w-32 ${isOfficeHoliday(weekDates[dayIndex]) ? 'bg-green-100' : ''}`}>
                      <div className="relative inline-flex items-center">
                        <input
                          type="text"
                          maxLength={5}
                          value={cellInputs[`${row.id}_${dayIndex}`] ?? formatHoursHHMM(hours)}
                          placeholder="00:00"
                          onChange={(e) => {
                            const val = e.target.value;
                            // Allow only digits and colon
                            if (/^[0-9:]*$/.test(val)) {
                              const key = `${row.id}_${dayIndex}`;
                              setCellInputs((prev) => ({ ...prev, [key]: val }));
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const key = `${row.id}_${dayIndex}`;
                              const entered = (e.currentTarget && e.currentTarget.value) || '';
                              updateHours(row.id, dayIndex, entered);
                              setCellInputs((prev) => {
                                const next = { ...prev };
                                delete next[key];
                                return next;
                              });
                              if (e.currentTarget) e.currentTarget.blur();
                            }
                            if (e.key === 'ArrowUp') {
                              // Don't allow arrow keys for Leave Approved
                              if (
                                row.type !== "project" &&
                                row.task !== "Permission" &&
                                row.task !== "Full Day Leave" &&
                                row.task !== "Office Holiday" &&
                                row.task !== "Half Day Leave" &&
                                !row.task.startsWith("Leave Approved")  // Added this condition
                              ) {
                                const key = `${row.id}_${dayIndex}`;
                                const baseStr = cellInputs[key] ?? formatHoursHHMM(hours || 0);
                                const base = parseHHMMToHours(baseStr);
                                const next = base + 5 / 60;
                                updateHours(row.id, dayIndex, formatHoursHHMM(next));
                                setCellInputs((prev) => {
                                  const nextInputs = { ...prev };
                                  delete nextInputs[key];
                                  return nextInputs;
                                });
                                e.preventDefault();
                              }
                            }
                            if (e.key === 'ArrowDown') {
                              // Don't allow arrow keys for Leave Approved
                              if (
                                row.type !== "project" &&
                                row.task !== "Permission" &&
                                row.task !== "Full Day Leave" &&
                                row.task !== "Office Holiday" &&
                                row.task !== "Half Day Leave" &&
                                !row.task.startsWith("Leave Approved")  // Added this condition
                              ) {
                                const key = `${row.id}_${dayIndex}`;
                                const baseStr = cellInputs[key] ?? formatHoursHHMM(hours || 0);
                                const base = parseHHMMToHours(baseStr);
                                const next = Math.max(0, base - 15 / 60);
                                updateHours(row.id, dayIndex, formatHoursHHMM(next));
                                setCellInputs((prev) => {
                                  const nextInputs = { ...prev };
                                  delete nextInputs[key];
                                  return nextInputs;
                                });
                                e.preventDefault();
                              }
                            }
                          }}
                          onFocus={(e) => {
                            const key = `${row.id}_${dayIndex}`;
                            const val = (e.currentTarget && e.currentTarget.value) || '';
                            setCellInputs((prev) => ({ ...prev, [key]: val }));
                          }}
                          onBlur={(e) => {
                            const key = `${row.id}_${dayIndex}`;
                            const val = (e.currentTarget && e.currentTarget.value) || '';
                            updateHours(row.id, dayIndex, val);
                            setCellInputs((prev) => {
                              const next = { ...prev };
                              delete next[key];
                              return next;
                            });
                          }}
                          className={`w-20 p-2 ${row.type !== "project" ? "pr-6" : ""} border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${(row.type === "project" ? (!row.project || !row.task) : (!row.task))
                            ? "bg-gray-100 cursor-not-allowed"
                            : (row.type === "project" && (dayIndex === 5 || dayIndex === 6))
                              ? "bg-gray-100 cursor-not-allowed"
                              : row.task === "Permission" && !isPermissionAllowed(dayIndex, row.id)
                                ? "bg-gray-100 cursor-not-allowed"
                                : isSubmitted || row.locked
                                  ? "bg-gray-100 cursor-not-allowed"
                                  : hasFullDayLeave(dayIndex) && row.task !== "Full Day Leave" && row.task !== "Office Holiday"
                                    ? "bg-gray-100 cursor-not-allowed"
                                    : !isShiftSelectedForDay(dayIndex)
                                      ? "bg-gray-100 cursor-not-allowed"
                                      : ""
                            }`}
                          disabled={
                            isSubmitted || isLeaveAutoDraft ||
                            row.locked ||
                            (row.lockedDays && row.lockedDays[dayIndex]) ||
                            (row.type === "project" ? (!row.project || !row.task) : (!row.task)) ||
                            (hasFullDayLeave(dayIndex) && row.task !== "Full Day Leave" && row.task !== "Office Holiday") ||
                            (row.task === "Permission" && (!isPermissionAllowed(dayIndex, row.id) || (monthlyPermissionCount >= 6 && Number(hours) === 0))) ||
                            (!isShiftSelectedForDay(dayIndex))
                          }
                          title={
                            isSubmitted
                              ? "Timesheet already submitted"
                              : row.locked
                                ? (row.type === "special" ? "Locked due to approved special permission" : "Locked due to approved leave")
                                : (row.lockedDays && row.lockedDays[dayIndex])
                                  ? "Locked due to full day leave"
                                  : (row.type === "project" ? (!row.project || !row.task) : (!row.task))
                                    ? (row.type === "project" ? "Please select project and task first" : "Please select a leave type or task")
                                    : row.task === "Permission" && !isPermissionAllowed(dayIndex, row.id)
                                      ? "Permission not allowed for this day"
                                      : (monthlyPermissionCount >= 3 && Number(hours) === 0)
                                          ? "Monthly permission limit reached"
                                        : hasFullDayLeave(dayIndex) && row.task !== "Full Day Leave" && row.task !== "Office Holiday"
                                          ? "Full Day Leave applied on this day"
                                          : !isShiftSelectedForDay(dayIndex)
                                            ? "Please select a shift for this day"
                                            : ""
                          }
                        />
                        {/* Hide arrows for Leave Approved and other specific leave types */}
                        {row.type !== "project" &&
                          row.task !== "Permission" &&
                          row.task !== "Full Day Leave" &&
                          row.task !== "Office Holiday" &&
                          row.task !== "Half Day Leave" &&
                          !row.task.startsWith("Leave Approved") && (  // Added this condition
                            <div className="absolute right-1 inset-y-1 flex flex-col justify-between">
                              <button
                                onClick={() => {
                                  const key = `${row.id}_${dayIndex}`;
                                  const baseStr = cellInputs[key] ?? formatHoursHHMM(hours || 0);
                                  const base = parseHHMMToHours(baseStr);
                                  const next = base + 15 / 60;
                                  updateHours(row.id, dayIndex, formatHoursHHMM(next));
                                  setCellInputs((prev) => {
                                    const nextInputs = { ...prev };
                                    delete nextInputs[key];
                                    return nextInputs;
                                  });
                                }}
                                disabled={
                                  isSubmitted || isLeaveAutoDraft ||
                                  row.locked ||
                                  (row.type === "project" ? (!row.project || !row.task) : (!row.task)) ||
                                  (hasFullDayLeave(dayIndex) && row.task !== "Full Day Leave" && row.task !== "Office Holiday") ||
                                  (!isShiftSelectedForDay(dayIndex))
                                }
                                className="w-4 h-4 flex items-center justify-center bg-transparent text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Increase 5 minutes"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  const key = `${row.id}_${dayIndex}`;
                                  const baseStr = cellInputs[key] ?? formatHoursHHMM(hours || 0);
                                  const base = parseHHMMToHours(baseStr);
                                  const next = Math.max(0, base - 5 / 60);
                                  updateHours(row.id, dayIndex, formatHoursHHMM(next));
                                  setCellInputs((prev) => {
                                    const nextInputs = { ...prev };
                                    delete nextInputs[key];
                                    return nextInputs;
                                  });
                                }}
                                disabled={
                                  isSubmitted || isLeaveAutoDraft ||
                                  row.locked ||
                                  (row.type === "project" ? (!row.project || !row.task) : (!row.task)) ||
                                  (hasFullDayLeave(dayIndex) && row.task !== "Full Day Leave" && row.task !== "Office Holiday") ||
                                  (!isShiftSelectedForDay(dayIndex))
                                }
                                className="w-4 h-4 flex items-center justify-center bg-transparent text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Decrease 15 minutes"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                      </div>
                    </td>
                  ))}

                  <td className="p-3 font-semibold text-green-600 text-center border border-gray-200 w-24">
                    {formatHoursHHMM(row.hours.reduce((sum, hours) => sum + hours, 0))}
                  </td>

                  <td className="p-2 text-center border border-gray-200 w-20">
                    <button
                      onClick={() => deleteRow(row.id)}
                      className="p-2 text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={timesheetRows.length <= 1 || isSubmitted || isLeaveAutoDraft || row.locked}
                      title={(isSubmitted || isLeaveAutoDraft) ? "Cannot delete in this state" : row.locked ? "Cannot delete locked leave entry" : "Delete Row"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

            <tfoot className="bg-gray-50">
              {/* On-Premises Time Row */}
              <tr className="font-semibold bg-green-50">
                <td colSpan="3" className="p-3 border border-gray-200 text-gray-900">
                  On-Premises Time
                </td>
                {days.map((_, index) => (
                  <td key={index} className="p-3 border border-gray-200 text-green-700 text-center">
                    {formatHoursHHMM(onPremisesTime?.daily?.[index] ?? 0)}
                  </td>
                ))}
                <td className="p-3 border border-gray-200 text-green-700 font-bold text-center">
                  {formatHoursHHMM(onPremisesTime.weekly)}
                </td>
                <td className="p-3 border border-gray-200"></td>
              </tr>

              {/* Work Hours Totals */}
              <tr className="font-semibold">
                <td colSpan="3" className="p-3 border border-gray-200 text-gray-900">
                  Work Hours Total
                </td>
                {totals.daily.map((total, index) => (
                  <td key={index} className="p-3 border border-gray-200 text-gray-900 text-center">
                    {formatHoursHHMM(total)}
                  </td>
                ))}
                <td className="p-3 border border-gray-200 text-green-600 font-bold text-center">
                  {formatHoursHHMM(totals.weekly)}
                </td>
                <td className="p-3 border border-gray-200"></td>
              </tr>

              {/* Break Time Row - Removed per requirement */}
              {/* <tr className="font-semibold">
                <td colSpan="3" className="p-3 border border-gray-200 text-gray-900">
                  Break Time (Auto)
                </td>
                {days.map((_, index) => (
                  <td key={index} className="p-3 border border-gray-200 text-blue-600 text-center">
                    {formatHoursHHMM(computeBreakForDay(index))}
                  </td>
                ))}
                <td className="p-3 border border-gray-200 text-blue-600 font-bold text-center">
                  {formatHoursHHMM(computeWeeklyBreak())}
                </td>
                <td className="p-3 border border-gray-200"></td>
              </tr> */}

              {/* Total Hours */}
              <tr className="font-semibold bg-blue-50">
                <td colSpan="3" className="p-3 border border-gray-200 text-gray-900">
                  Total Hours
                </td>
                {totals.daily.map((total, index) => (
                  <td key={index} className={`p-3 border border-gray-200 text-center ${getDailyTotalWarningClass(index)}`}>
                    {getDailyTotalWithBreak(index)}
                  </td>
                ))}
                <td className="p-3 border border-gray-200 text-blue-700 font-bold text-center">
                  {getWeeklyTotalWithBreak()}
                </td>
                <td className="p-3 border border-gray-200"></td>
              </tr>
            </tfoot>
          </table>
        </div>


        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600 text-center md:text-left">
            Fill your timesheet and submit before the deadline
            {monthlyPermissionCount > 0 && (
              <span className={`ml-2 ${monthlyPermissionCount >= 3 ? 'text-red-600 font-bold' : 'text-orange-600'}`}>
                • Permissions used: {monthlyPermissionCount}/3
              </span>
            )}
            {hasUnsavedChanges && !isSubmitted && (
              <span className="ml-2 text-yellow-600 font-semibold">
                • Unsaved changes
              </span>
            )}
            {!allDaysSatisfied && !isSubmitted && (
              <span className="ml-2 text-red-600 font-semibold">
                • Minimum hours not met
              </span>
            )}
            {isSubmitted && (
              <span className="ml-2 text-green-600 font-semibold">
                • This week's timesheet has been submitted
              </span>
            )}
          </div>

          <button
            onClick={submitTimesheet}
            disabled={!allDaysSatisfied || loading || isSubmitted || isLeaveAutoDraft || mySpecials.some(s => s.status === 'PENDING')}
            className={`px-6 py-3 rounded font-medium transition-colors flex items-center justify-center gap-2 w-full md:w-auto ${(!allDaysSatisfied || loading || isSubmitted || isLeaveAutoDraft)
              || mySpecials.some(s => s.status === 'PENDING')
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[#262760] hover:bg-[#1e2050] text-white"
              }`}
          >

            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                SUBMITTING...
              </>
            ) : isSubmitted ? (
              "SUBMITTED ✓"
            ) : (
              <>
                <Send className="w-4 h-4" />
                {mySpecials.some(s => s.status === 'PENDING') ? "SPECIAL PERMISSION PENDING" : `SUBMIT WEEK (${getWeeklyTotalWithBreak()})`}
              </>
            )}
          </button>
        </div>
      </div>
      
      {showSpecialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
            <div className="p-4 border-b flex justify-between items-center">
              <div className="text-lg font-semibold text-gray-800">Special Permission Request</div>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowSpecialModal(false)}>✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <select
                  value={spDate ? new Date(spDate.getTime() - spDate.getTimezoneOffset() * 60000).toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                        // Manually parse YYYY-MM-DD to create local date
                        const [y, m, d] = val.split('-').map(Number);
                        const localDate = new Date(y, m - 1, d);
                        setSpDate(localDate);
                        calculateSpecialPermission(val);
                    } else {
                        setSpDate(null);
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                >
                  {weekDates.map((d, idx) => {
                    // Adjust to local ISO string for value
                    const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                    return (
                      <option key={idx} value={localISO}>
                        {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Auto Calculation Display */}
              {spDate && (
                <div className="bg-blue-50 p-3 rounded text-sm space-y-1 border border-blue-100">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Shift:</span>
                        <span className="font-medium">{spCalculation.shift || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">On-Premises Hours:</span>
                        <span className="font-medium">{formatHoursHHMM(spCalculation.onPremises)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Required Minimum:</span>
                        <span className="font-medium">{formatHoursHHMM(spCalculation.required)}</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-200 pt-1 mt-1">
                        <span className="text-blue-800 font-semibold">Balance (Shortage):</span>
                        <span className="text-blue-800 font-bold">{formatHoursHHMM(spCalculation.balance)}</span>
                    </div>
                    {!spCalculation.allowed && (
                        <div className="text-red-600 font-semibold mt-2 text-center">
                            {spCalculation.message}
                        </div>
                    )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={spReason}
                  onChange={(e) => setSpReason(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                  rows={3}
                />
              </div>
              
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button className="px-4 py-2 rounded border" onClick={() => setShowSpecialModal(false)}>Cancel</button>
              <button
                className={`px-4 py-2 rounded text-white ${!spCalculation.allowed ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#262760] hover:bg-[#1e2050]'}`}

                disabled={!spCalculation.allowed}
                onClick={async () => {
                  if (!spDate || !spReason.trim()) {
                    showError("Please fill all required fields (Date, Reason).");
                    return;
                  }
                  
                  // Use balance directly as request amount
                  const requestHours = spCalculation.balance;
                  
                  if (requestHours <= 0) {
                      showError("No shortage hours to request.");
                      return;
                  }

                  try {
                    const fd = new FormData();
                    const d = new Date(spDate);
                    const isoDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();
                    fd.append('date', isoDate);
                    fd.append('shift', spCalculation.shift || "");
                    // Send dummy times or empty strings as backend now accepts optional times
                    fd.append('fromTime', ""); 
                    fd.append('toTime', "");
                    fd.append('totalHours', requestHours);
                    fd.append('reason', spReason.trim());
                    if (spFile) fd.append('attachment', spFile);
                    await specialPermissionAPI.create(fd);
                    const weekStartStr = new Date(Date.UTC(weekDates[0].getFullYear(), weekDates[0].getMonth(), weekDates[0].getDate())).toISOString();
                    const weekEndStr = new Date(Date.UTC(weekDates[6].getFullYear(), weekDates[6].getMonth(), weekDates[6].getDate())).toISOString();
                    const spRes = await specialPermissionAPI.my({ weekStart: weekStartStr, weekEnd: weekEndStr, _t: Date.now() });
                    setMySpecials(Array.isArray(spRes.data?.data) ? spRes.data.data : []);
                    setShowSpecialModal(false);
                    showError("Special Permission submitted for approval.", "Success");
                  } catch (err) {
                    showError("Failed to submit Special Permission.");
                  }
                }}
              >
                Submit Request ({formatHoursHHMM(spCalculation.balance)})
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b text-sm font-semibold text-gray-800">Special Permission Requests (This Week)</div>
          <div className="p-4">
            {mySpecials.length === 0 ? (
              <div className="text-sm text-gray-500">No special permissions for this week.</div>
            ) : (
              <div className="space-y-2">
                {mySpecials
                  .filter((sp, index, self) => 
                    index === self.findIndex((t) => (
                      new Date(t.date).toDateString() === new Date(sp.date).toDateString()
                    ))
                  )
                  .map((sp) => {
                  const d = new Date(sp.date);
                  const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  const hh = String(Math.floor(Number(sp.totalHours || 0))).padStart(2, '0');
                  const mm = String(Math.round(((Number(sp.totalHours || 0)) - Math.floor(Number(sp.totalHours || 0))) * 60)).padStart(2, '0');
                  return (
                    <div key={sp._id} className="flex items-center justify-between text-sm border rounded p-2">
                      <div className="text-gray-700">{dateStr} • {hh}:{mm} • {sp.reason}</div>
                      <div className={`font-semibold ${sp.status === 'APPROVED' ? 'text-green-600' : sp.status === 'REJECTED' ? 'text-red-600' : 'text-yellow-600'}`}>
                        {sp.status}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Important Notes Section */}
      <div className="p-4  border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Important Notes:</h3>
        <ul className="text-xs text-gray-600 space-y-1">
          
          <li>• Shift timings:
            <ul className="ml-4 mt-1 space-y-1">
              <li>First Shift: 7:00 AM - 3:30 PM (Minimum 7h 15m required)</li>
              <li>Second Shift: 3:00 PM - 11:30 PM (Minimum 7h 15m required)</li>
              <li>General Shift: 9:30 AM - 7:00 PM (Minimum 8h 00m required)</li>
            </ul>
          </li>
          <li>• Monthly permission limit: Maximum 3 permission counts allowed per month</li>
          <li>• Permission duration: 1 hour increments only ( 1:00, 2:00)</li>
        </ul>
      </div>

      {/* Navigation Confirmation Dialog */}
      {showNavigationDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Unsaved Changes
            </h3>
            <p className="text-gray-600 mb-6">
              You have unsaved changes. What would you like to do?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelNavigation}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={discardAndNavigate}
                className="px-4 py-2 text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
              >
                Discard Changes
              </button>
              <button
                onClick={confirmSaveAndNavigate}
                className="px-4 py-2 bg-[#262760] text-white rounded hover:bg-[#1e2050] transition-colors"
              >
                Save Draft
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Error/Message Dialog */}
      {showErrorDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className={`text-lg font-semibold mb-4 ${errorTitle.toLowerCase().includes('success') ? 'text-green-600' : 'text-red-600'}`}>
              {errorTitle}
            </h3>
            <p className="text-gray-600 mb-6 whitespace-pre-line">
              {errorMessage}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowErrorDialog(false)}
                className={`px-4 py-2 text-white rounded transition-colors ${errorTitle.toLowerCase().includes('success') ? 'bg-green-600 hover:bg-green-700' : 'bg-[#262760] hover:bg-[#1e2050]'}`}
              >
                OK
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timesheet;
0
