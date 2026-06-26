// src/pages/salaryslips/SalarySlips.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { monthlyPayrollAPI, employeeAPI, payrollAPI } from '../../services/api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const SalarySlips = () => {
  const navigate = useNavigate();
  const [financialYear, setFinancialYear] = useState('');
  const [month, setMonth] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [uanNumber, setUanNumber] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [payslipData, setPayslipData] = useState(null);
  const [showPayslip, setShowPayslip] = useState(false);
  const [availableYears, setAvailableYears] = useState([]);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    // Initial zoom for mobile
    const initZoom = () => {
      if (window.innerWidth < 850) {
        const scale = (window.innerWidth - 40) / 810;
        setZoomLevel(Math.max(0.4, scale));
      } else {
        setZoomLevel(1);
      }
    };
    initZoom();
    window.addEventListener('resize', initZoom);
    return () => window.removeEventListener('resize', initZoom);
  }, []);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getFinancialYear = (year, month) => {
    // month is 1-indexed (1 for Jan, 4 for April)
    if (month >= 4) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  };

  useEffect(() => {
    const init = async () => {
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      if (!user?.id) {
        navigate('/login');
        return;
      }
      let empId = user.employeeId || user.username || user.id;
      try {
        const me = await employeeAPI.getMyProfile();
        if (me?.data) {
          empId = me.data.employeeId || empId;
          setEmployeeId(empId);
          setPanNumber(me.data.pan || '');
          setUanNumber(me.data.uan || '');
          setJoiningDate(me.data.dateOfJoining || me.data.dateofjoin || '');
        } else {
          setEmployeeId(empId);
        }
      } catch (err) {
        setEmployeeId(empId);
      }

      try {
        const historyResponse = await monthlyPayrollAPI.getEmployeeHistory(empId);
        const history = Array.isArray(historyResponse?.data) ? historyResponse.data : (Array.isArray(historyResponse) ? historyResponse : []);
        setPayrollHistory(history);
      } catch (err) {
        console.error("Failed to fetch payroll history:", err);
      }
    };
    init();
  }, [navigate]);

  useEffect(() => {
    const years = new Set();
    
    // Add years from payroll history
    if (payrollHistory && payrollHistory.length > 0) {
      payrollHistory.forEach(record => {
        if (record?.salaryMonth && typeof record.salaryMonth === 'string') {
          const parts = record.salaryMonth.split('-');
          if (parts.length >= 2) {
            const y = parseInt(parts[0]);
            const m = parseInt(parts[1]);
            if (!isNaN(y) && !isNaN(m)) {
              years.add(getFinancialYear(y, m));
            }
          }
        }
      });
    }

    // Always include 2025-2026 and 2026-2027 as per request
    years.add('2025-2026');
    years.add('2026-2027');

    const sortedYears = Array.from(years).sort().reverse();
    setAvailableYears(sortedYears);
    
    // Auto-select most recent year if none selected
    if (sortedYears.length > 0 && !financialYear) {
      const now = new Date();
      const currentFY = getFinancialYear(now.getFullYear(), now.getMonth() + 1);
      if (sortedYears.includes(currentFY)) {
        setFinancialYear(currentFY);
      } else {
        setFinancialYear(sortedYears[0]);
      }
    }
  }, [payrollHistory]);

  const fetchPayslip = async (selectedMonth) => {
    if (!financialYear || !selectedMonth) return;

    // Calculate if payslip should be available
    const yearStart = parseInt(financialYear.split('-')[0]);
    const monthMap = {
      January: 1, February: 2, March: 3, April: 4,
      May: 5, June: 6, July: 7, August: 8,
      September: 9, October: 10, November: 11, December: 12
    };

    const selectedMonthNum = monthMap[selectedMonth];
    const selectedYear = selectedMonthNum >= 4 ? yearStart : yearStart + 1;
    const selectedDate = new Date(selectedYear, selectedMonthNum - 1, 1);
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Check if selected month is in the future
    if (selectedDate > currentMonthStart) {
      alert("Payslip for this month is not available yet.");
      return;
    }

    const formattedMonth = `${selectedYear}-${String(selectedMonthNum).padStart(2, '0')}`;

    setIsLoading(true);

    try {
      const response = await monthlyPayrollAPI.list({ month: formattedMonth });
      const records = Array.isArray(response?.data) ? response.data : [];
      const rec = records.find(r => String(r.employeeId).toLowerCase() === String(employeeId).toLowerCase());

      if (!rec) {
        alert('Payslip not found for the selected period');
        setIsLoading(false);
        return;
      }

      // Calculate actual days in the month
      const daysInMonth = new Date(selectedYear, selectedMonthNum, 0).getDate();
      const workingDays = daysInMonth;

      const lopDays = Number(rec.lopDays || 0);
      const paidDays = Math.max(0, workingDays - lopDays);
      const paidDate = rec.paymentDate || `${selectedYear}-${String(selectedMonthNum).padStart(2, '0')}-28`;
      const mapped = {
        employeeId: rec.employeeId,
        employeeName: rec.employeeName,
        designation: rec.designation || '',
        department: rec.department || '',
        panNumber: panNumber || 'N/A',
        uanNumber: uanNumber || 'N/A',
        joiningDate: joiningDate || 'N/A',
        month: selectedMonth,
        year: selectedYear,
        financialYear,
        basicSalary: Number(rec.basicDA || 0),
        hra: Number(rec.hra || 0),
        specialAllowance: Number(rec.specialAllowance || 0),
        totalEarnings: Number(rec.totalEarnings || 0),
        pfDeduction: Number(rec.pf || 0),
        professionalTax: Number(rec.professionalTax || 0),
        tds: Number(rec.tax || 0),
        esi: Number(rec.esi || 0),
        lopDeduction: Number(rec.lop || 0),
        loanDeduction: Number(rec.loanDeduction || 0),
        gratuity: Number(rec.gratuity || 0),
        volunteerPF: Number(rec.volunteerPF || 0),
        otherDeductions: 0,
        totalDeductions: Number(rec.totalDeductions || 0),
        netSalary: Number(rec.netSalary || 0),
        bankName: rec.bankName || '',
        accountNumber: rec.accountNumber || '',
        ifscCode: rec.ifscCode || '',
        workingDays,
        paidDays,
        leaveDays: lopDays,
        paidDate,
        monthYear: formattedMonth
      };
      setPayslipData(mapped);
      setShowPayslip(true);
    } catch (error) {
      alert('Failed to load payslip. Please try again.');
      showMockPayslip(selectedMonth, selectedYear, formattedMonth, selectedMonthNum);
    } finally {
      setIsLoading(false);
    }
  };

  const showMockPayslip = (selectedMonth, selectedYear, formattedMonth, selectedMonthNum) => {
    const mockData = {
      employeeId,
      employeeName: "John Doe",
      designation: "Software Engineer",
      department: "IT",
      panNumber: panNumber || 'N/A',
      uanNumber: uanNumber || 'N/A',
      joiningDate: joiningDate || 'N/A',
      month: selectedMonth,
      year: selectedYear,
      financialYear: financialYear,
      basicSalary: 50000,
      hra: 20000,
      specialAllowance: 15000,
      totalEarnings: 85000,
      pfDeduction: 1800,
      professionalTax: 200,
      tds: 5000,
      loanDeduction: 1000,
      otherDeductions: 0,
      totalDeductions: 8000,
      netSalary: 77000,
      bankName: "ABC Bank",
      accountNumber: "XXXXXX7890",
      ifscCode: "ABC1234567",
      workingDays: 22,
      paidDays: 21,
      leaveDays: 1,
      paidDate: `${selectedYear}-${String(selectedMonthNum).padStart(2, '0')}-28`,
      monthYear: formattedMonth
    };

    setPayslipData(mockData);
    setShowPayslip(true);
  };

  useEffect(() => {
    if (payslipData) {
      setPayslipData(prev => ({
        ...prev,
        panNumber: panNumber || prev?.panNumber || 'N/A',
        uanNumber: uanNumber || prev?.uanNumber || 'N/A',
        joiningDate: joiningDate || prev?.joiningDate || 'N/A',
      }));
    }
  }, [panNumber, uanNumber, joiningDate]);

  useEffect(() => {
    if (financialYear) {
      const [startYearStr, endYearStr] = financialYear.split('-');
      const startYear = parseInt(startYearStr);
      const endYear = parseInt(endYearStr);
      
      const fyMonthConfig = [
        { name: 'April', year: startYear, num: 4 },
        { name: 'May', year: startYear, num: 5 },
        { name: 'June', year: startYear, num: 6 },
        { name: 'July', year: startYear, num: 7 },
        { name: 'August', year: startYear, num: 8 },
        { name: 'September', year: startYear, num: 9 },
        { name: 'October', year: startYear, num: 10 },
        { name: 'November', year: startYear, num: 11 },
        { name: 'December', year: startYear, num: 12 },
        { name: 'January', year: endYear, num: 1 },
        { name: 'February', year: endYear, num: 2 },
        { name: 'March', year: endYear, num: 3 },
      ];

      // Get months that HAVE payroll records for this financial year
      const monthsWithData = new Set();
      if (payrollHistory && payrollHistory.length > 0) {
        payrollHistory.forEach(record => {
          if (record?.salaryMonth && typeof record.salaryMonth === 'string') {
            const parts = record.salaryMonth.split('-');
            if (parts.length >= 2) {
              const y = parseInt(parts[0]);
              const m = parseInt(parts[1]);
              if (!isNaN(y) && !isNaN(m)) {
                if (getFinancialYear(y, m) === financialYear) {
                  monthsWithData.add(monthNames[m - 1]);
                }
              }
            }
          }
        });
      }

      const months = [];
      fyMonthConfig.forEach(m => {
        // Only show if it has data in history
        if (monthsWithData.has(m.name)) {
          months.push(m.name);
        }
      });

      setAvailableMonths(months);
    } else {
      setAvailableMonths([]);
    }
    setMonth(''); // Reset month when FY changes
  }, [financialYear, payrollHistory]);

  const handleMonthChange = (selectedMonth) => {
    setMonth(selectedMonth);
    if (financialYear && selectedMonth) {
      fetchPayslip(selectedMonth);
    }
  };

  const handleGoHome = () => {
    navigate('/home');
  };

  const handleBackToSelection = () => {
    setShowPayslip(false);
    setPayslipData(null);
  };

  const handlePrint = () => {
    // Add print class to body to hide non-print elements
    document.body.classList.add('printing');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing');
      }, 100);
    }, 100);
  };

  const handleDownloadPDF = async () => {
    if (!payslipData) return;
    setIsLoading(true);
    const element = document.getElementById('payslip-content');
    if (!element) {
      setIsLoading(false);
      return;
    }

    try {
      // Use fixed windowWidth/windowHeight and explicit onclone styles to prevent mobile layout clipping
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 794,
        height: 1120,
        windowWidth: 794,
        windowHeight: 1120,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('payslip-content');
          if (clonedElement) {
            // Reset mobile zoom scale and force standard desktop width/height
            clonedElement.style.transform = 'none';
            clonedElement.style.margin = '0';
            clonedElement.style.boxShadow = 'none';
            clonedElement.style.width = '794px';
            clonedElement.style.minWidth = '794px';
            clonedElement.style.height = '1120px';
            clonedElement.style.minHeight = '1120px';

            // Ensure body and html inside the cloned frame do not constrain the layout
            clonedDoc.body.style.width = '794px';
            clonedDoc.body.style.minWidth = '794px';
            clonedDoc.body.style.padding = '0';
            clonedDoc.body.style.margin = '0';
            clonedDoc.body.style.overflow = 'visible';

            // Configure immediate parent
            const parent = clonedElement.parentElement;
            if (parent) {
              parent.style.width = '794px';
              parent.style.minWidth = '794px';
              parent.style.transform = 'none';
              parent.style.padding = '0';
              parent.style.margin = '0';
              parent.style.overflow = 'visible';
            }
          }
        }
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, 297); // 297mm is standard A4 height
      pdf.save(`payslip_${employeeId}_${payslipData.monthYear}.pdf`);
    } catch (error) {
      console.error("PDF Export failed:", error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/login');
  };

  // Helper function to convert number to words
  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred ' + numberToWords(num % 100);
    if (num < 100000) {
      const thousands = Math.floor(num / 1000);
      const remainder = num % 1000;
      return numberToWords(thousands) + ' Thousand' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
    }
    if (num < 10000000) {
      const lakhs = Math.floor(num / 100000);
      const remainder = num % 100000;
      return numberToWords(lakhs) + ' Lakh' + (remainder !== 0 ? ' ' + numberToWords(remainder) : '');
    }
    return 'Amount too large';
  };

  // Payslip Component with New Template Styling
  const PayslipViewer = ({ data }) => (
    <div className="bg-white relative min-h-[1120px] w-[794px] mx-auto shadow-lg print:shadow-none print:w-full print:min-h-0 font-sans" id="payslip-content">
      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body.printing * {
            visibility: hidden;
          }
          
          body.printing #payslip-content,
          body.printing #payslip-content * {
            visibility: visible;
          }
          
          body.printing #payslip-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            box-shadow: none;
            border: none;
            background: white;
          }
          
          /* Hide non-print elements */
          header, button, .no-print, .md\\:hidden, .md\\:inline-flex, .md\\:inline-block {
            display: none !important;
          }
        }
      `}</style>

      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
        <img
          src="/images/steel-logo.png"
          alt="Watermark"
          className="w-[500px] opacity-[0.05] grayscale"
        />
      </div>

      <div className="relative z-10 flex flex-col h-full justify-between min-h-[1120px] print:min-h-0">
        {/* Header */}
        <div className="w-full h-32 relative overflow-hidden flex bg-white" style={{ width: '100%', height: '128px', position: 'relative', overflow: 'hidden', display: 'flex' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
            <svg width="100%" height="100%" viewBox="0 0 794 128" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
              <path d="M0,0 L526,0 L456,128 L0,128 Z" fill="#1e2b58" />
              <path d="M526,0 L556,0 L486,128 L456,128 Z" fill="#f37021" />
            </svg>
          </div>
          <div className="relative z-10 w-full h-full" style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%' }}>
            {/* Left: Logo and Title */}
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

        {/* Content Body */}
        <div className="px-12 mb-2 py-6 flex-grow">

          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center justify-center bg-[#f0f7ff] py-1.5 px-10 rounded-full border border-blue-100 shadow-sm min-w-[500px]">
              <p className="text-gray-700 font-medium">
                Payslip for the period of: <span className="font-bold text-[#1e2b58] text-xl ml-3 tracking-wide">{data.month} {data.year}</span>
              </p>
            </div>
          </div>

          {/* Employee Details & Bank Details */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-[#1e2b58]">
              <h3 className="text-[#1e2b58] font-bold text-lg mb-4 border-b pb-2 border-gray-200">Employee Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex"><span className="w-32 text-gray-500 font-medium">Employee ID:</span> <span className="font-bold text-gray-800">{data.employeeId}</span></div>
                <div className="flex"><span className="w-32 text-gray-500 font-medium">Name:</span> <span className="font-bold text-gray-800">{data.employeeName}</span></div>
                <div className="flex"><span className="w-32 text-gray-500 font-medium">Designation:</span> <span className="font-bold text-gray-800">{data.designation}</span></div>
                {/* <div className="flex"><span className="w-32 text-gray-500 font-medium">Department:</span> <span className="font-bold text-gray-800">{data.department}</span></div> */}
                <div className="flex"><span className="w-32 text-gray-500 font-medium">PAN Number:</span> <span className="font-bold text-gray-800">{data.panNumber}</span></div>
                <div className="flex"><span className="w-32 text-gray-500 font-medium">UAN:</span> <span className="font-bold text-gray-800">{data.uanNumber}</span></div>
                <div className="flex"><span className="w-32 text-gray-500 font-medium">Date of Joining:</span> <span className="font-bold text-gray-800">{data.joiningDate ? new Date(data.joiningDate).toLocaleDateString('en-GB') : 'N/A'}</span></div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-[#f37021]">
              <h3 className="text-[#1e2b58] font-bold text-lg mb-4 border-b pb-2 border-gray-200">Bank Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex"><span className="w-32 text-gray-500 font-medium">Bank Name:</span> <span className="font-bold text-gray-800">{data.bankName}</span></div>
                <div className="flex"><span className="w-32 text-gray-500 font-medium">Account No:</span> <span className="font-bold text-gray-800">{data.accountNumber}</span></div>
                <div className="flex"><span className="w-32 text-gray-500 font-medium">IFSC Code:</span> <span className="font-bold text-gray-800">{data.ifscCode}</span></div>
                <div className="flex"><span className="w-32 text-gray-500 font-medium">Payment Date:</span> <span className="font-bold text-gray-800">{data.paidDate}</span></div>
                {/* <div className="flex"><span className="w-32 text-gray-500 font-medium">Paid Days:</span> <span className="font-bold text-gray-800">{data.paidDays}</span></div> */}
                {/* <div className="flex"><span className="w-32 text-gray-500 font-medium">LOP Days:</span> <span className="font-bold text-gray-800">{data.leaveDays}</span></div> */}
              </div>
            </div>
          </div>

          {/* Salary Table */}
          <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-2 bg-[#1e2b58] text-white text-center font-bold py-2">
              <div>EARNINGS</div>
              <div>DEDUCTIONS</div>
            </div>
            <div className="grid grid-cols-2">
              {/* Earnings Column */}
              <div className="border-r border-gray-200">
                <div className="p-4 space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Basic Salary</span> <span className="font-bold text-gray-800">{data.basicSalary.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">HRA</span> <span className="font-bold text-gray-800">{data.hra.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Special Allowance</span> <span className="font-bold text-gray-800">{data.specialAllowance.toLocaleString('en-IN')}</span></div>

                  <div className="pt-4 mt-4 border-t border-gray-200 flex justify-between font-bold text-[#1e2b58] text-lg">
                    <span>Total Earnings</span>
                    <span>₹{data.totalEarnings.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Deductions Column */}
              <div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Provident Fund</span> <span className="font-bold text-gray-800">{data.pfDeduction.toLocaleString('en-IN')}</span></div>
                  {data.volunteerPF > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Volunteer PF</span> <span className="font-bold text-gray-800">{data.volunteerPF.toLocaleString('en-IN')}</span></div>}
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Professional Tax</span> <span className="font-bold text-gray-800">{data.professionalTax.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">TDS</span> <span className="font-bold text-gray-800">{data.tds.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">ESI</span> <span className="font-bold text-gray-800">{data.esi.toLocaleString('en-IN')}</span></div>
                  {data.lopDeduction > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Loss of Pay</span> <span className="font-bold text-gray-800">{data.lopDeduction.toLocaleString('en-IN')}</span></div>}
                  {(data.loanDeduction > 0) && (
                    <>
                      {data.loanDeduction > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Loan</span> <span className="font-bold text-gray-800">{data.loanDeduction.toLocaleString('en-IN')}</span></div>}
                    </>
                  )}

                  <div className="pt-4 mt-4 border-t border-gray-200 flex justify-between font-bold text-red-600 text-lg">
                    <span>Total Deductions</span>
                    <span>₹{data.totalDeductions.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Net Salary */}
          <div className="bg-[#1e2b58] text-white p-6 rounded-lg shadow-md mb-8">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-300 text-sm mb-1 uppercase tracking-wider">Net Salary Payable</p>
                <p className="text-2xl font-bold">₹{data.netSalary.toLocaleString('en-IN')}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-300 text-xs mb-1">Amount in words</p>
                <p className="font-medium text-lg italic">{numberToWords(data.netSalary)} Rupees Only</p>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-500 mt-8">This is a computer-generated document and does not require a signature.</p>
        </div>

        {/* Footer */}
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
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className={showPayslip ? "sticky top-0 z-50 bg-gray-50/90 backdrop-blur border-b border-gray-200 print:hidden" : "print:hidden"}>
        {showPayslip && (
          <div className="max-w-[1100px] mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
            <button
              onClick={handleBackToSelection}
              className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-800 rounded-md font-medium transition-colors border border-gray-300 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 md:mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L4.414 9H18a1 1 0 110 2H4.414l3.293 3.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              <span className="text-xs md:text-sm">Back</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 md:mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span className="text-xs md:text-sm">Download PDF</span>
            </button>
          </div>
        )}
      </header>

      <div className="w-full px-3 sm:px-4 py-6 sm:py-8 print:py-0 print:px-0 print:w-full">

        {!showPayslip ? (
          <div className="flex flex-col lg:flex-row gap-6 print:hidden">
            {/* Controls Panel */}
            <div className="lg:w-80 w-full bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <div className="flex items-center mb-6 border-b pb-3">
                <div className="bg-[#262760] p-2 rounded-lg mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-800">Select Pay Period</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label htmlFor="finYear" className="block text-sm font-medium text-gray-700 mb-2">
                    Financial Year:
                  </label>
                  <select
                    id="finYear"
                    value={financialYear}
                    onChange={(e) => setFinancialYear(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    disabled={isLoading}
                  >
                    <option value="">-- Select Financial Year --</option>
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-2">
                    Month:
                  </label>
                  <select
                    id="month"
                    value={month}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    disabled={isLoading || !financialYear}
                  >
                    <option value="">-- Select Month --</option>
                    {availableMonths.map((monthName) => (
                      <option key={monthName} value={monthName}>
                        {monthName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <h3 className="font-medium text-blue-800">Instructions</h3>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      Select financial year first
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      Then select month to view payslip
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      Payslips are available after month-end processing
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      Current/future months will show as unavailable
                    </li>
                  </ul>
                </div>

                {/* <button
                  onClick={() => navigate('/salaryslips/pf-gratuity')}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-[#262760] text-white rounded-lg hover:bg-[#1e2b58] transition-colors shadow-md font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  View PF & Gratuity
                </button> */}
              </div>
            </div>

            {/* Right Panel */}
            <div className="flex-1">
              <div className="bg-white rounded-xl shadow-md p-6 h-full border border-gray-200">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-96">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-[#262760] mb-6"></div>
                      <p className="text-xl font-semibold text-[#262760] mb-2">
                        Loading Payslip...
                      </p>
                      <p className="text-gray-600">
                        Fetching your salary details for {month} {financialYear}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                    <div className="text-center px-4">
                      <div className="text-6xl mb-6">💰</div>
                      <h3 className="text-2xl font-medium mb-3 text-gray-700">CALDIM Salary Slips Portal</h3>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <div className="text-blue-600 font-bold mb-2 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            Secure
                          </div>
                          <p className="text-sm text-gray-600">Encrypted and secure access to your payslips</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <div className="text-green-600 font-bold mb-2 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            Historical
                          </div>
                          <p className="text-sm text-gray-600">Access payslips from previous years</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <div className="text-purple-600 font-bold mb-2 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Download
                          </div>
                          <p className="text-sm text-gray-600">Print or download PDF copies</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : payslipData ? (
          <>
            {/* Mobile Controls (Zoom + Download) */}
            <div className="md:hidden flex flex-col items-center gap-3 fixed bottom-6 left-0 right-0 z-50 px-4">
              <button
                onClick={handleDownloadPDF}
                className="w-full max-w-[200px] flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-full shadow-lg font-bold transition-all active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Download PDF
              </button>

              <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-full p-1 flex items-center border border-gray-200">
                <button
                  onClick={() => setZoomLevel(prev => Math.max(0.4, prev - 0.1))}
                  className="w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-100 rounded-full"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className="px-3 font-bold text-gray-800 min-w-[60px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel(prev => Math.min(1.5, prev + 0.1))}
                  className="w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-100 rounded-full"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="w-full overflow-x-auto scrollbar-hide pb-20 md:pb-0">
              <div
                className="mx-auto origin-top transition-transform duration-200 ease-out"
                style={{
                  width: '794px',
                  transform: `scale(${zoomLevel})`,
                  marginBottom: zoomLevel < 1 ? `-${(1 - zoomLevel) * 1120}px` : '0px'
                }}
              >
                <PayslipViewer data={payslipData} />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default SalarySlips;
