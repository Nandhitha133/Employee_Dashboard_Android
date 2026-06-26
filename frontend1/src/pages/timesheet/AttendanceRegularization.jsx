import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Edit, Calendar } from "lucide-react";
import { timesheetAPI, attendanceAPI, attendanceApprovalAPI } from "../../services/api";
import useNotification from "../../hooks/useNotification";
import Notification from "../../components/Notifications/Notification";

const AttendanceRegularization = () => {
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [inDate, setInDate] = useState("");
  const [inTime, setInTime] = useState("");
  const [outDate, setOutDate] = useState("");
  const [outTime, setOutTime] = useState("");
  const [modalError, setModalError] = useState("");
  const [myRequestsByDate, setMyRequestsByDate] = useState({});
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");

  const monthRange = useMemo(() => {
    const start = new Date(Date.UTC(month.getFullYear(), month.getMonth(), 1));
    const end = new Date(Date.UTC(month.getFullYear(), month.getMonth() + 1, 0));
    return {
      startISO: start.toISOString(),
      endISO: end.toISOString(),
    };
  }, [month]);

  const formatDate = (isoDate) => {
    try {
      const d = new Date(isoDate);
      const dd = String(d.getUTCDate()).padStart(2, "0");
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const mmm = months[d.getUTCMonth()];
      const yyyy = d.getUTCFullYear();
      return `${dd}-${mmm}-${yyyy}`;
    } catch {
      return isoDate;
    }
  };

  const formatTime = (isoDate) => {
    if (!isoDate) return "-";
    try {
      const d = new Date(isoDate);
      return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    } catch {
      return "-";
    }
  };

  const formatHours = (h) => {
    const hours = Math.floor(h);
    const minutes = Math.round((h - hours) * 60);
    const mm = String(minutes).padStart(2, "0");
    return `${hours}:${mm} hrs`;
  };

  const prevMonth = () => {
    const d = new Date(month);
    d.setMonth(d.getMonth() - 1);
    setMonth(d);
  };

  const nextMonth = () => {
    const d = new Date(month);
    d.setMonth(d.getMonth() + 1);
    
    // Prevent navigating to future months
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    if (d > currentMonth) {
      return;
    }
    
    setMonth(d);
  };

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const res = await timesheetAPI.getAttendanceData({
        startDate: monthRange.startISO,
        endDate: monthRange.endISO,
        _t: Date.now(),
      });
      const recs = Array.isArray(res.data?.records) ? res.data.records : [];
      
      // Generate all days for the month
      const start = new Date(Date.UTC(month.getFullYear(), month.getMonth(), 1));
      const end = new Date(Date.UTC(month.getFullYear(), month.getMonth() + 1, 0));
      
      // If viewing current month, stop at today
      const now = new Date();
      const isCurrentMonth = now.getFullYear() === month.getFullYear() && now.getMonth() === month.getMonth();
      let finalEnd = end;
      
      if (isCurrentMonth) {
        const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        if (todayUTC < end) {
          finalEnd = todayUTC;
        }
      }

      const allDays = [];
      const current = new Date(start);
      while (current <= finalEnd) {
        allDays.push(current.toISOString().split("T")[0]);
        current.setUTCDate(current.getUTCDate() + 1);
      }

      // Merge records with all days
      const fullRecords = allDays.map(dateKey => {
        const found = recs.find(r => r.date === dateKey);
        return found || {
          date: dateKey,
          punchIn: null,
          punchOut: null,
          hours: 0
        };
      });

      setRecords(fullRecords);
      setWeeklyHours(Number(res.data?.weeklyHours || 0));
    } catch {
      setRecords([]);
      setWeeklyHours(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
    loadMyRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthRange.startISO, monthRange.endISO]);

  const loadMyRequests = async () => {
    try {
      const employeeId =
        user.employeeId ||
        user.employeeCode ||
        user.empId ||
        user.id ||
        "";
      const userId = user.id || user._id;

      console.log("Loading requests for Employee ID:", employeeId);

      const res = await attendanceApprovalAPI.list();
      const list = Array.isArray(res.data?.requests) ? res.data.requests : [];
      
      console.log("All requests fetched:", list.length);

      const mine = list.filter((r) => {
        const matchesEmpId = String(r.employeeId) === String(employeeId);
        const matchesSubmitted = userId && String(r.submittedBy) === String(userId);
        return matchesEmpId || matchesSubmitted;
      });
      
      console.log("My requests found:", mine.length);

      const byDate = {};
      for (const r of mine) {
        // Convert ISO time to local YYYY-MM-DD to match the table rows
        const d = new Date(r.inTime);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const dateKey = `${year}-${month}-${day}`;

        const existing = byDate[dateKey];
        const existingUpdated = existing ? new Date(existing.updatedAt || existing.reviewedAt || existing.submittedAt || existing.createdAt || 0).getTime() : -1;
        const currentUpdated = new Date(r.updatedAt || r.reviewedAt || r.submittedAt || r.createdAt || 0).getTime();
        
        if (!existing || currentUpdated >= existingUpdated) {
          byDate[dateKey] = r;
        }
      }
      console.log("Mapped by date:", Object.keys(byDate));
      setMyRequestsByDate(byDate);
    } catch (err) {
      console.error("Error loading my requests:", err);
      setMyRequestsByDate({});
    }
  };

  const openEdit = (rec) => {
    setEditingRecord(rec);
    const baseDateKey = new Date(rec.punchIn || rec.date).toISOString().split("T")[0];
    setInDate(baseDateKey);
    setOutDate(baseDateKey);
    setInTime(rec.punchIn ? new Date(rec.punchIn).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }) : "");
    setOutTime(rec.punchOut ? new Date(rec.punchOut).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }) : "");
    setModalError("");
    setShowEditModal(true);
  };

  const closeEdit = () => {
    setShowEditModal(false);
    setEditingRecord(null);
    setInDate("");
    setInTime("");
    setOutDate("");
    setOutTime("");
    setModalError("");
  };

  const combineDateAndTime = (dateISO, timeStr) => {
    if (!timeStr) return null;
    const dateKey = new Date(dateISO).toISOString().split("T")[0];
    const dt = new Date(`${dateKey}T${timeStr}`);
    return dt.toISOString();
  };

  const computePreview = () => {
    try {
      if (!inDate || !inTime || !outDate || !outTime) return null;
      const inDt = new Date(`${inDate}T${inTime}`);
      const outDt = new Date(`${outDate}T${outTime}`);
      if (outDt <= inDt) return null;
      const diffMs = outDt - inDt;
      const hours = diffMs / (1000 * 60 * 60);
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} hours`;
    } catch {
      return null;
    }
  };

  const saveEdit = async () => {
    if (!editingRecord) return;
    const employeeId =
      user.employeeId ||
      user.employeeCode ||
      user.empId ||
      user.id ||
      "";

    if (!employeeId) {
      closeEdit();
      return;
    }

    if (!inDate || !inTime || !outDate || !outTime) {
      return;
    }

    const inISO = combineDateAndTime(inDate, inTime);
    const outISO = combineDateAndTime(outDate, outTime);

    const inDt = new Date(inISO);
    const outDt = new Date(outISO);
    if (outDt <= inDt) {
      setModalError("In Time must be less than Out Time");
      return;
    }

    // Check if there are any changes
    const originalInDate = new Date(editingRecord.punchIn || editingRecord.date).toISOString().split("T")[0];
    const originalOutDate = new Date(editingRecord.punchOut || editingRecord.date).toISOString().split("T")[0];
    const originalInTime = editingRecord.punchIn ? new Date(editingRecord.punchIn).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }) : "";
    const originalOutTime = editingRecord.punchOut ? new Date(editingRecord.punchOut).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }) : "";

    const originalInISO = combineDateAndTime(originalInDate, originalInTime);
    const originalOutISO = combineDateAndTime(originalOutDate, originalOutTime);

    // Normalize milliseconds to 0 for comparison as input type="time" doesn't handle milliseconds
    const normalizeDate = (iso) => {
      if (!iso) return null;
      const d = new Date(iso);
      d.setMilliseconds(0);
      d.setSeconds(0);
      return d.getTime();
    };

    const isChanged = normalizeDate(inISO) !== normalizeDate(originalInISO) || 
                      normalizeDate(outISO) !== normalizeDate(originalOutISO);

    if (!isChanged) {
      setModalError("No changes detected");
      return;
    }

    const durationSeconds = Math.round((outDt - inDt) / 1000);

    try {
      setLoading(true);
      setModalError("");
      await attendanceApprovalAPI.request({
        employeeId,
        email: user.email,
        inTime: inISO,
        outTime: outISO,
        workDurationSeconds: durationSeconds,
      });
      showSuccess("Request sent successfully");
      closeEdit();
      await loadMyRequests();
    } catch (error) {
      console.error("Save error:", error);
      const msg = error.response?.data?.message || "Failed to save request";
      setModalError(msg);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
  width: "100%",
  padding: "20px",
  boxSizing: "border-box",
},

    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "16px",
    },
    title: {
      fontSize: "20px",
      fontWeight: 700,
      color: "#1a202c",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    monthNav: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    monthLabel: {
      fontWeight: 600,
      color: "#2d3748",
    },
    tableContainer: {
      width: "100%",
      maxHeight: "calc(100vh - 200px)",
      overflowY: "auto",
      backgroundColor: "#fff",
      borderRadius: "8px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      border: "1px solid #e2e8f0",
    },
    table: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: 0,
    },
    th: {
      backgroundColor: "#262760",
      textAlign: "left",
      padding: "12px",
      fontSize: "12px",
      color: "#ffffff",
      borderBottom: "1px solid #1e2050",
      position: "sticky",
      top: 0,
      zIndex: 1,
    },

    td: {
      padding: "12px",
      borderBottom: "1px solid #edf2f7",
      fontSize: "14px",
      color: "#1a202c",
    },
    row: {
      backgroundColor: "#fff",
    },
    actionsCell: {
      textAlign: "right",
    },
    statusBadge: (status) => {
      const colors = {
        Pending: { bg: "#fff7ed", text: "#c05621" },
        Approved: { bg: "#f0fdf4", text: "#15803d" },
        Rejected: { bg: "#fef2f2", text: "#b91c1c" },
      };
      const c = colors[status] || { bg: "#f7fafc", text: "#4a5568" };
      return {
        backgroundColor: c.bg,
        color: c.text,
        padding: "4px 8px",
        borderRadius: "9999px",
        fontSize: "12px",
        fontWeight: "600",
        display: "inline-block",
      };
    },
    editButton: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 10px",
      backgroundColor: "#262760",
      color: "#fff",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      fontSize: "12px",
      transition: "background-color 0.2s",
    },

    editButtonDisabled: {
      backgroundColor: "#a0aec0",
      cursor: "not-allowed",
      opacity: 0.7,
    },
    invalidInput: {
      borderColor: "#e53e3e",
      backgroundColor: "#fff5f5",
      boxShadow: "0 0 0 1px #e53e3e inset",
    },
    btnPrimaryDisabled: {
      backgroundColor: "#a0aec0",
      cursor: "not-allowed",
      opacity: 0.7,
    },
    modalOverlay: {
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    },
    modalContent: {
      width: "420px",
      backgroundColor: "#fff",
      borderRadius: "10px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
      overflow: "hidden",
    },
    modalHeader: {
      padding: "14px 16px",
      borderBottom: "1px solid #edf2f7",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    modalTitle: {
      fontSize: "16px",
      fontWeight: 700,
      color: "#2d3748",
    },
    modalBody: {
      padding: "16px",
      display: "grid",
      gap: "12px",
    },
    field: {
      display: "grid",
      gap: "6px",
    },
    label: {
      fontSize: "12px",
      color: "#4a5568",
      fontWeight: 600,
    },
    input: {
      padding: "8px",
      border: "1px solid #e2e8f0",
      borderRadius: "6px",
      fontSize: "14px",
    },
    modalFooter: {
      padding: "12px 16px",
      borderTop: "1px solid #edf2f7",
      display: "flex",
      justifyContent: "flex-end",
      gap: "8px",
    },
    btnSecondary: {
      padding: "8px 12px",
      borderRadius: "6px",
      border: "1px solid #e2e8f0",
      backgroundColor: "#fff",
      cursor: "pointer",
    },
    btnPrimary: {
      padding: "8px 12px",
      borderRadius: "6px",
      backgroundColor: "#262760",
      color: "#fff",
      border: "none",
      cursor: "pointer",
      transition: "background-color 0.2s",
    },

    summary: {
      marginTop: "10px",
      color: "#4a5568",
      fontSize: "12px",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>
          
          
        </div>
        <div style={styles.monthNav}>
          <button onClick={prevMonth} style={styles.btnSecondary}>
            <ChevronLeft size={16} />
          </button>
          <div style={styles.monthLabel}>
            {month.toLocaleString("en-IN", { month: "long", year: "numeric" })}
          </div>
          <button onClick={nextMonth} style={styles.btnSecondary}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>IN Time</th>
              <th style={styles.th}>OUT Time</th>
              <th style={styles.th}>Total Hours</th>
              <th style={styles.th}>Request Status</th>
              <th style={{ ...styles.th, textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ ...styles.td, textAlign: "center" }}>Loading...</td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ ...styles.td, textAlign: "center" }}>No attendance records</td>
              </tr>
            ) : (
              records.map((rec, idx) => (

                <tr key={`${rec.date}|${idx}`} style={styles.row}>
                  <td style={styles.td}>{formatDate(rec.date)}</td>
                  <td style={styles.td}>{formatTime(rec.punchIn)}</td>
                  <td style={styles.td}>{formatTime(rec.punchOut)}</td>
                  <td style={styles.td}>{formatHours(rec.hours || 0)}</td>
                  <td style={styles.td}>
                    {myRequestsByDate[rec.date] ? (
                      <span style={styles.statusBadge(myRequestsByDate[rec.date].status)}>
                        {myRequestsByDate[rec.date].status}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td style={{ ...styles.td, ...styles.actionsCell }}>
                    {(() => {
                      const status = myRequestsByDate[rec.date]?.status;
                      const isApproved = status === "Approved";
                      
                      // User wants to be able to edit even if approved
                      return (
                        <button
                          style={styles.editButton}
                          onClick={() => openEdit(rec)}
                          onMouseEnter={(e) => e.target.style.backgroundColor = "#1e2050"}
                          onMouseLeave={(e) => e.target.style.backgroundColor = "#262760"}
                        >
                          <Edit size={14} /> Edit
                        </button>

                      );
                    })()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={styles.summary}>
        Total Hours (month range): {formatHours(weeklyHours || 0)}
      </div>

      {showEditModal && editingRecord && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>Edit Day</div>
              {/* <button style={styles.btnSecondary} onClick={closeEdit}>Closes</button> */}
            </div>
            <div style={styles.modalBody}>
              <div style={styles.field}>
                <div style={styles.label}>IN Date</div>
                <input
                  type="date"
                  value={inDate}
                  onChange={(e) => setInDate(e.target.value)}
                  style={{ 
                    ...styles.input,
                    ...(inDate ? {} : styles.invalidInput)
                  }}
                />
              </div>
              <div style={styles.field}>
                <div style={styles.label}>IN Time</div>
                <input
                  type="time"
                  value={inTime}
                  onChange={(e) => setInTime(e.target.value)}
                  style={{ 
                    ...styles.input,
                    ...(inTime ? {} : styles.invalidInput)
                  }}
                />
              </div>
              <div style={styles.field}>
                <div style={styles.label}>OUT Date</div>
                <input
                  type="date"
                  value={outDate}
                  onChange={(e) => setOutDate(e.target.value)}
                  style={{ 
                    ...styles.input,
                    ...(outDate ? {} : styles.invalidInput)
                  }}
                />
              </div>
              <div style={styles.field}>
                <div style={styles.label}>OUT Time</div>
                <input
                  type="time"
                  value={outTime}
                  onChange={(e) => setOutTime(e.target.value)}
                  style={{ 
                    ...styles.input,
                    ...(outTime ? {} : styles.invalidInput)
                  }}
                />
              </div>
              <div style={styles.field}>
                <div style={styles.label}>Calculated Total</div>
                <div>{computePreview() || "-"}</div>
              </div>
              {modalError && (
                <div style={{ color: "#e53e3e", fontSize: "14px", marginTop: "8px" }}>
                  {modalError}
                </div>
              )}
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnSecondary} onClick={closeEdit}>Cancel</button>
              <button
                style={{
                  ...styles.btnPrimary,
                  ...((!inDate || !inTime || !outDate || !outTime) ? styles.btnPrimaryDisabled : {})
                }}
                disabled={!inDate || !inTime || !outDate || !outTime}
                onClick={saveEdit}
                onMouseEnter={(e) => {
                  if (!(!inDate || !inTime || !outDate || !outTime)) {
                    e.target.style.backgroundColor = "#1e2050";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(!inDate || !inTime || !outDate || !outTime)) {
                    e.target.style.backgroundColor = "#262760";
                  }
                }}
              >
                Save
              </button>

            </div>
          </div>
        </div>
      )}

      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />
    </div>
  );
};

export default AttendanceRegularization;
