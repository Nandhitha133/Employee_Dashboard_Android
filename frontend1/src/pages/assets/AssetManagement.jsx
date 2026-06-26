import React, { useState, useEffect, useMemo } from "react";
import {
  Briefcase,
  Layers,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  Download,
  Ticket,
  Wrench,
  LogOut,
  Bell,
  Sliders,
  FileText,
  User,
  Calendar,
  DollarSign,
  Tag,
  BookOpen,
  Send,
  Eye,
  AlertOctagon,
  FileSpreadsheet,
  QrCode
} from "lucide-react";
import { employeeAPI, assetAPI } from "../../services/api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AssetManagement() {
  const loggedUser = useMemo(() => {
    return JSON.parse(sessionStorage.getItem("user") || "{}");
  }, []);

  const isRealAdmin = useMemo(() => {
    return loggedUser.role === "admin" || loggedUser.role === "hr" || loggedUser.role === "director";
  }, [loggedUser]);

  // Access Control / User Roles state
  const [currentRole, setCurrentRole] = useState(() => {
    const roleMap = {
      admin: "Admin/HR",
      hr: "Admin/HR",
      director: "Super Admin",
      employees: "Employee"
    };
    return roleMap[loggedUser.role] || "Employee";
  });

  const [activeTab, setActiveTab] = useState("dashboard");

  // Core Data States
  const [assets, setAssets] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [maintenance, setMaintenance] = useState([]);

  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // UI state variables
  const [assetFormOpen, setAssetFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [newAsset, setNewAsset] = useState({
    name: "", category: "Laptop", type: "Hardware", brandModel: "",
    serialNumber: "", purchaseDate: "", warrantyExpiry: "",
    vendor: "", cost: "", status: "Available", condition: "Excellent", location: "Chennai Office"
  });

  const [allocationFormOpen, setAllocationFormOpen] = useState(false);
  const [allocateAsset, setAllocateAsset] = useState(null);
  const [allocationData, setAllocationData] = useState({
    assignedToId: "",
    allocatedDate: new Date().toISOString().split("T")[0]
  });

  const [ticketFormOpen, setTicketFormOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    assetId: "", issueType: "Laptop Issue", priority: "Medium", description: ""
  });

  const [viewTicket, setViewTicket] = useState(null);
  const [ticketResolutionNotes, setTicketResolutionNotes] = useState("");
  const [ticketAdminComments, setTicketAdminComments] = useState("");

  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    category: "Laptop", requestType: "New Asset", reason: ""
  });

  const [maintenanceFormOpen, setMaintenanceFormOpen] = useState(false);
  const [newMaintenance, setNewMaintenance] = useState({
    assetId: "", maintenanceType: "Warranty", cost: "", startDate: "", endDate: "", vendorName: "", description: ""
  });

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrAsset, setQrAsset] = useState(null);

  // Load backend data on mount
  const loadBackendData = async () => {
    try {
      const [assetsRes, ticketsRes, requestsRes, maintenanceRes] = await Promise.all([
        assetAPI.getAllAssets(),
        assetAPI.getTickets(),
        assetAPI.getRequests(),
        assetAPI.getMaintenance()
      ]);
      if (assetsRes && assetsRes.data) setAssets(assetsRes.data);
      if (ticketsRes && ticketsRes.data) setTickets(ticketsRes.data);
      if (requestsRes && requestsRes.data) setRequests(requestsRes.data);
      if (maintenanceRes && maintenanceRes.data) setMaintenance(maintenanceRes.data);
    } catch (err) {
      console.error("Error loading backend asset data:", err);
    }
  };

  useEffect(() => {
    loadBackendData();
  }, []);


  // Load actual employees
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res = await employeeAPI.getAllEmployees();
        if (res && res.data) {
          setEmployees(res.data);
        }
      } catch (err) {
        console.error("Error loading employees:", err);
      }
    };
    loadEmployees();
  }, []);

  const categories = [
    "Laptop", "Desktop", "Mobile", "Monitor", "Keyboard & Mouse",
    "Printer", "ID Card", "Headset", "SIM Card", "Office Accessories", "Other Assets"
  ];

  // Dashboard Stats Calculations
  const stats = useMemo(() => {
    return {
      total: assets.length,
      assigned: assets.filter(a => a.status === "Assigned").length,
      available: assets.filter(a => a.status === "Available").length,
      damaged: assets.filter(a => a.status === "Damaged").length,
      pendingRequests: requests.filter(r => r.status === "Pending").length,
      openTickets: tickets.filter(t => t.status === "Pending").length
    };
  }, [assets, requests, tickets]);

  const employeeStats = useMemo(() => {
    const empId = loggedUser.employeeId || "CDE001";
    const myAssets = assets.filter(a => a.assignedToId === empId);
    const myTickets = tickets.filter(t => t.employeeId === empId);
    const myRequests = requests.filter(r => r.employeeId === empId);
    return {
      assigned: myAssets.length,
      pendingTickets: myTickets.filter(t => t.status === "Pending").length,
      resolvedTickets: myTickets.filter(t => t.status === "Resolved").length,
      pendingRequests: myRequests.filter(r => r.status === "Pending").length,
      assetsList: myAssets
    };
  }, [assets, tickets, requests, loggedUser]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchSearch =
        asset.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.assignedToName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.brandModel.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = categoryFilter === "All" || asset.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [assets, searchQuery, categoryFilter]);

  // Handlers
  const handleSaveAsset = async (e) => {
    e.preventDefault();
    try {
      if (selectedAsset) {
        // Edit
        const res = await assetAPI.updateAsset(selectedAsset.id, newAsset);
        setAssets(prev => prev.map(a => a.id === selectedAsset.id ? res.data : a));
      } else {
        // Create
        const res = await assetAPI.createAsset(newAsset);
        setAssets(prev => [res.data, ...prev]);
      }
      setAssetFormOpen(false);
      setSelectedAsset(null);
      setNewAsset({
        name: "", category: "Laptop", type: "Hardware", brandModel: "",
        serialNumber: "", purchaseDate: "", warrantyExpiry: "",
        vendor: "", cost: "", status: "Available", condition: "Excellent", location: "Chennai Office"
      });
    } catch (err) {
      console.error("Error saving asset:", err);
      alert("Error saving asset: " + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenEditAsset = (asset) => {
    setSelectedAsset(asset);
    setNewAsset(asset);
    setAssetFormOpen(true);
  };

  const handleDeleteAsset = async (id) => {
    if (window.confirm("Are you sure you want to delete this asset?")) {
      try {
        await assetAPI.deleteAsset(id);
        setAssets(prev => prev.filter(a => a.id !== id));
      } catch (err) {
        console.error("Error deleting asset:", err);
        alert("Error deleting asset: " + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    try {
      const emp = employees.find(e => e.employeeId === allocationData.assignedToId);
      const payload = {
        assetId: allocateAsset.id,
        assignedToId: allocationData.assignedToId,
        assignedToName: emp ? emp.name : "Assigned Employee",
        allocatedDate: allocationData.allocatedDate
      };
      const res = await assetAPI.allocate(payload);
      setAssets(prev => prev.map(a => a.id === allocateAsset.id ? res.data : a));
      setAllocationFormOpen(false);
      setAllocateAsset(null);
    } catch (err) {
      console.error("Error allocating asset:", err);
      alert("Error allocating asset: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDeallocate = async (id) => {
    if (window.confirm("Are you sure you want to return this asset?")) {
      try {
        const res = await assetAPI.deallocate({ assetId: id });
        setAssets(prev => prev.map(a => a.id === id ? res.data : a));
      } catch (err) {
        console.error("Error deallocating asset:", err);
        alert("Error deallocating asset: " + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        assetId: newTicket.assetId,
        issueType: newTicket.issueType,
        description: newTicket.description,
        priority: newTicket.priority
      };
      const res = await assetAPI.createTicket(payload);
      setTickets(prev => [res.data, ...prev]);
      setTicketFormOpen(false);
      setNewTicket({ assetId: "", issueType: "Laptop Issue", priority: "Medium", description: "" });
    } catch (err) {
      console.error("Error creating ticket:", err);
      alert("Error creating ticket: " + (err.response?.data?.message || err.message));
    }
  };

  const handleResolveTicket = async (ticketId) => {
    try {
      const payload = {
        resolutionNotes: ticketResolutionNotes,
        adminComments: ticketAdminComments
      };
      const res = await assetAPI.resolveTicket(ticketId, payload);
      setTickets(prev => prev.map(t => t.id === ticketId ? res.data : t));
      setViewTicket(null);
      setTicketResolutionNotes("");
      setTicketAdminComments("");
    } catch (err) {
      console.error("Error resolving ticket:", err);
      alert("Error resolving ticket: " + (err.response?.data?.message || err.message));
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        category: newRequest.category,
        requestType: newRequest.requestType,
        reason: newRequest.reason
      };
      const res = await assetAPI.createRequest(payload);
      setRequests(prev => [res.data, ...prev]);
      setRequestFormOpen(false);
      setNewRequest({ category: "Laptop", requestType: "New Asset", reason: "" });
    } catch (err) {
      console.error("Error creating request:", err);
      alert("Error creating request: " + (err.response?.data?.message || err.message));
    }
  };

  const handleUpdateRequestStatus = async (reqId, status) => {
    try {
      const res = await assetAPI.updateRequestStatus(reqId, status);
      setRequests(prev => prev.map(r => r.id === reqId ? res.data : r));
    } catch (err) {
      console.error("Error updating request status:", err);
      alert("Error updating request status: " + (err.response?.data?.message || err.message));
    }
  };

  const handleAddMaintenance = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        assetId: newMaintenance.assetId,
        maintenanceType: newMaintenance.maintenanceType,
        cost: parseFloat(newMaintenance.cost) || 0,
        startDate: newMaintenance.startDate,
        endDate: newMaintenance.endDate,
        vendorName: newMaintenance.vendorName,
        description: newMaintenance.description
      };
      const res = await assetAPI.createMaintenance(payload);
      setMaintenance(prev => [res.data, ...prev]);
      setMaintenanceFormOpen(false);
      setNewMaintenance({
        assetId: "", maintenanceType: "Warranty", cost: "", startDate: "", endDate: "", vendorName: "", description: ""
      });
    } catch (err) {
      console.error("Error adding maintenance:", err);
      alert("Error adding maintenance: " + (err.response?.data?.message || err.message));
    }
  };

  // Export to CSV
  const exportCSV = () => {
    const headers = ["Asset ID", "Asset Name", "Category", "Brand/Model", "Serial Number", "Cost", "Status", "Location", "Assigned To"];
    const rows = assets.map(a => [
      a.id, a.name, a.category, a.brandModel, a.serialNumber, a.cost, a.status, a.location, a.assignedToName || "N/A"
    ]);
    const csvContent = [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Caldim_Asset_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExcel = () => {
    const headers = ["Asset ID", "Asset Name", "Category", "Brand/Model", "Serial Number", "Cost", "Status", "Location", "Assigned To"];
    const rows = assets.map(a => [
      a.id, a.name, a.category, a.brandModel, a.serialNumber, a.cost, a.status, a.location, a.assignedToName || "N/A"
    ]);
    const wsData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Asset Report");
    XLSX.writeFile(workbook, `Caldim_Asset_Report_${Date.now()}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Caldim Engineering Private Limited - Asset Report", 14, 15);
    const headers = [["Asset ID", "Asset Name", "Category", "Brand/Model", "Status", "Cost", "Location"]];
    const rows = assets.map(a => [
      a.id, a.name, a.category, a.brandModel, a.status, `Rs. ${a.cost}`, a.location
    ]);
    doc.autoTable({
      head: headers,
      body: rows,
      startY: 22,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [38, 39, 96] }
    });
    doc.save(`Caldim_Asset_Report_${Date.now()}.pdf`);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800 font-sans">
      {/* Top Banner and Role Switcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <h1 className="text-3xl font-extrabold text-[#262760] tracking-tight flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-[#f37021]" />
            Asset Management 
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Manage company inventories, employee assignments, AMC maintenance schedules, and technical support tickets.
          </p>
        </div>

      </div>

      {/* Tabs navigation */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === "dashboard"
              ? "border-[#f37021] text-[#262760]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="h-4 w-4" />
          Dashboard
        </button>

        {currentRole !== "Employee" && (
          <>
            <button
              onClick={() => setActiveTab("master")}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === "master"
                  ? "border-[#f37021] text-[#262760]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Briefcase className="h-4 w-4" />
              Asset Master
            </button>

            <button
              onClick={() => setActiveTab("allocation")}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === "allocation"
                  ? "border-[#f37021] text-[#262760]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <UserCheck className="h-4 w-4" />
              Allocations
            </button>
          </>
        )}

        <button
          onClick={() => setActiveTab("requests")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === "requests"
              ? "border-[#f37021] text-[#262760]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Bell className="h-4 w-4" />
          Asset Requests
        </button>

        <button
          onClick={() => setActiveTab("tickets")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
            activeTab === "tickets"
              ? "border-[#f37021] text-[#262760]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Ticket className="h-4 w-4" />
          Support Tickets
        </button>

        {currentRole !== "Employee" && (
          <>
            <button
              onClick={() => setActiveTab("maintenance")}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === "maintenance"
                  ? "border-[#f37021] text-[#262760]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Wrench className="h-4 w-4" />
              Maintenance & AMC
            </button>

            <button
              onClick={() => setActiveTab("exit")}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === "exit"
                  ? "border-[#f37021] text-[#262760]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <LogOut className="h-4 w-4" />
              Exit Clearance
            </button>
          </>
        )}
      </div>

      {/* ======================================================== TAB CONTENT ======================================================== */}

      {/* DASHBOARD TAB */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {currentRole === "Employee" ? (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "My Assigned Assets", val: employeeStats.assigned, color: "border-green-500 text-green-600 bg-green-50" },
                  { label: "Pending Tickets", val: employeeStats.pendingTickets, color: "border-rose-500 text-rose-600 bg-rose-50" },
                  { label: "Resolved Tickets", val: employeeStats.resolvedTickets, color: "border-emerald-500 text-emerald-600 bg-emerald-50" },
                  { label: "Pending Requests", val: employeeStats.pendingRequests, color: "border-amber-500 text-amber-600 bg-amber-50" }
                ].map((stat, idx) => (
                  <div key={idx} className={`p-5 rounded-2xl border bg-white shadow-sm ${stat.color}`}>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{stat.label}</p>
                    <p className="text-3xl font-black mt-2">{stat.val}</p>
                  </div>
                ))}
              </div>

              {/* Employee Assigned Assets list */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-[#262760] mb-4">My Assigned Assets</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-4 font-bold text-slate-550">Asset ID</th>
                        <th className="p-4 font-bold text-slate-550">Asset Name</th>
                        <th className="p-4 font-bold text-slate-550">Brand & Model</th>
                        <th className="p-4 font-bold text-slate-550">Serial Number</th>
                        <th className="p-4 font-bold text-slate-550">Allocation Date</th>
                        <th className="p-4 font-bold text-slate-550">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {employeeStats.assetsList.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-slate-400 font-medium">No assets assigned to you currently.</td>
                        </tr>
                      ) : employeeStats.assetsList.map((asset, idx) => (
                        <tr key={idx}>
                          <td className="p-4 font-mono font-bold text-[#262760]">{asset.id}</td>
                          <td className="p-4 font-semibold text-slate-800">{asset.name}</td>
                          <td className="p-4">{asset.brandModel}</td>
                          <td className="p-4 font-mono">{asset.serialNumber}</td>
                          <td className="p-4">{asset.allocatedDate || "N/A"}</td>
                          <td className="p-4">{asset.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                {[
                  { label: "Total Assets", val: stats.total, color: "border-blue-500 text-blue-600 bg-blue-50" },
                  { label: "Assigned Assets", val: stats.assigned, color: "border-green-500 text-green-600 bg-green-50" },
                  { label: "Available Assets", val: stats.available, color: "border-indigo-500 text-indigo-600 bg-indigo-50" },
                  { label: "Damaged Assets", val: stats.damaged, color: "border-red-500 text-red-600 bg-red-50" },
                  { label: "Pending Requests", val: stats.pendingRequests, color: "border-amber-500 text-amber-600 bg-amber-50" },
                  { label: "Open Tickets", val: stats.openTickets, color: "border-rose-500 text-rose-600 bg-rose-50" }
                ].map((stat, idx) => (
                  <div key={idx} className={`p-5 rounded-2xl border bg-white shadow-sm ${stat.color}`}>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{stat.label}</p>
                    <p className="text-3xl font-black mt-2">{stat.val}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Asset Status SVG Chart Widget */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                  <h2 className="text-lg font-bold text-[#262760] mb-4">Asset Status Summary</h2>
                  <div className="flex justify-center items-center h-48 relative">
                    {/* SVG Pie/Donut Chart */}
                    <svg width="160" height="160" viewBox="0 0 36 36" className="transform -rotate-90">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                      <circle
                        cx="18" cy="18" r="15.915" fill="none"
                        stroke="#10b981" strokeWidth="4"
                        strokeDasharray={`${(stats.assigned / (stats.total || 1)) * 100} ${100 - (stats.assigned / (stats.total || 1)) * 100}`}
                        strokeDashoffset="0"
                      />
                      <circle
                        cx="18" cy="18" r="15.915" fill="none"
                        stroke="#6366f1" strokeWidth="4"
                        strokeDasharray={`${(stats.available / (stats.total || 1)) * 100} ${100 - (stats.available / (stats.total || 1)) * 100}`}
                        strokeDashoffset={`${-((stats.assigned / (stats.total || 1)) * 100)}`}
                      />
                      <circle
                        cx="18" cy="18" r="15.915" fill="none"
                        stroke="#ef4444" strokeWidth="4"
                        strokeDasharray={`${(stats.damaged / (stats.total || 1)) * 100} ${100 - (stats.damaged / (stats.total || 1)) * 100}`}
                        strokeDashoffset={`${-(((stats.assigned + stats.available) / (stats.total || 1)) * 100)}`}
                      />
                    </svg>
                    <div className="absolute text-center">
                      <p className="text-2xl font-black text-[#262760]">{stats.total}</p>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Total Items</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs mt-4">
                    <div className="bg-green-50 p-2 rounded-lg border border-green-150">
                      <span className="block w-2.5 h-2.5 bg-green-500 rounded-full mx-auto mb-1"></span>
                      <span className="font-semibold text-slate-500">Assigned</span>
                      <span className="block font-bold text-green-700">{stats.assigned}</span>
                    </div>
                    <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-150">
                      <span className="block w-2.5 h-2.5 bg-indigo-500 rounded-full mx-auto mb-1"></span>
                      <span className="font-semibold text-slate-500">Available</span>
                      <span className="block font-bold text-indigo-700">{stats.available}</span>
                    </div>
                    <div className="bg-red-50 p-2 rounded-lg border border-red-150">
                      <span className="block w-2.5 h-2.5 bg-red-500 rounded-full mx-auto mb-1"></span>
                      <span className="font-semibold text-slate-500">Damaged</span>
                      <span className="block font-bold text-red-700">{stats.damaged}</span>
                    </div>
                  </div>
                </div>

                {/* Recent Asset Activities */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
                  <h2 className="text-lg font-bold text-[#262760] mb-4">Recent Asset Activities</h2>
                  <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                    {assets.map((asset, idx) => (
                      <div key={idx} className="flex gap-4 items-start pb-3 border-b border-slate-100 last:border-b-0">
                        <div className="bg-slate-100 p-2.5 rounded-xl border">
                          <Briefcase className="h-4 w-4 text-[#262760]" />
                        </div>
                        <div className="flex-1 text-sm">
                          <p className="font-bold text-slate-800">{asset.name}</p>
                          <p className="text-slate-500 text-xs">
                            Category: <span className="font-semibold">{asset.category}</span> • Condition: <span className="font-semibold">{asset.condition}</span>
                          </p>
                        </div>
                        <div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            asset.status === "Assigned"
                              ? "bg-green-100 text-green-700"
                              : asset.status === "Available"
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {asset.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ASSET MASTER TAB */}
      {activeTab === "master" && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex flex-1 gap-2 w-full">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Asset ID, Name, Model..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-xl w-full outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border rounded-xl px-3 py-2 text-sm bg-white"
              >
                <option value="All">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 border border-slate-300 rounded-xl px-3 py-2 text-sm hover:bg-slate-50 font-bold"
              >
                <Download className="h-4 w-4" />
                CSV
              </button>
              <button
                onClick={exportExcel}
                className="flex items-center gap-2 border border-slate-300 rounded-xl px-3 py-2 text-sm hover:bg-slate-50 font-bold"
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Excel
              </button>
              <button
                onClick={exportPDF}
                className="flex items-center gap-2 border border-slate-300 rounded-xl px-3 py-2 text-sm hover:bg-slate-50 font-bold"
              >
                <FileText className="h-4 w-4 text-red-600" />
                PDF
              </button>
              <button
                onClick={() => {
                  setSelectedAsset(null);
                  setNewAsset({
                    name: "", category: "Laptop", type: "Hardware", brandModel: "",
                    serialNumber: "", purchaseDate: "", warrantyExpiry: "",
                    vendor: "", cost: "", status: "Available", condition: "Excellent", location: "Chennai Office"
                  });
                  setAssetFormOpen(true);
                }}
                className="flex items-center gap-2 bg-[#262760] text-white rounded-xl px-4 py-2 text-sm hover:bg-[#1c1d47] font-bold"
              >
                <Plus className="h-4 w-4" />
                Add Asset
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-bold text-slate-550">Asset ID</th>
                  <th className="p-4 font-bold text-slate-550">Asset Name</th>
                  <th className="p-4 font-bold text-slate-550">Category</th>
                  <th className="p-4 font-bold text-slate-550">Brand & Model</th>
                  <th className="p-4 font-bold text-slate-550">Status</th>
                  <th className="p-4 font-bold text-slate-550">Condition</th>
                  <th className="p-4 font-bold text-slate-550">Cost</th>
                  <th className="p-4 font-bold text-slate-550 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-400 font-medium">No assets matching the filters.</td>
                  </tr>
                ) : filteredAssets.map((asset, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/55 transition-colors">
                    <td className="p-4 font-mono font-bold text-[#262760]">{asset.id}</td>
                    <td className="p-4 font-semibold text-slate-800">{asset.name}</td>
                    <td className="p-4">{asset.category}</td>
                    <td className="p-4">{asset.brandModel}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        asset.status === "Assigned"
                          ? "bg-green-150 text-green-700"
                          : asset.status === "Available"
                          ? "bg-blue-150 text-blue-700"
                          : "bg-red-150 text-red-700"
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        asset.condition === "Excellent" || asset.condition === "Good"
                          ? "bg-slate-100 text-slate-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {asset.condition}
                      </span>
                    </td>
                    <td className="p-4 font-semibold">₹ {asset.cost.toLocaleString("en-IN")}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 justify-center">
                        <button
                          onClick={() => {
                            setQrAsset(asset);
                            setQrModalOpen(true);
                          }}
                          title="Generate QR Barcode"
                          className="p-1.5 text-slate-650 hover:bg-slate-200 rounded-lg"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                        {asset.status !== "Assigned" && (
                          <button
                            onClick={() => {
                              setAllocateAsset(asset);
                              setAllocationFormOpen(true);
                            }}
                            title="Assign to Employee"
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg font-bold text-xs flex items-center gap-1 border border-green-200"
                          >
                            Assign
                          </button>
                        )}
                        {asset.status === "Assigned" && (
                          <button
                            onClick={() => handleDeallocate(asset.id)}
                            title="Deallocate Asset"
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg font-bold text-xs flex items-center gap-1 border border-red-200"
                          >
                            Return
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEditAsset(asset)}
                          title="Edit"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAsset(asset.id)}
                          title="Delete"
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ALLOCATIONS TAB */}
      {activeTab === "allocation" && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-[#262760] mb-6">Asset Allocation History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-bold text-slate-550">Asset ID</th>
                  <th className="p-4 font-bold text-slate-550">Asset Name</th>
                  <th className="p-4 font-bold text-slate-550">Allocated To</th>
                  <th className="p-4 font-bold text-slate-550">Allocation Date</th>
                  <th className="p-4 font-bold text-slate-550">Condition</th>
                  <th className="p-4 font-bold text-slate-550 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assets.filter(a => a.status === "Assigned").length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400 font-medium">No assigned assets currently.</td>
                  </tr>
                ) : assets.filter(a => a.status === "Assigned").map((asset, idx) => (
                  <tr key={idx}>
                    <td className="p-4 font-mono font-bold text-slate-700">{asset.id}</td>
                    <td className="p-4 font-semibold text-slate-800">{asset.name}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold">{asset.assignedToName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{asset.assignedToId}</span>
                      </div>
                    </td>
                    <td className="p-4">{asset.allocatedDate || "N/A"}</td>
                    <td className="p-4">{asset.condition}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDeallocate(asset.id)}
                        className="px-3 py-1.5 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold"
                      >
                        Return Checklist / Clear
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ASSET REQUESTS TAB */}
      {activeTab === "requests" && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#262760]">Asset Provisioning Requests</h2>
            <button
              onClick={() => setRequestFormOpen(true)}
              className="flex items-center gap-2 bg-[#262760] text-white rounded-xl px-4 py-2 text-sm hover:bg-[#1a1c43] font-bold"
            >
              <Plus className="h-4 w-4" />
              Request New Asset
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-bold text-slate-550">Req ID</th>
                  <th className="p-4 font-bold text-slate-550">Employee</th>
                  <th className="p-4 font-bold text-slate-550">Asset Category</th>
                  <th className="p-4 font-bold text-slate-550">Request Type</th>
                  <th className="p-4 font-bold text-slate-550">Reason</th>
                  <th className="p-4 font-bold text-slate-550">Date</th>
                  <th className="p-4 font-bold text-slate-550">Status</th>
                  {currentRole !== "Employee" && <th className="p-4 font-bold text-slate-550 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-4 font-mono font-bold text-slate-600">{req.id}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">{req.employeeName}</span>
                        <span className="text-[10px] text-slate-400">{req.employeeId}</span>
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-slate-700">{req.category}</td>
                    <td className="p-4">{req.requestType}</td>
                    <td className="p-4 text-xs text-slate-600 max-w-xs">{req.reason}</td>
                    <td className="p-4">{req.requestDate}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        req.status === "Approved"
                          ? "bg-green-100 text-green-700"
                          : req.status === "Pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    {currentRole !== "Employee" && (
                      <td className="p-4 text-center">
                        {req.status === "Pending" ? (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => handleUpdateRequestStatus(req.id, "Approved")}
                              className="px-2 py-1 bg-green-50 border border-green-200 text-green-700 text-xs font-bold rounded-lg"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateRequestStatus(req.id, "Rejected")}
                              className="px-2 py-1 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Processed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUPPORT TICKETS TAB */}
      {activeTab === "tickets" && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#262760]">Asset Support Helpdesk</h2>
            <button
              onClick={() => setTicketFormOpen(true)}
              className="flex items-center gap-2 bg-[#262760] text-white rounded-xl px-4 py-2 text-sm hover:bg-[#1a1c43] font-bold"
            >
              <Plus className="h-4 w-4" />
              Raise Support Ticket
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-bold text-slate-550">Ticket ID</th>
                  <th className="p-4 font-bold text-slate-550">Asset</th>
                  <th className="p-4 font-bold text-slate-550">Employee</th>
                  <th className="p-4 font-bold text-slate-550">Issue Type</th>
                  <th className="p-4 font-bold text-slate-550">Priority</th>
                  <th className="p-4 font-bold text-slate-550">Status</th>
                  <th className="p-4 font-bold text-slate-550 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((tck, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-4 font-mono font-bold text-slate-700">{tck.id}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">{tck.assetName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{tck.assetId}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold">{tck.employeeName}</span>
                        <span className="text-[10px] text-slate-400">{tck.employeeId}</span>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-slate-700">{tck.issueType}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        tck.priority === "High"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : tck.priority === "Medium"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {tck.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        tck.status === "Resolved"
                          ? "bg-green-150 text-green-700"
                          : "bg-yellow-150 text-yellow-700"
                      }`}>
                        {tck.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => {
                          setViewTicket(tck);
                          setTicketResolutionNotes(tck.resolutionNotes || "");
                          setTicketAdminComments(tck.adminComments || "");
                        }}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs hover:bg-slate-50 flex items-center gap-1 mx-auto font-bold"
                      >
                        <Eye className="h-3 w-3" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MAINTENANCE & AMC TAB */}
      {activeTab === "maintenance" && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#262760]">Maintenance & Vendor Schedule</h2>
            <button
              onClick={() => setMaintenanceFormOpen(true)}
              className="flex items-center gap-2 bg-[#262760] text-white rounded-xl px-4 py-2 text-sm hover:bg-[#1a1c43] font-bold"
            >
              <Plus className="h-4 w-4" />
              Schedule Maintenance
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-bold text-slate-550">Maint ID</th>
                  <th className="p-4 font-bold text-slate-550">Asset Name</th>
                  <th className="p-4 font-bold text-slate-550">Type</th>
                  <th className="p-4 font-bold text-slate-550">Vendor</th>
                  <th className="p-4 font-bold text-slate-550">Cost</th>
                  <th className="p-4 font-bold text-slate-550">Schedule Dates</th>
                  <th className="p-4 font-bold text-slate-550">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {maintenance.map((mnt, idx) => (
                  <tr key={idx}>
                    <td className="p-4 font-mono font-bold text-slate-600">{mnt.id}</td>
                    <td className="p-4 font-semibold text-slate-800">{mnt.assetName}</td>
                    <td className="p-4">{mnt.maintenanceType}</td>
                    <td className="p-4">{mnt.vendorName}</td>
                    <td className="p-4 font-semibold">₹ {mnt.cost.toLocaleString("en-IN")}</td>
                    <td className="p-4 text-xs text-slate-650">
                      {mnt.startDate} to {mnt.endDate}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        mnt.status === "In Progress"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {mnt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EXIT CLEARANCE INTEGRATION */}
      {activeTab === "exit" && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-[#262760] mb-3">Asset Exit & Recovery Center</h2>
          <p className="text-slate-500 mb-6 text-sm">
            Verifying physical return checklist and structural damages for separating employees prior to releasing HR Exit Clearance.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-bold text-slate-550">Employee</th>
                  <th className="p-4 font-bold text-slate-550">Assigned Assets</th>
                  <th className="p-4 font-bold text-slate-550">Category</th>
                  <th className="p-4 font-bold text-slate-550">Clearance Status</th>
                  <th className="p-4 font-bold text-slate-550 text-center">Verify Return</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assets.filter(a => a.status === "Assigned").map((asset, idx) => (
                  <tr key={idx}>
                    <td className="p-4 font-semibold text-slate-800">
                      <div>{asset.assignedToName}</div>
                      <span className="text-[10px] text-slate-450 font-mono">{asset.assignedToId}</span>
                    </td>
                    <td className="p-4 font-medium text-[#262760]">{asset.name}</td>
                    <td className="p-4">{asset.category}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 border border-red-200 bg-red-50 text-red-700 text-xs rounded font-bold">
                        Pending Returns
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleDeallocate(asset.id)}
                        className="px-3 py-1.5 bg-[#262760] text-white rounded-lg text-xs hover:bg-[#1a1c43] font-bold"
                      >
                        Approve Return
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== DIALOGS / MODALS ======================================================== */}

      {/* ASSET CREATION/EDIT MODAL */}
      {assetFormOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveAsset} className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b bg-[#262760] text-white flex justify-between items-center">
              <h3 className="text-lg font-bold">{selectedAsset ? "Edit Asset Master" : "Add Asset to Master"}</h3>
              <button type="button" onClick={() => setAssetFormOpen(false)} className="text-white hover:text-slate-200 font-bold">✕</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Asset Name *</label>
                <input
                  type="text" required
                  value={newAsset.name}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Category *</label>
                <select
                  value={newAsset.category}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Brand & Model *</label>
                <input
                  type="text" required
                  value={newAsset.brandModel}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, brandModel: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Serial Number *</label>
                <input
                  type="text" required
                  value={newAsset.serialNumber}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, serialNumber: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Cost (INR) *</label>
                <input
                  type="number" required
                  value={newAsset.cost}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, cost: parseFloat(e.target.value) || "" }))}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Purchase Date *</label>
                <input
                  type="date" required
                  value={newAsset.purchaseDate}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, purchaseDate: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Warranty Expiry *</label>
                <input
                  type="date" required
                  value={newAsset.warrantyExpiry}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, warrantyExpiry: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Vendor *</label>
                <input
                  type="text" required
                  value={newAsset.vendor}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, vendor: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Condition</label>
                <select
                  value={newAsset.condition}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, condition: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Average">Average</option>
                  <option value="Needs Repair">Needs Repair</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Location *</label>
                <select
                  value={newAsset.location}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="Chennai Office">Chennai Office</option>
                  <option value="Hosur Office">Hosur Office</option>
                  <option value="Hosur Warehouse">Hosur Warehouse</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setAssetFormOpen(false)} className="px-4 py-2 border rounded-xl text-sm font-semibold hover:bg-slate-100">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#262760] text-white rounded-xl text-sm font-semibold hover:bg-[#1a1c43]">Save Asset</button>
            </div>
          </form>
        </div>
      )}

      {/* ALLOCATION DIALOG */}
      {allocationFormOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAllocate} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b bg-[#262760] text-white flex justify-between items-center">
              <h3 className="text-lg font-bold">Assign Asset: {allocateAsset?.name}</h3>
              <button type="button" onClick={() => setAllocationFormOpen(false)} className="text-white hover:text-slate-200">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Select Employee *</label>
                <select
                  required
                  value={allocationData.assignedToId}
                  onChange={(e) => setAllocationData(prev => ({ ...prev, assignedToId: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp.employeeId}>
                      {emp.name} ({emp.employeeId} - {emp.department})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Allocation Date *</label>
                <input
                  type="date" required
                  value={allocationData.allocatedDate}
                  onChange={(e) => setAllocationData(prev => ({ ...prev, allocatedDate: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setAllocationFormOpen(false)} className="px-4 py-2 border rounded-xl text-sm font-semibold hover:bg-slate-100">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#262760] text-white rounded-xl text-sm font-semibold hover:bg-[#1a1c43]">Allocate</button>
            </div>
          </form>
        </div>
      )}

      {/* NEW SUPPORT TICKET MODAL */}
      {ticketFormOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateTicket} className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b bg-[#262760] text-white flex justify-between items-center">
              <h3 className="text-lg font-bold">Raise Technical Asset Ticket</h3>
              <button type="button" onClick={() => setTicketFormOpen(false)} className="text-white hover:text-slate-200">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Select Asset *</label>
                <select
                  required
                  value={newTicket.assetId}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, assetId: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose Assigned Asset --</option>
                  {assets.filter(a => currentRole === "Employee" ? a.assignedToId === "CDE001" : a.status === "Assigned").map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Issue Category *</label>
                  <select
                    value={newTicket.issueType}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, issueType: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none"
                  >
                    <option value="Laptop Issue">Laptop Issue</option>
                    <option value="System Not Working">System Not Working</option>
                    <option value="Hardware Damage">Hardware Damage</option>
                    <option value="Software Installation">Software Installation</option>
                    <option value="Password/Access Issues">Password/Access Issues</option>
                    <option value="Internet/VPN Issue">Internet/VPN Issue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Priority Level *</label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Issue Description *</label>
                <textarea
                  required rows={4}
                  value={newTicket.description}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the issue in detail..."
                  className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setTicketFormOpen(false)} className="px-4 py-2 border rounded-xl text-sm font-semibold hover:bg-slate-100">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#262760] text-white rounded-xl text-sm font-semibold hover:bg-[#1a1c43]">Raise Ticket</button>
            </div>
          </form>
        </div>
      )}

      {/* TICKET DETAILS & RESOLUTION WORKFLOW MODAL */}
      {viewTicket && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b bg-[#262760] text-white flex justify-between items-center">
              <h3 className="text-lg font-bold">Ticket Details: {viewTicket.id}</h3>
              <button type="button" onClick={() => setViewTicket(null)} className="text-white hover:text-slate-200">✕</button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Info Column */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase">Employee Details</h4>
                  <p className="font-semibold text-slate-800">{viewTicket.employeeName} ({viewTicket.employeeId})</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase">Asset In Question</h4>
                  <p className="font-semibold text-slate-800">{viewTicket.assetName} ({viewTicket.assetId})</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase">Issue Description</h4>
                  <p className="text-slate-650 text-sm mt-1">{viewTicket.description}</p>
                </div>
                {/* Timeline display */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Ticket Timeline</h4>
                  <div className="border-l-2 border-slate-200 pl-4 space-y-3">
                    {viewTicket.timeline.map((event, idx) => (
                      <div key={idx} className="relative">
                        <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white"></span>
                        <p className="text-xs font-bold text-slate-800">{event.status} ({event.date})</p>
                        <p className="text-xs text-slate-500">{event.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Admin Resolution Column */}
              <div className="bg-slate-50 p-4 rounded-xl border space-y-4">
                <h3 className="font-bold text-[#262760] border-b pb-2">IT Resolution Panel</h3>
                {viewTicket.status === "Pending" && currentRole !== "Employee" ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">IT Admin Comments</label>
                      <input
                        type="text"
                        value={ticketAdminComments}
                        onChange={(e) => setTicketAdminComments(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                        placeholder="Internal IT team remarks..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Resolution / Action Notes *</label>
                      <textarea
                        rows={3} required
                        value={ticketResolutionNotes}
                        onChange={(e) => setTicketResolutionNotes(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                        placeholder="What actions were taken to fix..."
                      />
                    </div>
                    <button
                      onClick={() => handleResolveTicket(viewTicket.id)}
                      disabled={!ticketResolutionNotes}
                      className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm disabled:opacity-50"
                    >
                      Resolve and Close Ticket
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase">Resolution Notes</h4>
                      <p className="text-sm text-slate-700 mt-1">{viewTicket.resolutionNotes || "No resolution details logged."}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase">Admin Comments</h4>
                      <p className="text-sm text-slate-700 mt-1">{viewTicket.adminComments || "None."}</p>
                    </div>
                    <div className="bg-green-100 text-green-800 p-2.5 rounded-lg border border-green-200 text-center text-xs font-bold">
                      Ticket Resolved and Closed
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW PROVISIONING REQUEST MODAL */}
      {requestFormOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateRequest} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b bg-[#262760] text-white flex justify-between items-center">
              <h3 className="text-lg font-bold">Request Asset Provisioning</h3>
              <button type="button" onClick={() => setRequestFormOpen(false)} className="text-white hover:text-slate-200">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Asset Category *</label>
                <select
                  value={newRequest.category}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Request Type *</label>
                <select
                  value={newRequest.requestType}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, requestType: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none"
                >
                  <option value="New Asset">New Asset</option>
                  <option value="Asset Replacement">Asset Replacement</option>
                  <option value="Temporary Asset">Temporary Asset</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Justification Reason *</label>
                <textarea
                  required rows={4}
                  value={newRequest.reason}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="State the commercial or technical business justification..."
                  className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setRequestFormOpen(false)} className="px-4 py-2 border rounded-xl text-sm font-semibold hover:bg-slate-100">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#262760] text-white rounded-xl text-sm font-semibold hover:bg-[#1a1c43]">Submit Request</button>
            </div>
          </form>
        </div>
      )}

      {/* SCHEDULE MAINTENANCE MODAL */}
      {maintenanceFormOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddMaintenance} className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b bg-[#262760] text-white flex justify-between items-center">
              <h3 className="text-lg font-bold">Schedule Asset Maintenance</h3>
              <button type="button" onClick={() => setMaintenanceFormOpen(false)} className="text-white hover:text-slate-200">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Select Asset *</label>
                <select
                  required
                  value={newMaintenance.assetId}
                  onChange={(e) => setNewMaintenance(prev => ({ ...prev, assetId: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none"
                >
                  <option value="">-- Choose Asset --</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Maintenance Type *</label>
                  <select
                    value={newMaintenance.maintenanceType}
                    onChange={(e) => setNewMaintenance(prev => ({ ...prev, maintenanceType: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none"
                  >
                    <option value="Warranty">Warranty Service</option>
                    <option value="AMC Scheduled">AMC Checkup</option>
                    <option value="Repair">Hardware Repair</option>
                    <option value="Software upgrade">Software Upgrade</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Cost (INR)</label>
                  <input
                    type="number"
                    value={newMaintenance.cost}
                    onChange={(e) => setNewMaintenance(prev => ({ ...prev, cost: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Start Date *</label>
                  <input
                    type="date" required
                    value={newMaintenance.startDate}
                    onChange={(e) => setNewMaintenance(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">End Date *</label>
                  <input
                    type="date" required
                    value={newMaintenance.endDate}
                    onChange={(e) => setNewMaintenance(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Service Vendor Name *</label>
                <input
                  type="text" required
                  value={newMaintenance.vendorName}
                  onChange={(e) => setNewMaintenance(prev => ({ ...prev, vendorName: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Description *</label>
                <textarea
                  required rows={3}
                  value={newMaintenance.description}
                  onChange={(e) => setNewMaintenance(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setMaintenanceFormOpen(false)} className="px-4 py-2 border rounded-xl text-sm font-semibold hover:bg-slate-100">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#262760] text-white rounded-xl text-sm font-semibold hover:bg-[#1a1c43]">Schedule</button>
            </div>
          </form>
        </div>
      )}

      {/* QR MODAL */}
      {qrModalOpen && qrAsset && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center border border-slate-200">
            <h3 className="text-lg font-bold text-[#262760] mb-4">Asset Barcode & QR Code</h3>
            <div className="bg-slate-100 p-6 rounded-2xl border flex flex-col items-center justify-center gap-4">
              {/* simulated QR representation */}
              <div className="w-32 h-32 bg-white border border-slate-350 p-2 flex flex-wrap gap-1 items-center justify-center">
                {Array.from({ length: 64 }).map((_, i) => (
                  <div key={i} className={`w-3.5 h-3.5 ${((i * 7) + 13) % 3 === 0 || i % 7 === 0 ? "bg-black" : "bg-white"}`}></div>
                ))}
              </div>
              <div className="font-mono text-xs text-slate-700 bg-white px-3 py-1.5 rounded-lg border">
                ID: {qrAsset.id}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              Use physical scanners or mobile devices to scan this generated code during local audits and inventory checks.
            </p>
            <button
              onClick={() => setQrModalOpen(false)}
              className="mt-6 w-full py-2 bg-[#262760] hover:bg-[#1a1c43] text-white rounded-xl text-sm font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
