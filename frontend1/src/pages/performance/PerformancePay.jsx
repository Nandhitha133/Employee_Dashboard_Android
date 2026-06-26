import React, { useState, useMemo, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import confetti from "canvas-confetti";
import {
  Coins,
  FileCheck,
  Clock,
  CheckCircle,
  Filter,
  Search,
  Download,
  Plus,
  Trash2,
  Edit,
  Eye,
  Check,
  X,
  Send,
  History,
  FileText,
  Building,
  User,
  AlertCircle
} from "lucide-react";
import { performancePayAPI, employeeAPI, payrollAPI } from "../../services/api";
import { getAbsoluteSignatureUrl } from "../../utils/signatureUtils";

const AwardLetterContent = ({ selectedRecord, id = "award-letter-p1" }) => {
  if (!selectedRecord) return null;
  const sigUrl = getAbsoluteSignatureUrl(selectedRecord.location || '');
  const fy = selectedRecord.financialYear || "2025-26";
  const payoutYear = fy.includes("-") ? `20${fy.split("-")[1]}` : "2026";
  return (
    <div
      id={id}
      className="bg-white relative h-[1123px] min-h-[1123px] max-h-[1123px] w-[794px] shadow-lg flex-shrink-0 flex flex-col text-left overflow-hidden"
      style={{ fontFamily: "Arial, sans-serif", color: "#333", height: "1123px", minHeight: "1123px", maxHeight: "1123px", boxSizing: "border-box" }}
    >
      {/* Letter Pad Header — identical to salary slip header */}
      <div className="w-full h-32 relative overflow-hidden flex bg-white" style={{ width: '100%', height: '128px', position: 'relative', overflow: 'hidden', display: 'flex' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
          <svg width="100%" height="100%" viewBox="0 0 794 128" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
            <path d="M0,0 L526,0 L456,128 L0,128 Z" fill="#1e2b58" />
            <path d="M526,0 L556,0 L486,128 L456,128 Z" fill="#f37021" />
          </svg>
        </div>
        <div className="relative z-10 w-full h-full" style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%' }}>
          {/* Left: Logo and Title */}
          <div style={{ position: 'absolute', left: '24px', top: '10px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img src="/images/steel-logo.png" alt="CALDIM" className="h-16 w-auto brightness-0 invert" crossOrigin="anonymous" style={{ height: '64px', width: 'auto', display: 'block' }} />
            <div className="font-bitsumishi" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', color: 'white' }}>
              <h1 className="text-white font-bold text-6xl tracking-[0.05em]" style={{ margin: 0, padding: 0, textAlign: 'left', lineHeight: 1, position: 'relative', top: '-8px' }}>CALDIM</h1>
              <p className="text-[15px] font-bold tracking-[0.18em] text-[#ff8c00] uppercase" style={{ margin: 0, padding: 0, marginTop: '2px', textAlign: 'left', whiteSpace: 'nowrap' }}>ENGINEERING PRIVATE LIMITED</p>
            </div>
          </div>

          {/* Right: Contact Info */}
          <div style={{ position: 'absolute', right: '16px', top: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div className="flex items-center mb-2" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <span className="font-bold text-gray-800 mr-3 text-lg" style={{ fontWeight: 'bold', marginRight: '12px', fontSize: '18px' }}>044-47860455</span>
              <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs shadow-md" style={{ backgroundColor: '#1e2b58', borderRadius: '9999px', padding: '6px', color: 'white', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4" style={{ width: '16px', height: '16px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
              </div>
            </div>
            <div className="flex items-start justify-end text-right" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', textAlign: 'right' }}>
              <span className="text-sm font-semibold text-gray-700 leading-tight" style={{ fontSize: '14px', fontWeight: 600, lineHeight: 1.25, whiteSpace: 'nowrap' }}>
                No.118, Minimac Center,<br />
                Arcot Road, Valasaravakkam,<br />
                Chennai - 600 087.
              </span>
              <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs ml-3 mt-1 shadow-md" style={{ backgroundColor: '#1e2b58', borderRadius: '9999px', padding: '6px', color: 'white', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '12px', marginTop: '4px', flexShrink: 0 }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4" style={{ width: '16px', height: '16px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div style={{ padding: "30px 48px", display: "flex", flexDirection: "column", flexGrow: 1 }}>
        <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "20px", marginBottom: "15px", textDecoration: "underline", letterSpacing: "1px" }}>
          PERFORMANCE PAY AWARD LETTER
        </div>

        <div style={{ textAlign: "right", marginBottom: "15px", fontSize: "11pt", color: "#374151" }}>
          Date: {selectedRecord.letterGeneratedDate ? new Date(selectedRecord.letterGeneratedDate).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN")}
        </div>

        <div style={{ marginBottom: "15px", fontSize: "11pt", lineHeight: "1.4", color: "#1f2937" }}>
          <strong>To,</strong><br />
          <strong>{selectedRecord.employeeName}</strong><br />
          <span>Employee ID: {selectedRecord.employeeId}</span><br />
          <span>Designation: {selectedRecord.designation}</span><br />
          <span>Department: {selectedRecord.department}</span>
        </div>

        <div style={{ marginBottom: "15px", fontSize: "10.5pt", lineHeight: "1.5", color: "#374151", textAlign: "justify" }}>
          Dear {selectedRecord.employeeName},<br /><br />
          We are pleased to inform you that you have been awarded a one-time Performance Pay of <strong>₹{selectedRecord.performancePayAmount.toLocaleString("en-IN")}</strong> based on your contribution and performance during FY <strong>{fy}</strong>.<br /><br />
          CALDIM Performance (Overall) for the FY <strong>{fy}</strong> is <strong>105%</strong> against the peak target of <strong>150%</strong>.<br /><br />
          This amount will be credited in the month of August {payoutYear} provided you are in the company payroll.<br />
          As this information is confidential, we expect you to refrain from sharing the same with your colleagues. If we found any disclosure of the Performance pay to others, it will lead to the revoking of the Performance pay from an individual who disclosed.<br /><br />
          I take this opportunity to thank you for the contribution made by you during the last financial year and wish you a success for the year ahead.<br /><br />
          We look forward to your continued dedication and commitment to the organization.
        </div>

        <div style={{ marginBottom: "15px", fontSize: "8.5pt", lineHeight: "1.35", color: "#4b5563" }}>
          <strong>Notes:</strong>
          <div style={{ marginTop: "4px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "4px" }}>
              <span style={{ minWidth: "15px", fontWeight: "bold" }}>1.</span>
              <span style={{ flex: 1, textAlign: "justify" }}>Your Performance Pay will be subject to applicable statutory deductions, including Tax Deducted at Source (TDS) under the Income Tax Act, 1961, as amended from time to time, and any other statutory obligations.</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "4px" }}>
              <span style={{ minWidth: "15px", fontWeight: "bold" }}>2.</span>
              <span style={{ flex: 1, textAlign: "justify" }}>Employees must be on the Company's active payroll on the date of payment to be eligible for receiving the Performance Pay.</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "4px" }}>
              <span style={{ minWidth: "15px", fontWeight: "bold" }}>3.</span>
              <span style={{ flex: 1, textAlign: "justify" }}>This Performance Pay is a one-time discretionary reward and does not guarantee similar payments in future years. Also, this shall not be considered as part of your fixed salary, future compensation, or any contractual entitlement.</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "4px" }}>
              <span style={{ minWidth: "15px", fontWeight: "bold" }}>4.</span>
              <span style={{ flex: 1, textAlign: "justify" }}>The Company reserves the right to revise, withhold, or recover the payment in case of any violations against Company Policies.</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "4px" }}>
              <span style={{ minWidth: "15px", fontWeight: "bold" }}>5.</span>
              <span style={{ flex: 1, textAlign: "justify" }}>In the event of your resignation within six (6) months from the date of receipt of the Performance Pay, the company shall be entitled to recover the entire Performance Pay amount disbursed to you.</span>
            </div>
          </div>
        </div>

        {/* Signatures — location-based signature image only */}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
          {/* Authorized Signatory (Company) */}
          <div style={{ textAlign: 'left' }}>
            <div className="font-bitsumishi" style={{ fontSize: '11pt', fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>For Caldim Engineering Private Limited</div>
            <div style={{ marginTop: '8px', marginBottom: '4px', height: '70px', display: 'flex', alignItems: 'center' }}>
              <img
                src={sigUrl}
                alt="Authorized Signature"
                crossOrigin="anonymous"
                style={{ height: '64px', width: 'auto', objectFit: 'contain' }}
              />
            </div>
            <div style={{ fontSize: '9pt', color: '#6b7280' }}>Authorized Signatory</div>
          </div>

          {/* Employee */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginTop: '8px', marginBottom: '4px', height: '70px' }}></div>
            <div style={{ width: '160px', borderTop: '1.5px solid #9ca3af', paddingTop: '6px' }}>
              <div style={{ fontSize: '10pt', fontWeight: 'bold', color: '#374151' }}>{selectedRecord.employeeName}</div>
              <div style={{ fontSize: '9pt', color: '#6b7280' }}>Employee Signature & Date</div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer — identical to salary slip footer */}
      <div className="w-full flex items-end mt-auto relative h-20" style={{ width: '100%', display: 'flex', alignItems: 'flex-end', marginTop: 'auto', position: 'relative', height: '80px' }}>
        <div className="bg-[#f37021] flex-1 mb-0 h-8" style={{ backgroundColor: '#f37021', flex: 1, marginBottom: 0, height: '32px' }}></div>
        <div className="bg-[#1e2b58] text-white flex flex-col items-end justify-center relative min-w-[400px] h-16 px-10" style={{ backgroundColor: '#1e2b58', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', position: 'relative', minWidth: '400px', height: '64px', paddingLeft: '40px', paddingRight: '40px' }}>
          <div
            className="absolute inset-y-0 left-0 w-16 bg-[#1e2b58]"
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '64px', backgroundColor: '#1e2b58', transform: 'skew(-20deg)', transformOrigin: 'top left', marginLeft: '-32px' }}
          ></div>
          <div className="text-sm font-medium tracking-wide" style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '0.025em' }}>Website : www.caldimengg.com</div>
          <div className="text-sm font-medium tracking-wide mt-1" style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '0.025em', marginTop: '4px' }}>CIN U74999TN2016PTC110683</div>
        </div>
      </div>
    </div>
  );
};

const getCurrentFinancialYearShort = () => {
  return "2025-26";
};

const getFinancialYearOptions = () => {
  const current = getCurrentFinancialYearShort();
  const start = parseInt(current.split("-")[0], 10);
  return [
    current,
    `${start - 1}-${String(start).slice(2)}`,
    `${start - 2}-${String(start - 1).slice(2)}`,
  ];
};

const PerformancePay = () => {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const userRole = (user.role || "").toLowerCase();
  const hasAccess = ["admin", "hr", "director", "manager"].includes(userRole);
  const isAdmin = userRole === "admin";

  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Tabs for history / management
  const [activeTab, setActiveTab] = useState("current"); // "current" or "history"

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    financialYear: "All",
    department: "All",
    location: "All",
    status: "All",
  });
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isViewLetterOpen, setIsViewLetterOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  // Selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [downloadRecord, setDownloadRecord] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    department: "",
    designation: "",
    location: "",
    financialYear: getCurrentFinancialYearShort(),
    currentSalary: 0,
    performancePayAmount: "",
    reason: "Outstanding Performance",
    remarks: "",
    letterGeneratedDate: "",
  });

  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);

  const reasons = [
    "Outstanding Performance",
    "Project Completion Bonus",
    "Annual Bonus",
    "Client Appreciation",
    "Team Achievement",
    "Special Contribution",
    "Retention Bonus",
    "Performance Payouts"
  ];

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // Admin/HR sees all records
      const [recordsRes, empRes] = await Promise.all([
        performancePayAPI.getAll(),
        employeeAPI.getAllEmployees()
      ]);
      setRecords(recordsRes.data?.data || []);
      setEmployees(empRes.data || []);
    } catch (err) {
      console.error("Error loading performance pay data", err);
      setError("Failed to load records. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Access Denied</h2>
          <p className="text-gray-500 mt-2">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }


  // Derived filter options
  const departments = useMemo(() => {
    const list = records.map(r => r.department).filter(Boolean);
    return ["All", ...new Set(list)];
  }, [records]);

  const locations = useMemo(() => {
    const list = records.map(r => r.location).filter(Boolean);
    return ["All", ...new Set(list)];
  }, [records]);

  const financialYears = useMemo(() => {
    const list = getFinancialYearOptions();
    const existing = records.map(r => r.financialYear).filter(Boolean);
    return [...new Set([...list, ...existing])].sort().reverse();
  }, [records]);

  // Filters logic
  const filteredRecords = useMemo(() => {
    return records
      .filter(item => {
        const matchYear = filters.financialYear === "All" || item.financialYear === filters.financialYear;
        const matchDept = filters.department === "All" || item.department === filters.department;
        const matchLoc = filters.location === "All" || item.location === filters.location;
        const matchStatus = filters.status === "All" || 
          (filters.status === "DRAFT" ? item.status === "DRAFT" : item.status !== "DRAFT");
        const name = (item.employeeName || "").toLowerCase();
        const empId = (item.employeeId || "").toLowerCase();
        const term = searchTerm.toLowerCase();
        const matchSearch = name.includes(term) || empId.includes(term);
        return matchYear && matchDept && matchLoc && matchStatus && matchSearch;
      })
      .sort((a, b) => (a.employeeName || "").localeCompare(b.employeeName || ""));
  }, [records, filters, searchTerm]);

  // Table Totals
  const totals = useMemo(() => {
    return filteredRecords.reduce((acc, curr) => {
      acc.currentSalary += curr.currentSalary || 0;
      acc.performancePayAmount += curr.performancePayAmount || 0;
      return acc;
    }, { currentSalary: 0, performancePayAmount: 0 });
  }, [filteredRecords]);

  // Handle employee dropdown selection and fetch current salary
  const handleEmployeeSelect = async (emp) => {
    setEmployeeSearchTerm(emp.name);
    setIsEmployeeDropdownOpen(false);
    
    let currentSalary = 0;
    try {
      const payrollRes = await payrollAPI.getByEmployeeId(emp.employeeId);
      currentSalary = payrollRes.data ? (payrollRes.data.totalEarnings || 0) : (emp.gross || 0);
    } catch (e) {
      console.error("Error fetching employee payroll details", e);
      currentSalary = emp.gross || 0;
    }

    setFormData(prev => ({
      ...prev,
      employeeId: emp.employeeId,
      employeeName: emp.name,
      department: emp.department || emp.division || "",
      designation: emp.designation || "",
      location: emp.location || "Chennai",
      currentSalary
    }));
  };

  // Add / Edit submission
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!formData.employeeId) {
      setError("Please select an employee.");
      return;
    }
    if (!formData.performancePayAmount || parseFloat(formData.performancePayAmount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    try {
      if (selectedRecord && selectedRecord.status === "DRAFT") {
        await performancePayAPI.update(selectedRecord._id, formData);
        setSuccessMsg("Performance Pay award updated successfully!");
      } else {
        await performancePayAPI.create(formData);
        setSuccessMsg("Performance Pay award created successfully!");
      }
      setIsAddEditOpen(false);
      fetchData();
      resetForm();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Operation failed.");
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: "",
      employeeName: "",
      department: "",
      designation: "",
      location: "",
      financialYear: getCurrentFinancialYearShort(),
      currentSalary: 0,
      performancePayAmount: "",
      reason: "Outstanding Performance",
      remarks: "",
      letterGeneratedDate: "",
    });
    setEmployeeSearchTerm("");
    setSelectedRecord(null);
  };

  const handleEdit = (record) => {
    setSelectedRecord(record);
    setFormData({
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      department: record.department,
      designation: record.designation,
      location: record.location,
      financialYear: record.financialYear,
      currentSalary: record.currentSalary,
      performancePayAmount: record.performancePayAmount,
      reason: record.reason,
      remarks: record.remarks || "",
      letterGeneratedDate: record.letterGeneratedDate ? new Date(record.letterGeneratedDate).toISOString().split('T')[0] : "",
    });
    setEmployeeSearchTerm(record.employeeName);
    setIsAddEditOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await performancePayAPI.remove(id);
      setSuccessMsg("Record deleted successfully.");
      fetchData();
    } catch (err) {
      setError("Failed to delete record.");
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      await performancePayAPI.approve(selectedIds);
      setSuccessMsg("Selected awards approved successfully!");
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      setError("Bulk approve failed.");
    }
  };

  const handleApproveSingle = async (id) => {
    try {
      await performancePayAPI.approve([id]);
      setSuccessMsg("Award approved successfully!");
      fetchData();
    } catch (err) {
      setError("Approve failed.");
    }
  };

  const handleBulkGenerateLetter = async () => {
    if (selectedIds.length === 0) return;
    try {
      await performancePayAPI.generateLetter(selectedIds);
      setSuccessMsg("Letters generated successfully!");
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      setError("Letter generation failed.");
    }
  };

  const handleBulkCredit = async () => {
    if (selectedIds.length === 0) return;
    try {
      await performancePayAPI.credit(selectedIds);
      setSuccessMsg("Marked selected awards as credited.");
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      setError("Bulk credit failed.");
    }
  };

  // Selection toggle
  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecords.map(r => r._id));
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    const dataToExport = filteredRecords.map((r, i) => ({
      "S.No": i + 1,
      "Employee ID": r.employeeId,
      "Employee Name": r.employeeName,
      "Department": r.department,
      "Designation": r.designation,
      "Location": r.location,
      "Financial Year": r.financialYear,
      "Current Salary": r.currentSalary,
      "Performance Pay Amount": r.performancePayAmount,
      "Reason": r.reason,
      "Remarks": r.remarks || "",
      "Status": r.status === "DRAFT" ? "Draft" : "Approved",
      "Letter Gen Date": r.letterGeneratedDate ? new Date(r.letterGeneratedDate).toLocaleDateString() : "",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Performance Pay");
    XLSX.writeFile(wb, `Performance_Pay_${getCurrentFinancialYearShort()}.xlsx`);
  };

  // PDF Export for Table
  const handleExportPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");
    doc.setFontSize(16);
    doc.text("Performance Pay Summary Report", 14, 14);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 20);

    // Total Performance Pay Card
    doc.setFillColor(243, 244, 246); // gray-100 background
    doc.setDrawColor(229, 231, 235); // gray-200 border
    doc.roundedRect(14, 24, 75, 18, 2, 2, "FD");
    
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text("TOTAL PERFORMANCE PAY", 18, 29);
    
    doc.setFontSize(11);
    doc.setTextColor(38, 39, 96); // primary color
    doc.text(`INR ${totals.performancePayAmount.toLocaleString("en-IN")}`, 18, 36);

    const headers = [
      ["S.No", "Emp ID", "Name", "Dept", "Location", "FY", "Salary", "PP Amount", "Status"]
    ];

    const data = filteredRecords.map((r, i) => [
      i + 1,
      r.employeeId,
      r.employeeName,
      r.department,
      r.location,
      r.financialYear,
      r.currentSalary.toLocaleString(),
      r.performancePayAmount.toLocaleString(),
      r.status === "DRAFT" ? "DRAFT" : "APPROVED"
    ]);

    autoTable(doc, {
      head: headers,
      body: data,
      foot: [
        [
          "Total",
          "",
          "",
          "",
          "",
          "",
          totals.currentSalary.toLocaleString("en-IN"),
          totals.performancePayAmount.toLocaleString("en-IN"),
          ""
        ]
      ],
      startY: 46,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [38, 39, 96] },
      footStyles: { fillColor: [229, 231, 235], textColor: [17, 24, 39], fontStyle: "bold" }
    });

    doc.save("Performance_Pay_Report.pdf");
  };

  // PDF Award Letter Download
  const downloadAwardLetter = async (row, isDirect = false) => {
    let elementId = "award-letter-p1";
    if (isDirect) {
      setDownloadRecord(row);
      elementId = "award-letter-p1-hidden";
    }

    setTimeout(async () => {
      const element = document.getElementById(elementId);
      if (!element) {
        if (isDirect) setDownloadRecord(null);
        return;
      }

      try {
        const pdf = new jsPDF("p", "mm", "a4");
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.9);
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const finalHeight = Math.min(imgHeight, 297);

        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, finalHeight);
        pdf.save(`Performance_Pay_Letter_${row.employeeId}.pdf`);
      } catch (error) {
        console.error("Error generating award letter PDF", error);
        alert("Failed to download award letter.");
      } finally {
        if (isDirect) setDownloadRecord(null);
      }
    }, isDirect ? 150 : 0);
  };

  return (
    <div className="min-h-screen pb-20 font-sans relative overflow-hidden bg-gray-50 text-gray-800">
      {/* Header Panel */}
      <div className="sticky top-0 z-20 shadow-sm bg-white border-b border-gray-200 text-gray-800">
        <div className="max-w-[98%] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Coins className="h-6 w-6 text-[#262760]" />
              <h1 className="text-xl font-bold text-gray-850">
                Performance Pay
              </h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                  isFilterOpen
                    ? "bg-indigo-50 border-[#262760] text-[#262760]"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </button>
              
              <button
                onClick={handleExportExcel}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 hover:bg-gray-50 font-medium"
              >
                Export Excel
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-700 hover:bg-gray-50 font-medium"
              >
                Export PDF
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setIsAddEditOpen(true);
                }}
                className="flex items-center px-4 py-2 rounded-md text-sm font-medium bg-[#262760] text-white hover:bg-[#1e2050] transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Performance Pay
              </button>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employee..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#262760] w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[98%] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 relative z-10">
        {/* Error / Success Notifications */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm flex items-center space-x-3 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded shadow-sm flex items-center space-x-3 text-green-700 animate-bounce">
            <CheckCircle className="h-5 w-5" />
            <span>{successMsg}</span>
          </div>
        )}        {/* Filters Panel */}
        {isFilterOpen && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Filter Records</h3>
              <button
                onClick={() => {
                  setFilters({
                    financialYear: "All",
                    department: "All",
                    location: "All",
                    status: "All",
                  });
                  setSearchTerm("");
                }}
                className="text-xs text-red-600 hover:text-red-800 font-medium"
              >
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Financial Year</label>
                <select
                  value={filters.financialYear}
                  onChange={(e) => setFilters(prev => ({ ...prev, financialYear: e.target.value }))}
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-[#262760] focus:border-[#262760]"
                >
                  <option value="All">All Years</option>
                  {financialYears.map(yr => <option key={yr} value={yr}>{yr}</option>)}
                </select>
              </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                    <select
                      value={filters.department}
                      onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-[#262760] focus:border-[#262760]"
                    >
                      {departments.map(dept => <option key={dept} value={dept}>{dept === "All" ? "All Departments" : dept}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                    <select
                      value={filters.location}
                      onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-[#262760] focus:border-[#262760]"
                    >
                      {locations.map(loc => <option key={loc} value={loc}>{loc === "All" ? "All Locations" : loc}</option>)}
                    </select>
                  </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-[#262760] focus:border-[#262760]"
                >
                  <option value="All">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="APPROVED">Approved</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Records Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">

              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#262760] text-white">
                  {/* Summary Row */}
                  <tr className="bg-indigo-50 text-gray-800 font-bold border-b border-indigo-150">
                    <th colSpan={7} className="px-6 py-2.5 text-right text-indigo-900 uppercase tracking-wider text-[10px]">
                      Total Current Salary:
                    </th>
                    <th className="px-6 py-2.5 text-right text-indigo-900 text-sm font-black tabular-nums border-r border-indigo-100">
                      ₹{totals.currentSalary.toLocaleString("en-IN")}
                    </th>
                    <th className="px-6 py-2.5 text-right text-emerald-700 text-sm font-black tabular-nums bg-emerald-100/50 shadow-sm border-x border-emerald-200/30">
                      ₹{totals.performancePayAmount.toLocaleString("en-IN")}
                    </th>
                    <th colSpan={4} className="bg-indigo-50"></th>
                  </tr>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">S.No</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Employee ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Employee Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Designation</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">FY</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">Current Salary</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">PP Amount</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider">Letter Gen Date</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((row, idx) => (
                      <tr key={row._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{idx + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">{row.employeeId}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-800">{row.employeeName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{row.department}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{row.designation}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{row.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{row.financialYear}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600">₹{row.currentSalary.toLocaleString("en-IN")}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-[#262760]">₹{row.performancePayAmount.toLocaleString("en-IN")}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2.5 py-1 text-xs rounded-full font-bold ${
                            row.status === "DRAFT" ? "bg-gray-100 text-gray-700" : "bg-blue-100 text-blue-800"
                          }`}>
                            {row.status === "DRAFT" ? "DRAFT" : "APPROVED"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                          {row.letterGeneratedDate ? new Date(row.letterGeneratedDate).toLocaleDateString("en-IN") : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-2">
                            {/* View / Letter Preview */}
                            <button
                              onClick={() => {
                                setSelectedRecord(row);
                                setIsViewLetterOpen(true);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                              title="Preview Award Letter"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {/* Direct PDF Download Action Button */}
                            <button
                              onClick={() => downloadAwardLetter(row, true)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                            </button>

                            {row.status === "DRAFT" && (
                              <>
                                <button
                                  onClick={() => handleEdit(row)}
                                  className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(row._id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleApproveSingle(row._id)}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                                  title="Approve Award"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={16} className="px-6 py-10 text-center text-gray-500">
                        No Performance Pay records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      {/* Add / Edit Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#262760] text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold">
                {selectedRecord ? "Edit Performance Pay Award" : "Add Performance Pay Award"}
              </h2>
              <button onClick={() => setIsAddEditOpen(false)} className="text-white hover:opacity-75">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Employee Search Component */}
                <div className="relative col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee Name *
                  </label>
                  <input
                    type="text"
                    disabled={!!selectedRecord}
                    value={employeeSearchTerm}
                    onChange={(e) => {
                      setEmployeeSearchTerm(e.target.value);
                      setIsEmployeeDropdownOpen(true);
                    }}
                    onFocus={() => !selectedRecord && setIsEmployeeDropdownOpen(true)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 disabled:bg-gray-150 disabled:cursor-not-allowed"
                    placeholder="Search employee by name or ID..."
                  />

                  {isEmployeeDropdownOpen && employees.length > 0 && (
                    <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {employees
                        .filter(
                          emp =>
                            emp.name.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
                            emp.employeeId.toLowerCase().includes(employeeSearchTerm.toLowerCase())
                        )
                        .map(emp => (
                          <button
                            key={emp._id}
                            type="button"
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex flex-col border-b last:border-0"
                            onClick={() => handleEmployeeSelect(emp)}
                          >
                            <span className="font-semibold text-gray-800">{emp.name}</span>
                            <span className="text-xs text-gray-500">
                              {emp.employeeId} • {emp.designation} • {emp.department}
                            </span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Employee ID</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.employeeId}
                    className="w-full px-3 py-2 border border-gray-250 bg-gray-100 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Department</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.department}
                    className="w-full px-3 py-2 border border-gray-250 bg-gray-100 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Designation</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.designation}
                    className="w-full px-3 py-2 border border-gray-250 bg-gray-100 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Location</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.location}
                    className="w-full px-3 py-2 border border-gray-250 bg-gray-100 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Current Salary</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.currentSalary ? `₹${formData.currentSalary.toLocaleString()}` : "-"}
                    className="w-full px-3 py-2 border border-gray-250 bg-gray-100 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Financial Year</label>
                  <select
                    value={formData.financialYear}
                    onChange={(e) => setFormData(p => ({ ...p, financialYear: e.target.value }))}
                    className="w-full border-gray-305 rounded-lg text-sm focus:ring-[#262760]"
                  >
                    {financialYears.filter(yr => yr !== "All").map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Performance Pay Amount *</label>
                  <input
                    type="number"
                    value={formData.performancePayAmount}
                    onChange={(e) => setFormData(p => ({ ...p, performancePayAmount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-bold text-gray-900"
                    placeholder="Enter Award Amount"
                  />
                </div>



                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Letter Generate Date</label>
                  <input
                    type="date"
                    value={formData.letterGeneratedDate}
                    onChange={(e) => setFormData(p => ({ ...p, letterGeneratedDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks Textarea</label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData(p => ({ ...p, remarks: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Provide additional details or achievements context..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#262760] text-white hover:bg-[#1e2050] font-semibold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-red-600 text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold">Reject Performance Pay</h2>
              <button onClick={() => setIsRejectOpen(false)} className="text-white hover:opacity-75">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <label className="block text-sm font-medium text-gray-700">Rejection Reason</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                placeholder="Please state why you are rejecting this award..."
              />
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRejectOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectSubmit}
                  className="px-5 py-2 rounded-lg bg-red-600 text-white hover:bg-red-750 font-semibold"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Award Letter Modal & hidden print template */}
      {isViewLetterOpen && selectedRecord && (
        <div className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-250 bg-white z-20 shrink-0">
              <h2 className="text-xl font-bold text-gray-800">Performance Pay Award Letter</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => downloadAwardLetter(selectedRecord)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1e2050] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                <button
                  onClick={() => setIsViewLetterOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-4 md:p-8 bg-gray-100 overflow-auto flex flex-col items-center gap-8 flex-grow">
              <AwardLetterContent selectedRecord={selectedRecord} id="award-letter-p1" />
            </div>
          </div>
        </div>
      )}

      {/* Hidden PDF Generation Elements */}
      {downloadRecord && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
          <AwardLetterContent selectedRecord={downloadRecord} id="award-letter-p1-hidden" />
        </div>
      )}
    </div>
  );
};

export default PerformancePay;
