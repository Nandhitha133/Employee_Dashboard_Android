// screens/Payroll/MonthlyPayrollScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StatusBar,
  Platform,
  Alert,
  TextInput,
  RefreshControl,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
const PickerItem = Picker.Item as any;
import { employeeAPI, payrollAPI, monthlyPayrollAPI, leaveAPI, loanAPI, mailAPI } from '../../services/api';
import CommonHeader from '../../components/CommonHeader';
import CommonFooter from '../../components/CommonFooter';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import XLSX from 'xlsx';
import { Buffer } from 'buffer';

const COLORS = {
  primary: '#0A0F2C',
  secondary: '#1A237E',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#666666',
  lightGray: '#E5E7EB',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  blue: '#3498db',
  green: '#27ae60',
  red: '#e74c3c',
  purple: '#9b59b6',
  orange: '#f39c12',
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  blueLight: '#EBF5FF',
  greenLight: '#E8F5E9',
  redLight: '#FEE2E2',
  yellowLight: '#FEF3C7',
  background: '#F5F7FA',
  cardBg: '#FFFFFF',
  border: '#E8ECF0',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  filterBg: '#F8FAFC',
  selectedBg: '#E6F0FF',
  dropdownBg: '#FFFFFF',
  dropdownText: '#000000',
};

interface Employee {
  _id?: string;
  employeeId: string;
  name: string;
  employeename?: string;
  designation?: string;
  department?: string;
  division?: string;
  location?: string;
  dateOfJoining?: string;
  basicDA?: number;
  hra?: number;
  specialAllowance?: number;
  gratuity?: number;
  pf?: number;
  esi?: number;
  tax?: number;
  professionalTax?: number;
  loanDeduction?: number;
  uan?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  address?: string;
  currentAddress?: string;
  bankAccount?: string;
  ifsc?: string;
  basic?: number;
}

interface SalaryRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  name?: string; // Added to match interface
  designation: string;
  department: string;
  division: string;
  location: string;
  dateOfJoining: string;
  basicDA: number;
  hra: number;
  specialAllowance: number;
  gratuity: number;
  pf: number;
  esi: number;
  tax: number;
  professionalTax: number;
  loanDeduction: number;
  lop: number;
  status: string;
  uan: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  salaryMonth?: string;
  paymentDate?: string;
  totalEarnings?: number;
  totalDeductions?: number;
  netSalary?: number;
  ctc?: number;
  lopDays?: number;
  daysInMonth?: number;
  preDojDays?: number;
  doj?: string;
}

interface SimulationResult extends SalaryRecord {
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  ctc: number;
  lopDays: number;
  lop: number;
  salaryMonth: string;
  paymentDate: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  doj?: string;
  preDojDays?: number;
}

interface SimulationTotals {
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  ctc: number;
}

interface Simulation {
  results: SimulationResult[];
  totals: SimulationTotals;
}

const calculateSalaryFields = (
  salaryData: any,
  lopDaysInput: number | undefined,
  daysInMonth: number = 30
) => {
  const basicDA = parseFloat(salaryData.basicDA) || 0;
  const hra = parseFloat(salaryData.hra) || 0;
  const specialAllowance = parseFloat(salaryData.specialAllowance) || 0;
  const gratuity = parseFloat(salaryData.gratuity) || 0;
  const pf = parseFloat(salaryData.pf) || 0;
  const esi = parseFloat(salaryData.esi) || 0;
  const tax = parseFloat(salaryData.tax) || 0;
  const professionalTax = parseFloat(salaryData.professionalTax) || 0;
  const loanDeduction = parseFloat(salaryData.loanDeduction) || 0;

  // Use input if provided, otherwise check record, otherwise 0
  const lopDays = lopDaysInput !== undefined ? lopDaysInput : (salaryData.lopDays || 0);

  const totalEarnings = basicDA + hra + specialAllowance;
  
  // Calculate LOP deduction
  // Per Day Salary = Total Earnings / Actual Days in Month
  const perDaySalary = totalEarnings / daysInMonth;
  const lopDeduction = Math.round(perDaySalary * lopDays);

  // Gratuity is part of CTC but usually not deducted from monthly Net Salary (it's separate)
  const totalDeductions = pf + esi + tax + professionalTax + loanDeduction + lopDeduction;
  const netSalary = totalEarnings - totalDeductions;
  const ctc = totalEarnings + gratuity;

  return {
    ...salaryData,
    totalEarnings,
    totalDeductions,
    netSalary,
    ctc,
    lop: lopDeduction,
    lopDays,
    daysInMonth // Store daysInMonth in the record for reference
  };
};

const createPayrollWorkbook = (simulation: Simulation, selectedMonth: string) => {
  const workbook = XLSX.utils.book_new();
  
  // Calculate days in month from selectedMonth (YYYY-MM)
  const [year, month] = selectedMonth.split('-');
  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();

  // Create headers exactly as in your sample
  const headers = [
    ["SL .NO", "LOCATION", "NAME OF THE", "UAN", "BANK ACCOUNT NUMBER", "ID NUMBAR", "ACL", "WORKING DAYS", "GROSS", 
     "BASIC +DA", "HRA", "CEILING", "DEDUCTION", "EPS", "EPF", "ADMIN", "ESI", "VOLUNTARY", "TDS", 
     "PROFESSIONALTAX", "LOAN", "TOTAL", "ROUND OFF VALUE", "NET", "EMPLOYEE SIGNATURE"],
    ["", "", "EMPLOYEE'S", "NO", "SALARY", "", "SALARY", "", "", "BASIC", "EPF", "ESI", "8.33%", "3.67%", 
     "CHARGES", "3.25%", "CON", "DEDUC", "DEDUC", "", "DEDUC", "SALARY", "", "", ""]
  ];
  
  // Prepare data rows
  const dataRows = simulation.results.map((record, index) => {
    // Calculate EPF components (assuming 8.33% for EPS and 3.67% for EPF)
    const epfCeiling = 15000; // Standard EPF ceiling
    const basicForEPF = Math.min(record.basicDA || 0, epfCeiling);
    const epsDeduction = Math.round(basicForEPF * 0.0833);
    const epfDeduction = Math.round(basicForEPF * 0.0367);
    
    // Calculate ESI (assuming 0.75% of gross)
    const esiDeduction = Math.round((record.totalEarnings || 0) * 0.0075);
    
    // Calculate admin charges (assuming 0.5% of basic)
    const adminCharges = Math.round((record.basicDA || 0) * 0.005);
    
    // Calculate working days (Actual Days - LOP days)
    // Use stored daysInMonth or calculate it
    const actualDays = record.daysInMonth || daysInMonth;
    const workingDays = actualDays - (record.lopDays || 0);
    
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
      0, // VOLUNTARY CON
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
  const totals = simulation.results.reduce((acc, record) => {
    acc.gross += record.totalEarnings || 0;
    acc.basic += record.basicDA || 0;
    acc.hra += record.hra || 0;
    acc.net += record.netSalary || 0;
    
    const actualDays = record.daysInMonth || daysInMonth;
    acc.workingDays += (actualDays - (record.lopDays || 0));
    
    // EPF calculations
    const epfCeiling = 15000;
    const basicForEPF = Math.min(record.basicDA || 0, epfCeiling);
    acc.eps += Math.round(basicForEPF * 0.0833);
    acc.epf += Math.round(basicForEPF * 0.0367);
    acc.esi += Math.round((record.totalEarnings || 0) * 0.0075);
    acc.admin += Math.round((record.basicDA || 0) * 0.005);
    
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
const exportToExcel = (simulation: Simulation, selectedMonth: string) => {
  if (!simulation) return null;
  const workbook = createPayrollWorkbook(simulation, selectedMonth);
  const wbout = XLSX.write(workbook, { type: 'binary', bookType: 'xlsx' });
  return wbout;
};

const MonthlyPayrollScreen = () => {
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SimulationResult | null>(null);
  const [cfUsedInput, setCfUsedInput] = useState<string>('0');
  const [simulatedBalances, setSimulatedBalances] = useState<Map<string, any>>(new Map());
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  
  // Filters
  const [filterBank, setFilterBank] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterDesignation, setFilterDesignation] = useState('all');
  
  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showBankWarningModal, setShowBankWarningModal] = useState(false);
  const [missingBankEmployees, setMissingBankEmployees] = useState<SimulationResult[]>([]);
  const [emailTo, setEmailTo] = useState('');
  const [emailCC, setEmailCC] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Bank filter options
  const bankOptions = [
    { value: 'all', label: 'All Banks' },
    { value: 'hdfc', label: 'HDFC Bank' },
    { value: 'sbi', label: 'SBI' },
    { value: 'axis', label: 'Axis Bank' },
    { value: 'indian', label: 'Indian Bank' },
    { value: 'icici', label: 'ICICI Bank' },
    { value: 'other', label: 'Other Banks' },
  ];

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const [empResponse, payrollResponse, loanResponse] = await Promise.all([
        employeeAPI.getAllEmployees(),
        payrollAPI.list(),
        loanAPI.list()
      ]);
      
      const employees = Array.isArray(empResponse.data) ? empResponse.data : [];
      const payrolls = Array.isArray(payrollResponse.data) ? payrollResponse.data : [];
      const loans = loanResponse.data && loanResponse.data.loans ? loanResponse.data.loans : [];

      const mapped: SalaryRecord[] = employees.map((emp: any) => {
        // Find matching payroll record
        const payrollRec = payrolls.find((p: any) => p.employeeId === emp.employeeId);
        
        // Calculate Loan Deduction from active loans
        const empLoans = loans.filter((l: any) => 
          l.employeeId === emp.employeeId && 
          l.status === 'active' && 
          l.paymentEnabled === true
        );
        
        const calculatedLoanDeduction = empLoans.reduce((sum: number, loan: any) => {
          if (!loan.amount || !loan.tenureMonths) return sum;
          const monthly = Math.round(loan.amount / loan.tenureMonths);
          return sum + monthly;
        }, 0);

        return {
          id: emp._id || emp.employeeId || '',
          employeeId: emp.employeeId || '',
          employeeName: emp.name || emp.employeename || '',
          name: emp.name || emp.employeename || '', // Added to match interface
          designation: emp.designation || '',
          department: emp.department || emp.division || '',
          division: emp.division || '',
          location: emp.location || emp.address || emp.currentAddress || 'Unknown',
          dateOfJoining: emp.dateOfJoining || '',
          
          // Use payroll record if available, else fallback to employee record
          basicDA: payrollRec ? (payrollRec.basicDA || 0) : (emp.basicDA || emp.basic || 0),
          hra: payrollRec ? (payrollRec.hra || 0) : (emp.hra || 0),
          specialAllowance: payrollRec ? (payrollRec.specialAllowance || 0) : (emp.specialAllowance || 0),
          gratuity: payrollRec ? (payrollRec.gratuity || 0) : (emp.gratuity || 0),
          
          pf: payrollRec ? (payrollRec.pf || 0) : (emp.pf || 0),
          esi: payrollRec ? (payrollRec.esi || 0) : (emp.esi || 0),
          tax: payrollRec ? (payrollRec.tax || 0) : (emp.tax || 0),
          professionalTax: payrollRec ? (payrollRec.professionalTax || 0) : (emp.professionalTax || 0),
          
          // Use calculated loan deduction if available, otherwise fallback
          loanDeduction: calculatedLoanDeduction > 0 ? calculatedLoanDeduction : (payrollRec ? (payrollRec.loanDeduction || 0) : (emp.loanDeduction || 0)),
          
          lop: 0,
          status: 'Pending',
          
          uan: emp.uan || '',
          accountNumber: payrollRec?.accountNumber || emp.bankAccount || '',
          ifscCode: payrollRec?.ifscCode || emp.ifsc || '',
          bankName: payrollRec?.bankName || emp.bankName || ''
        };
      });

      // Sort by Employee ID (natural sort order)
      mapped.sort((a, b) => {
        const idA = a.employeeId || '';
        const idB = b.employeeId || '';
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
      });

      setSalaryRecords(mapped);
    } catch (e) {
      console.error('Failed to fetch employees or payrolls', e);
      showMessage('Error fetching data. Please check permissions.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEmployees();
  };

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const toggleSelectEmployee = (id: string) => {
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
      showMessage('Select at least one employee to simulate payroll.', 'error');
      return;
    }

    setProcessing(true);
    
    const [year, month] = selectedMonth.split('-');
    
    try {
      // Fetch approved leaves for the whole year to correctly replay balance
      const yearStart = new Date(parseInt(year), 0, 1);
      const yearEnd = new Date(parseInt(year), 11, 31, 23, 59, 59);

      const [leavesResponse, balancesResponse] = await Promise.all([
        leaveAPI.list({
          status: 'Approved',
          startDate: yearStart.toISOString(),
          endDate: yearEnd.toISOString(),
          overlap: 'true'
        }),
        leaveAPI.getBalance()
      ]);
      
      const leaves = leavesResponse.data || [];
      const balancesList = Array.isArray(balancesResponse.data) ? balancesResponse.data : [];
      
      // Create a map of employee balances for quick lookup
      const balanceMap = new Map();
      balancesList.forEach((item: any) => {
        if (item.employeeId && item.balances) {
          balanceMap.set(item.employeeId, item.balances);
        }
      });
      setSimulatedBalances(balanceMap);

      const selectedRecords = salaryRecords.filter(r => selectedEmployees.includes(r.id));
      
      // Calculate days in month
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();

      const results: SimulationResult[] = selectedRecords.map(rec => {
        // DOJ Calculation Logic
        let preDojDays = 0;
        let joiningDate: Date | null = null;
        
        if (rec.dateOfJoining) {
            joiningDate = new Date(rec.dateOfJoining);
            joiningDate.setHours(0,0,0,0);
            
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
          .filter((l: any) => (l.employeeId && l.employeeId === rec.employeeId))
          .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        
        // Get initial balances (Allocation)
        // Note: The balance API returns CURRENT balance (Allocated - Used).
        // We need the Allocated amount to replay.
        const empBalances = balanceMap.get(rec.employeeId);
        let clAlloc = 0, slAlloc = 0, plAlloc = 0;
        
        if (empBalances) {
          clAlloc = Number(empBalances.casual?.allocated || 0);
          slAlloc = Number(empBalances.sick?.allocated || 0);
          plAlloc = Number(empBalances.privilege?.allocated || 0);
        }

        // Helper to check date intersection with selected month
        const isDateInMonth = (d: string | Date) => {
            const date = new Date(d);
            return date.getFullYear() === parseInt(year) && date.getMonth() === (parseInt(month) - 1);
        };

        let lopDaysInMonth = 0;

        // Replay Logic
        let clUsed = 0, slUsed = 0, plUsed = 0;

        employeeLeaves.forEach((leave: any) => {
            // Determine leave type category
            const type = (leave.leaveType || '').toUpperCase().trim();
            const isExplicitLOP = ['LOP', 'LOSSOFPAY', 'UNPAID', 'LWOP'].some(t => type.replace(/\s+/g, '') === t);
            
            // Iterate day by day for this leave
            const startD = new Date(leave.startDate);
            const endD = new Date(leave.endDate);
            startD.setHours(0,0,0,0);
            endD.setHours(0,0,0,0);
            
            const currentD = new Date(startD);
            while (currentD <= endD) {
                // If the day is before DOJ, ignore it (it's covered by preDojDays)
                if (joiningDate && currentD < joiningDate) {
                    currentD.setDate(currentD.getDate() + 1);
                    continue;
                }

                // Skip weekends (Saturday and Sunday)
                const dayOfWeek = currentD.getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    currentD.setDate(currentD.getDate() + 1);
                    continue;
                }

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
                    if (type === 'CL') {
                        if (clUsed + dayValue <= clAlloc) {
                            clUsed += dayValue;
                        } else if (clUsed < clAlloc) {
                            const available = clAlloc - clUsed;
                            clUsed += available;
                            lopAmount = dayValue - available;
                        } else {
                            lopAmount = dayValue;
                        }
                    } else if (type === 'SL') {
                        if (slUsed + dayValue <= slAlloc) {
                            slUsed += dayValue;
                        } else if (slUsed < slAlloc) {
                            const available = slAlloc - slUsed;
                            slUsed += available;
                            lopAmount = dayValue - available;
                        } else {
                            lopAmount = dayValue;
                        }
                    } else if (type === 'PL') {
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
                }
                
                currentD.setDate(currentD.getDate() + 1);
            }
        });

        // Total LOP days = calculated from replay + Pre-DOJ days
        const lopDays = lopDaysInMonth + preDojDays;

        const base = calculateSalaryFields(rec, lopDays, daysInMonth);
        const adjusted = { ...base } as SimulationResult;
        
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
    } catch (err: any) {
      console.error("Simulation failed", err);
      showMessage("Failed to run simulation: " + err.message, 'error');
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
      
      showMessage(`Successfully saved ${response.data.count} payroll records to database.`, 'success');
      setShowSuccessModal(true);
      
    } catch (error: any) {
      console.error('Failed to save payroll:', error);
      showMessage('Error saving payroll data: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (record: SimulationResult) => {
    setEditingRecord(record);
    setCfUsedInput('0');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRecord || !simulation) return;
    
    // Formula: Final LOP (Month) = max( Monthly LOP - CF Used (that month), 0 )
    const originalLopDays = editingRecord.lopDays || 0;
    const cfUsed = parseFloat(cfUsedInput) || 0;
    const newLopDays = Math.max(originalLopDays - cfUsed, 0);
    
    // Calculate days in month from selectedMonth
    const [year, month] = selectedMonth.split('-');
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();

    // Recalculate salary
    const updatedRecord = calculateSalaryFields(editingRecord, newLopDays, daysInMonth) as SimulationResult;
    
    // Update simulation
    const newResults = simulation.results.map(r => 
      r.id === editingRecord.id ? updatedRecord : r
    );
    
    const newTotals = newResults.reduce((acc, curr) => ({
      totalEarnings: acc.totalEarnings + curr.totalEarnings,
      totalDeductions: acc.totalDeductions + curr.totalDeductions,
      netSalary: acc.netSalary + curr.netSalary,
      ctc: acc.ctc + curr.ctc
    }), {
      totalEarnings: 0,
      totalDeductions: 0,
      netSalary: 0,
      ctc: 0
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
            
            Alert.alert('Success', `LOP adjusted. Privilege Leave deducted by ${cfUsed}. New Balance: ${newPL}`);
        }
      } catch (error) {
        console.error("Failed to update leave balance", error);
        Alert.alert('Error', 'Failed to update leave balance in backend.');
      }
    }
    
    setEditModalOpen(false);
    setEditingRecord(null);
  };

  const handleExcelExport = async () => {
    if (!simulation) return;
    
    try {
      const wbout = exportToExcel(simulation, selectedMonth);
      if (!wbout) return;
      
      const fileName = `Monthly_Payroll_${selectedMonth}.xlsx`;
      const filePath = Platform.OS === 'android'
        ? `${RNFS.CachesDirectoryPath}/${fileName}`
        : `${RNFS.DocumentDirectoryPath}/${fileName}`;

      // Convert binary string to base64 using Buffer
      const buffer = Buffer.from(wbout, 'binary');
      const base64 = buffer.toString('base64');
      
      await RNFS.writeFile(filePath, base64, 'base64');
      
      const shareOptions = {
        title: 'Export Payroll',
        message: 'Monthly Payroll Report',
        url: `file://${filePath}`,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        failOnCancel: false,
      };

      await Share.open(shareOptions);
    } catch (error: any) {
      if (error.message && error.message.includes('User did not share')) {
        return;
      }
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const exportSimulationCSV = async () => {
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
    
    const fileName = `monthly_payroll_${selectedMonth}.csv`;
    const filePath = Platform.OS === 'android'
      ? `${RNFS.CachesDirectoryPath}/${fileName}`
      : `${RNFS.DocumentDirectoryPath}/${fileName}`;

    try {
      await RNFS.writeFile(filePath, csvContent, 'utf8');
      
      const shareOptions = {
        title: 'Export Payroll CSV',
        message: 'Monthly Payroll CSV Report',
        url: `file://${filePath}`,
        type: 'text/csv',
        failOnCancel: false,
      };

      await Share.open(shareOptions);
    } catch (error: any) {
      if (error.message && error.message.includes('User did not share')) {
        return;
      }
      Alert.alert('Error', 'Failed to export data');
    }
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
      Alert.alert('Error', 'Please enter a recipient email (To)');
      return;
    }

    if (!simulation) return;

    setSendingEmail(true);
    showMessage('Sending email...', 'info');

    // Generate Excel attachment
    const workbook = createPayrollWorkbook(simulation, selectedMonth);
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
    const attachment = {
        filename: `Monthly_Payroll_${selectedMonth}.xlsx`,
        content: wbout,
        encoding: 'base64' as const
    };

    // Calculate location-wise stats
    const locationStats = simulation.results.reduce((acc: Record<string, { count: number; amount: number }>, curr) => {
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
      
      showMessage(`Payment email sent to ${emailTo}${emailCC ? ` and CC: ${emailCC}` : ''}. Records updated.`, 'success');
      setSimulation(null);
      setSelectedEmployees([]);
      setSendingEmail(false);
      setShowEmailModal(false);
      setEmailTo('');
      setEmailCC('');

    } catch (error) {
      console.error('Failed to send email:', error);
      showMessage('Error: Failed to send email. Please check backend logs/configuration.', 'error');
      setSendingEmail(false);
    }
  };

  const formatCurrency = (amount: number) => 
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
    const matchesSearch = searchTerm === '' ||
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
    const option = bankOptions.find(opt => opt.value === filterBank);
    return option ? option.label : 'All Banks';
  };

  const isFilterApplied = searchTerm || filterDepartment !== 'all' || filterDesignation !== 'all' || filterLocation !== 'all' || filterBank !== 'all';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader 
        title="Monthly Payroll" 
        showBack={true}
      />

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Message Banner */}
        {message !== '' && (
          <View style={{ 
            marginBottom: 16, 
            padding: 12, 
            borderRadius: 8,
            backgroundColor: messageType === 'success' ? COLORS.greenLight : 
                           messageType === 'error' ? COLORS.redLight : COLORS.blueLight,
            borderWidth: 1,
            borderColor: messageType === 'success' ? COLORS.green :
                        messageType === 'error' ? COLORS.red : COLORS.blue,
          }}>
            <Text style={{ 
              color: messageType === 'success' ? COLORS.green :
                     messageType === 'error' ? COLORS.red : COLORS.blue,
              fontWeight: '500'
            }}>
              {message}
            </Text>
          </View>
        )}

        {/* Filters Section */}
        <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>Filter Options</Text>
            {isFilterApplied && (
              <TouchableOpacity 
                onPress={() => {
                  setSearchTerm('');
                  setFilterDepartment('all');
                  setFilterDesignation('all');
                  setFilterLocation('all');
                  setFilterBank('all');
                }}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Icon name="clear-all" size={18} color={COLORS.red} />
                <Text style={{ color: COLORS.red, fontSize: 13, marginLeft: 4 }}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ width: '100%' }}>
            {/* Search */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 6 }}>Search Employee</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.filterBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 }}>
                <Icon name="search" size={20} color={COLORS.gray} />
                <TextInput
                  value={searchTerm}
                  onChangeText={(text) => setSearchTerm(text.replace(/[^a-zA-Z0-9 ]/g, ''))}
                  placeholder="Search by name or ID..."
                  placeholderTextColor={COLORS.gray}
                  maxLength={25}
                  style={{
                    flex: 1,
                    marginLeft: 8,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: COLORS.textPrimary,
                  }}
                />
                {searchTerm !== '' && (
                  <TouchableOpacity onPress={() => setSearchTerm('')}>
                    <Icon name="close" size={18} color={COLORS.gray} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Department Filter */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 6 }}>Department</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filterDepartment}
                  onValueChange={(value) => setFilterDepartment(value)}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="All Departments" value="all" color={COLORS.gray} />
                  {departments.filter(d => d !== 'all').map(dept => (
                    <Picker.Item key={dept} label={dept} value={dept} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Designation Filter */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 6 }}>Designation</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filterDesignation}
                  onValueChange={(value) => setFilterDesignation(value)}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="All Designations" value="all" color={COLORS.gray} />
                  {designations.filter(d => d !== 'all').map(desig => (
                    <Picker.Item key={desig} label={desig} value={desig} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Location Filter */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 6 }}>Location</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filterLocation}
                  onValueChange={(value) => setFilterLocation(value)}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="All Locations" value="all" color={COLORS.gray} />
                  {uniqueLocations.filter(l => l !== 'all').map(loc => (
                    <Picker.Item key={loc} label={loc} value={loc} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Bank Filter */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 6 }}>Bank</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filterBank}
                  onValueChange={(value) => setFilterBank(value)}
                  style={{ height: 45, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  {bankOptions.map(option => (
                    <PickerItem key={option.value} label={option.label} value={option.value} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>

        {/* Controls Section */}
        <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, padding: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
            <View style={{ width: '50%', paddingRight: 4, marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 6 }}>Salary Month</Text>
              <TextInput
                value={selectedMonth}
                onChangeText={setSelectedMonth}
                placeholder="YYYY-MM"
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  backgroundColor: COLORS.white,
                  color: COLORS.textPrimary,
                }}
                placeholderTextColor={COLORS.gray}
              />
            </View>

            <View style={{ width: '50%', paddingLeft: 4, marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 6 }}>Selected Employees</Text>
              <View style={{ 
                borderWidth: 1, 
                borderColor: COLORS.border, 
                borderRadius: 8, 
                padding: 12, 
                backgroundColor: COLORS.filterBg,
                flexDirection: 'row',
                justifyContent: 'space-between'
              }}>
                <Text style={{ color: COLORS.textPrimary }}>
                  <Text style={{ fontWeight: '600', color: COLORS.blue }}>{selectedEmployees.length}</Text>
                  <Text style={{ color: COLORS.gray }}> / {filteredRecords.length} filtered</Text>
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                onPress={selectAll}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 6,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: COLORS.textPrimary }}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={clearSelection}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: COLORS.textPrimary }}>Clear</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={runSimulation}
              disabled={processing}
              style={{
                backgroundColor: COLORS.primary,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 6,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              {processing ? (
                <>
                  <ActivityIndicator size="small" color={COLORS.white} />
                  <Text style={{ marginLeft: 8, color: COLORS.white }}>Processing...</Text>
                </>
              ) : (
                <>
                  <Icon name="play-arrow" size={18} color={COLORS.white} />
                  <Text style={{ marginLeft: 8, color: COLORS.white }}>Simulate</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Results Count */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
            Showing: {getBankFilterLabel()} ({filteredRecords.length} records)
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
            Selected: <Text style={{ fontWeight: '600', color: COLORS.blue }}>{selectedEmployees.length}</Text> employees
          </Text>
        </View>

        {/* Employee Records Table - With wider columns for Net Salary and Account Number */}
        {loading && !refreshing ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Loading employee data...</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
            <ScrollView horizontal>
              <View>
                {/* Table Header - Updated column widths */}
                <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 8 }}>
                  <View style={{ width: 60, alignItems: 'center' }}>
                    <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Select</Text>
                  </View>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Employee ID</Text>
                  <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Employee Name</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Designation</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>Basic+DA</Text>
                  <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>Net Salary</Text>
                  <Text style={{ width: 200, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Account No.</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>IFSC Code</Text>
                  <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Bank Name</Text>
                </View>

                {/* Table Rows */}
                {filteredRecords.length === 0 ? (
                  <View style={{ padding: 50, alignItems: 'center' }}>
                    <Icon name="info-outline" size={40} color={COLORS.gray} />
                    <Text style={{ marginTop: 12, color: COLORS.gray, fontSize: 16 }}>No employees found</Text>
                    <Text style={{ marginTop: 4, color: COLORS.lightGray, fontSize: 13 }}>Try adjusting your filters</Text>
                  </View>
                ) : filteredRecords.map((record, idx) => {
                  const salary = calculateSalaryFields(record, undefined);
                  const isSelected = selectedEmployees.includes(record.id);
                  
                  const getBankBadgeColor = () => {
                    if (record.bankName?.includes('HDFC')) return COLORS.greenLight;
                    if (record.bankName?.includes('SBI')) return COLORS.blueLight;
                    if (record.bankName?.includes('Axis')) return COLORS.purple;
                    if (record.bankName?.includes('Indian')) return COLORS.indigoLight;
                    if (record.bankName?.includes('ICICI')) return COLORS.orange;
                    return COLORS.filterBg;
                  };

                  const getBankTextColor = () => {
                    if (record.bankName?.includes('HDFC')) return COLORS.green;
                    if (record.bankName?.includes('SBI')) return COLORS.blue;
                    if (record.bankName?.includes('Axis')) return COLORS.purple;
                    if (record.bankName?.includes('Indian')) return COLORS.indigo;
                    if (record.bankName?.includes('ICICI')) return COLORS.orange;
                    return COLORS.gray;
                  };

                  return (
                    <View key={record.id} style={{ flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: idx % 2 === 0 ? COLORS.white : COLORS.filterBg }}>
                      <View style={{ width: 60, alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => toggleSelectEmployee(record.id)}>
                          <View style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            borderWidth: 2,
                            borderColor: isSelected ? COLORS.blue : COLORS.gray,
                            backgroundColor: isSelected ? COLORS.blue : 'transparent',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}>
                            {isSelected && <Icon name="check" size={14} color={COLORS.white} />}
                          </View>
                        </TouchableOpacity>
                      </View>
                      <Text style={{ width: 100, fontSize: 13, fontWeight: '500', color: COLORS.textPrimary }}>{record.employeeId}</Text>
                      <Text style={{ width: 150, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary }}>{record.employeeName}</Text>
                      <Text style={{ width: 120, fontSize: 13, color: COLORS.textSecondary }}>{record.designation || '-'}</Text>
                      <Text style={{ width: 120, fontSize: 13, color: COLORS.textPrimary, textAlign: 'right' }}>{formatCurrency(record.basicDA)}</Text>
                      <Text style={{ width: 150, fontSize: 13, fontWeight: '600', color: COLORS.green, textAlign: 'right' }}>{formatCurrency(salary.netSalary)}</Text>
                      <Text style={{ width: 200, fontSize: 13, fontFamily: 'monospace', color: COLORS.textPrimary }} numberOfLines={1}>{record.accountNumber || 'N/A'}</Text>
                      <Text style={{ width: 120, fontSize: 13, fontFamily: 'monospace', color: COLORS.textPrimary }}>{record.ifscCode || 'N/A'}</Text>
                      <View style={{ width: 150 }}>
                        <View style={{ 
                          backgroundColor: getBankBadgeColor(),
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 12,
                          alignSelf: 'flex-start'
                        }}>
                          <Text style={{ fontSize: 11, color: getBankTextColor(), fontWeight: '500' }}>
                            {record.bankName || 'Not Set'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Simulation Result Modal - Updated column widths */}
      <Modal
        visible={simulation !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSimulation(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ flex: 1, backgroundColor: COLORS.white, marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.white }}>
                Simulation Preview ({simulation?.results.length} employees)
              </Text>
              <TouchableOpacity onPress={() => setSimulation(null)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={handleExcelExport}
                  style={{
                    backgroundColor: COLORS.green,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                >
                  <Icon name="file-download" size={18} color={COLORS.white} />
                  <Text style={{ marginLeft: 6, color: COLORS.white, fontSize: 13 }}>Export Excel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={savePayroll}
                  disabled={saving}
                  style={{
                    backgroundColor: COLORS.blue,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Icon name="check" size={18} color={COLORS.white} />
                  )}
                  <Text style={{ marginLeft: 6, color: COLORS.white, fontSize: 13 }}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={exportSimulationCSV}
                  style={{
                    backgroundColor: COLORS.green,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                >
                  <Icon name="file-download" size={18} color={COLORS.white} />
                  <Text style={{ marginLeft: 6, color: COLORS.white, fontSize: 13 }}>Export CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSendPaymentClick}
                  style={{
                    backgroundColor: COLORS.primary,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Icon name="email" size={18} color={COLORS.white} />
                  <Text style={{ marginLeft: 6, color: COLORS.white, fontSize: 13 }}>Send Payment Email</Text>
                </TouchableOpacity>
              </View>

              {/* Results Table - Updated column widths */}
              <ScrollView horizontal>
                <View>
                  {/* Table Header */}
                  <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 8 }}>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Employee ID</Text>
                    <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Employee Name</Text>
                    <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>Total Earnings</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>LOP Days</Text>
                    <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>LOP Deduction</Text>
                    <Text style={{ width: 130, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>Loan Deduction</Text>
                    <Text style={{ width: 140, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>Total Deductions</Text>
                    <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>Net Salary</Text>
                    <Text style={{ width: 200, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Account Number</Text>
                    <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Bank</Text>
                    <Text style={{ width: 80, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Action</Text>
                  </View>

                  {/* Table Rows */}
                  {simulation?.results.map((result, idx) => {
                    const getBankBadgeColor = () => {
                      if (result.bankName?.includes('HDFC')) return COLORS.greenLight;
                      if (result.bankName?.includes('SBI')) return COLORS.blueLight;
                      if (result.bankName?.includes('Axis')) return COLORS.purple;
                      if (result.bankName?.includes('Indian')) return COLORS.indigoLight;
                      if (result.bankName?.includes('ICICI')) return COLORS.orange;
                      return COLORS.filterBg;
                    };

                    const getBankTextColor = () => {
                      if (result.bankName?.includes('HDFC')) return COLORS.green;
                      if (result.bankName?.includes('SBI')) return COLORS.blue;
                      if (result.bankName?.includes('Axis')) return COLORS.purple;
                      if (result.bankName?.includes('Indian')) return COLORS.indigo;
                      if (result.bankName?.includes('ICICI')) return COLORS.orange;
                      return COLORS.gray;
                    };

                    return (
                      <View key={result.id} style={{ flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: idx % 2 === 0 ? COLORS.white : COLORS.filterBg }}>
                        <Text style={{ width: 100, fontSize: 13, fontWeight: '500', color: COLORS.textPrimary }}>{result.employeeId}</Text>
                        <Text style={{ width: 150, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary }}>{result.employeeName}</Text>
                        <Text style={{ width: 120, fontSize: 13, color: COLORS.textPrimary, textAlign: 'right' }}>{formatCurrency(result.totalEarnings)}</Text>
                        <Text style={{ width: 100, fontSize: 13, color: COLORS.red, fontWeight: '500', textAlign: 'right' }}>{result.lopDays || 0}</Text>
                        <Text style={{ width: 120, fontSize: 13, color: COLORS.red, textAlign: 'right' }}>{formatCurrency(result.lop)}</Text>
                        <Text style={{ width: 130, fontSize: 13, color: COLORS.red, textAlign: 'right' }}>{formatCurrency(result.loanDeduction)}</Text>
                        <Text style={{ width: 140, fontSize: 13, color: COLORS.textPrimary, textAlign: 'right' }}>{formatCurrency(result.totalDeductions)}</Text>
                        <Text style={{ width: 150, fontSize: 13, fontWeight: '600', color: COLORS.green, textAlign: 'right' }}>{formatCurrency(result.netSalary)}</Text>
                        <Text style={{ width: 200, fontSize: 13, fontFamily: 'monospace', color: COLORS.textPrimary }} numberOfLines={1}>{result.accountNumber || 'N/A'}</Text>
                        <View style={{ width: 120 }}>
                          <View style={{ 
                            backgroundColor: getBankBadgeColor(),
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 12,
                            alignSelf: 'flex-start'
                          }}>
                            <Text style={{ fontSize: 11, color: getBankTextColor(), fontWeight: '500' }}>
                              {result.bankName || 'N/A'}
                            </Text>
                          </View>
                        </View>
                        <View style={{ width: 80, alignItems: 'center' }}>
                          <TouchableOpacity
                            onPress={() => handleEditClick(result)}
                            style={{ padding: 6, backgroundColor: COLORS.blueLight, borderRadius: 20 }}
                          >
                            <Icon name="edit" size={16} color={COLORS.blue} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}

                  {/* Totals Row */}
                  {simulation && (
                    <View style={{ flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, borderTopWidth: 2, borderTopColor: COLORS.border, backgroundColor: COLORS.filterBg }}>
                      <Text style={{ width: 100, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary }}>Totals</Text>
                      <Text style={{ width: 150 }} />
                      <Text style={{ width: 120, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'right' }}>
                        {formatCurrency(simulation.totals.totalEarnings)}
                      </Text>
                      <Text style={{ width: 100 }} />
                      <Text style={{ width: 120, fontSize: 13, fontWeight: '600', color: COLORS.red, textAlign: 'right' }}>
                        {formatCurrency(simulation.results.reduce((sum, r) => sum + (r.lop || 0), 0))}
                      </Text>
                      <Text style={{ width: 130, fontSize: 13, fontWeight: '600', color: COLORS.red, textAlign: 'right' }}>
                        {formatCurrency(simulation.results.reduce((sum, r) => sum + (r.loanDeduction || 0), 0))}
                      </Text>
                      <Text style={{ width: 140, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'right' }}>
                        {formatCurrency(simulation.totals.totalDeductions)}
                      </Text>
                      <Text style={{ width: 150, fontSize: 13, fontWeight: '600', color: COLORS.green, textAlign: 'right' }}>
                        {formatCurrency(simulation.totals.netSalary)}
                      </Text>
                      <Text style={{ width: 200 }} />
                      <View style={{ width: 120 }} />
                      <View style={{ width: 80 }} />
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Summary Stats */}
              {simulation && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 16 }}>
                  <View style={{ width: '25%', padding: 4 }}>
                    <View style={{ backgroundColor: COLORS.blueLight, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.blue }}>
                      <Text style={{ fontSize: 12, color: COLORS.blue, fontWeight: '500' }}>Total Employees</Text>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.blue, marginTop: 4 }}>{simulation.results.length}</Text>
                    </View>
                  </View>
                  <View style={{ width: '25%', padding: 4 }}>
                    <View style={{ backgroundColor: COLORS.greenLight, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.green }}>
                      <Text style={{ fontSize: 12, color: COLORS.green, fontWeight: '500' }}>Total Net Salary</Text>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.green, marginTop: 4 }}>{formatCurrency(simulation.totals.netSalary)}</Text>
                    </View>
                  </View>
                  <View style={{ width: '25%', padding: 4 }}>
                    <View style={{ backgroundColor: COLORS.purple, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.purple }}>
                      <Text style={{ fontSize: 12, color: COLORS.white, fontWeight: '500' }}>Gratuity Included</Text>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.white, marginTop: 4 }}>
                        {formatCurrency(simulation.results.reduce((sum, r) => sum + (r.gratuity || 0), 0))}
                      </Text>
                    </View>
                  </View>
                  <View style={{ width: '25%', padding: 4 }}>
                    <View style={{ backgroundColor: COLORS.orange, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.orange }}>
                      <Text style={{ fontSize: 12, color: COLORS.white, fontWeight: '500' }}>Total CTC</Text>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.white, marginTop: 4 }}>{formatCurrency(simulation.totals.ctc)}</Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, width: '90%', maxWidth: 400, padding: 20 }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.greenLight, justifyContent: 'center', alignItems: 'center' }}>
                <Icon name="check" size={24} color={COLORS.green} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginTop: 12 }}>Payroll Saved Successfully</Text>
            </View>

            {simulation && (
              <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 8, marginBottom: 8 }}>
                  <Text style={{ color: COLORS.gray }}>Month</Text>
                  <Text style={{ fontWeight: '600', color: COLORS.textPrimary }}>
                    {(() => {
                      const [y, m] = selectedMonth.split('-');
                      const date = new Date(parseInt(y), parseInt(m) - 1);
                      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
                    })()}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 8, marginBottom: 8 }}>
                  <Text style={{ color: COLORS.gray }}>Total Employees</Text>
                  <Text style={{ fontWeight: '600', color: COLORS.textPrimary }}>{simulation.results.length}</Text>
                </View>
                <View>
                  <Text style={{ color: COLORS.gray, marginBottom: 8 }}>Location Breakdown</Text>
                  {Object.entries(
                    simulation.results.reduce((acc: Record<string, number>, curr) => {
                      const loc = curr.location || 'Unknown';
                      acc[loc] = (acc[loc] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([location, count]) => (
                    <View key={location} style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.white, padding: 8, borderRadius: 4, marginBottom: 4 }}>
                      <Text style={{ color: COLORS.textPrimary }}>{location}</Text>
                      <Text style={{ fontWeight: '600', color: COLORS.textPrimary, backgroundColor: COLORS.filterBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>{count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={() => setShowSuccessModal(false)}
              style={{
                backgroundColor: COLORS.primary,
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: COLORS.white, fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Email Modal */}
      <Modal
        visible={showEmailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmailModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, width: '90%', maxWidth: 400, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary }}>Send Payment Email</Text>
              <TouchableOpacity onPress={() => setShowEmailModal(false)}>
                <Icon name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>To (Email ID) *</Text>
              <TextInput
                value={emailTo}
                onChangeText={setEmailTo}
                placeholder="Enter recipient email"
                keyboardType="email-address"
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  backgroundColor: COLORS.white,
                  color: COLORS.textPrimary,
                }}
                placeholderTextColor={COLORS.gray}
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>CC</Text>
              <TextInput
                value={emailCC}
                onChangeText={setEmailCC}
                placeholder="Enter CC email (optional)"
                keyboardType="email-address"
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  backgroundColor: COLORS.white,
                  color: COLORS.textPrimary,
                }}
                placeholderTextColor={COLORS.gray}
              />
            </View>

            {simulation && (
              <View style={{ backgroundColor: COLORS.blueLight, padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <Text style={{ fontSize: 13, color: COLORS.blue }}>Sending payment details for <Text style={{ fontWeight: '600' }}>{simulation.results.length}</Text> employees.</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.blue, marginTop: 4 }}>Total Amount: {formatCurrency(simulation.totals.netSalary)}</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                onPress={() => setShowEmailModal(false)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 6,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: COLORS.textPrimary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={processPaymentEmail}
                disabled={sendingEmail}
                style={{
                  backgroundColor: COLORS.primary,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  opacity: sendingEmail ? 0.5 : 1,
                }}
              >
                {sendingEmail ? (
                  <>
                    <ActivityIndicator size="small" color={COLORS.white} />
                    <Text style={{ marginLeft: 8, color: COLORS.white }}>Sending...</Text>
                  </>
                ) : (
                  <>
                    <Icon name="email" size={18} color={COLORS.white} />
                    <Text style={{ marginLeft: 8, color: COLORS.white }}>Send Email</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bank Warning Modal */}
      <Modal
        visible={showBankWarningModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBankWarningModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, width: '90%', maxWidth: 400, padding: 20 }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.yellowLight, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.warning }}>!</Text>
              </View>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginTop: 12 }}>Incomplete Bank Details</Text>
              <Text style={{ fontSize: 14, color: COLORS.gray, textAlign: 'center', marginTop: 4 }}>
                The following {missingBankEmployees.length} employee(s) have incomplete bank details:
              </Text>
            </View>

            <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 12, maxHeight: 200, marginBottom: 16 }}>
              <ScrollView>
                {missingBankEmployees.map(emp => (
                  <View key={emp.employeeId} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                    <Text style={{ fontWeight: '500', color: COLORS.textPrimary }}>{emp.employeeName}</Text>
                    <Text style={{ color: COLORS.gray, fontSize: 12 }}>{emp.employeeId}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            <Text style={{ fontSize: 13, color: COLORS.gray, textAlign: 'center', marginBottom: 16 }}>
              Do you want to proceed with sending the payment email anyway?
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                onPress={() => setShowBankWarningModal(false)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 6,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: COLORS.textPrimary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowBankWarningModal(false);
                  setShowEmailModal(true);
                }}
                style={{
                  backgroundColor: COLORS.warning,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: COLORS.white }}>Proceed Anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit LOP / CF Modal */}
      <Modal
        visible={editModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, width: '90%', maxWidth: 400, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary }}>Edit LOP / Apply Carry Forward</Text>
              <TouchableOpacity onPress={() => setEditModalOpen(false)}>
                <Icon name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            {editingRecord && (
              <>
                <View style={{ backgroundColor: COLORS.yellowLight, padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, color: COLORS.warning }}><Text style={{ fontWeight: '600' }}>Employee:</Text> {editingRecord.employeeName} ({editingRecord.employeeId})</Text>
                  <Text style={{ fontSize: 13, color: COLORS.warning, marginTop: 4 }}><Text style={{ fontWeight: '600' }}>Current LOP Days:</Text> {editingRecord.lopDays}</Text>
                  <Text style={{ fontSize: 13, color: COLORS.warning, marginTop: 4 }}><Text style={{ fontWeight: '600' }}>Current LOP Deduction:</Text> {formatCurrency(editingRecord.lop)}</Text>
                </View>

                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Carry Forward (CF) Used</Text>
                  <TextInput
                    value={cfUsedInput}
                    onChangeText={setCfUsedInput}
                    placeholder="Enter days to adjust from CF"
                    keyboardType="numeric"
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                  <Text style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>
                    This will deduct from the employee's Privilege Leave balance immediately.
                  </Text>
                </View>

                <View style={{ backgroundColor: COLORS.blueLight, padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, color: COLORS.blue }}>
                    <Text style={{ fontWeight: '600' }}>New LOP Days:</Text> {Math.max((editingRecord.lopDays || 0) - (parseFloat(cfUsedInput) || 0), 0)}
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.blue, marginTop: 2 }}>Formula: max(Monthly LOP - CF Used, 0)</Text>
                </View>
              </>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                onPress={() => setEditModalOpen(false)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 6,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: COLORS.textPrimary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                style={{
                  backgroundColor: COLORS.blue,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: COLORS.white }}>Apply & Update Balance</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Empty State */}
      {!simulation && selectedEmployees.length === 0 && !loading && (
        <View style={{ alignItems: 'center', padding: 40 }}>
          <Icon name="description" size={48} color={COLORS.lightGray} />
          <Text style={{ fontSize: 18, fontWeight: '500', color: COLORS.gray, marginTop: 16 }}>No employees selected</Text>
          <Text style={{ fontSize: 14, color: COLORS.lightGray, marginTop: 4, textAlign: 'center' }}>
            Select employees and click <Text style={{ fontWeight: '600' }}>Simulate</Text> to preview monthly payroll
          </Text>
        </View>
      )}

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Monthly Payroll • Payroll Processing • "
      />
    </SafeAreaView>
  );
};
  
export default MonthlyPayrollScreen;