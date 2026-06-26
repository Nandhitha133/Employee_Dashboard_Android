import React, { useEffect, useState } from "react";
import { internAPI, mailAPI } from "../../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { getAbsoluteSignatureUrl } from '../../utils/signatureUtils';
import {
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CalendarDaysIcon,
  UserCircleIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  PlusIcon,
  UserIcon,
  BriefcaseIcon,
  PhoneIcon,
  EnvelopeIcon,
  ArrowDownTrayIcon,
  BuildingLibraryIcon,
  PaperAirplaneIcon,
  CurrencyDollarIcon
} from "@heroicons/react/24/outline";
import { Popconfirm } from "antd";
import { EyeIcon } from "lucide-react";

const InternReference = () => {
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const [showModal, setShowModal] = useState(false);
  const [viewIntern, setViewIntern] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedIntern, setSelectedIntern] = useState(null);

  const [form, setForm] = useState({
    fullName: "",
    collegeName: "",
    degree: "",
    department: "",
    internshipType: "Internship",
    mentor: "",
    referenceNote: "",
    startDate: "",
    endDate: "",
    status: "Completed",
    contactEmail: "",
    contactPhone: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    stipendAmount: "",
    workLocation: "Chennai"
  });

  const [errors, setErrors] = useState({});

  // Email Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({
    to: "",
    cc: "",
    subject: "",
    message: "",
    attachments: []
  });
  const [sendingEmail, setSendingEmail] = useState(false);

  const headerSvg = "data:image/svg+xml;charset=utf-8,%3Csvg width='1000' height='128' viewBox='0 0 1000 128' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'%3E%3Cpath d='M0,0 L600,0 L530,128 L0,128 Z' fill='%231e2b58' /%3E%3Cpath d='M600,0 L630,0 L560,128 L530,128 Z' fill='%23f37021' /%3E%3C/svg%3E";

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
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '64px', backgroundColor: '#1e2b58', transform: 'skew(-20deg)', transformOrigin: 'top left', marginLeft: '-32px' }}
        ></div>
        <div className="text-sm font-medium tracking-wide" style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '0.025em' }}>Website : www.caldimengg.com</div>
        <div className="text-sm font-medium tracking-wide mt-1" style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '0.025em', marginTop: '4px' }}>CIN U74999TN2016PTC110683</div>
      </div>
    </div>
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const diffDuration = (start, end) => {
    if (!start || !end) return "";
    const s = new Date(start);
    const e = new Date(end);
    const ms = e - s;
    const days = Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
    return `${days} days`;
  };

  const generateHTML = (message, intern) => {
    const safe = (v) => v || '';
    const content = (message || '')
      .replace(/\n/g, '<br/>');
    return `
      <div style="font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 20px;">
        <div style="max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
          <div style="background-color: #262760; color: white; padding: 16px 24px; display: flex; align-items: center; gap: 12px;">
            <div style="font-weight: 700; font-size: 16px;">CALDIM Engineering Private Limited</div>
          </div>
          <div style="padding: 24px; color: #111827;">
            <div style="margin-bottom: 16px;">${content}</div>
            <div style="margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 12px; color: #374151; font-size: 14px;">
              <div style="font-weight: 600; margin-bottom: 8px;">Internship Details</div>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; width: 40%;">Candidate</td>
                  <td style="padding: 6px 0; font-weight: 600;">${safe(intern?.fullName)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Department</td>
                  <td style="padding: 6px 0; font-weight: 600;">${safe(intern?.department)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Internship Type</td>
                  <td style="padding: 6px 0; font-weight: 600;">${safe(intern?.internshipType)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Mentor</td>
                  <td style="padding: 6px 0; font-weight: 600;">${safe(intern?.mentor)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Duration</td>
                  <td style="padding: 6px 0; font-weight: 600;">${diffDuration(intern?.startDate, intern?.endDate)}</td>
                </tr>
              </table>
            </div>
          </div>
          <div style="padding: 12px; font-size: 12px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb;">
            This is a system generated email.
          </div>
        </div>
      </div>
    `;
  };

  // Show notification
  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await internAPI.getAll();

      // Handle different response formats
      let internsData = [];

      if (Array.isArray(response.data)) {
        internsData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        internsData = response.data.data;
      } else if (Array.isArray(response)) {
        internsData = response;
      } else if (response && response.data && typeof response.data === 'object') {
        internsData = [response.data];
      }

      setInterns(internsData);
    } catch (error) {
      console.error('Error loading interns:', error);
      showNotification("Failed to load intern data", "error");
      setInterns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const validateForm = () => {
    const newErrors = {};

    if (!form.fullName.trim()) newErrors.fullName = "Full Name is required";
    if (!form.collegeName.trim()) newErrors.collegeName = "College Name is required";
    if (!form.degree.trim()) newErrors.degree = "Degree is required";
    if (!form.department.trim()) newErrors.department = "Department is required";
    if (!form.mentor.trim()) newErrors.mentor = "Mentor is required";
    if (!form.bankName.trim()) newErrors.bankName = "Bank Name is required";

    if (!form.accountNumber.trim()) {
      newErrors.accountNumber = "Account Number is required";
    } else if (!/^\d+$/.test(form.accountNumber)) {
      newErrors.accountNumber = "Account Number must contain only digits";
    }

    if (!form.ifscCode.trim()) newErrors.ifscCode = "IFSC Code is required";

    if (!form.contactEmail.trim()) {
      newErrors.contactEmail = "Contact Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
      newErrors.contactEmail = "Invalid email format";
    }

    if (!form.contactPhone.trim()) {
      newErrors.contactPhone = "Contact Phone is required";
    } else if (!/^\d{10}$/.test(form.contactPhone)) {
      newErrors.contactPhone = "Phone must be 10 digits";
    }

    // Validate stipend amount if provided
    if (form.stipendAmount && !/^\d+(\.\d{1,2})?$/.test(form.stipendAmount)) {
      newErrors.stipendAmount = "Please enter a valid amount (e.g., 5000 or 5000.00)";
    }
    if (!form.division) {
      newErrors.division = "Division is required";
    }
    if (!form.internId) {
      newErrors.internId = "Intern ID is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showNotification("Please fix the errors in the form", "error");
      return;
    }

    try {
      const internData = {
        ...form,
        startDate: form.startDate || new Date().toISOString().split('T')[0],
        endDate: form.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        // Convert stipend amount to number if it exists
        stipendAmount: form.stipendAmount ? parseFloat(form.stipendAmount) : null
      };

      if (editingId) {
        await internAPI.update(editingId, internData);
        showNotification("Intern details updated successfully!");
      } else {
        await internAPI.create(internData);
        showNotification("Intern added successfully!");
      }

      loadData();
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving intern:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to save intern details";
      showNotification(errorMessage, "error");
    }
  };

  const handleEdit = (intern) => {
    setEditingId(intern._id || intern.id);
    setForm({
      fullName: intern.fullName || "",
      collegeName: intern.collegeName || "",
      degree: intern.degree || "",
      department: intern.department || "",
      internshipType: intern.internshipType || "Internship",
      mentor: intern.mentor || "",
      referenceNote: intern.referenceNote || "",
      startDate: intern.startDate ? new Date(intern.startDate).toISOString().split('T')[0] : "",
      endDate: intern.endDate ? new Date(intern.endDate).toISOString().split('T')[0] : "",
      status: intern.status || "Completed",
      contactEmail: intern.contactEmail || "",
      contactPhone: intern.contactPhone || "",
      bankName: intern.bankName || "",
      accountNumber: intern.accountNumber || "",
      ifscCode: intern.ifscCode || "",
      stipendAmount: intern.stipendAmount || "",
      workLocation: intern.workLocation || "Chennai",
      division: intern.division || "SDS",
      internId: intern.internId || ""
    });
    setShowModal(true);
  };

  const handleDelete = async (id, name) => {
    // Confirmation is now handled by Popconfirm UI
    try {
      await internAPI.remove(id);
      showNotification("Intern deleted successfully!");
      loadData();
    } catch (error) {
      console.error('Error deleting intern:', error);
      showNotification("Failed to delete intern", "error");
    }
  };

  const handleView = (intern) => {
    setViewIntern(intern);
    setShowViewModal(true);
  };

  const handleOpenEmailModal = (intern) => {
    setSelectedIntern(intern);
    const mailTemplate = `Dear {{Candidate_Name}},

We are pleased to offer you an opportunity to join CALDIM as an Intern in the {{Department_Name}} department.

Your internship with CALDIM Engineering Private Limited will commence on {{Start_Date}} and will continue until {{End_Date}}, unless extended or terminated earlier in accordance with the company policies.`;

    const replace = (tpl, data) =>
      tpl
        .replace(/{{Candidate_Name}}/g, data.fullName || "")
        .replace(/{{Department_Name}}/g, data.department || "")
        .replace(/{{Start_Date}}/g, formatDate(data.startDate))
        .replace(/{{End_Date}}/g, formatDate(data.endDate));

    setEmailData({
      to: intern.contactEmail || "",
      cc: "",
      subject: "Internship Offer at CALDIM",
      message: replace(mailTemplate, intern),
      attachments: []
    });
    setShowEmailModal(true);
  };

  const handleSendEmail = async () => {
    if (!emailData.to) {
      showNotification("Please enter a recipient email", "error");
      return;
    }
    if (!emailData.subject) {
      showNotification("Please enter a subject", "error");
      return;
    }
    if (!emailData.message) {
      showNotification("Please enter a message", "error");
      return;
    }

    try {
      setSendingEmail(true);
      const htmlContent = generateHTML(emailData.message, selectedIntern);
      await mailAPI.send({
        email: emailData.to,
        cc: emailData.cc,
        subject: emailData.subject,
        message: emailData.message,
        html: htmlContent,
        attachments: emailData.attachments
      });
      showNotification("Email sent successfully!");
      setShowEmailModal(false);
    } catch (error) {
      console.error("Error sending email:", error);
      showNotification("Failed to send email", "error");
    } finally {
      setSendingEmail(false);
    }
  };

  const handlePreviewLetter = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const pages = ['intern-offer-letter-p1', 'intern-offer-letter-p2'];
      const pdf = new jsPDF('p', 'mm', 'a4');
      let pageAdded = false;
      for (let i = 0; i < pages.length; i++) {
        const element = document.getElementById(pages[i]);
        if (!element) continue;
        if (pageAdded) pdf.addPage();
        const canvas = await html2canvas(element, { scale: 1.5, useCORS: true, logging: false, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
        pageAdded = true;
      }
      const pdfBlob = pdf.output('bloburl');
      window.open(pdfBlob, '_blank');
    } catch (error) {
      showNotification("Failed to generate preview", "error");
    }
  };

  const attachInternOfferLetter = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const pages = ['intern-offer-letter-p1', 'intern-offer-letter-p2'];
      const pdf = new jsPDF('p', 'mm', 'a4');
      let pageAdded = false;
      for (let i = 0; i < pages.length; i++) {
        const element = document.getElementById(pages[i]);
        if (!element) continue;
        if (pageAdded) pdf.addPage();
        const canvas = await html2canvas(element, { scale: 1.5, useCORS: true, logging: false, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
        pageAdded = true;
      }
      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      const filenameSafe = (selectedIntern?.fullName || 'Intern').replace(/\s+/g, '_');
      const newAttachment = {
        filename: `Internship_Offer_${filenameSafe}.pdf`,
        content: pdfBase64,
        encoding: 'base64'
      };
      setEmailData((prev) => ({ ...prev, attachments: [newAttachment] }));
    } catch {
      showNotification("Failed to attach offer letter", "error");
    }
  };

  useEffect(() => {
    if (showEmailModal && selectedIntern) {
      attachInternOfferLetter();
    }
  }, [showEmailModal, selectedIntern]);

  const resetForm = () => {
    setForm({
      fullName: "",
      collegeName: "",
      degree: "",
      department: "",
      internshipType: "Internship",
      mentor: "",
      referenceNote: "",
      startDate: "",
      endDate: "",
      status: "Completed",
      contactEmail: "",
      contactPhone: "",
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      stipendAmount: "",
      workLocation: "Chennai"
    });
    setEditingId(null);
    setErrors({});
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  // Ensure interns is always an array before filtering
  const safeInterns = Array.isArray(interns) ? interns : [];

  const filteredInterns = safeInterns.filter(intern => {
    if (!intern) return false;

    const matchesSearch =
      (intern.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (intern.collegeName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (intern.department?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (intern.mentor?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesFilter = filterType === "all" || intern.internshipType === filterType;
    const matchesStatus = filterStatus === "all" || intern.status === filterStatus;

    return matchesSearch && matchesFilter && matchesStatus;
  });

  const handleDownloadPDF = () => {
    if (filteredInterns.length === 0) {
      showNotification("No records available to download", "error");
      return;
    }
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text("Intern Reference List", 14, 20);

    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

    const tableColumn = ["S.No", "Full Name", "Degree", "Internship Type", "Company Mentor", "Contact No", "Stipend (₹)", "Status"];
    const tableRows = [];

    filteredInterns.forEach((intern, index) => {
      const internData = [
        index + 1,
        intern.fullName || "N/A",
        intern.degree || "N/A",
        intern.internshipType || "N/A",
        intern.mentor || "N/A",
        intern.contactPhone || "N/A",
        intern.stipendAmount ? `₹${intern.stipendAmount}` : "N/A",
        intern.status || "N/A"
      ];
      tableRows.push(internData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      headStyles: { fillColor: [38, 39, 96] }, // Sidebar Color (#262760)
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 15 }, // S.No
        // Adjust other widths if necessary, autoTable does a decent job usually
      }
    });

    doc.save("intern_reference_list.pdf");
  };

  // Notification component
  const Notification = () => {
    if (!notification.show) return null;

    const bgColor = notification.type === "error" ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200";
    const textColor = notification.type === "error" ? "text-red-800" : "text-green-800";
    const iconColor = notification.type === "error" ? "text-red-500" : "text-green-500";
    const Icon = notification.type === "error" ? ExclamationCircleIcon : InformationCircleIcon;

    return (
      <div className={`fixed top-4 right-4 z-50 border rounded-lg p-4 ${bgColor} shadow-lg flex items-center gap-3 max-w-md animate-fade-in`}>
        <Icon className={`h-6 w-6 ${iconColor}`} />
        <p className={`font-medium ${textColor}`}>{notification.message}</p>
        <button
          onClick={() => setNotification({ show: false, message: "", type: "" })}
          className="ml-auto text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Notification Component */}
      <Notification />

      {/* Header with Add Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur opacity-20"></div>

            </div>

          </div>

        </div>


      </div>

      {/* Debug info (remove in production) */}
      <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-gray-600 hidden">
        <div className="flex items-center gap-2">
          <InformationCircleIcon className="h-4 w-4 text-yellow-600" />
          <span>Loaded {safeInterns.length} interns</span>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-[#262760] px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AcademicCapIcon className="h-8 w-8 text-white" />
                    <h3 className="text-xl font-bold text-white">
                      {editingId ? "Edit Intern Details" : "Add New Intern"}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-white hover:text-blue-100 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-6 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Personal Information */}
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                      <h4 className="flex items-center gap-2 text-blue-800 font-semibold mb-4">
                        <UserIcon className="h-5 w-5" />
                        Personal Information
                      </h4>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Full Name *
                          </label>
                          <input
                            placeholder="Enter full name"
                            className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${errors.fullName ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                            value={form.fullName}
                            onChange={e => {
                              setForm({ ...form, fullName: e.target.value });
                              if (errors.fullName) setErrors({ ...errors, fullName: null });
                            }}
                          />
                          {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            College Name *
                          </label>
                          <input
                            placeholder="Enter college name"
                            className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${errors.collegeName ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                            value={form.collegeName}
                            onChange={e => {
                              setForm({ ...form, collegeName: e.target.value });
                              if (errors.collegeName) setErrors({ ...errors, collegeName: null });
                            }}
                          />
                          {errors.collegeName && <p className="text-red-500 text-sm mt-1">{errors.collegeName}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Degree *
                          </label>
                          <input
                            placeholder="e.g., B.Tech, B.Sc, MCA"
                            className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${errors.degree ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                            value={form.degree}
                            onChange={e => {
                              setForm({ ...form, degree: e.target.value });
                              if (errors.degree) setErrors({ ...errors, degree: null });
                            }}
                          />
                          {errors.degree && <p className="text-red-500 text-sm mt-1">{errors.degree}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Department *
                          </label>
                          <input
                            placeholder="e.g., Computer Science, Mechanical"
                            className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${errors.department ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                            value={form.department}
                            onChange={e => {
                              setForm({ ...form, department: e.target.value });
                              if (errors.department) setErrors({ ...errors, department: null });
                            }}
                          />
                          {errors.department && <p className="text-red-500 text-sm mt-1">{errors.department}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                      <h4 className="flex items-center gap-2 text-purple-800 font-semibold mb-4">
                        <PhoneIcon className="h-5 w-5" />
                        Contact Information
                      </h4>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Contact Email *
                          </label>
                          <div className="relative">
                            <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              type="email"
                              placeholder="student@college.edu"
                              className={`w-full border rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all ${errors.contactEmail ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                              value={form.contactEmail}
                              onChange={e => {
                                setForm({ ...form, contactEmail: e.target.value });
                                if (errors.contactEmail) setErrors({ ...errors, contactEmail: null });
                              }}
                            />
                          </div>
                          {errors.contactEmail && <p className="text-red-500 text-sm mt-1">{errors.contactEmail}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Contact Phone * <span className="text-gray-500 text-xs">(Max 10 digits)</span>
                          </label>
                          <div className="relative">
                            <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              type="tel"
                              placeholder="10-digit mobile number"
                              maxLength={10}
                              className={`w-full border rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all ${errors.contactPhone ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                              value={form.contactPhone}
                              onChange={e => {
                                const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                                setForm({ ...form, contactPhone: value });
                                if (errors.contactPhone) setErrors({ ...errors, contactPhone: null });
                              }}
                            />
                          </div>
                          <p className="text-xs text-gray-500">{form.contactPhone.length}/10 digits</p>
                          {errors.contactPhone && <p className="text-red-500 text-sm mt-1">{errors.contactPhone}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Reference Notes */}
                    <div className="bg-pink-50 p-4 rounded-xl border border-pink-200">
                      <h4 className="flex items-center gap-2 text-pink-800 font-semibold mb-4">
                        <DocumentTextIcon className="h-5 w-5" />
                        Reference Notes / Remarks
                      </h4>

                      <textarea
                        placeholder="Enter any notes, feedback, or remarks about the intern..."
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all min-h-[120px] resize-y"
                        value={form.referenceNote}
                        onChange={e => setForm({ ...form, referenceNote: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Internship Details */}
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                      <h4 className="flex items-center gap-2 text-indigo-800 font-semibold mb-4">
                        <BriefcaseIcon className="h-5 w-5" />
                        Internship Details
                      </h4>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Division
                          </label>
                          <select
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                            value={form.division}
                            onChange={e => setForm({ ...form, division: e.target.value })}
                          >
                            <option value="SDS">SDS</option>
                            <option value="TEKLA">TEKLA</option>
                            <option value="DAS (Software)">DAS (Software)</option>
                          </select>
                          {errors.division && <p className="text-red-500 text-sm mt-1">{errors.division}</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Intern ID
                          </label>
                          <div className="flex gap-2">
                            <input
                              placeholder="Auto-generated (e.g., DASINT001)"
                              className={`flex-1 border rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${errors.internId ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                              value={form.internId}
                              onChange={e => setForm({ ...form, internId: e.target.value })}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const code = (form.division || '').toLowerCase().includes('das') ? 'DAS' :
                                             (form.division || '').toLowerCase().includes('tekla') ? 'TEKLA' : 'SDS';
                                const prefix = `${code}INT`;
                                const nums = safeInterns
                                  .map(i => i?.internId || "")
                                  .filter(id => typeof id === "string" && id.startsWith(prefix))
                                  .map(id => {
                                    const m = id.match(/(\d+)$/);
                                    return m ? parseInt(m[1], 10) : 0;
                                  });
                                const next = Math.max(0, ...nums) + 1;
                                const newId = `${prefix}${String(next).padStart(3, "0")}`;
                                setForm(prev => ({ ...prev, internId: newId }));
                                if (errors.internId) setErrors({ ...errors, internId: null });
                              }}
                              className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                            >
                              Generate
                            </button>
                          </div>
                          {errors.internId && <p className="text-red-500 text-sm mt-1">{errors.internId}</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Internship Type
                          </label>
                          <select
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                            value={form.internshipType}
                            onChange={e => setForm({ ...form, internshipType: e.target.value })}
                          >
                            <option value="Internship">Internship</option>
                            <option value="Inplant Training">Inplant Training</option>
                            <option value="Project Internship">Project Internship</option>
                            <option value="Summer Internship">Summer Internship</option>
                            <option value="Winter Internship">Winter Internship</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Company Mentor *
                          </label>
                          <input
                            placeholder="Enter mentor name"
                            className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${errors.mentor ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                            value={form.mentor}
                            onChange={e => {
                              setForm({ ...form, mentor: e.target.value });
                              if (errors.mentor) setErrors({ ...errors, mentor: null });
                            }}
                          />
                          {errors.mentor && <p className="text-red-500 text-sm mt-1">{errors.mentor}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Stipend Amount (₹)
                          </label>
                          <div className="relative">
                           
                            <input
                              type="text"
                              placeholder="Enter stipend amount (e.g., 5000)"
                              className={`w-full border rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${errors.stipendAmount ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                              value={form.stipendAmount}
                              onChange={e => {
                                const value = e.target.value.replace(/[^0-9.]/g, '');
                                setForm({ ...form, stipendAmount: value });
                                if (errors.stipendAmount) setErrors({ ...errors, stipendAmount: null });
                              }}
                            />
                          </div>
                          {errors.stipendAmount && <p className="text-red-500 text-sm mt-1">{errors.stipendAmount}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Status
                          </label>
                          <select
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                            value={form.status}
                            onChange={e => setForm({ ...form, status: e.target.value })}
                          >
                            <option value="Completed">Completed</option>
                            <option value="Ongoing">Ongoing</option>
                            <option value="Terminated">Terminated</option>
                          </select>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Location
                          </label>
                          <select
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                            value={form.workLocation}
                            onChange={e => setForm({ ...form, workLocation: e.target.value })}
                          >
                            <option value="Hosur">Hosur</option>
                            <option value="Chennai">Chennai</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Duration & Dates */}
                    <div className="bg-cyan-50 p-4 rounded-xl border border-cyan-200">
                      <h4 className="flex items-center gap-2 text-cyan-800 font-semibold mb-4">
                        <CalendarDaysIcon className="h-5 w-5" />
                        Duration & Dates
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Start Date *
                          </label>
                          <input
                            type="date"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                            value={form.startDate}
                            onChange={e => setForm({ ...form, startDate: e.target.value })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            End Date *
                          </label>
                          <input
                            type="date"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                            value={form.endDate}
                            min={form.startDate}
                            onChange={e => setForm({ ...form, endDate: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bank Details */}
                    <div className="bg-teal-50 p-4 rounded-xl border border-teal-200">
                      <h4 className="flex items-center gap-2 text-teal-800 font-semibold mb-4">
                        <BuildingLibraryIcon className="h-5 w-5" />
                        Bank Details
                      </h4>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Bank Name * <span className="text-gray-500 text-xs">(Max 25 characters)</span>
                          </label>
                          <input
                            placeholder="e.g. HDFC Bank"
                            maxLength={25}
                            className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all ${errors.bankName ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                            value={form.bankName}
                            onChange={e => {
                              const value = e.target.value.slice(0, 25);
                              setForm({ ...form, bankName: value });
                              if (errors.bankName) setErrors({ ...errors, bankName: null });
                            }}
                          />
                          <p className="text-xs text-gray-500">{form.bankName.length}/25 characters</p>
                          {errors.bankName && <p className="text-red-500 text-sm mt-1">{errors.bankName}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Account Number * <span className="text-gray-500 text-xs">(Max 18 digits)</span>
                          </label>
                          <input
                            placeholder="Enter account number"
                            maxLength={18}
                            className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all ${errors.accountNumber ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                            value={form.accountNumber}
                            onChange={e => {
                              const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 18);
                              setForm({ ...form, accountNumber: value });
                              if (errors.accountNumber) setErrors({ ...errors, accountNumber: null });
                            }}
                          />
                          <p className="text-xs text-gray-500">{form.accountNumber.length}/18 digits</p>
                          {errors.accountNumber && <p className="text-red-500 text-sm mt-1">{errors.accountNumber}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            IFSC Code * <span className="text-gray-500 text-xs">(Max 11 characters)</span>
                          </label>
                          <input
                            placeholder="Enter IFSC code"
                            maxLength={11}
                            className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all uppercase ${errors.ifscCode ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'}`}
                            value={form.ifscCode}
                            onChange={e => {
                              const value = e.target.value.toUpperCase().slice(0, 11);
                              setForm({ ...form, ifscCode: value });
                              if (errors.ifscCode) setErrors({ ...errors, ifscCode: null });
                            }}
                          />
                          <p className="text-xs text-gray-500">{form.ifscCode.length}/11 characters</p>
                          {errors.ifscCode && <p className="text-red-500 text-sm mt-1">{errors.ifscCode}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-end mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex items-center gap-2 bg-[#262760] hover:bg-[#1e2050] text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <CheckCircleIcon className="h-5 w-5" />
                    {editingId ? "Update Intern" : "Save Intern"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewIntern && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75 backdrop-blur-sm"
              onClick={() => setShowViewModal(false)}
            />
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-[#262760] px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserCircleIcon className="h-8 w-8 text-white" />
                    <h3 className="text-xl font-bold text-white">
                      Intern Details Summary
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-white hover:text-teal-100 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>
              <div className="px-8 py-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Identity</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Full Name</p>
                        <p className="font-semibold text-gray-900">{viewIntern.fullName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Degree</p>
                        <p className="font-semibold text-gray-900">{viewIntern.degree || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Department</p>
                        <p className="font-semibold text-gray-900">{viewIntern.department || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">College Name</p>
                        <p className="font-semibold text-gray-900">{viewIntern.collegeName || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="text-sm font-bold text-blue-500 uppercase tracking-wider mb-3">Internship Info</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-blue-500">Type</p>
                        <p className="font-semibold text-gray-900">{viewIntern.internshipType || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-500">Mentor</p>
                        <p className="font-semibold text-gray-900">{viewIntern.mentor || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-500">Stipend Amount</p>
                        <p className="font-semibold text-gray-900">{viewIntern.stipendAmount ? `₹${viewIntern.stipendAmount}` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-500">Duration</p>
                        <p className="font-semibold text-gray-900">
                          {viewIntern.startDate ? new Date(viewIntern.startDate).toLocaleDateString() : 'N/A'} - {viewIntern.endDate ? new Date(viewIntern.endDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-500">Status</p>
                        <span className={`text-xs px-2 py-1 rounded-full inline-block font-medium mt-1 ${viewIntern.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          viewIntern.status === 'Ongoing' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                          {viewIntern.status || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <h4 className="text-sm font-bold text-purple-500 uppercase tracking-wider mb-3">Contact</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-purple-500">Email</p>
                        <p className="font-semibold text-gray-900 break-all">{viewIntern.contactEmail || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-purple-500">Phone</p>
                        <p className="font-semibold text-gray-900">{viewIntern.contactPhone || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-teal-50 p-4 rounded-lg border border-teal-100">
                    <h4 className="text-sm font-bold text-teal-500 uppercase tracking-wider mb-3">Bank Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-teal-500">Bank Name</p>
                        <p className="font-semibold text-gray-900">{viewIntern.bankName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-teal-500">Account No</p>
                        <p className="font-semibold text-gray-900">{viewIntern.accountNumber || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-teal-500">IFSC Code</p>
                        <p className="font-semibold text-gray-900">{viewIntern.ifscCode || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {viewIntern.referenceNote && (
                    <div className="bg-pink-50 p-4 rounded-lg border border-pink-100">
                      <h4 className="text-sm font-bold text-pink-500 uppercase tracking-wider mb-3">Remarks</h4>
                      <p className="text-gray-900 bg-white p-3 rounded border border-pink-100 text-sm">
                        {viewIntern.referenceNote}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75 backdrop-blur-sm"
              onClick={() => setShowEmailModal(false)}
            />
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full">
              <div className="bg-[#262760] px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <EnvelopeIcon className="h-8 w-8 text-white" />
                    <h3 className="text-xl font-bold text-white">
                      Send Internship Offer
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="text-white hover:text-blue-100 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To
                    </label>
                    <input
                      type="email"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={emailData.to}
                      onChange={e => setEmailData({ ...emailData, to: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CC
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={emailData.cc}
                      onChange={e => setEmailData({ ...emailData, cc: e.target.value })}
                      placeholder="Optional, comma-separated"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={emailData.subject}
                      onChange={e => setEmailData({ ...emailData, subject: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none min-h-[200px]"
                      value={emailData.message}
                      onChange={e => setEmailData({ ...emailData, message: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Note: The internship offer letter PDF is auto-attached.
                    </p>
                  </div>
                  {emailData.attachments.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Attachments
                      </label>
                      <ul className="space-y-1 bg-gray-50 p-2 rounded border border-gray-200">
                        {emailData.attachments.map((file, idx) => (
                          <li key={idx} className="flex justify-between items-center text-sm p-1 hover:bg-gray-100 rounded">
                            <div className="flex items-center gap-2 truncate">
                              <span className="truncate max-w-[200px]">{file.filename}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={handlePreviewLetter}
                    className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
                  >
                    Preview Letter
                  </button>
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendEmail}
                    disabled={sendingEmail}
                    className="flex items-center gap-2 px-6 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1e2050] transition-colors disabled:opacity-50"
                  >
                    {sendingEmail ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="h-4 w-4" />
                        Send Email
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-md p-2 mb-2 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, college, department, or mentor..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <select
              className="border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="Internship">Internship</option>
              <option value="Inplant Training">Inplant Training</option>
              <option value="Project Internship">Project Internship</option>
            </select>

            <select
              className="border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="Completed">Completed</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Terminated">Terminated</option>
            </select>

            {(searchTerm || filterType !== 'all' || filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterType("all");
                  setFilterStatus("all");
                }}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg font-medium transition-colors duration-200"
              >
                <XMarkIcon className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-medium transition-all duration-200"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              Download PDF
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 bg-[#262760] hover:bg-[#1e2050] text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <PlusIcon className="h-5 w-5" />
              Add New Intern
            </button>
          </div>
        </div>
      </div>

      {/* Interns Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">
              Internship List ({filteredInterns.length})
            </h3>
            {loading && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Loading...</span>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading intern data...</p>
          </div>
        ) : filteredInterns.length === 0 ? (
          <div className="p-8 text-center">
            <AcademicCapIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No interns found. Add your first intern using the button above!</p>
          </div>
        ) : (
          <div className="overflow-auto max-h-[600px] border rounded-b-xl custom-scrollbar">
            <table className="w-full">
              <thead className="bg-[#262760] text-white sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap bg-[#262760]">S.No</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap bg-[#262760]">Full Name</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap bg-[#262760]">Intern ID</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap bg-[#262760]">Degree</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap bg-[#262760]">Division</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap bg-[#262760]">Location</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap bg-[#262760]">Company Mentor</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap bg-[#262760]">Stipend (₹)</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap bg-[#262760]">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap bg-[#262760]">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInterns.map((intern, index) => (
                  <tr key={intern._id || intern.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{intern.fullName || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {intern.internId || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {intern.degree || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {intern.division || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {intern.workLocation || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {intern.mentor || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {intern.stipendAmount ? `₹${intern.stipendAmount}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full inline-block font-medium ${intern.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        intern.status === 'Ongoing' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                        {intern.status || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEmailModal(intern)}
                          className="text-indigo-600 hover:text-indigo-800 transition-colors"
                          title="Send Letter"
                        >
                          <PaperAirplaneIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleView(intern)}
                          className="text-teal-600 hover:text-teal-800 transition-colors"
                          title="View Details"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleEdit(intern)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <Popconfirm
                          title="Delete Intern"
                          description={`Are you sure you want to delete ${intern.fullName}?`}
                          onConfirm={() => handleDelete(intern._id || intern.id, intern.fullName)}
                          okText="Yes"
                          cancelText="No"
                        >
                          <button
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </Popconfirm>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add CSS animation for notification */}
      <style>{`
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>


      {/* Hidden PDF Template */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        {/* Page 1: Offer Letter */}
        <div id="intern-offer-letter-p1" className="bg-white relative mx-auto" style={{ width: '794px', height: '1123px', backgroundColor: 'white', fontFamily: 'Arial, sans-serif', color: 'black', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <LetterHeader />
          <div className="relative z-10 flex flex-col" style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div className="px-12 py-6 flex-grow" style={{ paddingLeft: '60px', paddingRight: '60px', paddingTop: '40px', paddingBottom: '20px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="text-right mb-8">
                <div className="font-bold text-gray-800">Date: {formatDate(new Date())}</div>
              </div>
              <div className="mb-8">
                <div className="font-bold text-gray-800 mb-2">To:</div>
                <div className="font-bold text-lg text-gray-900">{selectedIntern?.fullName}</div>
                <div className="text-gray-700">{selectedIntern?.collegeName}</div>
                <div className="text-gray-700">{selectedIntern?.degree} - {selectedIntern?.department}</div>
              </div>
              <div className="text-center mb-10">
                <h2 className="text-2xl font-bold text-[#1e2b58] underline decoration-[#f37021] underline-offset-8">INTERNSHIP OFFER LETTER</h2>
              </div>

              <div className="space-y-6 text-justify leading-relaxed text-gray-800">
                <p>Dear <span className="font-bold text-gray-900">{selectedIntern?.fullName}</span>,</p>
                
                <p>
                  We are pleased to offer you an opportunity to join <span className="font-bold text-[#1e2b58]">CALDIM Engineering Private Limited</span> as an Intern in the <span className="font-bold text-gray-900">{selectedIntern?.department}</span> department.
                </p>

                <p>
                  Your internship will commence on <span className="font-bold text-gray-900">{formatDate(selectedIntern?.startDate)}</span> and will continue until <span className="font-bold text-gray-900">{formatDate(selectedIntern?.endDate)}</span>, unless extended or terminated earlier in accordance with the company policies.
                </p>

                <p>
                  During this period, you will be reporting to <span className="font-bold text-gray-900">{selectedIntern?.mentor}</span>. We expect you to maintain high standards of discipline and professionalism during your tenure with us.
                </p>

                <p>
                  As discussed, you will be eligible for a monthly stipend of <span className="font-bold text-gray-900">₹{selectedIntern?.stipendAmount || 'N/A'}</span>.
                </p>

                <p>
                  We look forward to a mutually beneficial association.
                </p>
              </div>

              <div className="mt-auto pt-10 flex justify-end">
                <div className="text-right">
                  <div className="font-bold text-gray-800 mb-2 font-bitsumishi">For CALDIM Engineering Private Limited</div>
                  <div className="h-20 flex items-end justify-end mb-2">
                    <img 
                      src={getAbsoluteSignatureUrl(selectedIntern?.workLocation)} 
                      alt="Signature" 
                      style={{ maxHeight: '60px' }}
                      crossOrigin="anonymous"
                    />
                  </div>
                  <div className="font-bold text-gray-900">Authorized Signatory</div>
                </div>
              </div>
            </div>
            <LetterFooter />
          </div>
        </div>

        {/* Page 2: Terms & Conditions */}
        <div id="intern-offer-letter-p2" className="bg-white relative mx-auto" style={{ width: '794px', height: '1123px', backgroundColor: 'white', fontFamily: 'Arial, sans-serif', color: 'black', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <LetterHeader />
          <div className="relative z-10 flex flex-col" style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div className="px-12 py-10 flex-grow" style={{ paddingLeft: '80px', paddingRight: '80px', paddingTop: '60px', paddingBottom: '20px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <h3 className="text-xl font-bold text-[#1e2b58] underline decoration-[#f37021] underline-offset-8 mb-8 text-center">Terms and Conditions</h3>
              <div className="space-y-6 text-[14px] text-justify text-gray-800 leading-relaxed">
                <p><span className="font-bold text-gray-900">1. Working Hours:</span> Your working hours will be as per the company's rules and regulations.</p>
                <p><span className="font-bold text-gray-900">2. Confidentiality:</span> You shall maintain absolute confidentiality of all information, documents, and data belonging to the company that you may come across during your internship.</p>
                <p><span className="font-bold text-gray-900">3. Intellectual Property:</span> Any intellectual property created by you during the internship shall belong exclusively to CALDIM Engineering Private Limited.</p>
                <p><span className="font-bold text-gray-900">4. Code of Conduct:</span> You are expected to follow the company's code of conduct and maintain professionalism at all times.</p>
                <p><span className="font-bold text-gray-900">5. Termination:</span> The company reserves the right to terminate the internship at any time without prior notice in case of breach of conduct or performance issues.</p>
              </div>
            </div>
            <LetterFooter />
          </div>
        </div>
      </div>





    </div>
  );
};

export default InternReference;
