import React, { useEffect, useState } from "react";
import { attendanceApprovalAPI } from "../../services/api";
import useNotification from "../../hooks/useNotification";
import Notification from "../../components/Notifications/Notification";

const AttendanceApproval = () => {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [locationFilter, setLocationFilter] = useState("");
  const [updatingIds, setUpdatingIds] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null);
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  const load = async () => {
    setLoading(true);
    try {
      const res = await attendanceApprovalAPI.list(
        statusFilter ? { status: statusFilter } : undefined
      );
      const list = Array.isArray(res.data?.requests) ? res.data.requests : [];
      const grouped = (() => {
        const map = new Map();
        for (const r of list) {
          const dateKey = new Date(r.inTime).toISOString().split("T")[0];
          const key = `${r.employeeId}|${dateKey}`;
          const currentUpdated = new Date(r.updatedAt || r.reviewedAt || r.submittedAt || r.createdAt || 0).getTime();
          const existing = map.get(key);
          const existingUpdated = existing ? new Date(existing.updatedAt || existing.reviewedAt || existing.submittedAt || existing.createdAt || 0).getTime() : -1;
          if (!existing || currentUpdated >= existingUpdated) {
            map.set(key, r);
          }
        }
        return Array.from(map.values());
      })();
      setRequests(grouped);
    } catch (error) {
      setRequests([]);
      const msg = error.response?.data?.message || "Failed to load requests";
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const approve = async (id) => {
    setUpdatingIds((prev) => [...prev, id]);
    setRequests((prev) => prev.map((r) => (r._id === id ? { ...r, status: "Approved" } : r)));
    try {
      await attendanceApprovalAPI.approve(id);
      showSuccess("Request approved");
      await load();
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to approve request";
      showError(msg);
      await load();
    } finally {
      setUpdatingIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const reject = async (id) => {
    setUpdatingIds((prev) => [...prev, id]);
    setRequests((prev) => prev.map((r) => (r._id === id ? { ...r, status: "Rejected" } : r)));
    try {
      await attendanceApprovalAPI.reject(id, "");
      showSuccess("Request rejected");
      await load();
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to reject request";
      showError(msg);
      await load();
    } finally {
      setUpdatingIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const formatDateTime = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-IN", { hour12: true });
    } catch {
      return iso;
    }
  };

  const formatHours = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.round((secs % 3600) / 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const styles = {
    container: {
  width: "100%",
  padding: "20px",
  boxSizing: "border-box",
},

    header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" },
    title: { fontSize: "20px", fontWeight: 700, color: "#1a202c" },
    controls: { display: "flex", gap: "8px", alignItems: "center" },
    select: { padding: "8px", border: "1px solid #e2e8f0", borderRadius: "6px" },
    table: { width: "100%", borderCollapse: "collapse", backgroundColor: "#fff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
    th: { backgroundColor: "#262760", textAlign: "left", padding: "12px", fontSize: "12px", color: "#ffffff", borderBottom: "1px solid #1e2050" },

    td: { padding: "12px", borderBottom: "1px solid #edf2f7", fontSize: "14px", color: "#1a202c" },
    actions: { display: "flex", gap: "8px" },
    btn: { padding: "6px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer" },
    approveBtn: { backgroundColor: "#16a34a", color: "#fff", border: "none" },
    rejectBtn: { backgroundColor: "#ef4444", color: "#fff", border: "none" },
    btnSecondary: { padding: "8px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", backgroundColor: "#fff", cursor: "pointer" },
    btnPrimary: { padding: "8px 12px", borderRadius: "6px", backgroundColor: "#262760", color: "#fff", border: "none", cursor: "pointer", transition: "background-color 0.2s" },

    completedText: { fontSize: "12px", color: "#4a5568" },
    modalOverlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
    modalContent: { width: "420px", backgroundColor: "#fff", borderRadius: "10px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", overflow: "hidden" },
    modalHeader: { padding: "14px 16px", borderBottom: "1px solid #edf2f7", display: "flex", alignItems: "center", justifyContent: "space-between" },
    modalTitle: { fontSize: "16px", fontWeight: 700, color: "#2d3748" },
    modalBody: { padding: "16px" },
    modalFooter: { padding: "12px 16px", borderTop: "1px solid #edf2f7", display: "flex", justifyContent: "flex-end", gap: "8px" },
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
  };

  const uniqueLocations = [...new Set(requests.map((r) => r.location).filter(Boolean))];
  const filteredRequests = requests.filter((r) => {
    if (!locationFilter) return true;
    return r.location === locationFilter;
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Attendance Approval</div>
        <div style={styles.controls}>
          <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} style={styles.select}>
            <option value="">All Locations</option>
            {uniqueLocations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.select}>
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <button 
            style={{ ...styles.btn, ...styles.btnSecondary }} 
            onClick={load} 
            disabled={loading}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#f7fafc";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#fff";
            }}
          >
            Refresh
          </button>

        </div>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Employee Name</th>
            <th style={styles.th}>Employee ID</th>
            <th style={styles.th}>Location</th>
            <th style={styles.th}>IN</th>
            <th style={styles.th}>OUT</th>
            <th style={styles.th}>Hours</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Actions</th>
          </tr>
          
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={8} style={styles.td}>Loading...</td></tr>
          ) : filteredRequests.length === 0 ? (
            <tr><td colSpan={8} style={styles.td}>No records</td></tr>
          ) : (
            filteredRequests.map((r) => (
              <tr key={r._id}>
                <td style={styles.td}>{r.employeeName}</td>
                <td style={styles.td}>{r.employeeId}</td>
                <td style={styles.td}>{r.location || "-"}</td>
                <td style={styles.td}>{formatDateTime(r.inTime)}</td>
                <td style={styles.td}>{formatDateTime(r.outTime)}</td>
                <td style={styles.td}>{formatHours(Number(r.workDurationSeconds || 0))}</td>
                <td style={styles.td}>
                  <span style={styles.statusBadge(r.status)}>{r.status}</span>
                </td>
                <td style={styles.td}>
                  {r.status === "Pending" && !updatingIds.includes(r._id) ? (
                    <div style={styles.actions}>
                      <button
                        style={{ ...styles.btn, ...styles.approveBtn }}
                        onClick={() => setConfirmAction({ id: r._id, type: "approve" })}
                      >
                        Approve
                      </button>
                      <button
                        style={{ ...styles.btn, ...styles.rejectBtn }}
                        onClick={() => setConfirmAction({ id: r._id, type: "reject" })}
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span style={styles.completedText}>Completed</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {confirmAction && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>
                {confirmAction.type === "approve" ? "Confirm Approval" : "Confirm Rejection"}
              </div>
              
            </div>
            <div style={styles.modalBody}>
              {confirmAction.type === "approve" ? "Are you sure you want to approve this request?" : "Are you sure you want to reject this request?"}
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnSecondary} onClick={() => setConfirmAction(null)}>Cancel</button>
              <button
                style={styles.btnPrimary}
                onClick={async () => {
                  const id = confirmAction.id;
                  const type = confirmAction.type;
                  setConfirmAction(null);
                  if (type === "approve") {
                    await approve(id);
                  } else {
                    await reject(id);
                  }
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "#1e2050"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "#262760"}
              >
                Confirm
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

export default AttendanceApproval;
