// src/utils/performanceUtils.ts

export const APPRAISAL_STAGES = [
  { id: 'appraisee', label: 'Appraisee', date: '07 Apr 26', description: 'Self Appraisal Submission' },
  { id: 'appraiser', label: 'Appraiser', date: '20 Apr 26', description: 'Manager Assessment' },
  { id: 'reviewer', label: 'Reviewer', date: '22 Apr 26', description: 'Review & Moderation' },
  { id: 'director', label: 'Director', date: '28 Apr 26', description: 'Final Approval' },
  { id: 'release', label: 'Release', date: '30 Apr 26', description: 'Letter Release' },
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

export interface WorkflowFlow {
  appraiser: string;
  reviewer: string;
  director: string;
}

export const getWorkflowForUser = (department?: string, role?: string): WorkflowFlow | null => {
  if (!department || !role) return null;
  
  // Normalize inputs
  const normDept = department.toUpperCase();
  const normRole = role;

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

// Compensation Matrix Types
export type RatingType = 'ES' | 'ME' | 'BE';
export type CompanyPerformanceType = 'Below Target' | 'Met Target' | '1.25 X Target' | '1.5 X Target';

export interface CompensationGroup {
  roles: string[];
  'Below Target': { ES: number; ME: number; BE: number };
  'Met Target': { ES: number; ME: number; BE: number };
  '1.25 X Target': { ES: number; ME: number; BE: number };
  '1.5 X Target': { ES: number; ME: number; BE: number };
}

export interface CompensationMatrix {
  'Managerial': CompensationGroup;
  'Leadership': CompensationGroup;
  'Senior Technical': CompensationGroup;
  'Junior Technical': CompensationGroup;
}

// Compensation Matrix Configuration
export const COMPENSATION_MATRIX: CompensationMatrix = {
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

export const calculateIncrement = (
  designation: string, 
  rating: RatingType, 
  companyPerformance: CompanyPerformanceType
): number => {
  if (!designation || !rating || !companyPerformance) return 0;

  // Find the group for the designation
  const groupKey = (Object.keys(COMPENSATION_MATRIX) as Array<keyof CompensationMatrix>).find(key => 
    COMPENSATION_MATRIX[key].roles.some(role => designation.includes(role))
  );

  // Default to Junior Technical if no match
  const group = groupKey ? COMPENSATION_MATRIX[groupKey] : COMPENSATION_MATRIX['Junior Technical'];

  // Get performance column
  const performanceData = group[companyPerformance];
  if (!performanceData) return 0;

  // Get rating value
  return performanceData[rating] || 0;
};