import React, { useEffect, useMemo, useState } from "react";
// Forced reload comment
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Download,
  Filter,
  Save,
  X,
  Mail,
  Paperclip,
  ChevronDown,
  Calculator,
  FileText
} from "lucide-react";
import { employeeAPI, compensationAPI, mailAPI } from "../../services/api";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getAbsoluteSignatureUrl } from '../../utils/signatureUtils';


// Salary Calculation Functions
// === 50/25/25 Rule (matches backend: update_payrolls_50_25_25.js & directorRoutes.js) ===
// Basic = 50% of Gross, HRA = 25% of Gross
// Special Allowance = Gross - Basic - HRA - Employee PF - Employer PF - ESI (remainder)
// Net Salary = Basic + HRA + Special Allowance
// CTC = Gross + Gratuity
const calculateSalaryFields = (salaryData) => {
  const inputGross = Math.round(parseFloat(salaryData.gross) || 0);
  
  // Basic + DA = 50% of Gross
  const basicDA = Math.round(inputGross * 0.50);
  
  // HRA = 25% of Gross
  const hra = Math.round(inputGross * 0.25);
  
  // PF Contributions (Prioritize manual entry or fallback to fixed defaults)
  const employerPF = parseFloat(salaryData.employerPfContribution) || (inputGross > 0 ? 1950 : 0);
  const employeePF = parseFloat(salaryData.employeePfContribution) || (inputGross > 0 ? 1800 : 0);
  const esi = parseFloat(salaryData.esi) || 0;
  
  // Special Allowance = Gross - Basic - HRA - Employee PF - Employer PF - ESI
  const specialAllowance = Math.max(0, inputGross - basicDA - hra - employeePF - employerPF - esi);
  
  // Gratuity = Basic Salary x 4.86%
  const gratuity = Math.round(basicDA * 0.0486);
  
  // Other deductions
  const professionalTax = parseFloat(salaryData.professionalTax) || 0;
  const volunteerPFVal = parseFloat(salaryData.volunteerPF) || 0;
  const tax = parseFloat(salaryData.tax) || 0;

  // Total Earnings (Gross) = Basic + HRA + Special + Employee PF + Employer PF + ESI
  const totalEarnings = basicDA + hra + specialAllowance + employeePF + employerPF + esi;
  
  // Total Deductions = Employee PF + Employer PF + ESI + Professional Tax + Volunteer PF + Income Tax
  const totalDeductions = employeePF + employerPF + esi + professionalTax + volunteerPFVal + tax;
  
  // Net Salary = Total Earnings - Total Deductions
  const netSalary = totalEarnings - totalDeductions;
  
  // CTC = Gross + Gratuity
  const ctc = Math.round(inputGross + gratuity);

  return {
    ...salaryData,
    basicDA,
    hra,
    specialAllowance,
    employeePfContribution: employeePF,
    employerPfContribution: employerPF,
    esi,
    volunteerPF: salaryData.volunteerPF,
    professionalTax,
    tax,
    gratuity,
    netSalary,
    ctc,
    totalEarnings: inputGross,
    totalDeductions,
    pf: employeePF + employerPF
  };
};

// Helper to prepare compensation data (handles legacy records and calculations)
const prepareCompensationData = (comp) => {
  if (!comp) return comp;
  let prepared = { ...comp };
  // Reconstruct gross if not saved (legacy records before gross was added to schema)
  if (!prepared.gross && (prepared.basicDA || prepared.hra || prepared.specialAllowance)) {
    const basic = Number(prepared.basicDA) || 0;
    const hra = Number(prepared.hra) || 0;
    const special = Number(prepared.specialAllowance) || 0;
    const empPF = Number(prepared.employeePfContribution) || 1800;
    const emprPF = Number(prepared.employerPfContribution) || 1950;
    const esi = Number(prepared.esi) || 0;
    prepared.gross = basic + hra + special + empPF + emprPF + esi;
  }
  return calculateSalaryFields(prepared);
};

const initialCompensation = {
  employeeId: "",
  name: "",
  department: "",
  designation: "",
  grade: "",
  location: "",
  effectiveDate: new Date().toISOString().split("T")[0],
  gross: "",
  basicDA: "",
  hra: "",
  specialAllowance: "",
  gratuity: "",
  pf: 3750,
  employeePfContribution: 1800,
  employerPfContribution: 1950,
  esi: 0,
  volunteerPF: "",
  professionalTax: "",
  tax: "",
  modeBasicDA: "amount",
  modeHra: "amount",
  modeSpecialAllowance: "amount",
  modeGratuity: "amount",
  modePf: "amount",
  modeEsi: "amount",
  modeTax: "amount",
  modeProfessionalTax: "amount",
  
  // Calculated Fields
  totalEarnings: 0,
  totalDeductions: 0,
  netSalary: 0,
  ctc: 0,

  // Bank Details
  bankName: "",
  accountNumber: "",
  ifscCode: "",

  // Additional Employee Details
  dateOfJoining: "",
  employmentType: "Permanent",
};




const LetterHeader = () => (
  <div className="w-full h-32 relative overflow-hidden flex bg-white" style={{ width: '100%', height: '128px', position: 'relative', overflow: 'hidden', display: 'flex' }}>
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
      <svg width="100%" height="100%" viewBox="0 0 794 128" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
        <path d="M0,0 L526,0 L456,128 L0,128 Z" fill="#1e2b58" />
        <path d="M526,0 L556,0 L486,128 L456,128 Z" fill="#f37021" />
      </svg>
    </div>
    <div className="relative z-10 w-full h-full" style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%' }}>
      {/* Left: Logo and Title */}
      <div style={{ position: 'absolute', left: '24px', top: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
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
          <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs shadow-md" style={{ backgroundColor: '#1e2b58', borderRadius: '9999px', padding: '6px', color: 'white', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justify: 'center' }}>
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
          <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs ml-3 mt-1 shadow-md" style={{ backgroundColor: '#1e2b58', borderRadius: '9999px', padding: '6px', color: 'white', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justify: 'center', marginLeft: '12px', marginTop: '4px', flexShrink: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4" style={{ width: '16px', height: '16px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
);


const LetterFooter = () => (
  <div className="w-full flex items-end mt-auto relative h-20" style={{ width: '100%', display: 'flex', alignItems: 'flex-end', marginTop: 'auto', position: 'relative', height: '80px' }}>
    <div className="bg-[#f37021] flex-1 mb-0 h-8" style={{ backgroundColor: '#f37021', flex: 1, marginBottom: 0, height: '32px' }}></div>
    <div className="bg-[#1e2b58] text-white flex flex-col items-end justify-center relative min-w-[400px] h-16 px-10" style={{ backgroundColor: '#1e2b58', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', position: 'relative', minWidth: '400px', height: '64px', paddingLeft: '40px', paddingRight: '40px' }}>
      <div 
        className="absolute inset-y-0 left-0 w-16 bg-[#1e2b58]" 
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '64px', backgroundColor: '#1e2b58', transform: 'skewX(-25deg) translateX(-50%)', transformOrigin: 'top' }}
      ></div>
      <div className="text-[13px] font-bold tracking-wide relative z-10" style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.025em', position: 'relative', zIndex: 10 }}>Website : www.caldimengg.com</div>
      <div className="text-[13px] font-bold tracking-wide mt-1 relative z-10" style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.025em', marginTop: '4px', position: 'relative', zIndex: 10 }}>CIN U74999TN2016PTC110683</div>
    </div>
  </div>
);

const CompensationMaster = () => {
  const [compensation, setCompensation] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState(initialCompensation);
  const [search, setSearch] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterDesignation, setFilterDesignation] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [locations, setLocations] = useState(["Hosur", "Chennai"]);
  const [employees, setEmployees] = useState([]);
  const [viewItem, setViewItem] = useState(null);
  
  // New states for Payroll Details format
  const [errors, setErrors] = useState({});
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [employeeLookupError, setEmployeeLookupError] = useState('');

  // Editable combo-box states for Designation and Department
  const [isDesignationDropdownOpen, setIsDesignationDropdownOpen] = useState(false);
  const [designationSearchTerm, setDesignationSearchTerm] = useState('');
  const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = useState(false);
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState('');

  // Email state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [emailData, setEmailData] = useState({
    to: "",
    cc: "",
    subject: "Compensation Details / Offer Letter",
    message: "",
    attachments: [] // Array of { filename, content, encoding }
  });
  const [selectedCompensation, setSelectedCompensation] = useState(null); // Store current comp for HTML generation

  // Popup & Dialog states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageDialogConfig, setMessageDialogConfig] = useState({
    title: '',
    message: '',
    type: 'success' // success, error, warning, info
  });

  const showMessage = (title, message, type = 'success') => {
    setMessageDialogConfig({ title, message, type });
    setShowMessageDialog(true);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [empRes, compRes] = await Promise.all([
          employeeAPI.getAllEmployees(),
          compensationAPI.getAll()
        ]);

        const list = Array.isArray(empRes.data) ? empRes.data : [];
        const activeEmployees = list.filter(e => e.status === 'Active');
        setEmployees(activeEmployees);
        const depts = [...new Set(list.map(e => e.department || e.division).filter(Boolean))];
        const desigs = [...new Set(list.map(e => e.designation || e.position || e.role).filter(Boolean))];
        const locs = [...new Set(list.map(e => e.location).filter(Boolean))];
        setDepartments(depts);
        setDesignations(desigs);
        if (locs.length > 0) setLocations(locs);

        if (Array.isArray(compRes.data)) {
          setCompensation(compRes.data.map(item => prepareCompensationData(item)));
        }
      } catch (error) {
        console.error("Error loading data", error);
      }
    };
    loadData();
  }, []);

  const filtered = useMemo(() => {
    let data = [...compensation];
    if (search.trim()) {
      const term = search.toLowerCase();
      data = data.filter(t =>
        (t.name || "").toLowerCase().includes(term) ||
        (t.department || "").toLowerCase().includes(term) ||
        (t.designation || "").toLowerCase().includes(term) ||
        (t.location || "").toLowerCase().includes(term)
      );
    }
    if (filterDepartment) {
      data = data.filter(t => (t.department || "") === filterDepartment);
    }
    if (filterDesignation) {
      data = data.filter(t => (t.designation || "") === filterDesignation);
    }
    if (filterLocation) {
      data = data.filter(t => (t.location || "") === filterLocation);
    }
    return data;
  }, [compensation, search, filterDepartment, filterDesignation, filterLocation]);

  const handleOpenAdd = () => {
    setEditingIndex(null);
    setFormData(initialCompensation);
    setOpenDialog(true);
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    let comp = prepareCompensationData(compensation[index]);

    // Format effectiveDate for type="date" input (requires YYYY-MM-DD)
    if (comp.effectiveDate) {
      const date = new Date(comp.effectiveDate);
      if (!isNaN(date.getTime())) {
        comp.effectiveDate = date.toISOString().split('T')[0];
      }
    }

    setFormData(comp);
    setOpenDialog(true);
  };

  const handleDelete = (index) => {
    setItemToDelete(index);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete === null) return;
    try {
      const id = compensation[itemToDelete]._id;
      await compensationAPI.delete(id);
      const next = [...compensation];
      next.splice(itemToDelete, 1);
      setCompensation(next);
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      showMessage('Success', 'Compensation deleted successfully', 'success');
    } catch (error) {
      console.error("Error deleting compensation", error);
      setShowDeleteConfirm(false);
      showMessage('Error', 'Failed to delete compensation', 'error');
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  const handleChange = (e) => {
    let { name, value } = e.target;

    // Fields that should only contain numbers
    const numericFields = [
      'gross', 'basicDA', 'hra', 'specialAllowance', 'gratuity',
      'pf', 'employeePfContribution', 'employerPfContribution', 'esi', 'volunteerPF', 'professionalTax', 'tax'
    ];

    if (numericFields.includes(name)) {
      // Allow only numbers and a single decimal point
      value = value.replace(/[^0-9.]/g, '');
      const parts = value.split('.');
      if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
      }
    }

    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Auto-calculate salary fields
    if (name === 'gross' || numericFields.includes(name)) {
      const updatedData = calculateSalaryFields({ ...formData, [name]: value });
      setFormData(updatedData);
    }
    
    // Auto-fill removed as per user request to allow manual entry
  };

  const handleOpenEmail = (comp) => {
    const emp = employees.find(e => e.employeeId === comp.employeeId);
    const email = emp?.email || "";
    setSelectedCompensation({
      ...comp,
      dateOfJoining: emp?.dateOfJoining,
      location: emp?.location || comp.location,
      designation: emp?.designation || comp.designation
    });
    
    // Default introductory message for Offer Letter
    const joiningDate = emp?.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString('en-GB') : "[Date]";
    
    const message = `Dear ${comp.name},

We are delighted to welcome you to Caldim and officially extend our offer for the position of ${comp.designation} in the ${comp.department}. We look forward to your valuable contributions and a successful association with our organization.

<b>Joining & Reporting Details</b>

Joining Date  : ${joiningDate}
Work Location : ${comp.location || "[Office Location]"}
Reporting To  : HR Department

<b>Onboarding & Document Submission</b>

To ensure a smooth onboarding process, please bring the following documents on your first day:

• Two passport-size photographs
• Copies of all educational certificates (from school to degree)
• Aadhar Card copy
• PAN Card copy
• Updated Resume
• Relieving order (Mandatory)

Please find your detailed Offer Letter attached for review.

<b>Next Steps</b>

Upon arrival, please report to the HR Department to complete the onboarding formalities.

For any queries or clarifications, feel free to contact us at +91 9994479432.

We’re excited to have you join our team and look forward to your growth and success with Caldim Engineering Private Limited.

<b>Kindly confirm your acceptance by replying to kumaresan.t@caldimengg.in.</b>`;

    setEmailData({
      to: email,
      cc: "",
      subject: "Offer of Employment at Caldim Engineering Pvt. Ltd.",
      message: message,
      attachments: []
    });
    setEmailModalOpen(true);
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newAttachments = [];
    for (const file of files) {
      const reader = new FileReader();
      const promise = new Promise((resolve) => {
        reader.onload = (e) => {
          const content = e.target.result.split(',')[1]; // Get base64 content
          resolve({
            filename: file.name,
            content: content,
            encoding: 'base64'
          });
        };
      });
      reader.readAsDataURL(file);
      newAttachments.push(await promise);
    }

    setEmailData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments]
    }));
  };

  const removeAttachment = (index) => {
    setEmailData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? dateString : date.toLocaleDateString('en-GB');
  };

  const generateHTML = (message, comp) => {
    if (!comp) return "";
    
    const formatCurrency = (val) => {
        if (!val && val !== 0) return "₹0";
        return isNaN(val) ? val : Number(val).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    };

    // === 50/25/25 Rule (matches backend) ===
    const basicDA = parseFloat(comp.basicDA) || 0;
    const hra = parseFloat(comp.hra) || 0;
    const specialAllowance = parseFloat(comp.specialAllowance) || 0;
    const professionalTax = parseFloat(comp.professionalTax) || 0;
    const tax = parseFloat(comp.tax) || 0;
    const gratuity = parseFloat(comp.gratuity) || 0;
    const esi = parseFloat(comp.esi) || 0;
    
    const employerPF = parseFloat(comp.employerPfContribution) || 1950;
    const employeePF = parseFloat(comp.employeePfContribution) || 1800;

    // Gross = Basic + HRA + Special + Employee PF + Employer PF + ESI
    const grossSalary = basicDA + hra + specialAllowance + employeePF + employerPF + esi;
    // Total Earnings (Gross) = Basic + HRA + Special + Employee PF + Employer PF + ESI
    const totalEarnings = basicDA + hra + specialAllowance + employeePF + employerPF + esi;
    // Total Deductions = Employee PF + Employer PF + ESI + Professional Tax + Income Tax
    const totalDeductions = employeePF + employerPF + esi + professionalTax + tax;
    // Net Salary = Total Earnings - Total Deductions
    const netSalary = totalEarnings - totalDeductions;
    // CTC = Gross + Gratuity
    const ctc = Math.round(grossSalary + gratuity);

    return `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #262760; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">Compensation Details</h2>
        </div>
        
        <div style="padding: 30px;">
          <div style="font-size: 16px; line-height: 1.6; color: #555; white-space: pre-wrap;">${message.replace(/\n/g, '<br>')}</div>
 
          <div style="margin-top: 30px; background-color: #f9fafb; padding: 20px; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #262760; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Employee Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 40%;">Name</td>
                <td style="padding: 8px 0; font-weight: 600;">${comp.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Designation</td>
                <td style="padding: 8px 0; font-weight: 600;">${comp.designation}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Department</td>
                <td style="padding: 8px 0; font-weight: 600;">${comp.department}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Location</td>
                <td style="padding: 8px 0; font-weight: 600;">${comp.location}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Effective Date</td>
                <td style="padding: 8px 0; font-weight: 600;">${formatDate(comp.effectiveDate)}</td>
              </tr>
            </table>
          </div>
 
          <div style="margin-top: 30px;">
            <h3 style="color: #262760; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Salary Breakdown</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead style="background-color: #f3f4f6;">
                <tr>
                  <th style="padding: 12px; text-align: left; color: #4b5563; font-weight: 600; border: 1px solid #e5e7eb;">Component</th>
                  <th style="padding: 12px; text-align: right; color: #4b5563; font-weight: 600; border: 1px solid #e5e7eb;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">Basic + DA</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${formatCurrency(basicDA)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">HRA</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${formatCurrency(hra)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">Special Allowance</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${formatCurrency(specialAllowance)}</td>
                </tr>
                <tr style="background-color: #f9fafb;">
                   <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Gross Earnings</strong></td>
                   <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;"><strong>${formatCurrency(totalEarnings)}</strong></td>
                </tr>
                <tr>
                   <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #f3f4f6;" colspan="2"><strong>Deductions</strong></td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">Employee PF Contribution</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${formatCurrency(employeePF)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">Employer PF Contribution</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${formatCurrency(employerPF)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">Income Tax</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${formatCurrency(tax)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">Professional Tax</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${formatCurrency(professionalTax)}</td>
                </tr>
                <tr>
                   <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Total Deductions</strong></td>
                   <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;"><strong>${formatCurrency(totalDeductions)}</strong></td>
                </tr>
                <tr style="background-color: #eef2ff;">
                   <td style="padding: 12px; border: 1px solid #e5e7eb; color: #312e81;"><strong>Net Salary</strong></td>
                   <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; color: #312e81;"><strong>${formatCurrency(netSalary)}</strong></td>
                </tr>
                <tr>
                   <td style="padding: 12px; border: 1px solid #e5e7eb;">Gratuity (Part of CTC)</td>
                   <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${formatCurrency(gratuity)}</td>
                </tr>
                <tr>
                   <td style="padding: 12px; border: 1px solid #e5e7eb;">CTC (Monthly)</td>
                   <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${formatCurrency(ctc)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div style="margin-top: 30px; font-size: 12px; color: #9ca3af; text-align: center;">
            <p>This is a system generated email. Please do not reply directly to this email unless instructed.</p>
          </div>
        </div>
      </div>
    `;
  };

  const handlePreviewLetter = async () => {
    try {
      setGeneratingPDF(true);
      console.log("Generating preview for:", selectedCompensation?.name);
      
      // Wait a bit for DOM to settle
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const pages = ['offer-letter-p1', 'offer-letter-p2', 'offer-letter-p3', 'offer-letter-p4'];
      const pdf = new jsPDF('p', 'mm', 'a4');
      let pageAdded = false;

      for (let i = 0; i < pages.length; i++) {
        const element = document.getElementById(pages[i]);
        if (!element) continue;

        if (pageAdded) pdf.addPage();

        const canvas = await html2canvas(element, {
          scale: 1.5,
          useCORS: true,
          logging: false, // Disabled for performance
          allowTaint: true,
          backgroundColor: '#ffffff',
          scrollY: -window.scrollY,
          scrollX: -window.scrollX,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.85); // Slightly lower quality for speed
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const finalHeight = Math.min(imgHeight, 297);

        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, finalHeight);
        pageAdded = true;
      }
      
      const pdfBlob = pdf.output('bloburl');
      window.open(pdfBlob, '_blank');
      
    } catch (error) {
      console.error("Error generating preview", error);
      showMessage('Error', "Failed to generate preview", 'error');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const attachCompensationLetter = async (silent = false) => {
    try {
      // Small delay to ensure DOM is ready with new data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const pages = ['offer-letter-p1', 'offer-letter-p2', 'offer-letter-p3', 'offer-letter-p4'];
    const pdf = new jsPDF('p', 'mm', 'a4');
    let pageAdded = false;

    for (let i = 0; i < pages.length; i++) {
      const element = document.getElementById(pages[i]);
      if (!element) {
        console.warn(`Element ${pages[i]} not found during attachment`);
        continue;
      }

      if (pageAdded) {
        pdf.addPage();
      }

      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        logging: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scrollY: -window.scrollY,
        scrollX: -window.scrollX,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Cap height to A4
      const finalHeight = Math.min(imgHeight, 297);

      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, finalHeight);
      pageAdded = true;
    }
      
      // Get base64 without prefix
      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      
      console.log("PDF Generated. Size:", pdfBase64.length);

      const newAttachment = {
        filename: `Offer_Letter_${selectedCompensation.name.replace(/\s+/g, '_')}.pdf`,
        content: pdfBase64,
        encoding: 'base64'
      };
      
      setEmailData(prev => {
        // Remove any existing auto-generated compensation letters to prevent duplicates
        const filteredAttachments = prev.attachments.filter(
          att => !att.filename.startsWith('Compensation_Letter_') && !att.filename.startsWith('Offer_Letter_')
        );
        return {
          ...prev,
          attachments: [...filteredAttachments, newAttachment]
        };
      });
      
      if (!silent) showMessage('Success', "Offer Letter attached successfully!");
      
    } catch (error) {
      console.error("Error generating PDF", error);
      if (!silent) showMessage('Error', "Failed to generate PDF", 'error');
    }
  };

  // Auto-attach letter when email modal opens
  useEffect(() => {
    if (emailModalOpen && selectedCompensation) {
      attachCompensationLetter(true);
    }
  }, [emailModalOpen, selectedCompensation]);

  const handleSendEmail = async () => {
    if (!emailData.to) {
      showMessage('Validation', "Please enter a recipient email address.", 'warning');
      return;
    }
    
    try {
      setSendingEmail(true);
      
      const htmlContent = generateHTML(emailData.message, selectedCompensation);

      await mailAPI.send({
        email: emailData.to,
        cc: emailData.cc,
        subject: emailData.subject,
        message: emailData.message, // Fallback text
        html: htmlContent,          // Rich HTML
        attachments: emailData.attachments
      });
      
      showMessage('Success', "Email sent successfully!", 'success');
      setEmailModalOpen(false);
      setEmailData({ to: "", cc: "", subject: "", message: "", attachments: [] });
      setSelectedCompensation(null);
    } catch (error) {
      console.error("Error sending email", error);
      showMessage('Error', `Failed to send email: ${error.response?.data?.message || error.message}`, 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSubmit = async () => {
    const payload = { ...formData };
    if (!payload.name || !payload.department || !payload.designation) return;

    try {
      if (editingIndex !== null) {
        const id = compensation[editingIndex]._id;
        const res = await compensationAPI.update(id, payload);
        const next = [...compensation];
        next[editingIndex] = prepareCompensationData(res.data);
        setCompensation(next);
      } else {
        const res = await compensationAPI.create(payload);
        setCompensation(prev => [prepareCompensationData(res.data), ...prev]);
      }
      setOpenDialog(false);
      setEditingIndex(null);
      setFormData(initialCompensation);
      showMessage('Success', "Compensation saved successfully!", 'success');
    } catch (error) {
      console.error("Error saving compensation", error);
      const errorMsg = error.response?.data?.message || "Failed to save compensation";
      showMessage('Error', errorMsg, 'error');
    }

  };

  const exportCSV = () => {
    const cols = [
      "name","department","designation","grade","location","effectiveDate",
      "basicDA","hra","specialAllowance","gratuity","pf","professionalTax","tax",
      "modeBasicDA","modeHra","modeSpecialAllowance","modeGratuity","modePf","modeProfessionalTax","modeTax"
    ];
    const header = cols.join(",");
    const rows = compensation.map(t =>
      cols.map(k => String(t[k] ?? "")).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `CompensationMaster_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // === 50/25/25 Rule: Calculate totals dynamically for the PDF offer letter ===
  const calcBasicDA = selectedCompensation ? (parseFloat(selectedCompensation.basicDA) || 0) : 0;
  const calcHRA = selectedCompensation ? (parseFloat(selectedCompensation.hra) || 0) : 0;
  const calcSpecial = selectedCompensation ? (parseFloat(selectedCompensation.specialAllowance) || 0) : 0;
  const calcProfessionalTax = selectedCompensation ? (parseFloat(selectedCompensation.professionalTax) || 0) : 0;
  const calcGratuity = selectedCompensation ? (parseFloat(selectedCompensation.gratuity) || 0) : 0;
  const calcTax = selectedCompensation ? (parseFloat(selectedCompensation.tax) || 0) : 0;

  const calcEmployerPF = selectedCompensation ? (parseFloat(selectedCompensation.employerPfContribution) || 1950) : 0;
  const calcEmployeePF = selectedCompensation ? (parseFloat(selectedCompensation.employeePfContribution) || 1800) : 0;
  const calcESI = selectedCompensation ? (parseFloat(selectedCompensation.esi) || 0) : 0;
  // Total Earnings (Gross) = Basic + HRA + Special + PFs + ESI
  const calcTotalEarnings = calcBasicDA + calcHRA + calcSpecial + calcEmployeePF + calcEmployerPF + calcESI;
  // Total Deductions = Employee PF + Employer PF + ESI + Professional Tax + Income Tax
  const calcTotalDeductions = calcEmployeePF + calcEmployerPF + calcESI + calcProfessionalTax + calcTax;
  // Net Salary = Total Earnings - Total Deductions
  const calcNetSalary = calcTotalEarnings - calcTotalDeductions;
  // CTC = Gross + Gratuity
  const calcCTC = Math.round(calcTotalEarnings + calcGratuity);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const viewSummary = useMemo(() => {
    if (!viewItem) return null;
    const basic = parseFloat(viewItem.basicDA) || 0;
    const hra = parseFloat(viewItem.hra) || 0;
    const special = parseFloat(viewItem.specialAllowance) || 0;
    const gratuity = parseFloat(viewItem.gratuity) || 0;
    const esi = parseFloat(viewItem.esi) || 0;
    const employeePF = parseFloat(viewItem.employeePfContribution) || 0;
    const employerPF = parseFloat(viewItem.employerPfContribution) || 0;
    const volunteerPF = parseFloat(viewItem.volunteerPF) || 0;
    const professionalTax = parseFloat(viewItem.professionalTax) || 0;
    const tax = parseFloat(viewItem.tax) || 0;

    // Total Earnings (Gross) = Basic + HRA + Special + Employee PF + Employer PF + ESI
    const totalEarnings = basic + hra + special + employeePF + employerPF + esi;
    const totalDeductions = employeePF + employerPF + esi + volunteerPF + professionalTax + tax;
    
    // Net Salary = Gross - Total Deductions
    const netSalary = totalEarnings - totalDeductions;
    
    const ctc = Math.round(totalEarnings + gratuity); // CTC = Gross + Gratuity

    return {
      totalEarnings,
      totalDeductions,
      netSalary,
      ctc,
      employeePF,
      employerPF,
      esi,
      volunteerPF,
      professionalTax,
      tax
    };
  }, [viewItem]);

  const formatViewDate = (value) => {
    if (!value) return "-";
    const dateObj = new Date(value);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    }
    const str = String(value);
    return str.includes("T") ? str.split("T")[0] : str;
  };

  const activeFilterCount = useMemo(
    () =>
      [filterDepartment, filterDesignation, filterLocation].filter(Boolean)
        .length,
    [filterDepartment, filterDesignation, filterLocation]
  );

  return (
    <div className="p-6">
      <div className="bg-white p-4 rounded-lg shadow mb-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, department, designation"
            className="border rounded px-3 py-2 w-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 shadow-sm transition"
        >
          <Filter size={16} />
          <span className="text-sm font-medium">Filters</span>
          {activeFilterCount > 0 && (
            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-indigo-600 text-white">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${
              filtersOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        <div className="ml-auto flex gap-2 mt-2 sm:mt-0">
          <button
            onClick={handleOpenAdd}
            className="bg-[#262760] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-[#1e2050]"
          >
            <Plus size={18} />
            Add Compensation
          </button>
          <button
            onClick={exportCSV}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-300"
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {filtersOpen && (
        <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl px-4 py-3 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-indigo-900 mb-1 tracking-wide">
              Department
            </label>
            <select
              className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <option value="">All</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-indigo-900 mb-1 tracking-wide">
              Designation
            </label>
            <select
              className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={filterDesignation}
              onChange={(e) => setFilterDesignation(e.target.value)}
            >
              <option value="">All</option>
              {designations.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-indigo-900 mb-1 tracking-wide">
              Location
            </label>
            <select
              className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
            >
              <option value="">All</option>
              {locations.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end justify-start sm:justify-end">
            <button
              onClick={() => {
                setFilterDepartment("");
                setFilterDesignation("");
                setFilterLocation("");
              }}
              className="px-4 py-2 text-sm rounded-lg border border-indigo-300 text-indigo-700 bg-white hover:bg-indigo-50 transition"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#262760]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Candidate Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Designation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Basic/DA</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">HRA</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Special Allow</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">PF</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Gratuity</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-8 text-center text-gray-500">No compensation found</td>
                </tr>
              ) : filtered.map((t, idx) => (
                <tr key={idx} className="hover:bg-indigo-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold">{t.name}</div>
                  </td>
                  <td className="px-6 py-4">{t.department || "-"}</td>
                  <td className="px-6 py-4">{t.designation || "-"}</td>
                  <td className="px-6 py-4">{t.location || "-"}</td>
                  <td className="px-6 py-4 text-right">{t.basicDA || "-"}</td>
                  <td className="px-6 py-4 text-right">{t.hra || "-"}</td>
                  <td className="px-6 py-4 text-right">{t.specialAllowance || "-"}</td>
                  <td className="px-6 py-4 text-right">{t.pf || "-"}</td>
                  <td className="px-6 py-4 text-right">{t.gratuity || "-"}</td>
                  <td className="px-6 py-4 text-center">Joined</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-center">
                      <button
                        onClick={() => setViewItem(t)}
                        className="text-indigo-600 hover:text-indigo-900 p-1 rounded-full hover:bg-indigo-50"
                        title="View"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(compensation.indexOf(t))}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50"
                        title="Edit"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(compensation.indexOf(t))}
                        className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleOpenEmail(t)}
                        className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50"
                        title="Send Email"
                      >
                        <Mail className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {openDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingIndex !== null ? 'Edit Compensation' : 'Add Compensation'}
              </h2>
              <button
                onClick={() => { setOpenDialog(false); setEditingIndex(null); }}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-6 space-y-6">
                {/* Employee Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Candidate Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Candidate Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        autoComplete="off"
                        value={formData.name}
                        onChange={(e) => {
                          handleChange(e);
                          setEmployeeSearchTerm(e.target.value);
                          setIsEmployeeDropdownOpen(true);
                        }}
                        onFocus={() => setIsEmployeeDropdownOpen(true)}
                        onBlur={() => {
                          setTimeout(() => setIsEmployeeDropdownOpen(false), 200);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Search employee..."
                      />
                      {isEmployeeDropdownOpen && employees.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {employees
                            .filter(emp => 
                              emp.name.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
                              emp.employeeId.toLowerCase().includes(employeeSearchTerm.toLowerCase())
                            )
                            .map((emp) => (
                              <button
                                key={emp._id}
                                type="button"
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex flex-col"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    employeeId: emp.employeeId,
                                    name: emp.name,
                                    department: emp.department || emp.division || '',
                                    designation: emp.designation || '',
                                    location: emp.location || 'Hosur'
                                  });
                                  setIsEmployeeDropdownOpen(false);
                                  setEmployeeSearchTerm('');
                                }}
                              >
                                <span className="font-medium">{emp.name}</span>
                                <span className="text-xs text-gray-500">{emp.employeeId} • {emp.designation}</span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    {/* Designation - Editable Combo Box */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Designation *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="designation"
                          autoComplete="off"
                          value={formData.designation}
                          onChange={(e) => {
                            handleChange(e);
                            setDesignationSearchTerm(e.target.value);
                            setIsDesignationDropdownOpen(true);
                          }}
                          onFocus={() => {
                            setDesignationSearchTerm(formData.designation || '');
                            setIsDesignationDropdownOpen(true);
                          }}
                          onBlur={() => {
                            // Delay close so click on dropdown item registers
                            setTimeout(() => setIsDesignationDropdownOpen(false), 200);
                          }}
                          placeholder="Search or type new..."
                          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setIsDesignationDropdownOpen(prev => !prev)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                        >
                          <ChevronDown size={16} className={`transition-transform duration-200 ${isDesignationDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                      {isDesignationDropdownOpen && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {designations
                            .filter(d => d.toLowerCase().includes((formData.designation || '').toLowerCase()))
                            .map((d) => (
                              <button
                                key={d}
                                type="button"
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 transition-colors ${formData.designation === d ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, designation: d }));
                                  setIsDesignationDropdownOpen(false);
                                  setDesignationSearchTerm('');
                                }}
                              >
                                {d}
                              </button>
                            ))}
                          {formData.designation && !designations.some(d => d.toLowerCase() === formData.designation.toLowerCase()) && (
                            <button
                              type="button"
                              className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 font-medium border-t border-gray-100 flex items-center gap-2"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                const newVal = formData.designation.trim();
                                if (newVal && !designations.includes(newVal)) {
                                  setDesignations(prev => [...prev, newVal].sort());
                                }
                                setIsDesignationDropdownOpen(false);
                                setDesignationSearchTerm('');
                              }}
                            >
                              <Plus size={14} />
                              Add "{formData.designation}"
                            </button>
                          )}
                          {designations.filter(d => d.toLowerCase().includes((formData.designation || '').toLowerCase())).length === 0 && !formData.designation && (
                            <div className="px-4 py-3 text-sm text-gray-400 text-center">No designations found</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Department - Editable Combo Box */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="department"
                          autoComplete="off"
                          value={formData.department}
                          onChange={(e) => {
                            handleChange(e);
                            setDepartmentSearchTerm(e.target.value);
                            setIsDepartmentDropdownOpen(true);
                          }}
                          onFocus={() => {
                            setDepartmentSearchTerm(formData.department || '');
                            setIsDepartmentDropdownOpen(true);
                          }}
                          onBlur={() => {
                            setTimeout(() => setIsDepartmentDropdownOpen(false), 200);
                          }}
                          placeholder="Search or type new..."
                          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setIsDepartmentDropdownOpen(prev => !prev)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                        >
                          <ChevronDown size={16} className={`transition-transform duration-200 ${isDepartmentDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                      {isDepartmentDropdownOpen && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {departments
                            .filter(d => d.toLowerCase().includes((formData.department || '').toLowerCase()))
                            .map((d) => (
                              <button
                                key={d}
                                type="button"
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 transition-colors ${formData.department === d ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'}`}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, department: d }));
                                  setIsDepartmentDropdownOpen(false);
                                  setDepartmentSearchTerm('');
                                }}
                              >
                                {d}
                              </button>
                            ))}
                          {formData.department && !departments.some(d => d.toLowerCase() === formData.department.toLowerCase()) && (
                            <button
                              type="button"
                              className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 font-medium border-t border-gray-100 flex items-center gap-2"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                const newVal = formData.department.trim();
                                if (newVal && !departments.includes(newVal)) {
                                  setDepartments(prev => [...prev, newVal].sort());
                                }
                                setIsDepartmentDropdownOpen(false);
                                setDepartmentSearchTerm('');
                              }}
                            >
                              <Plus size={14} />
                              Add "{formData.department}"
                            </button>
                          )}
                          {departments.filter(d => d.toLowerCase().includes((formData.department || '').toLowerCase())).length === 0 && !formData.department && (
                            <div className="px-4 py-3 text-sm text-gray-400 text-center">No departments found</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                      </label>
                      <select
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Location</option>
                        {locations.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>
                    
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Effective Date
                      </label>
                      <input
                        type="date"
                        name="effectiveDate"
                        value={formData.effectiveDate}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Earnings & Allowances</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">
                        Gross Salary *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          name="gross"
                          value={formData.gross}
                          onChange={handleChange}
                          className="w-full pl-8 pr-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter Gross Salary"
                        />
                      </div>
                    </div>
                    {[
                      { label: 'Basic + DA', name: 'basicDA' },
                      { label: 'HRA', name: 'hra' },
                      { label: 'Special Allowance', name: 'specialAllowance' },
                    ].map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            name={field.name}
                            value={formData[field.name]}
                            readOnly
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Benefits */}
                <div>
                  <h3 className="text-lg font-medium text-purple-900 mb-4">Benefits (Part of CTC)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { label: 'Gratuity', name: 'gratuity' },
                    ].map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            name={field.name}
                            value={formData[field.name]}
                            readOnly
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <h3 className="text-lg font-medium text-red-900 mb-4">Deductions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { label: 'Employee PF', name: 'employeePfContribution' },
                      { label: 'Employer PF', name: 'employerPfContribution' },
                      { label: 'Volunteer PF', name: 'volunteerPF' },
                      { label: 'ESI', name: 'esi' },
                      { label: 'Income Tax', name: 'tax' },
                      { label: 'Professional Tax', name: 'professionalTax' },
                    ].map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            name={field.name}
                            value={formData[field.name]}
                            onChange={handleChange}
                            className={`w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Salary Summary */}
                <div>
                  <h3 className="text-lg font-medium text-green-900 mb-4">Salary Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Earnings', name: 'totalEarnings', color: 'text-green-600' },
                      { label: 'Total Deductions', name: 'totalDeductions', color: 'text-red-600' },
                      { label: 'Net Salary', name: 'netSalary', color: 'text-blue-600 font-bold' },
                      { label: 'Cost to Company (CTC)', name: 'ctc', color: 'text-purple-600' },
                    ].map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                          <input
                            type="text"
                            value={formData[field.name]}
                            readOnly
                            className={`w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg ${field.color}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

               
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2 sticky bottom-0 z-10">
              <button
                onClick={() => { setOpenDialog(false); setEditingIndex(null); }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1e2050] flex items-center gap-2"
              >
                <Save size={18} />
                {editingIndex !== null ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="relative w-full max-w-3xl">
            <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-amber-300 opacity-80 blur-md"></div>
            <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="bg-[#262760] px-6 py-4 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold tracking-widest text-indigo-100/80 uppercase">
                    Compensation Snapshot
                  </span>
                  <span className="text-xl font-bold text-white">
                    {viewItem.name || "Compensation"}
                  </span>
                  
                </div>
                <button
                  onClick={() => setViewItem(null)}
                  className="p-2 rounded-full bg-black/15 hover:bg-black/25 text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-6 pt-4 pb-6 bg-white">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  <div className="bg-slate-900/80 rounded-2xl px-3 py-2.5 border border-indigo-700/40">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-indigo-300">
                      Effective From
                    </div>
                    <div className="text-sm font-semibold text-indigo-100 mt-0.5">
                      {formatViewDate(viewItem.effectiveDate)}
                    </div>
                  </div>

                  <div className="bg-slate-900/80 rounded-2xl px-3 py-2.5 border border-emerald-600/40">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                      Department
                    </div>
                    <div className="text-sm font-semibold text-emerald-100 mt-0.5">
                      {viewItem.department || "-"}
                    </div>
                  </div>

                  <div className="bg-slate-900/80 rounded-2xl px-3 py-2.5 border border-fuchsia-700/40">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-fuchsia-300">
                      Designation
                    </div>
                    <div className="text-sm font-semibold text-fuchsia-100 mt-0.5">
                      {viewItem.designation || "-"}
                    </div>
                  </div>

                  <div className="bg-slate-900/80 rounded-2xl px-3 py-2.5 border border-amber-500/50">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                      Location
                    </div>
                    <div className="text-sm font-semibold text-amber-100 mt-0.5">
                      {viewItem.location || "-"}
                    </div>
                  </div>
                </div>

                {viewSummary && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
                    <div className="bg-slate-900 rounded-2xl px-3 py-2.5 border border-indigo-600/60">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-indigo-300">
                        Total Earnings
                      </div>
                      <div className="text-sm font-semibold text-indigo-100 mt-0.5">
                        ₹ {viewSummary.totalEarnings.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="bg-slate-900 rounded-2xl px-3 py-2.5 border border-rose-600/60">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-rose-300">
                        Total Deductions
                      </div>
                      <div className="text-sm font-semibold text-rose-100 mt-0.5">
                        ₹ {viewSummary.totalDeductions.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="bg-slate-900 rounded-2xl px-3 py-2.5 border border-emerald-600/60">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                        Net Salary
                      </div>
                      <div className="text-sm font-semibold text-emerald-100 mt-0.5">
                        ₹ {viewSummary.netSalary.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="bg-slate-900 rounded-2xl px-3 py-2.5 border border-amber-500/70">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                        CTC
                      </div>
                      <div className="text-sm font-semibold text-amber-100 mt-0.5">
                        ₹ {viewSummary.ctc.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-slate-900/80 rounded-2xl border border-slate-800/70 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">
                        Earnings
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-indigo-300">
                        <Calculator className="w-3 h-3" />
                        Monthly
                      </div>
                    </div>
                    <div className="space-y-2.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-200">Basic / DA</span>
                        <span className="font-semibold text-indigo-100">
                          {viewItem.basicDA || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-200">HRA</span>
                        <span className="font-semibold text-indigo-100">
                          {viewItem.hra || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-200">Special Allowance</span>
                        <span className="font-semibold text-indigo-100">
                          {viewItem.specialAllowance || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-slate-700 pt-2 mt-1">
                        <span className="text-slate-100 font-semibold">
                          Gratuity
                        </span>
                        <span className="font-semibold text-emerald-300">
                          {viewItem.gratuity || "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 rounded-2xl border border-slate-800/70 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-rose-200 uppercase tracking-wide">
                        Deductions
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-rose-300">
                        <FileText className="w-3 h-3" />
                        Statutory
                      </div>
                    </div>
                    <div className="space-y-2.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-200">Employee PF</span>
                        <span className="font-semibold text-rose-100">
                          {viewSummary.employeePF.toLocaleString("en-IN") || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-200">Employer PF</span>
                        <span className="font-semibold text-indigo-100">
                          {viewSummary.employerPF.toLocaleString("en-IN") || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-200">Volunteer PF</span>
                        <span className="font-semibold text-rose-100">
                          {viewItem.volunteerPF || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-200">ESI</span>
                        <span className="font-semibold text-rose-100">
                          {viewItem.esi || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-200">Income Tax</span>
                        <span className="font-semibold text-rose-100">
                          {viewItem.tax || "0"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-200">Professional Tax</span>
                        <span className="font-semibold text-rose-100">
                          {viewItem.professionalTax || "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-[#262760] text-white">
              <div className="font-semibold text-lg flex items-center gap-2">
                <Mail size={20} />
                Send Email
              </div>
              <button onClick={() => setEmailModalOpen(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">To</label>
                <input
                  type="email"
                  value={emailData.to}
                  onChange={(e) => setEmailData({...emailData, to: e.target.value})}
                  className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="recipient@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CC</label>
                <input
                  type="text"
                  value={emailData.cc}
                  onChange={(e) => setEmailData({...emailData, cc: e.target.value})}
                  className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="cc@example.com, hr@example.com"
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                  className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message Body</label>
                <textarea
                  value={emailData.message}
                  onChange={(e) => setEmailData({...emailData, message: e.target.value})}
                  rows={6}
                  className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Enter your message here..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Note: A formatted compensation table will be automatically appended to this message.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Attachments</label>
                <div className="flex items-center gap-2 mb-2">
                  <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded border border-gray-300 flex items-center gap-2 text-sm transition-colors">
                    <Paperclip size={16} />
                    Attach Files
                    <input 
                      type="file" 
                      multiple 
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                  </label>
                  <span className="text-xs text-gray-500">Supported: PDF, Doc, Images</span>
                </div>
                
                {emailData.attachments.length > 0 && (
                  <ul className="space-y-1 bg-gray-50 p-2 rounded border border-gray-200">
                    {emailData.attachments.map((file, idx) => (
                      <li key={idx} className="flex justify-between items-center text-sm p-1 hover:bg-gray-100 rounded">
                        <div className="flex items-center gap-2 truncate">
                           <Paperclip size={14} className="text-gray-400" />
                           <span className="truncate max-w-[200px]">{file.filename}</span>
                        </div>
                        <button 
                          onClick={() => removeAttachment(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t mt-4">
                
                <button
                  onClick={handlePreviewLetter}
                  className={`px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 flex items-center gap-2 transition-all ${generatingPDF ? 'opacity-70 cursor-not-allowed' : ''}`}
                  disabled={sendingEmail || generatingPDF}
                >
                  {generatingPDF ? (
                    <>
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Eye size={16} />
                      Preview Letter
                    </>
                  )}
                </button>
               
                <button
                  onClick={() => setEmailModalOpen(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                  disabled={sendingEmail}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  className="px-4 py-2 bg-[#262760] text-white rounded hover:bg-[#1e2050] flex items-center gap-2 disabled:opacity-70"
                  disabled={sendingEmail}
                >
                  {sendingEmail ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Mail size={16} />
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden PDF Template */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        {/* Page 1: Offer Letter */}
        <div id="offer-letter-p1" className="bg-white relative mx-auto shadow-lg" style={{ width: '794px', height: '1123px', backgroundColor: 'white', fontFamily: 'Arial, sans-serif', color: 'black', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Header */}
            <LetterHeader />

          {/* Letter Pad Content Container */}
          <div className="relative z-10 flex flex-col" style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', flex: 1 }}>
            
            {/* Main Content Area */}
            <div className="px-12 py-2 flex-grow" style={{ paddingLeft: '48px', paddingRight: '48px', paddingTop: '10px', paddingBottom: '20px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '28px', marginBottom: '20px', textDecoration: 'underline', fontFamily: '"Times New Roman", Times, serif', letterSpacing: '1px' }}>OFFER LETTER</div>
              
              <div style={{ textAlign: 'right', marginBottom: '15px', fontSize: '12pt', color: '#374151' }}>
                 Date: {new Date().toLocaleDateString('en-GB')}
              </div>

              <div style={{ marginBottom: '15px', fontSize: '12pt', color: '#1f2937' }}>
                 <strong>To,</strong><br />
                 <strong>{selectedCompensation?.name}</strong><br />
              </div>

              <div style={{ marginBottom: '15px', fontSize: '12pt', fontWeight: 'bold', color: '#1f2937' }}>
                 Subject: Offer of Employment at Caldim Engineering Pvt. Ltd.
              </div>

              <div style={{ marginBottom: '15px', fontSize: '12pt', lineHeight: '1.6', color: '#374151', textAlign: 'justify' }}>
                 Dear {selectedCompensation?.name},<br /><br />
                 We are pleased to offer you employment with Caldim Engineering Private Limited for the position of <strong>{selectedCompensation?.designation}</strong>, effective from <strong>{formatDate(selectedCompensation?.effectiveDate || selectedCompensation?.dateOfJoining)}</strong>.
                 <br/><br/>
                 Your appointment will be governed by the terms and conditions outlined below and further detailed in the Annexure – Terms & Conditions of Employment.
              </div>

              <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '12pt' }}>1. Compensation Structure</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '11pt', border: '1px solid #e5e7eb' }}>
                 <thead>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                       <th style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'left', color: '#1f2937' }}>Component</th>
                       <th style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right', color: '#1f2937' }}>Monthly (₹)</th>
                    </tr>
                 </thead>
                 <tbody>
                     <tr>
                        <td style={{ border: '1px solid #d1d5db', padding: '6px' }}>Basic Salary</td>
                        <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>{Number(selectedCompensation?.basicDA || 0).toLocaleString('en-IN', {style:'currency', currency:'INR'})}</td>
                     </tr>
                     <tr>
                        <td style={{ border: '1px solid #d1d5db', padding: '6px' }}>HRA</td>
                        <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>{Number(selectedCompensation?.hra || 0).toLocaleString('en-IN', {style:'currency', currency:'INR'})}</td>
                     </tr>
                     <tr>
                        <td style={{ border: '1px solid #d1d5db', padding: '6px' }}>Special Allowance</td>
                        <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>{Number(selectedCompensation?.specialAllowance || 0).toLocaleString('en-IN', {style:'currency', currency:'INR'})}</td>
                     </tr>
                     <tr style={{backgroundColor: '#f9fafb'}}>
                        <td style={{ border: '1px solid #d1d5db', padding: '6px' }}><strong>Net Salary (Take Home)</strong></td>
                        <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}><strong>{Number(calcNetSalary).toLocaleString('en-IN', {style:'currency', currency:'INR'})}</strong></td>
                     </tr>
                     <tr>
                        <td style={{ border: '1px solid #d1d5db', padding: '6px' }}>Employee PF Contribution</td>
                        <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>{Number(calcEmployeePF).toLocaleString('en-IN', {style:'currency', currency:'INR'})}</td>
                     </tr>
                     {calcESI > 0 && (
                      <tr>
                         <td style={{ border: '1px solid #d1d5db', padding: '6px' }}>ESI Contribution</td>
                         <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>{Number(calcESI).toLocaleString('en-IN', {style:'currency', currency:'INR'})}</td>
                      </tr>
                     )}
                     {calcTax > 0 && (
                      <tr>
                         <td style={{ border: '1px solid #d1d5db', padding: '6px' }}>Income Tax</td>
                         <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>{Number(calcTax).toLocaleString('en-IN', {style:'currency', currency:'INR'})}</td>
                      </tr>
                     )}
                     {calcProfessionalTax > 0 && (
                      <tr>
                         <td style={{ border: '1px solid #d1d5db', padding: '6px' }}>Professional Tax</td>
                         <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>{Number(calcProfessionalTax).toLocaleString('en-IN', {style:'currency', currency:'INR'})}</td>
                      </tr>
                     )}
                     <tr style={{backgroundColor: '#f9fafb'}}>
                        <td style={{ border: '1px solid #d1d5db', padding: '6px' }}><strong>Total Earnings (Gross)</strong></td>
                        <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}><strong>{Number(calcTotalEarnings).toLocaleString('en-IN', {style:'currency', currency:'INR'})}</strong></td>
                     </tr>
                     <tr>
                        <td style={{ border: '1px solid #d1d5db', padding: '6px' }}>Employer PF Contribution</td>
                        <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>{Number(calcEmployerPF).toLocaleString('en-IN', {style:'currency', currency:'INR'})}</td>
                     </tr>
                     <tr>
                        <td style={{ border: '1px solid #d1d5db', padding: '6px' }}>Gratuity (Part of CTC)</td>
                        <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>{Number(calcGratuity).toLocaleString('en-IN', {style:'currency', currency:'INR'})}</td>
                     </tr>
                     <tr style={{ backgroundColor: '#eef2ff' }}>
                        <td style={{ border: '1px solid #d1d5db', padding: '6px', color: '#312e81' }}><strong>Total CTC (Cost to Company)</strong></td>
                        <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right', color: '#312e81' }}><strong>{Number(calcCTC).toLocaleString('en-IN', {style:'currency', currency:'INR'})}</strong></td>
                     </tr>
                 </tbody>
              </table>
              
              <div style={{ fontSize: '11pt', fontStyle: 'italic', marginBottom: '10px' }}>
                  Note: Statutory deductions such as PF and Professional Tax (if applicable) will be made as per prevailing laws.
              </div>

               <div style={{ marginTop: 'auto', fontSize: '11pt', fontStyle: 'italic', textAlign: 'right' }}>
                  (Continued in next page...)
              </div>

            </div>

            {/* Footer */}
            <LetterFooter />

          </div>
        </div>

        {/* Page 2: Annexure */}
        <div id="offer-letter-p2" className="bg-white relative mx-auto shadow-lg" style={{ width: '794px', height: '1123px', backgroundColor: 'white', fontFamily: 'Arial, sans-serif', color: 'black', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
           {/* Header (Same as Page 1) */}
            <LetterHeader />

          {/* Letter Pad Content Container */}
          <div className="relative z-10 flex flex-col" style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', flex: 1 }}>
            
            {/* Main Content Area */}
            <div className="px-12 py-2 flex-grow" style={{ paddingLeft: '48px', paddingRight: '48px', paddingTop: '10px', paddingBottom: '20px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              
              <div style={{ marginBottom: '15px', fontSize: '12pt' }}>
                  <strong>2. Working Hours</strong>
                  <div style={{ fontSize: '11pt', marginTop: '5px', lineHeight: '1.6' }}>
                      Employees are expected to complete a minimum of 48 hours per week across 5 working days (Monday to Friday).
                      This translates to a minimum of 9 hours 30 minutes per day (including breaks) to be eligible for full-day pay.
                      For employees on shift schedules, the mandated daily hours are 8 hours 30 minutes.
                  </div>
              </div>

              <div style={{ marginBottom: '15px', fontSize: '12pt' }}>
                  <strong>3. Place of Work</strong>
                  <div style={{ fontSize: '11pt', marginTop: '5px', lineHeight: '1.6' }}>
                  Your initial place of work will be <strong>{selectedCompensation?.location || '[Location]'}</strong>. You may be transferred to any other department, branch, or client site as required by the Company.
                  </div>
              </div>

               <div style={{ marginBottom: '15px', fontSize: '12pt' }}>
                  <strong>4. Probation and Confirmation</strong>
                  <div style={{ fontSize: '11pt', marginTop: '5px', lineHeight: '1.6' }}>
                      For employees with prior experience in the relevant field, the probation period shall be six (6) months from the date of joining. For trainees or freshers, the training period shall be one (1) year from the date of joining.
During the probation or training period, either party may terminate the employment by giving seven (7) days’ written notice or salary in lieu thereof. Upon successful completion of the probation or training period,
confirmation of employment will be communicated in writing.

                  </div>
              </div>

              <div style={{ marginBottom: '15px', fontSize: '12pt' }}>
                  <strong>5. Notice Period</strong>
                  <div style={{ fontSize: '11pt', marginTop: '5px', lineHeight: '1.6' }}>
                      During probation, either party may terminate the employment with 15 days' notice. After confirmation, the notice period will be 2 months.
                  </div>
              </div>

              <div style={{ marginBottom: '15px', fontSize: '12pt' }}>
                  <strong>6. Employment Terms</strong>
                  <div style={{ fontSize: '11pt', marginTop: '5px', lineHeight: '1.6' }}>
                      Your employment is subject to the rules and regulations of the Company as applicable from time to time. You will be required to sign a Non-Disclosure Agreement (NDA) and other standard employment documents.
                  </div>
              </div>

              <div style={{ marginTop: '30px' }}>
                <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>For Caldim Engineering Pvt Ltd</div>
                
                <div style={{ marginTop: '10px', height: '60px', display: 'flex', alignItems: 'flex-end' }}>
                  <img 
                    src={getAbsoluteSignatureUrl(selectedCompensation?.location)} 
                    alt="Authorized Signature" 
                    style={{ maxHeight: '60px' }} 
                    crossOrigin="anonymous" 
                  />

                </div>

                <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>Authorized Signatory</div>
              </div>

              <div style={{ marginTop: '30px', fontSize: '11pt' }}>
                  <strong>Acknowledgement & Acceptance:</strong><br/>
                  I, <strong>{selectedCompensation?.name}</strong>, accept the offer of employment on the terms and conditions mentioned above and in the Annexure.<br/><br/>
                  Signature: ___________________________ Date: _______________________________
              </div>
              
               <div style={{ marginTop: 'auto', marginBottom: '20px', fontSize: '11pt', fontStyle: 'italic', textAlign: 'right' }}>
                  (Encl: Annexure - Terms & Conditions)
              </div>

            </div>

            {/* Footer */}
            <LetterFooter />

          </div>
        </div>

        {/* Page 3: Annexure */}
        <div id="offer-letter-p3" className="bg-white relative mx-auto shadow-lg" style={{ width: '794px', height: '1123px', backgroundColor: 'white', fontFamily: 'Arial, sans-serif', color: 'black', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
           {/* Header (Same as Page 1) */}
            <LetterHeader />

          {/* Letter Pad Content Container */}
          <div className="relative z-10 flex flex-col" style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', flex: 1 }}>
            
            {/* Main Content Area */}
            <div className="px-12 py-2 flex-grow" style={{ paddingLeft: '48px', paddingRight: '48px', paddingTop: '10px', paddingBottom: '20px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              
               <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px', marginBottom: '20px', marginTop: '10px', textDecoration: 'underline' }}>
                    ANNEXURE<br/>TERMS & CONDITIONS OF EMPLOYMENT
                </div>
                
                <div style={{ marginBottom: '15px', fontSize: '11pt' }}>
                    <strong>1. Provident Fund (PF)</strong>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '5px', marginBottom: '0px', lineHeight: '1.6' }}>
                        <li>Employees contribute 12% of basic salary towards PF as per statutory norms.</li>
                        <li>The Company contributes an equal 12% towards PF.</li>
                        <li>PF balances will be settled as per PF rules upon separation.</li>
                    </ul>
                </div>

                <div style={{ marginBottom: '15px', fontSize: '11pt' }}>
                    <strong>2. Gratuity</strong>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '5px', marginBottom: '0px', lineHeight: '1.6' }}>
                        <li>Payable under the Payment of Gratuity Act, As per Indian Government norms</li>
                        <li>Formula: Gratuity = Basic × No. of Years × (15/26)</li>
                    </ul>
                </div>
                
                <div style={{ marginBottom: '15px', fontSize: '11pt' }}>
                    <strong>3. Leave Policy</strong>
                    <div style={{ paddingLeft: '10px', marginTop: '5px' }}>
                        <strong>Applicability:</strong>
                        <ul style={{ listStyleType: 'circle', paddingLeft: '20px', marginTop: '5px', marginBottom: '10px', lineHeight: '1.6' }}>
                            <li>Experienced Employees: Leave benefits apply post-probation.</li>
                            <li>Trainees: 1 day leave/month during training. On confirmation, regular leave norms apply.</li>
                        </ul>
                        <strong>Entitlements:</strong>
                        <ul style={{ listStyleType: 'circle', paddingLeft: '20px', marginTop: '5px', marginBottom: '10px', lineHeight: '1.6' }}>
                            <li>Casual Leave (CL): 0.5 day/month</li>
                            <li>Sick Leave (SL): 0.5 day/month (medical proof for extended absence)</li>
                            <li>Privilege/Earned Leave (PL/EL): 15 days/year. accumulable for up to 2 years - Encashment Formula: (Basic Salary / Total Days in Month) × Available PL</li>
                            <li>Bereavement Leave: 2 days paid leave for loss of immediate family</li>
                            <li>Sandwich Leave: Leaves adjoining holidays will be treated as continuous</li>
                        </ul>
                        <strong>Holidays</strong>
                        <ul style={{ listStyleType: 'circle', paddingLeft: '20px', marginTop: '5px', marginBottom: '0px', lineHeight: '1.6' }}>
                            <li>Declared holidays will be issued annually.</li>
                            <li>Saturdays and Sundays are holidays.</li>
                            <li>Employees working on holidays receive additional payment (not compensatory off), subject to 9-hour completion including breaks</li>
                        </ul>
                    </div>
                </div>

                <div style={{ marginBottom: '15px', fontSize: '11pt' }}>
                    <strong>4. Monthly Permission</strong>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '5px', marginBottom: '0px', lineHeight: '1.6' }}>
                        <li>3 permissions/month, maximum of 1 hour each.</li>
                        <li>Even shorter durations count as one permission.</li>
                    </ul>
                </div>
                
                <div style={{ marginBottom: '15px', fontSize: '11pt' }}>
                    <strong>5. Bonus</strong>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '5px', marginBottom: '0px', lineHeight: '1.6' }}>
                        <li>Pro-rata bonus applicable during the first year.</li>
                        <li>Standard annual bonus of ₹7,500 after one year of continuous service.</li>
                    </ul>
                </div>

               <div style={{ marginTop: 'auto', fontSize: '11pt', fontStyle: 'italic', textAlign: 'right' }}>
                  (Continued in next page...)
              </div>

            </div>

            {/* Footer */}
            <LetterFooter />

          </div>
        </div>

        {/* Page 4: Annexure Continued */}
        <div id="offer-letter-p4" className="bg-white relative mx-auto shadow-lg" style={{ width: '794px', height: '1123px', backgroundColor: 'white', fontFamily: 'Arial, sans-serif', color: 'black', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
           {/* Header (Same as Page 1) */}
            <LetterHeader />

          {/* Letter Pad Content Container */}
          <div className="relative z-10 flex flex-col" style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', flex: 1 }}>
            
            {/* Main Content Area */}
            <div className="px-12 py-2 flex-grow" style={{ paddingLeft: '48px', paddingRight: '48px', paddingTop: '10px', paddingBottom: '20px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>

                <div style={{ marginBottom: '15px', fontSize: '11pt' }}>
                    <strong>6. Health Insurance</strong>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '5px', marginBottom: '0px', lineHeight: '1.6' }}>
                        <li>Coverage of ₹1,00,000 upon joining; ₹2,00,000 after 1 year.</li>
                        <li>Covers employee, spouse, and children only.</li>
                        <li>Governed by IRDAI guidelines.</li>
                    </ul>
                </div>
                
                <div style={{ marginBottom: '15px', fontSize: '11pt' }}>
                    <strong>7. General</strong>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '5px', marginBottom: '0px', lineHeight: '1.6' }}>
                        <li>Employee must comply with all Company policies and HR guidelines.</li>
                        <li>The Company reserves the right to modify or withdraw any policy or benefit as required by law or management decision.</li>
                    </ul>
                </div>

                <div style={{ marginBottom: '15px', fontSize: '11pt' }}>
                    <strong>8. Service Commitment (Bond)</strong>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '5px', marginBottom: '0px', lineHeight: '1.6' }}>
                        <li>The Employee undertakes to serve the Company for a minimum period of 18 months from the date of joining.</li>
                        <li>If the Employee voluntarily resigns or is terminated for cause before completion of 18 months, the Employee agrees to pay the Company a penalty of ₹50,000 (Rupees Fifty Thousand only) as per Company policy.</li>
                        <li>This penalty covers training, onboarding, and other investments made by the Company.</li>
                    </ul>
                </div>
                
                <div style={{ marginTop: '30px', fontSize: '11pt' }}>
                  <strong>Employee Declaration:</strong><br/>
                  I have read and understood the terms stated in this Annexure and agree to abide by them during my employment with Caldim Engineering Pvt. Ltd.<br/><br/>
                  Signature: ___________________________ Name: ______________________________ Date: _______________________________
                </div>

            </div>

            {/* Footer */}
            <LetterFooter />

          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this compensation? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Dialog (Success/Error/Info) */}
      {showMessageDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className={`text-lg font-semibold mb-4 ${
              messageDialogConfig.type === 'success' ? 'text-green-600' :
              messageDialogConfig.type === 'error' ? 'text-red-600' :
              messageDialogConfig.type === 'warning' ? 'text-yellow-600' :
              'text-blue-600'
            }`}>
              {messageDialogConfig.title}
            </h3>
            <p className="text-gray-600 mb-6 whitespace-pre-line">
              {messageDialogConfig.message}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowMessageDialog(false)}
                className={`px-4 py-2 text-white rounded transition-colors ${
                  messageDialogConfig.type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                  messageDialogConfig.type === 'error' ? 'bg-red-600 hover:bg-red-700' :
                  messageDialogConfig.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompensationMaster;
