export const APPRAISAL_STAGES = [
  { id: 'appraisee', label: 'Appraisee', date: '07 Apr 26', description: 'Self Appraisal Submission' },
  { id: 'appraiser', label: 'Appraiser', date: '11 Apr 26', description: 'Manager Assessment' },
  { id: 'reviewer', label: 'Reviewer', date: '13 Apr 26', description: 'Review & Moderation' },
  { id: 'director', label: 'Director', date: '16 Apr 26', description: 'Final Approval' },
  { id: 'release', label: 'Release', date: '20 Apr 26', description: 'Letter Release' },
];

export const WORKFLOW_CONFIG = [
  {
    department: 'SDS',
    role: 'Team Member',
    flow: {
      appraiser: 'Project Manager',
      reviewer: 'General Manager',
      director: 'Director'
    }
    
  },
  {
    department: 'TEKLA',
    role: 'Team Member',
    flow: {
      appraiser: 'Project Manager',
      reviewer: 'General Manager',
      director: 'Director'
    }
  },
  {
    department: 'SDS',
    role: 'Project Manager',
    flow: {
      appraiser: 'Director',
      reviewer: 'General Manager',
      director: 'Director'
    }
  },
  {
    department: 'TEKLA',
    role: 'Project Manager',
    flow: {
      appraiser: 'Director',
      reviewer: 'General Manager',
      director: 'Director'
    }
  },
  {
    department: 'ADMIN',
    role: 'Branch Manager',
    flow: {
      appraiser: 'Director',
      reviewer: 'General Manager',
      director: 'Director'
    }
  },
  {
    department: 'ADMIN',
    role: 'HR',
    flow: {
      appraiser: 'General Manager',
      reviewer: 'General Manager',
      director: 'Director'
    }
  },
  {
    department: 'DAS',
    role: 'Team Member',
    flow: {
      appraiser: 'General Manager',
      reviewer: 'General Manager',
      director: 'Director'
    }
  }
];

export const getWorkflowForUser = (department, role) => {
  if (!department || !role) return null;
  
  // Normalize inputs
  const normDept = department.toUpperCase();
  const normRole = role; // Case sensitive or not? Let's assume passed correctly or use loose matching

  const config = WORKFLOW_CONFIG.find(c => {
    const deptMatch = normDept.includes(c.department);
    const roleMatch = normRole.includes(c.role) || c.role.includes(normRole);
    return deptMatch && roleMatch;
  });
  
  if (!config) {
    return {
      appraiser: 'Reporting Manager',
      reviewer: 'Reviewing Manager',
      director: 'Director'
    };
  }
  return config.flow;
};

// Compensation Matrix Configuration
export const COMPENSATION_MATRIX = {
  // Group 1: Senior Project Manager, Project Manager
  'Managerial': {
    roles: ['Senior Project Manager', 'Project Manager'],
    'Below Target': { ES: 5, ME: 3, BE: 2 },
    'Met Target': { ES: 8, ME: 4, BE: 2 },
    '1.25 X Target': { ES: 10, ME: 6, BE: 3 },
    '1.5 X Target': { ES: 12, ME: 8, BE: 5 }
  },
  // Group 2: Assistant Project Managers, Team Lead
  'Leadership': {
    roles: ['Assistant Project Manager', 'Team Lead'],
    'Below Target': { ES: 8, ME: 3, BE: 2 },
    'Met Target': { ES: 10, ME: 5, BE: 3 },
    '1.25 X Target': { ES: 13, ME: 8, BE: 5 },
    '1.5 X Target': { ES: 15, ME: 10, BE: 7 }
  },
  // Group 3: Senior Detailers, Checkers and Modelers
  'Senior Technical': {
    roles: ['Senior Detailer', 'Checker', 'Senior Modeler', 'Senior Developer'],
    'Below Target': { ES: 10, ME: 5, BE: 3 },
    'Met Target': { ES: 12, ME: 8, BE: 5 },
    '1.25 X Target': { ES: 15, ME: 10, BE: 8 },
    '1.5 X Target': { ES: 20, ME: 15, BE: 10 }
  },
  // Group 4: Trainees & Junior Detailer, Modeler
  'Junior Technical': {
    roles: ['Trainee', 'Junior Detailer', 'Modeler', 'Junior Developer', 'UI/UX Designer'],
    'Below Target': { ES: 10, ME: 5, BE: 3 },
    'Met Target': { ES: 15, ME: 10, BE: 5 },
    '1.25 X Target': { ES: 20, ME: 15, BE: 8 },
    '1.5 X Target': { ES: 25, ME: 18, BE: 12 }
  }
};

export const calculateIncrement = (designation, rating, companyPerformance) => {
  if (!designation || !rating || !companyPerformance) return 0;

  // Find the group for the designation
  const groupKey = Object.keys(COMPENSATION_MATRIX).find(key => 
    COMPENSATION_MATRIX[key].roles.some(role => designation.includes(role))
  );

  // Default to Junior Technical if no match (or handle as 0)
  const group = groupKey ? COMPENSATION_MATRIX[groupKey] : COMPENSATION_MATRIX['Junior Technical'];

  // Get performance column
  const performanceData = group[companyPerformance];
  if (!performanceData) return 0;

  // Get rating value
  return performanceData[rating] || 0;
};

export const calculateSalaryAnnexure = (gross, customPFs = null) => {
  const targetGross = Math.round(gross || 0);
  const basic = Math.round(targetGross * 0.50);
  const hra = Math.round(targetGross * 0.25);
  
  let calculatedEmployeePF = 1800;
  let calculatedEmployerPF = 1950;
  if (basic > 0) {
    if (basic < 15000) {
      calculatedEmployeePF = Math.round(basic * 0.12);
      calculatedEmployerPF = Math.round(basic * 0.13) + 150;
    } else {
      calculatedEmployeePF = 1800;
      calculatedEmployerPF = 1950;
    }
  }

  // PF Contributions (Use custom values if provided, else defaults)
  const employeePfContribution = calculatedEmployeePF;
  const employerPfContribution = calculatedEmployerPF;
  const esi = customPFs?.esi !== undefined ? Number(customPFs.esi) : 0;

  const volunteerPF = customPFs?.volunteerPF !== undefined ? Number(customPFs.volunteerPF) : 0;

  // Special Allowance is the remainder after subtracting employee, employer PF and ESI from targetGross
  const special = Math.max(0, targetGross - basic - hra - employeePfContribution - employerPfContribution - esi);

  const totalDeductions = employeePfContribution + employerPfContribution + esi + volunteerPF;
  // Net Salary = (Basic + HRA + Special) - Volunteer PF
  const net = (basic + hra + special) - volunteerPF;
  
  const grossFinal = targetGross;
  
  const gratuity = Math.round(basic * 0.0486);
  
  // CTC = Gross Salary + Gratuity
  const ctc = grossFinal + gratuity;

  return {
    basic,
    hra,
    special,
    net, // Net Salary (Take Home)
    employeePfContribution,
    empPF: employeePfContribution, // Alias for backward compatibility
    gross: grossFinal,
    employerPfContribution,
    employerPF: employerPfContribution, // Alias for backward compatibility
    esi,
    volunteerPF,
    gratuity,
    ctc: Math.round(ctc)
  };
};

export const calculateCurrentSalaryAnnexure = (snapshot) => {
  if (!snapshot) return null;

  // Use the total earnings from the snapshot as the base Gross
  const gross = Math.round(snapshot.totalEarnings || snapshot.gross || 0);
  const basic = Math.round(snapshot.basicDA || snapshot.basic || 0);
  const hra = Math.round(snapshot.hra || 0);
  
  // Standard PF contributions (use snapshot values if available, else standard defaults)
  const employeePfContribution = Math.round(snapshot.employeePfContribution || 1800);
  // FIXED: Use actual snapshot value or standard 1950, NOT derived from gross-net
  const employerPfContribution = Math.round(snapshot.employerPfContribution || 1950);
  const esi = Math.round(snapshot.esi || 0);
  const volunteerPF = Math.round(snapshot.volunteerPF || 0);

  // 50/25/25 Rule: Special = Gross - Basic - HRA - Employee PF - Employer PF - ESI
  const special = Math.max(0, gross - basic - hra - employeePfContribution - employerPfContribution - esi);

  const totalDeductions = employeePfContribution + employerPfContribution + esi + volunteerPF;
  // Net Salary = (Basic + HRA + Special) - Volunteer PF
  const net = (basic + hra + special) - volunteerPF;

  const gratuity = Math.round(snapshot.gratuity || (basic * 0.0486));
  const ctc = Math.round(snapshot.ctc || (gross + gratuity));

  return {
    basic,
    hra,
    special,
    net,
    employeePfContribution,
    empPF: employeePfContribution,
    gross,
    employerPfContribution,
    employerPF: employerPfContribution,
    esi,
    volunteerPF,
    gratuity,
    ctc: Math.round(ctc)
  };
};
