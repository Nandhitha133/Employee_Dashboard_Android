import React, { useEffect, useState } from "react";
import { Eye, Download, Trash2, Plus, Edit2, Check, X, User, Calendar, Building, CreditCard, DollarSign, Clock, AlertCircle, Power, RefreshCcw } from "lucide-react";
import { employeeAPI, loanAPI, BASE_URL } from "../../services/api";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import useNotification from "../../hooks/useNotification";
import Notification from "../../components/Notifications/Notification";
import Modal from "../../components/Modals/Modal";
import { AlertTriangle } from "lucide-react";

export default function LoanSummary() {
  const [loans, setLoans] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  /* -------- FILTERS -------- */
  const [filters, setFilters] = useState({
    employeeId: "",
    location: "all",
    division: "all",
    status: "all"
  });

  const locations = ["all", "Chennai", "Hosur"];
  const divisions = ["all", "SDS", "TEKLA", "DAS(Software)", "Mechanical", "Electrical"];
  const statusOptions = ["all", "active", "completed", "on-hold"];

  /* -------- MODALS -------- */
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  const initialForm = {
    employeeId: "",
    employeeName: "",
    amount: "",
    tenureMonths: "",
    paidMonths: 0,
    startDate: new Date().toISOString().slice(0, 10),
    location: "Chennai",
    division: "SDS",
    status: "active"
  };

  const [form, setForm] = useState(initialForm);
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: "", message: "", onConfirm: null });
  const [pendingSelection, setPendingSelection] = useState(null);
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState(null);

  useEffect(() => {
    fetchLoans();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await employeeAPI.getAllEmployees();
      if (response.data) {
        const data = Array.isArray(response.data) ? response.data : [];
        // Sort employees by employeeId
        const sortedData = data.sort((a, b) => {
          const idA = a.employeeId || "";
          const idB = b.employeeId || "";
          return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
        });
        setEmployees(sortedData);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  /* -------- FETCH -------- */
  async function fetchLoans() {
    setLoading(true);
    try {
      const response = await loanAPI.list(filters);
      if (response.data && response.data.success) {
        setLoans(response.data.loans);
      }
    } catch (error) {
      console.error("Error fetching loans:", error);
    } finally {
      setLoading(false);
    }
  }

  /* -------- FILTER FUNCTIONS -------- */
  const filteredLoans = loans.filter(loan => {
    if (filters.employeeId && !loan.employeeId.toLowerCase().includes(filters.employeeId.toLowerCase())) {
      return false;
    }
    if (filters.location !== "all" && loan.location !== filters.location) {
      return false;
    }
    if (filters.division !== "all" && loan.division !== filters.division) {
      return false;
    }
    if (filters.status !== "all" && loan.status !== filters.status) {
      return false;
    }
    return true;
  });

  /* -------- HELPERS -------- */
  function calcMonthlyDeduction(loan) {
    if (!loan || !loan.amount || !loan.tenureMonths) return 0;
    return Math.round(loan.amount / loan.tenureMonths);
  }

  function remainingBalance(loan) {
    if (!loan) return 0;
    if (loan.status === "completed") return 0;

    // Use the balance calculated by the backend if available
    if (loan.remainingBalance !== undefined && loan.remainingBalance !== null) {
      return Math.max(Number(loan.remainingBalance), 0);
    }

    // Sum up actual payments from repayment history
    let totalPaid = (loan.repaymentHistory || []).reduce((sum, item) => {
      // Only count successfully deducted or paid installments
      if (item.paymentStatus === "deducted" || item.paymentStatus === "paid" || !item.paymentStatus) {
        return sum + (Number(item.emiAmount) || 0);
      }
      return sum;
    }, 0);

    // Fallback to paidMonths if history is empty (legacy support)
    if (totalPaid === 0 && (loan.paidMonths || 0) > 0) {
      totalPaid = calcMonthlyDeduction(loan) * loan.paidMonths;
    }

    const balance = (Number(loan.amount) || 0) - totalPaid;
    return Math.max(balance, 0);
  }

  function isPaymentDue(loan) {
    if (loan.status === "completed") return false;
    const today = new Date();
    const nextDue = new Date(loan.nextDueDate);
    return today > nextDue;
  }

  /* -------- TOGGLE PAYMENT ENABLE/DISABLE -------- */
  async function togglePayment(loanId) { // loanId here corresponds to _id passed from UI
    try {
      const response = await loanAPI.togglePayment(loanId);
      if (response.data && response.data.success) {
        setLoans(prev => prev.map(loan => 
          loan._id === loanId ? response.data.loan : loan
        ));
      }
    } catch (error) {
      console.error("Error toggling payment:", error);
    }
  }

  async function reconcileLoan(loanId) {
    try {
      const response = await axios.post(`${BASE_URL}/loans/${loanId}/reconcile`);
      if (response.data && response.data.success) {
        setLoans(prev => prev.map(loan => 
          loan._id === loanId ? response.data.loan : loan
        ));
        showSuccess("Loan balance reconciled with payroll history successfully");
      }
    } catch (error) {
      console.error("Error reconciling loan:", error);
      showError("Failed to reconcile loan balance");
    }
  }

  /* -------- FORM HANDLING -------- */
  function handleChange(e) {
    const { name, value } = e.target;
    
    // Validation logic
    if (name === "amount") {
      if (Number(value) > 1000000) return; // Max 10 Lakhs
    }
    
    if (name === "tenureMonths") {
      if (Number(value) > 60) return; // Max 60 months
    }

    setForm((s) => ({ ...s, [name]: value }));
  }

  const handleEmployeeChange = (e) => {
    const selectedEmpId = e.target.value;
    const selectedEmp = employees.find(emp => emp.employeeId === selectedEmpId);
    const hasExistingActiveLoan = loans.some(
      (l) => l.employeeId === selectedEmpId && l.status !== "completed"
    );
    if (hasExistingActiveLoan) {
      const nextForm = {
        employeeId: selectedEmpId,
        employeeName: selectedEmp ? selectedEmp.name : "",
        division: selectedEmp ? (selectedEmp.division || "SDS") : form.division,
        location: selectedEmp ? (selectedEmp.location || "Chennai") : form.location
      };
      setPendingSelection(nextForm);
      setConfirmModal({
        visible: true,
        title: "Existing Loan",
        message: "This employee already has an existing loan. Do you want to proceed to add another loan?",
        onConfirm: () => {
          setForm(prev => ({ ...prev, ...nextForm }));
          setConfirmModal({ visible: false, title: "", message: "", onConfirm: null });
          setPendingSelection(null);
        }
      });
      return;
    }
    setForm(prev => ({
      ...prev,
      employeeId: selectedEmpId,
      employeeName: selectedEmp ? selectedEmp.name : "",
      division: selectedEmp ? (selectedEmp.division || "SDS") : prev.division,
      location: selectedEmp ? (selectedEmp.location || "Chennai") : prev.location
    }));
  };

  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters((s) => ({ ...s, [name]: value }));
  }

  /* -------- ADD LOAN -------- */
  async function saveLoan(e) {
    e.preventDefault();

    const requiredFields = ['employeeId', 'employeeName', 'amount', 'tenureMonths'];
    const missingFields = requiredFields.filter(field => !form[field]);

    if (missingFields.length > 0) {
      alert(`Please fill all required fields: ${missingFields.join(', ')}`);
      return;
    }

    const proceedCreate = async () => {
      const payload = {
        employeeId: form.employeeId,
        employeeName: form.employeeName,
        amount: Number(form.amount),
        tenureMonths: Number(form.tenureMonths),
        paidMonths: Number(form.paidMonths || 0),
        startDate: form.startDate,
        location: form.location,
        division: form.division,
        status: "active",
        paymentEnabled: true
      };
      try {
        const response = await loanAPI.create(payload);
        if (response.data && response.data.success) {
          setLoans((prev) => [response.data.loan, ...prev]);
          setForm(initialForm);
          setShowAddModal(false);
        }
      } catch (error) {
        console.error("Error creating loan:", error);
        showError("Failed to create loan");
      }
    };

    const hasExistingActiveLoan = loans.some(
      (l) => l.employeeId === form.employeeId && l.status !== "completed"
    );
    if (hasExistingActiveLoan) {
      setConfirmModal({
        visible: true,
        title: "Existing Loan",
        message: "This employee already has an existing loan. Do you want to proceed to add another loan?",
        onConfirm: async () => {
          await proceedCreate();
          setConfirmModal({ visible: false, title: "", message: "", onConfirm: null });
        }
      });
      return;
    }

    await proceedCreate();
  }

  /* -------- EDIT LOAN -------- */
  function editLoan(loan) {
    setSelectedLoan(loan);
    setForm({
      employeeId: loan.employeeId,
      employeeName: loan.employeeName,
      amount: loan.amount,
      tenureMonths: loan.tenureMonths,
      paidMonths: loan.paidMonths || 0,
      startDate: loan.startDate ? new Date(loan.startDate).toISOString().split('T')[0] : "",
      location: loan.location,
      division: loan.division,
      status: loan.status
    });
    setShowEditModal(true);
  }

  async function updateLoan(e) {
    e.preventDefault();

    const updatedLoan = {
      ...selectedLoan,
      employeeId: form.employeeId,
      employeeName: form.employeeName,
      amount: Number(form.amount),
      tenureMonths: Number(form.tenureMonths),
      paidMonths: Number(form.paidMonths || 0),
      startDate: form.startDate,
      location: form.location,
      division: form.division,
      status: form.status
    };

    try {
      // Use _id for API call
      const response = await loanAPI.update(selectedLoan._id, updatedLoan);
      if (response.data && response.data.success) {
        setLoans(prev => prev.map(loan => 
          loan._id === selectedLoan._id ? response.data.loan : loan
        ));
        
        setShowEditModal(false);
        setSelectedLoan(null);
        setForm(initialForm);
      }
    } catch (error) {
      console.error("Error updating loan:", error);
      showError("Failed to update loan");
    }
  }

  /* -------- ACTIONS -------- */
  function viewLoan(loan) {
    setSelectedLoan(loan);
    setShowViewModal(true);
  }

  function downloadPDF(loan) {
    const doc = new jsPDF();

    // --- COLOR PALETTE ---
    const primaryColor = [38, 39, 96]; // #262760 Deep Navy
    const accentColor = [224, 90, 0];  // Orange Accent
    const textColor = [51, 51, 51];    // Charcoal Text

    // --- TOP DECORATIVE HEADER ---
    doc.setFillColor(38, 39, 96);
    doc.rect(0, 0, 210, 8, "F"); // Header stripe

    // --- BRANDING ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(38, 39, 96);
    doc.text("CALDIM ENGINEERING PRIVATE LIMITED", 20, 25);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("Registered Corporate Loan Statement & Ledger", 20, 30);

    // Decorative Orange Accent Line
    doc.setFillColor(224, 90, 0);
    doc.rect(20, 33, 40, 2, "F");

    // Metadata Right-aligned
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Statement Date: ${new Date().toLocaleDateString("en-IN")}`, 190, 25, { align: "right" });
    doc.text(`Doc Type: Automated Statement`, 190, 30, { align: "right" });

    // --- METADATA CONTAINER ---
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, 42, 180, 34, 4, 4, "FD"); // Padded container

    // Left Column Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(38, 39, 96);
    doc.text("EMPLOYEE INFORMATION", 20, 48);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Employee ID:", 20, 55);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 51, 51);
    doc.text(String(loan.employeeId || ""), 50, 55);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Full Name:", 20, 61);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 51, 51);
    doc.text(String(loan.employeeName || ""), 50, 61);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Division / Loc:", 20, 67);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 51, 51);
    doc.text(`${loan.division || "N/A"} / ${loan.location || "N/A"}`, 50, 67);

    // Right Column Info
    doc.setFont("helvetica", "bold");
    doc.setTextColor(38, 39, 96);
    doc.text("LOAN REGISTRATION", 115, 48);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Start Date:", 115, 55);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 51, 51);
    doc.text(loan.startDate ? new Date(loan.startDate).toLocaleDateString("en-IN") : "N/A", 150, 55);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Account Status:", 115, 61);
    doc.setFont("helvetica", "bold");
    const statusStr = String(loan.status || "active").toUpperCase();
    if (statusStr === "ACTIVE") {
      doc.setTextColor(34, 197, 94); // Green
    } else if (statusStr === "COMPLETED") {
      doc.setTextColor(59, 130, 246); // Blue
    } else {
      doc.setTextColor(224, 90, 0); // Orange/Accent
    }
    doc.text(statusStr, 150, 61);

    // --- FINANCIAL SUMMARY BOXES (KPIs) ---
    const drawKpiCard = (x, y, width, height, title, value, titleColor, valColor, bg) => {
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, y, width, height, 3, 3, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
      doc.text(title, x + 5, y + 6);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(valColor[0], valColor[1], valColor[2]);
      doc.text(value, x + 5, y + 14);
    };

    const monthlyEMI = calcMonthlyDeduction(loan);
    let totalPaid = (loan.repaymentHistory || []).reduce((sum, item) => {
      if (item.paymentStatus === "deducted" || item.paymentStatus === "paid" || !item.paymentStatus) {
        return sum + (Number(item.emiAmount) || 0);
      }
      return sum;
    }, 0);

    // Fallback for legacy support
    if (totalPaid === 0 && (loan.paidMonths || 0) > 0) {
      totalPaid = monthlyEMI * loan.paidMonths;
    }

    drawKpiCard(15, 82, 33, 18, "TOTAL LOAN", `INR ${Number(loan.amount || 0).toLocaleString("en-IN")}`, [100, 100, 100], [51, 51, 51], [255, 255, 255]);
    drawKpiCard(52, 82, 33, 18, "TENURE (MONTHS)", `${loan.tenureMonths} Months`, [100, 100, 100], [51, 51, 51], [255, 255, 255]);
    drawKpiCard(89, 82, 33, 18, "MONTHLY EMI", `INR ${Number(monthlyEMI || 0).toLocaleString("en-IN")}`, [100, 100, 100], [38, 39, 96], [255, 255, 255]);
    drawKpiCard(126, 82, 33, 18, "TOTAL DEDUCTED", `INR ${Number(totalPaid || 0).toLocaleString("en-IN")}`, [100, 100, 100], [34, 197, 94], [240, 253, 244]);
    drawKpiCard(162, 82, 33, 18, "REMAINING BAL.", `INR ${Number(remainingBalance(loan) || 0).toLocaleString("en-IN")}`, [100, 100, 100], [220, 38, 38], [254, 242, 242]);

    // --- REPAYMENT HISTORY TABLE ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(38, 39, 96);
    doc.text("DETAILED REPAYMENT HISTORY LEDGER", 15, 110);

    // Reconstruct payment history if empty for legacy support
    let history = [];
    if (loan.repaymentHistory && loan.repaymentHistory.length > 0) {
      history = [...loan.repaymentHistory];
    } else if (loan.paidMonths > 0) {
      const start = new Date(loan.startDate || new Date());
      for (let i = 1; i <= loan.paidMonths; i++) {
        const deductionDate = new Date(start);
        deductionDate.setMonth(start.getMonth() + i - 1);
        const monthStr = deductionDate.toISOString().substring(0, 7);
        const rem = Math.max((loan.amount || 0) - (monthlyEMI * i), 0);
        history.push({
          emiMonth: monthStr,
          emiAmount: monthlyEMI,
          deductionDate: deductionDate,
          remainingBalance: rem,
          paymentStatus: "deducted"
        });
      }
    }

    const tableHeaders = [
      "INSTALLMENT",
      "DEDUCTION MONTH",
      "EMI AMOUNT",
      "TRANSACTION DATE",
      "REMAINING BALANCE",
      "PAYMENT STATUS"
    ];

    let cumulativePaid = 0;
    const tableBody = history.map((record, index) => {
      const emi = Number(record.emiAmount || monthlyEMI);
      if (record.paymentStatus === "deducted" || record.paymentStatus === "paid" || !record.paymentStatus) {
        cumulativePaid += emi;
      }
      const installNo = `#${index + 1}`;
      const month = record.emiMonth || "N/A";
      const amount = `INR ${emi.toLocaleString("en-IN")}`;
      const txDate = record.deductionDate ? new Date(record.deductionDate).toLocaleDateString("en-IN") : "N/A";
      const currentBalance = Math.max((Number(loan.amount) || 0) - cumulativePaid, 0);
      const balance = `INR ${currentBalance.toLocaleString("en-IN")}`;
      const status = String(record.paymentStatus || "Deducted").toUpperCase();

      return [installNo, month, amount, txDate, balance, status];
    });

    if (tableBody.length === 0) {
      tableBody.push(["-", "No payments recorded yet.", "-", "-", "-", "-"]);
    }

    autoTable(doc, {
      head: [tableHeaders],
      body: tableBody,
      startY: 115,
      styles: { fontSize: 8.5, halign: "center", cellPadding: 3 },
      headStyles: { fillColor: [38, 39, 96], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 28 },
        1: { cellWidth: 32 },
        2: { cellWidth: 28 },
        3: { cellWidth: 32 },
        4: { fontStyle: "bold", cellWidth: 34 },
        5: { fontStyle: "bold", cellWidth: 26 }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const val = String(data.cell.raw).toUpperCase();
          if (val === "DEDUCTED") {
            data.cell.styles.textColor = [22, 163, 74]; // Green
          } else if (val === "PENDING") {
            data.cell.styles.textColor = [220, 38, 38]; // Red
          }
        }
      }
    });

    const pageHeight = doc.internal.pageSize.height;
    
    // Bottom Signature block
    const signatureUrl = loan.location === "Hosur" ? "/signatures/bala-sign.png" : "/signatures/uvaraj-sign.png";
    const signatoryName = loan.location === "Hosur" ? "Bala" : "Uvaraj";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    doc.text("Authorized Signature & Seal", 190, pageHeight - 40, { align: "right" });
    
    // Add Signature Image
    try {
      // Positioned above the signature line
      doc.addImage(signatureUrl, 'PNG', 155, pageHeight - 38, 30, 12);
    } catch (e) {
      console.error("Error adding signature image:", e);
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(140, pageHeight - 25, 190, pageHeight - 25); // Signature line

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text(signatoryName, 165, pageHeight - 20, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text("This is an official computer-generated corporate ledger document.", 105, pageHeight - 12, { align: "center" });

    doc.save(`Loan_Statement_${loan.employeeId || "EMP"}.pdf`);
  }

  async function deleteLoan(loan) {
    setLoanToDelete(loan);
    setIsDeleteModalOpen(true);
  }

  async function confirmDelete() {
    if (!loanToDelete) return;
    try {
      const id = loanToDelete._id;
      const response = await loanAPI.delete(id);
      if (response.data && response.data.success) {
        setLoans((prev) => prev.filter((l) => l._id !== id));
        showSuccess("Loan record deleted successfully!");
        setIsDeleteModalOpen(false);
        setLoanToDelete(null);
      }
    } catch (error) {
      console.error("Error deleting loan:", error);
      showError("Failed to delete loan");
    }
  }

  function getStatusColor(status) {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  /* -------- UI -------- */
  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <div>
          
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#262760] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#1e1f4d] transition-colors shadow-md"
        >
          <Plus size={16} /> Add Loan
        </button>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded-lg shadow border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Employee ID</label>
            <input
              type="text"
              name="employeeId"
              value={filters.employeeId}
              onChange={handleFilterChange}
              placeholder="Search by ID..."
              maxLength={10}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#262760]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <select
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#262760]"
            >
              {locations.map(loc => (
                <option key={loc} value={loc}>
                  {loc === "all" ? "All Locations" : loc}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Division</label>
            <select
              name="division"
              value={filters.division}
              onChange={handleFilterChange}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#262760]"
            >
              {divisions.map(div => (
                <option key={div} value={div}>
                  {div === "all" ? "All Divisions" : div}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#262760]"
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status === "all" ? "All Status" : status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* LOANS TABLE - REMOVED LOAN ID COLUMN */}
      <div className="bg-white shadow rounded-lg overflow-x-auto border">
        <table className="w-full min-w-[1200px]">
          <thead className="bg-gradient-to-r from-[#262760] to-[#3a3b8c] text-white">
            <tr>
              <th className="px-6 py-4 text-center">S.No</th>
              <th className="px-6 py-4">Employee ID</th>
              <th className="px-6 py-4">Employee Name</th>
              <th className="px-6 py-4">Division</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4 text-right">Loan Amount</th>
              <th className="px-6 py-4 text-right">Tenure</th>
              <th className="px-6 py-4 text-right">Monthly EMI</th>
              <th className="px-6 py-4 text-right">Remaining Balance</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-center">Payment</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="12" className="py-10 text-center text-gray-500">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#262760]"></div>
                  </div>
                </td>
              </tr>
            ) : filteredLoans.map((loan, idx) => {
              const isPaymentAllowed = loan.paymentEnabled && loan.status !== 'completed';
              
              return (
                <tr key={loan._id || loan.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <div className="font-semibold text-gray-600">{idx + 1}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium">{loan.employeeId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-gray-900">{loan.employeeName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-700">{loan.division || "N/A"}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-700">{loan.location || "N/A"}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-semibold">₹{Number(loan.amount || 0).toLocaleString("en-IN")}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span>{loan.tenureMonths}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-medium">₹{Number(calcMonthlyDeduction(loan) || 0).toLocaleString("en-IN")}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className={`font-bold ${remainingBalance(loan) === 0 ? 'text-green-600' : 'text-[#262760]'}`}>
                      ₹{Number(remainingBalance(loan) || 0).toLocaleString("en-IN")}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                      {loan.status.charAt(0).toUpperCase() + loan.status.slice(1).replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      {/* Toggle Button */}
                      <button
                        onClick={() => togglePayment(loan._id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${loan.paymentEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                        title={loan.paymentEnabled ? "Click to disable payments" : "Click to enable payments"}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${loan.paymentEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                      
                      {/* Status Text */}
                      <span className={`text-xs mt-1 font-medium ${loan.paymentEnabled ? 'text-green-600' : 'text-red-600'}`}>
                        {loan.paymentEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                      
                      {/* Payment Status Info */}
                      {!isPaymentAllowed && loan.status !== 'completed' && (
                        <span className="text-xs text-gray-500 mt-1">
                          {loan.status === 'on-hold' ? 'Loan on hold' : 'Payments disabled'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => viewLoan(loan)} 
                        className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => editLoan(loan)} 
                        className="p-2 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-lg"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => downloadPDF(loan)} 
                        className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg"
                        title="Download PDF"
                      >
                        <Download size={18} />
                      </button>
                      <button 
                        onClick={() => reconcileLoan(loan._id)} 
                        className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg"
                        title="Auto-Fix Balance (Sync with Payroll)"
                      >
                        <RefreshCcw size={18} />
                      </button>
                      <button 
                        onClick={() => deleteLoan(loan)} 
                        className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && filteredLoans.length === 0 && (
              <tr>
                <td colSpan="12" className="py-10 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <AlertCircle size={48} className="text-gray-300 mb-2" />
                    <p className="text-lg">No loans found matching your filters</p>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your search criteria</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ADD LOAN MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form
            onSubmit={saveLoan}
            className="bg-white p-6 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
          >
            <h2 className="text-xl font-semibold mb-4 text-[#262760]">Add New Loan</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Employee ID *</label>
                <select 
                  name="employeeId" 
                  value={form.employeeId}
                  onChange={handleEmployeeChange}
                  className="border p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#262760]"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id || emp.employeeId} value={emp.employeeId}>
                      {emp.employeeId}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Employee Name *</label>
                <input 
                  name="employeeName" 
                  value={form.employeeName}
                  readOnly
                  placeholder="Full Name" 
                  className="border p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#262760] bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Loan Amount *</label>
                <input 
                  name="amount" 
                  type="number" 
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="50000" 
                  max="1000000"
                  className="border p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#262760]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tenure (Months) *</label>
                <input 
                  name="tenureMonths" 
                  type="number" 
                  value={form.tenureMonths}
                  onChange={handleChange}
                  placeholder="12" 
                  max="60"
                  className="border p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#262760]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-blue-600">Paid Months (Opening Balance)</label>
                <input 
                  name="paidMonths" 
                  type="number" 
                  value={form.paidMonths}
                  onChange={handleChange}
                  placeholder="0" 
                  className="border-2 border-blue-200 p-2 w-full rounded-lg focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <select 
                  name="location" 
                  value={form.location}
                  onChange={handleChange}
                  disabled
                  className="border p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#262760] bg-gray-100 cursor-not-allowed"
                >
                  <option value="Chennai">Chennai</option>
                  <option value="Hosur">Hosur</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Division</label>
                <select 
                  name="division" 
                  value={form.division}
                  onChange={handleChange}
                  disabled
                  className="border p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#262760] bg-gray-100 cursor-not-allowed"
                >
                  <option value="SDS">SDS</option>
                  <option value="TEKLA">TEKLA</option>
                  <option value="DAS(Software)">DAS(Software)</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Electrical">Electrical</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input 
                  name="startDate" 
                  type="date" 
                  value={form.startDate}
                  onKeyDown={(e) => e.preventDefault()}
                  onPaste={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                  onChange={handleChange}
                  inputMode="none"
                  className="border p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#262760]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button 
                type="button" 
                onClick={() => {
                  setShowAddModal(false);
                  setForm(initialForm);
                }} 
                className="border px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-[#262760] text-white px-4 py-2 rounded-lg hover:bg-[#1e1f4d] transition-colors"
              >
                Submit Loan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT LOAN MODAL */}
      {showEditModal && selectedLoan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form
            onSubmit={updateLoan}
            className="bg-white p-6 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
          >
            <h2 className="text-xl font-semibold mb-4 text-[#262760]">Edit Loan</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Employee ID *</label>
                <input 
                  name="employeeId" 
                  value={form.employeeId}
                  placeholder="E001" 
                  maxLength={10}
                  className="border p-2 w-full rounded-lg bg-gray-100 cursor-not-allowed"
                  disabled
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Employee Name *</label>
                <input 
                  name="employeeName" 
                  value={form.employeeName}
                  placeholder="Full Name" 
                  className="border p-2 w-full rounded-lg bg-gray-100 cursor-not-allowed"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Loan Amount *</label>
                <input 
                  name="amount" 
                  type="number" 
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="50000" 
                  max="1000000"
                  className="border p-2 w-full rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tenure (Months) *</label>
                <input 
                  name="tenureMonths" 
                  type="number" 
                  value={form.tenureMonths}
                  onChange={handleChange}
                  placeholder="12" 
                  max="60"
                  className="border p-2 w-full rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-blue-600">Paid Months (Opening Balance)</label>
                <input 
                  name="paidMonths" 
                  type="number" 
                  value={form.paidMonths}
                  onChange={handleChange}
                  placeholder="0" 
                  className="border-2 border-blue-200 p-2 w-full rounded-lg focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <select 
                  name="location" 
                  value={form.location}
                  onChange={handleChange}
                  className="border p-2 w-full rounded-lg"
                >
                  <option value="Chennai">Chennai</option>
                  <option value="Hosur">Hosur</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Division</label>
                <select 
                  name="division" 
                  value={form.division}
                  onChange={handleChange}
                  className="border p-2 w-full rounded-lg"
                >
                  <option value="SDS">SDS</option>
                  <option value="TEKLA">TEKLA</option>
                  <option value="DAS(Software)">DAS(Software)</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Electrical">Electrical</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input 
                  name="startDate" 
                  type="date" 
                  value={form.startDate}
                  onKeyDown={(e) => e.preventDefault()}
                  onPaste={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                  onChange={handleChange}
                  inputMode="none"
                  className="border p-2 w-full rounded-lg"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Status</label>
                <select 
                  name="status" 
                  value={form.status}
                  onChange={handleChange}
                  className="border p-2 w-full rounded-lg"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button 
                type="button" 
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedLoan(null);
                  setForm(initialForm);
                }} 
                className="border px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-[#262760] text-white px-4 py-2 rounded-lg hover:bg-[#1e1f4d]"
              >
                Update Loan
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmModal.visible && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md shadow-xl border">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">{confirmModal.title || "Confirmation"}</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700">{confirmModal.message}</p>
            </div>
            <div className="px-6 pb-4 flex justify-end gap-3">
              <button
                className="border px-4 py-2 rounded-lg hover:bg-gray-50"
                onClick={() => {
                  setConfirmModal({ visible: false, title: "", message: "", onConfirm: null });
                  setPendingSelection(null);
                }}
              >
                Cancel
              </button>
              <button
                className="bg-[#262760] text-white px-4 py-2 rounded-lg hover:bg-[#1e1f4d]"
                onClick={() => {
                  const fn = confirmModal.onConfirm;
                  if (typeof fn === "function") fn();
                }}
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {showViewModal && selectedLoan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#262760] to-[#3a3b8c] text-white p-6">
              <h2 className="text-2xl font-semibold mb-2">Loan Details</h2>
              <p className="text-blue-100">Complete information about the loan</p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Employee Details Card */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <User className="text-blue-600" size={24} />
                    </div>
                    <h3 className="text-xl font-semibold text-blue-900">Employee Details</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Employee ID:</span>
                      <span className="font-semibold text-blue-900">{selectedLoan.employeeId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Full Name:</span>
                      <span className="font-semibold text-blue-900">{selectedLoan.employeeName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Location:</span>
                      <div className="flex items-center gap-2">
                        <Building size={14} className="text-gray-400" />
                        <span className="font-semibold">{selectedLoan.location}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Division:</span>
                      <span className="font-semibold bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                        {selectedLoan.division}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Loan Details Card */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <CreditCard className="text-green-600" size={24} />
                    </div>
                    <h3 className="text-xl font-semibold text-green-900">Loan Details</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Amount:</span>
                      <div className="flex items-center gap-2">
                        <DollarSign size={14} className="text-green-600" />
                        <span className="font-bold text-lg text-green-900">
                          ₹{Number(selectedLoan.amount || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Tenure:</span>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-400" />
                        <span className="font-semibold">{selectedLoan.tenureMonths} months</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Start Date:</span>
                      <div className="flex items-center gap-2">
                        <Calendar size={10} className="text-gray-400" />
                        <span className="font-semibold">{selectedLoan.startDate ? new Date(selectedLoan.startDate).toLocaleDateString("en-IN") : "N/A"}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Monthly EMI:</span>
                      <span className="font-bold text-green-900">
                        ₹{Number(calcMonthlyDeduction(selectedLoan) || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Paid Months:</span>
                      <span className="font-semibold text-green-900">{selectedLoan.paidMonths || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Status Card */}
                <div className="md:col-span-2 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Power className="text-purple-600" size={24} />
                    </div>
                    <h3 className="text-xl font-semibold text-purple-900">Payment Status</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="text-sm text-gray-500 mb-1">Remaining Balance</div>
                      <div className="text-2xl font-bold text-[#262760]">
                        ₹{Number(remainingBalance(selectedLoan) || 0).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="text-sm text-gray-500 mb-1">Status</div>
                      <div className={`inline-block px-4 py-1 rounded-full font-semibold ${getStatusColor(selectedLoan.status)}`}>
                        {selectedLoan.status.charAt(0).toUpperCase() + selectedLoan.status.slice(1).replace('-', ' ')}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="text-sm text-gray-500 mb-1">Payment Status</div>
                      <div className="flex items-center gap-2">
                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full ${selectedLoan.paymentEnabled ? 'bg-green-500' : 'bg-red-500'}`}>
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${selectedLoan.paymentEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                          />
                        </div>
                        <span className={`font-semibold ${selectedLoan.paymentEnabled ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedLoan.paymentEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dates Panel */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg border border-purple-50 flex justify-between items-center text-sm">
                      <span className="text-gray-500">Last Deduction:</span>
                      <span className="font-semibold text-gray-700">
                        {selectedLoan.lastDeductionDate ? new Date(selectedLoan.lastDeductionDate).toLocaleDateString("en-IN") : "N/A"}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-purple-50 flex justify-between items-center text-sm">
                      <span className="text-gray-500">Next EMI Date:</span>
                      <span className="font-semibold text-[#262760]">
                        {selectedLoan.nextDeductionDate ? new Date(selectedLoan.nextDeductionDate).toLocaleDateString("en-IN") : (selectedLoan.status === "completed" ? "N/A" : "Next Payroll Run")}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Payment Progress ({Math.round(((selectedLoan.paidMonths || 0) / (selectedLoan.tenureMonths || 1)) * 100)}%)</span>
                      <span>{selectedLoan.paidMonths || 0} of {selectedLoan.tenureMonths} months</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(((selectedLoan.paidMonths || 0) / (selectedLoan.tenureMonths || 1)) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Repayment History Section */}
                <div className="md:col-span-2 bg-white rounded-xl p-5 border border-gray-200 mt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Loan Repayment History</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                          <th className="px-4 py-2">EMI Month</th>
                          <th className="px-4 py-2">EMI Amount</th>
                          <th className="px-4 py-2">Deduction Date</th>
                          <th className="px-4 py-2">Remaining Balance</th>
                          <th className="px-4 py-2">Payment Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!selectedLoan.repaymentHistory || selectedLoan.repaymentHistory.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-4 py-6 text-center text-gray-400">
                              No repayments recorded yet.
                            </td>
                          </tr>
                        ) : (
                          selectedLoan.repaymentHistory.map((history, idx) => {
                            // Calculate cumulative paid up to this row
                            const cumulativePaid = selectedLoan.repaymentHistory
                              .slice(0, idx + 1)
                              .reduce((sum, item) => {
                                if (item.paymentStatus === "deducted" || item.paymentStatus === "paid" || !item.paymentStatus) {
                                  return sum + (Number(item.emiAmount) || 0);
                                }
                                return sum;
                              }, 0);
                            const rowBalance = Math.max((Number(selectedLoan.amount) || 0) - cumulativePaid, 0);

                            return (
                              <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">{history.emiMonth}</td>
                                <td className="px-4 py-3">₹{Number(history.emiAmount || 0).toLocaleString("en-IN")}</td>
                                <td className="px-4 py-3">
                                  {history.deductionDate ? new Date(history.deductionDate).toLocaleDateString("en-IN") : "N/A"}
                                </td>
                                <td className="px-4 py-3">₹{rowBalance.toLocaleString("en-IN")}</td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                                    {history.paymentStatus || "deducted"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t p-4 flex justify-end">
              <button 
                onClick={() => setShowViewModal(false)} 
                className="px-6 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1e1f4d] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-red-600">
            <AlertTriangle className="w-10 h-10" />
            <p className="text-sm font-medium">
              Are you sure you want to delete the loan record for <span className="font-bold">{loanToDelete?.employeeName}</span>? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />
    </div>
  );
}
