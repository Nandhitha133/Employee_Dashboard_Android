import React, { useEffect, useState } from 'react';
import { Play, Download, Check, X, Mail, Filter, Edit } from 'lucide-react';
import { employeeAPI, leaveAPI, payrollAPI, monthlyPayrollAPI, loanAPI, mailAPI, performancePayAPI, compensationAPI } from '../../services/api';
import * as XLSX from 'xlsx';

const calculateSalaryFields = (salaryData, lopDaysInput, daysInMonth = 30) => {
  // Use the components to calculate true Gross Salary
  const basicDA = parseFloat(salaryData.basicDA) || 0;
  const hra = parseFloat(salaryData.hra) || 0;
  const specialAllowance = parseFloat(salaryData.specialAllowance) || 0;
  const performancePay = parseFloat(salaryData.performancePay) || 0;
  
  // In this org, PF is the sum of Emp + Empr contributions.
  // Volunteer PF should be handled separately as a voluntary deduction.
  const employeePF = parseFloat(salaryData.employeePfContribution) || 0;
  const employerPF = parseFloat(salaryData.employerPfContribution) || 0;
  const volunteerPF = parseFloat(salaryData.volunteerPF) || 0;
  
  // If individual fields are missing, fallback to 'pf' but subtract volunteerPF if it was summed in
  let pf = (employeePF + employerPF);
  if (pf === 0 && salaryData.pf) {
    pf = parseFloat(salaryData.pf);
    // Heuristic: if pf is exactly the sum of expected PF + volunteerPF, subtract it
    // But safer to just use it as is and assume volunteerPF is separate in the source
  }

  const stdEsi = parseFloat(salaryData.esi) || 0;
  const totalGross = basicDA + hra + specialAllowance + pf + stdEsi + performancePay;
  
  const stdTax = parseFloat(salaryData.tax) || 0;
  const stdProfessionalTax = parseFloat(salaryData.professionalTax) || 0;
  const stdLoanDeduction = parseFloat(salaryData.loanDeduction) || 0;

  // Use input if provided, otherwise check record, otherwise 0
  const lopDays = lopDaysInput !== undefined ? lopDaysInput : (parseFloat(salaryData.lopDays) || 0);

  const totalEarnings = totalGross;
  
  // Calculate LOP deduction
  const safeDaysInMonth = daysInMonth > 0 ? daysInMonth : 30;
  const perDaySalary = totalEarnings / safeDaysInMonth;
  const lopDeduction = Math.round(perDaySalary * lopDays);

  // Pro-rate standard deductions based on attendance
  const attendanceRatio = Math.max(0, (safeDaysInMonth - lopDays) / safeDaysInMonth);
  const isFullLop = attendanceRatio === 0;
  
  // Standard PF components
  const stdEmployeePF = isFullLop ? 0 : employeePF;
  const stdEmployerPF = isFullLop ? 0 : employerPF;
  const currentPF = stdEmployeePF + stdEmployerPF;
  
  const currentESI = isFullLop ? 0 : stdEsi;
  const currentTax = isFullLop ? 0 : stdTax;
  const currentPT = isFullLop ? 0 : stdProfessionalTax;
  const currentVolunteerPF = isFullLop ? 0 : volunteerPF;

  // Loan deduction cap
  const earningsAfterLop = Math.max(0, totalEarnings - lopDeduction);
  const otherDeductions = currentPF + currentESI + currentTax + currentPT + currentVolunteerPF;
  const remainingForLoan = Math.max(0, earningsAfterLop - otherDeductions);
  const loanDeduction = Math.min(stdLoanDeduction, remainingForLoan);

  const totalDeductions = currentPF + currentESI + currentTax + currentPT + loanDeduction + lopDeduction + currentVolunteerPF;
  const netSalary = totalEarnings - totalDeductions;
  
  const gratuity = parseFloat(salaryData.gratuity) || 0;
  const ctc = totalEarnings + gratuity;

  return {
    ...salaryData,
    basicDA,
    hra,
    specialAllowance,
    performancePay,
    totalEarnings,
    totalDeductions,
    netSalary,
    ctc,
    lop: lopDeduction,
    lopDays,
    daysInMonth: safeDaysInMonth, 
    pf: currentPF,
    employerPF: stdEmployerPF,
    employeePF: stdEmployeePF,
    esi: currentESI,
    tax: currentTax,
    professionalTax: currentPT,
    loanDeduction,
    volunteerPF: currentVolunteerPF
  };
};

const formatCurrency = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(num);
};

const createPayrollWorkbook = (simulation, selectedMonth) => {
  const workbook = XLSX.utils.book_new();
  
  // Calculate days in month from selectedMonth (YYYY-MM)
  const [year, month] = selectedMonth.split('-');
  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();

  // Create headers exactly as in your sample
  const headers = [
    ["SL .NO", "LOCATION", "NAME OF THE", "UAN", "BANK ACCOUNT NUMBER", "ID NUMBAR", "ACL", "WORKING DAYS", "GROSS", 
     "BASIC +DA", "HRA", "CEILING", "DEDUCTION (LOP+)", "EPS", "EPF", "ADMIN", "ESI", "VOLUNTARY", "TDS", 
     "PROFESSIONALTAX", "LOAN", "TOTAL", "ROUND OFF VALUE", "NET", "EMPLOYEE SIGNATURE"],
    ["", "", "EMPLOYEE'S", "NO", "SALARY", "", "SALARY", "", "", "BASIC", "EPF", "ESI", "8.33%", "3.67%", 
     "CHARGES", "3.25%", "CON", "DEDUC", "DEDUC", "", "DEDUC", "SALARY", "", "", ""]
  ];
  
  // Prepare data rows
  const dataRows = simulation.results.map((record, index) => {
    // Calculate Working Days & Attendance Ratio
    const actualDays = record.daysInMonth || daysInMonth;
    const workingDays = actualDays - (record.lopDays || 0);
    const attendanceRatio = actualDays > 0 ? Math.max(0, workingDays / actualDays) : 0;

    // Calculate EPF components (assuming 8.33% for EPS and 3.67% for EPF)
    const epfCeiling = 15000; // Standard EPF ceiling
    // Basic for EPF should be pro-rated based on attendance
    const basicForEPF = Math.min(record.basicDA || 0, epfCeiling);
    const earnedBasicForEPF = basicForEPF * attendanceRatio;
    
    // Use the calculated PF components from simulation/record
    // Employee PF contribution (what used to be calculated as 12% sum)
    const totalEmployeePF = record.employeePF || 0;
    
    // Split Employee PF into EPS and EPF for export if necessary, 
    // but the user's specific formula is just Employee PF = Total - 1950.
    // In many companies, the split is 8.33% and 3.67%.
    // We'll use the record's employeePF value.
    const epsDeduction = Math.round(totalEmployeePF * (8.33/12));
    const epfDeduction = totalEmployeePF - epsDeduction;
    
    // Calculate ESI (assuming 0.75% of gross)
    // ESI should be on earned gross
    const earnedGross = (record.totalEarnings || 0) * attendanceRatio;
    const esiDeduction = Math.round(earnedGross * 0.0075);
    
    // Calculate admin charges (assuming 0.5% of basic)
    const earnedBasic = (record.basicDA || 0) * attendanceRatio;
    const adminCharges = Math.round(earnedBasic * 0.005);
    
    // Calculate total deduction
    const totalDeduction = (record.totalDeductions || 0);
    
    return [
      index + 1, // SL .NO
      record.location || "HSR", // LOCATION
      record.employeeName || "", // NAME OF THE EMPLOYEE'S
      record.uan || "", // UAN NO (if available)
      record.accountNumber || "", // BANK ACCOUNT NUMBER
      record.employeeId || "", // ID NUMBAR
      0, // ACL
      workingDays, // WORKING DAYS
      record.totalEarnings || 0, // GROSS SALARY
      record.basicDA || 0, // BASIC +DA
      record.hra || 0, // HRA
      epfCeiling, // CEILING
      totalDeduction, // DEDUCTION
      epsDeduction, // EPS 8.33%
      epfDeduction, // EPF 3.67%
      adminCharges, // ADMIN CHARGES
      esiDeduction, // ESI 3.25%
      record.volunteerPF || 0, // VOLUNTARY CON
      record.tax || 0, // TDS DEDUC
      record.professionalTax || 0, // PROFESSIONALTAX DEDUC
      record.loanDeduction || 0, // LOAN DEDUC
      record.totalEarnings || 0, // TOTAL SALARY
      0, // ROUND OFF VALUE
      record.netSalary || 0, // NET
      "" // EMPLOYEE SIGNATURE
    ];
  });
  
  // Calculate totals similar to your sample
  const totals = simulation.results.reduce((acc, record, index) => {
    acc.gross += record.totalEarnings || 0;
    acc.basic += record.basicDA || 0;
    acc.hra += record.hra || 0;
    acc.net += record.netSalary || 0;
    
    const actualDays = record.daysInMonth || daysInMonth;
    const workingDays = actualDays - (record.lopDays || 0);
    acc.workingDays += workingDays;
    
    const attendanceRatio = actualDays > 0 ? Math.max(0, workingDays / actualDays) : 0;
    
    // EPF calculations
    const totalEmployeePF = record.employeePF || 0;
    const epsVal = Math.round(totalEmployeePF * (8.33/12));
    acc.eps += epsVal;
    acc.epf += (totalEmployeePF - epsVal);
    
    const earnedGross = (record.totalEarnings || 0) * attendanceRatio;
    acc.esi += Math.round(earnedGross * 0.0075);
    
    const earnedBasic = (record.basicDA || 0) * attendanceRatio;
    acc.admin += Math.round(earnedBasic * 0.005);
    
    return acc;
  }, { 
    gross: 0, 
    basic: 0, 
    hra: 0, 
    net: 0, 
    workingDays: 0,
    eps: 0,
    epf: 0,
    esi: 0,
    admin: 0
  });
  
  // Add totals row (similar to your sample)
  const totalsRow = [
    "TOTAL", 
    "", 
    "", 
    "", 
    "", 
    "", 
    "", 
    totals.workingDays, // WORKING DAYS total
    totals.gross, // GROSS total
    totals.basic, // BASIC +DA total
    totals.hra, // HRA total
    "", // CEILING
    "", // DEDUCTION
    totals.eps, // EPS total
    totals.epf, // EPF total
    totals.admin, // ADMIN total
    totals.esi, // ESI total
    "", // VOLUNTARY
    "", // TDS
    "", // PROFESSIONALTAX
    "", // LOAN
    totals.gross, // TOTAL SALARY
    0, // ROUND OFF VALUE
    totals.net, // NET total
    "" // EMPLOYEE SIGNATURE
  ];
  
  // Combine all data
  const ws_data = [...headers, ...dataRows, [], totalsRow];
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  
  // Set column widths
  const colWidths = [
    { wch: 8 },  // SL .NO
    { wch: 12 }, // LOCATION
    { wch: 25 }, // NAME
    { wch: 15 }, // UAN
    { wch: 20 }, // BANK ACCOUNT
    { wch: 15 }, // ID NUMBER
    { wch: 8 },  // ACL
    { wch: 12 }, // WORKING DAYS
    { wch: 12 }, // GROSS
    { wch: 15 }, // BASIC+DA
    { wch: 10 }, // HRA
    { wch: 10 }, // CEILING
    { wch: 12 }, // DEDUCTION
    { wch: 10 }, // EPS
    { wch: 10 }, // EPF
    { wch: 12 }, // ADMIN
    { wch: 10 }, // ESI
    { wch: 12 }, // VOLUNTARY
    { wch: 10 }, // TDS
    { wch: 18 }, // PROFESSIONAL TAX
    { wch: 10 }, // LOAN
    { wch: 12 }, // TOTAL
    { wch: 15 }, // ROUND OFF
    { wch: 12 }, // NET
    { wch: 20 }  // SIGNATURE
  ];
  ws['!cols'] = colWidths;
  
  // Add to workbook
  XLSX.utils.book_append_sheet(workbook, ws, `Payroll_${selectedMonth}`);
  
  return workbook;
};

// Function to export to Excel in the specified format
const exportToExcel = (simulation, selectedMonth) => {
  if (!simulation) return;
  const workbook = createPayrollWorkbook(simulation, selectedMonth);
  XLSX.writeFile(workbook, `Monthly_Payroll_${selectedMonth}.xlsx`);
};

export default function MonthlyPayroll() {
  const [salaryRecords, setSalaryRecords] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [employeeList, setEmployeeList] = useState([]);
  const [simulation, setSimulation] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [cfUsedInput, setCfUsedInput] = useState(0);
  const [simulatedBalances, setSimulatedBalances] = useState(new Map());
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [filterBank, setFilterBank] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterDesignation, setFilterDesignation] = useState('all');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showBankWarningModal, setShowBankWarningModal] = useState(false);
  const [missingBankEmployees, setMissingBankEmployees] = useState([]);
  const [emailTo, setEmailTo] = useState('');
  const [emailCC, setEmailCC] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, [selectedMonth]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const [empResponse, payrollResponse, loanResponse, ppResponse, compResponse] = await Promise.all([
        employeeAPI.getAllEmployees(),
        payrollAPI.list(),
        loanAPI.list(),
        performancePayAPI.getPendingPayroll().catch(() => ({ data: { data: [] } })),
        compensationAPI.getAll().catch(() => ({ data: [] }))
      ]);
      
      const allEmployees = Array.isArray(empResponse.data) ? empResponse.data : [];
      const employees = allEmployees.filter(emp => emp.status === 'Active' || emp.status === 'ACTIVE');
      const payrolls = Array.isArray(payrollResponse.data) ? payrollResponse.data : [];
      const loans = loanResponse.data && loanResponse.data.loans ? loanResponse.data.loans : [];
      const pendingPP = ppResponse.data && ppResponse.data.data ? ppResponse.data.data : [];
      const compensations = Array.isArray(compResponse.data) ? compResponse.data : [];

      // Calculate end of selected month date to find active compensations
      const [year, month] = selectedMonth.split('-');
      const monthEndDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

      const mapped = employees.map(emp => {
        // Find matching payroll record
        const payrollRec = payrolls.find(p => p.employeeId === emp.employeeId);
        
        // Find active compensation record based on the selected month's date
        const empComps = compensations.filter(c => String(c.employeeId || '').toLowerCase() === String(emp.employeeId || '').toLowerCase());
        let activeComp = null;
        if (empComps.length > 0) {
          const validComps = empComps.filter(c => {
            const effDate = new Date(c.effectiveDate);
            return !isNaN(effDate.getTime()) && effDate <= monthEndDate;
          });
          if (validComps.length > 0) {
            validComps.sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));
            activeComp = validComps[0];
          }
        }

        // Sum up pending performance pay
        const empPP = pendingPP
          .filter(p => p.employeeId === emp.employeeId)
          .reduce((sum, item) => sum + (item.performancePayAmount || 0), 0);
        
        // Calculate Loan Deduction from active loans
        const allEmpLoans = loans.filter(l => l.employeeId === emp.employeeId);
        const activeEnabledLoans = allEmpLoans.filter(l => 
          l.status === 'active' && 
          l.paymentEnabled === true
        );
        
        const calculatedLoanDeduction = activeEnabledLoans.reduce((sum, loan) => {
          if (!loan.amount || !loan.tenureMonths) return sum;
          const monthly = Math.round(loan.amount / loan.tenureMonths);
          return sum + monthly;
        }, 0);

        return {
          id: emp._id,
          employeeId: emp.employeeId,
          employeeName: emp.name,
          designation: activeComp ? activeComp.designation : (emp.designation),
          department: activeComp ? activeComp.department : (emp.department || emp.division),
          division: emp.division,
          location: activeComp ? activeComp.location : (emp.location || emp.address || emp.currentAddress || 'Unknown'),
          dateOfJoining: emp.dateOfJoining,
          
          // Use active compensation if available, else payroll record, else fallback to employee record
          totalEarnings: activeComp ? (activeComp.gross || activeComp.totalEarnings || 0) : (payrollRec ? (payrollRec.totalEarnings || 0) : (emp.totalEarnings || emp.gross || 0)),
          basicDA: activeComp ? (activeComp.basicDA || 0) : (payrollRec ? (payrollRec.basicDA || 0) : (emp.basicDA || emp.basic || 0)),
          hra: activeComp ? (activeComp.hra || 0) : (payrollRec ? (payrollRec.hra || 0) : (emp.hra || 0)),
          specialAllowance: activeComp ? (activeComp.specialAllowance || 0) : (payrollRec ? (payrollRec.specialAllowance || 0) : (emp.specialAllowance || 0)),
          performancePay: empPP,
          gratuity: activeComp ? (activeComp.gratuity || 0) : (payrollRec ? (payrollRec.gratuity || 0) : (emp.gratuity || 0)),
          
          pf: activeComp ? (activeComp.pf || 0) : (payrollRec ? (payrollRec.pf || 0) : (emp.pf || 0)),
          employeePfContribution: activeComp ? (activeComp.employeePfContribution || 0) : (payrollRec ? (payrollRec.employeePfContribution || 0) : (emp.employeePfContribution || 0)),
          employerPfContribution: activeComp ? (activeComp.employerPfContribution || 0) : (payrollRec ? (payrollRec.employerPfContribution || 0) : (emp.employerPfContribution || 0)),
          esi: activeComp ? (activeComp.esi || 0) : (payrollRec ? (payrollRec.esi || 0) : (emp.esi || 0)),
          tax: activeComp ? (activeComp.tax || 0) : (payrollRec ? (payrollRec.tax || 0) : (emp.tax || 0)),
          professionalTax: activeComp ? (activeComp.professionalTax || 0) : (payrollRec ? (payrollRec.professionalTax || 0) : (emp.professionalTax || 0)),
          volunteerPF: activeComp ? (activeComp.volunteerPF || 0) : (payrollRec ? (payrollRec.volunteerPF || 0) : (emp.volunteerPF || 0)),
          
          // Use calculated loan deduction if the employee has loans in the system, otherwise fallback to static values
          loanDeduction: allEmpLoans.length > 0 ? calculatedLoanDeduction : (payrollRec ? (payrollRec.loanDeduction || 0) : (emp.loanDeduction || 0)),
          
          lop: 0,
          status: 'Pending',
          
          uan: emp.uan || '',
          accountNumber: emp.bankAccount || payrollRec?.accountNumber || '',
          ifscCode: emp.ifsc || payrollRec?.ifscCode || '',
          bankName: emp.bankName || payrollRec?.bankName || ''
        };
      });

      // Sort by Employee ID (natural sort order)
      mapped.sort((a, b) => {
        const idA = a.employeeId || '';
        const idB = b.employeeId || '';
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
      });

      setSalaryRecords(mapped);
      setEmployeeList(allEmployees);
    } catch (e) {
      console.error('Failed to fetch employees or payrolls', e);
      setMessage('Error fetching data. Please check permissions.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectEmployee = (id) => {
    setSelectedEmployees(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedEmployees(filteredRecords.map(r => r.id));
  };

  const clearSelection = () => {
    setSelectedEmployees([]);
  };

  const runSimulation = async () => {
    if (selectedEmployees.length === 0) {
      setMessage('Select at least one employee to simulate payroll.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setProcessing(true);
    
    const [year, month] = selectedMonth.split('-');
    
    try {
      // Fetch approved leaves for the selected month
      // We only fetch leaves overlapping with the selected month to minimize data payload.
      // Use UTC dates to avoid timezone offsets shifting the date (e.g. 2026-03-01 -> 2026-02-28T18:30:00Z)
      const monthStartQuery = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1));
      const monthEnd = new Date(Date.UTC(parseInt(year), parseInt(month), 0, 23, 59, 59, 999));

      const [leavesResponse, balancesResponse] = await Promise.all([
        leaveAPI.list({
          status: 'Approved',
          startDate: monthStartQuery.toISOString(),
          endDate: monthEnd.toISOString(),
          overlap: 'true'
        }),
        leaveAPI.getBalance({ calculationDate: monthEnd.toISOString() })
      ]);
      
      const leaves = leavesResponse.data || [];
      const balancesList = Array.isArray(balancesResponse.data) ? balancesResponse.data : [];
      
      // Create a map of employee balances for quick lookup
      const balanceMap = new Map();
      balancesList.forEach(item => {
        if (item.employeeId && item.balances) {
          const empId = String(item.employeeId).trim();
          // Check if isMonthlyExpiry is at root or inside balances
          const isMonthly = item.isMonthlyExpiry !== undefined ? item.isMonthlyExpiry : item.balances.isMonthlyExpiry;
          balanceMap.set(empId, { ...item.balances, isMonthlyExpiry: isMonthly });
        }
      });
      setSimulatedBalances(balanceMap);

      const selectedRecords = salaryRecords.filter(r => selectedEmployees.includes(r.id));
      
      // Calculate days in month
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();

      const results = selectedRecords.map(rec => {
        // DOJ Calculation Logic
        let preDojDays = 0;
        let joiningDate = null;
        
        const emp = employeeList.find(e => (e.employeeId || '').toString() === (rec.employeeId || '').toString());
        const actualDoj = (emp && (emp.dateOfJoining || emp.dateofjoin || emp.hireDate)) || rec.dateOfJoining;
        
        if (actualDoj) {
            // Robust date parsing
            const parseDOJ = (d) => {
              if (!d) return null;
              const date = new Date(d);
              if (!isNaN(date.getTime())) return date;
              // Handle DD-MM-YYYY or DD/MM/YYYY
              if (typeof d === 'string') {
                const parts = d.split(/[-/]/);
                if (parts.length === 3) {
                  if (parts[2].length === 4) return new Date(parts[2], parts[1] - 1, parts[0]);
                  if (parts[0].length === 4) return new Date(parts[0], parts[1] - 1, parts[2]);
                }
              }
              return null;
            };
            joiningDate = parseDOJ(actualDoj);
            if (joiningDate) joiningDate.setHours(0,0,0,0);
            
            // Payroll Month Boundaries
            const payrollMonthStart = new Date(parseInt(year), parseInt(month) - 1, 1);
            const payrollMonthEnd = new Date(parseInt(year), parseInt(month), 0);
            
            // Only apply if DOJ is after the start of the month
            if (joiningDate > payrollMonthStart) {
                if (joiningDate > payrollMonthEnd) {
                    // Joined after this month entirely
                    preDojDays = daysInMonth;
                } else {
                    // Joined during this month
                    // Days before DOJ are unpaid
                    preDojDays = joiningDate.getDate() - 1;
                }
            }
        }

        // Get employee leaves sorted by start date
        const employeeLeaves = leaves
          .filter(l => (l.employeeId && l.employeeId === rec.employeeId))
          .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        
        // Get initial balances (Allocation)
        // Note: The balance API returns CURRENT balance (Allocated - Used).
        // We need the Allocated amount to replay.
        const empId = String(rec.employeeId || '').trim();
        const empBalances = balanceMap.get(empId);
        let clAlloc = 0, slAlloc = 0, plAlloc = 0;
        let clUsedFromBalance = 0, slUsedFromBalance = 0, plUsedFromBalance = 0;
        
        if (empBalances) {
          clAlloc = Number(empBalances.casual?.allocated || 0);
          slAlloc = Number(empBalances.sick?.allocated || 0);
          plAlloc = Number(empBalances.privilege?.allocated || 0);
          
          clUsedFromBalance = Number(empBalances.casual?.used || 0);
          slUsedFromBalance = Number(empBalances.sick?.used || 0);
          plUsedFromBalance = Number(empBalances.privilege?.used || 0);
        } else {
             console.warn(`[Payroll Simulation] No balance found for employee: ${empId}`);
        }

        // Helper to check date intersection with selected month
        const isDateInMonth = (d) => {
            const date = new Date(d);
            return date.getFullYear() === parseInt(year) && date.getMonth() === (parseInt(month) - 1);
        };

        let lopDaysInMonth = 0;
        let plLopDaysInMonth = 0;

        // Replay Logic
        // Since we only fetched leaves for the current month, we calculate 'UsedInMonth'
        // and subtract it from the Total Balance (which is YTD) to get the starting point.
        // Starting Point = Total Used (from Balance API) - Used This Month (from List)
        
        const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1);

        const calcUsedInMonth = (type) => {
             let count = 0;
             employeeLeaves
                .filter(l => (l.leaveType || '').toUpperCase().trim() === type)
                .forEach(leave => {
                    const start = new Date(leave.startDate);
                    const end = new Date(leave.endDate);
                    start.setHours(0,0,0,0);
                    end.setHours(0,0,0,0);
                    
                    let curr = new Date(start);
                    while (curr <= end) {
                        // Only count days within the selected month
                        if (isDateInMonth(curr)) {
                            // Count every day (consistent with Leave System)
                            count += (leave.dayType === 'Half Day' ? 0.5 : 1);
                        }
                        curr.setDate(curr.getDate() + 1);
                    }
                });
             return count;
        };

        const clUsedInMonth = calcUsedInMonth('CL') + calcUsedInMonth('CASUAL_LEAVE');
        const slUsedInMonth = calcUsedInMonth('SL') + calcUsedInMonth('SICK_LEAVE');
        const plUsedInMonth = calcUsedInMonth('PL') + calcUsedInMonth('PRIVILEGE_LEAVE');

        // Note: If balance API includes future leaves, this subtraction might be imperfect,
        // but it is the best we can do without fetching the full history.
        let clUsed = Math.max(0, clUsedFromBalance - clUsedInMonth);
        let slUsed = Math.max(0, slUsedFromBalance - slUsedInMonth);
        let plUsed = Math.max(0, plUsedFromBalance - plUsedInMonth);

        employeeLeaves.forEach(leave => {
            // Determine leave type category
            const type = (leave.leaveType || '').toUpperCase().trim().replace(/\s+/g, '_');
            const isExplicitLOP = ['LOP', 'LOSS_OF_PAY', 'LOSSOFPAY', 'UNPAID', 'LWOP'].some(t => type === t || type.replace(/_/g, '') === t);
            
            // Iterate day by day for this leave
            const startD = new Date(leave.startDate);
            const endD = new Date(leave.endDate);
            startD.setHours(0,0,0,0);
            endD.setHours(0,0,0,0);
            
            const currentD = new Date(startD);
            while (currentD <= endD) {
                // We only process days within the selected month because the initial balance 
                // is set to (Total - Month). Adding days outside the month would double-count them.
                if (!isDateInMonth(currentD)) {
                     currentD.setDate(currentD.getDate() + 1);
                     continue;
                }

                // If monthly expiry (Probation/Trainee), only consider leaves in the current month against the allocation
                // Leaves outside the current month should not consume the current month's allocation
                if (empBalances?.isMonthlyExpiry && !isDateInMonth(currentD)) {
                     currentD.setDate(currentD.getDate() + 1);
                     continue;
                }

                // If the day is before DOJ, ignore it (it's covered by preDojDays)
                if (joiningDate && currentD < joiningDate) {
                    currentD.setDate(currentD.getDate() + 1);
                    continue;
                }

                // Count every day (consistent with Leave System)


                // Determine day value (0.5 for Half Day, 1 for Full Day)
                let dayValue = 1;
                if (leave.dayType === 'Half Day') {
                    dayValue = 0.5;
                }

                let lopAmount = 0;

                if (isExplicitLOP) {
                    lopAmount = dayValue;
                } else {
                    // Check balance
                    if (type === 'CL' || type === 'CASUAL_LEAVE') {
                        if (clUsed + dayValue <= clAlloc) {
                            clUsed += dayValue;
                        } else if (clUsed < clAlloc) {
                            const available = clAlloc - clUsed;
                            clUsed += available;
                            lopAmount = dayValue - available;
                        } else {
                            lopAmount = dayValue;
                        }
                    } else if (type === 'SL' || type === 'SICK_LEAVE') {
                        if (slUsed + dayValue <= slAlloc) {
                            slUsed += dayValue;
                        } else if (slUsed < slAlloc) {
                            const available = slAlloc - slUsed;
                            slUsed += available;
                            lopAmount = dayValue - available;
                        } else {
                            lopAmount = dayValue;
                        }
                    } else if (type === 'PL' || type === 'PRIVILEGE_LEAVE') {
                         if (plUsed + dayValue <= plAlloc) {
                            plUsed += dayValue;
                        } else if (plUsed < plAlloc) {
                            const available = plAlloc - plUsed;
                            plUsed += available;
                            lopAmount = dayValue - available;
                        } else {
                            lopAmount = dayValue;
                        }
                    } else if (type === 'BEREAVEMENT') {
                         lopAmount = 0;
                    } else {
                        // Unknown type -> Treat as Paid (0 LOP)
                        lopAmount = 0; 
                    }
                }

                // If this day contributes to LOP and falls in the selected month, add to count
                if (lopAmount > 0 && isDateInMonth(currentD)) {
                    lopDaysInMonth += lopAmount;
                    if (type === 'PL' || type === 'PRIVILEGE_LEAVE') {
                        plLopDaysInMonth += lopAmount;
                    }
                }
                
                currentD.setDate(currentD.getDate() + 1);
            }
        });

        // Negative PL Balance Correction:
        // If the employee has a negative PL balance, this indicates excess usage that must be treated as LOP.
        // We override the simulated PL LOP with the actual negative balance if the debt is greater.
        let plBalance = 0;
        if (empBalances && empBalances.privilege) {
             plBalance = Number(empBalances.privilege.balance || 0);
        }
        
        if (plBalance < 0) {
            const totalDebt = Math.abs(plBalance);
            // If the total debt is greater than what simulation found for this month, use the total debt.
            // This covers carry-forward negative balances or simulation discrepancies.
            if (totalDebt > plLopDaysInMonth) {
                // Remove the simulated PL component and add the full debt
                lopDaysInMonth = (lopDaysInMonth - plLopDaysInMonth) + totalDebt;
            }
        }

        // Total LOP days = calculated from replay + Pre-DOJ days
        const lopDays = lopDaysInMonth + preDojDays;

        const base = calculateSalaryFields(rec, lopDays, daysInMonth);
        const adjusted = { ...base };
        
        // Include gratuity by default (calculation already includes it)
        adjusted.salaryMonth = selectedMonth;
        adjusted.paymentDate = new Date().toISOString().slice(0,10);
        adjusted.accountNumber = rec.accountNumber || '';
        adjusted.ifscCode = rec.ifscCode || '';
        adjusted.bankName = rec.bankName || 'HDFC Bank';

        // Add debug info
        adjusted.doj = rec.dateOfJoining;
        adjusted.preDojDays = preDojDays;
        
        return adjusted;
      });

      const totals = results.reduce((acc, r) => {
        acc.totalEarnings += Number(r.totalEarnings || 0);
        acc.totalDeductions += Number(r.totalDeductions || 0);
        acc.netSalary += Number(r.netSalary || 0);
        acc.ctc += Number(r.ctc || 0);
        return acc;
      }, { totalEarnings: 0, totalDeductions: 0, netSalary: 0, ctc: 0 });

      setSimulation({ results, totals });
    } catch (err) {
      console.error("Simulation failed", err);
      setMessage("Failed to run simulation: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const savePayroll = async () => {
    if (!simulation) return;
    
    setSaving(true);
    try {
      // Format payload to match backend expectation
      const payload = {
        payrolls: simulation.results
      };
      
      const response = await monthlyPayrollAPI.save(payload);
      
      setMessage(`Successfully saved ${response.data.count} payroll records to database.`);
      setShowSuccessModal(true);
      setTimeout(() => setMessage(''), 5000);
      
    } catch (error) {
      console.error('Failed to save payroll:', error);
      setMessage('Error saving payroll data: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (record) => {
    setEditingRecord(record);
    setCfUsedInput(0);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    
    // Formula: Final LOP (Month) = max( Monthly LOP - CF Used (that month), 0 )
    const originalLopDays = editingRecord.lopDays;
    const cfUsed = parseFloat(cfUsedInput) || 0;
    const newLopDays = Math.max(originalLopDays - cfUsed, 0);
    
    // Calculate days in month from selectedMonth
    const [year, month] = selectedMonth.split('-');
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();

    // Recalculate salary
    const updatedRecord = calculateSalaryFields(editingRecord, newLopDays, daysInMonth);
    
    // Update simulation
    const newResults = simulation.results.map(r => 
      r.id === editingRecord.id ? updatedRecord : r
    );
    
    const newTotals = newResults.reduce((acc, curr) => ({
      totalNetSalary: acc.totalNetSalary + curr.netSalary,
      totalDeductions: acc.totalDeductions + curr.totalDeductions,
      totalEarnings: acc.totalEarnings + curr.totalEarnings,
      totalLopDays: acc.totalLopDays + curr.lopDays,
      totalLopAmount: acc.totalLopAmount + curr.lop
    }), {
      totalNetSalary: 0,
      totalDeductions: 0,
      totalEarnings: 0,
      totalLopDays: 0,
      totalLopAmount: 0
    });
    
    setSimulation({
      ...simulation,
      results: newResults,
      totals: newTotals
    });

    // CF Balance update: CF Balance = Previous CF - CF Used (that month)
    if (cfUsed > 0) {
      try {
        const currentBalances = simulatedBalances.get(editingRecord.employeeId);
        if (currentBalances) {
            // Assuming Privilege Leave is the Carry Forward component
            const currentPL = Number(currentBalances.privilege?.balance || 0);
            const newPL = currentPL - cfUsed;
            
            const balanceUpdate = {
                casual: currentBalances.casual?.balance || 0,
                sick: currentBalances.sick?.balance || 0,
                privilege: newPL
            };
            
            await leaveAPI.saveBalance({
                employeeId: editingRecord.employeeId,
                balances: balanceUpdate
            });
            
            // Update local cache
            const newMap = new Map(simulatedBalances);
            newMap.set(editingRecord.employeeId, {
                ...currentBalances,
                privilege: { ...currentBalances.privilege, balance: newPL }
            });
            setSimulatedBalances(newMap);
            
            alert(`LOP adjusted. Privilege Leave deducted by ${cfUsed}. New Balance: ${newPL}`);
        }
      } catch (error) {
        console.error("Failed to update leave balance", error);
        alert("Failed to update leave balance in backend.");
      }
    }
    
    setEditModalOpen(false);
    setEditingRecord(null);
  };

  const handleExcelExport = () => {
    if (!simulation) return;
    exportToExcel(simulation, selectedMonth);
  };

  const handleSendPaymentClick = () => {
    if (!simulation) return;

    // Check for missing bank details
    const missingBankDetails = simulation.results.filter(r => 
      !r.accountNumber || !r.ifscCode
    );

    if (missingBankDetails.length > 0) {
      setMissingBankEmployees(missingBankDetails);
      setShowBankWarningModal(true);
      return;
    }

    setShowEmailModal(true);
  };

  const processPaymentEmail = async () => {
    if (!emailTo) {
      alert('Please enter a recipient email (To)');
      return;
    }

    setSendingEmail(true);
    setMessage('Sending email...');

    // Generate Excel attachment
    const workbook = createPayrollWorkbook(simulation, selectedMonth);
    const excelBase64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
    const attachment = {
        filename: `Monthly_Payroll_${selectedMonth}.xlsx`,
        content: excelBase64,
        encoding: 'base64'
    };

    // Calculate location-wise stats
    const locationStats = simulation.results.reduce((acc, curr) => {
        const loc = curr.location || 'Unknown';
        if (!acc[loc]) {
            acc[loc] = { count: 0, amount: 0 };
        }
        acc[loc].count++;
        acc[loc].amount += curr.netSalary;
        return acc;
    }, {});

    // Create HTML content for the email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Monthly Salary Payment Request - ${selectedMonth}</h2>
        <p>Dear Accounts Team,</p>
        <p>Please process salary payments for the following employees for <strong>${selectedMonth}</strong>.</p>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #262760;">
          <p><strong>Total Amount:</strong> ₹${formatCurrency(simulation.totals.netSalary)}</p>
          <p><strong>Total Employees:</strong> ${simulation.results.length}</p>
        </div>

        <h3>Location-wise Summary</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #262760; color: white;">
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Location</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Employee Count</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(locationStats).map(([loc, stats]) => `
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 10px; border: 1px solid #ddd;">${loc}</td>
                <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${stats.count}</td>
                <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">₹${formatCurrency(stats.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <p style="margin-top: 30px;">The detailed payroll simulation is attached to this email.</p>
        <p>Please confirm once payments are processed.</p>
        <p>Regards,<br/>Payroll Department</p>
      </div>
    `;

    const plainTextContent = `
To: ${emailTo}
CC: ${emailCC}
Subject: Monthly Salary Payment Request - ${selectedMonth}

Dear Accounts Team,

Please process salary payments for the following employees for ${selectedMonth}.

Total Amount: ₹${formatCurrency(simulation.totals.netSalary)}
Total Employees: ${simulation.results.length}

Location-wise Summary:
${Object.entries(locationStats).map(([loc, stats]) => 
  `- ${loc}: ${stats.count} employees, ₹${formatCurrency(stats.amount)}`
).join('\n')}

The detailed payroll simulation is attached to this email.

Please confirm once payments are processed.

Regards,
Payroll Department
`;

    try {
      await mailAPI.send({
        email: emailTo,
        cc: emailCC,
        subject: `Monthly Salary Payment Request - ${selectedMonth}`,
        message: plainTextContent,
        html: htmlContent,
        attachments: [attachment]
      });

      // Update status in records
      const updatedRecords = salaryRecords.map(rec => {
        const simRec = simulation.results.find(s => s.id === rec.id);
        if (simRec) {
          return { 
            ...rec, 
            ...simRec, 
            status: 'Payment Email Sent', 
            salaryMonth: simRec.salaryMonth, 
            paymentDate: simRec.paymentDate 
          };
        }
        return rec;
      });

      setSalaryRecords(updatedRecords);
      
      try {
        localStorage.setItem('payrollRecords', JSON.stringify(updatedRecords));
      } catch (e) {
        console.warn('Failed to write payrollRecords to localStorage', e);
      }

      setMessage(`Payment email sent to ${emailTo}${emailCC ? ` and CC: ${emailCC}` : ''}. Records updated.`);
      setTimeout(() => setMessage(''), 5000);
      setSimulation(null);
      setSelectedEmployees([]);
      setSendingEmail(false);
      setShowEmailModal(false);
      setEmailTo('');
      setEmailCC('');

    } catch (error) {
      console.error('Failed to send email:', error);
      setMessage('Error: Failed to send email. Please check backend logs/configuration.');
      setSendingEmail(false);
    }
  };

  const exportSimulationCSV = () => {
    if (!simulation) return;
    
    const header = [
      'Employee ID', 'Name', 'Designation', 'Salary Month', 'Payment Date',
      'Basic+DA', 'HRA', 'Special Allowance', 'Total Earnings',
      'PF', 'ESI', 'Tax', 'Professional Tax', 'Loan Deduction', 'LOP', 'Gratuity',
      'Total Deductions', 'Net Salary', 'CTC', 'Account Number', 'IFSC Code', 'Bank Name'
    ];
    
    const rows = simulation.results.map(r => [
      r.employeeId, r.employeeName, r.designation, r.salaryMonth, r.paymentDate,
      r.basicDA, r.hra, r.specialAllowance, r.totalEarnings,
      r.pf, r.esi, r.tax, r.professionalTax, r.loanDeduction, r.lop, r.gratuity,
      r.totalDeductions, r.netSalary, r.ctc,
      r.accountNumber, r.ifscCode, r.bankName
    ]);

    const csvContent = [header, ...rows].map(r => 
      r.map(cell => `"${cell ?? ''}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly_payroll_${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount) => 
    new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR', 
      minimumFractionDigits: 0 
    }).format(amount || 0);

  // Filter departments based on selected designation
  const departments = ['all', ...new Set(salaryRecords
    .filter(r => filterDesignation === 'all' || r.designation === filterDesignation)
    .map(r => r.department || '')
    .filter(Boolean))
  ];
  
  // Filter designations based on selected department
  const designations = ['all', ...new Set(salaryRecords
    .filter(r => filterDepartment === 'all' || r.department === filterDepartment)
    .map(r => r.designation || '')
    .filter(Boolean))
  ];

  // Get unique locations
  const uniqueLocations = ['all', ...new Set(salaryRecords
    .map(r => r.location || '')
    .filter(Boolean))
  ].sort();

  const filteredRecords = salaryRecords.filter(record => {
    // Search
    const matchesSearch = 
      (record.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.employeeId || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Department
    const matchesDept = filterDepartment === 'all' || record.department === filterDepartment;

    // Designation
    const matchesDesig = filterDesignation === 'all' || record.designation === filterDesignation;

    // Location
    const matchesLocation = filterLocation === 'all' || record.location === filterLocation;

    // Bank
    if (filterBank === 'all') return matchesSearch && matchesDept && matchesDesig && matchesLocation;
    if (filterBank === 'hdfc') return (matchesSearch && matchesDept && matchesDesig && matchesLocation) && record.bankName?.includes('HDFC');
    if (filterBank === 'sbi') return (matchesSearch && matchesDept && matchesDesig && matchesLocation) && record.bankName?.includes('SBI');
    if (filterBank === 'axis') return (matchesSearch && matchesDept && matchesDesig && matchesLocation) && record.bankName?.includes('Axis');
    if (filterBank === 'indian') return (matchesSearch && matchesDept && matchesDesig && matchesLocation) && record.bankName?.includes('Indian');
    if (filterBank === 'icici') return (matchesSearch && matchesDept && matchesDesig && matchesLocation) && record.bankName?.includes('ICICI');
    if (filterBank === 'other') return (matchesSearch && matchesDept && matchesDesig && matchesLocation) && !['HDFC', 'SBI', 'Axis', 'Indian', 'ICICI'].some(bank => 
      record.bankName?.includes(bank)
    );
    return matchesSearch && matchesDept && matchesDesig && matchesLocation;
  });

  const getBankFilterLabel = () => {
    switch(filterBank) {
      case 'all': return 'All Banks';
      case 'hdfc': return 'HDFC Bank';
      case 'sbi': return 'SBI';
      case 'axis': return 'Axis Bank';
      case 'indian': return 'Indian Bank';
      case 'icici': return 'ICICI Bank';
      case 'other': return 'Other Banks';
      default: return 'All Banks';
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-1">
       
        
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded ${
          message.includes('Error') || message.includes('Select at least one employee') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
          {message}
        </div>
      )}

      {/* Controls */}
      <div className="bg-white p-5 rounded-lg shadow mb-3 border border-gray-200 flex-none z-20 md:sticky md:top-0">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-4 border-b pb-4">
          {/* Search */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Name or ID"
                value={searchTerm}
                maxLength={25}
                onChange={(e) => {
                  const value = e.target.value;
                  const sanitizedValue = value.replace(/[^a-zA-Z0-9 ]/g, '');
                  setSearchTerm(sanitizedValue);
                }}
                className="w-full px-3 py-2 pl-8 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Filter className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Department</label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Departments</option>
              {departments.filter(d => d !== 'all').map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Designation */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Designation</label>
            <select
              value={filterDesignation}
              onChange={(e) => setFilterDesignation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Designations</option>
              {designations.filter(d => d !== 'all').map(desig => (
                <option key={desig} value={desig}>{desig}</option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Location</label>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Locations</option>
              {uniqueLocations.filter(l => l !== 'all').map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Bank Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Bank</label>
            <select
              value={filterBank}
              onChange={(e) => setFilterBank(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Banks</option>
              <option value="hdfc">HDFC Bank</option>
              <option value="sbi">SBI</option>
              <option value="axis">Axis Bank</option>
              <option value="indian">Indian Bank</option>
              <option value="icici">ICICI Bank</option>
              <option value="other">Other Banks</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Salary Month</label>
            <input 
              type="month" 
              value={selectedMonth} 
              max={new Date().toISOString().slice(0, 7)}
              onChange={(e) => setSelectedMonth(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Selected Employees</label>
            <div className="px-3 py-2 border border-gray-300 rounded bg-gray-50 text-center">
              <span className="font-medium text-blue-600">{selectedEmployees.length}</span>
              <span className="text-gray-600"> / {filteredRecords.length} filtered</span>
            </div>
            
          </div>
          <div className="flex items-center gap-2">
          <button 
            onClick={selectAll} 
            className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Select All
          </button>
          <button 
            onClick={clearSelection} 
            className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
          <button 
            onClick={runSimulation} 
            className="px-4 py-2 bg-[#262760] text-white rounded hover:bg-[#1e2050] transition-colors flex items-center gap-2"
            disabled={processing}
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Simulate
              </>
            )}
          </button>
        </div>
        </div>
      </div>

      {/* Employee/Salary Records Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="overflow-auto md:max-h-[calc(100vh-250px)]">
          <table className="min-w-full divide-y divide-gray-200 relative">
            <thead className="bg-[#262760] sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Select
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Employee Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Designation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Basic+DA
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Net Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Account No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  IFSC Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Bank Name
                </th>
               
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-6 py-4 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      Loading employees...
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-4 text-center text-gray-500">
                    No employees found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(record => {
                  const salary = calculateSalaryFields(record);
                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        checked={selectedEmployees.includes(record.id)} 
                        onChange={() => toggleSelectEmployee(record.id)} 
                        className="w-4 h-4 text-blue-600"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">{record.employeeId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{record.employeeName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">{record.designation}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{formatCurrency(record.basicDA)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-green-600">
                        {formatCurrency(salary.netSalary)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                      {record.accountNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                      {record.ifscCode || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.bankName?.includes('HDFC') 
                          ? 'bg-green-100 text-green-800' 
                          : record.bankName?.includes('SBI')
                          ? 'bg-blue-100 text-blue-800'
                          : record.bankName?.includes('Axis')
                          ? 'bg-purple-100 text-purple-800'
                          : record.bankName?.includes('Indian')
                          ? 'bg-indigo-100 text-indigo-800'
                          : record.bankName?.includes('ICICI')
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {record.bankName || 'Not Set'}
                      </span>
                    </td>
                    
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Showing: {getBankFilterLabel()} ({filteredRecords.length} records)
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Selected: <span className="font-medium text-blue-600">{selectedEmployees.length}</span> employees
            </div>
          </div>
        </div>
      </div>

      {/* Simulation Result Modal */}
      {simulation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-gray-200">
            {/* Header - Frozen */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5 border-b border-gray-200 bg-white rounded-t-lg z-10 shrink-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 leading-snug">
                Simulation Preview ({simulation.results.length} employees)
              </h3>
              <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 w-full sm:w-auto">
                <button 
                  onClick={handleExcelExport}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  Export Excel
                </button>
                <button 
                  onClick={savePayroll} 
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
                  disabled={saving}
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Save
                </button>
                <button 
                  onClick={exportSimulationCSV} 
                  className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <button 
                  onClick={handleSendPaymentClick}
                  className="px-4 py-2 bg-[#262760] text-white rounded hover:bg-[#1e2050] transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
                >
                  <Mail className="w-4 h-4" />
                  Send Payment Email
                </button>
                <button 
                  onClick={() => setSimulation(null)} 
                  className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm whitespace-nowrap"
                >
                  <X className="w-4 h-4" />
                  Close
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-auto flex-1 px-3 sm:px-5 pb-5 relative">
              <div className="mt-4 space-y-3 md:hidden">
                {simulation.results.map(result => (
                  <div key={result.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-gray-500 font-mono">{result.employeeId}</div>
                        <div className="text-sm font-semibold text-gray-900 truncate">{result.employeeName}</div>
                      </div>
                      <button
                        onClick={() => handleEditClick(result)}
                        className="shrink-0 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                        title="Edit LOP / Apply CF"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div>
                        <div className="text-xs text-gray-500">Gross Salary</div>
                        <div className="font-medium text-gray-900">{formatCurrency(result.totalEarnings)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Net Salary</div>
                        <div className="font-bold text-green-600">{formatCurrency(result.netSalary)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">LOP Days</div>
                        <div className="font-medium text-red-600">{result.lopDays || 0}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">LOP Deduction</div>
                        <div className="font-medium text-red-600">{formatCurrency(result.lop)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Loan Deduction</div>
                        <div className="font-medium text-red-600">{formatCurrency(result.loanDeduction)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Total Deductions</div>
                        <div className="font-medium text-gray-900">{formatCurrency(result.totalDeductions)}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-xs text-gray-500">Bank</div>
                        <div className="mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            result.bankName?.includes('HDFC') 
                              ? 'bg-green-100 text-green-800' 
                              : result.bankName?.includes('SBI')
                              ? 'bg-blue-100 text-blue-800'
                              : result.bankName?.includes('Axis')
                              ? 'bg-purple-100 text-purple-800'
                              : result.bankName?.includes('Indian')
                              ? 'bg-indigo-100 text-indigo-800'
                              : result.bankName?.includes('ICICI')
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {result.bankName || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="text-sm font-semibold text-gray-900">Totals</div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <div className="text-xs text-gray-500">Gross Salary</div>
                      <div className="font-medium text-gray-900">{formatCurrency(simulation.totals.totalEarnings)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Net Salary</div>
                      <div className="font-bold text-green-600">{formatCurrency(simulation.totals.netSalary)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">LOP Deduction</div>
                      <div className="font-medium text-red-600">
                        {formatCurrency(simulation.results.reduce((sum, r) => sum + (r.lop || 0), 0))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Loan Deduction</div>
                      <div className="font-medium text-red-600">
                        {formatCurrency(simulation.results.reduce((sum, r) => sum + (r.loanDeduction || 0), 0))}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-gray-500">Total Deductions</div>
                      <div className="font-medium text-gray-900">{formatCurrency(simulation.totals.totalDeductions)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden md:block">
                <table className="min-w-full divide-y divide-gray-200 border-separate border-spacing-0 mt-5">
                  <thead className="bg-[#262760] sticky top-0 z-40">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider sticky left-0 z-50 bg-[#262760]">
                        Employee ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider sticky left-[120px] z-50 bg-[#262760]">
                        Employee Name
                      </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Gross Salary
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          LOP Days
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          LOP Deduction
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Loan Deduction
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Total Deductions
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Net Salary
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Bank
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {simulation.results.map(result => (
                        <tr key={result.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap sticky left-0 z-30 bg-white">
                            <div className="text-sm text-gray-900 font-mono">{result.employeeId}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap sticky left-[120px] z-30 bg-white shadow-md">
                            <div className="font-medium text-gray-900">{result.employeeName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {formatCurrency(result.totalEarnings)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-red-600 font-medium">
                            {result.lopDays || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">
                            {formatCurrency(result.lop)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">
                            {formatCurrency(result.loanDeduction)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {formatCurrency(result.totalDeductions)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-green-600">
                            {formatCurrency(result.netSalary)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              result.bankName?.includes('HDFC') 
                                ? 'bg-green-100 text-green-800' 
                                : result.bankName?.includes('SBI')
                                ? 'bg-blue-100 text-blue-800'
                                : result.bankName?.includes('Axis')
                                ? 'bg-purple-100 text-purple-800'
                                : result.bankName?.includes('Indian')
                                ? 'bg-indigo-100 text-indigo-800'
                                : result.bankName?.includes('ICICI')
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {result.bankName || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button 
                              onClick={() => handleEditClick(result)}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                              title="Edit LOP / Apply CF"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t font-semibold bg-gray-50">
                        <td colSpan="2" className="px-6 py-4 whitespace-nowrap sticky left-0 z-30 bg-gray-50 shadow-md">Totals</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {formatCurrency(simulation.totals.totalEarnings)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          -
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">
                          {formatCurrency(simulation.results.reduce((sum, r) => sum + (r.lop || 0), 0))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">
                          {formatCurrency(simulation.results.reduce((sum, r) => sum + (r.loanDeduction || 0), 0))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {formatCurrency(simulation.totals.totalDeductions)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-green-600">
                          {formatCurrency(simulation.totals.netSalary)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap"></td>
                        <td className="px-6 py-4 whitespace-nowrap"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              
              {/* Summary Stats */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-600 font-medium">Total Employees</div>
                  <div className="text-xl font-bold text-blue-700">{simulation.results.length}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="text-sm text-green-600 font-medium">Total Net Salary</div>
                  <div className="text-xl font-bold text-green-700">
                    {formatCurrency(simulation.totals.netSalary)}
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <div className="text-sm text-purple-600 font-medium">Gratuity Included</div>
                  <div className="text-xl font-bold text-purple-700">
                    {formatCurrency(simulation.results.reduce((sum, r) => sum + (r.gratuity || 0), 0))}
                  </div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <div className="text-sm text-orange-600 font-medium">Total CTC</div>
                  <div className="text-xl font-bold text-orange-700">
                    {formatCurrency(simulation.totals.ctc)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!simulation && selectedEmployees.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="mb-4">
            <svg className="w-12 h-12 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-600">No employees selected</p>
          <p className="text-gray-500 mt-1">Select employees and click <strong>Simulation</strong> to preview monthly payroll</p>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 transform transition-all scale-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payroll Saved Successfully</h3>
              <div className="text-left w-full bg-gray-50 p-4 rounded-lg space-y-3 mb-6">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-gray-600">Month</span>
                  <span className="font-semibold text-gray-900">
                    {(() => {
                      const [y, m] = selectedMonth.split('-');
                      return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-gray-600">Total Employees</span>
                  <span className="font-semibold text-gray-900">{simulation?.results?.length || 0}</span>
                </div>
                <div className="pt-1">
                  <span className="text-gray-600 block mb-2 text-sm font-medium">Location Breakdown</span>
                  <ul className="space-y-2">
                    {Object.entries(
                      (simulation?.results || []).reduce((acc, curr) => {
                        const loc = curr.location || 'Unknown';
                        acc[loc] = (acc[loc] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([location, count]) => (
                      <li key={location} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-gray-100">
                        <span className="text-gray-700">{location}</span>
                        <span className="font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full text-xs">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 transform transition-all scale-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Send Payment Email</h3>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To (Email ID) <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter recipient email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CC
                </label>
                <input
                  type="email"
                  value={emailCC}
                  onChange={(e) => setEmailCC(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter CC email (optional)"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700">
                <p>Sending payment details for <strong>{simulation?.results?.length}</strong> employees.</p>
                <p className="font-semibold mt-1">Total Amount: {formatCurrency(simulation?.totals?.netSalary)}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={processPaymentEmail}
                disabled={sendingEmail}
                className="px-4 py-2 bg-[#262760] text-white rounded-md hover:bg-[#1e2050] transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingEmail ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bank Warning Modal */}
      {showBankWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 transform transition-all scale-100">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                <span className="text-yellow-600 text-2xl font-bold">!</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Incomplete Bank Details</h3>
              <p className="text-gray-600">
                The following {missingBankEmployees.length} employee(s) have incomplete bank details:
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto mb-6 border border-gray-200">
              <ul className="space-y-2">
                {missingBankEmployees.map(emp => (
                  <li key={emp.employeeId} className="flex justify-between items-center text-sm">
                    <span className="font-medium text-gray-900">{emp.employeeName}</span>
                    <span className="text-gray-500 font-mono text-xs">{emp.employeeId}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-sm text-gray-500 text-center mb-6">
              Do you want to proceed with sending the payment email anyway?
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowBankWarningModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowBankWarningModal(false);
                  setShowEmailModal(true);
                }}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
              >
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit LOP / CF Modal */}
      {editModalOpen && editingRecord && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 transform transition-all scale-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit LOP / Apply Carry Forward</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-yellow-50 p-3 rounded-md text-sm text-yellow-800 border border-yellow-200">
                <p><strong>Employee:</strong> {editingRecord.employeeName} ({editingRecord.employeeId})</p>
                <p><strong>Current LOP Days:</strong> {editingRecord.lopDays}</p>
                <p><strong>Current LOP Deduction:</strong> {formatCurrency(editingRecord.lop)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Carry Forward (CF) Used
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={cfUsedInput}
                  onChange={(e) => setCfUsedInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter days to adjust from CF"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will deduct from the employee's Privilege Leave balance immediately.
                </p>
              </div>

              <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700">
                <p><strong>New LOP Days:</strong> {Math.max(editingRecord.lopDays - (parseFloat(cfUsedInput) || 0), 0)}</p>
                <p><strong>Formula:</strong> max(Monthly LOP - CF Used, 0)</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Apply & Update Balance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
