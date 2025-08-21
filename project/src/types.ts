export interface Department {
  id: number;
  name: string;
  shortName: string;
  keyQuestions: string[];
  description: string;
}

export interface ContentItem {
  id: string;
  type: 'interview' | 'document' | 'note';
  title: string;
  content: string;
  departmentId: number;
  intervieweeName?: string;
  intervieweeRole?: string;
  date: string;
  tags?: string[];
  createdAt: Date;
  interviewAnswers?: { [questionId: string]: string };
}

export interface StandardQuestion {
  id: string;
  question: string;
  category: 'licensing' | 'processes' | 'challenges' | 'staffing' | 'initiatives' | 'technology' | 'compliance' | 'revenue';
}

export interface AnalysisResult {
  department: string;
  sourceMaterials: string[];
  thematicSummary: string[];
  keyInsights: string[];
  opportunities: string[];
  challenges: string[];
  recommendations: string[];
}

export interface LicensePermitData {
  id: string;
  department: string;
  division: string;
  licensePermitTitle: string;
  approvingEntity: string;
  description: string;
  processingTime: string;
  fee: string;
  renewalPeriod: string;
  requirements: string;
  status: 'Active' | 'Inactive' | 'Under Review';
  lastUpdated: Date;
}