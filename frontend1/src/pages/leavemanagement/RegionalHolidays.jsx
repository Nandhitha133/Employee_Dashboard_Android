import React, { useEffect, useMemo, useState } from "react";
import { employeeAPI, leaveAPI, regionalHolidayAPI } from "../../services/api";

const RegionalHolidays = () => {
  const getIsMobile = () => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(max-width: 768px)").matches;
  };

  const [isMobile, setIsMobile] = useState(getIsMobile);
  const [showFilters, setShowFilters] = useState(() => !getIsMobile());

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);

  const [filters, setFilters] = useState({
    employeeIdFromName: "",
    division: "",
    location: "",
    regionalHolidayName: ""
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [manualHolidayName, setManualHolidayName] = useState("");
  const [manualHolidayDate, setManualHolidayDate] = useState("");
  const [manualHolidayLocation, setManualHolidayLocation] = useState("");
  const [savedHolidays, setSavedHolidays] = useState([]);
  const [selectedSavedHolidayId, setSelectedSavedHolidayId] = useState("");

  const loadSavedHolidays = async () => {
    try {
      const res = await regionalHolidayAPI.list();
      const items = Array.isArray(res.data) ? res.data : [];
      const mapped = items
        .map((h) => ({
          id: String(h?.id || h?._id || ""),
          name: String(h?.name || "").trim(),
          date: String(h?.dateISO || "").trim(),
          location: String(h?.location || "").trim()
        }))
        .filter((h) => h.id && h.name && h.date);
      setSavedHolidays(mapped);
    } catch {
      setSavedHolidays([]);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await employeeAPI.getAllEmployees();
      const items = Array.isArray(res.data) ? res.data : [];
      const sorted = items.sort((a, b) => {
        const idA = String(a?.employeeId || "");
        const idB = String(b?.employeeId || "");
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: "base" });
      });
      setEmployees(sorted);
    } catch {
      setEmployees([]);
    }
  };

  const loadRegionalHolidays = async () => {
    setLoading(true);
    try {
      const res = await leaveAPI.list();
      const items = Array.isArray(res.data) ? res.data : [];

      const mapped = items
        .filter((l) => String(l.leaveType || "") === "REGIONAL_HOLIDAY")
        .map((l) => {
          const start = l.startDate ? new Date(l.startDate) : null;
          const startISO = start && !isNaN(start.getTime()) ? start.toISOString() : "";
          return {
            id: l._id,
            employeeId: l.employeeId || "",
            employeeName: l.employeeName || l.name || "",
            division: l.division || "",
            location: l.location || l.branch || "",
            regionalHolidayName: l.regionalHolidayName || "",
            status: l.status || "Pending",
            startDateRaw: l.startDate || "",
            startDateISO: startISO,
            dateLabel: start && !isNaN(start.getTime()) ? start.toLocaleDateString("en-GB") : "—"
          };
        })
        .sort((a, b) => (a.employeeId || "").localeCompare(b.employeeId || ""));

      setRows(mapped);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
    loadSavedHolidays();
    loadRegionalHolidays();
    const timer = setInterval(loadRegionalHolidays, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(max-width: 768px)");

    const apply = (matches) => {
      setIsMobile(matches);
      if (!matches) setShowFilters(true);
      if (matches) setShowFilters(false);
    };

    apply(mq.matches);

    const onChange = (e) => apply(e.matches);
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    return () => {
      if (typeof mq.removeEventListener === "function") mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  const employeeNameOptions = useMemo(() => {
    return employees
      .map((e) => {
        const employeeId = String(e?.employeeId || "");
        const employeeName = String(e?.name || e?.employeename || "").trim();
        if (!employeeId || !employeeName) return null;
        return { employeeId, employeeName };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const nameCompare = String(a.employeeName).localeCompare(String(b.employeeName), undefined, { sensitivity: "base" });
        if (nameCompare !== 0) return nameCompare;
        return String(a.employeeId).localeCompare(String(b.employeeId), undefined, { numeric: true, sensitivity: "base" });
      });
  }, [employees]);

  const divisionOptions = useMemo(() => {
    return Array.from(new Set(employees.map((e) => e?.division || e?.department).filter(Boolean))).sort((a, b) =>
      String(a).localeCompare(String(b))
    );
  }, [employees]);

  const locationOptions = useMemo(() => {
    return Array.from(new Set(employees.map((e) => e?.location || e?.branch).filter(Boolean))).sort((a, b) =>
      String(a).localeCompare(String(b))
    );
  }, [employees]);

  const uniqueHolidayNames = useMemo(() => {
    const fromRows = rows.map((r) => r.regionalHolidayName).filter(Boolean);
    const fromSaved = savedHolidays.map((h) => h.name).filter(Boolean);
    return Array.from(new Set([...fromRows, ...fromSaved])).sort((a, b) => a.localeCompare(b));
  }, [rows, savedHolidays]);

  const isFilterApplied = useMemo(() => {
    return Object.values(filters).some((v) => String(v || "").trim() !== "");
  }, [filters]);

  const filteredRows = useMemo(() => {
    const employeeIdFromName = String(filters.employeeIdFromName || "");
    const division = String(filters.division || "");
    const location = String(filters.location || "");
    const holidayName = String(filters.regionalHolidayName || "");

    return rows
      .filter((r) => {
        if (employeeIdFromName && String(r.employeeId || "") !== employeeIdFromName) return false;
        if (division && String(r.division || "") !== division) return false;
        if (location && String(r.location || "") !== location) return false;
        if (holidayName && String(r.regionalHolidayName || "") !== holidayName) return false;

        return true;
      })
      .sort((a, b) => (a.employeeId || "").localeCompare(b.employeeId || ""));
  }, [rows, filters]);

  const clearFilters = () => {
    setFilters({
      employeeIdFromName: "",
      division: "",
      location: "",
      regionalHolidayName: ""
    });
  };

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const getStatusBadgeClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "approved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "rejected") return "bg-red-50 text-red-700 border-red-200";
    if (s === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-gray-50 text-gray-700 border-gray-200";
  };

  const formatSavedDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB");
  };

  const onSaveManualHoliday = () => {
    const name = String(manualHolidayName || "").trim();
    const date = String(manualHolidayDate || "").trim();
    const location = String(manualHolidayLocation || "").trim();
    if (!name || !date) return;
    regionalHolidayAPI
      .create({ name, date, location })
      .then((resp) => {
        const createdId = String(resp?.data?.id || resp?.data?._id || "");
        loadSavedHolidays();
        if (createdId) setSelectedSavedHolidayId(createdId);
        setManualHolidayName("");
        setManualHolidayDate("");
        setManualHolidayLocation("");
      })
      .catch(() => {});
  };

  const onDeleteSavedHoliday = (id) => {
    regionalHolidayAPI
      .remove(id)
      .then(() => {
        loadSavedHolidays();
        if (selectedSavedHolidayId === id) setSelectedSavedHolidayId("");
      })
      .catch(() => {});
  };

  return (
    <div className="p-4">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 flex justify-end items-center border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-[#262760] text-white rounded-lg font-semibold hover:bg-[#1e2050] transition-colors"
            >
              Add Regional Holiday
            </button>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="px-4 py-2 bg-[#262760] text-white rounded-lg font-semibold hover:bg-[#1e2050] transition-colors"
            >
              {showFilters ? "Hide Filters" : "Show Filters"}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
              {isFilterApplied && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                >
                  Clear All Filters
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
                <select
                  value={filters.employeeIdFromName}
                  onChange={(e) => setFilter("employeeIdFromName", e.target.value)}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3"
                >
                  <option value="">All Employee Names</option>
                  {employeeNameOptions.map((e) => (
                    <option key={e.employeeId} value={e.employeeId}>
                      {e.employeeName} ({e.employeeId})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                <select
                  value={filters.division}
                  onChange={(e) => setFilter("division", e.target.value)}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3"
                >
                  <option value="">All Divisions</option>
                  {divisionOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  value={filters.location}
                  onChange={(e) => setFilter("location", e.target.value)}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3"
                >
                  <option value="">All Locations</option>
                  {locationOptions.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Regional Holiday</label>
                <select
                  value={filters.regionalHolidayName}
                  onChange={(e) => setFilter("regionalHolidayName", e.target.value)}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3"
                >
                  <option value="">All Holidays</option>
                  {uniqueHolidayNames.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Showing <span className="font-semibold">{filteredRows.length}</span> records
          </p>
          <div className="text-sm text-gray-600">{loading ? "Loading..." : ""}</div>
        </div>

        <div className="hidden lg:block border-t border-gray-200">
          <div className="overflow-x-auto">
            <div className="max-h-[650px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="sticky top-0 z-10 bg-[#262760]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                      S.No
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                      Employee ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                      Employee Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                      Division
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                      Location
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                      Regional Holiday
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRows.map((r, idx) => (
                    <tr key={r.id || `${r.employeeId}-${r.startDateISO}-${idx}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{idx + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.employeeId || "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.employeeName || "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.division || "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.location || "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.regionalHolidayName || "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.dateLabel}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClass(r.status)}`}>
                          {r.status || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">
                        No regional holiday records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:hidden">
          {filteredRows.map((r, idx) => (
            <div key={r.id || `${r.employeeId}-${r.startDateISO}-${idx}`} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{r.employeeName || "—"}</div>
                  <div className="text-xs text-blue-600 font-medium">{r.employeeId || "—"}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {r.division || "—"} • {r.location || "—"}
                  </div>
                  <div className="text-xs text-gray-800 mt-2">
                    <span className="font-semibold">Holiday:</span> {r.regionalHolidayName || "—"}
                  </div>
                  <div className="text-xs text-gray-800 mt-1">
                    <span className="font-semibold">Date:</span> {r.dateLabel}
                  </div>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClass(r.status)}`}>
                      {r.status || "—"}
                    </span>
                  </div>
                </div>
                <div className="text-xs font-semibold text-gray-500">{idx + 1}</div>
              </div>
            </div>
          ))}
          {!loading && filteredRows.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-500">No regional holiday records found</div>
          )}
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#262760] to-[#1e2050] px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Add Regional Holiday</h3>
               
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="border border-emerald-100 rounded-xl p-4 bg-emerald-50">
               
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Regional Holiday Name</label>
                    <input
                      type="text"
                      value={manualHolidayName}
                      onChange={(e) => setManualHolidayName(e.target.value)}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2.5 px-3 bg-white"
                      placeholder="Enter holiday name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={manualHolidayDate}
                      onChange={(e) => setManualHolidayDate(e.target.value)}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2.5 px-3 bg-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <select
                      value={manualHolidayLocation}
                      onChange={(e) => setManualHolidayLocation(e.target.value)}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2.5 px-3 bg-white"
                    >
                      <option value="">All Locations / General</option>
                      {locationOptions.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      if (!selectedSavedHolidayId) return;
                      onDeleteSavedHoliday(selectedSavedHolidayId);
                    }}
                    disabled={!selectedSavedHolidayId}
                    className="px-4 py-2 rounded-lg border border-red-300 text-red-700 bg-white hover:bg-red-50 transition-colors disabled:opacity-50 disabled:hover:bg-white"
                  >
                    Delete
                  </button>
                  <button
                    onClick={onSaveManualHoliday}
                    disabled={!String(manualHolidayName || "").trim() || !String(manualHolidayDate || "").trim()}
                    className="px-4 py-2 rounded-lg bg-[#262760] text-white hover:bg-[#1e2050] transition-colors disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>

              <div className="border border-purple-100 rounded-xl p-4 bg-purple-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-purple-800">Saved Regional Holidays</div>
                  <div className="text-xs font-semibold text-purple-700 bg-white border border-purple-200 px-2 py-1 rounded-full">
                    {savedHolidays.length}
                  </div>
                </div>

                {savedHolidays.length === 0 ? (
                  <div className="text-sm text-gray-700">No saved holidays yet.</div>
                ) : (
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-purple-100 bg-white">
                    <div className="divide-y divide-gray-100">
                      {savedHolidays.map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => setSelectedSavedHolidayId(h.id)}
                          className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between gap-3 hover:bg-purple-50 ${
                            selectedSavedHolidayId === h.id ? "bg-purple-50" : ""
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate">{h.name}</div>
                            <div className="text-xs text-gray-600 mt-0.5">
                              {formatSavedDate(h.date)} {h.location && `• ${h.location}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-2 py-1 rounded-full">
                              Saved
                            </span>
                            <span
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDeleteSavedHoliday(h.id);
                              }}
                              className="text-xs font-semibold text-red-700 bg-red-50 border border-red-100 px-2 py-1 rounded-full"
                              role="button"
                              tabIndex={0}
                            >
                              Delete
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegionalHolidays;
