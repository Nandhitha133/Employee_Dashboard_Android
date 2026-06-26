import React, { useEffect, useMemo, useState } from "react";
import { resumeAPI, BASE_URL } from "../../services/resumeAPI";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

const divisions = ["SDS", "TEKLA", "DAS (Software)", "Mechanical", "Electrical"];
const resumeTypes = ["Employee Resume", "Hiring Resume"];

const BankRepository = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filterDivision, setFilterDivision] = useState("All");
  const [filterType, setFilterType] = useState("All");

  const [showFilters, setShowFilters] = useState(false);

  const [selectedResume, setSelectedResume] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    candidateName: "",
    email: "",
    phone: "",
    division: "",
    experience: "",
    resumeType: "",
    remarks: "",
    file: null,
  });
  const [formErrors, setFormErrors] = useState({});

  const resetForm = () => {
    setForm({
      candidateName: "",
      email: "",
      phone: "",
      division: "",
      experience: "",
      resumeType: "",
      remarks: "",
      file: null,
    });
    setFormErrors({});
    setEditingId(null);
  };

  const loadResumes = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (filterDivision && filterDivision !== "All") params.division = filterDivision;
      if (filterType && filterType !== "All") params.resumeType = filterType;
      if (search) params.search = search;
      const res = await resumeAPI.list(params);
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setResumes(list);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to load resumes"
      );
      setResumes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, [filterDivision, filterType, search]);

  const validateForm = () => {
    const errors = {};

    if (!form.candidateName.trim()) errors.candidateName = "Candidate Name is required";
    if (!form.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      errors.email = "Invalid email";
    }
    if (!form.phone.trim()) {
      errors.phone = "Phone Number is required";
    } else if (!/^\d{10}$/.test(form.phone)) {
      errors.phone = "Phone must be 10 digits";
    }
    if (!form.division) errors.division = "Division is required";

    if (form.experience === "" || form.experience === null) {
      errors.experience = "Experience is required";
    } else if (Number(form.experience) < 0) {
      errors.experience = "Experience cannot be negative";
    }

    if (!form.resumeType) errors.resumeType = "Resume Type is required";

    if (!editingId && !form.file) {
      errors.file = "Resume file is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setForm(prev => ({ ...prev, file: null }));
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      setFormErrors(prev => ({
        ...prev,
        file: "Only PDF, DOC, and DOCX files are allowed",
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormErrors(prev => ({
        ...prev,
        file: "File size must be less than 5MB",
      }));
      return;
    }

    setFormErrors(prev => ({ ...prev, file: "" }));
    setForm(prev => ({ ...prev, file }));
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (resume) => {
    setEditingId(resume._id);
    setForm({
      candidateName: resume.candidateName || "",
      email: resume.email || "",
      phone: resume.phone || "",
      division: resume.division || "",
      experience: resume.experience != null ? String(resume.experience) : "",
      resumeType: resume.resumeType || "",
      remarks: resume.remarks || "",
      file: null,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError("");

      const formData = new FormData();
      formData.append("candidateName", form.candidateName.trim());
      formData.append("email", form.email.trim());
      formData.append("phone", form.phone.trim());
      formData.append("division", form.division);
      formData.append("experience", String(form.experience || 0));
      formData.append("resumeType", form.resumeType);
      if (form.remarks) formData.append("remarks", form.remarks);
      if (form.file) {
        formData.append("file", form.file);
      }

      if (editingId) {
        await resumeAPI.update(editingId, formData);
      } else {
        await resumeAPI.create(formData);
      }

      setShowModal(false);
      resetForm();
      loadResumes();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to save resume"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (resume) => {
    if (!window.confirm(`Delete resume for ${resume.candidateName}?`)) return;
    try {
      setLoading(true);
      setError("");
      await resumeAPI.remove(resume._id);
      loadResumes();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to delete resume"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleView = (resume) => {
    if (!resume.filePath) return;
    const cleanBase = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
    const cleanPath = resume.filePath.startsWith("/") ? resume.filePath.slice(1) : resume.filePath;
    const url = `${cleanBase}/${cleanPath}`;
    window.open(url, "_blank", "noopener");
  };

  const handleDownload = (resume) => {
    if (!resume.filePath) return;
    const cleanBase = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
    const cleanPath = resume.filePath.startsWith("/") ? resume.filePath.slice(1) : resume.filePath;
    const url = `${cleanBase}/${cleanPath}`;
    
    // Extract actual extension from filePath (e.g. .pdf, .docx)
    const ext = resume.filePath.split(".").pop().toLowerCase();
    
    const link = document.createElement("a");
    link.href = url;
    // Maintain the original file type for the downloaded file
    link.download = `${resume.candidateName || "resume"}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredResumes = useMemo(() => {
    return resumes;
  }, [resumes]);

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4">
        <div className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="relative w-full md:w-64">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by candidate name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between md:justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowFilters((prev) => !prev)}
                className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#262760] ${
                  showFilters
                    ? "bg-[#262760] border-[#262760] text-white hover:bg-[#1f2145]"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <FunnelIcon className="h-5 w-5 mr-2" />
                Filters
              </button>
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center rounded-lg bg-[#262760] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1f2145] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#262760]"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Resume
              </button>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-4 w-4 text-gray-500" />
                <select
                  value={filterDivision}
                  onChange={(e) => setFilterDivision(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Divisions</option>
                  {divisions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-4 w-4 text-gray-500" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Types</option>
                  {resumeTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="max-h-[480px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#262760] sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    S.No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Candidate Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Email ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Division
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Resume Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Experience (Years)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Uploaded Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-6 text-center text-sm text-gray-500"
                    >
                      Loading...
                    </td>
                  </tr>
                )}
                {!loading && filteredResumes.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-sm text-gray-500"
                    >
                      No resumes found.
                    </td>
                  </tr>
                )}
                {!loading &&
                  filteredResumes.map((resume, index) => (
                    <tr key={resume._id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {resume.candidateName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {resume.email}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {resume.division}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                          {resume.resumeType}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {resume.experience}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {resume.createdAt
                          ? new Date(resume.createdAt).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedResume(resume);
                              setShowViewModal(true);
                            }}
                            className="inline-flex items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 p-1.5 text-indigo-700 hover:bg-indigo-100"
                            title="View details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownload(resume)}
                            className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white p-1.5 text-gray-600 hover:bg-gray-50"
                            title="Download"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(resume)}
                            className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white p-1.5 text-gray-600 hover:bg-gray-50"
                            title="Edit"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(resume)}
                            className="inline-flex items-center justify-center rounded-full border border-red-200 bg-white p-1.5 text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-[#262760]">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <PlusIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {editingId ? "Edit Resume" : "Add Resume"}
                  </h2>
                  <p className="text-xs text-indigo-100">
                    Upload and manage resume details.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-indigo-100 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Candidate Name *
                  </label>
                  <input
                    type="text"
                    value={form.candidateName}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, candidateName: e.target.value }))
                    }
                    className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.candidateName ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {formErrors.candidateName && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.candidateName}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.email ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={form.phone}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        phone: e.target.value.replace(/[^0-9]/g, "").slice(0, 10),
                      }))
                    }
                    className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.phone ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {formErrors.phone && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.phone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Division *
                  </label>
                  <select
                    value={form.division}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, division: e.target.value }))
                    }
                    className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.division ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">Select Division</option>
                    {divisions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  {formErrors.division && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.division}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Experience (Years) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.experience}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, experience: e.target.value }))
                    }
                    className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.experience ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {formErrors.experience && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.experience}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Resume Type *
                  </label>
                  <select
                    value={form.resumeType}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, resumeType: e.target.value }))
                    }
                    className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.resumeType ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">Select Type</option>
                    {resumeTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  {formErrors.resumeType && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.resumeType}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Upload Resume {editingId ? "(leave blank to keep existing)" : "*"}
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className={`mt-1 block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 ${
                      formErrors.file ? "border border-red-500 rounded-lg" : ""
                    }`}
                  />
                  {formErrors.file && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.file}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Allowed types: PDF, DOC, DOCX. Max size 5MB.
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Remarks (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={form.remarks}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, remarks: e.target.value }))
                    }
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center rounded-lg bg-[#262760] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1f2145] disabled:opacity-60"
                >
                  {editingId ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && selectedResume && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => {
            setShowViewModal(false);
            setSelectedResume(null);
          }}
        >
          <div
            className="w-full max-w-xl mx-4 rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 flex items-center justify-between bg-white/10 backdrop-blur">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center text-white text-xl font-semibold">
                  {(selectedResume.candidateName || "?")
                    .split(" ")
                    .filter(Boolean)
                    .map((part) => part.charAt(0).toUpperCase())
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {selectedResume.candidateName}
                  </h2>
                  <p className="text-xs text-indigo-100">
                    {selectedResume.resumeType} • {selectedResume.division}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedResume(null);
                }}
                className="text-indigo-100 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="bg-white px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                  <div className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">
                    Email
                  </div>
                  <div className="text-sm font-medium text-gray-900 break-all">
                    {selectedResume.email}
                  </div>
                </div>
                <div className="rounded-xl border border-pink-100 bg-pink-50 px-4 py-3">
                  <div className="text-xs font-semibold text-pink-500 uppercase tracking-wide">
                    Phone
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {selectedResume.phone}
                  </div>
                </div>
                <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3">
                  <div className="text-xs font-semibold text-purple-500 uppercase tracking-wide">
                    Experience
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {selectedResume.experience} years
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <div className="text-xs font-semibold text-emerald-500 uppercase tracking-wide">
                    Uploaded
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {selectedResume.createdAt
                      ? new Date(selectedResume.createdAt).toLocaleDateString()
                      : "-"}
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Remarks
                </div>
                <div className="text-sm text-gray-800 min-h-[40px]">
                  {selectedResume.remarks || "No remarks added."}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                    {selectedResume.resumeType}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-700">
                    {selectedResume.division}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleView(selectedResume)}
                    className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                  >
                    <EyeIcon className="h-4 w-4 mr-2" />
                    Open Resume
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(selectedResume)}
                    className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-indigo-700 border border-indigo-200 shadow-sm hover:bg-indigo-50"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowViewModal(false);
                      setSelectedResume(null);
                    }}
                    className="inline-flex items-center rounded-full bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankRepository;
