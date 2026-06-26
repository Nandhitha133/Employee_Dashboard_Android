import React, { useState, useEffect } from "react";
import {
  Eye,
  FileText,
  Plus,
  Trash2,
  Download,
  Filter,
  Search,
  Save,
  Edit,
  X,
  TrendingDown,
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Wallet,
  Banknote,
  Receipt,
  File,
  ExternalLink,
  FileSpreadsheet
} from "lucide-react";
import { message, Popconfirm, Modal } from "antd";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import XLSX from "xlsx-js-style";
import { expenditureAPI, BASE_URL } from "../../services/api";

const ExpenditureManagement = () => {
  const [activeTab, setActiveTab] = useState("manage");
  const [viewMode, setViewMode] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  /* ---------------- MASTER DATA ---------------- */
  const [expenditureTypes, setExpenditureTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(false);

  const paymentModes = [
    "Net Banking",
    "UPI",
    "Credit Card",
    "Cheque",
    "Cash"
  ];

  const documentTypes = [
    "Invoice",
    "Voucher",
    "Not Applicable"
  ];

  const locations = ["Chennai", "Hosur"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthNames = {
    "Jan": "January", "Feb": "February", "Mar": "March", "Apr": "April",
    "May": "May", "Jun": "June", "Jul": "July", "Aug": "August",
    "Sep": "September", "Oct": "October", "Nov": "November", "Dec": "December"
  };
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = months[now.getMonth()];
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  /* ---------------- HELPER FUNCTIONS ---------------- */
  const getAvailableMonths = (selectedYear) => {
    const yearNum = parseInt(selectedYear);
    if (!yearNum) return months;

    if (yearNum < currentYear) {
      return months;
    }

    if (yearNum === currentYear) {
      const currentMonthIndex = now.getMonth();
      return months.slice(0, currentMonthIndex + 1);
    }

    return []; // Future year
  };

  /* ---------------- MANAGE TAB STATES ---------------- */
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear.toString());
  const [location, setLocation] = useState("");
  const [budgetAllocated, setBudgetAllocated] = useState("");
  const [openingBalance, setOpeningBalance] = useState(0);

  const [expenditures, setExpenditures] = useState([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [savingMessage, setSavingMessage] = useState("");

  const [newExpense, setNewExpense] = useState({
    type: "",
    customType: "",
    paymentMode: "",
    amount: "",
    documentType: "",
    file: null,
    fileData: "",
    fileName: "",
    filePath: "",
    remarks: "",
    date: ""
  });

  /* ---------------- SUMMARY TAB STATES ---------------- */
  const [summaryLocation, setSummaryLocation] = useState("");
  const [summaryYear, setSummaryYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState([]);

  /* ---------------- EXPORT STATES ---------------- */
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState("monthly");
  const [exportFY, setExportFY] = useState("2025-26");
  const [exportMonth, setExportMonth] = useState("");
  const [exportYear, setExportYear] = useState("");
  const [exportLocation, setExportLocation] = useState("");
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportFormat, setExportFormat] = useState("excel");
  const [exportSortOrder, setExportSortOrder] = useState("asc");

  /* ---------------- MODAL STATES ---------------- */
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [detailedRecord, setDetailedRecord] = useState(null);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [documentType, setDocumentType] = useState("");

  // New States for Validation and Editing
  // New States for Validation and Editing
  const [errors, setErrors] = useState({});
  const [summaryErrors, setSummaryErrors] = useState({});
  const [editingExpenditureId, setEditingExpenditureId] = useState(null);

  // New Type Modal States
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [newTypeData, setNewTypeData] = useState({
    type_name: "",
    description: ""
  });
  const [typeSubmitLoading, setTypeSubmitLoading] = useState(false);

  const monthMap = {
    "Jan": 0, "Feb": 1, "Mar": 2, "Apr": 3, "May": 4, "Jun": 5,
    "Jul": 6, "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11
  };

  const getMonthDateRange = () => {
    if (!month || !year) return { min: "", max: "", disabled: true };
    const monthIndex = monthMap[month];
    if (monthIndex === undefined) return { min: "", max: "", disabled: true };

    const yearNum = parseInt(year);
    // First day: yyyy-mm-01
    const min = `${yearNum}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    
    // Last day:
    let lastDay;
    if (yearNum === currentYear && monthIndex === now.getMonth()) {
        // If it's the current month/year, cap it at today
        lastDay = now.getDate();
    } else {
        lastDay = new Date(yearNum, monthIndex + 1, 0).getDate();
    }
    
    const max = `${yearNum}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { min, max, disabled: false };
  };

  /* ---------------- CALCULATIONS ---------------- */
  const budgetSpent = expenditures.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const remainingBalance = parseFloat(budgetAllocated || 0) - budgetSpent;
  const budgetStatus = remainingBalance >= 0 ? "success" : "danger";
  const budgetStatusText = remainingBalance >= 0
    ? `Within limit (+₹${remainingBalance.toLocaleString('en-IN')})`
    : `Over spent (₹${Math.abs(remainingBalance).toLocaleString('en-IN')})`;

  /* ---------------- INITIAL LOAD ---------------- */
  useEffect(() => {
    testAPIConnection();
    fetchExpenseTypes();
  }, []);

  const fetchExpenseTypes = async () => {
    try {
      setTypesLoading(true);
      const res = await expenditureAPI.getExpenseTypes();
      if (res.data && res.data.success) {
        setExpenditureTypes(res.data.data.map(t => t.type_name));
      }
    } catch (err) {
      console.error("Error fetching expense types:", err);
      // Fallback to defaults if API fails
      setExpenditureTypes([
        "Milk", "Food", "Maid Salary", "Bakery", "Intern Stipend", 
        "LinkedIn Subscription", "The Cake Home", "Flower Bill", 
        "Electricity Bill", "AirFiber Bill", "Others"
      ]);
    } finally {
      setTypesLoading(false);
    }
  };

  const handleAddType = async () => {
    if (!newTypeData.type_name.trim()) {
      message.error("Type name is mandatory");
      return;
    }

    try {
      setTypeSubmitLoading(true);
      const res = await expenditureAPI.addExpenseType(newTypeData);
      
      if (res.data && res.data.success) {
        message.success(res.data.message || "Expense type added successfully");
        
        // Refresh types list
        await fetchExpenseTypes();
        
        // Auto-select the newly added type
        setNewExpense({
          ...newExpense,
          type: newTypeData.type_name.trim()
        });
        
        // Reset modal and close
        setNewTypeData({ type_name: "", description: "" });
        setTypeModalOpen(false);
      }
    } catch (err) {
      console.error("Error adding expense type:", err);
      message.error(err.response?.data?.message || "Failed to add expense type");
    } finally {
      setTypeSubmitLoading(false);
    }
  };

  // Auto-load summary when switching to Summary tab or changing year/location
  useEffect(() => {
    if (activeTab === "summary" && summaryYear) {
      loadSummary();
    }
  }, [activeTab, summaryYear, summaryLocation]);

  // Check for existing record when Month, Year, Location changes
  useEffect(() => {
    if (month && year && location && !viewMode) {
      checkExistingRecord();
    }
  }, [month, year, location]);

  const calculateOpeningBalanceFromSummary = (records, currentMonth) => {
    if (!records || !currentMonth) return 0;
    const monthIndex = monthMap[currentMonth];
    if (monthIndex === undefined || monthIndex === 0) return 0;
    const prevMonth = months[monthIndex - 1];
    const prevRecord = records.find(r => r.month === prevMonth);
    if (!prevRecord) return 0;
    const totalExpenditure = prevRecord.expenditures?.reduce(
      (sum, e) => sum + parseFloat(e.amount || 0),
      0
    ) || 0;
    const prevBudgetAllocated = prevRecord.budget || prevRecord.budgetAllocated || 0;
    const balance = prevBudgetAllocated - totalExpenditure;
    return balance > 0 ? balance : 0;
  };

  const checkExistingRecord = async () => {
    try {
      // Check if a record already exists for this combination
      const res = await expenditureAPI.getSummary({ year, location });
      if (res.data && res.data.success) {
        const opening = calculateOpeningBalanceFromSummary(res.data.data, month);
        setOpeningBalance(opening);
        // Look for exact match on month
        const existing = res.data.data.find(r => r.month === month);

        if (existing) {
          const confirmLoad = window.confirm(
            `A record for ${month} ${year} in ${location} already exists.\n\n` +
            `You cannot create a duplicate record.\n` +
            `Click OK to load the existing record for editing/adding expenditures.\n` +
            `Click Cancel to change the selection.`
          );

          if (confirmLoad) {
            loadRecordForEditing(existing._id || existing.id);
          } else {
            // Clear selection to prevent user from trying to save
            setMonth("");
          }
        }
      }
    } catch (err) {
      console.error("Error checking for existing record:", err);
    }
  };

  const testAPIConnection = async () => {
    try {
      console.log("Testing API connection...");
      const response = await expenditureAPI.healthCheck();
      console.log("✅ API Connection successful:", response.data);
    } catch (error) {
      console.error("❌ API Connection failed:", error);
      message.error(`⚠️ Cannot connect to server. Please make sure backend is running on http://localhost:5003 - Error: ${error.message}`);
    }
  };

  /* ---------------- DOCUMENT FUNCTIONS ---------------- */
  const viewUploadedFile = (fileData, fileName) => {
    if (!fileData) {
      message.warning("No file to view");
      return;
    }

    // Check if it's a File object (not uploaded yet) or Base64 string
    if (typeof fileData === 'object' && fileData instanceof File) {
        const fileURL = URL.createObjectURL(fileData);
        setCurrentDocument({
            file: fileURL,
            name: fileName || fileData.name,
            type: fileData.type
        });
        setDocumentType(fileData.type.startsWith('image/') ? 'image' :
            fileData.type === 'application/pdf' ? 'pdf' : 'file');
        setDocumentModalOpen(true);
    } else if (typeof fileData === 'string') {
        setCurrentDocument({
            file: fileData,
            name: fileName || "Document",
            type: "file"
        });
        
        // Try to detect type from Base64 header or filename
        let isImage = false;
        let isPdf = false;

        if (fileData.startsWith('data:image')) {
            isImage = true;
        } else if (fileData.startsWith('data:application/pdf')) {
            isPdf = true;
        } else {
            const extension = fileName ? fileName.split('.').pop().toLowerCase() : '';
            if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
                isImage = true;
            } else if (extension === 'pdf') {
                isPdf = true;
            }
        }

        if (isImage) {
            setDocumentType('image');
        } else if (isPdf) {
            setDocumentType('pdf');
        } else {
            setDocumentType("file");
        }
        setDocumentModalOpen(true);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        message.error('Only JPEG, PNG, and PDF files are allowed');
        return;
      }

      if (file.size > 2 * 1024 * 1024) { // 2MB limit for DB storage
        message.error('File size should be less than 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setNewExpense({
          ...newExpense,
          file: file,
          fileData: reader.result,
          fileName: file.name,
          filePath: ""
        });
      };
      reader.readAsDataURL(file);
    }
  };

  /* ---------------- MANAGE TAB FUNCTIONS ---------------- */
  const addExpenditure = async () => {
    let type = newExpense.type;
    if (type === "Others" && newExpense.customType.trim()) {
      type = newExpense.customType;
    }

    // Validation
    const newErrors = {};
    // Check Master Fields
    if (!month) newErrors.month = "Month is required";
    if (!year) newErrors.year = "Year is required";
    if (!location) newErrors.location = "Location is required";
    if (!budgetAllocated) newErrors.budgetAllocated = "Budget Allocated is required";

    // Check Expenditure Fields
    if (!type) newErrors.type = true;
    if (!newExpense.paymentMode) newErrors.paymentMode = true;
    if (!newExpense.amount) newErrors.amount = true;
    if (!newExpense.date) newErrors.date = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // alert("Please fill all required fields correctly.");
      return;
    }

    if (parseFloat(newExpense.amount) <= 0) {
      message.error("Amount must be greater than 0");
      return;
    }

    let fileData = newExpense.fileData || "";
    let filePath = newExpense.filePath || "";

    if (editingExpenditureId) {
      // Update existing
      setExpenditures(expenditures.map(exp =>
        exp.id === editingExpenditureId ? {
          ...exp,
          type: type,
          paymentMode: newExpense.paymentMode,
          amount: parseFloat(newExpense.amount) || 0,
          date: newExpense.date,
          documentType: newExpense.documentType || 'Not Applicable',
          fileData: fileData,
          fileName: newExpense.fileName,
          filePath: filePath,
          remarks: newExpense.remarks
        } : exp
      ));
      setEditingExpenditureId(null);
    } else {
      // Add new
      const newExpenditure = {
        id: Date.now() + Math.random(), // Unique ID
        type: type,
        paymentMode: newExpense.paymentMode,
        amount: parseFloat(newExpense.amount) || 0,
        date: newExpense.date,
        documentType: newExpense.documentType || 'Not Applicable',
        fileData: fileData,
        fileName: newExpense.fileName,
        filePath: filePath,
        remarks: newExpense.remarks,
        sNo: expenditures.length + 1
      };
      setExpenditures([...expenditures, newExpenditure]);
    }

    // Reset Form
    setNewExpense({
      type: "",
      customType: "",
      paymentMode: "",
      amount: "",
      documentType: "",
      file: null,
      fileData: "",
      fileName: "",
      filePath: "",
      remarks: "",
      date: ""
    });
    setErrors({});
  };

  const removeExpense = (id) => {
    setExpenditures(expenditures.filter((e) => e.id !== id));
    // Update serial numbers
    setExpenditures(prev => prev.map((item, index) => ({
      ...item,
      sNo: index + 1
    })));
    message.success("Expenditure deleted successfully");
  };

  const editExpense = (id) => {
    const expenseToEdit = expenditures.find(e => e.id === id);
    if (expenseToEdit) {
      setNewExpense({
        type: expenseToEdit.type,
        customType: expenseToEdit.type === "Others" ? expenseToEdit.type : "",
        paymentMode: expenseToEdit.paymentMode,
        amount: expenseToEdit.amount,
        documentType: expenseToEdit.documentType,
        file: null, // Reset file input
        fileData: expenseToEdit.fileData,
        fileName: expenseToEdit.fileName,
        filePath: expenseToEdit.filePath || "",
        remarks: expenseToEdit.remarks,
        date: expenseToEdit.date
      });
      setEditingExpenditureId(id);
      setErrors({});
      // removeExpense(id); // Don't remove for better UX
    }
  };

  const clearForm = () => {
    setMonth(currentMonth);
    setYear(currentYear.toString());
    setLocation("");
    setBudgetAllocated("");
    setOpeningBalance(0);
    setExpenditures([]);
    setSelectedRecord(null);
    setViewMode(false);
    setNewExpense({
      type: "",
      customType: "",
      paymentMode: "",
      amount: "",
      documentType: "",
      file: null,
      fileData: "",
      fileName: "",
        filePath: "",
      remarks: "",
      date: ""
    });
    setErrors({});
    setEditingExpenditureId(null);
  };

  /* ---------------- CANCEL EDIT FUNCTION ---------------- */
  const cancelEdit = () => {
    setNewExpense({
      type: "",
      customType: "",
      paymentMode: "",
      amount: "",
      documentType: "",
      file: null,
      fileData: "",
      fileName: "",
        filePath: "",
      remarks: "",
      date: ""
    });
    setErrors({});
    setEditingExpenditureId(null);
  };

  /* ---------------- SAVE FUNCTION WITH PROPER DB INTEGRATION ---------------- */
  const saveRecord = async () => {
    // Validate required fields
    if (!month || !year || !location || !budgetAllocated) {
      message.error("Month, Year, Location, and Budget Allocated are required");
      return;
    }

    if (expenditures.length === 0) {
      message.warning("Please add at least one expenditure record");
      return;
    }

    // Prepare record data
    const record = {
      month,
      year: parseInt(year),
      location,
      budgetAllocated: parseFloat(budgetAllocated || 0),
      expenditures: expenditures.map(e => ({
        type: e.type,
        paymentMode: e.paymentMode,
        amount: parseFloat(e.amount || 0),
        date: e.date,
        documentType: e.documentType || 'Not Applicable',
        fileName: e.fileName || '',
        fileData: e.fileData || '',
        filePath: e.filePath || '',
        remarks: e.remarks || ''
        // Note: file object is not included as it needs separate handling
      }))
    };

    try {
      setSaveLoading(true);
      setSavingMessage("Saving record to database...");

      console.log('📤 Preparing to save record:', record);

      let response;
      if (viewMode && selectedRecord) {
        console.log('✏️ Updating existing record:', selectedRecord._id);
        response = await expenditureAPI.updateRecord(selectedRecord._id, record);
      } else {
        console.log('➕ Creating new record');
        response = await expenditureAPI.saveMonthlyRecord(record);
      }

      console.log('✅ API Response:', response.data);

      if (response.data && response.data.success) {
        message.success(`✅ Record ${viewMode ? 'updated' : 'saved'} successfully in database!`);

        // Update summary filters to match the saved record
        setSummaryYear(year);
        setSummaryLocation(location);

        // Switch to summary tab to show the saved data
        setActiveTab("summary");

        clearForm();
      } else {
        message.error(`❌ ${viewMode ? 'Update' : 'Save'} failed: ${response.data?.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("❌ Save error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Unknown error";

      // Special handling for duplicate record error
      if (err.response?.status === 400 && errorMessage.includes("already exists")) {
        message.error(`❌ Cannot save: A record for this period already exists. Please check the 'Summary' tab to find and edit the existing record.`);
      } else {
        message.error(`❌ Save failed: ${errorMessage}`);
      }

      // Detailed error logging
      if (err.response) {
        console.error("Error status:", err.response.status);
        console.error("Error data:", err.response.data);
        console.error("Error config:", err.response.config);
      }
    } finally {
      setSaveLoading(false);
      setSavingMessage("");
    }
  };

  /* ---------------- SUMMARY TAB FUNCTIONS ---------------- */
  const loadSummary = async () => {
    if (!summaryYear) {
      setSummaryErrors({ summaryYear: "Year is required" });
      return;
    }
    setSummaryErrors({});

    try {
      setLoading(true);
      const params = { year: summaryYear };

      if (summaryLocation && summaryLocation !== "Select All") {
        params.location = summaryLocation;
      }

      console.log('📊 Loading summary with params:', params);
      const res = await expenditureAPI.getSummary(params);
      console.log('📊 Summary response:', res.data);

      if (res.data && res.data.success && res.data.data) {
        const processedData = res.data.data.map((record, index) => {
          const totalExpenditure = record.expenditures?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
          const budgetAllocated = record.budget || record.budgetAllocated || 0;
          const totalBalance = budgetAllocated - totalExpenditure;
          const status = totalBalance >= 0 ? "success" : "danger";
          const statusText = totalBalance >= 0
            ? `Within limit (+₹${totalBalance.toLocaleString('en-IN')})`
            : `Over spent (₹${Math.abs(totalBalance).toLocaleString('en-IN')})`;

          return {
            ...record,
            id: record._id || record.id,
            sNo: index + 1,
            totalExpenditure,
            budgetAllocated,
            totalBalance,
            status,
            statusText
          };
        });

        setSummaryData(processedData);
        console.log('📊 Processed summary data:', processedData);
      } else if (res.data && Array.isArray(res.data.data)) {
        // Handle case where data is directly an array (unwrapped success flag)
        const processedData = res.data.data.map((record, index) => {
          const totalExpenditure = record.expenditures?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
          const budgetAllocated = record.budget || record.budgetAllocated || 0;
          const totalBalance = budgetAllocated - totalExpenditure;
          const status = totalBalance >= 0 ? "success" : "danger";
          const statusText = totalBalance >= 0
            ? `Within limit (+₹${totalBalance.toLocaleString('en-IN')})`
            : `Over spent (₹${Math.abs(totalBalance).toLocaleString('en-IN')})`;

          return {
            ...record,
            id: record._id || record.id,
            sNo: index + 1,
            totalExpenditure,
            budgetAllocated,
            totalBalance,
            status,
            statusText
          };
        });
        setSummaryData(processedData);
      } else {
        console.log('📊 No data found in response');
        setSummaryData([]);
      }
    } catch (err) {
      console.error("❌ Summary error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Unknown error";
      message.error(`❌ Error loading summary data: ${errorMessage}`);
      setSummaryData([]);
    } finally {
      setLoading(false);
    }
  };

  const viewRecordDetails = async (recordId) => {
    try {
      setLoading(true);
      console.log('📄 Fetching record details for ID:', recordId);
      const res = await expenditureAPI.getRecordById(recordId);
      console.log('📄 Record details response:', res.data);

      if (res.data && res.data.success) {
        const record = res.data.data;

        // Calculate totals
        const totalExpenditure = record.expenditures?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
        const budgetAllocated = record.budget || record.budgetAllocated || 0;
        const remainingBalance = budgetAllocated - totalExpenditure;
        const budgetStatus = remainingBalance >= 0 ? "success" : "danger";
        const budgetStatusText = remainingBalance >= 0
          ? `Within limit (+₹${remainingBalance.toLocaleString('en-IN')})`
          : `Over spent (₹${Math.abs(remainingBalance).toLocaleString('en-IN')})`;

        setDetailedRecord({
          ...record,
          budgetAllocated,
          budgetSpent: totalExpenditure,
          remainingBalance,
          budgetStatus,
          budgetStatusText
        });
        setViewModalOpen(true);
      } else {
        message.warning("No record found");
      }
    } catch (err) {
      console.error("❌ Error loading record details:", err);
      message.error("Failed to load record details");
    } finally {
      setLoading(false);
    }
  };

  const deleteRecord = async (recordId) => {
    try {
      console.log('🗑️ Deleting record:', recordId);
      await expenditureAPI.deleteRecord(recordId);
      message.success("✅ Record deleted successfully from database");

      // Refresh summary if in summary tab
      if (activeTab === "summary" && summaryYear) {
        loadSummary();
      }

      // Clear form if it was the selected record
      if (selectedRecord && selectedRecord._id === recordId) {
        clearForm();
      }
    } catch (err) {
      console.error("❌ Delete error:", err);
      message.error("Failed to delete record from database");
    }
  };

  const loadRecordForEditing = async (recordId) => {
    try {
      setLoading(true);
      console.log('✏️ Loading record for editing:', recordId);
      const res = await expenditureAPI.getRecordById(recordId);

      if (res.data && res.data.success) {
        const record = res.data.data;
        setSelectedRecord(record);
        setViewMode(true);

        // Set basic info
        setMonth(record.month);
        setYear(record.year.toString());
        setLocation(record.location);
        setBudgetAllocated((record.budget || record.budgetAllocated || 0).toString());

        // Set expenditures with serial numbers
        const expendituresWithSNo = record.expenditures?.map((exp, index) => ({
          ...exp,
          file: exp.filePath || exp.file,
          id: exp._id || Date.now() + Math.random(),
          sNo: index + 1
        })) || [];

        setExpenditures(expendituresWithSNo);

        // Switch to manage tab
        setActiveTab("manage");

        message.success("Record loaded for editing. Make changes and click 'Update Record' to save.");
      } else {
        message.error("Failed to load record");
      }
    } catch (err) {
      console.error("❌ Error loading record:", err);
      message.error("Failed to load record for editing");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- EXPORT FUNCTIONS ---------------- */
  const generateStyledExcel = (title, subtitle, recordsList, filename, sortOrder = 'asc') => {
    const wb = XLSX.utils.book_new();

    recordsList.forEach((record) => {
      const sheetName = `${monthNames[record.month] || record.month} ${record.year}`.substring(0, 31);
      const merges = [];
      const ws = {};

      const writeCell = (r, c, val, style = {}, type = 's', numFmt = undefined) => {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = { t: type, v: val };
        if (numFmt) {
          cell.z = numFmt;
        }
        if (style) {
          cell.s = style;
        }
        ws[cellRef] = cell;
      };

      // Styles
      const titleStyle = {
        font: { name: "Arial", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "262760" } },
        alignment: { horizontal: "center", vertical: "center" }
      };

      const subtitleStyle = {
        font: { name: "Arial", sz: 11, bold: true, color: { rgb: "333333" } },
        fill: { fgColor: { rgb: "F0F2F5" } },
        alignment: { horizontal: "center", vertical: "center" }
      };

      const sectionTitleStyle = {
        font: { name: "Arial", sz: 11, bold: true, color: { rgb: "262760" } },
        fill: { fgColor: { rgb: "E6E8F0" } },
        alignment: { horizontal: "left", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "CCCCCC" } },
          bottom: { style: "thin", color: { rgb: "CCCCCC" } }
        }
      };

      const headerStyle = {
        font: { name: "Arial", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "262760" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "CCCCCC" } },
          bottom: { style: "thin", color: { rgb: "CCCCCC" } },
          left: { style: "thin", color: { rgb: "CCCCCC" } },
          right: { style: "thin", color: { rgb: "CCCCCC" } }
        }
      };

      const dataStyleLeft = {
        font: { name: "Arial", sz: 10 },
        alignment: { horizontal: "left", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "E2E8F0" } },
          bottom: { style: "thin", color: { rgb: "E2E8F0" } },
          left: { style: "thin", color: { rgb: "E2E8F0" } },
          right: { style: "thin", color: { rgb: "E2E8F0" } }
        }
      };

      const dataStyleCenter = {
        font: { name: "Arial", sz: 10 },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "E2E8F0" } },
          bottom: { style: "thin", color: { rgb: "E2E8F0" } },
          left: { style: "thin", color: { rgb: "E2E8F0" } },
          right: { style: "thin", color: { rgb: "E2E8F0" } }
        }
      };

      const dataStyleRight = {
        font: { name: "Arial", sz: 10 },
        alignment: { horizontal: "right", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "E2E8F0" } },
          bottom: { style: "thin", color: { rgb: "E2E8F0" } },
          left: { style: "thin", color: { rgb: "E2E8F0" } },
          right: { style: "thin", color: { rgb: "E2E8F0" } }
        }
      };

      const totalRowStyle = {
        font: { name: "Arial", sz: 10, bold: true, color: { rgb: "000000" } },
        alignment: { horizontal: "right", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "double", color: { rgb: "000000" } }
        }
      };

      const summaryHeaderStyle = {
        font: { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "262760" } },
        alignment: { horizontal: "center", vertical: "center" }
      };

      const summaryLabelStyle = {
        font: { name: "Arial", sz: 10, bold: true },
        alignment: { horizontal: "left", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "CCCCCC" } },
          bottom: { style: "thin", color: { rgb: "CCCCCC" } },
          left: { style: "thin", color: { rgb: "CCCCCC" } },
          right: { style: "thin", color: { rgb: "CCCCCC" } }
        }
      };

      const summaryValStyle = {
        font: { name: "Arial", sz: 10, bold: true },
        alignment: { horizontal: "right", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "CCCCCC" } },
          bottom: { style: "thin", color: { rgb: "CCCCCC" } },
          left: { style: "thin", color: { rgb: "CCCCCC" } },
          right: { style: "thin", color: { rgb: "CCCCCC" } }
        }
      };

      let currRow = 0;

      // Row 1: Merged Title
      writeCell(currRow, 0, "CALDIM ENGINEERING PRIVATE LIMITED", titleStyle);
      merges.push({ s: { r: currRow, c: 0 }, e: { r: currRow, c: 3 } });
      currRow++;

      // Row 2: Merged Subtitle
      writeCell(currRow, 0, `${title} - ${record.location} (${monthNames[record.month] || record.month} ${record.year})`, subtitleStyle);
      merges.push({ s: { r: currRow, c: 0 }, e: { r: currRow, c: 3 } });
      currRow++;

      // Row 3: Blank
      currRow++;

      // Sort expenditures before categorizing/using them!
      const exps = [...(record.expenditures || [])].sort((a, b) => {
        const da = new Date(a.date);
        const db = new Date(b.date);
        const timeA = isNaN(da.getTime()) ? 0 : da.getTime();
        const timeB = isNaN(db.getTime()) ? 0 : db.getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });

      const categorized = {
        "BANK TRANSFER": [],
        "UPI": [],
        "CARD PAYMENTS": [],
        "CASH PAYMENTS (DISBURSEMENT)": []
      };

      exps.forEach((exp) => {
        const mode = (exp.paymentMode || "").toLowerCase();
        if (mode.includes("cash") || mode.includes("disbursement") || mode.includes("petty")) {
          categorized["CASH PAYMENTS (DISBURSEMENT)"].push(exp);
        } else if (mode.includes("upi")) {
          categorized["UPI"].push(exp);
        } else if (mode.includes("card")) {
          categorized["CARD PAYMENTS"].push(exp);
        } else {
          categorized["BANK TRANSFER"].push(exp);
        }
      });

      // Track totals
      let totalSpent = 0;
      let cashSpent = 0;
      let onlineSpent = 0;

      const categoriesOrder = ["CASH PAYMENTS (DISBURSEMENT)", "UPI", "CARD PAYMENTS", "BANK TRANSFER"];
      const categoryIcons = {
        "BANK TRANSFER": "🏦",
        "UPI": "📱",
        "CARD PAYMENTS": "💳",
        "CASH PAYMENTS (DISBURSEMENT)": "💵"
      };

      categoriesOrder.forEach((catKey) => {
        const list = categorized[catKey];
        if (list.length === 0) return;

        // Write Category Header
        writeCell(currRow, 0, `${categoryIcons[catKey] || ""} ${catKey}`, sectionTitleStyle);
        merges.push({ s: { r: currRow, c: 0 }, e: { r: currRow, c: 3 } });
        currRow++;

        // Write Table Headers
        const cols = ["S.No", "Date", "Description/Type", "Amount (₹)"];
        cols.forEach((h, cIdx) => {
          writeCell(currRow, cIdx, h, headerStyle);
        });
        currRow++;

        // Write Table Data
        let catTotal = 0;
        list.forEach((item, idx) => {
          const sNo = idx + 1;
          
          const dObj = new Date(item.date);
          const formattedDate = !isNaN(dObj.getTime())
            ? dObj.toLocaleDateString("en-GB")
            : item.date;

          const amount = parseFloat(item.amount || 0);
          catTotal += amount;
          totalSpent += amount;

          if (catKey === "CASH PAYMENTS (DISBURSEMENT)") {
            cashSpent += amount;
          } else {
            onlineSpent += amount;
          }

          writeCell(currRow, 0, sNo, dataStyleCenter, 'n');
          writeCell(currRow, 1, formattedDate, dataStyleCenter);
          writeCell(currRow, 2, item.type || item.description || "-", dataStyleLeft);
          writeCell(currRow, 3, amount, dataStyleRight, 'n', '"₹"#,##0.00');
          currRow++;
        });

        // Write Category Total
        writeCell(currRow, 2, "Total " + (catKey === "CASH PAYMENTS (DISBURSEMENT)" ? "Cash" : catKey.toLowerCase()), totalRowStyle);
        writeCell(currRow, 3, catTotal, totalRowStyle, 'n', '"₹"#,##0.00');
        currRow++;

        // Blank row
        currRow++;
      });

      // Write Overall Summary Block
      writeCell(currRow, 0, "📊 SUMMARY CALCULATIONS", summaryHeaderStyle);
      merges.push({ s: { r: currRow, c: 0 }, e: { r: currRow, c: 3 } });
      currRow++;

      const budgetAllocated = parseFloat(record.budgetAllocated || 0);
      const openingBalance = parseFloat(record.openingBalance || 0);
      const remainingBalance = openingBalance + budgetAllocated - totalSpent;

      const summaryItems = [
        { label: "Opening Balance", val: openingBalance, color: "000000" },
        { label: "Budget Allocated", val: budgetAllocated, color: "262760" },
        { label: "Total Expenditure", val: totalSpent, color: "FF0000" },
        { label: "  - Cash Payment Total", val: cashSpent, color: "FF0000" },
        { label: "  - Online Payment Total", val: onlineSpent, color: "000000" },
        { label: "Remaining Balance", val: remainingBalance, color: remainingBalance >= 0 ? "008000" : "FF0000" }
      ];

      summaryItems.forEach((sItem) => {
        const itemLabelStyle = {
          ...summaryLabelStyle,
          font: { ...summaryLabelStyle.font, color: { rgb: sItem.color } }
        };
        const itemValStyle = {
          ...summaryValStyle,
          font: { ...summaryValStyle.font, color: { rgb: sItem.color } }
        };

        writeCell(currRow, 0, sItem.label, itemLabelStyle);
        merges.push({ s: { r: currRow, c: 0 }, e: { r: currRow, c: 2 } });

        writeCell(currRow, 3, sItem.val, itemValStyle, 'n', '"₹"#,##0.00');
        currRow++;
      });

      const maxCol = 3;
      const range = { s: { r: 0, c: 0 }, e: { r: currRow, c: maxCol } };
      ws['!ref'] = XLSX.utils.encode_range(range);
      ws['!merges'] = merges;

      const wscols = [];
      for (let colIdx = 0; colIdx <= maxCol; colIdx++) {
        let maxLen = 12;
        if (colIdx === 2) maxLen = 30;

        for (let rowIdx = 0; rowIdx <= currRow; rowIdx++) {
          const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
          const cell = ws[cellRef];
          if (cell && cell.v) {
            let str = String(cell.v);
            if (cell.z && typeof cell.v === 'number') {
              str = "₹" + cell.v.toLocaleString("en-IN", { minimumFractionDigits: 2 });
            }
            if (str.length > maxLen) {
              maxLen = str.length;
            }
          }
        }
        wscols.push({ wch: maxLen + 2 });
      }
      ws['!cols'] = wscols;

      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(wb, filename);
  };

  const generateStyledPDF = (title, subtitle, recordsList, filename, sortOrder = 'asc') => {
    const doc = new jsPDF();

    recordsList.forEach((record, recordIdx) => {
      if (recordIdx > 0) {
        doc.addPage();
      }

      const drawHeader = (rec) => {
        // Add Company/Report Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(38, 39, 96);
        doc.text("CALDIM ENGINEERING PRIVATE LIMITED", 14, 20);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(85, 85, 85);
        doc.text(`${title} - ${rec.location || "All Locations"}`, 14, 26);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(119, 119, 119);
        doc.text(`${subtitle} (${monthNames[rec.month] || rec.month} ${rec.year})`, 14, 31);

        // Clean decorative border line under header
        doc.setFillColor(38, 39, 96);
        doc.rect(14, 34, doc.internal.pageSize.getWidth() - 28, 0.8, 'F');
      };

      drawHeader(record);
      let y = 42;

      // Group expenditures
      const exps = record.expenditures || [];

      // Sort all expenditures by Date Ascending/Descending first (Requirement 8)
      const sortedExps = [...exps].sort((a, b) => {
        const da = new Date(a.date);
        const db = new Date(b.date);
        const timeA = isNaN(da.getTime()) ? 0 : da.getTime();
        const timeB = isNaN(db.getTime()) ? 0 : db.getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });

      // Initialize groups (Requirement 2)
      const categorized = {
        "CASH PAYMENT": [],
        "UPI PAYMENT": [],
        "CARD PAYMENT": [],
        "NET BANKING": [],
        "OTHER PAYMENT MODES": []
      };

      sortedExps.forEach((exp) => {
        const mode = (exp.paymentMode || "").toLowerCase();
        if (mode.includes("cash") || mode.includes("disbursement") || mode.includes("petty")) {
          categorized["CASH PAYMENT"].push(exp);
        } else if (mode.includes("upi")) {
          categorized["UPI PAYMENT"].push(exp);
        } else if (mode.includes("card")) {
          categorized["CARD PAYMENT"].push(exp);
        } else if (mode.includes("net banking") || mode.includes("cheque") || mode.includes("bank") || mode.includes("transfer")) {
          categorized["NET BANKING"].push(exp);
        } else {
          categorized["OTHER PAYMENT MODES"].push(exp);
        }
      });

      // Track totals
      let totalSpent = 0;
      let cashSpent = 0;
      let onlineSpent = 0;

      const categoriesOrder = ["CASH PAYMENT", "UPI PAYMENT", "CARD PAYMENT", "NET BANKING", "OTHER PAYMENT MODES"];

      categoriesOrder.forEach((catKey) => {
        const list = categorized[catKey];
        if (list.length === 0) return;

        // Check if we need a new page for the section header + some table rows
        if (y > 245) {
          doc.addPage();
          drawHeader(record);
          y = 42;
        }

        // Draw Section Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(38, 39, 96);
        doc.text(catKey, 14, y);
        y += 4; // Space after title

        // Prepare table columns and rows
        const tableColumn = ["S.No", "Date", "Type", "Amount (Rs.)", "Remarks"];
        const tableRows = [];
        let catTotal = 0;

        list.forEach((item, idx) => {
          const sNo = idx + 1;
          const dObj = new Date(item.date);
          const formattedDate = !isNaN(dObj.getTime())
            ? dObj.toLocaleDateString("en-GB")
            : item.date;

          const amount = parseFloat(item.amount || 0);
          catTotal += amount;
          totalSpent += amount;

          if (catKey === "CASH PAYMENT") {
            cashSpent += amount;
          } else {
            onlineSpent += amount;
          }

          tableRows.push([
            sNo,
            formattedDate,
            item.type || "-",
            amount.toFixed(2),
            item.remarks || "-"
          ]);
        });

        // Add Table using autoTable
        autoTable(doc, {
          startY: y,
          head: [tableColumn],
          body: tableRows,
          theme: 'grid',
          headStyles: { 
            fillColor: [38, 39, 96],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          bodyStyles: {
            fontSize: 9,
            textColor: [51, 51, 51]
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            1: { halign: 'center', cellWidth: 25 },
            2: { halign: 'left' },
            3: { halign: 'right', cellWidth: 30 },
            4: { halign: 'left' }
          },
          // Foot section showing category total
          foot: [['', '', `Total ${catKey.toLowerCase()}`, `Rs. ${catTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '']],
          footStyles: { 
            fillColor: [245, 246, 250], 
            textColor: [38, 39, 96], 
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'right'
          },
          margin: { left: 14, right: 14 },
          didParseCell: function (data) {
            if (data.row.section === 'foot') {
              if (data.column.index === 2) {
                data.cell.styles.halign = 'right';
              }
            }
          }
        });

        // Update y position to the bottom of the drawn table
        y = doc.lastAutoTable.finalY + 8; // add space after table
      });

      // Check if we need a new page for the final summary
      if (y > 210) {
        doc.addPage();
        drawHeader(record);
        y = 42;
      }

      // Draw final summary calculations header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(38, 39, 96);
      doc.text("SUMMARY CALCULATIONS", 14, y);
      y += 4;

      const budgetAllocated = parseFloat(record.budgetAllocated || 0);
      const openingBalance = parseFloat(record.openingBalance || 0);
      const remainingBalance = openingBalance + budgetAllocated - totalSpent;
      const isOverspent = remainingBalance < 0;

      const summaryRows = [
        ["Opening Balance", `Rs. ${openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ["Budget Allocated", `Rs. ${budgetAllocated.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ["Total Expenditure", `Rs. ${totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ["  - Cash Payment Total", `Rs. ${cashSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ["  - Online Payment Total", `Rs. ${onlineSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ["Remaining Balance", `Rs. ${remainingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ["Budget Status", isOverspent ? "Over Spent" : "Within Budget"]
      ];

      // Draw a neat summary autoTable
      autoTable(doc, {
        startY: y,
        body: summaryRows,
        theme: 'plain',
        bodyStyles: {
          fontSize: 9.5,
          textColor: [51, 51, 51]
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 60 },
          1: { halign: 'right', fontStyle: 'bold', cellWidth: 50 }
        },
        margin: { left: 14 },
        didParseCell: function(data) {
          if (data.row.index === 5 || data.row.index === 6) {
            if (isOverspent) {
              data.cell.styles.textColor = [220, 38, 38]; // Red
            } else {
              data.cell.styles.textColor = [22, 163, 74]; // Green
            }
          }
        }
      });

      y = doc.lastAutoTable.finalY + 10;
    });

    // Two-pass to add clean page number footers
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(153, 153, 153);
      
      const footerLeft = "CALDIM ENGINEERING PRIVATE LIMITED | EXPENDITURE REPORT";
      const footerRight = `Page ${i} of ${totalPages}`;
      
      doc.text(footerLeft, 14, doc.internal.pageSize.getHeight() - 10);
      doc.text(footerRight, doc.internal.pageSize.getWidth() - 14 - doc.getTextWidth(footerRight), doc.internal.pageSize.getHeight() - 10);
    }

    doc.save(filename);
  };

  const handleExportPDF = async () => {
    try {
      setLoading(true);
      
      if (exportType === "fy") {
        if (!exportFY) {
          message.error("Please select a Financial Year");
          return;
        }
        const [startYearStr, endYearStr] = exportFY.split("-");
        const startYear = parseInt(startYearStr);
        const endYear = startYear + 1;

        const [resStart, resEnd] = await Promise.all([
          expenditureAPI.getSummary({ year: startYear.toString(), sort: exportSortOrder }),
          expenditureAPI.getSummary({ year: endYear.toString(), sort: exportSortOrder })
        ]);

        const startData = resStart.data?.data || [];
        const endData = resEnd.data?.data || [];
        const combined = [...startData, ...endData];

        const fyMonthsOrder = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
        
        let filtered = combined;
        if (exportLocation && exportLocation !== "Select All") {
          filtered = combined.filter(r => r.location === exportLocation);
        }

        filtered = filtered.filter(r => {
          const isStartYearMonth = r.year === startYear && ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].includes(r.month);
          const isEndYearMonth = r.year === endYear && ["Jan", "Feb", "Mar"].includes(r.month);
          return isStartYearMonth || isEndYearMonth;
        });

        filtered.sort((a, b) => {
          if (a.year !== b.year) {
            return a.year - b.year;
          }
          return fyMonthsOrder.indexOf(a.month) - fyMonthsOrder.indexOf(b.month);
        });

        if (filtered.length === 0) {
          message.warning("No data found for the selected Financial Year");
          return;
        }

        const processedRecords = filtered.map((record) => {
          const opBal = calculateOpeningBalanceFromSummary(filtered, record.month);
          return {
            month: record.month,
            year: record.year,
            location: record.location,
            budgetAllocated: record.budget || record.budgetAllocated || 0,
            openingBalance: opBal,
            expenditures: record.expenditures || []
          };
        });

        generateStyledPDF(
          "Financial Year Report",
          `FINANCIAL YEAR ${exportFY}`,
          processedRecords,
          `Expenditure_Report_${exportLocation || "All"}_FY_${exportFY}.pdf`,
          exportSortOrder
        );
        message.success("Financial Year PDF report exported successfully!");
        setExportModalOpen(false);

      } else if (exportType === "monthly") {
        if (!exportMonth || !exportYear) {
          message.error("Please select a Month and Year");
          return;
        }

        const res = await expenditureAPI.getSummary({ year: exportYear, sort: exportSortOrder });
        const list = res.data?.data || [];
        
        let filtered = list.filter(r => r.month === exportMonth);
        if (exportLocation && exportLocation !== "Select All") {
          filtered = filtered.filter(r => r.location === exportLocation);
        }

        if (filtered.length === 0) {
          message.warning(`No data found for ${exportMonth} ${exportYear}`);
          return;
        }

        const processedRecords = filtered.map((record) => {
          const opBal = calculateOpeningBalanceFromSummary(list, record.month);
          return {
            month: record.month,
            year: record.year,
            location: record.location,
            budgetAllocated: record.budget || record.budgetAllocated || 0,
            openingBalance: opBal,
            expenditures: record.expenditures || []
          };
        });

        generateStyledPDF(
          "Monthly Expenditure Summary",
          "MONTHLY REPORT",
          processedRecords,
          `Expenditure_Report_${exportLocation || "All"}_${exportMonth}_${exportYear}.pdf`,
          exportSortOrder
        );
        message.success("Monthly PDF report exported successfully!");
        setExportModalOpen(false);

      } else if (exportType === "date_range") {
        if (!exportStartDate || !exportEndDate) {
          message.error("Please select a Start and End Date");
          return;
        }

        const start = new Date(exportStartDate);
        const end = new Date(exportEndDate);

        if (start > end) {
          message.error("Start Date cannot be after End Date");
          return;
        }

        const startYear = start.getFullYear();
        const endYear = end.getFullYear();
        
        const yearsToFetch = [];
        for (let y = startYear; y <= endYear; y++) {
          yearsToFetch.push(y);
        }

        const responses = await Promise.all(
          yearsToFetch.map(y => expenditureAPI.getSummary({ year: y.toString(), sort: exportSortOrder }))
        );

        let allRecords = [];
        responses.forEach(res => {
          if (res.data?.data) {
            allRecords = [...allRecords, ...res.data.data];
          }
        });

        let allExps = [];
        allRecords.forEach(record => {
          if (exportLocation && exportLocation !== "Select All" && record.location !== exportLocation) {
            return;
          }
          const recExps = record.expenditures || [];
          recExps.forEach(exp => {
            const expDate = new Date(exp.date);
            if (expDate >= start && expDate <= end) {
              allExps.push(exp);
            }
          });
        });

        if (allExps.length === 0) {
          message.warning("No expenditures found within the selected date range");
          return;
        }

        allExps.sort((a, b) => {
          const da = new Date(a.date);
          const db = new Date(b.date);
          const timeA = isNaN(da.getTime()) ? 0 : da.getTime();
          const timeB = isNaN(db.getTime()) ? 0 : db.getTime();
          return exportSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        });

        const formatRangeDate = (d) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        const consolidatedRecord = {
          month: "Summary",
          year: `${formatRangeDate(start)} - ${formatRangeDate(end)}`,
          location: exportLocation || "All Locations",
          budgetAllocated: 0,
          openingBalance: 0,
          expenditures: allExps
        };

        generateStyledPDF(
          "Date Range Expenditure Report",
          `PERIOD: ${exportStartDate} TO ${exportEndDate}`,
          [consolidatedRecord],
          `Expenditure_Report_${exportLocation || "All"}_DateRange_${exportStartDate}_to_${exportEndDate}.pdf`,
          exportSortOrder
        );
        message.success("Date Filter PDF report exported successfully!");
        setExportModalOpen(false);
      }

    } catch (err) {
      console.error("Export error:", err);
      message.error("Failed to export PDF report: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setLoading(true);
      let recordsToUse = [];

      if (exportType === "fy") {
        if (!exportFY) {
          message.error("Please select a Financial Year");
          return;
        }
        const [startYearStr, endYearStr] = exportFY.split("-");
        const startYear = parseInt(startYearStr);
        const endYear = startYear + 1;

        const [resStart, resEnd] = await Promise.all([
          expenditureAPI.getSummary({ year: startYear.toString(), sort: exportSortOrder }),
          expenditureAPI.getSummary({ year: endYear.toString(), sort: exportSortOrder })
        ]);

        const startData = resStart.data?.data || [];
        const endData = resEnd.data?.data || [];
        const combined = [...startData, ...endData];

        const fyMonthsOrder = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
        
        let filtered = combined;
        if (exportLocation && exportLocation !== "Select All") {
          filtered = combined.filter(r => r.location === exportLocation);
        }

        filtered = filtered.filter(r => {
          const isStartYearMonth = r.year === startYear && ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].includes(r.month);
          const isEndYearMonth = r.year === endYear && ["Jan", "Feb", "Mar"].includes(r.month);
          return isStartYearMonth || isEndYearMonth;
        });

        filtered.sort((a, b) => {
          if (a.year !== b.year) {
            return a.year - b.year;
          }
          return fyMonthsOrder.indexOf(a.month) - fyMonthsOrder.indexOf(b.month);
        });

        if (filtered.length === 0) {
          message.warning("No data found for the selected Financial Year");
          return;
        }

        const processedRecords = filtered.map((record) => {
          const opBal = calculateOpeningBalanceFromSummary(filtered, record.month);
          return {
            month: record.month,
            year: record.year,
            location: record.location,
            budgetAllocated: record.budget || record.budgetAllocated || 0,
            openingBalance: opBal,
            expenditures: record.expenditures || []
          };
        });

        generateStyledExcel(
          "Financial Year Report",
          `FINANCIAL YEAR ${exportFY}`,
          processedRecords,
          `Expenditure_Report_${exportLocation || "All"}_FY_${exportFY}.xlsx`,
          exportSortOrder
        );
        message.success("Financial Year Excel report exported successfully!");
        setExportModalOpen(false);

      } else if (exportType === "monthly") {
        if (!exportMonth || !exportYear) {
          message.error("Please select a Month and Year");
          return;
        }

        const res = await expenditureAPI.getSummary({ year: exportYear, sort: exportSortOrder });
        const list = res.data?.data || [];
        
        let filtered = list.filter(r => r.month === exportMonth);
        if (exportLocation && exportLocation !== "Select All") {
          filtered = filtered.filter(r => r.location === exportLocation);
        }

        if (filtered.length === 0) {
          message.warning(`No data found for ${exportMonth} ${exportYear}`);
          return;
        }

        const processedRecords = filtered.map((record) => {
          const opBal = calculateOpeningBalanceFromSummary(list, record.month);
          return {
            month: record.month,
            year: record.year,
            location: record.location,
            budgetAllocated: record.budget || record.budgetAllocated || 0,
            openingBalance: opBal,
            expenditures: record.expenditures || []
          };
        });

        generateStyledExcel(
          "Monthly Expenditure Summary",
          "MONTHLY REPORT",
          processedRecords,
          `Expenditure_Report_${exportLocation || "All"}_${exportMonth}_${exportYear}.xlsx`,
          exportSortOrder
        );
        message.success("Monthly Excel report exported successfully!");
        setExportModalOpen(false);

      } else if (exportType === "date_range") {
        if (!exportStartDate || !exportEndDate) {
          message.error("Please select a Start and End Date");
          return;
        }

        const start = new Date(exportStartDate);
        const end = new Date(exportEndDate);

        if (start > end) {
          message.error("Start Date cannot be after End Date");
          return;
        }

        const startYear = start.getFullYear();
        const endYear = end.getFullYear();
        
        const yearsToFetch = [];
        for (let y = startYear; y <= endYear; y++) {
          yearsToFetch.push(y);
        }

        const responses = await Promise.all(
          yearsToFetch.map(y => expenditureAPI.getSummary({ year: y.toString(), sort: exportSortOrder }))
        );

        let allRecords = [];
        responses.forEach(res => {
          if (res.data?.data) {
            allRecords = [...allRecords, ...res.data.data];
          }
        });

        let allExps = [];
        allRecords.forEach(record => {
          if (exportLocation && exportLocation !== "Select All" && record.location !== exportLocation) {
            return;
          }
          const recExps = record.expenditures || [];
          recExps.forEach(exp => {
            const expDate = new Date(exp.date);
            if (expDate >= start && expDate <= end) {
              allExps.push(exp);
            }
          });
        });

        if (allExps.length === 0) {
          message.warning("No expenditures found within the selected date range");
          return;
        }

        allExps.sort((a, b) => {
          const da = new Date(a.date);
          const db = new Date(b.date);
          const timeA = isNaN(da.getTime()) ? 0 : da.getTime();
          const timeB = isNaN(db.getTime()) ? 0 : db.getTime();
          return exportSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        });

        const formatRangeDate = (d) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        const consolidatedRecord = {
          month: "Summary",
          year: `${formatRangeDate(start)} - ${formatRangeDate(end)}`,
          location: exportLocation || "All Locations",
          budgetAllocated: 0,
          openingBalance: 0,
          expenditures: allExps
        };

        generateStyledExcel(
          "Date Range Expenditure Report",
          `PERIOD: ${exportStartDate} TO ${exportEndDate}`,
          [consolidatedRecord],
          `Expenditure_Report_${exportLocation || "All"}_DateRange_${exportStartDate}_to_${exportEndDate}.xlsx`,
          exportSortOrder
        );
        message.success("Date Filter Excel report exported successfully!");
        setExportModalOpen(false);
      }

    } catch (err) {
      console.error("Export error:", err);
      message.error("Failed to export Excel report: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- EXPORT FUNCTIONS ---------------- */
  const exportToCSV = () => {
    if (!month || !year || !location || !budgetAllocated) {
      message.warning("Please fill all required fields: Month, Year, Location, and Budget Allocated");
      return;
    }

    const headers = ["Month", "Year", "Location", "Budget Allocated (₹)", "Budget Spent (₹)", "Remaining Balance (₹)", "Status"];
    const mainRow = [
      month,
      year,
      location,
      budgetAllocated,
      budgetSpent.toFixed(2),
      remainingBalance.toFixed(2),
      budgetStatusText
    ];

    const expenditureHeaders = ["S.No", "Date", "Type of Expenditure", "Mode of Payment", "Amount (₹)", "Documents", "Remarks"];
    const expenditureRows = expenditures.map(exp => [
      exp.sNo,
      exp.date,
      exp.type,
      exp.paymentMode,
      exp.amount,
      exp.fileName || "-",
      exp.remarks || "-"
    ]);

    let csvContent = "EXPENDITURE MANAGEMENT RECORD\n\n";
    csvContent += "Summary:\n";
    csvContent += headers.join(',') + '\n';
    csvContent += mainRow.join(',') + '\n\n';

    csvContent += "Expenditure Details:\n";
    csvContent += expenditureHeaders.join(',') + '\n';
    expenditureRows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenditure_${month}_${year}_${location}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportSummaryToCSV = () => {
    if (summaryData.length === 0) {
      message.warning("No summary data to export");
      return;
    }

    // Modified headers - removed Year and Location from individual rows
    const headers = ["S.No", "Month", "Budget Allocated (₹)", "Budget Spent (₹)", "Total Balance (₹)", "Budget Status"];

    const rows = summaryData.map(row => {
      return [
        row.sNo,
        row.month,
        row.budgetAllocated?.toFixed(2) || "0.00",
        row.totalExpenditure?.toFixed(2) || "0.00",
        row.totalBalance?.toFixed(2) || "0.00",
        row.statusText || "-"
      ];
    });

    // Add overall summary with Year and Location in header
    let csvContent = `EXPENDITURE SUMMARY REPORT - ${summaryYear}`;
    if (summaryLocation && summaryLocation !== "Select All") {
      csvContent += ` - ${summaryLocation}`;
    }
    csvContent += '\n\n';

    csvContent += headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    // Calculate overall summary
    const overallSummary = summaryData.reduce((acc, row) => {
      return {
        totalBudgetAllocated: acc.totalBudgetAllocated + (row.budgetAllocated || 0),
        totalBudgetSpent: acc.totalBudgetSpent + (row.totalExpenditure || 0),
        monthsCount: acc.monthsCount + 1
      };
    }, { totalBudgetAllocated: 0, totalBudgetSpent: 0, monthsCount: 0 });

    const overallBalance = overallSummary.totalBudgetAllocated - overallSummary.totalBudgetSpent;

    csvContent += '\nOverall Summary:\n';
    csvContent += `Year,${summaryYear}\n`;
    if (summaryLocation && summaryLocation !== "Select All") {
      csvContent += `Location,${summaryLocation}\n`;
    }
    csvContent += `Total Budget Allocated,₹${overallSummary.totalBudgetAllocated.toFixed(2)}\n`;
    csvContent += `Total Budget Spent,₹${overallSummary.totalBudgetSpent.toFixed(2)}\n`;
    csvContent += `Overall Balance,₹${overallBalance.toFixed(2)}\n`;
    csvContent += `Average Monthly Spend,₹${(overallSummary.totalBudgetSpent / overallSummary.monthsCount).toFixed(2)}\n`;
    csvContent += `Number of Months,${overallSummary.monthsCount}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenditure_summary_${summaryYear}_${summaryLocation || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadRowPDF = (row) => {
    const monthName = monthNames[row.month] || row.month;
    const opBal = calculateOpeningBalanceFromSummary(summaryData, row.month);
    
    const recordToExport = {
      month: row.month,
      year: row.year,
      location: row.location,
      budgetAllocated: row.budgetAllocated,
      openingBalance: opBal,
      expenditures: row.expenditures || []
    };

    generateStyledPDF(
      "Expenditure Report", 
      "MONTHLY EXPENDITURE", 
      [recordToExport], 
      `Expenditure_Report_${row.location}_${monthName}_${row.year}.pdf`,
      exportSortOrder
    );
  };

  const downloadRowExcel = (row) => {
    const monthName = monthNames[row.month] || row.month;
    const opBal = calculateOpeningBalanceFromSummary(summaryData, row.month);
    
    const recordToExport = {
      month: row.month,
      year: row.year,
      location: row.location,
      budgetAllocated: row.budgetAllocated,
      openingBalance: opBal,
      expenditures: row.expenditures || []
    };

    generateStyledExcel(
      "Expenditure Report", 
      "MONTHLY EXPENDITURE", 
      [recordToExport], 
      `Expenditure_Report_${row.location}_${monthName}_${row.year}.xlsx`,
      exportSortOrder
    );
  };

  return (
    <div className="p-6">
      {/* Tabs */}
      <div className="mb-6 flex justify-between items-end border-b">
        <div className="flex">
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === "manage"
              ? "border-b-2 border-[#262760] text-[#262760] -mb-[2px]"
              : "text-gray-500 hover:text-gray-700"
              }`}
            onClick={() => setActiveTab("manage")}
          >
            Manage Expenditure
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === "summary"
              ? "border-b-2 border-[#262760] text-[#262760] -mb-[2px]"
              : "text-gray-500 hover:text-gray-700"
              }`}
            onClick={() => {
              setActiveTab("summary");
              setMonth(""); // Reset month filter
            }}
          >
            View Summary
          </button>
        </div>

        <div className="flex items-center gap-3 pb-2">
         
          {activeTab === "summary" && (
            <>
              <button
                onClick={() => {
                  setExportFormat("excel");
                  setExportModalOpen(true);
                  setExportLocation(summaryLocation);
                  setExportYear(summaryYear);
                  setExportMonth(month);
                  setExportStartDate("");
                  setExportEndDate("");
                }}
                className="px-4 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1f204d] transition-colors flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export Excel Report
              </button>
              <button
                onClick={() => {
                  setExportFormat("pdf");
                  setExportModalOpen(true);
                  setExportLocation(summaryLocation);
                  setExportYear(summaryYear);
                  setExportMonth(month);
                  setExportStartDate("");
                  setExportEndDate("");
                }}
                className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Export PDF Report
              </button>
            </>
          )}
        </div>
      </div>

      {/* MANAGE TAB */}
      {activeTab === "manage" && (
        <div className="bg-white rounded-lg shadow border">
          <div className="p-6">
            {/* Header Information */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Enter Monthly Details</h3>
                {viewMode && selectedRecord && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    Editing: {monthNames[month] || month} {year} - {location}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month *</label>
                  <select
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent ${errors.month ? 'border-red-500' : ''} disabled:bg-gray-100 disabled:text-gray-500`}
                    value={month}
                    onChange={(e) => {
                      setMonth(e.target.value);
                      if (errors.month) setErrors({ ...errors, month: null });
                    }}
                    required
                    disabled={viewMode}
                  >
                    <option value="">Select Month</option>
                    {getAvailableMonths(year).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  {errors.month && <p className="text-red-500 text-xs mt-1">{errors.month}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                  <select
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent ${errors.year ? 'border-red-500' : ''} disabled:bg-gray-100 disabled:text-gray-500`}
                    value={year}
                    onChange={(e) => {
                      setYear(e.target.value);
                      if (errors.year) setErrors({ ...errors, year: null });
                    }}
                    required
                    disabled={viewMode}
                  >
                    <option value="">Select Year</option>
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                  <select
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent ${errors.location ? 'border-red-500' : ''} disabled:bg-gray-100 disabled:text-gray-500`}
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      if (errors.location) setErrors({ ...errors, location: null });
                    }}
                    required
                    disabled={viewMode}
                  >
                    <option value="">Select Location</option>
                    {locations.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget Allocated (₹) *</label>
                  <input
                    type="text"
                    placeholder="Enter budget amount"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent ${errors.budgetAllocated ? 'border-red-500' : ''} disabled:bg-gray-100 disabled:text-gray-500`}
                    value={budgetAllocated}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow digits and a single decimal point
                      if (/^\d*\.?\d*$/.test(value) && value.length <= 8) {
                        setBudgetAllocated(value);
                      }
                      if (errors.budgetAllocated) setErrors({ ...errors, budgetAllocated: null });
                    }}
                    required
                  />
                  {errors.budgetAllocated && <p className="text-red-500 text-xs mt-1">{errors.budgetAllocated}</p>}
                </div>
              </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 mb-1">Budget Allocated</p>
                    <p className="text-2xl font-bold text-blue-800">
                      ₹{parseFloat(budgetAllocated || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-700 mb-1">Budget Spent</p>
                    <p className="text-2xl font-bold text-red-800">
                      ₹{budgetSpent.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-red-600">{expenditures.length} records</p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-red-500" />
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${budgetStatus === "danger" ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700 mb-1">Remaining Balance</p>
                    <p className={`text-2xl font-bold ${budgetStatus === "danger" ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{remainingBalance.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-gray-600">
                      {budgetStatusText}
                    </p>
                  </div>
                  {budgetStatus === "danger" ? (
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  ) : (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  )}
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700 mb-1">Opening Balance</p>
                    <p className="text-2xl font-bold text-purple-800">
                      ₹{openingBalance.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-purple-600">From previous month</p>
                  </div>
                  <Wallet className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Add New/Edit Expenditure Form */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{editingExpenditureId ? "Edit Expenditure" : "Add New Expenditure"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Type *</label>
                    <button
                      type="button"
                      onClick={() => setTypeModalOpen(true)}
                      className="text-xs font-semibold text-[#262760] hover:text-[#1e2050] flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Type
                    </button>
                  </div>
                  <select
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent ${errors.type ? 'border-red-500' : ''}`}
                    value={newExpense.type}
                    onChange={(e) => {
                      setNewExpense({ ...newExpense, type: e.target.value });
                      if (errors.type) setErrors({ ...errors, type: null });
                    }}
                    required
                  >
                    <option value="">Select Type</option>
                    {expenditureTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors.type && <p className="text-red-500 text-xs mt-1">Type is required</p>}
                  {newExpense.type === "Others" && (
                    <input
                      type="text"
                      placeholder="Enter custom type"
                      className="w-full mt-2 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent"
                      value={newExpense.customType}
                      onChange={(e) => setNewExpense({ ...newExpense, customType: e.target.value })}
                    />
                  )}
                </div>

                {/* Add Type Modal */}
                <Modal
                  title={<div className="flex items-center gap-2"><Plus className="w-5 h-5 text-[#262760]" /> <span>Add New Expense Type</span></div>}
                  open={typeModalOpen}
                  onCancel={() => setTypeModalOpen(false)}
                  footer={[
                    <button
                      key="cancel"
                      onClick={() => setTypeModalOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border rounded-lg mr-2"
                    >
                      Cancel
                    </button>,
                    <button
                      key="save"
                      onClick={handleAddType}
                      disabled={typeSubmitLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-[#262760] hover:bg-[#1e2050] rounded-lg disabled:opacity-50"
                    >
                      {typeSubmitLoading ? "Saving..." : "Save Type"}
                    </button>
                  ]}
                >
                  <div className="space-y-4 py-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Travel, Stationery"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent"
                        value={newTypeData.type_name}
                        onChange={(e) => setNewTypeData({ ...newTypeData, type_name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                      <textarea
                        placeholder="Brief description of this expense category"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent"
                        rows="3"
                        value={newTypeData.description}
                        onChange={(e) => setNewTypeData({ ...newTypeData, description: e.target.value })}
                      />
                    </div>
                  </div>
                </Modal>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode *</label>
                  <select
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent ${errors.paymentMode ? 'border-red-500' : ''}`}
                    value={newExpense.paymentMode}
                    onChange={(e) => {
                      setNewExpense({ ...newExpense, paymentMode: e.target.value });
                      if (errors.paymentMode) setErrors({ ...errors, paymentMode: null });
                    }}
                    required
                  >
                    <option value="">Select Mode</option>
                    {paymentModes.map(mode => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                  {errors.paymentMode && <p className="text-red-500 text-xs mt-1">Payment Mode is required</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                  <input
                    type="text"
                    placeholder="Amount"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent ${errors.amount ? 'border-red-500' : ''}`}
                    value={newExpense.amount}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow digits and a single decimal point
                      if (/^\d*\.?\d*$/.test(value) && value.length <= 8) {
                        setNewExpense({ ...newExpense, amount: value });
                      }
                      if (errors.amount) setErrors({ ...errors, amount: null });
                    }}
                    required
                  />
                  {errors.amount && <p className="text-red-500 text-xs mt-1">Amount is required</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent ${errors.date ? 'border-red-500' : ''} disabled:bg-gray-100 disabled:text-gray-500`}
                    value={newExpense.date}
                    onChange={(e) => {
                      setNewExpense({ ...newExpense, date: e.target.value });
                      if (errors.date) setErrors({ ...errors, date: null });
                    }}
                    required
                    disabled={getMonthDateRange().disabled}
                    min={getMonthDateRange().min}
                    max={getMonthDateRange().max}
                  />
                  {errors.date && <p className="text-red-500 text-xs mt-1">Date is required</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent"
                    value={newExpense.documentType}
                    onChange={(e) => setNewExpense({ ...newExpense, documentType: e.target.value })}
                  >
                    <option value="">Select</option>
                    {documentTypes.map(doc => (
                      <option key={doc} value={doc}>{doc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload File</label>
                  <div className="flex items-center">
                    <label className="cursor-pointer bg-white border rounded-lg px-3 py-2 hover:bg-gray-50 w-full">
                      <span className="text-gray-600 text-sm">{newExpense.fileName || "Choose file"}</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept=".jpg,.jpeg,.png,.pdf"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <input
                    type="text"
                    placeholder="Remarks"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent"
                    value={newExpense.remarks}
                    onChange={(e) => setNewExpense({ ...newExpense, remarks: e.target.value })}
                  />
                </div>

                <div className="flex items-end gap-2">
                  {editingExpenditureId && (
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors w-full flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={addExpenditure}
                    className="px-4 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1e2050] transition-colors w-full flex items-center justify-center gap-2"
                  >
                    {editingExpenditureId ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editingExpenditureId ? "Update" : "Add"}
                  </button>
                </div>
              </div>
            </div>

            {/* Expenditure Table */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Expenditure Records ({expenditures.length} items)
              </h3>

              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full">
                  <thead className="bg-[#262760]">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">S.No</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Type of Expenditure</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Mode of Payment</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Amount (₹)</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Documents</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Location</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Remarks</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenditures.map(exp => (
                      <tr key={exp.id} className="border-t hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-center">{exp.sNo}</td>
                        <td className="px-4 py-3">{exp.date}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{exp.type}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-gray-600">
                            {exp.paymentMode === "Credit Card" && <CreditCard className="w-4 h-4" />}
                            {exp.paymentMode === "UPI" && <Receipt className="w-4 h-4" />}
                            {exp.paymentMode === "Net Banking" && <Banknote className="w-4 h-4" />}
                            {exp.paymentMode === "Cash" && <Wallet className="w-4 h-4" />}
                            {exp.paymentMode === "Cheque" && <FileText className="w-4 h-4" />}
                            {exp.paymentMode}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          ₹{parseFloat(exp.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                            {(exp.fileData || exp.filePath) ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => viewUploadedFile(exp.fileData || (exp.filePath ? `${BASE_URL}${exp.filePath}` : null), exp.fileName)}
                                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                  title="View Document"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-gray-600 truncate max-w-[120px]">
                                  {exp.fileName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">{location || "-"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">{exp.remarks || "-"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => editExpense(exp.id)}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <Popconfirm
                              title="Delete Expenditure"
                              description="Are you sure you want to delete this expenditure?"
                              onConfirm={() => removeExpense(exp.id)}
                              okText="Yes"
                              cancelText="No"
                              disabled={!!editingExpenditureId}
                            >
                              <button
                                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete"
                                disabled={!!editingExpenditureId}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </Popconfirm>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {expenditures.length === 0 && (
                      <tr>
                        <tr>
                          <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                            No expenditure records added yet. Add your first expenditure above.
                          </td>
                        </tr>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Save/Update Button */}
            <div className="flex justify-end gap-3">
              <button
                onClick={clearForm}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear Form
              </button>
              <button
                onClick={saveRecord}
                disabled={saveLoading}
                className="px-6 py-3 bg-[#262760] text-white rounded-lg hover:bg-[#1e2050] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {saveLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {savingMessage || (viewMode ? "Updating..." : "Saving...")}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {viewMode ? "Update Record" : "Save Monthly Record"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUMMARY TAB - MODIFIED TABLE (Removed Year and Location columns) */}
      {activeTab === "summary" && (
        <div className="bg-white rounded-lg shadow border">
          <div className="p-6">
            {/* Filters with Year and Location in header */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Summary Filters - {summaryYear} {summaryLocation && summaryLocation !== "Select All" ? `- ${summaryLocation}` : ""}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  >
                    <option value="">All Months</option>
                    {getAvailableMonths(summaryYear).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                  <select
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent ${summaryErrors.summaryYear ? 'border-red-500' : ''}`}
                    value={summaryYear}
                    onChange={(e) => {
                      setSummaryYear(e.target.value);
                      if (summaryErrors.summaryYear) setSummaryErrors({ ...summaryErrors, summaryYear: null });
                    }}
                    required
                  >
                    <option value="">Select Year</option>
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  {summaryErrors.summaryYear && <p className="text-red-500 text-xs mt-1">{summaryErrors.summaryYear}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent"
                    value={summaryLocation}
                    onChange={(e) => setSummaryLocation(e.target.value)}
                  >
                    <option value="">Select All</option>
                    {locations.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={loadSummary}
                    className="px-6 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1e2050] transition-colors w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        <Filter className="w-4 h-4" />
                        Load Summary
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Summary Header showing Year and Location */}
            {summaryData.length > 0 && !loading && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-800">
                      Summary for {summaryYear}
                      {summaryLocation && summaryLocation !== "Select All" ? ` - ${summaryLocation}` : " (All Locations)"}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {summaryData.length} month{summaryData.length !== 1 ? 's' : ''} of data
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total Records: {summaryData.length}</p>
                    <p className="text-sm text-gray-600">Generated: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Table - MODIFIED: Removed Year and Location columns */}
            <div className="overflow-x-auto border rounded-lg mb-6">
              <table className="w-full">
                <thead className="bg-[#262760]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">S.No</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Month</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Location</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Budget Allocated (₹)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Budget Spent (₹)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Total Balance (₹)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Budget Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#262760]"></div>
                        </div>
                      </td>
                    </tr>
                  ) : summaryData.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <Calendar className="w-12 h-12 text-gray-300 mb-4" />
                          <p className="text-lg font-medium text-gray-600">No summary data</p>
                          <p className="text-gray-500 mt-1">Select year and click "Load Summary"</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    summaryData
                      .filter(row => !month || row.month === month)
                      .map((row) => (
                        <tr key={row.id} className="border-t hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-center">{row.sNo}</td>
                          <td className="px-4 py-3 font-medium">
                            {monthNames[row.month] || row.month}
                          </td>
                          <td className="px-4 py-3">
                            {row.location || "-"}
                          </td>
                          <td className="px-4 py-3">
                            ₹{row.budgetAllocated?.toLocaleString('en-IN') || '0'}
                          </td>
                          <td className="px-4 py-3 text-red-600">
                            ₹{row.totalExpenditure?.toLocaleString('en-IN') || '0'}
                          </td>
                          <td className={`px-4 py-3 font-bold ${row.totalBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ₹{row.totalBalance?.toLocaleString('en-IN') || '0'}
                          </td>
                          <td className={`px-4 py-3 ${row.status === "danger" ? 'text-red-600' : 'text-green-600'}`}>
                            <div className="flex items-center gap-2">
                              {row.status === "danger" ? (
                                <AlertCircle className="w-4 h-4" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                              <span className="text-sm">{row.statusText}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => downloadRowPDF(row)}
                                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                title="Download PDF"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => downloadRowExcel(row)}
                                className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                title="Download Excel"
                              >
                                <FileSpreadsheet className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => viewRecordDetails(row.id)}
                                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => loadRecordForEditing(row.id)}
                                className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                title="Edit Record"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <Popconfirm
                                title="Delete Record"
                                description="Are you sure you want to delete this record? This action cannot be undone."
                                onConfirm={() => deleteRecord(row.id)}
                                okText="Yes, Delete"
                                cancelText="Cancel"
                                okButtonProps={{ danger: true }}
                              >
                                <button
                                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </Popconfirm>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Overall Summary Statistics */}
            {summaryData.length > 0 && !loading && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h4 className="font-medium text-gray-700 mb-2">Total Budget Allocated</h4>
                  <p className="text-2xl font-bold text-blue-600">
                    ₹{summaryData.reduce((sum, row) => sum + (row.budgetAllocated || 0), 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {summaryData.length} months
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                  <h4 className="font-medium text-gray-700 mb-2">Total Budget Spent</h4>
                  <p className="text-2xl font-bold text-red-600">
                    ₹{summaryData.reduce((sum, row) => sum + (row.totalExpenditure || 0), 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Total expenditure
                  </p>
                </div>
                <div className={`p-4 rounded-lg border ${summaryData.reduce((sum, row) => sum + (row.totalBalance || 0), 0) < 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                  <h4 className="font-medium text-gray-700 mb-2">Overall Balance</h4>
                  <p className={`text-2xl font-bold ${summaryData.reduce((sum, row) => sum + (row.totalBalance || 0), 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{summaryData.reduce((sum, row) => sum + (row.totalBalance || 0), 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {summaryData.reduce((sum, row) => sum + (row.totalBalance || 0), 0) < 0 ? "Over Budget" : "Within Budget"}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <h4 className="font-medium text-gray-700 mb-2">Avg. Monthly Spend</h4>
                  <p className="text-2xl font-bold text-purple-600">
                    ₹{(summaryData.reduce((sum, row) => sum + (row.totalExpenditure || 0), 0) / summaryData.length).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    Average per month
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAIL VIEW MODAL */}
      {viewModalOpen && detailedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Expenditure Details - {monthNames[detailedRecord.month] || detailedRecord.month} {detailedRecord.year} - {detailedRecord.location}
                </h2>
                <p className="text-gray-600 mt-1">
                  Budget Allocated: ₹{detailedRecord.budgetAllocated?.toLocaleString('en-IN')} |
                  Status: <span className={detailedRecord.budgetStatus === "danger" ? "text-red-600" : "text-green-600"}>
                    {detailedRecord.budgetStatusText}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setViewModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-700 mb-1">Budget Allocated</p>
                  <p className="text-2xl font-bold text-blue-800">
                    ₹{Number(detailedRecord.budgetAllocated || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-red-700 mb-1">Budget Spent</p>
                  <p className="text-2xl font-bold text-red-800">
                    ₹{Number(detailedRecord.budgetSpent || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    {detailedRecord.expenditures?.length || 0} expenditure records
                  </p>
                </div>
                <div className={`p-4 rounded-lg ${Number(detailedRecord.remainingBalance || 0) < 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className="text-sm text-gray-700 mb-1">Remaining Balance</p>
                  <p className={`text-2xl font-bold ${Number(detailedRecord.remainingBalance || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{Number(detailedRecord.remainingBalance || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {detailedRecord.budgetStatusText}
                  </p>
                </div>
              </div>

              {detailedRecord.expenditures && detailedRecord.expenditures.length > 0 && (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">S.No</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Payment Mode</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount (₹)</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Document</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedRecord.expenditures?.map((exp, idx) => (
                        <tr key={idx} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3 text-center">{idx + 1}</td>
                          <td className="px-4 py-3">{new Date(exp.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{exp.type}</td>
                          <td className="px-4 py-3">
                            <div className="text-gray-600">{exp.paymentMode}</div>
                          </td>
                          <td className="px-4 py-3 font-medium">
                            ₹{Number(exp.amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3">
                            {(exp.fileData || exp.filePath) ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => viewUploadedFile(exp.fileData || (exp.filePath ? `${BASE_URL}${exp.filePath}` : null), exp.fileName)}
                                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                  title="View Document"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-gray-600">{exp.fileName}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">{exp.remarks || "-"}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="border-t pt-6 flex justify-end gap-3">
                <button
                  onClick={() => setViewModalOpen(false)}
                  className="px-6 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1e2050]"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setViewModalOpen(false);
                    loadRecordForEditing(detailedRecord._id);
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Edit Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT VIEW MODAL */}
      {documentModalOpen && currentDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Document Viewer</h2>
              <button
                onClick={() => setDocumentModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {documentType === 'image' ? (
                <div className="flex justify-center">
                  <img
                    src={currentDocument.file}
                    alt={currentDocument.name}
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                </div>
              ) : documentType === 'pdf' ? (
                <div className="h-[70vh]">
                  <iframe
                    src={currentDocument.file}
                    className="w-full h-full border-0"
                    title={currentDocument.name}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Document: {currentDocument.name}</p>
                  <button
                    onClick={() => window.open(currentDocument.file, '_blank')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Document
                  </button>
                </div>
              )}

              <div className="border-t pt-6 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">File: {currentDocument.name}</p>
                  <p className="text-xs text-gray-500">Type: {documentType.toUpperCase()}</p>
                </div>
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = currentDocument.file;
                    a.download = currentDocument.name;
                    a.click();
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT REPORT MODAL */}
      {exportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
            {/* Modal Header */}
            <div className={`px-6 py-4 flex justify-between items-center text-white ${exportFormat === "excel" ? "bg-[#262760]" : "bg-red-700"}`}>
              <div className="flex items-center gap-2">
                {exportFormat === "excel" ? (
                  <FileSpreadsheet className="w-5 h-5" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
                <h3 className="text-lg font-bold">
                  {exportFormat === "excel" ? "Export Excel Report" : "Export PDF Report"}
                </h3>
              </div>
              <button
                onClick={() => setExportModalOpen(false)}
                className="p-1 rounded-lg hover:bg-black hover:bg-opacity-20 transition-colors text-white text-opacity-80 hover:text-white outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Export Format Toggle */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Export Format</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                  <button
                    type="button"
                    className={`py-2 text-xs font-semibold rounded-md transition-all outline-none flex items-center justify-center gap-2 ${
                      exportFormat === "excel"
                        ? "bg-white text-[#262760] shadow-sm"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                    onClick={() => setExportFormat("excel")}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Excel Document (.xlsx)
                  </button>
                  <button
                    type="button"
                    className={`py-2 text-xs font-semibold rounded-md transition-all outline-none flex items-center justify-center gap-2 ${
                      exportFormat === "pdf"
                        ? "bg-white text-red-700 shadow-sm"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                    onClick={() => setExportFormat("pdf")}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    PDF Document (.pdf)
                  </button>
                </div>
              </div>

              {/* Report Type Tabs */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Report Type</label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-lg">
                  <button
                    type="button"
                    className={`py-2 text-xs font-semibold rounded-md transition-all outline-none ${
                      exportType === "monthly"
                        ? "bg-white text-gray-850 shadow-sm"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                    onClick={() => setExportType("monthly")}
                  >
                    Monthly Report
                  </button>
                  <button
                    type="button"
                    className={`py-2 text-xs font-semibold rounded-md transition-all outline-none ${
                      exportType === "date_range"
                        ? "bg-white text-gray-850 shadow-sm"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                    onClick={() => setExportType("date_range")}
                  >
                    Date Filter
                  </button>
                  <button
                    type="button"
                    className={`py-2 text-xs font-semibold rounded-md transition-all outline-none ${
                      exportType === "fy"
                        ? "bg-white text-gray-850 shadow-sm"
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                    onClick={() => setExportType("fy")}
                  >
                    Financial Year
                  </button>
                </div>
              </div>

              {/* Location Select (Common for all) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent outline-none"
                  value={exportLocation}
                  onChange={(e) => setExportLocation(e.target.value)}
                >
                  <option value="">Select All Locations</option>
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Record Sort Order Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Record Sort Order</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent outline-none"
                  value={exportSortOrder}
                  onChange={(e) => setExportSortOrder(e.target.value)}
                >
                  <option value="asc">Oldest to Latest (Ascending)</option>
                  <option value="desc">Latest to Oldest (Descending)</option>
                </select>
              </div>

              {/* Dynamic Inputs based on selected tab */}
              {exportType === "monthly" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent outline-none"
                      value={exportMonth}
                      onChange={(e) => setExportMonth(e.target.value)}
                    >
                      <option value="">Select Month</option>
                      {months.map(m => (
                        <option key={m} value={m}>{monthNames[m]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent outline-none"
                      value={exportYear}
                      onChange={(e) => setExportYear(e.target.value)}
                    >
                      <option value="">Select Year</option>
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {exportType === "date_range" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent outline-none"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent outline-none"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {exportType === "fy" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent outline-none"
                    value={exportFY}
                    onChange={(e) => setExportFY(e.target.value)}
                  >
                    <option value="2025-26">2025-26</option>
                    <option value="2024-25">2024-25</option>
                    <option value="2026-27">2026-27</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    {exportFormat === "excel" 
                      ? "Generates a multi-sheet workbook containing all monthly sheets from April to March." 
                      : "Generates a consolidated multi-page PDF report containing all monthly data from April to March."}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
              <button
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium outline-none"
              >
                Cancel
              </button>
              <button
                onClick={exportFormat === "excel" ? handleExportExcel : handleExportPDF}
                disabled={loading}
                className={`px-5 py-2 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 outline-none ${
                  exportFormat === "excel" ? "bg-[#262760] hover:bg-[#1f204d]" : "bg-red-700 hover:bg-red-800"
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    {exportFormat === "excel" ? (
                      <>
                        <Download className="w-4 h-4" />
                        Download Excel
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download PDF
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenditureManagement;
