import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Users,
  MapPin,
  Lock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Info,
  CalendarDays,
  ShieldAlert,
  Building,
  RotateCcw,
  Check,
  X
} from "lucide-react";
import { employeeAPI, conferenceBookingAPI } from "../../services/api";

// Helper to get local date string YYYY-MM-DD
const getLocalDateString = (date) => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const timeSlots = [
  { value: "09:00", label: "09:00 AM" },
  { value: "09:30", label: "09:30 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "10:30", label: "10:30 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "11:30", label: "11:30 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "12:30", label: "12:30 PM" },
  { value: "13:00", label: "01:00 PM" },
  { value: "13:30", label: "01:30 PM" },
  { value: "14:00", label: "02:00 PM" },
  { value: "14:30", label: "02:30 PM" },
  { value: "15:00", label: "03:00 PM" },
  { value: "15:30", label: "03:30 PM" },
  { value: "16:00", label: "04:00 PM" },
  { value: "16:30", label: "04:30 PM" },
  { value: "17:00", label: "05:00 PM" },
  { value: "17:30", label: "05:30 PM" },
  { value: "18:00", label: "06:00 PM" },
  { value: "18:30", label: "06:30 PM" },
  { value: "19:00", label: "07:00 PM" },
  { value: "19:30", label: "07:30 PM" },
  { value: "20:00", label: "08:00 PM" },
  { value: "20:30", label: "08:30 PM" },
  { value: "21:00", label: "09:00 PM" }
];

export default function OfficeSync() {
  const [myEmployee, setMyEmployee] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nowClock, setNowClock] = useState(new Date());

  // Real-time clock to trigger immediate room status updates
  useEffect(() => {
    const timer = setInterval(() => {
      setNowClock(new Date());
    }, 5000); // Check every 5 seconds for responsive, near-instant releases
    return () => clearInterval(timer);
  }, []);

  // Calendar states
  const [viewMode, setViewMode] = useState("day"); // day, week, month
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Forms states
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [newBooking, setNewBooking] = useState({
    title: "",
    date: getLocalDateString(new Date()),
    startTime: "09:00",
    endTime: "10:00",
    reason: ""
  });
  const [conflictError, setConflictError] = useState(null);
  const [alternativeSlots, setAlternativeSlots] = useState([]);

  // Block Slot Form (HR/Admin)
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockData, setBlockData] = useState({
    date: getLocalDateString(new Date()),
    startTime: "12:00",
    endTime: "13:00",
    reason: "Maintenance / Corporate Meeting"
  });

  // Admin approval notes
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminComments, setAdminComments] = useState("");
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [actionType, setActionType] = useState(""); // Approve or Reject

  const getBookingStartTimeSlots = () => {
    const todayStr = getLocalDateString(nowClock);
    if (newBooking.date === todayStr) {
      const currentMin = nowClock.getHours() * 60 + nowClock.getMinutes();
      return timeSlots.slice(0, -1).filter(slot => {
        const [h, m] = slot.value.split(":").map(Number);
        return (h * 60 + m) >= currentMin;
      });
    }
    return timeSlots.slice(0, -1);
  };

  const getBookingEndTimeSlots = () => {
    const startMin = timeToMin(newBooking.startTime);
    return timeSlots.slice(1).filter(slot => {
      const [h, m] = slot.value.split(":").map(Number);
      return (h * 60 + m) > startMin;
    });
  };

  const getBlockStartTimeSlots = () => {
    const todayStr = getLocalDateString(nowClock);
    if (blockData.date === todayStr) {
      const currentMin = nowClock.getHours() * 60 + nowClock.getMinutes();
      return timeSlots.slice(0, -1).filter(slot => {
        const [h, m] = slot.value.split(":").map(Number);
        return (h * 60 + m) >= currentMin;
      });
    }
    return timeSlots.slice(0, -1);
  };

  const getBlockEndTimeSlots = () => {
    const startMin = timeToMin(blockData.startTime);
    return timeSlots.slice(1).filter(slot => {
      const [h, m] = slot.value.split(":").map(Number);
      return (h * 60 + m) > startMin;
    });
  };

  // Automatically adjust selected start time if date is today and start time has passed
  useEffect(() => {
    const todayStr = getLocalDateString(nowClock);
    if (newBooking.date === todayStr) {
      const currentMin = nowClock.getHours() * 60 + nowClock.getMinutes();
      const validSlots = timeSlots.slice(0, -1).filter(slot => {
        const [h, m] = slot.value.split(":").map(Number);
        return (h * 60 + m) >= currentMin;
      });
      if (validSlots.length > 0) {
        const isCurrentValValid = validSlots.some(s => s.value === newBooking.startTime);
        if (!isCurrentValValid) {
          const nextStart = validSlots[0].value;
          const [sh, sm] = nextStart.split(":").map(Number);
          const nextEndMin = sh * 60 + sm + 60;
          const nextEnd = nextEndMin <= 1260 ? minToTime(nextEndMin) : "21:00";
          setNewBooking(prev => ({
            ...prev,
            startTime: nextStart,
            endTime: nextEnd
          }));
        }
      }
    }
  }, [newBooking.date, nowClock]);

  useEffect(() => {
    const todayStr = getLocalDateString(nowClock);
    if (blockData.date === todayStr) {
      const currentMin = nowClock.getHours() * 60 + nowClock.getMinutes();
      const validSlots = timeSlots.slice(0, -1).filter(slot => {
        const [h, m] = slot.value.split(":").map(Number);
        return (h * 60 + m) >= currentMin;
      });
      if (validSlots.length > 0) {
        const isCurrentValValid = validSlots.some(s => s.value === blockData.startTime);
        if (!isCurrentValValid) {
          const nextStart = validSlots[0].value;
          const [sh, sm] = nextStart.split(":").map(Number);
          const nextEndMin = sh * 60 + sm + 60;
          const nextEnd = nextEndMin <= 1260 ? minToTime(nextEndMin) : "21:00";
          setBlockData(prev => ({
            ...prev,
            startTime: nextStart,
            endTime: nextEnd
          }));
        }
      }
    }
  }, [blockData.date, nowClock]);

  // Automatically adjust end time if it becomes less than or equal to start time
  useEffect(() => {
    const startMin = timeToMin(newBooking.startTime);
    const endMin = timeToMin(newBooking.endTime);
    if (endMin <= startMin) {
      const nextEndMin = startMin + 60;
      const nextEnd = nextEndMin <= 1260 ? minToTime(nextEndMin) : "21:00";
      setNewBooking(prev => ({
        ...prev,
        endTime: nextEnd
      }));
    }
  }, [newBooking.startTime]);

  useEffect(() => {
    const startMin = timeToMin(blockData.startTime);
    const endMin = timeToMin(blockData.endTime);
    if (endMin <= startMin) {
      const nextEndMin = startMin + 60;
      const nextEnd = nextEndMin <= 1260 ? minToTime(nextEndMin) : "21:00";
      setBlockData(prev => ({
        ...prev,
        endTime: nextEnd
      }));
    }
  }, [blockData.startTime]);

  // Load user profile & verification
  useEffect(() => {
    const init = async () => {
      try {
        const userSaved = JSON.parse(sessionStorage.getItem("user") || "{}");
        setCurrentUser(userSaved);

        const res = await employeeAPI.getMyProfile();
        if (res && res.data) {
          setMyEmployee(res.data);
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Load Bookings
  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const res = await conferenceBookingAPI.getAll();
      if (res && res.data) {
        setBookings(res.data);
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Role & Designation Checks
  const userRole = currentUser?.role?.toLowerCase() || "";
  const employeeDesignation = myEmployee?.designation?.trim().toLowerCase() || "";
  const employeePosition = myEmployee?.position?.trim().toLowerCase() || "";

  const isHRorAdmin = ["admin", "hr", "director"].includes(userRole) ||
    ["admin", "hr", "director"].includes(employeeDesignation);

  const isTLorManager = ["teamlead", "manager", "projectmanager", "project_manager"].includes(userRole) ||
    ["team lead", "reporting manager", "project manager", "manager", "tl"].some(d =>
      employeeDesignation.includes(d) || employeePosition.includes(d)
    );
  const canBook = isHRorAdmin || isTLorManager;

  // Access Control check
  const hasAccess = useMemo(() => {
    // Admin, HR, and Director bypass location and division restrictions to manage the room Company-wide
    if (isHRorAdmin) return true;

    if (!myEmployee) return false;

    const location = myEmployee.location?.trim().toLowerCase() || "";
    const division = myEmployee.division?.replace(/\s+/g, "").toLowerCase() || "";

    const isHosur = location === "hosur";
    const isMatchingDivision = ["sds", "tekla", "das(software)", "das"].includes(division);

    return isHosur && isMatchingDivision;
  }, [myEmployee, isHRorAdmin]);

  // Helpers for times / dates
  const formatTime = (timeStr) => {
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  const getWeekDays = (date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    startOfWeek.setDate(diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const getMonthDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    // Pad days from previous month to align with Sunday
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  // Filter bookings for current views
  const activeBookings = useMemo(() => {
    const list = bookings.filter(b => b.status !== "Rejected" && b.status !== "Cancelled");
    const viewDates = new Set();
    viewDates.add(getLocalDateString(currentDate));
    try {
      getWeekDays(currentDate).forEach(d => viewDates.add(getLocalDateString(d)));
    } catch(e) {}
    try {
      getMonthDays(currentDate).forEach(d => viewDates.add(getLocalDateString(d)));
    } catch(e) {}
    viewDates.forEach(dateStr => {
      list.push({
        _id: `lunch-${dateStr}`,
        title: "Lunch Break",
        bookedBy: "SYSTEM",
        bookedByName: "Company Rule",
        bookedByEmail: "",
        division: "All",
        location: "Hosur",
        date: dateStr,
        startTime: "13:00",
        endTime: "13:45",
        status: "Blocked",
        reason: "Lunch Break (1:00 PM - 1:45 PM)",
        adminComments: "",
        isLunchBreak: true
      });
    });
    return list;
  }, [bookings, currentDate]);

  // Current real-time room availability status with strict logic
  const currentRoomStatus = useMemo(() => {
    const todayStr = getLocalDateString(nowClock);
    const currentMin = nowClock.getHours() * 60 + nowClock.getMinutes();

    // 1. Check if there is an active meeting/block now
    const activeMeeting = activeBookings.find(b => {
      if (b.date !== todayStr) return false;
      const [sh, sm] = b.startTime.split(":").map(Number);
      const [eh, em] = b.endTime.split(":").map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      return currentMin >= startMin && currentMin < endMin;
    });

    if (activeMeeting) {
      if (activeMeeting.isLunchBreak) {
        return {
          status: "Lunch Break",
          label: "Lunch Break",
          meeting: activeMeeting
        };
      }
      if (activeMeeting.status === "Blocked") {
        return {
          status: "Maintenance",
          label: "Maintenance Mode",
          meeting: activeMeeting
        };
      }
      return {
        status: "Occupied",
        label: `Occupied (${activeMeeting.division})`,
        meeting: activeMeeting
      };
    }

    // 2. Check if there is an upcoming meeting starting within the next 60 minutes
    const upcomingMeeting = activeBookings.find(b => {
      if (b.date !== todayStr) return false;
      const [sh, sm] = b.startTime.split(":").map(Number);
      const startMin = sh * 60 + sm;
      return startMin > currentMin && startMin <= currentMin + 60;
    });

    if (upcomingMeeting) {
      return {
        status: "Upcoming Slot",
        label: `Upcoming Slot: ${upcomingMeeting.division} (${formatTime(upcomingMeeting.startTime)} - ${formatTime(upcomingMeeting.endTime)})`,
        meeting: upcomingMeeting
      };
    }

    // Default to Available
    return { status: "Available", label: "Available", meeting: null };
  }, [activeBookings, nowClock]);

  // Handlers
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setConflictError(null);
    setAlternativeSlots([]);

    const startMin = timeToMin(newBooking.startTime);
    const endMin = timeToMin(newBooking.endTime);
    const openingMin = timeToMin("09:00");
    const closingMin = timeToMin("21:00");

    if (startMin < openingMin || endMin > closingMin) {
      alert("Conference room can only be booked during business hours (9:00 AM - 9:00 PM).");
      return;
    }

    if (startMin >= endMin) {
      alert("Start time must be before end time.");
      return;
    }

    try {
      const res = await conferenceBookingAPI.create(newBooking);
      if (res && res.data) {
        setBookingModalOpen(false);
        setNewBooking({
          title: "",
          date: new Date().toISOString().split("T")[0],
          startTime: "09:00",
          endTime: "10:00",
          reason: ""
        });
        fetchBookings();
        alert("Booking submitted and approved successfully!");
      }
    } catch (err) {
      if (err.response?.data?.conflict) {
        setConflictError("Conference Room Already Booked");
        setAlternativeSlots(err.response.data.alternatives || []);
      } else {
        alert(err.response?.data?.message || "Failed to book conference room.");
      }
    }
  };

  const handleBlockSubmit = async (e) => {
    e.preventDefault();
    try {
      await conferenceBookingAPI.block(blockData);
      setBlockModalOpen(false);
      fetchBookings();
      alert("Time slot successfully blocked.");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to block slot.");
    }
  };

  const handleStatusUpdate = async (id, status, comments) => {
    try {
      await conferenceBookingAPI.updateStatus(id, { status, adminComments: comments });
      setApprovalModalOpen(false);
      setSelectedRequest(null);
      setAdminComments("");
      fetchBookings();
      alert(`Booking ${status.toLowerCase()} successfully.`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update booking status.");
    }
  };

  const navigateDate = (direction) => {
    const newD = new Date(currentDate);
    if (viewMode === "day") {
      newD.setDate(currentDate.getDate() + direction);
    } else if (viewMode === "week") {
      newD.setDate(currentDate.getDate() + direction * 7);
    } else if (viewMode === "month") {
      newD.setMonth(currentDate.getMonth() + direction);
    }
    setCurrentDate(newD);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-slate-800">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-650 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-slate-650 font-medium">Loading Office Sync Module...</p>
        </div>
      </div>
    );
  }

  // Access Denied Screen
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-white text-slate-800 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500" />
          <div className="h-20 w-20 bg-red-50 border border-red-150 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-600">
            <ShieldAlert size={44} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed font-medium">
            The <strong className="text-slate-850 font-bold">Office Sync</strong> conference room booking system is exclusively restricted to employees based in the <strong className="text-slate-850 font-bold">Hosur</strong> branch belonging to the <strong className="text-slate-850 font-bold">SDS</strong>, <strong className="text-slate-850 font-bold">TEKLA</strong>, or <strong className="text-slate-850 font-bold">DAS (Software)</strong> divisions.
          </p>

          <div className="bg-white rounded-xl p-4 text-left border border-slate-200 mb-6 space-y-2 shadow-sm">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">Your Location:</span>
              <span className={`font-bold ${myEmployee?.location?.toLowerCase() === "hosur" ? "text-green-600" : "text-red-600"}`}>
                {myEmployee?.location || "Not Set"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">Your Division:</span>
              <span className={`font-bold ${["sds", "tekla", "das(software)", "das"].includes(myEmployee?.division?.replace(/\s+/g, "").toLowerCase()) ? "text-green-600" : "text-red-650"}`}>
                {myEmployee?.division || "Not Set"}
              </span>
            </div>
          </div>

          <button
            onClick={() => window.history.back()}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold py-3 px-6 rounded-xl transition duration-200"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-white text-slate-800 p-6 space-y-6">

      {/* Header section */}
      <div className="flex justify-end items-center gap-3">
        {canBook && (
          <button
            onClick={() => setBookingModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-sm py-2.5 px-5 rounded-xl transition-all duration-300 shadow-md shadow-slate-900/10 hover:shadow-slate-900/20 flex items-center gap-2 transform hover:-translate-y-0.5"
          >
            <Plus size={16} />
            <span>Book Conference Room</span>
          </button>
        )}
        {isHRorAdmin && (
          <button
            onClick={() => setBlockModalOpen(true)}
            className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm py-2.5 px-5 rounded-xl border border-slate-300 transition-all duration-300 flex items-center gap-2 shadow-sm hover:shadow transform hover:-translate-y-0.5"
          >
            <Lock size={15} className="text-rose-500" />
            <span>Block Time Slot</span>
          </button>
        )}
      </div>

      {/* Real-time Availability & Info Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Availability Banner */}
        <div className={`border-2 rounded-2xl p-5 flex items-center justify-between gap-4 transition-all duration-300 shadow-sm ${currentRoomStatus.status === "Available"
            ? "bg-gradient-to-r from-emerald-50/80 to-teal-50/50 border-emerald-450 text-emerald-900 border-l-4 border-l-emerald-500"
            : ["Blocked", "Occupied"].includes(currentRoomStatus.status)
              ? "bg-gradient-to-r from-rose-50/80 to-red-50/50 border-rose-450 text-rose-900 border-l-4 border-l-rose-500"
              : ["Upcoming Slot", "Lunch Break"].includes(currentRoomStatus.status)
                ? "bg-gradient-to-r from-amber-50/80 to-yellow-50/50 border-amber-450 text-amber-900 border-l-4 border-l-amber-500"
                : "bg-gradient-to-r from-slate-50/80 to-slate-100/50 border-slate-450 text-slate-900 border-l-4 border-l-slate-500"
          }`}>
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${currentRoomStatus.status === "Available"
                ? "bg-emerald-500/20 text-emerald-700 border border-emerald-550/20"
                : ["Blocked", "Occupied"].includes(currentRoomStatus.status)
                  ? "bg-rose-500/20 text-rose-700 border border-rose-550/20"
                  : ["Upcoming Slot", "Lunch Break"].includes(currentRoomStatus.status)
                    ? "bg-amber-500/20 text-amber-700 border border-amber-550/20"
                    : "bg-slate-200 text-slate-650 border border-slate-300"
              }`}>
              <Clock size={24} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-extrabold opacity-75">Room Status</div>
              <div className="text-xl font-black tracking-tight">
                {currentRoomStatus.label}
              </div>
              {currentRoomStatus.meeting ? (
                <div className="text-xs mt-1 font-bold opacity-90">
                  {currentRoomStatus.status === "Lunch Break"
                    ? `Lunch hour until ${formatTime(currentRoomStatus.meeting.endTime)}`
                    : currentRoomStatus.status === "Maintenance"
                      ? `Maintenance until ${formatTime(currentRoomStatus.meeting.endTime)}`
                      : currentRoomStatus.status === "Occupied"
                        ? `In use by ${currentRoomStatus.meeting.bookedByName} until ${formatTime(currentRoomStatus.meeting.endTime)}`
                        : currentRoomStatus.status === "Upcoming Slot"
                          ? ""
                          : `Blocked Slot until ${formatTime(currentRoomStatus.meeting.endTime)}`}
                </div>
              ) : (
                <div className="text-xs mt-1 font-bold opacity-90">
                  Ready for new bookings
                </div>
              )}
            </div>
          </div>

          {/* Animated Status Pulse Badge */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm shrink-0">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentRoomStatus.status === "Available"
                  ? "bg-emerald-550"
                  : ["Blocked", "Occupied"].includes(currentRoomStatus.status)
                    ? "bg-rose-550"
                    : ["Upcoming Slot", "Lunch Break"].includes(currentRoomStatus.status)
                      ? "bg-amber-550"
                      : "bg-slate-550"
                }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${currentRoomStatus.status === "Available"
                  ? "bg-emerald-550"
                  : ["Blocked", "Occupied"].includes(currentRoomStatus.status)
                    ? "bg-rose-550"
                    : ["Upcoming Slot", "Lunch Break"].includes(currentRoomStatus.status)
                      ? "bg-amber-550"
                      : "bg-slate-550"
                }`}></span>
            </span>
            <span className="text-[10px] font-extrabold tracking-wider uppercase text-slate-500">Live</span>
          </div>
        </div>

        {/* User context info */}
        <div className="bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm border-l-4 border-l-violet-400">
          <div className="h-12 w-12 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-700 shadow-inner">
            <User size={22} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-450">Your Booking Profile</div>
            <div className="text-sm font-black text-slate-800">{myEmployee?.name || currentUser?.name}</div>
            <div className="text-xs text-slate-600 font-bold">{myEmployee?.division} • {myEmployee?.designation ? `${myEmployee.designation} • ` : ""}<span className="text-indigo-600">{userRole.toUpperCase()}</span></div>
          </div>
        </div>

        {/* Active room details */}
        <div className="bg-gradient-to-br from-purple-50/40 via-white to-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm border-l-4 border-l-purple-400">
          <div className="h-12 w-12 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shadow-inner">
            <Building size={22} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-450">Conference Room</div>
            <div className="text-sm font-black text-slate-800">Swaminathan Room</div>
            <div className="text-xs text-slate-600 font-bold">Capacity: 12-15 seats • <span className="text-purple-650">TV • Whiteboard</span></div>
          </div>
        </div>
      </div>

      {/* Main Grid: Calendar System & Approvals Column */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Calendar Column */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col space-y-6 shadow-sm">

          {/* Calendar Navigation header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateDate(-1)}
                className="p-2 hover:bg-slate-105 rounded-lg border border-slate-200 transition text-slate-700"
              >
                <ChevronLeft size={16} />
              </button>
              <h2 className="text-lg font-bold min-w-[150px] text-center text-slate-800">
                {viewMode === "day" && currentDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                {viewMode === "week" && `Week of ${getWeekDays(currentDate)[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                {viewMode === "month" && currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </h2>
              <button
                onClick={() => navigateDate(1)}
                className="p-2 hover:bg-slate-105 rounded-lg border border-slate-200 transition text-slate-700"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="text-xs text-indigo-650 hover:text-indigo-750 font-bold ml-2 flex items-center gap-1"
              >
                <RotateCcw size={12} />
                <span>Today</span>
              </button>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start">
              {["day", "week", "month"].map(m => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`text-xs font-black py-1.5 px-4 rounded-lg transition-all duration-200 capitalize ${viewMode === m
                      ? "bg-gradient-to-r from-indigo-600 to-violet-650 text-white shadow-md shadow-indigo-600/10"
                      : "text-slate-600 hover:text-indigo-600 hover:bg-slate-200/50"
                    }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

{/* Render Calendar Day View */}
          {viewMode === "day" && (
            <div className="space-y-4">
              {Array.from({ length: 12 }).map((_, idx) => {
                const hour = idx + 9; // 9:00 AM to 9:00 PM
                const timeString = `${hour.toString().padStart(2, "0")}:00`;

                // Find bookings active during this hour
                const hourBookings = activeBookings.filter(b => {
                  const dateStr = getLocalDateString(currentDate);
                  if (b.date !== dateStr) return false;

                  const startMin = timeToMin(b.startTime);
                  const endMin = timeToMin(b.endTime);
                  const rowStartMin = hour * 60;
                  const rowEndMin = (hour + 1) * 60;

                  return startMin < rowEndMin && endMin > rowStartMin;
                });

                return (
                  <div key={hour} className="flex gap-4 border-b border-slate-100 pb-4 items-start">
                    <span className="text-xs font-bold text-slate-450 w-16 pt-1">
                      {formatTime(timeString)}
                    </span>
                    <div className="flex-1 min-h-[50px]">
                      {hourBookings.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {hourBookings.map(b => (
                            <div
                              key={b._id}
                              className={`p-3.5 rounded-xl border flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200 ${(() => {
                                  const todayStr = getLocalDateString(nowClock);
                                  const isFinished = b.date < todayStr || (b.date === todayStr && (nowClock.getHours() * 60 + nowClock.getMinutes()) >= timeToMin(b.endTime));
                                   if (b.isLunchBreak) {
                                     if (isFinished) {
                                       return "bg-slate-50 border-slate-200 text-slate-500 opacity-80 border-l-4 border-l-slate-400 sm:col-span-2 text-center items-center justify-center";
                                     }
                                     return "bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border-amber-200 border-l-4 border-l-amber-500 text-amber-955 sm:col-span-2 text-center items-center justify-center";
                                   }
                                   if (isFinished) {
                                     return "bg-slate-50 border-slate-200 text-slate-500 opacity-80 border-l-4 border-l-slate-400 sm:col-start-2";
                                   }
                                  if (b.status === "Blocked") {
                                    return "bg-gradient-to-r from-slate-50 to-slate-100/50 border-slate-300 border-l-4 border-l-slate-500 text-slate-800";
                                  }
                                  const creatorRole = b.bookedByRole?.toLowerCase() || "";
                                  const isAdminOrHr = ["admin", "hr", "director"].includes(creatorRole);
                                  if (["Approved", "Reserved"].includes(b.status)) {
                                    if (isAdminOrHr) {
                                      return "bg-gradient-to-r from-indigo-50/70 to-violet-50/30 border-indigo-200 border-l-4 border-l-indigo-550 text-indigo-950";
                                    } else {
                                      return "bg-gradient-to-r from-emerald-50/70 to-teal-50/30 border-emerald-200 border-l-4 border-l-emerald-550 text-emerald-950";
                                    }
                                  }
                                  return "bg-gradient-to-r from-amber-50/70 to-yellow-50/30 border-amber-200 border-l-4 border-l-amber-550 text-amber-950";
                                })()
                                }`}
                            >
                              {(() => {
                                const todayStr = getLocalDateString(nowClock);
                                const isFinished = b.date < todayStr || (b.date === todayStr && (nowClock.getHours() * 60 + nowClock.getMinutes()) >= timeToMin(b.endTime));
                                const creatorRole = b.bookedByRole?.toLowerCase() || "";
                                const isAdminOrHr = ["admin", "hr", "director"].includes(creatorRole);
                                const currentMin = nowClock.getHours() * 60 + nowClock.getMinutes();
                                const isOngoing = b.date === todayStr && currentMin >= timeToMin(b.startTime) && currentMin < timeToMin(b.endTime);

                                let displayStatus = b.status;
                                let badgeColorClass = "";

                                if (isFinished) {
                                  displayStatus = b.isLunchBreak ? "Lunch Finished" : (b.status === "Blocked" ? "Work Finished" : "Meeting Finished");
                                  badgeColorClass = "bg-slate-300 text-slate-600 border border-slate-400/20";
                                } else if (isOngoing) {
                                  displayStatus = b.status === "Blocked" ? "Blocked" : "Meeting Ongoing";
                                  badgeColorClass = ["Approved", "Reserved"].includes(b.status)
                                    ? (isAdminOrHr ? "bg-indigo-600 text-white shadow-sm shadow-indigo-650/10" : "bg-emerald-600 text-white shadow-sm shadow-emerald-650/10")
                                    : b.status === "Blocked"
                                      ? "bg-slate-500 text-white"
                                      : "bg-amber-500 text-white shadow-sm";
                                } else {
                                  badgeColorClass = ["Approved", "Reserved"].includes(b.status)
                                    ? (isAdminOrHr ? "bg-indigo-600 text-white shadow-sm shadow-indigo-650/10" : "bg-emerald-600 text-white shadow-sm shadow-emerald-650/10")
                                    : b.status === "Blocked"
                                      ? "bg-slate-500 text-white"
                                      : "bg-amber-500 text-white shadow-sm";
                                }

                                return (
                                  <div className={`flex items-center gap-2 w-full ${b.isLunchBreak ? "justify-center" : "justify-between"}`}>
                                    <span className="font-extrabold text-sm tracking-tight text-slate-900">{b.title}</span>
                                    {(!b.isLunchBreak || isFinished) && (
                                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0 ${badgeColorClass}`}>
                                        {displayStatus}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                              <div className={`flex items-center gap-4 text-xs mt-3 text-slate-650 font-bold ${b.isLunchBreak ? "justify-center" : ""}`}>
                                <div className="flex items-center gap-1 text-indigo-650">
                                  <Clock size={12} />
                                  <span>{formatTime(b.startTime)} - {formatTime(b.endTime)}</span>
                                </div>
                                {!b.isLunchBreak && (
                                  <div className="flex items-center gap-1 text-purple-650">
                                    <User size={12} />
                                    <span className="truncate max-w-[120px]">{b.bookedByName} ({b.division})</span>
                                  </div>
                                )}
                              </div>
                              {b.bookedBy === myEmployee?.employeeId && 
                               ["Pending", "Reserved"].includes(b.status) && 
                               !(b.date < getLocalDateString(nowClock) || (b.date === getLocalDateString(nowClock) && (nowClock.getHours() * 60 + nowClock.getMinutes()) >= timeToMin(b.startTime))) && (
                                <button
                                  onClick={() => handleStatusUpdate(b._id, "Cancelled")}
                                  className="text-[10px] font-extrabold text-rose-600 hover:text-rose-700 self-end mt-3 border-b border-dashed border-rose-450 hover:border-rose-600 transition"
                                >
                                  Cancel Booking
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-full border border-dashed border-slate-200 rounded-xl flex items-center justify-center p-3 text-xs text-slate-450 bg-slate-50/30 hover:bg-slate-50/60 transition cursor-pointer">
                          No bookings scheduled.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Render Calendar Week View */}
          {viewMode === "week" && (
            <div className="grid grid-cols-7 gap-2">
              {getWeekDays(currentDate).map((day, dIdx) => {
                const dateStr = getLocalDateString(day);
                const dayBookings = activeBookings.filter(b => b.date === dateStr);
                const isToday = getLocalDateString(new Date()) === dateStr;

                return (
                  <div key={dIdx} className={`border rounded-xl p-3 min-h-[300px] flex flex-col space-y-3 shadow-sm transition-all duration-200 ${isToday
                      ? "bg-gradient-to-b from-indigo-50/40 via-white to-white border-indigo-300 border-t-4 border-t-indigo-600"
                      : "bg-slate-50/30 border-slate-200 hover:border-slate-300"
                     }`}>
                    <div className="text-center border-b border-slate-200 pb-2">
                      <div className={`text-[10px] font-black uppercase ${isToday ? "text-indigo-650" : "text-slate-450"}`}>
                        {day.toLocaleDateString("en-US", { weekday: "short" })}
                      </div>
                      <div className={`text-base font-black mt-0.5 ${isToday ? "text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-full inline-block" : "text-slate-800"}`}>
                        {day.getDate()}
                      </div>
                    </div>

                    <div className="flex-1 space-y-2 overflow-y-auto max-h-[220px]">
                      {dayBookings.length > 0 ? (
                        dayBookings.map(b => (
                          <div
                            key={b._id}
                            className={`p-2 rounded-lg border text-[10px] flex flex-col shadow-inner transition-all ${(() => {
                                  const todayStr = getLocalDateString(nowClock);
                                  const isFinished = b.date < todayStr || (b.date === todayStr && (nowClock.getHours() * 60 + nowClock.getMinutes()) >= timeToMin(b.endTime));
                                  if (isFinished) {
                                    return "bg-slate-50 border-slate-200 text-slate-400 opacity-60";
                                  }
                                  if (b.status === "Blocked") {
                                    return "bg-slate-100 border-slate-300 border-l-2 border-l-slate-500 text-slate-700";
                                  }
                                  const creatorRole = b.bookedByRole?.toLowerCase() || "";
                                  const isAdminOrHr = ["admin", "hr", "director"].includes(creatorRole);
                                  if (["Approved", "Reserved"].includes(b.status)) {
                                    if (isAdminOrHr) {
                                      return "bg-indigo-50/90 border-indigo-205 border-l-2 border-l-indigo-600 text-indigo-900 font-bold";
                                    } else {
                                      return "bg-emerald-50/90 border-emerald-205 border-l-2 border-l-emerald-600 text-emerald-900 font-bold";
                                    }
                                  }
                                  return "bg-amber-50/90 border-amber-205 border-l-2 border-l-amber-600 text-amber-900 font-bold";
                                })()
                              }`}
                          >
                            <span className="font-extrabold truncate">{b.title}</span>
                            <span className="mt-1 font-bold opacity-80">{formatTime(b.startTime)} - {formatTime(b.endTime)}</span>
                            {(() => {
                              const todayStr = getLocalDateString(nowClock);
                              const isFinished = b.date < todayStr || (b.date === todayStr && (nowClock.getHours() * 60 + nowClock.getMinutes()) >= timeToMin(b.endTime));
                              const currentMin = nowClock.getHours() * 60 + nowClock.getMinutes();
                              const isOngoing = b.date === todayStr && currentMin >= timeToMin(b.startTime) && currentMin < timeToMin(b.endTime);

                              if (isFinished) {
                                return (
                                  <span className="text-[8px] font-black text-slate-500 uppercase mt-1">
                                     {b.isLunchBreak ? "Lunch Finished" : (b.status === "Blocked" ? "Work Finished" : "Meeting Finished")}
                                  </span>
                                );
                              }
                              if (isOngoing && !b.isLunchBreak) {
                                return (
                                  <span className="text-[8px] font-black text-indigo-650 uppercase mt-1 animate-pulse">
                                    Meeting Ongoing
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400 block text-center mt-6 font-bold uppercase tracking-wider opacity-60">Free</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Render Calendar Month View */}
          {viewMode === "month" && (
            <div className="grid grid-cols-7 gap-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(w => (
                <div key={w} className="text-center text-xs font-black text-indigo-700 pb-2 uppercase tracking-wide">
                  {w}
                </div>
              ))}
              {getMonthDays(currentDate).map((day, dIdx) => {
                const dateStr = getLocalDateString(day);
                const dayBookings = activeBookings.filter(b => b.date === dateStr);
                const isToday = getLocalDateString(new Date()) === dateStr;
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();

                return (
                  <div
                    key={dIdx}
                    onClick={() => {
                      setCurrentDate(day);
                      setViewMode("day");
                    }}
                    className={`border rounded-xl p-2 min-h-[90px] flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${isToday
                        ? "bg-gradient-to-br from-indigo-50 to-white border-indigo-400 shadow-sm border-t-2 border-t-indigo-600"
                        : isCurrentMonth
                          ? "bg-white border-slate-200 hover:border-indigo-200"
                          : "bg-slate-50/50 border-slate-150 text-slate-400"
                      }`}
                  >
                    <span className={`text-xs font-black self-end ${isToday ? "text-indigo-650 bg-indigo-50 px-1.5 py-0.5 rounded-full" : isCurrentMonth ? "text-slate-600" : "text-slate-400"}`}>
                      {day.getDate()}
                    </span>
                    <div className="mt-1">
                      {dayBookings.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm ${dayBookings.some(b => b.status === "Blocked")
                              ? "bg-slate-500 text-white"
                              : dayBookings.every(b => ["Approved", "Reserved"].includes(b.status))
                                ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                                : "bg-gradient-to-r from-amber-500 to-yellow-500 text-white"
                            }`}>
                            {dayBookings.length} {dayBookings.length === 1 ? "meet" : "meets"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Info & Guidelines Column (1/4 Column) */}
        <div className="lg:col-span-1 space-y-6">

          {/* Guidelines Strip */}
          <div className="bg-gradient-to-br from-indigo-50/40 via-slate-50/20 to-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm border-l-4 border-l-purple-500">
            <h3 className="text-sm uppercase tracking-wider font-black text-indigo-750 flex items-center gap-2 border-b border-slate-200/60 pb-3">
              <Info size={16} className="text-indigo-600 animate-bounce" />
              <span>Booking Rules</span>
            </h3>
            <ul className="text-xs text-slate-650 space-y-3 list-disc list-inside font-bold leading-relaxed">
              <li>Open daily from 9:00 AM to 9:00 PM.</li>
              <li>Only TLs and Managers can schedule meeting slots.</li>
              <li>No manual approval required; slots are booked instantly.</li>
              <li>Overlap checking blocks scheduling conflicts automatically.</li>
              <li>Time entries in 12-hour format (e.g., 02:30) are automatically converted to PM.</li>
            </ul>
          </div>

        </div>

      </div>

      {/* BOOKING MODAL */}
      {bookingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl relative">
            <div className="p-6 border-b border-slate-200 flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-900">Book Swaminathan Conference Room</h3>
              <p className="text-xs text-slate-500 mt-1">Schedule a new session in the conference room.</p>
            </div>

            <form onSubmit={handleBookingSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {conflictError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-650 space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle size={14} />
                    <span>{conflictError}</span>
                  </div>
                  {alternativeSlots.length > 0 && (
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-550 text-[11px]">Suggested Alternative Timings:</p>
                      <div className="flex flex-wrap gap-2">
                        {alternativeSlots.map((slot, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setNewBooking(prev => ({
                                ...prev,
                                startTime: slot.startTime,
                                endTime: slot.endTime
                              }));
                              setConflictError(null);
                            }}
                            className="bg-indigo-650/10 hover:bg-indigo-650/20 text-indigo-650 text-[10px] font-bold py-1 px-2.5 rounded-lg border border-indigo-500/20 transition"
                          >
                            {slot.startTime} - {slot.endTime}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Meeting Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekly SDS Team Review"
                  value={newBooking.title}
                  onChange={e => setNewBooking({ ...newBooking, title: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Booking Date</label>
                <input
                  type="date"
                  required
                  min={getLocalDateString(new Date())}
                  value={newBooking.date}
                  onChange={e => setNewBooking({ ...newBooking, date: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-4 text-sm text-slate-900 focus:outline-none focus:border-indigo-600 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Start Time</label>
                  <select
                    value={newBooking.startTime}
                    onChange={e => setNewBooking({ ...newBooking, startTime: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-4 text-sm text-slate-900 focus:outline-none focus:border-indigo-600 transition"
                  >
                    {getBookingStartTimeSlots().map(slot => (
                      <option key={slot.value} value={slot.value}>{slot.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">End Time</label>
                  <select
                    value={newBooking.endTime}
                    onChange={e => setNewBooking({ ...newBooking, endTime: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-4 text-sm text-slate-900 focus:outline-none focus:border-indigo-600 transition"
                  >
                    {getBookingEndTimeSlots().map(slot => (
                      <option key={slot.value} value={slot.value}>{slot.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Agenda / Reason</label>
                <textarea
                  placeholder="Describe details or requirements..."
                  value={newBooking.reason}
                  onChange={e => setNewBooking({ ...newBooking, reason: e.target.value })}
                  rows={3}
                  className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-4 text-sm text-slate-900 focus:outline-none focus:border-indigo-600 transition"
                />
              </div>

              <div className="flex gap-3 pt-4 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setBookingModalOpen(false);
                    setConflictError(null);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl border border-slate-300 text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl text-sm transition"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BLOCK SLOT MODAL */}
      {blockModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Block Conference Room</h3>
              <p className="text-xs text-slate-500 mt-1">Reserve room for maintenance, corporate operations or emergencies.</p>
            </div>

            <form onSubmit={handleBlockSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Date to Block</label>
                <input
                  type="date"
                  required
                  min={getLocalDateString(new Date())}
                  value={blockData.date}
                  onChange={e => setBlockData({ ...blockData, date: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-4 text-sm text-slate-900 focus:outline-none focus:border-indigo-600 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Start Time</label>
                  <select
                    value={blockData.startTime}
                    onChange={e => setBlockData({ ...blockData, startTime: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-4 text-sm text-slate-900 focus:outline-none focus:border-indigo-600 transition"
                  >
                    {getBlockStartTimeSlots().map(slot => (
                      <option key={slot.value} value={slot.value}>{slot.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">End Time</label>
                  <select
                    value={blockData.endTime}
                    onChange={e => setBlockData({ ...blockData, endTime: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-4 text-sm text-slate-900 focus:outline-none focus:border-indigo-600 transition"
                  >
                    {getBlockEndTimeSlots().map(slot => (
                      <option key={slot.value} value={slot.value}>{slot.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Reason</label>
                <input
                  type="text"
                  required
                  value={blockData.reason}
                  onChange={e => setBlockData({ ...blockData, reason: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-4 text-sm text-slate-900 focus:outline-none focus:border-indigo-600 transition"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setBlockModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl border border-slate-300 text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl text-sm transition"
                >
                  Block Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



    </div>
  );
}

// Helper to convert time to minutes from midnight
function timeToMin(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

// Helper to convert minutes to time string HH:MM
function minToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
