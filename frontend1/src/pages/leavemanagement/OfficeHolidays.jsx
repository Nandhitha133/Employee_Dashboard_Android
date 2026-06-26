import React, { useEffect, useMemo, useState } from "react";
import { officeHolidayAPI } from "../../services/api";

const OfficeHolidays = () => {
  const getFinancialYearLabelForDate = (dateValue) => {
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return "";
    const startYear = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
    const endYearSuffix = String(startYear + 1).slice(2);
    return `${startYear}-${endYearSuffix}`;
  };

  const getPreviousFinancialYearLabel = () => {
    const now = new Date();
    const currentStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const prevStartYear = currentStartYear - 1;
    const prevEndYearSuffix = String(prevStartYear + 1).slice(2);
    return `${prevStartYear}-${prevEndYearSuffix}`;
  };

  const getCalendarYearForDate = (dateValue) => {
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return "";
    return String(d.getFullYear());
  };

  const getIsMobile = () => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(max-width: 768px)").matches;
  };

  const [isMobile, setIsMobile] = useState(getIsMobile);
  const [loading, setLoading] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [yearFilter, setYearFilter] = useState(getFinancialYearLabelForDate(new Date()));
  const [calendarYearFilter, setCalendarYearFilter] = useState(() => {
    const y = String(new Date().getFullYear());
    return ["2025", "2026", "2027", "2028"].includes(y) ? y : "All";
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [manualHolidayName, setManualHolidayName] = useState("");
  const [manualHolidayDate, setManualHolidayDate] = useState("");
  const [selectedSavedHolidayId, setSelectedSavedHolidayId] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadOfficeHolidays = async () => {
    setLoading(true);
    try {
      const res = await officeHolidayAPI.list();
      const items = Array.isArray(res.data) ? res.data : [];
      const mapped = items
        .map((h) => ({
          id: String(h?.id || h?._id || ""),
          name: String(h?.name || "").trim(),
          date: String(h?.dateISO || "").trim()
        }))
        .filter((h) => h.id && h.name && h.date)
        .sort((a, b) => {
          const d = String(a.date).localeCompare(String(b.date));
          if (d !== 0) return d;
          return String(a.name).localeCompare(String(b.name));
        });
      setHolidays(mapped);
    } catch {
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfficeHolidays();
  }, []);

  const availableYears = useMemo(() => {
    const years = holidays
      .map((h) => getFinancialYearLabelForDate(String(h?.date || "").trim()))
      .filter((fy) => /^\d{4}-\d{2}$/.test(fy));
    const currentYear = getFinancialYearLabelForDate(new Date());
    const previousYear = getPreviousFinancialYearLabel();
    const unique = Array.from(new Set([...years, currentYear, previousYear])).filter((fy) =>
      /^\d{4}-\d{2}$/.test(String(fy || "").trim())
    );
    unique.sort((a, b) => {
      const aStart = parseInt(String(a).split("-")[0], 10) || 0;
      const bStart = parseInt(String(b).split("-")[0], 10) || 0;
      return bStart - aStart;
    });
    if (unique.length === 0) return [String(new Date().getFullYear())];
    return unique;
  }, [holidays]);

  useEffect(() => {
    if (yearFilter === "All") return;
    if (availableYears.includes(String(yearFilter))) return;
    if (availableYears.length > 0) setYearFilter(String(availableYears[0]));
  }, [availableYears]);

  const filteredHolidays = useMemo(() => {
    const fy = String(yearFilter || "").trim();
    const cy = String(calendarYearFilter || "").trim();

    let items = holidays;
    if (fy && fy !== "All") {
      items = items.filter((h) => getFinancialYearLabelForDate(String(h?.date || "").trim()) === fy);
    }
    if (cy && cy !== "All") {
      items = items.filter((h) => getCalendarYearForDate(String(h?.date || "").trim()) === cy);
    }
    return items;
  }, [holidays, yearFilter, calendarYearFilter]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(max-width: 768px)");

    const apply = (matches) => {
      setIsMobile(matches);
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

  const formatSavedDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB");
  };

  const canSave = useMemo(() => {
    return Boolean(String(manualHolidayName || "").trim() && String(manualHolidayDate || "").trim());
  }, [manualHolidayName, manualHolidayDate]);

  const onSaveManualHoliday = async () => {
    const name = String(manualHolidayName || "").trim();
    const date = String(manualHolidayDate || "").trim();
    if (!name || !date) return;
    setSaveError("");
    setSaving(true);
    try {
      const resp = await officeHolidayAPI.create({ name, date });
      const createdId = String(resp?.data?.id || resp?.data?._id || "");
      const savedCalendarYear = String(date).slice(0, 4);
      const savedFinancialYear = getFinancialYearLabelForDate(date);
      if (/^\d{4}$/.test(savedCalendarYear)) setCalendarYearFilter(savedCalendarYear);
      if (savedFinancialYear) setYearFilter(savedFinancialYear);
      await loadOfficeHolidays();
      if (createdId) setSelectedSavedHolidayId(createdId);
      setManualHolidayName("");
      setManualHolidayDate("");
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to save office holiday";
      setSaveError(String(msg));
    } finally {
      setSaving(false);
    }
  };

  const onDeleteSavedHoliday = (id) => {
    if (!id) return;
    officeHolidayAPI
      .remove(id)
      .then(() => {
        loadOfficeHolidays();
        if (selectedSavedHolidayId === id) setSelectedSavedHolidayId("");
      })
      .catch(() => {});
  };

  return (
    <div className="p-4">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200 bg-white">
          <div className="text-lg font-semibold text-gray-900">Office Holidays</div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-gray-700">Financial Year</div>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="block rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
              >
                <option value="All">All</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-gray-700">Year</div>
              <select
                value={calendarYearFilter}
                onChange={(e) => setCalendarYearFilter(e.target.value)}
                className="block rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3"
              >
                <option value="All">All</option>
                {["2025", "2026", "2027", "2028"].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                setSaveError("");
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2 bg-[#262760] text-white rounded-lg font-semibold hover:bg-[#1e2050] transition-colors"
            >
              Add Office Holiday
            </button>
          </div>
        </div>

        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Showing <span className="font-semibold">{filteredHolidays.length}</span> holidays
          </p>
          <div className="text-sm text-gray-600">{loading ? "Loading..." : ""}</div>
        </div>

        {!isMobile ? (
          <div className="border-t border-gray-200">
            <div className="overflow-x-auto">
              <div className="max-h-[650px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="sticky top-0 z-10 bg-[#262760]">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                        S.No
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                        Office Holiday
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredHolidays.map((h, idx) => (
                      <tr key={h.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{idx + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{h.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatSavedDate(h.date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <button
                            onClick={() => onDeleteSavedHoliday(h.id)}
                            className="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 bg-white hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!loading && filteredHolidays.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">
                          No office holidays saved yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {filteredHolidays.map((h, idx) => (
              <div key={h.id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{h.name}</div>
                    <div className="text-xs text-gray-700 mt-1">
                      <span className="font-semibold">Date:</span> {formatSavedDate(h.date)}
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={() => onDeleteSavedHoliday(h.id)}
                        className="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 bg-white hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-gray-500">{idx + 1}</div>
                </div>
              </div>
            ))}
            {!loading && filteredHolidays.length === 0 && (
              <div className="p-6 text-center text-sm text-gray-500">No office holidays saved yet</div>
            )}
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#262760] to-[#1e2050] px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Add Office Holiday</h3>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Office Holiday Name</label>
                    <input
                      type="text"
                      value={manualHolidayName}
                      onChange={(e) => {
                        setManualHolidayName(e.target.value);
                        if (saveError) setSaveError("");
                      }}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2.5 px-3 bg-white"
                      placeholder="Enter office holiday name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={manualHolidayDate}
                      onChange={(e) => {
                        setManualHolidayDate(e.target.value);
                        if (saveError) setSaveError("");
                      }}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm py-2.5 px-3 bg-white"
                    />
                  </div>
                </div>

                {saveError && (
                  <div className="mt-3 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-lg px-3 py-2">
                    {saveError}
                  </div>
                )}

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
                    disabled={!canSave || saving}
                    className="px-4 py-2 rounded-lg bg-[#262760] text-white hover:bg-[#1e2050] transition-colors disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>

              <div className="border border-purple-100 rounded-xl p-4 bg-purple-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-purple-800">Saved Office Holidays</div>
                  <div className="text-xs font-semibold text-purple-700 bg-white border border-purple-200 px-2 py-1 rounded-full">
                    {filteredHolidays.length}
                  </div>
                </div>

                {filteredHolidays.length === 0 ? (
                  <div className="text-sm text-gray-700">No saved holidays yet.</div>
                ) : (
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-purple-100 bg-white">
                    <div className="divide-y divide-gray-100">
                      {filteredHolidays.map((h) => (
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
                            <div className="text-xs text-gray-600 mt-0.5">{formatSavedDate(h.date)}</div>
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

export default OfficeHolidays;
