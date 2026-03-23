// constants/resumeConstants.ts
export const DIVISIONS = [
  'SDS',
  'TEKLA',
  'DAS(Software)',
  'Mechanical',
  'Electrical',
  
] as const;

export type Division = typeof DIVISIONS[number];

export const RESUME_TYPES = [
  'Employee Resume',
  'Hiring Resume',
] as const;

export type ResumeType = typeof RESUME_TYPES[number];

export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const FILE_SIZE_LIMIT_MB = 5;

export const EXPERIENCE_RANGES = [
  { label: 'Fresher (0 years)', min: 0, max: 0 },
  { label: '0-1 years', min: 0, max: 1 },
  { label: '1-3 years', min: 1, max: 3 },
  { label: '3-5 years', min: 3, max: 5 },
  { label: '5-10 years', min: 5, max: 10 },
  { label: '10+ years', min: 10, max: 100 },
];

export const SORT_OPTIONS = [
  { label: 'Name (A-Z)', value: 'candidateName:asc' },
  { label: 'Name (Z-A)', value: 'candidateName:desc' },
  { label: 'Experience (Low to High)', value: 'experience:asc' },
  { label: 'Experience (High to Low)', value: 'experience:desc' },
  { label: 'Newest First', value: 'createdAt:desc' },
  { label: 'Oldest First', value: 'createdAt:asc' },
];